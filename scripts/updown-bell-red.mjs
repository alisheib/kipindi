/**
 * RED PROOF for `test:updown-bell` — break it on purpose, watch it fail.
 *
 *   npm run red:updown-bell
 *
 * A suite that has never been observed failing is a suite that might be asserting nothing.
 * This repo has shipped that mistake repeatedly and at cost: a guard whose regex matched its
 * own explanatory comment, an assertion that could not fail under its own mutation, a
 * "coverage" check that counted a symbol rather than a reachable statement. Each mutation
 * below reintroduces a defect the bell rows exist to prevent — most of them defects that
 * ACTUALLY SHIPPED on this platform — and the suite must go red for every one.
 *
 * ⚠️ CRLF. An anchor authored with LF against a CRLF tree silently matches nothing, the
 * mutation never applies, the suite passes, and the harness would report "defect not caught"
 * as if the guard were weak. Every mutation matches both line endings AND re-reads the file
 * to confirm the anchor is GONE from disk. A mutation that did not apply is a HARNESS ERROR,
 * never a green — that exact failure was caught in this campaign on 2026-08-22, when three
 * anchors in `updown-push-red.mjs` pointed at code that had just been replaced.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

import { MUTATIONS } from "./anchors/updown-bell.anchors.mjs";

// ⛔ THE MUTATIONS LIVE IN A SIDECAR, NOT HERE. `test:red-anchors` audits every declared
// anchor without executing this file, and it can only do that if the anchors are importable
// DATA. Written inline, this harness pushed the undeclared-harness ratchet from 67 to 68 and
// `test:red-anchors` refused the commit — correctly: an inline anchor is one nobody can
// audit, and three inline anchors in `updown-push-red.mjs` rotted silently on this very day
// when the code beneath them was rewritten.
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
    problems.push(`${m.name} — HARNESS ERROR: anchor not found, mutation never applied`);
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
    execSync("npx tsx scripts/updown-bell.test.mts", { cwd: new URL("..", import.meta.url), stdio: "pipe" });
  } catch { failed = true; }

  if (failed) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();

// ⛔ Prove the tree really is byte-identical to what we started with, rather than trusting
// that the last write went through. A harness that leaves a mutation behind is worse than
// no harness: the next suite to run measures a tree nobody chose.
for (const [f, src] of originals) {
  if (readFileSync(f, "utf8") !== src) problems.push(`HARNESS ERROR: ${f} was not restored`);
}

console.log(`\ntree restored + verified byte-identical · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) {
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
