#!/usr/bin/env bash
# Lane DOORS (S5 round 2): run a list of npm scripts one by one in the doors tree; one log per suite, one summary line each.
# usage: run-suites.sh <label> <script> [<script> ...]
set -u
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
TREE=C:/50pick-ssd/kipindi-mln-ddoor
OUT=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/doors/suites
label=$1; shift
mkdir -p "$OUT/$label"
cd "$TREE" || exit 2
summary="$OUT/$label/SUMMARY.txt"
: > "$summary"
# the tree as it stands before the run (my own uncommitted edits included), with each file's content hash
snap() { git status --short | grep -v '^??' | while read -r st f; do echo "$st $f $(git hash-object "$f" 2>/dev/null)"; done; }
before=$(snap)
for s in "$@"; do
  name=$(echo "$s" | tr ' :/' '___')
  start=$(date +%s)
  npm run --silent $s > "$OUT/$label/$name.log" 2>&1
  code=$?
  secs=$(( $(date +%s) - start ))
  tailline=$(grep -E "passed|failed|PASS|FAIL|checks|caught|ALL|assertions|ok " "$OUT/$label/$name.log" | tail -1 | cut -c1-220)
  echo "$([ $code -eq 0 ] && echo GREEN || echo "RED($code)") ${secs}s $s :: $tailline" >> "$summary"
  # a red twin may leave its plant behind on a stop: report the tree after each one
  case "$s" in red:*) now=$(snap); [ "$now" != "$before" ] && echo "   ⚠ TREE CHANGED after $s: $(diff <(echo "$before") <(echo "$now") | tr '\n' ' ')" >> "$summary" ;; esac
done
echo "== DONE" >> "$summary"
