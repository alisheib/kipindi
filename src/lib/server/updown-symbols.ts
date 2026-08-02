/**
 * THE SYMBOL CATALOGUE — the one place that knows what an Up & Down asset may be.
 *
 * ── WHY THIS EXISTS (campaign findings E-45 / E-46, 2026-08-02) ──────────────
 * The Add-asset form used to take the SYMBOL as free text, the CATEGORY as an
 * independent dropdown, and the SOURCE URL as free text. Three fields that must agree,
 * with nothing making them agree. On production that produced, in one afternoon:
 *
 *   · `BNB`  created as category `macro` — so the FX/metals calendar was applied to a
 *            24/7 coin and the console showed it "closed · opens 22:00 UTC".
 *   · `ETH`  created with symbol `ETH` (not `ETH/USD`) pointed at coingecko.com, which
 *            the Twelve Data reader cannot quote at all — 100% void, 27 of 27 rounds.
 *   · `SOL`  correctly configured in every visible way and still 100% void, because the
 *            provider's quote for THAT symbol lags ~132s against a 90s staleness window.
 *
 * None of the three was rejected, and none was visible until rounds had already run and
 * voided. The category is not cosmetic — `sessionKindFor` reads it to decide whether the
 * money path may read a price at all, so getting it wrong silently disables an asset for
 * two days a week (or enables it when the market is shut).
 *
 * ── WHAT THIS FILE IS, AND WHAT IT IS NOT ───────────────────────────────────
 * It is the authority for the things a provider API **cannot** tell you:
 *   · which trading calendar a symbol follows (crypto is 24/7; metals and FX are not);
 *   · the quote precision the tick maths needs;
 *   · the human names, in all three languages.
 * It is NOT the authority on whether a symbol will actually settle today — only a live
 * read can answer that, because it depends on the plan and on the provider's per-symbol
 * refresh cadence. That check is `probeSymbolFreshness`, and the form runs it on select.
 *
 * ⛔ ADDING A SYMBOL IS A DELIBERATE ACT. Do not add one without checking the live probe
 * first: a symbol whose quote is slower than `maxStalenessSeconds` will void every round
 * while looking perfectly healthy, which is indistinguishable from a broken feed.
 */
import type { MarketCategory } from "./market-service";
import { sessionKindFor } from "./market-calendar";

/** The provider endpoint every catalogued symbol is quoted from. */
export const QUOTE_ENDPOINT = "https://api.twelvedata.com/quote";
/** The host that must be an enabled `TrustedSource` in the symbol's category. */
export const QUOTE_DOMAIN = "api.twelvedata.com";

export type SymbolSpec = {
  /** What the provider is asked for, e.g. `XAU/USD`. Never abbreviate it — `ETH` is not
   *  a symbol Twelve Data quotes, and that mistake shipped. */
  symbol: string;
  /** Suggested stable key. Editable, because the key is ours and is never renamed later. */
  suggestedKey: string;
  nameEn: string;
  nameSw: string;
  nameZh: string;
  /** ⛔ THE CATEGORY IS LOCKED TO THE SYMBOL. It drives the trading calendar, so it is a
   *  property of the instrument, not an operator preference. */
  category: MarketCategory;
  /** Kit icon recipe key. */
  iconKey: string;
  /** Quote precision. FX majors need 5; metals and USD-quoted coins need 2. */
  decimals: number;
  /** Smallest move that counts as a direction, in ticks of 10^-decimals. */
  minMoveTicks: number;
  /** Grouping for the first dropdown. */
  group: "Crypto" | "Metals" | "Foreign exchange" | "Indices";
  /**
   * Set when the platform CANNOT currently feed this symbol, with the reason an operator
   * needs. Rendered as a disabled option rather than hidden — "why isn't gold-adjacent X
   * in the list?" is a worse question than seeing it greyed out with the answer.
   */
  unsupported?: string;
};

/**
 * ⚠️ Every entry here was chosen because Twelve Data quotes it on the live plan (Basic 8)
 * — except the ones explicitly marked `unsupported`. The freshness of each still varies
 * per symbol and is NOT knowable from this file; run the probe.
 */
