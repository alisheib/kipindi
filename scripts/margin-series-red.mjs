/**
 * `npm run red:margin-series` — prove `test:margin-series` FAILS with A6's defect present.
 *
 * ⛔ WHY THE PLANT IS A ONE-LINE MOVE. The defect was never a wrong formula — the arithmetic
 * is identical either way. It was WHERE the accumulators live: declared outside the bucket
 * loop the series is cumulative and every point is a real margin; declared inside it, each
 * bucket divides that day's settlements by that day's stakes and prints 100% or −1183%.
 * A guard that only checked the formula would have passed in both states, which is why §4
 * asserts the declaration's POSITION and §3 asserts agreement with the KPI tile.
 *
 * ⚠️ The file is restored and re-read byte-for-byte, not assumed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src/lib/server/analytics.ts");
const FINANCE = join(ROOT, "src/app/admin/finance/page.tsx");

let pass = 0;
const fails = [];
const ok = (n, c, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};

// ⚠️ NOT `npx` — execFileSync("npx", …) throws ENOENT on Windows, and a catch that turns
// that into "the suite failed" is how a harness reports a red it never saw.
const runGuard = () => {
  try {
    execFileSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"),
      join(ROOT, "scripts/margin-series.test.mts")], { cwd: ROOT, stdio: "pipe" });
    return 0;
  } catch (e) { return e.status ?? -1; }
};

console.log("\nred:margin-series — the guard must FAIL when the per-bucket defect returns\n");

ok("CONTROL — the guard is GREEN on the unmodified tree", runGuard() === 0);

const PLANTS = [
  {
    name: "the accumulators move INSIDE the bucket loop (A6, exactly)",
    file: SRC,
    from: `  let stakes = 0;
  let payouts = 0;
  let refunds = 0;
  for (let i = 0; i < buckets; i++) {
    const bucketStart = start + i * bucketMs;`,
    to: `  for (let i = 0; i < buckets; i++) {
    let stakes = 0;
    let payouts = 0;
    let refunds = 0;
    const bucketStart = start + i * bucketMs;`,
  },
  {
    name: "the card re-advertises the 7–10% band it cannot honour",
    file: FINANCE,
    from: `sw="Faida ya mfumo · cumulative to date · 28-day window"`,
    to: `sw="Faida ya mfumo · 28-day · band 7–10%"`,
  },
];

// ⚠️ CRLF. These files are checked out with Windows line endings, so a plant written with
// `\n` finds nothing and the harness reports "plant not located" — which reads as a missing
// anchor when it is really an encoding mismatch. Normalise both sides before matching, and
// re-apply the file's own ending when writing.
const eol = (s, crlf) => (crlf ? s.replace(/\r?\n/g, "\r\n") : s.replace(/\r\n/g, "\n"));

for (const p of PLANTS) {
  const original = readFileSync(p.file, "utf8");
  const crlf = original.includes("\r\n");
  const from = eol(p.from, crlf);
  const to = eol(p.to, crlf);
  if (!ok(`plant located: ${p.name}`, original.includes(from))) continue;
  writeFileSync(p.file, original.replace(from, to));
  const code = runGuard();
  ok(`RED: ${p.name} → guard exits non-zero`, code !== 0, `exit=${code}`);
  writeFileSync(p.file, original);
  ok(`restored byte-identical after: ${p.name}`, readFileSync(p.file, "utf8") === original);
}

ok("CONTROL — the guard is GREEN again after every restore", runGuard() === 0);

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
