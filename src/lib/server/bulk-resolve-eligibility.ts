/**
 * ⭐ WHY A MARKET IS STILL SITTING IN THE RESOLVER QUEUE — the one answer, computed once,
 * rendered on the row AND enforced by the bulk action.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * 🔴 THE DEFECT THIS EXISTS TO CLOSE, MEASURED ON PRODUCTION 2026-08-28.
 *
 * Ali: *"the AI auto-resolver is not working — auto-resolve is on and confidence is 90%+."*
 * Read-only on the live database: **17 markets CLOSED, 16 carrying a sentinel verdict, 12 at
 * confidence ≥ 90 — and the AI cited the market's approved source on ZERO of them.**
 * `resolutionMode` is `auto`, `resolveConfidenceThreshold` is `90`.
 *
 * | conf | approved source | host the AI actually cited |
 * |---|---|---|
 * | 99 / 95 | premierleague.com | espn.com |
 * | 98 | premierleague.com | worldfootball.net |
 * | 97 ×2 | premierleague.com | skysports.com |
 * | 97 | premierleague.com | nbcsports.com |
 * | 95 | premierleague.com | mancity.com |
 * | 92 | premierleague.com | washingtonpost.com |
 * | 91 | premierleague.com | vavel.com |
 *
 * ⭐ **THE AUTO-RESOLVER IS WORKING EXACTLY AS DESIGNED AND IS REFUSING, CORRECTLY.**
 * `decideAutoResolve` ANDs `sourceMatches` into `confident`, so confidence is irrelevant
 * when the citation does not match. Its own docstring says why: in auto mode there is no
 * officer in the path — the assessment stamps RESOLVED and the settle timer pays — so a
 * wrong or invented citation is the only thing between the model and a sealed real-money
 * outcome. `system_auto_resolver` has sealed markets before; the path is live, not dead.
 *
 * ⛔ **THE DEFECT IS ONE LAYER DOWNSTREAM: THE QUEUE NEVER SAID SO.** The page rendered
 * "99% confidence" beside a `SentinelSourceChip` reading *"not the approved source"* — a
 * chip that reads as an advisory, on a page with no statement anywhere that this is WHY
 * nothing auto-sealed. The operator saw a high number and silence. A control that refuses
 * without saying it refused is indistinguishable, from the outside, from a control that is
 * broken. That is the whole finding, and this module is the fix.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * ⛔ IT CALLS `decideAutoResolve`. IT DOES NOT RESTATE IT.
 *
 * The floor is six conjuncts and they live in ONE function. This module asks that function
 * for the answer and then — separately, and ONLY to name a reason for a human — re-tests
 * each conjunct. Those two paths can drift, so they are checked against each other on every
 * call (`agrees` below) and the disagreement fails CLOSED. `test:bulk-resolve` drives the
 * full 2^6 input matrix through both and asserts they never disagree; `red:bulk-resolve`
 * proves the guard goes red when the call is replaced by an inline copy.
 *
 * ⛔ PURE. No `await`, no `marketStore`, no Prisma, no config read — exactly the seam
 * `decideAutoResolve` is documented as keeping, and the reason both are exhaustively
 * unit-testable without a network or a database. The caller does the async work and hands
 * the results in.
 */
import { decideAutoResolve, type StoredMarket } from "./market-service";
import type { SentinelResult } from "./market-sentinel";

/**
 * Why a row cannot be sealed as it stands.
 *
 * TWO FAMILIES, and the split is load-bearing rather than tidiness:
 *
 *   · **ROW STATE** — this row cannot be acted on by THIS officer at this moment,
 *     whatever the AI said. Nothing about the assessment can change these.
 *   · **THE AUTO-RESOLVE FLOOR** — the row is actionable, but the platform's own
 *     `decideAutoResolve` would refuse to seal it unattended. These are the ones an
 *     officer may override, because an officer IS the thing the floor is standing in for.
 *
 * ⛔ The order of this union IS the headline precedence (`REASON_ORDER` below asserts it).
 * A row failing several clauses leads with the first; `all` carries every one, so nothing
 * is hidden behind the headline.
 */
