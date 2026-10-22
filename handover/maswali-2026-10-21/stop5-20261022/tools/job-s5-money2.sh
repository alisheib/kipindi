#!/usr/bin/env bash
set -u
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
SHA="$1"; export OUT="$F/lead/s5gate/$SHA"; SUM="$OUT/money-summary.txt"
note() { echo "$(date -u +%T) $*" | tee -a "$SUM"; }
cd /c/50pick-ssd/maswali-coord-20261019 || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp' KP_SCRATCH_PORT=5477
[ "$(git rev-parse --short=9 HEAD)" = "${SHA:0:9}" ] || { note "release tree is not at $SHA"; exit 8; }
npx tsx scripts/db-scratch.mts --run bash "$F/lead/s5-money-inner.sh" > "$OUT/classic-money.log" 2>&1
note "classic money (retry): $(grep -E 'rc=|RESET' "$OUT/classic-money.log" | tr '\n' ' ' | cut -c1-600)"
note "== tree after: $(git status --short | tr '\n' ' ')"
