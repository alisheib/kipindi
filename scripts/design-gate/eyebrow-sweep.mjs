/**
 * `npm run qa:dg-eyebrow` — the §T3 eyebrow onto its rung. DG-A-11 / DG-P-06.
 *
 * ⭐ WHAT §T7 UNBLOCKED. DG-A-11's open question was *"there is no `--type-*` rung at 10, so
 * putting the eyebrow on the ladder costs +1px on 254 labels"*. That was asked of the CSS
 * ladder, which no call site can reach. `text-micro` **is** 10px in the Tailwind ladder — the
 * only one a `.tsx` file can use — so the eyebrow is already on a rung and the +1px (measured
 * at **+9.63px of width on "TOTAL SETTLED"**, ~10%) is never paid. This tool only renames the
 * spelling — `text-[Npx]` → the rung that is ALREADY that many pixels — so the glyphs do not
 * move and one arbitrary disappears. Shipped in two passes: 242 sites at 10px, then 76 more
 * at 11/12/13/14 once the first batch had been driven on production and verified.
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

/** Every EXACT Tailwind rung. ⭐ Widened past 10px on 2026-08-29 once the 10px batch had
 *  shipped and verified: `text-caption` (11) · `text-label` (12) · `text-body-sm` (13) ·
 *  `text-body` (14) are rungs too, and an eyebrow written at exactly those values moves for
 *  the same reason and under the same safety condition. ⛔ 8 · 8.5 · 9 · 9.5 · 10.5 · 11.5 ·
 *  15 are NOT rungs — moving one is a SIZE change, i.e. a per-site design call, and this tool
 *  refuses them. `--type-label` (9.5) and `--type-nano` (8.5) are the CSS ladder's sub-micro
 *  tier and have no Tailwind key at all: §T7's frozen collision, not a sweep. */
const RUNG = { 10: "text-micro", 11: "text-caption", 12: "text-label", 13: "text-body-sm", 14: "text-body" };
const SIZE = /((?:[a-z0-9._-]+:)*)text-\[([0-9.]+)px\]/g;
const TRACKED = /\btracking-\[|\btracking-(?:wide|wider|widest)\b/;

let changed = 0, refusedNoTrack = 0, refusedNotEyebrow = 0, offLadder = 0, files = 0;
const refusals = [];

for (const f of walk(SRC)) {
  const src = readFileSync(f, "utf8");
  if (!/text-\[[0-9.]+px\]/.test(src)) continue;
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
    let n = 0;
    const next = line.replace(SIZE, (whole, variant, px) => {
      const rung = RUNG[Number(px)];
      if (!rung) { offLadder++; return whole; }
      n++; return `${variant}${rung}`;
    });
    if (!n) return;
    lines[i] = next;
    changed += n; touched = true;
  });

  if (touched) { files++; if (APPLY) writeFileSync(f, lines.join("\n")); }
}

console.log(`${changed} eyebrow site(s) in ${files} file(s) ${APPLY ? "REWRITTEN" : "would change"}`);
console.log(`refused: ${refusedNoTrack} uppercase-without-tracking · ${refusedNotEyebrow} not an eyebrow (no uppercase) · ${offLadder} OFF-LADDER sizes (8 · 8.5 · 9 · 9.5 · 10.5 · 11.5 · 15 — each a per-site size decision)`);
if (refusals.length) console.log(`\n${refusals.map((r) => "   " + r).join("\n")}`);
if (!changed && !refusedNoTrack && !refusedNotEyebrow && !offLadder) {
  console.error("🔴 ZERO sites examined — a skipped run, not a clean tree."); process.exit(3);
}
