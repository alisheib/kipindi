#!/usr/bin/env bash
# job-par-base.sh <tree> <port> <sha8>
# S5-PARITY: classic parity on the CURRENT main, with the S5-PARITY harness (kipindi-mln-par, identical to the S5 release's):
#   1. --baseline <file> on a FRESH in-memory next dev of <tree>,
#   2. a null --compare against it on ANOTHER fresh server of the same tree (must exit 0).
# Each step is its own mln-server-run.sh (rm -rf .next, a new server, stopped after). Run inside ONE slot:
#   MLN_SLOTS=3 bash <S>/mln-slot.sh par bash <S>/s5par/job-par-base.sh kipindi-mln-pbase 3541 bfa0b7d57
set -u
TREE="$1"; PORT="$2"; SHA="$3"
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
P="$S/s5par"
HARNESS=C:/50pick-ssd/kipindi-mln-par/scripts/qa-classic-shell-parity.mjs
BASEFILE="$P/parity-v5-$SHA.json"
step() { # <name> <args...>
  local name="$1"; shift
  bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$P/par-$SHA-$name.log" -- env KP_TREE="C:/50pick-ssd/$TREE" node "$HARNESS" "$@"
  local rc=$?
  echo "$(date -u +%T) parity $name rc=$rc :: $(grep -E 'passed —|baseline written|REFUSED' "$P/par-$SHA-$name.log" | tail -2 | tr '\n' ' ' | cut -c1-400)"
  return $rc
}
if [ -f "$BASEFILE" ]; then echo "baseline exists: $BASEFILE (never re-baseline; skipping the capture)"
else step baseline --baseline "$BASEFILE" || { echo "baseline failed: stopping"; exit 2; }; fi
[ -f "$BASEFILE" ] || { echo "no accepted baseline at $BASEFILE: stopping"; exit 2; }
step null-compare --compare "$BASEFILE" || { echo "null compare not clean"; exit 3; }
echo "$(date -u +%T) classic parity on $TREE ($SHA): baseline + null compare done"
