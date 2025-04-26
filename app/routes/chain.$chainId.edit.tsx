import { json, redirect } from "@remix-run/node";
import { useNavigate, useLoaderData } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { ChainEditor } from "~/components/ChainEditor/ChainEditor";
import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Step } from "~/types/chainTypes";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const chainId = params.chainId!;
  const chain = await prisma.chain.findUnique({
    where: { id: chainId },
    include: {
      tasks: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          assignments: { include: { user: true } },
          dependencies: {
            include: { chain: { select: { name: true } } },
          },
        },
      },
    },
  });


  if (!chain) throw new Response("Flödet hittades inte", { status: 404 });

  const stepList: Step[] = chain.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    order: t.sortOrder ?? 0,
    local: false,
    status: t.status ?? "pending",
    chainName: chain.name, // allt ligger i samma kedja
    dependencies: t.dependencies.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status ?? "pending",
      chainName: d.chain?.name ?? chain.name,
    })),
    assignees: t.assignments.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      email: a.user.email,
      imageUrl: a.user.imageUrl ?? undefined,
      role: a.role, // "worker" | "approver" | "viewer"
    })),
  }));

  const activeUsers = await prisma.user.findMany({
    where: { status: "active" },
    select: { id: true, name: true, email: true, imageUrl: true },
    orderBy: { name: "asc" },
  });

  return json({
    activeUsers,
    id: chain.id,
    name: chain.name,
    steps: stepList,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const chainId = params.chainId;
  if (!chainId) return json({ error: "saknar id" }, 400);

  console.log("chainId", chainId);

  const { name, steps, deletedSteps } = (await request.json()) as {
    name: string;
    steps: Step[];
    deletedSteps: string[];
  };

  console.log(deletedSteps);


  await prisma.$transaction(async (db) => {
    /* ----- 1.1  uppdatera kedjenamn --------------------------------- */
    await db.chain.update({ where: { id: chainId }, data: { name } });

    /* ----- 1.2  Upsert / uppdatera varje task ----------------------- */
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const baseData = {
        title: s.title,
        sortOrder: i,
        status: s.status as any, // "pending" | "working" | "done"
      };

      const taskId = s.local /* nytt steg */
        ? (
            await db.task.create({
              data: { ...baseData, chainId },
              select: { id: true },
            })
          ).id
        : /* befintligt steg */ (
            await db.task.update({
              where: { id: s.id },
              data: baseData,
              select: { id: true },
            })
          ).id;

      /* ----- 1.2.a  synka ansvariga --------------------------------- */
      /* nuvarande assignments i DB */
      const currentAssignments = await db.taskUser.findMany({
        where: { taskId },
        select: { id: true, userId: true, role: true },
      });

      const wanted = s.assignees.map((a) => ({
        userId: a.id,
        role: a.role,
      }));

      /* ta bort de som inte längre finns */
      const toDelete = currentAssignments.filter(
        (cur) => !wanted.find((w) => w.userId === cur.userId)
      );
      if (toDelete.length) {
        await db.taskUser.deleteMany({
          where: { id: { in: toDelete.map((d) => d.id) } },
        });
      }

      /* uppdatera eller skapa */
      for (const w of wanted) {
        const existing = currentAssignments.find((c) => c.userId === w.userId);
        if (!existing) {
          await db.taskUser.create({
            data: { taskId, userId: w.userId, role: w.role },
          });
        } else if (existing.role !== w.role) {
          await db.taskUser.update({
            where: { id: existing.id },
            data: { role: w.role },
          });
        }
      }

      /* ----- 1.2.b  synka beroenden --------------------------------- */
      /* Vi nollställer alla nuvarande beroenden och lägger in nya.      */
      await db.task.update({
        where: { id: taskId },
        data: { dependencies: { set: [] } },
      });

      if (s.dependencies.length) {
        await db.task.update({
          where: { id: taskId },
          data: {
            dependencies: {
              connect: s.dependencies.map((d) => ({ id: d.id })),
            },
          },
        });
      }
    }

    /* ----- 1.3  Radera borttagna tasks + alla FK‐barn ------------ */
    if (deletedSteps.length) {
      // e) slutligen: radera själva Task‐raderna
      await db.task.deleteMany({
        where: { id: { in: deletedSteps } },
      });
    }
  });

  return redirect(`/chain/${chainId}`);
};

export default function EditChain() {
  const navigate = useNavigate();
  const { name, steps, id } = useLoaderData<typeof loader>();

  async function updateChain(data: {
    name: string;
    steps: any[];
    deletedSteps: string[];
  }) {
    try {
      await fetch(`/chain/${id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <ChainEditor
      onClose={() => navigate(-1)}
      initialName={name}
       mode="edit"
      initialSteps={steps}
      onSave={updateChain}
    />
  );
}
