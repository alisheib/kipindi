/**
 * THE HOUSE GATES OF THE MONEY SEAM — H0 to H4 (PLAN §3, 04 A7/A9/A12/A15, N1 §3, N2 §3).
 *
 * A house stake is placed by `placeHouseBet`, which runs the SAME `buyPositionInner` a player's bet
 * runs. That function calls into this module at five anchored sites, and only when `ctx.kind` is
 * "house". Everything here can ONLY ADD a refusal (PLAN I1): no gate a player meets is skipped, and a
 * player's bet never reaches this file.
 *
 *   H0  first, before any other gate      the key, the replay, the intent row (no status filter)
 *   H1  pre-lock, fresh                    master switch and bot status
 *   H2  inside `wallet:<botUser>`          consent and RG, conflicts, money caps, staff caps, rate caps
 *   H3  inside `market:<id>`               product and round lock, blackout, other bot, mode condition
 *   H4  inside `house:control`             control re-read, global caps, counterparties, `staleAt`
 *
 * ⛔ PLAIN SELECTS ONLY (04 A9). No FOR UPDATE and no write before `markPlaced`, which the seam issues as
 * the first money statement. A source pin in `test:house-bot-seam` refuses FOR UPDATE here.
 *
 * ⛔ EVERY KIND-SPECIFIC INPUT COMES FROM THE CLAIMED INTENT ROW (N1 §3): kind, entry condition, target,
 * `decision.reactTo`, trigger. The caller passes only the bet's own figures, which H0 compares to the row.
 *
 * ⛔ NULL CAPS REFUSE. An unset cap reads "Not set — this bot cannot bet" on the console; here it is a
 * `house_cap_reached` with that cap's code, so a cleared cap stops the next bet inside the locks.
 */
import { houseIntentKey, HOUSE_PRODUCTS, COUNTERPARTY_ATTRIBUTION_MIN_PCT, type CapCode, type ConflictCode } from "@/lib/house-bot/constants";
import { eatDayKey } from "@/lib/house-bot/clock";
import { formatDateTime } from "@/lib/utils";
import type { FailureDetail, FailureReason } from "@/lib/failure-reasons";
import type { Side } from "@/lib/payout";
import { db } from "../store";
import { positionStore } from "../market-dal";
import { isLockedOut } from "../responsible-gambling";
import { passwordFingerprint } from "../password-reset";
import {
  houseBotControlStore, houseBotIntentStore, houseBotStore, houseSeamStore,
  type HouseTx, type LockedPool, type StoredHouseBotIntent,
} from "../house-bot-dal";
import { houseDayBook, houseOpenExposure } from "./book";
import { lockedForHouse, lockedPoolInputs } from "./pools";
import { infoBlackout } from "./blackout";
import type { StoredMarket, StoredPosition } from "../market-service";

export type HouseBetContext = { kind: "house"; botId: string; intentId: string };

/** The refusal shape `buyPositionInner` returns — `ServiceResult`'s failure arm. */
export type HouseRefusal = {
  ok: false;
  error: string;
  code: "INVALID" | "SUSPENDED" | "BUSY" | "NOT_FOUND";
  reason?: FailureReason;
  detail?: FailureDetail;
};

const opposite = (s: Side): Side => (s === "YES" ? "NO" : "YES");

function capReached(cap: CapCode, detail: FailureDetail = {}): HouseRefusal {
  return { ok: false, error: `House cap reached: ${cap}.`, code: "INVALID", reason: "house_cap_reached", detail: { ...detail, cap } };
}
function conflict(code: ConflictCode): HouseRefusal {
  return { ok: false, error: `House market conflict: ${code}.`, code: "INVALID", reason: "house_market_conflict", detail: { conflict: code } };
}
function conditionGone(condition: "OPENER" | "THIN" | "COUNTER" | "FILL"): HouseRefusal {
  return { ok: false, error: `House condition gone: ${condition}.`, code: "INVALID", reason: "house_condition_gone", detail: { condition } };
}
const KEY_MISMATCH: HouseRefusal = { ok: false, error: "House key mismatch.", code: "INVALID", reason: "house_key_mismatch" };

/** A cap that is NULL, or that this stake would pass. */
const over = (limit: number | null, value: number): boolean => limit == null || value > limit;

