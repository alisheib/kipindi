/**
 * RED proof for `test:winnings-tax-ledger` (FEE-TAX-2026-10, R2b). Run alone, on a committed tree.
 *
 *   node scripts/winnings-tax-ledger-red.mjs      (npm run red:winnings-tax-ledger)
 *
 * Plants each defect of `scripts/anchors/winnings-tax-ledger.anchors.mjs` into the REAL source — an entry with
 * `combineInto` together with the entry it names — runs the suite's MEMORY child, and requires it to exit non-zero WITH
 * the planted defect's own assertion failing (`FAIL [memory] <expect>`): a red for another reason is reported as a miss.
 * Then it restores every file byte for byte and re-runs the child green.
 *
 * ⛔ WHY THESE PLANTS: every one leaves each ledger group BALANCED — the tax booked from the player, booked as a levy, left
 * in the pool by the builder or by the settlement, the payout booked gross — so `postLedgerEntries` would accept each and
 * the trial balance alone would see at most one. A guard nobody has watched fail is indistinguishable from one that reads
 * nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/winnings-tax-ledger.anchors.mjs";
import { resolveAnchor, toEol } from "./red-anchor.mjs";

const ROOT = process.cwd();
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const CHILD = "scripts/lib/winnings-tax-ledger-child.mts";
const env = { ...process.env, HB_MONEY_STORE: "memory", DATABASE_URL: "", USE_PRISMA_DAL: "false", EMAIL_OUTBOX_CAPTURE: "1", POSTMARK_API_KEY: "", SMS_PROVIDER: "console" };

const run = () => {
  const r = spawnSync(process.execPath, [TSX, CHILD], { cwd: ROOT, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};
const green = (r) => r.code === 0 && /@@SUMMARY \{"pass":\d+,"fail":0,"store":"memory"\}/.test(r.out);

if (!green(run())) {
  console.error("⛔ REFUSING: the memory child is not green before any mutation — a red below would mean nothing.");
  process.exit(1);
}
console.log("  ✓ control: the unmutated memory child is green\n");

const primaries = MUTATIONS.filter((m) => !m.combineInto);
let caught = 0;
const problems = [];
for (const plant of primaries) {
  const group = [plant, ...MUTATIONS.filter((m) => m.combineInto === plant.name)];
  const originals = new Map();
  for (const m of group) if (!originals.has(m.file)) originals.set(m.file, readFileSync(join(ROOT, m.file), "utf8"));
  try {
    const next = new Map(originals);
    let anchored = true;
    for (const m of group) {
      const src = next.get(m.file);
      const r = resolveAnchor(src, m.from);
      if (!r.ok) { problems.push(`${m.name} — HARNESS ERROR: ${r.reason}`); anchored = false; break; }
      next.set(m.file, src.replace(r.needle, toEol(m.to, r.eol)));
    }
    if (!anchored) continue;
    for (const [f, s] of next) writeFileSync(join(ROOT, f), s, "utf8");
    const red = run();
    if (red.code !== 0 && red.out.includes(`FAIL [memory] ${plant.expect}`)) {
      caught++;
      console.log(`  ✓ RED  ${plant.name}`);
    } else if (red.code !== 0) {
      problems.push(`${plant.name} — red for ANOTHER reason (expected "FAIL [memory] ${plant.expect}")`);
    } else {
      problems.push(`${plant.name} — NOT CAUGHT: the suite stayed green`);
    }
  } finally {
    for (const [f, s] of originals) writeFileSync(join(ROOT, f), s, "utf8");
  }
  for (const [f, s] of originals) if (readFileSync(join(ROOT, f), "utf8") !== s) problems.push(`${f} — NOT byte-restored`);
}

const control = run();
if (!green(control)) problems.push("the restored tree's memory child is not green again");
console.log(`\nwinnings-tax-ledger red: ${caught}/${primaries.length} defects caught; source byte-restored; control ${green(control) ? "green" : "RED"}`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
