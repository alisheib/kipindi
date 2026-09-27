/**
 * What a market's SHARE PREVIEW may say about its price — the WhatsApp / social card (og:image) and
 * its og:description (landing v3 WP14b, K50).
 *
 * ⭐ THE CARD'S RULE, ONE MORE SURFACE. A shared link is the first thing many players ever see of a
 * market, and until WP14b the preview read `impliedYesPct` directly: "YES 100% · NO 0%" on a market
 * with money on one side only, and an invented "YES 50% · tipping" on a market nobody had bet on —
 * both of which the card itself stopped printing (MOBILE-VISUAL ruling 13, WP6; D29). This reads the
 * same `priceState`, so the image and the description come from ONE rule and cannot disagree (B6).
 *
 * ⚠️ ENGLISH ON PURPOSE: the preview is English by the market page's own metadata note (a crawler
 * carries no locale). The words are the dictionary's English, never retyped here.
 * ⛔ NO REFUND SENTENCE IN THE PREVIEW: its conditions live on the card (INHERIT-MANIFEST L22); a second
 * copy is how two surfaces drift (E-196).
 *
 * No server imports, no "use client" — the nodejs og route and the page's `generateMetadata` both call it.
 */
import { isTipping, priceState } from "./price-state";
import { dict } from "../i18n-dict";
import { outcomeWordIn, type LabelProductLine, type StoredOutcome } from "../side-label";

export type SharePreviewPrice =
  | { kind: "priced"; yesPct: number; noPct: number; lean: "tipping" | "leans yes" | "leans no" }
  | { kind: "oneSided"; label: string }
  | { kind: "none"; label: string };

export function sharePreviewPrice(yesPool: number, noPool: number, predictorCount: number): SharePreviewPrice {
  const p = priceState(yesPool, noPool);
  if (p.kind === "priced") {
    const lean = isTipping(p.yesPct) ? "tipping" : p.yesPct > 50 ? "leans yes" : "leans no";
    return { kind: "priced", yesPct: p.yesPct, noPct: 100 - p.yesPct, lean };
  }
  if (p.kind === "oneSided") return { kind: "oneSided", label: dict.en.market.oneSideOnly };
  // The card's `neverBet` rule: "No bets yet" only where nobody EVER bet; a cashed-out pool has no pool.
  return { kind: "none", label: predictorCount === 0 ? dict.en.market.noBetsYet : dict.en.market.noPoolYet };
}

/**
 * ⭐ C1 · A SETTLED market's preview leads with its RESULT — the verdict word in the market's own product
 * vocabulary (Up / Down for a round) — and reads its split as the FINAL POOL, never a lean: a finished market
 * does not "lean". `null` while the market is open or closed-but-unresolved.
 * ⛔ A RESOLVED market with no recorded verdict gets the word "Resolved" and NO tone: no side is better than a
 * wrong side (the card's own rule).
 */
export type SharePreviewSettled = { tone: StoredOutcome | null; caption: string; word: string; poolCaption: string };

export function sharePreviewSettled(
  status: string,
  resolvedOutcome: StoredOutcome | null | undefined,
  productLine: LabelProductLine,
): SharePreviewSettled | null {
  if (status !== "RESOLVED" && status !== "VOIDED") return null;
  const base = { caption: dict.en.market.result, poolCaption: dict.en.market.resFinalPool };
  const outcome: StoredOutcome | null = resolvedOutcome ?? (status === "VOIDED" ? "VOID" : null);
  if (!outcome) return { ...base, tone: null, word: dict.en.market.statusResolved };
  return { ...base, tone: outcome, word: outcomeWordIn("en", outcome, productLine) };
}

/** og:description for a market that is not a win card. Settled: the result first, and no price at all. */
export function sharePreviewDescription(p: SharePreviewPrice, settled: SharePreviewSettled | null = null): string {
  if (settled) return `${settled.caption}: ${settled.word}.${p.kind === "oneSided" ? ` ${p.label}.` : ""} Predict on 50pick.`;
  if (p.kind === "priced") return `YES ${p.yesPct}% · NO ${p.noPct}%. Predict on 50pick.`;
  return `${p.label}. Predict on 50pick.`;
}
