# Lane UDDOT — Up & Down loses its golden dot: every nav tab alike (owner ruling, 2026-10-23) — lead asheib-f3, OMEGA

## Ali's ruling (record it verbatim, dated)
2026-10-23, asked which change he wanted after reporting that "people are misunderstanding and thinking there is a
certain notification there" ("please remove the golden dot, make it like other tabs please, cleanly, perfect … make it
everywhere needed"), he chose **"Remove Up & Down's dot"**: Up & Down looks exactly like Markets and More on the phone
menu and the desktop bar — no dot, the same colour as its siblings. Millionea keeps its gold diamond and its coloured
name (no dot; nobody reads those as a notification).

## Where the dot lives today (re-find every one; there may be more)
- Classic phone rail `src/components/layout/bottom-nav.tsx`: `/updown` carries `accent: true`; `<span className="kp-rail__dot">`
  ("the product-line dot, same 5px gilt mark as the desktop nav"); CSS `.kp-rail__dot` in `src/app/globals.css` (~7692).
- Classic desktop bar `src/components/layout/top-app-bar.tsx`: `accent: true` on `/updown` (two lists, ~124 and ~142);
  "its distinction moves to a 5px gilt dot plus `--brand-300`" — the accent's ink AND dot both go: Up & Down's link is
  drawn exactly as its siblings (same ink, same box, same hover, same lit state).
- Any other Up & Down accent dot or accent ink in navs (grep `accent`, `kp-rail__dot`, `gilt`, "product-line dot" across
  src/ — the journey rail already shelved its "Juu/Chini accent dot"). A notification dot (the bell's, Akaunti's unread
  dot) is NOT this and stays.

## Work
- Branch `claude/maswali-ud-dot` from `origin/claude/maswali-s5-r2-int` (it carries the phone rail's Millionea track and
  the Next.js 16.4.2 patch). Tree: create `C:/50pick-ssd/kipindi-mln-dot` with
  `git -C C:/50pick-ssd/maswali-coord-20261019 worktree add C:/50pick-ssd/kipindi-mln-dot -b claude/maswali-ud-dot origin/claude/maswali-s5-r2-int`,
  then give it a REAL node_modules by copying the gate tree's (16.4.2, Prisma client generated):
  `robocopy C:\50pick-ssd\kipindi-mln-gate\node_modules C:\50pick-ssd\kipindi-mln-dot\node_modules /E /MT:16 /NFL /NDL /NJH /NJS /NP`
  (a junction breaks Turbopack; never `npm ci` — this npm skips dependency install scripts).
- Heavy jobs: `bash $S/mln-slot-s5x.sh uddot <cmd…>`; ports 3720–3729; KP_SCRATCH_PORT 5494; scratch `$F/uddot/`.
- Remove the dot and the accent ink at their source (delete the dead `accent` plumbing and CSS — no dead code left:
  test:dead-css, css-vars-defined); one consistent rendering for every tab.
- Guards: find every suite that pins the accent (`git grep -l "kp-rail__dot\|accent\|gilt dot\|product-line dot" -- scripts/`:
  U43's bar-ink/market-rail suites, visual-pass suites, maswali-ui, millionea-shell, wallet-reach, classic-rail drive…) —
  flip each to the new rule (Up & Down drawn exactly as its siblings, no dot), with the ruling cited; ONE new guard that
  no nav item carries a product-line dot or accent ink (rail + desktop bar + journey), with a plant that puts the dot back.
- Shots and reads: the phone rail (dark and with Millionea drawn: `qa:classic-rail` RAIL=dark and RAIL=drawn on fresh
  servers) and the desktop bar at 1024/1280/1920, sw/en/zh, guest and player, lit on /updown and not lit; read every tile
  yourself (sw first): Up & Down's icon and label match Markets'/More's exactly (colour, size, position), nothing moved.
- Records (LANE-COMMON's last section): COMPLIANCE-DECISIONS (a dated owner entry, his words quoted, above the newest);
  DESIGN_AUTHORITY — the rule that set the accent (grep "product-line dot", "gilt", "accent" — the U43 / §B2a sections)
  rewritten to "every nav tab alike; no product-line dot"; MOBILE-VISUAL-PLAN or any U43 doc that states the accent as in
  force; code comments in bottom-nav.tsx / top-app-bar.tsx / globals.css.
- Gates at your head: tsc; `next build`; the reader suites (derive from your diff) and their red twins; qa:live at
  FEATURE_MILLIONEA=ACTIVE and at the default; classic parity against `$F/lead/r2gate/parity/parity-main-ac9fd7c21.json`
  with --allow-base (the lead names the round-2 differences; you name the dot's: every cell with Up & Down's link or
  track); `gh workflow run CI -R alisheib/kipindi --ref claude/maswali-ud-dot` (main's own CI fails only
  test:needle-rest, the same 35 cases — compare cases).
- Commit small (message via a file, `git commit -F`, subject `UDDOT <n>: …`, body ending with a blank line and
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), push after every commit (full refspec + ls-remote). Only the
  lead pushes `main`; report "READY TO PUSH at <sha>" when every gate is green.
