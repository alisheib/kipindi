#!/usr/bin/env bash
# Run each listed npm script ONE AT A TIME from the worktree; record "name exit seconds" per line, full logs per suite.
R=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r4j
LIST="$1"; OUT="$2"; mkdir -p "$R/logs"; : > "$OUT"
cd /f/kipindi-r4j || exit 2
while IFS=$'\t' read -r name why; do
  [ -z "$name" ] && continue
  s=$(date +%s)
  timeout 600 npm run -s "$name" > "$R/logs/${name//:/_}.log" 2>&1
  code=$?
  e=$(date +%s)
  echo -e "$name\t$code\t$((e-s))s" >> "$OUT"
done < "$LIST"
echo DONE >> "$OUT"
