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
 * SINGULAR FORMS (2026-10-08). Swahili agrees the verb with the count, and the label read "masaa 1 yamebaki" for
 * ONE hour where a reader expects "saa 1 imebaki". The helper now takes OPTIONAL singular templates (`daysOne`,
 * `hoursOne`, `minutesOne`), and three more sections guard them:
 *
 *   §3 BEHAVIOUR — exactly 1 takes its own template and 2 the plural; a labels object WITHOUT singular templates
 *      still works (the plural is used, each unit on its own).
 *   §4 THE SWAHILI STRINGS — the six strings are pinned exactly, so the colloquial "masaa" cannot come back.
 *   §5 THE CALLERS — the singular templates are OPTIONAL, which makes them easy to forget: a caller that omits them
 *      compiles, renders, and shows "saa 1 zimebaki" for one hour with every other gate green. So every
 *      `timeLeftLabel(…)` call in `src` must hand over all three, each wired to its OWN dictionary key.
 *
 * Run: npm run test:time-left     RED proof: npm run red:time-left
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { timeLeftLabel } from "../src/lib/markets/time-left";
import { dict } from "../src/lib/i18n-dict";
import { decomment } from "./lib/decomment.mts";

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

// ── §3 · SINGULAR FORMS — exactly 1 takes its own template where the language has one ──────────────
// Swahili agrees the verb with the count: "saa 1 imebaki" (one hour has remained), "saa 2 zimebaki". The label used
// to read "masaa 1 yamebaki" for ONE hour. So the labels take OPTIONAL `daysOne` / `hoursOne` / `minutesOne`, used
// when the number PRINTED is exactly 1. These singular templates are deliberately unlike the plurals, so a wrong pick
// shows in the text.
const L1 = { ...L, daysOne: "{n} day left", hoursOne: "{n} hour left", minutesOne: "{n} minute left" };
const atOne = (ms: number) => timeLeftLabel(NOW + ms, NOW, L1, fill);

// (a) n === 1 picks the singular template and n === 2 the plural, for days, hours and minutes.
eq(atOne(86_400_000), "1 day left", "3.1 exactly one day takes the singular template");
eq(atOne(3_600_000), "1 hour left", "3.2 exactly one hour takes the singular template");
eq(atOne(60_000), "1 minute left", "3.3 exactly one minute takes the singular template");
eq(atOne(172_800_000), "2d left", "3.4 two days take the plural template");
eq(atOne(7_200_000), "2h left", "3.5 two hours take the plural template");
eq(atOne(120_000), "2m left", "3.6 two minutes take the plural template");
// The template follows the number that is PRINTED, not the span: a day and a half prints 1 (floor), and so does one
// minute 59 seconds. Forty seconds is floored UP to 1 by the minute guard and must read the singular too, never "0".
eq(atOne(129_600_000), "1 day left", "3.7 a day and a half prints 1, so it is singular");
eq(atOne(5_400_000), "1 hour left", "3.8 an hour and a half prints 1, so it is singular");
eq(atOne(119_999), "1 minute left", "3.9 one minute 59 seconds prints 1, so it is singular");
eq(atOne(40_000), "1 minute left", "3.10 forty seconds is floored to 1 and takes the singular, never 0");
eq(atOne(0), "Closed", "3.11 a closed market is untouched by the singular forms");

