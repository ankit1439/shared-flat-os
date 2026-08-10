import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { MEMBERS } from "@/lib/members";
import { monthRange, monthKey } from "@/lib/money";
import { EXPENSE_TYPES } from "@/lib/types";

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
    include: { participants: true },
  });

  const settlements = await prisma.settlement.findMany({
    where: {
      claimedAt: { gte: start, lt: end },
    },
    include: { from: true, to: true },
  });

  const totalPaise = expenses.reduce((s, e) => s + e.amountPaise, 0);
  const byType = EXPENSE_TYPES.map((t) => ({
    type: t.id,
    label: t.label,
    amountPaise: expenses.filter((e) => e.type === t.id).reduce((s, e) => s + e.amountPaise, 0),
  })).filter((t) => t.amountPaise > 0);

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

  return NextResponse.json({
    month,
    totalPaise,
    byType,
    people,
    settlements,
    expenseCount: expenses.length,
  });
}
