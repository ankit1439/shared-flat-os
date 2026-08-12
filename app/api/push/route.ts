import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }
  return NextResponse.json({ enabled: true, publicKey });
}

export async function POST(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const endpoint = String(body.endpoint ?? "");
  const p256dh = String(body.keys?.p256dh ?? body.p256dh ?? "");
  const auth = String(body.keys?.auth ?? body.auth ?? "");
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id" TEXT PRIMARY KEY,
      "memberId" TEXT NOT NULL,
      "endpoint" TEXT NOT NULL UNIQUE,
      "p256dh" TEXT NOT NULL,
      "auth" TEXT NOT NULL,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => null);

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      memberId: who.id,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
    create: {
      memberId: who.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const endpoint = String(body.endpoint ?? "");
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, memberId: who.id },
    });
  } else {
    await prisma.pushSubscription.deleteMany({ where: { memberId: who.id } });
  }
  return NextResponse.json({ ok: true });
}
