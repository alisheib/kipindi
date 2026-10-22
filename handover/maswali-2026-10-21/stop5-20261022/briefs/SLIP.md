# Lane SLIP — S5 round 2 (the slip `/millionea/slip`, the confirm sheet, the stamp)

- Tree `C:/50pick-ssd/kipindi-mln-dslp` · branch `claude/maswali-s5-r2-slip` · head `fe2d9fc79` (WIP: the multi-slip drive
  finds pills by name + a "two pills on one row at 320" check — NOT RUN). Commits 1–4 have tsc 0 but no browser proof.
- Step `S5-R2-SLIP` · ports 3560–3569 · `KP_SCRATCH_PORT=5486` · scratch `$F/slip/` · slots `bash $S/mln-slot-s5x.sh slip …`.
- Critic reports: `$S/critics/R1-slip.md` and the slip rows of `$S/critics/R1-motion.md`.
- Read `$F/briefs/S5-R2-COMMON.md` first. Your earlier runner: `$S/s5dslp/final-run-2.sh` (read it; reuse its pieces).

## LEFT (in order)
1. `test:visual-pass-r10` 1.4 re-pin: read the grouped caret rule; require the exact fsheet selector; plant = the rotation
   moved to the wrapper; control = main's two-selector rule. Then r10 3.1's list entry (the slip chevron, "edge" kind).
   Then `test:updown-filter-sheet` 7 (its regex needs the fsheet selector last — same cause; 57/1 on the release, green on
   main). Targets: r10 90+/0, updown-filter-sheet 58/0, r9a 63/0; tsc; the red twins of what you touched.
2. Release-only reds you own:
   - `test:measure` — NEW hand-typed page widths `max-w-[640px]` in `src/app/millionea/slip/page.tsx`,
     `src/app/millionea/slip/slip-ghost.tsx`, `src/components/maswali/maswali-slip.tsx` → the kit's measure (or the
     ratchet with a written reason if the kit has none — prefer the kit).
   - `test:visual-pass-r5h` 3.5 — DOM-mark writers in `operation-result-modal.tsx` and `maswali-slip.tsx` → classify
     them in the census with their reasons.
3. Main's CI (run 39625785032, at live main 67e47f8d2) fails r5a 8.13 (`maswali-slip.tsx:352` ✕ drawn while pending),
   r5j 1.1 (counts not through `formatNumber` in maswali-slip / maswali-home-card / maswali-format) and r7c 3.9 (the slip's
   h1 stem). Run those three suites on your branch: if the release already fixes them, say so; if not and the file is
   yours, fix it (home-card/format → tell the lead, DOORS owns the cards).
4. Targeted browser proof (slot; your server on 3560): `qa:dialog-way-back --prove-red` in Chromium AND WebKit; the
   multi-slip drive including the WIP's pill checks; measure two pills on one row at 320/360 in en and sw; "View ticket"
   lands on the free-cancel band; the cancel's confirm → result under ONE dim. Read every tile those runs produce.
   Skip the full shots (the lead renders the integrated head).
