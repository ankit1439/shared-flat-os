import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { shortName } from "@/lib/members";
import { notifyEveryoneExcept } from "@/lib/notify";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const note = await prisma.importantNote.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", body: "" },
    include: { updatedBy: true },
  });

  return NextResponse.json({
    note: {
      body: note.body,
      updatedAt: note.updatedAt,
      updatedByName: note.updatedById ? shortName(note.updatedById) : null,
    },
  });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const text = String(body.body ?? "").trim();

  const note = await prisma.importantNote.upsert({
    where: { id: "main" },
    update: { body: text, updatedById: who.id },
    create: { id: "main", body: text, updatedById: who.id },
  });

  if (text) {
    await notifyEveryoneExcept(who.id, {
      title: "Important note updated",
      body: `${who.short}: ${text.slice(0, 120)}`,
      kind: "note",
      href: "/home",
      refId: note.id,
    });
  }

  return NextResponse.json({
    note: {
      body: note.body,
      updatedAt: note.updatedAt,
      updatedByName: who.short,
    },
  });
}
