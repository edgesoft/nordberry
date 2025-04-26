import type { NotificationPayload, NotificationProvider } from '../types';


export class LogProvider implements NotificationProvider {
  async processNotification(payload: NotificationPayload): Promise<void> {
    console.log(`[LogProvider] Received notification: ${JSON.stringify(payload, null, 2)}`);
    return Promise.resolve();
  }
}
