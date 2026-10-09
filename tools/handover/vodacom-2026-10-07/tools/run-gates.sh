#!/usr/bin/env bash
# usage: run-gates.sh <logdir> <npm-script-key>...   (run INSIDE one heavy-node-lock job)
# Runs each key in order, never stopping early; prints one verdict line per key and the tail of every failure.
set -u
DIR="$1"; shift
mkdir -p "$DIR"
cd /c/kipindi-journey || exit 2
fails=0
for k in "$@"; do
  log="$DIR/$(echo "$k" | tr ':/' '__').log"
  start=$(date +%s)
  if [ "$k" = "typecheck" ]; then npx tsc --noEmit -p tsconfig.json > "$log" 2>&1; rc=$?
  else npm run -s "$k" > "$log" 2>&1; rc=$?; fi
  dur=$(( $(date +%s) - start ))
  if [ $rc -eq 0 ]; then echo "PASS $k (${dur}s)"; else echo "FAIL $k rc=$rc (${dur}s)"; fails=$((fails+1)); fi
done
echo "gates: $# run, $fails failed"
for k in "$@"; do
  log="$DIR/$(echo "$k" | tr ':/' '__').log"
  grep -qE "^PASS $k " /dev/null
done
exit 0
