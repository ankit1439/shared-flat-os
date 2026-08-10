import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { rupeesToPaise, splitEqual } from "@/lib/money";
import { MEMBER_IDS } from "@/lib/members";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const items = await prisma.shoppingItem.findMany({
    include: { addedBy: true, purchasedBy: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const item = await prisma.shoppingItem.create({
    data: { name, addedById: who.id, status: "needed" },
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const item = await prisma.shoppingItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "cancel") {
    const updated = await prisma.shoppingItem.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return NextResponse.json({ item: updated });
  }

  if (action === "buy") {
    const amountPaise = body.amountRupees ? rupeesToPaise(body.amountRupees) : null;
    const createExpense = Boolean(body.createExpense);
    let expenseId: string | null = null;

    if (createExpense && amountPaise && amountPaise > 0) {
      const shares = splitEqual(amountPaise, [...MEMBER_IDS]);
      const expense = await prisma.expense.create({
        data: {
          type: "groceries",
          title: item.name,
          amountPaise,
          paidById: who.id,
          splitMethod: "everyone",
          participants: {
            create: Object.entries(shares).map(([memberId, sharePaise]) => ({
              memberId,
              sharePaise,
            })),
          },
        },
      });
      expenseId = expense.id;
    }

    const updated = await prisma.shoppingItem.update({
      where: { id },
      data: {
        status: "purchased",
        purchasedById: who.id,
        purchasedAt: new Date(),
        amountPaise,
        expenseId,
      },
    });
    return NextResponse.json({ item: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
