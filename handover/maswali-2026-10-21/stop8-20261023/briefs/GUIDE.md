# Lane GUIDE — Ali's Millionea admin guide, final, as a PDF on his Desktop (lead asheib-f3, OMEGA)

## What Ali asked
"give me the pdf on desktop" — the admin guide: *"no unneeded wording, no unneeded things; clear, perfect for admins to
know how Maswali works, how they work it and what everything means"*. A DRAFT (the 19 Oct guide + a DRAFT box) is on
his Desktop now: `C:\Users\asheib\Desktop\Millionea admin guide (DRAFT 22 Oct 2026).pdf`. You replace it with the final.

## The source and the one rule
- The newest source is the S6-DOCS lane's guide (`docs/maswali-operator-guide.html`, three parts: how it works · how admins
  run it, 27 steps in a week's order · a glossary with every audit name) on `origin/claude/maswali-s6-docs` (8b00c8e57,
  merged into `origin/claude/maswali-s6-release`). Its test: `test:maswali-admin-guide` (+ red), which checks every quoted
  label against its console source.
- ⛔ THE ONE RULE: the guide describes EXACTLY the console that will be on production after this weekend's S7 + S6
  release — nothing more, nothing less. DOCS wrote it "to the console as it will be after S6-ADMIN", but S6-ADMIN built
  only G1 (no programme codes on admin screens) and its three base reds; G2 (a "Rules this week froze" card, the fee on
  Pools), G3 (names not ids), G4 (EAT times in refusals), G5 ("Discard draft"), G6/G9 (option labels), G7 (evidence
  search/filter) and G8 (lock chip words) are NOT built. Remove or rewrite every sentence that describes an unbuilt
  thing; where a gap matters to an admin, say plainly how it works today (one line, no apology, no programme talk).
  S7's objection door (Compliance rules on objections on /admin/maswali/integrity, MR-16 as built) IS shipping. The
  Auditor's read access (S6-DOCS 2, ruling (m)) ships only if the S6-SHIP lane includes it — ask main.
- Read the code to decide what ships: `origin/claude/maswali-s6-release` (the S6-SHIP lane, agent a3036ac03a0150588,
  is readying it; it merges S7 = `origin/claude/maswali-s7-s5`). Ask main if a feature's shipping status is unclear.

## Work
- Tree: a NEW worktree — `git -C C:/50pick-ssd/maswali-coord-20261019 worktree add C:/50pick-ssd/kipindi-mln-guide -b
  claude/maswali-s6-guide origin/claude/maswali-s6-release`. No `npm ci`: you need no node_modules for HTML→PDF if you run
  the render with the release tree's Playwright (`createRequire("C:/50pick-ssd/maswali-coord-20261019/package.json")`, see
  `$F/lead/pdf/render-draft.mjs`); for `test:maswali-admin-guide` run it from a tree with node_modules — junction
  `node_modules` to `C:/50pick-ssd/maswali-coord-20261019/node_modules` (static tsx tests run fine through a junction;
  remove the junction with `cmd /c rmdir` BEFORE you ever remove the worktree).
- Edit `docs/maswali-operator-guide.html` (the one source). Keep the three parts and Ali's standard: plain words, no
  programme codes (MB-/OD-/MR-/S5…), no history, nothing about how anti-abuse controls detect anything (PUBLIC repo).
- Render with the repo's method (`scripts/generate-pdfs.mjs`' settings: Chromium print, A4, the page's CSS) to
  `docs/50pick-maswali-operator-guide.pdf`; render every PAGE to PNG with `$F/lead/pdf/pdf-pages.ps1` and READ EVERY PAGE
  (layout: no clipped table, no orphan heading, no broken line; words: every label as the console shows it).
- Guards: `test:maswali-admin-guide` and `red:maswali-admin-guide` green (floors only to printed counts), `test:docs`.
- Commit (message via a file, `git commit -F`, subject `MASWALI-BUILD S6-GUIDE <n>: …`, body ending with a blank line and
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`); push `claude/maswali-s6-guide` (full refspec + ls-remote);
  tell main and the S6-SHIP lane (a3036ac03a0150588) the head so S6 merges it.
- Copy the final PDF to `C:\Users\asheib\Desktop\Millionea admin guide.pdf` and DELETE the draft
  `C:\Users\asheib\Desktop\Millionea admin guide (DRAFT 22 Oct 2026).pdf`.

## Report to "main"
The head sha, the page count, what you removed or rewrote (and why), the guards' printed results, the Desktop path.
