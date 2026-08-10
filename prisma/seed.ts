import { PrismaClient } from "@prisma/client";
import { MEMBERS } from "../lib/members";

const prisma = new PrismaClient();

/** Only the four people + empty flat shell. No fake expenses, inventory, or bills. */
async function main() {
  // Wipe all flat activity / money / ops data
  await prisma.expenseLine.deleteMany();
  await prisma.expenseParticipant.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.shoppingItem.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.keyAssignment.deleteMany();
  await prisma.keyItem.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.maintenanceIssue.deleteMany();
  await prisma.device.deleteMany();
  await prisma.absencePeriod.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.presence.deleteMany();
  await prisma.milkParticipation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.importantNote.deleteMany();

  for (const m of MEMBERS) {
    await prisma.member.upsert({
      where: { id: m.id },
      update: { name: m.name },
      create: { id: m.id, name: m.name },
    });
    await prisma.presence.create({
      data: { memberId: m.id, state: "unknown", source: "none" },
    });
    await prisma.milkParticipation.create({
      data: { memberId: m.id, participates: true },
    });
  }

  await prisma.flatInfo.upsert({
    where: { id: "flat" },
    update: {
      name: "Our Flat",
      address: null,
      rentPaise: null,
      depositPaise: null,
      ownerName: null,
      ownerContact: null,
      wifiSsid: null,
      wifiPassword: null,
      notes: null,
    },
    create: {
      id: "flat",
      name: "Our Flat",
    },
  });

  await prisma.importantNote.upsert({
    where: { id: "main" },
    update: { body: "" },
    create: { id: "main", body: "" },
  });

  console.log("Ready: four members only. No demo money or inventory.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
