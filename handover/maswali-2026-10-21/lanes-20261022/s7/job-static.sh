#!/usr/bin/env bash
# S7 lane · the light (source-reading, no server, no database) suites the merge touches. Usage: bash job-static.sh <outdir>
OUT="$1"
mkdir -p "$OUT"
cd C:/50pick-ssd/maswali-s7-integrate-20261019 || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
run() {
  name="$1"; shift
  start=$(date +%s)
  timeout 1500 "$@" > "$OUT/$name.log" 2>&1
  rc=$?
  echo "$name exit=$rc secs=$(( $(date +%s) - start )) :: $(grep -E 'passed|PASS:|SUMMARY|ALL PASS|failed' "$OUT/$name.log" | tail -2 | tr '\n' ' ' | cut -c1-220)" >> "$OUT/summary.txt"
}
run design npx tsx scripts/maswali-design.test.mts
run register npx tsx scripts/maswali-register.test.mts
run register-red npx tsx scripts/maswali-register.test.mts --prove-red
run ui npx tsx scripts/maswali-ui.test.mts
run money npx tsx scripts/maswali-money.test.mts
run hub npx tsx scripts/maswali-hub.test.mts
run design-register npx tsx scripts/maswali-design-register.test.mts
run admin-form-validation npx tsx scripts/maswali-admin-form-validation.test.mts
run disclosure npx tsx scripts/house-bot-disclosure.test.mts
run reports-mem env DATABASE_URL="" USE_PRISMA_DAL=false HB_MONEY_STORE=memory npx tsx scripts/lib/house-bot-reports-cases.mts
echo DONE >> "$OUT/summary.txt"
