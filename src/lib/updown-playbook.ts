/**
 * THE ASSET PLAYBOOK — what the provider's own tape says an asset may be asked to do.
 *
 * ⛔ WHY THIS EXISTS, AND WHY IT IS NOT A FOURTH COPY OF A RULE WE ALREADY HAVE.
 * `symbolReadiness` already gates on two axes: `FeedAdvice` (can this be PRICED in time?) and
 * `MovementAdvice` (does it MOVE enough to decide?). Both are derived from **our own round
 * history** — `UpDownObservation` and `UpDownRound`. That is the right source and it has one
 * hole that cannot be closed from inside it: *an asset we have never listed has no history, and
 * a duration we have never run has no history either.* So the only way to learn that a 5-minute
 * Solana round refunds a third of the time has been to run Solana rounds and refund a third of
 * them. This module reads the PROVIDER's bars instead, so the same question is answerable
 * before a single player has staked anything.
 *
 * ── THE ESCALATE-ONLY RULE IS INHERITED, NOT RELAXED ────────────────────────────────────────
 * `updown-symbols.ts` §316 is explicit that measurement may only ESCALATE a catalogue floor,
 * never remove one, because the catalogue floors rest on price-scale and bar-seam arithmetic
 * that round history cannot see. That reasoning applies to THIS source too, and with the same
 * force: `deriveMinDuration` returns the STRICTER of the catalogue floor and the measured one.
 * A profile can make an asset harder to list. It can never make one easier.
 *
 * ── WHY IT HAS NO IMPORTS ───────────────────────────────────────────────────────────────────
 * Same reason as `updown-durations.ts`: the admin console has to run this arithmetic in the
 * browser to show an operator the consequence of a choice *as they make it*, and the server has
 * to run the identical arithmetic to refuse a scripted POST that skips the console. One
 * definition, two callers. A second copy in a React component is the defect this shape prevents.
 *
 * ── EVERY THRESHOLD IN HERE IS A KNOB, AND THE DEFAULTS ARE ONLY DEFAULTS ────────────────────
 * `DEFAULT_POLICY` is the fallback, exactly as `DEFAULT_GRANTS` is for RBAC: the system is
 * correct with an empty `SystemConfig` table, and a row at `updown.playbook.policy` overrides
 * any subset of it without a deploy. Nothing in this file is a magic number — every comparison
 * reads a knob, so "gold needs 30 minutes" is a RESULT, never a constant. If the fee model, the
 * provider or the appetite for refunds changes, the knob moves and every asset re-derives.
 */

// ---------------------------------------------------------------------------
// Policy — the tunable part
// ---------------------------------------------------------------------------

export type PlaybookPolicy = {
  /**
   * The margin floor may be at most this share of a TYPICAL move over the round's length.
   * This single number is what fixes each asset's minimum duration. At 0.10, gold's $0.40 floor
   * needs a median move of $4.00, which gold reaches at ~26 minutes → its floor becomes 30.
   * Raise it and short rounds open up at the cost of more refunds; lower it and the board gets
   * slower and cleaner. It is a product decision, which is why it is a knob and not a constant.
   */
  maxFloorShareOfMove: number;
  /**
   * An hour is a DEAD WINDOW when its median 1-minute move falls below this multiple of the
   * asset's own median across its open hours. Measured 2026-08-10: gold's 21:00 UTC hour runs
   * at 0.064× — the CME/FX settlement break — while Bitcoin's same hour is 0.62×. Anything at
   * or under this ratio produces rounds that refund rather than resolve.
   */
  deadWindowRatio: number;
  /** An hour with fewer samples than this is "not measured", never "fine". */
  minSamplesPerHour: number;
  /** Above this refund rate a duration is discouraged (level 2 — selectable, with the number said out loud). */
  warnRefundRate: number;
  /** Above this refund rate a duration is refused (level 3). */
  blockRefundRate: number;
  /** A profile built from fewer days than this cannot raise or lower anything — it is not evidence yet. */
  minProfileDays: number;
  /** A profile older than this is stale: it stops being able to CLEAR a concern, but its blocks stand. */
  maxProfileAgeDays: number;
  /**
   * ⭐ HOW FAR THE TAPE MAY DEPART FROM A RANDOM WALK. The variance ratio of 1-minute returns
   * over a 30-minute horizon is 1.00 for a fair coin, below 1 when moves reverse (quote wobble)
   * and above 1 when they persist (a trend a player can ride). Measured 2026-08-10: Bitcoin
   * 0.98, Ethereum 0.87, gold 1.48, GBP/USD 0.50. Both directions are a problem on a
   * money game — one means the round is decided by noise, the other that it is predictable.
   */
  maxVarianceRatioDrift: number;
  /**
   * ⭐ HOW MUCH BETTER THAN A COIN A NAIVE PLAYER MAY DO. If simply betting the way the last
   * window moved wins more than 50% + this, the game is exploitable. The break-even against a
   * 13%-of-pool commission is about 6.5 points, so anything at or beyond that is a refusal;
   * `warnDirectionalEdge` is where it becomes worth saying out loud.
   *
   * ⛔ Symmetric on purpose. A 43% persistence is exactly as exploitable as a 57% one — the
   * player just bets the other way.
   */
  maxDirectionalEdge: number;
  warnDirectionalEdge: number;
  /** Below this fraction of expected bars the provider is not reliable enough to settle money on. */
  minCoverage: number;
  /**
   * Whether an operator may create a chain the playbook discourages (level 2) by recording a
   * reason. Level 3 is never overridable — that is the difference between the two levels.
   */
  allowOverrideOnWarn: boolean;
};

