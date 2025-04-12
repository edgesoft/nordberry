// app/services/notification-listener.server.ts
import pg from 'pg'; // Importera standardexporten
const { Client: PgClient } = pg;
import EventEmitter from 'events'; // Node.js inbyggda

// --- Konfiguration ---
const DATABASE_URL_PG = process.env.DATABASE_URL_PG;
const NOTIFY_CHANNEL = 'updates_channel'; // Måste matcha kanalen i SQL-triggern!
// --- Slut Konfiguration ---

if (!DATABASE_URL_PG) {
  console.warn("NOTIFICATION LISTENER: DATABASE_URL is not set. Real-time updates disabled.");
}

// EventEmitter för att skicka notifikationer till anslutna SSE-strömmar
const notificationEmitter = new EventEmitter();
notificationEmitter.setMaxListeners(0); // Obegränsat antal lyssnare (SSE-anslutningar)

// Singleton-variabler för klienten och anslutningsförsök
let listenerClient: PgClient | null = null;
let connectionAttempt: Promise<void> | null = null;
let isListening = false;
let retryTimeout: NodeJS.Timeout | null = null;

// Funktion för att ansluta och börja lyssna
async function connectAndListen(): Promise<void> {
  if (!DATABASE_URL_PG) {
    throw new Error("DATABASE_URL is not set for listener.");
  }
  // Förhindra flera samtidiga anslutningsförsök
  if (connectionAttempt) return connectionAttempt;

  console.log("Notification Listener: Attempting to connect...");
  connectionAttempt = new Promise(async (resolve, reject) => {
    // Rensa eventuell tidigare klient
    if (listenerClient) {
      await listenerClient.end().catch(e => console.error("Error ending previous client:", e));
      listenerClient = null;
      isListening = false;
    }
    if (retryTimeout) clearTimeout(retryTimeout); // Rensa eventuell väntande återanslutning

    const client = new PgClient({ connectionString: DATABASE_URL_PG });
    listenerClient = client; // Spara direkt

    client.on('error', (err) => {
      console.error('Notification Listener: Connection Error:', err);
      isListening = false;
      listenerClient = null; // Nollställ
      connectionAttempt = null; // Tillåt nytt försök
      notificationEmitter.emit('listenerError', err);
      // Försök återansluta efter en fördröjning
      if (!retryTimeout) {
        console.log("Notification Listener: Scheduling reconnection attempt in 5 seconds...");
        retryTimeout = setTimeout(() => {
          retryTimeout = null; // Nollställ timeout-ID
          connectAndListen().catch(e => console.error("Reconnection attempt failed:", e));
        }, 5000); // 5 sekunders fördröjning
      }
      // Vi rejectar inte här, låt återanslutningen sköta sitt
    });

    client.on('end', () => {
      console.log('Notification Listener: Connection Ended.');
      isListening = false;
      if (listenerClient === client) {
          listenerClient = null;
          connectionAttempt = null;
      }
      notificationEmitter.emit('listenerError', new Error("Listener connection closed"));
      // Försök återansluta om det inte var en avsiktlig stängning
      if (!retryTimeout) {
        console.log("Notification Listener: Scheduling reconnection attempt after connection end...");
        retryTimeout = setTimeout(() => {
           retryTimeout = null;
           connectAndListen().catch(e => console.error("Reconnection attempt failed:", e));
        }, 5000);
      }
    });

    client.on('notification', (msg) => {

        console.log(`>>> NOTIFICATION RECEIVED on channel '${msg.channel}':`, msg.payload);

      if (msg.channel === NOTIFY_CHANNEL && msg.payload) {
        notificationEmitter.emit('update', msg.payload);
      }
    });

    try {
      await client.connect();
      console.log('Notification Listener: Connected.');
      await client.query(`LISTEN ${NOTIFY_CHANNEL}`); // Säkerställ att kanalnamnet är säkert
      console.log(`Notification Listener: Listening on channel "${NOTIFY_CHANNEL}".`);
      isListening = true;
      resolve(); // Lyckades!
    } catch (err) {
      console.error('Notification Listener: Failed to connect or LISTEN.', err);
      await client.end().catch(()=>{}); // Försök stänga rent
      listenerClient = null;
      isListening = false;
      connectionAttempt = null; // Tillåt nytt försök
      reject(err); // Misslyckades
    }
  });

  try {
      await connectionAttempt;
  } finally {
      // Viktigt: Nollställ connectionAttempt *efter* att löftet är klart,
      // så att parallella anrop väntar korrekt, men ett nytt försök kan göras senare.
      connectionAttempt = null;
  }
}

// Funktion som SSE-loadern anropar för att säkerställa att lyssnaren är redo
async function ensureListenerReady(): Promise<void> {
  if (!listenerClient || !isListening) {
    console.log("Notification Listener: Not ready, ensuring connection...");
    // Anropa och vänta på att anslutningen etableras (eller misslyckas)
    await connectAndListen();
  }
  // Dubbelkolla ifall anslutningen misslyckades
   if (!listenerClient || !isListening) {
       throw new Error("Notification Listener: Failed to establish connection.");
   }
}

// Anslut i bakgrunden när modulen laddas (valfritt)
// Om detta misslyckas kommer ensureListenerReady försöka igen senare.
if (DATABASE_URL_PG) {
  connectAndListen().catch(err => {
    console.error("Initial background connection for listener failed:", err.message);
  });
}

// Funktion för att stänga ner lyssnaren (anropas vid server shutdown)
async function closeListener() {
  console.log('Notification Listener: Received shutdown signal...');
  if (retryTimeout) clearTimeout(retryTimeout); // Avbryt återanslutningsförsök
  retryTimeout = null;
  const client = listenerClient;
  listenerClient = null; // Förhindra nya anslutningsförsök
  isListening = false;
  connectionAttempt = Promise.reject(new Error("Listener shutting down")); // Förhindra nya anrop
  if (client) {
    try {
      console.log('Notification Listener: Unlistening...');
      await client.query(`UNLISTEN ${NOTIFY_CHANNEL}`).catch(()=>{});
      console.log('Notification Listener: Ending connection...');
      await client.end({ timeout: 2000 }); // Ge 2 sekunder att stänga
      console.log('Notification Listener: Connection closed.');
    } catch (err) {
      console.error('Notification Listener: Error during shutdown:', err);
    }
  }
}

// Exportera nödvändiga delar
export { notificationEmitter, ensureListenerReady, closeListener };