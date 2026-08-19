/**
 * Up & Down · TICK CADENCE — the scheduler must never re-fire a chain instantly.
 *
 *   npx tsx scripts/updown-tick-cadence.test.mts     (npm run test:updown-tick-cadence)
 *
 * 🔴 THE FINDING (production, 2026-08-14). `armChain` computed `delay = 0` for any boundary
 * already in the past, and `fireChain`'s `finally` re-armed with `minDelayMs: 0`. Two branches
 * of `advanceChain` deliberately DON'T move the boundary — the bar has not published yet
 * (correct: that retry is why a round opens at all), and the market is shut. On both, the
 * scheduler span: fire → decline → re-arm at 0 ms → fire, as fast as the database answered.
 *
 * Measured on the live platform, which has 75 users:
 *   · **2,269 transactions/sec, 20,105 rows returned/sec** (`pg_stat_database`, 45s window)
 *   · 6 chains × ~1.15 fires/sec each, every one producing nothing (`railway logs --json`)
 *   · 150 samples of `pg_stat_activity` caught ONLY Up & Down scheduler statements
 *   · ⛔ and the log showed half of it — `fireChain` logs only on `pending`, so the three
 *     gold chains turned the same loop in silence
 *
 * ⭐ THE INVARIANT THIS SUITE PINS, AND THE HARDER HALF IS THE SECOND CLAUSE:
 *
 *      A fire that did not move the boundary is retried no sooner than the moment the
 *      observation's own backoff gate would allow a new read — AND NO LATER. The wasted
 *      fires go; not one read is postponed, so no round opens later than it does today.
 *
 * ⛔ WHY THAT SECOND CLAUSE IS THE WHOLE RISK. Spacing the fires out is trivial; spacing them
 * out too far delays every round's open into its own betting window, which players pay for.
 * §2 proves the hint is not an estimate of the gate but *the gate's own remaining wait*,
 * `now + retryAfterMs === readyAt` exactly — so a fire scheduled by it lands on the instant
 * the gate opens, and the read happens on the same tick it would have today. The fires that
 * disappear are exactly the ones the gate was already refusing.
 *
 * ⚠️ NOT A CHANGE TO THE LADDER. `retryBackoffSeconds`, `maxObservationAttempts` and the
 * abandon deadline are untouched; this suite reads them and asserts against them, so if any
 * of the three moves the expectations move with it rather than going stale.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY;

import { assetStore, chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig,
  getUpDownConfig, retryDelaySeconds, abandonAfterSeconds, boundaryAfter,
} from "../src/lib/server/updown-config.ts";
import { advanceChain, acquireObservation } from "../src/lib/server/updown-service.ts";
import {
  nextFireDelayMs, REFIRE_FLOOR_MS, armChain, disarmAllChains, getUpDownSchedulerHealth,
  foldFireFailure, fireAlarmDue, __resetUpDownFireFailures,
} from "../src/lib/server/updown-scheduler.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
// §0.0 · the fixture's length is load-bearing — a round's SPAN decides whether the abandon
// deadline is reachable at all.
import { roundSpanMinutes } from "../src/lib/updown-durations.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
// ⛔ A crash must still be COUNTED — see the same guard in `updown-rearm.test.mts`, which the
// RED harness taught us the hard way by scoring an exploding product as "guard did not catch".
function crashIsAFailure(kind: string, e: unknown): never {
  fail++;
  console.log(`FAIL ${kind} — the suite threw before finishing: ${e instanceof Error ? e.message : String(e)}`);
  console.log(`\nFAILURES — ${pass} passed, ${fail} failed`);
  process.exit(1);
}
process.on("uncaughtException", (e) => crashIsAFailure("uncaught exception", e));
process.on("unhandledRejection", (e) => crashIsAFailure("unhandled rejection", e));

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" });

const a = await createAsset({
  key: "BTCTICK", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, OFFICER);
if (!a.ok) throw new Error(a.error);
await setAssetEnabled(a.data.id, true, OFFICER);
const asset = (await assetStore.get(a.data.id))!;
/**
 * ⛔ THE CHAIN'S LENGTH IS A FIXTURE REQUIREMENT, NOT A PREFERENCE — and it was wrong here
 * until 2026-08-19.
 *
 * This suite asks what `advanceChain` hands the scheduler when it declines to move the
 * boundary, and §3.3 pins that hint against the ABANDON DEADLINE. That is only a meaningful
 * test while the boundary can still BECOME a round at that deadline — i.e. while the round's
 * SPAN outlasts it.
 *
 * A 5-minute round spans 360s and the deadline is 390s, so §3.3's instant (deadline − 2s,
 * i.e. 388s past the boundary) sat 28s BEYOND the round's own close. `advanceChain` now
 * abandons such a boundary — correctly, because `openRound` would derive a past close and
 * `createMarket` throws, which is the outage in `docs/FAILURE-INVENTORY.md` §7.4 — so the
 * branch §3.3 names was not the branch being reached. 15 minutes spans 1080s and leaves the
 * deadline the binding constraint, which is what §3.3 is about.
 *
 * §0.0 asserts this instead of trusting the number.
 */
