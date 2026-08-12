import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { memberById } from "@/lib/members";

const PUBLIC_PREFIXES = [
  "/who",
  "/api/session",
  "/_next",
  "/favicon",
  "/icon",
  "/sw.js",
  "/manifest.webmanifest",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/presence")) {
    return NextResponse.next();
  }

  const who = request.cookies.get(SESSION_COOKIE)?.value;
  if (!who || !memberById(who)) {
    const url = request.nextUrl.clone();
    url.pathname = "/who";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
