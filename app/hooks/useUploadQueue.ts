import { useState, useMemo, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  uploadFile,
  deleteFileFromS3,
  UploadResponse,
} from "~/utils/uploadClient";

/* -------------------------------------------------------------
   Typer
------------------------------------------------------------- */
export interface UploadingFile {
  /** Klient-id (uuid) ELLER det riktiga databas-id:t för befintliga filer */
  id: string;
  /** Original-File-objektet – tomt på importerade filer */
  file: File;
  /** 0-100 % */
  progress: number;
  /** true när filen är helt uppladdad */
  uploaded: boolean;
  /** markerad för borttag (bara befintliga filer) */
  markedForDeletion?: boolean;
  /** svar från servern när uppladdningen är klar */
  result?: UploadResponse & { existing?: boolean };
}

/* -------------------------------------------------------------
   Hook
------------------------------------------------------------- */
export function useUploadQueue(taskId: string) {
  const [files, setFiles] = useState<UploadingFile[]>([]);

  /* –– util –– */
  const add = (f: UploadingFile) => setFiles((p) => [...p, f]);
  const patch = (id: string, p: Partial<UploadingFile>) =>
    setFiles((s) => s.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const remove = (id: string) => setFiles((s) => s.filter((f) => f.id !== id));

  /* ---------- 1. ladda upp NY fil ---------- */
  const startUpload = useCallback(
    (file: File) => {
      const id = uuidv4();
      add({ id, file, progress: 0, uploaded: false });

      uploadFile(file, taskId, (pct) => patch(id, { progress: pct }))
        .then((res) =>
          patch(id, {
            uploaded: true,
            progress: 100,
            result: { ...res, existing: false },
          })
        )
        .catch(() => remove(id)); // misslyckad upload
    },
    [taskId]
  );

  /* ---------- 2. importera BEFINTLIGA filer ---------- */
  type ExistingFile = {
    id: string; //  ← DB-id
    name: string;
    url: string;
    source: string;
  };

  const importExisting = useCallback((list: ExistingFile[]) => {
    setFiles(
      list.map((f) => ({
        id: f.id, // samma id som i DB
        file: { name: f.name } as unknown as File,
        progress: 100,
        uploaded: true,
        result: { ...f, existing: true }, // flagga existing = true
      }))
    );
  }, []);

  /* ---------- 3. markera / ta bort ---------- */
  const requestRemove = useCallback(
    async (id: string) => {
      const f = files.find((x) => x.id === id);
      if (!f) return;

      if (f.result?.existing) {
        // befintlig fil – markera bara
        patch(id, { markedForDeletion: true });
        return;
      }

      // ny uppladdad fil – ta bort från S3 direkt
      if (f.result?.url) await deleteFileFromS3(f.result.url).catch(() => {});
      remove(id);
    },
    [files]
  );

  /* ---------- 4. derived ---------- */
  const hasPending = useMemo(() => files.some((f) => !f.uploaded), [files]);

  const prepared = useMemo(
    () =>
      files
        .filter((f) => f.result || f.markedForDeletion)
        .map((f) => {
          return {
            id: f.id,
            name: f.result?.name,
            url: f.result?.url,
            source: f.result?.source,
            existing: !!f.result?.existing,
            markedForDeletion: f.markedForDeletion ?? false,
          };
        }),
    [files]
  );


  const reset = () => setFiles([]);

  return {
    /* state */
    files,
    hasPending,
    prepared,
    /* actions */
    startUpload,
    importExisting,
    requestRemove,
    reset,
  };
}
