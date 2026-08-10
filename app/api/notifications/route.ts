import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { memberId: who.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const unreadCount = await prisma.notification.count({
    where: { memberId: who.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "read_all") {
    await prisma.notification.updateMany({
      where: { memberId: who.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "read") {
    const id = String(body.id ?? "");
    const row = await prisma.notification.findUnique({ where: { id } });
    if (!row || row.memberId !== who.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.notification.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