export type BulkBlockReason =
  // ── row state ────────────────────────────────────────────────────────────────
  /** Already RESOLVED or VOIDED. The verdict is sealed; there is nothing to do. */
  | "already-resolved"
  /**
   * ⛔ TWO-ADMIN AUTHORIZATION IS ON AND THIS ROW ALREADY CARRIES A STAGE-1 VERDICT. THE
   * BULK BAR REFUSES IT OUTRIGHT — for EITHER officer — AND THAT IS THE WHOLE POINT.
   *
   * A stage-2 countersignature is not a bulk act. Three things go wrong the moment you
   * treat it as one, and all three were found by attacking this file:
   *   · stage-1 may have staged **VOID**, which the AI's YES/NO vocabulary cannot express —
   *     so a bulk confirm would offer the AI's outcome over the officer's actual decision;
   *   · the auto-resolve floor is a question about whether the AI's READ can stand in for a
   *     human. At stage 2 a human has already decided, so gating the countersignature on the
   *     AI's read judges the wrong thing — and its override row would be indistinguishable
   *     from a genuine floor override in the audit chain;
   *   · countersigning in bulk is exactly the rubber stamp the two-officer rule exists to
   *     prevent (POCA §16).
   * So the row says so and points at the ceremony, where the officer sees the evidence.
   */
  | "awaiting-countersignature"
  /** Betting is still open on this market. Sealing it stops selections mid-flight. */
  | "still-live"
  /** A resolve check is running right now (`resolveClaimedAt` inside its TTL). */
  | "claimed-elsewhere"
  // ── the auto-resolve floor (decideAutoResolve) ───────────────────────────────
  /** No usable AI read is recorded against this market at all. */
  | "no-assessment"
  /** The AI returned no concrete YES/NO. */
  | "outcome-unknown"
  /** The AI said the outcome is NOT yet irreversibly locked. */
  | "not-determined"
  /** ⚠️ Assessed before `sentinelDetermined` was persisted, so the flag is UNKNOWN —
   *  not false. Refused because unknown fails closed; ⛔ never reported as an AI
   *  refusal, which would be a statement the database cannot support (A-5). */
  | "determined-not-recorded"
  /** The AI cited no source URL at all. */
  | "source-none-cited"
  /** 🔴 THE ONE ON PRODUCTION TODAY, 12 TIMES. The AI read a different site from the
   *  market's approved source. */
  | "source-different-domain"
  /** The market names no approved source, and the cited host is not in the trusted-
   *  source registry for its category either — so nothing vouches for the citation. */
  | "source-untrusted"
  /** No real evidence excerpt behind the call (guards a hallucinated "determined"). */
  | "thin-evidence"
  /** Confidence below the configured floor. */
  | "below-threshold"
  /** ⛔ The two independent readings of the floor disagreed. Cannot happen; if it ever
   *  does, the row is refused rather than sealed. See `agrees` below. */
  | "internal-disagreement";

/**
 * The headline precedence. ⛔ Must list every `BulkBlockReason` exactly once — asserted.
 *
 * ⭐ `determined-not-recorded` IS LAST, AND PUTTING IT ANYWHERE ELSE DEFEATS THE FEATURE.
 * The column is added with no default and no backfill, so on deploy day EVERY row in the
 * queue holds NULL — all 17 on production. An earlier draft ranked it above the source
 * reasons, which meant all 16 rows carrying a verdict would have chipped *"Assessed before
 * this platform recorded the locked flag"* and NOT ONE would have said *"the AI read
 * espn.com, this market approves premierleague.com"* — the exact sentence this whole change
 * exists to put on the screen. A migration artifact is the least informative thing a row can
 * say about itself, so it goes last and every real diagnosis outranks it.
 */
export const REASON_ORDER: readonly BulkBlockReason[] = [
  "internal-disagreement",
  "already-resolved",
  "awaiting-countersignature",
  "still-live",
  "claimed-elsewhere",
  "no-assessment",
  "outcome-unknown",
  "not-determined",
  "source-none-cited",
  "source-different-domain",
  "source-untrusted",
  "thin-evidence",
  "below-threshold",
  "determined-not-recorded",
] as const;

