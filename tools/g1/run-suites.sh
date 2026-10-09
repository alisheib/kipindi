#!/usr/bin/env bash
# Runs each static suite, records its exit code and keeps a log per suite.
cd /f/kipindi-v1
OUT="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/g1/suites"
mkdir -p "$OUT"
: > "$OUT/summary.txt"
for f in "$@"; do
  name=$(basename "$f")
  timeout 600 node_modules/.bin/tsx "$f" > "$OUT/$name.log" 2>&1
  code=$?
  echo "$code $f" >> "$OUT/summary.txt"
done
echo done >> "$OUT/summary.txt"
