import { CJK_MARK_TRIM } from "@/lib/cjk-marks";

/** The struck span's ink: the strike in the strong border ink, as every struck question drew it before. */
export const STRIKE_INK = "line-through decoration-border-strong";

/**
 * A VOIDED QUESTION, STRUCK — ONE DRAWING FOR EVERY PAGE THAT STRIKES ONE (S5 round 2, the lead's read of the zh tiles,
 * 2026-10-22: "…吗？-" on the ticket and the hub). The rule: DESIGN_AUTHORITY §M8a item 24.
 *
 * 🔴 A full-width closing mark is a whole em wide, but Simplified Chinese faces draw its ink in the LEFT of that em
 * (`cjk-marks.tsx` measured it: ？ inks 0.085–0.470em, 。 0.065–0.310em in Microsoft YaHei; SimSun agrees), and a
 * line-through runs the whole advance — so a struck question that ends on "？" drew its strike half an em past its ink.
 * ⭐ THE STRIKE ENDS AT THE INK: the text's last mark is cut back by the platform's own measured trim (`CJK_TRIM_EM`: 0.65em
 * for the dot-and-comma family, 0.5em for ？ — each the empty part less the ideograph's bearing, rounded down, so no ink
 * is ever cut) with a `clip-path`, which takes the mark's strike with it and moves nothing: the struck text lays out
 * exactly as the plain one. `.kp-mln-strike-end` in globals.css; `test:maswali-strike` holds the drawing, the trims and
 * every caller, and measures the strike against the ink in the browser.
 * ⛔ The words are the officer's, character for character — a copy, a search and a screen reader read them as written.
 * ⛔ Only the LAST mark: a mark inside the text has text after it on its line, so its strike runs on into the next
 *    character. (Hanging every mark the platform's way, `hangCjkMarks`, measured a step in WebKit's strike at each mark
 *    inside a line: its generated gap draws the strike in another face.) Latin text — "?" — is drawn as it came.
 */
export function MaswaliStrike({ text }: { text: string }) {
  const chars = Array.from(text);
  const last = chars[chars.length - 1];
  const trim = last !== undefined && Object.prototype.hasOwnProperty.call(CJK_MARK_TRIM, last) ? CJK_MARK_TRIM[last] : undefined;
  if (!trim) return <span className={STRIKE_INK}>{text}</span>;
  return (
    <span className={STRIKE_INK}>
      {chars.slice(0, -1).join("")}
      <span className={trim.endsWith("--q") ? "kp-mln-strike-end kp-mln-strike-end--q" : "kp-mln-strike-end"}>{last}</span>
    </span>
  );
}