/* ═══ H0 ══════════════════════════════════════════════════════════════════════════════════════ */

export type H0Result =
  | { kind: "refuse"; refusal: HouseRefusal }
  /** The key already placed this bot's stake: the seam returns the original with `replayed: true`. */
  | { kind: "replay"; position: StoredPosition }
  | { kind: "continue"; intent: StoredHouseBotIntent };

/**
 * H0 — the ordered rule (N1 §3, MON-01). ⛔ STATUS IS NEVER PART OF IT: a CANCELLED or re-queued row goes
 * on to `markPlaced`, which returns 0 rows → `house_intent_superseded`. A status filter here would turn a
 * routine cancellation into `house_key_mismatch`, and that switches the master OFF.
 */
export async function houseH0(
  userId: string,
  opts: { marketId: string; side: Side; stake: number; idempotencyKey?: string; playStartedAt?: number },
  ctx: HouseBetContext,
): Promise<H0Result> {
  // 1. The key is the intent's own, and no player session clock rides along.
  if (opts.idempotencyKey !== houseIntentKey(ctx.intentId) || opts.playStartedAt !== undefined) {
    return { kind: "refuse", refusal: KEY_MISMATCH };
  }
  // 2. The pre-lookup: this key already placed a stake.
  const existing = await positionStore.findByIdempotencyKey(opts.idempotencyKey);
  if (existing) {
    if (existing.userId === userId && existing.houseBotId === ctx.botId) return { kind: "replay", position: existing };
    return { kind: "refuse", refusal: KEY_MISMATCH };
  }
  // 3. The intent, by id, with NO status filter; every figure must match the call.
  const intent = await houseBotIntentStore.get(ctx.intentId);
  if (!intent || intent.houseBotId !== ctx.botId || intent.botUserId !== userId || intent.marketId !== opts.marketId
    || intent.side !== opts.side || intent.stakeTzs !== opts.stake) {
    return { kind: "refuse", refusal: KEY_MISMATCH };
  }
  return { kind: "continue", intent };
}

/* ═══ H1 ══════════════════════════════════════════════════════════════════════════════════════ */

/** H1 — pre-lock, fresh: a failed read means no bet (PLAN I5). */
export async function houseH1(userId: string, ctx: HouseBetContext): Promise<HouseRefusal | null> {
  let enabled: boolean, bot: Awaited<ReturnType<typeof houseBotStore.get>>;
  try {
    [enabled, bot] = await Promise.all([houseBotControlStore.get().then((c) => c.enabled), houseBotStore.get(ctx.botId)]);
  } catch {
    return { ok: false, error: "House gate unreadable.", code: "BUSY", reason: "house_gate_unreadable" };
  }
  if (!enabled) return { ok: false, error: "House bots are off.", code: "SUSPENDED", reason: "house_disabled" };
  if (!bot || bot.status !== "ACTIVE" || bot.userId !== userId) {
    return { ok: false, error: "House bot is not active.", code: "SUSPENDED", reason: "house_bot_inactive" };
  }
  return null;
}

/* ═══ H2 ══════════════════════════════════════════════════════════════════════════════════════ */

/**
 * H2 — inside `wallet:<botUser>`, in the DECLARED ORDER pinned as `H2_ORDER` in
 * `scripts/anchors/house-bot-seam.anchors.mjs` (N1 §3, MON-09). The first failing check returns, except
 * that within the rate group a terminal PER_MARKET_COUNT wins over the deferrable caps before it.
 */
