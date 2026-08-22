/**
 * RED PROOF for `test:notifications-page` — break it on purpose, watch it fail.
 *
 *   npm run red:notifications-page
 *
 * A suite that has never been observed failing is a suite that might be asserting nothing.
 * This repo has shipped that mistake at cost: a guard whose regex matched its own explanatory
 * comment, a coverage check that counted a symbol rather than a reachable statement, and — on
 * the day this screen was built — four separate harnesses whose anchors had rotted against
 * rewritten code and had silently stopped applying.
 *
 * ⚠️ CRLF. An anchor authored with LF against a CRLF tree silently matches nothing, the
 * mutation never applies, and a naive harness reports "defect not caught" as if the guard
 * were weak. Every mutation matches both line endings AND re-reads the file to confirm the
 * anchor is GONE from disk. ⛔ A mutation that did not apply is a HARNESS ERROR, never a green.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

import { MUTATIONS } from "./anchors/notifications-page.anchors.mjs";

const originals = new Map(MUTATIONS.map((m) => [m.file, readFileSync(m.file, "utf8")]));
const restore = () => { for (const [f, src] of originals) writeFileSync(f, src); };

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");

  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) {
    problems.push(`${m.name} — HARNESS ERROR: anchor not found in ${m.file}, mutation never applied`);
    continue;
  }
  // ⛔ An anchor that matches TWICE mutates a place nobody chose. Refuse rather than guess.
  const hits = src.split(anchor).length - 1;
  if (hits !== 1) {
    problems.push(`${m.name} — HARNESS ERROR: anchor matches ${hits}× in ${m.file}, not once`);
    continue;
  }

  const replacement = anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to;
  writeFileSync(m.file, src.replace(anchor, replacement));

  // ⭐ Believe nothing until the anchor is actually gone from what is on disk.
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`);
    continue;
  }

  let failed = false;
  try {
    execSync("npx tsx scripts/notifications-page.test.mts", { cwd: new URL("..", import.meta.url), stdio: "pipe" });
  } catch { failed = true; }

  if (failed) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();

// ⛔ Prove the tree is byte-identical to what we started with rather than trusting the last
// write. A harness that leaves a mutation behind is worse than no harness: the next suite to
// run measures a tree nobody chose.
for (const [f, src] of originals) {
  if (readFileSync(f, "utf8") !== src) problems.push(`HARNESS ERROR: ${f} was not restored`);
}

console.log(`\ntree restored + verified byte-identical · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) {
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