// (b) A labels object WITHOUT singular templates still works: the plural template is used, never "undefined".
eq(at(86_400_000), "1d left", "3.12 no singular templates: one day reads the plural template");
eq(at(3_600_000), "1h left", "3.13 no singular templates: one hour reads the plural template");
eq(at(60_000), "1m left", "3.14 no singular templates: one minute reads the plural template");
// Each unit falls back on ITS OWN template: giving `hoursOne` alone must not change days or minutes.
const atHoursOnly = (ms: number) => timeLeftLabel(NOW + ms, NOW, { ...L, hoursOne: "{n} hour left" }, fill);
eq(atHoursOnly(3_600_000), "1 hour left", "3.15 hoursOne given: one hour takes it");
eq(atHoursOnly(86_400_000), "1d left", "3.16 hoursOne alone: one day still reads the plural");
eq(atHoursOnly(60_000), "1m left", "3.17 hoursOne alone: one minute still reads the plural");
// A locale that lacks the key hands over `undefined`, which is "not given" too.
eq(timeLeftLabel(NOW + 3_600_000, NOW, { ...L, hoursOne: undefined }, fill), "1h left",
  "3.18 an explicit undefined singular is 'not given': the plural is used");

// ── §4 · THE SWAHILI STRINGS — "masaa" cannot come back ──────────────────────────────────────────────
// "masaa" is a colloquial plural, so ONE hour read "masaa 1 yamebaki". The standard noun is "saa" (N-class: one form
// for one hour and for many, as "siku" and "dakika" already are) and the verb agrees with the count. "saa" is also
// shorter, which matters in the card's tight row on a 390px phone. Pinned exactly: the six strings, not a pattern.
const SW = dict.sw.market;
eq(SW.timeLeftD1, "siku {n} imebaki", "4.1 Swahili, one day");
eq(SW.timeLeftD, "siku {n} zimebaki", "4.2 Swahili, days");
eq(SW.timeLeftH1, "saa {n} imebaki", "4.3 Swahili, one hour");
eq(SW.timeLeftH, "saa {n} zimebaki", "4.4 Swahili, hours ('saa', never 'masaa')");
eq(SW.timeLeftM1, "dakika {n} imebaki", "4.5 Swahili, one minute");
eq(SW.timeLeftM, "dakika {n} zimebaki", "4.6 Swahili, minutes");
// ...and what a reader actually sees, through the real helper with the real templates.
const SWL = {
  closed: SW.closed, days: SW.timeLeftD, hours: SW.timeLeftH, minutes: SW.timeLeftM,
  daysOne: SW.timeLeftD1, hoursOne: SW.timeLeftH1, minutesOne: SW.timeLeftM1,
};
const atSw = (ms: number) => timeLeftLabel(NOW + ms, NOW, SWL, fill);
eq(atSw(3_600_000), "saa 1 imebaki", "4.7 one hour left reads 'saa 1 imebaki'");
eq(atSw(7_200_000), "saa 2 zimebaki", "4.8 two hours left reads 'saa 2 zimebaki'");
eq(atSw(86_400_000), "siku 1 imebaki", "4.9 one day left reads 'siku 1 imebaki'");
eq(atSw(259_200_000), "siku 3 zimebaki", "4.10 three days left reads 'siku 3 zimebaki'");
eq(atSw(40_000), "dakika 1 imebaki", "4.11 forty seconds left reads 'dakika 1 imebaki'");
eq(atSw(300_000), "dakika 5 zimebaki", "4.12 five minutes left reads 'dakika 5 zimebaki'");

// ── §5 · EVERY CALLER PASSES THE SINGULAR TEMPLATES ──────────────────────────────────────────────────
// The singular templates are OPTIONAL, which makes them the easiest thing to forget: a caller that omits them still
// compiles, still renders, and shows Swahili readers "saa 1 zimebaki" for one hour with every other gate green. So
// this is a census, not a trust: every `timeLeftLabel(…)` call in `src` hands over all three, each wired to ITS OWN
// dictionary key (`hoursOne: t.market.timeLeftH1`, not the plural `timeLeftH`).
const SINGULAR_PROPS = [
  ["daysOne", "timeLeftD1"],
  ["hoursOne", "timeLeftH1"],
  ["minutesOne", "timeLeftM1"],
] as const;

/** The argument text of every `timeLeftLabel(…)` CALL in a source file. Comments are stripped first (the repo's one
 *  `decomment`), so a commented-out `// hoursOne: …` cannot satisfy the rule; the definition is not a call. */
