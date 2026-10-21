#!/usr/bin/env bash
# job-parity-base.sh <tree> <port> <sha8>
# Classic-shell parity calibration on the BASELINE tree (live main), each step on its own FRESH in-memory next dev:
#   1. --prove-red (the instrument's control), 2. --baseline <file>, 3. a null --compare against it (must exit 0).
# Run inside ONE Maswali slot: bash mln-slot.sh s5-parity bash job-parity-base.sh kipindi-mln-base 3461 4471bb44
set -u
TREE="$1"; PORT="$2"; SHA="$3"
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
L="$S/lead"; P="$S/parity"; mkdir -p "$P"
BASEFILE="$P/parity-v4-$SHA.json"
step() { # <name> <args...>
  local name="$1"; shift
  bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$L/parity-$SHA-$name.log" -- node scripts/qa-classic-shell-parity.mjs "$@"
  local rc=$?
  echo "$(date -u +%T) parity $name rc=$rc :: $(grep -E 'verdict|VERDICT|baseline written|NOT written|passed|failed|differ' "$L/parity-$SHA-$name.log" | tail -3 | tr '\n' ' ' | cut -c1-400)"
  return $rc
}
step prove-red --prove-red || { echo "prove-red failed: stopping"; exit 1; }
if [ -f "$BASEFILE" ]; then echo "baseline exists: $BASEFILE (never re-baseline; skipping capture)"; else step baseline --baseline "$BASEFILE" || { echo "baseline failed: stopping"; exit 2; }; fi
step null-compare --compare "$BASEFILE" || { echo "null compare not clean"; exit 3; }
echo "$(date -u +%T) parity calibration on $TREE ($SHA) done"
