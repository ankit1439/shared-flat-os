import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const absences = await prisma.absencePeriod.findMany({
    where: { memberId: who.id },
    orderBy: { startDate: "desc" },
    take: 20,
  });
  return NextResponse.json({ absences });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const startDate = new Date(String(body.startDate ?? ""));
  const endDate = new Date(String(body.endDate ?? ""));
  if (Number.isNaN(+startDate) || Number.isNaN(+endDate) || endDate < startDate) {
    return NextResponse.json({ error: "Pick a valid start and end date." }, { status: 400 });
  }

  const absence = await prisma.absencePeriod.create({
    data: {
      memberId: who.id,
      startDate,
      endDate,
      note: String(body.note ?? "").trim() || null,
    },
  });

  // Mark away while planned absence covers today
  const now = new Date();
  if (startDate <= now && endDate >= now) {
    await prisma.presence.upsert({
      where: { memberId: who.id },
      update: { state: "away", source: "planned" },
      create: { memberId: who.id, state: "away", source: "planned" },
    });
  }

  return NextResponse.json({ absence }, { status: 201 });
}

export async function DELETE(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const row = await prisma.absencePeriod.findUnique({ where: { id } });
  if (!row || row.memberId !== who.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.absencePeriod.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
