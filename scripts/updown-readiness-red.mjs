/**
 * RED harness for `npm run test:updown-readiness` and `npm run test:updown-durations`.
 *
 *   node scripts/updown-readiness-red.mjs
 *
 * ⛔ THE TWO THAT MATTER: removing gold's measured minimum (which puts gold back on 3–5 minute
 * rounds decided by feed representation rather than by the market), and admitting a duration
 * that does not divide the day (whose boundaries drift across midnight so no two chains can
 * ever share a reading).
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings; results read from each
 * suite's OWN summary line; MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * ⭐ THE MUTATIONS ARE DECLARED AS DATA, NEXT DOOR, AND IMPORTED HERE.
 *
 * ⛔ They used to be a literal in this file, which meant `npm run test:red-anchors` could only
 * learn them by parsing this source and guessing which array was the mutations and which key
 * was the anchor — a guess that FAILS OPEN, reporting a harness it did not understand as clean.
 * One definition, two readers: this harness injects them, the auditor resolves them, and
 * adding a mutation adds it to the audit in the same keystroke.
 */
import { MUTATIONS } from "./anchors/updown-readiness.anchors.mjs";

/** Repo-relative POSIX paths from the declaration → the URLs this harness writes through. */
const urlOf = (rel) => new URL("../" + rel, import.meta.url);

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const file = urlOf(m.file);
  const original = readFileSync(file, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(file, original.replace(from, to));
  try {
    if (readFileSync(file, "utf8") === original) throw new Error("mutation did not land on disk");
    const script = m.suite === "updown-durations" ? "updown-durations.test.mts"
      : m.suite === "updown-admin-options" ? "updown-admin-options.test.mts"
      : "updown-readiness.test.mts";
    let exitCode = 0, out = "";
    try {
      out = execSync(`npx tsx scripts/${script}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    // Each suite prints its own summary; anchor on that, never on the bare words `N failed`.
    const re = m.suite === "updown-durations"
      ? /durations — \d+ passed, (\d+) failed/
      : m.suite === "updown-admin-options"
        ? /updown-admin-options: \d+ passed, (\d+) failed/
        : /updown-readiness: \d+ passed, (\d+) failed/;
    const failed = Number(re.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/(?:FAIL |  · )(.+)/.exec(out)?.[1] ?? "").slice(0, 82)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(file, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
