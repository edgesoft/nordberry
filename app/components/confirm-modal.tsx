import React, {useRef, useEffect} from 'react';


function ConfirmModal({ isOpen, onClose, onConfirm, title, children, isSubmitting = false }) {
    // Rendera ingenting om modalen inte är öppen

      // --- Escape-tangent effekt ---
      React.useEffect(() => {
        const handleEscape = (event) => {
          // Stäng bara om Escape trycks OCH ingen åtgärd pågår
          if (event.key === 'Escape' && !isSubmitting) {
            console.log('[Modal Debug] Escape tryckt, stänger modal.'); // DEBUG
            onClose();
          }
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
          document.removeEventListener('keydown', handleEscape);
        };
        // Se till att onClose och isSubmitting är stabila referenser om möjligt,
        // men att inkludera dem här är oftast korrekt.
      }, [onClose, isSubmitting]);
      // --- Slut Escape-tangent effekt ---
      useEffect(() => {
        // Vi behöver inte spara originalstilen för denna workaround,
        // men loggningen kan vara kvar för felsökning.
        let originalOverflowStyle = '';

        // Kör bara om modalen ska vara öppen
        if (isOpen) {
            originalOverflowStyle = window.getComputedStyle(document.body).overflow;
            console.log('[Modal Scroll] Öppnar. Ursprunglig body overflow:', originalOverflowStyle);
            document.body.style.overflow = 'hidden';
            console.log('[Modal Scroll] Satt body overflow till: hidden');
        }

        // Cleanup-funktion: Körs när isOpen blir false eller komponenten avmonteras
        return () => {
            // Logga att cleanup körs
            console.log('%c[Modal Scroll] Cleanup körs (Workaround). Nuvarande body style:', 'color: red; font-weight: bold;', document.body.style.overflow);
            // Sätt ALLTID till 'auto' för att garantera att scroll återställs.
            document.body.style.overflow = 'auto';
            console.log('%c[Modal Scroll] Återställde body overflow till: auto (Workaround)', 'color: green;');
        };
    }, [isOpen]);

      
    if (!isOpen) {
      return null;
    }

  
  
    return (
      // Backdrop / Overlay (Dark mode med blur)
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center sm:px-4 transition-opacity duration-300 ease-in-out" // Uppdaterad bg, blur, padding
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        // Stäng modalen om man klickar utanför, men bara om 'isSubmitting' är false
        onClick={() => {
            if(!isSubmitting) {
                // *** DEBUG LOG ***
                console.log('[Modal Debug] Backdrop klickad, kallar onClose.');
                onClose();
            }
        }}
      >
        {/* Modal Panel / Fönstret (Dark mode styling) */}
        <div
          // Uppdaterade klasser för dark mode, storlek, maxhöjd och layout
          className="bg-[#121212] text-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          // Förhindra att klick inuti panelen stänger modalen
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header (matchar din exempelstruktur) */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-semibold text-white" id="modal-title">
              {title}
            </h2>
          </div>

          <div className="flex-grow px-6 py-4 overflow-y-auto" id="modal-description">
            {children}
          </div>

          {/* Footer / Åtgärdsområde */}
          <div className="flex-shrink-0 flex justify-end space-x-3 px-6 py-4 border-t border-[#2a2a2a] bg-[#181818]">
            {/* Avbryt-knapp (Dark mode stil) */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              // Anpassade dark mode-klasser för knappen
              className="px-4 py-2 bg-[#2a2a2a] text-gray-200 rounded-md hover:bg-[#3a3a3a] focus:outline-none focus:ring-2 focus:ring-[#4a4a4a] focus:ring-offset-2 focus:ring-offset-[#121212] transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Avbryt
            </button>
            {/* Bekräfta-knapp (Behåll grön eller anpassa för dark mode) */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              // Behåller grön som exempel, men lade till focus:ring-offset för dark bg
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#121212] transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {isSubmitting ? 'Godkänner...' : 'Bekräfta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

export default ConfirmModal;