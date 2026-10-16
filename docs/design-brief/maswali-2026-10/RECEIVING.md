# `MASWALI-DESIGN-R2` — receiving the delivery (sessions D2 and D3)

> Part of the R2 commission folder ([`BRIEF.md`](BRIEF.md)). When Ali hands over a zip and says "MASWALI-DESIGN-R2",
> read this first. Work on your own branch; push `main` only if you are the release owner. The tracker is
> [`MASWALI-PLAN.md`](../../MASWALI-PLAN.md).

**Step 0 · Recognise it.** Ali hands over a zip and says "MASWALI-DESIGN-R2". Read this protocol first. Work on your own branch; push `main` only if you are the release owner.

**Step 1 · Land it outside the repo.**
- Extract to `<OUTSIDE>/MASWALI-DESIGN-R2/inbox-<date>/`. Never extract into the checkout: `test:design-one-door` globs the disk.
- Run `find "$INBOX" -name DESIGN_AUTHORITY.md`. Any hit is a packaging fault.
- Run `find "$INBOX" -name '*.css' -not -path '*/motion/tokens/*' -not -name maswali-motion.css`. Any hit is an extra token copy.

**Step 2 · Export completeness, before judging anything.**
- Every canvas named in FRAME-INDEX is in `sources/`, and `support.js` and `assets/` are present.
- `grep -rl tokens-locked "$I/sources"` returns nothing.
- The `motion/*.html` files open offline.
- If only a claude.ai URL was sent: export every file and record the URL.
- Commit the raw sources on your branch the same day.

