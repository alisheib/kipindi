/**
 * Per-market scheduler — the money-critical behaviours, tested for real.
 *
 * Nothing here is stubbed away: the timers are real setTimeouts, the transitions
 * are the real market-service functions, and the concurrency tests genuinely race
 * two callers through the real `withLock` + idempotency stamp. In-memory store.
 *
 *   npx tsx scripts/scheduler.test.mts
 *
 * Covers:
 *   1. nextDeadlineFor picks the right deadline for every status/stamp combination
 *   2. armMarket chains PAST setTimeout's ~24.8-day ceiling (the overflow bug that
 *      would otherwise make a far-future market fire IMMEDIATELY)
 *   3. a real armed timer fires and runs its transition end-to-end
 *   4. boot hydrate arms every pending market, holds missed deadlines behind the
 *      grace (does not stampede) and NEVER skips them
 *   5. the reconciler heals a manually-killed timer
 *   6. two concurrent fires produce EXACTLY ONE transition (close / resolve / settle)
 *   7. decideAutoResolve — the full auto-vs-human matrix, incl. every fallback
 *   8. an EARLY re-check cannot close a market whose outcome is not locked
 *   9. auto mode seals RESOLVED + opens the objection window, and the settle timer
 *      then pays it (money moves only after the window)
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { marketStore } from "../src/lib/server/market-dal.ts";
import {
  nextDeadlineFor,
  armMarket,
  disarmMarket,
  disarmAll,
  getSchedulerHealth,
  hydrateSchedulerOnBoot,
  reconcileMarketSchedules,
  runDueMarketTransitions,
  fireGateState,
  withFireSlot,
} from "../src/lib/server/market-scheduler.ts";
import {
  decideAutoResolve,
  resolveDueMarket,
  notifySelectionClosedForMarket,
  settleMarket,
  AUTO_RESOLVER_ACTOR,
  type StoredMarket,
} from "../src/lib/server/market-service.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";
import type { SentinelResult } from "../src/lib/server/market-sentinel.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const now = Date.now();
const iso = (t: number) => new Date(t).toISOString();

/** Build a market row directly in the store (bypasses createMarket's future-date guard). */
async function mk(id: string, over: Partial<StoredMarket> = {}): Promise<StoredMarket> {
  const m = {
    id, titleEn: `T ${id}`, titleSw: "SW", titleZh: null,
    category: "crypto", sourceUrl: "https://x", resolutionCriterion: "crit",
    resolutionAt: iso(now + DAY), selectionClosedAt: null,
    status: "LIVE", yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null,
    resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null, settledAt: null, resolutionEvidence: null,
    resolutionNotifiedAt: null, selectionClosedNotifiedAt: null, closingSoonNotifiedAt: null,
    sentinelOutcome: null, sentinelEvidence: null, sentinelReasoning: null,
    sentinelSourceUrl: null, sentinelConfidence: null, sentinelClosedAt: null,
    resolutionMode: null, resolveClaimedAt: null,
    proposedBy: "system", createdAt: iso(now - DAY), updatedAt: iso(now - DAY),
    ...over,
  } as StoredMarket;
  await marketStore.set(m);
  return m;
}

/** A confident, locked-outcome AI assessment. */
const confidentYes = (marketId: string, confidence = 97): SentinelResult => ({
  marketId, title: "t", determined: true, outcome: "YES", confidence,
  evidence: "Official source confirms the final result is locked.",
  reasoning: "r", sourceUrl: "https://src", action: "assessed",
});
/** An honest "I could not determine it" assessment. */
const undetermined = (marketId: string): SentinelResult => ({
  marketId, title: "t", determined: false, outcome: "UNKNOWN", confidence: 20,
  evidence: "Nothing published yet.", action: "assessed",
});

