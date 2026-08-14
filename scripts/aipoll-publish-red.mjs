/**
 * D1 · RED HARNESS — put the outage back, one mutation at a time, and prove the guard
 * fires on each. `node scripts/aipoll-publish-red.mjs`
 *
 * The first mutation is the production defect VERBATIM: score the officer's poll through
 * the autopilot gate, discard `approveCandidate`'s return, and let `createMarket` run.
 * That is the code that put three LIVE markets on the board — one with TZS 15,000 in it —
 * while telling the officer the publish had failed.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies,
 * and the harness reports "defect not caught" as guard weakness. Every mutation matches
 * both line endings AND re-reads the file to confirm the anchor is gone from disk.
 *
 * ⚠️ A refusal check needs a POSITIVE CONTROL in the same run, or fixing the defect turns
 * the check red and nobody can tell the two apart. The unmutated suite is run FIRST and
 * must be GREEN; if it is not, this harness reports a broken instrument, not a caught bug.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PUB = new URL("../src/lib/server/ai-poll-publish.ts", import.meta.url);
const CAND = new URL("../src/lib/server/market-candidate.ts", import.meta.url);
const originals = new Map([[PUB, readFileSync(PUB, "utf8")], [CAND, readFileSync(CAND, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const SUITE = "npx tsx scripts/aipoll-publish.test.mts";
const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync(SUITE, { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

// ── POSITIVE CONTROL ────────────────────────────────────────────────────────
restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  Nothing below can be trusted: a red-on-mutation result would be");
  console.error("  indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "the-production-defect-verbatim",
    why: "the officer's approval stops overruling the autopilot gate, so a poll scoring 52 is FILTERED_OUT, approveCandidate returns null and the market goes live anyway — three times on prod, one with TZS 15,000 in it",
    file: PUB,
    from: "      rubric: { aiPollQuality: poll.overallQuality },\n      humanApproved: true,\n    });",
    to: "      rubric: { aiPollQuality: poll.overallQuality },\n    });",
  },
  {
    name: "approve-return-discarded",
    why: "the return value of approveCandidate goes unchecked again — the single line whose absence let an irreversible createMarket run off a rejected candidate",
    file: PUB,
    from: "    if (!approved) return pipelineAbort(\"approveCandidate\", candidate.id, poll, officerId);",
    to: "    // return value discarded",
  },
  {
    name: "score-return-discarded",
    why: "a scoring step that refused is treated as if it had passed",
    file: PUB,
    from: "    if (!scored) return pipelineAbort(\"scoreCandidate\", candidate.id, poll, officerId);",
    to: "    // return value discarded",
  },
  {
    name: "confidence-gate-deleted-entirely",
    why: "⭐ THE OPPOSITE MISTAKE. 'Stop the false alarm' and 'delete the confidence gate' are not the same fix — with the gate gone the UNATTENDED pipeline would promote a candidate scoring 52, and the suite must refuse that just as loudly",
    file: CAND,
    from: "  if (belowThreshold && !opts.humanApproved) {",
    to: "  if (false) {",
  },
  {
    name: "waiver-not-recorded-in-the-trace",
    why: "the override stops being visible in the candidate's own record, so an officer reading it months later cannot tell a waived gate from a passing score",
    file: CAND,
    from: "      ? `scored:${c.confidence}:human_approved:${JSON.stringify(opts.rubric)}`",
    to: "      ? `scored:${c.confidence}:${JSON.stringify(opts.rubric)}`",
  },
  {
    name: "createMarket-moved-ahead-of-the-checks",
    why: "the irreversible act happens before the pipeline is known to be sound — the exact ordering that made a failed publish leave a live market behind",
    file: PUB,
    from: "    if (!filtered) return pipelineAbort(\"filterCandidate\", candidate.id, poll, officerId);",
    to: "    if (!filtered) { /* checked after createMarket */ }",
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  const replacement = anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to;
  writeFileSync(m.file, src.replace(anchor, replacement));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
