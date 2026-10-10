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
 * ⭐ THE ANSWER IS THE ONE `keep-words.tsx` ALREADY GIVES: what must stay together goes in a
 * `white-space: nowrap` span — what every engine honours — and the text itself (the accessible name, a copy, a search hit)
 * is unchanged, character for character. No no-break space and no word joiner is inserted (keep-words.tsx says why).
 *   · each `run` the caller names (a date it put into the sentence) is one span;
 *   · a spaced dash is held to the word before it ("kufupishwa —"), so a line can end after it but never begin with it;
 *     a Chinese "——" is held to the character before it the same way;
 *   · the last two words — in Chinese the last two ideographs and their closing mark — break together.
 * Spans that touch or overlap become one ("hadi" … "9 Okt, 06:02." is one run when the date is the last two words).
 * ⚠️ ONLY FOR SENTENCES WHOSE KEPT RUNS ARE NARROWER THAN THEIR NARROWEST LINE — a kept run cannot break, so a wider one
 * would overflow. `test:visual-pass-r4i` measures every call site's widest run against its narrowest line, per language.
 * ⛔ Deterministic — regular expressions with no lookbehind (Safari before 16.4 cannot parse one, and this runs in the
 * browser) and one plain scan — so the server and the browser draw the same spans and hydration cannot mismatch.
 * ⭐ ROUND 5 (2026-10-09, review 3 H4) · ONE DASH RULE AND ONE RENDERER FOR EVERY KEPT SENTENCE: the empty state's body
 * held its dash and its YES/NO pair by INSERTING a no-break space and a word joiner (empty-state-text.ts, round 3) — the
 * convention this file and keep-words.tsx exist to avoid. It now draws its runs here (`keepRanges`), with this file's
 * dash rule (`dashRanges`), so a dash is held the same way in every sentence. The rule holds the dash to ONE unbreakable
 * unit before it — a Latin word, or one ideograph — where it once took `\S+`, which in Chinese ("…无需其他操作 — 您的…")
 * is the whole clause; and an unspaced em dash ("否——", "word—") to the unit before it, as that body always did.
 */
import { Fragment, type ReactNode } from "react";
import { KEPT_SPACE, afterRun, connectiveRanges, lastTwo } from "./keep-words";

const IDEO = "㐀-䶿一-鿿豈-﫿";
const IDEOGRAPH = new RegExp(`[${IDEO}]`);
/**
 * A dash and the one unit before it, which it never parts from: a spaced dash ("kufupishwa —", "作 —", "8 am –") or an
 * unspaced em dash run ("否——", "word—"). The unit is a run with no break inside it — letters, digits, marks, never a
 * space, a hyphen, a dash, a slash or an ideograph — or else one character (an ideograph breaks on both sides, so it is
 * held alone, and "e-mail —" keeps "mail —", leaving the break after "e-"). An unspaced en dash ("10–20") is a range and
 * is left alone. The space before a spaced dash is `KEPT_SPACE` (keep-words.tsx: at most one wide white space in a run).
 * ⛔ FOUND FROM THE DASH, THE UNIT READ BACKWARDS — linear. A pattern that tried a unit at every place ("a run, then a
 * dash") backtracked over each long run before failing, quadratic: '。' × 10,000 took half a second in the empty state.
 */
const DASH = new RegExp(`${KEPT_SPACE}[—–](?=\\s|$)|—+`, "gu");
const UNIT = new RegExp(`[^\\s\\-–—/${IDEO}]`, "u");
export function dashRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const m of text.matchAll(DASH)) {
    const d = m.index ?? 0;
    let a = d;
    while (a > 0 && UNIT.test(text[a - 1])) a--;
    if (a === d) {
      // No run before it: the one character before it (both halves of a surrogate pair), unless that is white space.
      const low = d > 1 && text.charCodeAt(d - 1) >= 0xdc00 && text.charCodeAt(d - 1) <= 0xdfff;
      const before = low ? d - 2 : d - 1;
      if (before < 0 || /\s/u.test(text[before])) continue;
      a = before;
    }
    out.push([a, d + m[0].length]);
  }
  return out;
}
/** The last two ideographs and whatever closes them ("提现。", "申请。"). */
const LAST_TWO_IDEO = new RegExp(`[${IDEO}]{2}[^${IDEO}\\s]*\\s*$`);

/** Each place a caller's run stands in `text`, and each dash with its unit (`dashRanges`), as [start, end) spans. */
export function runAndDashRanges(text: string, runs: readonly string[] = []): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const run of runs) {
    if (!run) continue;
    for (let at = text.indexOf(run); at >= 0; at = text.indexOf(run, at + run.length)) ranges.push([at, at + run.length]);
  }
  ranges.push(...dashRanges(text));
  return ranges;
}

