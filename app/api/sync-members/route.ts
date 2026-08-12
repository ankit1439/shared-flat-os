import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MEMBERS } from "@/lib/members";

/** Sync the four roommate names from code into the database. */
export async function POST() {
  const updated = [];
  for (const m of MEMBERS) {
    const row = await prisma.member.upsert({
      where: { id: m.id },
      update: { name: m.name },
      create: { id: m.id, name: m.name },
    });
    updated.push({ id: row.id, name: row.name });
  }
  return NextResponse.json({ ok: true, updated });
}