/** Reasons that describe the ROW, not the assessment. ⛔ Must partition `REASON_ORDER`
 *  with the floor reasons — asserted by `test:bulk-resolve`, because a floor reason that
 *  leaked in here would be silently excluded from the agreement check above and the two
 *  readings could then diverge unnoticed. */
export const ROW_STATE: ReadonlySet<BulkBlockReason> = new Set<BulkBlockReason>([
  "internal-disagreement",
  "already-resolved",
  "awaiting-countersignature",
  "still-live",
  "claimed-elsewhere",
]);

/**
 * Reasons an officer may override with a typed justification.
 *
 * ⛔ EXACTLY THE FLOOR REASONS — `OVERRIDABLE` and `ROW_STATE` are DISJOINT and together
 * they are `REASON_ORDER` (asserted in `test:bulk-resolve`). No typed justification makes
 * a market that is already sealed sealable again, none makes an officer their own second
 * officer, and none makes a running AI check finish sooner.
 *
 * ⭐ `still-live` IS ROW STATE AND IS DELIBERATELY NOT OVERRIDABLE IN BULK, and the
 * distinction is the point rather than an omission. Every other block here is *"the AI's
 * read is not good enough to seal unattended"*, and an officer overriding it is supplying
 * exactly the judgement the floor is standing in for. Sealing a market whose betting is
 * still OPEN is a different act — it stops selections mid-flight on a market players are
 * still staking into — and it already has a control: the market's own card, one at a time,
 * with its pool and its close time in front of you. Widening a bulk button to cover it
 * would be a new money path smuggled in behind a convenience feature.
 */
export const OVERRIDABLE: ReadonlySet<BulkBlockReason> = new Set<BulkBlockReason>([
  "no-assessment",
  "outcome-unknown",
  "not-determined",
  "determined-not-recorded",
  "source-none-cited",
  "source-different-domain",
  "source-untrusted",
  "thin-evidence",
  "below-threshold",
]);

export type BulkVerdict = {
  /** May the bulk action seal this row with NO override? */
  eligible: boolean;
  /** The outcome that would be sealed. Null when there is none to seal — and a null
   *  here is a hard stop even under override: `resolveMarket` does NOT re-validate the
   *  outcome string, and an invalid one marks the market RESOLVED with no winners and
   *  locks every stake permanently (`app/markets/actions.ts` learned this the hard way). */
  outcome: "YES" | "NO" | null;
  /** The headline reason, or null when eligible. */
  reason: BulkBlockReason | null;
  /** EVERY failing clause, in `REASON_ORDER`. The badge leads with `reason` and carries
   *  this in its title, so a row blocked on two things does not hide one of them. */
  all: BulkBlockReason[];
  /** May an officer seal it anyway with a typed reason? False for row-state blocks. */
  overridable: boolean;
  /** `seal` = single-admin, one action. `stage1` = two-admin, this STAGES a verdict a
   *  DIFFERENT officer must then countersign on the market's own card. ⛔ There is no
   *  `stage2`: a countersignature is never a bulk act. */
  stage: "seal" | "stage1";
  /** For copy only — ⛔ NEVER for eligibility. See the note on `floorMode` below. */
  modeIsAuto: boolean;
  confidence: number | null;
  /** Hosts, already parsed, so the row does not re-parse a URL in the client. */
  citedHost: string | null;
  approvedHost: string | null;
};

/** The stored columns this verdict reads. Named explicitly so a caller cannot pass a
 *  half-built object and get a confident answer about a market it does not describe. */
export type VerdictMarket = Pick<
  StoredMarket,
  | "id" | "status" | "sourceUrl" | "resolutionStage1By" | "resolveClaimedAt"
  | "sentinelOutcome" | "sentinelConfidence" | "sentinelEvidence" | "sentinelSourceUrl"
  | "sentinelDetermined"
> & { resolvedOutcome?: StoredMarket["resolvedOutcome"] };

