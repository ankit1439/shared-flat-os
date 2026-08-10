import { NextResponse } from "next/server";
import { memberById } from "@/lib/members";
import { SESSION_COOKIE } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const memberId = String(body.memberId ?? "");
  if (!memberById(memberId)) {
    return NextResponse.json({ error: "Unknown person" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, memberId });
  res.cookies.set(SESSION_COOKIE, memberId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
