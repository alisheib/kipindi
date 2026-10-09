const { dict } = await import("file:///F:/kipindi-r5a/src/lib/i18n-dict.ts");
import { createRequire } from "node:module";
const fontkit = createRequire("file:///F:/kipindi-r5a/package.json")("fontkit") as any;
const mono = fontkit.openSync("F:/kipindi-r5a/src/lib/server/reports/fonts/JetBrainsMono-Regular.ttf");
const w = (s: string, size = 11) => mono.layout(s).positions.reduce((a: number, p: any) => a + p.xAdvance, 0) / mono.unitsPerEm * size;
const IDEO = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/;
const wm = (s: string) => [...s].filter((c) => IDEO.test(c)).length * 11 + w([...s].filter((c) => !IDEO.test(c)).join(""));
for (const l of ["sw", "en", "zh"] as const) {
  const m = (dict as any)[l].market, h = (dict as any)[l].home;
  const cands = [m.timeLeftD, m.timeLeftH, m.timeLeftM].map((s: string) => s.replace("{n}", "59")).concat([m.closed, h.waitingForResults]);
  for (const c of cands) console.log(l, wm(c).toFixed(1).padStart(6), JSON.stringify(c));
}
for (const p of ["TZS 10,800", "TZS 100,000", "TZS 1,234,567"]) console.log("pool", w(p).toFixed(1), p);
