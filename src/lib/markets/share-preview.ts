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
import { priceState } from "./price-state";
import { dict } from "../i18n-dict";

export type SharePreviewPrice =
  | { kind: "priced"; yesPct: number; noPct: number; lean: "tipping" | "leans yes" | "leans no" }
  | { kind: "oneSided"; label: string }
  | { kind: "none"; label: string };

export function sharePreviewPrice(yesPool: number, noPool: number, predictorCount: number): SharePreviewPrice {
  const p = priceState(yesPool, noPool);
  if (p.kind === "priced") {
    const lean = Math.abs(p.yesPct - 50) < 4 ? "tipping" : p.yesPct > 50 ? "leans yes" : "leans no";
    return { kind: "priced", yesPct: p.yesPct, noPct: 100 - p.yesPct, lean };
  }
  if (p.kind === "oneSided") return { kind: "oneSided", label: dict.en.market.oneSideOnly };
  // The card's `neverBet` rule: "No bets yet" only where nobody EVER bet; a cashed-out pool has no pool.
  return { kind: "none", label: predictorCount === 0 ? dict.en.market.noBetsYet : dict.en.market.noPoolYet };
}

/** og:description for a market that is not a win card. */
export function sharePreviewDescription(p: SharePreviewPrice): string {
  if (p.kind === "priced") return `YES ${p.yesPct}% · NO ${p.noPct}%. Predict on 50pick.`;
  return `${p.label}. Predict on 50pick.`;
}
