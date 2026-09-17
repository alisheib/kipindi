/**
 * A HOUSE BOT'S STATUS, AS STAFF READ IT — one word and one chip per status (C5-SPEC ruling 186 (2)).
 *
 * The words are 03 §1's chip words ("Active", "Paused", "Auto-paused", "Removed"), which Commit 7's console chips use for
 * the same thing; the tones are PLAN's (ACTIVE green, PAUSED amber, AUTO_PAUSED claret, REMOVED slate), expressed through
 * the platform's one tone → chip translation. Every staff surface that names a bot's status reads THIS map: the
 * designation copy, the admin player chip and the compliance chip. A word typed beside a label is a second answer.
 *
 * ⛔ SERVER ONLY, AND NEVER IN `src/lib/status-tone.ts`. That dictionary is value-imported by client components, so a
 * house entry there would ship to every browser (D19; C5-SPEC §1 S24). Client controls receive a rendered element or a
 * neutral string from a server page, never this module.
 */
import type { HouseBotStatus } from "@/lib/house-bot/constants";
import { TONE_CHIP, type StatusChipVariant, type StatusTone } from "@/lib/status-tone";

export type HouseBotStatusDisplay = { word: string; tone: StatusTone; chip: StatusChipVariant };

export const HOUSE_BOT_STATUS_DISPLAY: Readonly<Record<HouseBotStatus, HouseBotStatusDisplay>> = {
  ACTIVE: { word: "Active", tone: "green", chip: TONE_CHIP.green },
  PAUSED: { word: "Paused", tone: "amber", chip: TONE_CHIP.amber },
  AUTO_PAUSED: { word: "Auto-paused", tone: "claret", chip: TONE_CHIP.claret },
  REMOVED: { word: "Removed", tone: "slate", chip: TONE_CHIP.slate },
};

/** The status word staff read for a bot. */
export function houseBotStatusWord(status: HouseBotStatus): string {
  return HOUSE_BOT_STATUS_DISPLAY[status].word;
}
