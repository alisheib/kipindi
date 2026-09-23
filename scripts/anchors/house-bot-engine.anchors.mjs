/**
 * Anchors for `red:house-bot-engine` (C4 step 11) — each puts back one engine defect the plan names, on the file where it
 * would live. DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the
 * harness.
 *
 * ⭐ EACH MUTATION MUST FAIL ITS OWN ASSERTION. `expect` is the text of the `ok("…")` label that must turn red; a run that
 * goes red on any other label only is WRONG-ASSERTION, and a run that stays green is MISSED.
 *
 * `suite` names what the harness runs for a mutation:
 *   `engine-mem` / `engine-pg`  `scripts/lib/house-bot-engine-cases.mts` on the memory store / a scratch Postgres. `sections`
 *                               ("16", "13,16") is passed as HB_ENGINE_SECTIONS so only those guarded sections run.
 *                               `-pg` only for what memory cannot show: the Postgres twin's own SQL.
 *   `caps-mem` / `caps-pg`      `scripts/lib/house-bot-caps-cases.mts` (§8 MON-06 is Postgres only).
 *   `info-edge-mem`             `scripts/lib/house-bot-info-edge-cases.mts` (§1–§3 run in the memory child).
 *   `designation-mem`           `scripts/lib/house-bot-designation-cases.mts`.
 *
 * N1-3, N1-4, N1-8 and N2-E1 had no assertion that could fail on them; each got a case first (16.46, 16.33b, 17.13b, 7.3b)
 * and only then joined this list. N1-9 (the inline fire not registered in inFlight) is NOT declared: no inline fire exists
 * yet (ruling 69 registers every fire; the inline Enter now fire is Commit 7's), so its mutation joins with that fire.
 *
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const FIRE = "src/lib/server/house-bot/fire.ts";
const PLANNER = "src/lib/server/house-bot/planner.ts";
const DECIDE = "src/lib/server/house-bot/decide.ts";
const DAL = "src/lib/server/house-bot-dal.ts";
/* ⭐ C7 step 4b · the poller's own pass, where A24's failure limb finally has a writer (replan ruling 514). */
const WORKER = "src/lib/server/house-bot/worker.ts";
/* ⭐ C7 step 4b · the one server-side staleness predicate the console renders (rulings 352, 353, 354). */
const HEALTH = "src/lib/server/house-bot/engine-health.ts";
const OUTCOMES = "src/lib/server/house-bot/outcomes.ts";
/* ⭐ 2026-09-23 · the desk's price read. Not a house-bot file, but `peekVendorBar` is consumed by the house bot
   and by NOTHING else, so its behaviour is the desk's behaviour and belongs in the desk's own red drive. */
const TERMINAL_VENDOR = "src/lib/server/updown-terminal-vendor.ts";
/* ⭐ C5 alerts · the boot refusal that had no voice until the clock-skew build (01 register:1210). */
const ENGINE = "src/lib/server/house-bot/engine.ts";

