/**
 * RED DRIVE for Millionea's claims lint (MASWALI-BUILD S6, lane N round 17) — `red:maswali-claims`.
 *
 *   npm run red:maswali-claims                    (needs a clean tree for its target — commit first)
 *   npm run red:maswali-claims -- --only "(C3)"   (one mutation, by name prefix)
 *
 * Puts back each defect declared in `scripts/anchors/maswali-claims.anchors.mjs` into the real lint
 * (`src/lib/marketing/millionea-claims.ts`) — a payment by 50pick no longer read by its parties, a tax word anywhere lifting a
 * payout, an account word as a lure, a question no longer joined, a stake beside a prize unread, a third person's wait
 * framing a figure, a look-alike one unread, a Chinese body admitted, a comment that reads as a way out — runs
 * `test:maswali-claims` (its memory twin: no database), and requires it to go red ON THAT MUTATION'S OWN ASSERTION. Then it
 * puts the file back byte for byte.
 *
 * Built as `red-maswali-money-path.mjs` is: a lock file against a concurrent run, a refusal to start when the target differs
 * from git HEAD, temp-file + rename writes, the shared anchor resolver, a green baseline before any mutation, the shared
 * restore guard, and a byte-identical check at the end.
 * ⛔ S6-SHIP 5 (the build lead's ruling of 2026-10-23) · while the untagged rules are off (`MILLIONEA_UNTAGGED_RULES_ON`), a
 *    plant marked `whenRulesOn` in the anchors is HELD — said on an OFF line and counted, never run (its case is held by the
 *    suite too) — and the number held on a full run is pinned (`HELD_WHILE_OFF`).
 * ⛔ Never beside another red drive in the same checkout: it rewrites a live file.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { MUTATIONS } from "./anchors/maswali-claims.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { armRestoreGuard, haltIfStopped, isConsoleStop, requestStop } from "./lib/red-restore-guard.mjs";

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const onlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--only");
const ONLY = onlyArg ? onlyArg.split(",").map((x) => x.trim()).filter(Boolean) : [];
const DEFECTS = ONLY.length ? MUTATIONS.filter((d) => ONLY.some((o) => d.name.startsWith(o))) : MUTATIONS;
const SUITE = "npx tsx scripts/maswali-claims.test.mts";
const MEM_ENV = { ...process.env, DATABASE_URL: "", USE_PRISMA_DAL: "false" };
const lf = (s) => s.split(CR + LF).join(LF);
// ⛔ S6-SHIP 5 · THE LEAD'S RULING OF 2026-10-23: the untagged rules are off in this release (`MILLIONEA_UNTAGGED_RULES_ON` in
// millionea-untagged.ts). A plant marked `whenRulesOn` shows nothing at any door while they are off — its case is held by the
// suite (an OFF line) — so it is held here too: said and counted, never run, and the count of held plants is pinned.
const UNTAGGED_FILE = "src/lib/server/marketing/millionea-untagged.ts";
const SWITCH = /export const MILLIONEA_UNTAGGED_RULES_ON: boolean = (true|false);/.exec(readFileSync(UNTAGGED_FILE, "utf8"));
if (SWITCH === null) {
  console.error(`REFUSING TO RUN — the untagged rules' switch (MILLIONEA_UNTAGGED_RULES_ON) is not found in ${UNTAGGED_FILE}.`);
  process.exit(1);
}
const RULES_ON = SWITCH[1] === "true";
/** The plants marked `whenRulesOn` in the anchors — held, all of them, on a full run while the rules are off. */
const HELD_WHILE_OFF = 6;

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};
const run = () => {
  try {
    const out = execSync(SUITE, { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: MEM_ENV, timeout: 10 * 60_000 });
    return { red: false, output: out };
  } catch (e) {
    if (isConsoleStop(e)) requestStop("the child exited with STATUS_CONTROL_C_EXIT — a console stop (Ctrl-C / Ctrl-Break) reached this drive");
    return { red: true, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

const LOCK = "scripts/.red-maswali-claims.lock";
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another drive of this red is in flight. If none is, delete it.`);
  process.exit(1);
}
if (DEFECTS.length === 0) {
  console.error("REFUSING TO RUN — no mutation matches --only.");
  process.exit(1);
}
const files = [...new Set(DEFECTS.map((d) => d.file))];
for (const f of files) {
  const head = execSync(`git show HEAD:${f}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (lf(head) !== lf(readFileSync(f, "utf8"))) {
    console.error(`REFUSING TO RUN — ${f} differs from git HEAD. Commit first.`);
    process.exit(1);
  }
}
writeFileSync(LOCK, `${process.pid} ${new Date().toISOString()}${LF}`);
const releaseLock = () => { try { unlinkSync(LOCK); } catch { /* already gone */ } };
process.on("exit", releaseLock);

const original = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const shaBefore = new Map(files.map((f) => [f, sha(f)]));
armRestoreGuard({ original, write, releaseLock, label: "maswali-claims RED" });

// ⭐ The suite must be GREEN first — a red baseline would make every mutation look caught.
const base = run();
haltIfStopped("maswali-claims RED");
if (base.red) {
  const fails = base.output.split(LF).filter((l) => l.trimStart().startsWith("FAIL")).slice(0, 10);
  console.error(`REFUSING TO RUN — test:maswali-claims is RED before any mutation:${LF}${fails.join(LF) || base.output.slice(-2000)}`);
  process.exit(1);
}
console.log("baseline green · maswali-claims");

let caught = 0, missed = 0, held = 0;
for (const d of DEFECTS) {
  if (d.whenRulesOn === true && !RULES_ON) {
    held++;
    console.log(`OFF ${d.name} — held: the untagged rules are off (the lead's ruling of 2026-10-23), so no door can show it`);
    continue;
  }
  const src = original.get(d.file);
  let mutated;
  try {
    mutated = injectDefect(src, d.from, d.to);
  } catch (err) {
    console.log(`STALE ${d.name} — ${err.message}; the harness is measuring nothing`);
    missed++;
    continue;
  }
  write(d.file, mutated);
  let result;
  try {
    result = run();
  } finally {
    write(d.file, src);
  }
  haltIfStopped("maswali-claims RED");
  const fails = result.output.split(LF).filter((l) => l.trimStart().startsWith("FAIL"));
  const own = fails.find((l) => l.includes(d.expect));
  if (result.red && own) { caught++; console.log(`CAUGHT ${d.name}${LF}        ↳ ${own.trim().slice(0, 220)}`); }
  else if (result.red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.expect}"${LF}        ↳ ${(fails[0] ?? result.output.split(LF).slice(-3).join(" ")).trim().slice(0, 220)}`); }
  else { missed++; console.log(`MISSED ${d.name} — test:maswali-claims stayed GREEN with this defect injected`); }
}

let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
const heldPinned = ONLY.length > 0 || (RULES_ON ? held === 0 : held === HELD_WHILE_OFF);
if (!heldPinned) console.log(`HELD-COUNT ${held} plants held while the untagged rules are off, against the ${HELD_WHILE_OFF} marked whenRulesOn — read the anchors, then move the pin`);
console.log(`${LF}maswali-claims RED: ${caught}/${DEFECTS.length - held} caught, ${missed} missed, ${held} held while the untagged rules are off, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0 || caught !== DEFECTS.length - held || !heldPinned) process.exit(1);
