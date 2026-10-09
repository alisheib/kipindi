/**
 * test:icon-sizes — THE GLYPH SIZE SET IS FROZEN, AND IT MUST ONLY EVER SHRINK.
 *
 * Why this guard exists (2026-09-11). `DG-A-19` filed one finding in two halves: two prop
 * spellings for one idea, and a spread of glyph sizes with no per-context constant anywhere.
 *
 *   • The PROP half closed well. `size` was deleted from `GlyphProps`, so reintroducing it is
 *     a compile error — a guard earned by deleting something rather than by writing one.
 *   • The SIZE half was never done at all, and the reason is worth more than the finding:
 *     ⛔ DG-A-19 APPEARED IN NO STEP ROW OF THE DESIGN GATE'S OWN WORK ORDER. The gate closed
 *     45/45 over a population that never contained it. A score computed over a hand-chosen
 *     population cannot see what was left out — the gate was not wrong, it was never asked.
 *
 * ⭐ SO THIS GUARD'S POPULATION IS DISCOVERED, NEVER LISTED. It walks every `.tsx` under
 * `src/`. A guard that enumerates its own files reproduces exactly the blindness that let
 * DG-A-19 survive a programme built to catch it.
 *
 * It asserts two things, and the SECOND is the one that makes it a ratchet rather than a
 * rubber stamp:
 *
 *   1. NO NEW SIZE. Every `s={N}` in the tree is a value that was already in use when this
 *      guard was written. Drift upward goes red.
 *   2. NO SLACK. Every frozen value must still be USED by at least one call site. ⛔ Without
 *      this half a ratchet can only overstate debt: sizes get consolidated away, the allow-list
 *      keeps permitting them, and the guard stays green while quietly licensing a re-entry for
 *      a value nothing renders any more. When this half goes red the fix is to DELETE the value
 *      from FROZEN — the ratchet tightening is the guard working, not the guard failing.
 *
 * ⚠️ WHAT THIS GUARD DOES NOT CLAIM. It does not say the spread is GOOD — 19 sizes is not a
 * scale, it is a history. It says the spread cannot GROW while the collapse is deferred. The
 * per-context constants (`GLYPH`, `plateGlyph`) in `src/components/ui/glyphs.tsx` are the home
 * a future collapse works from.
 *
 * Prove it can fail:  npm run red:icon-sizes
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PROVE_RED = process.argv.includes("--prove-red");

/**
 * The sizes in use on 2026-09-11, measured off the tree — not chosen, not designed.
 * ⛔ Adding a number here is a DESIGN decision and needs a reason in the commit message.
 * Removing one is free, and is what progress looks like.
 */
const FROZEN = new Set([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 96, 150]);

/** Walk every .tsx under src/ — DISCOVERED, never listed. See the header. */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = walk("src");
const seen = new Map<number, { file: string; line: number }[]>();

for (const f of files) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((text, i) => {
    for (const m of text.matchAll(/\bs=\{(\d+)\}/g)) {
      const n = Number(m[1]);
      if (!seen.has(n)) seen.set(n, []);
      seen.get(n)!.push({ file: f.replace(/\\/g, "/"), line: i + 1 });
    }
  });
}

// ⭐ THE CONTROL. A guard nobody has watched go red is a green light of unknown wiring, so
// `--prove-red` injects a size that is NOT frozen and nothing else. If the run below still
// passes with this present, the detector is broken and its green means nothing.
if (PROVE_RED) seen.set(37, [{ file: "src/__prove_red__.tsx", line: 1 }]);

// ⛔ AND THE SECOND HALF NEEDS ITS OWN CONTROL, because the two halves fail for opposite
// reasons and one passing proves nothing about the other. `--prove-red-slack` freezes a value
// nothing renders; if that stays green, the no-slack half is decorative.
if (process.argv.includes("--prove-red-slack")) FROZEN.add(41);

let failed = 0;
const bad = (m: string) => { failed++; console.log(`  ✗ ${m}`); };
const ok = (m: string) => console.log(`  ✓ ${m}`);

console.log(`\nICON SIZE RATCHET — ${files.length} .tsx files walked, ${seen.size} distinct sizes found\n`);

// 1 · NO NEW SIZE.
const introduced = [...seen.keys()].filter((n) => !FROZEN.has(n)).sort((a, b) => a - b);
if (introduced.length === 0) {
  ok(`no glyph size outside the frozen set (${FROZEN.size} values)`);
} else {
  for (const n of introduced) {
    const at = seen.get(n)!;
    bad(
      `s={${n}} is NOT in the frozen set — ${at.length} site(s), first at ${at[0].file}:${at[0].line}. ` +
      `Use a constant from \`GLYPH\` or \`plateGlyph()\` in src/components/ui/glyphs.tsx. ` +
      `If this size is genuinely a new context, add it to FROZEN and say why in the commit.`,
    );
  }
}

// 2 · NO SLACK — the half that keeps this a ratchet. See the header.
const unused = [...FROZEN].filter((n) => !seen.has(n)).sort((a, b) => a - b);
if (unused.length === 0) {
  ok("every frozen size is still used — the allow-list carries no slack");
} else {
  for (const n of unused) {
    bad(
      `s={${n}} is frozen but NO LONGER USED anywhere — delete it from FROZEN. ` +
      `Leaving it licenses a re-entry for a value nothing renders; a ratchet that only ever ` +
      `permits more than is needed cannot go red for the thing it was built to catch.`,
    );
  }
}

// 3 · THE PLATE THE GLYPH SITS ON HAS ONE HOME TOO.
//
// ⛔ WHY THIS LIVES IN THE SAME GUARD. `IconPlate` was built in stage 9 to end a micro-pattern
// retyped in eight places with four different radii — and its own note SAYS it consolidated
// them. It did not: six of the eight still carried a hand-rolled plate on 2026-09-11, and the
// only two that had moved were the two already using `rounded-control`, i.e. the ones that
// needed no moving. ⭐ A consolidation that migrates exactly the compliant sites leaves the
// defect it was built for completely intact, and its own note then reports success.
//
// There was also a NINTH site the note never listed (`profile/invite`, `rounded-[7px]`) — found
// by searching for the PATTERN, which is the only way a hand-written list of eight could have
// been checked at all. Hence: the population here is the pattern, never a list.
const plateRe = /place-items-center\s+rounded-\[/;
const handRolled: string[] = [];
for (const f of files) {
  const rel = f.replace(/\\/g, "/");
  if (rel.endsWith("src/components/ui/icon-plate.tsx")) continue; // the atom's own prose describes the pattern
  readFileSync(f, "utf8").split(/\r?\n/).forEach((text, i) => {
    if (plateRe.test(text)) handRolled.push(`${rel}:${i + 1}`);
  });
}
if (handRolled.length === 0) {
  ok("no hand-rolled icon plates — `IconPlate` is the only home for the family");
} else {
  for (const site of handRolled) {
    bad(
      `${site} retypes the icon-plate pattern with a one-off radius. Use <IconPlate size={…}> ` +
      `from src/components/ui/icon-plate.tsx — B10.2: each family has ONE radius, and an ` +
      `arbitrary \`rounded-[…]\` is a second definition site.`,
    );
  }
}

console.log(
  failed === 0
    ? `\nICON KIT — ${FROZEN.size} frozen sizes, no drift, no slack, no hand-rolled plates.\n`
    : `\n${failed} FAILURE(S) — the glyph kit is drifting again (DG-A-19).\n`,
);
process.exit(failed === 0 ? 0 : 1);
