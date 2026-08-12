import { prisma } from "@/lib/db";
import { MEMBERS } from "@/lib/members";

function weekBounds(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

/** Create starter keys/chores once so Flat tab is usable on a fresh flat. */
export async function ensureFlatBasics() {
  const keyCount = await prisma.keyItem.count();
  if (keyCount === 0) {
    const defaults = [
      { label: "Main door key", ownerId: MEMBERS[0].id },
      { label: "Society / gate key", ownerId: MEMBERS[1].id },
    ];
    for (const d of defaults) {
      const key = await prisma.keyItem.create({
        data: {
          label: d.label,
          originalOwnerId: d.ownerId,
          status: "active",
        },
      });
      await prisma.keyAssignment.create({
        data: { keyId: key.id, holderId: d.ownerId, reason: "original" },
      });
    }
  }

  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    const titles = ["Take out trash", "Sweep common area", "Kitchen wipe-down"];
    const { start, end } = weekBounds();
    for (let i = 0; i < titles.length; i++) {
      const task = await prisma.task.create({
        data: {
          title: titles[i],
          kind: "chore",
          cadence: "weekly",
          rotationEnabled: true,
          sortOrder: i,
        },
      });
      const member = MEMBERS[i % MEMBERS.length];
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          memberId: member.id,
          periodStart: start,
          periodEnd: end,
          status: "pending",
        },
      });
    }
  } else {
    // Ensure current week has assignments for active tasks missing one
    const { start, end } = weekBounds();
    const tasks = await prisma.task.findMany({ where: { active: true } });
    for (const task of tasks) {
      const existing = await prisma.taskAssignment.findFirst({
        where: {
          taskId: task.id,
          periodStart: start,
          periodEnd: end,
        },
      });
      if (!existing) {
        const last = await prisma.taskAssignment.findFirst({
          where: { taskId: task.id },
          orderBy: { periodStart: "desc" },
        });
        let nextMemberId: string = MEMBERS[0].id;
        if (last) {
          const idx = MEMBERS.findIndex((m) => m.id === last.memberId);
          nextMemberId = MEMBERS[(idx + 1) % MEMBERS.length].id;
        }
        await prisma.taskAssignment.create({
          data: {
            taskId: task.id,
            memberId: nextMemberId,
            periodStart: start,
            periodEnd: end,
            status: "pending",
          },
        });
      }
    }
  }

  const invCount = await prisma.inventoryItem.count();
  if (invCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { name: "Milk", quantity: null, status: "ok" },
        { name: "Vegetables", quantity: null, status: "ok" },
        { name: "Detergent", quantity: null, status: "ok" },
      ],
    });
  }
}
