import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/session";
import { computePairwise, moneyForMember, netsFromPairs } from "@/lib/balances";
import { MEMBERS } from "@/lib/members";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const pairs = await computePairwise();
  const mine = moneyForMember(pairs, who.id);
  const nets = netsFromPairs(pairs);
  const people = MEMBERS.map((m) => ({
    ...m,
    netPaise: nets[m.id] ?? 0,
  }));

  return NextResponse.json({
    pairs,
    mine,
    people,
    nets,
  });
}
