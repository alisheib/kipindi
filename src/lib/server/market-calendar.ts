/**
 * WHEN IS THIS MARKET ACTUALLY TRADING? — finding **E-36**.
 *
 * ── WHY THIS FILE EXISTS, AND WHY THE OLD REASONING WAS WRONG ────────────────
 * Until 2026-08-02 the platform had **no trading-calendar concept at all**. That was a
 * deliberate, documented decision in `updown-feed.ts`, resting on two premises:
 *
 *   1. *"A shut market stops advancing `last_quote_at`, so the staleness rule already
 *      refuses it, honestly and for the right reason."*
 *   2. *"If a provider ever re-stamps a FROZEN price with a fresh time, the `minMoveTicks`
 *      no-move rule voids and refunds the round; that failure is safe."*
 *
 * **Both are false against the provider in production, measured 2026-08-02.**
 *
 * ```
 *   XAU/USD  /quote   last_quote_at = 2026-08-02T12:11:00Z (a SUNDAY)   is_market_open = true
 *   EUR/USD  /quote   last_quote_at = 2026-08-02T12:11:00Z              is_market_open = true
 *   /time_series 1min → 1,440 bars on SATURDAY for both, high > low, ZERO gaps
 * ```
 *
 * Spot metals and FX are shut from Friday ~21:00 UTC to Sunday ~22:00 UTC. The provider
 * answers anyway, `last_quote_at` advances every minute, and the quotes MOVE. So premise 1
 * fails — the 90-second staleness gate is satisfied — and premise 2 fails, because there is
 * a move to measure. Run through the real `computeTargets` on the live GOLD row (decimals 2,
 * `minMoveTicks` 15 → a $0.15 floor): **83 of 288 Saturday 5-minute windows (28.8%) clear
 * that floor and would have RESOLVED**, the first of them by **+$1.26**. Across all shut
 * windows the resolve rate is 20-22% on gold and **90-95% on EUR/USD** (a 0.1-pip floor
 * stops nothing). Every one of those pays a real winner against a real loser.
 *
 * That is strictly worse than voiding. A void refunds; this pays.
 *
 * ⚠️ **WHAT IS *NOT* CLAIMED HERE, because it was tested and did not hold.** The first read
 * of this data called the weekend bars "synthetic jitter around a pinned anchor" — the open
 * of each bar looked frozen while the close wandered. Over a 15-minute stretch that is what
 * it looks like; over the whole day the anchor drifts $32, so the description is wrong. The
 * sharper test — is the tape continuous, i.e. does `open[i]` ≈ `close[i-1]`? — **also fails
 * to separate weekend from weekday**: median seam/range is 0.43 Saturday vs 0.31 Friday on
 * XAU/USD and 0.33 on both for EUR/USD, while BTC/USD (genuinely 24/7) sits at 0.000 on both.
 * So the broken seam is normal for an *aggregated* FX/metals feed, not a weekend artifact,
 * and whether these prints are interpolated, or thin quotes from some venue that really is
 * open, **cannot be settled from here**.
 *
 * It does not need to be. What is proven is enough: **the asset the product names — spot
 * XAU/USD — is not trading**, its weekend tape is a different regime entirely (median
 * per-minute move 0.256 bps Saturday vs 1.613 bps Friday, six times quieter), no player can
 * verify it, and the platform would settle licensed real-money rounds on it. That is the
 * defect, whatever the prints are.
 *
 * ── DESIGN ───────────────────────────────────────────────────────────────────
 * Pure, no I/O, exhaustively testable — the same shape as `computeTargets`, and for the same
 * reason: it decides whether real money may be settled.
 */

/** The trading rhythm an asset follows. */
export type SessionKind =
  /** 24/7/365 — crypto. Never closed, no holidays. */
  | "always"
  /** The FX/metals week: opens Sunday 22:00 UTC, closes Friday 21:00 UTC, shut Saturday. */
  | "fx-metals";

export type SessionVerdict =
  | { open: true }
  | { open: false; reason: "weekend" | "session-break"; detail: string };

/**
 * Which rhythm a category follows.
 *
 * ⚠️ `macro` IS THE FX/METALS WEEK, and that is right for `XAU/USD` and for any currency
 * pair — the two things actually pointed at a live feed. It is **too permissive for a cash
 * equity index** (`S&P500` trades ~13:30-20:00 UTC, not 22:00-21:00), and the platform has
 * no way to tell those apart: both are `macro`. Recorded rather than papered over —
 * `SNP500` cannot be fed at all today (`SPX` is not on the live TwelveData plan, HTTP 404,
 * finding E-25), so no index round can currently reach this gate. **If an index is ever
 * given a working feed, it needs its own session kind before it is enabled**, or this
 * function will call a shut cash session open. There is a guard case pinning that.
 *
 * Anything unrecognised gets `fx-metals`, the CONSERVATIVE choice: it refuses more often
 * than it allows, and a refusal voids and refunds rather than paying on a bad price.
 */
