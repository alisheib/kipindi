/**
 * WHAT TO CALL A SIDE, AND AN OUTCOME — one map, one place, per product.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * 50pick runs TWO products over ONE storage vocabulary. A position's side is
 * stored `YES | NO` whatever it belongs to, and the Up & Down layer maps it to
 * `UP | DOWN` at the edge (`updown-service.ts`, `updown-board.ts`, `updown-pricing.ts`).
 * So the stored token does NOT tell a render site what word a player should read:
 *
 *   · a long-form poll asks a question       → its sides are **Yes** and **No**
 *   · an Up & Down round tracks a price      → its sides are **Up** and **Down**
 *
 * ⛔ THE DEFECT IS NEVER "THE SURFACE PICKED THE WRONG WORD". It is a surface that
 * **cannot tell which product it is holding** and therefore hard-writes one
 * vocabulary for both. Before this module, eight surfaces each hand-wrote their own
 * `side === "YES" ? … : …` ternary. Every one of them was correct on the day it was
 * written — because `listMarkets()` defaults to `productLine: "MARKET"` and the poll
 * surfaces filter to long-form — and every one of them would start lying, silently
 * and all at once, the day its query gained `productLine: "ALL"`.
 *
 * That is the same shape as `updown-source-label.ts` (`SOURCE_CLASS_KEY`) and
 * `updown-refund-reason.ts` (`REFUND_REASON_KEY`), and this module is deliberately
 * built to their pattern: ONE map, consumed everywhere, so a ninth surface cannot
 * come to disagree with the other eight.
 *
 * ── WHY IT TAKES `productLine` AND WILL NOT DEFAULT IT ───────────────────────
 * ⛔ There is no default, on purpose. A default is exactly the bug: it lets a caller
 * that does not know its product compile, and answer confidently in the wrong
 * vocabulary. If you cannot say which product you are holding, the call site — not
 * this module — is what needs fixing.
 *
 * ── WHY IT RETURNS WORDS AND NOT KEYS ───────────────────────────────────────
 * `SOURCE_CLASS_KEY` returns dict KEYS because its four arms live in one dict
 * namespace. This vocabulary does not: the poll words are `common.yes` / `common.no`
 * and the round words are `market.udUp` / `market.udDown`. A single flat key cannot
 * name both namespaces, so the map is resolved here against the reader's dictionary.
 * ⛔ No English is written in this file. Every word below comes out of `i18n-dict.ts`,
 * which is the only place a translation is allowed to live.
 *
 * ⚠️ `market.sideYesWord.toUpperCase()` and `common.yes` are the SAME STRING in all
 * three locales — verified, not assumed (EN "YES"/"YES", SW "NDIO"/"NDIO", ZH "是"/"是",
 * and the same for no/HAPANA/否). They are two definition sites for one word, which
 * §0a calls a bug. This module standardises on `common.yes` / `common.no`; the
 * `sideYesWord` pair survives only for the lower-case inline-sentence uses that
 * already `.toUpperCase()` at the call site.
 */
import { dict, type Locale, type Dict } from "@/lib/i18n-dict";

/** The two product lines, as `PredictionMarket.productLine` stores them. */
export type LabelProductLine = "MARKET" | "UPDOWN";

/** How a side is STORED — one vocabulary for both products. */
export type StoredSide = "YES" | "NO";

/** How the Up & Down layer presents a side once it has mapped it. */
export type Direction = "UP" | "DOWN";

/** A settled verdict, as stored. `VOID` is a real third arm, never a missing side. */
export type StoredOutcome = "YES" | "NO" | "VOID";

/**
 * Accept either vocabulary and return the stored one.
 *
 * ⭐ Deliberately tolerant, because the Up & Down surfaces genuinely hold `"UP" | "DOWN"`
 * by the time they render (the board mapped it three files ago). Making those callers
 * convert back before asking for a word would be a fifth copy of the very mapping this
 * module exists to end.
 */
