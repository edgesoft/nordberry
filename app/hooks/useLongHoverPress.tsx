// Fil: src/hooks/useLongHoverPress.ts

import { useEffect, useRef, useState, useCallback } from "react";

// Helper för att försöka detektera touch-enhet
const isTouchDevice = () => {
  if (typeof window !== 'undefined') {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }
  return false;
};

// Kör detekteringen en gång
const deviceIsTouch = isTouchDevice();

/**
 * En React Hook för att detektera långa tryck (touch) eller långa hover (mus).
 * Visar endast en aktiv meny åt gången och hanterar touch/mus-konflikter.
 */
export function useLongHoverPress(ms = 1200) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const isTouch = deviceIsTouch;

  // Funktion för att rensa en eventuell pågående timer
  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []); // Inga dependencies

  // ----> ÄNDRING HÄR i startTimer <----
  // Funktion som startar timer-processen
  const startTimer = useCallback((id: string, target: HTMLElement) => {
      const currentlyActiveId = activeId; // Läs nuvarande state

      // Rensa alltid en eventuell *pågående* timer, oavsett vad
      clear();
      // Sätt alltid referensen till det element som interageras med nu
      activeElementRef.current = target;

      // Om vi startar för ett element som REDAN ÄR aktivt...
      if (currentlyActiveId === id) {
          // ... gör INTE setActiveId(null). Starta bara om timern
          //     för att säkerställa att den visas i 'ms' till om inget händer.
          //     (Alternativt kunde man inte göra någonting här, men omstart
          //      känns säkrare ifall föregående timer avbröts konstigt).
          timeoutRef.current = setTimeout(() => {
              // Se till att ID:t fortfarande är satt efter timeout
              // (Ifall något annat avbröt och satte null under tiden)
              // Detta kan dock orsaka en extra render, setActiveId(id) kanske räcker.
              // Vi provar setActiveId(id) direkt.
              setActiveId(id);
              //if (navigator.vibrate) navigator.vibrate(10);
          }, ms);
      } else {
          // Om vi startar för ett NYTT element (eller inget var aktivt)...
          // ... dölj den gamla menyn direkt.
          setActiveId(null);
          // Starta sedan timern för att visa den nya.
          timeoutRef.current = setTimeout(() => {
              setActiveId(id); // Visa ny meny
              if (navigator.vibrate) navigator.vibrate(10);
          }, ms);
      }
  }, [ms, clear, setActiveId, activeId]); // Lägg till activeId som dependency!

  // Klickhanterare för *elementet som hooken binds till*
  const clickHandler = useCallback((e: React.MouseEvent<HTMLElement>) => {
      const elementId = (e.currentTarget as HTMLElement).dataset.longPressId;
      const currentlyActiveId = activeId;
      // Om menyn är synlig för detta element, stoppa klicket från att nå window
      if (currentlyActiveId === elementId && currentlyActiveId !== null) {
          e.stopPropagation();
      }
  }, [activeId]); // Dependency: activeId

  // Funktion som returnerar eventhanterare att binda till elementet
  const bind = useCallback((id: string) => {
    const commonProps = {
        'data-long-press-id': id // För clickHandler ovan
    };

    if (isTouch) {
      // För TOUCH-enheter
      return {
        ...commonProps,
        onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
            e.currentTarget.addEventListener('contextmenu', (ev) => ev.preventDefault(), { once: true });
            // Logga här för att se om detta körs när du klickar på knappen
            console.log("onTouchStart på kommentaren för id:", id);
            startTimer(id, e.currentTarget)
        },
        onTouchEnd: clear, // Rensa timer om den inte gått ut
        onTouchMove: clear,
        onTouchCancel: clear,
        onClick: clickHandler // Hantera klick på *själva kommentaren*
      };
    } else {
      // För MUS-enheter
      return {
        ...commonProps,
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => startTimer(id, e.currentTarget),
        onMouseLeave: () => {
          clear();
          setActiveId(null);
        },
        // onClick: clickHandler
      };
    }
    // Uppdatera dependencies här eftersom startTimer nu beror på activeId
  }, [isTouch, startTimer, clear, clickHandler]); // startTimer inkluderar nu activeId

  // Global listener för att stänga menyn vid klick/touch *utanför*
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      // Kolla om klicket är utanför originalelementet
      if (
        activeElementRef.current &&
        !activeElementRef.current.contains(target)
      ) {
        // Klicket var utanför.
        clear();
        setActiveId(null);
        activeElementRef.current = null;
      }
    };

    // Lyssna i bubble phase
    window.addEventListener("click", handler);
    window.addEventListener("touchend", handler);

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchend", handler);
      clear();
    };
  }, [clear]); // Dependency: clear

  // Returnera state och bind-funktion
  return { activeId, bind, clear: () => setActiveId(null) };
}