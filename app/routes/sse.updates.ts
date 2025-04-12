// app/routes/sse.updates.ts

import type { LoaderFunctionArgs } from "@remix-run/node"; // Anpassa efter din Remix-version (kan vara från @remix-run/node eller specifik adapter)
import {
  notificationEmitter,
  ensureListenerReady,
} from "../utils/notification-listener.server.ts"; // Importera från din listener-service

// Denna loader-funktion hanterar SSE-anslutningen
export async function loader({ request }: LoaderFunctionArgs) {
  // Steg 1: Säkerställ att vår dedikerade PostgreSQL-lyssnare är aktiv och redo
  try {
    await ensureListenerReady();
    console.log("SSE Loader: Notification listener is ready.");
  } catch (err: any) {
    // Om lyssnaren inte kan startas, skicka ett felmeddelande direkt
    console.error("SSE Loader: Failed to ensure notification listener is ready.", err.message);
    return new Response("Real-time update service unavailable.", { status: 503 }); // 503 Service Unavailable
  }

  // Steg 2: Skapa en ReadableStream för att hantera den långlivade SSE-anslutningen
  const stream = new ReadableStream({
    // start() körs när en klient ansluter till denna ström (öppnar EventSource)
    start(controller) {
      console.log("SSE: Client connected");

      // Deklarera intervallet för keep-alive FÖRST, använd 'let'
      let keepAliveInterval: NodeJS.Timeout | null = null;

      // --- Funktioner för att hantera strömmen ---

      // Funktion för att skicka data till just *denna* anslutna klient
      const sendUpdate = (payload: string) => {
        try {
          // Kolla om strömmen fortfarande är aktiv innan vi skickar
           if (controller.desiredSize === null) {
               console.warn("SSE: Stream closing, skipping update send.");
               cleanup(); // Städa upp om strömmen stängs
               return;
           }
          // Formatera data enligt SSE-specifikationen: "data: <json>\n\n"
          controller.enqueue(`data: ${payload}\n\n`);
        } catch (e) {
          // Om enqueue misslyckas, har klienten troligen kopplat ner. Städa upp.
          console.error("SSE: Failed to send update (enqueue failed), cleaning up.", e);
          cleanup();
        }
      };

      // Funktion för att hantera fel som rapporteras från notificationEmitter (t.ex. DB-fel)
      const handleListenerError = (err: Error) => {
        console.error("SSE: Received listener error, informing client.", err.message);
        try {
          // Skicka ett specifikt 'error'-event till klienten via SSE
          if (controller.desiredSize !== null) {
             controller.enqueue(`event: error\ndata: ${JSON.stringify({ message: "Update service connection issue" })}\n\n`);
          }
          // Vi stänger inte nödvändigtvis strömmen här, eftersom lyssnaren kan försöka återansluta.
        } catch (e) {
           // Ignorera om det inte går att skicka (t.ex. om klienten också tappat anslutning)
           console.warn("SSE: Failed to send listener error to client.", e);
        }
      };

      // Funktion för att städa upp resurser när *denna* klient kopplar ner
      const cleanup = () => {
        console.log("SSE: Cleaning up resources for disconnected client.");

        // 1. Stoppa keep-alive intervallet (viktigt!)
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }

        // 2. Ta bort lyssnare från den globala notificationEmitter för att undvika minnesläckor
        notificationEmitter.off('update', sendUpdate);
        notificationEmitter.off('listenerError', handleListenerError);

        // 3. Försök stänga ReadableStream-controllern om den inte redan är stängd
        try {
          // Kolla om controller fortfarande är aktiv innan close anropas
          if (controller.desiredSize !== null) {
            controller.close();
            console.log("SSE: Stream controller closed.");
          }
        } catch (e) {
          // Ignorera eventuella fel vid stängning, kan redan vara stängd
          // console.warn("SSE: Error closing controller during cleanup:", e);
        }
      };

      // --- Prenumeration och Initialisering ---

      // Prenumerera på 'update'-händelser från vår notificationEmitter
      notificationEmitter.on('update', sendUpdate);
      // Prenumerera på 'listenerError'-händelser
      notificationEmitter.on('listenerError', handleListenerError);

      // Lyssna på 'abort'-signalen från request. Denna triggas när klienten kopplar ner.
      // Använd den *kompletta* cleanup-funktionen som handler.
      request.signal.addEventListener("abort", cleanup);

      // Starta ett intervall som skickar en kommentar var 25:e sekund.
      // Detta förhindrar att proxyservrar eller lastbalanserare stänger anslutningen pga inaktivitet.
      keepAliveInterval = setInterval(() => {
        try {
            // Kontrollera om strömmen fortfarande är aktiv innan enqueue
            if (controller.desiredSize === null) {
                 console.log("SSE: Stream closing, skipping keep-alive.");
                 cleanup(); // Städa upp om strömmen stängs
                 return;
            }
            // SSE-kommentarer börjar med kolon ":"
            controller.enqueue(': keep-alive\n\n');
        } catch (e) {
            // Om det misslyckas att skicka (t.ex. anslutningen bröts precis), städa upp.
            console.error("SSE: Keep-alive failed, cleaning up.", e);
            cleanup(); // Cleanup stoppar även intervallet
        }
      }, 25000); // 25 sekunder

    }, // Slut på start()

    // cancel() anropas om strömmen avbryts från *serverns* sida (mindre vanligt här)
    cancel(reason) {
      console.warn("SSE: Stream cancelled by server.", reason);
      // Här behöver vi oftast inte göra något extra, eftersom cleanup() bör
      // ha anropats via 'abort'-signalen om klienten kopplade ner,
      // eller så hanteras felet som orsakade cancel i start().
      // Man *kan* lägga till ett explicit anrop till cleanup() här för säkerhets skull,
      // men det kräver att cleanup är tillgänglig i detta scope (vilket den inte är just nu).
      // Normalt sett är 'abort'-hanteringen i start() tillräcklig.
    }, // Slut på cancel()

  }); // Slut på new ReadableStream()

  // Steg 3: Returnera Response-objektet med strömmen och korrekta SSE-headers
  return new Response(stream, {
    status: 200, // OK
    headers: {
      "Content-Type": "text/event-stream", // Talat om att detta är en SSE-ström
      "Cache-Control": "no-cache", // Instruera klient/proxy att inte cacha svaret
      "Connection": "keep-alive", // Håll anslutningen öppen
      // Valfri men ofta rekommenderad header för att förhindra buffring i vissa proxyservrar:
      "X-Accel-Buffering": "no",
    },
  });
} // Slut på loader()