import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types/next-auth";

type AuthUserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: Role;
};

async function findUserByEmail(
  email: string,
): Promise<AuthUserRecord | null> {
  const normalized = email.toLowerCase().trim();
  return prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
    },
  });
}

async function verifyPassword(
  password: string,
  user: AuthUserRecord,
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Dev / reverse-proxy friendly; AUTH_URL still preferred in production.
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await findUserByEmail(email);
        if (!user) return null;

        const valid = await verifyPassword(password, user);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
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
});
