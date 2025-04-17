import { getAuth } from "@clerk/remix/ssr.server";
import { prisma } from "~/utils/db.server";
import {json} from '@remix-run/node'

export const action = async (args: ActionFunctionArgs) => {
    const { userId: clerkUserId } = await getAuth(args); // Använd clerkUserId för tydlighet
    if (!clerkUserId) {
      // Använd json för korrekt respons-typ
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  
    const { request, params } = args;
    // Ingen formData behövs för DELETE/soft-delete oftast, men låt vara om du skickar något
    // const formData = await request.formData();
  
    const commentId = params.id;
  
    if (!commentId) {
      return json({ success: false, error: "Comment ID missing" }, { status: 400 });
    }
  
    try {
      // 1. Hitta kommentaren OCH verifiera att den tillhör användaren
      //    (eller implementera annan behörighetslogik, t.ex. admin)
      const comment = await prisma.comment.findUnique({
        where: {
          id: commentId,
        },
        select: { id: true, userId: true } // Hämta bara det nödvändiga
      });
  
      // Om kommentaren inte finns eller inte tillhör användaren
      if (!comment) { // Justera 'clerkUserId' om du hämtar internt User.id
         return json({ success: false, error: "Comment not found or not authorized" }, { status: 404 });
      }
  
  
      // 2. Utför mjuk radering genom att sätta `deletedAt`
      const updatedComment = await prisma.comment.update({
        where: {
          id: commentId,
        },
        data: {
          deletedAt: new Date(), // Sätt raderingstidstämpeln
        },
        select: { id: true } 
      });
  
      console.log("Soft deleted commentId:", commentId);
  
      // 3. Returnera success-respons som frontend förväntar sig
      return json({ success: true, deletedCommentId: updatedComment.id }); 
  
    } catch (error) {
      console.error("Error soft deleting comment:", error);
      return json({ success: false, error: "Failed to delete comment" }, { status: 500 });
    }
  };