import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { StepList } from "../StepList/StepList";
import { AssigneeSelector } from "../selectors/AssigneeSelector";
import { DependencySelector } from "../selectors/DependencySelector";
import { StepWizardActions } from "../StepWizardActions";
import { CustomToast } from "../toasts/CustomToast";
import { StepRemovedToast } from "../toasts/StepRemovedToast";
import { createLocalId } from "~/utils/chainHelpers";
import type { Step } from "../chainTypes";

export type ChainEditorProps = {
  onClose(): void;
  initialName: string;
  initialSteps: Step[];
  mode: "create" | "edit";
  onSave(data: {
    name: string;
    steps: Step[];
    deletedSteps: string[];
  }): Promise<void>;
};

export function ChainEditor({
  onClose,
  initialName,
  initialSteps,
  mode,
  onSave,
}: ChainEditorProps) {

  const [chainName, setChainName] = useState(initialName);
  const [hasTouchedName, setHasTouchedName] = useState(false);
  const [stepFlow, setStepFlow] = useState(1);
  const [stepList, setStepList] = useState<Step[]>(initialSteps);
  const [editingName, setEditingName] = useState(false);
  const chainNameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dependencyDropdownRef = useRef<HTMLDivElement>(null);
  const stepTitleInputRef = useRef<HTMLInputElement>(null);
  const [editStepId, setEditStepId] = useState<string | null>(null);
  const [deletedSteps, setDeletedSteps] = useState<string[]>([]);

  const [currentStep, setCurrentStep] = useState<Omit<Step, "id">>({
    title: "",
    dependencies: [],
    assignees: [],
    status: "pending",
  });


  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      const n = e.target as Node;

      if (
        !modalRef.current?.contains(n) &&
        !dependencyDropdownRef.current?.contains(n)
      ) {
        const unsaved =
          stepList.length > 0 ||
          currentStep.title.trim() ||
          currentStep.dependencies.length > 0 ||
          currentStep.assignees.length > 0 ||
          hasTouchedName;
        if (!unsaved) onClose();
      }
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, [onClose, hasTouchedName, currentStep, stepList]);


  function handleEditStep(step: Step | null) {
    if (!step) {
      setEditStepId(null);
      setCurrentStep({
        title: "",
        dependencies: [],
        assignees: [],
        status: "pending",
      });
      setStepFlow(1);
      return;
    }
    setEditStepId(step.id);
    setCurrentStep({
      title: step.title,
      dependencies: step.dependencies,
      assignees: step.assignees,
      status: step.status ?? "pending",
    });
    setStepFlow(1);
  }

  const saveStep = () => {
    const hasApprover = currentStep.assignees.some(
      (a) => a.role === "approver"
    );
    if (!hasApprover) {
      if (navigator.vibrate) navigator.vibrate(10);
      toast.custom(
        (t) => (
          <CustomToast
            t={t}
            name="Skapa steg"
            message="Minst en approver krävs"
          />
        ),
        { duration: 2000 }
      );
      return;
    }

    if (editStepId) {
      setStepList((prev) =>
        prev.map((s) => (s.id === editStepId ? { ...s, ...currentStep } : s))
      );
      setEditStepId(null);
    } else {
      setStepList((prev) => [
        ...prev,
        { ...currentStep, id: createLocalId(), local: true },
      ]);
    }

    setCurrentStep({
      title: "",
      dependencies: [],
      assignees: [],
      status: "pending",
    });
    setStepFlow(1);
  };

  function removeStep(idx: number) {
    const removed = stepList[idx];
    setStepList((prev) => prev.filter((_, i) => i !== idx));
    if (!removed.local) setDeletedSteps((d) => [...d, removed.id]);

    toast.custom(
      (t) => (
        <StepRemovedToast
          t={t}
          stepTitle={removed.title}
          onUndo={() => {
            setStepList((prev) => {
              const nl = [...prev];
              nl.splice(idx, 0, removed);
              return nl;
            });
            if (!removed.local) {
              setDeletedSteps((d) => d.filter((id) => id !== removed.id));
            }
          }}
        />
      ),
      {
        position: "bottom-center",
      }
    );
  }

  const moveStep = (idx: number, dir: -1 | 1) => {
    setStepList((prev) => {
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;

      const current = prev[idx];
      const neighbor = prev[to];

      /* ----- status‑prioritet: lägre tal = högre upp i listan ----- */
      const prio: Record<Step["status"], number> = {
        done: 0,
        working: 1,
        pending: 2,
      };

      /* tillåt flytt bara om vi inte passerar “bättre” status */
      const movingUp = dir === -1;
      const movingDown = dir === 1;

      if (
        (movingUp && prio[current.status] > prio[neighbor.status]) ||
        (movingDown && prio[current.status] < prio[neighbor.status])
      ) {
        toast.custom((t) => (
          <CustomToast
            t={t}
            name="Sortering"
            message="Stegets status tillåter inte den här sorteringen."
          />
        ));
        return prev; // blockera flytten
      }

      const arr = [...prev];
      const [m] = arr.splice(idx, 1);
      arr.splice(to, 0, m);
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  };

  const handleSaveError = (message: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    toast.custom(
      (t) => (
        <CustomToast
          t={t}
          name="Spara flöde" // Behåll gemensam titel eller gör den också till parameter?
          message={message} // Använd meddelandet som skickas in
        />
      ),
      { duration: 2000 }
    );
    setEditingName(true); // Säkerställ att inputfältet visas
    setTimeout(() => {
      chainNameInputRef.current?.focus(); // Sätt fokus
    }, 0);
  };

  const saveChain = async () => {
    const trimmedName = chainName.trim();

    if (!trimmedName) {
      handleSaveError("Flödets namn får inte vara tomt.");
      return;
    }

    if (mode === "create" && !hasTouchedName) {
      handleSaveError("Du måste skriva in ett namn för flödet.");
      return;
    }

    await onSave({ name: trimmedName, steps: stepList, deletedSteps });
    onClose();
  };

  const currentIndex = editStepId
    ? stepList.findIndex((s) => s.id === editStepId)
    : stepList.length;
  const filteredLocal = stepList.filter(
    (s, i) => i < currentIndex && s.id !== editStepId
  );


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center sm:px-4 z-50">
      <div
        ref={modalRef}
        className="bg-[#121212] text-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div
          className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a2a]"
          onClick={() => {
            setEditingName(true);
            setTimeout(() => chainNameInputRef.current?.focus(), 0);
          }}
        >
          {editingName ? (
            <input
              ref={chainNameInputRef}
              value={chainName}
              onChange={(e) => {
                setChainName(e.target.value);
                if (!hasTouchedName) setHasTouchedName(true);
              }}
              onBlur={() => setEditingName(false)}
              autoFocus
              className="bg-transparent border-b border-gray-600 text-xl font-bold focus:outline-none"
            />
          ) : (
            <h2
              className="text-lg font-bold cursor-pointer"
              onClick={() => setEditingName(true)}
            >
              {chainName}
              <span className="bg-zinc-900 rounded-md px-2 py-1 text-gray-400 text-[10px] group-hover:text-white group-hover:bg-zinc-800 transition-colors">
                Redigera
              </span>
            </h2>
          )}
          <button
            onClick={() => {
              setStepFlow(1); // Återställ till första steget (eller ett neutralt värde om du har det)
              setEditStepId(null); // Återställ ev. redigerat steg
              setCurrentStep({ // Rensa nuvarande steg-data
                  title: "",
                  dependencies: [],
                  assignees: [],
                  status: "pending",
              });
              requestAnimationFrame(() => {
                onClose();
              });
            }}
            className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* lista */}
        {stepList.length > 0 && (
          <div className="px-4 pt-4">
            <StepList
              steps={stepList}
              removeStep={removeStep}
              onEdit={handleEditStep}
              moveStep={moveStep}
              editStepId={editStepId}
            />
          </div>
        )}

        {/* wizard */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* steg 1 */}
          {stepFlow === 1 && (
            <div className="space-y-4">
              <label className="text-sm text-gray-300">
                {stepList.length === 0
                  ? "Namn första steget"
                  : "Namn på nästa steg"}
              </label>
              <input
                ref={stepTitleInputRef}
                value={currentStep.title}
                onChange={(e) =>
                  setCurrentStep({ ...currentStep, title: e.target.value })
                }
                className="w-full bg-zinc-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <div className="flex justify-end">
                <StepWizardActions
                  onNextOrSave={() => setStepFlow(2)}
                  nextOrSaveLabel="Nästa"
                  disableNextOrSave={!currentStep.title.trim()}
                />
              </div>
            </div>
          )}

          {/* steg 2 */}
          {stepFlow === 2 && (
            <div className="space-y-4">
              <DependencySelector
                selected={currentStep.dependencies}
                onChange={(d) =>
                  setCurrentStep({ ...currentStep, dependencies: d })
                }
                dropdownRef={dependencyDropdownRef}
                localSteps={filteredLocal}
                targetStatus={currentStep.status ?? "pending"}
              />
              <StepWizardActions
                showBack
                onBack={() => setStepFlow(1)}
                onNextOrSave={() => setStepFlow(3)}
                nextOrSaveLabel="Nästa"
                onCancel={() => {
                  setEditStepId(null);
                  setCurrentStep({
                    title: "",
                    dependencies: [],
                    assignees: [],
                    status: "pending",
                  });
                  setStepFlow(1);
                }}
              />
            </div>
          )}

          {/* steg 3 */}
          {stepFlow === 3 && (
            <div className="space-y-4">
              <AssigneeSelector
                selected={currentStep.assignees}
                onChange={(a) =>
                  setCurrentStep({ ...currentStep, assignees: a })
                }
              />
              <StepWizardActions
                showBack
                onBack={() => setStepFlow(2)}
                onNextOrSave={saveStep}
                nextOrSaveLabel={editStepId ? "Uppdatera steg" : "+ Skapa steg"}
                disableNextOrSave={currentStep.assignees.length === 0}
                onCancel={() => {
                  setEditStepId(null);
                  setCurrentStep({
                    title: "",
                    dependencies: [],
                    assignees: [],
                    status: "pending",
                  });
                  setStepFlow(1);
                }}
              />
            </div>
          )}
        </div>

        {/* footer */}
        {stepList.length > 0 && (
          <div className="px-4 py-4 border-t border-[#2a2a2a] bg-[#181818] flex justify-end">
            <button
              onClick={saveChain}
              className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
            >
              Spara flöde
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
