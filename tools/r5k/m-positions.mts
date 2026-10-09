/* /positions (classic) — the page (a player with open positions and stake on both sides: the common case) against today's
   ghost: the header (with its "View performance" button), the standing strip, the exposure keys, the bar's rows.
   Run: npx tsx m-positions.mts */
import { width, lines, dict, column, WIDTHS, LOCALES } from "./lib-measure.mts";
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const { categoryLabel } = req("F:/kipindi-r5k/src/lib/markets/category-label.ts");
const { positionOutcomeWord } = req("F:/kipindi-r5k/src/lib/side-label.ts");
const { MARKET_CATEGORIES } = req("F:/kipindi-r5k/src/lib/markets/categories.ts");
const { PLAYER_PRESETS } = req("F:/kipindi-r5k/src/lib/query/windows.ts");
const sora28 = { face: "sora" as const, px: 28, weight: 700, track: -0.02 };
const sub13 = { face: "inter" as const, px: 13 };
const micro = { face: "mono" as const, px: 10, weight: 700, track: 0.14, upper: true };
/** The PageHeader's height in a column of `w` px: eyebrow 15 + 4, the title's 35px lines, the subtitle's 19.5px lines + 4. */
export function headerH(t: any, w: number) {
  return 15 + 4 + 35 * lines(t.positions.headline, sora28, w) + 4 + 19.5 * lines(t.positions.headlineBody, sub13, w);
}
export const perfButtonW = (t: any) => 2 + 24 + 13 + 8 + width(t.performance.viewPerformance, { face: "inter", px: 13, weight: 600 });
/** The standing strip: header row 15, rule 25, the auto-fit grid (minmax 158px, gap-y 20), padding 20 + 18, border 2. */
export function stripPage(t: any, col: number) {
  const inner = col - 2 - 48;
  const cols = Math.max(1, Math.floor(inner / 158));
  const cellW = inner / cols - 14; // pl-3.5
  const label = (s: string) => 14 * lines(s, { face: "mono", px: 10, weight: 600, track: 0.14, upper: true }, cellW);
  const cell = (s: string) => 2 + label(s) + 7 + 20.9 + 8 + 15.75;
  const win = 2 + label(t.positions.winRate) + 8 + 36 + 8 + 15.75;
  const hs = [cell(t.positions.atRisk), cell(t.positions.liveValueIfSettled), cell(t.positions.settledPnl), win];
  const rows: number[] = []; for (let i = 0; i < hs.length; i += cols) rows.push(Math.max(...hs.slice(i, i + cols)));
  return { h: 2 + 20 + 15 + 25 + rows.reduce((a, b) => a + b, 0) + 20 * (rows.length - 1) + 18, cols, rows: rows.length };
}
export function stripGhostBefore(vw: number) {
  const sm = vw >= 640;
  const cell = 10 + 8 + 24; // h-2.5 + space-y-1.5 + h-5 (24 on this scale)
  return 2 + 20 + 16 + 20 + (sm ? cell : cell * 2 + 16) + 18;
}
const pill = (label: string) => 2 + 32 + width(label, { face: "inter", px: 13, weight: 600 }) + 8 + width("00", { face: "mono", px: 11, weight: 700 });
const keyW = (s: string) => width(s, micro) + 2;
/** Row 2 at lg: the sort cell, then the side, window and topic groups — 29px apart (the dividers), 12px between lines. */
export function row2Lines(t: any, room: number) {
  const sortW = width(t.common.sort, micro) + width(t.positions.sortRecent, { face: "inter", px: 13, weight: 600 }) + 71 + 44;
  const group = (k: string, labels: string[]) => keyW(k) + 4 + labels.map(pill).reduce((a, b) => a + b + 4, -4);
  const side = group(t.positions.sideKey, [t.market.oddsAny, t.common.yes, t.common.no]);
  const whens = (PLAYER_PRESETS as string[]).map((w) => ({ today: t.common.rangeToday, yesterday: t.common.rangeYesterday, "7d": t.common.range7d, "30d": t.common.range30d, all: t.common.rangeAll } as Record<string, string>)[w]);
  const when = group(t.common.when, whens);
  const topics = [t.market.catAll, ...(MARKET_CATEGORIES as string[]).map((c) => categoryLabel(t, c))];
  const topic = group(t.common.topic, topics);
  const items = [sortW, side, when, topic];
  // flex-wrap: an item goes on the line if it fits; one wider than the row takes a line of its own and wraps inside.
  let n = 1, x = 0; const inner: number[] = [];
  for (const it of items) {
    if (x > 0 && x + 29 + it > room) { n++; x = Math.min(it, room); } else x = x === 0 ? Math.min(it, room) : x + 29 + it;
    if (it > room) { // the group wraps inside itself: count its own lines
      const ws = [keyW("") ]; void ws; inner.push(Math.ceil(it / room));
      n += Math.ceil(it / room) - 1;
    }
  }
  return { lines: n, widths: items.map((v) => Math.round(v)), room };
}
if (import.meta.url.endsWith("m-positions.mts")) {
  for (const l of LOCALES) {
    const t = dict[l];
    for (const vw of WIDTHS) {
      const col = column("reading", vw);
      const hp = Math.max(headerH(t, col - 12 - perfButtonW(t)), 44), hg = headerH(t, col);
      const sp = stripPage(t, col), sg = stripGhostBefore(vw);
      const r2 = vw >= 1024 ? row2Lines(t, col) : null;
      const r2page = r2 ? 44 * r2.lines + 12 * (r2.lines - 1) : 44;
      const r2ghost = vw === 320 ? 100 : 44; // 180 + 12 + 104 = 296 > 288 at 320
      console.log(`${l} ${vw}: header page ${hp.toFixed(1)} ghost ${hg.toFixed(1)} (Δ${(hp - hg).toFixed(1)}) · strip page ${sp.h.toFixed(1)} (${sp.cols} col, ${sp.rows} rows) ghost ${sg} (Δ${(sp.h - sg).toFixed(1)}) · exposure keys 14 vs 10 (Δ4) · row2 page ${r2page} ghost ${r2ghost} (Δ${r2page - r2ghost})${r2 ? ` ${JSON.stringify(r2.widths)} in ${r2.room}` : ""} · total Δ ${(hp - hg + sp.h - sg + 4 + r2page - r2ghost).toFixed(1)}`);
    }
  }
}
