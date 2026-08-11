/**
 * `npm run red:admin-charts` — prove `test:admin-charts` FAILS with A4/A5 present.
 *
 * ⛔ EACH PLANT IS THE ORIGINAL LINE, restored verbatim, not an invented mutation. A plant
 * that is merely "something broken" proves the guard reacts to damage; a plant that is the
 * code as it actually shipped proves the guard would have caught the defect on the day.
 *
 * ⚠️ Every file is restored and re-read byte-for-byte.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CHARTS = join(ROOT, "src/components/admin/admin-charts.tsx");

let pass = 0;
const fails = [];
const ok = (n, c, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};

const runGuard = () => {
  try {
    execFileSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"),
      join(ROOT, "scripts/admin-charts.test.mts")], { cwd: ROOT, stdio: "pipe" });
    return 0;
  } catch (e) { return e.status ?? -1; }
};

const eol = (s, crlf) => (crlf ? s.replace(/\r?\n/g, "\r\n") : s.replace(/\r\n/g, "\n"));

const PLANTS = [
  {
    name: "A4 — the y-axis drops its tick step and rounds every label to an integer",
    from: `              {compact(t, range / 4)}`,
    to: `              {compact(t)}`,
  },
  {
    name: "A5 — a zero stacked segment paints 0.5px again",
    from: `              const painted = v === 0 ? 0 : Math.max(0.5, segH);`,
    to: `              const painted = Math.max(0.5, segH);`,
  },
  {
    name: "A5 — a zero bar-list row paints 2% again",
    from: `        const pct = r.value === 0 ? 0 : Math.max(2, (r.value / max) * 100);`,
    to: `        const pct = Math.max(2, (r.value / max) * 100);`,
  },
];

console.log("\nred:admin-charts — the guard must FAIL when a chart invents a mark\n");
ok("CONTROL — the guard is GREEN on the unmodified tree", runGuard() === 0);

for (const p of PLANTS) {
  const original = readFileSync(CHARTS, "utf8");
  const crlf = original.includes("\r\n");
  const from = eol(p.from, crlf), to = eol(p.to, crlf);
  if (!ok(`plant located: ${p.name}`, original.includes(from))) continue;
  writeFileSync(CHARTS, original.replace(from, to));
  const code = runGuard();
  ok(`RED: ${p.name} → guard exits non-zero`, code !== 0, `exit=${code}`);
  writeFileSync(CHARTS, original);
  ok(`restored byte-identical after: ${p.name}`, readFileSync(CHARTS, "utf8") === original);
}

ok("CONTROL — the guard is GREEN again after every restore", runGuard() === 0);

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
