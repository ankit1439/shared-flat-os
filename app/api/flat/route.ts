import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const info = await prisma.flatInfo.findUnique({ where: { id: "flat" } });
  return NextResponse.json({ info });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const info = await prisma.flatInfo.upsert({
    where: { id: "flat" },
    update: {
      name: body.name !== undefined ? String(body.name) : undefined,
      address: body.address !== undefined ? String(body.address) : undefined,
      ownerName: body.ownerName !== undefined ? String(body.ownerName) : undefined,
      ownerContact: body.ownerContact !== undefined ? String(body.ownerContact) : undefined,
      wifiSsid: body.wifiSsid !== undefined ? String(body.wifiSsid) : undefined,
      wifiPassword: body.wifiPassword !== undefined ? String(body.wifiPassword) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
    },
    create: {
      id: "flat",
      name: String(body.name ?? "Our Flat"),
      address: body.address ? String(body.address) : null,
      ownerName: body.ownerName ? String(body.ownerName) : null,
      ownerContact: body.ownerContact ? String(body.ownerContact) : null,
      wifiSsid: body.wifiSsid ? String(body.wifiSsid) : null,
      wifiPassword: body.wifiPassword ? String(body.wifiPassword) : null,
      notes: body.notes ? String(body.notes) : null,
    },
  });
  return NextResponse.json({ info });
}
