/**
 * RED harness for `npm run test:updown-chart`.
 *
 *   node scripts/updown-chart-red.mjs
 *
 * ⛔ The first mutation is E-93 ITSELF — the code exactly as it shipped, a constant offset that
 * does not know the target lines exist. It printed the live price on top of the `UP $…` label on
 * a real settlement proof.
 *
 * Rules obeyed (the same two the other harnesses pay for): the anchor is asserted present before
 * the edit and gone after, and a mutation counts as caught only when the suite EXITS NON-ZERO
 * *and* names at least one failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const HERO = new URL("../src/components/updown/price-hero.tsx", import.meta.url);

const MUTATIONS = [
  {
    // 🔴 E-93 as it shipped: a fixed offset, blind to the target labels.
    name: "fixed-offset — the tag prints on top of the UP label (E-93 itself)",
    from: `  const candidates = preferAbove ? [-12, 18, -28, 34] : [18, -12, 34, -28];
  if (targets.length === 0) return candidates[0];`,
    to: `  const candidates = preferAbove ? [-12, 18, -28, 34] : [18, -12, 34, -28];
  return candidates[0];
  // eslint-disable-next-line no-unreachable
  if (targets.length === 0) return candidates[0];`,
  },
  {
    // The gap reduced to nothing: "clears" becomes true at any distance, which is the same
    // defect wearing the fix's clothes.
    name: "gap-floor-removed — a 1px separation counts as clearance",
    from: `  const MIN_GAP = 13;`,
    to: `  const MIN_GAP = 0;`,
  },
  {
    // The LINE positions passed instead of the LABEL baselines — measures the wrong gap, and
    // every number on screen still looks plausible.
    name: "line-not-label-baseline — the wrong gap is measured, plausibly",
    from: `    [upY != null ? parseFloat(upY) - 4 : null, downY != null ? parseFloat(downY) + 11 : null],`,
    to: `    [upY != null ? parseFloat(upY) : null, downY != null ? parseFloat(downY) : null],`,
  },
];

let caught = 0;
const missed = [];
const original = readFileSync(HERO, "utf8");

// ⛔ ANCHORS THROUGH `red-anchor.mjs`. `price-hero.tsx` checks out CRLF and these anchors are
// written with `\n`, so every MULTI-LINE one matched nothing — measured 2026-08-15, two of three.
// The single-line mutation matched, so the harness reported 2/3 and looked like a guard with one
// weak case rather than a harness with the repo's oldest trap in it.
for (const m of MUTATIONS) {
  let mutated;
  try {
    mutated = injectDefect(original, m.from, m.to);
  } catch (e) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard. (${e.message})`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(HERO, mutated);
  try {
    if (readFileSync(HERO, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-chart.test.mts", {
        cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
        encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    const failed = Number(/(\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/✗ (.+)/.exec(out)?.[1] ?? "").slice(0, 96)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(HERO, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { console.log("Uncaught:"); for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
