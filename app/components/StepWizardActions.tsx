type StepWizardActionsProps = {
    onBack?: () => void;
    onNextOrSave: () => void;
    nextOrSaveLabel: string;
    disableNextOrSave?: boolean;
    showBack?: boolean;
    onCancel?: () => void;
  };
  
  export function StepWizardActions({
    onBack,
    onNextOrSave,
    nextOrSaveLabel,
    disableNextOrSave,
    showBack,
    onCancel,
  }: StepWizardActionsProps) {
    return (
      <div className="flex justify-between items-center mt-4 gap-2">
        <div>
          {showBack && (
            <button
              onClick={onBack}
              className="text-sm text-gray-400 hover:text-white"
              type="button"
            >
              ← Tillbaka
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded"
              type="button"
            >
              Avbryt
            </button>
          )}
          <button
            onClick={onNextOrSave}
            disabled={disableNextOrSave}
            className={`${
              disableNextOrSave
                ? "bg-zinc-700 cursor-not-allowed"
                : "bg-green-700 hover:bg-green-600"
            } text-white text-sm px-4 py-2 rounded`}
            type="button"
          >
            {nextOrSaveLabel}
          </button>
        </div>
      </div>
    );
  }