export const SYMBOL_CATALOGUE: readonly SymbolSpec[] = [
  // ── Crypto · 24/7, never closed ───────────────────────────────────────────
  { symbol: "BTC/USD", suggestedKey: "BTC", nameEn: "Bitcoin",  nameSw: "Bitcoin",  nameZh: "比特币",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 1, group: "Crypto" },
  { symbol: "ETH/USD", suggestedKey: "ETH", nameEn: "Ethereum", nameSw: "Ethereum", nameZh: "以太坊",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 1, group: "Crypto" },
  { symbol: "SOL/USD", suggestedKey: "SOL", nameEn: "Solana",   nameSw: "Solana",   nameZh: "索拉纳",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 1, group: "Crypto" },
  { symbol: "XRP/USD", suggestedKey: "XRP", nameEn: "XRP",      nameSw: "XRP",      nameZh: "瑞波币",
    category: "crypto", iconKey: "crypto", decimals: 4, minMoveTicks: 1, group: "Crypto" },
  { symbol: "BNB/USD", suggestedKey: "BNB", nameEn: "BNB",      nameSw: "BNB",      nameZh: "币安币",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 1, group: "Crypto" },
  { symbol: "LTC/USD", suggestedKey: "LTC", nameEn: "Litecoin", nameSw: "Litecoin", nameZh: "莱特币",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 1, group: "Crypto" },

  // ── Metals · the FX/metals week (Sun 22:00 → Fri 21:00 UTC) ───────────────
  { symbol: "XAU/USD", suggestedKey: "XAU", nameEn: "Gold",      nameSw: "Dhahabu", nameZh: "黄金",
    category: "macro", iconKey: "gold", decimals: 2, minMoveTicks: 1, group: "Metals" },
  { symbol: "XAG/USD", suggestedKey: "XAG", nameEn: "Silver",    nameSw: "Fedha",   nameZh: "白银",
    category: "macro", iconKey: "silver", decimals: 3, minMoveTicks: 1, group: "Metals" },
  { symbol: "XPT/USD", suggestedKey: "XPT", nameEn: "Platinum",  nameSw: "Platini", nameZh: "铂金",
    category: "macro", iconKey: "platinum", decimals: 2, minMoveTicks: 1, group: "Metals" },

  // ── FX · the same week as metals ──────────────────────────────────────────
  { symbol: "EUR/USD", suggestedKey: "EURUSD", nameEn: "Euro / US Dollar", nameSw: "Euro / Dola", nameZh: "欧元/美元",
    category: "macro", iconKey: "fx", decimals: 5, minMoveTicks: 1, group: "Foreign exchange" },
  { symbol: "GBP/USD", suggestedKey: "GBPUSD", nameEn: "Pound / US Dollar", nameSw: "Pauni / Dola", nameZh: "英镑/美元",
    category: "macro", iconKey: "fx", decimals: 5, minMoveTicks: 1, group: "Foreign exchange" },
  { symbol: "USD/JPY", suggestedKey: "USDJPY", nameEn: "US Dollar / Yen", nameSw: "Dola / Yen", nameZh: "美元/日元",
    category: "macro", iconKey: "fx", decimals: 3, minMoveTicks: 1, group: "Foreign exchange" },

  // ── Indices · listed so the absence is EXPLAINED, not mysterious ──────────
  { symbol: "SPX", suggestedKey: "SNP500", nameEn: "S&P 500", nameSw: "S&P 500", nameZh: "标普500",
    category: "macro", iconKey: "fx", decimals: 2, minMoveTicks: 1, group: "Indices",
    unsupported:
      "Not on the current Twelve Data plan — the quote endpoint returns HTTP 404 for SPX (needs the Grow tier). " +
      "It also trades a cash session (~13:30–20:00 UTC), which the platform's calendar does not model: `macro` " +
      "would call it open all week. It needs its own session kind before it is ever enabled." },
];

/** Look a symbol up. Returns undefined for anything not catalogued. */
export function findSymbol(symbol: string): SymbolSpec | undefined {
  const s = symbol.trim().toUpperCase();
  return SYMBOL_CATALOGUE.find((x) => x.symbol.toUpperCase() === s);
}

/** The groups, in display order, each with its symbols. Drives the cascading dropdowns. */
export function symbolGroups(): Array<{ group: SymbolSpec["group"]; symbols: readonly SymbolSpec[] }> {
  const order: SymbolSpec["group"][] = ["Crypto", "Metals", "Foreign exchange", "Indices"];
  return order.map((group) => ({ group, symbols: SYMBOL_CATALOGUE.filter((s) => s.group === group) }));
}

/**
 * ⛔ THE SERVER-SIDE GATE. A dropdown is a courtesy, not a control: a stale page, a
 * scripted POST or a second browser tab can still submit anything. Every asset write goes
 * through this, so the category can never disagree with the symbol regardless of what was
 * posted.
 *
 * Returns null when the shape is acceptable, or the sentence to show the operator.
 */
export function validateSymbolCategory(symbol: string, category: string): string | null {
  const spec = findSymbol(symbol);
  if (!spec) {
    return `"${symbol}" is not a symbol this platform can quote. Pick one from the list — ` +
      `a symbol the price feed does not carry produces rounds that void and refund forever ` +
      `(finding E-46: "ETH" was accepted instead of "ETH/USD" and voided 27 of 27 rounds).`;
  }
  if (spec.unsupported) return `${spec.symbol} cannot be used: ${spec.unsupported}`;
  if (spec.category !== category) {
    return `${spec.symbol} must be category "${spec.category}", not "${category}". ` +
      `The category decides the trading calendar: "crypto" is 24/7, everything else follows ` +
      `the FX/metals week (Sunday 22:00 → Friday 21:00 UTC). Mislabelling a coin as "macro" ` +
      `shuts it every weekend for no reason (finding E-46: BNB).`;
  }
  return null;
}

/** Human sentence describing when this symbol can settle rounds. Shown on the form. */
export function tradingHoursNote(spec: Pick<SymbolSpec, "category" | "symbol">): string {
  return sessionKindFor(spec.category) === "always"
    ? `${spec.symbol} trades 24/7 — rounds can run at any hour, including weekends.`
    : `${spec.symbol} follows the FX/metals week: it opens Sunday 22:00 UTC (Monday 01:00 EAT) ` +
      `and closes Friday 21:00 UTC (Saturday 00:00 EAT), and is shut all Saturday. ` +
      `While it is shut the platform refuses to open or read a round, so you will see no ` +
      `results at all until it reopens — that is deliberate, not a fault.`;
}
