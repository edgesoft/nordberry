// file-upload.tsx
import { useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getS3KeyFromUrl } from "~/utils/s3.shared";

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
  onRemove?: () => void;
}



export function FileBadge({
  uploaded,
  progress,
  extension,
  filename,
  onRemove,
}: FileBadgeProps) {
  return (
    <div
      title={filename ?? extension}
      className={`relative w-9 h-9 group ${!uploaded ? "animate-pulse" : ""}`}
    >
      <div className="relative w-full h-full rounded-full border-2 border-zinc-700 bg-zinc-800 text-white text-[10px] font-mono flex items-center justify-center">
        {!uploaded && (
          <div
            className="absolute inset-0 bg-zinc-600 rounded-full z-0"
            style={{
              clipPath: `inset(${100 - progress}% 0% 0% 0%)`,
              transition: "clip-path 0.3s ease-in-out",
            }}
          />
        )}
        <span className="z-10">{extension?.toUpperCase() ?? "..."}</span>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          type={"button"}
          className="absolute -top-1 -right-0.5 w-4 h-4 bg-zinc-700 rounded-full flex items-center justify-center hover:bg-red-600 group-hover:opacity-100 opacity-0 transition-opacity z-20"
          title="Ta bort fil"
        >
          <svg
            className="w-3 h-3 text-zinc-900 group-hover:text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
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

      {uploadingFiles.filter((f) => !f.markedForDeletion).map((f) => (
        <FileBadge
          key={f.id}
          uploaded={f.uploaded}
          progress={f.progress}
          extension={getExtension(f.file?.name)}
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
              const key = f.result?.url ? getS3KeyFromUrl(f.result.url) : null;
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
