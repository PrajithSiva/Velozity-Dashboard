import cron from "node-cron";
import { prisma } from "../config/prisma";

// Runs every 15 minutes. Overdue status must be a durable, server-computed
// fact (used in dashboards, filters, notifications) — never derived lazily
// on page load, since that would give different answers depending on who
// happens to be looking and when.
//
// Idempotent by construction: it only ever flips isOverdue from false->true
// for tasks that are (a) not DONE and (b) past their due date, and flips it
// back true->false if a due date was pushed out or the task was completed.
// Running it twice in a row with no new data is a no-op (updateMany with a
// WHERE clause that already excludes rows in the target state).
export async function runOverdueSweep(): Promise<{ markedOverdue: number; unmarked: number }> {
  const now = new Date();

  const markedOverdue = await prisma.task.updateMany({
    where: {
      isOverdue: false,
      status: { not: "DONE" },
      dueDate: { lt: now },
    },
    data: { isOverdue: true },
  });

  const unmarked = await prisma.task.updateMany({
    where: {
      isOverdue: true,
      OR: [{ status: "DONE" }, { dueDate: { gte: now } }, { dueDate: null }],
    },
    data: { isOverdue: false },
  });

  return { markedOverdue: markedOverdue.count, unmarked: unmarked.count };
}

export function scheduleOverdueJob() {
  // "*/15 * * * *" — every 15 minutes. Frequent enough that overdue status
  // feels close to real-time on dashboards, infrequent enough to be cheap
  // (two indexed updateMany calls) even with a large task table.
  cron.schedule("*/15 * * * *", () => {
    runOverdueSweep().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Overdue sweep failed:", err);
    });
  });
}