// ───────────────────────── 1. nextDeadlineFor ─────────────────────────
{
  const cutoff = now + 6 * HOUR;
  const res = now + 12 * HOUR;
  const base = await mk("mkt_dl", { selectionClosedAt: iso(cutoff), resolutionAt: iso(res) });

  const d1 = nextDeadlineFor(base, 0, now);
  ok("1.1 fresh LIVE → closing-soon at cutoff−1h", d1?.kind === "closing-soon" && d1.at === cutoff - HOUR, `got ${d1?.kind}@${d1?.at}`);

  const d2 = nextDeadlineFor({ ...base, closingSoonNotifiedAt: iso(now) }, 0, now);
  ok("1.2 closing-soon stamped → notify-closed at cutoff", d2?.kind === "notify-closed" && d2.at === cutoff);

  const d3 = nextDeadlineFor({ ...base, closingSoonNotifiedAt: iso(now), selectionClosedNotifiedAt: iso(now) }, 0, now);
  ok("1.3 both notify stamps → resolve at resolutionAt", d3?.kind === "resolve" && d3.at === res);

  const d4 = nextDeadlineFor({ ...base, closingSoonNotifiedAt: iso(now), selectionClosedNotifiedAt: iso(now) }, 30 * 60_000, now);
  ok("1.4 resolve honours the configured offset", d4?.kind === "resolve" && d4.at === res + 30 * 60_000);

  const d5 = nextDeadlineFor({ ...base, closingSoonNotifiedAt: iso(now), selectionClosedNotifiedAt: iso(now), resolutionNotifiedAt: iso(now) }, 0, now);
  ok("1.5 all LIVE stamps set → no deadline", d5 === null);

  const d6 = nextDeadlineFor({ ...base, status: "CLOSED" }, 0, now);
  ok("1.6 CLOSED awaiting ceremony → no deadline (waits on humans)", d6 === null);

  const oc = now + 24 * HOUR;
  const d7 = nextDeadlineFor({ ...base, status: "RESOLVED", objectionsClosedAt: iso(oc) }, 0, now);
  ok("1.7 RESOLVED unsettled → settle at objectionsClosedAt", d7?.kind === "settle" && d7.at === oc);

  const d8 = nextDeadlineFor({ ...base, status: "RESOLVED", objectionsClosedAt: iso(oc), settledAt: iso(now) }, 0, now);
  ok("1.8 settled → no deadline", d8 === null);

  const d9 = nextDeadlineFor({ ...base, status: "VOIDED", objectionsClosedAt: iso(oc) }, 0, now);
  ok("1.9 VOIDED unsettled → settle", d9?.kind === "settle");

  const d10 = nextDeadlineFor({ ...base, titleEn: "Demo · x" }, 0, now);
  ok("1.10 demo LIVE → resolve only (no bettor notifies)", d10?.kind === "resolve");

  // Cutoff already passed → a "closes within the hour" nudge is meaningless.
  const past = await mk("mkt_dl_past", { selectionClosedAt: iso(now - HOUR), resolutionAt: iso(now + HOUR) });
  const d11 = nextDeadlineFor(past, 0, now);
  ok("1.11 cutoff passed → notify-closed, never a stale closing-soon", d11?.kind === "notify-closed");

  // Tie-break: no selectionClosedAt ⇒ cutoff === resolutionAt; close must precede resolve.
  const tie = await mk("mkt_dl_tie", { selectionClosedAt: null, resolutionAt: iso(now + HOUR), closingSoonNotifiedAt: iso(now) });
  const d12 = nextDeadlineFor(tie, 0, now);
  ok("1.12 same-instant tie → notify-closed before resolve", d12?.kind === "notify-closed");
}

// ─────────── 2. armMarket chains beyond setTimeout's 24.8-day ceiling ───────────
{
  disarmAll();
  const farOut = now + 60 * DAY; // > 2^31−1 ms away
  await mk("mkt_far", { resolutionAt: iso(farOut), selectionClosedAt: iso(farOut - HOUR) });
  await armMarket("mkt_far");
  const h = getSchedulerHealth();
  const entry = h.entries.find((e) => e.marketId === "mkt_far");
  ok("2.1 far-future market is armed", !!entry);
  ok("2.2 registry records the TRUE deadline, not a clamped one",
    !!entry && Math.abs(Date.parse(entry.at) - (farOut - HOUR - HOUR)) < 5_000, `at=${entry?.at}`);
  // The regression: a naive setTimeout(>2^31) fires IMMEDIATELY. Prove it does not.
  await sleep(120);
  const far = await marketStore.get("mkt_far");
  ok("2.3 it did NOT fire immediately (overflow guarded)",
    far?.status === "LIVE" && !far?.closingSoonNotifiedAt && !far?.resolutionNotifiedAt);
  disarmAll();
}

