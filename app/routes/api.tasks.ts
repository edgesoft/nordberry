import { json } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { getAuth } from "@clerk/remix/ssr.server";
import { requireUser } from "~/utils/auth.server";

export const loader = async (args: LoaderFunctionArgs) => {
   
  const dbUser = await requireUser(args, { requireActiveStatus: true });

  
    const { request } = args;
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() || "";
    const excludes = url.searchParams.getAll("exclude");
  
    if (!query) return json({ tasks: [] });
  
    const tasks = await prisma.task.findMany({
      where: {
        id: { notIn: excludes },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { id: { contains: query } },
          { chain: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      take: 20,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        chain: { select: { name: true } },
        assignments: { select: { userId: true } },
      },
    });
    
    const enriched = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      chain: task.chain,
      canAccess: task.assignments.some((a) => a.userId === dbUser?.id),
    }));

    console.log("tasks", enriched);
  
    return json({ tasks: enriched });
};
