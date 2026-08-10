/**
 * RED proof for `board-discovery.test.mts`.
 *
 * Reverts each half of the 2026-08-10 board-discovery fix in turn, requires the suite
 * to EXIT NON-ZERO **on the specific check that mutation targets**, then restores
 * `src/app/markets/page.tsx` byte-for-byte and re-verifies it is green.
 *
 * ⛔ Checking only that the file CHANGED is the trap: a mutation the guard never reads
 * looks exactly like a guard that works. Each mutation names the check it must break,
 * and one caught by a DIFFERENT check is reported as a miss — because that would mean
 * the guard is right by accident.
 *
 * ⭐ It also carries a GREEN mutation: a compliant edit the guard must stay SILENT on.
 * A harness made only of failures cannot catch a gate that condemns working code —
 * which this guard's first draft did, flagging the CATEGORY default `sp.cat ?? "all"`
 * as a window-default regression because the two share the word "all".
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = join(HERE, "..", "src", "app", "markets", "page.tsx");
const SUITE = join(HERE, "board-discovery.test.mts");
const TSX = join(HERE, "..", "node_modules", "tsx", "dist", "cli.mjs");
const original = readFileSync(TARGET, "utf8");

// See settle-atomicity-red.mjs: `npx` is `npx.cmd` on Windows and execFileSync cannot
// spawn it without a shell, which turns ENOENT into a fake "suite failed".
const run = () => {
  try {
    const out = execFileSync(process.execPath, [TSX, SUITE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

// Anchors are rewritten into the file's own EOL — this checkout is CRLF, and a
// multi-line "\n" anchor silently matches nothing (E-133's CRLF half).
const EOL = original.includes("\r\n") ? "\r\n" : "\n";
const toEol = (s) => s.replace(/\r?\n/g, EOL);

const MUTATIONS = [
  {
    name: "the landing board goes back to a 24-hour window (THE BUG)",
    breaks: 'the default window ("today") applies NO time cutoff',
    from: 'const DEFAULT_WHEN: WhenFilter = "all";',
    to: 'const DEFAULT_WHEN: WhenFilter = "today";',
  },
  {
    name: "a reader drifts back to its own literal",
    breaks: "no `when` reader falls back to a bare literal",
    from: 'const whenId = (sp.when as WhenFilter | undefined) ?? DEFAULT_WHEN;',
    to: 'const whenId = (sp.when as WhenFilter | undefined) ?? "today";',
  },
  {
    name: "an href builder pins the omit-check to a literal again",
    breaks: "no href builder compares the window to a literal",
    from: 'if (whenId !== DEFAULT_WHEN) params.set("when", whenId);',
    to: 'if (whenId !== "today") params.set("when", whenId);',
  },
  {
    name: '"recently resolved" goes back to slicing the ascending board order',
    breaks: "it sorts resolutionAt DESCENDING (newest first)",
    from: ".sort((a, b) => b.resolutionAt.localeCompare(a.resolutionAt));",
    to: ".sort((a, b) => a.resolutionAt.localeCompare(b.resolutionAt));",
  },
  {
    name: '"just listed" goes back to subtracting the current page',
    breaks: "the new-markets section subtracts the windowed set, not the page",
    from: "const inWindow = new Set(live.map((m) => m.id));",
    to: "const inWindow = new Set(pagedLive.map((m) => m.id));",
  },
];

// A compliant edit. The guard must NOT fire on it.
const GREEN = {
  name: "GREEN — an unrelated category default keeps its own literal",
  from: 'const activeCat = sp.cat ?? "all";',
  to: 'const activeCat = sp.cat ?? "all"; // unchanged behaviour, reworded comment',
};

let caught = 0;
let missed = 0;

console.log(`RED proof — board discovery  (file EOL: ${EOL === "\r\n" ? "CRLF" : "LF"})\n`);

const baseline = run();
if (baseline.code !== 0) {
  console.log("⛔ ABORT: the suite is already RED before any mutation.");
  console.log(baseline.out.slice(-1200));
  process.exit(1);
}
console.log("  baseline: GREEN\n");

for (const m of MUTATIONS) {
  const from = toEol(m.from);
  if (!original.includes(from)) {
    console.log(`  ⛔ ANCHOR MISSING — ${m.name}\n     could not find: ${m.from.slice(0, 90)}`);
    missed++;
    continue;
  }
  writeFileSync(TARGET, original.replace(from, toEol(m.to)), "utf8");
  const r = run();
  writeFileSync(TARGET, original, "utf8");

  const brokeTheRightCheck = r.out.includes(`FAIL ${m.breaks}`);
  if (r.code !== 0 && brokeTheRightCheck) { console.log(`  ✔ CAUGHT  ${m.name}`); caught++; }
  else if (r.code !== 0) {
    console.log(`  ⚠️ CAUGHT BY THE WRONG CHECK — ${m.name}\n     expected "FAIL ${m.breaks}"`);
    missed++;
  } else { console.log(`  ⛔ MISS    ${m.name} — the guard did not notice`); missed++; }
}

// The green case.
{
  const from = toEol(GREEN.from);
  if (!original.includes(from)) {
    console.log(`  ⛔ ANCHOR MISSING — ${GREEN.name}`);
    missed++;
  } else {
    writeFileSync(TARGET, original.replace(from, toEol(GREEN.to)), "utf8");
    const r = run();
    writeFileSync(TARGET, original, "utf8");
    if (r.code === 0) { console.log(`  ✔ SILENT  ${GREEN.name}`); caught++; }
    else { console.log(`  ⛔ FALSE POSITIVE — ${GREEN.name}: the guard condemned a compliant edit`); missed++; }
  }
}

const restored = readFileSync(TARGET, "utf8");
console.log(`\n  file restored byte-for-byte: ${restored === original ? "yes" : "🔴 NO"}`);
const final = run();
console.log(`  suite green again: ${final.code === 0 ? "yes" : "🔴 NO"}`);
console.log(`\n  ${caught}/${MUTATIONS.length + 1} cases correct, ${missed} wrong`);
process.exit(missed === 0 && restored === original && final.code === 0 ? 0 : 1);