// ─────────── 3. a real armed timer fires and runs its transition ───────────
{
  disarmAll();
  // Selection cutoff 1s in the past, closing-soon already stamped → the next
  // deadline is notify-closed, immediately due.
  await mk("mkt_fire", {
    selectionClosedAt: iso(now - 1000), resolutionAt: iso(now + 6 * HOUR),
    closingSoonNotifiedAt: iso(now - HOUR),
  });
  await armMarket("mkt_fire"); // no grace → fires ~now
  await sleep(250);
  const fired = await marketStore.get("mkt_fire");
  ok("3.1 armed timer fired and stamped selectionClosedNotifiedAt", !!fired?.selectionClosedNotifiedAt);
  ok("3.2 the market stayed LIVE (a close notice is not a resolution)", fired?.status === "LIVE");
  disarmAll();
}

// ─── 4. boot hydrate: arms everything pending, holds missed work, skips nothing ───
{
  disarmAll();
  for (const id of ["mkt_h_future", "mkt_h_missed", "mkt_h_settle", "mkt_h_done", "mkt_h_ceremony"]) {
    await marketStore.delete(id);
  }
  await mk("mkt_h_future", { resolutionAt: iso(now + 5 * DAY), selectionClosedAt: iso(now + 4 * DAY) });
  // Missed while the server was DOWN: cutoff AND resolution both in the past.
  await mk("mkt_h_missed", {
    selectionClosedAt: iso(now - 3 * HOUR), resolutionAt: iso(now - 2 * HOUR),
    closingSoonNotifiedAt: iso(now - 4 * HOUR),
  });
  await mk("mkt_h_settle", { status: "RESOLVED", resolvedOutcome: "YES", objectionsClosedAt: iso(now - HOUR) });
  await mk("mkt_h_done", { status: "RESOLVED", resolvedOutcome: "YES", objectionsClosedAt: iso(now - DAY), settledAt: iso(now - HOUR) });
  await mk("mkt_h_ceremony", { status: "CLOSED", resolutionStage1By: "officer_a" });

  const hy = await hydrateSchedulerOnBoot();
  const health = getSchedulerHealth();
  const armedIds = new Set(health.entries.map((e) => e.marketId));
  ok("4.1 hydrate armed the future market", armedIds.has("mkt_h_future"));
  ok("4.2 hydrate armed the MISSED market (deadline not skipped)", armedIds.has("mkt_h_missed"));
  ok("4.3 hydrate armed the missed SETTLE", armedIds.has("mkt_h_settle"));
  ok("4.4 an already-settled market is not armed", !armedIds.has("mkt_h_done"));
  ok("4.5 a CLOSED-awaiting-ceremony market is not armed", !armedIds.has("mkt_h_ceremony"));
  ok("4.6 hydrate reports what it armed", hy.armed >= 3, `armed=${hy.armed}`);

  // Missed deadlines are held behind the boot grace — no stampede on deploy.
  await sleep(200);
  const missed = await marketStore.get("mkt_h_missed");
  const settleDue = await marketStore.get("mkt_h_settle");
  ok("4.7 missed work is DELAYED by the boot grace, not fired instantly",
    !missed?.selectionClosedNotifiedAt && !settleDue?.settledAt);

  // …but it is never SKIPPED: drain the same transitions the timers would run.
  const drained = await runDueMarketTransitions();
  ok("4.8 draining runs the missed transitions", drained.ran >= 2, `ran=${drained.ran}`);
  const missedAfter = await marketStore.get("mkt_h_missed");
  ok("4.9 the missed close notice was delivered", !!missedAfter?.selectionClosedNotifiedAt);
  ok("4.10 the missed resolve trigger ran (no API key → human fallback → CLOSED)",
    missedAfter?.status === "CLOSED" && !!missedAfter?.resolutionNotifiedAt, `status=${missedAfter?.status}`);
  const settledAfter = await marketStore.get("mkt_h_settle");
  ok("4.11 the missed settlement was paid", !!settledAfter?.settledAt);
  disarmAll();
}

