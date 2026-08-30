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
 * ⭐ AND THE SECOND HALF, `--tracking`, IS A GATE RATHER THAN A SWEEP. The rung above is the
 * eyebrow's SIZE; §T3's 2026-08-30 ruling is its TRACKING. That 308-site pass has landed, and
 * what stays is the invariant it established: **every uppercase-and-tracked site in `src/`
 * either carries `.eyebrow`, or its role has been READ and written down** in
 * `eyebrow-roles.mjs`. ⛔ A site in neither state is one nobody has read, and the gate exits 5
 * rather than guessing — because §T3 governs ONE of six roles here and nothing a regex can see
 * separates them. It is wired into `test:all` as `test:eyebrow-roles`: a gate that is not in
 * the pipeline is not a gate.
 *
 * Usage:
 *   node scripts/design-gate/eyebrow-sweep.mjs             # DRY RUN, the SIZE half
 *   node scripts/design-gate/eyebrow-sweep.mjs --apply
 *   npm run test:eyebrow-roles                             # the §T3 role gate
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { INLINE_EYEBROWS, NOT_EYEBROW } from "./eyebrow-roles.mjs";

/** ⭐ CLASSES THAT SUPPLY `text-transform: uppercase` FROM `globals.css`, so a call site that
 *  adopts one STOPS SAYING THE WORD and would otherwise drop out of this census silently.
 *  ⛔ `.eyebrow` IS NOT ONE OF THEM, and putting it here was a real bug for one run: §T3 gives
 *  that class `letter-spacing` and nothing else (its own comment says so — size, weight and
 *  colour vary by surface), so an eyebrow call site still writes `uppercase` itself and was
 *  already counted. Listing it made every `<PageHeader eyebrow="…">` PROP match, and the
 *  section-eyebrow total jumped 318 → 499 — an instrument inflating its own population, which
 *  is the same failure in the opposite direction. ⭐ The test is not "is it a design class" but
 *  "does this class carry `text-transform`". Only `.row-link` does. */
const CARRIER = /\brow-link\b/;

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const APPLY = process.argv.includes("--apply");
const TRACKING = process.argv.includes("--tracking");
const walk = (d, re = /\.tsx$/) => readdirSync(d).flatMap((e) => {
  const p = join(d, e);
  return statSync(p).isDirectory() ? walk(p, re) : (re.test(e) ? [p] : []);
});

/**
 * ⛔ COMMENTS ARE BLANKED BEFORE ANYTHING IS BELIEVED, LINE-PRESERVINGLY so `:line` stays
 * true. The first census of the tracking population matched the word "uppercase" inside JSDoc
 * and JSX comments and reported NINETEEN sites that render nothing — this programme's
 * signature failure, committed by its own instrument. A sweep that rewrote a comment would be
 * worse: it would edit the record of a past defect and leave the defect.
 */
function decomment(src) {
  let out = "", i = 0, mode = 0, quote = "";
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (mode === 0) {
      if (c === "/" && n === "*") { mode = 1; out += "  "; i += 2; continue; }
      if (c === "/" && n === "/") { mode = 2; out += "  "; i += 2; continue; }
      if (c === '"' || c === "'") { mode = 3; quote = c; out += c; i++; continue; }
      if (c === "`") { mode = 4; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === 1) { if (c === "*" && n === "/") { mode = 0; out += "  "; i += 2; continue; } out += c === "\n" ? "\n" : " "; i++; continue; }
    if (mode === 2) { if (c === "\n") { mode = 0; out += "\n"; i++; continue; } out += " "; i++; continue; }
    if (c === "\\") { out += "  "; i += 2; continue; }
    if ((mode === 3 && c === quote) || (mode === 4 && c === "`")) mode = 0;
    out += c; i++;
  }
  return out;
}

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