**Step 3 · The mechanical checks.** Every hit in the colour, timing and gold detectors is read by hand: they detect presence; they do not judge values (AGENTS.md §8).
```bash
export LC_ALL=C
I="<OUTSIDE>/MASWALI-DESIGN-R2/inbox-<date>/MASWALI-DESIGN-R2"
W="<OUTSIDE>/MASWALI-DESIGN-R2/check-<date>"
SHA="<the 40-character commit in STAMP.txt>"
mkdir -p "$W"
X="--exclude-dir=tokens --exclude=support.js --exclude-dir=assets"
grep -rhoE 'var\(\s*--[a-zA-Z0-9-]+' $X --include='*.html' --include='*.css' "$I/sources" "$I/motion" | sed -E 's/var\(\s*//' | sort -u > "$W/used.txt"
awk '/<!-- USED:BEGIN -->/{p=1;next} /<!-- USED:END -->/{p=0} p' "$I/TOKENS-USED.md" | grep -oE -- '--[a-zA-Z0-9-]+' | sort -u > "$W/declared.txt"
awk '/<!-- RUNTIME:BEGIN -->/{p=1;next} /<!-- RUNTIME:END -->/{p=0} p' "$I/MOTION.md" | grep -oE -- '--[a-zA-Z0-9-]+' | sort -u > "$W/runtime.txt"
for f in src/app/globals.css src/app/motion.css src/app/state-tokens.css; do git show "$SHA:$f"; done | grep -oE -- '--[a-zA-Z0-9-]+\s*:' | sed -E 's/\s*:$//' | sort -u > "$W/have.txt"
sort -u "$W/have.txt" "$W/runtime.txt" > "$W/allowed.txt"
sort -u "$W/declared.txt" "$W/runtime.txt" > "$W/listed.txt"
echo "== used, not defined at the stamp: must be empty"
comm -23 "$W/used.txt" "$W/allowed.txt"
echo "== used, not listed in TOKENS-USED or RUNTIME: must be empty"
comm -23 "$W/used.txt" "$W/listed.txt"
echo "== a runtime name that shadows a token: must be empty"
comm -12 "$W/runtime.txt" "$W/have.txt"
echo "== listed, never used: report only"
comm -13 "$W/used.txt" "$W/declared.txt"
echo "== colour literals: expect none"
grep -rnE '(^|[^&])#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|color-mix\(|:\s*(white|black)\b' $X "$I/sources" "$I/motion"
echo "== raw timing and curves: expect none (a hit in notes prose is a NOTE; in CSS or JS a FAIL)"
grep -rnE '\b[0-9]*\.?[0-9]+m?s\b|cubic-bezier\(|steps\(' $X "$I/sources" "$I/motion"
echo "== infinite or pivot: expect none"
grep -rnE 'infinite|--m-pivot' $X "$I/sources" "$I/motion"
echo "== keyframes: only maswali-motion.css, at most 4"
grep -rc '@keyframes' $X "$I/sources" "$I/motion" | grep -v ':0$'
echo "== JS timing: expect none; read every setTimeout"
grep -rnE 'requestAnimationFrame|setInterval|\.animate\(|setTimeout\(|new Animation' --exclude=support.js "$I/sources" "$I/motion"
echo "== gold: judge each line against prompt 4a"
grep -rnoE -- '--(gilt|gold|g-jackpot|glow-jackpot|bet-jackpot|metal-gold)[a-z0-9-]*|gilt-(metal|ink)|btn-gold|value-flash|count-up' $X "$I/sources" "$I/motion"
echo "== front-door claims in any .md: expect none"
grep -rniE --include='*.md' 'start (here|there) for anything visual|this is the entry[ ]point|have no[ ]authority|read this before anything[ ]else|^#\s.*—\s*the rule ?book\s*$' "$I"
echo "== politics words: expect none"
grep -rniE 'uchaguzi|election|\brais\b|president|bunge|parliament|siasa|politic|chama cha|政治|选举' --exclude=support.js "$I/i18n-draft.json" "$I/sources"
```
Next, write `<SCRATCH>/r2-strings.cjs` with your editor. It checks i18n parity across nested keys, raw digits in strings, and emoji in UI text. Run it as `node "<SCRATCH>/r2-strings.cjs" "$I/i18n-draft.json" "$I/sources"`.
```js
const fs = require("fs"), p = require("path");
const [json, src] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(json, "utf8"));
const flat = (o, k = "") => Object.entries(o).flatMap(([a, v]) => v && typeof v === "object" ? flat(v, k + a + ".") : [[k + a, v]]);
const keys = (l) => flat(d[l]).map(([k]) => k).sort().join("\n");
console.log(keys("en") === keys("sw") && keys("sw") === keys("zh") ? `parity OK (${flat(d.en).length} keys)` : "PARITY FAIL");
const digits = ["en", "sw", "zh"].flatMap((l) => flat(d[l]).filter(([, v]) => /\d/.test(String(v).replace(/\{[^}]*\}/g, ""))).map(([k]) => `${l}.${k}`));
console.log("strings with a raw number:", digits.length, digits.slice(0, 20));
const walk = (x) => fs.readdirSync(x, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(p.join(x, e.name)) : [p.join(x, e.name)]);
let n = 0;
for (const f of [json, ...walk(src).filter((f) => /\.(html|svg)$/.test(f))]) {
  const hits = (fs.readFileSync(f, "utf8").match(/\p{Extended_Pictographic}/gu) || []).filter((c) => !/[\u00a9\u00ae\u2122\u2713\u2717]/.test(c));
  if (hits.length) { n += hits.length; console.log(f, hits.join(" ")); }
}
console.log("emoji in UI files:", n);
```
Glyph checks:
```bash
for f in "$I"/glyphs/*.svg; do echo "$f"; grep -oE 'viewBox="[^"]*"|stroke-width="[^"]*"|stroke-linecap="[^"]*"|stroke-linejoin="[^"]*"|fill="[^"]*"|stroke="[^"]*"' "$f" | sort | uniq -c; done
git show "$SHA:src/components/ui/glyphs.tsx" | grep -E '^\s*voidX:' | grep -oE '(r|d)="[^"]+"'
grep -oE '(r|d)="[^"]+"' "$I/glyphs/sealX.svg"
```
The last two must print identical values.

**Step 4 · Scoring sheet.** The rows follow prompt §14 in order. Each item is PASS, NOTE or FAIL; items 1–5 are gates.

| # | Item | How it is checked | If it FAILS |
|---|---|---|---|
| 1 | Export complete, re-pointed, no copies or extras | Steps 1–2 | Round 3 (export only) before judging |
| 2 | Tokens resolve, zero literals | Step 3, the four `comm` lists and the detectors | Map to the nearest token (L2); round 3 if structural |
| 3 | Gold list; no figure on held-ticket surfaces | Gold grep, then look at the S-, T- and X-frames | Ignore those frames; round 3 |
| 4 | Rules exact | T-, W- and P-frames against prompt §2 with Timelines A–E | Ignore the frame; round 3 |
| 5 | Motion limits | Greps; each prototype with both toggles; DevTools Animations panel | Unapproved motion is dropped (L6) |
| 6 | Loss and live calm | Visual, plus self-check 16 | Round 3 |
| 7 | 360 overflow and taps | PNG widths (360 × the stated scale); canvases at 360 in each locale | NOTE if one frame; FAIL if systemic |
| 8 | Swahili at 2.25× | The stretch frames | Fix the label in the build, or round 3 |
| 9 | Contrast | Their list, then `qa:contrast-rendered` at build | Darken the fill, never lighten the label |
| 10 | Chrome | Against `06-frames` | Ignore the drawn chrome (L8) |
| 11 | Words | Read against the dictionary | Fix in the build (L15) |
| 12 | Glyphs | SVG greps plus the 14px greyscale sheet | Redraw sealNil (round 3) |
| 13 | Coverage | FRAME-INDEX against the actual PNGs | Missing first-tier frames → round 3; the rest can be built from canvas states |
| 14 | Documents | Read through | NOTE |

