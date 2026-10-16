# `MASWALI-DESIGN-R2` — sending the commission (session D1)

> Part of the R2 commission folder; the folder's purpose and boundary are in [`BRIEF.md`](BRIEF.md). The tracker is
> [`MASWALI-PLAN.md`](../../MASWALI-PLAN.md). A Claude Code session on its own branch does all of this (AGENTS.md §4).
> **Ali only uploads and pastes.**

**A1 · Filing — done in S0 (2026-10-16).** Ali's rulings are recorded in `docs/COMPLIANCE-DECISIONS.md` § "2026-10-16 ·
Maswali Millionea — the management-reviewed proposal of 2026-10-16 is final; every 2026-08-29 Maswali ruling is void
(owner)", and the two 2026-08-29 entries are marked in place. The outbound record is this folder (the deviation from
DESIGN_AUTHORITY §0b's root row is recorded in `BRIEF.md`). In any `.md` whose path contains "design", never write the
front-door phrases that `test:design-one-door` rejects.

**A2 · Assemble outside the checkout.** Run from the repo root in Git Bash. `<OUTSIDE>` is outside the repo; the archive is `F:/50pick-design-archive`. `<SCRATCH>` is the session scratchpad.

First, write `<SCRATCH>/extract-globals.cjs` with your editor:
```js
const postcss = require(require.resolve("postcss", { paths: [process.cwd()] }));
const css = require("fs").readFileSync(0, "utf8");
const named = /\.(amount|gilt-|seal-|btn\b|btn-|eyebrow|mat-)/;
const keep = (n) =>
  (n.type === "rule" && n.selectors.some((s) => s.trim() === ":root" || named.test(s))) ||
  (n.type === "atrule" && /keyframes$/i.test(n.name));
const out = postcss.root();
postcss.parse(css).each((n) => {
  if (keep(n)) { out.append(n.clone()); return; }
  if (n.type === "atrule" && (n.name === "media" || n.name === "supports")) {
    const w = n.clone({ nodes: [] });
    n.each((c) => { if (keep(c)) w.append(c.clone()); });
    if (w.nodes.length) out.append(w);
  }
});
process.stdout.write(out.toString());
```
Then run:
```bash
git fetch origin
SHA=$(git rev-parse origin/main)
S9=${SHA:0:9}
DAY=$(date +%F)
OUT="<OUTSIDE>/MASWALI-DESIGN-R2-package-$S9"
mkdir -p "$OUT/01-law" "$OUT/02-values" "$OUT/03-symbols" "$OUT/04-language" "$OUT/05-r1/sources/assets" "$OUT/05-r1/glyphs" "$OUT/05-r1/artboards" "$OUT/06-frames"
g() { git show "$SHA:$1" > "$2"; }
g docs/DESIGN_AUTHORITY.md "$OUT/01-law/DESIGN_AUTHORITY.md"
g src/app/motion.css "$OUT/02-values/motion.css"
g src/app/state-tokens.css "$OUT/02-values/state-tokens.css"
g tailwind.config.ts "$OUT/02-values/tailwind.config.ts"
git show "$SHA:src/app/globals.css" | node "<SCRATCH>/extract-globals.cjs" > "$OUT/02-values/globals-extract.css"
g src/components/ui/glyphs.tsx "$OUT/03-symbols/glyphs.tsx"
g src/lib/brand-mark.ts "$OUT/03-symbols/brand-mark.ts"
for m in color dark simplified white; do g "public/brand/mark-$m.svg" "$OUT/03-symbols/mark-$m.svg"; done
g src/components/markets/win-celebration.tsx "$OUT/03-symbols/win-celebration.tsx"
g docs/design-brief/handover-2026-08/LANGUAGE-AND-CONTENT.md "$OUT/04-language/LANGUAGE-AND-CONTENT.md"
g src/lib/i18n-dict.ts "$OUT/04-language/i18n-dict.ts"
R=docs/design-brief/maswali-2026-08/handover
for f in DECISIONS.md OPEN-QUESTIONS.md sources/A-slip.dc.html sources/B-receipt.dc.html sources/C-money-figure.dc.html sources/D-tier-glyphs.dc.html sources/support.js sources/assets/mark-color.svg glyphs/millionea.svg artboards/A-slip-partial-360-sw.png artboards/A-slip-ready-360-sw.png artboards/B-receipt-360-sw.png artboards/C-figure-mono-360-en.png; do g "$R/$f" "$OUT/05-r1/$f"; done
```

**A3 · Check the package (falsifiable).** Expected results:
- the first two counts are equal;
- the `--rh-close` line sits under `@media (min-width: 768px)`;
- the last command shows non-zero counts (R1's canvases link the stale file, and the prompt tells Claude Design to re-point them).
```bash
git show "$SHA:src/app/globals.css" | grep -cE '^\s*@keyframes'
grep -cE '^\s*@keyframes' "$OUT/02-values/globals-extract.css"
grep -n -B3 -- '--rh-close: var(--sp-12)' "$OUT/02-values/globals-extract.css"
grep -c 'tokens-locked' "$OUT"/05-r1/sources/*.dc.html
```

**A4 · Write the prompt and stamp.** Use your editor, never `printf` or `sed`.
- `PROMPT.txt`: a copy of this folder's `PROMPT.txt` placed in the package, with `{FULL_SHA}` and both
  `{YYYY-MM-DD}` filled in the copy only.
- `STAMP.txt`: the commit, the cut date, and "every file is a copy of that commit; if the repo has moved, rebuild, never resend".

**A5 · Capture `06-frames`.** Use a local server at `$SHA` from an SSD worktree under `C:\50pick-ssd\` (AGENTS.md §10):
- the journey through the staff-preview doors in `scripts/live/journey-pass.mjs`, with the demo player;
- the seal through the `qa:seal` drive (`scripts/qa-seal-drive.mjs`);
- the list in prompt §15. Check every frame by eye for QA personas only. Never commit these frames.

**A6 · Zip and hand over.**
```bash
powershell -NoProfile -Command "Compress-Archive -Path '<OUTSIDE>\MASWALI-DESIGN-R2-package-<S9>\*' -DestinationPath '<OUTSIDE>\MASWALI-DESIGN-R2-package-<S9>.zip'"
```
Ali's instruction: "Open Claude Design, start a new project, upload the zip, paste all of PROMPT.txt as the first message, send." If the upload refuses the 577 KB dictionary, the session replaces it with a key excerpt and notes that in STAMP.txt. Ali does not decide this.

**A7 · Record the send.** In the same session: fill the stamp into `PROMPT.txt`'s copy in the package (never into the tracked
`PROMPT.txt`, which stays the record with its placeholders), write the send date and the stamp SHA into
`MASWALI-PLAN.md` §0, set D1 ✅ citing that commit, and change `BRIEF.md`'s status line to SENT.
