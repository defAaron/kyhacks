import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types/next-auth";

/**
 * Edge-safe Auth.js config (no Prisma / bcrypt).
 * Used by middleware. Full credentials provider lives in auth.ts.
 */
export const authConfig = {
  trustHost: true,
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (!pathname.startsWith("/donor")) return true;

      if (!auth?.user) return false;
      return auth.user.role === "DONOR";
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? token.sub) as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
