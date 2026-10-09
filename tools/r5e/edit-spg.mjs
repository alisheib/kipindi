// sell-price-guard §7.whole: the toast's figures are `.amount`s now (round 5, H4's sweep), not a no-break space.
import { readFileSync, writeFileSync } from "node:fs";
const p = "F:/kipindi-r5e/scripts/sell-price-guard.test.mts";
let s = readFileSync(p, "utf8");
const eol = s.includes("\r\n") ? "\r\n" : "\n";
const rep = (a, b) => { if (!s.includes(a)) { console.error("MISSING:", a.slice(0, 120)); process.exit(1); } s = s.replace(a, b); };
rep(
  [
    "/** The no-break space a refused sale's toast joins each figure with, and the helper that joins them. */",
    "const NO_BREAK_LINE = 'const NO_BREAK = String.fromCharCode(160);';",
    "const WHOLE = 'export const keepFiguresWhole = (sentence: string) => sentence.split(\"TZS \").join(\"TZS\" + NO_BREAK);';",
  ].join(eol),
  [
    "/** The helper a refused sale's toast keeps its figures whole with: each figure one `.amount` (`moneyRuns`). ⚠️ Pin moved",
    " *  2026-10-09 (round 5, R5-E, review 3 H4's sweep): it joined \"TZS\" to its number with a no-break space — a character in",
    " *  the toast's text, travelling into a copy and a find-in-page; the toast now takes nodes, and no character is built. */",
    "const NO_BREAK_LINE = 'String.fromCharCode(160)';",
    "const WHOLE = 'export const keepFiguresWhole = (sentence: string) => moneyRuns(sentence);';",
  ].join(eol),
);
rep(
  "  ok(\"7.whole · a refused sale's toast keeps each money figure whole: its sentence goes through keepFiguresWhole, which joins TZS to its number with a no-break space (a toast draws plain text; S6 A8f's promise for the moved price's sentence, which only the toast draws since A8h)\",",
  "  ok(\"7.whole · a refused sale's toast keeps each money figure whole: its sentence goes through keepFiguresWhole, which sets each figure as one `.amount` (moneyRuns: whole and mono, §M4) and inserts no character (S6 A8f's promise for the moved price's sentence, which only the toast draws since A8h)\",",
);
rep(
  "TOAST_CALM.includes(\"description: keepFiguresWhole(msg)\") && count(refusal, \"keepFiguresWhole(msg)\") === 1 && count(result, NO_BREAK_LINE) === 1 && count(result, WHOLE) === 1,",
  "TOAST_CALM.includes(\"description: keepFiguresWhole(msg)\") && count(refusal, \"keepFiguresWhole(msg)\") === 1 && count(result, NO_BREAK_LINE) === 0 && count(result, WHOLE) === 1\r\n      && count(result, 'import { moneyRuns } from \"@/lib/fill-nodes\";') === 1,".replace("\r\n", eol),
);
writeFileSync(p, s);
console.log("ok");
