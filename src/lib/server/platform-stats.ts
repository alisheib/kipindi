/**
 * Platform-wide public aggregates: the settled-market count, and the RECENT SETTLEMENTS the live
 * ticker and the landing's settled strip both read.
 *
 * These feed the high-traffic landing and — through the ticker in `app-shell` — EVERY page, so the
 * whole result is memoised on `globalThis` for a short TTL: repeated renders reuse it rather than
 * re-querying. A public figure tolerates up to `TTL_MS` of staleness. Every number here is REAL,
 * never fabricated.
 *
 * ⭐ ONE SCAN, TWO CONSUMERS — 2026-08-13. The resolved-market read below is UNBOUNDED
 * (`listMarkets` takes no limit; 1,987 rows on production) and this function already ran it once
 * a minute behind the memo below **and threw every row away to keep `.length`**. The ticker lives
 * in `app-shell`, which renders on every page, so giving it its own read would have put a second
 * full scan behind every request on the site. It reads the rows this scan already has instead.
 * ⛔ Do not "tidy" `recentSettlements` out into its own query.
 *
 * ⛔ AND `paidOutTzs` WAS REMOVED IN THE SAME PASS, because `StatsBand` was its only reader and
 * batch 3 deleted that component. It was a `sumConfirmedByTypes` DB aggregate running behind every
 * landing render for a figure nothing rendered. Its `statsSettled` / `statsPaidOut` dict keys went
 * with it in all three locales. If a "total paid out" figure is ever wanted back it belongs beside
 * this scan again — but as a live consumer, not as a query kept warm for nobody.
 */
import { listMarkets, ratesFor, type StoredMarket } from "./market-service";
import { signoffOf, type Signoff } from "@/lib/markets/signoff";
import { db } from "./store";
import { poolFee } from "@/lib/payout";
import type { TickerRow } from "@/lib/markets/ticker";

/** A settled market, ready for the ticker or the landing strip. `title*` stay unlocalised here —
 *  the render site picks the reader's language (`pickLocalized`), because this value is memoised
 *  ACROSS locales and a pre-picked title would serve one visitor's language to the next. */
export type SettlementRow = Omit<TickerRow, "title"> & {
  titleEn: string;
  titleSw: string;
  titleZh: string | null;
  /** The public source the outcome was judged against — the settled strip names it. */
  sourceUrl: string;
  /**
   * Who signed THIS market off (landing v3, WP13) — two distinct officers, one officer, the automatic
   * resolver, or "corrected on objection" when an upheld objection REVERSED the verdict (its stamps
   * then name who signed the overturned one). `null` when the market carries no stamp at all.
   * ⛔ Never a fixed count: single-admin resolution is the default in every money mode
   * (`test:two-admin` asserts the ABSENCE of a hard two-officer lock), and a strip that printed "two
   * officers" over a one-officer verdict would be a regulatory finding (INHERIT-MANIFEST L2).
   * Derived by `signoffOf` (`lib/markets/signoff.ts`), the one rule `/fairness` reads too.
   */
  signoff: Signoff | null;
};

export type PlatformStats = {
  /** Settled polls AND Up & Down rounds — see the productLine note in the read below. */
  settledCount: number;
  /**
   * Σ of every CONFIRMED payout and cashout, TZS — money that has actually reached players.
   *
   * ⭐ RESTORED 2026-09-24, AS A LIVE CONSUMER. This figure existed, was deleted with `StatsBand`
   * because nothing rendered it, and the note above says it belongs beside this scan again only
   * if something READS it. The hero's third proof slot now does: it used to state `Open
   * predictions`, which on a thin book reads as an invitation to divide — 35 predictions against
   * 59 open markets. A figure that only grows, and that says players have actually been paid, is
   * the one a reader wants from a betting site and the one the settled strip already proves row
   * by row.
   * ⛔ It is an AGGREGATE, not a scan: `sumConfirmedByTypes` sums in the database. BET_PAYOUT and
   * CASHOUT are both stored positive, so this is money out to players and never a signed total.
   */
  paidOutTzs: number | null;
  /** Most recently settled FIRST. Only rows whose money has actually moved. */
  recentSettlements: SettlementRow[];
};

const TTL_MS = 60_000;

/** Enough for the ticker (12) and the landing strip (5) out of one slice. */
const RECENT_LIMIT = 16;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PLATFORM_STATS: { at: number; value: PlatformStats } | undefined;
}

/**
 * pool − fee at the poll's **frozen** rates, i.e. what was actually shared among the winners.
 *
 * ⛔ `ratesFor(m)` reads the market's own `feeSnapshot`, never live admin config: retuning a rate
 * must not restate what an already-settled poll paid. And the outcome is passed through because
 * the `loser-share` model's fee is a share of the LOSING pool and therefore needs to know which
 * side lost (`payout.ts`); `capped-commission` ignores it and stays outcome-neutral.
 *
 * Returns **null for a VOID** — we kept nothing and every stake was refunded, so `netPool` is not
 * a description of what happened. Licence condition 4.
 */
