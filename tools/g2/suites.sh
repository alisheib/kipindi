#!/usr/bin/env bash
# G2's light static suites, ONE AT A TIME (no lock needed: in-memory file readers, seconds each).
S=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/g2
cd /f/kipindi-v2 || exit 9
mkdir -p "$S/suites"
: > "$S/suites.summary"
for f in "$@"; do
  name=$(basename "$f")
  ./node_modules/.bin/tsx "scripts/$f" > "$S/suites/$name.out" 2>&1
  code=$?
  echo "$code $f" >> "$S/suites.summary"
done
echo done >> "$S/suites.summary"