export const DEFAULT_POLICY: Readonly<PlaybookPolicy> = Object.freeze({
  maxFloorShareOfMove: 0.10,
  deadWindowRatio: 0.25,
  minSamplesPerHour: 200,
  warnRefundRate: 0.05,
  blockRefundRate: 0.15,
  minProfileDays: 7,
  maxProfileAgeDays: 35,
  maxVarianceRatioDrift: 0.35,
  maxDirectionalEdge: 0.065,
  warnDirectionalEdge: 0.050,
  minCoverage: 0.995,
  allowOverrideOnWarn: true,
});

/** Merge a stored override over the defaults. Unknown keys are ignored; bad values fall back. */
export function resolvePolicy(stored: unknown): PlaybookPolicy {
  const out: PlaybookPolicy = { ...DEFAULT_POLICY };
  if (!stored || typeof stored !== "object") return out;
  const s = stored as Record<string, unknown>;
  const num = (k: keyof PlaybookPolicy, lo: number, hi: number) => {
    const v = s[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi) {
      (out[k] as number) = v;
    }
  };
  num("maxFloorShareOfMove", 0.001, 1);
  num("deadWindowRatio", 0, 1);
  num("minSamplesPerHour", 1, 100_000);
  num("warnRefundRate", 0, 1);
  num("blockRefundRate", 0, 1);
  num("minProfileDays", 1, 365);
  num("maxProfileAgeDays", 1, 3650);
  num("maxVarianceRatioDrift", 0.01, 5);
  num("maxDirectionalEdge", 0.005, 0.5);
  num("warnDirectionalEdge", 0.001, 0.5);
  num("minCoverage", 0.5, 1);
  if (typeof s.allowOverrideOnWarn === "boolean") out.allowOverrideOnWarn = s.allowOverrideOnWarn;
  // A warn threshold above the block threshold would make the warn band empty and silently
  // turn every discouraged round into a refused one. Clamp rather than throw: a bad config row
  // must not take the console down.
  if (out.warnRefundRate > out.blockRefundRate) out.warnRefundRate = out.blockRefundRate;
  if (out.warnDirectionalEdge > out.maxDirectionalEdge) out.warnDirectionalEdge = out.maxDirectionalEdge;
  return out;
}

// ---------------------------------------------------------------------------
// The measurement this module consumes
// ---------------------------------------------------------------------------

/**
 * One asset's tape, reduced to the few numbers a decision needs. Written by
 * `scripts/ops-updown-profile.mts`; stored on `UpDownAssetProfile`. Deliberately small — it is
 * read on every admin keystroke, so it must not be a bar archive.
 */
