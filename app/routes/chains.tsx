import { Outlet, useLoaderData, Link, useNavigate } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { json } from "@remix-run/node";
import TaskStep from "~/components/task-step";
import { requireUser } from "~/utils/auth.server";
import { useNordEvent } from "~/hooks/useNordEvent";

export async function loader(args: LoaderArgs) {
  const dbUser = await requireUser(args, { requireActiveStatus: true });

  const chains = await prisma.chain.findMany({
    where: {
      tasks: {
        // Filter chains based on tasks
        some: {
          // Where at least one task...
          assignments: {
            // ...has assignments (TaskUser records)...
            some: {
              // ...where at least one assignment...
              userId: dbUser.id, // ...matches the logged-in user's ID.
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc", // Sortera kedjor efter createdAt (senaste först)
    },
    // Behåll 'include' om du fortfarande vill ha med alla tasks för de filtrerade kedjorna
    include: {
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          // OCH inom varje task, inkludera...
          assignments: {
            // ...dess assignments
            select: { userId: true }, // ...och välj bara userId från dem
          },
        },
      },
    },
  });

  return json({ chains, dbUser });
}

export function EmptyChainsPanel() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm">
      {/* Header / ikon / grid-mönster-bakgrund */}
      <div className="bg-zinc-950 border-b border-zinc-800 p-6 flex justify-center items-center">
        {/* Exempelikon – byt gärna mot din egen SVG eller bild */}
        <svg
          className="h-8 w-8 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </div>

      {/* Text-content */}
      <div className="p-6 bg-zinc-930">
        <h3 className="text-white text-lg font-semibold mb-2">
          Inga kedjor ännu
        </h3>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Kom igång genom att skapa din första kedja för att strukturera
          arbetet.
        </p>

        <Link
          to="/chains/new"
          className="text-sm text-zinc-600  rounded-md font-medium hover:underline inline-flex items-center gap-1"
        >
          Skapa ny kedja
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function ChainView() {
  const navigate = useNavigate();
  const { chains, dbUser } = useLoaderData<typeof loader>();
  useNordEvent((payload) => {
    if (payload.table === "chain" && payload.action === "INSERT") {
      // Ny chain skapad — vi vet inte om den är "min" → vi måste dubbelkolla
      payload.revalidator.revalidate();
    }

    const taskIds = chains.flatMap((chain) => chain.tasks.map((t) => t.id));

    if (
      payload.table === "task" &&
      payload.action === "UPDATE" &&
      taskIds.includes(payload.data.id)
    ) {
      payload.revalidator.revalidate();
    }
  });

  return (
    <>
      <div className="pt-22 px-2 md:px-4 pb-24 bg-black min-h-screen text-white space-y-4  md:space-y-4">
        {chains.length === 0 && (
          <div className="flex justify-center px-4">
            <EmptyChainsPanel />
          </div>
        )}
        {chains.map((chain, i) => {
          return (
            <Link
              key={chain.id}
              prefetch="intent"
              to={`/chain/${chain.id}`}
              className="cursor-pointer bg-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700  flex flex-col gap-2 "
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {chain.name}
                </h2>
              </div>
              <div className="flex gap-2 flex-wrap">
                {chain.tasks.map((step) => {
                  return (
                    <TaskStep
                      loggedInDbUserId={dbUser.id}
                      key={step.id}
                      step={step}
                      useLink={false}
                    />
                  );
                })}
              </div>
            </Link>
          );
        })}
        {chains.length > 0 && (
          <button
            onClick={() => navigate(`/chains/new`)}
            className="fixed bottom-6 right-4  bg-green-700 hover:bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            aria-label="Skapa ny kedja"
          >
            <svg
              className="w-6 h-6"
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
        )}
        <Outlet />
      </div>
    </>
  );
}
