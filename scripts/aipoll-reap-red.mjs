/**
 * E-60 · RED HARNESS — reintroduce the defect and prove the guard fires.
 *
 *   node scripts/aipoll-reap-red.mjs
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies,
 * and the harness reports "defect not caught" as guard weakness. Every mutation matches
 * both line endings AND re-reads the file to confirm the anchor is gone from disk.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SRC = new URL("../src/lib/server/ai-poll-generation.ts", import.meta.url);
const LIFE = new URL("../src/lib/server/lifecycle.ts", import.meta.url);
const originals = new Map([[SRC, readFileSync(SRC, "utf8")], [LIFE, readFileSync(LIFE, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const MUTATIONS = [
  {
    name: "reaper-is-never-called",
    why: "the import stays, the call goes — a reaper nothing invokes reaps nothing, and the suite must not pass on the symbol alone",
    file: LIFE,
    from: "    await reapStuckGenerations().catch((e) => console.error(\"[lifecycle] aipoll reap:\", e));",
    to: "    // await reapStuckGenerations() — removed",
  },
  {
    name: "reaper-kills-live-generations",
    why: "the age check goes, so a generation started one second ago is killed as abandoned",
    file: SRC,
    from: "      if (Date.parse(p.createdAt) > cutoff) continue;     // still plausibly alive",
    to: "      // age check removed",
  },
  {
    name: "reaper-touches-any-state",
    why: "it stops scoping to GENERATING and can retire an officer's PENDING_REVIEW or a PUBLISHED poll",
    file: SRC,
    from: '      if (p.state !== "GENERATING") continue;',
    to: "      // state check removed",
  },
  {
    name: "cutoff-set-below-a-real-generation",
    why: "10 minutes becomes 1, which is inside the range a healthy generation genuinely takes",
    file: SRC,
    from: "export const STUCK_GENERATION_MINUTES = 10;",
    to: "export const STUCK_GENERATION_MINUTES = 1;",
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

  writeFileSync(m.file, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  let failed = false;
  try { execSync("npx tsx scripts/aipoll-reap.test.mts", { cwd: new URL("..", import.meta.url), stdio: "pipe" }); }
  catch { failed = true; }

  if (failed) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
