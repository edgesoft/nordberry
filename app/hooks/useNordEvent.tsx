import { useEffect, useState, useRef } from "react";
import { useRevalidator } from "@remix-run/react";
import type { Revalidator } from "@remix-run/react";

type EventPayload = {
  table: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  data?: any;
  revalidator: Revalidator
};

type Callback = (payload: EventPayload) => void;

export const useNordEvent = (onEvent?: Callback) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPayload = useRef<string | null>(null);
  const revalidator = useRevalidator()

  useEffect(() => {
    const eventSource = new EventSource("/sse/updates");

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      if (event.data === lastPayload.current) return;
      lastPayload.current = event.data;

      try {
        const payload: EventPayload = JSON.parse(event.data);
        if (onEvent) onEvent({...payload, revalidator});
      } catch (e) {
        console.error("SSE JSON parse error", e);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError("Förlorad anslutning till server-push");
    };

    return () => {
      eventSource.close();
    };
  }, [onEvent]);

  return {
    connected,
    error,
  };
};