// ─────────── 5. the reconciler heals a killed timer ───────────
{
  disarmAll();
  await mk("mkt_heal", { resolutionAt: iso(now + 3 * DAY), selectionClosedAt: iso(now + 2 * DAY) });
  await armMarket("mkt_heal");
  ok("5.1 armed", getSchedulerHealth().entries.some((e) => e.marketId === "mkt_heal"));
  disarmMarket("mkt_heal"); // simulate a dropped timer
  ok("5.2 timer killed", !getSchedulerHealth().entries.some((e) => e.marketId === "mkt_heal"));
  const rec = await reconcileMarketSchedules();
  ok("5.3 reconciler re-armed it", getSchedulerHealth().entries.some((e) => e.marketId === "mkt_heal"), `healed=${rec.healed}`);
  disarmAll();
}

// ─── 6. concurrency: two fires ⇒ EXACTLY ONE transition (lock + stamp) ───
{
  disarmAll();
  await mk("mkt_race_close", { selectionClosedAt: iso(now - HOUR), resolutionAt: iso(now + 6 * HOUR), closingSoonNotifiedAt: iso(now - 2 * HOUR) });
  const closes = await Promise.all([
    notifySelectionClosedForMarket("mkt_race_close"),
    notifySelectionClosedForMarket("mkt_race_close"),
    notifySelectionClosedForMarket("mkt_race_close"),
  ]);
  ok("6.1 three concurrent close-notices → exactly one notified",
    closes.filter((c) => c.notified).length === 1, JSON.stringify(closes.map((c) => c.notified)));

  await mk("mkt_race_resolve", { resolutionAt: iso(now - HOUR) });
  const resolves = await Promise.all([
    resolveDueMarket("mkt_race_resolve", { assessment: undetermined("mkt_race_resolve") }),
    resolveDueMarket("mkt_race_resolve", { assessment: undetermined("mkt_race_resolve") }),
  ]);
  const applied = resolves.filter((r) => r.status === "closed-human");
  ok("6.2 two concurrent resolve triggers → exactly one transition",
    applied.length === 1, JSON.stringify(resolves.map((r) => r.status)));
  ok("6.3 the loser is a benign no-op (skipped / claimed-elsewhere)",
    resolves.every((r) => r.status === "closed-human" || r.status === "skipped" || r.status === "claimed-elsewhere"));

  await mk("mkt_race_settle", { status: "RESOLVED", resolvedOutcome: "YES", objectionsClosedAt: iso(now - HOUR) });
  const settles = await Promise.all([
    settleMarket("mkt_race_settle", { actorId: "system" }),
    settleMarket("mkt_race_settle", { actorId: "system" }),
  ]);
  ok("6.4 two concurrent settlements → exactly one pays",
    settles.filter((s) => s.ok).length === 1, JSON.stringify(settles.map((s) => s.ok)));
  ok("6.5 settled exactly once", !!(await marketStore.get("mkt_race_settle"))?.settledAt);
  disarmAll();
}

// ─────────── 7. decideAutoResolve — the full matrix ───────────
{
  const t = 90;
  const good = confidentYes("m");
  ok("7.1 human mode never auto-resolves, however confident",
    decideAutoResolve({ assessment: good, mode: "human", threshold: t }).goAuto === false);
  ok("7.2 auto + confident + locked → auto",
    decideAutoResolve({ assessment: good, mode: "auto", threshold: t }).goAuto === true);
  ok("7.3 auto but BELOW the threshold → human fallback",
    decideAutoResolve({ assessment: confidentYes("m", 89), mode: "auto", threshold: t }).goAuto === false);
  ok("7.4 exactly AT the threshold → auto",
    decideAutoResolve({ assessment: confidentYes("m", 90), mode: "auto", threshold: t }).goAuto === true);
  ok("7.5 auto + determined but outcome UNKNOWN → human fallback",
    decideAutoResolve({ assessment: { ...good, outcome: "UNKNOWN" }, mode: "auto", threshold: t }).goAuto === false);
  ok("7.6 auto + high confidence but NOT determined → human fallback",
    decideAutoResolve({ assessment: { ...good, determined: false }, mode: "auto", threshold: t }).goAuto === false);
  ok("7.7 auto + confident but no real evidence → human fallback (hallucination guard)",
    decideAutoResolve({ assessment: { ...good, evidence: "n/a" }, mode: "auto", threshold: t }).goAuto === false);
  ok("7.8 auto + AI errored → human fallback",
    decideAutoResolve({ assessment: { ...good, action: "error", error: "no key" }, mode: "auto", threshold: t }).goAuto === false);
  ok("7.9 auto + no assessment at all → human fallback",
    decideAutoResolve({ assessment: null, mode: "auto", threshold: t }).goAuto === false);
}

