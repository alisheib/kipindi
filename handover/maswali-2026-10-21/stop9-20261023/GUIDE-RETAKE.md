# GUIDE — the Weeks picture re-take after FLOW's slot-label commit (GUIDE's own steps, 2026-10-23)

$F = the lead's scratchpad (C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad);
$S = the earlier lead's scratchpad (…/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad). Scripts in $F/guide/: shots-v7.mjs
(capture), fake-clock.mjs (server clock preload), resolve-licbasis.cjs, build-pdf.sh, render.mjs,
fairness-guide-check.mjs, clock-offset.txt (must hold "0" before a run).

The scratch capture tree C:/50pick-ssd/kipindi-mln-guide-shot (detached, NEVER pushed) holds 7c535c15a + LICBASIS 2
resolved (0be58fa5d) + FLOW 64dcf520a merged (4e850713b; census pin: both comment blocks, SITE_COUNT 44).

1. In the scratch tree: `git fetch origin claude/maswali-flow-fixes && git -c user.name=guide-scratch
   -c user.email=guide-scratch@localhost merge --no-ff --no-edit <FLOW sha>` (never push).
2. Capture (background): `printf 0 > $F/guide/clock-offset.txt; export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp';
   bash $S/mln-slot-s5x.sh guide env WARM=/ bash $S/mln-server-run.sh kipindi-mln-guide-shot 3752 $F/guide/srv-v13.log
   FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false
   "NODE_OPTIONS=--import=file:///$F/guide/fake-clock.mjs" "KP_GUIDE_CLOCK_FILE=$F/guide/clock-offset.txt" --
   env -u NODE_OPTIONS node $F/guide/shots-v7.mjs $F/guide/shots-v13` → expect "guide-shots v7: 35 passed, 0 failed";
   only weeks.png changes (its W46 alerts name A4 and A5).
3. `bash $F/guide/build-pdf.sh $F/guide/shots-v13 $F/guide/pages-r4` → 19 pages; read page 5 (and 14–15 if section C
   changes).
4. docs/maswali-operator-guide.html: section C's unsealed-alert row (~line 696) takes FLOW's exact label wording; delete
   "In an alert, slots 1–10 are M1–M10 and slots 11–15 are A1–A5." (~line 691) once no alert prints a bare number
   (maswali-console.ts 234, 235, 244 today).
5. Checks: test:maswali-admin-guide 11/0; red:maswali-admin-guide 34/0; `KP_SCRATCH_PORT=5478 bash $S/mln-slot-s5x.sh
   guide npm run test:maswali-fairness` (ALL PASS 3/0); `node $F/guide/fairness-guide-check.mjs
   C:/50pick-ssd/kipindi-mln-guide/docs/maswali-operator-guide.html --plants`.
6. Commit (-F) "MASWALI-BUILD S6-GUIDE 9: …", staging docs/maswali-operator-guide.html,
   docs/50pick-maswali-operator-guide.pdf and the changed docs/guide-img/maswali/*.png; push (full refspec + ls-remote).
7. Copy docs/50pick-maswali-operator-guide.pdf → C:\Users\asheib\Desktop\Millionea admin guide.pdf; compare SHA-256.
8. Tell S6-SHIP the new head. 9. Remove the scratch worktree (`git worktree remove --force`, then the folder).
