import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const assignments = await prisma.taskAssignment.findMany({
    include: { task: true, member: true, completedBy: true },
    orderBy: [{ periodStart: "desc" }, { task: { sortOrder: "asc" } }],
    take: 20,
  });
  return NextResponse.json({ assignments });
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
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
