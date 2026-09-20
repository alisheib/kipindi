/**
 * ONE PROCESS OF THE AUDIT BURST (S4 rehearsal 4, CRA-29). Spawned by `audit-burst.mts`, never run on its own.
 *
 * ⛔ IT IS A SEPARATE OS PROCESS ON PURPOSE, AND THAT IS THE WHOLE DESIGN. `audit()` serialises every write in a
 * process through one promise queue (`globalThis.__50PICK_AUDIT_QUEUE`), so a "burst" fired with `Promise.all`
 * inside one process never has two appends in flight and never touches the machinery CRA-29 is about: the
 * `pg_advisory_xact_lock` that serialises the chain head across instances, the DB-authoritative `selectHead`, the
 * `@@unique([prevHash])` backstop, and the P2002 retry. Those are CROSS-PROCESS controls. A single-process burst
 * would pass this rehearsal while proving none of them.
 *
 * Env in:
 *   DATABASE_URL, USE_PRISMA_DAL=true, AUDIT_CHAIN_SECRET — set by the parent; the stores bind at first import.
 *   REH_JOB — JSON: { index, botId, userId, marketIds, t0Iso, stakeTzs }
 *
 * Prints one `@@RESULT {…}` line.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const raw = process.env.REH_JOB;
if (!raw) { console.log(`@@RESULT ${JSON.stringify({ error: "REH_JOB is not set" })}`); process.exit(1); }
const job = JSON.parse(raw) as { index: number; botId: string; userId: string; marketIds: string[]; t0Iso: string; stakeTzs: number };

const { loadWorld } = await import("../lib/house-bot-world.mts");
const w: Any = await loadWorld();
const pc = w.prisma()!;

const dbNowMs = async (): Promise<number> => {
  const rows: Any[] = await pc.$queryRawUnsafe(`SELECT clock_timestamp() AS "now"`);
  return new Date(rows[0].now).getTime();
};
const nap = (ms: number) => new Promise((r) => setTimeout(r, ms));

const bot = { botId: job.botId, userId: job.userId };
const placed: Array<{ marketId: string; intentId: string; positionId: string; atMs: number }> = [];
const refusals: Record<string, number> = {};
const result: Record<string, unknown> = { index: job.index, botId: job.botId, worker: process.pid };
let ageCalls = 0;
let rateWaitMs = 0;

try {
  // The barrier: every worker starts on the DATABASE's clock, not its own, so the five bursts genuinely overlap
  // instead of queueing behind each other's start-up cost (loadWorld imports the whole service layer).
  const T0 = Date.parse(job.t0Iso);
  while ((await dbNowMs()) < T0) await nap(25);
  result.startedAtMs = Date.now();

  for (const marketId of job.marketIds) {
    const intent = await w.intent(bot, marketId, { kind: "OPENER", side: "YES", stakeTzs: job.stakeTzs });
    let done = false;
    // ⚠️ TWO REAL PACERS STAND BETWEEN 200 BETS AND ONE MINUTE, AND THE DRILL HONOURS BOTH RATHER THAN STEPPING
    // AROUND EITHER. Both were found by running it, not by reading it.
    //
    //  1. `gMaxBetsPerMinute` — 20 by CHECK constraint, so 200 bets cannot be inside one minute. Relieved by
    //     `ageHouseMinute()`, the world's DECLARED FIXTURE OF TIME (see its header), the same one
    //     `house-bot-caps-cases.mts` uses so a cap it is not testing cannot mask one it is. It moves the clock; it
    //     never relieves a refusal.
    //  2. `rateCheck(userId, "bet.place")` — capacity 30, refill 10/min, per account, per process
    //     (`rate-limit.ts:95`). Measured: every worker placed exactly 25 and then took `RATE_LIMITED`, because the
    //     five GLOBAL_BETS_PER_MINUTE attempts had spent tokens too — 25 + 5 = the 30-token bucket, to the token.
    //     ⭐ RETRYING IT IS THE FAITHFUL BEHAVIOUR, NOT A RELIEF: `outcome-map.ts:52` maps a `rate_limited` answer
    //     to `{ kind: "transient" }`, so the real engine requeues the intent with backoff and fires it again. A
    //     rehearsal that gave up here would be modelling something the product does not do.
    //
    // ⛔ ONLY those three codes are retried. Every retry is counted and printed, and ANY other refusal ends this
    // worker with that refusal named in full.
    for (let attempt = 0; attempt < 120 && !done; attempt++) {
      const r = await w.place(bot, intent);
      if (r.ok) {
        placed.push({ marketId, intentId: intent.id, positionId: r.data.positionId, atMs: Date.now() });
        done = true;
        break;
      }
      const cap = r.reason === "house_cap_reached" ? r.detail?.cap : `${r.code}/${r.reason}`;
      refusals[String(cap)] = (refusals[String(cap)] ?? 0) + 1;
      if (r.code === "RATE_LIMITED") {
        const waitMs = Math.min(Math.max(Number(r.retryAfterSec ?? 1), 1) * 1000, 10_000) + Math.floor(Math.random() * 250);
        rateWaitMs += waitMs;
        await nap(waitMs);
        continue;
      }
      if (cap !== "GLOBAL_BETS_PER_MINUTE" && cap !== "GLOBAL_BETS_PER_DAY") {
        throw new Error(`worker ${job.index}: unretryable refusal on ${marketId}: ${JSON.stringify({ code: r.code, reason: r.reason, detail: r.detail })}`);
      }
      // Jitter, so five workers hitting the cap in the same millisecond do not all issue the same UPDATE at once.
      await nap(10 + Math.floor(Math.random() * 60));
      await w.ageHouseMinute();
      ageCalls++;
    }
    if (!done) throw new Error(`worker ${job.index}: gave up on ${marketId} after 120 attempts`);
  }
  result.finishedAtMs = Date.now();

  // 🔴 WITHOUT THIS THE WORKER KILLS ITS OWN LAST AUDIT ROW, AND THE FIRST RUN OF THIS REHEARSAL PROVED IT:
  // 10 bets placed, 8 `market.position.opened` rows — exactly one missing per worker. `market-service.ts:1699`
  // writes the bet's audit row with a BARE `audit({…})`, deliberately not awaited (a live update must not add
  // latency to the bet's response), so the append is still queued when `placeHouseBet` returns. A process that
  // exits at that moment takes the queued write with it.
  // ⚠️ THIS IS A FIXTURE OF TEARDOWN, NOT A RELIEF OF ANY ASSERTION. `auditFlush()` waits for THIS process's own
  // queue; it cannot create a row the database refused, so §3's bet-to-row comparison keeps all of its force —
  // it is what caught this in the first place.
  const { auditFlush }: Any = await import("../../src/lib/server/audit.ts");
  await auditFlush();
  result.flushed = true;
} catch (e) {
  result.error = String((e as Error)?.stack ?? e).split("\n").slice(0, 4).join(" | ");
}

result.placed = placed;
result.refusals = refusals;
result.ageCalls = ageCalls;
result.rateWaitMs = rateWaitMs;
result.asked = job.marketIds.length;
console.log(`@@RESULT ${JSON.stringify(result)}`);
process.exit(result.error ? 1 : 0);
