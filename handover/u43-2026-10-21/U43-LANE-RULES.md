# U43 CI-repair helper lanes — shared rules (lead: asheib-bb, OMEGA-COMPILE01, 2026-10-21)

Context: 50pick (real-money prediction market, repo alisheib/kipindi). Codex pushed U43 "Release B" (Up & Down board,
round card, market card) to `main` at a12f7b26d…3ec111a83 (+ dd1386f06 gold restore). `main`'s CI has been red since:
~24 suites that READ files Release B changed now fail. Ali (owner) wants U43 finished perfectly, CI green, live.
From 2026-10-21 only Claude sessions work on this (Codex is out).

Read `AGENTS.md` at your tree's root first (the repo's working rules; §4 and §8 especially). Then your brief.

## Where you work
- ONLY your own worktree `C:\50pick-ssd\kipindi-<lane>` on branch `<lane>` (already created, own `npm ci`, prisma
  generated, scratch-Postgres runtime present). Base = branch `u43-seal` (the lead's branch).
- Never touch another worktree, `F:\kipindi-main`, or `main`. Never push anything. Never `git stash` (one stash stack is
  shared by every worktree on this PC). Never `git add -A` / `git add .` — stage by name. Commit with a message FILE:
  write it with the Write tool, then `git commit -F <file>`; end every message with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Shell: Git Bash eats backslashes even in quoted heredocs — write/modify files with the Write/Edit tools, not shell
  strings. Prefix `export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'` for npm/tsx runs.
- Heavy jobs (anything that boots scratch PostgreSQL — `db-scratch`, `*-db` suites, suites that print "Scratch cluster";
  `tsc`; `next build`; a `red:*` harness that runs DB suites) go through the slot helper:
  `bash C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/369118b0-cff5-4315-9366-aad1558bd40d/scratchpad/u43-slot.sh <lane>-<tag> <command...>`
  with your own `KP_SCRATCH_PORT` (given in your brief). Light in-memory suites run directly. One DB suite at a time
  per worktree (`.pgscratch` is per checkout).
- A `red:*` harness that plants into a source file must leave `git status` clean after it runs; check it. If a
  harness is interrupted, restore with `git checkout -- <file>` and delete its leftovers (`.red-*.lock`, `*.bak`).

## How to repair a guard (never weaken one)
1. Reproduce the failure in your tree: `npm run test:<suite>`. Read the failing assertion's code AND the source it reads.
2. Find what Release B changed: `git log --oneline a504ad280..u43-seal -- <source file>`; `git diff a504ad280 u43-seal -- <file>`.
   a504ad280 = main just before Release B (its CI had only 7 known reds, none of yours).
3. Decide which case it is, and write it down:
   (a) the source MOVED / was re-shaped but its behaviour and the guarded property still hold → re-point the guard to
       the new shape (new anchor text, new line pin, new census count with each new site classified), with a dated
       comment `// 2026-10-21 · U43 Release B (<commit>) …` saying what moved and why the property still holds. Keep the
       assertion as strong or stronger. Never delete an assertion, never widen an allow-list without naming each new
       entry and its reason, never replace an exact check by a looser one (no polling instead of an exact read, no
       `>=` instead of `===`).
   (b) the source CHANGED BEHAVIOUR in a way that breaks the guarded property (a player/money/truth regression) → do NOT
       paper over it in the test. STOP on that suite, and report it to the lead with file:line evidence and a proposed
       source fix (diff). Only the lead edits `src/` unless the brief says otherwise.
4. Prove the repaired guard still bites: run the suite's own CONTROL checks and its `red:<suite>` twin if one exists
   (`grep -n '"red:' package.json`); if a check you re-pointed has no mutation proof, plant the defect by hand in a
   scratch copy or an in-memory string (or a short-lived on-disk plant you restore byte-for-byte) and show the guard
   fails, then passes again after restore.
5. Also run every OTHER suite that reads the files you touched (`git grep -l '<file>' -- 'scripts/*'`), light ones at
   least, so a repair does not break a sibling.

## Shared files
`package.json`: avoid editing it; if a new `red:*` entry is truly needed, say so in your report instead of adding it.
Do not edit files owned by other lanes unless your brief names them: Phosphor (glyph census, `scripts/glyphs/*`, kit
doors, D19a `house-bot-absence-cases.mts`) and Maswali (`scripts/lib/maswali-*`, Millionea files) — if a repair needs
one, report it and stop on that item.

## Report (your final message — the lead only sees this)
Per suite: status before → after (pass/fail counts), root cause in one or two sentences, case (a) or (b), files changed,
the proof that the guard still bites (which control/red, caught N/N), sibling suites re-run. Then: commits made (sha +
subject), anything you could not finish and why, anything that looked like a real product bug. Keep it factual: what
ran, what passed, what failed, what was not run.
