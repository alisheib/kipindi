#!/usr/bin/env bash
# readers.sh — every static suite that reads a file this lane changed (git grep), and each red twin (in-memory plants).
# Prints one summary line per run; full logs in $F/register/readers/.
set -u
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
cd C:/50pick-ssd/kipindi-mln-dreg || exit 2
mkdir -p "$F/register/readers"
TESTS="${TESTS:-maswali-design-register maswali-design maswali-register maswali-results-section maswali-tickets maswali-week-money visual-pass-r5e visual-pass-r8a visual-pass-r9a glyph-source grid-paging journey-shell maswali-og-week maswali-register-cache maswali-ui millionea-shell visual-pass-r10 visual-pass-r5j ui-consistency}"
REDS="${REDS:-maswali-design-register maswali-register maswali-results-section maswali-tickets maswali-week-money glyph-source journey-shell maswali-og-week maswali-register-cache}"
echo "readers at $(git rev-parse --short HEAD) (+ working tree) $(date -u +%T)"
for s in $TESTS; do
  timeout 900 npx tsx "scripts/$s.test.mts" > "$F/register/readers/$s.log" 2>&1; rc=$?
  sum=$(grep -E "passed|failed|ALL PASS|FAIL —|FAIL " "$F/register/readers/$s.log" | grep -v "^PASS" | tail -1 | tr -s ' ')
  echo "test:$s rc=$rc · $sum"
done
for s in $REDS; do
  timeout 1800 npx tsx "scripts/$s.test.mts" --prove-red > "$F/register/readers/red-$s.log" 2>&1; rc=$?
  sum=$(grep -E "caught|INCONCLUSIVE|MISSED|NOT CAUGHT|proved" "$F/register/readers/red-$s.log" | tail -1 | tr -s ' ')
  echo "red:$s rc=$rc · $sum"
done
echo "done $(date -u +%T)"
git status --short
