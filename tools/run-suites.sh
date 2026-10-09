#!/usr/bin/env bash
# Serial runner (one light tsx process at a time). usage: run-suites.sh <names-file> <label>
# Writes <scratchpad>/<label>/<name>.log and <scratchpad>/<label>/summary.tsv (name, exit, last line).
SP=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad
NAMES="$1"
LABEL="$2"
OUT="$SP/$LABEL"
mkdir -p "$OUT"
: > "$OUT/summary.tsv"
cd /f/kipindi-tleft || exit 99
while IFS= read -r name; do
  [ -z "$name" ] && continue
  safe="${name//:/_}"
  timeout 420 npm run -s "$name" > "$OUT/$safe.log" 2>&1
  code=$?
  last="$(grep -v '^[[:space:]]*$' "$OUT/$safe.log" | tail -n 1 | cut -c1-200)"
  printf '%s\t%s\t%s\n' "$name" "$code" "$last" >> "$OUT/summary.tsv"
done < "$NAMES"
echo "DONE $(wc -l < "$OUT/summary.tsv") suites" > "$OUT/DONE"
