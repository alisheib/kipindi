/**
 * One side of a two-process race (C4 ruling 162, MON-06). Started by `house-bot-caps-cases.mts` on Postgres, twice, with
 * `SKEW_MS` and `clock-skew-preload.mjs`, never on its own. Every schedule reads the DATABASE clock, so the race window
 * is where the database says it is, whatever this process's (skewed) clock believes.
 *
 *   ROLE=cashout  POSITION_ID USER_ID T0_ISO            → try to cash the position out from T0 + 0.5 s until T0 + 6 s
 *   ROLE=house    BOT_ID BOT_USER_ID MARKET_ID T0_ISO   → try a house FILL YES 5,000 from T0 until T0 + 9 s
 *   ROLE=sweep    POSITION_ID SIDE_ID T0_ISO            → run the trigger sweep from T0, and hold the pass that first
 *                                                         reads POSITION_ID at a BARRIER until the other side has read
 *                                                         it too, so both processes decide the same stake at once (L6,
 *                                                         ruling 103 · a double sweep at leader failover)
 *
 * Prints one `@@RESULT {…}` line.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`two-process child: ${k} is not set`); return v; };
const role = env("ROLE");
const T0 = Date.parse(env("T0_ISO")); // an explicit value: not skewed
const { loadWorld } = await import("./house-bot-world.mts");
const w: Any = await loadWorld();
const pc = w.prisma()!;
const dbNowMs = async (): Promise<number> => {
  const rows: Any[] = await pc.$queryRawUnsafe(`SELECT clock_timestamp() AS "now"`);
  return new Date(rows[0].now).getTime();
};
const nap = (ms: number) => new Promise((r) => setTimeout(r, ms));
const result: Record<string, unknown> = { role, skewMs: Number(process.env.SKEW_MS ?? 0), attempts: 0, success: false };

try {
  if (role === "cashout") {
    const positionId = env("POSITION_ID");
    const userId = env("USER_ID");
    while ((await dbNowMs()) < T0 + 500) await nap(50);
    while ((await dbNowMs()) < T0 + 6_000) {
      (result.attempts as number)++;
      const r = await w.svc.cashOutPosition(userId, positionId);
      if (r.ok) { result.success = true; result.atDbMs = (await dbNowMs()) - T0; break; }
      result.last = `${r.code}/${r.reason ?? ""}`;
      await nap(r.code === "RATE_LIMITED" ? 400 : 250);
    }
  } else if (role === "house") {
    const bot = { botId: env("BOT_ID"), userId: env("BOT_USER_ID") };
    const marketId = env("MARKET_ID");
    while ((await dbNowMs()) < T0) await nap(50);
    while ((await dbNowMs()) < T0 + 9_000) {
      (result.attempts as number)++;
      const intent = await w.intent(bot, marketId, { kind: "FILL", side: "YES", stakeTzs: 5_000 });
      const r = await w.place(bot, intent);
      if (r.ok) { result.success = true; result.atDbMs = (await dbNowMs()) - T0; result.positionId = r.data.positionId; break; }
      result.last = `${r.code}/${r.reason ?? ""}${r.detail?.condition ? `:${r.detail.condition}` : ""}`;
      // A refused FILL stays CLAIMED, and a FILL's anchor is unique per market among live rows: finish it before the next try.
      await w.dal.houseBotIntentStore.cancelLive({ houseBotId: bot.botId }, "BOT_NOT_ACTIVE");
      await nap(150);
    }
  } else if (role === "sweep") {
    // L6 (ruling 103) · a double sweep at leader failover. The pass's own page read is instrumented: the first page
    // that carries the watched stake raises this side's flag and waits for the other side's, so BOTH processes leave
    // the read holding the same row and decide it at the same moment. Without the barrier the winner's insert would
    // usually land before the loser's read, and `triggerPage` (NOT EXISTS an anchored COUNTER) would hide the row.
    const positionId = env("POSITION_ID");
    const sideId = env("SIDE_ID");
    const raceId = env("RACE_ID");
    const flag = (id: string) => `__L6_READ_${raceId}_${id}__`;
    const DAL: Any = await import("../../src/lib/server/house-bot-dal.ts");
    const CS: Any = await import("../../src/lib/server/config-store.ts");
    const TRIG: Any = await import("../../src/lib/server/house-bot/trigger.ts");
    const seen = new Set<string>();
    const origPage = DAL.houseSeamStore.triggerPage.bind(DAL.houseSeamStore);
    let barriered = false;
    DAL.houseSeamStore.triggerPage = async (...args: Any[]) => {
      const page = await origPage(...args);
      for (const r of page) seen.add(r.id);
      if (!barriered && page.some((r: Any) => r.id === positionId)) {
        barriered = true;
        await CS.saveConfig(flag(sideId), { at: Date.now() });
        const until = Date.now() + 20_000;
        for (;;) {
          const other = await CS.loadConfig(flag(sideId === "a" ? "b" : "a"));
          if (other) { result.barrier = true; break; }
          if (Date.now() > until) { result.barrier = false; break; }
          await nap(50);
        }
      }
      return page;
    };
    const alerts = {
      placed: async () => {}, once: async () => {}, security: async () => {},
      botStopped: async () => {}, switchedOff: async () => {},
    };
    const passes: Any[] = [];
    while ((await dbNowMs()) < T0) await nap(25);
    for (let i = 0; i < 3 && !seen.has(positionId) && (await dbNowMs()) < T0 + 30_000; i++) {
      (result.attempts as number)++;
      passes.push(await TRIG.sweepPass({}, { alerts }));
    }
    const sum = (k: "read" | "failed") => passes.reduce((n: number, p: Any) => n + Number(p[k] ?? 0), 0);
    result.passes = passes.length;
    result.sawTarget = seen.has(positionId);
    result.read = sum("read");
    result.failed = sum("failed");
    result.outcomes = passes.reduce((acc: Any, p: Any) => {
      for (const [k, v] of Object.entries(p.outcomes ?? {})) acc[k] = (Number(acc[k] ?? 0) + Number(v));
      return acc;
    }, {} as Any);
    result.success = result.sawTarget === true && result.barrier === true;
  } else {
    throw new Error(`two-process child: unknown ROLE ${role}`);
  }
} catch (e) {
  result.error = String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | ");
}
console.log(`@@RESULT ${JSON.stringify(result)}`);
process.exit(result.error ? 1 : 0);
