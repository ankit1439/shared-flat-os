import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { memberById, shortName } from "@/lib/members";
import { notifyMembers, notifyEveryoneExcept } from "@/lib/notify";
import { expireOldReminders, reminderExpiresAt } from "@/lib/reminders";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  await expireOldReminders();

  const reminders = await prisma.reminder.findMany({
    include: { from: true, to: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    reminders: reminders.map((r) => ({
      id: r.id,
      message: r.message,
      status: r.status,
      dueAt: r.dueAt,
      createdAt: r.createdAt,
      expiresAt: reminderExpiresAt(r.createdAt),
      fromId: r.fromId,
      fromName: shortName(r.fromId),
      toId: r.toId,
      toName: r.toId ? shortName(r.toId) : "Everyone",
      doneAt: r.doneAt,
    })),
  });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Write a reminder message." }, { status: 400 });

  const toRaw = body.toId === "everyone" || body.toId === "" || body.toId == null ? null : String(body.toId);
  if (toRaw && !memberById(toRaw)) {
    return NextResponse.json({ error: "Unknown roommate." }, { status: 400 });
  }
  if (toRaw === who.id) {
    return NextResponse.json({ error: "Pick someone else, or Everyone." }, { status: 400 });
  }

  let dueAt: Date | null = null;
  if (body.dueAt) {
    const d = new Date(String(body.dueAt));
    if (!Number.isNaN(+d)) dueAt = d;
  }

  const reminder = await prisma.reminder.create({
    data: {
      fromId: who.id,
      toId: toRaw,
      message,
      dueAt,
      status: "open",
    },
  });

  const title = `Reminder from ${who.short}`;
  if (toRaw) {
    await notifyMembers({
      memberIds: [toRaw],
      title,
      body: message,
      kind: "reminder",
      href: "/flat/reminders",
      refId: reminder.id,
    });
  } else {
    await notifyEveryoneExcept(who.id, {
      title,
      body: message,
      kind: "reminder",
      href: "/flat/reminders",
      refId: reminder.id,
    });
  }

  return NextResponse.json(
    { reminder: { ...reminder, expiresAt: reminderExpiresAt(reminder.createdAt) } },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "done") {
    const updated = await prisma.reminder.update({
      where: { id },
      data: { status: "done", doneAt: new Date(), doneById: who.id },
    });
    if (reminder.fromId !== who.id) {
      await notifyMembers({
        memberIds: [reminder.fromId],
        title: `${who.short} marked your reminder done`,
        body: reminder.message,
        kind: "reminder",
        href: "/flat/reminders",
        refId: reminder.id,
      });
    }
    return NextResponse.json({ reminder: updated });
  }

  if (action === "reopen") {
    const updated = await prisma.reminder.update({
      where: { id },
      data: { status: "open", doneAt: null, doneById: null, createdAt: new Date() },
    });
    return NextResponse.json({ reminder: updated });
  }

  if (action === "cancel") {
    if (reminder.fromId !== who.id && reminder.toId !== who.id) {
      return NextResponse.json({ error: "Only sender or receiver can cancel." }, { status: 403 });
    }
    const updated = await prisma.reminder.update({
      where: { id },
      data: { status: "cancelled", doneAt: new Date(), doneById: who.id },
    });
    return NextResponse.json({ reminder: updated });
  }

  if (action === "delete") {
    if (reminder.fromId !== who.id && reminder.toId !== who.id) {
      return NextResponse.json({ error: "Only sender or receiver can delete." }, { status: 403 });
    }
    // For "everyone" reminders, only the sender can delete.
    if (reminder.toId === null && reminder.fromId !== who.id) {
      return NextResponse.json({ error: "Only the sender can delete this." }, { status: 403 });
    }
    await prisma.reminder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
