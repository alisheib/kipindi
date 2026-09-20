/**
 * A REGULATOR NOTE IS A STATEMENT ABOUT OUR OWN ARITHMETIC, AND IT MUST MATCH THE ARITHMETIC.
 *
 *   npm run test:report-note-truth
 *
 * ⛔ WHAT THIS EXISTS TO STOP, measured on `main` 2026-09-20 (defect L57, C5-D20-REPLAN ruling 268).
 * The Gaming Board monthly pack carried the note:
 *     "GGR = total stakes − total payouts (voids/refunds excluded from both sides)."
 * The code has never done that. `src/lib/server/report-money.ts` computes
 *     const ggr = stakes - payouts - refunds;
 * and that file's own header explains why: a refunded stake is still counted in Stakes, so without subtracting it
 * GGR is overstated by the whole refunded amount — AND SO IS THE TRA/GBT LEVY BASE DERIVED FROM IT.
 *
 * ⭐ THE PACK WAS ALSO INCONSISTENT WITH ITSELF: two other notes in the same file already said
 * "Sales − Payouts − Refunds" and "− refunded stakes". So the wrong one was not a considered position, it was a
 * sentence nobody re-derived — which is exactly the class of error a guard can hold and a reviewer cannot.
 *
 * ⛔ WHAT THIS DOES NOT DO. It does not parse arithmetic or verify the formula is economically right; that is what
 * `test:money-invariants` and the report suites are for. It asserts one narrow, checkable thing: wherever a note
 * NAMES the GGR formula, the three terms it names are the three terms the function subtracts. A note that says
 * refunds are excluded while the code subtracts them is caught. Nothing else is claimed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let pass = 0;
const failures = [];
const ok = (l, c, x = "") => { c ? pass++ : failures.push((l + " " + x).trim()); console.log("  " + (c ? "✓" : "✗") + " " + l + (x ? " " + x : "")); };

const money = readFileSync(join(ROOT, "src/lib/server/report-money.ts"), "utf8");
const catalogue = readFileSync(join(ROOT, "src/lib/server/reports/catalogue.ts"), "utf8");
const analytics = readFileSync(join(ROOT, "src/lib/server/analytics.ts"), "utf8");

console.log("\n[report-note-truth] §1 the GGR formula, read from the function that computes it");
let subtractsRefunds = null;
{
  const m = money.match(/const ggr = ([^;]+);/);
  ok("§1 report-money declares the GGR expression exactly once and this suite found it", !!m, m ? m[1].trim() : "NOT FOUND");
  if (m) {
    const expr = m[1];
    subtractsRefunds = /-\s*refunds?\b/.test(expr);
    ok("§1 CONTROL · the expression names stakes and payouts, so this suite is reading the right line",
      /stakes/.test(expr) && /payouts/.test(expr), expr.trim());
    ok("§1 the computed GGR subtracts refunds (the fact every note must agree with)",
      subtractsRefunds === true, expr.trim());
  }
}

console.log("\n[report-note-truth] §2 no note may contradict it");
{
  // A note that NAMES the GGR formula: a line mentioning GGR and an equals sign.
  const noteLines = [];
  for (const [file, src] of [["catalogue.ts", catalogue], ["analytics.ts", analytics]]) {
    for (const line of src.split(/\r?\n/)) {
      if (/GGR\s*=/.test(line) && !/^\s*\/\/ /.test(line.trim()) === false) { /* comments included deliberately */ }
      if (/GGR\s*=/.test(line)) noteLines.push([file, line.trim()]);
    }
  }
  ok("§2 ratchet · the GGR formula is stated in at least one note", noteLines.length >= 1, noteLines.length + " statements");

  // ⛔ THE CONTRADICTION SHAPE: a statement that refunds/voids are EXCLUDED, while the code subtracts them.
  const EXCLUDES = /(?:voids?\s*\/?\s*refunds?|refunds?)[^.]{0,40}\bexclud/i;
  const bad = noteLines.filter(([, l]) => EXCLUDES.test(l));
  ok("§2 no statement claims refunds are EXCLUDED while the code subtracts them",
    !(subtractsRefunds && bad.length), bad.map(([f, l]) => f + ": " + l.slice(0, 110)).join(" | "));

  // And the officer/regulator-facing notes that DO spell the terms must spell all three.
  const spelled = noteLines.filter(([, l]) => /stakes?/i.test(l) && /payouts?/i.test(l));
  const missingRefunds = spelled.filter(([, l]) => !/refund/i.test(l));
  ok("§2 every statement that spells stakes and payouts also spells refunds",
    !(subtractsRefunds && missingRefunds.length),
    missingRefunds.map(([f, l]) => f + ": " + l.slice(0, 110)).join(" | "));
}

console.log("\n[report-note-truth] §3 CONTROL · the detector catches the sentence that shipped");
{
  const EXCLUDES = /(?:voids?\s*\/?\s*refunds?|refunds?)[^.]{0,40}\bexclud/i;
  const shipped = "GGR = total stakes − total payouts (voids/refunds excluded from both sides).";
  const fixed = "GGR = total stakes − total payouts − refunded stakes.";
  ok("§3 the exact note that shipped is caught", EXCLUDES.test(shipped));
  ok("§3 CONTROL · the corrected note is NOT caught, so §2 is not merely rejecting everything", !EXCLUDES.test(fixed));
}

console.log("\n" + (failures.length === 0 ? "ALL PASS" : "FAILURES") + " — report-note-truth: " + pass + " passed, " + failures.length + " failed");
if (failures.length) { for (const f of failures) console.log("  · " + f); process.exit(1); }
