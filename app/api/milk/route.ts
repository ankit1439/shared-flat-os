import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const rows = await prisma.milkParticipation.findMany({ include: { member: true } });
  return NextResponse.json({ participation: rows });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const participates = Boolean(body.participates);
  const row = await prisma.milkParticipation.upsert({
    where: { memberId: who.id },
    update: { participates },
    create: { memberId: who.id, participates },
  });
  return NextResponse.json({ participation: row });
}
