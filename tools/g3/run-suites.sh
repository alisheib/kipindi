#!/usr/bin/env bash
# Run each listed npm suite one at a time in F:/kipindi-v3; one log per suite, one summary line per suite.
G="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/g3"
LIST="${1:-$G/suites.txt}"
OUT="$G/logs"; mkdir -p "$OUT"
SUM="$G/summary.txt"; : > "$SUM"
cd /f/kipindi-v3 || exit 9
while read -r s; do
  [ -z "$s" ] && continue
  log="$OUT/${s//:/_}.log"
  start=$(date +%s)
  timeout 600 npm run --silent "$s" > "$log" 2>&1
  code=$?
  echo "$code $s $(( $(date +%s) - start ))s" >> "$SUM"
done < "$LIST"
echo "DONE" >> "$SUM"
