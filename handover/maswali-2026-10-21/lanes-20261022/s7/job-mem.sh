#!/usr/bin/env bash
# S7 lane · the memory children of the merge (no database), one after another. Usage: bash job-mem.sh <outdir> <child...>
OUT="$1"; shift
mkdir -p "$OUT"
cd C:/50pick-ssd/maswali-s7-integrate-20261019 || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
for c in "$@"; do
  name=$(basename "$c" .mts)
  start=$(date +%s)
  DATABASE_URL="" USE_PRISMA_DAL=false HB_MONEY_STORE=memory timeout 1500 npx tsx "$c" > "$OUT/$name.log" 2>&1
  rc=$?
  pass=$(grep -c "^PASS\|^  PASS\|^ok " "$OUT/$name.log")
  fail=$(grep -c "^FAIL\|^  FAIL" "$OUT/$name.log")
  echo "$name exit=$rc pass-lines=$pass fail-lines=$fail secs=$(( $(date +%s) - start ))" >> "$OUT/summary.txt"
done
echo DONE >> "$OUT/summary.txt"
