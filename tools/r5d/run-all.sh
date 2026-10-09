#!/bin/bash
# R5-D: every suite, one at a time, from the worktree. Usage: run-all.sh <outdir> <script names...>
OUT="$1"; shift
mkdir -p "$OUT"
cd F:/kipindi-r5d || exit 2
: > "$OUT/summary.txt"
for t in "$@"; do
  start=$(date +%s)
  timeout 900 npm run -s "$t" > "$OUT/$t.log" 2>&1
  code=$?
  secs=$(( $(date +%s) - start ))
  last=$(grep -E "passed|failed|PASS|FAIL|checks|caught|ok\b|✓|✗" "$OUT/$t.log" | tail -1 | tr -d '\r' | cut -c1-160)
  echo "$code	${secs}s	$t	$last" >> "$OUT/summary.txt"
done
echo "DONE" >> "$OUT/summary.txt"
