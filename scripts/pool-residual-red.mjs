/**
 * RED proof for `pool-residual.test.mts`.
 *
 * Reverts the fee-allocation fix and requires the guard to catch it — on the SPECIFIC
 * check each mutation targets. Restores both files byte-for-byte and re-verifies green.
 *
 * ⛔ This one matters more than most. The defect it guards was GREEN under
 * test:trial-balance, test:money-invariants, test:ledger and test:payout-alloc
 * simultaneously, because the overall ledger still summed to zero — the error hid inside
 * a self-cancelling POOL/COMMISSION pair. A guard for a defect that four money suites
 * could not see is worthless unless it has been watched to fail.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITE = join(HERE, "pool-residual.test.mts");
const TSX = join(HERE, "..", "node_modules", "tsx", "dist", "cli.mjs");
const LEDGER = join(HERE, "..", "src", "lib", "server", "ledger.ts");
const SERVICE = join(HERE, "..", "src", "lib", "server", "market-service.ts");

const originals = new Map([[LEDGER, readFileSync(LEDGER, "utf8")], [SERVICE, readFileSync(SERVICE, "utf8")]]);
const eolOf = (s) => (s.includes("\r\n") ? "\r\n" : "\n");
const toEol = (s, eol) => s.replace(/\r?\n/g, eol);

// `npx` is `npx.cmd` on Windows and execFileSync cannot spawn it without a shell —
// the ENOENT would masquerade as "the suite failed". Run tsx through node directly.
const run = () => {
  try {
    return { code: 0, out: execFileSync(process.execPath, [TSX, SUITE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) { return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
};

const MUTATIONS = [
  {
    name: "the ledger derives each winner's commission independently again (THE BUG)",
    file: LEDGER,
    breaks: "production shape · the pool gives up exactly what it holds",
    from: `  const commAmt = opts.commissionAmount != null
    ? Math.max(0, Math.round(opts.commissionAmount))
    : Math.max(0, Math.round(share * opts.fee));`,
    to: `  const commAmt = Math.max(0, Math.round(share * opts.fee));`,
  },
  {
    name: "settlement stops passing the pre-allocated share",
    file: SERVICE,
    breaks: "the allocated share reaches the ledger",
    from: `            commissionAmount: feeByPos.get(p.id) ?? 0,\n`,
    to: "",
  },
];

let caught = 0, missed = 0;
console.log("RED proof — pool residual\n");

const baseline = run();
if (baseline.code !== 0) {
  console.log("⛔ ABORT: the suite is already RED before any mutation.");
  console.log(baseline.out.slice(-1200));
  process.exit(1);
}
console.log("  baseline: GREEN\n");

for (const m of MUTATIONS) {
  const original = originals.get(m.file);
  const eol = eolOf(original);
  const from = toEol(m.from, eol);
  if (!original.includes(from)) {
    console.log(`  ⛔ ANCHOR MISSING — ${m.name}`);
    missed++;
    continue;
  }
  writeFileSync(m.file, original.replace(from, toEol(m.to, eol)), "utf8");
  const r = run();
  writeFileSync(m.file, original, "utf8");

  if (r.code !== 0 && r.out.includes(`FAIL ${m.breaks}`)) { console.log(`  ✔ CAUGHT  ${m.name}`); caught++; }
  else if (r.code !== 0) { console.log(`  ⚠️ CAUGHT BY THE WRONG CHECK — ${m.name}\n     expected "FAIL ${m.breaks}"`); missed++; }
  else { console.log(`  ⛔ MISS    ${m.name} — the guard did not notice`); missed++; }
}

let restored = true;
for (const [f, orig] of originals) if (readFileSync(f, "utf8") !== orig) restored = false;
console.log(`\n  files restored byte-for-byte: ${restored ? "yes" : "🔴 NO"}`);
const final = run();
console.log(`  suite green again: ${final.code === 0 ? "yes" : "🔴 NO"}`);
console.log(`\n  ${caught}/${MUTATIONS.length} mutations caught, ${missed} missed`);
process.exit(missed === 0 && restored && final.code === 0 ? 0 : 1);
