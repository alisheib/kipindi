/* R5-L · a sibling outside the L routes, measured for the integrator: /updown/history's row 2 from lg (QuerySort, then the
 * assets, durations and when groups behind QueryGroupDivider), against its ghost's one 44px line (history-ghost.tsx draws
 * the sort's 180px box and, below lg only, the Filters box — no group at all from lg).
 * The groups are the player's own data: the case modelled is the smallest a player with rounds can have — one asset and one
 * duration (each group then holds "All" and that one pill) — so every real player's row is at least this tall.
 * Run from F:/kipindi-wip:  npx tsx <this file> */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-wip/package.json");
const { width } = require("../r5l/fonts.cts");
const { dict } = req("F:/kipindi-wip/src/lib/i18n-dict.ts");

const SANS = (px: number, wght = 400) => ({ face: "sans", px, wght }) as const;
const MONO = (px: number, wght = 400, ls = 0) => ({ face: "mono", px, wght, ls }) as const;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pill = (label: string, digits = 2) => 2 + 32 + width(label, SANS(13, 600)) + 8 + digits * 6.6;
const key = (k: string) => width(k.toUpperCase(), MONO(10, 700, 1.4)) + 2;
const sort = (k: string, v: string) => 1 + 16 + key(k) - 2 + 12 + width(v, SANS(13, 600)) + 12 + 14 + 16 + 44;
const group = (k: string, ps: number[]) => ({ w: key(k) + 4 + ps.reduce((a, b) => a + b + 4, -4), parts: [key(k), ...ps] });
function rowLines(items: Array<{ w: number; parts?: number[] }>, room: number, gap: number) {
  let lines = 0, x = 0;
  for (const it of items) {
    if (it.w > room && it.parts) {
      if (x > 0) { lines++; x = 0; }
      let il = 1, ix = 0; for (const p of it.parts) { if (ix > 0 && ix + 4 + p > room) { il++; ix = p; } else ix = ix ? ix + 4 + p : p; }
      lines += il; continue;
    }
    if (x > 0 && x + gap + it.w > room) { lines++; x = it.w; } else x = x ? x + gap + it.w : it.w;
  }
  return lines + (x > 0 ? 1 : 0);
}
const out: string[] = [];
for (const l of ["sw", "en", "zh"] as const) {
  const t = dict[l];
  const assets = [pill(t.common.all), pill("Bitcoin")];
  const durs = [pill(t.common.all), pill(`5 ${t.market.udMin}`)];
  const when = [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll].map((s: string) => pill(s));
  const items = [{ w: sort(t.common.sort, t.positions.sortRecent) }, group(t.market.udAssets, assets), group(t.market.udDurations, durs), group(t.common.when, when)];
  for (const vw of [1024, 1280]) {
    const room = Math.min(vw, 1080) - 64;
    const rl = rowLines(items, room, 29);
    out.push(`${l}@${vw}: row 2 ${rl} line(s) → ${rl * 44 + (rl - 1) * 12}px against the ghost's 44 (${(rl - 1) * 56} short) [${items.map((i) => r2(i.w)).join(" | ")}] in ${room}`);
  }
}
console.log(out.join("\n"));
// Row 1 (2026-10-10): the six lenses (`UD_LENSES`, `lensLabel`) in QUERY_STRIP_CLASS — one scrolling line below lg, wrapping
// from lg — beside the count's phrase (`QueryResultCount`, 11.5px mono, two digits).
const out1: string[] = [];
for (const l of ["sw", "en", "zh"] as const) {
  const t = dict[l];
  const lenses = [t.common.all, t.market.udInPlay, t.market.udUpWins, t.market.udDownWins, t.market.udVoided, t.market.udConfirmingPrice].map((s: string) => pill(s));
  const count = width(t.market.udNRounds.replace("{n}", "00"), MONO(11.5));
  for (const vw of [1024, 1280]) {
    const room = Math.min(vw, 1080) - 64;
    const strip = room - count - 12; // the row's gap-3 beside the count
    let lines = 1, x = 0; for (const p of lenses) { if (x > 0 && x + 4 + p > strip) { lines++; x = p; } else x = x ? x + 4 + p : p; }
    out1.push(`${l}@${vw}: row 1 ${lines} line(s) in ${r2(strip)} [${lenses.map(r2).join(" ")}] count ${r2(count)}`);
  }
}
console.log(out1.join("\n"));
