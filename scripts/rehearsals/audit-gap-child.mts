/**
 * The child half of `audit-gap-reconcile.mts` — a process that places real bets' worth of rows and
 * then ENDS, exactly the way a deploy ends one.
 *
 * ⛔ IT MUST BE A SEPARATE PROCESS. The whole finding is that an un-awaited `audit()` append dies
 * with the process that queued it. Simulating that in the parent (by not awaiting, then carrying on)
 * would prove nothing: the queue would drain a moment later and every row would land. The condition
 * is only real when a process actually exits.
 *
 * Modes:
 *   bare  — create N positions, fire N BARE appends, wait `drainMs`, hard-exit. Some land, the rest
 *           die in the queue. This is `market-service.ts:1699` inside a container being deployed.
 *   flush — the same, but first `await flushAuditWithin(AUDIT_FLUSH_BUDGET_MS)` — the REAL bounded
 *           flush from `house-bot/worker.ts`, imported, not re-implemented. Every row must land.
 *
 * argv: <mode> <userId> <marketId> <count> <tag> <drainMs> <ageMinutes> <houseEvery>
 * stdout: one line `SEEDED <json>` — the positions this child committed.
 */
import { PrismaClient } from "@prisma/client";

const [mode, userId, marketId, countS, tag, drainS, ageS, houseEveryS] = process.argv.slice(2);
const count = Number(countS), drainMs = Number(drainS), ageMinutes = Number(ageS), houseEvery = Number(houseEveryS || 0);

const { audit } = (await import("@/lib/server/audit")) as { audit: (e: Record<string, unknown>) => Promise<unknown> };

const db = new PrismaClient();
const seeded: Array<{ id: string; houseBotId: string | null }> = [];
const placedAt = new Date(Date.now() - ageMinutes * 60_000);

for (let i = 0; i < count; i++) {
  const houseBotId = houseEvery > 0 && i % houseEvery === 0 ? `bot_${tag}_${i}` : null;
  const p = await db.position.create({
    data: {
      userId, marketId, side: i % 2 === 0 ? "YES" : "NO",
      stake: 1000 + i, potentialPayout: 1800 + i, placedAt, houseBotId,
    },
    select: { id: true, houseBotId: true },
  });
  seeded.push(p);
}
await db.$disconnect();

// ── The bare, un-awaited append. Exactly the shape of market-service.ts:1699. ──────────────────
for (const p of seeded) {
  audit({
    category: "BET",
    action: "market.position.opened",
    actorId: userId,
    targetType: "Position",
    targetId: p.id,
    payload: { drill: tag, marketId, positionId: p.id, ...(p.houseBotId ? { houseBotId: p.houseBotId, intentId: `int_${p.id}` } : {}) },
  });
}
console.log(`SEEDED ${JSON.stringify(seeded)}`);

if (mode === "flush") {
  const { flushAuditWithin, AUDIT_FLUSH_BUDGET_MS } = (await import("@/lib/server/house-bot/worker")) as {
    flushAuditWithin: (ms: number) => Promise<boolean>; AUDIT_FLUSH_BUDGET_MS: number;
  };
  const t0 = Date.now();
  const drained = await flushAuditWithin(AUDIT_FLUSH_BUDGET_MS);
  console.error(`[child] the REAL bounded flush returned ${drained} after ${Date.now() - t0}ms (budget ${AUDIT_FLUSH_BUDGET_MS}ms)`);
} else if (drainMs > 0) {
  await new Promise((r) => setTimeout(r, drainMs));
}

console.error(`[child] ${mode}: ${seeded.length} position(s) committed, ${seeded.length} append(s) fired, exiting now`);
// ⛔ THE HARD EXIT. Whatever is still queued is gone — there is no handler, no drain, and no way
// back. Node's own exit would flush the queue given time; production does not give it.
process.exit(0);
