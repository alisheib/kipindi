#!/usr/bin/env bash
cd F:/kipindi-r5c
: > "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5c/suite-results.txt"
while read -r name; do
  [ -z "$name" ] && continue
  log="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5c/logs/${name//:/_}.log"
  start=$(date +%s)
  timeout 900 npm run -s "$name" > "$log" 2>&1
  code=$?
  end=$(date +%s)
  echo "$name exit=$code $((end-start))s" >> "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5c/suite-results.txt"
done < "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5c/suite-list.txt"
echo "ALL DONE" >> "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5c/suite-results.txt"
