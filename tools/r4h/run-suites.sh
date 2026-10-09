#!/usr/bin/env bash
# Runs each suite one at a time from F:\kipindi-r4h, logging output and exit codes.
cd /f/kipindi-r4h || exit 1
OUT="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r4h/suite-logs"
mkdir -p "$OUT"
: > "$OUT/summary.txt"
for s in "$@"; do
  start=$(date +%s)
  timeout 900 npm run -s "$s" > "$OUT/$s.log" 2>&1
  code=$?
  end=$(date +%s)
  echo "$s exit=$code ${end}-${start}s" | awk -v d=$((end-start)) '{print $1, $2, d "s"}' >> "$OUT/summary.txt"
done
echo DONE >> "$OUT/summary.txt"
