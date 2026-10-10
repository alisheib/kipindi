/**
 * ⭐ A LINE NEVER ENDS ON A CONNECTIVE (round 7 of the visual pass, 2026-10-10 — R5-3 and R5-4, the owner's item 37:
 * "Kanuni / za Michezo"). Round 6 read "Sera ya / Mchezo Salama" (/legal/responsible-gambling, sw 390) and "Sera ya
 * Kuzuia / Uoshaji wa / Fedha na KYC" (/legal/aml): R5-A's `legalTitle` held a connective only as a title's second-to-last
 * word. The rule is now every connective, in every title and label that wraps: the connective and the white space after
 * it are one nowrap run, so the one break after it is gone and every other break stays — "Sera ya Kuzuia / Uoshaji / wa
 * Fedha na KYC", "Kanuni za Juu / na Chini". A run is a short word and a space, so it can never overflow a line (a
 * connective held with the WORD after it could: "ya NDIO/HAPANA" is 251px against the legal title's 184px at 320).
 * Why a run that ENDS on its space holds: Chromium never breaks after a breakable space that closes a nowrap box
 * (`LineBreaker::HandleCloseTag` computes no break there, the `<span>1 </span>2` rule of `AppendCandidates`), and WebKit
 * and Gecko judge a space by its own box, which is nowrap.
 * The connectives are R5-A's list: sw ya · za · wa · la · cha · vya · kwa · na, en of · and · & (any case). Chinese has none.
 * A name that is kept whole carries the connective that introduces it (`splitLeadConnective`), so the line above the name
 * never ends on it either: "Leseni" / "ya Bodi ya Michezo ya Kubahatisha Tanzania.", "Linatatuliwa" / "kwa Tanzania
 * Meteorological Authority".
 * ⛔ PURE: no import, no directive — keep-words.tsx and keep-run.tsx draw it, the offline document (a string built with no
 * React) reads it, and global-error.tsx (which may import nothing but React) carries a copy of `CONNECTIVE_WORDS` that
 * `test:visual-pass-r7a` §3 holds to this one. Linear: found from each white space, the word before it read back (a
 * pattern of "word, space" tried at every place backtracks over a long last word).
 */
export const CONNECTIVE_WORDS = "ya|za|wa|la|cha|vya|kwa|na|of|and|&";
const CONNECTIVE = new RegExp(`^(?:${CONNECTIVE_WORDS})$`, "i");
const COLLAPSIBLE_GAP = /[\t\n\f\r ]+/g;
const WHITE = /\s/;

/** Each connective a word follows, with the white space after it, as [start, end) — the runs `keepConnectives` holds. */
export function connectiveRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let word = 0;
  for (const m of text.matchAll(COLLAPSIBLE_GAP)) {
    const at = m.index ?? 0, end = at + m[0].length;
    if (at > word && end < text.length && CONNECTIVE.test(text.slice(word, at))) out.push([word, end]);
    word = end;
  }
  return out;
}

/**
 * The words before a name that is kept whole, cut where the connective that introduces the name starts — [the rest, the
 * connective and its space] ("Leseni ya " → ["Leseni ", "ya "], "Linatatuliwa kwa " → ["Linatatuliwa ", "kwa "]), or
 * [before, ""] when it ends on no connective ("Settles on ", "结算来源：", "Licensed by the ").
 */
export function splitLeadConnective(before: string): [string, string] {
  let word = before.length;
  while (word > 0 && WHITE.test(before[word - 1])) word--;
  const gap = word;
  while (word > 0 && !WHITE.test(before[word - 1])) word--;
  if (gap === before.length || gap === word || !CONNECTIVE.test(before.slice(word, gap))) return [before, ""];
  return [before.slice(0, word), before.slice(word)];
}
