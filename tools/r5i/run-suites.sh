#!/usr/bin/env bash
# Every test: suite that reads a touched file (plus the required list), one at a time; then the red: harnesses named.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5i"
cd F:/kipindi-r5i || exit 1
mkdir -p "$S/logs"
OUT="$S/${1:-suite-results}.txt"
LIST="$S/${2:-suite-list}.txt"
: > "$OUT"
while read -r name; do
  [ -z "$name" ] && continue
  log="$S/logs/${name//:/_}.log"
  start=$(date +%s)
  timeout 900 npm run -s "$name" > "$log" 2>&1
  code=$?
  end=$(date +%s)
  tail_line=$(grep -E "passed|failed|PASS|FAIL|OK|ok —" "$log" | tail -1 | cut -c1-140)
  echo "$name exit=$code $((end-start))s — $tail_line" >> "$OUT"
done < "$LIST"
echo "ALL DONE" >> "$OUT"
