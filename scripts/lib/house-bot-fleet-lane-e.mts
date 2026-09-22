/**
 * LANE E · OPENER — one lane module of the fleet drive (see `house-bot-fleet-drive.mts`, "lane modules").
 *
 * ⛔ THIS FILE IMPORTS NOTHING FROM `src/` — its `expect` literals are the ORACLE, derived by hand from inputs this
 * fixture chose (the roster's header argues the alternatives out). `run` receives everything it touches through `env`.
 *
 * ── WHAT THE LANE MEASURES ────────────────────────────────────────────────────────────────────────────────
 * An automated OPENER is produced by exactly one path: planner duty 7f → `planFillAndOpener` → `planMarket` →
 * `planOpener`. It is never produced by the sweep and never by Enter now. Its inputs are an EMPTY poll (both raw
 * pools 0 — `plannableMarkets` requires it in SQL, `planMarket` and `planOpener` re-check it), a side drawn ONCE and
 * written durably (`OPENER_SIDE_DRAWN`, UNIQUE per market), a stake drawn from the rules' band and FLOORED to the
 * shaping step, and a delay in MINUTES that becomes seconds ×60. So the lane pins, on one poll:
 *   · 3,500 drawn → 3,000 written (the floor is the lane; an opener stake already on the step proves nothing);
 *   · `decision.delaySec` 60 and `dueAt` EQUAL to createdAt + 60,000 ms — an equality, because `dueAt` is a
 *     `max(bettableFrom + delay, passNow)` and "later than createdAt" would also be true of a zero delay;
 *   · the drawn side, read back off the durable event and equal to the intent's side;
 *   · a decision that carries NO `askedStakeTzs`/`wantedTzs` (an OPENER asks for nothing — it draws) and DOES carry
 *     `delaySec`, `bettableFrom` and the snapshot;
 *   · one non-cancelled OPENER per market EVER: a later planner pass, witnessed, plans nothing more on the same poll;
 *   · the accuracy chain whole: PENDING intent → PLACED position → the holder's wallet → every money row marked;
 *   · the scan STATEMENT itself, called as the planner calls it: the FILL scan lists both polls (alive), the OPENER
 *     scan lists neither — the SQL layer of the empty-pool gate and of the uniqueness, measured directly, because
 *     each is re-checked in code and the product-level rows above SURVIVE a mutation of the SQL alone.
 *
 * ── THE FACTS THE FIXTURE RESTS ON (read in `src/`, not assumed) ───────────────────────────────────────────
 * · The poll is created INSIDE `run`, i.e. after the switch went on and the engine booted: `planOpener` refuses,
 *   silently, a `bettableFrom` (= createdAt for a poll) earlier than max(global scopeFrom, the desk's scopeFrom).
 * · ⛔ NOTHING STAKES ON THE OPENER POLL, EVER. Both pools must be exactly 0 at the scan AND at placement: the money
 *   seam re-checks them for an OPENER inside the lock (`conditionGone("OPENER")`) even though `fire.ts` skips its own
 *   pool read for this kind. That is the opposite of every other lane, and it is why this lane has a CONTROL poll
 *   instead: a sibling on the same category that already holds a player's money, which the same duty must ignore.
 * · `triggerPositionId` is NULL for an OPENER; the row is found by `kind` + `marketId`, never by a trigger.
 * · The planner is SILENT on refusal (no SKIPPED row is written for an OPENER it declined), so every absence below is
 *   asserted beside a positive witness from the same pass, and the drive's `KP_FLEET_SILENT` meta-mutation must turn
 *   every assertion here red.
 * · A stake on a category no desk covers for `counter` produces no row and no alert (`decideCounter` returns
 *   `{ row: null, code: null }` with no bot in scope), so the control poll's seed disturbs nothing.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
import type { FleetBot } from "./house-bot-fleet-roster.mts";

export const LANE = "E";

export const roster: readonly FleetBot[] = [
  /* ── Lane E · other · OPENER ────────────────────────────────────────────────────────────────────── */
  {
    key: "E1-OPENER", lane: "E", category: "other", band: [10_000, 999_999],
    what: "OPENER draws 3,500 from a fixed band and FLOORS it to 3,000 — so the rounding is load-bearing",
    /* counter and fill stay OFF: the desk decides about nothing but empty polls, and the band above is inert. */
    rules: { opener: true, openerStakeTzs: 3_500, roundToTzs: 1_000, jitterPct: 0, openerDelayMin: 1 },
  },
];

