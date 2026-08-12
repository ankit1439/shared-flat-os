import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pinColumnReady?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Idempotent: adds pinHash column if production DB is behind the schema. */
export async function ensurePinColumn() {
  if (globalForPrisma.pinColumnReady) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "pinHash" TEXT`,
    );
    globalForPrisma.pinColumnReady = true;
  } catch {
    // Ignore if permissions / already handled — next query will surface real errors.
    globalForPrisma.pinColumnReady = true;
  }
}
