import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { MEMBERS, shortName } from "@/lib/members";
import { computeNets, myOweReceive } from "@/lib/balances";
import { expireOldReminders } from "@/lib/reminders";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  await expireOldReminders();

  const [
    nets,
    presences,
    pendingForMe,
    shoppingCount,
    inventory,
    chores,
    recent,
    note,
    openReminders,
    unreadCount,
  ] = await Promise.all([
    computeNets(),
    prisma.presence.findMany(),
    prisma.settlement.findMany({
      where: { toId: who.id, status: "claimed" },
      include: { from: true },
      orderBy: { claimedAt: "desc" },
    }),
    prisma.shoppingItem.count({ where: { status: "needed" } }),
    prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }),
    prisma.taskAssignment.findMany({
      where: { status: "pending" },
      include: { task: true, member: true },
      orderBy: { periodStart: "desc" },
    }),
    prisma.expense.findMany({
      where: { voided: false },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { paidBy: true },
    }),
    prisma.importantNote.upsert({
      where: { id: "main" },
      update: {},
      create: { id: "main", body: "" },
    }),
    prisma.reminder.findMany({
      where: {
        status: "open",
        OR: [{ toId: who.id }, { toId: null }, { fromId: who.id }],
      },
      include: { from: true, to: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.notification.count({ where: { memberId: who.id, read: false } }),
  ]);

  const mine = myOweReceive(nets, who.id);
  const people = MEMBERS.map((m) => {
    const p = presences.find((x) => x.memberId === m.id);
    return {
      ...m,
      presence: p?.state ?? "unknown",
      lastSeenAt: p?.lastSeenAt,
    };
  });
  const homeCount = people.filter((p) => p.presence === "at_flat").length;
  const myChore = chores.find((c) => c.memberId === who.id) ?? null;

  return NextResponse.json({
    who,
    mine,
    people,
    homeCount,
    pendingForMe: pendingForMe.map((s) => ({
      id: s.id,
      fromName: shortName(s.fromId),
      amountPaise: s.amountPaise,
      note: s.note,
    })),
    shoppingCount,
    inventory,
    myChore: myChore
      ? { title: myChore.task.title, memberName: myChore.member.name }
      : null,
    recent,
    importantNote: {
      body: note.body,
      updatedAt: note.updatedAt,
      updatedByName: note.updatedById ? shortName(note.updatedById) : null,
    },
    reminders: openReminders.map((r) => ({
      id: r.id,
      message: r.message,
      fromId: r.fromId,
      fromName: shortName(r.fromId),
      toId: r.toId,
      toName: r.toId ? shortName(r.toId) : "Everyone",
      dueAt: r.dueAt,
      createdAt: r.createdAt,
      forMe: r.toId === who.id || r.toId === null,
    })),
    unreadCount,
  });
}
