import type { ActionFunctionArgs } from "@remix-run/node";
import { Webhook } from "svix";
import type { WebhookEvent } from "svix"; // Importera typen från svix
import { prisma } from "../utils/db.server";

export async function action({ request }: ActionFunctionArgs) {
  // 1. Hämta din Webhook Signing Secret från miljövariabler
  // Notera: Clerk kallar den oftast detta i sina exempel
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Error: Missing CLERK_WEBHOOK_SIGNING_SECRET");
    // Svara inte med för mycket info vid fel av säkerhetsskäl
    return new Response("Webhook Error: Configuration missing", { status: 500 });
  }

  // 2. Hämta Svix headers från requesten
  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  // Om headers saknas, skicka fel tillbaka
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Error: Missing Svix headers");
    return new Response("Webhook Error: Missing headers", { status: 400 });
  }

  // 3. Hämta den RÅA request body som TEXT
  // Detta är det KRITISKA steget! Parsa inte JSON än.
  const payload = await request.text();

  // 4. Skapa en Svix Webhook-instans med din secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // 5. Verifiera signaturen
  try {
    evt = wh.verify(payload, { // Använd den råa text-payloaden
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent; // Type assertion om nödvändigt
  } catch (err: unknown) {
    // Om verifieringen misslyckas
    console.error("Error verifying webhook:", err instanceof Error ? err.message : "Unknown error");
    return new Response("Webhook Error: Verification failed", { status: 400 });
  }

  // 6. Verifieringen lyckades! Hantera eventet.
  // Nu kan du t.ex. parsa payload om du vet att den är JSON
  // const bodyData = JSON.parse(payload); <-- Gör detta bara om du behöver datan
  const eventType = evt.type;

  console.log(`Webhook received: ${eventType}`);
  console.log('Webhook payload:', payload); // Logga rå payload för felsökning

  // Här lägger du din logik baserat på eventType
  // Exempel: Synka användare till din databas
  switch (eventType) {
    case 'user.created': {
      const userData = evt.data; // Typa detta korrekt, t.ex. UserJSON från @clerk/backend
      await prisma.user.upsert({ // Använd upsert för att skapa om den saknas, annars uppdatera
        where: { clerkUserId: userData.id },
        update: { // Uppdatera om den redan finns (t.ex. från loader)
          email: userData.email_addresses.find(e => e.id === userData.primary_email_address_id)?.email_address ?? '',
          name: `${userData.first_name ?? ''} ${userData.last_name ?? ''}`.trim() || null,
          imageUrl: userData.image_url, // <-- Spara bild-URL
          // Uppdatera ev. status/roll om webhooken är master
        },
        create: { // Skapa om den inte finns
          clerkUserId: userData.id,
          email: userData.email_addresses.find(e => e.id === userData.primary_email_address_id)?.email_address ?? '',
          name: `${userData.first_name ?? ''} ${userData.last_name ?? ''}`.trim() || null,
          imageUrl: userData.image_url, // <-- Spara bild-URL
          status: 'pending_approval', // Eller 'pending_approval' beroende på flöde
          role: 'executor',
        }
      });
      console.log('Processed user.created webhook');
      break;
    }
    case 'user.updated': 
      const userData = evt.data;
      await prisma.user.update({
        where: { clerkUserId: userData.id },
        data: {
          email: userData.email_addresses.find(e => e.id === userData.primary_email_address_id)?.email_address ?? undefined, // Uppdatera bara om den finns
          name: `${userData.first_name ?? ''} ${userData.last_name ?? ''}`.trim() || undefined,
          imageUrl: userData.image_url, // <-- Uppdatera bild-URL
          // Uppdatera ev. andra fält
        },
      });
      console.log('Processed user.updated webhook');
      break;
    case 'user.deleted':
      // const userData = evt.data;
      // await prisma.user.update({ where: { clerkUserId: userData.id }, data: { status: 'deactivated' }}); // Eller delete
      console.log('User deleted event detected');
      break;
    // Lägg till fler cases för andra events du vill hantera...
    default:
      console.log(`Unhandled event type: ${eventType}`);
  }

  // 7. Skicka ett lyckat svar tillbaka till Clerk
  return new Response("Webhook received", { status: 200 });
}

export function loader() {
  return new Response("Webhook route");
}