export type AssetProfile = {
  symbol: string;
  /** ISO. Age is judged against `maxProfileAgeDays`. */
  measuredAt: string;
  /** How many days of 1-minute bars the numbers rest on. */
  days: number;
  /** Bars returned ÷ minutes expected, as a fraction. Below 1 means the provider had gaps. */
  coverage: number;
  /** The margin floor in quote currency at the time of measurement — `minMoveTicks × 10^-decimals`. */
  floor: number;
  /** Fraction of 1-minute bars whose open equals the previous open. A structurally flat tape. */
  stillMinutes: number;
  /** duration (minutes) → median |move| over that window, in quote currency. */
  medianMove: Record<number, number>;
  /** duration (minutes) → fraction of windows that would refund at `floor`. */
  refundRate: Record<number, number>;
  /** 24 entries, indexed by UTC hour: median |1-minute move| during that hour. NaN → unmeasured. */
  hourlyMedianMove: number[];
  /** 24 entries: how many 1-minute samples each hour rests on. */
  hourlySamples: number[];
  /**
   * Variance ratio of 1-minute returns at a 30-minute horizon. 1.00 is a random walk.
   * See `PlaybookPolicy.maxVarianceRatioDrift` for why both directions matter.
   */
  varianceRatio30: number;
  /**
   * duration (minutes) → fraction of DECIDED rounds where the move ran the same way as the
   * preceding window of equal length. 0.50 is a fair coin. Refunded rounds are excluded because
   * nobody can bet on them.
   */
  persistence: Record<number, number>;
};

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

export type Level = 1 | 2 | 3;

export type PlaybookVerdict = {
  level: Level;
  /** One sentence, operator-facing, always carrying the number that produced it. */
  reason: string;
  /** True when level 2 may be overridden with a recorded reason. Level 3 is never overridable. */
  overridable: boolean;
};

