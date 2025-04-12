// app/utils/auth.server.ts
import { redirect, json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { prisma } from "../utils/db.server"; // Importera din Prisma-instans
import { UserStatus, UserRole } from "@prisma/client"; // Importera dina Prisma Enums


export type AuthenticatedDbUser = {
    id: string;          // Databasens User ID
    clerkUserId: string; // Clerk User ID
    status: UserStatus;
    role: UserRole;
    name: string | null;
    email: string;
};

const SIGN_IN_URL = "/sign-in";
const PENDING_APPROVAL_URL = "/pending-approval"; 

export async function requireUser(
    args: LoaderFunctionArgs | ActionFunctionArgs,
    options?: { requireActiveStatus?: boolean }
): Promise<AuthenticatedDbUser> {

    const { requireActiveStatus = true } = options ?? {};

    const { userId: clerkUserId } = await getAuth(args);
    if (!clerkUserId) {
        console.info("requireUser: Ingen Clerk userId. Omdirigerar till", SIGN_IN_URL);
        // Kasta redirect för att avbryta loader/action direkt
        throw redirect(SIGN_IN_URL);
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: clerkUserId },
        select: { 
            id: true,
            clerkUserId: true, 
            status: true,
            role: true,
            name: true,
            email: true
        }
    });

    if (!dbUser) {
        console.warn(`requireUser: Clerk user ${clerkUserId} hittades inte i databasen. Omdirigerar till`, PENDING_APPROVAL_URL);
        throw redirect(PENDING_APPROVAL_URL);
    }

    if (requireActiveStatus && dbUser.status !== UserStatus.active) {
        console.info(`requireUser: User ${dbUser.id} (${dbUser.email}) har status "${dbUser.status}". Omdirigerar till`, PENDING_APPROVAL_URL);

        const currentUrl = new URL(args.request.url);
        if (currentUrl.pathname === PENDING_APPROVAL_URL) {
             return dbUser as AuthenticatedDbUser;
        } else {
             throw redirect(PENDING_APPROVAL_URL);
        }
    }

    console.log(`requireUser: User ${dbUser.id} (${dbUser.email}) godkänd.`);
    return dbUser as AuthenticatedDbUser;
}



export async function requireClerkUserId(
     args: LoaderFunctionArgs | ActionFunctionArgs
 ): Promise<string> {
     const { userId: clerkUserId } = await getAuth(args);
     if (!clerkUserId) {
         throw redirect(SIGN_IN_URL);
     }
     return clerkUserId;
 }