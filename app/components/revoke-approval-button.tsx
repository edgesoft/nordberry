// Fil: app/components/RevokeApprovalButton.jsx
import React, { useState, useCallback } from "react"; // useEffect behövs inte längre här (om inte för annat)
import { useFetcher } from "@remix-run/react";
import ConfirmModal from "../components/confirm-modal"; // Anpassa sökväg


// Interface för props (om du använder TypeScript)
interface RevokeApprovalButtonProps {
  taskId: string;
  userId: string;
  taskStatus: string; // Ta emot aktuell task-status
}

function RevokeApprovalButton({
  taskId,
  userId,
  taskStatus,
}: RevokeApprovalButtonProps) {
  // Egen fetcher för JUST denna återkallande-åtgärd
  const fetcher = useFetcher();
  // Eget state för JUST denna komponents bekräftelsemodal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Härledd state från fetcher och props
  const isSubmitting = fetcher.state !== "idle";
  const isTaskDone = taskStatus === "done";
  const isDisabled = isSubmitting || isTaskDone || taskStatus !== "working";

  //
  // --- Handlers för modal och submission ---
  const handleOpenModal = () => {
    // Kolla om tasken är klar innan modalen öppnas
    if (isTaskDone) {
      // Istället för toast kan du logga eller inte göra något
      console.warn("Försökte återkalla godkännande för slutförd uppgift.");
      // alert("Kan inte återkalla godkännande för slutförd uppgift."); // Gammaldags alert
      return;
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, [setIsModalOpen]); // Dependency är ok här

  const handleConfirmRevoke = () => {
    console.log(
      `[RevokeButton] Submitting Revoke - Task: ${taskId}, User: ${userId}`
    );
    fetcher.submit(
      { taskId, userId }, // Skicka med rätt IDs
      {
        method: "post",
        action: "/api/task/revoke-approval", // *** Dubbelkolla action URL ***
      }
    );
    // Stäng modalen när submit har startat
    handleCloseModal();
  };

  // --- useEffect för toast-feedback är borttagen ---

  // --- Render JSX ---
  return (
    <>
      {/* Själva knappen som användaren ser */}
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={isSubmitting || isTaskDone || taskStatus !== "working"} // Inaktivera om submit pågår eller task är klar
        title={isTaskDone ? "Uppgiften är slutförd" : "Ta bort godkännande"}
        // Dina Tailwind-klasser, anpassa för disabled/hover etc.
        className={`text-sm text-white p-1 rounded-full transition duration-150 ease-in-out ${
          isDisabled
            ? "bg-zinc-500 opacity-60 cursor-not-allowed"
            : "bg-zinc-700 hover:bg-red-600"
        }`} // Extra stil när submit pågår
      >
        {/* Ikon: Spinner vid submit, annars revoke-ikon */}
        {isSubmitting ? (
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          // Din revoke-ikon SVG här
          <svg
            className={"w-5 h-5"}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1"
            />
          </svg>
        )}
      </button>

      {/* Bekräftelsemodalen, styrs av denna komponents state */}
      <ConfirmModal
        // Se till att ConfirmModal INTE har någon toast-logik i sig heller
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmRevoke}
        title="Bekräfta återkallande"
        isSubmitting={isSubmitting} // Använd denna komponents fetcher-status
      >
        Är du säker på att du vill ta bort ditt godkännande?
      </ConfirmModal>
    </>
  );
}

export default RevokeApprovalButton;
