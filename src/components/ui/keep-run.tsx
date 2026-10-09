/**
 * A SENTENCE THE PLAYER MUST READ WHOLE — a date stays one run, a dash never opens a line, the last line is never one
 * word alone (the visual pass, round 4, helper R4-I, 2026-10-09; the edges findings E17, E20, E55, E56, E57).
 *
 * 🔴 WHAT THE TILES SHOWED, on the sentences that tell a player about their own break or exclusion and on the bet
 * dialog's disclosures:
 *   · the end of a break split across two lines — "hadi 9" / "Okt, 06:02" (027), "9 Oct" / "2026, 06:02" (073),
 *     "2026-" / "10-10" (113–121);
 *   · lines opening on a dash — "— bado unaweza…" (006 035 039 060 116 125) and, in Chinese, "——您仍可登录" (093–095);
 *   · a last line of one word — "pesa." (002), "yatakapoisha." (005), "malipo." (035), "mdogo." (039), "kufanya." (040),
 *     "utuombe." / "us." (113–127), and in Chinese one character and its stop — "现。" (097), "请。" (119–121).
 * ⭐ THE ANSWER IS THE ONE `keep-words.tsx` AND `keep-units.tsx` ALREADY GIVE: what must stay together goes in a
 * `white-space: nowrap` span — what every engine honours — and the text itself (the accessible name, a copy, a search hit)
 * is unchanged, character for character. No no-break space and no word joiner is inserted (keep-words.tsx says why).
 *   · each `run` the caller names (a date it put into the sentence) is one span;
 *   · a spaced dash is held to the word before it ("kufupishwa —"), so a line can end after it but never begin with it;
 *     a Chinese "——" is held to the character before it the same way;
 *   · the last two words — in Chinese the last two ideographs and their closing mark — break together.
 * Spans that touch or overlap become one ("hadi" … "9 Okt, 06:02." is one run when the date is the last two words).
 * ⚠️ ONLY FOR SENTENCES WHOSE KEPT RUNS ARE NARROWER THAN THEIR NARROWEST LINE — a kept run cannot break, so a wider one
 * would overflow. `test:visual-pass-r4i` measures every call site's widest run against its narrowest line, per language.
 * ⛔ Deterministic, regular expressions only and no lookbehind (Safari before 16.4 cannot parse one, and this runs in the
 * browser), so the server and the browser draw the same spans and hydration cannot mismatch.
 */
import type { ReactNode } from "react";

const IDEO = "㐀-䶿一-鿿豈-﫿";
const IDEOGRAPH = new RegExp(`[${IDEO}]`);
/** A spaced dash and the word before it: "kufupishwa —", "estimate only —". */
const SPACED_DASH = /\S+\s+[—–](?=\s|$)/g;
/** A Chinese dash pair and the character before it: "短——". */
const CJK_DASH = /\S——/g;
/** The last two words (and the space after them). */
const LAST_TWO = /\S+\s+\S+\s*$/;
/** The last two ideographs and whatever closes them ("提现。", "申请。"). */
const LAST_TWO_IDEO = new RegExp(`[${IDEO}]{2}[^${IDEO}\\s]*\\s*$`);

/** The [start, end) spans of `text` that must not break, merged where they touch or overlap. */
export function keptRanges(text: string, runs: readonly string[] = []): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const run of runs) {
    if (!run) continue;
    for (let at = text.indexOf(run); at >= 0; at = text.indexOf(run, at + run.length)) ranges.push([at, at + run.length]);
  }
  for (const m of text.matchAll(SPACED_DASH)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  for (const m of text.matchAll(CJK_DASH)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  const tail = (IDEOGRAPH.test(text) ? LAST_TWO_IDEO : LAST_TWO).exec(text);
  // A tail that is the whole text has nothing to be stranded from.
  if (tail && tail.index > 0) ranges.push([tail.index, tail.index + tail[0].trimEnd().length]);
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

/** Two numbers joined by a short word — "6 or 7", "6 au 7", "6 或 7" — as runs to keep whole (a phone number's first digit). */
const DIGIT_CHOICE = /\d+\s+\S{1,3}\s+\d+/g;
export function digitChoice(text: string): string[] {
  return [...text.matchAll(DIGIT_CHOICE)].map((m) => m[0]);
}

/** `text` with its kept spans drawn unbreakable (see the header). The words are untouched. */
export function keepText(text: string, runs: readonly string[] = []): ReactNode {
  const ranges = keptRanges(text, runs);
  if (ranges.length === 0) return text;
  const out: ReactNode[] = [];
  let from = 0;
  for (const [a, b] of ranges) {
    if (a > from) out.push(text.slice(from, a));
    out.push(<span key={`k${a}`} className="whitespace-nowrap">{text.slice(a, b)}</span>);
    from = b;
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}