/** Spans sorted, and merged where they touch or overlap. */
export function mergeRanges(ranges: ReadonlyArray<readonly [number, number]>): Array<[number, number]> {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

/** The [start, end) spans of `text` that must not break, merged where they touch or overlap. */
export function keptRanges(text: string, runs: readonly string[] = []): Array<[number, number]> {
  const ranges = runAndDashRanges(text, runs);
  // The last two words (`lastTwo`, keep-words.tsx: read from the end, the space between them a kept one) — in Chinese the
  // last two ideographs and what closes them — the white space after them left out of the span.
  let tail: [number, number] | null;
  if (IDEOGRAPH.test(text)) {
    const m = LAST_TWO_IDEO.exec(text);
    tail = m ? [m.index, m.index + m[0].trimEnd().length] : null;
  } else tail = lastTwo(text, "any");
  // A tail that is the whole text has nothing to be stranded from.
  if (tail && tail[0] > 0) ranges.push(tail);
  return mergeRanges(ranges);
}

/**
 * `text` drawn with each span in `ranges` (sorted, disjoint) as one `white-space: nowrap` run, the text between them
 * plain. `piece` draws the words of each part — it is handed the part and the text that follows it, so a rule that looks
 * one character ahead (`hangCjkMarks`) reads the paragraph, not the part. The words are never changed: no character is
 * added, none is removed.
 * ⭐ ROUND 7 (2026-10-10, R6-1): the white space right after a run is a text node of its own (`afterRun`, keep-words.tsx
 * says why — Chromium's balanced and pretty wraps otherwise never offer the break after it: "…YES or NO — your" /
 * "ticket shows up here." at en 390 where round 5 read "…YES or NO —" / "your ticket shows up here.").
 */
export function keepRanges(
  text: string,
  ranges: ReadonlyArray<readonly [number, number]>,
  piece: (part: string, following: string) => ReactNode = (part) => part,
): ReactNode {
  if (ranges.length === 0) return piece(text, "");
  const out: ReactNode[] = [];
  const plain = (a: number, b: number) => {
    // A part that follows a run (a > 0: every part but the first does) opens with that run's white space, split off.
    if (a > 0) {
      const [lead, rest] = afterRun(text.slice(a, b));
      if (rest !== undefined) { out.push(lead); a += lead.length; }
    }
    const p = piece(text.slice(a, b), text.slice(b));
    out.push(typeof p === "string" ? p : <Fragment key={`t${a}`}>{p}</Fragment>);
  };
  let from = 0;
  for (const [a, b] of ranges) {
    if (a > from) plain(from, a);
    out.push(<span key={`k${a}`} className="whitespace-nowrap">{piece(text.slice(a, b), text.slice(b))}</span>);
    from = b;
  }
  if (from < text.length) plain(from, text.length);
  return out;
}

/** Two numbers joined by a short word — "6 or 7", "6 au 7", "6 或 7" — as runs to keep whole (a phone number's first digit).
 *  Tried only where a run of digits starts (the text's start, or after a non-digit), which is where the first match
 *  starts anyway — linear, where a try at every digit backtracked over each long run of them. */
const DIGIT_CHOICE = new RegExp(`(^|\\D)(\\d+${KEPT_SPACE}\\S{1,3}${KEPT_SPACE}\\d+)`, "g");
export function digitChoice(text: string): string[] {
  return [...text.matchAll(DIGIT_CHOICE)].map((m) => m[2]);
}

/** `text` with its kept spans drawn unbreakable (see the header). The words are untouched. */
export function keepText(text: string, runs: readonly string[] = []): ReactNode {
  return keepRanges(text, keptRanges(text, runs));
}

/**
 * A TITLE OR A LABEL WHOSE LINES NEVER END ON A CONNECTIVE (round 7, 2026-10-10 — the owner's item 37; `connectiveRanges`,
 * keep-words.tsx, says how). `runs` are the caller's own [start, end) ranges held too (a market title's figures); `piece`
 * draws the plain parts as the surface always did (`hangCjkMarks` for a centred title). Text without a connective or a
 * run comes back through `piece` alone — exactly what the surface drew before.
 */
export function keepConnectives(
  text: string,
  runs: ReadonlyArray<readonly [number, number]> = [],
  piece?: (part: string, following: string) => ReactNode,
): ReactNode {
  return keepRanges(text, mergeRanges([...connectiveRanges(text), ...runs]), piece);
}
