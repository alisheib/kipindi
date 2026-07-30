/**
 * Up & Down round lifecycle — open, close, resolve, settle, void.
 *
 * ⛔ THIS IS THE ONLY PLACE UP/DOWN ↔ YES/NO IS MAPPED. Everywhere else in the system,
 * an Up & Down round is simply a `PredictionMarket` row with `productLine: "UPDOWN"`,
 * so betting, pools, payouts, refunds, the ledger and the audit chain are the code that
 * already works. If a second translation appears anywhere, delete it — two mappings is
 * how UP starts paying out as NO.
 *
 *   UP   = YES
 *   DOWN = NO
 *
 * MONEY: this module never moves money itself. It stamps a verdict and then calls
 * `settleMarket()` — the same function, the same winner floor, the same one-sided
 * refund, the same ledger dual-write, the same resume-safety. Deliberately NOT with
 * `force`, so the standing-objection freeze still applies (settlement is immediate for
 * Up & Down, but an objection filed against a round still stops its money).
 */
import { randomId } from "./crypto";
import { audit } from "./audit";
import { withLock } from "./locks";
import { marketStore } from "./market-dal";
import { createMarket, settleMarket } from "./market-service";
import { getUpDownConfig, rateProfileFor, stakeBoundsFor, boundaryAfter, marginBpsForChain, computeTargets } from "./updown-config";
import {
  assetStore, chainStore, roundStore, observationStore,
  type StoredAsset, type StoredChain, type StoredRound, type RoundOutcome, type VoidReason,
} from "./updown-dal";
import { observePrice, describeRefusal } from "./updown-oracle";

export type LifecycleResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Player-facing round title, in all THREE platform languages. Kept in one place so the
 * board, the detail page, the audit trail and the reports name a round identically.
 *
 * The platform ships EN + SW + ZH and enforces parity (`npm run test:trilingual`) — a
 * round with no Chinese title would fall back to English for those players, which is
 * exactly the untranslated-surface defect that check exists to prevent.
 */
export function roundTitle(asset: StoredAsset, durationMinutes: number, lang: "en" | "sw" | "zh" = "en"): string {
  if (lang === "sw") return `${asset.nameSw} Juu au Chini · dakika ${durationMinutes}`;
  if (lang === "zh") return `${asset.nameZh || asset.nameEn}涨跌 · ${durationMinutes}分钟`;
  return `${asset.nameEn} Up or Down · ${durationMinutes} min`;
}

/** The smallest move that counts as a direction, in price units. Below it the round
 *  VOIDs — a real-money bet must never be decided by noise under the source's own
 *  quoting precision. */
export function minMoveFor(asset: StoredAsset): number {
  return asset.minMoveTicks * Math.pow(10, -asset.decimals);
}

/**
 * THE OUTCOME RULE. Pure, so it is exhaustively testable without a database, a clock
 * or a network call — and so the one line of arithmetic that decides real money can be
 * read on its own.
 */
export function decideOutcome(
  openPrice: number | null,
  closePrice: number | null,
  minMove: number,
): { outcome: RoundOutcome; voidReason: VoidReason | null } {
  if (openPrice == null || closePrice == null || !Number.isFinite(openPrice) || !Number.isFinite(closePrice)) {
    return { outcome: "VOID", voidReason: "source-failed" };
  }
  const delta = closePrice - openPrice;
  if (Math.abs(delta) < minMove) return { outcome: "VOID", voidReason: "no-move" };
  return { outcome: delta > 0 ? "UP" : "DOWN", voidReason: null };
}

/**
 * THE OUTCOME RULE (margin model). Uses the round's FROZEN winning boundaries: the close
 * price at or above the up-target ⇒ UP, at or below the down-target ⇒ DOWN, strictly
 * between ⇒ VOID+refund (the price moved less than the margin), any missing price/target
 * ⇒ VOID("source-failed"). Pure, so the one comparison that decides real money reads on
 * its own. (Equivalent to `|close − open| ≥ margin`, but read off the stored targets so a
 * later config edit can never move a live round's boundaries.)
 */
