/**
 * test:time-left — "how long is left" is ONE definition, and no page may re-express it.
 *
 * 🔴 WHY THIS GATE EXISTS. The nine-line formatter was copied into four pages and the copies
 * drifted: three floored the minute branch with a plain `Math.floor`, so a market with forty
 * seconds of betting left rendered **"0m left"** — the label says the door is shut while the bet
 * is still open — and the detail page rendered "1m left" for the same market at the same instant.
 *
 * Batch 2 extracted `src/lib/markets/time-left.ts` and batch 4 pointed the last callers at it.
 * But the drift survived TWO batches of documentation: §8.8 and batch 4's own prompt both recorded
 * that only two copies remained, while `app/markets/page.tsx` — the busiest board on the platform
 * — still held a third with the defective floor. Nothing was watching, so nothing said so.
 *
 * So this gate asserts BOTH halves, because either alone is satisfiable by a broken tree:
 *
 *   §1 BEHAVIOUR — the minute branch never renders zero while the market is open.
 *   §2 STRUCTURE — no file outside the helper re-expresses the label. This is the half that
 *      catches a FIFTH copy, which is how all of this started. A behaviour test on the helper
 *      stays perfectly green while a page ignores it.
 *
 * ⚠️ §2 carries its own positive control (2.0). A structural rule of the form "every file that
 * does X must also do Y" passes vacuously if the set of files that do X becomes empty — a rename
 * of the i18n keys would silence this gate rather than fail it, which is the failure mode that let
 * the third copy live. 2.0 asserts the callers are actually FOUND.
 *
 * Run: npm run test:time-left     RED proof: npm run red:time-left
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { timeLeftLabel } from "../src/lib/markets/time-left";

let pass = 0;
const fails: string[] = [];
function ok(cond: boolean, label: string, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// ── §1 · BEHAVIOUR ────────────────────────────────────────────────────────────────────────────
const L = { closed: "Closed", days: "{n}d left", hours: "{n}h left", minutes: "{n}m left" };
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
const NOW = Date.parse("2026-08-13T09:00:00.000Z");
const at = (ms: number) => timeLeftLabel(NOW + ms, NOW, L, fill);

// ⭐ THE DRIFT CASE. Every one of these is under a minute and every one must read "1m left".
// `Math.floor` renders "0m left" for all four — the defect this gate exists to refuse.
eq(at(40_000), "1m left", "1.1 forty seconds left reads 1m, never 0m");
eq(at(1_000), "1m left", "1.2 one second left reads 1m, never 0m");
eq(at(59_000), "1m left", "1.3 fifty-nine seconds left reads 1m, never 0m");
eq(at(59_999), "1m left", "1.4 the instant before a minute reads 1m, never 0m");

// Zero is reserved for genuinely closed, which the caller detects first.
eq(at(0), "Closed", "1.5 exactly at the deadline is closed");
eq(at(-1), "Closed", "1.6 one millisecond past the deadline is closed");
eq(at(-86_400_000), "Closed", "1.7 long past the deadline is closed");
eq(timeLeftLabel(Number.NaN, NOW, L, fill), "Closed", "1.8 an unparseable deadline is closed, never NaN");

// The other branches, and their boundaries.
eq(at(300_000), "5m left", "1.9 five minutes");
eq(at(3_599_999), "59m left", "1.10 the last millisecond under an hour is still minutes");
eq(at(3_600_000), "1h left", "1.11 exactly an hour crosses to hours");
eq(at(7_200_000), "2h left", "1.12 two hours");
eq(at(86_399_999), "23h left", "1.13 the last millisecond under a day is still hours");
eq(at(86_400_000), "1d left", "1.14 exactly a day crosses to days");
eq(at(259_200_000), "3d left", "1.15 three days");
ok(!at(120_000).startsWith("0"), "1.16 no branch can begin with a zero count while open", at(120_000));

// ── §2 · STRUCTURE — nobody re-expresses the label ────────────────────────────────────────────
const HELPER = "src/lib/markets/time-left.ts";
/** The minutes key is the fingerprint: any surface rendering "N minutes left" must consume it. */
const MINUTES_KEY = "timeLeftM";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}
const files = walk("src");

/** Files that render a minutes-left label, excluding the dictionaries that DEFINE the keys. */
const consumers = files.filter(
  (f) => f !== HELPER && !f.includes("/lib/i18n") && readFileSync(f, "utf8").includes(`market.${MINUTES_KEY}`),
);

// 2.0 — THE POSITIVE CONTROL. Without this, an i18n rename empties `consumers` and every
// assertion below passes over a tree where nothing at all is checked.
ok(consumers.length >= 4, "2.0 CONTROL: the minutes label still has real consumers to check",
  `found ${consumers.length}: ${consumers.join(", ")}`);

for (const f of consumers) {
  const src = readFileSync(f, "utf8");
  // A consumer must delegate. A file that renders the label without importing the helper is a copy.
  ok(/import\s+\{[^}]*\btimeLeftLabel\b[^}]*\}\s+from\s+["'][^"']*markets\/time-left["']/.test(src),
    `2.1 ${f} imports timeLeftLabel rather than re-expressing it`);
  // The copies' own signature: filling the minutes template directly at the call site.
  ok(!new RegExp(`fill\\s*\\(\\s*t\\.market\\.${MINUTES_KEY}`).test(src),
    `2.2 ${f} does not fill the minutes template itself`);
  // The arithmetic the helper owns. `/ 60_000` next to the minutes label is a re-derivation.
  ok(!new RegExp(`${MINUTES_KEY}[\\s\\S]{0,400}?(?:60_000|60000)`).test(src),
    `2.3 ${f} does not re-derive minutes from milliseconds beside the label`);
}

// The helper itself must keep the guard that the whole gate is about.
const helperSrc = readFileSync(HELPER, "utf8");
ok(/Math\.max\s*\(\s*1\s*,/.test(helperSrc),
  "2.4 the helper still floors the minute branch at Math.max(1, …)");
ok(!/^\s*import\s.*from\s+["'][^"']*\/server\//m.test(helperSrc),
  "2.5 the helper stays pure — no server import, so a gate can exercise it with plain strings");

console.log(`time-left: ${pass} assertions passed · ${consumers.length} consumers checked`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
