/**
 * THE REGISTER'S STATIC WORDS, SAID ONCE (MASWALI-BUILD S5-R3-FIX 8; the lead's ruling of 2026-10-23, DESIGN_AUTHORITY §M4a
 * rule 5 and §M8a item 22): words the dictionary holds whole, with no datum in them, as the register's pages set them and
 * as their loading drawings set them unseen (`register-ghost.tsx`, `[week]/register-week-ghost.tsx`, through the kit's
 * `GhostWords`) — so each drawing breaks them where its page does, in any engine, by construction.
 *   · the index's intro (`page.tsx`) and the commitments' closing sentence (`WeekCommitments`) are read by their pages
 *     from here;
 *   · a commitment's fingerprint is 64 hex characters in the numerals' mono, wrapped by character (`break-all`): its width
 *     is fixed whatever it says, so its words are a same-width template, 64 of one character;
 *   · the ledger's labels are a rolled week's — the common weekly case the drawing models — as the ONE ledger's rows say
 *     them (`millioneaLedgerRows`: a string label set as the kit's row sets one, the carry's kept as a fact with its week;
 *     `test:maswali-register` holds them equal), the carry's week a same-width template: two mono digits. A label's column
 *     is its row less its figure, which is data: the drawing models the figure as a bar.
 * ⛔ Pure, with no word and no dictionary of its own: each recipe reads only what it is handed (`test:maswali-ui` 1.3b). No
 *    directive: the server pages read it as the client drawings do.
 */
import type { GhostWordsIn } from "@/components/maswali/maswali-ghost-words";
import { weekWord } from "@/components/maswali/maswali-format";
import { fill } from "@/lib/utils";

/** The index's intro, kept as the page keeps a fact. */
export function registerIntro({ t }: GhostWordsIn): { text: string } {
  return { text: t.millionea.regIntro };
}

/** The commitments' closing sentence, set bare as `WeekCommitments` sets it. */
export function commitExplainer({ t }: GhostWordsIn): { text: string; keep: "bare" } {
  return { text: t.millionea.commitExplainer, keep: "bare" };
}

/** How many hex characters a commitment's fingerprint is (SHA-256): the template's length. */
export const FINGERPRINT_CHARS = 64;
/** A commitment's fingerprint — the question set's hash or the tickets' root — as its same-width template, set bare. */
export function commitFingerprint(): { text: string; keep: "bare" } {
  return { text: "0".repeat(FINGERPRINT_CHARS), keep: "bare" };
}

/** The week a rolled week's carry names, as the drawing sets it: a same-width template (two mono digits, as `keepFact`
 *  sets a week's number). */
export const CARRY_WEEK_TEMPLATE = 48;

/** A rolled week's ledger labels, in the ONE ledger's order (`millioneaLedgerRows`), each as its row sets it. */
export function ledgerSales({ t }: GhostWordsIn): { text: string; keep: "label" } {
  return { text: t.millionea.ledgerSales, keep: "label" };
}
export function ledgerMoneyIn({ t }: GhostWordsIn): { text: string; keep: "label" } {
  return { text: t.millionea.ledgerMoneyIn, keep: "label" };
}
export function ledgerFloor({ t }: GhostWordsIn): { text: string; keep: "label" } {
  return { text: t.millionea.floor, keep: "label" };
}
export function ledgerFee({ t }: GhostWordsIn): { text: string; keep: "label" } {
  return { text: t.millionea.fee, keep: "label" };
}
export function ledgerCarriedOut({ t }: GhostWordsIn): { text: string; runs: string[] } {
  return { text: fill(t.millionea.carriedOut, { week: CARRY_WEEK_TEMPLATE }), runs: [weekWord(t, CARRY_WEEK_TEMPLATE)] };
}
export function ledgerMoneyOut({ t }: GhostWordsIn): { text: string; keep: "label" } {
  return { text: t.millionea.ledgerMoneyOut, keep: "label" };
}
