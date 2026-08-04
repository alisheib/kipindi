/**
 * Up & Down chain health — the DECISIVE rate, and the voids split BY REASON.
 *
 * ── WHY THIS IS A MODULE AND NOT AN INLINE REDUCER (finding E-58, 2026-08-04) ──
 * `/admin/updown` computed `voids / resolved` inline over "the last 50 rounds" and
 * **threw `voidReason` away**. Three completely different situations therefore rendered as
 * the same amber percentage, and they need opposite responses from an operator:
 *
 *   `source-failed`   WE could not read a price. Our bug. On production SOL is
 *                     **290 of 290 rounds** — a chain that has never once paid anybody.
 *   `no-move`         The price genuinely did not travel far enough. That is the MARGIN,
 *                     an operator lever, working exactly as designed.
 *   `operator`        A human voided it. On production **1,154** of XAU's voids are one
 *                     July remediation. Counting those as product failure is precisely how
 *                     a healthy margin was misdiagnosed as "voids every round it runs",
 *                     and that misdiagnosis was filed, argued, and withdrawn a session later.
 *   `source-mismatch` A reading came from a domain the round did not pin at open.
 *
 * ⛔ A blended number cannot distinguish "the feed is broken" from "the band is wide" from
 * "we refunded a batch last month". The split is the whole point.
 *
 * ⚠️ AND THE HEADLINE IS THE DECISIVE RATE, NOT THE VOID RATE. The question an operator is
 * actually asking is *"is this chain paying anyone?"* — the product had no such number
 * anywhere. A void rate answers its complement only if you also know the reason.
 *
 * Pure and dependency-free so the arithmetic that an operator prices a chain from can be
 * tested exhaustively without a database, and so the console and any future operator panel
 * cannot drift into two answers (the E-49/E-56 failure: three copies of one rule).
 */

/** The subset of a round these statistics read. Deliberately narrow. */
export type StatRound = {
  outcome: "UP" | "DOWN" | "VOID" | null;
  voidReason: string | null;
};

export type ChainStats = {
  /** Rounds with a verdict. Rounds still pending are not evidence about anything. */
  resolved: number;
  /** Paid somebody: UP or DOWN. */
  decisive: number;
  noMove: number;
  sourceFailed: number;
  sourceMismatch: number;
  operator: number;
  /** VOID with a reason we do not recognise, or none recorded. Surfaced rather than
   *  folded into `no-move`, because a silent bucket is how a new reason goes unnoticed. */
  unknownVoid: number;
  /** `decisive / resolved`, or null when there is nothing to divide. */
  decisiveRate: number | null;
  /** `(source-failed + source-mismatch) / resolved` — OUR failures, kept apart from the
   *  margin's. This should read 0. Anything above it is a defect, not a pricing choice. */
  feedFailRate: number | null;
};

export const EMPTY_CHAIN_STATS: ChainStats = {
  resolved: 0, decisive: 0, noMove: 0, sourceFailed: 0, sourceMismatch: 0,
  operator: 0, unknownVoid: 0, decisiveRate: null, feedFailRate: null,
};

/**
 * Summarise a chain's rounds.
 *
 * ⚠️ The caller decides the WINDOW, and it must be a time window, not a count. 50 rounds on
 * a busy 5-minute chain is about four hours; on a stopped chain it can be weeks. Two chains
 * compared over different spans are not answering the same question — see `boundaryFrom` in
 * `updown-dal.ts`.
 */
export function summariseRounds(rounds: readonly StatRound[]): ChainStats {
  const resolvedRounds = rounds.filter((r) => r.outcome != null);
  const resolved = resolvedRounds.length;
  if (resolved === 0) return { ...EMPTY_CHAIN_STATS };

  let decisive = 0, noMove = 0, sourceFailed = 0, sourceMismatch = 0, operator = 0, unknownVoid = 0;
  for (const r of resolvedRounds) {
    if (r.outcome === "UP" || r.outcome === "DOWN") { decisive++; continue; }
    switch (r.voidReason) {
      case "no-move": noMove++; break;
      case "source-failed": sourceFailed++; break;
      case "source-mismatch": sourceMismatch++; break;
      case "operator": operator++; break;
      default: unknownVoid++; break;
    }
  }

  return {
    resolved, decisive, noMove, sourceFailed, sourceMismatch, operator, unknownVoid,
    decisiveRate: decisive / resolved,
    feedFailRate: (sourceFailed + sourceMismatch) / resolved,
  };
}

/**
 * How the cell should be coloured, as a decision rather than a ternary buried in JSX.
 *
 * ⛔ A FEED FAILURE OUTRANKS A LOW PAY RATE, always. A chain paying 30% because the band is
 * wide is a pricing conversation; a chain paying 30% because we cannot read a price is an
 * outage, and the two must never look the same again.
 */
export function chainHealth(s: ChainStats): "none" | "feed-failing" | "low-payout" | "ok" {
  if (s.resolved === 0) return "none";
  if ((s.feedFailRate ?? 0) > 0) return "feed-failing";
  if ((s.decisiveRate ?? 1) < 0.6) return "low-payout";
  return "ok";
}