/** Same TTL `resolveDueMarket` uses for its claim stamp. ⛔ Kept in step by
 *  `test:bulk-resolve`, which asserts the two constants are equal — a claim the queue
 *  calls stale while the engine still honours it is a row that refuses forever with no
 *  explanation, which is this whole module's own failure mode restated. */
export const RESOLVE_CLAIM_TTL_MS = 10 * 60_000;

/** Hostname or null. ⛔ Never throws — a market can carry a malformed source URL and a
 *  crashing queue is worse than an unnamed host. */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Rebuild the sentinel's answer from the columns the row actually holds.
 *
 * ⛔ NOTHING IS INVENTED HERE. `determined` comes from `sentinelDetermined` and is `true`
 * ONLY when the column literally holds `true`; NULL (never recorded) and `false` both
 * produce `false`, and the caller tells them apart from the column itself, not from this.
 * `action` is `"assessed"` only when there is a concrete outcome to assess.
 */
export function storedAssessment(m: VerdictMarket): SentinelResult | null {
  if (!m.sentinelOutcome && m.sentinelConfidence == null && !m.sentinelEvidence) return null;
  return {
    marketId: m.id,
    title: "",
    determined: m.sentinelDetermined === true,
    outcome: m.sentinelOutcome === "YES" || m.sentinelOutcome === "NO" ? m.sentinelOutcome : "UNKNOWN",
    confidence: m.sentinelConfidence ?? 0,
    evidence: m.sentinelEvidence ?? "",
    reasoning: undefined,
    sourceUrl: m.sentinelSourceUrl ?? undefined,
    action: "assessed",
  };
}

/**
 * THE VERDICT.
 *
 * @param sourceMatches computed by the CALLER — it needs the trusted-source registry and
 *   the market row, and this stays pure. ⛔ It must reproduce BOTH arms of
 *   `resolveDueMarket`'s own computation: a `match` against the market's approved source,
 *   OR — only when the market names no approved source — a hit in the registry for its
 *   category. A caller that renders only `sentinelSourceVerdict` shows "no approved
 *   source" on a row the engine considers fully matched, and the badge contradicts the gate.
 * @param officerId whose queue this is — decides whether a staged row is theirs to confirm.
 */
