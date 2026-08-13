/**
 * The live ticker's feed — the platform's REAL recent settlements, in the reader's language.
 *
 * 🔴 WHAT WAS HERE BEFORE, AND WHY IT HAD TO GO. A hardcoded twelve-item synthetic array —
 * "TZS 180K won on YES on Long rains begin before 15 Apr · 5m ago", a TZS 2,400,000 Bitcoin
 * settlement, "50pick reaches 1,000 predictions this week" — rendered by `app-shell` on EVERY
 * page of a licensed real-money platform. This file's own header admitted it: *"realistic
 * synthetic data that matches real platform patterns."* Not one of those events had happened.
 * Same defect class as the fabricated price history killed in `6b1975b`, and it broke the A-5
 * no-fabrication rule that `market-card.tsx` cites and obeys three components away. Two further
 * tells, both confirmed on production: in Chinese it wrapped Chinese connectives around ENGLISH
 * market titles (the titles were English literals — there was nothing to translate), and its
 * first item was clipped at the left edge in every locale.
 *
 * ⭐ NO QUERY OF ITS OWN. The rules live in the pure `lib/markets/ticker.ts`; the rows come from
 * `getPlatformStats`, which already scans the resolved book once a minute behind a memo and used
 * to discard every row to keep a `.length`. This module is only the join: pick the reader's
 * language, hand the rows to the pure filter. See the ONE-SCAN note in `platform-stats.ts`.
 */
import { getPlatformStats } from "./platform-stats";
import { pickLocalized } from "@/lib/localized";
import { tickerEvents, TICKER_LIMIT, type TickerEvent, type TickerRow } from "@/lib/markets/ticker";
import type { Locale } from "@/lib/i18n-dict";

export type { TickerEvent };

/**
 * The strip's events for one reader, most recently settled first — or `[]` when the platform has
 * settled nothing yet, in which case `LiveTicker` renders `null` and the strip does not exist.
 * A-5: nothing over a guess.
 */
export async function getTickerFeed(locale: Locale, limit = TICKER_LIMIT): Promise<TickerEvent[]> {
  const stats = await getPlatformStats().catch(() => null);
  if (!stats) return [];
  const rows: TickerRow[] = stats.recentSettlements.map((s) => ({
    id: s.id,
    settledAtMs: s.settledAtMs,
    outcome: s.outcome,
    amountTzs: s.amountTzs,
    // The fix for the Chinese-connectives defect: the question arrives here already in the
    // reader's language, so a localised sentence can never close around an English title.
    title: pickLocalized(locale, s.titleEn, s.titleSw, s.titleZh),
  }));
  return tickerEvents(rows, limit);
}
