#!/usr/bin/env bash
# S5-R2-HUB commit 1 (the segment loading's pick): tsc, then the hop probe on a fresh in-memory next dev (:3551).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
L="$F/hub/c1"
mkdir -p "$L"
cd C:/50pick-ssd/kipindi-mln-dhub || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
note() { echo "$(date -u +%T) $*" >> "$L/heavy.log"; }
: > "$L/heavy.log"
note "head $(git rev-parse --short HEAD) · $(git status --short | tr '\n' ' ')"
npx tsc --noEmit -p tsconfig.json > "$L/tsc.log" 2>&1
note "tsc exit $? · $(grep -c 'error TS' "$L/tsc.log") errors"
export WARM="/millionea /millionea/how /millionea/register /millionea/slip /millionea/tickets"
bash "$S/mln-server-run.sh" kipindi-mln-dhub 3551 "$L/hop.log" FEATURE_MILLIONEA=ACTIVE "OUT=$L/hop" -- node "$F/hub/hop-probe.mjs"
note "hop probe: $(cat "$L/hop.log.done" 2>/dev/null) · $(grep 'hop-probe:' "$L/hop.log" | tail -1)"
note "done"
