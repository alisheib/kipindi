#!/usr/bin/env node
/**
 * red:filter-language — proves `test:filter-language` actually catches the defects it names.
 *
 * ⛔ A GATE NOBODY HAS SEEN FAIL IS A SUGGESTION. Batch 5's own scan found three instruments that
 * had been green for the wrong reason, and the batch before it found a formatter copy that lived
 * through two gates. So every defect this gate claims to refuse is reintroduced here, one at a
 * time, and the gate must go red **on that defect's own assertion** — not merely red.
 *
 * The seven cases are the seven ways the one filter language actually broke, in the tree, before
 * batch 5:
 *
 *   · square          — the 8px `rounded-md` five rails carried instead of the pill
 *   · below-the-floor — a Tailwind height class, which on THIS repo's overridden scale is a
 *                       silent 48 or 64px (this is how /updown shipped 64px tabs from `h-9`)
 *   · always-outlined — every control outlined, the defect that is not cosmetic
 *   · inline-paint    — the law-82 breach: the selected fill written at the call site
 *   · unhooked-rail   — a surface that stops consuming the primitive and rolls its own
 *   · gilded-range    — the chart range back in the money ink
 *   · split-attrs     — `data-chip` and `data-count` no longer adjacent, which makes
 *                       `qa:discovery-probe` find ZERO controls and blame the product
 *
 * ⭐ AND AN EIGHTH CASE THAT IS NOT A PRODUCT DEFECT AT ALL — `vacuity`. It renames the rail hook
 * so the gate's subject set goes EMPTY. A structural rule of the form "every filter surface must
 * do X" passes vacuously over an empty set, and this harness exists partly to prove that §0's
 * positive control refuses that. If `vacuity` ever comes back GREEN, the gate has stopped looking
 * at anything and every other case above it is worthless.
 *
 * The tree is restored after every case and verified byte-identical at the end.
 *
 * Run: npm run red:filter-language
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const GATE = "scripts/filter-language.test.mts";
const PRIMITIVE = "src/components/ui/filter-pill.tsx";
const CSS = "src/app/globals.css";
const POSITIONS = "src/app/positions/page.tsx";

const CASES = [
  {
    name: "square (the 8px rounded-md five rails carried instead of the pill)",
    file: PRIMITIVE,
    from: `"kp-fchip inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border",`,
    to: `"kp-fchip inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border",`,
    expect: "1.1",
  },
  {
    name: "below-the-floor (a scale class, which is silently 48px on this repo's overridden scale)",
    file: PRIMITIVE,
    from: `"kp-fchip inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border",`,
    to: `"kp-fchip inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border",`,
    expect: "1.3",
  },
  {
    name: "always-outlined (every control outlined — the defect that is not cosmetic)",
    file: PRIMITIVE,
    from: `          : "border-transparent text-text-muted hover:bg-bg-overlay hover:text-text",`,
    to: `          : "border-border text-text-muted hover:bg-bg-overlay hover:text-text",`,
    expect: "1.5",
  },
  {
    name: "split-attrs (data-chip and data-count no longer adjacent — the probe finds ZERO controls)",
    file: PRIMITIVE,
    from: `      data-chip={testId}
      data-count={count}`,
    to: `      data-chip={testId}
      title={title}
      data-count={count}`,
    expect: "1.8",
  },
  {
    name: "inline-paint (the law-82 breach: the selected fill written at the call site)",
    file: POSITIONS,
    from: `              on={activeTab === tab.id}
              semantics="tab"`,
    to: `              on={activeTab === tab.id}
              semantics="tab"
              style={activeTab === tab.id ? { background: "var(--pill-active)" } : undefined}`,
    expect: "3.3",
  },
  {
    name: "unhooked-rail (a surface stops consuming the primitive and rolls its own)",
    file: POSITIONS,
    from: `import { FilterPill } from "@/components/ui/filter-pill";\n`,
    to: ``,
    expect: "3.1",
  },
  {
    name: "gilded-range (the chart range back in the money ink)",
    file: CSS,
    from: `.pchart-range.is-active { color: var(--text); background: var(--pill-active); }`,
    to: `.pchart-range.is-active { color: var(--gold-fg); background: var(--gilt); }`,
    expect: "4.1",
  },
  {
    // ⭐ NOT A PRODUCT DEFECT — the INSTRUMENT's failure mode. If this comes back green the gate
    //   has stopped looking at anything, and every case above it proved nothing.
    name: "vacuity (the rail hook is renamed, so the gate's subject set goes EMPTY)",
    file: POSITIONS,
    from: `          data-filter-rail\n`,
    to: ``,
    expect: "0.5",
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
  console.error("REFUSING: test:filter-language is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1200));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

const originals = new Map();
for (const f of new Set(CASES.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

const problems = [];
for (const [i, c] of CASES.entries()) {
  const original = originals.get(c.file);
  let mutated;
  try {
    mutated = injectDefect(original, c.from, c.to);
  } catch (e) {
    problems.push(`case ${i + 1}: ANCHOR — ${e.message}`);
    console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate();
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): red, but not on ${c.expect} — ${lines.join(" | ")}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    console.log(`  ${i + 1}. ✓ RED on ${c.expect}  ${c.name}`);
  }
}

// ⛔ The tree must be exactly as it was found. A harness that leaves a defect behind is worse
//    than no harness — the next run's precondition would refuse, and the next COMMIT would ship it.
let dirty = 0;
for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) { console.error(`🔴 NOT RESTORED: ${f}`); dirty++; }
}
if (dirty === 0) console.log("\ntree restored byte-identical");

const after = runGate();
if (after.code !== 0) {
  problems.push("the gate is RED on the restored tree — the restore did not restore");
}

console.log(`\n${CASES.length - problems.length}/${CASES.length} defects caught, each on its own assertion`);
if (problems.length || dirty) {
  console.error("");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log("red:filter-language OK — the gate refuses every defect it names.");
