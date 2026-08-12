import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { MEMBERS, shortName } from "@/lib/members";
import { monthRange, monthKey } from "@/lib/money";
import { EXPENSE_TYPES, typeLabel } from "@/lib/types";

export async function GET(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || monthKey();
  const { start, end } = monthRange(month);

  const expenses = await prisma.expense.findMany({
    where: {
      voided: false,
      createdAt: { gte: start, lt: end },
    },
    include: {
      participants: true,
      paidBy: true,
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const settlements = await prisma.settlement.findMany({
    where: {
      claimedAt: { gte: start, lt: end },
    },
    include: { from: true, to: true },
    orderBy: { claimedAt: "desc" },
  });

  const totalPaise = expenses.reduce((s, e) => s + e.amountPaise, 0);
  const daysInMonth = new Date(end.getTime() - 1).getDate();
  const dayOfMonth = Math.min(
    new Date().getMonth() === start.getMonth() && new Date().getFullYear() === start.getFullYear()
      ? new Date().getDate()
      : daysInMonth,
    daysInMonth,
  );
  const dailyAvgPaise = dayOfMonth > 0 ? Math.round(totalPaise / dayOfMonth) : 0;

  const byType = EXPENSE_TYPES.map((t) => {
    const rows = expenses.filter((e) => e.type === t.id);
    const amountPaise = rows.reduce((s, e) => s + e.amountPaise, 0);
    return {
      type: t.id,
      label: t.label,
      amountPaise,
      count: rows.length,
      pct: totalPaise > 0 ? Math.round((amountPaise / totalPaise) * 100) : 0,
    };
  })
    .filter((t) => t.amountPaise > 0)
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const byPayer = MEMBERS.map((m) => {
    const rows = expenses.filter((e) => e.paidById === m.id);
    const amountPaise = rows.reduce((s, e) => s + e.amountPaise, 0);
    return {
      id: m.id,
      short: m.short,
      amountPaise,
      count: rows.length,
      pct: totalPaise > 0 ? Math.round((amountPaise / totalPaise) * 100) : 0,
    };
  }).sort((a, b) => b.amountPaise - a.amountPaise);

  const people = MEMBERS.map((m) => {
    const paid = expenses.filter((e) => e.paidById === m.id).reduce((s, e) => s + e.amountPaise, 0);
    const share = expenses.reduce((s, e) => {
      const p = e.participants.find((x) => x.memberId === m.id);
      return s + (p?.sharePaise ?? 0);
    }, 0);
    return {
      ...m,
      paidPaise: paid,
      sharePaise: share,
      netPaise: paid - share,
    };
  });

  const biggest = expenses[0]
    ? [...expenses].sort((a, b) => b.amountPaise - a.amountPaise)[0]
    : null;

  const topExpenses = [...expenses]
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, 8)
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      typeLabel: typeLabel(e.type),
      amountPaise: e.amountPaise,
      paidByName: shortName(e.paidById),
      createdAt: e.createdAt,
      notes: e.notes,
      itemCount: e.lines.length,
    }));

  // Day-by-day spend for sparkline / list
  const byDayMap = new Map<string, { dayKey: string; label: string; amountPaise: number; count: number }>();
  for (const e of expenses) {
    const d = new Date(e.createdAt);
    const dayKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const existing = byDayMap.get(dayKey);
    if (existing) {
      existing.amountPaise += e.amountPaise;
      existing.count += 1;
    } else {
      byDayMap.set(dayKey, { dayKey, label, amountPaise: e.amountPaise, count: 1 });
    }
  }
  const byDay = Array.from(byDayMap.values()).sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  const peakDay = byDay.length
    ? [...byDay].sort((a, b) => b.amountPaise - a.amountPaise)[0]
    : null;

  const approvedSettlements = settlements.filter((s) => s.status === "approved");
  const pendingSettlements = settlements.filter((s) => s.status === "claimed");
  const settledPaise = approvedSettlements.reduce((s, x) => s + x.amountPaise, 0);
  const pendingSettlePaise = pendingSettlements.reduce((s, x) => s + x.amountPaise, 0);

  const topCategory = byType[0] ?? null;
  const topPayer = byPayer.find((p) => p.amountPaise > 0) ?? null;
  const mostOwed = [...people].sort((a, b) => a.netPaise - b.netPaise)[0];
  const mostAhead = [...people].sort((a, b) => b.netPaise - a.netPaise)[0];

  return NextResponse.json({
    month,
    totalPaise,
    expenseCount: expenses.length,
    dailyAvgPaise,
    dayOfMonth,
    daysInMonth,
    byType,
    byPayer,
    byDay,
    people,
    topExpenses,
    peakDay,
    biggest: biggest
      ? {
          id: biggest.id,
          title: biggest.title,
          typeLabel: typeLabel(biggest.type),
          amountPaise: biggest.amountPaise,
          paidByName: shortName(biggest.paidById),
        }
      : null,
    insights: {
      topCategory,
      topPayer,
      mostOwed:
        mostOwed && mostOwed.netPaise < 0
          ? { short: mostOwed.short, netPaise: mostOwed.netPaise }
          : null,
      mostAhead:
        mostAhead && mostAhead.netPaise > 0
          ? { short: mostAhead.short, netPaise: mostAhead.netPaise }
          : null,
    },
    settlements: {
      all: settlements.map((s) => ({
        id: s.id,
        status: s.status,
        amountPaise: s.amountPaise,
        fromName: shortName(s.fromId),
        toName: shortName(s.toId),
        claimedAt: s.claimedAt,
      })),
      approvedCount: approvedSettlements.length,
      pendingCount: pendingSettlements.length,
      settledPaise,
      pendingSettlePaise,
    },
  });
}
