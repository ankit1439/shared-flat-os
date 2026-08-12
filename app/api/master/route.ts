import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { shortName, MEMBERS } from "@/lib/members";
import { typeLabel, EXPENSE_TYPES } from "@/lib/types";
import { formatINR } from "@/lib/money";
import { flatDayKey, formatFlatDate, formatFlatTime } from "@/lib/time";

export async function GET(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const memberId = searchParams.get("member");
  const month = searchParams.get("month");
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const sort = searchParams.get("sort") || "newest";

  const expenses = await prisma.expense.findMany({
    where: { voided: false },
    include: {
      paidBy: true,
      lines: true,
      participants: { include: { member: true }, orderBy: { memberId: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const settlements = await prisma.settlement.findMany({
    include: { from: true, to: true },
    orderBy: { claimedAt: "desc" },
  });

  type MasterRow = {
    id: string;
    kind: "expense" | "settlement";
    at: string;
    dayKey: string;
    date: string;
    weekday: string;
    time: string;
    type: string;
    typeLabel: string;
    title: string;
    items: string;
    itemLines: string[];
    amountPaise: number;
    amountLabel: string;
    paidById: string;
    paidByName: string;
    splitMethod: string;
    shares: Array<{
      memberId: string;
      memberName: string;
      sharePaise: number;
      shareLabel: string;
    }>;
    /** All four people in fixed order; 0 if not in split */
    shareMatrix: Array<{
      memberId: string;
      memberName: string;
      sharePaise: number;
      shareLabel: string;
      included: boolean;
    }>;
    sharesSummary: string;
    notes: string;
    status: string;
    toId?: string;
    toName?: string;
  };

  const rows: MasterRow[] = [];

  for (const e of expenses) {
    const at = e.createdAt;
    const shareMap = new Map(e.participants.map((p) => [p.memberId, p.sharePaise]));
    const shares = e.participants.map((p) => ({
      memberId: p.memberId,
      memberName: shortName(p.memberId),
      sharePaise: p.sharePaise,
      shareLabel: formatINR(p.sharePaise),
    }));
    const shareMatrix = MEMBERS.map((m) => {
      const sharePaise = shareMap.get(m.id) ?? 0;
      const included = shareMap.has(m.id);
      return {
        memberId: m.id,
        memberName: m.short,
        sharePaise,
        shareLabel: formatINR(sharePaise),
        included,
      };
    });
    const itemLines = e.lines.map((l) =>
      l.amountPaise != null ? `${l.name} (${formatINR(l.amountPaise)})` : l.name,
    );

    rows.push({
      id: e.id,
      kind: "expense",
      at: at.toISOString(),
      dayKey: flatDayKey(at),
      date: formatFlatDate(at, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      weekday: formatFlatDate(at, { weekday: "short" }),
      time: formatFlatTime(at),
      type: e.type,
      typeLabel: typeLabel(e.type),
      title: e.title,
      items: itemLines.join(", "),
      itemLines,
      amountPaise: e.amountPaise,
      amountLabel: formatINR(e.amountPaise),
      paidById: e.paidById,
      paidByName: shortName(e.paidById),
      splitMethod: e.splitMethod,
      shares,
      shareMatrix,
      sharesSummary: shares.map((s) => `${s.memberName} ${s.shareLabel}`).join(" · "),
      notes: e.notes ?? "",
      status: "recorded",
    });
  }

  for (const s of settlements) {
    const at = s.claimedAt;
    rows.push({
      id: s.id,
      kind: "settlement",
      at: at.toISOString(),
      dayKey: flatDayKey(at),
      date: formatFlatDate(at, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      weekday: formatFlatDate(at, { weekday: "short" }),
      time: formatFlatTime(at),
      type: "settlement",
      typeLabel: "Settlement",
      title: `${shortName(s.fromId)} → ${shortName(s.toId)}`,
      items: s.note ?? "",
      itemLines: s.note ? [s.note] : [],
      amountPaise: s.amountPaise,
      amountLabel: formatINR(s.amountPaise),
      paidById: s.fromId,
      paidByName: shortName(s.fromId),
      splitMethod: "settlement",
      shares: [],
      shareMatrix: MEMBERS.map((m) => ({
        memberId: m.id,
        memberName: m.short,
        sharePaise: 0,
        shareLabel: formatINR(0),
        included: m.id === s.fromId || m.id === s.toId,
      })),
      sharesSummary: `${shortName(s.fromId)} paid ${shortName(s.toId)}`,
      notes: s.note ?? "",
      status: s.status,
      toId: s.toId,
      toName: shortName(s.toId),
    });
  }

  let filtered = [...rows];

  if (type && type !== "all") {
    filtered = filtered.filter((r) => r.type === type);
  }
  if (memberId && memberId !== "all") {
    filtered = filtered.filter(
      (r) =>
        r.paidById === memberId ||
        r.toId === memberId ||
        r.shares.some((s) => s.memberId === memberId),
    );
  }
  if (month && month !== "all") {
    filtered = filtered.filter((r) => r.dayKey.slice(0, 7) === month);
  }
  if (q) {
    filtered = filtered.filter((r) => {
      const hay = [
        r.title,
        r.typeLabel,
        r.items,
        r.notes,
        r.paidByName,
        r.toName ?? "",
        r.sharesSummary,
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  filtered.sort((a, b) => {
    if (sort === "oldest") return +new Date(a.at) - +new Date(b.at);
    if (sort === "amount_high") return b.amountPaise - a.amountPaise;
    if (sort === "amount_low") return a.amountPaise - b.amountPaise;
    return +new Date(b.at) - +new Date(a.at);
  });

  const expenseRows = filtered.filter((r) => r.kind === "expense");
  const settlementRows = filtered.filter((r) => r.kind === "settlement");
  const totalPaise = expenseRows.reduce((sum, r) => sum + r.amountPaise, 0);
  const pendingPaise = settlementRows
    .filter((r) => r.status === "claimed")
    .reduce((sum, r) => sum + r.amountPaise, 0);
  const approvedPaise = settlementRows
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.amountPaise, 0);

  const byType = EXPENSE_TYPES.map((t) => {
    const list = expenseRows.filter((r) => r.type === t.id);
    return {
      type: t.id,
      label: t.label,
      count: list.length,
      amountPaise: list.reduce((s, r) => s + r.amountPaise, 0),
    };
  }).filter((t) => t.count > 0);

  const byPayer = MEMBERS.map((m) => {
    const list = expenseRows.filter((r) => r.paidById === m.id);
    return {
      memberId: m.id,
      name: m.short,
      count: list.length,
      amountPaise: list.reduce((s, r) => s + r.amountPaise, 0),
    };
  }).filter((p) => p.count > 0);

  return NextResponse.json({
    rows: filtered,
    summary: {
      count: filtered.length,
      expenseCount: expenseRows.length,
      settlementCount: settlementRows.length,
      pendingCount: settlementRows.filter((r) => r.status === "claimed").length,
      totalPaise,
      pendingPaise,
      approvedPaise,
      byType,
      byPayer,
    },
  });
}
