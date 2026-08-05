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
 */
const documentsARemoval = (line) =>
  /~~|deleted|removed|no longer exists|does not exist|gone\b/i.test(line);

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

console.log(`\nchecked ${links} links · ${paths} script paths · ${npms} npm refs · ${shots} evidence shots across docs/`);
if (MISSING_EVIDENCE.size) {
  console.log(`⚠️  ${MISSING_EVIDENCE.size} historical screenshot(s) cited but never committed — listed in MISSING_EVIDENCE, and that list may only shrink.`);
}
if (bad) {
  console.log(`\n${bad} broken reference(s). Fix the doc, or say plainly that the thing is gone.\n`);
  process.exit(1);
}
console.log("\n✅ every reference in docs/ resolves.\n");
