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
 * ⭐ A TITLE OR A REASON QUOTED INSIDE A NOTICE, CUT TO ITS ROOM (the visual pass, round 5, R5-B, 2026-10-09; F10, tile 192).
 * 🔴 Every emitter cut what it quoted with `.slice(0, n)` — at 60 characters (sw/en) or 45 (zh) on the verdict notice, 50 to
 * 120 elsewhere — with no mark, so a long market name ended mid-word ("…watakuwa juu ya jedwali la NBC ifikapo raun") and
 * read as a typo, not as a cut. The bell and /notifications print the body WHOLE (no clamp: the bell truncates only its
 * one-line title), but the same body is the web push, whose lock screen shows its first lines only — so the quote stays
 * cut, to keep the sentence that matters ("No money has moved yet…") in view, and the cut now says so:
 *   · a text that fits is returned exactly as given;
 *   · a cut ends on "…" and is at most `max` characters with it, counted in code points, so a surrogate pair is never split;
 *   · it ends at a space, never inside a word — Swahili and English — and a word is everything between two spaces, so a
 *     figure ("2026-27", "$80/bbl") or a name ("S&P") is never split either;
 *   · Chinese breaks between characters, so it may end at any ideograph — but never inside a Latin word or a figure the
 *     title carries ("NBC", "2026-27"): the cut steps back to that run's start;
 *   · a lone word longer than the room is cut at a character (there is no better place);
 *   · it never ends on a space, a comma, a colon, a semicolon, a full stop, a dash, a middle dot, an ellipsis of its own or
 *     an opening bracket or quote — Latin or Chinese (「『（【〈《〔) — before the "…" (a closing quote stays: it
 *     belongs to the words before it).
 * Pure, so a writer (`notification-service.ts`) and a suite can run the same rule.
 * ⚠️ Rows already written keep their text: a notice is a record of what was said, and nothing rewrites it.
 */
const CJK = /[⺀-鿿豈-﫿　-〿＀-￯]/;
const SPACE = /\s/;
const TRAILING_JUNK = /[\s,;:.·\-–—(\[{“‘«「『（【〈《〔…、，：；。]+$/u;
export function clipQuote(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const room = Math.max(1, max - 1); // one for the "…"
  // A line may end between i−1 and i where either side is a space or an ideograph; anywhere else is inside a word.
  const boundary = (i: number) => SPACE.test(chars[i - 1]) || SPACE.test(chars[i]) || CJK.test(chars[i - 1]) || CJK.test(chars[i]);
  let cut = room;
  while (cut > 0 && !boundary(cut)) cut--;
  // A lone word longer than the room has no better place: it is cut where the room ends.
  if (cut === 0) cut = room;
  const head = chars.slice(0, cut).join("").replace(TRAILING_JUNK, "");
  return `${head.length > 0 ? head : chars.slice(0, room).join("")}…`;
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
