import {
  useRouteLoaderData,
  Link,
  useLoaderData,
  Outlet,
} from "@remix-run/react";
import { prisma } from "../utils/db.server";
import { json } from "@remix-run/node";
import { ringColors } from "../utils/colors";
import Avatar from "../components/avatar";
import { requireUser } from "../utils/auth.server";
import { useNordEvent } from "../hooks/useNordEvent";

export const loader = async (args: LoaderFunctionArgs) => {
  await requireUser(args, { requireActiveStatus: true });

  const { chainId } = args.params;

  if (!chainId) {
    throw new Response("Chain ID missing", { status: 400 });
  }

  const chain = await prisma.chain.findUnique({
    where: { id: chainId },
    include: {
      owner: {
        select: { name: true, id: true },
      },
      project: {
        select: { name: true },
      },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          assignments: {
            include: {
              user: {
                select: { id: true, name: true, imageUrl: true },
              },
            },
          },
          dependencies: {
            select: {
              id: true,
              title: true,
              status: true,
              chainId: true,
              chain: {
                select: { name: true },
              },
              assignments: {
                select: {
                  userId: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!chain) {
    throw new Response("Chain not found", { status: 404 });
  }

  const allTaskIds = chain.tasks.map((t) => t.id);

  const fileTaskLinks = await prisma.file.findMany({
    where: {
      comment: {
        taskId: { in: allTaskIds },
      },
    },
    select: {
      comment: {
        select: {
          taskId: true,
        },
      },
    },
  });

  const fileCountPerTask = new Map<string, number>();

  for (const file of fileTaskLinks) {
    const taskId = file.comment.taskId;
    fileCountPerTask.set(taskId, (fileCountPerTask.get(taskId) ?? 0) + 1);
  }

  const tasksWithFileCount = chain.tasks.map((task) => ({
    ...task,
    fileCount: fileCountPerTask.get(task.id) ?? 0,
  }));

  return json({
    chain: {
      ...chain,
      tasks: tasksWithFileCount,
    },
  });
};

const StepCard = ({ task }: StepCardProps) => {
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const currentRingColor =
    ringColors[task.status as keyof typeof ringColors] ?? "bg-gray-600";

  const loggedInDbUserId = rootData.dbUser.id;
  const isUserAssignedToOuterTask =
    loggedInDbUserId &&
    task.assignments?.some(
      (assignment: any) => assignment.user?.id === loggedInDbUserId
    );

  const interactiveClasses = isUserAssignedToOuterTask
    ? "hover:shadow-lg hover:border-zinc-700" // Clickable style
    : "opacity-70 cursor-not-allowed"; // Non-clickable style (Darkened)

  return (
    <div className={`relative`}>
      <div className="flex gap-3 items-start">
        <Link
          to={isUserAssignedToOuterTask ? `/task/${task.id}` : "#"}
          prefetch="intent"
          className={`bg-zinc-900 rounded-md shadow-md hover:shadow-lg w-full transition-shadow border border-[#2b2b2b] block ${interactiveClasses}`}
          aria-disabled={!isUserAssignedToOuterTask}
          title={
            isUserAssignedToOuterTask
              ? task.title
              : `${task.title} (ej tilldelad)`
          }
        >
          {/* Header */}
          <div className="px-2 py-3 text-sm font-medium text-white bg-[#1c1c1c] border-b border-[#2b2b2b] cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1e1e1e] border border-gray-700 text-[11px] text-gray-400 font-mono">
                <span className={`w-3 h-3 rounded-full ${currentRingColor}`} />#
                {task.id.slice(-6)}
              </span>
              <span className="text-white font-medium">{task.title}</span>
            </div>
          </div>
          {/* Body */}
          <div className="px-4 pt-3 pb-2 text-sm text-gray-300 space-y-2">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Assignees först */}
              {task.assignments && task.assignments.length > 0 && (
                <div className="flex gap-1">
                  {task.assignments.map((assignment) => {
                    const { approved, role, user } = assignment;
                    const isApprover = role === "approver";
                    const started = task.status !== "pending";

                    const ringClass = approved
                      ? "ring-emerald-400"
                      : isApprover && started
                      ? "ring-orange-400"
                      : "ring-gray-600";

                    return (
                      <div
                        key={assignment.user.id}
                        className={`ring-1 ml-1 rounded-full w-6 h-6 ${ringClass}`}
                      >
                        <Avatar user={assignment.user} size={6} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Kommentarer */}
              {task._count.comments > 0 && (
                <span className="w-auto h-6 px-2 py-0.5 rounded-full border border-gray-700 bg-black text-xs text-gray-400 inline-flex items-center gap-1">
                  💬 {task._count.comments}
                </span>
              )}

              {/* Filer */}
              {task.fileCount > 0 && (
                <span className="w-auto h-6 pl-1 pr-2 py-0.5 rounded-full border border-gray-700 bg-black text-xs text-gray-400 inline-flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12.79V7a5 5 0 00-10 0v9a3 3 0 006 0V9"
                    />
                  </svg>
                  {task.fileCount}
                </span>
              )}
            </div>
            {/* Dependencies */}
            {task.dependencies && task.dependencies.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500 pt-1">
                {task.dependencies.map((dep) => {
                  const isUserAssigned = dep.assignments?.some(
                    (assignment) => assignment.userId === loggedInDbUserId
                  );

                  const appearanceClasses = isUserAssigned
                    ? "text-gray-300 bg-zinc-800" // Interaktivt utseende
                    : "text-gray-500 bg-zinc-900 opacity-70"; // Icke-interaktivt utseende

                  const depRingColor =
                    ringColors[dep.status as keyof typeof ringColors] ??
                    "bg-gray-600";
                  const prefix =
                    dep.chainId !== task.chainId && dep.chain?.name
                      ? `${dep.chain.name} `
                      : "";
                  return (
                    <div
                      key={dep.id}
                      className={`flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md ${appearanceClasses}`}
                      title={`Status: ${dep.status}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${depRingColor} border border-gray-700`}
                      />
                      <span className="text-gray-400 font-semibold">
                        {prefix}
                      </span>
                      <span className="text-gray-500">{dep.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
};

export default function ChainView() {
  const { chain } = useLoaderData<typeof loader>();

  useNordEvent((payload) => {
    const taskId = payload.data.taskId;
    const isRelevant =
      (payload.table === "task" && payload.data.chainId === chain.id) ||
      (payload.table === "taskuser" &&
        taskId &&
        chain.tasks.some((t) => t.id === taskId)) ||
      (payload.table === "comment" &&
        taskId &&
        chain.tasks.some((t) => t.id === taskId)) ||
      (payload.table === "file" &&
        payload.data.comment?.taskId &&
        chain.tasks.some((t) => t.id === payload.data.comment.taskId)) ||
      (payload.table === "chain" && payload.data.id === chain.id);

    if (isRelevant) {
      payload.revalidator.revalidate();
    }
  });

  return (
    <>
      <div className="space-y-2 bg-black text-white min-h-screen pl-2 pr-2 pt-20 pb-20">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-wrap md:flex-nowrap items-center md:gap-4 mb-2 w-full">
            {/* Tillbaka-länk: Alltid först visuellt */}
            <Link
              to={`/chains`}
              prefetch="intent"
              className="text-sm text-gray-400 hover:text-white order-1" // order-1 säkerställer att den är först i flödet
            >
              <span className="text-xl leading-none pr-1">←</span>
              Tillbaka
            </Link>

            {/* Rubrik: Placeras under på mobil, bredvid Tillbaka på desktop */}
            <h1 className="text-white text-lg font-semibold order-3 md:order-2 w-full md:w-auto mt-1 md:mt-0 md:mr-auto">
              {" "}
              {/* order-3 & w-full för mobil wrap. order-2 & md:mr-auto för desktop layout */}
              {chain.name}
            </h1>

            {/* Redigera-knapp: Högst upp till höger på mobil, längst till höger på desktop */}
            <Link
              to={`/chain/${chain.id}/edit`}
              prefetch="intent"
              title="Redigera flöde"
              className="p-2 rounded-full bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition order-2 md:order-3 ml-auto md:ml-0" // order-2 & ml-auto för mobil högerkant. order-3 & md:ml-0 för desktop (positioneras av h1:s mr-auto)
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                {/* Ikonens path */}
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.572a2.5 2.5 0 013.536 3.536L8.5 21H5v-3.5L16.732 3.196z" />
              </svg>
            </Link>
          </div>
        </div>
        {chain.tasks.map((task, i) => (
          <div
            key={i}
            className="pt-2 md:pt-2 bg-zinc-950 rounded-2xl shadow-md md:pl-2 md:pr-2"
          >
            <div className="space-y-6">
              <div key={task.id}>
                <StepCard task={task} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Outlet />
    </>
  );
}