function settledAmount(m: StoredMarket): number | null {
  if (m.resolvedOutcome !== "YES" && m.resolvedOutcome !== "NO") return null;
  return poolFee(m.yesPool, m.noPool, ratesFor(m), m.resolvedOutcome).netPool;
}

function toSettlementRow(m: StoredMarket, reversed: ReadonlySet<string>): SettlementRow {
  return {
    id: m.id,
    settledAtMs: m.settledAt ? Date.parse(m.settledAt) : null,
    outcome: m.resolvedOutcome,
    amountTzs: settledAmount(m),
    titleEn: m.titleEn,
    titleSw: m.titleSw,
    titleZh: m.titleZh,
    sourceUrl: m.sourceUrl,
    signoff: signoffOf(m, reversed.has(m.id)),
  };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = Date.now();
  const cached = globalThis.__50PICK_PLATFORM_STATS;
  if (cached && now - cached.at < TTL_MS) return cached.value;

  // productLine "ALL" — `settledCount` is a whole-platform figure and must stay one. Counting
  // only long-form polls would understate what the platform has settled, and the narrative
  // surfaces that DO want polls only filter these same rows below rather than re-querying.
  const resolved = await listMarkets({ status: "RESOLVED", productLine: "ALL" })
    .catch(() => [] as Awaited<ReturnType<typeof listMarkets>>);
  // Markets whose verdict an upheld objection REVERSED — their stamps name who signed the verdict
  // that was overturned, so the strip must not credit them with the one that stands (signoff.ts).
  // One read of a rare table, inside this 60s memo. A failed read withholds nothing it can prove:
  // it falls back to the stamps, which is what the strip said before the objection existed.
  const reversed = new Set(
    // `Promise.resolve().then(...)`: the in-memory store answers synchronously and the Prisma one
    // asynchronously, and a `.catch` hung straight on a sync array would throw instead of falling back.
    (await Promise.resolve().then(() => db.objection.list()).catch(() => []))
      .filter((o) => o.status === "UPHELD" && o.remedy === "REVERSE")
      .map((o) => o.marketId),
  );

  // ⛔ THE TICKER AND THE STRIP ARE THE POLL PRODUCT LINE ONLY, AND THE COUNT ABOVE IS NOT.
  // Both readings are deliberate. `settledCount` pairs with a whole-platform payout total, so it
  // must stay "ALL". The narrative surfaces must not: an Up & Down round opens and settles inside
  // a minute (~300k/yr), so ordering by `settledAt` DESC across both lines would make the strip a
  // round-by-round clock in which a poll settlement never appears — and a UD round's title is a
  // generated symbol/duration string, not a question anybody asked. Filtered from the SAME rows;
  // no second query.
  const settlements = resolved
    .filter((m) => m.productLine === "MARKET")
    .map((m) => toSettlementRow(m, reversed))
    .filter((r) => typeof r.settledAtMs === "number" && Number.isFinite(r.settledAtMs) && r.settledAtMs > 0)
    // 🔴 RULE 5, WHICH THIS FEED WAS BYPASSING. `ticker.ts` states it as law 25 — *"the outcome
    // is READ, never inferred: a row whose outcome is absent is DROPPED rather than guessed"* —
    // and drops null rows at `ticker.ts:106`. The landing's trust band is fed from
    // `recentSettlements` **directly** (`page.tsx:247`), so it never saw that filter: a RESOLVED
    // market with no `resolvedOutcome` fell through `outcome === "YES" ? … : …` and rendered
    // **"NO", in red**, on a panel headed *"THE OUTCOME IS READ, NEVER INFERRED"*.
    // ⛔ This is not a new product decision about what the landing shows for an absent outcome —
    // it is the decision the ticker already made, applied to the surface that was skipping it.
    .filter((r) => r.outcome === "YES" || r.outcome === "NO" || r.outcome === "VOID")
    // Most recently settled first. ⛔ Never the board's order — slicing a board-ordered list once
    // pinned three July markets as "recent" on production.
    .sort((a, b) => (b.settledAtMs! - a.settledAtMs!) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, RECENT_LIMIT);

  // ⛔ AWAITED ALONGSIDE, NOT INSIDE A SECOND SCAN. This is a DB-side SUM over the ledger; it
  // loads no rows and does not re-read the market table this function already walked.
  // 🔴 A FAILED READ IS NOT A ZERO, AND THIS SWALLOWED ONE INTO A PRINTED FIGURE. The catch
  // returned 0 and the hero rendered it unconditionally, so a database hiccup published
  // "TZS 0 paid out to players" on a licensed money surface — a number nobody produced, which is
  // exactly what this codebase refuses everywhere else: `pricedYesPct` returns null rather than a
  // plausible 50, and the card gates on the pool rather than on a guess. null now means UNKNOWN
  // and the hero withholds the slot; a real zero still prints, because a platform that has paid
  // out nothing yet should say so.
  const paidOutTzs = await Promise.resolve(db.txn.sumConfirmedByTypes(["BET_PAYOUT", "CASHOUT"]))
    .catch(() => null);
  const value: PlatformStats = { settledCount: resolved.length, recentSettlements: settlements, paidOutTzs };
  globalThis.__50PICK_PLATFORM_STATS = { at: now, value };
  return value;
}
