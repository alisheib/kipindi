import { Fragment, type ReactNode } from "react";

/**
 * ⭐ A CENTRED CHINESE LINE CENTRES ITS INK, NOT THE EMPTY HALF OF ITS LAST MARK (2026-10-09, the visual pass's round 4,
 * E50: tiles 390 396 398 the not-found hint, 427 428 the tickets empty state, 433 434 the side picker).
 *
 * A full-width closing mark is a whole em wide, but Simplified Chinese faces draw its ink in the LEFT of that em (the GB
 * placement): measured from Microsoft YaHei's own advance (GDI+, 200px), 。 inks 0.065–0.310em, ， 0.155–0.305, 、
 * 0.065–0.300, ； ： ！ 0.155–0.315, ？ 0.085–0.470; SimSun agrees (。 0.140–0.360, ？ 0.145–0.475). An ideograph inks
 * from 0.015em. So a centred line that ends on 。 puts its ink centre (0.015 − 0.690) / 2 = −0.34em off the box's — at
 * 13px −4.4px, measured −4.5 (tile 427: the body line's ink 222–536 in a box centred on 384); a line ending on ？ at 17px
 * −4.4, measured −4.0 (tile 433).
 *
 * ⭐ THE FIX HANGS THE EMPTY PART, AND ONLY WHERE A LINE ENDS ON IT. Each mark is set back by its trim (0.65em, ？ 0.5em —
 * YaHei's empty part less the ideograph's 0.015 bearing, rounded DOWN to 0.05, so the ink is never cut into), and when
 * text follows it the trim is paid back by a SPACE of exactly that width: a collapsible space, which CSS removes at the
 * end of a line (CSS Text 3 §4.1.2) and keeps everywhere else. Mid-line the mark is a full em again, to the pixel; at
 * the end of a line — wherever the browser broke it — the line's box stops at the mark's ink. The space is drawn in
 * `--font-mono`, whose space is 0.6em in every weight (the repo's JetBrains Mono: 600 of 1000 units), so its width is
 * known: `.kp-cjk-gap` adds the rest as `word-spacing`. Its line height is 0 (the line box cannot grow) and it is not
 * selectable (a copied sentence has no stray space). After: 。 at 13px −0.16px, ？ at 17px −0.13px.
 *
 * ⛔ NOT `text-spacing-trim`: Chromium ships it from 123 with `space-first` / `trim-start` — the START of a line — and its
 * `normal` halves a line-final mark only "if it does not otherwise fit"; WebKit's support is partial, and either needs
 * the face's `halt` feature. A centred line that fits keeps its full-width mark in every engine.
 * ⛔ LATIN TEXT IS UNTOUCHED: a string with none of these marks comes back as the same string.
 * ⛔ Two marks in a row ("？！") are left full width but the last: compressing a mark mid-line is a different rule. A mark
 * followed by a closing quote or bracket ("，”") is left as it is: the gap would let a line start on the closer.
 */

/** The marks, and the class that sets each back. Two trims: the dot-and-comma family 0.65em, the question mark 0.5em. */
export const CJK_MARK_TRIM: Readonly<Record<string, "kp-cjk-mark" | "kp-cjk-mark kp-cjk-mark--q">> = {
  "。": "kp-cjk-mark", // 。
  "，": "kp-cjk-mark", // ，
  "、": "kp-cjk-mark", // 、
  "；": "kp-cjk-mark", // ；
  "：": "kp-cjk-mark", // ：
  "！": "kp-cjk-mark", // ！
  "？": "kp-cjk-mark kp-cjk-mark--q", // ？
};

/** The trims in em, as the stylesheet writes them (`.kp-cjk-mark` / `--q`) — for the instruments. */
export const CJK_TRIM_EM = { mark: 0.65, question: 0.5 } as const;

const isMark = (c: string | undefined) => c !== undefined && Object.prototype.hasOwnProperty.call(CJK_MARK_TRIM, c);
/** A closing quote or bracket after a mark (“你好，”) belongs to it: the gap would open a break between them, and a line
 *  may not start on a closer — so a mark followed by one is left as it is. */
const CLOSER = /^[”’」』）》】〉〕)\]}]$/u;

/**
 * The text with every full-width closing mark that ends a run set to hang (see above). A string with no such mark is
 * returned as it came.
 */
export function hangCjkMarks(text: string): ReactNode {
  const chars = Array.from(text);
  if (!chars.some((c) => isMark(c))) return text;
  const out: ReactNode[] = [];
  let run = "";
  let k = 0;
  chars.forEach((c, i) => {
    const next = chars[i + 1];
    // A mark hangs at the end of the text, or before a character that is neither a mark, a closer nor white space.
    if (!isMark(c) || isMark(next) || (next !== undefined && (/\s/.test(next) || CLOSER.test(next)))) { run += c; return; }
    if (run) out.push(run);
    run = "";
    const cls = CJK_MARK_TRIM[c];
    out.push(<span key={k++} className={cls}>{c}</span>);
    if (next !== undefined) {
      out.push(<span key={k++} aria-hidden="true" className={cls.endsWith("--q") ? "kp-cjk-gap kp-cjk-gap--q" : "kp-cjk-gap"}>{" "}</span>);
    }
  });
  if (run) out.push(run);
  return <Fragment>{out}</Fragment>;
}
