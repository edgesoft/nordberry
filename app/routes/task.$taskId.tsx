import {
  Link,
  useFetcher,
  useLoaderData,
  useMatches,
  useRevalidator,
} from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useEffect, useMemo } from "react";
import { prisma } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import { getAuth } from "@clerk/remix/ssr.server";
import TaskStep from "~/components/task-step";
import { FileUploader } from "~/components/file-upload";
import { useNordEvent } from "~/hooks/useNordEvent";
import { CommentBubble } from "~/components/comment-bubble";
import { RichTextJsonEditor } from "~/components/editor/RichTextJsonEditor";
import { sourceMatchers } from "~/utils/sourceMatcher";
import toast from "react-hot-toast";
import { S3Storage } from "~/utils/s3.storage.driver.server";
import { getS3KeyFromUrl } from "~/utils/s3.shared";
import { useComments } from "~/hooks/useComments";
import { TaskApprovers } from "~/components/task/TaskApprovers";

export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {
  await requireUser(args, { requireActiveStatus: true });
  const { params } = args;
  const { taskId } = params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      chain: {
        select: {
          id: true,
          name: true,
          tasks: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              status: true,
              assignments: { select: { userId: true } },
            },
          },
        },
      },
      assignments: {
        include: { user: { select: { id: true, name: true, imageUrl: true } } },
      },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
          files: true,
        },
      },
      dependencies: {
        select: {
          id: true,
          title: true,
          status: true,
          chain: { select: { name: true } },
        },
      },
    },
  });
  if (!task) throw new Response("Task not found", { status: 404 });

  return json({ task, chain: task.chain });
};

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const fd = await args.request.formData();
  const content = fd.get("content")?.toString().trim();
  const taskId = fd.get("taskId")?.toString();
  const commentId = fd.get("commentId")?.toString() || undefined;
  const uploadedRaw = fd.getAll("uploadedFiles") as string[];

  const uploaded = uploadedRaw
    .map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!content || !taskId)
    return json({ error: "Invalid data" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!dbUser) return json({ error: "User not found" }, { status: 404 });

  const toDelIds = uploaded // befintliga + markerade
    .filter((f) => f.existing && f.markedForDeletion)
    .map((f) => f.id);

  const newFiles = uploaded // helt nya uppladdningar
    .filter((f) => !f.existing && !f.markedForDeletion);

  const s3 = new S3Storage();
  const comment = commentId
    ? await prisma.comment.update({
        where: { id: commentId },
        data: { content, editedAt: new Date() },
      })
    : await prisma.comment.create({
        data: { content, taskId, userId: dbUser.id },
      });

  if (toDelIds.length) {
    const doomed = await prisma.file.findMany({
      where: { id: { in: toDelIds } },
      select: { id: true, url: true },
    });

    for (const f of doomed) {
      const key = decodeURIComponent(getS3KeyFromUrl(f.url));

      if (key) {
        console.log(`Försöker ta bort S3-objekt med nyckel: ${key}`); // Logga nyckeln
        await s3.remove(key).catch((err) => {
          console.error(
            `Misslyckades att ta bort fil från S3 (key: ${key}, fileId: ${f.id}, commentId: ${comment.id}):`,
            err
          );
        });
      } else {
        console.warn(`Kunde inte extrahera S3-nyckel från URL: ${f.url} (fileId: ${f.id})`);
      }
    }

    await prisma.file.deleteMany({ where: { id: { in: toDelIds } } });
  }

  if (newFiles.length) {
    await prisma.file.createMany({
      data: newFiles.map((f) => ({
        name: f.name,
        url: f.url,
        source: f.source,
        userId: dbUser.id,
        commentId: comment.id,
      })),
    });
  }

  return json({ success: true });
};



const useRootData = () => {
  const root = useMatches().find((m) => m.id === "root")?.data;
  return { dbUser: root?.dbUser };
};

