/**
 * RED harness for `npm run test:tracker-hygiene`.
 *
 *   node scripts/tracker-hygiene-red.mjs
 *
 * Reinstates each of the FOUR contradictions that were actually live in
 * `docs/LIVE-QA-CAMPAIGN.md` §6, one at a time, and requires the guard to fail on each.
 *
 * 🔴 WHY THIS FILE EXISTS AS A FILE, INSTEAD OF A SHELL LOOP. The first attempt at proving this
 * guard used an inline `perl -pi` helper that decided a mutation had been "caught" if the FILE
 * had CHANGED. It printed **"✓ RED" for three mutations the guard silently passed.** The guard
 * had a real bug — `RESOLVED` matched `BUILT` inside `NOT BUILT`, so the single most dangerous
 * row in the register (a WITHDRAWN misdiagnosis still presented as `🔴 HIGH — ALI'S CALL`)
 * classified as *resolved* and was skipped. Two lies stacked: a broken guard, and a harness that
 * reported the wrong thing as evidence it worked.
 *
 * So the contract here is explicit and non-negotiable:
 *   1 · the anchor must be FOUND (a missed anchor is a hard failure, never a skip);
 *   2 · the guard must EXIT NON-ZERO **and** its summary must show ≥1 failure;
 *   3 · the file is restored on every path, and the guard must be green again at the end.
 * Anything else is reported as the harness being broken, not as a pass.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// ⛔ THE GUARD'S OWN LOCATOR. A mutation must find its target exactly as the check does.
import { locateHandoff } from "./campaign-handoff.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC = join(ROOT, "docs/LIVE-QA-CAMPAIGN.md");

/**
 * Each mutation edits ONE line. The first four reinstate a real §1 contradiction by rewriting a
 * row's id+status cells; the last proves §2 by pointing the handoff at a finding nobody filed.
 */
const MUTATIONS = [
  {
    name: "E-999-in-handoff-but-not-filed",
    what: "§2 — the resume list names a finding with no row in the register",
    // 🔴 THIS MUTATION HAD BEEN PROVING NOTHING FOR EIGHT SESSIONS, and it is the same defect it
    // was written to guard. It anchored on the literal `⏭️ **RESUME AT:**`, which no handoff has
    // used since session 23 — they carry a session number (`RESUME AT (session 32):`). So
    // `findIndex` matched a **superseded block from session ~16**, mutated that, and the guard
    // — which had drifted to the identical wrong block — duly went red. Two wrongs agreeing.
    // ⛔ §0.1a rule 2: a mutation must locate its target EXACTLY as the guard does. It now
    // shares the guard's own locator rather than a copy of a pattern.
    locate: "handoff",
    rewrite: (line) => line.replace(/(⏭️ \*\*RESUME AT[^*]*\*\*)/, "$1 ⓪ **E-999** —"),
  },
  {
    name: "handoff-marker-format-drift",
    what: "§2 — the newest marker changes shape, so the locator falls through to a superseded block",
    // ⭐ THE REGRESSION ITSELF, AS A MUTATION. This is what actually happened four times: the
    // marker's wording moved, the pattern stopped matching it, and both guards silently began
    // validating an older handoff while reporting green. The "topmost block" assertion is what
    // turns that from a silent drift into a failure, and this proves it fires.
    locate: "handoff",
    rewrite: (line) => line.replace("⏭️ **RESUME AT", "⏭️ **RESUME POINT"),
  },
  {
    name: "E-58-withdrawn-but-asks-Ali",
    what: "a WITHDRAWN misdiagnosis still presented as HIGH and awaiting Ali's decision",
    startsWith: "| **E-58** *(original filing",
    replaceWith: "| **E-58** | 🔴 **HIGH — ⛔ ALI’S CALL, NOT BUILT** |",
  },
  {
    name: "E-53-shipped-but-says-not-built",
    what: "a shipped, live-verified feature whose other row says NOT YET BUILT",
    startsWith: "| **E-53** *(original filing",
    replaceWith: "| **E-53** | 📌 **DECIDED BY ALI 2026-08-03, NOT YET BUILT** |",
  },
  {
    name: "E-50-fixed-but-original-row-open",
    what: "session 19 fixed it; the original filing still reads OPEN",
    startsWith: "| **E-50** *(original filing",
    replaceWith: "| **E-50** | 🟡 **OPEN — found while shipping E-47b, pre-dates it** |",
  },
  {
    name: "E-46-the-first-recurrence",
    what: "the original instance of this whole class, found in session 16",
    startsWith: "| **E-46** *(original filing",
    replaceWith: "| **E-46** | 🟡 **OPEN** |",
  },
];