export function sessionKindFor(category: string): SessionKind {
  return category === "crypto" ? "always" : "fx-metals";
}

/**
 * Is this market trading at this instant?
 *
 * `at` is an ISO instant (a round boundary). Everything is computed in **UTC** — the
 * platform's timestamps are UTC and the FX week is conventionally quoted in it, so there is
 * no local-zone step to get wrong. (The campaign has already paid for a timezone assumption
 * once: §3's node-postgres trap.)
 *
 * ⚠️ EDGES ARE DELIBERATELY CONSERVATIVE. The real FX week opens around Sunday 21:00-22:00
 * UTC and closes 21:00-22:00 Friday depending on the venue and on daylight saving. This uses
 * the LATER open and the EARLIER close, so the shoulder minutes — the thinnest, least
 * reliable prices of the week, which is exactly where a synthetic quote is most likely — are
 * treated as shut. Being 60 minutes too cautious costs a few voided rounds; being 60 minutes
 * too permissive settles money on a price nobody traded.
 *
 * ⚠️ HOLIDAYS ARE NOT MODELLED, and pretending otherwise would be worse than saying so.
 * Good Friday, Christmas and the like close these markets on a weekday, and this function
 * will call them open. What protects a round then is not this gate — it is that a genuinely
 * frozen holiday quote stops advancing `last_quote_at`, so the staleness rule refuses it.
 * The weekend is the case where that protection was measured to FAIL, because the provider
 * synthesises weekend bars; a holiday has not been measured. Recorded as a known limit.
 */
export function marketSessionAt(category: string, at: string | Date): SessionVerdict {
  const kind = sessionKindFor(category);
  if (kind === "always") return { open: true };

  const d = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(d.getTime())) {
    // An unparseable boundary is not a licence to trade. Refuse.
    return { open: false, reason: "session-break", detail: `unparseable instant "${String(at)}"` };
  }
  const dow = d.getUTCDay(); // 0 = Sunday
  const hour = d.getUTCHours();
  const stamp = d.toISOString().slice(0, 16).replace("T", " ") + "Z";

  if (dow === 6) {
    return { open: false, reason: "weekend", detail: `${stamp} is Saturday — the FX/metals week is shut all day` };
  }
  if (dow === 0 && hour < 22) {
    return { open: false, reason: "weekend", detail: `${stamp} is Sunday before 22:00 UTC — the week has not opened yet` };
  }
  if (dow === 5 && hour >= 21) {
    return { open: false, reason: "weekend", detail: `${stamp} is Friday after 21:00 UTC — the week has closed` };
  }
  return { open: true };
}

/** Convenience for the common boolean question. */
export function isMarketOpenAt(category: string, at: string | Date): boolean {
  return marketSessionAt(category, at).open;
}

/**
 * The sentence an operator reads. Names the calendar as the cause, because "no price" and
 * "the market is shut" send an operator to two completely different places — and the whole
 * point of E-36 is that a wall of VOIDs looks identical whatever caused it.
 */
export function describeClosure(v: SessionVerdict): string {
  if (v.open) return "market open";
  return `Market closed — ${v.detail}. No round can settle on a price the market did not make; ` +
    `stakes are refunded in full. Run this chain in market hours.`;
}

/**
 * When does this market next open, from `at`? Used by the operator console so a stopped
 * chain can say *when* it may run rather than only that it may not. Returns `at` itself when
 * the market is already open. Steps hour by hour, which is exact enough for a calendar whose
 * finest edge is on the hour, and terminates inside one week by construction.
 */
export function nextOpenAfter(category: string, at: string | Date): string {
  const start = at instanceof Date ? new Date(at.getTime()) : new Date(at);
  if (!Number.isFinite(start.getTime())) return new Date().toISOString();
  const probe = new Date(start.getTime());
  probe.setUTCMinutes(0, 0, 0);
  for (let i = 0; i <= 24 * 8; i++) {
    if (isMarketOpenAt(category, probe)) {
      // Never report an opening BEFORE the instant asked about.
      return probe.getTime() < start.getTime() ? start.toISOString() : probe.toISOString();
    }
    probe.setUTCHours(probe.getUTCHours() + 1);
  }
  return start.toISOString();
}
