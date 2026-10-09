// Timing of the text helpers on adversarial input (review 6, reviewer B). Run from F:/kipindi-rev:
//   node_modules/.bin/tsx --tsconfig tsconfig.json <this file>
// Each helper is run at n and 2n; a linear helper roughly doubles, a quadratic one roughly quadruples.
import { dashRanges, keepText, keptRanges, digitChoice } from "file:///F:/kipindi-rev/src/components/ui/keep-run.tsx";
import { keepLastWords, keepSentences, keepYears, keepFigures, keepNameEnd, figureRanges, lastTwo } from "file:///F:/kipindi-rev/src/components/ui/keep-words.tsx";
import { moneySentence, moneyRuns } from "file:///F:/kipindi-rev/src/lib/fill-nodes.tsx";
import { hangCjkMarks } from "file:///F:/kipindi-rev/src/lib/cjk-marks.tsx";

function time(fn: () => unknown, reps = 1): number {
  const t0 = performance.now();
  for (let i = 0; i < reps; i++) fn();
  return (performance.now() - t0) / reps;
}

type Case = { name: string; fn: (s: string) => unknown; input: (n: number) => string };
const cases: Case[] = [
  { name: "dashRanges   a+SPACES+b", fn: dashRanges, input: (n) => "a" + " ".repeat(n) + "b" },
  { name: "keepText     a+SPACES+b", fn: (s) => keepText(s), input: (n) => "a" + " ".repeat(n) + "b" },
  { name: "keptRanges   a+SPACES+b", fn: (s) => keptRanges(s), input: (n) => "a" + " ".repeat(n) + "b" },
  { name: "dashRanges   word w/o dash", fn: dashRanges, input: (n) => "x".repeat(n) },
  { name: "moneySentence LONGWORD", fn: moneySentence, input: (n) => "x".repeat(n) },
  { name: "moneySentence a b a b … (1 word)", fn: moneySentence, input: (n) => "x".repeat(n) + " " },
  { name: "moneyRuns    LONGWORD", fn: moneyRuns, input: (n) => "x".repeat(n) },
  { name: "keepLastWords LONGWORD", fn: keepLastWords, input: (n) => "x".repeat(n) },
  { name: "keepSentences SPACES", fn: keepSentences, input: (n) => "a." + " ".repeat(n) },
  { name: "keepYears    a+SPACES", fn: keepYears, input: (n) => "a" + " ".repeat(n) + "b" },
  { name: "keepFigures  1+SPACES", fn: keepFigures, input: (n) => "1" + " ".repeat(n) + "b" },
  { name: "keepFigures  digits sep", fn: keepFigures, input: (n) => "1,".repeat(n / 2) },
  { name: "figureRanges dakika+SP", fn: figureRanges, input: (n) => ("dakika" + " ".repeat(40)).repeat(Math.floor(n / 46)) + "1" },
  { name: "keepNameEnd  LONG marks", fn: keepNameEnd, input: (n) => "a" + "\u0301".repeat(n) },
  { name: "keepNameEnd  ZWJ chain", fn: keepNameEnd, input: (n) => "\u{1F469}\u200D".repeat(Math.floor(n / 3)) + "x" },
  { name: "digitChoice  digits", fn: digitChoice, input: (n) => "1".repeat(n) },
  { name: "hangCjkMarks marks", fn: (s) => hangCjkMarks(s), input: (n) => "，".repeat(n) },
  { name: "lastTwo      SPACES", fn: (s) => lastTwo(s, "any"), input: (n) => " ".repeat(n) },
  // pulse-grid.tsx KeepHyphenated's split pattern, copied verbatim (line 810): the component imports the app, so the
  // pattern is run here on its own.
  { name: "KeepHyphenated split LONG", fn: (s) => s.split(/([^\s\p{Script=Han}]*(?:\p{L}-[\p{L}\p{N}]|\p{N}-\p{L})[^\s\p{Script=Han}]*)/u), input: (n) => "x".repeat(n) },
];

for (const c of cases) {
  // warm-up on a small input
  c.fn(c.input(200));
  const n1 = 5_000, n2 = 10_000, n3 = 20_000;
  const t1 = time(() => c.fn(c.input(n1)));
  const t2 = time(() => c.fn(c.input(n2)));
  const t3 = time(() => c.fn(c.input(n3)));
  const ratio = t2 > 0.05 ? (t3 / t2).toFixed(2) : "-";
  console.log(`${c.name.padEnd(36)} n=5k ${t1.toFixed(2).padStart(9)} ms   10k ${t2.toFixed(2).padStart(9)} ms   20k ${t3.toFixed(2).padStart(9)} ms   20k/10k ${ratio}`);
}
