// The reviewer's adversarial inputs (review/timew.ts), the tip (orig/) against the worktree, per function: the worst time.
import { markup } from "./h.ts";
const tipKW = await import("./orig/keep-words.tsx");
const nowKW = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const tipKR = await import("./orig/keep-run.tsx");
const nowKR = await import("file:///F:/kipindi-r5e/src/components/ui/keep-run.tsx");
const tipCJK = await import("./orig/cjk-marks.tsx");
const nowCJK = await import("file:///F:/kipindi-r5e/src/lib/cjk-marks.tsx");
const tipFN = await import("./orig/fill-nodes.tsx");
const nowFN = await import("file:///F:/kipindi-r5e/src/lib/fill-nodes.tsx");
const tipES = await import("./orig/empty-state-text.ts");
const nowES = await import("file:///F:/kipindi-r5e/src/components/ui/empty-state-text.ts");

const L = Number(process.env.L ?? 10000);
const ADV: Record<string, string> = {
  "a*L": "a".repeat(L), "a*L+' b c'": "a".repeat(L) + " b c", "'a '*L/2": "a ".repeat(L / 2), "' '*L+'x'": " ".repeat(L) + "x",
  "'x'+' '*L+'1'": "x" + " ".repeat(L) + "1", "1*L": "1".repeat(L), "'1-'*L/2": "1-".repeat(L / 2), "'1,'*L/2": "1,".repeat(L / 2),
  "'1 '+' '*L": "1" + " ".repeat(L) + "minutesX", "'dakika '*L/7": "dakika ".repeat(Math.floor(L / 7)), "'TZS '+' '*L": "TZS" + " ".repeat(L) + "x",
  "'Act 2022 '*L/9": "Act 2022 ".repeat(Math.floor(L / 9)), "'Act '*L/4+'2022x'": "Act ".repeat(Math.floor(L / 4)) + "2022x", "超*L": "超".repeat(L),
  "'你好，'*L/3": "你好，".repeat(Math.floor(L / 3)), "'。'*L": "。".repeat(L), "'TZS 1,'*L/6": "TZS 1,".repeat(Math.floor(L / 6)), "'a. '*L/3": "a. ".repeat(Math.floor(L / 3)),
  "'.'+' '*L": "." + " ".repeat(L), "' · '*L/3": " · ".repeat(Math.floor(L / 3)), "A*L": "A".repeat(L), "'ab-'*L/3": "ab-".repeat(Math.floor(L / 3)),
  "a*L+'-'": "a".repeat(L) + "-", "mixed": ("Je Simba 2026-27 itashinda dakika 28:00 TZS 4,200 超过200毫米。 ").repeat(Math.floor(L / 50)),
  // the new branches' own worst cases
  "ideo-space*L": "dakika" + "\u3000".repeat(L) + "28", "nbsp-space*L": "a\u00a0 ".repeat(L / 3) + "b", "dash-gap*L": "neno" + " \u3000".repeat(L / 2) + "—",
  "month-year*L/14": "December 2026 ".repeat(Math.floor(L / 14)), "virama*L": "\u0915" + "\u094d".repeat(L - 1),
};
type F = (s: string) => unknown;
const PAIRS: Array<[string, F, F]> = [
  ["keepLastWords", tipKW.keepLastWords, nowKW.keepLastWords], ["keepSentences", tipKW.keepSentences, nowKW.keepSentences],
  ["keepYears", tipKW.keepYears, nowKW.keepYears], ["keepFigures", tipKW.keepFigures, nowKW.keepFigures], ["keepNameEnd", tipKW.keepNameEnd, nowKW.keepNameEnd],
  ["keepIdRuns", tipKW.keepIdRuns, nowKW.keepIdRuns], ["keepText", (s) => tipKR.keepText(s, tipKR.digitChoice(s)), (s) => nowKR.keepText(s, nowKR.digitChoice(s))],
  ["hangCjkMarks", tipCJK.hangCjkMarks, nowCJK.hangCjkMarks], ["moneyRuns", tipFN.moneyRuns, nowFN.moneyRuns], ["moneySentence", tipFN.moneySentence, nowFN.moneySentence],
  ["emptyStateBody", (s) => tipCJK.hangCjkMarks(tipES.emptyStateBody(s)), nowES.emptyStateBody],
];
const time = (f: F, s: string) => { const t0 = performance.now(); markup(f(s)); return performance.now() - t0; };
for (const [, a, b] of PAIRS) for (const s of Object.values(ADV)) { a(s.slice(0, 300)); b(s.slice(0, 300)); }
console.log(`function          worst tip (input)                      worst now (input)                (L=${L}, render included)`);
for (const [name, a, b] of PAIRS) {
  let wa: [number, string] = [0, ""], wb: [number, string] = [0, ""];
  for (const [k, s] of Object.entries(ADV)) {
    const ta = Math.min(time(a, s), time(a, s)), tb = Math.min(time(b, s), time(b, s));
    if (ta > wa[0]) wa = [ta, k];
    if (tb > wb[0]) wb = [tb, k];
  }
  console.log(`${name.padEnd(16)}  ${wa[0].toFixed(1).padStart(7)} ms (${wa[1].padEnd(18)})   ${wb[0].toFixed(1).padStart(7)} ms (${wb[1]})`);
}
