import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Protect /donor/* with Auth.js session (JWT on the edge).
 * Matcher keeps public routes (/, /login, /explore, /api/auth/*) untouched.
 */
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
