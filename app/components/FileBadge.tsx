import { useState } from "react";
import { useLongHoverPress, deviceIsTouch } from "~/hooks/useLongHoverPress";
import type { UploadingFile } from "~/hooks/useUploadQueue";

interface Props {
  file: UploadingFile;
  onRemove: () => void;
}

export function FileBadge({ file, onRemove }: Props) {
  const { activeId, bind, clear } = useLongHoverPress(500);
  const [pending, setPending] = useState<null | { id: string; name: string }>(
    null
  );
  const isActive = activeId === file.id;
  const ext = file.file.name.split(".").pop()?.toUpperCase() ?? "…";

  return (
    <div
      {...bind(file.id)}
      className={`relative w-9 h-9 ${file.uploaded ? "" : "animate-pulse"} group`}
    >
      {/* Desktop-tooltip */}
      {isActive && !deviceIsTouch && (
        <div className="absolute -top-7 -left-5 bg-zinc-700 text-white text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-30">
          {file.file.name}
        </div>
      )}

      {/* Cirkeln */}
      <div className="absolute inset-0 rounded-full border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center text-[10px] text-white font-mono">
        {isActive && file.uploaded ? (
          <button
            type="button"
            onClick={
              deviceIsTouch
                ? () => setPending({ id: file.id, name: file.file.name })
                : onRemove
            }
          >
            <svg
              className="w-7 h-7 text-zinc-500 z-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <span className="z-10">{ext}</span>
        )}
      </div>

      {pending && (
        <div className="sm:hidden font-sans fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setPending(null)} />

          <div className="w-full bg-zinc-900 rounded-t-2xl p-4 z-10 space-y-4">
            <p className="text-sm text-white">Vill du ta bort filen?</p>
            <p className="text-xs text-zinc-400 truncate">{pending.name}</p>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-zinc-700 rounded-md text-sm text-white"
                onClick={() => {
                  setPending(null);
                  clear();
                }}
              >
                Avbryt
              </button>
              <button
                className="px-4 py-2 bg-red-600 rounded-md text-sm text-white"
                onClick={() => {
                  onRemove();
                  setPending(null);
                  clear();
                }}
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
