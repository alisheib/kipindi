/**
 * HOW A NOTIFICATION KIND LOOKS — the one home for it (§0a).
 *
 * ⛔ WHY THIS IS A MODULE AND NOT TWO SWITCH STATEMENTS. The bell panel and
 * `/notifications` render the same rows. If each owned its own icon/tint map, a kind added
 * or re-toned in one would silently disagree with the other, and the disagreement would be
 * invisible until a player saw a win painted like a loss on one surface and not the other.
 *
 * That is not hypothetical in this repo: notification COPY lived in two places for three
 * weeks and the Chinese loss string was fixed in one and left wrong in the other — it told
 * a reader their bet had never gone through at the moment it was placed and lost (E-179).
 * Appearance is the same class of fact. One definition, imported by every surface.
 *
 * ⛔ DO NOT add a colour here that is not already in the kit's token vocabulary, and do not
 * re-tone a kind without reading DESIGN_AUTHORITY §B4 — gold is earned money, claret is an
 * irreversible operator ceremony, and neither is a decoration.
 *
 * Guarded by `npm run test:notifications-page` §1: both surfaces must import from here, and
 * neither may declare its own map.
 */
import { I } from "@/components/ui/glyphs";
import type { StoredNotification } from "@/lib/server/store";

type Kind = StoredNotification["kind"];

/**
 * The glyph for a kind.
 *
 * ⚠️ Returns the component, not an element, so a caller controls the size — the bell renders
 * at 13px inside a 28px plate, the page at 15px inside a 40px one.
 */
export const iconFor = (k: Kind) => {
  switch (k) {
    case "WIN":          return I.trophy;
    case "LOSS":         return I.trendingDown;
    case "BET_PLACED":   return I.ticket;
    case "SELECTION_CLOSED": return I.calendarClock;
    case "DEPOSIT":      return I.arrowDown;
    case "WITHDRAW":     return I.arrowUp;
    case "KYC":          return I.shieldcheck;
    case "ROUND_RESULT": return I.activity;
    case "MATCH_START":  return I.coins;
    case "RG":           return I.heartPulse;
    case "SECURITY":     return I.keyRound;
    case "AFFILIATE":    return I.megaphone;
    case "PROPOSAL":     return I.fileCheck;
    case "WATCHLIST":    return I.star;
    default:             return I.coins;
  }
};

/**
 * Kit-tinted swatch per notification kind (OKLCH-tuned for dark + light).
 *
 * ⛔ A WIN IS THE ONLY MONEY OUTCOME THAT IS GOLD. A loss is deliberately neutral — not red,
 * which reads as *something went wrong*, and never gold, which is the celebration ink. That
 * asymmetry is LCCP harm-prevention, not taste: the product must not be visually happier when
 * it takes money than when it returns it.
 */
export const tintFor = (k: Kind) => {
  switch (k) {
    case "WIN":          return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "LOSS":         return "border-border bg-bg-overlay text-text-muted";
    case "BET_PLACED":   return "border-info-border bg-info-bg/30 text-info-fg";
    case "SELECTION_CLOSED": return "border-info-border bg-info-bg/30 text-info-fg";
    case "ROUND_RESULT": return "border-border bg-bg-overlay text-text-muted";
    /* 🔴 §B2a (D2, 2026-08-21) — A DEPOSIT IS MONEY ARRIVING, NOT A BET WON. This wore
       `--yes-*`, the ink that means *your money is on this side of a market*, on a notification
       about a bank transfer. The app-state family is `success`, and the SPELLING is decided by
       the neighbours: every other non-gold tone on this list reads
       `border-<family>-border bg-<family>-bg/30 text-<family>-fg`. */
    case "DEPOSIT":      return "border-success-border bg-success-bg/30 text-success-fg";
    case "WITHDRAW":     return "border-warning-border bg-warning-bg/30 text-warning-fg";
    case "KYC":          return "border-info-border bg-info-bg/30 text-info-fg";
    case "RG":           return "border-info-border bg-info-bg/30 text-info-fg";
    /* 🔴 §B2a — and a SECURITY notice is not a lost bet. `--no-*` is the ink that means *your
       money is gone*; a new-sign-in alert borrowing it spends the money vocabulary on chrome.
       `danger` is the app-state family for "something needs your attention now", same recipe. */
    case "SECURITY":     return "border-danger-border bg-danger-bg/30 text-danger-fg";
    case "MATCH_START":  return "border-border bg-bg-overlay text-text-muted";
    case "AFFILIATE":    return "border-gold-700 bg-gold-500/10 text-gold-300";
    case "PROPOSAL":     return "border-gold-700 bg-gold-500/10 text-gold-300";
    // Informational, never a "bet now" nudge → royal/info, never gold.
    case "WATCHLIST":    return "border-info-border bg-info-bg/30 text-info-fg";
    default:             return "border-border bg-bg-overlay text-text-muted";
  }
};
