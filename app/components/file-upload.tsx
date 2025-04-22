// file-upload.tsx
import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLongHoverPress } from "~/hooks/useLongHoverPress";
import { getS3KeyFromUrl } from "~/utils/s3.shared";
import { deviceIsTouch } from "~/hooks/useLongHoverPress";

interface TaskForComponent {
  id: string;
  status: "pending" | "working" | "done";
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  source: "S3";
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  uploaded: boolean;
  markedForDeletion?: boolean;
  result?: UploadedFile;
}

interface Props {
  task: TaskForComponent;
  onUploadComplete: (files: UploadedFile[]) => void;
  uploadingFiles: UploadingFile[];
  setUploadingFiles: React.Dispatch<React.SetStateAction<UploadingFile[]>>;
}

interface FileBadgeProps {
  uploaded: boolean;
  progress: number;
  extension?: string;
  filename?: string;
  id: string;
  onRemove?: () => void;
}

export function FileBadge({
  uploaded,
  progress,
  extension,
  filename,
  id,
  onRemove,
}: FileBadgeProps) {
  const { activeId, bind, clear } = useLongHoverPress(500);
  const [filePendingDeletion, setFilePendingDeletion] = useState<{
    id: string;
    filename?: string;
  } | null>(null);
  const isActive = activeId === id;

  return (
    <div
      {...bind(id)}
      className={`relative w-9 h-9 group ${!uploaded ? "animate-pulse" : ""}`}
    >
      {isActive && (
        <div className="absolute -top-7 -left-5 bg-zinc-700 text-white text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-30 hidden md:block">
          {filename ?? extension}
        </div>
      )}
      <div className="relative w-full h-full rounded-full border-2 border-zinc-700 bg-zinc-800 text-white text-[10px] font-mono flex items-center justify-center">
        {isActive && uploaded ? (
          <button
            type={"button"}
            onClick={
              deviceIsTouch
                ? () => setFilePendingDeletion({ filename, id })
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        ) : (
          <span className="z-10">{extension?.toUpperCase() ?? "..."}</span>
        )}

        {/* Mobil meny – visas endast på små skärmar */}
        {filePendingDeletion && (
          <div className="sm:hidden font-sans fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
            {/* Klick utanför stänger */}
            <div
              className="absolute inset-0"
              onClick={() => setFilePendingDeletion(null)}
            />

            <div
              className="w-full bg-zinc-900 rounded-t-2xl p-4 z-10 space-y-4"
              style={{
                transform: "translateY(0%)",
                opacity: 1,
                transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
              }}
            >
              <p className="text-sm text-white">Vill du ta bort filen?</p>
              <p className="text-xs text-zinc-400 truncate">
                {filePendingDeletion.filename}
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setFilePendingDeletion(null);
                    clear();
                  }}
                  className="px-4 py-2 bg-zinc-700 rounded-md text-sm text-white"
                >
                  Avbryt
                </button>
                <button
                  onClick={async () => {
                    onRemove();
                    setFilePendingDeletion(null);
                    clear();
                  }}
                  className="px-4 py-2 bg-red-600 rounded-md text-sm text-white"
                >
                  Ta bort
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FileUploader({
  task,
  onUploadComplete,
  uploadingFiles,
  setUploadingFiles,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    selectedFiles.forEach(startUpload);
    e.target.value = "";
  }

  function triggerFileDialog() {
    if (task.status === "working") {
      fileInputRef.current?.click();
    }
  }

  function startUpload(file: File) {
    const id = uuidv4();
    const newUploading: UploadingFile = {
      id,
      file,
      progress: 0,
      uploaded: false,
    };

    setUploadingFiles((prev) => [...prev, newUploading]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", task.id);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress: percent } : f))
        );
      }
    });

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const uploaded: UploadedFile = response.files[0];
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, uploaded: true, progress: 100, result: uploaded }
              : f
          )
        );
        onUploadComplete([uploaded]);
      } else {
        console.error("Upload failed:", xhr.responseText);
      }
    };

    xhr.send(formData);
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-shrink-0">
        <button
          type="button"
          onClick={triggerFileDialog}
          disabled={task.status !== "working"}
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {uploadingFiles
        .filter((f) => !f.markedForDeletion)
        .map((f) => (
          <FileBadge
            key={f.id}
            id={f.id}
            uploaded={f.uploaded}
            progress={f.progress}
            extension={getExtension(f.file?.name)}
            filename={f.file?.name}
            onRemove={async () => {
              const isExisting = f.result?.existing;
              if (isExisting) {
                setUploadingFiles((prev) =>
                  prev.map((x) =>
                    x.id === f.id ? { ...x, markedForDeletion: true } : x
                  )
                );
                return;
              } else {
                // 🟢 Nya filer = OK att ta bort från S3 direkt
                const key = f.result?.url
                  ? getS3KeyFromUrl(f.result.url)
                  : null;
                if (key) {
                  const formData = new FormData();
                  formData.append("key", key);

                  try {
                    const res = await fetch("/api/files/remove", {
                      method: "POST",
                      body: formData,
                    });

                    const json = await res.json();
                    if (!json.success) {
                      console.error("Failed to delete from S3", json.error);
                    }
                  } catch (err) {
                    console.error("Error deleting from S3", err);
                  }
                }
              }
              setUploadingFiles((prev) => prev.filter((x) => x.id !== f.id));
            }}
          />
        ))}
    </div>
  );
}

function getExtension(filename: string | undefined) {
  return filename?.split(".").pop()?.toUpperCase() ?? "FILE";
}
