import { h, markup } from "./h.ts";
import { keepLastWords, keepSentences, keepYears, keepFigures, keepNameEnd, keepIdRuns } from "F:/kipindi-r5e/src/components/ui/keep-words.tsx";
import { keepUnits } from "F:/kipindi-r5e/src/components/ui/keep-units.tsx";
import { hangCjkMarks } from "F:/kipindi-r5e/src/lib/cjk-marks.tsx";
import { DotSeq } from "F:/kipindi-r5e/src/components/ui/dot-seq.tsx";
import { moneyRuns, moneySentence } from "F:/kipindi-r5e/src/lib/fill-nodes.tsx";
import { KeepHyphenated } from "F:/kipindi-r5e/src/app/live/pulse-grid.tsx";
import { emptyStateBody } from "F:/kipindi-r5e/src/components/ui/empty-state-text.ts";

const L = Number(process.env.L ?? 10000);
const ADV: Record<string, string> = {
  "a*L": "a".repeat(L),
  "a*L+' b c'": "a".repeat(L) + " b c",
  "'a '*L/2": "a ".repeat(L / 2),
  "' '*L+'x'": " ".repeat(L) + "x",
  "'x'+' '*L+'1'": "x" + " ".repeat(L) + "1",
  "1*L": "1".repeat(L),
  "'1-'*L/2": "1-".repeat(L / 2),
  "'1,'*L/2": "1,".repeat(L / 2),
  "'1 '+' '*L": "1" + " ".repeat(L) + "minutesX",
  "'dakika '*L/7": "dakika ".repeat(Math.floor(L / 7)),
  "'TZS '+' '*L": "TZS" + " ".repeat(L) + "x",
  "'Act 2022 '*L/9": "Act 2022 ".repeat(Math.floor(L / 9)),
  "'Act '*L/4+'2022x'": "Act ".repeat(Math.floor(L / 4)) + "2022x",
  "超*L": "超".repeat(L),
  "'你好，'*L/3": "你好，".repeat(Math.floor(L / 3)),
  "'。'*L": "。".repeat(L),
  "'TZS 1,'*L/6": "TZS 1,".repeat(Math.floor(L / 6)),
  "'a. '*L/3": "a. ".repeat(Math.floor(L / 3)),
  "'.'+' '*L": "." + " ".repeat(L),
  "' · '*L/3": " · ".repeat(Math.floor(L / 3)),
  "A*L": "A".repeat(L),
  "' '*L (dash)": " ".repeat(L) + "x",
  "'ab-'*L/3": "ab-".repeat(Math.floor(L / 3)),
  "'a-'*L/2+'1'": "a".repeat(L) + "1",
  "a*L+'-'": "a".repeat(L) + "-",
  "mixed": ("Je Simba 2026-27 itashinda dakika 28:00 TZS 4,200 超过200毫米。 ").repeat(Math.floor(L / 50)),
};
const FNS: Record<string, (s: string) => unknown> = {
  keepLastWords, keepSentences, keepYears, keepFigures, keepNameEnd, keepIdRuns, keepUnits, hangCjkMarks, moneyRuns, moneySentence,
  emptyStateBody,
  KeepHyphenated: (s) => markup(h(KeepHyphenated, { text: s })),
  DotSeq: (s) => markup(h(DotSeq, { text: s, renderPart: moneyRuns })),
};
const worst: Record<string, [number, string]> = {};
for (const f of Object.values(FNS)) for (const s of Object.values(ADV)) f(s.slice(0, 200));
for (const [fname, f] of Object.entries(FNS)) {
  for (const [iname, s] of Object.entries(ADV)) {
    const t0 = performance.now();
    f(s);
    const ms = performance.now() - t0;
    if (!worst[fname] || ms > worst[fname][0]) worst[fname] = [ms, iname];
    if (ms > 1e9) console.log(`${fname.padEnd(15)} ${iname.padEnd(22)} ${ms.toFixed(1)} ms (len ${s.length})`);
  }
}
console.log("--- worst per function (L=" + L + ")");
for (const [k, [ms, i]] of Object.entries(worst)) console.log(`${k.padEnd(15)} ${ms.toFixed(1).padStart(8)} ms  on ${i}`);
