#!/usr/bin/env bash
# Final verification on the finished tree: every test: suite that reads a touched file (plus the required list), then
# the red: harnesses whose plants or anchors this change moved. One at a time.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5c"
cd F:/kipindi-r5c || exit 1
mkdir -p "$S/logs-final"
: > "$S/final-results.txt"
run() {
  local name="$1"
  local log="$S/logs-final/${name//:/_}.log"
  local start end code
  start=$(date +%s)
  timeout 900 npm run -s "$name" > "$log" 2>&1
  code=$?
  end=$(date +%s)
  echo "$name exit=$code $((end-start))s" >> "$S/final-results.txt"
}
while read -r name; do
  [ -z "$name" ] && continue
  run "$name"
done < "$S/suite-list.txt"
for name in red:journey-shell red:visual-pass-r4k red:feedback-law red:simple-journey-flag; do
  run "$name"
done
echo "ALL DONE" >> "$S/final-results.txt"