/**
 * THE EXPECTED VALUES, EACH WITH ITS DERIVATION. Inputs the fixture chose: opener band 3,500–3,500, shaping step
 * 1,000, delay band 1–1 minute, the drive's open caps (stakeMin 1,000 · stakeMax 10,000,000), platform bounds
 * 1,000 · 1,000,000, the default guards (minTimeToCutoffPollsMin 5), a 90-minute close, and the drive's pinned side
 * draw (`() => 0`, which the side drawer maps to YES).
 */
export const expect = {
  /**
   * E1 · OPENER on a poll with both raw pools at exactly 0.
   *   drawn     = floorTo(randomInt(3,500, 3,500), 1,000) = floor(3,500 / 1,000) × 1,000 = 3,000
   *               ← the floor is load-bearing: 3,500 ≠ 3,000. An engine that does not floor writes 3,500 — but
   *               ⚠️ decide floors TWICE (here, and again inside clampStake), so removing THIS floor alone still
   *               writes 3,000 (measured: 33/33, invisible from outside — the row has no `drawn`); the mutation
   *               the lane catches is the floor gone from decide altogether (floorTo the identity → 3,500 at the
   *               row and in its why). fire.ts floors a third time and writes the smaller stake back (MON-02),
   *               so the position and the wallet read 3,000 under every floor mutation: only the decide-stage
   *               assertions (the stake at PENDING, the why) can see one.
   *   decide    = clampStake(3,000) = floorTo(min(3,000, stakeMax 10,000,000, bounds 1,000,000), 1,000) = 3,000
   *               ok because 3,000 ≥ max(stakeMin 1,000, bounds.min 1,000)
   *   fire      = floorTo(min(3,000, cut ∞ (no pool cut for an OPENER), 10,000,000, 1,000,000), 1,000) = 3,000
   *   side      = YES — the side draw is `randomInt(2)`; the drive pins it to 0, and 0 is YES
   *   delaySec  = randomInt(1, 1) × 60 = 60 — `delayPollsMinMin` is MINUTES; read as seconds it would be 1
   *   dueAfterMs = 60 × 1,000 = 60,000 — dueAt = max(createdAt + 60,000, passNow); the planner scans within
   *               15 s of creation, so the max is the sum and the assertion is an EQUALITY with createdAt + 60 s
   *   deadlineBeforeCutoffMs = max(10 s floor, 5 min × 60) × 1,000 = 300,000 — deadlineAt = cutoff − 300 s
   *   staleAfterDueMs = 600 × 1,000 = 600,000 — staleAt = dueAt + STALE_AFTER_SEC.polls
   *   why       = `Opener · <label> · empty poll, drawn side <side> · <formatWhole(stake)> <delaySec>s after it opened`
   *               with label "Fleet E1-OPENER" (the drive labels every desk `Fleet <key>`) and formatWhole(3000) = "3,000"
   *   controlSeed = 5,000 — any non-zero raw pool on the CONTROL poll; there is no counter band to keep clear of,
   *               because this desk's counter mode is off. It must be ≥ the platform minimum 1,000.
   */
  "E1-OPENER": {
    decide: 3_000, fire: 3_000, side: "YES", delaySec: 60, dueAfterMs: 60_000,
    deadlineBeforeCutoffMs: 300_000, staleAfterDueMs: 600_000,
    why: "Opener · Fleet E1-OPENER · empty poll, drawn side YES · 3,000 60s after it opened",
    controlSeed: 5_000,
  },
} as const;

