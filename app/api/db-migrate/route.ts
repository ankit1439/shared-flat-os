import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

/** Ensure production DB has the pinHash column (safe to call repeatedly). */
export async function POST() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "pinHash" TEXT`,
  );

  return NextResponse.json({ ok: true });
}
