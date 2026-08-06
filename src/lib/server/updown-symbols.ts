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
// Type-only: erased at build, so this cannot create the import cycle `updown-config` avoids
// with its dynamic import below.
import type { FeedAdvice } from "./updown-feed-advice";
// ⭐ G1 · the second axis — see the note on `symbolReadiness`'s `movement` parameter.
import type { MovementAdvice } from "../updown-movement";

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
  /**
   * The shortest round this symbol may run, when the SYMBOL — not the platform — is the limit.
   *
   * ⛔ GOLD IS THE REASON (Ali's decision, 2026-08-04, on the §6ad seam measurement).
   * A bar labelled T−1 closes at the instant the bar labelled T opens, so those two numbers
   * describe the same moment and should agree. Measured live on five consecutive seams:
   *
   *     BTC/USD   −$0.01 on 4 of 5 seams        ~1/2000th of a median 5-minute move
   *     XAU/USD   $0.29 – $0.87 on ALL 5 seams  comparable to a WHOLE 5-minute move (0.023%)
   *
   * Shadow mode found the same thing from the other direction: `/quote` fell outside the same
   * minute's bar range on **6 of 30** XAU samples (by $0.055–$0.201), while **75 of 75** crypto
   * samples agreed.
   *
   * ⭐ **So gold at 3–5 minutes is decided by which representation the feed returned, not by
   * the market** — and no `minMoveTicks` fixes it: below the noise the feed decides, above it
   * (~$1.00) almost every short round refunds. At 15m+ gold's median move (0.036%) is several
   * times the seam noise, and the game is real again.
   *
   * ⚠️ Deliberately NOT `unsupported`. Gold works; it works at longer durations. Hiding it
   * would raise the question this field exists to answer.
   */
  minDurationMinutes?: number;
  /** Why the minimum exists, in the operator's terms. Shown beside the greyed options. */
  minDurationWhy?: string;
  /**
   * Below this many minutes the symbol is a ② — usable, but with a caveat worth reading.
   *
   * ⚠️ Deliberately SEPARATE from `minDurationMinutes`, because the two say different things
   * and the difference is the whole point. `minDurationMinutes` GREYS the option out: the
   * round would be decided by the data rather than the market, so it must not be offered.
   * This one leaves the option SELECTABLE and explains the trade-off — the round works, it
   * simply refunds more often than the operator may expect.
   *
   * 🔴 It exists because the console recommended what the operator guide says to avoid: the
   * Add-chain form offered `① 3 min` for Solana, mark ① and no caveat, identical to Bitcoin.
   */
  cautionBelowMinutes?: number;
  /** Why the caution exists. Shown beside the option, which stays choosable. */
  cautionWhy?: string;
};

/**
 * ⚠️ Every entry here was chosen because Twelve Data quotes it on the live plan (**Grow**,
 * 377 credits/min — read from the provider 2026-08-04: `api_usage` returns
 * `{"plan_category":"grow","plan_limit":377}`. This comment said "Basic 8" for months; the
 * plan had been upgraded and nobody corrected it, which is exactly the stale claim a future
 * session acts on. Re-read it rather than trusting this line.)
 * — except the ones explicitly marked `unsupported`. The freshness of each still varies
 * per symbol and is NOT knowable from this file; run the probe.
 */
