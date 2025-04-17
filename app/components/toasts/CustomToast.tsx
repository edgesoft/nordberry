import toast from "react-hot-toast";

type CustomToastProps = {
  t: { id: string; visible: boolean };
  name: string;
  message: string;
};

export function CustomToast({ t, name, message }: CustomToastProps) {
  return (
    <div
    onMouseDown={(e) => e.stopPropagation()}  
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-zinc-900 shadow-md rounded-md pointer-events-auto flex ring-1 ring-zinc-800 ring-opacity-50`}
    >
      <div className="flex-1 w-0 p-2">
        <div className="flex items-start gap-2">
          <div className="text-orange-200 rounded-full bg-zinc-950 p-[6px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M11 3a1 1 0 0 1 2 0v10a1 1 0 0 1-2 0V3zm1 16a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
            </svg>
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center border-l border-zinc-800 px-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
          aria-label="Close"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
