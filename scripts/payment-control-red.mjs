/**
 * RED HARNESS — the money rail nobody chose.
 *
 *   node scripts/payment-control-red.mjs        (npm run red:payment-control)
 *
 * ⭐ MUTATION 1 IS THE PRODUCTION STATE AT `adc3718f`, VERBATIM. `envProvider()` folded
 * three states into one — the variable set to `mock` (a choice), UNSET (nobody chose),
 * and set to something unrecognised (a failed choice) — and returned `mock` for all
 * three. On a LIVE deployment the last two silently activated an adapter whose own doc
 * comment says it "fabricates confirmations: deposits credit real wallets with no money
 * received", with no typed confirm, no COMPLIANCE audit and no banner, because those
 * exist only where an officer PICKS the mock. If mutation 1 ever stops going red, the
 * refusal has been undone.
 *
 * ⚠️ MUTATIONS 5 AND 6 ARE OVER-CORRECTIONS, NOT DEFECTS OF THE OLD KIND. They refuse a
 * mock that WAS chosen, and refuse in TEST mode. Both must go red too: the first would
 * silently reverse the owner decision of 2026-07-24, the second would stop every
 * developer machine and CI box booting. A guard that only fails in one direction turns
 * the next fix into a regression.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies,
 * and the harness reports "defect not caught" as guard weakness. Every mutation matches
 * both line endings AND re-reads the file to confirm the anchor is gone from disk.
 *
 * ⚠️ POSITIVE CONTROL FIRST. A refusal check needs one in the same run, or fixing the
 * defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const CTRL = new URL("../src/lib/server/payment-control.ts", import.meta.url);
const PAY = new URL("../src/lib/server/payments.ts", import.meta.url);
const originals = new Map([[CTRL, readFileSync(CTRL, "utf8")], [PAY, readFileSync(PAY, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try {
    const out = execSync("npx tsx scripts/payment-control.test.mts", { cwd: CWD, stdio: "pipe" }).toString();
    // ⛔ Exit code alone is not enough — the suite must also REPORT a failure. A
    // harness that only checks "did the file change" prints ✓ RED for mutations the
    // guard silently passed; that happened twice in this repo.
    return /(?:^|\n)payment-control: \d+ passed, [1-9]\d* failed/.test(out);
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    return /[1-9]\d* failed/.test(out) || /Error|error TS/.test(out);
  }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

import { MUTATIONS } from "./anchors/payment-control.anchors.mjs";
// ⛔ THE DECLARATION HOLDS REPO-RELATIVE STRINGS so test:red-anchors §3 can resolve them; this
//    harness reads files by URL. Convert at the ONE boundary rather than storing a shape the
//    auditor cannot follow — that drift is why it refuses to guess at undeclared harnesses.
const fileUrl = (rel) => new URL(`../${rel}`, import.meta.url);


let caught = 0;
const problems = [];

/**
 * Apply one anchored replacement, CRLF-aware, and confirm it landed on disk.
 *
 * ⚠️ "THE ANCHOR IS GONE" IS THE WRONG LANDED-CHECK FOR AN INSERTION, and this harness
 * proved it on its own first run: the hydration mutation REPLACES a line with a copy of
 * itself plus one more, so the anchor is still there afterwards by design and the edit
 * was reported as a HARNESS ERROR though it had applied perfectly. The check is now:
 * the file must have CHANGED, and the anchor must be gone only when the replacement
 * does not deliberately contain it.
 */
function applyEdit(file, from, to) {
  const src = readFileSync(file, "utf8");
  const asCRLF = from.replace(/\n/g, "\r\n");
  const anchor = src.includes(from) ? from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) return `anchor not found`;
  writeFileSync(file, src.replace(anchor, anchor === asCRLF ? to.replace(/\n/g, "\r\n") : to));
  const after = readFileSync(file, "utf8");
  if (after === src) return `file unchanged after write`;
  const reinserted = to.replace(/\r\n/g, "\n").includes(from.replace(/\r\n/g, "\n"));
  if (!reinserted && after.includes(anchor)) return `anchor still present after write`;
  return null;
}

for (const m of MUTATIONS) {
  restore();
  let err = applyEdit(fileUrl(m.file), m.from, m.to);
  if (!err && m.extra) err = applyEdit(fileUrl(m.file), m.extra.from, m.extra.to);
  if (err) { problems.push(`${m.name} — HARNESS ERROR: ${err}`); continue; }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
