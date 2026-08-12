import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";

async function ensureLocationColumns() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlatInfo" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlatInfo" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "FlatInfo" ADD COLUMN IF NOT EXISTS "locationRadiusM" INTEGER DEFAULT 250`);
  } catch {
    /* ignore */
  }
}

export async function GET() {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  await ensureLocationColumns();
  const info = await prisma.flatInfo.findUnique({ where: { id: "flat" } });
  return NextResponse.json({ info });
}

export async function PATCH(request: Request) {
  const who = await getCurrentMember();
  if (!who) return NextResponse.json({ error: "Pick who you are" }, { status: 401 });
  await ensureLocationColumns();
  const body = await request.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.address !== undefined) data.address = String(body.address);
  if (body.ownerName !== undefined) data.ownerName = String(body.ownerName);
  if (body.ownerContact !== undefined) data.ownerContact = String(body.ownerContact);
  if (body.wifiSsid !== undefined) data.wifiSsid = String(body.wifiSsid);
  if (body.wifiPassword !== undefined) data.wifiPassword = String(body.wifiPassword);
  if (body.notes !== undefined) data.notes = String(body.notes);

  if (body.latitude !== undefined) {
    const lat = Number(body.latitude);
    data.latitude = Number.isFinite(lat) ? lat : null;
  }
  if (body.longitude !== undefined) {
    const lng = Number(body.longitude);
    data.longitude = Number.isFinite(lng) ? lng : null;
  }
  if (body.locationRadiusM !== undefined) {
    const r = Number(body.locationRadiusM);
    data.locationRadiusM = Number.isFinite(r) && r > 0 ? Math.round(r) : 250;
  }

  const info = await prisma.flatInfo.upsert({
    where: { id: "flat" },
    update: data,
    create: {
      id: "flat",
      name: String(body.name ?? "Our Flat"),
      address: body.address ? String(body.address) : null,
      ownerName: body.ownerName ? String(body.ownerName) : null,
      ownerContact: body.ownerContact ? String(body.ownerContact) : null,
      wifiSsid: body.wifiSsid ? String(body.wifiSsid) : null,
      wifiPassword: body.wifiPassword ? String(body.wifiPassword) : null,
      notes: body.notes ? String(body.notes) : null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
      locationRadiusM: typeof data.locationRadiusM === "number" ? data.locationRadiusM : 250,
    },
  });
  return NextResponse.json({ info });
}
