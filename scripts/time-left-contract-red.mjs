/**
 * red:time-left — proves `test:time-left` catches the defects it names, each on its own assertion.
 * Same discipline as `red:landing-contract` / `red:ticker-honesty`: reintroduce the REAL defect,
 * assert the gate goes red on THAT case's assertion (not on some incidental collapse), restore.
 *
 * Case 5 is the one that matters most and is the least obvious: it proves the gate's own POSITIVE
 * CONTROL fires. §2's rule is "every file that renders the minutes label must import the helper",
 * and a rule of that shape passes vacuously the moment the set of such files becomes empty. An
 * i18n key rename would do it. So case 5 renames the key the gate looks for and asserts the gate
 * FAILS on 2.0 rather than reporting a clean sweep of nothing — the exact blindness that let a
 * third copy of this formatter live on `/markets` through two batches of documentation.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const HELPER = "src/lib/markets/time-left.ts";
const BOARD = "src/app/markets/page.tsx";
const LIVE = "src/app/live/page.tsx";
const GATE = "scripts/time-left-contract.test.mts";

/** The delegating call, byte-identical in both boards — anchored per file, so it is unique. */
const DELEGATES = `    timeLeftLabel(Date.parse(iso), nowMs, {
      closed: t.market.closed,
      days: t.market.timeLeftD,
      hours: t.market.timeLeftH,
      minutes: t.market.timeLeftM,
    }, fill);`;

const CASES = [
  {
    name: "the helper floors the minute branch with a plain Math.floor (renders 0m while open)",
    file: HELPER,
    from: `  return fillFn(labels.minutes, { n: Math.max(1, Math.floor(ms / 60_000)) });`,
    to: `  return fillFn(labels.minutes, { n: Math.floor(ms / 60_000) });`,
    expect: "1.1",
  },
  {
    name: "/markets re-expresses the formatter inline again, import still present",
    file: BOARD,
    from: DELEGATES,
    to: `    fill(t.market.timeLeftM, { n: Math.floor((Date.parse(iso) - nowMs) / 60_000) });`,
    expect: "2.2",
  },
  {
    name: "/live renders the label without importing the helper",
    file: LIVE,
    from: `import { timeLeftLabel } from "@/lib/markets/time-left";`,
    to: `// the import a copy would not need`,
    expect: "2.1",
  },
  {
    name: "/markets re-derives minutes from milliseconds beside the label (no fill call)",
    file: BOARD,
    from: `    }, fill);`,
    to: `    }, fill);
  const staleMinutes = Math.floor((Date.parse("2026-08-13") - nowMs) / 60_000);
  void staleMinutes;`,
    expect: "2.3",
  },
  {
    name: "CONTROL: the i18n key is renamed, so the structural rule has nothing left to check",
    file: GATE,
    from: `const MINUTES_KEY = "timeLeftM";`,
    to: `const MINUTES_KEY = "timeLeftMinutesRenamedAway";`,
    expect: "2.0",
  },
];

const runGate = () => {
  try {
    execFileSync("npx", ["tsx", GATE], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:time-left is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1200));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

const originals = new Map();
for (const f of new Set(CASES.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

let caught = 0;
const problems = [];
for (const [i, c] of CASES.entries()) {
  const original = originals.get(c.file);
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) { problems.push(`case ${i + 1}: ANCHOR — ${e.message}`); console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`); continue; }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate();
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) { problems.push(`case ${i + 1} (${c.name}): stayed GREEN`); console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`); }
  else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): red, but not on ${c.expect} — ${lines.join(" | ")}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else { caught++; console.log(`  ${i + 1}. caught on ${c.expect.padEnd(5)} ${c.name}`); }
}

for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) problems.push(`${f} not restored`);
}
const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");

console.log(`\n${caught}/${CASES.length} caught · restored: ${problems.length === 0} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
