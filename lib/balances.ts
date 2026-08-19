import { prisma } from "./db";
import { MEMBERS, MEMBER_IDS, shortName } from "./members";

export type NetMap = Record<string, number>;

export type PairDebt = {
  fromId: string;
  toId: string;
  amountPaise: number;
};

export type WithPerson = {
  memberId: string;
  short: string;
  name: string;
  /** What I owe this person. */
  owePaise: number;
  /** What this person owes me. */
  receivePaise: number;
};

export type MemberMoney = {
  owePaise: number;
  receivePaise: number;
  netPaise: number;
  withEach: WithPerson[];
};

/**
 * Person-to-person debts from existing expenses + approved settlements.
 * Does not rewrite stored rows. Does not shuffle debt across people.
 *
 * If Ankit paid a bill, Jayash's share is a debt Jayash → Ankit only.
 * A payment Ankit → Jayash only changes that pair.
 */
export async function computePairwise(): Promise<PairDebt[]> {
  const owed: Record<string, Record<string, number>> = {};
  for (const a of MEMBER_IDS) {
    owed[a] = Object.fromEntries(MEMBER_IDS.map((b) => [b, 0]));
  }

  const expenses = await prisma.expense.findMany({
    where: { voided: false },
    include: { participants: true },
  });

  for (const exp of expenses) {
    for (const p of exp.participants) {
      if (p.memberId === exp.paidById || p.sharePaise === 0) continue;
      owed[p.memberId][exp.paidById] += p.sharePaise;
    }
  }

  const settlements = await prisma.settlement.findMany({
    where: { status: "approved" },
  });

  for (const s of settlements) {
    if (s.fromId === s.toId || s.amountPaise === 0) continue;
    // from paid to → from owes to less (or to now owes from).
    owed[s.fromId][s.toId] -= s.amountPaise;
  }

  const pairs: PairDebt[] = [];
  for (let i = 0; i < MEMBER_IDS.length; i += 1) {
    for (let j = i + 1; j < MEMBER_IDS.length; j += 1) {
      const a = MEMBER_IDS[i];
      const b = MEMBER_IDS[j];
      const aOwesB = (owed[a][b] ?? 0) - (owed[b][a] ?? 0);
      if (aOwesB > 0) pairs.push({ fromId: a, toId: b, amountPaise: aOwesB });
      else if (aOwesB < 0) pairs.push({ fromId: b, toId: a, amountPaise: -aOwesB });
    }
  }
  return pairs;
}

export function moneyForMember(pairs: PairDebt[], memberId: string): MemberMoney {
  const withEach: WithPerson[] = MEMBERS.filter((m) => m.id !== memberId).map((m) => {
    const owe =
      pairs.find((p) => p.fromId === memberId && p.toId === m.id)?.amountPaise ?? 0;
    const receive =
      pairs.find((p) => p.fromId === m.id && p.toId === memberId)?.amountPaise ?? 0;
    return {
      memberId: m.id,
      short: m.short,
      name: m.name,
      owePaise: owe,
      receivePaise: receive,
    };
  });

  const owePaise = withEach.reduce((s, p) => s + p.owePaise, 0);
  const receivePaise = withEach.reduce((s, p) => s + p.receivePaise, 0);
  return {
    owePaise,
    receivePaise,
    netPaise: receivePaise - owePaise,
    withEach,
  };
}

/** Positive = should receive overall. Derived from pairs, not a second formula. */
export function netsFromPairs(pairs: PairDebt[]): NetMap {
  const nets: NetMap = Object.fromEntries(MEMBER_IDS.map((id) => [id, 0]));
  for (const p of pairs) {
    nets[p.fromId] = (nets[p.fromId] ?? 0) - p.amountPaise;
    nets[p.toId] = (nets[p.toId] ?? 0) + p.amountPaise;
  }
  return nets;
}

export async function computeNets(): Promise<NetMap> {
  return netsFromPairs(await computePairwise());
}

export function pairLabel(pair: PairDebt) {
  return `${shortName(pair.fromId)} owes ${shortName(pair.toId)}`;
}
