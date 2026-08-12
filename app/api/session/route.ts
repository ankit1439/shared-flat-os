import { NextResponse } from "next/server";
import { ensurePinColumn, prisma } from "@/lib/db";
import { memberById } from "@/lib/members";
import { SESSION_COOKIE } from "@/lib/constants";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";

async function ensureMember(memberId: string, name: string) {
  await ensurePinColumn();
  return prisma.member.upsert({
    where: { id: memberId },
    update: { name },
    create: { id: memberId, name },
  });
}

/** Check whether this person already set a PIN (no login yet). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = String(searchParams.get("memberId") ?? "");
  const member = memberById(memberId);
  if (!member) return NextResponse.json({ error: "Unknown person" }, { status: 400 });

  const row = await ensureMember(memberId, member.name);
  return NextResponse.json({
    memberId,
    name: member.name,
    short: member.short,
    hasPin: Boolean(row.pinHash),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const memberId = String(body.memberId ?? "");
  const member = memberById(memberId);
  if (!member) {
    return NextResponse.json({ error: "Unknown person" }, { status: 400 });
  }

  // Clear PIN so this person can set a new one on next login
  if (body.action === "reset_pin") {
    await ensureMember(memberId, member.name);
    await prisma.member.update({
      where: { id: memberId },
      data: { pinHash: null },
    });
    return NextResponse.json({ ok: true, memberId, hasPin: false, reset: true });
  }

  const pin = String(body.pin ?? "");
  const mode = String(body.mode ?? "login"); // "set" | "login"
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "Enter a 4-digit PIN." }, { status: 400 });
  }

  const row = await ensureMember(memberId, member.name);

  if (!row.pinHash) {
    if (mode !== "set") {
      return NextResponse.json(
        { error: "Set a 4-digit PIN first.", needsSetPin: true },
        { status: 400 },
      );
    }
    await prisma.member.update({
      where: { id: memberId },
      data: { pinHash: hashPin(pin) },
    });
  } else {
    if (!verifyPin(pin, row.pinHash)) {
      return NextResponse.json({ error: "Wrong PIN. Try again." }, { status: 401 });
    }
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
