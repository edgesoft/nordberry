import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import { getAuth } from "@clerk/remix/ssr.server";

export const action = async (args) => {
  const { userId } = await getAuth(args);
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  const { request } = args;
  const data = await request.json();

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: userId }
  });

  const { name, steps } = data;

  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const chain = await prisma.chain.create({
    data: {
      name,
      projectId: project.id,
      ownerId: dbUser.id,
    },
  });

  const localIdToRealId = new Map();
  const localIdToStep = new Map();

  // Förbered för att kunna kolla dependency-status innan vi skapar varje task
  for (let i = 0; i < steps.length; i++) {
    localIdToStep.set(steps[i].id, steps[i]);
  }

  // Skapa alla tasks utan dependencies först
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Separera externa från lokala dependencies
    const externalDependencyIds = step.dependencies
      .filter((d) => !d.local)
      .map((d) => d.id);

    // Hämta status på externa dependencies från databasen
    const externalDependencies = await prisma.task.findMany({
      where: {
        id: { in: externalDependencyIds }
      },
      select: { id: true, status: true }
    });

    const allExternalDepsDone = externalDependencies.every(
      (dep) => dep.status === "done"
    );

    const hasLocalDependencies = step.dependencies.some((d) => d.local);

    const initialStatus =
      !hasLocalDependencies && allExternalDepsDone
        ? "working"
        : "pending";

    const created = await prisma.task.create({
      data: {
        title: step.title,
        status: initialStatus,
        sortOrder: i,
        chainId: chain.id,
        assignments: {
          create: step.assignees.map((a) => ({
            userId: a.id,
            role: a.role,
          })),
        },
      },
    });

    localIdToRealId.set(step.id, created.id);
  }

  // Koppla dependencies (måste ske efter att alla tasks är skapade)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const currentTaskId = localIdToRealId.get(step.id);

    const connectDependencies = step.dependencies
      .map((d) => {
        if (d.local) {
          const resolved = localIdToRealId.get(d.id);
          return resolved ? { id: resolved } : null;
        } else {
          return { id: d.id };
        }
      })
      .filter(Boolean);

    if (connectDependencies.length > 0) {
      await prisma.task.update({
        where: { id: currentTaskId },
        data: {
          dependencies: {
            connect: connectDependencies,
          },
        },
      });
    }
  }

  return json({ success: true, id: chain.id });
};
