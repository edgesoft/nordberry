// app/utils/auth.server.ts
import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { prisma } from "../utils/db.server";
import { UserStatus, UserRole } from "@prisma/client";
import { clerkClient } from "@clerk/clerk-sdk-node";

export type AuthenticatedDbUser = {
  id: string;
  clerkUserId: string | null;
  status: UserStatus;
  role: UserRole;
  name: string | null;
  email: string;
  imageUrl?: string | null;
};

const SIGN_IN_URL = "/sign-in";
const PENDING_APPROVAL_URL = "/pending-approval";

async function validateClerkUser(clerkUserId: string) {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    return { exists: true, user: clerkUser };
  } catch (error: any) {
    if (error.status === 404) {
      return { exists: false, user: null };
    }
    throw error;
  }
}

async function getClerkUserEmail(clerkUser: any): Promise<string | null> {
  return clerkUser.emailAddresses.find(
    (email: any) => email.id === clerkUser.primaryEmailAddressId
  )?.emailAddress ?? null;
}

async function handleReturningUser(clerkUser: any): Promise<AuthenticatedDbUser> {
  const email = await getClerkUserEmail(clerkUser);
  if (!email) {
    throw new Error("No email address found for Clerk user");
  }

  // Kolla om användaren finns med denna email
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      clerkUserId: true,
      status: true,
      role: true,
      name: true,
      email: true,
      imageUrl: true,
    },
  });

  if (existingUser) {
    console.log(`Found existing user with email ${email}. Updating Clerk ID...`);
    
    // Uppdatera med nytt Clerk ID och behåll status om active
    return await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        clerkUserId: clerkUser.id,
        status: existingUser.status === UserStatus.active 
          ? UserStatus.active 
          : UserStatus.pending_approval,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || existingUser.name,
        imageUrl: clerkUser.imageUrl ?? existingUser.imageUrl,
      },
      select: {
        id: true,
        clerkUserId: true,
        status: true,
        role: true,
        name: true,
        email: true,
        imageUrl: true,
      },
    });
  }

  // Om ingen användare hittas, skapa ny
  return await createInitialUser(clerkUser.id, clerkUser);
}

async function createInitialUser(
  clerkUserId: string,
  clerkUser: any
): Promise<AuthenticatedDbUser> {
  console.log(`Creating initial user record for Clerk user ${clerkUserId}`);

  try {
    const email = await getClerkUserEmail(clerkUser);
    if (!email) {
      throw new Error("No email address found for Clerk user");
    }

    const newUser = await prisma.user.create({
      data: {
        clerkUserId,
        email,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
        imageUrl: clerkUser.imageUrl,
        status: UserStatus.pending_approval,
        role: UserRole.executor,
      },
      select: {
        id: true,
        clerkUserId: true,
        status: true,
        role: true,
        name: true,
        email: true,
        imageUrl: true,
      },
    });

    console.log(`Successfully created user record for ${clerkUserId}`, newUser);
    return newUser;
  } catch (error) {
    console.error(`Failed to create user record for ${clerkUserId}:`, error);
    throw error;
  }
}

async function handleDeletedClerkUser(dbUser: AuthenticatedDbUser) {
  console.log(`Deactivating database user ${dbUser.id} as they no longer exist in Clerk`);
  
  try {
    const deactivatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { 
        status: UserStatus.deactivated,
        clerkUserId: null 
      },
      select: {
        id: true,
        clerkUserId: true,
        status: true,
        role: true,
        name: true,
        email: true,
        imageUrl: true,
      },
    });
    
    console.log(`Successfully deactivated database user ${dbUser.id}`);
    return deactivatedUser;
  } catch (error) {
    console.error(`Failed to deactivate database user ${dbUser.id}:`, error);
    throw error;
  }
}
export async function requireUser(
    args: LoaderFunctionArgs | ActionFunctionArgs,
    options?: { requireActiveStatus?: boolean }
  ): Promise<AuthenticatedDbUser> {
    const { requireActiveStatus = true } = options ?? {};
  
    try {
      const { userId: clerkUserId } = await getAuth(args);
      if (!clerkUserId) {
        console.info("No Clerk userId found. Redirecting to", SIGN_IN_URL);
        throw redirect(SIGN_IN_URL);
      }
  
      // Först, kolla om användaren finns i vår databas
      let dbUser = await prisma.user.findUnique({
        where: { clerkUserId },
        select: {
          id: true,
          clerkUserId: true,
          status: true,
          role: true,
          name: true,
          email: true,
          imageUrl: true,
        },
      });
  
      // Om vi har en användare i databasen, validera mot Clerk
      if (dbUser) {
        const { exists, user: clerkUser } = await validateClerkUser(clerkUserId);
        
        if (!exists) {
          // Användaren finns i vår DB men inte i Clerk
          console.log(`User ${clerkUserId} exists in database but not in Clerk`);
          await handleDeletedClerkUser(dbUser);
          throw redirect(SIGN_IN_URL);
        }
      } else {
        // Ingen användare i databasen, kolla om det är en återvändande användare
        const { exists, user: clerkUser } = await validateClerkUser(clerkUserId);
        
        if (!exists) {
          console.log(`User ${clerkUserId} not found in Clerk`);
          throw redirect(SIGN_IN_URL);
        }
  
        dbUser = await handleReturningUser(clerkUser);
        
        if (dbUser.status !== UserStatus.active) {
          throw redirect(PENDING_APPROVAL_URL);
        }
      }
  
      // Kontrollera användarstatus
      if (dbUser.status === UserStatus.deactivated) {
        throw redirect(SIGN_IN_URL);
      }
  
      if (requireActiveStatus && dbUser.status !== UserStatus.active) {
        const currentUrl = new URL(args.request.url);
        if (currentUrl.pathname === PENDING_APPROVAL_URL) {
          return dbUser;
        }
        throw redirect(PENDING_APPROVAL_URL);
      }
  
      return dbUser;
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      console.error("Error in requireUser:", error);
      throw redirect(SIGN_IN_URL);
    }
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