function runGuard() {
  try {
    const out = execSync("npm run test:tracker-hygiene", { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    const m = out.match(/(\d+) passed, (\d+) failed/);
    return { exitedNonZero: false, failed: m ? Number(m[2]) : null, out };
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    const m = out.match(/(\d+) passed, (\d+) failed/);
    return { exitedNonZero: true, failed: m ? Number(m[2]) : null, out };
  }
}

const baseline = runGuard();
if (baseline.exitedNonZero) {
  console.log("\n⛔ the guard is ALREADY RED on an unmutated tree — fix that first\n");
  console.log(baseline.out.split("\n").filter((l) => /·|passed,/.test(l)).slice(-8).join("\n"));
  process.exit(2);
}
console.log(`\nbaseline: guard GREEN (${baseline.out.match(/(\d+) passed/)?.[1]} checks)\n`);

let proven = 0;
const broken = [];

for (const m of MUTATIONS) {
  const original = readFileSync(DOC, "utf8");
  const nl = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r?\n/);
  // ⛔ A HANDOFF MUTATION LOCATES ITS TARGET THROUGH THE GUARD'S OWN LOCATOR, never through a
  // second copy of the pattern — see the note on the first mutation for what that cost.
  let idx;
  if (m.locate === "handoff") {
    const h = locateHandoff(original);
    idx = h.found ? original.slice(0, h.index).split(/\r?\n/).length - 1 : -1;
  } else {
    idx = lines.findIndex((l) => l.startsWith(m.startsWith));
  }
  if (idx < 0) {
    broken.push(`${m.name} — ANCHOR NOT FOUND ("${m.locate === "handoff" ? "the current handoff" : m.startsWith}"), this mutation tested nothing`);
    console.log(`  ⛔ ${m.name.padEnd(34)} anchor not found — harness broken, not a pass`);
    continue;
  }
  // Swap the id + status cells, keep the body (which is the evidence, and is not what is tested).
  // A mutation may instead supply its own `rewrite` for lines that are not table rows.
  const mutatedLine = m.rewrite
    ? m.rewrite(lines[idx])
    : lines[idx].replace(/^\| \*\*[EGAH]-\d+\*\*[^|]*\| [^|]*\|/, m.replaceWith);
  if (mutatedLine === lines[idx]) {
    broken.push(`${m.name} — the cell pattern did not match, nothing was mutated`);
    console.log(`  ⛔ ${m.name.padEnd(34)} cell rewrite failed — harness broken`);
    continue;
  }
  lines[idx] = mutatedLine;
  writeFileSync(DOC, lines.join(nl));

  let r;
  try { r = runGuard(); } finally { writeFileSync(DOC, original); }

  // ⛔ BOTH conditions. A non-zero exit with an unparseable summary, or a zero exit with
  // failures reported, would each mean this harness does not understand the guard's output.
  if (r.exitedNonZero && r.failed > 0) {
    proven++;
    console.log(`  ✓ RED  ${m.name.padEnd(34)} ${r.failed} failed — ${m.what}`);
  } else {
    broken.push(
      `${m.name} — guard did NOT catch it (exit ${r.exitedNonZero ? "non-zero" : "0"}, ` +
      `failed=${r.failed}): ${m.what}`);
    console.log(`  ✗ MISS ${m.name.padEnd(34)} guard passed a real contradiction — ${m.what}`);
  }
}

const after = runGuard();
console.log(`\nrestored: guard ${after.exitedNonZero ? "RED — ⛔ THE DOC WAS NOT RESTORED" : "GREEN"}`);
console.log(`\n${proven}/${MUTATIONS.length}\n`);
for (const b of broken) console.log(`  · ${b}`);
process.exit(broken.length === 0 && !after.exitedNonZero ? 0 : 1);
