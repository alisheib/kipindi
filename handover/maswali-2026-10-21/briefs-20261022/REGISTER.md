# Lane REGISTER — S5 round 2 (the Week register `/millionea/register`, a week, How to play `/millionea/how`)

- Tree `C:/50pick-ssd/kipindi-mln-dreg` · branch `claude/maswali-s5-r2-register` · head `a8e25a07d` (no WIP; commit 13 ran tsc 0;
  commit 14 lists suites but no tsc).
- Step `S5-R2-REGISTER` · ports 3580–3589 · `KP_SCRATCH_PORT=5488` · scratch `$F/register/` · slots
  `bash $S/mln-slot-s5x.sh register …`.
- Critic reports: `$S/critics/R1-register.md` and How's rows of `$S/critics/R1-motion.md`.
- Read `$F/briefs/S5-R2-COMMON.md` first. Your earlier round-2 kit: `$S/s5dreg/r2/` (job-r2-shots.sh, sheets.ps1, crops.ps1,
  batches.mjs, readers.json, reader-brief.md). ⛔ Do not read the partial tiles that were set aside there.

## LEFT (in order)
1. tsc (slot) on your head.
2. Release-only red you own: `test:ui-consistency` — a NEW numeric-size utility `h-10` in `src/app/millionea/how/how-ghost.tsx`
   L43 (`h-10 w-[160px] rounded-control`) → the kit's size token (or the baseline with a written reason, if no kit size fits).
3. The SEP measurement (the routed `--mln-sep 0.9em` question): it is built into your shot script but never ran. Run it
   TARGETED — only the pages/widths/languages that settle the question (not the full ~45-min re-shoot; the lead renders the
   integrated head) — then decide and implement, with its guard.
4. Every reader of what you change, the red twins (maswali-register floor 58, design-register 34, week-money 10), and a
   self-review of the whole round-2 diff.

Shared pieces you own for everyone (ReceiptRow sentence variant, the ledger builder, WeekStateChip, MaswaliCarry): any change
must stay byte-identical for the other lanes' callers unless a ruling says otherwise — prove it.
