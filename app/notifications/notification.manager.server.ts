// app/notifications/notification.manager.server.ts

import type { NotificationPayload, NotificationProvider } from './types';
import { LogProvider } from './providers/log.provider';
import { ClientEmitterProvider } from './providers/clientEmitter.provider';
// Importera emittern här, den behövs vid initiering
import { notificationEmitter } from '~/utils/notification-listener.server';
// Importera andra providers...
// import { EmailTaskWorkingProvider } from './providers/emailTaskWorking.provider';

let notificationProviders: NotificationProvider[] = [];
let isInitialized = false;
let initializationAttempted = false; // Ny flagga

// Funktion för att initiera providers
function initializeProviders() {
    // Om redan lyckats, gör inget mer
    if (isInitialized) return true;

    // Försök bara om vi inte har försökt tidigare ELLER om emittern nu finns
    if (!initializationAttempted || notificationEmitter) {
        initializationAttempted = true; // Markera att vi har försökt

        // Kontrollera att emittern faktiskt är tillgänglig NU
        if (!notificationEmitter) {
            console.warn("[NotificationManager] Cannot initialize providers yet: notificationEmitter is still not available.");
            return false; // Initiering misslyckades (denna gång)
        }

        console.log("[NotificationManager] Initializing providers...");
        try {
            notificationProviders = [
                // Skapa instanserna här
                new ClientEmitterProvider(notificationEmitter),
                new LogProvider(),
                // new EmailTaskWorkingProvider(),
            ];
            isInitialized = true; // Markera som lyckad initiering
            console.log(`[NotificationManager] Providers initialized successfully (${notificationProviders.length} providers).`);
            return true; // Initiering lyckades
        } catch (error) {
            console.error("[NotificationManager] Error during provider initialization:", error);
            isInitialized = false; // Säkerställ att vi markerar som ej initierad vid fel
            return false; // Initiering misslyckades
        }
    } else {
        // Vi har försökt tidigare men emittern var inte redo, och den är fortfarande inte redo.
        console.warn("[NotificationManager] Skipping initialization attempt, notificationEmitter still not ready.");
        return false;
    }
}

/**
 * Tar emot en notifieringspayload och skickar den vidare till alla registrerade providers.
 * @param payload Den parsade payloaden från databasnotifieringen.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
    // Försök initiera providers VARJE GÅNG (funktionen internt skyddar mot multipla körningar)
    const initializedSuccessfully = initializeProviders();

    // Om initieringen inte lyckades (ännu), avbryt
    if (!initializedSuccessfully || notificationProviders.length === 0) {
        console.warn("[NotificationManager] Providers not initialized or empty, skipping dispatch.");
        return;
    }

    if (!payload) {
        console.warn("[NotificationManager] Received empty payload, skipping dispatch.");
        return;
    }

    console.log(`[NotificationManager] Dispatching notification for table '${payload.table}', action '${payload.action}', id '${payload.id || 'N/A'}'.`);

    // Anropa processNotification för varje provider parallellt
    const results = await Promise.allSettled(
      notificationProviders.map(provider =>
        provider.processNotification(payload)
          .catch(err => {
            console.error(`[NotificationManager] Error in provider ${provider.constructor.name}:`, err);
            return Promise.reject(err);
          })
      )
    );

    // Valfri loggning av resultat
    results.forEach((result, index) => {
      const providerName = notificationProviders[index]?.constructor.name || `Provider ${index}`;
      if (result.status === 'rejected') {
         // Felet loggades redan ovan
      } else {
        // console.log(`[NotificationManager] Provider ${providerName} completed.`);
      }
    });
}
