import { NextResponse } from "next/server";
import { ensurePinColumn, prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

/** Ensure production DB has newer columns/tables (safe to call repeatedly). */
export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  await ensurePinColumn();

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlatInfo" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlatInfo" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlatInfo" ADD COLUMN IF NOT EXISTS "locationRadiusM" INTEGER DEFAULT 250`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PushSubscription" (
        "id" TEXT PRIMARY KEY,
        "memberId" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL UNIQUE,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    /* ignore */
  }

  const body = await request.json().catch(() => ({}));
  if (body.resetAllPins === true) {
    await prisma.member.updateMany({ data: { pinHash: null } });
    return NextResponse.json({ ok: true, resetAllPins: true, migrated: true });
  }

  if (body.clearAmountRupees != null) {
    const paise = Math.round(Number(body.clearAmountRupees) * 100);
    if (Number.isFinite(paise) && paise > 0) {
      const result = await prisma.expense.updateMany({
        where: { voided: false, amountPaise: paise },
        data: { voided: true },
      });
      return NextResponse.json({ ok: true, cleared: result.count, amountPaise: paise });
    }
  }

  if (body.clearAllExpenses === true) {
    const result = await prisma.expense.updateMany({
      where: { voided: false },
      data: { voided: true },
    });
    return NextResponse.json({ ok: true, cleared: result.count });
  }

  return NextResponse.json({ ok: true, migrated: true });
}
