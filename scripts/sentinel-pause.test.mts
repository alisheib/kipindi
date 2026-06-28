/**
 * Sentinel pause/resume — budget-safety + scheduling invariants.
 *
 * The money-critical guarantee Ali asked for: while PAUSED, the sentinel must
 * make ZERO Anthropic calls. Every paid call (Haiku triage + Sonnet deep check)
 * flows through runSentinelSweep(), which returns immediately when paused —
 * BEFORE it even reads the market list. We prove this by spying on
 * marketStore.values() (the first thing a real sweep does): if it's never
 * called while paused, nothing downstream — including any model call — runs.
 *
 * In-memory store, no API key, no network. Run: npx tsx scripts/sentinel-pause.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY; // start with the sentinel "disabled" (no key)
delete process.env.SENTINEL_ENABLED;

import { marketStore } from "../src/lib/server/market-dal.ts";
import {
  pauseSentinel, resumeSentinel, resetSentinelTimer, runSentinelNow,
  runSentinelSweep, getSentinelStatus, stopSentinel,
} from "../src/lib/server/market-sentinel.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };

// Spy on the first step of any sweep. If this is never called while paused, no
// AI call can have started (triage/deep both come strictly after this read).
let valuesCalls = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const realValues = (marketStore as any).values.bind(marketStore);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(marketStore as any).values = async () => { valuesCalls++; return []; };

try {
  // --- 1. PAUSE is the hard budget choke point (no key needed) ---------------
  await pauseSentinel("officer_1");
  let st = await getSentinelStatus();
  ok("pause → status.paused = true", st.paused === true);
  ok("pause → scheduler disarmed (running false)", st.running === false);
  ok("pause → nextSweepAt cleared (null)", st.nextSweepAt === null);
  // Note: durable persistence of `paused` (so a deploy can't silently resume AI
  // spend) is DB-backed via saveConfig(SCHEDULE_KEY,{paused}); config-store
  // no-ops without a DATABASE_URL, so it's verified in prod, not in this
  // in-memory harness. The in-memory flag behaviour is what we assert here.

  valuesCalls = 0;
  const r1 = await runSentinelSweep();
  ok("PAUSED sweep makes ZERO market reads (⇒ zero AI calls)", valuesCalls === 0, `valuesCalls=${valuesCalls}`);
  ok("PAUSED sweep returns no results", r1.length === 0);

  // forced sweep (what 'Run now' uses internally) is ALSO blocked while paused
  valuesCalls = 0;
  const r1b = await runSentinelSweep({ force: true });
  ok("PAUSED forced sweep also makes zero reads", valuesCalls === 0 && r1b.length === 0);

  // pause is idempotent
  await pauseSentinel("officer_1");
  st = await getSentinelStatus();
  ok("double-pause is idempotent (still paused, still disarmed)", st.paused === true && st.running === false);

  // --- 2. RESUME re-arms only when enabled ----------------------------------
  // Without a key the sentinel is disabled → resume must NOT silently arm.
  await resumeSentinel("officer_1");
  st = await getSentinelStatus();
  ok("resume with no API key is a no-op (stays paused, disarmed)", st.paused === true && st.running === false);

  // Now enable it (fake key) and resume — must clear pause + arm the timer.
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-fake-key-not-used";
  await resumeSentinel("officer_2");
  st = await getSentinelStatus();
  ok("resume (enabled) clears pause", st.paused === false);
  ok("resume (enabled) re-arms scheduler", st.running === true);
  ok("resume sets a future nextSweepAt", typeof st.nextSweepAt === "number" && (st.nextSweepAt as number) > Date.now());

  // un-paused sweep DOES proceed to read markets (the contrast that proves the
  // guard is what blocked it above — patched values returns [], so still no AI).
  valuesCalls = 0;
  await runSentinelSweep();
  ok("UN-paused sweep proceeds to read markets", valuesCalls === 1, `valuesCalls=${valuesCalls}`);

  // --- 2b. RESUME continues from where it left off (not a fresh interval) ----
  // Let real time elapse so the countdown is partway through, pause, resume, and
  // assert the remaining time was preserved (a reset would jump it back up).
  await new Promise((r) => setTimeout(r, 2500));
  st = await getSentinelStatus();
  const remainingBeforePause = (st.nextSweepAt as number) - st.serverNow;
  await pauseSentinel("officer_2");
  const stP = await getSentinelStatus();
  ok("pause memorizes the remaining time", stP.pausedRemainingMs != null && Math.abs((stP.pausedRemainingMs as number) - remainingBeforePause) < 1500,
    `remembered=${stP.pausedRemainingMs} before=${Math.round(remainingBeforePause)}`);
  await resumeSentinel("officer_2");
  const stR = await getSentinelStatus();
  const remainingAfterResume = (stR.nextSweepAt as number) - stR.serverNow;
  // If resume had reset to a full interval, remainingAfterResume would jump UP by
  // ~the 2.5s that elapsed; resuming-from-place keeps it within a small margin.
  ok("RESUME continues from the same remaining (no restart)", Math.abs(remainingAfterResume - remainingBeforePause) < 1500,
    `after=${Math.round(remainingAfterResume)} before=${Math.round(remainingBeforePause)}`);
  ok("resume cleared the memorized remaining", (await getSentinelStatus()).pausedRemainingMs === null);

  // --- 3. RESET also clears a pause -----------------------------------------
  await pauseSentinel("officer_2");
  ok("re-paused before reset", (await getSentinelStatus()).paused === true);
  await resetSentinelTimer("officer_3");
  st = await getSentinelStatus();
  ok("reset clears pause + re-arms", st.paused === false && st.running === true);

  // --- 4. RUN NOW clears a pause and runs once ------------------------------
  await pauseSentinel("officer_3");
  ok("re-paused before run-now", (await getSentinelStatus()).paused === true);
  const run = await runSentinelNow("officer_4");
  ok("run-now succeeds", run.ok === true);
  ok("run-now with no live markets does nothing (total 0)", (run.summary?.total ?? -1) === 0);
  st = await getSentinelStatus();
  ok("run-now clears pause + re-arms afterwards", st.paused === false && st.running === true);
} finally {
  stopSentinel();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (marketStore as any).values = realValues;
}

console.log(`\nsentinel-pause: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