// ─── 8. an EARLY re-check cannot close a market whose outcome is not locked ───
{
  await mk("mkt_early", { resolutionAt: iso(now + 2 * DAY) });
  const r = await resolveDueMarket("mkt_early", { assessment: undetermined("mkt_early") });
  const after = await marketStore.get("mkt_early");
  ok("8.1 early re-check with no locked outcome → early-noop", r.status === "early-noop", `status=${r.status}`);
  ok("8.2 the market stays LIVE (betting is not killed)", after?.status === "LIVE");
  ok("8.3 the scheduled trigger is NOT consumed", !after?.resolutionNotifiedAt);
  ok("8.4 an UNKNOWN read records no recommendation (never fabricate one)",
    after?.sentinelOutcome === null && after?.sentinelConfidence === null);

  // A real YES/NO read that is merely BELOW the auto threshold must still be
  // recorded for the officer — while the market stays open and the trigger intact.
  await mk("mkt_early_lowconf", { resolutionAt: iso(now + 2 * DAY) });
  const r2 = await resolveDueMarket("mkt_early_lowconf", { assessment: confidentYes("mkt_early_lowconf", 60) });
  const a2 = await marketStore.get("mkt_early_lowconf");
  ok("8.5 early + below-threshold YES → still early-noop", r2.status === "early-noop", `status=${r2.status}`);
  ok("8.6 the recommendation IS recorded for the ceremony",
    a2?.sentinelOutcome === "YES" && a2?.sentinelConfidence === 60, `outcome=${a2?.sentinelOutcome} conf=${a2?.sentinelConfidence}`);
  ok("8.7 market still LIVE and trigger still pending",
    a2?.status === "LIVE" && !a2?.resolutionNotifiedAt);
  ok("8.8 the resolve claim is RELEASED (a second re-check is not blocked)",
    a2?.resolveClaimedAt === null, `claim=${a2?.resolveClaimedAt}`);
  // Prove it: an immediate second re-check must actually run, not report "claimed".
  const r3 = await resolveDueMarket("mkt_early_lowconf", { assessment: confidentYes("mkt_early_lowconf", 61) });
  ok("8.9 a second re-check runs immediately", r3.status === "early-noop", `status=${r3.status}`);
  ok("8.10 …and updates the recorded recommendation",
    (await marketStore.get("mkt_early_lowconf"))?.sentinelConfidence === 61);
}

