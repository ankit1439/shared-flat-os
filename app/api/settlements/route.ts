import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { memberById } from "@/lib/members";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { notifyMembers } from "@/lib/notify";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const settlements = await prisma.settlement.findMany({
    include: { from: true, to: true },
    orderBy: { claimedAt: "desc" },
  });
  return NextResponse.json({ settlements });
}

const claimSchema = z.object({
  toId: z.string(),
  amountRupees: z.union([z.number(), z.string()]),
  note: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const parsed = claimSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the details." }, { status: 400 });
  }
  if (parsed.data.toId === who.id) {
    return NextResponse.json({ error: "You cannot pay yourself." }, { status: 400 });
  }
  if (!memberById(parsed.data.toId)) {
    return NextResponse.json({ error: "Unknown roommate." }, { status: 400 });
  }
  const amountPaise = rupeesToPaise(parsed.data.amountRupees);
  if (amountPaise <= 0) {
    return NextResponse.json({ error: "Amount must be more than 0." }, { status: 400 });
  }

  const settlement = await prisma.settlement.create({
    data: {
      fromId: who.id,
      toId: parsed.data.toId,
      amountPaise,
      note: parsed.data.note?.trim() || null,
      status: "claimed",
    },
    include: { from: true, to: true },
  });

  await notifyMembers({
    memberIds: [parsed.data.toId],
    title: `${who.short} says he paid you`,
    body: `${formatINR(amountPaise)}${parsed.data.note ? ` · ${parsed.data.note}` : ""} — please approve`,
    kind: "settlement",
    href: "/money",
    refId: settlement.id,
  });

  return NextResponse.json({ settlement }, { status: 201 });
}
