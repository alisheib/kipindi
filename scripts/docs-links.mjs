/**
 * `npm run test:docs` — every reference in docs/ must point at something real.
 *
 * WHY THIS EXISTS. This repo's documentation is load-bearing: the runbooks name the exact
 * command to run during a recovery or a payout outage. A doc that names a script which no
 * longer exists is worse than no doc, because it is read under pressure. The 2026-07-30
 * cleanup commit claimed "zero dead links" — true when written, and nothing kept it true.
 * One edit later, a runbook already pointed at a throwaway path in a temp directory.
 *
 * Checks three things:
 *   · relative markdown links resolve on disk
 *   · every `scripts/<file>.<ext>` mentioned exists
 *   · every `npm run <name>` is a real package.json script
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DOCS = join(ROOT, "docs");
const scripts = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts ?? {}));

/**
 * A doc may legitimately name a file that no longer exists — recording that something was
 * DELETED is the point of the sentence. Only lines that frame it that way are exempt.
 *
 * 🔴 THIS GATE WAS RED ON `agent-affiliate-programme` AND NOBODY HAD NOTICED (found 2026-09-06).
 * `BONUS-WITHDRAWAL.md` §6b records finding #7 — *"Two comments cited `scripts/reenablement.test.mts`,
 * *which has never existed* — I named a guard I had planned and not written"*. Writing that
 * finding down is what turned the gate red: the sentence has to NAME the path to be about it, and
 * the vocabulary below did not admit the phrase it was written in.
 *
 * ⛔ THE DOC IS RIGHT AND THE CHECK IS RIGHT; THE EXEMPTION WAS TOO NARROW. It matched *"does not
 * exist"* but not *"has never existed"* — a different tense of the same statement. That is this
 * repo's oldest recurring shape, one layer up: **an anchor must admit every form the structure
 * legitimately takes** (§0.1a, the four `RESUME AT` drifts). A file that never existed is a
 * stronger case for exemption than one that was deleted, not a weaker one.
 */
const documentsARemoval = (line) =>
  /~~|deleted|removed|no longer exists?|does not exist|never existed|never exists|has never|gone\b/i.test(line);

let bad = 0, links = 0, paths = 0, npms = 0;
const report = (kind, file, ref, line) => {
  console.log(`  ✗ ${kind.padEnd(14)} ${file}:${line}  →  ${ref}`);
  bad++;
};

