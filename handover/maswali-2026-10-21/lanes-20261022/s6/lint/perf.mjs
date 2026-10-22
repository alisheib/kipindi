// Timing of hand-copied regex literals on long adversarial strings (regex behaviour only; no repo code).
import { RX } from "./rx.mjs";
const time = (label, fn) => { const t0 = process.hrtime.bigint(); const r = fn(); const ms = Number(process.hrtime.bigint() - t0) / 1e6; console.log(`${label.padEnd(64)} ${ms.toFixed(1).padStart(10)} ms  -> ${r}`); };
for (const k of [1000, 2000, 4000, 8000]) {
  // TAX_HEADS on `own`: a tax noun, a long whitespace run, a non-matching char, then the figure's own spaces.
  const own = "50 pick: tax" + " ".repeat(k) + "#";
  time(`TAX_HEADS  tax + ${k} spaces + '#'`, () => RX.TAX_HEADS.test(own));
}
for (const k of [1000, 2000, 4000, 8000]) {
  const s = "50 pick: tax" + " ".repeat(k) + "#  ";
  time(`TAX_HEADS  tax + ${k} spaces + '#' + 2 spaces`, () => RX.TAX_HEADS.test(s));
}
for (const k of [1000, 2000, 4000]) {
  // MONEY_IN over a sentence holding a long run of space-grouped zeros with no currency (each group a start).
  const s = "50 pick: x " + Array.from({ length: k }, () => "000").join(" ") + " y";
  time(`MONEY_IN   ${k} space groups, no currency`, () => [...s.matchAll(RX.MONEY_IN)].length);
}
for (const k of [1000, 2000, 4000]) {
  const s = "50 pick: x " + "1".repeat(k) + " y";
  time(`MONEY_IN   ${k}-digit run, no currency`, () => [...s.matchAll(RX.MONEY_IN)].length);
}
for (const k of [10000, 20000, 40000]) {
  // QUESTION_BEFORE on a long prefix ending in a statement's full stop.
  const s = "50 pick: " + "ab cd, ".repeat(k) + "end.";
  time(`QUESTION_BEFORE prefix ${s.length} chars, no '?'`, () => RX.QUESTION_BEFORE.test(s));
}
for (const k of [10000, 20000, 40000]) {
  const s = "50 pick: " + "ab? ".repeat(k) + "end.";
  time(`QUESTION_BEFORE prefix ${s.length} chars, many '? '`, () => RX.QUESTION_BEFORE.test(s));
}
for (const k of [1000, 2000, 4000]) {
  const s = "we" + " already".repeat(k) + " x";
  time(`PLATFORM_PAYS we + ${k} x ' already' + x`, () => RX.PLATFORM_PAYS.test(s));
}
for (const k of [1000, 2000, 4000]) {
  const s = "we" + "  already".repeat(k) + " x";
  time(`PLATFORM_PAYS we + ${k} x '  already' (2 spaces) + x`, () => RX.PLATFORM_PAYS.test(s));
}
for (const k of [1000, 2000, 4000]) {
  const s = "our" + " ab".repeat(k) + " x";
  time(`PLATFORM_PAYS our + ${k} words + x`, () => RX.PLATFORM_PAYS.test(s));
}
for (const k of [20000, 40000]) {
  const s = "toa " + "x ".repeat(k);
  time(`LIMIT_BEFORE own ${s.length} chars`, () => RX.LIMIT_BEFORE.test(s));
}
for (const k of [1000, 2000, 4000]) {
  const s = "no" + " ".repeat(k) + "x";
  time(`TAX_NEGATED no + ${k} spaces + x`, () => RX.TAX_NEGATED.test(s));
}
for (const k of [1000, 2000, 4000]) {
  const s = "tax" + " -".repeat(k) + "x";
  time(`TAX_NEGATED tax + ${k} ' -' + x`, () => RX.TAX_NEGATED.test(s));
}
for (const k of [2000, 4000, 8000]) {
  const s = "x" + ",".repeat(1) + " ".repeat(k) + "#";
  time(`CLAUSE_START ', ' + ${k} spaces + '#'`, () => RX.CLAUSE_START.test(s));
}
for (const k of [1000, 2000, 4000]) {
  const s = "1" + "o".repeat(k) + "x";
  time(`FIGURE_O 1 + ${k} o + x`, () => (RX.FIGURE_O.lastIndex = 0, RX.FIGURE_O.test(s)));
}
for (const k of [1000, 2000, 4000]) {
  const s = "1" + " ooo".repeat(k) + "x";
  time(`FIGURE_O 1 + ${k} ' ooo' + x`, () => (RX.FIGURE_O.lastIndex = 0, RX.FIGURE_O.test(s)));
}
