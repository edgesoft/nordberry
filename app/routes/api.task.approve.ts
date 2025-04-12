import { json } from "@remix-run/node";
import { prisma } from "../utils/db.server";
import { getAuth } from "@clerk/remix/ssr.server";
import { TaskRole, TaskStatus } from "@prisma/client";

export const action = async (args) => {
  const { userId } = await getAuth(args);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { request } = args;
  const formData = await request.formData();

  const taskId = formData.get("taskId")?.toString();
  const taskUserId = formData.get("userId")?.toString();

  if (!taskId || !taskUserId) {
    return json({ error: "Missing taskId or userId" }, { status: 400 });
  }

  console.log(`Attempting approval for Task: ${taskId}, User: ${taskUserId}`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Hämta aktuell task-info
      const currentTask = await tx.task.findUnique({
        where: { id: taskId },
        select: { id: true, status: true }
      });

      if (!currentTask) {
        throw new Error(`Task with ID ${taskId} not found.`);
      }

      // Steg 1: Godkänn TaskUser
      const updatedTaskUser = await tx.taskUser.updateMany({
        where: {
          taskId,
          userId: taskUserId,
        },
        data: {
          approved: true,
          updatedAt: new Date(),
        },
      });

      if (updatedTaskUser.count === 0) {
        throw new Error(`Could not find or update TaskUser assignment for Task ${taskId}, User ${taskUserId}.`);
      }

      // Steg 2: Kolla om alla approvers är klara
      const allApprovers = await tx.taskUser.findMany({
        where: {
          taskId,
          role: TaskRole.approver,
        },
        select: { approved: true }
      });

      const allAreApproved =
        allApprovers.length > 0 && allApprovers.every((a) => a.approved);

      let wasTaskMarkedDone = false;

      if (allAreApproved && currentTask.status !== TaskStatus.done) {
        await tx.task.update({
          where: { id: taskId },
          data: { status: TaskStatus.done },
        });
        wasTaskMarkedDone = true;
        console.log(`Task ${taskId} marked as DONE.`);
      }

      // Steg 3: Hitta alla taskar som har den här som dependency
      if (wasTaskMarkedDone) {
        const dependentTasks = await tx.task.findMany({
          where: {
            dependencies: {
              some: { id: taskId }
            },
            status: TaskStatus.pending,
          },
          select: {
            id: true,
            dependencies: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        for (const dependent of dependentTasks) {
          const allDepsDone = dependent.dependencies.every(
            (dep) => dep.status === TaskStatus.done
          );

          if (allDepsDone) {
            await tx.task.update({
              where: { id: dependent.id },
              data: { status: TaskStatus.working },
            });
            console.log(`Task ${dependent.id} is now unblocked and set to WORKING.`);
          } else {
            console.log(`Task ${dependent.id} still blocked by incomplete dependencies.`);
          }
        }
      }

      return { success: true, taskMarkedDone: wasTaskMarkedDone };
    });

    return json(result);
  } catch (error) {
    console.error("Error during task approval transaction:", error);
    return json(
      { error: error.message || "Failed to process approval" },
      { status: 500 }
    );
  }
};
