#!/usr/bin/env bash
# S7 lane · the merge's heavy proofs, one after another inside ONE slot (one database suite at a time, port 5476).
# Usage: bash job-heavy.sh <outdir> <step...>   (steps: tsc engine purchase settle void close-race shared-paths adversarial
#        player fence integrity red-money-path red-dal-parity)
OUT="$1"; shift
mkdir -p "$OUT"
cd C:/50pick-ssd/maswali-s7-integrate-20261019 || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp' KP_SCRATCH_PORT=5476
echo "heavy batch at $(git rev-parse --short HEAD) from $(date -u +%FT%TZ): $*" >> "$OUT/summary.txt"
for step in "$@"; do
  start=$(date +%s)
  case "$step" in
    tsc) cmd="npx tsc --noEmit" ;;
    red-money-path) cmd="npm run red:maswali-money-path" ;;
    red-dal-parity) cmd="npm run red:dal-parity" ;;
    *) cmd="npm run test:maswali-$step" ;;
  esac
  timeout 5400 bash -c "$cmd" > "$OUT/$step.log" 2>&1
  rc=$?
  tailline=$(grep -E "passed|caught|SUMMARY|PASS:|failed|MISSED|error TS" "$OUT/$step.log" | tail -3 | tr '\n' ' ' | cut -c1-300)
  echo "$step exit=$rc secs=$(( $(date +%s) - start )) :: $tailline" >> "$OUT/summary.txt"
  # A red drive plants into live files: the tree must be clean after it (the lane rule).
  dirty=$(git status --short | grep -v '^??' | head -5 | tr '\n' ' ')
  [ -n "$dirty" ] && echo "  !! tree not clean after $step: $dirty" >> "$OUT/summary.txt"
done
echo "DONE $(date -u +%FT%TZ)" >> "$OUT/summary.txt"
