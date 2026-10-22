#!/usr/bin/env bash
# CI's real-PostgreSQL cross-instance proofs (C4 wallet double-spend s10, C6 audit-chain fork s11, leader election s12),
# skipped by CI's run when an earlier step failed — here on a migrated, marked scratch PostgreSQL at this exact commit.
. "$CI_RUN/lib.sh"
cat > "$OUT/pg-inner.sh" <<'EOF'
set -u
export DATABASE_URL="$VERIFY_DATABASE_URL"
npx prisma migrate deploy > "$OUT/pg-migrate.log" 2>&1 || { echo "MIGRATE FAILED"; tail -20 "$OUT/pg-migrate.log"; exit 3; }
node scripts/load/ci-plant-marker.mjs || exit 3
all=0
for s in s10-cross-instance s11-audit-cross-instance s12-leader-contention; do
  npx tsx "scripts/load/$s.mts" > "$OUT/$s.log" 2>&1; rc=$?
  echo "$s rc=$rc :: $(grep -a -E 'PASS|FAIL|passed|failed|✓|✗|OK|ok' "$OUT/$s.log" | tail -3 | tr '\n' ' ' | cut -c1-300)"
  [ $rc -eq 0 ] || { all=1; tail -40 "$OUT/$s.log"; }
done
exit $all
EOF
step pg-proofs npx tsx scripts/db-scratch.mts --run bash "$OUT/pg-inner.sh"
finish
