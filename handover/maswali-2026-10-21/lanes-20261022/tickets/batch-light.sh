#!/usr/bin/env bash
# batch-light.sh (lane TICKETS): every static reader of the files this lane's round 2 changes, then their in-memory red
# twins, one after another (no server, no database). Each suite's output goes to its own log; one summary line each.
# The on-disk red twin (red:visual-pass-r4k) is NOT here: it runs alone afterwards, then `git status --short`.
set -u
TREE=C:/50pick-ssd/kipindi-mln-dtkt
OUT=${1:?log dir}
mkdir -p "$OUT"
cd "$TREE" || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
SUITES="test:maswali-tickets test:maswali-ui test:maswali-design test:maswali-hub test:journey-tickets test:millionea-shell
test:journey-shell test:howto test:journey-home test:filter-language test:gold-is-money test:enter-where-pressed test:feedback-law
test:market-result-announce test:updown-result-announce test:millionea-dark-edge test:motion-ladder test:popup-fit
test:presence-class test:stacking test:updown-handover test:ui-consistency test:type-scale
test:visual-pass-r10 test:visual-pass-r3c test:visual-pass-r4d test:visual-pass-r4e test:visual-pass-r4h test:visual-pass-r4i
test:visual-pass-r4j test:visual-pass-r4k test:visual-pass-r5c test:visual-pass-r5e test:visual-pass-r5f test:visual-pass-r5h
test:visual-pass-r5j test:visual-pass-r6a test:visual-pass-r6c test:visual-pass-r7a test:visual-pass-r7c test:visual-pass-r8b
test:visual-pass-r8d test:visual-pass-r9a test:visual-pass-r9b test:visual-pass-r9c
red:maswali-tickets red:journey-tickets red:journey-shell red:howto red:journey-home red:enter-where-pressed"
echo "batch-light at $(git rev-parse --short=9 HEAD) + working tree, $(date -u +%FT%TZ)"
for s in $SUITES; do
  log="$OUT/${s//:/_}.log"
  start=$(date +%s)
  npm run --silent "$s" > "$log" 2>&1
  rc=$?
  secs=$(( $(date +%s) - start ))
  # The suite's own last summary-looking line (a count), else its last non-empty line.
  sum=$(grep -E "[0-9]+ (passed|failed|caught|ok|checks|of [0-9]+)|[0-9]+/[0-9]+|PASS|FAIL" "$log" | tail -1 | tr -d '\r' | cut -c1-200)
  [ -z "$sum" ] && sum=$(grep -v '^\s*$' "$log" | tail -1 | tr -d '\r' | cut -c1-200)
  printf "%-34s rc=%s %4ss  %s\n" "$s" "$rc" "$secs" "$sum"
done
echo "batch-light done $(date -u +%FT%TZ)"
