import { useLoaderData, Link, useFetcher, useMatches, useRevalidator } from "@remix-run/react";
import { prisma } from "../utils/db.server";
import { json } from "@remix-run/node";
import { useState, useEffect } from "react";
import Avatar from "../components/avatar";
import { getAuth } from "@clerk/remix/ssr.server";
import TaskStep from "../components/task-step";
import ConfirmModal from "../components/confirm-modal";
import { requireUser } from "../utils/auth.server";
import RevokeApprovalButton from "../components/revoke-approval-button";
import { FileUploader } from "../components/file-upload";
import { useNordEvent } from "../hooks/useNordEvent";
import { CommentBubble, DeleteUndoToast } from "../components/comment-bubble";
import { sourceMatchers } from "~/utils/sourceMatcher";
import toast from "react-hot-toast";

export const loader = async (args) => {
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
              assignments: {
                select: {
                  userId: true, // Vi behöver bara userId för jämförelsen i TaskStep
                },
              },
            },
          },
        },
      },
      assignments: {
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
        },
      },
      comments: {
        where: {
          deletedAt: null
        },
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

  const chain = task.chain;

  return json({ task, chain });
};



function extractLinkedFiles(content: string) {
  const results: { url: string; source: string; name: string }[] = [];

  for (const matcher of sourceMatchers) {
    const matches = content.match(matcher.regex) ?? [];
    for (const url of matches) {
      results.push({
        url,
        source: matcher.source,
        name: matcher.extractName(url),
      });
    }
  }

  return results;
}

