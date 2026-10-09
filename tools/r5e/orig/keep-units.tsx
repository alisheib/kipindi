/* @jsxRuntime automatic */
/* @jsxImportSource react */
/**
 * A NUMBER AND ITS UNIT NEVER PART AT A LINE END — "200毫米", never "200" / "毫米".
 *
 * 2026-10-08 · G1 [029 059 074 084 097 109]. At 320 the landing's featured question in Chinese read
 * "达累斯萨拉姆七月降雨超过200" / "毫米": the unit alone on line 2. Unicode line breaking (UAX #14) allows a
 * break between a digit and a following ideograph (NU ÷ ID), and every engine — Chromium and WebKit through
 * ICU, Firefox through its own segmenter — takes it.
 *
 * ⛔ WHY THIS IS NOT A CSS-ONLY ANSWER — researched before choosing, because titles are data:
 *   · `word-break: keep-all` removes the break between the number and the unit, and with it EVERY break
 *     between two ideographs: a Chinese title has no spaces, so it becomes one unbreakable word that then
 *     overflows or is cut wherever `overflow-wrap` forces it — worse everywhere else.
 *   · `word-break: auto-phrase` (BudouX) is Chromium-only and Japanese-only; Chinese is not supported.
 *   · `line-break: strict|loose|anywhere` governs small kana and punctuation, not NU ÷ ID.
 *   · `text-wrap: balance|pretty` choose WHICH break to take, not WHICH breaks exist: they can still pick
 *     this one, and Firefox does not ship `pretty`.
 *   · U+2060 WORD JOINER would work in Chromium and WebKit, but Firefox has a history of ignoring it
 *     (bugzilla 1125644), it travels into copy and paste and find-in-page, and `short-title.ts` already
 *     strips it from stored titles as an invisible character.
 * ⭐ What every engine honours is `white-space: nowrap` on an inline box. So the title is rendered with the
 * number and the one or two ideographs that follow it inside a nowrap span; the text itself — the h2's
 * accessible name, a search hit, a copied title — is unchanged, and every other break is left alone.
 *
 * ⚠️ One or two ideographs, because a unit is one ("米", "月", "场") or two ("毫米", "公里", "分钟"); where
 * the second one is not part of the unit ("7月降雨" keeps "7月降" together) the break simply lands one
 * character later, which costs nothing in Chinese. A number followed by Latin letters ("200mm") is already
 * unbreakable under UAX #14 (NU × AL), and Swahili and English titles carry no ideographs, so for them this
 * returns the string untouched — byte-identical markup.
 * ⛔ Deterministic (one regular expression, no `Intl.Segmenter`), so the server and the browser cannot
 * disagree about where the spans go and hydration cannot mismatch.
 */
import type { ReactNode } from "react";

const NUMBER_UNIT = /\d+(?:[.,]\d+)*\s?[㐀-䶿一-鿿豈-﫿]{1,2}/g;

export function keepUnits(text: string): ReactNode {
  if (!/\d/.test(text)) return text;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(NUMBER_UNIT)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(<span key={at} className="whitespace-nowrap">{m[0]}</span>);
    last = at + m[0].length;
  }
  if (out.length === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}