export default function TaskView() {
  const { task, chain } = useLoaderData<typeof loader>();
  const { dbUser } = useRootData();
  const fetcher = useFetcher();
  const commentDel = useFetcher();
  const revalidator = useRevalidator();

  const { state, actions } = useComments({
    initial: task.comments,
    dbUser,
    revalidate: () => revalidator.revalidate(),
  });

  const { comments, resetKey, editingId, commentJson, canPost, uploadedFiles } =
    state;

  const {
    setCommentJson,
    setCanPost,
    setUploadedFiles,
    startEdit,
    cancelEdit,
    applyOptimisticSave,
    maybeToastDelete,
  } = actions;


  useNordEvent((p) => {
    if (
      (p.table === "task" && p.data?.id === task.id) ||
      (p.table === "taskuser" && p.data?.taskId === task.id) ||
      (p.table === "comment" && p.data?.taskId === task.id) ||
      (p.table === "file" && p.data?.comment?.taskId === task.id)
    ) {
      p.revalidator.revalidate();
    }
  });

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      applyOptimisticSave();
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data]);

  

  useEffect(() => {
    if (commentDel.state === "idle") {
      maybeToastDelete(commentDel.data);
      if (commentDel.data?.error)
        toast.error(`Kunde inte ta bort kommentar: ${commentDel.data.error}`);
    }
  }, [commentDel.state, commentDel.data]);

  useEffect(() => {
    const h = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        setTimeout(
          () => el.scrollIntoView({ behavior: "smooth", block: "center" }),
          300
        );
      }
    };
    window.addEventListener("focusin", h);
    return () => window.removeEventListener("focusin", h);
  }, []);

  const steps = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        {chain.tasks.map((s) => (
          <TaskStep key={s.id} step={s} loggedInDbUserId={dbUser.id} useLink />
        ))}
      </div>
    ),
    [chain.tasks, dbUser.id]
  );

  const renderedComments = useMemo(() => {
    if (!comments.length) return null;
    return (
      <div className="space-y-3">
        {comments.map((c, i) => (
          <CommentBubble
            key={c.id}
            comment={c}
            dbUserId={dbUser.id}
            prevUserId={comments[i - 1]?.user.id}
            deleteFetcher={commentDel}
            editingCommentId={editingId}
            onEditRequest={() => startEdit(c)}
            onCancelEdit={cancelEdit}
          />
        ))}
      </div>
    );
  }, [comments, dbUser.id, editingId]);

  const isEnabled = canPost && task.status === "working";

  return (
    <>
      <div className="pt-20 pb-36 px-4 bg-black text-white min-h-screen space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-2">
          <Link
            to={`/chain/${chain.id}`}
            prefetch="intent"
            className="text-sm text-gray-400 hover:text-white mb-1 md:mb-0"
          >
            <span className="text-xl leading-none pr-1">←</span>
            Tillbaka
          </Link>
          <h1 className="text-lg font-semibold">
            {chain.name} / {task.title}
          </h1>
        </div>

        {steps}
        <TaskApprovers task={task} assignees={task.assignments} />
        {renderedComments}
      </div>

      {task.status === "working" && (
        <>
          <div className="h-10" />
          <div className="fixed bottom-0 inset-x-0 z-30 bg-[#181818] border-t border-zinc-800 px-2 py-3 space-y-2">
            <fetcher.Form method="post">
              <RichTextJsonEditor
                key={resetKey}
                isEditing={editingId !== null}
                initialJson={commentJson ? JSON.parse(commentJson) : undefined}
                onCanPostChange={setCanPost}
                onBlur={(d) => setCommentJson(JSON.stringify(d.json))}
              />

              <div className="flex items-center justify-between pt-1">
                <FileUploader
                  resetSignal={resetKey}
                  task={{ id: task.id, status: task.status }}
                  onUploadComplete={setUploadedFiles}
                  existingFiles={uploadedFiles}
                />

                <input type="hidden" name="taskId" value={task.id} />
                {editingId && (
                  <input type="hidden" name="commentId" value={editingId} />
                )}
                {commentJson && (
                  <input type="hidden" name="content" value={commentJson} />
                )}

                {uploadedFiles.map((f) => (
                  <input
                    key={f.id}
                    type="hidden"
                    name="uploadedFiles"
                    value={JSON.stringify(f)}
                  />
                ))}

                <button
                  disabled={!isEnabled}
                  title="Skicka"
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform ${
                    isEnabled
                      ? "bg-green-700 hover:bg-green-600 hover:scale-105"
                      : "bg-zinc-700 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <svg
                    className="w-4 h-4 relative left-[1px]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </fetcher.Form>
          </div>
        </>
      )}
    </>
  );
}
