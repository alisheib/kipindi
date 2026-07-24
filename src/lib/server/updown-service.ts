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
import { getUpDownConfig, rateProfileFor, stakeBoundsFor, boundaryAfter } from "./updown-config";
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

  const reading = await observePrice(asset, boundaryAtIso);
  if (!reading.ok) {
    const detail = describeRefusal(reading.reason, reading.detail);
    await observationStore.recordAttempt(obs.id, detail);
    // A missing API key or a paused AI is an OPERATOR state, not a source failure —
    // burning the attempt budget on it would void rounds for an ops reason and refund
    // players who were happily betting. Leave it pending; the next fire retries.
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
    resolutionCriterion:
      `${asset.nameEn} (${asset.symbol}) price at ${closeIso}, read from ${asset.sourceDomain}, ` +
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
  voidReasonIfNoPrice: VoidReason = "source-failed",
): Promise<LifecycleResult<{ outcome: RoundOutcome; settled: boolean }>> {
  const round = await roundStore.get(roundId);
  if (!round) return { ok: false, error: "Round not found." };
  if (round.resolvedAt) return { ok: true, data: { outcome: round.outcome ?? "VOID", settled: !!round.settledAt } };

  const chain = await chainStore.get(round.chainId);
  const asset = chain ? await assetStore.get(chain.assetId) : null;
  if (!chain || !asset) return { ok: false, error: "Round's chain or asset no longer exists." };

  const { outcome, voidReason } = decideOutcome(round.openPrice, closePrice, minMoveFor(asset));
  const finalVoidReason = outcome === "VOID" ? (voidReason ?? voidReasonIfNoPrice) : null;
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
          ? `Round voided (${finalVoidReason}). Every stake is refunded in full.`
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
    // pending → leave it; the next fire (or the reconciler) retries. The round shows
    // "Confirming price" and the chain still advances below.
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
