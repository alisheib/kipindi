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
/* ⚠️ The singular `AdminStackedBar` lives in admin-shell.tsx, NOT admin-charts.tsx — which is
   part of why S-04 survived: its plural sibling in this file always had an empty state, so
   "the stacked bar handles empty" was true of the one people read. Plants may name their own
   file; the default stays CHARTS. */
const SHELL = join(ROOT, "src/components/admin/admin-shell.tsx");

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
  {
    /* 🔴 S-04, scan #1 — the singular AdminStackedBar had no empty state at all, so
       /admin/compliance painted three EQUAL bands (including the rose self-exclusion one)
       under "0% continued · 0% break · 0% self-excluded". A distribution where none exists,
       on the compliance console, in the row a regulator's eye goes to. */
    name: "S-04 — the stacked bar paints bands over an empty window again",
    file: SHELL,
    from: `  if (total <= 0) {`,
    to: `  if (false) {`,
  },
  {
    /* ⭐ THE ANTI-COLLATERAL PLANT. The fix is "zero is zero", NOT "small values vanish".
       Dropping the 2% floor makes one self-exclusion against 999 continues sub-pixel — a real
       and important event rendered invisible, which no assertion about the ZERO case can see. */
    name: "S-04 — a tiny non-zero segment loses its visibility floor",
    file: SHELL,
    from: `          style={{ flex: Math.max(s.flex / sum, 0.02), background: s.color, color: s.ink }}`,
    to: `          style={{ flex: s.flex / sum, background: s.color, color: s.ink }}`,
  },
  {
    /* 🔴 S-03, scan #1 — the ramp's lightest band under white ink. Measured 1.55:1 where 10px
       text needs 4.5:1. This is the shape that shipped: four of five provider bands carried
       white labels at 2.19-4.28:1, and no CSS-corpus gate could see it because the pair forms
       at runtime from an inline style against a class. */
    name: "S-03 — a ramp band takes ink that cannot be read on it",
    from: `  { fill: "var(--royal-200)", ink: "var(--royal-950)" },`,
    to: `  { fill: "var(--royal-200)", ink: "var(--text)" },`,
  },
  {
    /* 🔴 S-12 — aqua returns to a semantic role. DESIGN_AUTHORITY §B4: finishing pass only,
       "never a chip, button label, or anything semantic"; §B4b names /admin/live as an
       exception BY NAME, and this ramp paints /admin and /admin/finance. */
    name: "S-12 — the ramp borrows aqua for provider identity again",
    from: `  { fill: "var(--gold-400)", ink: "var(--royal-950)" },`,
    to: `  { fill: "var(--aqua-400)", ink: "var(--royal-950)" },`,
  },
];

console.log("\nred:admin-charts — the guard must FAIL when a chart invents a mark\n");
ok("CONTROL — the guard is GREEN on the unmodified tree", runGuard() === 0);

for (const p of PLANTS) {
  const target = p.file ?? CHARTS;
  const original = readFileSync(target, "utf8");
  const crlf = original.includes("\r\n");
  const from = eol(p.from, crlf), to = eol(p.to, crlf);
  if (!ok(`plant located: ${p.name}`, original.includes(from))) continue;
  writeFileSync(target, original.replace(from, to));
  const code = runGuard();
  ok(`RED: ${p.name} → guard exits non-zero`, code !== 0, `exit=${code}`);
  writeFileSync(target, original);
  ok(`restored byte-identical after: ${p.name}`, readFileSync(target, "utf8") === original);
}

ok("CONTROL — the guard is GREEN again after every restore", runGuard() === 0);

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