// ─── 9. auto mode seals RESOLVED, opens the window, and the settle timer pays ───
{
  disarmAll();
  const cfg = await setGlobalConfig({ resolutionMode: "auto", objectionWindowHours: 24 }, "test_officer");
  ok("9.1 global auto mode saved", cfg.ok === true && cfg.config.resolutionMode === "auto");

  await mk("mkt_auto", { resolutionAt: iso(now - HOUR), yesPool: 0, noPool: 0 });
  const r = await resolveDueMarket("mkt_auto", { assessment: confidentYes("mkt_auto") });
  const m = await marketStore.get("mkt_auto");
  ok("9.2 auto-resolved", r.status === "resolved-auto", `status=${r.status}`);
  ok("9.3 sealed RESOLVED with the AI's outcome", m?.status === "RESOLVED" && m?.resolvedOutcome === "YES");
  ok("9.4 both ceremony slots recorded as the auto resolver",
    m?.resolutionStage1By === AUTO_RESOLVER_ACTOR && m?.resolutionStage2By === AUTO_RESOLVER_ACTOR);
  ok("9.5 NO money moved yet — the objection window is open", m?.settledAt === null);
  ok("9.6 objection window opened ~24h out",
    !!m?.objectionsClosedAt && Date.parse(m.objectionsClosedAt) > Date.now() + 23 * HOUR);
  ok("9.7 the AI evidence is on the record", !!m?.resolutionEvidence && !!m?.sentinelEvidence);

  // While the window is open the settle timer must refuse to pay.
  const tooEarly = await settleMarket("mkt_auto", { actorId: "system" });
  ok("9.8 settlement refuses while the objection window is open",
    tooEarly.ok === false && tooEarly.code === "TOO_EARLY", JSON.stringify(tooEarly));

  // Close the window → the settle transition pays it.
  await marketStore.stamp("mkt_auto", { objectionsClosedAt: iso(now - 60_000) });
  const drained = await runDueMarketTransitions();
  const settled = await marketStore.get("mkt_auto");
  ok("9.9 once the window closes the settle timer pays it", !!settled?.settledAt, `ran=${drained.ran}`);

  await setGlobalConfig({ resolutionMode: "human" }, "test_officer"); // restore the default
  const back = nextDeadlineFor(settled!, 0, Date.now());
  ok("9.10 a settled market has no further deadline", back === null);
  disarmAll();
}

// ─── 10. a burst of same-instant deadlines must NOT stampede the DB pool ───
// The sweep this replaced settled sequentially (one open transaction at a time).
// Independent timers can all land together — markets created together share an
// objection window — so an unbounded fan-out empties the connection pool and
// surfaces as a raw Prisma P2024 (observed in production). The gate must hold.
{
  disarmAll();
  const N = 12;
  const ids: string[] = [];
  for (let i = 0; i < N; i++) {
    const id = `mkt_burst_${i}`;
    ids.push(id);
    // Every one of them settle-due at the SAME instant.
    await mk(id, { status: "RESOLVED", resolvedOutcome: "YES", objectionsClosedAt: iso(now - HOUR) });
  }
  const before = fireGateState();
  ok("10.1 gate starts idle", before.inFlight === 0, JSON.stringify(before));
  ok("10.2 the cap is a small number well under the DB pool", before.max >= 1 && before.max <= 8, `max=${before.max}`);

  // Prove the cap against REAL contention, on the real primitive fireMarket uses.
  // (Driving it through the timers alone is worthless here: in-memory settles finish
  // instantly, so the observed peak stays 0 and a no-op gate would "pass".)
  let peak = 0;
  let completed = 0;
  await Promise.all(
    Array.from({ length: 20 }, () =>
      withFireSlot(async () => {
        peak = Math.max(peak, fireGateState().inFlight);
        await sleep(25); // hold the slot long enough for the others to pile up
        peak = Math.max(peak, fireGateState().inFlight);
        completed++;
      }),
    ),
  );
  ok("10.3 the gate actually engaged (work really did contend)", peak > 1, `peak=${peak}`);
  ok("10.4 never exceeded the concurrency cap", peak <= before.max, `peak=${peak} cap=${before.max}`);
  ok("10.5 every queued task still ran (queued, never dropped)", completed === 20, `completed=${completed}/20`);

  // …and the real timer path still settles the whole burst.
  await Promise.all(ids.map((id) => armMarket(id)));
  for (let i = 0; i < 60; i++) {
    const left = (await marketStore.pending()).filter((m) => ids.includes(m.id) && !m.settledAt).length;
    if (left === 0) break;
    await sleep(50);
  }
  const settled = [];
  for (const id of ids) settled.push(!!(await marketStore.get(id))?.settledAt);
  ok("10.6 every market in the same-instant burst settled",
    settled.every(Boolean), `settled=${settled.filter(Boolean).length}/${N}`);
  const drained = fireGateState();
  ok("10.7 the gate drained — no leaked slots", drained.inFlight === 0 && drained.queued === 0, JSON.stringify(drained));
  disarmAll();
}

disarmAll();
console.log(`\n${fail === 0 ? "ALL SCHEDULER SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
