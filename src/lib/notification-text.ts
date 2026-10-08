/**
 * HOW A NOTIFICATION'S SENTENCE IS PUT TOGETHER, AND HOW AN OLD ONE IS READ — one plain module, imported by the writer
 * (`notification-service.ts`) and by both readers (the bell, `notifications-panel.tsx`, and `/notifications`), so the rule
 * that writes a sentence and the rule that repairs an old one cannot drift apart. Pure: `test:visual-pass-r3c` drives it.
 *
 * 🔴 ROUND 3 OF THE VISUAL PASS, 2026-10-09, tile 192 (/notifications, sw 1280). One row read
 *     "…limefutwa: Dev fixture — source withdrawn before settlement.. Dau lako lote limerejeshwa kwenye pochi yako.
 *      · pos_34d10350dfa7510cfad5"
 * — two defects of composition, not of words:
 *   · a DOUBLE FULL STOP: the template ends the officer's reason with its own ".", and the reason already had one;
 *   · a RAW POSITION ID IN PROSE: " · pos_…" was appended to every notice about one position. It is there for
 *     `notify()`'s 90-second de-duplication, which compares the message and the link — two refunds of the same stake on
 *     the same market must stay two notices — and it told the reader nothing they could use.
 * ⭐ The id's job moves to the LINK: a notice about one position now opens THAT ticket — the market's page (or the Up &
 * Down round's) at the position's own anchor, the very place `/positions/<id>` resolves to (`position-permalink.ts`,
 * E-101) — so the link is unique per position, the de-duplication stays honest, and the sentence carries no id.
 */
import { positionAnchorId, positionPermalinkHref } from "@/lib/position-permalink";

/**
 * A clause handed in from outside (an officer's reason) ends where the template ends it: its own closing full stop is
 * dropped before the template's is added, so the sentence never reads "..". A clause that ends in "?" or "!" keeps its
 * mark and takes none. `stop` is the language's own: "." for Swahili and English, "。" for Chinese.
 */
export function endClause(text: string, stop: "." | "。"): string {
  const t = text.trimEnd();
  if (/[!?！？…]$/.test(t)) return t;
  return `${t.replace(/[.。]+$/, "")}${stop}`;
}

/**
 * Where a notice about ONE position leads: that ticket. On a long-form market it is the market's page at the ticket's
 * anchor; with no market id (an orphaned position) it is the permalink, which finds the ticket's home itself. Without a
 * position the notice keeps the link it was given.
 */
export function ticketHref(marketId: string, positionId: string | undefined, fallback: string): string {
  if (!positionId) return fallback;
  return marketId ? `/markets/${marketId}#${positionAnchorId(positionId)}` : positionPermalinkHref(positionId);
}

/** The Up & Down round's page at the ticket's anchor — what the permalink resolves an Up & Down position to. */
export function roundTicketHref(roundHref: string, positionId: string | undefined): string {
  if (!positionId) return roundHref;
  return `${roundHref.split("#")[0]}#${positionAnchorId(positionId)}`;
}

/**
 * A STORED sentence, as the reader sees it. Rows written before round 3 still carry the old composition, and an inbox
 * keeps them: so the readers drop a raw position reference (" · pos_…", appended to the body or to a win's market name)
 * and mend the doubled full stop the old template made (".." → ".", ".。" → "。"). A sentence written today has neither,
 * so it passes through unchanged. ⚠️ Only those two shapes: an ellipsis ("...") is not touched, and an id the reader
 * should see is never written this way — a receipt states its "Reference" in words.
 */
export function readableNotificationBody(body: string): string {
  return body
    .replace(/ · pos_[A-Za-z0-9_]+(?=$|[\s.,;:!?。，])/g, "")
    .replace(/(^|[^.])\.\.(?!\.)/g, "$1.")
    .replace(/\.。/g, "。");
}
