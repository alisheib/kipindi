#!/usr/bin/env bash
# R5-H · run npm suites one at a time from the worktree, log each, print a summary line per suite.
# Usage: bash run-suites.sh <tag> <suite> [<suite> ...]
S="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5h"
tag="$1"; shift
mkdir -p "$S/logs"
cd /f/kipindi-r5h || exit 2
for s in "$@"; do
  log="$S/logs/$tag-${s//:/_}.log"
  npm run -s "$s" > "$log" 2>&1
  code=$?
  fails=$(grep -cE "^\s*(FAIL|✗|×|not ok)|  FAIL " "$log")
  echo "$s exit=$code fails~=$fails"
done
