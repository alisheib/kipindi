/**
 * `npm run qa:dg-eyebrow` — the §T3 eyebrow onto its rung. DG-A-11 / DG-P-06.
 *
 * ⭐ WHAT §T7 UNBLOCKED. DG-A-11's open question was *"there is no `--type-*` rung at 10, so
 * putting the eyebrow on the ladder costs +1px on 254 labels"*. That was asked of the CSS
 * ladder, which no call site can reach. `text-micro` **is** 10px in the Tailwind ladder — the
 * only one a `.tsx` file can use — so the eyebrow is already on a rung and the +1px (measured
 * at **+9.63px of width on "TOTAL SETTLED"**, ~10%) is never paid. This tool only renames the
 * spelling: `text-[10px]` → `text-micro`, same pixels, one fewer arbitrary.
 *
 * ⛔ THE SAFETY CONDITION, AND IT IS NOT COSMETIC. A Tailwind rung is a TUPLE: `text-micro`
 * also emits `letter-spacing: 0.4px`. An eyebrow that carries an explicit `tracking-*`
 * overrides that (every `.tracking-*` rule is emitted after every fontSize rung in the served
 * sheet — bytes 52,048-52,952 against a last rung at 51,022, so at equal (0,1,0) the tracking
 * wins on source order). One that does NOT carry tracking would silently GAIN 0.4px per glyph.
 * So this tool rewrites a site only when it is `uppercase` AND carries an explicit tracking.
 * ⚠️ Measured 2026-08-29: **242 of 242 qualify and 0 do not** — but the check stays, because
 * the next eyebrow somebody writes may not carry tracking, and then the tool must refuse it
 * rather than move it 0.4px.
 *
 * ⛔ IT MUST NOT ZERO A RATCHET WITHOUT MOVING A GLYPH. `text-micro` is inside
 * `type-scale.test.mts` §3's population (§3 counts `text-[Npx]` ∪ {micro, caption, label}), so
 * §3 stays FLAT across this sweep while §4 falls by exactly the number rewritten. That pair of
 * numbers is the proof the sweep was real; the same trap once made 509 of §3's 768 zeroable by
 * a rename that changed nothing.
 *
 * ⚠️ A VARIANT PREFIX IS PRESERVED: `sm:text-[10px]` becomes `sm:text-micro`, never a bare
 * `text-micro` that would apply at every width (`password-input.tsx` pairs `text-[12px]` with
 * `sm:text-[10px]`, and flattening that would resize the phone).
 *
 * Usage:
 *   node scripts/design-gate/eyebrow-sweep.mjs           # DRY RUN
 *   node scripts/design-gate/eyebrow-sweep.mjs --apply
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const APPLY = process.argv.includes("--apply");
const walk = (d) => readdirSync(d).flatMap((e) => {
  const p = join(d, e);
  return statSync(p).isDirectory() ? walk(p) : (/\.tsx$/.test(e) ? [p] : []);
});

/** `text-[10px]` with any variant prefix (`sm:`, `group-hover:`, `dark:` …). */
const SIZE = /((?:[a-z0-9._-]+:)*)text-\[10px\]/g;
const TRACKED = /\btracking-\[|\btracking-(?:wide|wider|widest)\b/;

let changed = 0, refusedNoTrack = 0, refusedNotEyebrow = 0, files = 0;
const refusals = [];

for (const f of walk(SRC)) {
  const src = readFileSync(f, "utf8");
  if (!src.includes("text-[10px]")) continue;
  const rel = relative(SRC, f).split(/[\\/]/).join("/");
  const lines = src.split("\n");
  let touched = false;

  lines.forEach((line, i) => {
    if (!SIZE.test(line)) return;
    SIZE.lastIndex = 0;
    if (!/\buppercase\b/.test(line)) { refusedNotEyebrow++; return; }
    if (!TRACKED.test(line)) {
      refusedNoTrack++;
      refusals.push(`${rel}:${i + 1}  ⛔ uppercase but NO explicit tracking — would GAIN 0.4px/glyph`);
      return;
    }
    const n = (line.match(SIZE) || []).length;
    lines[i] = line.replace(SIZE, "$1text-micro");
    changed += n; touched = true;
  });

  if (touched) { files++; if (APPLY) writeFileSync(f, lines.join("\n")); }
}

console.log(`${changed} eyebrow site(s) in ${files} file(s) ${APPLY ? "REWRITTEN" : "would change"}`);
console.log(`refused: ${refusedNoTrack} uppercase-without-tracking · ${refusedNotEyebrow} not an eyebrow (no uppercase)`);
if (refusals.length) console.log(`\n${refusals.map((r) => "   " + r).join("\n")}`);
if (!changed && !refusedNoTrack && !refusedNotEyebrow) {
  console.error("🔴 ZERO sites examined — a skipped run, not a clean tree."); process.exit(3);
}
