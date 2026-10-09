/**
 * THE BREAK'S NOTICE WHERE A STAKE WOULD BE — one form for the three places a stake is placed in place (the visual pass,
 * round 6, helper R6-A, 2026-10-09; reviewer A's A2).
 *
 * 🔴 WHAT THE REVIEW FOUND. During a break or a self-exclusion the market page still offered its whole bet panel — the
 *    dial, the stake and its confirm — and Up & Down its one-tap stakes, on the board's cards and on the round's panel.
 *    The server refused every one (`cooling_off` / `self_excluded`), but the screen invited the very thing the player had
 *    paused, while the same market page already said the break under "Your positions" (R4-I).
 * ⭐ So where the stake control stands, a reader on a break gets the break's own notice: the approved sentence with its
 *    end (`rg.breakActive` / `rg.exclusionActive`, filled by `breakSentence` — the one formatter, the end one unbreakable
 *    run), in the kit's neutral Callout with the lock — a paused action, the deposit page's notice for the same break
 *    (neutral, not warning: the warning ink is gilt and a break has earned nothing, R4-K) — announced as a status.
 *    Every word is the dictionary's; nothing here composes a sentence.
 * ⭐ ONE FORM IN ALL THREE PLACES: the RG page's own standing notice (`size="md"`, the 13px reading rung, R4-I). A 360px bet
 *    column, a 300px board card and the round's 300px panel all hold it at the reading size; the deposit page's `stack`
 *    form is for a notice that IS the page, and its 48px sides would leave a board card ~170px of text.
 * ⛔ IT READS NOTHING. Each page reads its own reader's lockout (`isLockedOut` → `breakStateOf`, failing OPEN — a failed
 *    read is "not on a break", `feature-state.ts` LAW 1, and the server still refuses the bet) and hands the sentence here.
 * A plain module (no "use client"): the market page draws it on the server, the board card and the round panel on the
 * client.
 */
import { Callout } from "@/components/ui/callout";
import { keepText } from "@/components/ui/keep-run";
import type { KeptBody } from "@/components/ui/empty-state-text";

export function BetBreakNotice({ body, testId }: {
  /** The approved sentence with its end, as `breakSentence` (break-end.ts) returns it. */
  body: KeptBody;
  /** The surface's own hook for a drive: `market-bet-break`, `updown-card-break`, `updown-round-break`. */
  testId: string;
}) {
  return (
    <div data-testid={testId} data-bet-break="">
      <Callout tone="neutral" size="md" glyph="lock" role="status">{keepText(body.text, body.keep)}</Callout>
    </div>
  );
}
