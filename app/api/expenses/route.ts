import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { MEMBER_IDS, memberById, shortName } from "@/lib/members";
import { EXPENSE_TYPE_IDS, typeLabel } from "@/lib/types";
import { rupeesToPaise, splitEqual } from "@/lib/money";
import { notifyEveryoneExcept } from "@/lib/notify";

const bodySchema = z.object({
  type: z.enum(EXPENSE_TYPE_IDS as [string, ...string[]]),
  title: z.string().min(1).max(120),
  amountRupees: z.union([z.number(), z.string()]),
  paidById: z.string(),
  split: z.enum(["everyone", "selected", "custom"]).default("everyone"),
  memberIds: z.array(z.string()).optional(),
  customShares: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  notes: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        name: z.string().min(1),
        amountRupees: z.union([z.number(), z.string()]).optional(),
      }),
    )
    .optional(),
});

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const expenses = await prisma.expense.findMany({
    where: { voided: false },
    include: { paidBy: true, participants: true, lines: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the amount and details." }, { status: 400 });
  }

  const data = parsed.data;
  const amountPaise = rupeesToPaise(data.amountRupees);
  if (amountPaise <= 0) {
    return NextResponse.json({ error: "Amount must be more than 0." }, { status: 400 });
  }
  if (!memberById(data.paidById)) {
    return NextResponse.json({ error: "Unknown payer." }, { status: 400 });
  }

  let participantIds: string[] = [];
  let shares: Record<string, number> = {};

  if (data.split === "custom") {
    const custom = data.customShares ?? {};
    participantIds = Object.keys(custom).filter((id) => memberById(id));
    shares = Object.fromEntries(
      participantIds.map((id) => [id, rupeesToPaise(custom[id] ?? 0)]),
    );
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    if (sum !== amountPaise) {
      return NextResponse.json(
        { error: `Custom shares must add up to the total (${amountPaise / 100}).` },
        { status: 400 },
      );
    }
  } else if (data.split === "selected") {
    participantIds = (data.memberIds ?? []).filter((id) => memberById(id));
    if (participantIds.length === 0) {
      return NextResponse.json({ error: "Select at least one person." }, { status: 400 });
    }
    shares = splitEqual(amountPaise, participantIds);
  } else {
    if (data.type === "milk") {
      const drinkers = await prisma.milkParticipation.findMany({
        where: { participates: true },
      });
      const allowed = new Set<string>(MEMBER_IDS);
      participantIds = drinkers.map((d) => d.memberId).filter((id) => allowed.has(id));
      if (participantIds.length === 0) participantIds = [...MEMBER_IDS];
    } else {
      participantIds = [...MEMBER_IDS];
    }
    shares = splitEqual(amountPaise, participantIds);
  }

  const expense = await prisma.expense.create({
    data: {
      type: data.type,
      title: data.title.trim(),
      amountPaise,
      paidById: data.paidById,
      splitMethod: data.split,
      notes: data.notes?.trim() || null,
      participants: {
        create: Object.entries(shares).map(([memberId, sharePaise]) => ({
          memberId,
          sharePaise,
        })),
      },
      lines: data.lines?.length
        ? {
            create: data.lines.map((line) => ({
              name: line.name.trim(),
              amountPaise:
                line.amountRupees === undefined || line.amountRupees === ""
                  ? null
                  : rupeesToPaise(line.amountRupees),
            })),
          }
        : undefined,
    },
    include: { participants: true, lines: true, paidBy: true },
  });

  await notifyEveryoneExcept(who.id, {
    title: `${shortName(data.paidById)} paid ₹${(amountPaise / 100).toFixed(amountPaise % 100 === 0 ? 0 : 2)}`,
    body: `${typeLabel(data.type)} · ${data.title.trim()}`,
    kind: "expense",
    href: "/money",
    refId: expense.id,
  }).catch(() => null);

  return NextResponse.json({ expense }, { status: 201 });
}

/** Soft-delete (void) an expense so it leaves Money + balances. */
export async function DELETE(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const row = await prisma.expense.findUnique({ where: { id } });
  if (!row || row.voided) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.expense.update({
    where: { id },
    data: { voided: true },
  });
  return NextResponse.json({ ok: true });
}