export const action = async (args) => {
  const { userId } = await getAuth(args);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { request } = args;
  const formData = await request.formData();
  const content = formData.get("content")?.toString().trim();
  const taskId = formData.get("taskId")?.toString();
  const uploadedFilesRaw = formData.getAll("uploadedFiles") as string[];
  const uploadedFiles: UploadedFile[] = uploadedFilesRaw.map((f) =>
    JSON.parse(f)
  );

  if (!content || !taskId)
    return json({ error: "Invalid data" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  const comment = await prisma.comment.create({
    data: {
      content,
      taskId,
      userId: dbUser.id,
    },
  });


  const linkedFiles = extractLinkedFiles(content);


  await Promise.all(
    linkedFiles.map((file) =>
      prisma.file.create({
        data: {
          url: file.url,
          name: file.name,
          source: file.source as any, // typas som enum (S3, SHAREPOINT, etc)
          userId: dbUser.id,
          commentId: comment.id,
        },
      })
    )
  );

  if (uploadedFiles.length > 0) {
    await prisma.file.createMany({
      data: uploadedFiles.map((file) => ({
        name: file.name,
        url: file.url,
        source: file.source,
        userId: dbUser.id,
        commentId: comment.id,
      })),
    });
  }

  return json({ success: true });
};

const useRootData = () => {
  const rootData = useMatches().find((m) => m.id === "root")?.data;
  const dbUser = rootData?.dbUser;

  return { dbUser };
};

function TaskApprovers({ task, assignees }) {
  const fetcher = useFetcher();
  const { dbUser } = useRootData();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const canApprove = task.dependencies.every((d) => d.status === "done");
  const [confirmingAssignee, setConfirmingAssignee] = useState(null); // Initialt null

  const handleConfirmApproval = () => {
    fetcher.submit(
      { taskId: confirmingAssignee.taskId, userId: confirmingAssignee.userId }, // Datan som ska skickas
      { method: "post", action: "/api/task/approve" } // Metod och action
    );
    setIsConfirmModalOpen(false);
  };

  // Funktion för att öppna modalen
  const handleOpenModal = (assignee) => {
    setConfirmingAssignee(assignee);
    setIsConfirmModalOpen(true);
  };

  // Funktion för att stänga modalen
  const handleCloseModal = () => {
    // Förhindra stängning om en åtgärd redan pågår
    if (fetcher.state === "idle") {
      setConfirmingAssignee(null);
      setIsConfirmModalOpen(false);
    }
  };

  const isSubmitting = fetcher.state !== "idle";
  const isDisabled = !canApprove || isSubmitting || task.status !== "working";

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {assignees.map((assignee) => {
          const { approved, role, user } = assignee;
          const isApprover = role === "approver";

          if (role === "viewer") return null;

          const ringClass = approved
            ? "ring-emerald-400"
            : isApprover
            ? "ring-orange-400"
            : "ring-gray-600";

          return (
            <div
              key={user.id}
              className="flex items-center justify-between bg-zinc-800 p-2 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`ring-1 rounded-full w-6 h-6 ${ringClass}`}>
                  <Avatar user={user} size={6} />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {user.name}
                  </div>
                  <div className="text-xs text-zinc-400">{user.email}</div>
                </div>
              </div>

              {approved ? (
                <RevokeApprovalButton
                  taskId={task.id}
                  userId={user.id}
                  taskStatus={task.status}
                />
              ) : (
                assignee.user.id === dbUser?.id &&
                !assignee.approved &&
                isApprover && (
                  <>
                    <button
                      type="button" // Viktigt! Ändrat från "submit"
                      onClick={() => handleOpenModal(assignee)} // Öppnar modalen
                      title={
                        canApprove && task.status === "working"
                          ? "Godkänn steget"
                          : task.status === "working"
                          ? "Kan inte godkänna innan beroenden är klara"
                          : "Steget är inte i arbete"
                      }
                      // Inaktivera om man inte får godkänna ELLER om fetcher redan jobbar
                      disabled={isDisabled}
                      // Uppdatera klasser för att hantera 'disabled' och 'isSubmitting'
                      className={`text-sm text-white p-1 rounded-full transition duration-150 ease-in-out ${
                        !isDisabled
                          ? "bg-zinc-700 hover:bg-green-600" // Normal/Hover state
                          : "bg-zinc-500 opacity-60 cursor-not-allowed" // Disabled state (justerad färg/opacity)
                      }`}
                    >
                      {/* Valfritt: Visa en spinner när fetcher jobbar */}
                      {isSubmitting ? (
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          x
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        // Ordinarie ikon
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Rendera modalen villkorligt */}
                    <ConfirmModal
                      isOpen={isConfirmModalOpen}
                      onClose={handleCloseModal}
                      onConfirm={handleConfirmApproval}
                      title="Bekräfta godkännande"
                      isSubmitting={isSubmitting} // Skicka status till modalen
                    >
                      {/* Detta är `children` till modalen */}
                      Är du säker på att du vill godkänna detta steg? Detta kan
                      öppna nya steg och kedjor.
                    </ConfirmModal>
                  </>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskView() {
  const { task, chain } = useLoaderData<typeof loader>();
  useNordEvent((payload) => {
    if (
      (payload.table === "task" && payload.data?.id === task.id) ||
      (payload.table === "taskuser" && payload.data?.taskId === task.id) ||
      (payload.table === "comment" && payload.data?.taskId === task.id) ||
      (payload.table === "file" && payload.data?.comment?.taskId === task.id)
    ) {
      payload.revalidator.revalidate();
    }
  });

  const [comment, setComment] = useState("");
  const revalidator = useRevalidator(); // Hämta revalidator
  const { dbUser } = useRootData();
  const fetcher = useFetcher();
  const commentDeleteFetcher = useFetcher<{ success: boolean; deletedCommentId?: string; error?: string }>();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const uploadedFiles = uploadingFiles
    .filter((f) => f.uploaded && f.result)
    .map((f) => f.result!) as UploadedFile[];
  const hasUnfinishedUploads = uploadingFiles.some((f) => !f.uploaded);
  const [toastShownForId, setToastShownForId] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setComment("");
      setUploadingFiles([]);
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    const shouldShowToast =
        commentDeleteFetcher.state === 'idle' &&
        commentDeleteFetcher.data?.success &&
        commentDeleteFetcher.data.deletedCommentId &&
        // *** NYTT VILLKOR: Visa bara om vi INTE redan visat toast för detta ID ***
        commentDeleteFetcher.data.deletedCommentId !== toastShownForId;

    if (shouldShowToast) {
      const deletedId = commentDeleteFetcher.data.deletedCommentId;
      console.log('>>> Triggering UNDO Toast for ID:', deletedId);

      // *** Markera att toasten för detta ID nu visas ***
      setToastShownForId(deletedId);

      toast.custom((t) => (
          <DeleteUndoToast
              t={t}
              commentId={deletedId}
              onUndoSuccess={() => {
                  // När ångra lyckas, kör revalidate
                  revalidator.revalidate();
                  // Fundera på om du vill nollställa toastShownForId här,
                  // troligen inte nödvändigt eftersom deleteFetcher.data
                  // kommer vara annorlunda vid nästa radering.
                  // setToastShownForId(null);
              }}
          />
      ), { duration: 5000 });

    }
    // Hantera ev. fel från delete-action
    if (commentDeleteFetcher.state === 'idle' && commentDeleteFetcher.data?.error) {
        // Undvik att visa felmeddelande upprepade gånger också? Kanske inte lika kritiskt.
        toast.error(`Kunde inte ta bort kommentar: ${commentDeleteFetcher.data.error}`);
        revalidator.revalidate();
    }
    // *** Lägg till toastShownForId i dependency array ***
  }, [commentDeleteFetcher.state, commentDeleteFetcher.data, revalidator, toastShownForId]);



  useEffect(() => {
    const handler = (event: FocusEvent) => {
      const el = event.target as HTMLElement;

      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        // Ge tid för tangentbord att öppnas
        setTimeout(() => {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center", // centrera fältet mitt i vyn
          });
        }, 300); // funkar bäst med 300-500ms delay
      }
    };

    window.addEventListener("focusin", handler);
    return () => {
      window.removeEventListener("focusin", handler);
    };
  }, []);

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
          <h1 className="text-white text-lg font-semibold">
            {chain.name} / {task.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {chain.tasks.map((t) => {
            return (
              <TaskStep
                loggedInDbUserId={dbUser.id}
                key={t.id}
                step={t}
                useLink={true}
              />
            );
          })}
        </div>

        <div className="space-y-3">
          <TaskApprovers task={task} assignees={task.assignments} />
          {task.comments.length > 0 && (
            <>
              <div className="text-sm text-gray-400 uppercase mb-2"></div>
              {task.comments.map((comment, idx) => {
                const prev = task.comments[idx - 1];
                return (
                  <CommentBubble
                    key={comment.id}
                    comment={comment}
                    dbUserId={dbUser?.id}
                    prevUserId={prev && prev.user.id}
                    deleteFetcher={commentDeleteFetcher}
                    
                  />
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#181818] border-t border-zinc-800 px-2 py-3 space-y-2">
        <fetcher.Form method="post">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            disabled={task.status !== "working"}
            name="content"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
            placeholder="Skriv en kommentar..."
          />

          {/* Knapprad: vänster = upload + approve, höger = send */}
          <div className="flex items-center justify-between pt-1">
            {/* Vänstersida */}
            <div className="flex gap-2">
              <FileUploader
                onUploadComplete={(uploaded) => {
                  setUploadingFiles((prev) =>
                    prev.map((f) =>
                      !f.uploaded &&
                      uploaded.some(
                        (u) => u.name === f.file.name && u.url === f.url
                      )
                        ? {
                            ...f,
                            uploaded: true,
                            progress: 100,
                            result: uploaded.find(
                              (u) => u.name === f.file.name && u.url === f.url
                            ),
                          }
                        : f
                    )
                  );
                }}
                setUploadingFiles={setUploadingFiles}
                uploadingFiles={uploadingFiles}
                task={task}
              />
            </div>

            <input type="hidden" name="taskId" value={task.id} />
            {uploadedFiles.map((file) => (
              <input
                key={`${file.url}-${file.name}`}
                type="hidden"
                name="uploadedFiles"
                value={JSON.stringify(file)}
              />
            ))}
            <button
              disabled={
                !comment.trim() ||
                task.status !== "working" ||
                hasUnfinishedUploads
              }
              className={`
                w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform
                ${
                  task.status === "working" &&
                  comment.trim() &&
                  !hasUnfinishedUploads
                    ? "bg-green-700 hover:bg-green-600 hover:scale-105 cursor-pointer"
                    : "bg-zinc-700 opacity-50 cursor-not-allowed"
                }
              `}
              title="Skicka"
            >
              <svg
                className="w-4 h-4 relative left-[1px]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </fetcher.Form>
      </div>
    </>
  );
}
