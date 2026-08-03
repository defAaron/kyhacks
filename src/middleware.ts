import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Edge-safe donor gate — uses JWT session only (no Prisma/bcrypt bundle).
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.role !== "DONOR") {
    return NextResponse.redirect(new URL("/explore", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/donor/:path*"],
};