**Step 5 · Ali's yes/no card (session D3).** These are the items still Ali's after the 2026-10-16 batch, so recommendations are allowed. Show each N on a real 4-core phone with the low-end toggle on.

| Item | What Ali sees | If Ali says no | Recommendation |
|---|---|---|---|
| N1 Kubeba | A reserve's ring flies into the voided question's slot; last week's leftover glides into this week's line | The ring changes in place, and "4 → A1" is printed | Yes, if it holds ≥50fps |
| N2 Kugonga Muhuri | Each result lands as a small stamp sliding down the logo's slant | The stamp just appears | Yes (it uses the bet stamp's own press) |
| N3 Kukata Tiketi | The stub separates when you buy and rejoins on a refund | The stub settles in place | Yes |
| N4 (if proposed) | — | — | Yes only if it passes every limit |
| `millionea` glyph | The three-pearl crown beside the name | The ticket glyph | Yes, after the 14px proof |
| IMESHINDA tone | The word "won" in success green, gold only on the amount | Neutral word | Yes |
| Home-card position | The card after the head, before the chips | Where Ali says | After the head |
| A1–A5 "Akiba" label | The reserve numbering | R1–R5 on screen | A1–A5 |

Record each answer with the date and Ali's quote. On a yes:
- write the dated "Millionea exceptions" paragraph into DA §M8;
- land the keyframes, classes and both clamp branches in `motion.css` in the build session that adds their first consumer (S5), because `test:dead-css` fails on a class with no consumer.

**Step 6 · File it.**
- Copy the raw delivery to `docs/design-system/v6-<YYYY-MM-DD>-millionea/` (v5 is the latest at `75e7290ee`).
- Do not file `motion/tokens/` or any rulebook copy, and record both removals.
- Write `INHERIT-MANIFEST.md` in v5's format:
  - §1 verdicts per file;
  - §2 Ali's Step 5 rulings;
  - §3 L-rows: every place where our law beats the delivery, starting with L1: the word "halisi" is never used for "real";
  - §4 open questions.

**Step 7 · Same commit: fix what is now stale.** Stage by name.
- `MASWALI-PLAN.md`: rewrite §0, tick D2 in §1, update the ▶ 0i count in `NEXT-PLAN.md`.
- `BRIEF.md` (this folder): status line → RECEIVED, with the delivery's folder named.
- Add rows to `docs/README.md` and `docs/design-system/README.md`, with no counts.
- Run `test:design-one-door`, `test:docs` and `test:maswali-plan` before committing.

**Step 8 · Round 3.** Send a delta prompt with:
- every FAIL and NOTE, with frame IDs and the grep output;
- the L-rows that change a drawing;
- Ali's rulings (a rejected N becomes its fallback);
- the OPEN answers obtained since;
- the R2 `sources/` attached back;
- a new live package and stamp, and the key `MASWALI-DESIGN-R3`.

**Settled since the prompt's critic wrote its open list (Ali, 2026-10-16, the accepted batch).** The prompt already
draws these as ruled: the licence basis is Ali's dated ruling · the tax-report lines are Finance's to confirm (Gate B) ·
no agent commission and no invite first-bet credit in v1 · the rounding remainder stays in the jackpot (a floor week's
top-up is reduced by it) · a cancelled ticket does not count toward the cap · the week-void band shows when the void is
certain and refunds follow the 24-hour check window on the voids that caused it · the lowest-numbered voided main takes
the first non-void reserve · the sunset week is announced a full week ahead, its payout carries the 13% fee and no
floor top-up without a 10/10 · a voided week's carried-in pool carries forward in full · a net-negative win still gets
the seal, with the net printed in U+2212 · the withdrawal line is generated from the live policy · weeks are numbered
as a product sequence from launch, dates beside them · the outbound record is this folder.
