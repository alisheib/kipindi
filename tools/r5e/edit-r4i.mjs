// r4i §9.6: the empty state's break sentence keeps its end whole as a RUN (round 5, R5-E, review 3 H4), not by no-break spaces.
import { readFileSync, writeFileSync } from "node:fs";
const p = "F:/kipindi-r5e/scripts/visual-pass-r4i.test.mts";
let s = readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
const NL = crlf ? "\r\n" : "\n";
const E = (x) => (crlf ? x.split("\n").join("\r\n") : x);
const rep = (a, b) => { if (!s.includes(E(a))) { console.error("MISSING:", a.slice(0, 140)); process.exit(1); } s = s.replace(E(a), E(b)); };

rep(
  "  breakEndParam, readBreakEndParam, formatBreakEnd, firstDateSentence, breakSentenceText, breakStateOf, breakStateFromTimers,",
  "  breakEndParam, readBreakEndParam, formatBreakEnd, firstDateSentence, breakSentence, breakStateOf, breakStateFromTimers,",
);
rep(
  'import { keepText, keptRanges, digitChoice } from "../src/components/ui/keep-run.tsx";',
  'import { keepText, keptRanges, digitChoice } from "../src/components/ui/keep-run.tsx";\nimport { emptyStateBody } from "../src/components/ui/empty-state-text.ts";',
);
// The old 9.6 holds literal no-break spaces, so it is replaced by position: its three lines, from `const sentence =`.
const a = s.indexOf("  const sentence = breakSentenceText(");
const okAt = s.indexOf('ok("9.6 · ', a);
const b = s.indexOf(NL, s.indexOf(NL, okAt) + NL.length);
if (a < 0 || okAt < 0 || b < 0) { console.error("9.6 not found", a, okAt, b); process.exit(1); }
const block = [
  "  // ⚠️ Pin moved 2026-10-09 (round 5, R5-E, review 3 H4): the end is a RUN the EmptyState body keeps whole as a nowrap",
  "  // span (`breakSentence` → `emptyStateBody`, the keepText convention) — no longer no-break spaces in the words.",
  "  const sentence = breakSentence(T.sw.rg.breakActive, END_ISO, NOW, T.sw.common.monthsShort, \"sw\");",
  "  const drawn = html(emptyStateBody(sentence));",
  "  ok(\"9.6 · the empty state keeps the end whole as one run, every character the dictionary's and the formatter's\",",
  "    sentence.text === fill(T.sw.rg.breakActive, { date: endText(\"sw\") }) && sentence.keep.length === 1 && sentence.keep[0] === endText(\"sw\")",
  "      && endText(\"sw\") === \"10 Okt, 05:05\" && !/[\\u00a0\\u2060]/.test(drawn) && /<span class=\"whitespace-nowrap\">[^<]*10 Okt, 05:05[^<]*<\\/span>/.test(drawn), drawn);",
].join(NL);
s = s.slice(0, a) + block + s.slice(b);
writeFileSync(p, s);
console.log("ok");