export function decideOutcomeByTargets(
  closePrice: number | null,
  upTarget: number | null,
  downTarget: number | null,
): { outcome: RoundOutcome; voidReason: VoidReason | null } {
  if (
    closePrice == null || upTarget == null || downTarget == null ||
    !Number.isFinite(closePrice) || !Number.isFinite(upTarget) || !Number.isFinite(downTarget)
  ) {
    return { outcome: "VOID", voidReason: "source-failed" };
  }
  if (closePrice >= upTarget) return { outcome: "UP", voidReason: null };
  if (closePrice <= downTarget) return { outcome: "DOWN", voidReason: null };
  return { outcome: "VOID", voidReason: "no-move" };
}

/** UP→YES, DOWN→NO, VOID→VOID. The single mapping. */
export function outcomeToSide(o: RoundOutcome): "YES" | "NO" | "VOID" {
  return o === "UP" ? "YES" : o === "DOWN" ? "NO" : "VOID";
}

// ---------------------------------------------------------------------------
// Observation acquisition
// ---------------------------------------------------------------------------

/**
 * Get the CONFIRMED observation for (asset, boundary), running the oracle if needed.
 *
 * Idempotent and shared: the row is unique per boundary, so the 5-, 15- and 30-minute
 * chains meeting at 14:30 all land on the SAME row — one AI call serves them all, and
 * round N's close is byte-identical to round N+1's open.
 *
 * Returns null when the boundary is not (yet) confirmed. The caller decides whether to
 * wait or to void; this function never invents a price.
 */
export async function acquireObservation(
  asset: StoredAsset,
  boundaryAtIso: string,
): Promise<{ state: "confirmed"; price: number; id: string } | { state: "pending" | "failed"; id: string; detail: string }> {
  const cfg = await getUpDownConfig();
  const obs = await observationStore.ensure(asset.id, boundaryAtIso);

  if (obs.state === "CONFIRMED" && obs.price != null) {
    return { state: "confirmed", price: obs.price, id: obs.id };
  }
  if (obs.state === "FAILED") {
    return { state: "failed", id: obs.id, detail: obs.failReason ?? "boundary failed" };
  }

  // Budget exhausted → terminal. Every round bounded by this boundary now VOIDs and
  // refunds in full, which is the safe direction: refusing costs a round, guessing
  // costs a player their money.
  if (obs.attempts >= cfg.maxObservationAttempts) {
    await observationStore.fail(obs.id, `no confirmed reading after ${obs.attempts} attempts`);
    return { state: "failed", id: obs.id, detail: `no confirmed reading after ${obs.attempts} attempts` };
  }

  // ── THE BACKOFF, index-matched to the attempt just made ─────────────────────
  // `retryBackoffSeconds` was declared, defaulted and read by NOTHING — the ladder was
  // designed and never wired. Without it the heal sweep would re-call the model on every
  // tick, which is both a cost leak and a good way to be rate-limited into voiding
  // rounds that a slightly later read would have settled correctly.
  if (obs.attempts > 0 && obs.lastAttemptAt) {
    const ladder = cfg.retryBackoffSeconds;
    const waitS = ladder[Math.min(obs.attempts - 1, ladder.length - 1)] ?? 0;
    const readyAt = Date.parse(obs.lastAttemptAt) + waitS * 1000;
    if (Number.isFinite(readyAt) && Date.now() < readyAt) {
      return {
        state: "pending",
        id: obs.id,
        detail: `waiting ${Math.ceil((readyAt - Date.now()) / 1000)}s before attempt ${obs.attempts + 1}`,
      };
    }
  }

  const reading = await observePrice(asset, boundaryAtIso);
  if (!reading.ok) {
    const detail = describeRefusal(reading.reason, reading.detail);
    // A missing API key or a paused AI is an OPERATOR state, not a source failure —
    // burning the attempt budget on it would void rounds for an ops reason and refund
    // players who were happily betting. Leave it pending; the next sweep retries.
    //
    // ⛔ This used to `recordAttempt` UNCONDITIONALLY, directly against the comment
    // above it: pausing the AI for four fires walked the budget to zero and VOIDed live
    // rounds for an operator action. The condition is the fix.
    const operatorState = reading.reason === "ai-paused" || reading.reason === "no-api-key";
    if (!operatorState) await observationStore.recordAttempt(obs.id, detail);
    return { state: "pending", id: obs.id, detail };
  }

  // Claim-the-row: only the first confirmation sticks. A loser here is not an error —
  // it means another fire confirmed the same boundary first, and BOTH must then use
  // that one price.
  const won = await observationStore.confirm(obs.id, {
    price: reading.price,
    sourceUrl: reading.sourceUrl,
    sourceQuotedAt: reading.sourceQuotedAt,
    evidence: reading.evidence,
    confidence: reading.confidence,
    model: reading.model,
    rawHash: reading.rawHash,
  });
  const fresh = await observationStore.get(obs.id);
  if (!fresh || fresh.state !== "CONFIRMED" || fresh.price == null) {
    return { state: "pending", id: obs.id, detail: "confirmation did not stick" };
  }
  audit({
    category: "SYSTEM",
    action: "updown.observation.confirmed",
    actorId: "system_updown_oracle",
    targetType: "UpDownObservation",
    targetId: obs.id,
    payload: {
      assetKey: asset.key, boundaryAt: boundaryAtIso,
      price: fresh.price, sourceUrl: fresh.sourceUrl, sourceQuotedAt: fresh.sourceQuotedAt,
      skewSeconds: reading.skewSeconds, confidence: fresh.confidence, model: fresh.model,
      rawHash: fresh.rawHash, wonRace: won,
    },
  });
  return { state: "confirmed", price: fresh.price, id: obs.id };
}

