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

/** ⭐ `--off-ladder` — THE SIZES THAT ARE NOT RUNGS, AND THE RULING THAT DECIDES THEM.
 *  8 · 8.5 · 9 · 9.5 · 10.5 · 11.5 · 15 are on NEITHER Tailwind rung, so each is a size
 *  change and the default mode refuses all 139 of them. `DESIGN_AUTHORITY` §T7 (ruled
 *  2026-08-29) settles what an eyebrow written at a call site takes: **`text-micro`** — the
 *  only ladder a `.tsx` file can reach, the mode of the 557-site microlabel census (341, 61%),
 *  the rung `FieldLegend` itself carries, and the rung ~343 sites already sit on after two
 *  shipped sweeps. So the destination is one value for all of them and it is not a taste call.
 *  ⛔ 9.5 and 8.5 ARE `--type-label` / `--type-nano`, §T3's blessed sub-micro tier — but that
 *  tier lives on the CSS ladder, whose only legal consumers are rules inside `globals.css`
 *  (§T7). Reading a `--type-*` name and typing its number at a call site is exactly how the
 *  two ladders got confused in the first place. ⛔ And minting a Tailwind rung at 9.5 is the
 *  move §T7 already refused: 11/10/9.5/8.5 inside 2.5px is "two rungs no reader can tell
 *  apart", the objection `.admin-tbl`'s own ruling sustained.
 *  ⚠️ THE COST IS REAL AND IS NOT ZERO, unlike the 10px pass: +0.5px on the 9.5s, +1 on the
 *  9s, +1.5 on the 8.5s, +2 on the one 8, −0.5 on the 10.5s. Every site was read individually
 *  before this list was written (153 classified, 61 adversarially re-checked); the ones where
 *  the string is not an eyebrow at all are in EXCEPTIONS below and this tool refuses them. */
const OFF_LADDER = process.argv.includes("--off-ladder");
const OFF_LADDER_DEST = "text-micro";
const OFF_LADDER_SIZES = new Set([8, 8.5, 9, 9.5, 10.5, 11.5, 15]);

/** ⛔ THE SITES THIS SWEEP MUST NOT TOUCH, each with the law that exempts it. Every one was
 *  found by READING THE STRING — a size sweep cannot see that a "microlabel" is a sentence,
 *  and §T3 says the sub-micro tier is ⛔ NEVER reading copy while §T4 puts the reading floor
 *  at 12.5px. Moving these to `text-micro` would put prose one rung further below the floor
 *  and call it progress. They are per-site design calls and are made by hand, not here. */
const EXCEPTIONS = new Map([
  ["app/admin/payments/page.tsx:213", "PROSE — \"Unmatched movements — match to a PSP ref or write off (A3)\" is a sentence dressed as an eyebrow. §T3/§T4: text-body-sm + drop uppercase/tracking."],
  ["app/admin/payments/payout-status-control.tsx:137", "PROSE — \"Note shown to players (optional — blank uses the translated default)\" is a label AND a hint in one element. Split them; the hint is prose."],
  ["app/admin/payments/kill-switch-toggle.tsx:70", "PROSE — a full sentence about pausing a real-money rail. §T3/§T4: text-body-sm + drop the eyebrow dressing."],
  ["components/onboarding/first-visit-primer.tsx:213", "PROSE — \"losers fund winners · …\" is the primer's explanatory caption, not a label."],
  ["components/ui/modal.tsx:552", "NOT A LABEL — this is ConfirmModal's hard-tier type-to-confirm <input> itself. It is the thing being typed into, so it takes text-body-lg (16) and KEEPS its uppercase + tracking-[0.2em]."],
]);
const SIZE = /((?:[a-z0-9._-]+:)*)text-\[([0-9.]+)px\]/g;
const TRACKED = /\btracking-\[|\btracking-(?:wide|wider|widest)\b/;

let changed = 0, refusedNoTrack = 0, refusedNotEyebrow = 0, offLadder = 0, files = 0, exempted = 0;
const refusals = [];
const exemptions = [];
/** ⛔ THE OFF-LADDER SITES ARE LISTED, NOT MERELY COUNTED (2026-08-29). This tool printed
 *  "139 OFF-LADDER" and named none of them, while the handover cited it as *the list* of
 *  per-site calls to make — a number nobody could act on, quoted as a work order. Same shape
 *  as `qa:dg-money`, which lists its 14 and always did. */
const offLadderSites = [];

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
      let rung = RUNG[Number(px)];
      if (!rung && OFF_LADDER && OFF_LADDER_SIZES.has(Number(px))) {
        const key = `${rel}:${i + 1}`;
        if (EXCEPTIONS.has(key)) {
          exempted++;
          exemptions.push(`${key}  ${px}px  ⛔ ${EXCEPTIONS.get(key)}`);
          return whole;
        }
        rung = OFF_LADDER_DEST;
      }
      if (!rung) {
        offLadder++;
        offLadderSites.push(`${rel}:${i + 1}  ${px}px  ⛔ OFF-LADDER — a size change, so a per-site design call`);
        return whole;
      }
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
if (offLadderSites.length) {
  console.log(`\n⛔ the off-ladder eyebrows, which this tool will never touch${OFF_LADDER ? " (pass --off-ladder to move them onto §T7's rung)" : ""}:`);
  console.log(offLadderSites.map((r) => "   " + r).join("\n"));
}
if (exemptions.length) {
  console.log(`\n⛔ ${exempted} site(s) EXEMPTED by name — a size sweep cannot see that a "microlabel" is a sentence:`);
  console.log(exemptions.map((r) => "   " + r).join("\n"));
}
/* ⛔ CONTROL — every exemption must still be FOUND. An exemption for a line that has moved is
   an exemption that silently stops protecting anything, and the sweep would then rewrite the
   prose it was written to spare. */
if (OFF_LADDER && exempted !== EXCEPTIONS.size) {
  console.error(`\n🔴 ${EXCEPTIONS.size} exemption(s) declared but ${exempted} matched — a line has moved. Re-derive before applying.`);
  process.exit(4);
}
if (!changed && !refusedNoTrack && !refusedNotEyebrow && !offLadder) {
  console.error("🔴 ZERO sites examined — a skipped run, not a clean tree."); process.exit(3);
}
