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
  retryDelaySeconds, abandonAfterSeconds, refusalCostsAnAttempt, lateCloseDecision,
  type UpDownConfig,
} from "./updown-config";
import { findProvider } from "@/lib/updown-providers";
import {
  assetStore, chainStore, roundStore, observationStore,
  type StoredAsset, type StoredChain, type StoredRound, type RoundOutcome, type VoidReason,
} from "./updown-dal";
import { minuteFloor, selectionClosesAt, roundSpanMinutes, MINUTE_MS } from "@/lib/updown-durations";
import { observePrice, describeRefusal, type OracleReading, type RefusalReason } from "./updown-oracle";
import { feedFromId, quoteAsset, describeFeedRefusal, hostMatchesDomain, judgeFeedStaleness } from "./updown-feed";
// E-36 — the trading calendar. A shut market must never settle real money.
import { marketSessionAt, describeClosure } from "./market-calendar";
import { deadHoursFor } from "./updown-playbook-store";

export type LifecycleResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * 🔴 E-97 · A CLOCK TIME AN OPERATOR CAN READ, for messages that reach the console.
 *
 * `HH:MM:SS UTC` — the same shape `/admin/updown` already uses on the chain row, so a refusal
 * and the grid behind it speak in one format. ⛔ NEVER interpolate an ISO string into operator
 * copy: `2026-08-05T14:35:00.000Z` is a serialisation, and the moment it appears is the moment
 * the console stops being written for a person.
 *
 * Returns the input unchanged if it is not a parseable instant — a message that has lost its
 * time is better than one that claims a wrong one.
 */
