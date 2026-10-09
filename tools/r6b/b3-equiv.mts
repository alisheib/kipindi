// R6-B · B-3: the three linear readers against the exact patterns they replaced, on a corpus built to hit their edges,
// and their timing on adversarial inputs. Run from F:/kipindi-r6b:  node_modules/.bin/tsx <this file>
import { lastTwoWordsAt } from "file:///F:/kipindi-r6b/src/lib/fill-nodes.tsx";
import { hyphenParts } from "file:///F:/kipindi-r6b/src/app/live/pulse-grid.tsx";
import { endClause } from "file:///F:/kipindi-r6b/src/lib/notification-text.ts";

const OLD_LAST_TWO = /\S+\s+\S+\s*$/;
const OLD_HYPHEN = /([^\s\p{Script=Han}]*(?:\p{L}-[\p{L}\p{N}]|\p{N}-\p{L})[^\s\p{Script=Han}]*)/u;
const oldEndClause = (text: string, stop: "." | "。") => { const t = text.trimEnd(); if (/[!?！？…]$/.test(t)) return t; return `${t.replace(/[.。]+$/, "")}${stop}`; };

const c = (n: number) => String.fromCodePoint(n);
const TOK = [
  "a", "Z", "é", "e\u0301", c(0x1d400), "Ж", "ß", "ﬁ", "1", "2026", "27", "٣", "²", "Ⅻ", "-", "--", "‐", "–", "—", "-a", "a-", "1-", "-1",
  " ", "  ", "\t", "\n", c(0xa0), c(0x3000), c(0x2003), c(0x202f), "中", "国", c(0x20000), c(0x2ebf0), "。", "？", ",", "?", "!", "(", ")", "/", ".", "..", "…",
  "😀", "\u200d", "\u0301", "x", "month-end?", "30-day", "Man-City", "2026-27", "中-a", "a-中", "1-中", "中-1", "TZS", "4,200", "dakika", "28:00",
  "\ud800", "\udc00",
];
let seed = 20261009; const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
let n = 0; const bad: Record<string, number> = { lastTwo: 0, hyphen: 0, endClause: 0 };
const show = (what: string, s: string, a: unknown, b: unknown) => { bad[what]++; if (bad[what] <= 5) console.log(`DIFF ${what} ${JSON.stringify(s)} old ${JSON.stringify(a)} new ${JSON.stringify(b)}`); };
for (let i = 0; i < 200_000; i++) {
  let s = ""; const k = Math.floor(r() * 12);
  for (let j = 0; j < k; j++) s += TOK[Math.floor(r() * TOK.length)];
  n++;
  const a1 = s.search(OLD_LAST_TWO), b1 = lastTwoWordsAt(s);
  if (a1 !== b1) show("lastTwo", s, a1, b1);
  const a2 = JSON.stringify(s.split(OLD_HYPHEN)), b2 = JSON.stringify(hyphenParts(s));
  if (a2 !== b2) show("hyphen", s, a2, b2);
  for (const stop of [".", "。"] as const) { const a3 = oldEndClause(s, stop), b3 = endClause(s, stop); if (a3 !== b3) show("endClause", s, a3, b3); }
}
console.log(`${n} strings × 3 readers (endClause in both stops) · differences ${JSON.stringify(bad)}`);

const time = (f: () => unknown) => { const t0 = performance.now(); f(); return performance.now() - t0; };
for (const len of [10_000, 20_000]) {
  const word = "x".repeat(len), dots = ".".repeat(len) + "x";
  console.log(`n=${len}: lastTwoWordsAt(word) ${time(() => lastTwoWordsAt(word)).toFixed(2)}ms (old ${time(() => word.search(OLD_LAST_TWO)).toFixed(0)}ms) · `
    + `hyphenParts(word) ${time(() => hyphenParts(word)).toFixed(2)}ms (old ${time(() => word.split(OLD_HYPHEN)).toFixed(0)}ms) · `
    + `endClause(dots) ${time(() => endClause(dots, ".")).toFixed(2)}ms (old ${time(() => oldEndClause(dots, ".")).toFixed(0)}ms)`);
}
