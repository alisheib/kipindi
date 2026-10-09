#!/usr/bin/env bash
# Runs the given npm suites ONE AT A TIME from F:/kipindi-r4e, logging each suite's output and its exit code.
cd /f/kipindi-r4e || exit 9
LOG=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/r4e-logs
mkdir -p "$LOG"
SUMMARY="$LOG/summary-$1.txt"
shift
: > "$SUMMARY"
for s in "$@"; do
  start=$(date +%s)
  npm run -s "$s" > "$LOG/$s.log" 2>&1
  code=$?
  echo "$s exit=$code ($(( $(date +%s) - start ))s)" >> "$SUMMARY"
done
echo DONE >> "$SUMMARY"
