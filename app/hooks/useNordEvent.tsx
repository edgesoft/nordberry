import { useEffect, useState, useRef } from "react"; 
import { useRevalidator } from "@remix-run/react";
import type { Revalidator } from "@remix-run/react";

type EventPayload<TData = any> = { 
  table: string;
  action: "INSERT" | "UPDATE" | "DELETE"; 
  data?: TData;
  revalidator: Revalidator;
};

type Callback<TData = any> = (payload: EventPayload<TData>) => void;

export const useNordEvent = <TData = any>(onEvent?: Callback<TData>) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPayload = useRef<string | null>(null);
  const revalidator = useRevalidator(); 


  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);


  useEffect(() => {
    //console.log("Setting up SSE connection...");

    const eventSource = new EventSource("/sse/updates");

    eventSource.onopen = () => {
      //console.log("SSE connection opened.");
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      if (event.data === lastPayload.current) {
        console.log("Duplicate SSE event skipped:", event.data);
        return; 
      }
      lastPayload.current = event.data; 

      try {
        const parsedData = JSON.parse(event.data);
        
        const payload: EventPayload<TData> = {
           ...parsedData, 
           revalidator: revalidator 
        }; 

        if (onEventRef.current) {
          onEventRef.current(payload);
        }

      } catch (e) {
        console.error("SSE JSON parse error", e, "Raw data:", event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      setConnected(false);
      setError("Förlorad anslutning till server-push");
      eventSource.close(); 
    };

    return () => {
      //console.log("Closing SSE connection.");
      eventSource.close();
      setConnected(false);
    };
  }, [revalidator]); 

  return {
    connected,
    error,
  };
};