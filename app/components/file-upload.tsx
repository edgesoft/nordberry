import { useEffect, useRef } from "react";
import { useUploadQueue } from "~/hooks/useUploadQueue";
import { FileBadge } from "./FileBadge";

interface TaskMini {
  id: string;
  status: "pending" | "working" | "done";
}

export function FileUploader({
  task,
  onUploadComplete,
  resetSignal,
  existingFiles = [], 
}: {
  task: TaskMini;
  onUploadComplete: (files: { name: string; url: string }[]) => void;
  resetSignal: number;
  existingFiles?: { name: string; url: string; source: string }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);



  const {
    files,
    startUpload,
    requestRemove,
    hasPending,
    prepared,
    reset,
    importExisting
  } = useUploadQueue(task.id);

  useEffect(() => {
    reset();
  }, [resetSignal]);


  useEffect(() => {
    if (
      existingFiles.length &&
      files.length === 0                     // ← ändringen
    ) {
      importExisting(existingFiles);
    }
  }, [existingFiles, importExisting, files]);

  useEffect(() => {
    if (!hasPending) {
      onUploadComplete(prepared);
    }
  }, [hasPending, prepared, onUploadComplete]);


  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(startUpload);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* välj-knapp */}
      <button
        type="button"
        disabled={task.status !== "working"}
        onClick={() => task.status === "working" && inputRef.current?.click()}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform ${
          task.status === "working"
            ? "bg-zinc-800 hover:bg-zinc-700 hover:scale-105 cursor-pointer"
            : "bg-zinc-700 opacity-50 cursor-not-allowed"
        }`}
        title="Ladda upp fil"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleSelect}
      />

      {/* badges */}
      {files
        .filter(f => !f.markedForDeletion)
        .map(f => (
          <FileBadge key={f.id} file={f} onRemove={() => requestRemove(f.id)} />
        ))}
    </div>
  );
}
