#!/usr/bin/env bash
# PLATFORM r2 · batch 2 (one slot, strictly serial: the red twins plant into src/, so nothing else reads the tree meanwhile).
#   1 tsc at the head · 2 every writer of the reader list, one at a time (red twins + the four tests that write) ·
#   3 the database suites (KP_SCRATCH_PORT=5489, one at a time) and the three browser tests ·
#   4 red:journey-header-fit --alone on its own in-memory server (Run F's recipe, :3500).
# After each writer: git status, and any planted file restored is reported (never silently).
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp' KP_SCRATCH_PORT=5489
cd C:/50pick-ssd/kipindi-mln-fplt || exit 2
mkdir -p "$F/b2w" "$F/b2h"
# ⛔ The restore below reverts ANY modified file: start only on a clean tree (every change committed), never edit meanwhile.
if [ -n "$(git status --short)" ]; then echo "REFUSED: the tree is not clean: $(git status --short | tr '\n' ' ')"; exit 3; fi
echo "== 1 tsc at $(git rev-parse --short HEAD) $(date -u +%T)Z"
npx tsc --noEmit > $F/b2-tsc.log 2>&1; echo "tsc rc=$? ($(grep -c 'error TS' $F/b2-tsc.log) errors)"
echo "== 2 writers, serial $(date -u +%T)Z"
grep -v -x "red:journey-header-fit" $F/r2-writers.txt > $F/b2-writers.txt
rm -f $F/b2-writers-summary.txt
while IFS= read -r n; do
  [ -z "$n" ] && continue
  start=$(date +%s)
  timeout 1500 npm run -s "$n" > "$F/b2w/${n//:/_}.log" 2>&1; rc=$?
  last=$(grep -E -i "passed|failed|caught|all [0-9]+ checks|ALL PASS|all checks|MISSED|missed|INCONCLUSIVE|PREMISE" "$F/b2w/${n//:/_}.log" | tail -1 | tr -s ' ' | cut -c1-200)
  dirty=$(git status --short | tr '\n' ' ')
  echo "$n rc=$rc $(( $(date +%s) - start ))s :: $last${dirty:+ :: DIRTY $dirty}" >> $F/b2-writers-summary.txt
  if [ -n "$dirty" ]; then
    for p in $(git status --short | awk '$1=="M"{print $2}'); do git checkout -- "$p"; echo "   restored $p after $n" >> $F/b2-writers-summary.txt; done
    rm -f .red-*.lock .red-in-place.bak 2>/dev/null
  fi
done < $F/b2-writers.txt
echo "WRITERS DONE" >> $F/b2-writers-summary.txt
echo "== 3 database suites and browser tests $(date -u +%T)Z"
rm -f $F/b2-heavy-summary.txt
for n in db:probe-deposit-recheck db:probe-deposit-status-read db:probe-payment-background test:visual-pass-r8d-stores test:visual-v1 test:u43-bar-ink test:u43-market-rail; do
  start=$(date +%s)
  timeout 1500 npm run -s "$n" > "$F/b2h/${n//:/_}.log" 2>&1; rc=$?
  last=$(grep -E -i "passed|failed|all [0-9]+ checks|ALL PASS|all checks|PREMISE" "$F/b2h/${n//:/_}.log" | tail -1 | tr -s ' ' | cut -c1-200)
  echo "$n rc=$rc $(( $(date +%s) - start ))s :: $last" >> $F/b2-heavy-summary.txt
done
echo "HEAVY DONE" >> $F/b2-heavy-summary.txt
git status --short > $F/b2-status-before-f.txt
echo "== 4 red:journey-header-fit --alone $(date -u +%T)Z"
WARM="/ /markets /admin/journey" bash $S/mln-server-run.sh kipindi-mln-fplt 3500 $F/b2-hfit.log -- bash $F/b2-hfit-job.sh
git status --short > $F/b2-status.txt
echo "BATCH 2 DONE $(date -u +%T)Z"
