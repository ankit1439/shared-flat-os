import { prisma } from "./db";
import { MEMBER_IDS } from "./members";

export type NetMap = Record<string, number>;

export async function computeNets(): Promise<NetMap> {
  const nets: NetMap = Object.fromEntries(MEMBER_IDS.map((id) => [id, 0]));

  const expenses = await prisma.expense.findMany({
    where: { voided: false },
    include: { participants: true },
  });

  for (const exp of expenses) {
    nets[exp.paidById] = (nets[exp.paidById] ?? 0) + exp.amountPaise;
    for (const p of exp.participants) {
      nets[p.memberId] = (nets[p.memberId] ?? 0) - p.sharePaise;
    }
  }

  const settlements = await prisma.settlement.findMany({
    where: { status: "approved" },
  });

  for (const s of settlements) {
    nets[s.fromId] = (nets[s.fromId] ?? 0) + s.amountPaise;
    nets[s.toId] = (nets[s.toId] ?? 0) - s.amountPaise;
  }

  return nets;
}

/** Positive = should receive. Suggest payments from debtors to creditors. */
export function suggestTransfers(nets: NetMap): Array<{ fromId: string; toId: string; amountPaise: number }> {
  const debtors = Object.entries(nets)
    .filter(([, n]) => n < 0)
    .map(([id, n]) => ({ id, left: -n }))
    .sort((a, b) => b.left - a.left);
  const creditors = Object.entries(nets)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, left: n }))
    .sort((a, b) => b.left - a.left);

  const out: Array<{ fromId: string; toId: string; amountPaise: number }> = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].left, creditors[j].left);
    if (pay > 0) {
      out.push({ fromId: debtors[i].id, toId: creditors[j].id, amountPaise: pay });
      debtors[i].left -= pay;
      creditors[j].left -= pay;
    }
    if (debtors[i].left === 0) i += 1;
    if (creditors[j].left === 0) j += 1;
  }
  return out;
}

export function myOweReceive(nets: NetMap, memberId: string) {
  const mine = nets[memberId] ?? 0;
  return {
    owePaise: mine < 0 ? -mine : 0,
    receivePaise: mine > 0 ? mine : 0,
    netPaise: mine,
  };
}
