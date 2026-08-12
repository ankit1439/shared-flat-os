import { NextResponse } from "next/server";
import { ensurePinColumn, prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

/** Ensure production DB has the pinHash column (safe to call repeatedly). */
export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  await ensurePinColumn();

  const body = await request.json().catch(() => ({}));
  if (body.resetAllPins === true) {
    await prisma.member.updateMany({ data: { pinHash: null } });
    return NextResponse.json({ ok: true, resetAllPins: true });
  }

  return NextResponse.json({ ok: true });
}