/* ═══ THE TRACKING HALF — §T3's 0.14em, by ROLE ═══════════════════════════════════════════ */
/**
 * ⭐ THIS HALF IS A GATE, NOT A SWEEP, AND THAT IS THE POINT. The 308-site pass landed on
 * 2026-08-30; what stays behind is the invariant it established:
 *
 *   EVERY uppercase-and-tracked site in `src/` either carries `.eyebrow`, or its role has
 *   been READ and written down.
 *
 * ⛔ A site in neither state is a site nobody has read, and the tool exits 5 rather than
 * guessing a role. That is the difference between a sweep that ran once and a rule that
 * holds: §T3 governs ONE of six roles here, and nothing a regex can see separates them.
 *
 * ⛔ AND THE DECLARATIONS ARE KEYED ON THE LINE'S CONTENT, NOT ON `:line`. A line number is
 * correct for exactly one commit — the next edit ANYWHERE above a declared site shifts it and
 * the entire read reports itself stale, which is how a gate becomes noise and then gets
 * deleted. A signature drifts only when somebody edits THAT element, which is exactly when a
 * re-read is warranted. ⚠️ The signature is the line PLUS what the element renders, because
 * the line alone is not unique: `admin/config/page.tsx` carries one class string four times
 * and two of those are prose while two are count annotations.
 */
