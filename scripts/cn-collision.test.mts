/**
 * test:cn-collision — DG-S-03's tailwind-merge defect, turned into a GATE.
 *
 * 🔴 WHAT HAPPENED. `cn` was a bare `twMerge()` with NO CONFIG, while `tailwind.config.ts`
 * REPLACES Tailwind's `fontSize` scale with this platform's own keys. tailwind-merge does not
 * know them, so it filed any unrecognised `text-*` as a COLOUR — which put `text-body-sm` and
 * `text-text` in one conflict group, and the later class DELETED the earlier. Not overrode:
 * removed. The element then inherited `body`'s 15px and NO RULE ANYWHERE SAID SO, which is why
 * no cascade probe and no stylesheet audit could ever have found it. It shipped on `/auth/login`
 * — three sizes of one recipe on the platform's front door.
 *
 * ⛔ THE FIX (`extendTailwindMerge` in `src/lib/utils.ts`) IS HELD BY `test:bridge` §8, which
 * asserts set equality between the config's rungs and `cn`'s list. This gate is the OTHER half:
 * it proves no CALL SITE is still losing a class, by asking the real `cn` what it returns.
 *
 * ⭐ WHY IT EXISTS AT ALL, GIVEN §8. Set equality proves the CONFIG is complete; it cannot prove
 * a given call site survives, because a site can pair classes from two groups tailwind-merge
 * still conflates for reasons unrelated to fontSize. This runs the actual strings.
 *
 * ⚠️ AND IT REPLACES A PROBE THAT COULD NOT TRAVEL. The handover said to re-derive this with
 * `node .qa-design-gate/cn-collision2.mjs` — a path under a GITIGNORED directory, so it existed
 * on exactly one machine and was gone the moment anyone else pulled. A document that hands out
 * a file nobody else can have is a document that cannot be acted on; this lives in `scripts/`
 * and runs in the pipeline.
 *
 * 📐 WHAT THE CONTROL MEASURES, AND WHY IT IS NOT THE HANDOVER'S 10. Run `red:cn-collision` and
 * the pre-fix `cn` loses a class at exactly ONE literal list — `components/layout/avatar-menu.tsx`,
 * dropping `text-body-sm`. The handover records a "blast radius of 10 call sites". ⛔ THE TWO
 * NUMBERS ARE NOT IN CONFLICT AND NEITHER IS WRONG: that 10 counts sites where a size and a
 * colour class CO-OCCUR, i.e. sites at risk; this counts lists where a class is provably LOST,
 * and only among literal arguments. A list assembled from a ternary or a variable cannot be
 * resolved without executing the component, so this gate cannot see it — stated here rather than
 * left to be inferred from a smaller number. ⭐ The 10 still need eyes; this proves one of them
 * and holds the door shut on the rest.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { decomment } from "./lib/decomment.mts";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.env.KP_SRC || join(here, "..", "src");

/**
 * 🔴 `cn` IS IMPORTED FROM `SRC`, NOT FROM A FIXED PATH — and the control is what proved that
 * matters. The first draft did `import { cn } from "../src/lib/utils.ts"`, so `red:cn-collision`
 * mutated `cn` in its temp COPY while this gate went on importing the REAL, already-fixed one.
 * It reported a serene pass over a tree it was not looking at, and the control caught it on its
 * first run: "the gate did NOT notice."
 * ⛔ A gate that walks one tree and imports its subject from another is measuring two different
 * things and calling the answer one result — the wrong-population failure, across a module
 * boundary instead of across a file list.
 */
const { cn } = (await import(pathToFileURL(join(SRC, "lib", "utils.ts")).href)) as {
  cn: (...a: unknown[]) => string;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (e.endsWith(".tsx") || e.endsWith(".ts")) out.push(full);
  }
  return out;
}

/**
 * Every string literal handed to `cn(...)`. ⛔ Literals only, and that limit is STATED rather
 * than hidden: a class list built from a variable cannot be resolved without executing the
 * component, so this gate cannot see those. It fails toward under-reporting, which is why
 * `test:bridge` §8's set equality stays the primary guard and this is the second one.
 */
const CLASS_RE = /cn\(\s*([\s\S]{0,600}?)\)/g;
const LIT_RE = /"([^"\\]{4,300})"|'([^'\\]{4,300})'|`([^`$\\]{4,300})`/g;

let fail = 0;
const losses: { file: string; had: string; lost: string[] }[] = [];
const files = walk(SRC);

for (const f of files) {
  const src = decomment(readFileSync(f, "utf8"));
  for (const m of src.matchAll(CLASS_RE)) {
    for (const lit of m[1].matchAll(LIT_RE)) {
      const raw = (lit[1] ?? lit[2] ?? lit[3] ?? "").trim();
      if (!raw || !/\s/.test(raw)) continue;              // single tokens cannot collide
      if (!/[a-z]-/.test(raw)) continue;                  // not a class list
      const out = cn(raw);
      const before = raw.split(/\s+/).filter(Boolean);
      const after = new Set(out.split(/\s+/).filter(Boolean));
      /* A class is LOST when it is not in the output and no later class in the SAME list
         legitimately replaced it. tailwind-merge is supposed to drop a genuine duplicate — so
         only a class with no same-prefix successor counts as a loss. */
      const lost = before.filter((c, i) => {
        if (after.has(c)) return false;
        const prefix = c.replace(/-[^-]*$/, "");
        return !before.slice(i + 1).some((later) => later.startsWith(prefix));
      });
      if (lost.length) losses.push({ file: f.slice(SRC.length + 1).replace(/\\/g, "/"), had: raw.slice(0, 80), lost });
    }
  }
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("cn() COLLISION — no call site loses a class on its way to the browser");
console.log("──────────────────────────────────────────────────────────────────────");
console.log(`  ${files.length} source files scanned`);

if (losses.length) {
  console.log(`\n🔴 ${losses.length} class list(s) lose a class that nothing later replaces:`);
  for (const l of losses.slice(0, 20)) {
    console.log(`     ✗ src/${l.file}`);
    console.log(`         list : ${l.had}`);
    console.log(`         lost : ${l.lost.join(", ")}`);
  }
  console.log("\n   A class that does not survive `cn()` never reaches the glass, and NO RULE");
  console.log("   ANYWHERE says so — the element silently inherits. If a rung is missing from");
  console.log("   `extendTailwindMerge` in src/lib/utils.ts, add it there, not at the call site.");
  fail = 1;
} else {
  console.log("\n✅ every class handed to cn() survives it.");
}

process.exit(fail);
