#!/usr/bin/env bash
# One suite at a time from F:\kipindi-r4f; each log in r4f/logs, one "name exit" line per suite in r4f/battery.txt.
L="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r4f"
mkdir -p "$L/logs"
cd /f/kipindi-r4f || exit 9
for s in "$@"; do
  start=$(date +%s)
  timeout 900 npm run -s "$s" > "$L/logs/$s.log" 2>&1
  code=$?
  echo "$s $code $(( $(date +%s) - start ))s" >> "$L/battery.txt"
done
echo DONE >> "$L/battery.txt"