for (const f of readdirSync(DOCS).filter((n) => n.endsWith(".md"))) {
  const p = join(DOCS, f);
  const lines = readFileSync(p, "utf8").split(/\r?\n/);

  lines.forEach((line, i) => {
    const n = i + 1;
    const exempt = documentsARemoval(line);

    for (const m of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = m[1].split("#")[0].trim();
      if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
      links++;
      if (!existsSync(resolve(dirname(p), target)) && !exempt) report("dead link", f, target, n);
    }

    for (const m of line.matchAll(/\bscripts\/[\w.-]+\.(?:mjs|mts|ts|js|yml)\b/g)) {
      paths++;
      if (!existsSync(join(ROOT, m[0])) && !exempt) report("missing file", f, m[0], n);
    }

    // `npm run x:*` is permission-rule syntax in AGENT-ACCESS.md, not a command — skip it.
    for (const m of line.matchAll(/npm run ([\w:-]+)(\*?)/g)) {
      if (m[2] === "*" || m[1].endsWith(":")) continue;
      npms++;
      if (!scripts.has(m[1]) && !exempt) report("no such script", f, `npm run ${m[1]}`, n);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ EVIDENCE — a cited screenshot that is not on disk is a claim with no backing
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 FOUND 2026-08-05: this gate checked links, script paths and npm scripts, and never once
// looked at the `shots/*.png` the findings register cites as PROOF. **19 of the 26 cited
// screenshots did not exist**, and the gate had been green over them for the whole campaign.
// §0.1 of the campaign says every entry needs evidence — "a screenshot path, a DB row, a log
// line" — so a path to a file nobody kept is precisely the shape of an unbacked claim.
//
// ⚠️ THE 19 ARE A RATCHET, NOT AN EXEMPTION. They are historical: written by sessions whose
// screenshots went to a gitignored directory or to /tmp and were never committed. They cannot
// be recreated — the rounds and players they photographed are gone. So they are listed, by
// name, and the list may only SHRINK:
//   · a NEW dangling reference fails the gate, which is the whole point;
//   · restoring one and leaving it listed ALSO fails, so the list cannot rot.
const MISSING_EVIDENCE = new Set([
  "shots/PJ-2026-08-03/PJ-5-after-bet.png",
  "shots/PJ-2026-08-03/PJ-8-settled-round.png",
  "shots/e18-rq-moderator.png",
  "shots/e1card-delta-sw-360.png",
  "shots/e2-officer-768.png",
  "shots/e47b-cost-line.png",
  "shots/e4p-05-server-refused.png",
  "shots/e4p-06-approved.png",
  "shots/e5v-el-sw-360.png",
  "shots/e6-officer-no-note.png",
  "shots/p2-alpha-player-kyc-430.png",
  "shots/p2-bravo-rejected.png",
  "shots/p2-echo-docs.png",
  "shots/p3-gate-_wallet.png",
  "shots/p3-verify-valid.png",
  "shots/s10-updown-history-1440.png",
  "shots/s11--admin-resolver-queue-1440.png",
  "shots/s11-postbet-modal-360.png",
  "shots/settlement-mkt_54f75a1959cdee5f1ed8.png",
]);

let shots = 0;
const seenEvidence = new Set();
for (const f of readdirSync(DOCS).filter((n) => n.endsWith(".md") || n.endsWith(".html"))) {
  readFileSync(join(DOCS, f), "utf8").split("\n").forEach((line, i) => {
    for (const m of line.matchAll(/\bshots\/[\w./-]+\.png\b/g)) {
      shots++;
      seenEvidence.add(m[0]);
      if (existsSync(join(ROOT, m[0]))) continue;
      if (MISSING_EVIDENCE.has(m[0])) continue;
      report("evidence not on disk", f, m[0], i + 1);
    }
  });
}
// ⛔ The ratchet must not rot: anything listed that IS now present, or that nothing cites any
// more, has to come off the list — otherwise it silently licenses a future dangling path.
for (const p of MISSING_EVIDENCE) {
  if (existsSync(join(ROOT, p))) { bad++; console.log(`  ✗ ${p} EXISTS now — remove it from MISSING_EVIDENCE`); }
  else if (!seenEvidence.has(p)) { bad++; console.log(`  ✗ ${p} is no longer cited — remove it from MISSING_EVIDENCE`); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ BARE SCRIPT CITATIONS — the way this repo actually names its gates
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 FOUND 2026-09-06 (cleanup audit). The `npm run <name>` check above is real and it was
// green — over the WRONG POPULATION. Almost nothing in these docs writes `npm run test:foo`.
// The gate registers, the verification recipes and the findings tables all cite a suite as a
// bare backticked **`test:foo`** / **`red:foo`** / **`qa:foo`** / **`ops:foo`**, and not one of
// those 3,113 citations was ever checked. `DESIGN-BASELINE.md`'s gate register — the table whose
// own caption says it is *"the one place that answers what holds this rule?"* — listed
// `test:invite-coming-soon` · `red:invite-coming-soon` (4/4) for a suite that had been DELETED,
// and this guard passed over it.
//
// ⛔ A REGISTER THAT NAMES A GATE WHICH NO LONGER EXISTS IS THE "gate not in the pipeline"
// DEFECT READ FROM THE OTHER END: the rule looks held, and nothing holds it. Same for a runbook
// step naming a command that cannot be typed — this file's own header says a doc read under
// pressure is worse than no doc.
//
// ⚠️ A doc may legitimately name a script that does not exist, and the shapes are specific
// enough to list rather than pattern-match. Anything NOT listed here must resolve.
const PLANNED_OR_DELIBERATE = new Map([
  // The MASWALI-MILLIONEA programme is SPECIFIED and not yet built (CLAUDE.md: one of the two
  // ongoing programmes). Its implementation doc names the gates it will ship with. Naming a
  // gate you are about to write is a plan; naming one you already deleted is rot.
  ["test:maswali-engine", "planned · MASWALI-BUILD"],
  ["test:maswali-money", "planned · MASWALI-BUILD"],
  ["test:maswali-cap", "planned · MASWALI-BUILD"],
  ["test:maswali-law", "planned · MASWALI-BUILD"],
  ["test:maswali-config", "planned · MASWALI-BUILD"],
  ["test:maswali-fairness", "planned · MASWALI-BUILD"],
  ["test:maswali-reporting", "planned · MASWALI-BUILD"],
  ["test:maswali-adversarial", "planned · MASWALI-BUILD"],
  ["test:maswali-rbac", "planned · MASWALI-BUILD"],
  ["test:maswali-ceremony", "planned · MASWALI-BUILD"],
  ["test:maswali-admissibility", "planned · MASWALI-BUILD"],
  ["test:maswali-i18n", "planned · MASWALI-BUILD"],
  ["test:maswali-ui", "planned · MASWALI-BUILD"],
  ["test:maswali-design", "planned · MASWALI-BUILD"],
  ["test:maswali-notify", "planned · MASWALI-BUILD"],
  ["red:maswali-engine", "planned · MASWALI-BUILD"],
  // An EXIT CRITERION in the certification programme — the gate a module must gain to pass.
  ["test:cert-a2", "planned · MODULE-CERTIFICATION-PROGRAM exit criterion"],
  // A guard named in a design-gate plan and never written. ⚠️ Kept visible rather than quietly
  // deleted: this repo has shipped comments citing guards that never existed, and the honest
  // record of a plan not carried out is more useful than a tidy sentence.
  ["test:copy-enums", "named in a plan, never written — DESIGN-GATE-ADMIN"],
  // Named in the NEGATIVE — the sentence exists to say this name is NOT what we use.
  ["red:refusal", "cited as the name we deliberately do NOT use (red:* means source mutation)"],
  // Hypothetical: "any audit, any `backfill:sw`" — a class of task, not a command.
  ["backfill:sw", "hypothetical — a class of task, not a command"],
  // Struck with its reason by the programme that proposed it.
  ["test:motion-timing", "struck in PLAYER-VISUAL §b2, with its reason"],
  // HISTORY. The defect really did happen under this name, and the lesson is about that suite.
  ["test:invite-coming-soon", "history — retired 2026-09-06, intent ported to withdrawn-features"],
  // Not a script at all: the literal value stored in `roleChangedBy` to mark a QA role change.
  ["qa:live-experience", "a stored marker VALUE, not a command"],
]);

const CITE = /`([a-z]+:[a-z0-9-]+)`/g;
const CITED_PREFIX = /^(test|red|qa|e2e|ops|db|migrate|verify|perf|selcom|backfill|build):/;
let cites = 0;
const seenPlanned = new Set();
for (const f of readdirSync(DOCS).filter((n) => n.endsWith(".md"))) {
  readFileSync(join(DOCS, f), "utf8").split(/\r?\n/).forEach((line, i) => {
    const exempt = documentsARemoval(line);
    for (const m of line.matchAll(CITE)) {
      const name = m[1];
      if (!CITED_PREFIX.test(name)) continue;
      cites++;
      if (scripts.has(name)) continue;
      if (PLANNED_OR_DELIBERATE.has(name)) { seenPlanned.add(name); continue; }
      if (exempt) continue;
      report("no such script", f, name, i + 1);
    }
  });
}
// ⛔ The same two-way ratchet MISSING_EVIDENCE carries, for the same reason: a list that only
// ever grows stops being a record of exceptions and becomes a licence.
for (const [name, why] of PLANNED_OR_DELIBERATE) {
  if (scripts.has(name)) { bad++; console.log(`  ✗ ${name} EXISTS now — remove it from PLANNED_OR_DELIBERATE (${why})`); }
  else if (!seenPlanned.has(name)) { bad++; console.log(`  ✗ ${name} is no longer cited — remove it from PLANNED_OR_DELIBERATE (${why})`); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ EVERY DOC IS IN THE INDEX — the drift CLAUDE.md already complains about
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 THIS HAS NOW HAPPENED TWICE, WITH THE SAME COUNT. `CLAUDE.md`'s START-HERE table records it
// the first time: *"This row used to say '42 docs' and the index itself said 45; the real number
// was 59, and ELEVEN were unindexed."* Measured again on 2026-09-06: **eleven again** — including
// `BONUS-WITHDRAWAL.md`, the authority for withdrawing Invite and the bonus wallet. An authority
// nobody can reach from the index is an authority nobody reads.
//
// ⛔ THE OLD FIX WAS TO STOP STATING A COUNT, which prevents the two numbers disagreeing and does
// nothing about the docs. Only a gate closes this: the index is the map, and a map missing a
// street is wrong in the way that matters. Counting is deliberately NOT how it works — this
// compares the two SETS, so it cannot pass by agreeing with itself.
{
  const indexSrc = readFileSync(join(DOCS, "README.md"), "utf8");
  const onDisk = readdirSync(DOCS).filter((n) => n.endsWith(".md") && n !== "README.md");
  const unindexed = onDisk.filter((n) => !indexSrc.includes(`(${n})`));
  for (const n of unindexed) {
    bad++;
    console.log(`  ✗ ${"not in the index".padEnd(14)} README.md  →  ${n} is on disk and nothing links it`);
  }
  console.log(`\nindex: ${onDisk.length} docs on disk · ${onDisk.length - unindexed.length} linked from README.md`);
}

console.log(`\nchecked ${links} links · ${paths} script paths · ${npms} npm refs · ${cites} bare script citations · ${shots} evidence shots across docs/`);
if (MISSING_EVIDENCE.size) {
  console.log(`⚠️  ${MISSING_EVIDENCE.size} historical screenshot(s) cited but never committed — listed in MISSING_EVIDENCE, and that list may only shrink.`);
}
if (bad) {
  console.log(`\n${bad} broken reference(s). Fix the doc, or say plainly that the thing is gone.\n`);
  process.exit(1);
}
console.log("\n✅ every reference in docs/ resolves.\n");
