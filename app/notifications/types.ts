export interface NotificationPayload {
    table: string; // Vilken tabell ändrades (t.ex. "task", "comment")
    action: 'INSERT' | 'UPDATE' | 'DELETE'; // Vilken operation
    id?: string | number; // ID för den påverkade raden (kan vara null för t.ex. TRUNCATE)
    data?: Record<string, any>; // Data efter ändringen (för INSERT/UPDATE)
    old_data?: Record<string, any>; // Data före ändringen (för UPDATE/DELETE)
  }
  
  // Interface som alla notifieringsproviders måste implementera
  export interface NotificationProvider {
    /**
     * Bearbetar en inkommande notifieringspayload.
     * Providern avgör själv om den ska agera på payloaden.
     * @param payload Den parsade payloaden från databasnotifieringen.
     */
    processNotification(payload: NotificationPayload): Promise<void>;
  }
  