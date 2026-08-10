import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { MEMBERS } from "@/lib/members";
import { computeNets } from "@/lib/balances";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const [nets, presences, keys, chores, absences, milk] = await Promise.all([
    computeNets(),
    prisma.presence.findMany(),
    prisma.keyItem.findMany({
      include: {
        assignments: { where: { releasedAt: null }, include: { holder: true } },
      },
    }),
    prisma.taskAssignment.findMany({
      where: { status: "pending" },
      include: { task: true },
    }),
    prisma.absencePeriod.findMany(),
    prisma.milkParticipation.findMany(),
  ]);

  const people = MEMBERS.map((m) => {
    const key = keys.find((k) => k.assignments.some((a) => a.holderId === m.id));
    const chore = chores.find((c) => c.memberId === m.id);
    const presence = presences.find((p) => p.memberId === m.id);
    const away = absences.find(
      (a) => a.memberId === m.id && a.startDate <= new Date() && a.endDate >= new Date(),
    );
    const drinksMilk = milk.find((x) => x.memberId === m.id)?.participates ?? true;
    return {
      ...m,
      netPaise: nets[m.id] ?? 0,
      presence: presence?.state ?? "unknown",
      lastSeenAt: presence?.lastSeenAt,
      keyLabel: key?.label ?? null,
      chore: chore?.task.title ?? null,
      away: away
        ? { start: away.startDate, end: away.endDate, note: away.note }
        : null,
      drinksMilk,
    };
  });

  return NextResponse.json({ people, me: who.id });
}
