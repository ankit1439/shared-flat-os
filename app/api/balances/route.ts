import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/session";
import { computeNets, myOweReceive, suggestTransfers } from "@/lib/balances";
import { MEMBERS } from "@/lib/members";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const nets = await computeNets();
  const mine = myOweReceive(nets, who.id);
  const people = MEMBERS.map((m) => ({
    ...m,
    netPaise: nets[m.id] ?? 0,
  }));
  const suggestions = suggestTransfers(nets);

  return NextResponse.json({ nets, mine, people, suggestions });
}
