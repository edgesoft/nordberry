import { useState, useEffect, useCallback } from "react";
import type { Comment, User } from "@prisma/client";
import toast from "react-hot-toast";
import { DeleteUndoToast } from "~/components/comment-bubble";

interface Params {
  initial: Comment[];
  dbUser: Pick<User, "id" | "name" | "imageUrl">;
  revalidate: () => void;
}

export function useComments({ initial, dbUser, revalidate }: Params) {
  const [comments, setComments] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentJson, setCommentJson] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [canPost, setCanPost] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [toastHistory, setToastHistory] = useState<Record<string, true>>({});

  const startEdit = useCallback((c: Comment) => {
    setEditingId(c.id);
    setCommentJson(c.content);
    setUploadedFiles(
      c.files.map((f) => ({
        name: f.name,
        url: f.url,
        source: f.source,
        existing: true,
        id: f.id
        
      }))
    );
    setResetKey((k) => k + 1);
    setTimeout(() => setCanPost(true), 10);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setCommentJson(null);
    setCanPost(false);
    setUploadedFiles([]);
    setResetKey((k) => k + 1);
  }, []);

  const clearToastHistoryEntry = useCallback((id: string) => {
    setToastHistory(prev => {
      const newState = { ...prev };
      delete newState[id]
      return newState;
    });
  }, []); 

  const applyOptimisticSave = useCallback(() => {
    if (!commentJson) return;
    if (editingId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? { ...c, content: commentJson, files: uploadedFiles }
            : c
        )
      );
    } else {
      setComments((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          content: commentJson,
          files: uploadedFiles,
          createdAt: new Date().toISOString(),
          user: dbUser,
        } as any,
      ]);
    }

    cancelEdit();
  }, [commentJson, uploadedFiles, editingId, dbUser, cancelEdit]);

  const maybeToastDelete = useCallback(
    (fetcherData: any) => {
      const id = fetcherData?.deletedCommentId;
      const show = id && !toastHistory[id];

      if (show) {
        setToastHistory((h) => ({ ...h, [id]: true }));
        toast.custom(
          (t) => (
            <DeleteUndoToast
              t={t}
              commentId={id}
              onUndoSuccess={() => {
                clearToastHistoryEntry(id)
                revalidate()

              }}
            />
          ),
          { duration: 5000 }
        );
      }
    },
    [toastHistory, revalidate]
  );

  useEffect(() => setComments(initial), [initial]);
  return {
    state: {
      comments,
      editingId,
      commentJson,
      resetKey,
      canPost,
      uploadedFiles,
    },
    actions: {
      setCommentJson,
      setComments,
      setCanPost,
      setUploadedFiles,
      startEdit,
      cancelEdit,
      applyOptimisticSave,
      maybeToastDelete,
    },
  };
}
