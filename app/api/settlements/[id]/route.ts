import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { notifyMembers } from "@/lib/notify";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Approve or reject." }, { status: 400 });
  }

  const settlement = await prisma.settlement.findUnique({ where: { id } });
  if (!settlement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (settlement.status !== "claimed") {
    return NextResponse.json({ error: "Already decided." }, { status: 400 });
  }
  if (settlement.toId !== who.id) {
    return NextResponse.json({ error: "Only the receiver can approve this." }, { status: 403 });
  }

  const updated = await prisma.settlement.update({
    where: { id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      decidedAt: new Date(),
    },
    include: { from: true, to: true },
  });

  await notifyMembers({
    memberIds: [settlement.fromId],
    title:
      action === "approve"
        ? `${who.short} approved your payment`
        : `${who.short} rejected your payment`,
    body: formatINR(settlement.amountPaise),
    kind: "settlement",
    href: "/money",
    refId: settlement.id,
  });

  return NextResponse.json({ settlement: updated });
}
