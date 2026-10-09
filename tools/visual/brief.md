# The visual perfection pass — shared brief (read fully before starting)

50pick is a Tanzanian real-money prediction market (trilingual sw/en/zh, one dark royal theme). Vodacom, the partner the
new "journey" shell is built for, is extremely critical: the owner's rule (Ali, 2026-10-08) is **only perfect visual and
logical results are accepted; visual perfection is above everything; take the time it needs.** You own one group of
reported imperfections. For EACH item, in order:

1. **Look.** Open the named tiles (real-browser screenshots, one viewport each) with the Read tool:
   `C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad\wp12\tiles\`
   — names are `<seq>--<section>--<route>--<viewer>--<state>--<locale>--<width>.png`; find a tile by its 3-digit seq
   prefix. They were taken on an older tree; the branch you work on already fixes: the RG page's hydration, English month
   words, the frozen-wallet notice box, the rail's focus ring, the hub card's corner ring, the Needle row's size, wallet
   names breaking, the withdraw balance's face. Ignore those.
2. **Measure, don't eyeball.** Readers who reported these items estimated pixel positions, and at least one claim
   measured false. Where a claim is about position, size, gap, alignment or overlap, measure it in the PNG with
   PowerShell (Add-Type -AssemblyName System.Drawing; [System.Drawing.Bitmap]::FromFile(...); GetPixel scans along a
   row or column against the background colour). Say CONFIRMED or REFUTED with the numbers.
3. **Find the cause in the code** (file:line): components under src/components and src/app, CSS in src/app/globals.css
   (and motion.css). ⚠️ The Tailwind spacing scale is OVERRIDDEN in this repo (tailwind.config.ts ~200-215: `h-9` is NOT
   36px) — read the config before using scale classes; the codebase uses literals like `h-[40px]` for that reason.
4. **Fix the layout, never the words.** No dictionary string (src/lib/i18n-dict.ts) changes: corrections to words players
   see ship with a later release (S12). Fix with CSS/markup: grouping elements that must wrap together, `white-space:
   nowrap` on units that must not break, `text-wrap: balance|pretty` for widows and orphans, gaps, alignment, layout.
   Hold the design rules: DESIGN_AUTHORITY.md (money is `.amount`: mono, tabular; gold only where §M3 allows; tap targets
   ≥ 44px (--tap-min/--h-control-*), focus rings visible and whole, the type ladder §T1-T5, no text below the reading
   floor). Keep the DOM order = reading order = keyboard order. Prefer the smallest change that fixes the cause for every
   width and language, not a patch for one tile.
5. **Predict the result** at 320, 360, 390, 412, 768, 1024, 1280 in sw, en and zh — the parent re-tiles everything in a
   real browser after the pass and every tile is read again, so explain what each tile will look like afterwards.
6. **Prove what can be proved without a browser**, with real exit codes: `npx tsc --noEmit -p .` if any .ts/.tsx changed;
   and every suite that reads a file you touched (`grep -rln "<file name>" scripts`), plus: test:ui-consistency,
   test:density-contract, test:design-frozen, test:measure, test:type-scale, test:tokens, test:dead-css,
   test:css-vars-defined, test:stacking, test:journey-shell, test:journey-account, test:journey-tickets,
   test:gold-is-money, test:contrast, test:hooks-order. A suite that pins the old markup or CSS gets updated only if the
   pin itself is what the fix changes — say so explicitly, and keep its intent.

**Hard rules:** work ONLY in your own worktree (named in your task). Do NOT commit, push, start a dev server, run a
browser or Playwright, run `npm run build`, use `git stash` (shared with other sessions), or touch any other folder.
Edit with the Read/Edit/Write tools (Git Bash mangles backslashes in heredocs and `node -e`); files are CRLF — keep them.
Other helpers work on other groups in parallel, in other worktrees, and may edit other parts of globals.css: keep your
CSS changes inside the existing rules/sections they belong to, minimal and well commented (date 2026-10-08, the tile
numbers, why).

**Report** (concise): per item — CONFIRMED/REFUTED with the measurement, the cause (file:line), the fix (what changed
and why), the predicted result per width/locale, any risk; anything you could not fix without changing words (say what
copy change would fix it, for S12); then `git diff --stat`, `git diff --check`, and every command's exit code.
