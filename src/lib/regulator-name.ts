/**
 * THE REGULATOR'S NAME, AS THE DICTIONARY WRITES IT IN EACH LANGUAGE — `footer.licensedByGbt`'s "Gaming Board of
 * Tanzania" / "Bodi ya Michezo ya Kubahatisha Tanzania" / 坦桑尼亚博彩委员会 (R5-A's F18, round 5 of the Vodacom visual pass;
 * carried by R5-G's G-5, 2026-10-09, to every line that prints that sentence).
 *
 * ⭐ ONE PATTERN FOR EVERY LINE THAT KEEPS THE NAME WHOLE: `keepRegulator` (`components/ui/keep-words.tsx` — the journey's
 * footer, the hero's trust row, the opt-out shell's footer) and the offline document (`offline-document.ts`, a string
 * built with no React, which may import no component). `global-error.tsx` may import nothing but React, so it carries a
 * copy, and `test:visual-pass-r5g` §4 holds that copy to this one.
 * The zh name carries the dictionary's zero-width break hint between its two words; it is matched as any format character
 * (`\p{Cf}`), so the source names no invisible character (`test:visual-pass-r5e` §6.5's census).
 * ⛔ PURE: no import, no directive — a client bundle and the offline route both take it.
 */
export const REGULATOR_NAME = /Gaming Board of Tanzania|Bodi ya Michezo ya Kubahatisha Tanzania|坦桑尼亚\p{Cf}?博彩委员会/u;

/** The sentence cut around the regulator's name — [before, the name, after] — or null when it does not name it. */
export function regulatorSplit(text: string): [string, string, string] | null {
  const m = REGULATOR_NAME.exec(text);
  return m ? [text.slice(0, m.index), m[0], text.slice(m.index + m[0].length)] : null;
}