export const MUTATIONS = [
  /* ── C7 step 4b · THE STALENESS VERDICT (rulings 352, 353, 354; replan 435(e)) ───────────────────────────────
   * Two of these put back exactly what the PLAN specified and ruling 353 measured wrong — the poller inside the OR,
   * and no boot grace — so they are the two controls 353's own Proof asks for, declared rather than described. */
  {
    name: "353-poller-or · PLAN.md:450's OR is back, so an idle healthy engine paints the console's gravest statement",
    file: HEALTH,
    from: `  if (beats.plannerBeatAtMs === null || nowMs - beats.plannerBeatAtMs > ENGINE_STALE_MS) return "STALE";`,
    to: `  if (beats.plannerBeatAtMs === null || nowMs - beats.plannerBeatAtMs > ENGINE_STALE_MS || beats.pollerBeatAtMs === null) return "STALE";`,
    expect: "20.2 · ⭐ 353 · the SAME rows with the planner beat 10 s old and still no poller beat → NOT stale",
    suite: "engine-mem",
    sections: "20",
  },
  {
    name: "353-no-grace · the boot grace is dropped, so every deploy paints the danger Callout while the engine is starting",
    file: HEALTH,
    from: `  const booting = beats.bootAtMs !== null && nowMs - beats.bootAtMs <= BOOT_GRACE_MS;`,
    to: `  const booting = false;`,
    expect: "20.3 · 353 · switch ON, booted 30 s ago, NO beats at all → BOOTING",
    suite: "engine-mem",
    sections: "20",
  },
  {
    name: "354-unreadable-healthy · a beat read that FAILED renders as healthy — 'Not applicable' as the silent verdict, exactly",
    file: HEALTH,
    from: `  if (beats === null) return "UNREADABLE";`,
    to: `  if (beats === null) return null;`,
    expect: "20.7 · 354(c) · beats that could NOT be read answer UNREADABLE",
    suite: "engine-mem",
    sections: "20",
  },
  /* ── C7 step 4b · A24's poller-failure limb and X1's duty names (replan rulings 514, 507, 549) ─────────────────
   * Each of these four puts back a state the tree was ACTUALLY in until this build: no alert at the threshold, no
   * durable record at all, or a failed pass writing the beat that makes it look alive. */
  {
    name: "514-no-alert · the poller-failure threshold tells nobody (ALERT_KEY.pollerFailing back to having no writer)",
    file: WORKER,
    from: "  const alerted = streak >= POLLER_FAILURE_ALERT_AFTER\n    ? await alertOnce(ALERT_KEY.pollerFailing(), alerts, { code: \"POLLER_FAILING\", detail: { streak, error: code } })\n    : false;",
    to: "  const alerted = false;",
    expect: "16.514c · ⭐ RULING 514",
    suite: "engine-mem",
    sections: "16",
  },
  {
    name: "514-beat-on-failure · a failed claim writes the BEAT, so a poller that claims nothing looks alive",
    file: WORKER,
    from: "    await houseBotRuntimeStore.upsert(key, {",
    to: "    await houseBotRuntimeStore.beat(key, {",
    expect: "16.514a · ⛔ A24",
    suite: "engine-mem",
    sections: "16",
  },
  {
    name: "507-no-duty-names · the planner's failed duties die with the tick again",
    file: PLANNER,
    from: "    ? { pollerErrorCode: failedDuties.join(\",\"), pollerErrorAt: iso(nowMs) }",
    to: "    ? { pollerErrorCode: null }",
    expect: "17.507a · ⭐ X1",
    suite: "engine-mem",
    sections: "17",
  },
  {
    name: "507-beat-on-failed-money · a pass whose MONEY duty failed writes the beat anyway (ruling 98 undone)",
    file: PLANNER,
    from: "      await houseBotRuntimeStore.upsert(RUNTIME_KEY.plannerBeat, dutyFacts);",
    to: "      await houseBotRuntimeStore.beat(RUNTIME_KEY.plannerBeat, dutyFacts);",
    expect: "17.507d · ⛔ a MONEY duty that fails",
    suite: "engine-mem",
    sections: "17",
  },
  // ── N1 (04-amendments.md:3795-3804, `red:house-bot-engine` commit 4) ──────────────────────────────────────────────

  // N1-1 · 04:3796 — fire takes the new thin side instead of skipping CONDITION_GONE (H0 then meets a side the row
  // does not carry; the row is never the SKIPPED(CONDITION_GONE) the case requires).
  {
    name: "N1-1 · fire takes the new thin side instead of SKIPPED(CONDITION_GONE)",
    file: FIRE,
    from: `      if (d.side !== intent.side || d.entryCondition !== intent.entryCondition) return finish(intent, deps, "SKIPPED", "CONDITION_GONE");`,
    to: `      if (d.side !== intent.side || d.entryCondition !== intent.entryCondition) intent = { ...intent, side: d.side, entryCondition: d.entryCondition };`,
    expect: "16.36 · the thin side is NO now but the row says YES",
    suite: "engine-mem",
    sections: "16",
  },
  // N1-2 · 04:3797 — the planner's openerSide draw replaced by a per-intent randomInt (no OPENER_SIDE_DRAWN row, side
  // from the decision's own RNG).
  {
    name: "N1-2 · the planner's OPENER side is a per-intent randomInt, not the once-per-market draw",
    file: PLANNER,
    from: `      const draw = await openerSide(view.id, { houseBotId: b.botId, actorId: null, drawnFor: "OPENER_PLAN" }, { randomInt: o.drawRandomInt });`,
    to: `      const draw = { side: o.randomInt(0, 1) === 0 ? ("YES" as const) : ("NO" as const) }; void openerSide;`,
    expect: "17.49 · an empty poll created after Start → one OPENER on the side drawn once",
    suite: "engine-mem",
    sections: "17",
  },
  // N1-5 · 04:3800 (TGT-34) and N2-E7 · 04:4409 — the same defect: the blackout ignores reopenedAt. The staff-chosen row
  // on a reopened poll then places (fire's read, the Enter now loader and the seam's H3 all read blackout.ts).
  {
    name: "N1-5 / N2-E7 · the blackout ignores reopenedAt",
    file: "src/lib/server/house-bot/blackout.ts",
    from: `  return { blocked: stamped || freshClaim || row.reopenedAt != null };`,
    to: `  return { blocked: stamped || freshClaim };`,
    expect: "16.26 · …a staff-chosen row meets the information blackout instead",
    suite: "engine-mem",
    sections: "16",
  },
  // N1-6 · 04:3801 (MON-02) — the write-back UPDATE is removed: fire bets the smaller stake the row does not carry.
  {
    name: "N1-6 · the MON-02 write-back clamp is removed (the cut stake is used but never written to the row)",
    file: FIRE,
    from: `      const clamped = await houseBotIntentStore.clampStake(intent.id, deps.me, recomputed);\n      if (!clamped) return { kind: "lost" };\n      intent = clamped;`,
    to: `      intent = { ...intent, stakeTzs: recomputed };`,
    expect: "16.7 · a FILL of 20,000 against 10,000 locked is cut to 10,000, written back (firedStakeTzs)",
    suite: "engine-mem",
    sections: "16",
  },
  // N1-7 · 04:3802 — a transient requeue keeps the claim's attempt, so every transient try counts toward POISON (memory twin).
  {
    name: "N1-7 · a transient requeue does not hand the claim's attempt back (memory twin)",
    file: DAL,
    from: `      attempts: i.attempts - 1, transientAttempts: i.transientAttempts + 1,`,
    to: `      attempts: i.attempts, transientAttempts: i.transientAttempts + 1,`,
    expect: "13.5 · system_busy → PENDING again, transientAttempts 1, attempts handed back",
    suite: "engine-mem",
    sections: "13",
  },
  // N1-7pg · 04:3802 — the same, in the Postgres twin's UPDATE.
  {
    name: "N1-7pg · a transient requeue does not hand the claim's attempt back (Postgres SQL)",
    file: DAL,
    from: "      `\"attempts\" = \"attempts\" - 1`,\n      `\"transientAttempts\" = \"transientAttempts\" + 1`,",
    to: "      `\"attempts\" = \"attempts\"`,\n      `\"transientAttempts\" = \"transientAttempts\" + 1`,",
    expect: "13.5 · system_busy → PENDING again, transientAttempts 1, attempts handed back",
    suite: "engine-pg",
    sections: "13",
  },

  // ── N2 (04-amendments.md:4402-4410, `red:house-bot-engine`) ──────────────────────────────────────────────────────

  // N2-E2 · 04:4404 — dueAt = requested, without the hold to the exit.
  {
    name: "N2-E2 · a targeted reaction is due at the requested time, not held to the exit",
    file: DECIDE,
    from: `  return { requestedMs, dueMs: Math.max(requestedMs, input.exitCloseAtMs + LOCK_MARGIN_MS) };`,
    to: `  return { requestedMs, dueMs: requestedMs };`,
    expect: "7.35 · ruling 108 · one due-time formula: STAKE 10 s on a 5-min exit → requested 0:10, held to 5:07",
    suite: "engine-mem",
    sections: "7",
  },
  // N2-E3 · 04:4405 — the hold without LOCK_MARGIN_MS.
  {
    name: "N2-E3 · a targeted reaction is held to the exit close with no LOCK_MARGIN_MS",
    file: DECIDE,
    from: `  return { requestedMs, dueMs: Math.max(requestedMs, input.exitCloseAtMs + LOCK_MARGIN_MS) };`,
    to: `  return { requestedMs, dueMs: Math.max(requestedMs, input.exitCloseAtMs) };`,
    expect: "7.3 · targeted COUNTER: held to the exit + LOCK_MARGIN_MS",
    suite: "engine-mem",
    sections: "7",
  },
  // N2-E4 · 04:4406 — endTargets ends a target on a young resolveClaimedAt alone.
  {
    name: "N2-E4 · endTargets counts a young resolve claim as a blackout",
    file: PLANNER,
    from: `infoBlackout(t.marketId, { countResolveClaim: false })`,
    to: `infoBlackout(t.marketId, { countResolveClaim: true })`,
    expect: "17.22 · N2 step 9.5 · a young resolve claim ALONE never ends a target",
    suite: "engine-mem",
    sections: "17",
  },
  // N2-E5 · 04:4407 — poll triggers reach the bet hook (the call site stops filtering on Up & Down). Caught by the source
  // pin on the call site's condition; 18.75 cannot see it (its bot covers no poll, so a poll stake in the hook decides
  // nothing either way).
  {
    name: "N2-E5 · a player's POLL stake reaches the post-commit hook",
    file: "src/lib/server/market-service.ts",
    from: `    if (ctx.kind === "player" && market.productLine === "UPDOWN" && process.env[HOUSE_BOT_ENGINE_ENV] !== "false") {`,
    to: `    if (ctx.kind === "player" && process.env[HOUSE_BOT_ENGINE_ENV] !== "false") {`,
    expect: "18.1 · ruling 101 · one // SEAM:trigger block; its condition is a player's Up & Down stake",
    suite: "engine-mem",
    sections: "18",
  },
  // N2-E6 · 04:4408 — the target check removed from the sweep's targeted insert (memory twin of FOR SHARE).
  {
    name: "N2-E6 · the targeted insert no longer checks the target is ACTIVE (memory twin)",
    file: DAL,
    from: `      if (!t || t.status !== "ACTIVE") return { inserted: false, targetActive: false, row: null };`,
    to: `      void t;`,
    expect: "18.53 · N2 §4 step 4.6 · the target ended between the pass read and the insert",
    suite: "engine-mem",
    sections: "18",
  },
  // N2-E6pg · 04:4408 — the same, the FOR SHARE read's result ignored in the Postgres twin.
  {
    name: "N2-E6pg · the targeted insert ignores the FOR SHARE target read (Postgres)",
    file: DAL,
    from: `      if (held.length === 0) return { inserted: false, targetActive: false, row: null };`,
    to: `      void held;`,
    expect: "18.53 · N2 §4 step 4.6 · the target ended between the pass read and the insert",
    suite: "engine-pg",
    sections: "18",
  },
  // N2-E8 · 04:4410 — a consent void leaves the bot's targets ACTIVE.
  {
    name: "N2-E8 · voidHouseConsent ends no target",
    file: "src/lib/server/house-bot/designation.ts",
    from: `    const ended = await targetStore.endAllForBot(bot.id, "CONSENT_VOID", t);`,
    to: `    const ended: Array<{ id: string; marketId: string }> = [];`,
    expect: "5.2.SELF_EXCLUDED · both ACTIVE targets → ENDED(CONSENT_VOID)",
    suite: "designation-mem",
  },

  // ── 01-scenario-register.md ──────────────────────────────────────────────────────────────────────────────────────

  // 01-754 · HB-LC-01 — "use board livePrice": the newest CONFIRMED observation, whatever its age and whatever the
  // terminal's cached 1-minute bar says.
  {
    name: "01-754 · the A15 price read uses the board's livePrice (latest CONFIRMED observation) over the vendor bar",
    file: "src/lib/server/house-bot/ud-price.ts",
    from: `  const bar = peekVendorBar(assetId);`,
    to: `  const board = (await observationStore.list({ assetId, state: "CONFIRMED", limit: 1 }).catch(() => []))[0];\n  if (board && board.price != null) return { price: board.price, source: "observation", ageSec: 0 };\n  const bar = peekVendorBar(assetId);`,
    expect: "14.13 · ⭐ A15 · vendor bar at open + 0.93 × margin → UD_CLOSENESS at 25%",
    suite: "engine-mem",
    sections: "14",
  },
  // 01-770 · HB-LC-03 — sentinelOutcome added to the engine's market projection.
  {
    name: "01-770 · projectMarketView passes sentinelOutcome through",
    file: "src/lib/server/house-bot/market-view.ts",
    from: `    round: row.round ? { ...row.round } : null,\n  };`,
    to: `    round: row.round ? { ...row.round } : null,\n    sentinelOutcome: (row as { sentinelOutcome?: string | null }).sentinelOutcome ?? null,\n  };`,
    expect: "1.3 · projectMarketView returns exactly the pinned view keys",
    suite: "info-edge-mem",
  },

  // ── C4 step 11 · MON-06 (ruling 162) and X7 (rulings 136, 159) ───────────────────────────────────────────────────

  // MON-06 · LOCK_MARGIN_MS = 0: the +5 s house process counts the player's NO the instant its exit closes, while the
  // −5 s process still cashes it out.
  {
    name: "MON-06 · LOCK_MARGIN_MS = 0 across two skewed processes",
    file: "src/lib/house-bot/constants.ts",
    from: `export const LOCK_MARGIN_MS = MAX_TOLERATED_SKEW_MS + CLAIM_SKEW_GUARD_MS;`,
    to: `export const LOCK_MARGIN_MS = 0;`,
    expect: "8.1 · ⭐ MON-06 · never both: no house stake counted money that was then cashed out",
    suite: "caps-pg",
  },
  // X7 · fire's BOTH_SIDES check disabled: the seam's TRIGGER_BOTH_SIDES backstop writes MARKET_HELD, never PENALTY_BOX.
  {
    name: "X7 · fire no longer checks BOTH_SIDES on the trigger account",
    file: FIRE,
    from: `      if (own.some((p) => p.side === "YES") && own.some((p) => p.side === "NO")) {`,
    to: `      if (false as boolean) {`,
    expect: "16.x7a · ⭐ X7 · a trigger that holds BOTH sides when the counter fires → SKIPPED(PENALTY_BOX)",
    suite: "engine-mem",
    sections: "16",
  },
// ── Added with their cases (C4 step 11, eighth session): the plan items that had no assertion to fail on ─────────

  // N1-3 · 04:3798 — the claim ignores staleAt (memory twin; the Postgres twin shares the rule and dal-parity pins them).
  {
    name: "N1-3 · the claim takes a row already past its staleAt",
    file: DAL,
    from: `      && ms(i.deadlineAt) > now && ms(i.staleAt) > now && i.attempts < MAX_NON_TRANSIENT_ATTEMPTS)`,
    to: `      && ms(i.deadlineAt) > now && i.attempts < MAX_NON_TRANSIENT_ATTEMPTS)`,
    expect: "16.46 · N1-3 · a due row already past its staleAt is NOT claimed",
    suite: "engine-mem",
    sections: "16",
  },
  // N1-4 · 04:3799 — the blackout call removed from fire.ts: the seam still refuses with the same code, so the case asserts
  // WHERE the row stops (fire's own finish, never the bet path's outcome).
  {
    name: "N1-4 · fire no longer reads the information blackout",
    file: FIRE,
    from: `    if (staffChosen && (await infoBlackout(intent.marketId)).blocked) return finish(intent, deps, "SKIPPED", "INFO_BLACKOUT");`,
    to: `    // blackout read removed`,
    expect: "16.33b · N1-4 · a targeted reaction on a reopened (blacked-out) poll is stopped by fire itself",
    suite: "engine-mem",
    sections: "16",
  },
  // N1-8 · 04:3802 — the audit lease becomes an unconditional append: two planners at once write two audits.
  {
    name: "N1-8 · the press audit repair skips its lease",
    file: PLANNER,
    from: `    const leased = await pressStore.claimAuditLease(press.id);\n    if (!leased) continue;`,
    to: `    const leased = press;`,
    expect: "17.13b · ⭐ N1-8 · two planner passes at once over one unaudited press → exactly ONE",
    suite: "engine-pg",
    sections: "17",
  },
  // N2-E1 · 04:4403 — effectiveFrom dropped from arming: a stake placed before the target armed becomes a targeted reaction.
  {
    name: "N2-E1 · a target reacts to stakes placed before its effectiveFrom",
    file: DECIDE,
    from: `input.target && targetBot && product === "MARKET" && ms(input.target.effectiveFrom) <= placedMs`,
    to: `input.target && targetBot && product === "MARKET"`,
    expect: "7.3b · N2-E1 · a stake placed BEFORE the target's effectiveFrom is not a targeted reaction",
    suite: "engine-mem",
    sections: "7",
  },
  // L7 · the memory twin of placedCounterFor sorts oldest-first (its line now has its own shape; 18.70 pins newest-first).
  {
    name: "L7 · placedCounterFor (memory) returns the oldest PLACED counter",
    file: DAL,
    from: `.sort((a, b) => ms(b.createdAt) - ms(a.createdAt) || (b.id > a.id ? 1 : -1))[0];`,
    to: `.sort((a, b) => ms(a.createdAt) - ms(b.createdAt) || (b.id > a.id ? 1 : -1))[0];`,
    expect: "18.70 · …the newest PLACED COUNTER on (account, market)",
    suite: "engine-mem",
    sections: "18",
  },
  // ── C4 step 11 · the L1–L4 cases' own mutations (ninth item of the Later list; each case existed first) ─────────

  // L1 · A21 through the LIVE call site: the hook stops doing A21 at all, so the holder's Up & Down stake against
  // their own bot raises no event and no alert, while every other hook duty still runs.
  {
    name: "L1 · the live hook no longer runs A21 (holder against their own bot)",
    file: "src/lib/server/house-bot/trigger.ts",
    from: `    await holderAgainstOwnBot(row, holderBot, deps.alerts);`,
    to: `    // A21 no longer runs on the hook path`,
    expect: "18.78 · ⭐ L1 · A21 through the LIVE hook",
    suite: "engine-mem",
    sections: "18",
  },
  // L2 · the call site drops both exits, so the hook runs inside `buyPosition`'s admission slot and its locks —
  // exactly what 18.80's recorder reads (adm/lock true), with the 18.80c control proving the spy can see both.
  {
    name: "L2 · the post-commit hook runs inside the admission slot and the lock",
    file: "src/lib/server/market-service.ts",
    from: `      runOutsideAdmission(() => runOutsideLock(() => {
        void import("./house-bot/trigger").then((m) => m.onPlayerBetCommitted(facts)).catch(() => {});
      }));`,
    to: `      void import("./house-bot/trigger").then((m) => m.onPlayerBetCommitted(facts)).catch(() => {});`,
    expect: "18.80 · ⭐ L2 · the live hook's call ran OUTSIDE the admission slot and outside every lock",
    suite: "engine-mem",
    sections: "18",
  },
  // L3 (a) · the sweep timer is armed an hour apart, so a started engine holding the lease never sweeps inside the
  // case's own window (it waits FIRST_TICK_DELAY_MS + 3 × SWEEP_INTERVAL_MS + 5 s for two sweeps).
  {
    name: "L3 · the trigger sweep runs hourly instead of every SWEEP_INTERVAL_MS",
    file: "src/lib/server/house-bot/engine.ts",
    from: `    state.timers.sweep = setInterval(() => { void sweepOnce(); }, SWEEP_INTERVAL_MS);`,
    to: `    state.timers.sweep = setInterval(() => { void sweepOnce(); }, 60 * 60_000);`,
    expect: "11.30 · ⭐ L3 · a started engine holding the planner's lease runs the sweep on its own timer",
    suite: "engine-mem",
    sections: "11",
  },
  // L3 (b) · the sweep no longer checks the planner's lease (ruling 103), so a second instance sweeps the same
  // window while another holds it. Only Postgres can have another holder, so this one is the Postgres twin.
  {
    name: "L3 · the sweep runs without holding the planner's lease",
    file: "src/lib/server/house-bot/engine.ts",
    from: `    if (state.stopping || state.sweepBusy || !holdsPlannerLease()) return;`,
    to: `    if (state.stopping || state.sweepBusy) return;`,
    expect: "11.31 · L3 · …and while another instance holds a live lease: the planner attempted, yet 0 planner passes and 0 sweeps ran",
    suite: "engine-pg",
    sections: "11",
  },
  // L4 · ruling 94: the trigger account is the counterparty the money caps are measured against. Passing none makes
  // the per-player counterparty caps unreachable at decision time, so a capped player is countered again.
  {
    name: "L4 · the trigger account is not passed as the counterparty",
    file: "src/lib/server/house-bot/trigger.ts",
    from: `counterpartyUserId: s.row.userId });`,
    to: `counterpartyUserId: null });`,
    expect: "18.L4a · L4 · a player the house already countered once today, at a daily count of 1 → their next stake leaves SKIPPED(CAP_COUNTERPARTY_COUNT)",
    suite: "engine-mem",
    sections: "18",
  },
  // L6 (a) · the loser's insert is no longer absorbed: without ON CONFLICT DO NOTHING it violates the anchor's unique
  // index and throws, which the pass records as a failed decision. The row count stays 1, so ONLY 18.L6c can see this.
  {
    name: "L6 · the COUNTER insert drops its ON CONFLICT clause",
    file: DAL,
    from: "  if (kind === \"COUNTER\") return `ON CONFLICT (\"anchorKey\") WHERE \"kind\" = 'COUNTER' DO NOTHING RETURNING *`;",
    to: "  if (kind === \"COUNTER\") return `RETURNING *`;",
    expect: "18.L6c · …and neither pass failed: the loser's insert is absorbed by the anchor conflict, never an error",
    suite: "engine-pg",
    sections: "18",
  },
  // L6 (b) · the index the clause infers is never created (the suite migrates a fresh database on every run), so the guarantee
  // itself is gone: with no unique index there is nothing to conflict on and no ONE row to count.
  {
    name: "L6 · the COUNTER anchor's unique index is not created",
    file: "prisma/migrations/20260916150000_house_bot_tables/migration.sql",
    from: "CREATE UNIQUE INDEX IF NOT EXISTS \"hbi_counter_anchor_uq\" ON \"HouseBotIntent\" (\"anchorKey\") WHERE \"kind\" = 'COUNTER';",
    to: "-- (red drive) the COUNTER anchor's unique index is not created",
    expect: "18.L6b · ⭐ L6 · a double sweep at failover writes ONE counter for the stake, never two",
    suite: "engine-pg",
    sections: "18",
  },
  // ── The 3-lens review's confirmed findings (rulings 164, 165) ─────────────────────────────────────────────────
  // 164 · the roll moves back inside the pure decision, so the flag reload re-draws it and a 60% bot reacts at 36%.
  {
    name: "review-164 · the react probability is drawn inside the decision again",
    file: DECIDE,
    from: "    if (!code) {\n      // Ruling 164 · the caller draws this, once per pass per bot. No fallback draw: a missing roll is a caller defect.\n      if (typeof bot.reactRoll !== \"number\") throw new Error(\"house-bot decide: DecideBot.reactRoll is drawn by the caller (ruling 164)\");\n      if (bot.reactRoll > bot.rules.counter.reactProbabilityPct) code = \"NOT_REACTING\";\n    }",
    to: "    if (!code && deps.randomInt(1, 100) > bot.rules.counter.reactProbabilityPct) code = \"NOT_REACTING\";",
    expect: "18.164a · ⭐ ruling 164 · the flag reload does not re-draw the react roll",
    suite: "engine-mem",
    sections: "18",
  },
  // 165 · fire stops re-reading its claim when it writes nothing back, so a stale stake reaches H0 as a key mismatch.
  {
    name: "review-165 · fire places without re-reading the claim it holds",
    file: FIRE,
    from: "    } else {\n      // Ruling 165 · with nothing to write back, nothing else re-reads this row between the claim and the bet. A worker\n      // that stalled past CLAIM_TTL_SEC (its heartbeats are swallowed on purpose, step 2) would otherwise place the stake\n      // it read minutes ago, and H0 would answer KEY_MISMATCH — a SECURITY outcome that switches house bots off for\n      // everyone. A claim that moved is LOST, which is what the clamp branch already answers.\n      const fresh = await houseBotIntentStore.get(intent.id);\n      if (!fresh || fresh.status !== \"CLAIMED\" || fresh.claimedBy !== deps.me || fresh.stakeTzs !== intent.stakeTzs) return { kind: \"lost\" };\n    }",
    to: "    }",
    expect: "16.47 · ⭐ ruling 165 · the row's stake changed under this fire → LOST",
    suite: "engine-mem",
    sections: "16",
  },
  // 166 · the Swahili A21 body prints the stored token again (the class PROGRESS L22 records on a player page).
  {
    name: "review-166 · the alert copy prints the stored side token instead of the word",
    file: "src/lib/house-bot/alert-copy.ts",
    from: "${sideWordFor(\"sw\", c.detail?.side, c.detail?.productLine)}",
    to: "${str(c.detail?.side, \"\")}",
    expect: "9.5 · ⭐ ruling 166 · the A21 alert says the SIDE WORD of each language",
    suite: "comms-mem",
  },

  /* ── C5 ALERTS · THE TWO SILENT STOPS (01 register:1210, :1218) ────────────────────────────────────────────────
   * Both bells were wired one commit before these anchors and asserted in none — so the first thing to declare is
   * the tree as it actually stood: the engine doing the right thing and telling nobody. The second of each pair is
   * the opposite failure and the reason the positive controls exist — a build that rings on EVERY refused gate, or
   * on EVERY boot, is not "safer", it is an officer woken at every deploy until they stop reading the bell.
   * ⛔ BOTH OVER-ALERTING MUTATIONS WERE **MISSED** ON THE FIRST DRIVE, and that is why they are declared. The
   * controls ran after their own EAT day's AlertOnce claim was already spent, so the wrong build was silenced by the
   * THROTTLE rather than by the predicate, and both controls passed on it. Each control now hands the claim back —
   * by the key the bell itself reported — before it measures. */
  {
    /* ⛔ THE GAP 9.2 COULD NOT SEE. Renaming the row takes POLLER_FAILING out of `Object.keys(ROWS)` — which is
     * 9.2's ENTIRE population — while `worker.ts` goes on raising it and `announceOnce` goes on sending it down the
     * generic `alertRow` path. That is the exact shape in which POLLER_FAILING really did reach officers as a bare
     * token until one commit ago, and 9.2 stays GREEN on it: only a sweep over the RAISE SITES can fail here. */
    name: "alerts-copy-speechless · a RAISED code that reaches alertRow loses its row; 9.2 cannot see it",
    file: "src/lib/house-bot/alert-copy.ts",
    from: "  POLLER_FAILING: (c) => ({",
    to: "  POLLER_FAILING_RENAMED: (c) => ({",
    expect: "9.2b · ⛔ THE RIGHT POPULATION",
    suite: "comms-mem",
  },
  {
    name: "alerts-skew-silent · the clock-skew stop goes back to telling nobody (the tree before C5 alerts)",
    file: WORKER,
    /* 🔴 RE-ANCHORED 2026-09-23 · IT WAS STALE AND HAD BEEN MEASURING NOTHING. `pollerPass` moved from a
       ternary to an `if (SKEW_GATE_REASONS.has(...))` block and neither skew anchor moved with it, so
       `resolveAnchor` refused to inject and `red:house-bot-engine` reported a MISS instead of a catch — the
       same class as the two console anchors this session opened with, found the same way. */
    from: "      const alerted = await alertSkewGate(ctx, alerts, gate.reason);",
    to: "      const alerted = false;",
    expect: "16.515a · ⛔ register:1218",
    suite: "engine-mem",
    sections: "16",
  },
  {
    name: "alerts-skew-every-gate · every refused gate rings, so a deploy and a full slot table wake an officer",
    file: WORKER,
    /* 🔴 RE-ANCHORED 2026-09-23 · stale for the same reason as its sibling above. The POSITIVE control plants
       by widening the GATE rather than the assignment, which is the defect it is named for: every refused gate
       rings, so a deploy and a full slot table wake an officer. */
    from: "    if (SKEW_GATE_REASONS.has(gate.reason)) {",
    to: "    if (gate.reason !== undefined) {",
    expect: "16.515c · ⭐ POSITIVE CONTROL",
    suite: "engine-mem",
    sections: "16",
  },
  {
    name: "alerts-skew-unthrottled · the key is built by hand per call, so AlertOnce never holds and the bell rings every tick",
    file: WORKER,
    from: "    return await alertOnce(ALERT_KEY.clockSkew(), alerts, {",
    to: "    return await alertOnce(ALERT_KEY.clockSkew().prefix + \":\" + String(Math.random()), alerts, {",
    expect: "16.515b · …and a clock 6 s out on the NEXT pass",
    suite: "engine-mem",
    sections: "16",
  },
  {
    name: "alerts-skew-bell-costs-the-pass · the send is no longer swallowed, so a dead channel turns a REPORTED stop into an unreported one",
    file: WORKER,
    from: "    console.error(\"[house-bot] the clock-skew stop could not be announced:\", errMessage(e));\n    return false;",
    to: "    throw e;",
    expect: "16.515d · ⛔ the bell never costs the pass",
    suite: "engine-mem",
    sections: "16",
  },
  {
    name: "alerts-tz-silent · the boot refusal goes back to a console.error on a container that then sits idle",
    file: ENGINE,
    from: "    await alertBootRefused(ticks, \"DB_TIMEZONE\", { zone: zone ?? null, expected: [...UTC_ZONES] });",
    to: "    void ticks;",
    expect: "11.15b · ⛔ register:1210",
    suite: "engine-mem",
    sections: "11",
  },
  {
    name: "alerts-tz-rings-on-every-boot · the bell moves above the zone check, so a healthy UTC database rings too",
    file: ENGINE,
    from: "  const zone = await (deps.timeZone ?? defaultTimeZone)().catch(() => null);",
    to: "  const zone = await (deps.timeZone ?? defaultTimeZone)().catch(() => null);\n  await alertBootRefused(ticks, \"DB_TIMEZONE\", { zone: zone ?? null, expected: [...UTC_ZONES] });",
    expect: "11.15e · ⭐ POSITIVE CONTROL",
    suite: "engine-mem",
    sections: "11",
  },

  /* ══ §7b · THE RULE LEAVES (2026-09-23 · register B6) ════════════════════════════════════════════════════════
   *
   * ⛔ ONE MUTATION PER FAMILY OF LEAF, AND EACH ONE IS THE DEFECT THE CASE EXISTS FOR — a leaf dropped, a unit
   * swapped, a draw's bounds moved, a clock read in the wrong zone. Before §7b every one of these could be made
   * and only the whole-engine fleet drive would have noticed.
   */
  {
    name: "leaf-no-react-zone-dropped · the no-react zone stops being read, so a stake is answered inside the quiet stretch before a market closes",
    file: DECIDE,
    from: `    if (!code && !(placedMs < cutoffMs - g.noReactZoneSec * 1000)) code = "NO_REACT_ZONE";\n    if (!code && dueMs > deadlineMs) code = requestedMs <= deadlineMs ? "EXIT_WINDOW_TOO_LATE" : "CUTOFF";\n    if (!code && product === "UPDOWN") code = udCloseness(view, input.price, bot.rules.updown.closenessPct);`,
    to: `    if (!code && dueMs > deadlineMs) code = requestedMs <= deadlineMs ? "EXIT_WINDOW_TOO_LATE" : "CUTOFF";\n    if (!code && product === "UPDOWN") code = udCloseness(view, input.price, bot.rules.updown.closenessPct);`,
    expect: "7b.1 · guards.noReactZonePollsMin",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-no-react-zone-unit-swapped · the polls zone is read as SECONDS instead of minutes, so a 60-minute guard becomes a one-minute one",
    file: DECIDE,
    from: `    noReactZoneSec: ud ? rules.guards.noReactZoneUdSec : rules.guards.noReactZonePollsMin * 60,`,
    to: `    noReactZoneSec: ud ? rules.guards.noReactZoneUdSec : rules.guards.noReactZonePollsMin,`,
    expect: "7b.1 · guards.noReactZonePollsMin",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-pool-band-exclusive · the pool band's edges stop being inclusive, so a total exactly at the officer's minimum is refused",
    file: DECIDE,
    from: `    if (!code && (total < bot.rules.scope.poolTotalMinTzs || (bot.rules.scope.poolTotalMaxTzs != null && total > bot.rules.scope.poolTotalMaxTzs))) code = "POOL_BAND";`,
    to: `    if (!code && (total <= bot.rules.scope.poolTotalMinTzs || (bot.rules.scope.poolTotalMaxTzs != null && total >= bot.rules.scope.poolTotalMaxTzs))) code = "POOL_BAND";`,
    expect: "7b.3 · scope.poolTotalMinTzs / MaxTzs",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-closing-soon-everywhere · the closing-soon skip stops being a POLLS rule and starts holding rounds back too",
    file: DECIDE,
    from: `    if (!code && product === "MARKET" && cutoffMs - placedMs < bot.rules.scope.skipPollsClosingWithinMin * 60_000) code = "CUTOFF";`,
    to: `    if (!code && cutoffMs - placedMs < bot.rules.scope.skipPollsClosingWithinMin * 60_000) code = "CUTOFF";`,
    expect: "7b.5 · scope.skipPollsClosingWithinMin",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-trigger-band-exclusive · the trigger band's edges stop being inclusive, so a stake exactly at the floor is left alone",
    file: DECIDE,
    from: `    if (!code && (trigger.stakeTzs < bot.rules.counter.triggerStakeMinTzs || trigger.stakeTzs > bot.rules.counter.triggerStakeMaxTzs)) code = "TRIGGER_STAKE_RANGE";\n    if (!code && !(placedMs < cutoffMs - g.noReactZoneSec * 1000)) code = "NO_REACT_ZONE";\n    if (!code && dueMs > deadlineMs) code = requestedMs <= deadlineMs ? "EXIT_WINDOW_TOO_LATE" : "CUTOFF";\n    if (!code && product === "UPDOWN") code = udCloseness(view, input.price, bot.rules.updown.closenessPct);`,
    to: `    if (!code && (trigger.stakeTzs <= bot.rules.counter.triggerStakeMinTzs || trigger.stakeTzs >= bot.rules.counter.triggerStakeMaxTzs)) code = "TRIGGER_STAKE_RANGE";\n    if (!code && !(placedMs < cutoffMs - g.noReactZoneSec * 1000)) code = "NO_REACT_ZONE";\n    if (!code && dueMs > deadlineMs) code = requestedMs <= deadlineMs ? "EXIT_WINDOW_TOO_LATE" : "CUTOFF";\n    if (!code && product === "UPDOWN") code = udCloseness(view, input.price, bot.rules.updown.closenessPct);`,
    expect: "7b.6 · counter.triggerStakeMin/MaxTzs",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-delay-draw-narrowed · the reaction delay is drawn over the minimum alone, so the officer's range does nothing",
    file: DECIDE,
    from: `    const delaySec = deps.randomInt(bot.rules.counter.delayMinSec, bot.rules.counter.delayMaxSec);`,
    to: `    const delaySec = deps.randomInt(bot.rules.counter.delayMinSec, bot.rules.counter.delayMinSec);`,
    expect: "7b.7 · counter.delayMin/MaxSec",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-amount-jitter-ignored · the amount jitter stops being applied, so every answer is the same clean percentage",
    file: DECIDE,
    from: `  const jittered = j > 0 ? Math.floor((base * (100 + randomInt(-j, j))) / 100) : base;`,
    to: `  const jittered = base;`,
    expect: "7b.8 · shaping.jitterPct",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-fixed-amount-ignored · a FIXED amount is answered as a percentage anyway, so the one number an officer typed is not the one staked",
    file: DECIDE,
    from: `  const base = a.kind === "PCT" ? Math.floor((triggerStake * a.pct) / 100) : a.fixedTzs;`,
    to: `  const base = Math.floor((triggerStake * (a.kind === "PCT" ? a.pct : 80)) / 100);`,
    expect: "7b.9 · counter.amount FIXED",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-round-to-rounds-up · amounts are rounded to the NEAREST step instead of floored, so a shaped stake can exceed what was worked out",
    file: DECIDE,
    from: `const floorTo = (n: number, step: number) => (step > 0 ? Math.floor(Math.max(0, n) / step) * step : Math.max(0, Math.floor(n)));`,
    to: `const floorTo = (n: number, step: number) => (step > 0 ? Math.round(Math.max(0, n) / step) * step : Math.max(0, Math.floor(n)));`,
    expect: "7b.10 · shaping.roundToTzs",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-min-time-to-cutoff-dropped · the deadline stops subtracting the officer's margin, so a bet is queued into the last seconds of a round",
    file: DECIDE,
    from: `    minTimeToCutoffSec: Math.max(MIN_TIME_TO_CUTOFF_FLOOR_SEC, ud ? rules.guards.minTimeToCutoffUdSec : rules.guards.minTimeToCutoffPollsMin * 60),`,
    to: `    minTimeToCutoffSec: MIN_TIME_TO_CUTOFF_FLOOR_SEC,`,
    expect: "7b.11 · guards.minTimeToCutoffUdSec",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-schedule-unread-at-decide · the schedule stops gating the untargeted COUNTER, so an account bets outside the hours its officer set",
    file: DECIDE,
    from: `    /* ⛔ THE SAME INSTANT AS THE TARGET PATH ABOVE, AND AS FILL AND OPENER — see the block there. */\n    if (!code && !inSchedule(bot.rules, dueMs)) code = "OUTSIDE_SCHEDULE";`,
    to: `    if (!code && false) code = "OUTSIDE_SCHEDULE";`,
    expect: "7b.12 · schedule.days",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-schedule-read-in-utc · the week's windows are built three hours out, so an officer's 09:00 EAT means 09:00 UTC",
    file: "src/lib/house-bot/clock.ts",
    /* 🔴 RE-AIMED 2026-09-23 · the first version shifted `eatWeekday` and was MISSED, correctly: a three-hour
       shift at midday does not change the DAY, and the day index is all `eatWeekday` contributes here. The
       minute-of-week is what a window is compared against, so that is where a zone error actually lands. */
    from: `  return WEEKDAYS.indexOf(eatWeekday(atMs)) * MINUTES_PER_DAY + eatMinuteOfDay(atMs);`,
    to: `  return WEEKDAYS.indexOf(eatWeekday(atMs)) * MINUTES_PER_DAY + eatMinuteOfDay(atMs) - 180;`,
    expect: "7b.13 · schedule.windows · ⭐ THE UTC DISCRIMINATOR",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-schedule-judged-at-the-trigger · the COUNTER goes back to judging its hours at the player's stake instead of at the instant it would bet",
    file: DECIDE,
    from: `    /* ⛔ THE SAME INSTANT AS THE TARGET PATH ABOVE, AND AS FILL AND OPENER — see the block there. */\n    if (!code && !inSchedule(bot.rules, dueMs)) code = "OUTSIDE_SCHEDULE";\n    const total = input.pools.YES.raw + input.pools.NO.raw;`,
    to: `    if (!code && !inSchedule(bot.rules, placedMs)) code = "OUTSIDE_SCHEDULE";\n    const total = input.pools.YES.raw + input.pools.NO.raw;`,
    expect: "7b.15 · ⛔ THE SCHEDULE IS JUDGED AT THE DUE INSTANT",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-fill-lead-unit-swapped · the poll fill lead is read as SECONDS, so a 30-minute lead fills half a minute before the poll closes",
    file: DECIDE,
    from: `  const leadMs = (product === "UPDOWN" ? r.fill.leadUdSec : r.fill.leadPollsMin * 60) * 1000;`,
    to: `  const leadMs = (product === "UPDOWN" ? r.fill.leadUdSec : r.fill.leadPollsMin) * 1000;`,
    expect: "7b.17 · fill.leadPollsMin",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-fill-jitter-added · the fill jitter is ADDED to the due time instead of subtracted, so it pushes the bet past the lead it was meant to soften",
    file: DECIDE,
    from: `  const dueMs = Math.max(cutoffMs - leadMs - jitterMs, passNowMs);`,
    to: `  const dueMs = Math.max(cutoffMs - leadMs + jitterMs, passNowMs);`,
    expect: "7b.18 · fill.jitterSec",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-fill-jitter-draws-at-zero · a bot that does not jitter draws anyway, shifting every later draw on the same pass",
    file: DECIDE,
    from: `  const jitterMs = r.fill.jitterSec > 0 ? deps.randomInt(0, r.fill.jitterSec) * 1000 : 0;`,
    to: `  const jitterMs = deps.randomInt(0, r.fill.jitterSec) * 1000;`,
    expect: "7b.19 · …and a zero jitter never asks the RNG at all",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-closeness-unread-at-fill · the Up & Down closeness stops gating FILL, so a round that has already moved is filled anyway",
    file: DECIDE,
    from: `  if (product === "UPDOWN" && udCloseness(view, input.price, r.updown.closenessPct)) return { row: null, code: null };\n  if (bot.marketHeld || bot.capPrecheck || !inSchedule(r, dueMs)) return { row: null, code: null };\n\n  const wanted = Math.floor((pools[opp].locked * p) / (100 - p)) - pools[thin].raw;`,
    to: `  if (bot.marketHeld || bot.capPrecheck || !inSchedule(r, dueMs)) return { row: null, code: null };\n\n  const wanted = Math.floor((pools[opp].locked * p) / (100 - p)) - pools[thin].raw;`,
    expect: "7b.20 · updown.closenessPct at FILL",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-opener-delay-unit-swapped · the poll opener's wait is read as SECONDS, so a 30-minute delay opens the market half a minute in",
    file: DECIDE,
    from: `    : deps.randomInt(r.opener.delayPollsMinMin, r.opener.delayPollsMaxMin) * 60;`,
    to: `    : deps.randomInt(r.opener.delayPollsMinMin, r.opener.delayPollsMaxMin);`,
    expect: "7b.23 · opener.delayPollsMin/MaxMin",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "leaf-opener-stake-unfloored · the drawn amount stops being floored to the step, so a shaped bet reads as calculated",
    file: DECIDE,
    /**
     * 🔴 RE-AIMED 2026-09-23, AND THE MISS WAS A FINDING. The first version removed the `floorTo` around the
     * OPENER's own draw and was MISSED — because `clampStake` floors again, to the same `roundToTzs`, two lines
     * later. The opener's own call is therefore belt-and-braces: it cannot change any answer, on any path.
     * ⛔ SO THE MUTATION MOVED TO THE FLOOR THAT BINDS. `clampStake` is the one every kind of stake passes
     * through, and a step that stops being applied there is the defect this case is named for.
     */
    from: `  const capped = floorTo(Math.min(stake, bot.stakeMaxTzs ?? 0, bounds.max), bot.rules.shaping.roundToTzs);`,
    to: `  const capped = Math.min(stake, bot.stakeMaxTzs ?? 0, bounds.max);`,
    expect: "7b.24 · opener.stakeMin/MaxTzs",
    suite: "engine-mem",
    sections: "7b",
  },
  /* == M4 - THE BOOT REFUSAL THE DESK CAN READ (2026-09-23) ============================================ */
  {
    /* THE DEFECT ITSELF, PUT BACK: the refusal goes back to ringing a bell and writing nothing durable, so the
       desk sees no boot and no beat and can only say the vaguer thing. */
    name: "boot-refusal-writes-nothing \u00b7 M4 \u00b7 a database whose time zone is not UTC stops the engine and leaves no record the desk can read",
    file: ENGINE,
    from: `      await houseBotRuntimeStore.upsert(RUNTIME_KEY.engine(INSTANCE_ID), { pollerErrorCode: \`\${BOOT_REFUSED_CODE}:DB_TIMEZONE\` });`,
    to: `      void BOOT_REFUSED_CODE;`,
    expect: "11.16a \u00b7 M4 \u00b7 \u2026and it RECORDS THE CAUSE where the desk can read it",
    suite: "engine-mem",
    sections: "11",
  },
  {
    /* AND THE HALF THAT KEEPS IT FROM OUTLIVING ITS CAUSE - a danger Callout nobody can clear. */
    name: "boot-refusal-outlives-its-cause \u00b7 M4 \u00b7 a boot that LANDS stops clearing the refusal, so the desk keeps naming a fault that is over",
    file: DAL,
    from: `    return memRuntimeUpsert(key, { engineEnabled: input.engineEnabled, bootAt: nowIso(), pollerErrorCode: null });`,
    to: `    return memRuntimeUpsert(key, { engineEnabled: input.engineEnabled, bootAt: nowIso() });`,
    expect: "11.16e \u00b7 M4 \u00b7 a boot that LANDS clears the refusal",
    suite: "engine-mem",
    sections: "11",
  },
  {
    /* AND THE VERDICT'S PLACE IN THE LADDER: below `STALE` it would never be reached on the very state it
       exists to explain, because a refused engine writes no planner beat either. */
    name: "boot-refusal-below-stale \u00b7 M4 \u00b7 the refusal is ranked under `STALE`, so the desk goes back to saying the engine is not running with no cause named",
    file: HEALTH,
    from: `  if (beats.bootRefusedReason !== null) return "BOOT_REFUSED";`,
    to: `  void beats.bootRefusedReason;`,
    expect: "11.16c \u00b7 M4 \u00b7 and the verdict is `BOOT_REFUSED`, ABOVE `STALE`",
    suite: "engine-mem",
    sections: "11",
  },
  /* == 7c - THE FLEET LANE E CLAIMS, NOW DISCRIMINATED (register E - M9, 2026-09-23) ==================
   * The lane asserted these end to end and its own header admitted they had no discriminating mutation: the
   * fleet's only red is `KP_FLEET_SILENT`, which proves an assertion cannot pass with a DEAD engine, never that
   * it catches a WRONG one. There is no fleet `suite:`, so they could not be declared there. The claims moved to
   * §7c, where `planOpener` is pure — and these are the mutations that make them bite. */
  {
    name: "opener-deadline-ignores-the-guard · the cutoff guard stops reaching the OPENER's deadline, so a stake may be planned with no room to land",
    file: DECIDE,
    /* 🔴 RE-ANCHORED 2026-09-23. `const deadlineMs = cutoffMs - g.minTimeToCutoffSec * 1000;` stands at FOUR
       sites in this file — twice in `decideCounter` (324, 389), once in `planFill` (529) and once in
       `planOpener` (576) — so this anchor matched 4× and `resolveAnchor` refused to inject it. An anchor that
       cannot resolve plants NOTHING and reports NOTHING, so this declared mutation had been measuring nothing
       (the §6.2 trap the 2026-09-23 handover names, met again). `expect` is a §7c case and §7c tests
       `planOpener`, so the site is 576; it is pinned on the two lines above it, which occur only there —
       `planFill` computes `dueMs` before `guardsFor`, and `decideCounter` never calls `guardsFor` at all. */
    from: `  const cutoffMs = ms(cutoffOf(view));
  const g = guardsFor(r, product);
  const deadlineMs = cutoffMs - g.minTimeToCutoffSec * 1000;`,
    to: `  const cutoffMs = ms(cutoffOf(view));
  const g = guardsFor(r, product);
  const deadlineMs = cutoffMs - MIN_TIME_TO_CUTOFF_FLOOR_SEC * 1000;`,
    expect: "7c.1 · guards.minTimeToCutoffPollsMin",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    /* ⛔ THE FLOOR, NOT THE GUARD — a different line from the one above, so the two cannot mask each other. */
    name: "opener-deadline-loses-its-floor · a guard of zero minutes collapses the deadline onto the cutoff itself",
    file: DECIDE,
    from: `    minTimeToCutoffSec: Math.max(MIN_TIME_TO_CUTOFF_FLOOR_SEC, ud ? rules.guards.minTimeToCutoffUdSec : rules.guards.minTimeToCutoffPollsMin * 60),`,
    to: `    minTimeToCutoffSec: (ud ? rules.guards.minTimeToCutoffUdSec : rules.guards.minTimeToCutoffPollsMin * 60),`,
    expect: "7c.2 · …and the 10 s FLOOR holds under it",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "opener-stale-reads-the-wrong-product · a poll's OPENER takes the Up & Down stale window, so it expires twenty times early",
    file: DECIDE,
    from: `  const staleMs = dueMs + (product === "UPDOWN" ? STALE_AFTER_SEC.updown : STALE_AFTER_SEC.polls) * 1000;
  return {
    row: {
      houseBotId: bot.botId, botUserId: bot.botUserId, kind: "OPENER",`,
    to: `  const staleMs = dueMs + STALE_AFTER_SEC.updown * 1000;
  return {
    row: {
      houseBotId: bot.botId, botUserId: bot.botUserId, kind: "OPENER",`,
    expect: "7c.3 · STALE_AFTER_SEC",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    name: "opener-asks-for-an-amount · the OPENER's decision grows a `wantedTzs`, so a bet it DREW reads as one it calculated",
    file: DECIDE,
    from: `        entry: "AUTO", delaySec, bettableFrom: bettableFrom(view),`,
    to: `        entry: "AUTO", delaySec, bettableFrom: bettableFrom(view), wantedTzs: clamped.stake,`,
    expect: "7c.4 · an OPENER's decision carries NO asked amount",
    suite: "engine-mem",
    sections: "7b",
  },
  {
    /* ⭐ THE SIXTH LANE-E CLAIM, AND THE CASE FOR IT ALREADY EXISTED — only the mutation was missing. `13.1`
       has asserted "ONE placed alert" since it was written and nothing ever put the defect back.
       ⛔ `markAlerted` IS LEFT ALONE deliberately: it still wins the claim, so `alertedAt` is set and the A8
       repair pass (whose predicate is `status = 'PLACED' AND "alertedAt" IS NULL`) will not quietly re-send and
       hide the mutation. What this removes is the send itself — one alert becomes none. */
    name: "placed-alert-never-sent · a placed stake stops ringing its bell while still claiming the alert, so nobody is told and the repair pass cannot tell",
    file: OUTCOMES,
    from: `      const won = await houseBotIntentStore.markAlerted(intent.id);
      if (won) await alerts.placed(intent);`,
    to: `      const won = await houseBotIntentStore.markAlerted(intent.id);
      void won;`,
    expect: "13.1 · ok → placed, the A8 alertedAt claim taken, ONE placed alert",
    suite: "engine-mem",
    sections: "13",
  },
  {
    /* ⭐ THE 2026-09-23 DEFECT, PUT BACK. This is the line that kept a switched-on, funded, correctly-scoped
       live desk from placing a single bet in 23 hours: A15 scaled "has the price run away?" by the round's own
       winning margin, and BTC's chains carry `marginBps = 0`, so that margin was ONE TICK — 0.02 against an
       open of 86,379.20. Removing the floor restores exactly that, and 7.10a is the production shape itself.
       ⛔ 7.10b and 7.10e must STAY GREEN under this mutation: the guard still refuses $50 of drift, and a band
       that already describes its asset is unchanged either way. A run that reds those instead is WRONG-ASSERTION. */
    name: "ud-closeness-no-floor · the closeness band is the raw margin again, so a marginBps=0 chain demands the price sit within two cents and the desk never bets",
    file: DECIDE,
    from: `  const band = Math.max(margin, (r.openPrice * UD_CLOSENESS_FLOOR_BPS) / 10_000);
  return Math.abs(price.price - r.openPrice) * 100 <= closenessPct * band ? null : "UD_CLOSENESS";`,
    to: `  return Math.abs(price.price - r.openPrice) * 100 <= closenessPct * margin ? null : "UD_CLOSENESS";`,
    expect: "7.10a · ⭐ THE PRODUCTION SHAPE · a one-tick band (±0.02 on an open of 86,379.20) is floored to 43.19, so a $10 drift is ALLOWED at 25%",
    suite: "engine-mem",
    sections: "7",
  },
  {
    /* ⭐ THE THIRD BLOCKER OF 2026-09-23, PUT BACK. `peekVendorBar` saw only the terminal's cache, which a PLAYER
       warms by opening the 1-minute chart; the desk's other route is a CONFIRMED observation under 60 s old, and
       the provider's dated bar publishes ~91 s after its boundary, so that route is older than its own threshold
       the moment it exists. Removing the oracle's republished reading restores exactly that: with no chart open
       the desk holds no price at all and skips every market, silently.
       ⛔ 14.7c MUST STAY GREEN under this mutation — a stale reading is refused either way; what this removes is
       the desk's ability to hold ANY reading, not its ability to judge one. */
    name: "oracle-bar-unpublished · the desk goes back to seeing only a chart cache a player warms, so with no chart open it has no price at all",
    file: TERMINAL_VENDOR,
    from: `  const oracle = oracleBars.get(assetId);
  if (oracle && (!newest || oracle.t > newest.t)) newest = oracle;
  return newest;`,
    to: `  return newest;`,
    expect: "14.7b · ⭐ …and the oracle's own confirmed reading now serves it — the desk can price with no chart open",
    suite: "engine-mem",
    sections: "14",
  },
];
