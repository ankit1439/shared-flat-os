import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { memberById } from "@/lib/members";
import { rupeesToPaise, splitEqual } from "@/lib/money";
import { MEMBER_IDS } from "@/lib/members";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const issues = await prisma.maintenanceIssue.findMany({
    include: { reportedBy: true, assignedTo: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ issues });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const assignedToId = body.assignedToId && memberById(body.assignedToId) ? String(body.assignedToId) : null;
  const issue = await prisma.maintenanceIssue.create({
    data: {
      title,
      description: String(body.description ?? "").trim() || null,
      reportedById: who.id,
      assignedToId,
    },
  });
  return NextResponse.json({ issue }, { status: 201 });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const issue = await prisma.maintenanceIssue.findUnique({ where: { id } });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    status?: string;
    assignedToId?: string | null;
    resolvedAt?: Date | null;
    costPaise?: number | null;
    expenseId?: string | null;
  } = {};

  if (body.status) data.status = String(body.status);
  if (body.assignedToId !== undefined) {
    data.assignedToId = body.assignedToId && memberById(body.assignedToId) ? String(body.assignedToId) : null;
  }
  if (data.status === "resolved") data.resolvedAt = new Date();

  if (body.addCost && body.amountRupees) {
    const amountPaise = rupeesToPaise(body.amountRupees);
    if (amountPaise > 0) {
      const shares = splitEqual(amountPaise, [...MEMBER_IDS]);
      const expense = await prisma.expense.create({
        data: {
          type: "other",
          title: `Repair: ${issue.title}`,
          amountPaise,
          paidById: who.id,
          splitMethod: "everyone",
          participants: {
            create: Object.entries(shares).map(([memberId, sharePaise]) => ({
              memberId,
              sharePaise,
            })),
          },
        },
      });
      data.costPaise = amountPaise;
      data.expenseId = expense.id;
      data.status = "resolved";
      data.resolvedAt = new Date();
    }
  }

  const updated = await prisma.maintenanceIssue.update({ where: { id }, data });
  return NextResponse.json({ issue: updated });
}
