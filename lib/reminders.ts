import { prisma } from "@/lib/db";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/** Mark open reminders older than 12 hours as expired. */
export async function expireOldReminders() {
  const cutoff = new Date(Date.now() - TWELVE_HOURS_MS);
  await prisma.reminder.updateMany({
    where: {
      status: "open",
      createdAt: { lt: cutoff },
    },
    data: {
      status: "expired",
      doneAt: new Date(),
    },
  });
}

export function reminderExpiresAt(createdAt: Date | string) {
  const t = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return new Date(t.getTime() + TWELVE_HOURS_MS);
}
