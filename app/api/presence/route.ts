import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { memberById } from "@/lib/members";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const rows = await prisma.presence.findMany();
  return NextResponse.json({ presence: rows });
}

/** Manual tap or home Wi-Fi beacon. Beacon can send { memberId, state, source: "wifi" }. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const who = await getCurrentMember();
  const memberId = String(body.memberId || who?.id || "");
  if (!memberById(memberId)) {
    return NextResponse.json({ error: "Unknown person" }, { status: 400 });
  }
  const state = ["at_flat", "away", "unknown"].includes(String(body.state))
    ? String(body.state)
    : "unknown";
  const source = String(body.source ?? (who ? "manual" : "wifi"));

  const row = await prisma.presence.upsert({
    where: { memberId },
    update: {
      state,
      source,
      lastSeenAt: state === "at_flat" ? new Date() : undefined,
    },
    create: {
      memberId,
      state,
      source,
      lastSeenAt: state === "at_flat" ? new Date() : null,
    },
  });
  return NextResponse.json({ presence: row });
}
