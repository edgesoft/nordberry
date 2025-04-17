import { ringColors } from "~/utils/colors";
import Avatar from "~/components/avatar";
import { useLongHoverPress } from "~/hooks/useLongHoverPress";
import { Step } from "~/types/chainTypes";

export function StepList({
  steps,
  onEdit,
  editStepId,
  moveStep,
  removeStep,
}: {
  steps: Step[];
  onEdit: (s: Step | null) => void;
  editStepId: string | null;
  moveStep: (i: number, d: number) => void;
  removeStep: (i: number) => void;
}) {
  const { activeId, bind } = useLongHoverPress(500);
 

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`group relative flex justify-between items-center px-2 py-2 border border-gray-700 bg-zinc-900 rounded-md cursor-pointer ${
            editStepId === step.id
              ? "ring-1 ring-green-500 bg-green-900/60"
              : ""
          }`}
          {...bind(step.id)}
        >
          {(activeId === step.id || editStepId === step.id) && (
            <div className="absolute top-1 right-2 z-30">
              <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-sm px-2 py-1 rounded-xl shadow border border-zinc-800">
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, -1);
                    }}
                    className="p-1 rounded hover:bg-zinc-800 transition"
                    title="Flytta upp"
                  >
                    <svg
                      className="w-4 h-4 text-zinc-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 15.75l7.5-7.5 7.5 7.5"
                      />
                    </svg>
                  </button>
                )}
                {index < steps.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, 1);
                    }}
                    className="p-1 rounded hover:bg-zinc-800 transition"
                    title="Flytta ner"
                  >
                    <svg
                      className="w-4 h-4 text-zinc-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStep(index);
                  }}
                  className="p-1 rounded hover:bg-zinc-800 transition"
                  title="Ta bort"
                >
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {editStepId === step.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(null);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Avbryt
                  </button>
                )}
              </div>
            </div>
          )}
          <div
            className="relative text-white text-sm w-full"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(step);
            }}
          >
            <div className="flex justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex gap-1 ">
                <span className={`w-2 h-2 rounded-full mt-1.5 ${ringColors[step.status as keyof typeof ringColors]}`} />
                <span className="text-white font-medium">{step.title}</span>
              </span>
            
            </div>
              <div className="flex gap-0.5">
                {step.assignees?.map((a) => (
                  <Avatar key={a.id} size={6} user={a} />
                ))}
              </div>
            </div>
            <div className="relative flex gap-2 mt-1">
              {step.dependencies?.map((dep, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-300 bg-zinc-800 rounded-md"
                >
                  <span
                    className={`w-2 h-2 rounded-md ${ringColors[dep.status]}`}
                  />
                  <span>
                    {dep.chainName ? `${dep.chainName}/` : ""}
                    {dep.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}