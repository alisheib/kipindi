/**
 * RED DRIVE for `test:kyc-copy-truth` — plant a false identity sentence in real player copy, prove the guard
 * names it on its OWN assertion, and take it back out.   `npm run red:kyc-copy-truth`
 *
 * ⭐ WHY THIS FILE EXISTS. A copy guard is nothing but negative assertions — "no string says X" — and a
 * negative assertion passes for free the day its population empties or its pattern goes blind. That is not
 * hypothetical here: the 2026-09-07 walker read four of eight legal files and reported green on all of them.
 * Each case in `anchors/kyc-copy-truth.anchors.mjs` writes one false sentence into a file the guard claims to
 * read, runs the suite, and requires a FAIL line naming that file, that locale and that rule.
 *
 * ⛔ ONE RULE IS DELIBERATELY NOT COPIED FROM `kyc-gate-red.mjs`: refusing to start when a target differs from
 * git HEAD. Two of this fleet's four targets are the dictionary and the legal pages — the files several
 * sessions edit at once — so that refusal would make this harness unrunnable on almost any working day, and a
 * RED control nobody can run is the failure `red:all` exists to prevent. The three dangers that refusal
 * guarded against are each closed directly instead:
 *
 *   · A POISONED BASELINE (a crashed run's injection left on disk and then "restored" as if it were the
 *     original): every case's false sentence must be ABSENT before the first injection, and the unmutated
 *     suite must be GREEN — each of these sentences turns that suite red, so a green baseline proves none of
 *     them is present.
 *   · TWO RUNS AT ONCE: a lock file, as in the rest of the fleet.
 *   · A PARALLEL SESSION'S EDIT OVERWRITTEN BY THE RESTORE: the restore takes OUR sentence out of whatever is
 *     on disk rather than writing a snapshot back. If the file changed while the suite ran, their version is
 *     kept, our sentence is removed from it, and the run exits 1 so a person looks.
 *
 * ⚠️ WRITES ARE TEMP-FILE + RENAME, and a crash mid-case still restores: the `exit` handler takes the in-flight
 * sentence back out before the lock is released (a plain `writeFileSync` was once interrupted into 34,466 NUL
 * bytes on this platform — campaign E-173).
 * ⚠️ WHILE A CASE RUNS, THE SENTENCE IS REALLY ON DISK — for one suite run, a few seconds. Another process
 * reading that file in that window sees it. Do not run this beside a dev server or a suite that asserts the
 * same copy.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
// ⛔ THE MUTATIONS LIVE IN A SIDECAR, so `test:red-anchors` §3 re-resolves every one without running this.
import { MUTATIONS as DEFECTS } from "./anchors/kyc-copy-truth.anchors.mjs";
// ⛔ THE SAME RESOLVER `test:red-anchors` §3 AUDITS WITH — never a second implementation.
import { injectDefect, resolveAnchor, eolOf, toEol } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SUITE = "npx tsx scripts/kyc-copy-truth.test.mts";
const abs = (rel) => join(ROOT, rel);
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const planted = (src, d) => src.includes(toEol(d.to, eolOf(src)));

/** Temp-file + rename + read-back, retried: an editor or indexer holding the file makes the rename EPERM. */
function write(p, s) {
  let last;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const tmp = `${p}.red-tmp`;
      writeFileSync(tmp, s);
      renameSync(tmp, p);
      if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
      return;
    } catch (err) {
      last = err;
      pause(250);
    }
  }
  throw last;
}

/** Take THIS case's sentence back out of whatever is on disk now. */
function undo(d, original, mutated) {
  const p = abs(d.file);
  const disk = readFileSync(p, "utf8");
  if (disk === original) return "restored";
  if (disk === mutated) { write(p, original); return "restored"; }
  // Somebody else wrote this file while the suite ran: keep THEIR version, remove only OUR sentence.
  const back = resolveAnchor(disk, d.to);
  if (!back.ok) return `NOT RESTORED — ${back.reason}; remove this by hand: ${d.to}`;
  write(p, disk.replace(back.needle, toEol(d.from, back.eol)));
  return "concurrent edit kept, planted sentence removed";
}

