/**
 * ⭐ AN UP & DOWN ROUND'S NAME, IN THE ROUND PAGE'S OWN WORDS (review 6, A6 · C6 · 2026-10-09).
 *
 * The round page names a round in its h1 — "{asset} {udTitle}" over a "{minutes} {udMin}" chip — and the Up & Down card's
 * accessible name is that same line (`updown-card.tsx`): "Bitcoin Juu na Chini · 15 dakika", "Bitcoin Up & Down · 15 min",
 * "比特币 涨跌 · 15 分钟". The round's STORED title (`roundTitle`, updown-service.ts) is a third name for the game —
 * "Bitcoin Juu au Chini · dakika 15", "Bitcoin Up or Down · 15 min" — kept as written, for the audit trail and the
 * reports, and never rewritten. A reader's surface names a round in the page's words: the page's own <title>, and the
 * surfaces that list a round as a market (`/positions/performance`).
 * Pure and client-safe: the words come in with the caller's dictionary.
 */

/** The two dictionary words a round's name is made of (`t.market.udTitle`, `t.market.udMin`). */
export type RoundWords = { market: { udTitle: string; udMin: string } };

/** "{asset} {udTitle} · {minutes} {udMin}" — the h1's words and the card's accessible name. */
export function roundName(t: RoundWords, assetName: string, durationMinutes: number): string {
  return `${assetName} ${t.market.udTitle} · ${durationMinutes} ${t.market.udMin}`;
}

/** A round's asset name in each language and its minutes, read back from its STORED titles. */
export type StoredRound = { nameEn: string; nameSw: string | null; nameZh: string | null; minutes: number };

const STORED_EN = /^(.+) Up or Down · (\d+) min$/;
const STORED_SW = /^(.+) Juu au Chini · dakika (\d+)$/;
const STORED_ZH = /^(.+)涨跌 · (\d+)分钟$/;

/**
 * The asset's names and the minutes, read back from the three titles `roundTitle` wrote (its shape has not changed since
 * rounds began, 2026-07-24: `${nameEn} Up or Down · ${m} min`, `${nameSw} Juu au Chini · dakika ${m}`,
 * `${nameZh || nameEn}涨跌 · ${m}分钟`). Null for titles of any other shape — a long-form market's question, or a title that
 * does not agree with itself — which the caller then shows as stored. Display only: nothing stored is rewritten.
 */
export function storedRound(titles: { titleEn: string; titleSw: string | null; titleZh: string | null }): StoredRound | null {
  const en = STORED_EN.exec(titles.titleEn);
  if (!en) return null;
  const minutes = Number(en[2]);
  const sw = titles.titleSw ? STORED_SW.exec(titles.titleSw) : null;
  const zh = titles.titleZh ? STORED_ZH.exec(titles.titleZh) : null;
  if ((titles.titleSw && (!sw || Number(sw[2]) !== minutes)) || (titles.titleZh && (!zh || Number(zh[2]) !== minutes))) return null;
  return { nameEn: en[1], nameSw: sw ? sw[1] : null, nameZh: zh ? zh[1] : null, minutes };
}
