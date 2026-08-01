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
import {
  getUpDownConfig, rateProfileFor, stakeBoundsFor, boundaryAfter, marginBpsForChain, computeTargets,
  retryDelaySeconds, abandonAfterSeconds,
} from "./updown-config";
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

/** The inverse, used ONLY to copy a market's already-recorded verdict back onto a
 *  round row that never received it (see `healStuckRounds`). Not a second mapping —
 *  it is `outcomeToSide` read backwards, and it never decides anything. */
export function sideToOutcome(s: "YES" | "NO" | "VOID"): RoundOutcome {
  return s === "YES" ? "UP" : s === "NO" ? "DOWN" : "VOID";
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
  voidReasonIfNoPrice: VoidReason = "source-failed",
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
// THE SELF-HEALER — the guarantee that a stake always has a way out (E-24)
// ---------------------------------------------------------------------------
//
// 🔴 THE FINDING THIS EXISTS FOR. On production, 2026-08-01, a player's TZS 500
// entered round #155 and had **no path out at all**. Five independent mechanisms
// had to fail for that, and every one of them did:
//
//   ① `retryBackoffSeconds` was DEAD CONFIG — nothing in `src/` read it, so the
//      retry ladder the design rests on had never once run.
//   ② `advanceChain` closes a round only when `chain.currentRoundId` still points
//      at it — and `openRound` reassigns that pointer at the same boundary. A round
//      left pending is therefore ORPHANED one boundary later and never looked at.
//   ③ The market settle sweep cannot catch it: Up & Down is deliberately excluded
//      (`marketStore.pending()` defaults to `"MARKET"`). The second net is off.
//   ④ STOPPING the chain does not void its open rounds — driven live and confirmed.
//   ⑤ `voidRoundByOperator` had no UI, no action and no route (E-23).
//
// So the money simply stopped moving. E-16 (the oracle cannot read its sources) is
// a worse-looking bug but a SAFER one: it refuses and refunds. This one just stops.
//
// THE INVARIANT THIS RESTORES, stated so it can be tested rather than believed:
//
//   ⭐ Every Up & Down round reaches a terminal state — resolved or voided-and-
//      refunded — within `abandonAfterSeconds` of its own boundary, regardless of
//      the oracle, the AI budget, the chain's state, or whether any timer fired.
//
// Three deliberate design choices, each of which was a failure mode above:
//
//   • It runs INDEPENDENTLY OF CHAIN STATE (fixes ④). A STOPPED chain's orphans are
//     the likeliest kind — stopping the chain is exactly what an operator does when
//     the game misbehaves, i.e. precisely when rounds are stuck.
//   • Past the deadline it closes the round WITHOUT ASKING THE ORACLE. A reading for
//     a boundary that old could not satisfy `maxStalenessSeconds` even if it arrived,
//     so dialling a paid provider for it would burn real money to learn nothing. This
//     is also what makes a backlog cheap: 1,398 historical rounds cost $0 to sweep.
//   • It is NOT gated on `UPDOWN_SCHEDULER`. Switching the game off must not switch
//     off the thing that returns money already staked in it.
//
// It never invents a price and never decides a winner: an unconfirmed round VOIDs and
// every stake is refunded in full, through `closeRound` → `settleMarket`, the same
// money path as every other void. This module still moves no money itself.

/** Kill switch, separate from `UPDOWN_SCHEDULER` on purpose — see above. */
function healerEnabled(): boolean {
  return process.env.UPDOWN_HEALER !== "false";
}

/** Batch ceiling for one pass. Bounds both the DB read and, far more importantly,
 *  how many paid oracle calls a single tick can make. */
const HEAL_BATCH = 50;

export type HealReport = {
  scanned: number;
  /** Closed with a real verdict — a confirmed reading arrived late. */
  resolved: number;
  /** Closed VOID → every stake refunded in full. */
  voided: number;
  /** Was already resolved; its money finally moved. */
  settled: number;
  /** Inside the ladder and not yet due, or attempted and still pending. */
  waiting: number;
  /** Could not be acted on — recorded, never silently swallowed. */
  failed: number;
  /** True when the batch ceiling was hit, so the log never implies full coverage. */
  truncated: boolean;
};

/**
 * Sweep every round that has no path out, and give it one.
 *
 * Called from the lifecycle ticker (once a minute, leader-elected). Idempotent and
 * concurrency-safe by construction: every transition it performs goes through
 * `closeRound`/`settleMarket`, which take the market lock and re-check their own
 * stamps, so a healer racing a scheduler fire collapses to exactly one transition.
 */
export async function healStuckRounds(opts?: { now?: number; limit?: number }): Promise<HealReport> {
  const report: HealReport = { scanned: 0, resolved: 0, voided: 0, settled: 0, waiting: 0, failed: 0, truncated: false };
  if (!healerEnabled()) return report;

  const now = opts?.now ?? Date.now();
  const limit = opts?.limit ?? HEAL_BATCH;
  const cfg = await getUpDownConfig();
  const deadlineMs = abandonAfterSeconds(cfg) * 1000;

  // ── 1 · Rounds whose boundary has passed and which never resolved ──────────
  const stuck = await roundStore.unresolvedBefore(new Date(now).toISOString(), limit);
  report.truncated = stuck.length >= limit;
  for (const round of stuck) {
    report.scanned++;
    try {
      const outcome = await healOneRound(round, cfg, now, deadlineMs);
      report[outcome]++;
    } catch (e) {
      report.failed++;
      console.error(`[updown-heal] round ${round.id} could not be healed:`, e);
    }
  }

  // ── 2 · Rounds that reached a verdict but whose money never moved ──────────
  // The other stranding shape: `closeRound` stamps the round and then settles, so a
  // settlement that failed (or a process that died between the two) leaves a decided
  // round with players still OPEN on it. Settlement is idempotent and resumable, so
  // re-asking is always safe.
  for (const round of await roundStore.resolvedUnsettled(limit)) {
    report.scanned++;
    try {
      const s = await settleMarket(round.marketId, { actorId: "system_updown_healer" });
      if (s.ok) {
        await roundStore.patch(round.id, { settledAt: new Date().toISOString() });
        report.settled++;
        auditHealed(round, "settled", { detail: "resolved round whose settlement had not completed" });
      } else if (s.code === "INVALID" && /already settled/i.test(s.error)) {
        // The market's money DID move; only the round's own stamp was lost. Mirror it
        // back rather than leaving a row that reads as unpaid forever.
        const m = await marketStore.get(round.marketId);
        await roundStore.patch(round.id, { settledAt: m?.settledAt ?? new Date().toISOString() });
        report.settled++;
        auditHealed(round, "settled", { detail: "round's settledAt stamp restored from its market" });
      } else {
        // TOO_EARLY / OBJECTION_OPEN are the freeze doing its job — not a fault.
        report.waiting++;
      }
    } catch (e) {
      report.failed++;
      console.error(`[updown-heal] round ${round.id} could not be settled:`, e);
    }
  }

  if (report.resolved || report.voided || report.settled || report.failed) {
    console.log(
      `[updown-heal] ${report.scanned} scanned — ${report.resolved} resolved, ${report.voided} voided+refunded, ` +
        `${report.settled} settled, ${report.waiting} waiting, ${report.failed} failed` +
        (report.truncated ? ` (batch capped at ${limit} — more remain)` : ""),
    );
  }
  return report;
}

type HealOutcome = "resolved" | "voided" | "settled" | "waiting" | "failed";

async function healOneRound(
  round: StoredRound,
  cfg: Awaited<ReturnType<typeof getUpDownConfig>>,
  now: number,
  deadlineMs: number,
): Promise<HealOutcome> {
  const chain = await chainStore.get(round.chainId);
  const asset = chain ? await assetStore.get(chain.assetId) : null;
  if (!chain || !asset) {
    // Nothing can be decided without the asset, and the round would otherwise sit
    // here forever. Void it — the money is what matters, and a refund is always a
    // legitimate ending. (Cascade deletes make this near-impossible; handled anyway.)
    return (await finishRound(round, null, null, "operator", "chain or asset no longer exists", now)) ? "voided" : "failed";
  }

  const elapsedSec = Math.round((now - Date.parse(round.boundaryAt)) / 1000);
  const observation = await observationStore.find(asset.id, round.boundaryAt);

  // ── PAST THE DEADLINE: close it, and do NOT pay for another reading ────────
  if (now - Date.parse(round.boundaryAt) >= deadlineMs) {
    if (observation && observation.state === "PENDING") {
      // Record WHY on the observation too, so the price story and the money story
      // agree. `fail` is conditional on PENDING, so a late confirmation still wins.
      await observationStore.fail(
        observation.id,
        `abandoned ${elapsedSec}s after the boundary — no confirmed reading, and any reading now would exceed the ${cfg.maxStalenessSeconds}s staleness contract`,
      );
    }
    const fresh = observation ? await observationStore.get(observation.id) : null;
    if (fresh && fresh.state === "CONFIRMED" && fresh.price != null) {
      // It confirmed between our read and our write. Use the real price.
      return (await finishRound(round, fresh.id, fresh.price, "source-failed", `late confirmation, ${elapsedSec}s after the boundary`, now)) ? "resolved" : "failed";
    }
    return (await finishRound(round, observation?.id ?? null, null, "source-failed", `no confirmed reading ${elapsedSec}s after the boundary`, now)) ? "voided" : "failed";
  }

  // ── INSIDE THE WINDOW: run the ladder that has never run ───────────────────
  if (observation?.state === "CONFIRMED" && observation.price != null) {
    return (await finishRound(round, observation.id, observation.price, "source-failed", "confirmed reading applied by the healer", now)) ? "resolved" : "failed";
  }
  if (observation?.state === "FAILED") {
    return (await finishRound(round, observation.id, null, "source-failed", observation.failReason ?? "boundary failed", now)) ? "voided" : "failed";
  }

  const attempts = observation?.attempts ?? 0;
  const lastAttemptMs = observation?.lastAttemptAt ? Date.parse(observation.lastAttemptAt) : Date.parse(round.boundaryAt);
  const dueAt = lastAttemptMs + retryDelaySeconds(cfg, attempts) * 1000;
  // A boundary whose attempt budget is already spent has nothing left to wait FOR —
  // the next `acquireObservation` will declare it FAILED whatever the clock says. So
  // the backoff is skipped there, and the player is not held an extra rung's worth of
  // time for a decision that has already been made. (Found by the guard: without this
  // the ladder reached its budget and then sat waiting instead of closing.)
  const budgetSpent = attempts >= cfg.maxObservationAttempts;
  if (!budgetSpent && attempts > 0 && now < dueAt) return "waiting"; // the backoff, finally honoured

  // This is what actually advances `attempts`, and therefore what eventually reaches
  // `maxObservationAttempts` and fails the boundary. Nothing else in the system does.
  const acquired = await acquireObservation(asset, round.boundaryAt);
  if (acquired.state === "confirmed") {
    return (await finishRound(round, acquired.id, acquired.price, "source-failed", "confirmed on a ladder retry", now)) ? "resolved" : "failed";
  }
  if (acquired.state === "failed") {
    return (await finishRound(round, acquired.id, null, "source-failed", acquired.detail, now)) ? "voided" : "failed";
  }
  return "waiting";
}

/**
 * Close a stuck round and audit WHAT DID IT.
 *
 * The audit row is not decoration: a player's balance changes without any human
 * touching it, and "who released this money" must be answerable from the compliance
 * record alone. `closeRound` already writes the resolution/void row; this adds the
 * provenance — that it was the healer, why, and how late.
 */
async function finishRound(
  round: StoredRound,
  closeObservationId: string | null,
  closePrice: number | null,
  voidReason: VoidReason,
  detail: string,
  now: number,
): Promise<boolean> {
  const r = await closeRound(round.id, closeObservationId, closePrice, voidReason);
  if (r.ok) {
    auditHealed(round, r.data.outcome === "VOID" ? "voided" : "resolved", {
      detail,
      closePrice,
      settled: r.data.settled,
      lateBySeconds: Math.round((now - Date.parse(round.boundaryAt)) / 1000),
    });
    return true;
  }

  // `closeRound` refuses when the MARKET is already terminal — i.e. the market was
  // stamped and the process died before the round row was. Mirror the verdict the
  // market already carries onto the round, then let the settlement sweep above pay
  // it. Without this the round is stuck forever in the one state the healer's main
  // path cannot reach.
  const m = await marketStore.get(round.marketId);
  if (m && (m.status === "RESOLVED" || m.status === "VOIDED") && m.resolvedOutcome) {
    const outcome = sideToOutcome(m.resolvedOutcome);
    await roundStore.patch(round.id, {
      closeObservationId,
      closePrice,
      outcome,
      voidReason: outcome === "VOID" ? (round.voidReason ?? voidReason) : null,
      resolvedAt: m.resolutionStage2At ?? new Date().toISOString(),
    });
    auditHealed(round, outcome === "VOID" ? "voided" : "resolved", {
      detail: "round row reconciled from a market that was already adjudicated",
      marketStatus: m.status,
    });
    return true;
  }
  console.warn(`[updown-heal] round ${round.id} not closed: ${r.error}`);
  return false;
}

function auditHealed(round: StoredRound, action: HealOutcome, payload: Record<string, unknown>): void {
  audit({
    category: "COMPLIANCE",
    action: "updown.round.healed",
    // A distinct actor from `system_updown`, so the audit trail can tell a round the
    // engine closed on time from one the safety net had to rescue. An operator
    // watching this actor appear is watching E-24's failure mode recur.
    actorId: "system_updown_healer",
    targetType: "UpDownRound",
    targetId: round.id,
    payload: {
      ...payload,
      action,
      chainId: round.chainId,
      marketId: round.marketId,
      roundNumber: round.roundNumber,
      boundaryAt: round.boundaryAt,
      note:
        "Closed by the Up & Down self-healer (finding E-24). A round that cannot confirm a price VOIDs " +
        "and every stake is refunded in full through the same settlement path as any other void; the " +
        "healer never invents a price and never decides a winner.",
    },
  });
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
