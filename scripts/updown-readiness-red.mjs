/**
 * RED harness for `npm run test:updown-readiness` and `npm run test:updown-durations`.
 *
 *   node scripts/updown-readiness-red.mjs
 *
 * ⛔ THE TWO THAT MATTER: removing gold's measured minimum (which puts gold back on 3–5 minute
 * rounds decided by feed representation rather than by the market), and admitting a duration
 * that does not divide the day (whose boundaries drift across midnight so no two chains can
 * ever share a reading).
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings; results read from each
 * suite's OWN summary line; MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SYMBOLS = new URL("../src/lib/server/updown-symbols.ts", import.meta.url);
const DURATIONS = new URL("../src/lib/updown-durations.ts", import.meta.url);
const CONFIG = new URL("../src/lib/server/updown-config.ts", import.meta.url);
const PAGE = new URL("../src/app/admin/updown/page.tsx", import.meta.url);

const MUTATIONS = [
  // ── ⭐ THE MEASURED PER-ASSET GATE (2026-08-05) ────────────────────────────
  // The engine existed for a session with NO caller. Every mutation below leaves it existing
  // and correct while disconnecting it, which is exactly how it shipped unused the first time.
  {
    name: "measured-block-ignored — the record says ③ and the symbol reads ready anyway",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  if (measured && measured.level === 3) return { level: 3, reason: measured.message };`,
    to: `  if (false && measured && measured.level === 3) return { level: 3, reason: measured.message };`,
  },
  {
    name: "measured-caution-dropped — the record's ② never reaches the operator",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  if (measured && measured.level === 2) caveats.push(measured.message);`,
    to: `  if (false && measured && measured.level === 2) caveats.push(measured.message);`,
  },
  {
    // ⛔ THE SHAPE THIS SESSION STARTED IN: the console greys it, the server takes it.
    name: "server-gate-unmeasured — the console greys the pairing and the server accepts it",
    file: CONFIG,
    suite: "updown-readiness",
    from: `  const durationErr = validateSymbolDuration(asset.symbol, input.durationMinutes, measured);`,
    to: `  const durationErr = validateSymbolDuration(asset.symbol, input.durationMinutes);`,
  },
  {
    // Keyed on the symbol, the lookup finds nothing, reads UNMEASURED, and disarms the gate
    // while every screen still looks right.
    name: "record-keyed-on-symbol — the lookup finds nothing and everything reads unmeasured",
    file: CONFIG,
    suite: "updown-readiness",
    from: `  const measured = await feedAdviceFor(asset.key, input.durationMinutes);`,
    to: `  const measured = await feedAdviceFor(asset.symbol, input.durationMinutes);`,
  },
  {
    name: "console-half-unmeasured — the Add-chain duration list stops reading the record",
    file: PAGE,
    suite: "updown-admin-options",
    from: `                    const r = symbolReadiness(findSymbol(a.symbol), d, feed?.advise(a.key, d));`,
    to: `                    const r = symbolReadiness(findSymbol(a.symbol), d);`,
  },
  {
    name: "measurement-overrides-the-catalogue — a good record lifts gold's 15-minute floor",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  // ③ beats everything: the platform genuinely cannot feed it.
  if (spec.unsupported) return { level: 3, reason: spec.unsupported };`,
    to: `  // ③ beats everything: the platform genuinely cannot feed it.
  if (spec.unsupported) return { level: 3, reason: spec.unsupported };
  if (measured && measured.level === 1) return { level: 1, reason: "" };`,
  },
  {
    name: "gold-minimum-removed — gold is offered at 3 and 5 minutes again",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `    minDurationMinutes: 15,
    minDurationWhy:
      "Gold's own price feed disagrees`,
    to: `    minDurationWhy:
      "Gold's own price feed disagrees`,
  },
  {
    name: "gold-reason-dropped — an option is greyed with no explanation",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `        spec.minDurationWhy ??
        \`\${spec.symbol} needs rounds of at least \${spec.minDurationMinutes} minutes.\``,
    to: `        \`\${spec.symbol} needs rounds of at least \${spec.minDurationMinutes} minutes.\``,
  },
  {
    name: "unknown-symbol-passes — an uncatalogued symbol reads as ready",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  if (!spec) {
    return {
      level: 3,`,
    to: `  if (!spec) {
    return {
      level: 1,`,
  },
  {
    // The gate removed: the dropdown still greys the option, the server takes it anyway.
    name: "server-gate-removed — the console greys it and the server accepts it",
    file: CONFIG,
    suite: "updown-readiness",
    from: `  const durationErr = validateSymbolDuration(asset.symbol, input.durationMinutes, measured);
  if (durationErr) return { ok: false, error: durationErr };`,
    to: `  const durationErr: string | null = null;
  if (durationErr) return { ok: false, error: durationErr };`,
  },
  {
    name: "catalogue-tick-below-the-floor — the form prefills a value the server refuses",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 2, group: "Crypto" },
  { symbol: "ETH/USD"`,
    to: `    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 1, group: "Crypto" },
  { symbol: "ETH/USD"`,
  },
  {
    name: "lattice-rule-loosened — a duration that does not divide the day is admitted",
    file: DURATIONS,
    suite: "updown-durations",
    from: `  return Number.isInteger(minutes) && minutes > 0 && MINUTES_PER_DAY % minutes === 0;`,
    to: `  return Number.isInteger(minutes) && minutes > 0;`,
  },
  {
    name: "duration-added-off-lattice — 7 minutes, whose boundaries drift across midnight",
    file: DURATIONS,
    suite: "updown-durations",
    from: `export const ALLOWED_DURATIONS = [3, 5, 10, 15, 30, 60] as const;`,
    to: `export const ALLOWED_DURATIONS = [3, 5, 7, 10, 15, 30, 60] as const;`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(from, to));
  try {
    if (readFileSync(m.file, "utf8") === original) throw new Error("mutation did not land on disk");
    const script = m.suite === "updown-durations" ? "updown-durations.test.mts"
      : m.suite === "updown-admin-options" ? "updown-admin-options.test.mts"
      : "updown-readiness.test.mts";
    let exitCode = 0, out = "";
    try {
      out = execSync(`npx tsx scripts/${script}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    // Each suite prints its own summary; anchor on that, never on the bare words `N failed`.
    const re = m.suite === "updown-durations"
      ? /durations — \d+ passed, (\d+) failed/
      : m.suite === "updown-admin-options"
        ? /updown-admin-options: \d+ passed, (\d+) failed/
        : /updown-readiness: \d+ passed, (\d+) failed/;
    const failed = Number(re.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/(?:FAIL |  · )(.+)/.exec(out)?.[1] ?? "").slice(0, 82)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(m.file, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
