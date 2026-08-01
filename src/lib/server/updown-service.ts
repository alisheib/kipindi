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
  retryDelaySeconds, abandonAfterSeconds, type UpDownConfig,
} from "./updown-config";
import {
  assetStore, chainStore, roundStore, observationStore,
  type StoredAsset, type StoredChain, type StoredRound, type RoundOutcome, type VoidReason,
} from "./updown-dal";
import { observePrice, describeRefusal, type OracleReading, type RefusalReason } from "./updown-oracle";
import { feedFromId, quoteAsset, describeFeedRefusal, hostMatchesDomain } from "./updown-feed";

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

/**
 * Does a confirmed reading's cited link sit on the domain THIS round pinned at open?
 *
 * Pure, and deliberately generous. Legacy passes: a round with no capture, or a reading
 * that cited nothing, is a round we CANNOT check — and a round we cannot check is not a
 * round we may void on suspicion. It fires only on a genuine contradiction, where the
 * reading that bounded this round came from a host the round did not pin.
 *
 * Compares DOMAINS, not URLs: a source legitimately serves the same quote from a
 * sub-path or query variant, and an exact-URL compare would void real rounds for no
 * integrity gain. Domain identity is precisely what the trusted-source registry asserts.
 */
export function observationMatchesRound(
  observationSourceUrl: string | null,
  roundSourceDomain: string | null,
): { ok: true; checked: boolean } | { ok: false; detail: string } {
  if (!roundSourceDomain || !observationSourceUrl) return { ok: true, checked: false };
  if (hostMatchesDomain(observationSourceUrl, roundSourceDomain)) return { ok: true, checked: true };
  let host = observationSourceUrl;
  try { host = new URL(observationSourceUrl).hostname; } catch { /* keep the raw string */ }
  return { ok: false, detail: `reading cited "${host}", but this round pinned "${roundSourceDomain}" at open` };
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
 * Obtain a reading for (asset, boundary) by whichever method the operator configured.
 *
 * ONE contract, two implementations — the same shape the AI oracle already returns, so
 * every gate, every refusal path and the whole write-once ledger below are unchanged. A
 * feed replaces HOW the number is obtained; it relaxes nothing.
 *
 * ⛔ `not-configured` and `mock-in-production` are mapped to `"no-api-key"` DELIBERATELY:
 * that reason is inside the operator-state carve-out below, so a misconfigured feed leaves
 * the boundary PENDING instead of burning the attempt budget and voiding live rounds for
 * an ops mistake. A feed that cannot run is an operator problem, never a source failure.
 */
async function readPrice(
  asset: StoredAsset,
  boundaryAtIso: string,
  cfg: UpDownConfig,
): Promise<OracleReading> {
  if (cfg.observationMethod === "ai") return observePrice(asset, boundaryAtIso);

  const q = await quoteAsset(feedFromId(cfg.feedProvider), {
    symbol: asset.symbol,
    decimals: asset.decimals,
    endpoint: asset.priceSourceUrl,
    approvedDomain: asset.sourceDomain,
  });

  if (!q.ok) {
    const reason: RefusalReason =
      q.reason === "not-configured" || q.reason === "mock-in-production" ? "no-api-key"
      : q.reason === "unparseable-price" ? "unparseable-price"
      : q.reason === "no-timestamp" ? "stale"
      : q.reason === "wrong-source" ? "wrong-source"
      : "error";
    return { ok: false, reason, detail: describeFeedRefusal(q.reason, q.detail) };
  }

  // The SAME staleness gate the AI path uses, against the PROVIDER'S own time — never ours.
  const boundaryMs = Date.parse(boundaryAtIso);
  const quotedMs = Date.parse(q.quotedAt);
  if (!Number.isFinite(quotedMs)) {
    return { ok: false, reason: "stale", detail: `provider timestamp "${q.quotedAt}" is unparseable` };
  }
  const skewSeconds = Math.round(Math.abs(quotedMs - boundaryMs) / 1000);
  if (skewSeconds > cfg.maxStalenessSeconds) {
    return {
      ok: false,
      reason: "stale",
      detail: `quote is ${skewSeconds}s from the boundary (limit ${cfg.maxStalenessSeconds}s)`,
    };
  }

  return {
    ok: true,
    price: q.price,
    sourceUrl: q.sourceUrl,
    sourceQuotedAt: new Date(quotedMs).toISOString(),
    evidence: q.evidence,
    // A feed does not guess, so there is no confidence to score. Recorded as 100 so the
    // shared confidence floor is a no-op rather than a second thing to keep in sync.
    confidence: 100,
    model: `feed:${q.provider}`,
    rawHash: q.rawHash,
    skewSeconds,
  };
}

/**
 * Get the CONFIRMED observation for (asset, boundary), by the configured method.
 *
 * Idempotent and shared: the row is unique per boundary, so the 5-, 15- and 30-minute
 * chains meeting at 14:30 all land on the SAME row — one reading serves them all, and
 * round N's close is byte-identical to round N+1's open.
 *
 * Returns a non-confirmed state when the boundary is not (yet) readable. The caller
 * decides whether to wait or to void; this function never invents a price.
 *
 * `now` exists ONLY so the backoff gate below can be driven on a simulated clock. The
 * healer already takes an injectable `now` and must be able to hand its own clock to the
 * one place the ladder is enforced — otherwise the gate silently reads wall-clock time
 * while the caller believes it is 4 minutes later, the rung never elapses, and the ladder
 * looks dead again. That is exactly what the merge produced before this parameter existed,
 * and `test:updown-heal` §4 caught it. Production always passes nothing.
 */
export async function acquireObservation(
  asset: StoredAsset,
  boundaryAtIso: string,
  now: number = Date.now(),
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
  // designed and never wired. Without it the heal sweep would re-call the price source on
  // every tick, which is both a cost leak (TwelveData is metered) and a good way to be
  // rate-limited into voiding rounds that a slightly later read would have settled.
  //
  // ⛔ ONE READER, AND THIS IS IT. The ladder is climbed HERE, in the single function every
  // caller goes through — the scheduler's `advanceChain` and the healer alike — rather than
  // in each caller. `retryDelaySeconds()` in updown-config.ts is the only thing in `src/`
  // that reads the backoff array; `abandonAfterSeconds()` derives the healer's deadline
  // from that same function, so the deadline can never drift out of step with the ladder it
  // is supposed to outlast. If you add a second reader, delete one of them.
  //
  // ℹ️ MERGE NOTE (2026-08-01). Both the E-24 fix and the feed branch wired this ladder, in
  // different places — the healer and here. This is the single surviving implementation.
  if (obs.lastAttemptAt) {
    const readyAt = Date.parse(obs.lastAttemptAt) + retryDelaySeconds(cfg, obs.attempts) * 1000;
    if (Number.isFinite(readyAt) && now < readyAt) {
      return {
        state: "pending",
        id: obs.id,
        detail: `waiting ${Math.ceil((readyAt - now) / 1000)}s before attempt ${obs.attempts + 1}`,
      };
    }
  }

  const reading = await readPrice(asset, boundaryAtIso, cfg);
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

  // ── THE CAPTURE ────────────────────────────────────────────────────────────
  // Read the asset's link ONCE, here, and use only these locals below. That is the whole
  // point: the round records its page at open and never consults the asset row again.
  const capturedSourceUrl = asset.priceSourceUrl;
  const capturedSourceDomain = asset.sourceDomain;

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
    sourceUrl: capturedSourceUrl,
    // Stated in the players' terms, and it is literally what settlement compares.
    resolutionCriterion: targets
      ? `${asset.nameEn} (${asset.symbol}) price at ${closeIso}, read from ${capturedSourceDomain}. ` +
        `Opening price ${openPrice}. UP if the price reaches ${targets.upTarget} (+${(marginBps / 100).toFixed(2)}%), ` +
        `DOWN if it reaches ${targets.downTarget} (−${(marginBps / 100).toFixed(2)}%), otherwise VOID and every stake is refunded.`
      : `${asset.nameEn} (${asset.symbol}) price at ${closeIso}, read from ${capturedSourceDomain}, ` +
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
    capturedSourceUrl,
    capturedSourceDomain,
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
      capturedSourceUrl, capturedSourceDomain,
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

  // ── THE SOURCE CHECK, before any verdict ───────────────────────────────────
  // Both bounding readings must have come from the domain THIS round pinned at open. With
  // the asset-source edit lock in place this should fire approximately never — which is
  // exactly what is wanted from a defence-in-depth check. When it does fire, it means the
  // link moved by a route the lock does not cover (a direct DB edit, a script, a new
  // caller), and the honest response is to refuse to settle rather than pay out against a
  // page the player never agreed to. Legacy rounds (no capture) and readings that cited
  // nothing are skipped, not voided: a round we cannot check is not a round we may void on
  // suspicion.
  // The domain a settled round's receipt cites. The round's OWN pin, always — a receipt
  // naming the asset's CURRENT link would describe a page nobody read. The fallback covers
  // only rounds that settled before the capture column existed, where it is the sole
  // surviving information.
  const evidenceDomain = round.capturedSourceDomain ?? asset.sourceDomain;

  let sourceMismatch: string | null = null;
  {
    const ids = [round.openObservationId, closeObservationId].filter((x): x is string => !!x);
    for (const id of ids) {
      const obs = await observationStore.get(id);
      if (!obs || obs.state !== "CONFIRMED") continue;
      const verdict = observationMatchesRound(obs.sourceUrl, round.capturedSourceDomain);
      if (!verdict.ok) { sourceMismatch = verdict.detail; break; }
    }
  }

  // Use the round's FROZEN targets (the margin model). Legacy rounds opened before the
  // margin model have null targets and fall back to the openPrice ± minMove rule.
  const useTargets = round.upTarget != null && round.downTarget != null;
  const decided = useTargets
    ? decideOutcomeByTargets(closePrice, round.upTarget, round.downTarget)
    : decideOutcome(round.openPrice, closePrice, minMoveFor(asset));
  // A mismatch overrides the arithmetic outright: it does not matter what the prices say
  // if one of them came from the wrong place.
  const outcome: RoundOutcome = sourceMismatch ? "VOID" : decided.outcome;
  const voidReason = sourceMismatch ? ("source-mismatch" as VoidReason) : decided.voidReason;
  const finalVoidReason = outcome === "VOID"
    ? (sourceMismatch ? "source-mismatch" : (voidReasonOverride ?? voidReason ?? "source-failed"))
    : null;
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
            : sourceMismatch
              ? `Round voided (source-mismatch): ${sourceMismatch}. Every stake is refunded in full.`
              : `Round voided (${finalVoidReason}). Every stake is refunded in full.`
          : useTargets
            ? `Close ${closePrice} ${outcome === "UP" ? `≥ up target ${round.upTarget}` : `≤ down target ${round.downTarget}`} (open ${round.openPrice} ± ${((round.marginBps ?? 0) / 100).toFixed(2)}%, ${asset.symbol}, ${evidenceDomain}).`
            : `Open ${round.openPrice} → close ${closePrice} (${asset.symbol}, ${evidenceDomain}). Moved ${((closePrice ?? 0) - (round.openPrice ?? 0)).toFixed(asset.decimals)}.`,
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

  // ── THE LADDER, climbed by the ONE thing that climbs it ────────────────────
  // The backoff and the attempt-budget check both live inside `acquireObservation`, which
  // returns `pending` while a rung is still running and `failed` the moment the budget is
  // spent — so this call is safe to make on every tick and needs no clock arithmetic here.
  //
  // ℹ️ MERGE NOTE (2026-08-01). The E-24 fix originally gated the backoff HERE, and the
  // feed branch gated it inside `acquireObservation`. Keeping both would have made the
  // player wait two rungs per attempt and split one rule across two files. The gate now
  // lives in `acquireObservation` only — see the ONE READER note there. The `budgetSpent`
  // refinement this block used to carry is preserved by construction: `acquireObservation`
  // checks `attempts >= maxObservationAttempts` BEFORE it checks the backoff, so a spent
  // budget still closes immediately instead of waiting out one more rung.
  //
  // This call is also what actually advances `attempts`, and therefore what eventually
  // reaches `maxObservationAttempts` and fails the boundary. Nothing else in the system does.
  // `now` is handed down so the gate judges the same instant this sweep does.
  const acquired = await acquireObservation(asset, round.boundaryAt, now);
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
// ℹ️ MERGE NOTE (2026-08-01) — there was a SECOND heal sweep here, and it is gone
// ---------------------------------------------------------------------------
//
// `feat/updown-source-pinning-and-proposals` independently discovered the same defect
// the live QA campaign logged as E-24, and shipped its own fix: `resolveOverdueRounds()`,
// called from the lifecycle ticker. Merging both left the ticker running TWO sweeps over
// the same rows every minute — which the automatic merge did silently, because the two
// functions never touched the same lines.
//
// `healStuckRounds()` above is the one that survives. It is not a preference; it strictly
// dominates, and each of these was a real gap in the other:
//
//   • THE DEADLINE. `resolveOverdueRounds` terminated a round only by spending the attempt
//     budget. But its own (correct, and kept) carve-out does not count `no-api-key` or
//     `ai-paused` against that budget — so with an unconfigured feed the budget NEVER
//     spends and the round waits forever. That is E-24 again, through a new door.
//     `abandonAfterSeconds` closes the round regardless, and without paying for a reading
//     that could no longer satisfy the staleness contract anyway.
//   • THE SECOND STRANDING SHAPE. A round can reach a verdict and still never pay
//     (E-24(b): settlement failed, or the process died between the two writes).
//     `resolveOverdueRounds` had no path for it; `resolvedUnsettled` does.
//   • THE AUDIT TRAIL. Money moves with no human involved, so `updown.round.healed` under
//     the distinct `system_updown_healer` actor is what makes "who released this"
//     answerable from the compliance record alone.
//   • THE ALREADY-ADJUDICATED PATH, and a kill switch separate from `UPDOWN_SCHEDULER`.
//
// What was KEPT from that branch, because it is genuinely better, lives in
// `acquireObservation`: the backoff gate (one reader, shared by every caller) and the
// operator-state carve-out. The two fixes are complementary — the carve-out stops an ops
// mistake from voiding live rounds, and the deadline stops that same carve-out from
// stranding them. Neither branch alone had both.
//
// ⛔ Do not re-add a second sweep. `healStuckRounds` is called from `lifecycle.ts`, once.