// ---------------------------------------------------------------------------
// Opening a round
// ---------------------------------------------------------------------------

/**
 * Open the round that RUNS FROM `openBoundaryIso` to `openBoundary + duration`.
 *
 * Creates the PredictionMarket (the money side) first, then the UpDownRound (the price
 * side) — in that order so a crash between the two leaves an orphan MARKET with no
 * bets rather than a round pointing at nothing. Idempotent per (chain, roundNumber)
 * via the DAL's unique constraint.
 */
export async function openRound(
  chain: StoredChain,
  openBoundaryIso: string,
  openObservationId: string | null,
  openPrice: number | null,
): Promise<LifecycleResult<StoredRound>> {
  const asset = await assetStore.get(chain.assetId);
  if (!asset) return { ok: false, error: "Chain's asset no longer exists." };

  const openMs = Date.parse(openBoundaryIso);
  const closeMs = openMs + chain.durationMinutes * 60_000;
  const closeIso = new Date(closeMs).toISOString();

  const last = await roundStore.latestForChain(chain.id);
  const roundNumber = (last?.roundNumber ?? 0) + 1;
  if (last && last.boundaryAt === closeIso) {
    return { ok: false, error: `Round ${roundNumber - 1} already covers ${closeIso}.` };
  }

  const [profile, bounds] = await Promise.all([rateProfileFor(chain), stakeBoundsFor(chain)]);

  // The frozen winning boundaries: base ± (base × marginBps/10000). Null if the boundary
  // wasn't confirmed at open (no openPrice) — such a round falls back at close and voids.
  const cfg = await getUpDownConfig();
  const marginBps = marginBpsForChain(chain, cfg);
  const targets = openPrice != null ? computeTargets(openPrice, marginBps, asset) : null;

  // The money row. `rateOverrides` is how the chain's frozen fee profile
  // (capped-commission @ 13%) reaches the poll snapshot through the SAME
  // snapshotFromConfig path every long-form poll uses — one freezing mechanism.
  const market = await createMarket({
    titleEn: roundTitle(asset, chain.durationMinutes, "en"),
    titleSw: roundTitle(asset, chain.durationMinutes, "sw"),
    titleZh: roundTitle(asset, chain.durationMinutes, "zh"),
    category: (asset.category as never) ?? "macro",
    sourceUrl: asset.priceSourceUrl,
    // Stated in the players' terms, and it is literally what settlement compares.
    resolutionCriterion: targets
      ? `${asset.nameEn} (${asset.symbol}) price at ${closeIso}, read from ${asset.sourceDomain}. ` +
        `Opening price ${openPrice}. UP if the price reaches ${targets.upTarget} (+${(marginBps / 100).toFixed(2)}%), ` +
        `DOWN if it reaches ${targets.downTarget} (−${(marginBps / 100).toFixed(2)}%), otherwise VOID and every stake is refunded.`
      : `${asset.nameEn} (${asset.symbol}) price at ${closeIso}, read from ${asset.sourceDomain}, ` +
        `compared with the price at ${openBoundaryIso}. UP if higher by more than ` +
        `${minMoveFor(asset).toFixed(asset.decimals)}, DOWN if lower by more than that, otherwise VOID and every stake is refunded.`,
    resolutionAt: closeIso,
    // Selections close AT the boundary: the bet is on the price at that instant, so a
    // later entry would be betting on a move that has already happened.
    selectionClosedAt: null,
    proposedBy: "system_updown",
    productLine: "UPDOWN",
    rateOverrides: profile,
  });

  const now = new Date().toISOString();
  const round: StoredRound = {
    id: `udr_${randomId(10)}`,
    chainId: chain.id,
    marketId: market.id,
    roundNumber,
    opensAt: openBoundaryIso,
    closesAt: closeIso,
    boundaryAt: closeIso,
    openObservationId,
    closeObservationId: null,
    openPrice,
    closePrice: null,
    marginBps,
    upTarget: targets?.upTarget ?? null,
    downTarget: targets?.downTarget ?? null,
    outcome: null,
    voidReason: null,
    resolvedAt: null,
    settledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await roundStore.create(round);
  await chainStore.patch(chain.id, {
    currentRoundId: round.id,
    nextBoundaryAt: closeIso,
  });

  audit({
    category: "SYSTEM",
    action: "updown.round.opened",
    actorId: "system_updown",
    targetType: "UpDownRound",
    targetId: round.id,
    payload: {
      chainId: chain.id, assetKey: asset.key, durationMinutes: chain.durationMinutes,
      roundNumber, marketId: market.id,
      opensAt: openBoundaryIso, boundaryAt: closeIso,
      openPrice, openObservationId,
      marginBps, upTarget: targets?.upTarget ?? null, downTarget: targets?.downTarget ?? null,
      rateProfile: profile, stakeBounds: bounds,
    },
  });
  return { ok: true, data: round };
}

// ---------------------------------------------------------------------------
// Closing a round
// ---------------------------------------------------------------------------

/**
 * Resolve and settle a round against its two observations.
 *
 * Under the market lock, and idempotent: a round already resolved is a no-op, so two
 * fires (or two instances) produce exactly one settlement.
 *
 * Settlement runs through `settleMarket()` WITHOUT `force`, so the standing-objection
 * freeze still gates the money — `objectionsClosedAt` is stamped to *now* because
 * Up & Down settles immediately (Ali, 2026-07-24), not because the gate is skipped.
 */
export async function closeRound(
  roundId: string,
  closeObservationId: string | null,
  closePrice: number | null,
  /**
   * Why this round voided, when the CALLER knows better than the arithmetic does.
   *
   * ⚠️ This used to be `voidReasonIfNoPrice = "source-failed"` and was consulted only
   * when the outcome rule returned no reason of its own — which it always does for a
   * missing price. So `voidRoundByOperator` passing "operator" had NO effect: an
   * officer's deliberate void was recorded as a SOURCE failure, misattributing a human
   * decision to the price feed in the audit trail and in the per-chain void-rate metric.
   * An explicit reason now wins; absent one, the arithmetic's reason stands ("no-move"
   * for an in-band close), falling back to "source-failed".
   */
  voidReasonOverride?: VoidReason,
): Promise<LifecycleResult<{ outcome: RoundOutcome; settled: boolean }>> {
  const round = await roundStore.get(roundId);
  if (!round) return { ok: false, error: "Round not found." };
  if (round.resolvedAt) return { ok: true, data: { outcome: round.outcome ?? "VOID", settled: !!round.settledAt } };

  const chain = await chainStore.get(round.chainId);
  const asset = chain ? await assetStore.get(chain.assetId) : null;
  if (!chain || !asset) return { ok: false, error: "Round's chain or asset no longer exists." };

  // Use the round's FROZEN targets (the margin model). Legacy rounds opened before the
  // margin model have null targets and fall back to the openPrice ± minMove rule.
  const useTargets = round.upTarget != null && round.downTarget != null;
  const { outcome, voidReason } = useTargets
    ? decideOutcomeByTargets(closePrice, round.upTarget, round.downTarget)
    : decideOutcome(round.openPrice, closePrice, minMoveFor(asset));
  const finalVoidReason = outcome === "VOID" ? (voidReasonOverride ?? voidReason ?? "source-failed") : null;
  const side = outcomeToSide(outcome);
  const nowIso = new Date().toISOString();

  const applied = await withLock(`market:${round.marketId}`, async () => {
    const m = await marketStore.get(round.marketId);
    if (!m) return { done: false as const, reason: "market gone" };
    // Re-check under the lock — another fire may already have resolved this round.
    if (m.status === "RESOLVED" || m.status === "VOIDED") return { done: false as const, reason: "already resolved" };
    await marketStore.stamp(round.marketId, {
      status: side === "VOID" ? "VOIDED" : "RESOLVED",
      resolvedOutcome: side,
      resolutionStage1By: "system_updown", resolutionStage1At: nowIso,
      resolutionStage2By: "system_updown", resolutionStage2At: nowIso,
      resolutionEvidence:
        side === "VOID"
          ? useTargets
            ? `Round voided (${finalVoidReason}): close ${closePrice} stayed inside the band [${round.downTarget}, ${round.upTarget}] (open ${round.openPrice} ± ${((round.marginBps ?? 0) / 100).toFixed(2)}%). Every stake is refunded in full.`
            : `Round voided (${finalVoidReason}). Every stake is refunded in full.`
          : useTargets
            ? `Close ${closePrice} ${outcome === "UP" ? `≥ up target ${round.upTarget}` : `≤ down target ${round.downTarget}`} (open ${round.openPrice} ± ${((round.marginBps ?? 0) / 100).toFixed(2)}%, ${asset.symbol}, ${asset.sourceDomain}).`
            : `Open ${round.openPrice} → close ${closePrice} (${asset.symbol}, ${asset.sourceDomain}). Moved ${((closePrice ?? 0) - (round.openPrice ?? 0)).toFixed(asset.decimals)}.`,
      // Settlement is immediate for Up & Down — the window is zero-length, NOT skipped.
      // settleMarket still runs its standing-objection check below.
      objectionsClosedAt: nowIso,
      resolutionNotifiedAt: nowIso,
      settledAt: null,
      updatedAt: nowIso,
    });
    return { done: true as const, yesPool: m.yesPool, noPool: m.noPool, predictorCount: m.predictorCount };
  });

  if (!applied.done) {
    return { ok: false, error: `Round not resolved: ${applied.reason}` };
  }

  await roundStore.patch(roundId, {
    closeObservationId,
    closePrice,
    outcome,
    voidReason: finalVoidReason,
    resolvedAt: nowIso,
  });

  audit({
    category: "COMPLIANCE",
    action: outcome === "VOID" ? "updown.round.voided" : "updown.round.resolved",
    actorId: "system_updown",
    targetType: "UpDownRound",
    targetId: roundId,
    payload: {
      assetKey: asset.key, durationMinutes: chain.durationMinutes, roundNumber: round.roundNumber,
      marketId: round.marketId,
      openPrice: round.openPrice, closePrice,
      openObservationId: round.openObservationId, closeObservationId,
      outcome, side, voidReason: finalVoidReason,
      yesPool: applied.yesPool, noPool: applied.noPool, players: applied.predictorCount,
      note:
        "Resolved against two immutable price observations bounded to the same grid instants the round " +
        "was opened and closed on. Settlement is immediate (owner decision 2026-07-24); the standing-objection " +
        "freeze, the winner floor and exact conservation are unchanged.",
    },
  });

  // Money moves here, through the untouched settlement path.
  const s = await settleMarket(round.marketId, { actorId: "system_updown" });
  if (s.ok) {
    await roundStore.patch(roundId, { settledAt: new Date().toISOString() });
  } else {
    // OBJECTION_OPEN is the freeze doing its job — leave the money where it is; the
    // scheduler retries and an officer clears the objection.
    console.warn(`[updown] round ${roundId} resolved but not settled: ${s.code} ${s.error}`);
  }
  return { ok: true, data: { outcome, settled: s.ok } };
}

/**
 * Operator void — the recovery path for a bad or stuck round. Refunds every stake in
 * full through the same settlement code as an automatic void.
 */
export async function voidRoundByOperator(roundId: string, officerId: string, reason: string): Promise<LifecycleResult<{ settled: boolean }>> {
  const round = await roundStore.get(roundId);
  if (!round) return { ok: false, error: "Round not found." };
  if (round.settledAt) return { ok: false, error: "Round is already settled — its money has moved." };
  const r = await closeRound(roundId, round.closeObservationId, null, "operator");
  if (!r.ok) return r;
  audit({
    category: "ADMIN", action: "updown.round.void_operator", actorId: officerId,
    targetType: "UpDownRound", targetId: roundId,
    payload: { reason, marketId: round.marketId },
  });
  return { ok: true, data: { settled: r.data.settled } };
}

// ---------------------------------------------------------------------------
// The boundary transition — what the scheduler calls
// ---------------------------------------------------------------------------

/**
 * Advance a chain across ONE grid boundary.
 *
 * Order matters, and steps 2 and 3 are INDEPENDENT on purpose: a round that cannot
 * resolve yet must never stop the next one opening, or a slow source would freeze the
 * whole product. That is what makes "don't rush the AI" compatible with a continuous
 * game.
 */
export async function advanceChain(chainId: string): Promise<{
  observation: "confirmed" | "pending" | "failed" | "skipped";
  closed: RoundOutcome | null;
  opened: boolean;
  detail?: string;
}> {
  const chain = await chainStore.get(chainId);
  if (!chain || chain.state !== "RUNNING") return { observation: "skipped", closed: null, opened: false, detail: "chain not running" };
  const asset = await assetStore.get(chain.assetId);
  if (!asset || !asset.enabled) return { observation: "skipped", closed: null, opened: false, detail: "asset missing or disabled" };

  const anchorMs = Date.parse(chain.gridAnchorAt);
  const boundaryIso = chain.nextBoundaryAt ?? new Date(boundaryAfter(anchorMs, chain.durationMinutes, Date.now())).toISOString();

  // 1 · The shared reading for this instant.
  const obs = await acquireObservation(asset, boundaryIso);

  // 2 · Close the round that ENDS here (if any).
  let closed: RoundOutcome | null = null;
  const current = chain.currentRoundId ? await roundStore.get(chain.currentRoundId) : null;
  if (current && !current.resolvedAt && current.boundaryAt === boundaryIso) {
    if (obs.state === "confirmed") {
      const r = await closeRound(current.id, obs.id, obs.price);
      if (r.ok) closed = r.data.outcome;
    } else if (obs.state === "failed") {
      const r = await closeRound(current.id, obs.id, null, "source-failed");
      if (r.ok) closed = r.data.outcome;
    }
    // pending → leave it; `resolveOverdueRounds` on the lifecycle ticker retries this
    // boundary and, once the attempt budget is spent, VOIDs the round with a full refund.
    // The round shows "Confirming price" and the chain still advances below.
    //
    // ⚠️ This comment used to say "the next fire (or the reconciler) retries" — and
    // NEITHER did. Step 4 below moves `nextBoundaryAt` on, so the next fire observes a
    // DIFFERENT instant, and the reconciler only re-arms timers. That is how production
    // accumulated 1,398 rounds stuck at one attempt with player money inside them. The
    // retry now genuinely exists; do not remove it without removing this promise too.
  }

  // 3 · Open the round that STARTS here — independent of step 2.
  let opened = false;
  const latest = await roundStore.latestForChain(chain.id);
  const alreadyOpen = latest && latest.opensAt === boundaryIso;
  if (!alreadyOpen) {
    const openPrice = obs.state === "confirmed" ? obs.price : null;
    const openObsId = obs.state === "confirmed" ? obs.id : null;
    const o = await openRound(chain, boundaryIso, openObsId, openPrice);
    opened = o.ok;
  }

  // 4 · Re-arm: the next boundary is DERIVED, never accumulated.
  const nextIso = new Date(boundaryAfter(anchorMs, chain.durationMinutes, Date.parse(boundaryIso))).toISOString();
  await chainStore.patch(chain.id, { nextBoundaryAt: nextIso });

  return { observation: obs.state, closed, opened, detail: "detail" in obs ? obs.detail : undefined };
}

// ---------------------------------------------------------------------------
// Healing overdue rounds — the refund guarantee, finally implemented
// ---------------------------------------------------------------------------

/**
 * Drive every round whose boundary has PASSED but which never reached a verdict towards
 * a terminal state: resolved against a confirmed reading, or VOIDed with every stake
 * refunded in full once the attempt budget is spent.
 *
 * ⛔ THE GUARANTEE THIS IMPLEMENTS — it was documented everywhere and built nowhere.
 * `docs/UPDOWN-ARCHITECTURE.md` §3, the oracle's own header, and the admin help text all
 * promise: "a boundary that will not confirm VOIDS its rounds and refunds every stake in
 * full." That never happened. `advanceChain` observes ONLY `chain.nextBoundaryAt` and
 * then moves the pointer on (step 4 above), so a boundary refused once was never
 * revisited — the comment there claiming "the next fire (or the reconciler) retries" was
 * false, and the reconciler only re-arms timers. Every observation stayed PENDING at one
 * attempt, `maxObservationAttempts` was unreachable, FAILED never occurred, and the
 * rounds could neither resolve nor refund. Production reached 1,398 such rounds holding
 * TZS 96,250 of real player money with no code path able to return it.
 *
 * DELIBERATELY INDEPENDENT OF CHAIN STATE. Money already staked must reach a terminal
 * state even when the chain is PAUSED or STOPPED — which is exactly what an operator does
 * the moment resolution starts misbehaving, i.e. precisely when this must still run.
 *
 * ONE READING PER BOUNDARY, still. Rounds are grouped by (asset, boundary) before any
 * observation is acquired, so the 5/15/30-minute rounds meeting at 14:30 share one call
 * exactly as they do on the live path. Healing must not multiply the spend it heals.
 *
 * Bounded per tick on BOTH axes — rounds touched and, separately, distinct boundaries
 * observed — because the expensive axis is AI calls, not rows.
 */
export async function resolveOverdueRounds(opts?: {
  maxRounds?: number;
  maxObservations?: number;
}): Promise<{ scanned: number; resolved: number; voided: number; pending: number; skipped: number }> {
  const maxRounds = opts?.maxRounds ?? 200;
  const maxObservations = opts?.maxObservations ?? 8;

  const overdue = await roundStore.overdueUnresolved({ beforeIso: new Date().toISOString(), limit: maxRounds });
  const out = { scanned: overdue.length, resolved: 0, voided: 0, pending: 0, skipped: 0 };
  if (overdue.length === 0) return out;

  // Resolve each round's asset once, via its chain.
  const chainIds = [...new Set(overdue.map((r) => r.chainId))];
  const chains = new Map<string, StoredChain>();
  for (const id of chainIds) {
    const c = await chainStore.get(id);
    if (c) chains.set(id, c);
  }
  const assets = new Map<string, StoredAsset>();
  for (const c of chains.values()) {
    if (assets.has(c.assetId)) continue;
    const a = await assetStore.get(c.assetId);
    if (a) assets.set(c.assetId, a);
  }

  /** `assetId|boundaryAt` → the shared reading, acquired at most once per tick. */
  type Acquired = Awaited<ReturnType<typeof acquireObservation>>;
  const readings = new Map<string, Acquired>();
  let observed = 0;

  for (const round of overdue) {
    const chain = chains.get(round.chainId);
    const asset = chain ? assets.get(chain.assetId) : undefined;
    if (!chain || !asset) { out.skipped++; continue; }

    const key = `${asset.id}|${round.boundaryAt}`;
    let obs = readings.get(key);
    if (!obs) {
      // Budget the AI axis, not the row axis: a tick that has already observed its quota
      // leaves the rest for the next tick rather than half-healing under a cost spike.
      if (observed >= maxObservations) { out.pending++; continue; }
      observed++;
      obs = await acquireObservation(asset, round.boundaryAt);
      readings.set(key, obs);
    }

    if (obs.state === "confirmed") {
      const r = await closeRound(round.id, obs.id, obs.price);
      if (r.ok) { if (r.data.outcome === "VOID") out.voided++; else out.resolved++; }
      else out.skipped++;
    } else if (obs.state === "failed") {
      // Terminal: no reading will ever exist for this boundary. VOID + full refund,
      // through the same untouched settlement path every other outcome uses.
      const r = await closeRound(round.id, obs.id, null, "source-failed");
      if (r.ok) out.voided++; else out.skipped++;
    } else {
      out.pending++;
    }
  }

  return out;
}
