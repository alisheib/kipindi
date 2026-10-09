/* The money forms' figures as the ghost draws them (shapes) against the page's real figures: do they wrap alike?
   The withdraw tax notice ("{pct}%": the live rate 1.5% → "1.5"), the amount hints' limits, at every width and locale.
   Run: npx tsx m-figures.mts */
import { lines, linesSeg, moneySegs, dict, column, WIDTHS, LOCALES } from "./lib-measure.mts";
const body13 = { face: "inter" as const, px: 13 };
const fmt = (n: number) => n.toLocaleString("en-US");
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);
let differ = 0;
for (const l of LOCALES) for (const vw of WIDTHS) {
  const t = dict[l], col = column("form", vw), lg = vw >= 1024, pad = lg ? 32 : 24;
  const inner = col - 2 - 2 * pad;
  const nRoom = inner - 2 - 28 - 15 - 10; // the notices panel: its border, px-[14px] twice, the 15px glyph, gap-[10px]
  const tax = (pct: string) => lines(fill(t.wallet.taxBody, { pct }), body13, nRoom);
  const depHint = (min: string, max: string) => linesSeg(moneySegs(fill(t.common.depositAmountHint, { min, max }), body13), inner, { keepAll: true });
  const wdHint = (min: string, max: string) => linesSeg(moneySegs(fill(t.wallet.amountHint, { min, max }), body13), inner, { keepAll: true });
  const row = {
    taxPage: tax("1.5"), taxOld: tax("0"), taxShape: tax("0.0"),
    depPage: depHint(fmt(1000), fmt(2_000_000)), depShape: depHint("0,000", "0,000,000"),
    wdPage: wdHint(fmt(1016), fmt(5_000_000)), wdShape: wdHint("0,000", "0,000,000"),
  };
  const bad = row.taxPage !== row.taxShape || row.depPage !== row.depShape || row.wdPage !== row.wdShape;
  const oldBad = row.taxPage !== row.taxOld;
  if (bad) differ++;
  console.log(`${l} ${String(vw).padStart(4)}: tax notice page ${row.taxPage}L · "0" ${row.taxOld}L${oldBad ? " ← DIFFERS" : ""} · "0.0" ${row.taxShape}L | deposit hint ${row.depPage}/${row.depShape}L | withdraw hint ${row.wdPage}/${row.wdShape}L${bad ? "  ✗" : ""}`);
}
console.log(differ ? `${differ} combination(s) where a shape wraps unlike the page` : "every shape wraps as the page's figure does");
