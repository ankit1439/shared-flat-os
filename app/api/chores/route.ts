import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { memberById } from "@/lib/members";
import { ensureFlatBasics } from "@/lib/flat-setup";

function weekBounds(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  await ensureFlatBasics();

  const { start, end } = weekBounds();
  const assignments = await prisma.taskAssignment.findMany({
    where: { periodStart: start },
    include: { task: true, member: true, completedBy: true },
    orderBy: [{ task: { sortOrder: "asc" } }],
  });

  return NextResponse.json({ assignments, weekStart: start, weekEnd: end });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Chore name required." }, { status: 400 });

  const memberId =
    body.memberId && memberById(String(body.memberId))
      ? String(body.memberId)
      : who.id;

  const { start, end } = weekBounds();
  const sortOrder = await prisma.task.count();

  const task = await prisma.task.create({
    data: {
      title,
      kind: "chore",
      cadence: "weekly",
      rotationEnabled: true,
      sortOrder,
    },
  });

  const assignment = await prisma.taskAssignment.create({
    data: {
      taskId: task.id,
      memberId,
      periodStart: start,
      periodEnd: end,
      status: "pending",
    },
  });

  return NextResponse.json({ task, assignment }, { status: 201 });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const assignment = await prisma.taskAssignment.findUnique({ where: { id } });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "done") {
    const updated = await prisma.taskAssignment.update({
      where: { id },
      data: {
        status: "done",
        completedById: who.id,
        completedAt: new Date(),
      },
    });
    return NextResponse.json({ assignment: updated });
  }
  if (action === "skip") {
    const updated = await prisma.taskAssignment.update({
      where: { id },
      data: { status: "skipped", completedById: who.id, completedAt: new Date() },
    });
    return NextResponse.json({ assignment: updated });
  }
  if (action === "reassign") {
    const memberId = String(body.memberId ?? "");
    if (!memberById(memberId)) {
      return NextResponse.json({ error: "Unknown person" }, { status: 400 });
    }
    const updated = await prisma.taskAssignment.update({
      where: { id },
      data: { memberId, status: "pending", completedById: null, completedAt: null },
    });
    return NextResponse.json({ assignment: updated });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
