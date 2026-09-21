/**
 * RELEASE GATE · the migration folders on this branch against the ones on the ref it will merge into.
 *
 *   npm run ops:release-migration-parity                       # HEAD against origin/main
 *   npm run ops:release-migration-parity -- --ref <ref>        # against another ref
 *   npm run ops:release-migration-parity -- --ref <a> --head <b>
 *
 * ⛔ WHY THIS EXISTS: IT REPLACES A RELEASE CONDITION THAT WENT OBSOLETE WITHOUT GOING RED.
 * REL-0's condition (c) reads `git diff origin/main...house-bots --stat -- prisma/migrations` shows
 * exactly the 2 house folders. It was written when the house DDL was unmerged. Ali pushed the branch
 * himself on 2026-09-18, so both folders are in the MERGE BASE, and a three-dot diff only ever shows
 * what the merge base lacks: the true value is permanently **0**, and can never again be 2. Nothing
 * executed that row — it is a checkbox — so the live risk was never a red gate, it was an officer
 * ticking a box whose sentence no longer described anything. ⛔ It is REWRITTEN here, not deleted, and
 * not waved through: 0 is now the CORRECT reading, and this script is what says so out loud and then
 * checks the three things that DO still decide whether a deploy boots.
 *
 * ── WHAT ACTUALLY MATTERS NOW, AND WHY EACH ONE IS A RELEASE-STOPPER ──────────────────────────
 * `package.json`'s `start` is `prisma migrate deploy && … && next start`, on BOTH refs. So:
 *
 *  1 · PARITY of every migration folder both refs carry. `migrate deploy` compares each applied
 *      migration's recorded checksum against the file it finds. One edited byte in an ALREADY APPLIED
 *      migration — a tidied comment, a CRLF round-trip through an editor — makes the deploy fail
 *      before `next start` is ever reached. That is not a bad release: it is the container refusing to
 *      boot, which on this platform is a sign-in outage for every player. ⚠️ An EOL-only difference is
 *      still a stopper, and it is reported as EOL-only because the fix is a different one.
 *  2 · FORWARD difference — folders on this branch that the ref does not have. These are DDL that
 *      applies the moment the new container starts. Zero is the expected reading today; anything else
 *      must be named in Ali's REL-0 "go", because it is the migration exception REL-2 describes.
 *  3 · REVERSE difference — folders on the ref that this branch does not have. The branch is behind;
 *      merging is the fix. Deploying it would hand production a `migrate deploy` whose history is
 *      missing a row the database already records.
 *
 * ⛔ IT IS NOT A `test:` KEY AND MUST NOT BECOME ONE. It reads a REMOTE-TRACKING ref, whose freshness is
 * a property of the machine and not of the code: on a checkout that has not fetched it would report a
 * stale answer, and in `test:all` it would go red for a reason that has nothing to do with the tree.
 * Release-time facts belong to release-time commands. `scripts/house-bot-migrations.test.mts` states
 * the same rule about migration recency and is where the expand-only PROPERTIES of these two files are
 * asserted; this script asserts only that the two refs agree about their bytes.
 *
 * ⛔ IT WRITES NOTHING, TOUCHES NO DATABASE AND NEVER FETCHES. A gate that quietly `git fetch`ed would
 * change the thing it measures in the act of measuring it, and would need the network in a room where
 * the release checklist is being read aloud. If the ref is not resolvable here, the answer is
 * **NOT MEASURED (exit 3)** and the operator runs `git fetch origin` themselves — never GO.
 *
 * Exit codes: 0 GO · 1 NO-GO · 2 refused (bad arguments) · 3 NOT MEASURED (a ref this checkout cannot resolve).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name: string, fallback: string): string => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) { console.error(`REFUSED — --${name} needs a value.`); process.exit(2); }
  return v;
};
const REF = flag("ref", "origin/main");
const HEAD = flag("head", "HEAD");

const git = (args: string[]): string =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trimEnd();
/** The blob as git stores it — bytes, never a decoded string: the whole question is whether they are equal. */
const blob = (ref: string, path: string): Buffer =>
  execFileSync("git", ["show", `${ref}:${path}`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
/** CRLF → LF at the BYTE level (latin1 round-trips every byte), then sha256 — `house-bot-migrations.test.mts`'s own normaliser. */
const lfSha256 = (buf: Buffer): string =>
  createHash("sha256").update(Buffer.from(buf.toString("latin1").replace(/\r\n/g, "\n"), "latin1")).digest("hex");
const sha256 = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

const resolve = (ref: string): string | null => {
  try { return git(["rev-parse", "--verify", `${ref}^{commit}`]); } catch { return null; }
};
const refSha = resolve(REF), headSha = resolve(HEAD);
if (!refSha || !headSha) {
  console.error(`!! NOT MEASURED — this checkout cannot resolve ${!refSha ? REF : HEAD}.`);
  console.error(`   Run \`git fetch origin\` yourself and re-run. ⛔ This script never fetches: a gate that changed`);
  console.error(`   what it measures while measuring it is not a gate, and NOT MEASURED is never GO.`);
  process.exit(3);
}

/** Every migration folder a ref carries, read out of its tree — never off the working disk, never typed. */
const foldersOf = (ref: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const line of git(["ls-tree", "-r", "--name-only", ref, "--", "prisma/migrations"]).split("\n")) {
    const m = /^prisma\/migrations\/([^/]+)\/migration\.sql$/.exec(line.trim());
    if (m) out.set(m[1], line.trim());
  }
  return out;
};
const mine = foldersOf(HEAD), theirs = foldersOf(REF);
const problems: string[] = [];

console.log(`\n══ release · migration parity ══`);
console.log(`   ${HEAD} ${headSha.slice(0, 8)}   ·   ${REF} ${refSha.slice(0, 8)}`);
console.log(`   migration folders: ${mine.size} on ${HEAD} · ${theirs.size} on ${REF}`);
if (mine.size === 0 || theirs.size === 0) {
  problems.push(`one of the refs carries NO migration folder at all (${mine.size} / ${theirs.size}) — a comparison over an empty population reports nothing, and would otherwise print a clean GO`);
}

// ── 1 · parity, folder by folder ───────────────────────────────────────────────────────────────
const shared = [...mine.keys()].filter((f) => theirs.has(f)).sort();
console.log(`\n1 · parity over the ${shared.length} folder(s) both refs carry`);
let eolOnly = 0, content = 0;
for (const folder of shared) {
  const a = blob(HEAD, mine.get(folder)!), b = blob(REF, theirs.get(folder)!);
  if (sha256(a) === sha256(b)) continue;
  if (lfSha256(a) === lfSha256(b)) {
    eolOnly++;
    problems.push(`${folder}/migration.sql differs between the refs in LINE ENDINGS ONLY — still a stopper: \`migrate deploy\` hashes the bytes it finds, so the applied row's checksum will not match. Fix the EOL round-trip (\`git ls-files --eol\`), do not re-apply and never \`migrate resolve --rolled-back\` a finished row.`);
  } else {
    content++;
    problems.push(`${folder}/migration.sql CONTENT differs between the refs — an ALREADY APPLIED migration was edited. \`prisma migrate deploy\` fails its checksum check, \`next start\` is never reached, and the container does not boot: a platform-wide sign-in outage, not a bad release.`);
  }
}
console.log(`   identical: ${shared.length - eolOnly - content} · line endings only: ${eolOnly} · content: ${content}`);

// ── 2 · forward — DDL this branch would apply on the next container start ──────────────────────
const forward = [...mine.keys()].filter((f) => !theirs.has(f)).sort();
console.log(`\n2 · on ${HEAD} and not on ${REF} … ${forward.length}${forward.length ? `: ${forward.join(", ")}` : ""}`);
if (forward.length) {
  problems.push(`${forward.length} migration folder(s) apply the moment the new container starts: ${forward.join(", ")}. Each must be named in Ali's REL-0 "go" (it is REL-2's migration exception) and carried through the preflight — \`npm run ops:preflight-house-bot-migrations\` — before the deploy, never discovered by it.`);
}
// ⭐ THE OBSOLETE CONDITION, ANSWERED IN THE WORDS IT WAS WRITTEN IN, so that an officer reading the old
// checklist row against this output is not left to reconcile two numbers on their own.
const houseFolders = [...mine.keys()].filter((f) => /_house_bot_(?:tables|markers)$/.test(f)).sort();
const houseForward = houseFolders.filter((f) => forward.includes(f));
console.log(`\n   ⚠️ REL-0(c) as originally written — "the migrations diff shows exactly the 2 house folders" — reads ${houseForward.length} here, and ${houseForward.length === 0 ? "0 IS NOW THE CORRECT ANSWER" : "that is a change"}:`);
console.log(`      the two house folders (${houseFolders.join(", ") || "none found"}) are ${houseForward.length === 0 ? `already on ${REF}` : `NOT yet on ${REF}`}.`);
if (houseFolders.length !== 2) {
  problems.push(`expected exactly 2 house migration folders on ${HEAD}, found ${houseFolders.length} (${houseFolders.join(", ") || "none"}) — the release documents, this script and the preflight are all written for two, and a split or renamed folder must be read before it is deployed`);
}
for (const f of houseFolders) {
  if (!theirs.has(f)) problems.push(`${f} is on ${HEAD} but not on ${REF} — the house DDL has NOT merged, so REL-0(c)'s original reading applies after all and REL-2 must be re-instated rather than struck for this release`);
}

// ── 3 · reverse — the branch is behind ─────────────────────────────────────────────────────────
const reverse = [...theirs.keys()].filter((f) => !mine.has(f)).sort();
console.log(`\n3 · on ${REF} and not on ${HEAD} … ${reverse.length}${reverse.length ? `: ${reverse.join(", ")}` : ""}`);
if (reverse.length) {
  problems.push(`${reverse.length} migration folder(s) are on ${REF} and missing here: ${reverse.join(", ")}. The branch is BEHIND — merge ${REF} before the release. Deploying this tree would hand production a migration history missing a row its database already records.`);
}

// ── 4 · the verdict ────────────────────────────────────────────────────────────────────────────
console.log("");
if (problems.length) {
  console.error(`🔴 NO-GO — ${problems.length} finding(s):`);
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
console.log(`✅ GO — every folder both refs carry is byte-identical, nothing new applies on start, and nothing is missing.`);
console.log(`   Record this output at REL-0 with both SHAs above; a recorded verdict rots, so re-run it on the release SHA.`);
