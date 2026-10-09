/* R5-L · do /results' and /markets' bars wrap at lg, and does their ghost? Row 2 from lg is the sort, then the groups
 * (each the 10px mono bold uppercase key, its 2px, 4px, then the kit pills 4px apart), 29px apart (`.kp-qbar-row:has(.kp-qdiv)`).
 * The kit pill: 2px border + 2×16px + the 13px semibold label (+ a 14px glyph and 8px) + 8px + the 11px mono bold count.
 * Run:  npx tsx <this file>   (from F:/kipindi-r5l) */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r5l/package.json");
const { width, flexLines } = require("./fonts.cts");
const { dict } = req("F:/kipindi-r5l/src/lib/i18n-dict.ts");
const { sideWord } = req("F:/kipindi-r5l/src/lib/side-label.ts");
const { categoryLabel } = req("F:/kipindi-r5l/src/lib/markets/category-label.ts");
const { MARKET_CATEGORIES } = req("F:/kipindi-r5l/src/lib/markets/categories.ts");
const { formatTzsCompact } = req("F:/kipindi-r5l/src/lib/utils.ts");
const { POOL_FLOORS } = req("F:/kipindi-r5l/src/lib/markets/discovery.ts");

const SANS13 = { face: "sans", px: 13, wght: 600 } as const;
const MONO13 = { face: "mono", px: 13, wght: 600 } as const;
const KEY = { face: "mono", px: 10, wght: 700, ls: 1.4, upper: true } as const;
const COUNT = (digits = Number(process.env.DIGITS ?? 2)) => digits * 0.6 * 11;
/** The kit pill (`filterPillClass`, primary rank) with its count; `amount` sets the label as money (mono). */
const pill = (label: string, o: { glyph?: boolean; amount?: boolean; count?: boolean } = {}) =>
  2 + 32 + width(label, o.amount ? MONO13 : SANS13) + (o.glyph ? 14 + 8 : 0) + (o.count === false ? 0 : 8 + COUNT());
const key = (k: string) => width(k, KEY) + 2;
const group = (k: string, chips: number[]) => key(k) + 4 + chips.reduce((a, b) => a + b + 4, -4);
/** QuerySort from lg: the summary's left border, 16 + key + 12 + value + 12 + caret 14 + 16, then the 44px direction button. */
const sort = (k: string, v: string) => 1 + 16 + width(k, KEY) + 12 + width(v, SANS13) + 12 + 14 + 16 + 44;
/** MenuShell's own summary (the desktop topic menu): 1 + 16 + key + 12 + value + 12 + count + 12 + caret 14 + 16 + 1. */
const menu = (k: string, v: string) => 2 + 32 + width(k, KEY) + 12 + width(v, SANS13) + 12 + COUNT() + 12 + 14;

const ROOMS = { 1024: 1024 - 64, 1280: 1280 - 64 };
const out: string[] = [];
for (const l of ["sw", "en", "zh"] as const) {
  const t = dict[l];
  // /results — ResultsBar row 2 from lg: sort · game · when · topic (with glyphs).
  const rSort = sort(t.common.sort, t.results.sortNewest);
  const product = [t.market.catAll, `${sideWord(t, "YES", "MARKET")} / ${sideWord(t, "NO", "MARKET")}`, `${sideWord(t, "YES", "UPDOWN")} / ${sideWord(t, "NO", "UPDOWN")}`];
  const when = [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll];
  const topics = [t.market.catAll, ...MARKET_CATEGORIES.map((c: string) => categoryLabel(t, c))];
  const rItems = [rSort, group(t.market.gameKey, product.map((p) => pill(p))), group(t.common.when, when.map((p) => pill(p))), group(t.common.topic, topics.map((p) => pill(p, { glyph: true })))];
  // the ghost as it stands: 182 sort, (134 Filters lg:hidden), two 88/84 boxes in QUERY_GROUP_CLASS, no divider → 12px gaps.
  const rGhost = [182, 88, 84];
  // /markets — DiscoveryBar row 2 from lg: sort · odds · pool · topic menu.
  const mSort = sort(t.common.sort, t.market.sortPool);
  const odds = [t.market.oddsAny, t.market.oddsCall, t.market.oddsCont, t.market.oddsLong].map((p) => pill(p));
  const pool = [pill(t.market.poolAny), pill(`${formatTzsCompact(POOL_FLOORS["10k"])}+`, { amount: true }), pill(`${formatTzsCompact(POOL_FLOORS["50k"])}+`, { amount: true })];
  const mItems = [mSort, group(t.market.oddsKey, odds), group(t.market.poolKey, pool), menu(t.common.topic, t.market.catAll)];
  const mGhost = [210, 56, 92, 88, 84];
  for (const [vw, room] of Object.entries(ROOMS)) {
    out.push(`${l} @${vw} (${room}px): /results row 2 — page ${flexLines(rItems, room, 29)} line(s) [${rItems.map((x) => x.toFixed(0)).join(" + ")}], ghost ${flexLines(rGhost, room, 12)}`
      + ` · /markets row 2 — page ${flexLines(mItems, room, 29)} line(s) [${mItems.map((x) => x.toFixed(0)).join(" + ")}], ghost ${flexLines(mGhost, room, 12)}`);
  }
}
console.log(out.join("\n"));
