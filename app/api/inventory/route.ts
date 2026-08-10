import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const item = await prisma.inventoryItem.create({
    data: {
      name,
      quantity: String(body.quantity ?? "").trim() || null,
      status: String(body.status ?? "ok"),
      updatedById: who.id,
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      quantity: body.quantity !== undefined ? String(body.quantity) : undefined,
      status: body.status ? String(body.status) : undefined,
      updatedById: who.id,
    },
  });
  return NextResponse.json({ item });
}
