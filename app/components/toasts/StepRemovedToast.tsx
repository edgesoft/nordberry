import toast from "react-hot-toast";

export function StepRemovedToast({
  t,
  stepTitle,
  onUndo,
}: {
  t: { id: string; visible: boolean };
  stepTitle: string;
  onUndo: () => void;
}) {
  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-zinc-900 shadow-md rounded-md pointer-events-auto flex ring-1 ring-zinc-800 ring-opacity-50`}
    >
      <div className="flex-1 w-0 p-3">
        <div className="flex items-start gap-2">
          <div className="text-red-300 rounded-full bg-zinc-950 p-[6px] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
              strokeWidth={2}
              fill="none"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-semibold text-white">Steg borttaget</p>
            <p className="text-sm text-zinc-400">{stepTitle}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center px-1 gap-2 border-l border-zinc-800">
        <button
          onClick={() => {
            onUndo();
            toast.remove(t.id);
          }}
          className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition"
          aria-label="Ångra"
        >
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-4 h-4"
            strokeWidth={1.8}
            fill="none"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1"
            />
          </svg>
        </button>
        <button
          onClick={() => toast.remove(t.id)}
          className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition"
          aria-label="Stäng"
        >
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-4 h-4"
            strokeWidth={2}
            fill="none"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