const LOCK = join(ROOT, "scripts", ".kyc-copy-truth-red.lock");
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another red drive is in flight. If none is, delete it and re-run.`);
  process.exit(1);
}

const files = [...new Set(DEFECTS.map((d) => d.file))];
const original = new Map(files.map((f) => [f, readFileSync(abs(f), "utf8")]));
const shaBefore = new Map(files.map((f) => [f, sha(abs(f))]));

// ⛔ A POISONED BASELINE IS REFUSED — see the header.
for (const d of DEFECTS) {
  if (planted(original.get(d.file), d)) {
    console.error(`REFUSING TO RUN — ${d.file} already holds the "${d.name}" sentence. A previous run left it behind: ` +
      `remove it by hand (it is the case's \`to\` text in anchors/kyc-copy-truth.anchors.mjs) and re-run.`);
    process.exit(1);
  }
}
for (const f of files) {
  try {
    const head = execSync(`git show HEAD:${f}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
    if (head.replace(/\r\n/g, "\n") !== original.get(f).replace(/\r\n/g, "\n")) {
      console.log(`NOTE ${f} has uncommitted edits — the baseline is the working tree, proven clean by the checks above and the green suite below`);
    }
  } catch { console.log(`NOTE ${f} is not readable at git HEAD — the baseline is the working tree`); }
}

writeFileSync(LOCK, `${process.pid} ${new Date().toISOString()}\n`);
let inFlight = null;
process.on("exit", () => {
  if (inFlight) {
    const f = inFlight;
    inFlight = null;
    try { console.error(`INTERRUPTED during ${f.d.name} — ${f.d.file}: ${undo(f.d, f.original, f.mutated)}`); }
    catch (err) { console.error(`INTERRUPTED during ${f.d.name} — ${f.d.file} NOT RESTORED (${err.message}); remove this by hand: ${f.d.to}`); }
  }
  try { unlinkSync(LOCK); } catch { /* already gone */ }
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(130));
process.on("uncaughtException", (err) => { console.error(err); process.exit(1); });

function runSuite() {
  try {
    // ⚠️ `maxBuffer` IS LOAD-BEARING — the suite prints a line per assertion, several hundred of them.
    execSync(SUITE, { cwd: ROOT, stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 180_000 });
    return { red: false, output: "" };
  } catch (e) {
    const timedOut = e.code === "ETIMEDOUT" || e.signal === "SIGTERM";
    return { red: true, output: `${e.stdout ?? ""}${e.stderr ?? ""}${timedOut ? "\n(suite TIMED OUT)" : ""}` };
  }
}

// ⭐ THE UNMUTATED SUITE MUST BE GREEN FIRST — a check already failing at baseline would make the case that names
// it print CAUGHT for a sentence nobody planted.
{
  const base = runSuite();
  if (base.red) {
    const fails = base.output.split("\n").filter((l) => l.startsWith("FAIL"));
    console.error(`REFUSING TO RUN — the suite is RED before any mutation:\n${fails.join("\n") || base.output.slice(-2000)}`);
    process.exit(1);
  }
}

let caught = 0, missed = 0;
const concurrent = new Set();
for (const d of DEFECTS) {
  const src = original.get(d.file);
  let mutated;
  try {
    mutated = injectDefect(src, d.from, d.to);
  } catch (err) {
    // ⛔ AN ANCHOR THAT NO LONGER RESOLVES IS A FAILURE, NOT A SKIP.
    console.log(`STALE ${d.name} — ${err.message}; the harness is measuring nothing`);
    missed++;
    continue;
  }
  inFlight = { d, original: src, mutated };
  write(abs(d.file), mutated);
  const { red, output } = runSuite();
  const outcome = undo(d, src, mutated);
  inFlight = null;
  if (outcome !== "restored") { concurrent.add(d.file); console.log(`CONCURRENT ${d.file} — ${outcome}`); }

  const fails = output.split("\n").filter((l) => l.startsWith("FAIL"));
  // ⛔ CAUGHT ON ITS *OWN* ASSERTION — the named file × locale × rule — not merely caught.
  const own = fails.find((l) => l.includes(d.check));
  if (red && own) {
    caught++;
    console.log(`CAUGHT ${d.name}\n        ↳ ${own.trim().slice(0, 260)}`);
  } else if (red) {
    missed++;
    console.log(`WRONG-ASSERTION ${d.name} — suite went red, but NOT on "${d.check}"\n        ↳ ${(fails[0] ?? output.split("\n").slice(-3).join(" ")).trim().slice(0, 260)}`);
  } else {
    missed++;
    console.log(`MISSED ${d.name} — the suite stayed GREEN with this sentence planted`);
  }
}

// ⛔ THE TREE MUST COME BACK. Two measurements: no planted sentence is left anywhere, and every file untouched by
// a concurrent edit is byte-identical to how this run found it.
let dirty = 0;
for (const d of DEFECTS) {
  if (planted(readFileSync(abs(d.file), "utf8"), d)) { dirty++; console.log(`DIRTY ${d.file} — the "${d.name}" sentence is still on disk`); }
}
for (const [f, before] of shaBefore) {
  if (!concurrent.has(f) && sha(abs(f)) !== before) { dirty++; console.log(`DIRTY ${f} — NOT restored byte-identically`); }
  try { unlinkSync(`${abs(f)}.red-tmp`); } catch { /* already gone */ }
}
console.log(`\nkyc-copy-truth RED: ${caught} caught, ${missed} missed, ${dirty} files left dirty, ${concurrent.size} concurrent edit(s)`);
if (missed > 0 || dirty > 0 || concurrent.size > 0) process.exit(1);