export function clockUtc(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? `${d.toISOString().slice(11, 19)} UTC` : iso;
}

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
 *
 * ⭐ EXPORTED for `updown-proposal.ts` (E-47b, Ali's decision 2026-08-03). The AI proposal
 * path needs a reading to prove an asset's source works before an officer arms a chain on it,
 * and it must be THE SAME reading a round will take — the calendar gate, the approved-domain
 * check and the staleness rule included. A proposal validated against a second, gentler read
 * would green-light a source that then voids every round it touches, which is exactly the
 * failure `judgeFeedStaleness` was centralised to prevent. Pass `new Date().toISOString()` as
 * the boundary to mean "now".
 */
export async function readPrice(
  asset: StoredAsset,
  boundaryAtIso: string,
  cfg: UpDownConfig,
): Promise<OracleReading> {
  // ── E-36 · IS THIS MARKET EVEN TRADING? ────────────────────────────────────
  // FIRST, before either method and before a single provider credit is spent.
  //
  // ⛔ THIS CANNOT BE LEFT TO THE STALENESS GATE, and believing it could is what E-36 is.
  // The documented reasoning was that a shut market stops advancing its quote time, so
  // staleness refuses it — and failing that, `minMoveTicks` voids it as a no-move. Measured
  // against the live provider on Sunday 2026-08-02, BOTH are false: `last_quote_at` advanced
  // every minute for XAU/USD and EUR/USD, `is_market_open` said `true`, and the weekend
  // 1-minute bars carry real intrabar range — synthetic jitter around a pinned anchor rather
  // than a frozen price. 20-95% of shut-market rounds would therefore have RESOLVED, paying
  // real money on a price no market made. See `market-calendar.ts` for the measurement.
  //
  // Mapped to `no-api-key` so it lands inside the operator-state carve-out below: a closed
  // market must NOT burn the attempt budget (there is nothing to retry into, and each
  // attempt costs a metered provider credit). The round then stays PENDING and is voided +
  // refunded by the E-24 self-healer's deadline — the platform's existing safe failure.
  const session = marketSessionAt(asset.category, boundaryAtIso);
  if (!session.open) {
    return { ok: false, reason: "no-api-key", detail: describeClosure(session) };
  }

  if (cfg.observationMethod === "ai") return observePrice(asset, boundaryAtIso);

  const q = await quoteAsset(feedFromId(cfg.feedProvider), {
    symbol: asset.symbol,
    decimals: asset.decimals,
    endpoint: asset.priceSourceUrl,
    approvedDomain: asset.sourceDomain,
    // The instant this reading is FOR. A quote feed ignores it — it can only ever answer
    // "the price now", which is precisely the inability E-69 is made of. A dated feed uses it
    // to ask for one named bar, and that is what makes being late harmless.
    at: boundaryAtIso,
  });

  if (!q.ok) {
    const reason: RefusalReason =
      q.reason === "not-configured" || q.reason === "mock-in-production" ? "no-api-key"
      : q.reason === "unparseable-price" ? "unparseable-price"
      : q.reason === "no-timestamp" ? "stale"
      : q.reason === "wrong-source" ? "wrong-source"
      // ⛔ `implausible-bar` BURNS THE ATTEMPT BUDGET, deliberately. It is a statement about
      // the world — what the provider published cannot be trusted — and retrying will not
      // change it. It must NOT land in the operator-state carve-out beside `no-api-key`, or
      // the round would wait forever for a reading that is never coming instead of voiding
      // and refunding on time.
      : q.reason === "implausible-bar" ? "unparseable-price"
      // ⚠️ `no-bar` IS DIFFERENT, AND CONFLATING THE TWO REINTRODUCES E-69.
      // Measured on all four production symbols: the bar labelled T first appears at **+10s**
      // and the ladder's first attempt is taken AT the boundary — so under the bar reader
      // attempt 1 ALWAYS finds no bar. Charging that to the budget starts every round a
      // life down for a bar that was four seconds away, and spending the budget declares the
      // boundary FAILED, voiding a round whose price published perfectly well. It is passed
      // through as its own reason and `refusalCostsAnAttempt` decides, from the elapsed time,
      // whether this one means *not yet* or *never*.
      : q.reason === "no-bar" ? "bar-not-published"
      // ⭐ E-86 · A RATE LIMIT IS "ASK ME AGAIN", NOT A VERDICT — the same class as `no-bar`
      // above, and it was being folded into `error` and charged to the budget. Four of them
      // inside 90 seconds declared the boundary FAILED and refunded every stake, against a
      // 390-second deadline that had barely started.
      : q.reason === "rate-limited" ? "rate-limited"
      : "error";
    return { ok: false, reason, detail: describeFeedRefusal(q.reason, q.detail) };
  }

  // The SAME staleness gate the AI path uses, against the PROVIDER'S own time — never ours.
  // ⛔ Delegated to `judgeFeedStaleness` rather than written out here, so the ops probe
  // (`ops:updown-probe-feed`) certifies a source against the SAME rule the money path
  // applies. A probe that says "readable" where the engine says "stale" is worse than no
  // probe: it is a green light for a source that will void every round it touches.
  const judged = judgeFeedStaleness(q.quotedAt, boundaryAtIso, cfg.maxStalenessSeconds);
  if (!judged.ok) return { ok: false, reason: judged.reason, detail: judged.detail };
  const { skewSeconds } = judged;

  return {
    ok: true,
    price: q.price,
    sourceUrl: q.sourceUrl,
    sourceQuotedAt: judged.quotedAtIso,
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
/**
 * ⭐ E-67 · CREATE ONE ROUND, BECAUSE AN ADMIN ASKED FOR IT.
 *
 * Ali, 2026-08-03: *"nothing should be by 50pick automatic — my admins will enter and generate
 * every 5 min… because sometimes we might not generate, other times we would."* A RUNNING chain
 * emits on a timer with nobody involved (48 rounds/hour across four chains, measured). All
 * chains are STOPPED; this is how a round comes into existence now.
 *
 * ⛔ IT REFUSES RATHER THAN OPENING A ROUND THAT CANNOT WORK, and that is the whole difference
 * between this and the automatic path. `advanceChain` opens the round whatever the observation
 * says, leaving `openPrice = null` when the reading has not confirmed — which is **E-63**, and
 * on SOL it voided 22 of 24 rounds. An operator pressing a button gets a straight answer
 * instead: either a round with a real open price and real targets, or a refusal naming the
 * reason in the feed's own words. Nothing half-open, nothing doomed, no stake taken on terms
 * that do not exist.
 *
 * The checks, in the order an operator would ask them:
 *  1 · the chain and its asset still exist, and the asset is ENABLED;
 *  2 · the market is OPEN right now (E-36's trading calendar — a round opened into a shut
 *      market takes stakes all weekend and then voids);
 *  3 · no round is already live on this chain (one round per chain at a time);
 *  4 · the price READS — checked before anything is written.
 *
 * ⚠️ The boundary is taken from the chain's own grid (`boundaryAtOrBefore`), never from
 * "now": the grid is what lets a 10-, 15- or 30-minute round share the 5-minute observation,
 * and a round opened off-grid would need its own paid read at both ends.
 */
export async function generateRoundNow(
  chainId: string,
  officerId: string,
): Promise<LifecycleResult<StoredRound>> {
  const chain = await chainStore.get(chainId);
  if (!chain) return { ok: false, error: "Chain not found." };
  const asset = await assetStore.get(chain.assetId);
  if (!asset) return { ok: false, error: "The chain's asset no longer exists." };
  if (!asset.enabled) {
    return { ok: false, error: `${asset.key} is disabled. Enable it before generating a round.` };
  }

  // 3 · one live round per chain — generating a second would split the liquidity and give
  //     two rounds the same boundary.
  const latest = await roundStore.latestForChain(chain.id);
  if (latest && !latest.resolvedAt) {
    return {
      ok: false,
      // 🔴 E-97 · THIS IS THE SENTENCE AN OPERATOR SEES MOST OFTEN, and it printed a raw ISO
      // string at them: `closes 2026-08-05T14:35:00.000Z`. Every other time on that page is
      // formatted — `14:35:00 UTC` on the chain row, `08-05 13:55Z` on the rounds grid — so the
      // one place the console speaks in machine format is the one place it is REFUSING, which
      // is exactly when the operator most needs to read it without decoding anything.
      error: `A round is already live on ${asset.key} ${chain.durationMinutes}m (closes ${clockUtc(latest.closesAt)}). Wait for it to settle, or void it first.`,
    };
  }

  // ⛔ THE ROUND OPENS **NOW**, NOT ON THE GRID — and that is a deliberate reversal.
  //
  // The first version used `boundaryAtOrBefore`, the chain's own grid mark at or before now,
  // because the grid is what lets a 10-, 15- and 30-minute round share one paid observation.
  // Driven on production it refused: generating at 21:22 asks for the **21:20** price, which is
  // already 120s old against a 90s staleness limit —
  //   "Reading too far from the boundary — quote is 120s from the boundary (limit 90s)"
  // so the button would only have worked in the first 90 SECONDS after each grid mark and
  // refused for the other three and a half minutes. An operator clicking "Generate round" at an
  // arbitrary moment is the entire point of E-67; a control that works one minute in four is not
  // a control.
  //
  // Grid sharing was an optimisation for chains emitting on a timer, all landing on the same
  // instants. Manual rounds do not coincide, so there is nothing to share and nothing is lost:
  // this round takes its own open read now and its own close read at its own boundary — exactly
  // the two reads it would have cost anyway. ⚠️ It does mean a manual round is NOT aligned to the
  // 5-minute lattice; that is fine for the round itself, and `advanceChain` is not involved
  // because the chain is STOPPED.
  //
  // ⚠️ THIS PARAGRAPH USED TO END "Seconds and milliseconds are zeroed", AND THAT WAS UNTRUE —
  // only the milliseconds were, which is the whole subject of the block below. A comment that
  // describes an invariant the code does not hold is worse than no comment: it is the reason
  // nobody noticed that every boundary carried a seconds component.
  // ⛔ AND IT SNAPS TO A WHOLE MINUTE — seconds zeroed, not merely milliseconds.
  //
  // This line used to be `Math.floor(Date.now() / 1000) * 1000`, which PRESERVES THE SECONDS.
  // A round generated at 21:22:37 therefore carried the boundary 21:27:37, and that is fine
  // for a quote endpoint (which only ever answers "the price now") but it is fatal for the
  // settlement rebuild: market data is published as **1-minute bars**, and there is no bar
  // labelled 21:27:37. Every boundary the platform has ever created is unnamable in the data
  // that is about to settle it.
  //
  // Snapping BACK to the current minute (0-59s ago) rather than forward to the next one is
  // deliberate and keeps E-67's guarantee intact: the price for a minute that has already
  // begun can be read NOW, so the round is still refused-or-priced before anything is
  // written. Snapping forward would mean opening a round whose own open price does not exist
  // yet — a round that takes stakes, shows a countdown, and then voids, which is precisely
  // the failure E-67 was built to make impossible.
  //
  // ⚠️ The staleness contract still holds: the quote is at most 59s from the boundary against
  // `maxStalenessSeconds` of 90.
  //
  // `minuteFloor` rather than the arithmetic inline: the same rule is needed by the bar reader
  // and by anything that asks "which bar covers this instant", and two copies of a rounding rule
  // that decides which price settles a round is exactly the drift E-49/E-56 were about.
  // ── WHICH MINUTE CAN ACTUALLY BE PRICED? ───────────────────────────────────
  //
  // 🔴 FOUND ON PRODUCTION 2026-08-04, and it made Generate a coin toss. This was
  // `minuteFloor(Date.now())` — the minute that has only just BEGUN. A quote reader does not
  // care (it only ever answers "the price now"), but a DATED reader asks for a published bar,
  // and the bar labelled T does not exist until **+10s** (BTC/ETH/XAU) or **+60s** (SOL).
  //
  // So an operator clicking at :05 past the minute got *"Could not read a price"*, and the same
  // click at :40 succeeded. **A control that works depending on where the second hand is, is not
  // a control** — the same objection this function's own comment already makes about the grid.
  //
  // ⭐ Under a dated feed the open therefore comes from a COMPLETED minute, newest first, and it
  // walks back until one reads. §6ad anticipated exactly this — *"taking the open from a
  // completed 1-minute bar puts the open 60-120s in the past"* — which is precisely why E-72's
  // betting window ships WITH the open-from-bar change rather than after it.
  //
  // ⚠️ BOUNDED AT THREE CANDIDATES. Each one costs a metered provider credit, so this must never
  // become an unbounded hunt; three covers the measured worst case (SOL at +60s) with room, and
  // the refusal below still names the feed's own reason if all three decline.
  const genCfg = await getUpDownConfig();
  const dated = !!findProvider(genCfg.feedProvider)?.dated;
  const nowMinute = minuteFloor(Date.now());
  const candidates = dated
    ? [1, 2, 3].map((k) => nowMinute - k * MINUTE_MS)
    : [nowMinute];

  let boundaryIso = new Date(candidates[0]!).toISOString();
  let obs: Awaited<ReturnType<typeof acquireObservation>> | null = null;

  // ⭐ The asset's MEASURED daily settlement break, loaded ONCE outside the candidate loop. Empty
  // for any symbol with no profile on file, which is byte-for-byte today's behaviour.
  const deadHours = await deadHoursFor(asset.symbol);
  for (const ms of candidates) {
    const iso = new Date(ms).toISOString();
    // 2 · E-36 — never open into a shut market. Checked per candidate, because walking back
    //     across a session boundary must not slip a round into a closed market.
    const session = marketSessionAt(asset.category, iso, deadHours);
    if (!session.open) return { ok: false, error: describeClosure(session) };

    // 4 · ⛔ THE PRICE, BEFORE ANYTHING IS WRITTEN. `acquireObservation` runs the calendar gate,
    //     the approved-domain check and the staleness rule — the same ones settlement applies.
    boundaryIso = iso;
    obs = await acquireObservation(asset, iso);
    if (obs.state === "confirmed") break;
  }

  if (!obs || obs.state !== "confirmed") {
    return {
      ok: false,
      error:
        // E-97 · a clock time, not a serialisation — this is the refusal the guide's §9 step 4
        // tells an operator they will meet, so it is the one they read most under pressure.
        `Could not read a price for ${asset.key} at ${clockUtc(boundaryIso)} — ${obs && "detail" in obs ? obs.detail : "no reading"}. ` +
        `No round was created. A round opened without an open price cannot resolve: it would ` +
        `take stakes, show a countdown, and then void and refund every one.`,
    };
  }

  const opened = await openRound(chain, boundaryIso, obs.id, obs.price);
  if (!opened.ok) return opened;

  audit({
    category: "ADMIN",
    action: "updown.round.generated",
    actorId: officerId,
    targetType: "UpDownRound",
    targetId: opened.data.id,
    payload: {
      assetKey: asset.key, chainId: chain.id, durationMinutes: chain.durationMinutes,
      boundaryAt: boundaryIso, openPrice: obs.price, observationId: obs.id,
      upTarget: opened.data.upTarget, downTarget: opened.data.downTarget,
      marginBps: opened.data.marginBps, manual: true,
    },
  });
  return opened;
}

export async function acquireObservation(
  asset: StoredAsset,
  boundaryAtIso: string,
  now: number = Date.now(),
  /**
   * `pastDeadline` — the ONE final read a dated feed is allowed after the abandon deadline.
   *
   * It skips the backoff (the deadline has elapsed; there is nothing left to wait for) and
   * the attempt budget (which exists to ration reads that CANNOT succeed — a dated read can).
   * ⛔ It does NOT skip the FAILED terminal state: the observation ledger is write-once per
   * `@@unique([assetId, boundaryAt])` so that round N's close is byte-identical to round
   * N+1's open, and no late-settlement convenience is worth relaxing that.
   */
  opts?: { pastDeadline?: boolean },
): Promise<
  | { state: "confirmed"; price: number; id: string }
  | {
      state: "pending" | "failed"; id: string; detail: string;
      /**
       * ⭐ HOW LONG BEFORE ANOTHER CALL COULD POSSIBLY DO ANYTHING DIFFERENT.
       *
       * The reader already knows: the backoff ladder decides when the next provider read is
       * allowed, and until then every call returns the same `pending` from the same row. The
       * scheduler used to guess — it guessed zero, and re-fired ~450 times per boundary for
       * a reading that could not change. Publishing the number here rather than re-deriving
       * it in the caller is what keeps the two from drifting: `retryDelaySeconds` is read in
       * exactly one place, which is the rule this file already keeps for the ladder itself.
       */
      retryAfterMs?: number;
    }
> {
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
  //
  // ⚠️ The past-deadline read is exempt, and the exemption is narrow on purpose: it performs
  // ONE read that the budget was never rationing. The budget counts attempts a QUOTE feed
  // made against a moving target; a dated bar either exists or does not, and asking once more
  // is the difference between settling E-69's round correctly and refunding it for nothing.
  if (obs.attempts >= cfg.maxObservationAttempts && !opts?.pastDeadline) {
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
  //
  // 🔴 E-86 (2026-08-05, found by an hour of live soak). The gate below is right and it was
  // being SKIPPED on the one refusal that happens at every single boundary. `lastAttemptAt` was
  // only ever written by `recordAttempt`, which runs only when a refusal COSTS an attempt — so
  // a bar that has merely not published yet (the deliberate carve-out above) left the timestamp
  // null, this whole block was skipped, and the metered provider was re-read with NO DELAY on
  // every tick for the ~130s a bar takes to appear. Measured on production against the
  // provider's own counter: usage climbed **10 → 345 of 377 credits in 55 seconds**, ~6 reads a
  // second, and the next read came back HTTP 429. `touchAttempt` now records WHEN we asked
  // without spending one of the boundary's lives, so the ladder gates every read.
  //
  // ⚠️ AND THE RUNG IS FLOORED AT THE FIRST ONE. With no attempt charged, `retryDelaySeconds`
  // returns 0 by design (the first read is taken AT the boundary, with no delay) — so reading
  // it literally here would restore the very hole this fixes on the second read onward. Once we
  // have asked at all, the shortest wait is the ladder's first rung.
  if (obs.lastAttemptAt && !opts?.pastDeadline) {
    const readyAt = Date.parse(obs.lastAttemptAt) + retryDelaySeconds(cfg, Math.max(1, obs.attempts)) * 1000;
    if (Number.isFinite(readyAt) && now < readyAt) {
      return {
        state: "pending",
        id: obs.id,
        detail: `waiting ${Math.ceil((readyAt - now) / 1000)}s before attempt ${obs.attempts + 1}`,
        // The gate's own number. Asking again before this instant returns this same line.
        retryAfterMs: readyAt - now,
      };
    }
  }

  const reading = await readPrice(asset, boundaryAtIso, cfg);
  if (!reading.ok) {
    const detail = describeRefusal(reading.reason, reading.detail);
    // ⛔ WHETHER A REFUSAL COSTS AN ATTEMPT IS A MONEY DECISION, and it lives in ONE pure
    // function so it can be proven exhaustively and cannot drift from the healer's copy.
    // Spending the budget declares the boundary FAILED, which VOIDs every round on it and
    // refunds every stake — so the rule is "would asking again plausibly get a different
    // answer?", not "did something go wrong?".
    //
    // ⛔ This used to `recordAttempt` UNCONDITIONALLY, directly against the comment beside
    // it: pausing the AI for four fires walked the budget to zero and VOIDed live rounds for
    // an operator action. The carve-out was the fix, and it now also covers a dated feed's
    // bar that has simply not published yet — measured at +10s, against a first attempt
    // taken at +0s.
    const elapsedSeconds = Math.round((now - Date.parse(boundaryAtIso)) / 1000);
    const charged = refusalCostsAnAttempt(reading.reason, elapsedSeconds, cfg);
    if (charged) {
      await observationStore.recordAttempt(obs.id, detail);
    } else {
      // ⛔ E-86. A refusal that costs no LIFE still costs a paid provider READ, and the next
      // one must still be spaced. This is the whole fix: the boundary keeps its full attempt
      // budget, and the ladder still decides when we may ask again.
      await observationStore.touchAttempt(obs.id, detail);
    }
    // A read was just taken, so the gate above will hold the NEXT one for one rung. Same
    // expression the gate uses, against the attempt count as it now stands — a refusal that
    // spent a life has moved one rung up the ladder, one that did not has not.
    return {
      state: "pending", id: obs.id, detail,
      retryAfterMs: retryDelaySeconds(cfg, Math.max(1, obs.attempts + (charged ? 1 : 0))) * 1000,
    };
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
  // ⭐ THE SPAN, NOT THE DURATION (Ali, 2026-08-04). `durationMinutes` is now purely "how long
  // you may bet"; the round runs that long PLUS a result phase in which the closing price is
  // read. So a "3 min" round takes bets for a full 3 minutes and closes at 4. Using
  // `durationMinutes` here would put the close back on top of the lock and re-create exactly
  // the shortfall this change removed.
  const closeMs = openMs + roundSpanMinutes(chain.durationMinutes) * 60_000;
  const closeIso = new Date(closeMs).toISOString();

  const last = await roundStore.latestForChain(chain.id);
  const roundNumber = (last?.roundNumber ?? 0) + 1;
  if (last && last.boundaryAt === closeIso) {
    // E-97 · a clock time, not a serialisation.
    return { ok: false, error: `Round ${roundNumber - 1} already covers ${clockUtc(closeIso)}.` };
  }

  const [profile, bounds] = await Promise.all([rateProfileFor(chain), stakeBoundsFor(chain)]);

  // The frozen winning boundaries: base ± (base × marginBps/10000). Null if the boundary
  // wasn't confirmed at open (no openPrice) — such a round falls back at close and voids.
  const cfg = await getUpDownConfig();
  const marginBps = marginBpsForChain(chain, cfg, asset);
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
    // ⭐ E-72 · BETS CLOSE BEFORE THE ROUND DOES — the last 20%, floored at 30s.
    //
    // ⚠️ THIS LINE USED TO BE `selectionClosedAt: null`, and the comment beside it was NOT
    // wrong — it read *"Selections close AT the boundary: the bet is on the price at that
    // instant, so a later entry would be betting on a move that has already happened."* That
    // is exactly what happened, and it was a design choice nobody had examined rather than a
    // contradiction. What it missed is the move that has already happened WITHIN the round:
    // the board shows the live price and both frozen targets, so a player could watch the
    // price cross a target and stake with about a second of risk.
    //
    // ⛔ The lead is a PROPORTION, not a constant, and shared with both consoles and the card
    // via `updown-durations.ts` — a fixed 30s is a sixth of a 3-minute round but 3% of a
    // 15-minute one and 0.8% of an hour, so it would leave every long duration open.
    selectionClosedAt: selectionClosesAt(closeIso, chain.durationMinutes),
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
      note: settlementNote(outcome, finalVoidReason, round.openObservationId, closeObservationId),
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
 * What the COMPLIANCE record SAYS happened — matched to what actually happened.
 *
 * ⛔ E-29. This was a single fixed string, written on every terminal round:
 *
 *     "Resolved against two immutable price observations bounded to the same grid
 *      instants the round was opened and closed on…"
 *
 * Measured on production 2026-08-01: **1,397 of 1,397** rows carrying that sentence have
 * `openObservationId: null` AND `closeObservationId: null`, and **every one is a VOID**
 * (1,392 `operator`, 5 `source-failed`). Not one round in the platform's history has ever
 * resolved against two observations — so the note has been false 100% of the times it has
 * been written, and it is *most* false exactly where it matters: a `source-failed` void
 * means no reading could be confirmed, and the note claims two were.
 *
 * This is the defect class this platform keeps finding (D-2, E-2, E-6, E-8, E-9): **a
 * compliance-facing record describing evidence we do not have.** It is worse here than on
 * a screen, because `AuditLog` is append-only, HMAC-chained and kept for the 7-year AML
 * window — a false sentence written into it cannot be corrected, only out-lived.
 *
 * ⚠️ THE 1,397 EXISTING ROWS CANNOT BE FIXED. They are chained; rewriting one forks
 * verification. The fix is forward-only, and `docs/LIVE-QA-CAMPAIGN.md` §6n records that
 * plainly so nobody reading the historical rows is misled by them.
 *
 * The note must be derivable from the row's own fields, so it can never again drift from
 * them — every branch below is decided by `outcome`/`voidReason`/the observation ids that
 * sit in the same payload.
 */
export function settlementNote(
  outcome: RoundOutcome,
  voidReason: string | null,
  openObservationId: string | null,
  closeObservationId: string | null,
): string {
  const TERMS =
    " Settlement is immediate (owner decision 2026-07-24); the standing-objection freeze, " +
    "the winner floor and exact conservation are unchanged.";

  if (outcome !== "VOID") {
    // The only branch entitled to the original sentence — and it now states the condition
    // it asserts rather than assuming it.
    return (
      "Resolved against two immutable price observations bounded to the same grid instants " +
      "the round was opened and closed on." + TERMS
    );
  }

  const refunded = " Every stake is refunded in full.";
  switch (voidReason) {
    case "no-move":
      return (
        "VOID — both boundary prices were confirmed and the move did not clear the round's " +
        "frozen margin, so there is no winning side." + refunded + TERMS
      );
    case "source-failed":
      return (
        "VOID — no confirmed price reading could be obtained for this round's boundary " +
        "within the allowed attempts, so there is no basis on which to decide it. No price " +
        "was observed and none is claimed." + refunded + TERMS
      );
    case "source-mismatch":
      return (
        "VOID — the reading that bounded this round cited a source this round did not pin " +
        "when it opened, so it is not evidence about these terms." + refunded + TERMS
      );
    case "operator":
      return (
        "VOID — closed by an operator before settlement, not by a price reading. The " +
        "accompanying `updown.round.void_operator` entry names the officer and carries the " +
        "reason they typed." + refunded + TERMS
      );
    default:
      // An unrecognised reason must not silently inherit a confident sentence.
      return (
        `VOID — ${voidReason ? `reason "${voidReason}"` : "no reason was recorded"}. ` +
        `Observations at close: open=${openObservationId ?? "none"}, ` +
        `close=${closeObservationId ?? "none"}.` + refunded + TERMS
      );
  }
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

  // ── ⭐ E-63 · THE OPEN-SIDE BACKFILL — the seal on a dormant gap ────────────
  //
  // `decideOutcome`/`decideOutcomeByTargets` return `source-failed` when the ROUND's own
  // `openPrice` is null — not when an observation is missing. On production that voided
  // 199 of 201 SOL rounds while a CONFIRMED observation for each round's own `opensAt`
  // sat in the ledger: the price the round needed was in the database, confirmed, and the
  // round refunded for want of it. The PRODUCING path is closed (E-83: `advanceChain`
  // refuses to open a priceless round; `generateRoundNow` always has; the 176 legacy rows
  // were cascade-deleted) — so this branch is the guarantee that if the shape EVER appears
  // again (a new caller, a restore, a regression), the healer gives the round the open it
  // already paid for instead of voiding it.
  //
  // Stamp price + observation + the targets computed at the round's OWN frozen `marginBps`
  // — never live config, so retuning a band cannot reprice a round already carrying
  // stakes. A null-open round with NO confirmed open observation is left exactly as it
  // was: it voids `source-failed` below and every stake is refunded in full. The close
  // path's source-pinning check covers the backfilled observation too, because the id is
  // stamped onto the row the same as an on-time open.
  let subject = round;
  if (subject.openPrice == null) {
    const openObs = await observationStore.find(asset.id, subject.opensAt);
    if (openObs?.state === "CONFIRMED" && openObs.price != null) {
      const targets = subject.marginBps != null ? computeTargets(openObs.price, subject.marginBps, asset) : null;
      // Claim-the-row (`WHERE openPrice IS NULL`), not `patch` — the frozen line is
      // create-only everywhere else and stays that way; losing the claim means another
      // instance already stamped it, and their write stands.
      const claimed = await roundStore.backfillOpen(subject.id, {
        openPrice: openObs.price,
        openObservationId: openObs.id,
        upTarget: targets?.upTarget ?? null,
        downTarget: targets?.downTarget ?? null,
      });
      subject = (await roundStore.get(subject.id)) ?? subject;
      if (claimed) {
        // Provenance, not decoration: targets appearing on a live round after open is a
        // money-relevant stamp change and must be answerable from the compliance record.
        // A distinct action (not `updown.round.healed`) because no verdict is being made
        // here — the round goes on to resolve or void through the ordinary paths below.
        audit({
          category: "COMPLIANCE",
          action: "updown.round.open_backfilled",
          actorId: "system_updown_healer",
          targetType: "UpDownRound",
          targetId: subject.id,
          payload: {
            chainId: subject.chainId, marketId: subject.marketId, roundNumber: subject.roundNumber,
            opensAt: subject.opensAt, boundaryAt: subject.boundaryAt,
            openPrice: openObs.price, openObservationId: openObs.id,
            upTarget: subject.upTarget, downTarget: subject.downTarget, marginBps: subject.marginBps,
            note:
              "The round was open without an open price while a confirmed observation existed " +
              "at its own open boundary. The healer stamped the price the round had already " +
              "paid for; the verdict still comes from the ordinary close path.",
          },
        });
      }
    }
  }

  const elapsedSec = Math.round((now - Date.parse(subject.boundaryAt)) / 1000);
  const observation = await observationStore.find(asset.id, subject.boundaryAt);

  // ── PAST THE DEADLINE ──────────────────────────────────────────────────────
  if (now - Date.parse(subject.boundaryAt) >= deadlineMs) {
    // ⭐ THE LATE CLOSE, AND IT IS THE WHOLE POINT OF THE SETTLEMENT REBUILD.
    //
    // This branch used to void WITHOUT RE-READING, on a premise that was true and has
    // stopped being so: *"any reading now would exceed the staleness contract"*. That holds
    // for a quote feed — a quote answers "the price NOW", so a reading taken 529 seconds
    // late describes a 529-seconds-late instant and cannot honestly settle the boundary.
    // It is exactly why E-69's round resolved with `closePrice NULL` while the source never
    // failed: nothing was wrong except that nobody performed the close in time.
    //
    // A DATED feed answers about a NAMED INSTANT, so the reading a late close gets is
    // byte-identical to the one an on-time close would have got, and the staleness gate is
    // satisfied by construction (the bar's own label IS the boundary). Voiding here would
    // refund a round the market decided perfectly clearly.
    //
    // ⛔ The decision is read from the PROVIDER'S OWN `dated` flag via `lateCloseDecision`,
    // never hardcoded, so a future dated provider cannot be left behind by this rule. And it
    // is BOUNDED — beyond `maxSettleLookbackSeconds` the round still voids and refunds, so
    // the standing invariant that every stake reaches a terminal state is untouched.
    const decision = lateCloseDecision(findProvider(cfg.feedProvider), elapsedSec, cfg);
    if (decision.reread && (!observation || observation.state === "PENDING")) {
      // `pastDeadline` skips the backoff (the deadline has already elapsed — there is
      // nothing left to wait for) and the attempt budget (which rations reads that CANNOT
      // succeed; this one can). It cannot revive a FAILED observation: the ledger is
      // write-once per (assetId, boundaryAt) and that guarantee is not being relaxed.
      const late = await acquireObservation(asset, subject.boundaryAt, now, { pastDeadline: true });
      if (late.state === "confirmed") {
        auditHealed(subject, "resolved", {
          detail: `settled from a dated reading ${elapsedSec}s after the boundary — a late close is no longer a void`,
          lateBySeconds: elapsedSec, observationId: late.id, price: late.price,
        });
        return (await finishRound(subject, late.id, late.price, "source-failed", `dated reading applied ${elapsedSec}s late`, now)) ? "resolved" : "failed";
      }
      // Fall through and void — but with the reason the reader actually gave, not a
      // manufactured one. `no-bar` past the grace, an implausible print, or a shut market
      // are all honest endings; "we did not bother to look" is not.
    }
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
      return (await finishRound(subject, fresh.id, fresh.price, "source-failed", `late confirmation, ${elapsedSec}s after the boundary`, now)) ? "resolved" : "failed";
    }
    return (await finishRound(subject, observation?.id ?? null, null, "source-failed", `no confirmed reading ${elapsedSec}s after the boundary`, now)) ? "voided" : "failed";
  }

  // ── INSIDE THE WINDOW: run the ladder that has never run ───────────────────
  if (observation?.state === "CONFIRMED" && observation.price != null) {
    return (await finishRound(subject, observation.id, observation.price, "source-failed", "confirmed reading applied by the healer", now)) ? "resolved" : "failed";
  }
  if (observation?.state === "FAILED") {
    return (await finishRound(subject, observation.id, null, "source-failed", observation.failReason ?? "boundary failed", now)) ? "voided" : "failed";
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
  const acquired = await acquireObservation(asset, subject.boundaryAt, now);
  if (acquired.state === "confirmed") {
    return (await finishRound(subject, acquired.id, acquired.price, "source-failed", "confirmed on a ladder retry", now)) ? "resolved" : "failed";
  }
  if (acquired.state === "failed") {
    return (await finishRound(subject, acquired.id, null, "source-failed", acquired.detail, now)) ? "voided" : "failed";
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
  // ⛔ E-68 · THE OVERRIDE APPLIES ONLY WHEN THERE IS NO PRICE.
  //
  // Every caller here passed `"source-failed"` unconditionally, including the two that hold a
  // REAL CONFIRMED PRICE (the late confirmation, and the healer applying a reading inside the
  // window). `closeRound` treats an explicit reason as authoritative — it has to, so an
  // officer's "operator" void is not relabelled as a feed failure — so a perfectly good close
  // that simply landed BETWEEN the targets was stamped `source-failed` instead of `no-move`.
  //
  // Measured on production, two rounds generated by hand this session:
  //   udr_cd386bbaeaf63be696f5  open 63,719.98  close 63,722.47  band 63,707.24–63,732.72
  //   udr_17e07a91ecf526c2ae17  open 63,716.56  close 63,710.73  band 63,703.82–63,729.30
  // Both closes sit strictly inside the band — `no-move`, plainly — and both rows say
  // `source-failed`, so the player was shown *"The closing price could not be confirmed"*
  // about a price sitting in the same database row. A false statement about their own money,
  // on the screen they check after a refund (the E-39 / E-65 family).
  //
  // ⚠️ It also made the void-rate metric lie: `source-failed` is the number an operator reads
  // as "the feed is broken", and E-63 was diagnosed against exactly that column.
  //
  // With a price present the arithmetic already knows the truth — `no-move` for an in-band
  // close, or UP/DOWN, in which case there is no void reason at all. Let it speak.
  const reason = closePrice == null ? voidReason : undefined;
  const r = await closeRound(round.id, closeObservationId, closePrice, reason);
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
        "Closed by the Up & Down self-healer. A round that cannot confirm a price VOIDs " +
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
export async function advanceChain(
  chainId: string,
  /**
   * ⭐ THE CLOCK IS INJECTED, NEVER PATCHED — the same shape `healStuckRounds({ now })` uses,
   * and for the same reason. The two branches that decline to advance are decided by a
   * CALENDAR (is this instant inside a closed session?) and by a DEADLINE (how old is this
   * boundary?), so a suite that cannot move `now` can only test whichever case the day it
   * runs on happens to produce — and `updown-heal.test.mts` already records what that costs:
   * *"a suite whose verdict depends on the day it runs is a suite that lies."*
   * ⛔ Production never passes it. The scheduler calls `advanceChain(id)` and gets `Date.now()`.
   */
  opts?: { now?: number },
): Promise<{
  observation: "confirmed" | "pending" | "failed" | "skipped";
  closed: RoundOutcome | null;
  opened: boolean;
  detail?: string;
  /**
   * ⛔ HOW LONG BEFORE FIRING THIS CHAIN AGAIN COULD ACHIEVE ANYTHING — set only on the branch
   * that deliberately leaves `nextBoundaryAt` where it found it, which is the branch that made
   * the scheduler spin. Absent everywhere else, because everywhere else the boundary moved and
   * the timer derives its own delay from it. See `REFIRE_FLOOR_MS` in `updown-scheduler.ts`.
   */
  retryAfterMs?: number;
}> {
  const now = opts?.now ?? Date.now();
  const chain = await chainStore.get(chainId);
  if (!chain || chain.state !== "RUNNING") return { observation: "skipped", closed: null, opened: false, detail: "chain not running" };
  const asset = await assetStore.get(chain.assetId);
  if (!asset || !asset.enabled) return { observation: "skipped", closed: null, opened: false, detail: "asset missing or disabled" };

  const anchorMs = Date.parse(chain.gridAnchorAt);
  const boundaryIso = chain.nextBoundaryAt ?? new Date(boundaryAfter(anchorMs, chain.durationMinutes, now)).toISOString();

  // 1 · The shared reading for this instant.
  const obs = await acquireObservation(asset, boundaryIso, now);

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
  //
  // ⛔ E-36 · DO NOT OPEN A ROUND INTO A CLOSED MARKET. `readPrice` already refuses to
  // settle one (that is the money guarantee), but a round opened anyway would take real
  // stakes, show a live countdown, and then void — every round, all weekend. Refusing to
  // open it is the difference between "the game is closed right now" and "the game is
  // broken", and those two look identical in a round history full of VOIDs, which is the
  // whole lesson of E-16/E-25/E-32. Nothing is stranded: no round means no stake.
  let opened = false;
  const latest = await roundStore.latestForChain(chain.id);
  const alreadyOpen = latest && latest.opensAt === boundaryIso;
  const openSession = marketSessionAt(asset.category, boundaryIso, await deadHoursFor(asset.symbol));
  if (!openSession.open) {
    // ⛔ RE-ARM BEFORE RETURNING, OR THE CHAIN DEADLOCKS ON THIS BOUNDARY FOREVER.
    //
    // 🔴 Measured on production 2026-08-14 (`docs/FINDING-GOLD-CHAINS-STALLED.md`): all three
    // XAU chains read `RUNNING` and had opened NO round for 19.9 hours / 3.8 days. Without
    // this line the return below leaves `nextBoundaryAt` pinned at a boundary INSIDE the
    // closed session, and every later tick re-evaluates the gate at that same stale instant —
    // never at now — so the chain can never reopen. A deadlock by construction, not a race,
    // and immune only for crypto (`sessionKindFor` → "always"), which never reaches here.
    //
    // ⛔ FROM `max(boundaryIso, now)`, NOT FROM `now`. All weekend a gold chain sits pinned to
    // a boundary that is still in the FUTURE and already shut; `boundaryAfter(…, now)` alone
    // would rewind it to a boundary BEFORE the one it was holding, and a rewound chain can
    // re-open a boundary it has already passed. Taking the later of the two is what makes the
    // re-arm strictly forward on both sides of the boundary. §5 of `test:updown-rearm`.
    //
    // ⚠️ If the next boundary is ALSO inside the closed session, arming it and waiting is the
    // correct outcome — it costs one tick per boundary until the market reopens, which is what
    // the scheduler's timer is for. What must never happen is a patch that writes back the
    // value it read: that reproduces the deadlock while looking busy, so the equality check is
    // load-bearing rather than defensive. Same shape as the abandon branch above.
    const fromMs = Math.max(Date.parse(boundaryIso), now);
    const skipTo = new Date(boundaryAfter(anchorMs, chain.durationMinutes, fromMs)).toISOString();
    if (skipTo !== boundaryIso) await chainStore.patch(chain.id, { nextBoundaryAt: skipTo });
    return {
      observation: obs.state, closed, opened: false,
      detail: describeClosure(openSession),
    };
  }
  if (!alreadyOpen) {
    // 🔴 NEVER OPEN A ROUND WITHOUT AN OPEN PRICE. This used to pass `null` through when the
    // reading was not confirmed, and `generateRoundNow`'s own refusal message says exactly why
    // that is fatal: *"a round opened without an open price cannot resolve: it would take
    // stakes, show a countdown, and then void and refund every one."* The manual path was
    // fixed for this; THIS path was not, and on production it voided **175 consecutive rounds**
    // over eleven hours with `source-failed` while the price data was available the whole time.
    //
    // ⭐ The cause is timing, not the feed. `advanceChain` fires AT the boundary and asks for
    // the bar labelled with that same instant — and a bar labelled T does not exist until
    // ~+19s (BTC/ETH/XAU) or ~+87s (SOL), measured on the live plan 2026-08-05. So at the
    // moment of the tick the reading is legitimately `pending`, every single time.
    //
    // So we do NOT open, and we do NOT re-arm — the same boundary is retried on the next tick,
    // by which point the bar has landed. That is the same retry promise step 2 already makes
    // for the close, and the reason the re-arm below had to move inside this branch.
    if (obs.state !== "confirmed") {
      const ageMs = now - Date.parse(boundaryIso);
      // ⛔ BUT BOUNDED. If a boundary can never be priced, grinding on it forever would stop
      // the chain producing anything at all — a silent outage. Past the same deadline the
      // close side uses, give up on this boundary and re-arm to the next one at or after now,
      // rather than walking the whole backlog one span at a time.
      // ⛔ The SAME deadline the close side abandons on — two different numbers for "we gave
      // up waiting for this boundary" is exactly the drift this file keeps paying for.
      const abandonMs = abandonAfterSeconds(await getUpDownConfig()) * 1000;
      if (ageMs > abandonMs) {
        const skipTo = new Date(boundaryAfter(anchorMs, chain.durationMinutes, now)).toISOString();
        await chainStore.patch(chain.id, { nextBoundaryAt: skipTo });
        return {
          observation: obs.state, closed, opened: false,
          detail: `no open price for ${boundaryIso} after ${Math.round(ageMs / 1000)}s — boundary abandoned, next ${skipTo}`,
        };
      }
      // ⛔ TELL THE CALLER WHEN TO COME BACK, OR IT COMES BACK IMMEDIATELY — 450 times per
      // boundary, measured on production 2026-08-14 (see `REFIRE_FLOOR_MS` in
      // `updown-scheduler.ts`). This branch is the one that must NOT move the boundary, so it
      // is the one that owes the scheduler a delay.
      //
      // Two bounds, and both are load-bearing:
      //   · the LADDER, because until the next read is allowed every call returns this same
      //     line from the same row — `obs.retryAfterMs`, published by the one function that
      //     climbs the ladder, so the two cannot drift;
      //   · the DEADLINE, because when the ladder outlasts it the next useful act is to
      //     ABANDON the boundary, and sleeping past that would strand the round waiting.
      // ⚠️ A FAILED reading is terminal — no rung will ever change it — so for that one only
      // the deadline is left.
      const toDeadlineMs = abandonMs - ageMs + 1;
      const ladderMs = obs.state === "failed" ? Number.POSITIVE_INFINITY : (obs.retryAfterMs ?? 0);
      return {
        observation: obs.state, closed, opened: false,
        detail: `open price for ${boundaryIso} not published yet (${Math.round(ageMs / 1000)}s) — not opening a round that could only void; will retry this boundary`,
        retryAfterMs: Math.max(0, Math.min(ladderMs, toDeadlineMs)),
      };
    }
    const o = await openRound(chain, boundaryIso, obs.id, obs.price);
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
