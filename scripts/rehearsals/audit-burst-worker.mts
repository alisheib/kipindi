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

try {
  // The barrier: every worker starts on the DATABASE's clock, not its own, so the five bursts genuinely overlap
  // instead of queueing behind each other's start-up cost (loadWorld imports the whole service layer).
  const T0 = Date.parse(job.t0Iso);
  while ((await dbNowMs()) < T0) await nap(25);
  result.startedAtMs = Date.now();

  for (const marketId of job.marketIds) {
    const intent = await w.intent(bot, marketId, { kind: "OPENER", side: "YES", stakeTzs: job.stakeTzs });
    let done = false;
    // ⚠️ THE PER-MINUTE CAP IS REAL AND THIS BURST SATURATES IT. `gMaxBetsPerMinute` is 20 by CHECK constraint, and
    // 200 bets cannot be inside one minute. `ageHouseMinute()` is the world's declared FIXTURE OF TIME (see its
    // header) — the same one `house-bot-caps-cases.mts` uses so a cap it is not testing cannot mask one it is. It
    // relieves the clock; it never relieves a refusal. ONLY the two rolling-window caps are retried, every retry is
    // counted and printed, and ANY other refusal ends this worker with that refusal named.
    for (let attempt = 0; attempt < 80 && !done; attempt++) {
      const r = await w.place(bot, intent);
      if (r.ok) {
        placed.push({ marketId, intentId: intent.id, positionId: r.data.positionId, atMs: Date.now() });
        done = true;
        break;
      }
      const cap = r.reason === "house_cap_reached" ? r.detail?.cap : `${r.code}/${r.reason}`;
      refusals[String(cap)] = (refusals[String(cap)] ?? 0) + 1;
      if (cap !== "GLOBAL_BETS_PER_MINUTE" && cap !== "GLOBAL_BETS_PER_DAY") {
        throw new Error(`worker ${job.index}: unretryable refusal on ${marketId}: ${JSON.stringify({ code: r.code, reason: r.reason, detail: r.detail })}`);
      }
      // Jitter, so five workers hitting the cap in the same millisecond do not all issue the same UPDATE at once.
      await nap(10 + Math.floor(Math.random() * 60));
      await w.ageHouseMinute();
      ageCalls++;
    }
    if (!done) throw new Error(`worker ${job.index}: gave up on ${marketId} after 80 attempts`);
  }
  result.finishedAtMs = Date.now();
} catch (e) {
  result.error = String((e as Error)?.stack ?? e).split("\n").slice(0, 4).join(" | ");
}

result.placed = placed;
result.refusals = refusals;
result.ageCalls = ageCalls;
result.asked = job.marketIds.length;
console.log(`@@RESULT ${JSON.stringify(result)}`);
process.exit(result.error ? 1 : 0);