export async function run(env: Any, prior: Any): Promise<Any> {
  void prior;
  const { ok, section, until, j, w, S, C, fleet, stake, EXPECT, COUNTER_CUTOFF_MIN, laneWanted, passes, calls, seen } = env;
  if (!laneWanted("E")) return null;
  const bot = fleet["E1-OPENER"];
  if (!bot) return null;
  const exp: Any = EXPECT["E1-OPENER"];
  const K = "E1-OPENER";

  /* ── the shared idioms, copied from the lanes file (its helpers are not exported) ─────────────────── */
  /** ⛔ The guard that keeps the ruling-120 placeholder out of every arithmetic comparison. */
  const stakeOracle = (row: Any, expected: number, what: string): void => {
    if (!row) { ok(what, false, "no row"); return; }
    if (!["PENDING", "CLAIMED", "PLACED"].includes(row.status)) {
      ok(what, false, `refused to compare: ${row.id} is ${row.status} — stakeTzs there is the ruling-120 placeholder, not an intended stake`);
      return;
    }
    ok(what, row.stakeTzs === expected, j({ got: row.stakeTzs, expected, status: row.status }));
  };
  /** ⚠️ `IntentFeedFilter` carries NO `marketId` — it filters by ACCOUNT (or by kind); the market is filtered here. */
  const rowsOf = async (botId: string): Promise<Any[]> => {
    const page = await S.houseBotIntentStore.listFeed({ houseBotId: botId, limit: 50 });
    return (page?.rows ?? page ?? []) as Any[];
  };
  /** Every OPENER row on a market across ALL accounts — the anchor uniqueness is per market, not per desk. */
  const openerRowsOn = async (marketId: string): Promise<Any[]> => {
    const page = await S.houseBotIntentStore.listFeed({ kinds: ["OPENER"], limit: 200 });
    return ((page?.rows ?? page ?? []) as Any[]).filter((r) => r.marketId === marketId);
  };
  /** An instant for a detail string that must not throw on an absent value (lane C's `RangeError` lesson). */
  const stamp = (t: number): string => (Number.isFinite(t) ? new Date(t).toISOString() : "— absent —");
  const T = (s: unknown): number => (typeof s === "string" ? Date.parse(s) : Number.NaN);

  section("lane E · OPENER — an EMPTY poll, one drawn side, 3,500 floored to 3,000, due EXACTLY 60 s after it opened");

  /* ── the CONTROL poll FIRST: a sibling on the same category that already holds a player's money ──────
     Created and seeded BEFORE the opener poll exists, so the pass that plans the opener poll has necessarily
     scanned this one with its seed already on the book — no premise about pass timing is needed. */
  const control = await w.poll({ graceMin: 0, category: bot.category, closeInMs: COUNTER_CUTOFF_MIN * 60_000, title: `Fleet ${K} control (holds a player's money)` });
  const seed = await stake(control.id, "NO", exp.controlSeed, 0);

  /* ⚠️ The holder's balance is taken BEFORE the opener poll exists — after the intent appears is a race the poller
     can win. `passesBefore` is taken here too, so "a pass since the poll was created" is a slice, not a guess. */
  const before = (await w.bal(bot.userId)).balance as number;
  const passesBefore: number = passes.planner.length;
  const market = await w.poll({ graceMin: 0, category: bot.category, closeInMs: COUNTER_CUTOFF_MIN * 60_000, title: `Fleet ${K}` });
  /* ⛔ NOTHING STAKES ON `market`, EVER — see the header. */
  const createdMs = T(market.createdAt);
  const cutoffMs = T(market.selectionClosedAt);

  // ── phase 1 · the DECISION — found by kind + market, because an OPENER has no trigger position ─────
  const decided = await until(`${K} · an OPENER decision on the empty poll`, 60_000, async () => {
    const rows = await rowsOf(bot.botId);
    const hit = rows.find((r: Any) => r.kind === "OPENER" && r.marketId === market.id);
    return hit ? await S.houseBotIntentStore.get(hit.id) : null;
  });
  const dec: Any = decided?.decision ?? null;
  const scopeFrom = {
    global: (await S.houseBotRuntimeStore.get(C.RUNTIME_KEY.global))?.scopeFrom ?? null,
    desk: (await S.houseBotRuntimeStore.get(C.RUNTIME_KEY.bot(bot.botId)))?.scopeFrom ?? null,
  };

  ok(`${K} · the planner decided: a PENDING OPENER on the empty poll, anchored on the MARKET id, with NO trigger position, for this account`,
    decided?.kind === "OPENER" && decided?.status === "PENDING" && decided?.reasonCode == null && decided?.anchorKey === market.id
      && decided?.triggerPositionId === null && decided?.botUserId === bot.userId && decided?.productLine === "MARKET",
    j({ kind: decided?.kind, status: decided?.status, code: decided?.reasonCode, anchorIsMarket: decided?.anchorKey === market.id,
        trigger: decided?.triggerPositionId, createdAt: market.createdAt, scopeFrom }));
  ok(`${K} · …on the drawn side ${exp.side} (the drive pins the side draw to 0, which the drawer maps to YES)`,
    decided?.side === exp.side, j({ side: decided?.side }));
  stakeOracle(decided, exp.decide,
    `${K} · …and its stake is EXACTLY ${exp.decide} — 3,500 drawn, FLOORED to the 1,000 step (an engine that does not floor writes 3,500)`);
  ok(`${K} · …decision.delaySec is exactly ${exp.delaySec} — openerDelayMin 1 is MINUTES × 60 (read as seconds it would be 1)`,
    dec?.delaySec === exp.delaySec, j({ delaySec: dec?.delaySec }));
  ok(`${K} · …decision.bettableFrom IS the poll's createdAt (a poll has no round, so max(opensAt, createdAt) is createdAt)`,
    Number.isFinite(createdMs) && T(dec?.bettableFrom) === createdMs,
    j({ bettableFrom: dec?.bettableFrom, createdAt: market.createdAt }));
  ok(`${K} · …dueAt EQUALS createdAt + ${exp.dueAfterMs} ms, and EQUALS bettableFrom + delaySec × 1,000 — an equality, so the max(…, passNow) fallback demonstrably did NOT fire`,
    Number.isFinite(createdMs) && T(decided?.dueAt) === createdMs + exp.dueAfterMs
      && T(decided?.dueAt) === T(dec?.bettableFrom) + (typeof dec?.delaySec === "number" ? dec.delaySec : Number.NaN) * 1000,
    j({ dueAt: decided?.dueAt, expected: stamp(createdMs + exp.dueAfterMs), createdAt: market.createdAt }));

  /* ⛔ THE WITNESS. The planner writes NOTHING when it declines an OPENER, so a row's existence is the only positive
     evidence — and the pass that wrote it must be visible too, or a row could have come from anywhere. */
  const since = (): Any[] => passes.planner.slice(passesBefore);
  const planning = since().find((p: Any) => p?.duties?.fillOpener === "ok" && (p?.counts?.opened ?? 0) >= 1);
  ok(`${K} · WITNESS · a planner pass since the poll was created ran duty fillOpener "ok" and counted opened ≥ 1 — the row came from the planner, not from silence`,
    !!planning && !!decided,
    j({ passes: since().length, pass: planning ? { at: planning.passNowIso, fillOpener: planning.duties?.fillOpener, opened: planning.counts?.opened } : null }));

  ok(`${K} · …the decision carries NO askedStakeTzs, NO wantedTzs and NO pool fields (an OPENER asks for nothing — it draws), and DOES carry entry AUTO, delaySec, bettableFrom and the snapshot {titleEn, category, cutoff, roundNumber null}`,
    dec != null && !("askedStakeTzs" in dec) && !("wantedTzs" in dec) && !("rawYes" in dec) && !("lockedNo" in dec)
      && dec.entry === "AUTO" && typeof dec.delaySec === "number" && typeof dec.bettableFrom === "string"
      && dec.snapshot?.category === bot.category && dec.snapshot?.titleEn === `Fleet ${K}` && dec.snapshot?.roundNumber === null
      && Number.isFinite(cutoffMs) && T(dec.snapshot?.cutoff) === cutoffMs,
    j({ keys: dec ? Object.keys(dec) : null, snapshot: dec?.snapshot ?? null, cutoff: market.selectionClosedAt }));
  ok(`${K} · …deadlineAt = cutoff − ${exp.deadlineBeforeCutoffMs} ms (minTimeToCutoffPollsMin 5) and staleAt = dueAt + ${exp.staleAfterDueMs} ms (STALE_AFTER_SEC.polls)`,
    Number.isFinite(cutoffMs) && T(decided?.deadlineAt) === cutoffMs - exp.deadlineBeforeCutoffMs
      && T(decided?.staleAt) === T(decided?.dueAt) + exp.staleAfterDueMs,
    j({ deadlineAt: decided?.deadlineAt, expectedDeadline: stamp(cutoffMs - exp.deadlineBeforeCutoffMs), staleAt: decided?.staleAt, expectedStale: stamp(T(decided?.dueAt) + exp.staleAfterDueMs) }));
  ok(`${K} · …and its why is exactly the sentence the rules produce (label, side, 3,000 with its comma, 60s)`,
    decided?.why === exp.why, j({ got: decided?.why ?? null, expected: exp.why }));

  // ── the durable draw · one OPENER_SIDE_DRAWN per market, and the intent's side is that row's ───────
  const draw = await S.houseBotEventStore.findOpenerDraw(market.id);
  ok(`${K} · the side was drawn ONCE, durably: an OPENER_SIDE_DRAWN event on this market says ${exp.side}, drawn for OPENER_PLAN by this account — and the intent's side EQUALS it`,
    !!draw && draw.kind === "OPENER_SIDE_DRAWN" && draw.payload?.side === exp.side && draw.payload?.drawnFor === "OPENER_PLAN"
      && draw.houseBotId === bot.botId && !!decided && decided.side === draw.payload?.side,
    j({ event: draw ? { kind: draw.kind, side: draw.payload?.side, drawnFor: draw.payload?.drawnFor, byThisAccount: draw.houseBotId === bot.botId } : null, intentSide: decided?.side }));
  /* ⛔ The draw is made BEFORE the replayed decision and the insert (planner.ts), so its row predates the intent's.
     A draw that only existed because a placement happened would be a different mechanism. */
  ok(`${K} · …and the draw row predates the intent row — the side was chosen before the row was written, not as a by-product of it`,
    !!draw && !!decided && T(draw.createdAt) <= T(decided.createdAt),
    j({ drawnAt: draw?.createdAt ?? null, intentAt: decided?.createdAt ?? null }));

  // ── uniqueness · a LATER pass over the SAME still-empty poll plans nothing more ─────────────────────
  /* ⛔ Checked while the first intent is still PENDING and the pools are still 0, deliberately: at that moment the
     empty-pool gate cannot be what excludes the poll, so the exclusion measured is the per-market OPENER
     uniqueness (the scan's NOT EXISTS, the desk's own-intent hold and `hbi_fill_opener_anchor_uq` behind them).
     The witness is a pass whose passNow is AFTER the intent's createdAt with the duty reported "ok". */
  const later = decided ? await until(`${K} · a LATER planner pass over the same still-empty poll`, 45_000, async () =>
    passes.planner.find((p: Any) => p?.duties?.fillOpener === "ok" && T(p?.passNowIso) > T(decided.createdAt)) ?? null) : null;
  const checkedAtMs = Date.now();
  const rowsNow = await openerRowsOn(market.id);
  const stillPending = decided ? await S.houseBotIntentStore.get(decided.id) : null;
  const positionsNow = (await w.positionsOf(market.id)).length;
  ok(`${K} · WITNESS · a LATER planner pass (passNow after the intent's createdAt) ran duty fillOpener "ok" over the same poll`,
    !!later, j({ at: later?.passNowIso ?? null, intentAt: decided?.createdAt ?? null }));
  ok(`${K} · …and it did NOT plan a second OPENER: across ALL accounts exactly ONE OPENER row on this market — the first, still PENDING, with the pools still 0 (so the empty-pool gate is not what excluded it)`,
    !!later && rowsNow.length === 1 && rowsNow[0]?.id === decided?.id && stillPending?.status === "PENDING" && positionsNow === 0,
    /* ⛔ `undefined === undefined` is not agreement — the detail says so too, not only the verdict. */
    j({ rows: rowsNow.length, sameRow: !!decided && rowsNow[0]?.id === decided.id, status: stillPending?.status ?? null, positions: positionsNow }));

  // ── the SCAN itself, called as the planner calls it — the SQL layer measured directly, beside the positive ──
  /* ⛔ The empty-pool gate and the per-market OPENER uniqueness are each enforced at THREE sites: the scan's SQL
     (`plannableMarkets`), `planMarket`'s re-check and `planOpener`'s re-check — and, for uniqueness, the desk's
     OWN_INTENT hold and `hbi_fill_opener_anchor_uq` behind them. The product-level assertions above and below
     SURVIVE a mutation of the SQL site alone (measured: the pool predicate dropped from the statement, 31/31,
     because the two re-checks still refused) — a redundancy, not a defect, but it left the SQL layer NOT MEASURED.
     So the scan is called here exactly as `planFillAndOpener` calls it, on the same database, while both polls are
     LIVE with their cutoffs ahead: the FILL scan, which has no pool predicate and keys its NOT EXISTS on FILL
     rows, must list BOTH polls — the witness that the scan is alive and sees them — while the OPENER scan must
     list NEITHER: not the control (a raw pool is non-zero) and not the empty poll (its OPENER row exists and is
     not CANCELLED). Each verdict is conjoined with the planner's positive: the scan is a DAL call and answers under
     KP_FLEET_SILENT too, so on its own it would pass with the engine off. Keyset-paged on (cutoff, id) at 200
     rows; both polls close in 90 min beside every other lane's, far inside one page. */
  const scanIds = async (kind: "FILL" | "OPENER"): Promise<{ ids: string[]; error: string | null }> => {
    try {
      const rows = await S.houseSeamStore.plannableMarkets({ kind, productLine: "MARKET", fromIso: new Date(Date.now() + 10_000).toISOString(), toIso: null, after: null, limit: 200 });
      return { ids: (rows as Any[]).map((r) => String(r.id)), error: null };
    } catch (e) { return { ids: [], error: e instanceof Error ? e.message : String(e) }; }
  };
  const fillScan = await scanIds("FILL");
  const openerScan = await scanIds("OPENER");
  const scanned = { fillHasControl: fillScan.ids.includes(control.id), openerHasControl: openerScan.ids.includes(control.id),
    fillHasMarket: fillScan.ids.includes(market.id), openerHasMarket: openerScan.ids.includes(market.id), error: fillScan.error ?? openerScan.error };
  ok(`${K} · the SCAN, called as the planner calls it: the FILL scan (no pool predicate) lists the control poll — the scan is alive and sees it — and the OPENER scan does NOT: its raw NO pool is ${exp.controlSeed}, so the SQL empty-pool gate excluded it there, measured at the statement beside the planner's positive`,
    !!decided && !!planning && scanned.error === null && scanned.fillHasControl && !scanned.openerHasControl,
    j({ ...scanned, fillRows: fillScan.ids.length, openerRows: openerScan.ids.length }));
  ok(`${K} · …and the OPENER scan does NOT list the empty poll either, while the FILL scan does — its OPENER row exists and is not CANCELLED, so the SQL NOT EXISTS excluded it: one OPENER per market, measured at the statement`,
    !!decided && scanned.error === null && scanned.fillHasMarket && !scanned.openerHasMarket,
    j({ ...scanned, intent: decided?.id ?? null, status: stillPending?.status ?? null }));

  // ── phase 2 · the FIRE, at dueAt + the claim's skew guard ────────────────────────────────────────────
  const fired = decided?.status === "PENDING" ? await until(`${K} · the poller firing it`, 150_000, async () => {
    const r = await S.houseBotIntentStore.get(decided.id);
    return r && r.status !== "PENDING" && r.status !== "CLAIMED" ? r : null;
  }) : null;
  ok(`${K} · the poller fired it to PLACED, with a position id`,
    fired?.status === "PLACED" && !!fired?.positionId, j({ status: fired?.status ?? null, code: fired?.reasonCode ?? null }));
  /* Informational — the margins this lane's clock rests on, printed on every run so a near-miss is visible before
     it becomes a red run: the planner must see the poll inside 60 s (or dueAt becomes passNow), the uniqueness
     check must land before dueAt (or it measures the pool gate), and the fire follows dueAt by the claim guard. */
  const sec = (ms: number): string => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : "—");
  console.log(`   · ${K} timing · decided ${sec(T(decided?.createdAt) - createdMs)} after the poll opened (budget 60s) · planned by the pass at`
    + ` ${sec(T(planning?.passNowIso) - createdMs)} · uniqueness checked ${sec(T(decided?.dueAt) - checkedAtMs)} BEFORE dueAt · fired`
    + ` ${sec(T(fired?.finishedAt) - T(decided?.dueAt))} after dueAt`);

  const all = await w.positionsOf(market.id);
  const house = all.filter((p: Any) => p.houseBotId === bot.botId);
  ok(`${K} · exactly ONE marked position on this market, on the drawn side, and it IS the position the intent row names`,
    house.length === 1 && house[0]?.side === exp.side && !!fired?.positionId && house[0]?.id === fired.positionId,
    j({ n: house.length, side: house[0]?.side ?? null, joined: !!fired?.positionId && house[0]?.id === fired?.positionId }));
  const staked = house[0]?.stake;
  ok(`${K} · …of exactly ${exp.fire} — the number the rules decided is the number that was staked, and the row still says so (nothing re-drew at fire)`,
    staked === exp.fire && fired?.stakeTzs === exp.fire, j({ staked: staked ?? null, row: fired?.stakeTzs ?? null, expected: exp.fire }));
  /* ⛔ HOUSE_ONLY is Enter now's refusal (the MANUAL path, mapped to CONDITION_GONE at fire). Had it applied to a
     planned OPENER, a poll holding nothing but house money could never take one — so the placement INTO such a poll
     is the assertion, with the premise read back off the positions rather than assumed. */
  ok(`${K} · it was placed into a poll holding NOTHING but its own money — the house position is the ONLY position — so HOUSE_ONLY (Enter now's refusal, CONDITION_GONE at fire) is NOT applied to a planned OPENER`,
    fired?.status === "PLACED" && fired?.reasonCode == null && all.length === 1 && all[0]?.houseBotId === bot.botId,
    /* `[].every` is vacuously true — an empty market must not read as "all house" in the detail. */
    j({ positions: all.length, allHouse: all.length > 0 && all.every((p: Any) => p.houseBotId === bot.botId), status: fired?.status ?? null, code: fired?.reasonCode ?? null }));
  const betAt = house[0]?.placedAt ? T(house[0].placedAt) : Number.NaN;
  ok(`${K} · …and the bet landed at or after dueAt = createdAt + 60 s — the delay was honoured, not merely recorded`,
    Number.isFinite(betAt) && Number.isFinite(createdMs) && betAt >= createdMs + exp.dueAfterMs,
    j({ bet: stamp(betAt), due: stamp(createdMs + exp.dueAfterMs) }));

  // ── the accuracy chain, joined: rules → intent → position → wallet → marked money rows ─────────────
  const after = (await w.bal(bot.userId)).balance as number;
  ok(`${K} · …and the holder's wallet fell by exactly that, to the shilling`,
    typeof staked === "number" && before - after === staked, j({ before, after, delta: before - after, staked: staked ?? null }));
  const txns = house[0] ? await w.txnsFor(house[0].id) : [];
  ok(`${K} · …and every money row it wrote carries the marker`,
    txns.length > 0 && txns.every((t: Any) => t.houseBotId === bot.botId), j({ n: txns.length }));
  const placedAlerts = calls.filter((c: Any) => c.fn === "placed" && c.botId === bot.botId).length;
  ok(`${K} · …and exactly ONE placed alert went through the real notification chain for this account`,
    fired?.status === "PLACED" && placedAlerts === 1, j({ placedAlerts }));

  // ── one OPENER per market, ever — the whole lane's count, after the fire ────────────────────────────
  const openedSince = since().reduce((s: number, p: Any) => s + (p?.counts?.opened ?? 0), 0);
  const rowsEnd = await openerRowsOn(market.id);
  ok(`${K} · over the whole lane the planner counted EXACTLY ONE opener and the market holds EXACTLY ONE OPENER row — one non-cancelled OPENER per market, ever`,
    fired?.status === "PLACED" && openedSince === 1 && rowsEnd.length === 1,
    j({ openedSince, rows: rowsEnd.length, passes: since().length }));

  // ── the CONTROL · the same duty ignored the sibling that was not empty ──────────────────────────────
  const controlRows = await openerRowsOn(control.id);
  const controlPositions = await w.positionsOf(control.id);
  const seedRow = controlPositions.find((p: Any) => p.id === seed.positionId);
  const stray = controlRows[0];
  ok(`${K} · CONTROL · the sibling poll that already held a player's ${exp.controlSeed} got NO OPENER from the same duty that planned the empty one — the empty-pool gate is measured beside a positive, not assumed`,
    !!planning && !!decided && controlRows.length === 0 && controlPositions.length === 1 && controlPositions[0]?.houseBotId == null,
    j({ rows: controlRows.length, positions: controlPositions.length, seedAt: seedRow?.placedAt ?? null,
        ...(stray ? { strayRowAt: stray.createdAt, note: "a row written BEFORE the seed landed is a fixture race (a pass between the poll and its seed), not a product defect" } : {}) }));

  // ── nothing tripped — asserted WITH the placement, so a dead engine cannot supply the zeros ─────────
  const ctl = await S.houseBotControlStore.get();
  const deskRow = await S.houseBotStore.get(bot.botId);
  ok(`${K} · …and nothing in the lane tripped a security alert or the master switch — the switch is still ON and the account still ACTIVE (asserted WITH the placement)`,
    fired?.status === "PLACED" && seen("security") === 0 && seen("switchedOff") === 0 && ctl?.enabled === true && deskRow?.status === "ACTIVE",
    j({ security: seen("security"), switchedOff: seen("switchedOff"), enabled: ctl?.enabled ?? null, status: deskRow?.status ?? null }));

  return {
    lane: "E", measured: true,
    placed: fired?.status === "PLACED" && house[0] ? [{ key: K, stake: staked, side: house[0].side, market: market.id, botId: bot.botId, holder: bot.userId }] : [],
  };
}
