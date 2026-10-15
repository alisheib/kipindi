/**
 * ⭐ THE ONE QUESTION EVERY MESSAGE THAT LEAVES THE SITE ASKS ABOUT ITS TITLE (the Vodacom plan's S12, WP12 and WP13;
 * `docs/VODACOM-PLAN.md` §5 S12 "Outside the site"): may it carry the officer-approved short title in place of the full
 * question? YES ONLY WHEN THE NEW JOURNEY IS ACTIVE FOR EVERYONE — the S15 flip. Before it, every email, bell row, push,
 * share picture and share preview carries the full title, byte for byte as it did before S12.
 *
 * WHY THE GLOBAL STATE AND NOT THE PREVIEW PASS. A letter, a bell row and a share picture run with no request that is
 * the reader's (a settlement sweep, a crawler fetching an image), so a staff preview pass cannot decide them: one
 * message reaches a player who has never seen the new journey. Only the rollout itself can, and only at ACTIVE.
 *
 * ⛔ IT FAILS CLOSED, THREE WAYS DEEP:
 *   1. the ceiling (`simpleJourneyCeiling`, feature-state.ts) is read first, synchronously: the state is the LOWER of the
 *      ceiling and the Owner's stored switch (`composeSimpleJourney`), so under any ceiling but ACTIVE — the shipped
 *      STAFF_PREVIEW until S15 — the answer is no without reading the switch's row at all;
 *   2. `simpleJourneyStateNow` never rejects: a failed read, an unread row and a row that is not a correctly sealed
 *      record all answer WITHDRAWN, which is not ACTIVE;
 *   3. anything thrown here answers false.
 * So the full title is what a failure sends, and the short title needs every read to succeed and say ACTIVE.
 *
 * ⭐ READ ONCE PER SEND. A sending operation asks once and hands the answer to every part of what it sends — the bell row,
 * its push and the letter for one receipt; every notice and letter of one settlement, close, verdict or cancellation;
 * one share picture — so the parts of one send can never disagree. A player's own request (a bet, a sale) never waits
 * for it: its receipt is sent when the answer lands. Fresh to the switch's own snapshot (≤ 10 s,
 * `JOURNEY_SWITCH_MAX_AGE_MS`): an Owner's kill reaches messages as fast as it reaches screens.
 *
 * WHAT the title then is — per language the approved short title, else that language's full title, never another
 * language's — is the pure rule `messageTitle` / `messageTitles` (lib/markets/short-title.ts).
 *
 * Guard: `npm run test:message-titles` (both stores) · red twin `npm run red:message-titles`.
 */
import { simpleJourneyCeiling } from "@/lib/feature-state";
import { simpleJourneyStateNow } from "./simple-journey-switch";

/** True only while the new journey is ACTIVE for everyone. ⛔ Never rejects; any failure answers false. */
export async function shortTitlesInMessagesNow(): Promise<boolean> {
  try {
    if (simpleJourneyCeiling().ceiling !== "ACTIVE") return false;
    return (await simpleJourneyStateNow()) === "ACTIVE";
  } catch {
    return false;
  }
}
