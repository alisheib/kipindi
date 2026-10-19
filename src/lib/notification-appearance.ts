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
import { I, type DuoGlyphKey, type FillGlyphKey } from "@/components/ui/glyphs";
import type { PlateVariant } from "@/components/ui/icon-plate";
import type { StoredNotification } from "@/lib/server/store";

type Kind = StoredNotification["kind"];

/** A win's seal, the one kind drawn in Fill (`tierFor`) — typed, so it can only name a key that ships a Fill (and the
 *  Duotone every other kind's plate draws, `DuoGlyphKey`). */
const WIN_SEAL = "resolved" as const satisfies FillGlyphKey & DuoGlyphKey;

/**
 * The glyph for a kind — the meaning's own key, the one every other door to it wears (PHOSPHOR-MIGRATION §8b, the audit of
 * 2026-10-19: deposit and withdraw were the plain arrows, a proposal a certificate, the friends programme a megaphone,
 * a loss Up & Down's DOWN, a round's result a pulse, limits a heartbeat, betting closed a date).
 *
 * ⚠️ Returns the component, not an element, so a caller controls the size: the bell and `/notifications` both render it
 * at `plateGlyph(32)` on a 32px plate, and draw it in `tierFor`'s tier. Every key is a `DuoGlyphKey` (`keyFor`), so tsc
 * refuses a kind whose plate would fall back to Bold (PHOSPHOR-MIGRATION release 2).
 * ⛔ Every kind a player is sent has its case (W4's review found a verdict, a dispute and a bonus falling to the bell).
 * The bell stays for the kinds a player is never sent — the staff's own notices, which D19 keeps out of a player's
 * bundle by name (test:house-bot-disclosure 1.1) — and for a value older data may hold.
 */
const keyFor = (k: Kind): DuoGlyphKey => {
  switch (k) {
    case "WIN":          return WIN_SEAL; // the seal, in Fill (tierFor): a win is earned (§M3, §M7)
    case "LOSS":         return "xCircle"; // on the quiet plate: a loss is bookkeeping (§M7)
    case "BET_PLACED":   return "ticket";
    case "SELECTION_CLOSED": return "hourglassOff"; // betting closed, as the cards and the question page draw it
    case "DEPOSIT":      return "arrowDownToLine"; // R-LEXICON 5.3A
    case "WITHDRAW":     return "arrowUpFromLine"; // R-LEXICON 5.3A
    case "KYC":          return "idCard"; // identity verification, as its hub row; `shieldcheck` means verified
    case "ROUND_RESULT": return "resolved"; // a result recorded (§3), on the quiet plate
    case "MATCH_START":  return "live"; // nothing writes this kind today; a start is the Live mark
    case "RG":           return "limits"; // R-LEXICON 5.7A
    case "SECURITY":     return "keyRound";
    case "AFFILIATE":    return "users"; // the friends programme, as the hub's Alika row
    case "PROPOSAL":     return "idea"; // R-LEXICON 5.6A
    case "WATCHLIST":    return "star";
    case "VERDICT":      return "resolved"; // a verdict recorded, the money not moved yet: a result recorded (§3), quiet
    case "OBJECTION":    return "flag"; // a dispute, as /fairness's objection sign-off and the resolution panel's dispute
    case "BONUS":        return "gift"; // a bonus, as the wallet's bonus panel
    default:             return "bell";
  }
};
export const iconFor = (k: Kind) => I[keyFor(k)];

/** The tier a kind's glyph draws in: a win's seal is solid (Fill: earned, §8c); every other kind is the notice's identity
 *  on its plate, in Duotone (PHOSPHOR-MIGRATION release 2, W5; DESIGN_AUTHORITY §K3 item 3). */
export const tierFor = (k: Kind): "fill" | "duo" => (k === "WIN" ? "fill" : "duo");

/**
 * The plate per notification kind: an `IconPlate` variant, each one recipe from the tokens (globals.css `.kp-plate--*`,
 * PHOSPHOR-MIGRATION release 2). The recipes are the ones these plates wore as classes: a family's edge over a 30% veil of
 * its wash, in its ink; the quiet plate the sunken surface; the win's gold.
 *
 * ⛔ A WIN IS THE ONLY MONEY OUTCOME THAT IS GOLD. A loss is deliberately neutral — not red,
 * which reads as *something went wrong*, and never gold, which is the celebration ink. That
 * asymmetry is LCCP harm-prevention, not taste: the product must not be visually happier when
 * it takes money than when it returns it.
 */
export const tintFor = (k: Kind): PlateVariant => {
  switch (k) {
    case "WIN":          return "gold";
    case "LOSS":         return "quiet";
    case "BET_PLACED":   return "info";
    case "SELECTION_CLOSED": return "info";
    case "ROUND_RESULT": return "quiet";
    /* 🔴 §B2a (D2, 2026-08-21) — A DEPOSIT IS MONEY ARRIVING, NOT A BET WON. This wore
       `--yes-*`, the ink that means *your money is on this side of a market*, on a notification
       about a bank transfer. The app-state family is `success`, and the SPELLING is decided by
       the neighbours: every other non-gold tone on this list is its family's plate (`.kp-plate--<family>`,
       which reads the family's border, its wash at 30% and its ink). */
    case "DEPOSIT":      return "success";
    /* ⛔ NOT AMBER (R5-C, the second gold audit, 2026-10-09). A withdrawal is the player's own money moving (§M3a D1:
       "earns nothing"), and nobody must act on it — amber's one meaning (§B11) — so the warning family, whose
       `--warning-fg` was then `--gilt` (amber since Ali's ruling (1) of 2026-10-10), claimed both alarm and gold. It
       reads the informational tone its account-side
       neighbours read (KYC, RG); the payment's own status keeps the §B11 words on the row it opens. */
    case "WITHDRAW":     return "info";
    case "KYC":          return "info";
    case "RG":           return "info";
    /* 🔴 §B2a — and a SECURITY notice is not a lost bet. `--no-*` is the ink that means *your
       money is gone*; a new-sign-in alert borrowing it spends the money vocabulary on chrome.
       `danger` is the app-state family for "something needs your attention now", same recipe. */
    case "SECURITY":     return "danger";
    case "MATCH_START":  return "quiet";
    /* ⛔ The header above says it: "A WIN IS THE ONLY MONEY OUTCOME THAT IS GOLD". An affiliate notice (a friend joined,
       a code shared) and a proposal notice (reviewed, approved, listed) are KINDS, mostly not money — and an approval
       is permission, not money (§B11). They were the gold plate; they read the informational tone (R5-C, 2026-10-09). */
    case "AFFILIATE":    return "info";
    case "PROPOSAL":     return "info";
    // Informational, never a "bet now" nudge → royal/info, never gold.
    case "WATCHLIST":    return "info";
    /* Release 2 (W4's review found these three falling to the default): a verdict recorded is a result recorded, quiet as
       ROUND_RESULT — nobody has been paid, and both sides get it; a dispute ruled and a bonus (queued, credited, unlocked,
       expired) are notices about the player's own account, the informational tone of their neighbours. A bonus is never
       gold: gold is money EARNED, and a bonus is given (§Q5). */
    case "VERDICT":      return "quiet";
    case "OBJECTION":    return "info";
    case "BONUS":        return "info";
    default:             return "quiet";
  }
};
