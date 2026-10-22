#!/usr/bin/env bash
# S5-R2-HUB (lead asheib-f3): $S/s5dhub/heavy-r2.sh re-pointed — logs and tiles go to THIS lead's scratch ($F/hub/r2);
# the toolbox scripts ($S) and the tree are unchanged. Strictly in order, in ONE slot:
#   tsc -> the red twins of the suites that read a changed file (glyph-source, journey-shell) -> the state drive, runs a, b, c
# Each run's tiles are copied out of the tree to $L/tiles-<run> (read from there while the next run goes).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
L="$F/hub/r2"
mkdir -p "$L"
cd C:/50pick-ssd/kipindi-mln-dhub || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
procs() { powershell -NoProfile -ExecutionPolicy Bypass -File "$S/mln-procs.ps1" -Tree kipindi-mln-dhub -Port 3550 | tr -dc "0-9"; }
note() { echo "$(date -u +%T) $*" >> "$L/heavy.log"; }
quiet() { for _ in $(seq 1 60); do n=$(procs); [ "${n:-0}" = "0" ] && return 0; sleep 5; done; note "tree not quiet: ${n:-?} processes"; return 1; }
: > "$L/heavy.log"
note "head $(git rev-parse --short HEAD)"
if [ "${SKIP_STATIC:-}" != "1" ]; then
  npx tsc --noEmit -p tsconfig.json > "$L/tsc.log" 2>&1
  note "tsc exit $? · $(grep -c 'error TS' "$L/tsc.log") errors"
  for r in glyph-source journey-shell; do
    npx tsx "scripts/$r.test.mts" --prove-red > "$L/red-$r.log" 2>&1
    note "red:$r exit $? · $(grep -v '^\s*$' "$L/red-$r.log" | tail -1 | cut -c1-200)"
  done
  note "git status after the reds: $(git status --short | tr '\n' ' ')"
fi
export WARM="/millionea /millionea/how /millionea/tickets /markets"
SHOTS=.50pick-shots/maswali-hub-states
for run in ${RUNS:-a b c}; do
  rm -rf "$SHOTS"
  quiet && bash "$S/mln-server-run.sh" kipindi-mln-dhub 3550 "$L/drive-$run.log" FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=$run ${MLN_HUB_STATES:+MLN_HUB_STATES=$MLN_HUB_STATES} -- node scripts/maswali-hub-states.mjs
  note "drive $run: $(cat "$L/drive-$run.log.done" 2>/dev/null) · $(grep -c '^FAIL' "$L/drive-$run.log") FAIL lines · $(grep 'maswali-hub-states (run' "$L/drive-$run.log" | tail -1)"
  rm -rf "$L/tiles-$run"
  cp -r "$SHOTS" "$L/tiles-$run" 2>/dev/null
  note "tiles $run: $(ls "$L/tiles-$run" 2>/dev/null | wc -l)"
done
note "done"