export async function houseH2(input: {
  tx: HouseTx;
  userId: string;
  ctx: HouseBetContext;
  intent: StoredHouseBotIntent;
  marketId: string;
  side: Side;
  stake: number;
  walletBalance: number;
  /** The holder's positions on this market, read in this lock by the bet path. */
  mine: readonly StoredPosition[];
}): Promise<HouseRefusal | null> {
  const { tx, userId, ctx, intent, stake } = input;

  // ── group 1 · consent and RG ─────────────────────────────────────────────────────────────
  // H2_ORDER:standing
  const lockout = await isLockedOut(userId);
  if (lockout.locked) {
    const until = formatDateTime(lockout.until!);
    if (lockout.reason === "cooling_off") return { ok: false, error: `Cooling-off until ${until}.`, code: "SUSPENDED", reason: "cooling_off", detail: { until } };
    return { ok: false, error: `Self-exclusion until ${until}.`, code: "SUSPENDED", reason: "self_excluded", detail: { until } };
  }
  const u = await db.user.findById(userId);
  if (!u) return { ok: false, error: "Account not found.", code: "NOT_FOUND" };
  const cooledOffBlocks = u.status === "COOLED_OFF" && (!lockout.coolingUntil || new Date(lockout.coolingUntil).getTime() > Date.now());
  if (u.status === "SUSPENDED" || u.status === "CLOSED" || u.status === "SELF_EXCLUDED" || cooledOffBlocks) {
    return { ok: false, error: "Account blocked.", code: "SUSPENDED", reason: "account_blocked" };
  }
  // H2_ORDER:role
  if (u.role !== "PLAYER") return { ok: false, error: "House account ineligible.", code: "INVALID", reason: "house_account_ineligible" };
  // H2_ORDER:consent — PLAN §18: fingerprint matches AND no void newer than the last verification.
  const bot = await houseBotStore.get(ctx.botId, tx);
  // Status and holder are re-read HERE, under the wallet lock every Pause, auto-pause and Remove writes
  // under, so a CLAIMED intent already past H1 is refused inside the lock (02 §3.4).
  if (!bot || bot.status !== "ACTIVE" || bot.userId !== userId) return { ok: false, error: "House bot is not active.", code: "SUSPENDED", reason: "house_bot_inactive" };
  const consentValid = passwordFingerprint(u.passwordHash) === bot.passwordFingerprint
    && (bot.consentVoidAt == null || Date.parse(bot.verifiedAt) > Date.parse(bot.consentVoidAt));
  if (!consentValid) return { ok: false, error: "House consent stale.", code: "INVALID", reason: "house_consent_stale" };
  // H2_ORDER:cash — cash only by construction (A7): the whole stake is real money.
  if (input.walletBalance < stake) {
    return { ok: false, error: "House stakes use cash only.", code: "INVALID", reason: "house_cash_only", detail: { balance: input.walletBalance, needed: stake } };
  }

  // ── group 2 · conflicts ──────────────────────────────────────────────────────────────────
  // H2_ORDER:conflicts
  const open = input.mine.filter((p) => p.status === "OPEN");
  if (open.some((p) => p.houseBotId == null)) return conflict("OWNER_POSITION");
  if (open.some((p) => p.houseBotId != null && p.side !== input.side)) return conflict("OPPOSITE_SIDE");

  // ── group 3 · money caps ─────────────────────────────────────────────────────────────────
  // H2_ORDER:money
  const usage = await houseSeamStore.botUsage({ houseBotId: ctx.botId, marketId: input.marketId }, tx);
  if (bot.stakeMinTzs == null || stake < bot.stakeMinTzs) return capReached("STAKE_MIN");
  if (over(bot.stakeMaxTzs, stake)) return capReached("STAKE_MAX");
  if (over(bot.capPerMarketTzs, usage.stakeOnMarket + stake)) return capReached("PER_MARKET");
  if (bot.balanceFloorTzs == null || input.walletBalance - stake < bot.balanceFloorTzs) return capReached("BALANCE_FLOOR");
  const today = await houseDayBook(eatDayKey(Date.now()), ctx.botId, tx);
  if (over(bot.capDailyStakeTzs, today.stakedTzs + stake)) return capReached("DAILY_STAKE");
  if (over(bot.capDailyLossTzs, today.projectedLossTzs + stake)) return capReached("DAILY_LOSS_PROJECTED");
  if (over(bot.capOpenExposureTzs, (await houseOpenExposure(ctx.botId, tx)) + stake)) return capReached("EXPOSURE");

  // ── group 4 · staff-chosen caps and TARGET_ONCE (MANUAL, or a targeted COUNTER) ───────────────
  // H2_ORDER:staff
  if (intent.kind === "MANUAL" || intent.targetId != null) {
    const staff = await houseBotIntentStore.staffChosenPlacedToday({ houseBotId: ctx.botId }, tx);
    if (bot.capStaffChosenPerDay == null || staff.count >= bot.capStaffChosenPerDay) return capReached("STAFF_CHOSEN_PER_DAY");
    if (over(bot.capStaffChosenDailyTzs, staff.stakeTzs + stake)) return capReached("STAFF_CHOSEN_DAILY_STAKE");
    // N2 §3: `decision.reactTo` from the claimed row, never the live target — an update never changes a
    // queued reaction. Exact under this lock: every reaction of a target belongs to its one bot.
    if (intent.targetId != null && intent.decision.reactTo === "FIRST"
      && (await houseBotIntentStore.countPlacedForTarget(intent.targetId, tx)) > 0) return capReached("TARGET_ONCE");
  }

  // ── group 5 · rate caps: MIN_GAP, PER_HOUR, PER_DAY deferrable; PER_MARKET_COUNT terminal ───────
  // H2_ORDER:rate
  if (bot.freqMaxPerMarket == null || usage.countOnMarket >= bot.freqMaxPerMarket) return capReached("PER_MARKET_COUNT");
  if (bot.freqMinGapSec == null || (usage.lastPlacedAt != null && Date.now() - Date.parse(usage.lastPlacedAt) < bot.freqMinGapSec * 1000)) {
    return capReached("MIN_GAP", usage.lastPlacedAt != null && bot.freqMinGapSec != null
      ? { until: new Date(Date.parse(usage.lastPlacedAt) + bot.freqMinGapSec * 1000).toISOString() } : {});
  }
  if (bot.freqMaxPerHour == null || usage.placedLastHour >= bot.freqMaxPerHour) return capReached("PER_HOUR");
  if (bot.freqMaxPerDay == null || usage.placedLastDay >= bot.freqMaxPerDay) return capReached("PER_DAY");
  return null;
}

