/**
 * `npm run test:orphans` — no file in `scripts/` may claim coverage nothing runs.
 *
 * WHY THIS EXISTS. On 2026-07-31 a survey found **151 of 284 files in `scripts/` were
 * orphaned**: referenced by no `package.json` script, so nothing had executed them in weeks or
 * months. They are not junk — they include `break-it-player.mjs`, `fuzz-malformed-payloads.mjs`,
 * `betting-abuse-resistance-e2e.mjs`, `stress-regulator-grade.mjs`, `axe-audit.mjs` and seven
 * dial-stress suites. Real adversarial work, written carefully, that once proved something.
 *
 * That is exactly what makes them dangerous. An orphaned suite reads, to anyone browsing the
 * directory, like the platform is covered — while its guarantee expired silently at whatever
 * commit last kept it true. It is the same defect as the compliance card that displayed a
 * hardcoded green tick for backups that did not exist, one directory over.
 *
 * So orphans are now DECLARED, not discovered. `orphan-allowlist.json` names every one that is
 * knowingly unwired, and this gate fails on any file not in it. Under the Module Certification
 * Program each entry must eventually be:
 *
 *   ADOPT  — wire into package.json as a named gate, fix until green, prove it goes red
 *   DELETE — with a commit note saying what it proved and why that no longer needs proving
 *
 * There is no third option, and **the allowlist's length is the program's progress metric.**
 * It may only ever shrink.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const ALLOWLIST = join(here, "orphan-allowlist.json");

const CODE = new Set([".mjs", ".mts", ".ts", ".js", ".cjs"]);

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const allScripts = Object.values(pkg.scripts ?? {}).join("\n");

const files = readdirSync(here)
  .filter((n) => statSync(join(here, n)).isFile())
  .filter((n) => CODE.has(n.slice(n.lastIndexOf("."))));

/**
 * A file counts as reachable if any package.json script names it, OR if another reachable
 * script imports/spawns it. One hop is enough in practice: helpers are required by the suite
 * that uses them, and a helper of a helper is not a coverage claim on its own.
 *
 * 🔴 COMMENTS ARE STRIPPED FIRST, AND THAT IS A CORRECTNESS FIX, NOT TIDINESS — E-136,
 * found 2026-08-10. This scanned the RAW source, so **merely NAMING a script in prose marked
 * it covered.** A new suite whose header explained *why* `betting-winning-stress-e2e.mjs`
 * could not fail was enough to move that file from `orphaned` to `reachable`, and the gate
 * then demanded its allowlist entry be removed — i.e. it asked to forget a script nothing
 * runs, on the strength of a sentence saying nothing runs it.
 *
 * ⛔ THE DIRECTION OF THE FAILURE IS WHAT MAKES IT SERIOUS. This gate's entire purpose is to
 * stop a suite from LOOKING covered while its guarantee expired silently — the same defect as
 * the compliance card showing a hardcoded green tick for backups that did not exist. A
 * mention-counts-as-coverage rule lets anyone defeat it with a comment, which is the exact
 * shape of the thing being guarded against. It is also the trap `updown-result-announce` and
 * `market-result-announce` both had to learn: **never match on words the code's own
 * documentation will one day contain.**
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");

const namedDirectly = new Set(files.filter((n) => allScripts.includes(n)));
const reachable = new Set(namedDirectly);
for (const entry of namedDirectly) {
  let src = "";
  try { src = stripComments(readFileSync(join(here, entry), "utf8")); } catch { continue; }
  for (const n of files) if (n !== entry && src.includes(n)) reachable.add(n);
}

const orphans = files.filter((n) => !reachable.has(n)).sort();

// Bootstrap, once. It REFUSES to overwrite: re-seeding would let a future session bury newly
// orphaned scripts by regenerating the baseline, which is the one thing this gate exists to
// prevent. Shrinking the list is an edit; growing it is a decision someone has to write down.
if (process.argv.includes("--seed")) {
  if (existsSync(ALLOWLIST)) {
    console.error(
      `\n❌ ${ALLOWLIST} already exists — refusing to re-seed.\n` +
        "   This list may only SHRINK, by adopting or deleting the scripts on it. If you must add\n" +
        "   an entry, edit the file by hand and say why in the commit.\n",
    );
    process.exit(1);
  }
  writeFileSync(
    ALLOWLIST,
    `${JSON.stringify(
      {
        _comment:
          "Scripts knowingly not run by any gate. Under docs/MODULE-CERTIFICATION-PROGRAM.md each " +
          "must be ADOPTED (wired into package.json) or DELETED. This list may only shrink.",
        recordedOn: new Date().toISOString().slice(0, 10),
        orphans,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`\n✅ seeded ${ALLOWLIST} with ${orphans.length} declared orphan(s).\n`);
  process.exit(0);
}

let allow;
try {
  allow = JSON.parse(readFileSync(ALLOWLIST, "utf8"));
} catch {
  console.error(
    `\n❌ cannot read ${ALLOWLIST}.\n` +
      "   Bootstrap it once with: node scripts/orphan-scripts.mjs --seed\n",
  );
  process.exit(1);
}
const declared = new Set(allow.orphans ?? []);
const undeclared = orphans.filter((n) => !declared.has(n));
// An allowlist entry that no longer needs to be there is a small lie of its own.
const staleEntries = [...declared].filter((n) => !orphans.includes(n)).sort();

console.log("─".repeat(70));
console.log("ORPHAN SCRIPTS — every file in scripts/ must be run, or declared unrun");
console.log("─".repeat(70));
console.log(`  files            ${files.length}`);
console.log(`  reachable        ${reachable.size}`);
console.log(`  orphaned         ${orphans.length}`);
console.log(`  declared         ${declared.size}   (allowlist recorded ${allow.recordedOn ?? "?"})`);

if (undeclared.length) {
  console.log(`\n🔴 ${undeclared.length} UNDECLARED orphan(s) — nothing runs these and nothing admits it:\n`);
  for (const n of undeclared) console.log(`     ✗ scripts/${n}`);
  console.log(
    "\n   Either wire it into package.json (preferred — that is what it was written for),\n" +
      "   delete it, or add it to scripts/orphan-allowlist.json with a reason.\n",
  );
}

if (staleEntries.length) {
  console.log(`\n⚠️  ${staleEntries.length} allowlist entr(ies) are no longer orphaned — remove them:\n`);
  for (const n of staleEntries) console.log(`     · scripts/${n}`);
  console.log("");
}

if (undeclared.length || staleEntries.length) {
  console.log("─".repeat(70));
  process.exit(1);
}

console.log(`\n✅ every script is run by a gate, or declared as knowingly unrun.`);
console.log(`   ${declared.size} still to ADOPT or DELETE — this number may only shrink.`);
console.log("─".repeat(70));
