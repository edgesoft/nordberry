// app/notifications/providers/clientEmitter.provider.ts

import type { NotificationPayload, NotificationProvider } from '../types';
import type { EventEmitter } from 'events';

/**
 * En notifieringsprovider som ansvarar för att skicka vidare
 * notifieringspayloaden till anslutna SSE-klienter
 * via den globala notificationEmitter.
 */
export class ClientEmitterProvider implements NotificationProvider {
  private emitter: EventEmitter;

  // Ta emot EventEmitter-instansen via konstruktorn
  constructor(emitter: EventEmitter) {
    if (!emitter) {
        throw new Error("ClientEmitterProvider requires a valid EventEmitter instance.");
    }
    this.emitter = emitter;
  }

  async processNotification(payload: NotificationPayload): Promise<void> {
    // Använd den emitter som skickades in via konstruktorn
    try {
        const payloadString = JSON.stringify(payload);
        console.log(`[ClientEmitterProvider] Emitting update event for table '${payload.table}'`);
        this.emitter.emit('update', payloadString);
    } catch (error) {
        console.error("[ClientEmitterProvider] Failed to stringify payload for SSE:", error);
    }

    return Promise.resolve();
  }
}