if (TRACKING) {
  /* ⚠️ No trailing `\b` after the bracket form: in `tracking-[0.09em]">` there is no word
     boundary between `]` and `"`, so the first version of this label reported "untracked"
     over a tracked site. A report that mislabels what it found is a small lie, and this
     programme has paid for those. */
  const TRACK_TOKEN = /\btracking-(?:\[[^\]]*\]|(?:wide|wider|widest)\b)/;
  /** The same signature the generator wrote: this line, then the next non-empty one. */
  const sig = (lines, i) => {
    const head = (lines[i] ?? "").replace(/\s+/g, " ").trim();
    let tail = "";
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const t = (lines[j] ?? "").replace(/\s+/g, " ").trim();
      if (t) { tail = t; break; }
    }
    return (head + " ↵ " + tail).slice(0, 170);
  };

  let onClass = 0, inlineOk = 0, other = 0, onRowLink = 0;
  const undeclared = [], badInline = [], prose = [];
  const seenNot = new Map(), seenInline = new Map();

  for (const f of walk(SRC, /\.tsx?$/)) {
    const raw = readFileSync(f, "utf8");
    if (!/uppercase/.test(raw) && !CARRIER.test(raw)) continue;
    const rel = relative(SRC, f).split(/[\\/]/).join("/");
    const code = decomment(raw).split("\n");
    const lines = raw.split("\n");

    code.forEach((c, i) => {
      /* ⛔ A CARRIER CLASS MUST KEEP THE SITE IN THE CENSUS. This test used to be `uppercase`
         alone, which reads the DRESSING — so the moment DG-A-08 moved six row navigation links
         onto `.row-link` (whose `text-transform` lives in globals.css), all six vanished from
         the population and the total fell by six with nothing going red. That is this
         programme's signature failure — an instrument quietly choosing a smaller population —
         and it is the same shape as `type-scale` §3's blessing, which had to learn `.eyebrow`
         for exactly this reason on 2026-08-30. ⭐ The rule: a class that supplies `uppercase`
         is a CARRIER, and a carrier is counted, never skipped. */
      if (!/\buppercase\b/.test(c) && !CARRIER.test(c)) return;
      const line = lines[i];
      if (/\beyebrow\b/.test(c)) { onClass++; return; }
      if (/\brow-link\b/.test(c)) { onRowLink++; return; }
      const k = `${rel} :: ${sig(lines, i)}`;
      if (INLINE_EYEBROWS.has(k)) {
        seenInline.set(k, (seenInline.get(k) ?? 0) + 1);
        /* ⛔ ASSERTED, NOT TRUSTED. These are the eyebrows a class cannot reach, so their value
           is hand-written — and a hand-written value that drifts is exactly what a declaration
           is for. The window is the element, not the line: `brand.tsx` sets `letterSpacing` one
           line above `textTransform`. */
        const win = lines.slice(Math.max(0, i - 6), i + 7).join(" ");
        if (!/letterSpacing:\s*"0\.14em"|letter-spacing:\s*0\.14em/.test(win)) badInline.push(`${rel}:${i + 1}  declared an INLINE eyebrow but no 0.14em in its element window`);
        else inlineOk++;
        return;
      }
      if (NOT_EYEBROW.has(k)) {
        seenNot.set(k, (seenNot.get(k) ?? 0) + 1);
        other++;
        const role = NOT_EYEBROW.get(k);
        if ((Array.isArray(role) ? role[0] : role) === "PROSE") prose.push(`${rel}:${i + 1}  ${line.trim().slice(0, 108)}`);
        return;
      }
      /* A site with no tracking at all and no declaration is only a defect if it is meant to be
         an eyebrow — but that is exactly what nobody has decided, so it is reported either way. */
      undeclared.push(`${rel}:${i + 1}  ${TRACK_TOKEN.test(line) ? "tracked" : "untracked"}  ${line.trim().slice(0, 100)}`);
    });
  }

  console.log(`\n§T3 EYEBROW GATE — every uppercase-and-tracked site is READ or refused`);
  console.log(`  ${onClass + inlineOk} section eyebrow(s): ${onClass} carry \`.eyebrow\` · ${inlineOk} written inline (a class cannot reach an inline style)`);
  console.log(`  ${other + onRowLink} site(s) in another role — control label · status chip · data value · type-to-confirm · celebration · prose`);
  console.log(`     of which ${onRowLink} carry \`.row-link\` — the row navigation link, a CONTROL LABEL whose case and 0.10em live in globals.css (DG-A-08)`);
  if (prose.length) {
    console.log(`\n🔴 ${prose.length} PROSE site(s) — a sentence, or a label with its hint welded on, below §T4's`);
    console.log(`   12.5px reading floor while wearing an eyebrow's clothes. ⛔ 0.14em would make a paragraph`);
    console.log(`   read MORE like an identifier. This is DG-A-14's population, and it is a work order:`);
    console.log(prose.map((p) => "   " + p).join("\n"));
  }

  const missNot = [...NOT_EYEBROW].filter(([k, v]) => (seenNot.get(k) ?? 0) !== (Array.isArray(v) ? v[1] : 1));
  const missInl = [...INLINE_EYEBROWS].filter(([k, n]) => (seenInline.get(k) ?? 0) !== n);
  if (badInline.length) { console.error(`\n🔴 ${badInline.length} inline eyebrow(s) no longer read 0.14em:\n${badInline.map((m) => "   " + m).join("\n")}`); process.exit(6); }
  if (undeclared.length) {
    console.error(`\n🔴 ${undeclared.length} uppercase site(s) are neither \`.eyebrow\` nor declared — nobody has read them.`);
    console.error(`   ⛔ Read each one and add it to eyebrow-roles.mjs. This tool does not guess a role.`);
    console.error(undeclared.map((u) => "   " + u).join("\n"));
    process.exit(5);
  }
  if (missNot.length || missInl.length) {
    console.error(`\n🔴 ${missNot.length + missInl.length} declaration(s) no longer match anything — the element was edited, so the read is stale there.`);
    console.error([...missNot.map(([k]) => k), ...missInl.map(([k]) => k)].slice(0, 30).map((m) => "   " + m).join("\n"));
    process.exit(4);
  }
  if (!onClass && !other && !onRowLink) { console.error("🔴 ZERO sites examined — a skipped run, not a clean tree."); process.exit(3); }
  console.log(`\n✅ ${onClass + inlineOk + other + onRowLink} sites, every one accounted for.`);
  process.exit(0);
}

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
