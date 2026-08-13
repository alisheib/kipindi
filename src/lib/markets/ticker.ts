/**
 * The live ticker's events — REAL settlements, and nothing else.
 *
 * ⛔ WHAT THIS REPLACED. `src/lib/server/ticker-feed.ts` was a hardcoded twelve-item synthetic
 * array — "TZS 180K won on YES on Long rains begin before 15 Apr · 5m ago", a TZS 2,400,000
 * Bitcoin settlement, "50pick reaches 1,000 predictions this week" — rendered by `app-shell` on
 * EVERY page of a licensed real-money platform. Its own header said so: *"realistic synthetic
 * data that matches real platform patterns."* Nothing on that strip had ever happened. It is the
 * same defect class as the fabricated price history killed in `6b1975b`, and it broke the A-5
 * no-fabrication rule that `market-card.tsx` cites and obeys three components away.
 *
 * ⭐ WHY THIS MODULE IS PURE, LIKE `discovery.ts` AND `hero.ts`. No server imports, so
 * `test:ticker-honesty` can prove every rule below with no database and no browser — which is
 * what makes the licence conditions provable rather than asserted. The server module decorates
 * stored markets and hands rows here.
 *
 * ── THE FIVE RULES, AND WHY EACH ONE IS A RULE ────────────────────────────────────────────
 *
 * 1. SETTLEMENTS ONLY. NO INDIVIDUAL BETS, EVER. "TZS 45K predicted YES on X · 2m ago"
 *    publishes one identifiable player's stake on every page of the site. With 73 accounts on
 *    production that is not anonymous to anyone who knows them — a PDPA problem, not a
 *    missing-data problem. Market opens and settlements are already public on `/markets` and
 *    `/results`; a stake is not.
 *
 * 2. A ROW WITH NO `settledAt` IS NOT AN EVENT. `status: RESOLVED` is the VERDICT; `settledAt`
 *    is when the money actually moved (`market-service.ts` on the field, and `settleMarket`
 *    stamps it). A RESOLVED market with `settledAt: null` is still inside its objection
 *    window, its pool is intact and every position is still OPEN. Announcing it as settled,
 *    with a figure, states an outcome the platform has not finished standing behind.
 *
 * 3. ORDER BY `settledAt` DESC — never by board order. Slicing a board-ordered list once
 *    pinned three July markets as "recent" on production (`markets/page.tsx:326-334`).
 *
 * 4. A VOID CARRIES NO AMOUNT. On a void we keep nothing and every stake is refunded, so
 *    `netPool` is not what happened to anyone's money. It gets its own kind and no figure.
 *    Licence condition 4 / §C4: a refund is NEUTRAL, never an error treatment.
 *
 * 5. THE OUTCOME IS READ, NEVER INFERRED. Law 25 / `test:outcome`: a settled side comes from
 *    the stored field or it is not shown. A row whose outcome is absent is DROPPED rather than
 *    guessed from the pools — an absent event is recoverable, a wrong side is a false statement
 *    about someone's money.
 *
 * And when there is nothing to say, this returns `[]` and `LiveTicker` renders `null`. On a
 * platform with no settlements the strip simply does not exist. A-5: nothing over a guess.
 */

/** A settled market, decorated by the server module. `amountTzs` is pre-computed: the fee maths
 *  needs the poll's FROZEN `feeSnapshot`, which is a server concern. */
export type TickerRow = {
  id: string;
  /** ms since epoch, or **null while the objection window is still open** — see rule 2. */
  settledAtMs: number | null;
  /** Read from `resolvedOutcome`. `null` = not recorded; the row is dropped (rule 5). */
  outcome: "YES" | "NO" | "VOID" | null;
  /** pool − fee at the poll's frozen rates. **Must be null on a VOID** (rule 4). */
  amountTzs: number | null;
  /** Already localised by the caller — see the note on `title` below. */
  title: string;
};

/**
 * One line of the strip.
 *
 * ⚠️ THIS TYPE HAS EXACTLY ONE DECLARATION, AND THAT IS THE POINT. It used to be declared
 * TWICE — once in `ticker-feed.ts` and again in `live-ticker.tsx` — which is how a `timeAgo`
 * field that NOTHING rendered survived in both copies. `timeAgo` is gone with them: a relative
 * time baked into a server render is wrong the moment the page has been open a minute, and a
 * stale relative time is worse than none.
 *
 * ⚠️ `live-ticker.tsx` is a CLIENT component and the server feed reaches the store, so the
 * client must import this with `import type` (erased at compile time). A value import would
 * pull the server graph into a browser chunk — the failure that broke the build when `audit.ts`
 * dragged in `node:async_hooks`. Being pure and server-free, this file is safe either way; the
 * rule is kept because the next type to live here may not be.
 */
export type TickerEvent = {
  id: string;
  /** `settled` carries a side and an amount; `void` carries neither. */
  kind: "settled" | "void";
  /** Absent on a void. */
  side?: "YES" | "NO";
  /** The market question, in the reader's language — see `tickerEvents`. */
  title: string;
  /** TZS actually shared among the winners. Absent on a void. */
  amount?: number;
};

/** How many settlements the strip carries. The run is duplicated for the marquee, so this is
 *  half the DOM cost; twelve was the synthetic array's length and reads as a wire feed. */
export const TICKER_LIMIT = 12;

/**
 * The strip's events, most recently settled first.
 *
 * ⚠️ `title` must already be localised by the caller (`pickLocalized`). The old strip rendered
 * CHINESE CONNECTIVES AROUND ENGLISH MARKET TITLES on production — "TZS 180K 已结算 YES 在 Long
 * rains begin before 15 Apr" — because the titles were English string literals with nothing to
 * translate. Taking a finished string here is what makes that unrepresentable.
 */
export function tickerEvents(rows: readonly TickerRow[], limit: number = TICKER_LIMIT): TickerEvent[] {
  return rows
    // Rule 2 — the money must have actually moved. `> 0` and not merely non-null: a 0 stamp is
    // not a time, and `Date.parse` of a malformed string yields NaN, which fails this too.
    .filter((r) => typeof r.settledAtMs === "number" && Number.isFinite(r.settledAtMs) && r.settledAtMs > 0)
    // Rule 5 — an unrecorded outcome is dropped, never inferred.
    .filter((r) => r.outcome === "YES" || r.outcome === "NO" || r.outcome === "VOID")
    // Rule 3 — most recently settled first. `id` breaks ties so the order is total: many markets
    // routinely share one `objectionsClosedAt` deadline, so equal stamps are ordinary here.
    .slice()
    .sort((a, b) => (b.settledAtMs! - a.settledAtMs!) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, Math.max(0, limit))
    .map((r) => {
      if (r.outcome === "VOID") {
        // Rule 4 — no side, and NO AMOUNT, whatever the caller passed.
        return { id: r.id, kind: "void" as const, title: r.title };
      }
      const ev: TickerEvent = { id: r.id, kind: "settled", side: r.outcome as "YES" | "NO", title: r.title };
      // A real settlement of TZS 0 says nothing and would read as a broken figure, so the
      // amount is omitted rather than printed as a zero — §C2, never a zero-as-unknown.
      if (typeof r.amountTzs === "number" && Number.isFinite(r.amountTzs) && r.amountTzs > 0) {
        ev.amount = Math.round(r.amountTzs);
      }
      return ev;
    });
}