const CHAIN_MINUTES = 15;
const c = await createChain({ assetId: asset.id, durationMinutes: CHAIN_MINUTES }, OFFICER);
if (!c.ok) throw new Error(c.error);
await setChainState(c.data.id, "RUNNING", OFFICER);
const chain = (await chainStore.get(c.data.id))!;
const anchorMs = Date.parse(chain.gridAnchorAt);

const CFG = await getUpDownConfig();
const RUNG1_MS = retryDelaySeconds(CFG, 1) * 1000;
const ABANDON_MS = abandonAfterSeconds(CFG) * 1000;

/** Set an observation's `lastAttemptAt`, exactly as `updown-heal.test.mts` does and for the
 *  same reason: `recordAttempt` stamps the REAL clock, and this suite injects one. */
async function setAttempt(obsId: string, iso: string, attempts?: number): Promise<void> {
  const o = (await observationStore.get(obsId))!;
  Object.assign(o, { lastAttemptAt: iso, ...(attempts != null ? { attempts } : {}) });
}
const pin = (iso: string) => chainStore.patch(chain.id, { nextBoundaryAt: iso });

// ═══════════════════════════════════════════════════════════════════════════
// 0 · THE LADDER THIS SUITE REASONS ABOUT — read, never assumed
// ═══════════════════════════════════════════════════════════════════════════
{
  // ⛔ THE FIXTURE'S OWN PRECONDITION, FIRST. §3.3 pins the retry hint against the abandon
  // deadline, which only tests that branch while the round's SPAN outlasts the deadline —
  // otherwise `advanceChain` rightly abandons the boundary instead and §3.3 reads a branch
  // it was not aiming at. See the note on CHAIN_MINUTES. A 5-minute chain FAILS this.
  ok("0.0 · ⭐ the fixture chain's span outlasts the abandon deadline",
     roundSpanMinutes(CHAIN_MINUTES) * 60_000 > ABANDON_MS,
     `${CHAIN_MINUTES}m spans ${roundSpanMinutes(CHAIN_MINUTES) * 60}s vs abandon ${ABANDON_MS / 1000}s` +
       ` — 5m spans ${roundSpanMinutes(5) * 60}s and would fail this`);
  ok("0.1 · the first rung is a real, positive wait", RUNG1_MS > 0, `${RUNG1_MS}ms`);
  ok("0.2 · attempt 1 is still taken AT the boundary with no delay", retryDelaySeconds(CFG, 0) === 0);
  ok("0.3 · the abandon deadline outlasts the whole ladder", ABANDON_MS > RUNG1_MS, `${ABANDON_MS}ms`);
  ok("0.4 · the busy-wait floor is a backstop, well under one rung", REFIRE_FLOOR_MS > 0 && REFIRE_FLOOR_MS < RUNG1_MS,
     `${REFIRE_FLOOR_MS}ms floor vs ${RUNG1_MS}ms rung`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE DELAY ITSELF — pure, so the spin is provable without a clock
// ═══════════════════════════════════════════════════════════════════════════
{
  const now = 1_000_000;
  ok("1.1 · a future boundary fires exactly at that boundary",
     nextFireDelayMs({ nextBoundaryMs: now + 30_000, nowMs: now }) === 30_000);
  // 🔴 THE DEFECT, IN ONE ASSERTION.
  ok("1.2 · 🔴 a boundary in the past is NEVER re-fired at 0 ms",
     nextFireDelayMs({ nextBoundaryMs: now - 90_000, nowMs: now }) >= REFIRE_FLOOR_MS,
     `${nextFireDelayMs({ nextBoundaryMs: now - 90_000, nowMs: now })}ms`);
  ok("1.3 · …nor is a boundary landing exactly on now — 'not yet past' is still not 'again, now'",
     nextFireDelayMs({ nextBoundaryMs: now, nowMs: now }) >= REFIRE_FLOOR_MS);
  // ⛔ The boot path is a DIFFERENT question and keeps its own, longer grace: a restart must
  // not hammer every chain at once. Collapsing the two would be an over-correction.
  ok("1.4 · the boot grace for a missed boundary is preserved, and is longer than the floor",
     nextFireDelayMs({ nextBoundaryMs: now - 90_000, nowMs: now, graceOnPast: true }) === 20_000);
  ok("1.5 · an explicit minimum raises the delay…",
     nextFireDelayMs({ nextBoundaryMs: now - 1, nowMs: now, minDelayMs: 45_000 }) === 45_000);
  ok("1.6 · …and never lowers one — a hint may not pull a future boundary forward",
     nextFireDelayMs({ nextBoundaryMs: now + 600_000, nowMs: now, minDelayMs: 5_000 }) === 600_000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · ⭐ THE HINT IS THE GATE'S OWN NUMBER — the no-regression proof
// ═══════════════════════════════════════════════════════════════════════════
// If the hint were merely "about a rung", a round could open a rung late. It is not an
// estimate: `now + retryAfterMs` is the exact instant the backoff gate stops refusing.
{
  const b = new Date(boundaryAfter(anchorMs, CHAIN_MINUTES, Date.now() + 60_000)).toISOString();
  const obs = await observationStore.ensure(asset.id, b);
  const attemptAt = Date.parse(b);
  await setAttempt(obs.id, new Date(attemptAt).toISOString(), 1);

  const now = attemptAt + 4_000;                       // 4s into a rung
  const r = await acquireObservation(asset, b, now);
  const gated = r.state === "pending" && r.retryAfterMs != null;
  ok("2.0 · a read inside the backoff window is refused without dialling out", r.state === "pending", r.state);
  ok("2.1 · ⭐ now + retryAfterMs is EXACTLY when the gate opens — not an estimate of it",
     gated && now + (r as { retryAfterMs: number }).retryAfterMs === attemptAt + RUNG1_MS,
     gated ? `now+${(r as { retryAfterMs: number }).retryAfterMs} vs readyAt ${attemptAt + RUNG1_MS}` : "no hint");
  ok("2.2 · …so the wait shrinks as the rung elapses, and never goes negative",
     gated && (r as { retryAfterMs: number }).retryAfterMs === RUNG1_MS - 4_000);

  // One rung up: a refusal that SPENT a life waits longer, because the ladder says so.
  await setAttempt(obs.id, new Date(attemptAt).toISOString(), 2);
  const r2 = await acquireObservation(asset, b, attemptAt + 1_000);
  ok("2.3 · a boundary further up the ladder waits its own rung, not the first one",
     r2.state === "pending" && (r2 as { retryAfterMs?: number }).retryAfterMs === retryDelaySeconds(CFG, 2) * 1000 - 1_000,
     String((r2 as { retryAfterMs?: number }).retryAfterMs));

  // A confirmed reading has nothing to wait for and must carry no hint at all.
  const b2 = new Date(boundaryAfter(anchorMs, CHAIN_MINUTES, Date.now() + 600_000)).toISOString();
  const o2 = await observationStore.ensure(asset.id, b2);
  await observationStore.confirm(o2.id, {
    price: 65_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: b2,
    evidence: null, confidence: 1, model: null, rawHash: null,
  });
  const r3 = await acquireObservation(asset, b2, Date.parse(b2));
  ok("2.4 · a confirmed reading carries no retry hint — there is nothing to come back for",
     r3.state === "confirmed" && !("retryAfterMs" in r3));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · WHAT advanceChain HANDS THE SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════
{
  const b = new Date(boundaryAfter(anchorMs, CHAIN_MINUTES, Date.now() + 3_600_000)).toISOString();
  await pin(b);

  // The branch that must NOT move the boundary is the branch that owes a delay.
  const young = await advanceChain(chain.id, { now: Date.parse(b) + 1_000 });
  ok("3.1 · the not-yet-published branch hands back a positive retry",
     young.opened === false && (young.retryAfterMs ?? 0) > 0, `${young.retryAfterMs}ms`);
  ok("3.2 · …and it did not move the boundary — the retry is the whole point",
     (await chainStore.get(chain.id))!.nextBoundaryAt === b);

  // ⛔ Bounded by the deadline: sleeping past it would strand the round waiting to be voided.
  const nearDeadline = await advanceChain(chain.id, { now: Date.parse(b) + ABANDON_MS - 2_000 });
  ok("3.3 · ⛔ the retry never sleeps past the abandon deadline",
     (nearDeadline.retryAfterMs ?? Infinity) <= 3_000, `${nearDeadline.retryAfterMs}ms with 2s left`);

  // A FAILED reading is terminal — no rung will ever change it, so only the deadline matters.
  const bf = new Date(boundaryAfter(anchorMs, CHAIN_MINUTES, Date.now() + 7_200_000)).toISOString();
  const of_ = await observationStore.ensure(asset.id, bf);
  await observationStore.fail(of_.id, "test fixture — terminal");
  await pin(bf);
  const failed = await advanceChain(chain.id, { now: Date.parse(bf) + 1_000 });
  ok("3.4 · a FAILED reading waits for the deadline, not for a rung it can never climb",
     failed.observation === "failed" && (failed.retryAfterMs ?? 0) > RUNG1_MS,
     `${failed.retryAfterMs}ms`);

  // ⭐ And the branches that DO move the boundary must carry no hint: the timer derives its
  // own delay from the new boundary, and a stale hint would override it.
  const abandoned = await advanceChain(chain.id, { now: Date.parse(bf) + ABANDON_MS + 5_000 });
  ok("3.5 · ⭐ a branch that MOVED the boundary hands back no hint at all",
     abandoned.retryAfterMs === undefined && /abandoned/i.test(abandoned.detail ?? ""),
     abandoned.detail?.slice(0, 50));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE REAL TIMER REGISTRY — end to end, not the pure function
// ═══════════════════════════════════════════════════════════════════════════
// §1 proves the arithmetic. This proves the arithmetic is the one `armChain` actually uses,
// and that the operator's readout tells the truth about it.
{
  disarmAllChains();
  const stale = new Date(Date.now() - 4 * 24 * 3_600_000).toISOString();   // 3.8 days back, like gold
  await pin(stale);
  await armChain(chain.id);
  const h = getUpDownSchedulerHealth();
  const fireAt = h.nextFireAt ? Date.parse(h.nextFireAt) : NaN;
  ok("4.0 · the chain is armed", h.armed === 1, String(h.armed));
  ok("4.1 · 🔴 a chain pinned days in the past does NOT fire immediately",
     Number.isFinite(fireAt) && fireAt >= Date.now() + REFIRE_FLOOR_MS - 50,
     h.nextFireAt ?? "none");
  ok("4.2 · ⛔ …and the operator's 'next fire' is a FUTURE instant, not the stale boundary",
     Number.isFinite(fireAt) && fireAt > Date.parse(stale), `${h.nextFireAt} vs boundary ${stale}`);

  disarmAllChains();
  const soon = new Date(Date.now() + 120_000).toISOString();
  await pin(soon);
  await armChain(chain.id);
  const h2 = getUpDownSchedulerHealth();
  ok("4.3 · a healthy chain still fires at its own boundary, unchanged",
     Math.abs(Date.parse(h2.nextFireAt!) - Date.parse(soon)) < 1_000, h2.nextFireAt ?? "none");
  disarmAllChains();
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · ⭐ THE LOOP ITSELF — a real fire, and what it arms next
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ EVERY SECTION ABOVE TESTS A PIECE. This is the only one that runs the actual cycle the
// defect lived in — `armChain` → the real `setTimeout` → `fireChain` → `advanceChain` declines
// → `finally` re-arms — and it is the only one that can see whether `fireChain` PASSES the
// hint on. A suite that proved the hint exists and never checked that anyone reads it would
// be green over a scheduler still spinning at the floor.
//
// ⚠️ It spends ~3 real seconds, deliberately. There is no way to observe a timer loop without
// letting a timer run, and stubbing the clock here would test the stub.
{
  disarmAllChains();
  // A boundary a moment in the past, whose observation is already one attempt in and inside
  // its backoff window. The fire happens at the floor, is refused BY THE GATE, and must then
  // re-arm one LADDER RUNG out.
  //
  // ⚠️ THE FIRST VERSION OF THIS FIXTURE LEFT THE FEED TO DECLINE, AND IT DID NOT — the mock
  // quotes the present instant, so a boundary two seconds old was CONFIRMED, a round opened,
  // and the chain re-armed six minutes out on the ordinary step-4 path. The assertion went red
  // over a fixture that had quietly tested the opposite case. Gating on the ladder instead
  // makes the decline the product's own, and independent of what the feed happens to answer.
  const justPast = new Date(Date.now() - 2_000).toISOString();
  const obs5 = await observationStore.ensure(asset.id, justPast);
  await setAttempt(obs5.id, new Date().toISOString(), 1);
  const stampedAt = Date.now();
  await pin(justPast);
  await armChain(chain.id);

  const armedFor = Date.parse(getUpDownSchedulerHealth().nextFireAt ?? "");
  ok("5.0 · the first arm is at the floor, because the boundary is already past",
     Math.abs(armedFor - (Date.now() + REFIRE_FLOOR_MS)) < 400, `in ${armedFor - Date.now()}ms`);

  await new Promise((r) => setTimeout(r, REFIRE_FLOOR_MS + 1_500));   // let it actually fire

  const after = getUpDownSchedulerHealth();
  const reArmedIn = after.nextFireAt ? Date.parse(after.nextFireAt) - Date.now() : NaN;
  ok("5.1 · the chain re-armed itself after firing", after.armed === 1 && Number.isFinite(reArmedIn),
     after.nextFireAt ?? "none");
  // 🔴 THE DEFECT, END TO END. Before the fix this was ~0 and the loop turned again immediately.
  ok("5.2 · 🔴 …NOT immediately — the re-arm is at least the floor",
     reArmedIn >= REFIRE_FLOOR_MS - 400, `${reArmedIn}ms`);
  // ⭐ And not merely the floor: `fireChain` must forward the ladder's own number, or the
  // scheduler is still asking ~15× more often than the gate can answer. The expected instant
  // is the gate's own — `stampedAt + rung` — so this is the §2 identity, observed through the
  // real timer rather than by calling the reader directly.
  const expectedFireAt = stampedAt + RUNG1_MS;
  ok("5.3 · ⭐ …and it lands on the instant the GATE opens — the hint was forwarded intact",
     Number.isFinite(reArmedIn) && Math.abs(Date.now() + reArmedIn - expectedFireAt) < 600,
     `re-arm at +${reArmedIn}ms, gate opens at +${expectedFireAt - Date.now()}ms (rung ${RUNG1_MS})`);
  disarmAllChains();
}


// ═══════════════════════════════════════════════════════════════════════════
// 7 · THE ALARM — a permanent error retried is not a transient
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 §7.4 OF `docs/FAILURE-INVENTORY.md`, AND THE LINE THAT MATTERS IS NOT ABOUT THE BUG:
// *"a permanent error retried silently is indistinguishable from a healthy idle chain."* Two
// chains failed `fire` every 30 seconds for nearly three days and logged **1,003** identical
// lines, and the outage was still found only because somebody read `railway logs` for an
// unrelated deploy. ⛔ The defect was in the logs the whole time. A log line is not an alarm.
//
// ⭐ WHAT IS ASSERTED HERE IS THE COUNT, because the count is the entire difference between a
// blip and an outage — and it is the one thing 1,003 separate lines could not express.
{
  const M = "Cannot create a market with a past or invalid resolution date.";
  const T0 = 1_000_000;

  const f1 = foldFireFailure(undefined, M, T0);
  ok("7.1 · the first failure starts a record, and is NOT an alarm",
     f1.count === 1 && f1.sameThroughout === true && !fireAlarmDue(f1.count), `count=${f1.count}`);
  const f2 = foldFireFailure(f1, M, T0 + 30_000);
  ok("7.2 · …nor is the second — a redeploy racing a boundary really does fail one fire",
     f2.count === 2 && !fireAlarmDue(f2.count), `count=${f2.count}`);
  const f3 = foldFireFailure(f2, M, T0 + 61_000);
  ok("7.3 · ⭐ the THIRD identical failure raises the alarm",
     f3.count === 3 && fireAlarmDue(f3.count) === true, `count=${f3.count}`);

  ok("7.4 · ⚠️ the window is measured from the FIRST failure, never restamped",
     f3.firstAt === T0, `firstAt=${f3.firstAt} vs T0=${T0}`);
  ok("7.5 · …and the record says the error was the same one every time",
     f3.sameThroughout === true);

  // ⛔ A chain alternating between two permanent errors is just as dead. It must still reach
  // the threshold — and must still be honest that the error varied.
  const v = foldFireFailure(foldFireFailure(foldFireFailure(undefined, M, T0), "a different error", T0 + 1), M, T0 + 2);
  ok("7.6 · ⭐ a VARYING error still counts to the threshold — a dead chain is dead either way",
     v.count === 3 && fireAlarmDue(v.count) === true, `count=${v.count}`);
  ok("7.7 · …but it does not claim the failures were identical",
     v.sameThroughout === false);

  // ⛔ AND IT MUST NOT ALARM ON EVERY FIRE. That is the 1,003-line stream, rebuilt.
  const alarmed = [];
  for (let n = 1; n <= 60; n++) if (fireAlarmDue(n)) alarmed.push(n);
  ok("7.8 · ⭐ over 60 consecutive failures the durable record fires 4 times, not 60",
     alarmed.length === 4 && alarmed[0] === 3, `at ${alarmed.join(", ")}`);
  ok("7.9 · …and it re-asserts on a cadence, so a days-long stall never goes quiet",
     alarmed[1] === 20 && alarmed[2] === 40 && alarmed[3] === 60, `at ${alarmed.join(", ")}`);

  // The live surface an operator (or a probe) can read without grepping a log stream.
  __resetUpDownFireFailures();
  ok("7.10 · the health readout starts clean and exposes the list at all",
     Array.isArray(getUpDownSchedulerHealth().failing) && getUpDownSchedulerHealth().failing.length === 0);
}
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
