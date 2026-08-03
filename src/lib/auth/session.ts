import { auth } from "./auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

/**
 * Server-side session gate for App Router pages/layouts.
 * Redirects unauthenticated users to /login.
 */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Server-side donor role gate.
 * Unauthenticated → /login; wrong role → /explore.
 */
export async function requireDonor(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "DONOR") {
    redirect("/explore");
  }
  return session;
}