export const SYMBOL_CATALOGUE: readonly SymbolSpec[] = [
  // ── Crypto · 24/7, never closed ───────────────────────────────────────────
  { symbol: "BTC/USD", suggestedKey: "BTC", nameEn: "Bitcoin",  nameSw: "Bitcoin",  nameZh: "比特币",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 2, group: "Crypto" },
  { symbol: "ETH/USD", suggestedKey: "ETH", nameEn: "Ethereum", nameSw: "Ethereum", nameZh: "以太坊",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 2, group: "Crypto" },
  // ⚠️ SOLANA IS FINE — AND ITS BAND IS A DIFFERENT ANIMAL AT ITS PRICE. Two ticks is the
  // floor everywhere, but $0.02 means something different at $74 than it does at $64,000:
  // ~0.03% of the price against ~0.00003%. Solana must therefore move a thousand times
  // further in PROPORTION to decide a round, so a quiet three minutes refunds where Bitcoin
  // would not. It is a caution and not a ban: §6ao proved SOL and it paid a real winner
  // (udr_0e0717…, 73.83 → 73.87 → UP), and its band cannot be narrowed because two ticks is
  // already the floor. 5 minutes and above is unremarkable.
  { symbol: "SOL/USD", suggestedKey: "SOL", nameEn: "Solana",   nameSw: "Solana",   nameZh: "索拉纳",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 2, group: "Crypto",
    cautionBelowMinutes: 5,
    cautionWhy:
      "Solana trades near $74, so its smallest band ($0.02) is about 0.03% of the price — on " +
      "Bitcoin the same $0.02 is a few hundred-thousandths of a percent. Over three minutes " +
      "Solana often does not travel that far, so short rounds refund noticeably more often " +
      "than Bitcoin's. The band cannot be made smaller: two ticks is already the floor. " +
      "Five minutes and above behaves normally." },
  { symbol: "XRP/USD", suggestedKey: "XRP", nameEn: "XRP",      nameSw: "XRP",      nameZh: "瑞波币",
    category: "crypto", iconKey: "crypto", decimals: 4, minMoveTicks: 2, group: "Crypto" },
  { symbol: "BNB/USD", suggestedKey: "BNB", nameEn: "BNB",      nameSw: "BNB",      nameZh: "币安币",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 2, group: "Crypto" },
  { symbol: "LTC/USD", suggestedKey: "LTC", nameEn: "Litecoin", nameSw: "Litecoin", nameZh: "莱特币",
    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 2, group: "Crypto" },

  // ── Metals · the FX/metals week (Sun 22:00 → Fri 21:00 UTC) ───────────────
  //
  // ⛔ 40 TICKS ($0.40) AND 15 MINUTES MINIMUM ON GOLD. Both are measured, not chosen — the
  // feed disagrees with itself by up to $0.20 at a single instant and by $0.29–$0.87 across a
  // bar seam, so a smaller band or a shorter round is decided by the data's representation
  // rather than by the market. See `minDurationMinutes` above.
  { symbol: "XAU/USD", suggestedKey: "XAU", nameEn: "Gold",      nameSw: "Dhahabu", nameZh: "黄金",
    category: "macro", iconKey: "gold", decimals: 2, minMoveTicks: 40, group: "Metals",
    minDurationMinutes: 15,
    minDurationWhy:
      "Gold's own price feed disagrees with itself by up to $0.87 at a single instant — about " +
      "the size of a whole 5-minute gold move. Over 15 minutes or more the market moves several " +
      "times further than that, so the result reflects gold rather than the data feed." },
  // Silver and platinum are the same market and the same week. They are NOT given a measured
  // minimum, because nobody has measured their seams — and inventing one from gold's would be
  // exactly the guess this file exists to prevent. Measure before shortening them.
  { symbol: "XAG/USD", suggestedKey: "XAG", nameEn: "Silver",    nameSw: "Fedha",   nameZh: "白银",
    category: "macro", iconKey: "silver", decimals: 3, minMoveTicks: 20, group: "Metals",
    minDurationMinutes: 15,
    minDurationWhy:
      "Silver trades the same market as gold, whose feed disagrees with itself by about a whole " +
      "5-minute move. Silver's own seams have not been measured, so it follows gold's limit " +
      "until they are." },
  { symbol: "XPT/USD", suggestedKey: "XPT", nameEn: "Platinum",  nameSw: "Platini", nameZh: "铂金",
    category: "macro", iconKey: "platinum", decimals: 2, minMoveTicks: 40, group: "Metals",
    minDurationMinutes: 15,
    minDurationWhy:
      "Platinum trades the same market as gold, whose feed disagrees with itself by about a " +
      "whole 5-minute move. Platinum's own seams have not been measured, so it follows gold's " +
      "limit until they are." },

  // ── FX · the same week as metals ──────────────────────────────────────────
  { symbol: "EUR/USD", suggestedKey: "EURUSD", nameEn: "Euro / US Dollar", nameSw: "Euro / Dola", nameZh: "欧元/美元",
    category: "macro", iconKey: "fx", decimals: 5, minMoveTicks: 2, group: "Foreign exchange" },
  { symbol: "GBP/USD", suggestedKey: "GBPUSD", nameEn: "Pound / US Dollar", nameSw: "Pauni / Dola", nameZh: "英镑/美元",
    category: "macro", iconKey: "fx", decimals: 5, minMoveTicks: 2, group: "Foreign exchange" },
  { symbol: "USD/JPY", suggestedKey: "USDJPY", nameEn: "US Dollar / Yen", nameSw: "Dola / Yen", nameZh: "美元/日元",
    category: "macro", iconKey: "fx", decimals: 3, minMoveTicks: 2, group: "Foreign exchange" },

  // ── Indices · listed so the absence is EXPLAINED, not mysterious ──────────
  { symbol: "SPX", suggestedKey: "SNP500", nameEn: "S&P 500", nameSw: "S&P 500", nameZh: "标普500",
    category: "macro", iconKey: "fx", decimals: 2, minMoveTicks: 2, group: "Indices",
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

/**
 * WHAT A PLAYER MAY BE TOLD ABOUT WHERE A PRICE CAME FROM (E-53, Ali's decision).
 *
 * Player surfaces named the data vendor — "Source: api.twelvedata.com" — on the board
 * card, the round header and the settlement-proof panel, the last of which also LINKED
 * to the endpoint. Which vendor 50pick buys market data from is an operational detail
 * of ours, and the standing rule is that player surfaces never narrate internal ops.
 *
 * So the player is told the KIND of market the price is read from, and nothing about
 * who sells it. That keeps the proof panel meaningful — a price with a stated origin
 * and two timestamps — without turning it into an advert for a supplier.
 *
 * ⛔ THE CLASS IS RESOLVED ON THE SERVER AND THE DOMAIN IS NEVER SENT. Translating a
 * vendor string in the browser would still ship the vendor in the RSC payload, where
 * View Source finds it — that is concealment, not removal.
 *
 * ⚠️ Long-form markets are DELIBERATELY NOT covered by this. They cite EWURA, TMA and
 * other public authorities, and those must stay named and linked: they are how a player
 * checks a settlement against the body that published the number.
 */
export type PublicSourceClass = "crypto" | "stock" | "metals" | "fx" | "generic";

export function publicSourceClassFor(asset: { symbol: string; category?: string | null }): PublicSourceClass {
  switch (findSymbol(asset.symbol)?.group) {
    case "Crypto": return "crypto";
    case "Metals": return "metals";
    case "Foreign exchange": return "fx";
    case "Indices": return "stock";
    default:
      // Uncatalogued (a legacy row predating E-46). Say the least that is still true
      // rather than guess a market kind from a string we do not recognise.
      return asset.category === "crypto" ? "crypto" : "generic";
  }
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
      `(it has happened here: "ETH" was accepted instead of "ETH/USD" and voided 27 of 27 rounds).`;
  }
  if (spec.unsupported) return `${spec.symbol} cannot be used: ${spec.unsupported}`;
  if (spec.category !== category) {
    return `${spec.symbol} must be category "${spec.category}", not "${category}". ` +
      `The category decides the trading calendar: "crypto" is 24/7, everything else follows ` +
      `the FX/metals week (Sunday 22:00 → Friday 21:00 UTC). Mislabelling a coin as "macro" ` +
      `shuts it every weekend for no reason — it has happened here, to BNB.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// READINESS — ① ready · ② warning · ③ unusable, with the reason in the operator's terms
// ---------------------------------------------------------------------------

/**
 * ⛔ ONE FUNCTION, READ BY THE FORM **AND** BY THE SERVER GATE.
 *
 * Ali: *"I don't know how knowledgeable my admins are in typing asset names"* — so nothing
 * that decides whether a price arrives may be typed, and every option must carry a numbered
 * signal saying whether it will work. But a dropdown is a courtesy, not a control: a stale
 * page, a scripted POST or a second tab can still submit anything. If the greying and the
 * refusal come from two different pieces of code they will disagree, and the disagreement will
 * be discovered by a round that took real stakes.
 *
 * The numbers are deliberately numerals, not colours — they survive a monochrome screen, a
 * screenshot in a WhatsApp thread, and an operator who is colour-blind.
 */
export type ReadinessLevel = 1 | 2 | 3;

export type Readiness = {
  /** ① usable · ② usable with a caveat worth reading · ③ not usable, and why. */
  level: ReadinessLevel;
  /** The reason, in the operator's own terms. Empty only for a plain ①. */
  reason: string;
};

/**
 * Can this symbol run at this duration, and how confidently?
 *
 * `durationMinutes` omitted asks about the SYMBOL alone — which is what the asset form needs
 * before any chain exists.
 *
 * ── ⭐ `measured` — WHAT THIS ASSET HAS ACTUALLY DONE HERE (Ali, 2026-08-05) ──
 * *"guide admins as they go for every asset based on history of 12data"*, and *"not advise —
 * don't allow it. Anything risky don't allow it… grey the field out."* So the caller loads the
 * asset's own record (`feedAdviceLookup`) and hands the derived advice in, and a measured ③
 * becomes a ③ here — greyed in the dropdown **and** refused by `validateSymbolDuration`, which
 * is the same function.
 *
 * ⚠️ IT IS OPTIONAL, AND ITS ABSENCE MUST NOT SILENTLY WEAKEN THE GATE. Omitted means "nobody
 * measured", not "measured and fine" — every caller that can reach the database passes it, and
 * the catalogue floors below still apply on their own either way.
 *
 * ⛔ THE CATALOGUE FLOORS ARE NOT SUPERSEDED BY MEASUREMENT, and this was a deliberate call.
 * `minDurationMinutes` (gold's 15) and `cautionBelowMinutes` (Solana's 5) rest on **price-scale
 * and bar-seam arithmetic** — how large the smallest band is as a share of the price, and how
 * far the feed disagrees with itself across a seam. `UpDownObservation` measures neither: it
 * records when a reading arrived, not how far the market moved while it did. The handoff for
 * this session proposed replacing Solana's caution with the measured advice "now that the same
 * thing is derived from data" — it is not the same thing, and dropping it would delete a true
 * warning (§6ao: a $0.02 band is ~0.03% of a $74 coin, so short SOL rounds refund more) the
 * moment SOL crosses 20 readings and starts reading as measured. Measurement therefore only
 * ESCALATES: it can add a caveat or a block, never remove one.
 */
/**
 * ── ⭐ `movement` — THE SECOND AXIS (G1, `docs/UPDOWN-FINAL-DESIGN.md` §3b) ──
 *
 * ⛔ `measured` above gates on whether the asset can be **PRICED IN TIME**. Nothing gated on
 * whether it **MOVES ENOUGH TO DECIDE**, and those are two different failure modes with one
 * symptom — the stake comes back. Measured on production: Bitcoin's quietest tenth of moves is
 * **411×** its own band; gold's is **2.1×**. Bitcoin cannot reveal that, which is why the gate
 * looked complete.
 *
 * ⚠️ SAME RULE AS `measured`: it may only ESCALATE. A movement ③ becomes a ③ here (greyed and
 * refused); a ② joins the caveats. Its absence means "nobody measured", never "measured and
 * fine". See `@/lib/updown-movement` for why a ③ requires a directly-measured window and a ②
 * may be inferred from a longer one.
 */
export function symbolReadiness(
  spec: SymbolSpec | undefined,
  durationMinutes?: number,
  measured?: FeedAdvice,
  movement?: MovementAdvice,
): Readiness {
  if (!spec) {
    return {
      level: 3,
      reason:
        "Not a symbol this platform can quote. A symbol the price feed does not carry produces " +
        "rounds that void and refund forever (it has happened here: \"ETH\" was accepted instead of \"ETH/USD\" " +
        "and voided 27 of 27 rounds).",
    };
  }
  // ③ beats everything: the platform genuinely cannot feed it.
  if (spec.unsupported) return { level: 3, reason: spec.unsupported };

  // ③ for this DURATION specifically — the symbol is fine, this length of round is not.
  if (durationMinutes != null && spec.minDurationMinutes != null && durationMinutes < spec.minDurationMinutes) {
    return {
      level: 3,
      reason:
        spec.minDurationWhy ??
        `${spec.symbol} needs rounds of at least ${spec.minDurationMinutes} minutes.`,
    };
  }

  // ③ FROM THE ASSET'S OWN RECORD. Measured after the catalogue's floors, because a floor is a
  // property of the instrument and this is a property of the feed — and before the caveats,
  // because a ③ is not a caveat. The sentence is the engine's, carrying its sample size.
  if (measured && measured.level === 3) return { level: 3, reason: measured.message };

  // ⭐ G1 · ③ BECAUSE THE ASSET DOES NOT MOVE ENOUGH TO DECIDE A ROUND THIS SHORT. A separate
  // check from the one above and deliberately after it: if the price cannot arrive in time the
  // round fails for a reason no amount of movement fixes, and the operator should be told the
  // first thing first. `judgeMovement` only ever returns ③ on a DIRECTLY measured window.
  if (movement && movement.level === 3) return { level: 3, reason: movement.message };

  // ② a real caveat that does not stop the round happening. There are three, and ALL can
  // apply to one option, so they are collected rather than returned from the first match —
  // returning early would silently drop whichever caveat lost the race, and an operator
  // would be told about the weekend while never hearing that the round refunds often.
  const caveats: string[] = [];

  // A shut market is the common one: the asset works, it simply produces nothing until the
  // week reopens, and an operator who does not know that reads the silence as a broken
  // feed (E-36).
  if (sessionKindFor(spec.category) !== "always") {
    caveats.push(
      `${spec.symbol} is shut at weekends (Friday 21:00 → Sunday 22:00 UTC). While it is shut ` +
      `the platform refuses to open or settle a round, so you will see no results at all — ` +
      `that is deliberate, not a fault.`,
    );
  }

  // …and this LENGTH of round on this symbol is workable but worth a second thought. Unlike
  // `minDurationMinutes` above, the option stays selectable — this is advice, not a gate, so
  // `validateSymbolDuration` deliberately does not refuse it.
  if (
    durationMinutes != null &&
    spec.cautionBelowMinutes != null &&
    durationMinutes < spec.cautionBelowMinutes
  ) {
    caveats.push(
      spec.cautionWhy ??
      `${spec.symbol} is workable below ${spec.cautionBelowMinutes} minutes but refunds more often.`,
    );
  }

  // …and what the feed's own record says short of a refusal — a shortened betting window, a
  // success rate below 98%, or an asset nobody has measured here yet. ⛔ A ① from the engine
  // adds nothing: its ① sentence is "nothing to watch for", and appending that to a real
  // caveat would bury it.
  if (measured && measured.level === 2) caveats.push(measured.message);

  // ⭐ G1 · …and what its MOVEMENT record says short of a refusal — a thin mover at this length,
  // or a window measured only over something longer than the round. ⛔ An UNMEASURED movement
  // verdict is deliberately NOT a caveat when the asset is otherwise fine: "how far it moves has
  // not been measured" is true of every asset on a fresh board, and pinning it to every option
  // would train an operator to read past the ② that means something. It is surfaced in the
  // console's own column instead, where it is information rather than a warning.
  if (movement && movement.level === 2 && !movement.unmeasured) caveats.push(movement.message);

  if (caveats.length > 0) return { level: 2, reason: caveats.join(" ") };
  return { level: 1, reason: "" };
}

/** `①` / `②` / `③` — the glyph the console renders beside an option. */
export function readinessMark(level: ReadinessLevel): string {
  return level === 1 ? "①" : level === 2 ? "②" : "③";
}

/**
 * ⛔ THE SERVER-SIDE DURATION GATE, and the counterpart to `validateSymbolCategory`.
 * Returns null when the pairing is acceptable, or the sentence to show the operator.
 *
 * ⛔ `measured` IS NOT OPTIONAL POLISH HERE. A greyed option and a server refusal are one
 * answer to one question; if the console greys a pairing on the asset's measured record and
 * this function has never heard of that record, a scripted POST — or a stale tab, or a second
 * browser — creates exactly the chain the console just refused. Every caller on the write path
 * passes it (`createChain` does); the parameter is optional only so the pure catalogue rules
 * stay callable without a database, which is what the tests and the in-memory path need.
 */
export function validateSymbolDuration(
  symbol: string,
  durationMinutes: number,
  measured?: FeedAdvice,
  movement?: MovementAdvice,
): string | null {
  const r = symbolReadiness(findSymbol(symbol), durationMinutes, measured, movement);
  return r.level === 3 ? r.reason : null;
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
