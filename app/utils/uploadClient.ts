import { getS3KeyFromUrl } from "~/utils/s3.shared";

export interface UploadResponse {
  id: string;
  name: string;
  url: string;
  type: string;
  source: "S3";
}

export function uploadFile(
  file: File,
  taskId: string,
  onProgress: (pct: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("taskId", taskId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload  = () =>
      xhr.status === 200
        ? resolve(JSON.parse(xhr.responseText).files[0])
        : reject(new Error(xhr.responseText));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export async function deleteFileFromS3(url: string) {
  const key = getS3KeyFromUrl(url);
  if (!key) return;
  const fd = new FormData();
  fd.append("key", key);
  await fetch("/api/files/remove", { method: "POST", body: fd });
}