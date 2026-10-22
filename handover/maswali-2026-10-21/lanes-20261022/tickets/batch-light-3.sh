#!/usr/bin/env bash
# batch-light-3.sh (lane TICKETS): the readers of the hop item's files (tickets-ghost.tsx, [serial]/ticket-ghost.tsx,
# tickets/loading.tsx, [serial]/loading.tsx) and the suites any drawing's markup could move, one after another.
set -u
TREE=C:/50pick-ssd/kipindi-mln-dtkt
OUT=${1:?log dir}
mkdir -p "$OUT"
cd "$TREE" || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
SUITES="test:maswali-tickets test:maswali-ui test:journey-tickets test:visual-pass-r4c test:visual-pass-r4j test:visual-pass-r5d
test:visual-pass-r5h test:visual-pass-r6c test:millionea-dark-edge test:measure test:ui-consistency test:dead-css test:maswali-design
test:millionea-shell test:journey-shell red:journey-tickets"
echo "batch-light-3 at $(git rev-parse --short=9 HEAD) + working tree, $(date -u +%FT%TZ)"
for s in $SUITES; do
  log="$OUT/${s//:/_}.log"
  start=$(date +%s)
  npm run --silent "$s" > "$log" 2>&1
  rc=$?
  secs=$(( $(date +%s) - start ))
  sum=$(grep -E "[0-9]+ (passed|failed|caught|ok|checks|of [0-9]+)|[0-9]+/[0-9]+|PASS|FAIL" "$log" | tail -1 | tr -d '\r' | cut -c1-200)
  [ -z "$sum" ] && sum=$(grep -v '^\s*$' "$log" | tail -1 | tr -d '\r' | cut -c1-200)
  printf "%-30s rc=%s %4ss  %s\n" "$s" "$rc" "$secs" "$sum"
done
echo "batch-light-3 done $(date -u +%FT%TZ)"
