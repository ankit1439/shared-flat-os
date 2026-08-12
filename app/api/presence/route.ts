import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMember } from "@/lib/session";
import { memberById, shortName } from "@/lib/members";
import { isNearFlat } from "@/lib/geo";
import { notifyEveryoneExcept } from "@/lib/notify";

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
  const rows = await prisma.presence.findMany();
  await ensureLocationColumns();
  const flat = await prisma.flatInfo.findUnique({ where: { id: "flat" } });
  return NextResponse.json({
    presence: rows,
    flatLocation: flat?.latitude != null && flat?.longitude != null
      ? {
          latitude: flat.latitude,
          longitude: flat.longitude,
          radiusM: flat.locationRadiusM ?? 250,
          set: true,
        }
      : { set: false, radiusM: 250 },
  });
}

/** Manual tap, GPS check-in, or home Wi-Fi beacon. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const who = await getCurrentMember();
  const memberId = String(body.memberId || who?.id || "");
  if (!memberById(memberId)) {
    return NextResponse.json({ error: "Unknown person" }, { status: 400 });
  }

  // Beacon must send shared secret if configured
  const beaconSecret = process.env.PRESENCE_BEACON_SECRET;
  if (!who && beaconSecret && body.secret !== beaconSecret) {
    return NextResponse.json({ error: "Unauthorized beacon" }, { status: 401 });
  }

  await ensureLocationColumns();

  let state = ["at_flat", "away", "unknown"].includes(String(body.state))
    ? String(body.state)
    : null;
  let source = String(body.source ?? (who ? "manual" : "wifi"));
  let distanceM: number | null = null;

  // GPS check-in: compare to saved flat coordinates
  if (body.latitude != null && body.longitude != null) {
    const flat = await prisma.flatInfo.findUnique({ where: { id: "flat" } });
    if (flat?.latitude == null || flat?.longitude == null) {
      return NextResponse.json(
        { error: "Flat location is not set yet. Open Flat → Flat info and tap “Use my location as flat”." },
        { status: 400 },
      );
    }
    const userLat = Number(body.latitude);
    const userLng = Number(body.longitude);
    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return NextResponse.json({ error: "Bad GPS coordinates" }, { status: 400 });
    }
    const result = isNearFlat({
      userLat,
      userLng,
      flatLat: flat.latitude,
      flatLng: flat.longitude,
      radiusM: flat.locationRadiusM ?? 250,
    });
    state = result.near ? "at_flat" : "away";
    source = "gps";
    distanceM = result.distanceM;
  }

  if (source === "gps_auto") source = "gps";

  if (!state) state = "unknown";

  const previous = await prisma.presence.findUnique({ where: { memberId } });

  const row = await prisma.presence.upsert({
    where: { memberId },
    update: {
      state,
      source,
      lastSeenAt: state === "at_flat" ? new Date() : previous?.lastSeenAt ?? null,
    },
    create: {
      memberId,
      state,
      source,
      lastSeenAt: state === "at_flat" ? new Date() : null,
    },
  });

  // Notify others when status actually changes
  if (who && previous?.state !== state && (state === "at_flat" || state === "away")) {
    const label = state === "at_flat" ? "is home" : "left / is away";
    const how =
      source === "gps"
        ? distanceM != null
          ? ` (GPS · ${distanceM}m from flat)`
          : " (GPS)"
        : source === "manual"
          ? " (manual)"
          : "";
    await notifyEveryoneExcept(who.id, {
      title: `${shortName(memberId)} ${label}`,
      body: `${shortName(memberId)} marked ${state === "at_flat" ? "at the flat" : "away"}${how}`,
      kind: "presence",
      href: "/home",
      refId: memberId,
    }).catch(() => null);
  }

  return NextResponse.json({ presence: row, distanceM, state, source });
}
