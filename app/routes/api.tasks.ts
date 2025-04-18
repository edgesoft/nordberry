import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { requireUser } from "~/utils/auth.server";
import { getFilterStatuses, Statuses } from "~/utils/filter.server";

export const loader = async (args: LoaderArgs) => {
  const {request} = args
  try {
    const dbUser = await requireUser(args, {
      requireActiveStatus: true,
    });

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() || "";
    const excludes = url.searchParams.getAll("exclude");

    // 1) Hämta status‑filter och plocka ut de aktiva
    const rawStatuses = await getFilterStatuses(request);
    const activeStatuses = Object.entries(rawStatuses)
      .filter(([, on]) => on)
      .map(([status]) => status);

    if (!query) {
      return json({ tasks: [] });
    }

    // 2) Kör en enda AND‑lista som innehåller status‑filtret OCH ett OR‑block för text‑sök
    const tasks = await prisma.task.findMany({
      where: {
        AND: [
          // exkludera redan visade
          { id: { notIn: excludes } },
          // statusarna som är påslagna
          { status: { in: activeStatuses } },
          // titel / id / chain-namn villkor
          {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { id:    { contains: query             } },
              {
                chain: {
                  name: { contains: query, mode: "insensitive" },
                },
              },
            ],
          },
        ],
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id:          true,
        title:       true,
        status:      true,
        chain:       { select: { name: true } },
        assignments: { select: { userId: true } },
      },
    });

    // 3) Berika med canAccess
    const enriched = tasks.map((task) => ({
      ...task,
      canAccess: task.assignments.some((a) => a.userId === dbUser.id),
    }));


    return json({ tasks: enriched });
  } catch (e: any) {
    console.error("[api/tasks] failed", e);
    return json({ error: e.message }, { status: 500 });
  }
};