/* ═══ H3 ══════════════════════════════════════════════════════════════════════════════════════ */

export type H3Result = { refusal: HouseRefusal } | { refusal: null; pool: LockedPool | null };

/**
 * H3 — inside `market:<id>`, after the bet path's closed re-check. `fresh` is the market as re-read in this
 * lock; the raw product line and the blackout columns are re-read here too (A12, N1 §3).
 */
export async function houseH3(input: {
  tx: HouseTx;
  ctx: HouseBetContext;
  intent: StoredHouseBotIntent;
  fresh: StoredMarket;
  side: Side;
  stake: number;
}): Promise<H3Result> {
  const { tx, ctx, intent, fresh, side, stake } = input;
  const refuse = (refusal: HouseRefusal): H3Result => ({ refusal });

  // A12 · the RAW product line (the DAL coerces anything unknown to MARKET) and an Up & Down round's lock.
  const raw = await houseSeamStore.rawProductLine(fresh.id, tx);
  if (raw == null || !(HOUSE_PRODUCTS as readonly string[]).includes(raw)) {
    return refuse({ ok: false, error: "Product not allowed for house stakes.", code: "INVALID", reason: "house_product_not_allowed" });
  }
  if (raw === "UPDOWN") {
    // The round and its chain are read on the lock transaction (one statement) — a pooled read here would
    // hold market:<id> while waiting for a second connection, unbounded by lock_timeout (04 A9).
    const round = await houseSeamStore.roundLock(fresh.id, tx);
    const closesAt = Date.parse(fresh.selectionClosedAt ?? fresh.resolutionAt);
    const lockAt = round ? Math.min(Date.parse(round.opensAt) + round.durationMinutes * 60_000, closesAt) : Number.NaN;
    if (!(lockAt > Date.now())) return refuse({ ok: false, error: "Round locked.", code: "INVALID", reason: "house_round_locked" });
  }

  const staffChosen = intent.kind === "MANUAL" || intent.targetId != null;
  // N1 §3 step 1 · the information blackout, for staff-chosen rows only.
  if (staffChosen && (await infoBlackout(fresh.id, { tx })).blocked) {
    return refuse({ ok: false, error: "Market is in an information blackout.", code: "INVALID", reason: "house_info_blackout" });
  }

  // Step 2 · one bot per market (I3), and every bot together under the global per-market cap.
  const market = await houseSeamStore.marketUsage({ houseBotId: ctx.botId, marketId: fresh.id }, tx);
  if (market.otherBotOpen) return refuse(conflict("OTHER_BOT"));
  const control = await houseBotControlStore.get(tx);
  if (over(control.gCapPerMarketTzs, market.houseOpenStakeTzs + stake)) return refuse(capReached("GLOBAL_PER_MARKET"));

  // Step 3 · the mode condition. ⛔ The side is never re-chosen: a lost condition refuses.
  const rawPool = (s: Side) => (s === "YES" ? fresh.yesPool : fresh.noPool);
  const needsPool = intent.kind === "FILL" || intent.kind === "COUNTER" || (intent.kind === "MANUAL" && intent.entryCondition === "THIN");
  const pool = needsPool ? await lockedForHouse(fresh.id, { tx, ...lockedPoolInputs(fresh) }) : null;

  if (intent.kind === "COUNTER") {
    // The trigger account's positions on this market, on the lock transaction; the trigger is found among
    // them, so a row naming a trigger on another market or of another account fails closed.
    const theirs = intent.triggerUserId ? await positionStore.listForUserAndMarket(intent.triggerUserId, fresh.id, tx) : [];
    const trigger = theirs.find((p) => p.id === intent.triggerPositionId);
    if (!trigger || trigger.status !== "OPEN") {
      return refuse({ ok: false, error: "Trigger no longer open.", code: "INVALID", reason: "house_trigger_gone" });
    }
    if (theirs.some((p) => p.status === "OPEN" && p.side === side)) return refuse(conflict("TRIGGER_BOTH_SIDES"));
    // A15 for the untargeted COUNTER (`lockedA15`); `lockedForHouse` for a targeted one (N2 §3).
    const against = intent.targetId != null ? pool![opposite(side)].locked : pool![opposite(side)].lockedA15;
    if (rawPool(side) + stake > against) return refuse(conditionGone("COUNTER"));
  } else if (intent.kind === "FILL") {
    if (rawPool(side) + stake > pool![opposite(side)].locked) return refuse(conditionGone("FILL"));
  } else if (intent.kind === "OPENER") {
    if (fresh.yesPool !== 0 || fresh.noPool !== 0) return refuse(conditionGone("OPENER"));
  } else if (intent.kind === "MANUAL") {
    // Step 4 · counterparty concentration (INT-02). ⛔ A NULL share limit turns Enter now OFF — both entry
    // conditions — which is the consequence the console states when the limit is cleared (MON-14).
    const concentration = (): H3Result => refuse({ ok: false, error: "Counterparty concentration.", code: "INVALID", reason: "house_counterparty_concentration" });
    if (intent.entryCondition === "OPENER") {
      if (fresh.yesPool !== 0 || fresh.noPool !== 0) return refuse(conditionGone("OPENER"));
      if (control.gStaffChosenMaxCounterpartyShare == null) return concentration();
    } else {
      const lockedOpp = pool![opposite(side)].locked;
      if (rawPool(side) + stake > lockedOpp) return refuse(conditionGone("THIN"));
      const share = control.gStaffChosenMaxCounterpartyShare;
      if (share == null) return concentration();
      const top = pool![opposite(side)].accounts[0];
      if (top != null && top.lockedTzs * 100 > share * lockedOpp) return concentration();
    }
  } else {
    const never: never = intent.kind;
    throw new Error(`house seam: unhandled intent kind ${String(never)}`);
  }
  return { refusal: null, pool };
}

