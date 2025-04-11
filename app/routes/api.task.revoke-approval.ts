import { json } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { getAuth } from "@clerk/remix/ssr.server";
import { TaskRole, TaskStatus } from "@prisma/client";

export const action = async (args) => {
    const { userId } = await getAuth(args);
    if (!userId) return new Response("Unauthorized", { status: 401 });
  
    const { request } = args;

    const formData = await request.formData();

    // 3. Plocka ut värdena med samma nycklar som i fetcher.submit-objektet
    const taskId = formData.get("taskId")?.toString(); // Glöm inte .toString() (och ev. ?. )
    const taskUserId = formData.get("userId")?.toString(); // Detta är ID på användaren som ska bli godkänd

    // ----- Validering -----
    if (!taskId || !taskUserId) {
        return json({ error: "Missing taskId or userId" }, { status: 400 });
    }

    await prisma.taskUser.updateMany({
        where: {
          taskId: taskId,
          userId: taskUserId,
        },
        data: {
          approved: false,
          updatedAt: new Date(),
        },
      });
    
  
    return json({ test: true });
};
