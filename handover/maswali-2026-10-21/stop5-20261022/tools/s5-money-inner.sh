#!/usr/bin/env bash
# Runs INSIDE db-scratch --run (VERIFY_DATABASE_URL set): the classic money suites, each on a reset, migrated database.
set -u
export DATABASE_URL="$VERIFY_DATABASE_URL" USE_PRISMA_DAL=true
for s in e2e:money e2e:fault e2e:card; do
  node scripts/load/reset-db.mjs > "$OUT/reset-$s.log" 2>&1 || { echo "RESET FAILED before $s"; tail -5 "$OUT/reset-$s.log"; exit 3; }
  npm run -s "$s" > "$OUT/$s.log" 2>&1
  echo "$s rc=$? :: $(grep -E 'passed|failed|FAIL|✗|drift' "$OUT/$s.log" | tail -2 | tr '\n' ' ' | cut -c1-220)"
done