/* ═══ H4 ══════════════════════════════════════════════════════════════════════════════════════ */

export type Counterparty = { userId: string; sharePct: number; attributedTzs: number };
export type H4Result = { refusal: HouseRefusal } | { refusal: null; counterparties: Counterparty[] | null };

/** Pure: pro-rata attribution to every opposite account holding ≥ 25% of the locked money (N1 §4.1). */
export function attributeStake(stakeTzs: number, accounts: ReadonlyArray<{ userId: string; lockedTzs: number }>, lockedOpp: number): Counterparty[] {
  if (lockedOpp <= 0) return [];
  return accounts
    .filter((a) => a.lockedTzs * 100 >= COUNTERPARTY_ATTRIBUTION_MIN_PCT * lockedOpp)
    .map((a) => ({ userId: a.userId, sharePct: Math.floor((a.lockedTzs * 100) / lockedOpp), attributedTzs: Math.floor((stakeTzs * a.lockedTzs) / lockedOpp) }));
}

/**
 * H4 — inside `house:control`, the innermost lock, immediately before the money writes. The control row
 * is re-read here, so an OFF written before this point binds (04 A9 step 1).
 */
export async function houseH4(input: {
  tx: HouseTx;
  ctx: HouseBetContext;
  intent: StoredHouseBotIntent;
  side: Side;
  stake: number;
  pool: LockedPool | null;
}): Promise<H4Result> {
  const { tx, intent, side, stake } = input;
  const refuse = (refusal: HouseRefusal): H4Result => ({ refusal });

  const control = await houseBotControlStore.get(tx);
  if (!control.enabled) return refuse({ ok: false, error: "House bots are off.", code: "SUSPENDED", reason: "house_disabled" });

  const all = await houseDayBook(eatDayKey(Date.now()), null, tx);
  if (over(control.gCapDailyStakeTzs, all.stakedTzs + stake)) return refuse(capReached("GLOBAL_DAILY_STAKE"));
  if (over(control.gCapDailyLossTzs, all.projectedLossTzs + stake)) return refuse(capReached("GLOBAL_LOSS_PROJECTED"));
  if (over(control.gCapOpenExposureTzs, (await houseOpenExposure(null, tx)) + stake)) return refuse(capReached("GLOBAL_EXPOSURE"));
  const global = await houseSeamStore.globalUsage(tx);
  if (control.gMaxBetsPerMinute == null || global.betsLastMinute >= control.gMaxBetsPerMinute) return refuse(capReached("GLOBAL_BETS_PER_MINUTE"));
  if (control.gMaxBetsPerDay == null || global.betsLastDay >= control.gMaxBetsPerDay) return refuse(capReached("GLOBAL_BETS_PER_DAY"));

  // Counterparties: a COUNTER is charged to its trigger account; a MANUAL THIN pro rata (INT-02).
  let counterparties: Counterparty[] | null = null;
  let charged: Array<{ userId: string; tzs: number }> = [];
  if (intent.kind === "COUNTER" && intent.triggerUserId != null) {
    charged = [{ userId: intent.triggerUserId, tzs: stake }];
  } else if (intent.kind === "MANUAL" && intent.entryCondition === "THIN" && input.pool) {
    const opp = input.pool[opposite(side)];
    counterparties = attributeStake(stake, opp.accounts, opp.locked);
    charged = counterparties.map((c) => ({ userId: c.userId, tzs: c.attributedTzs }));
  }
  if (charged.length > 0) {
    const today = await houseSeamStore.counterpartyToday(charged.map((c) => c.userId), tx);
    for (const c of charged) {
      const t = today.find((r) => r.userId === c.userId) ?? { count: 0, tzs: 0 };
      if (control.gCounterPerPlayerPerDay == null || t.count + 1 > control.gCounterPerPlayerPerDay) return refuse(capReached("COUNTERPARTY_COUNT"));
      if (over(control.gCounterPerPlayerTzsPerDay, t.tzs + c.tzs)) return refuse(capReached("COUNTERPARTY_TZS"));
    }
  }

  if (intent.kind === "MANUAL" || intent.targetId != null) {
    const staff = await houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null }, tx);
    if (control.gCapStaffChosenPerDay == null || staff.count >= control.gCapStaffChosenPerDay) return refuse(capReached("GLOBAL_STAFF_CHOSEN_PER_DAY"));
    if (over(control.gCapStaffChosenDailyTzs, staff.stakeTzs + stake)) return refuse(capReached("GLOBAL_STAFF_CHOSEN_DAILY_STAKE"));
  }

  // N1 §3 (MON-03) · `staleAt` on the DATABASE clock, immediately before `markPlaced`. Only a CLAIMED row
  // that is past its time refuses here; any other status goes on and `markPlaced` supersedes it.
  const freshness = await houseSeamStore.intentFreshness(intent.id, tx);
  if (freshness && freshness.status === "CLAIMED" && !freshness.fresh) {
    return refuse({ ok: false, error: "House intent stale.", code: "INVALID", reason: "house_intent_stale" });
  }
  return { refusal: null, counterparties };
}