export function bulkVerdictFor(args: {
  market: VerdictMarket;
  /** The market's EFFECTIVE resolution mode. ⛔ Copy only — see below. */
  mode: "human" | "auto";
  threshold: number;
  sourceMatches: boolean;
  requireTwoOfficer: boolean;
  officerId: string | null;
  now?: number;
}): BulkVerdict {
  const { market: m, mode, threshold, sourceMatches, requireTwoOfficer, officerId } = args;
  const now = args.now ?? Date.now();
  const a = storedAssessment(m);
  const citedHost = hostOf(m.sentinelSourceUrl);
  const approvedHost = hostOf(m.sourceUrl);

  /**
   * ⭐ THE FLOOR IS ASKED IN `auto` MODE, DELIBERATELY, AND ELIGIBILITY READS `confident`
   * — NEVER `goAuto`.
   *
   * `decideAutoResolve` returns `goAuto = mode === "auto" && confident`. `goAuto` answers
   * *"should the machine seal this with nobody watching?"*. That is not the question a
   * bulk bar asks: an officer is pressing the button, so they ARE the human the mode
   * switch is about. Keying the bar on `goAuto` would make every row unsealable the
   * moment an operator flips resolution back to `human` — a feature dead on arrival,
   * certified green by every fixture that happens to set `mode: "auto"`.
   *
   * Passing `"auto"` here also buys a free identity: under it `goAuto === confident`, so
   * the two returned booleans must agree, and `agrees` below checks that they do.
   */
  const floor = decideAutoResolve({ assessment: a, mode: "auto", threshold, sourceMatches });

  const all: BulkBlockReason[] = [];
  const add = (r: BulkBlockReason) => { if (!all.includes(r)) all.push(r); };

  // ── ROW STATE ────────────────────────────────────────────────────────────────
  const sealed = m.status === "RESOLVED" || m.status === "VOIDED";
  if (sealed) add("already-resolved");
  // ⛔ EITHER OFFICER, NOT JUST THE ONE WHO STAGED IT. A stage-2 countersignature is never
  // a bulk act — see `awaiting-countersignature`. `officerId` is still taken, because the
  // COPY differs (you staged this one / another officer did) even though the refusal does not.
  const staged = requireTwoOfficer && !!m.resolutionStage1By;
  const stagedByMe = staged && m.resolutionStage1By === officerId;
  if (staged) add("awaiting-countersignature");
  if (!sealed && m.status === "LIVE") add("still-live");
  const claimedAt = m.resolveClaimedAt ? Date.parse(m.resolveClaimedAt) : NaN;
  if (Number.isFinite(claimedAt) && now - claimedAt < RESOLVE_CLAIM_TTL_MS) add("claimed-elsewhere");

  // ── THE FLOOR, RE-TESTED ONLY TO NAME A REASON ───────────────────────────────
  // ⛔ This block decides NOTHING. `floor.confident` above is the decision; every line
  // here exists to turn a boolean into a sentence an officer can act on. If the two ever
  // disagree, `agrees` refuses the row.
  if (!a) {
    add("no-assessment");
  } else {
    if (a.outcome !== "YES" && a.outcome !== "NO") add("outcome-unknown");
    // The two ways `determined` fails, kept apart because they are different facts about
    // the world: the AI said no, versus nobody wrote the answer down.
    if (m.sentinelDetermined === false) add("not-determined");
    else if (m.sentinelDetermined == null) add("determined-not-recorded");
    if (!sourceMatches) {
      if (!m.sentinelSourceUrl) add("source-none-cited");
      else if (approvedHost) add("source-different-domain");
      else add("source-untrusted");
    }
    if (!a.evidence || a.evidence.trim().length < 10) add("thin-evidence");
    if (a.confidence < threshold) add("below-threshold");
  }

  const rowStateBlocked = sealed || staged || (!sealed && m.status === "LIVE")
    || (Number.isFinite(claimedAt) && now - claimedAt < RESOLVE_CLAIM_TTL_MS);

  /**
   * ⛔ THE TWO READINGS MUST AGREE, AND A DISAGREEMENT IS REFUSED.
   *
   * `floor.confident` is the engine's answer. `floorReasons.length === 0` is this file's
   * account of it. They are computed from the same inputs by different code, which is the
   * whole point — and it is also exactly how a second copy of a money rule gets in. So
   * they are compared on every call, and a mismatch produces `internal-disagreement`,
   * which is not overridable. Failing closed costs a delay; failing open seals a market.
   */
  const floorReasons = all.filter((r) => !ROW_STATE.has(r));
  const agrees = floor.confident === (floorReasons.length === 0);
  if (!agrees) add("internal-disagreement");

  const eligible = agrees && floor.confident && !rowStateBlocked;

  const ordered = REASON_ORDER.filter((r) => all.includes(r));
  // ⛔ ONLY TWO STAGES REACH THE BULK BAR. A staged row is refused above, so `stage2` is
  // not a state this verdict can be in — and the outcome below is therefore ALWAYS the
  // AI's, never a staged one it might contradict. An earlier draft did carry a stage-2
  // branch, and it silently dropped a staged **VOID** (which the AI's YES/NO vocabulary
  // cannot express) and offered the AI's YES over the officer's actual decision.
  const stage: BulkVerdict["stage"] = requireTwoOfficer ? "stage1" : "seal";

  const outcome: "YES" | "NO" | null =
    m.sentinelOutcome === "YES" || m.sentinelOutcome === "NO" ? m.sentinelOutcome : null;

  return {
    eligible,
    outcome,
    reason: eligible ? null : (ordered[0] ?? null),
    all: ordered,
    // Overridable only when EVERY standing reason is overridable — one row-state block is
    // enough to make the whole row untouchable.
    overridable: !eligible && ordered.length > 0 && ordered.every((r) => OVERRIDABLE.has(r)),
    stage,
    modeIsAuto: mode === "auto",
    confidence: m.sentinelConfidence ?? null,
    citedHost,
    approvedHost,
  };
}
