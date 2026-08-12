import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { memberById } from "@/lib/members";
import { ensureFlatBasics } from "@/lib/flat-setup";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  await ensureFlatBasics();

  const keys = await prisma.keyItem.findMany({
    include: {
      originalOwner: true,
      assignments: { where: { releasedAt: null }, include: { holder: true } },
    },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "Key name required." }, { status: 400 });

  const holderId =
    body.holderId && memberById(String(body.holderId))
      ? String(body.holderId)
      : who.id;

  const key = await prisma.keyItem.create({
    data: {
      label,
      originalOwnerId: holderId,
      status: "active",
    },
  });
  await prisma.keyAssignment.create({
    data: { keyId: key.id, holderId, reason: "original" },
  });

  return NextResponse.json({ key }, { status: 201 });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const keyId = String(body.keyId ?? "");
  const action = String(body.action ?? "");
  const key = await prisma.keyItem.findUnique({ where: { id: keyId } });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "lost") {
    await prisma.keyItem.update({ where: { id: keyId }, data: { status: "lost" } });
    return NextResponse.json({ ok: true });
  }

  if (action === "found") {
    await prisma.keyItem.update({ where: { id: keyId }, data: { status: "active" } });
    return NextResponse.json({ ok: true });
  }

  if (action === "transfer") {
    const holderId = String(body.holderId ?? "");
    if (!memberById(holderId)) {
      return NextResponse.json({ error: "Unknown person" }, { status: 400 });
    }
    await prisma.keyAssignment.updateMany({
      where: { keyId, releasedAt: null },
      data: { releasedAt: new Date() },
    });
    await prisma.keyAssignment.create({
      data: {
        keyId,
        holderId,
        reason: String(body.reason ?? "transfer"),
      },
    });
    await prisma.keyItem.update({ where: { id: keyId }, data: { status: "active" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