function timeLeftCalls(src: string): string[] {
  if (!src.includes("timeLeftLabel")) return []; // comments only remove text: no mention, no call, no scan needed
  const code = decomment(src);
  const calls: string[] = [];
  for (const m of code.matchAll(/\btimeLeftLabel\s*\(/g)) {
    const at0 = m.index ?? 0;
    if (/function\s+$/.test(code.slice(Math.max(0, at0 - 20), at0))) continue;
    const open = at0 + m[0].length - 1;
    let depth = 0;
    let end = code.length; // an unbalanced call is read to the end of the file, so it fails the checks loudly
    for (let i = open; i < code.length; i++) {
      if (code[i] === "(") depth++;
      else if (code[i] === ")" && --depth === 0) { end = i + 1; break; }
    }
    calls.push(code.slice(open, end));
  }
  return calls;
}
const passesOne = (call: string, prop: string, key: string) =>
  new RegExp(`\\b${prop}\\s*:\\s*t\\.market\\.${key}\\b`).test(call);

const callers = files
  .filter((f) => f !== HELPER)
  .flatMap((f) => timeLeftCalls(readFileSync(f, "utf8")).map((call, i) => ({ f, i, call })));

// 5.0 — THE POSITIVE CONTROL. A census over an empty set passes vacuously: rename the helper and every check below
// would "pass" over a tree where nothing was looked at. The calls are found by the helper's NAME and the consumers
// (§2) by the dictionary KEY: two independent discoveries, and they must agree.
ok(callers.length >= 5, "5.0 CONTROL: the helper's calls are still found (/live, /markets, the detail page, the hero's two)",
  `found ${callers.length}`);
for (const f of consumers) {
  ok(callers.some((c) => c.f === f), `5.1 CONTROL: ${f} reads the minutes key, so it must contain a timeLeftLabel call`);
}

for (const { f, i, call } of callers) {
  for (const [prop, key] of SINGULAR_PROPS) {
    ok(passesOne(call, prop, key), `5.2 ${f} call ${i + 1} passes ${prop}: t.market.${key}`);
  }
}

// 5.3 — THE CENSUS CAN FAIL. Run the same extraction over a real, conforming caller with one singular dropped,
// commented out, and wired to the PLURAL key: each must be refused, and the untouched caller must pass, or 5.2
// checks nothing. (The sample is a caller that conforms, so one broken caller shows as ONE failure, in 5.2.)
const conforms = (call: string) => SINGULAR_PROPS.every(([prop, key]) => passesOne(call, prop, key));
const sample = [...new Set(callers.map((c) => c.f))].find((f) => callers.filter((c) => c.f === f).every((c) => conforms(c.call)));
ok(sample !== undefined, "5.3 CONTROL: there is a conforming caller to mutate");
if (sample !== undefined) {
  const real = readFileSync(sample, "utf8");
  const HOURS_ONE = /\bhoursOne\s*:\s*t\.market\.timeLeftH1\b/;
  const refused = (mutated: string) =>
    timeLeftCalls(mutated).some((call) => !passesOne(call, "hoursOne", "timeLeftH1"));
  ok(!refused(real), `5.3a CONTROL: ${sample} untouched passes`);
  ok(refused(real.replace(HOURS_ONE, "")), "5.3b CONTROL: a caller with hoursOne dropped is refused");
  ok(refused(real.replace(HOURS_ONE, (s) => `/* ${s} */`)), "5.3c CONTROL: a caller with hoursOne commented out is refused");
  ok(refused(real.replace(HOURS_ONE, "hoursOne: t.market.timeLeftH")), "5.3d CONTROL: hoursOne wired to the plural key is refused");
}

console.log(`time-left: ${pass} assertions passed · ${consumers.length} consumers checked · ${callers.length} calls checked`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