export function toStoredSide(side: StoredSide | Direction): StoredSide {
  return side === "UP" ? "YES" : side === "DOWN" ? "NO" : side;
}

/**
 * The word a player reads for a SIDE, in their language and in the vocabulary of the
 * product that owns it.
 *
 * @param t            the reader's dictionary (`useT()` on the client, `getServerT()` on the server)
 * @param side         the stored side, or the Up & Down direction if that is what you hold
 * @param productLine  which product this side belongs to — required, see the header
 */
export function sideWord(t: Dict, side: StoredSide | Direction, productLine: LabelProductLine): string {
  const stored = toStoredSide(side);
  if (productLine === "UPDOWN") return stored === "YES" ? t.market.udUp : t.market.udDown;
  return stored === "YES" ? t.common.yes : t.common.no;
}

/**
 * The word a player reads for a settled OUTCOME.
 *
 * ⛔ A VOID IS NEVER AN UP, A DOWN, A YES OR A NO — the same law `displayDirection()`
 * states in `updown-refund-reason.ts`. It gets its own word in both products, because
 * a refund is neutral (§C4) and printing a direction over one is a false statement
 * about someone's money.
 */
export function outcomeWord(t: Dict, outcome: StoredOutcome | Direction, productLine: LabelProductLine): string {
  if (outcome === "VOID") return t.market.statusVoid;
  return sideWord(t, outcome, productLine);
}

/**
 * Server variant — picks the dictionary itself.
 *
 * ⭐ THIS IS WHAT THE NOTIFICATION PATH NEEDS. `notify()` writes the EN, SW and ZH body
 * of one message in a single call, so it cannot use a single reader's `t`; it needs the
 * same word in three languages at once. Before this existed, `notifySelectionClosed`
 * hard-wrote the ASCII token `YES` into its Swahili and Chinese sentences, and a
 * Chinese player read *"若 YES 获胜"* in a product whose dictionary says `是`.
 */
export function sideWordIn(locale: Locale, side: StoredSide | Direction, productLine: LabelProductLine): string {
  return sideWord(dict[locale] as Dict, side, productLine);
}

/** Server variant of `outcomeWord` — see `sideWordIn`. */
export function outcomeWordIn(locale: Locale, outcome: StoredOutcome | Direction, productLine: LabelProductLine): string {
  return outcomeWord(dict[locale] as Dict, outcome, productLine);
}

/** How a position's own state is STORED (`PositionStatus` in the schema). */
export type PositionStatusValue = "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";

/**
 * What a player's own position is CALLED, in their language and their product.
 *
 * ⛔ THE ENUM ITSELF WAS REACHING PEOPLE. `notify-poller.tsx` put `p.status` straight into
 * an **OS-level** browser notification title — so a Swahili player's phone read
 * *"Soko limetatuliwa · WIN"* while the in-app toast three lines above it was fully
 * localised. One event, two channels, one of them in English.
 *
 * ⚠️ Up & Down has its OWN words for these states and always has (`udPos*`) — which is
 * exactly why this is product-aware rather than one flat map. `CASHED_OUT` is shared: the
 * product has one word for it and there is no `udPosCashedOut` to disagree with.
 */
export function positionStatusWord(t: Dict, status: PositionStatusValue, productLine: LabelProductLine): string {
  if (productLine === "UPDOWN") {
    switch (status) {
      case "OPEN": return t.market.udPosOpen;
      case "WIN": return t.market.udPosWon;
      case "LOSS": return t.market.udPosLost;
      case "VOID": return t.market.udPosRefunded;
      case "CASHED_OUT": return t.common.cashedOut;
    }
  }
  switch (status) {
    case "OPEN": return t.common.pending;
    case "WIN": return t.market.resolvedWin;
    case "LOSS": return t.market.resolvedLoss;
    case "VOID": return t.common.voided;
    case "CASHED_OUT": return t.common.cashedOut;
  }
}