export type Playbook = {
  symbol: string;
  /** The strictest of the catalogue floor and the measured one. Null when nothing is known. */
  minDurationMinutes: number | null;
  /** Why that minimum, in one operator-facing sentence. */
  minDurationWhy: string | null;
  /** Allowed durations at or above the minimum whose refund rate is under `warnRefundRate`. */
  recommendedDurations: number[];
  /** Allowed durations that are selectable but carry a warning. */
  discouragedDurations: number[];
  /** Allowed durations the playbook refuses outright. */
  blockedDurations: number[];
  /** UTC hours whose tape is too quiet to settle a round. Empty when nothing qualifies. */
  deadHoursUtc: number[];
  /** True when the profile is missing, too short, or too old to be treated as evidence. */
  profileUsable: boolean;
  /** Human note about the profile itself — age, sample size, coverage. Always present. */
  profileNote: string;
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Median of a numeric list, ignoring non-finite entries. Returns NaN when nothing is usable. */
export function median(xs: readonly number[]): number {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

/**
 * Is this profile allowed to influence a decision at all?
 *
 * ⚠️ Note the asymmetry, and it is deliberate. A stale profile stops being able to CLEAR a
 * concern but its blocks stand, because "we measured this six weeks ago and it was unplayable"
 * is still better evidence than nothing. Freshness gates optimism, not caution.
 */
export function profileUsable(p: AssetProfile | undefined, policy: PlaybookPolicy, nowMs: number): boolean {
  if (!p) return false;
  if (!(p.days >= policy.minProfileDays)) return false;
  const ageDays = (nowMs - Date.parse(p.measuredAt)) / 86_400_000;
  return Number.isFinite(ageDays) && ageDays <= policy.maxProfileAgeDays;
}

/**
 * The smallest allowed duration at which the margin floor is a small enough slice of a typical
 * move AND the measured refund rate is under the block threshold. Both conditions, because they
 * catch different failures: the first is "the band is too big for this length of round", the
 * second is "the tape is simply flat" — Bitcoin at 3 minutes fails only the second, and no
 * margin change reaches it.
 */
export function deriveMinDuration(
  p: AssetProfile | undefined,
  policy: PlaybookPolicy,
  allowedDurations: readonly number[],
  catalogueMin: number | null,
  nowMs: number,
): { minutes: number | null; why: string | null } {
  const sorted = [...allowedDurations].sort((a, b) => a - b);
  if (!profileUsable(p, policy, nowMs)) {
    return catalogueMin == null
      ? { minutes: null, why: null }
      : { minutes: catalogueMin, why: `The catalogue floor for this asset is ${catalogueMin} minutes; no usable measurement to refine it.` };
  }
  const prof = p!;
  let measured: number | null = null;
  let why: string | null = null;
  for (const d of sorted) {
    const move = prof.medianMove[d];
    const refund = prof.refundRate[d];
    if (!Number.isFinite(move) || !Number.isFinite(refund)) continue;
    const share = move! > 0 ? prof.floor / move! : Infinity;
    if (share <= policy.maxFloorShareOfMove && refund! <= policy.blockRefundRate) {
      measured = d;
      why =
        `Measured over ${prof.days} days: a typical ${d}-minute move is ` +
        `${move!.toFixed(move! < 1 ? 5 : 2)}, so the ${prof.floor} margin floor is ` +
        `${pct(share)} of it and ${pct(refund!)} of rounds would refund. ` +
        `Below ${d} minutes the floor grows past ${pct(policy.maxFloorShareOfMove)} of a typical move.`;
      break;
    }
  }
  // ESCALATE-ONLY. `updown-symbols.ts` §316: measurement may add a floor or raise one; it may
  // never lower the catalogue's. Whichever is stricter wins, and the sentence follows it.
  if (measured == null) {
    return {
      minutes: catalogueMin,
      why:
        `No allowed round length clears the policy on this asset — at every length the ` +
        `${prof.floor} floor is more than ${pct(policy.maxFloorShareOfMove)} of a typical move, ` +
        `or more than ${pct(policy.blockRefundRate)} of rounds would refund.`,
    };
  }
  if (catalogueMin != null && catalogueMin > measured) {
    return {
      minutes: catalogueMin,
      why: `The catalogue floor of ${catalogueMin} minutes is stricter than the measured ${measured}, so it stands.`,
    };
  }
  return { minutes: measured, why };
}

/**
 * Hours whose tape is too quiet to decide a round, relative to the asset's OWN normal.
 *
 * ⚠️ Relative, never absolute. Gold moves cents and Bitcoin moves tens of dollars; a fixed
 * threshold would either flag all of gold or none of the break. Comparing an hour to the same
 * asset's median across its other hours is what makes one number work for every instrument.
 */
export function deriveDeadHours(
  p: AssetProfile | undefined,
  policy: PlaybookPolicy,
  nowMs: number,
): number[] {
  if (!profileUsable(p, policy, nowMs)) return [];
  const prof = p!;
  const usable = prof.hourlyMedianMove
    .map((v, h) => ({ v, h, n: prof.hourlySamples[h] ?? 0 }))
    .filter((x) => Number.isFinite(x.v) && x.n >= policy.minSamplesPerHour);
  if (usable.length < 12) return [];             // too patchy to compare an hour against
  const base = median(usable.map((x) => x.v));
  if (!(base > 0)) return [];
  return usable.filter((x) => x.v < policy.deadWindowRatio * base).map((x) => x.h).sort((a, b) => a - b);
}

/** Everything an operator or a server-side guard needs about one asset, in one object. */
export function buildPlaybook(
  symbol: string,
  p: AssetProfile | undefined,
  policy: PlaybookPolicy,
  allowedDurations: readonly number[],
  catalogueMin: number | null,
  nowMs: number,
): Playbook {
  const sorted = [...allowedDurations].sort((a, b) => a - b);
  const { minutes: minDur, why } = deriveMinDuration(p, policy, sorted, catalogueMin, nowMs);
  const usable = profileUsable(p, policy, nowMs);
  const rec: number[] = [], dis: number[] = [], blk: number[] = [];
  for (const d of sorted) {
    if (minDur != null && d < minDur) { blk.push(d); continue; }
    const r = usable ? p!.refundRate[d] : undefined;
    if (r == null || !Number.isFinite(r)) { dis.push(d); continue; }   // unmeasured ≠ fine
    // The floor-share test is applied per duration, not only inside the minimum search. When
    // NO allowed length clears it, `deriveMinDuration` returns null — and without this line
    // every length would then be judged on refund rate alone and a wide-band asset would read
    // as merely "discouraged" at the one length that happened to squeak under it.
    const move = p!.medianMove[d];
    const shareBad = Number.isFinite(move) && move! > 0
      ? p!.floor / move! > policy.maxFloorShareOfMove
      : true;
    if (r > policy.blockRefundRate) blk.push(d);
    else if (shareBad || r > policy.warnRefundRate) dis.push(d);
    else rec.push(d);
  }
  let note: string;
  if (!p) note = "No measurement on file for this asset. Nothing here has been verified against the provider's tape.";
  else if (!usable) {
    const ageDays = Math.floor((nowMs - Date.parse(p.measuredAt)) / 86_400_000);
    note = p.days < policy.minProfileDays
      ? `Profile covers only ${p.days} days; ${policy.minProfileDays} are needed before it counts as evidence.`
      : `Profile is ${ageDays} days old, past the ${policy.maxProfileAgeDays}-day limit. Its blocks still stand; it can no longer clear anything.`;
  } else {
    note = `Measured over ${p.days} days, ${pct(p.coverage)} bar coverage, ` +
      `${pct(p.stillMinutes)} of minutes with no price change at all.`;
  }
  return {
    symbol,
    minDurationMinutes: minDur,
    minDurationWhy: why,
    recommendedDurations: rec,
    discouragedDurations: dis,
    blockedDurations: blk,
    deadHoursUtc: deriveDeadHours(p, policy, nowMs),
    profileUsable: usable,
    profileNote: note,
  };
}

/**
 * ⭐ THE ASSET-LEVEL VERDICT — the two questions that are about the INSTRUMENT rather than any
 * particular round length, and which therefore have to be answered before a length is offered.
 *
 * ⛔ These are the checks a refund-rate gate cannot make. An asset can settle 99% of its rounds
 * and still be unfit: if its moves reverse, the winner was chosen by quote wobble; if they
 * persist, a player betting the last direction beats the commission and the game stops being a
 * game. Both were measured on the tape before anything was listed —
 * GBP/USD's variance ratio is 0.50 and EUR/USD's naive directional strategy wins 58.6%.
 */
export function judgeAsset(
  p: AssetProfile | undefined,
  policy: PlaybookPolicy,
  nowMs: number,
): PlaybookVerdict {
  if (!profileUsable(p, policy, nowMs)) {
    return {
      level: 2, overridable: policy.allowOverrideOnWarn,
      reason: "No usable measurement for this asset. Nothing here has been checked against the provider's tape.",
    };
  }
  const prof = p!;
  if (prof.coverage < policy.minCoverage) {
    return {
      level: 3, overridable: false,
      reason: `The provider returned only ${pct(prof.coverage)} of the minutes asked for — below the ` +
        `${pct(policy.minCoverage)} a money round needs. Missing bars void rounds.`,
    };
  }
  const drift = Math.abs(prof.varianceRatio30 - 1);
  const edges = Object.entries(prof.persistence)
    .map(([d, v]) => ({ d: Number(d), e: Math.abs(v - 0.5), v }))
    .filter((x) => Number.isFinite(x.e));
  const worst = edges.sort((a, b) => b.e - a.e)[0];
  if (worst && worst.e > policy.maxDirectionalEdge) {
    return {
      level: 3, overridable: false,
      reason: `Betting ${worst.v < 0.5 ? "against" : "with"} the previous ${worst.d}-minute move wins ` +
        `${pct(worst.v < 0.5 ? 1 - worst.v : worst.v)} of decided rounds — past the ` +
        `${pct(0.5 + policy.maxDirectionalEdge)} at which a naive strategy beats the commission.`,
    };
  }
  if (worst && worst.e > policy.warnDirectionalEdge) {
    return {
      level: 2, overridable: policy.allowOverrideOnWarn,
      reason: `A naive directional strategy wins ${pct(worst.v < 0.5 ? 1 - worst.v : worst.v)} of decided ` +
        `${worst.d}-minute rounds — short of the ${pct(0.5 + policy.maxDirectionalEdge)} break-even, but worth watching.`,
    };
  }
  // ⛔ THE VARIANCE RATIO NEVER BLOCKS, AND THAT IS A DELIBERATE CORRECTION.
  // It was a refusal in the first draft of this module, and gold — a live, working asset that
  // has settled real money for weeks — failed it at 1.48 while its naive-strategy edge was only
  // 3.2 points, comfortably inside the commission. A proxy that condemns a working instrument is
  // worse than no proxy. Persistence answers the question that actually matters (can a player
  // beat the fee?), so persistence blocks; the variance ratio explains WHY and is therefore a
  // caveat. Both stay, because a tape can drift without yet being exploitable, and that is worth
  // watching before it is worth refusing.
  if (Number.isFinite(prof.varianceRatio30) && drift > policy.maxVarianceRatioDrift) {
    return {
      level: 2, overridable: policy.allowOverrideOnWarn,
      reason: `Variance ratio ${prof.varianceRatio30.toFixed(2)} against a fair-market 1.00 — this tape ` +
        `${prof.varianceRatio30 < 1 ? "reverses" : "trends"} more than a coin flip should. Not yet ` +
        `exploitable against the commission, but the margin is thinner than it looks.`,
    };
  }
  return { level: 1, overridable: true, reason: `Tape behaves like a fair market (variance ratio ${prof.varianceRatio30.toFixed(2)}).` };
}

/**
 * The verdict on ONE concrete choice — this asset, this length. Shaped to compose with
 * `symbolReadiness`, which takes the strictest of every advice source.
 */
export function judgeChoice(
  book: Playbook,
  p: AssetProfile | undefined,
  policy: PlaybookPolicy,
  durationMinutes: number,
): PlaybookVerdict {
  if (book.minDurationMinutes != null && durationMinutes < book.minDurationMinutes) {
    return {
      level: 3,
      overridable: false,
      reason: book.minDurationWhy ?? `${book.symbol} needs rounds of at least ${book.minDurationMinutes} minutes.`,
    };
  }
  const r = book.profileUsable ? p?.refundRate[durationMinutes] : undefined;
  if (r != null && Number.isFinite(r)) {
    if (r > policy.blockRefundRate) {
      return {
        level: 3, overridable: false,
        reason: `${pct(r)} of ${durationMinutes}-minute ${book.symbol} rounds would refund — past the ${pct(policy.blockRefundRate)} limit.`,
      };
    }
    if (r > policy.warnRefundRate) {
      return {
        level: 2, overridable: policy.allowOverrideOnWarn,
        reason: `About ${pct(r)} of ${durationMinutes}-minute ${book.symbol} rounds return every stake instead of paying a winner.`,
      };
    }
    return {
      level: 1, overridable: true,
      reason: `Measured refund rate ${pct(r)} — inside the ${pct(policy.warnRefundRate)} target.`,
    };
  }
  return {
    level: 2, overridable: policy.allowOverrideOnWarn,
    reason: `Nobody has measured ${durationMinutes}-minute rounds on ${book.symbol}. That is not the same as measuring them and finding them fine.`,
  };
}

/**
 * Would a round opening at this instant land in a dead window?
 *
 * ⛔ Judged on the OPENING instant, not the boundary, because that is the moment an operator or
 * the scheduler can still decline. A round that opens inside the break has already taken stakes
 * by the time its boundary arrives.
 */
export function isDeadWindow(book: Playbook, atUtcMs: number): boolean {
  if (!book.deadHoursUtc.length) return false;
  return book.deadHoursUtc.includes(new Date(atUtcMs).getUTCHours());
}

/** The dead hours as operator-facing local text, e.g. "00:00–01:00". `tzOffsetMinutes` is +180 for EAT. */
export function deadWindowLabel(book: Playbook, tzOffsetMinutes: number): string | null {
  if (!book.deadHoursUtc.length) return null;
  const spans: Array<[number, number]> = [];
  for (const h of book.deadHoursUtc) {
    const last = spans[spans.length - 1];
    if (last && last[1] === h) last[1] = h + 1; else spans.push([h, h + 1]);
  }
  const fmt = (h: number) => {
    const m = (((h * 60 + tzOffsetMinutes) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  return spans.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(", ");
}
