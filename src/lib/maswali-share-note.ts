/**
 * MASWALI MILLIONEA — WHAT A WINNING SHARE'S MARK SAYS, AND TO WHOM (MASWALI-BUILD S6 review; MB-43, OD-07; owner rulings
 * D19/D20, HOUSE-BOTS.md §10).
 *
 * A won ticket carries one mark, `MaswaliTicket.frozenReason`, written only by `maswali-settlement.ts`:
 *   · none — the share is paid;
 *   · `compliance · <the officer's words>` — Compliance held it (`holdMaswaliShare`);
 *   · `forfeited · <the officer's words>` — Compliance returned it to the jackpot (`forfeitMaswaliShare`);
 *   · anything else — a hold the settlement placed by itself, at the release, on the account's standing (MB-43), in the
 *     settlement's own working words.
 *
 * ⛔ ONE READING, WHEREVER A MARK LEAVES THE SETTLEMENT: the share's state, and the note a person reads. The settlement's
 *    own words reach no file or pack — every hold it placed by itself reads as one neutral phrase, the phrase its payout
 *    row already prints — and their detail stays where it was written: the wallet hold's own record and the audit trail.
 *    An officer's words are theirs, and read as they wrote them.
 * ⭐ THE CONSOLE'S ONE EXCEPTION (S6 review round 3): the officer DECIDING a held share reads, on the integrity page, the
 *    settlement's own words for a short ALLOWLIST of holds that name the account's standing or a deposit check
 *    (`MILLIONEA_CONSOLE_HOLD_REASONS`) — never a house desk's, never one the list does not name — through
 *    `consoleShareNoteOf`. The regulator's CSV keeps `shareNoteOf`, neutral for every one, and the access exports carry
 *    the share's state alone (`shareStateOf`).
 * Pure (its one import is a type, erased at build), so every reader — the evidence pack, the access exports, the
 * integrity page — reads one rule.
 */
import type { HoldReason } from "@/lib/server/maswali-settlement";

/** The settlement's mark on a share Compliance forfeited to the jackpot. */
export const MILLIONEA_FORFEIT_MARK = "forfeited · ";
/** The settlement's mark on a share Compliance held. */
export const MILLIONEA_COMPLIANCE_HOLD_MARK = "compliance · ";
/** What every hold the settlement placed by itself reads as (en: the pack and the console are English). */
export const MILLIONEA_HELD_NOTE = "held for review";

export type MillioneaShareState = "paid" | "held" | "forfeited";

/** Whether a mark is a forfeit. */
export function isForfeitedShare(frozenReason: string | null | undefined): boolean {
  return typeof frozenReason === "string" && frozenReason.startsWith(MILLIONEA_FORFEIT_MARK);
}

/** A won ticket's share as its mark leaves it: paid, held (for any reason) or forfeited. */
export function shareStateOf(frozenReason: string | null | undefined): MillioneaShareState {
  if (frozenReason == null) return "paid";
  return isForfeitedShare(frozenReason) ? "forfeited" : "held";
}

/**
 * ⭐ THE NOTE A PERSON READS beside a won ticket's share, or null for a paid one: the officer's own words for a hold or a
 * forfeit Compliance made, and `MILLIONEA_HELD_NOTE` for every hold the settlement placed by itself — never its words.
 * ⛔ FAIL-SAFE, NOT A LIST: only the two officer marks are read through; EVERY other mark is neutral, so a hold reason a
 *    later change adds to the settlement reads neutral without a change here.
 */
export function shareNoteOf(frozenReason: string | null | undefined): string | null {
  if (frozenReason == null) return null;
  if (isForfeitedShare(frozenReason)) return frozenReason.slice(MILLIONEA_FORFEIT_MARK.length).trim() || "forfeited";
  if (frozenReason.startsWith(MILLIONEA_COMPLIANCE_HOLD_MARK)) return frozenReason.slice(MILLIONEA_COMPLIANCE_HOLD_MARK.length).trim() || MILLIONEA_HELD_NOTE;
  return MILLIONEA_HELD_NOTE;
}

/**
 * S6 review round 3 · the settlement's own hold words the deciding officer may read on the console AS THEY ARE: the
 * account's standing, and the deposit checks a later lane adds. ⛔ AN ALLOWLIST, NEVER A DENYLIST: every word not named
 * here — a house desk's, or any a later change writes — reads `MILLIONEA_HELD_NOTE` on the console too, until a ruling
 * adds it here. ⛔ The console only: the CSV and the access exports never read this list.
 * R4 · its words are the settlement's own (`HoldReason`), checked at build: a reason renamed there fails the build here,
 * rather than turning neutral on the console without a word.
 */
export const MILLIONEA_CONSOLE_HOLD_REASONS = Object.freeze([
  "staff account", "account suspended", "account closed", "deposit under review", "deposit check unreadable",
] as const satisfies readonly HoldReason[]);

/**
 * ⭐ THE NOTE THE DECIDING OFFICER READS on the integrity page: an allowlisted hold word as the settlement wrote it, and
 * everything else exactly as `shareNoteOf` reads it — so an unknown word is neutral here too (fail-safe).
 */
export function consoleShareNoteOf(frozenReason: string | null | undefined): string | null {
  if (frozenReason != null && (MILLIONEA_CONSOLE_HOLD_REASONS as readonly string[]).includes(frozenReason)) return frozenReason;
  return shareNoteOf(frozenReason);
}
