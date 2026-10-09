// The RG page's two action buttons: their widths per language (Inter 14px, 600 — between the repo's Regular and Bold
// faces), and the viewport bands where one form's button wraps under its field while the other's stays beside it.
import { createRequire } from "node:module";
const fontkit = createRequire("F:/kipindi-r4i/package.json")("fontkit") as {
  openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number };
};
const F = (n: string) => fontkit.openSync(`F:/kipindi-r4i/src/lib/server/reports/fonts/${n}.ttf`);
const reg = F("Inter-Regular"), bold = F("Inter-Bold");
const IDEO = /[⺀-鿿豈-﫿　-〿＀-￯]/;
const w = (f: ReturnType<typeof F>, s: string, size: number) =>
  [...s].filter((c) => IDEO.test(c)).length * size
  + f.layout([...s].filter((c) => !IDEO.test(c)).join("")).positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm * size;
const { dict } = await import("file:///F:/kipindi-r4i/src/lib/i18n-dict.ts");
const { rgPeriodFieldPx } = await import("file:///F:/kipindi-r4i/src/components/rg/rg-period-width.ts");
for (const l of ["sw", "en", "zh"] as const) {
  const t = (dict as any)[l];
  const field = rgPeriodFieldPx([t.rg.breakLength, t.rg.exclusionPeriod], [t.rg.dur1hour, t.rg.dur24h, t.rg.dur1week, t.rg.dur1month, t.rg.dur6months, t.common.permanent]);
  const btn = (s: string) => {
    const lo = w(reg, s, 14), hi = w(bold, s, 14);
    const mid = (lo + hi) / 2;
    return { lo: 2 + 32 + 13 + 8 + lo, mid: 2 + 32 + 13 + 8 + mid, hi: 2 + 32 + 13 + 8 + hi };
  };
  const a = btn(t.common.startABreak), b = btn(t.common.selfExclude);
  // A form keeps its button beside its field while field + 12 + button <= available (vw − 82 below 1024).
  const need = (x: { mid: number }) => field + 12 + x.mid;
  const lo = Math.min(need(a), need(b)) + 82, hi = Math.max(need(a), need(b)) + 82;
  console.log(`${l}: field ${field} · "${t.common.startABreak}" ${a.mid.toFixed(1)} (${a.lo.toFixed(1)}–${a.hi.toFixed(1)}) · "${t.common.selfExclude}" ${b.mid.toFixed(1)} (${b.lo.toFixed(1)}–${b.hi.toFixed(1)}) · misaligned for viewports ${lo.toFixed(0)}–${hi.toFixed(0)}`);
}
