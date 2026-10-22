#!/usr/bin/env bash
# S5-R2-HUB commits 2-3 (the frame, the reorder, the rule's balance, the no-week body): in ONE slot, in order —
#   tsc -> the PLANT run (four plants, the open and ghost states; each planted check must fail) -> restore ->
#   the GREEN targeted drive (run a on the states the change touches, run b whole).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
L="$F/hub/c2"
mkdir -p "$L"
cd C:/50pick-ssd/kipindi-mln-dhub || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
note() { echo "$(date -u +%T) $*" >> "$L/heavy.log"; }
: > "$L/heavy.log"
note "head $(git rev-parse --short HEAD) · $(git status --short | tr '\n' ' ')"
if [ "${SKIP_TSC:-}" != "1" ]; then
  npx tsc --noEmit -p tsconfig.json > "$L/tsc.log" 2>&1
  note "tsc exit $? · $(grep -c 'error TS' "$L/tsc.log") errors"
fi
export WARM="/millionea /millionea/how /millionea/tickets /markets"
SHOTS=.50pick-shots/maswali-hub-states
if [ "${SKIP_PLANTS:-}" != "1" ]; then
  node "$F/hub/plants.mjs" apply >> "$L/heavy.log" 2>&1 || { note "plants did not apply"; exit 3; }
  rm -rf "$SHOTS"
  bash "$S/mln-server-run.sh" kipindi-mln-dhub 3550 "$L/plant.log" FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=open,ghost -- node scripts/maswali-hub-states.mjs
  note "PLANT run: $(cat "$L/plant.log.done" 2>/dev/null) · $(grep 'maswali-hub-states (run' "$L/plant.log" | tail -1)"
  node "$F/hub/plants.mjs" restore >> "$L/heavy.log" 2>&1
  note "restored · $(git status --short | tr '\n' ' ')"
fi
STATES="${GREEN_STATES:-open,guest,paused,break,cap,closing,closed,resolving,noweek,noweek-paused,voiding,after,ghost,final-ahead,final,retired}"
for run in ${RUNS:-a b}; do
  rm -rf "$SHOTS"
  bash "$S/mln-server-run.sh" kipindi-mln-dhub 3550 "$L/drive-$run.log" FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=$run "MLN_HUB_STATES=$STATES" -- node scripts/maswali-hub-states.mjs
  note "drive $run: $(cat "$L/drive-$run.log.done" 2>/dev/null) · $(grep -c '^FAIL' "$L/drive-$run.log") FAIL lines · $(grep 'maswali-hub-states (run' "$L/drive-$run.log" | tail -1)"
  rm -rf "$L/tiles-$run"
  cp -r "$SHOTS" "$L/tiles-$run" 2>/dev/null
  note "tiles $run: $(ls "$L/tiles-$run" 2>/dev/null | wc -l)"
done
note "done"
