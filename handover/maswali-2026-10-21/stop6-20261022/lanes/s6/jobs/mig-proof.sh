#!/usr/bin/env bash
# S6-DOCS item (a) · THE MIGRATION PROOF, in production's order, on a throwaway PostgreSQL 18.3 (db-scratch, never
# production): main's migrations folder first (main da3d32180, production's code), then this branch's folder on the same
# database — exactly the new migrations apply; a second deploy says there is nothing pending; each new migration's SQL
# replays once more without error; then the backup schema gate. Every line printed is kept in $OUT.
. "$CI_RUN/lib.sh"
MAIN=da3d32180
rm -rf /tmp/mainprisma && mkdir -p /tmp/mainprisma && git archive "$MAIN" prisma | tar -x -C /tmp/mainprisma
echo "main's migrations: $(ls /tmp/mainprisma/prisma/migrations | grep -c '^[0-9]') · this branch's: $(ls prisma/migrations | grep -c '^[0-9]')"
echo "new on this branch:"; comm -13 <(ls /tmp/mainprisma/prisma/migrations | sort) <(ls prisma/migrations | sort) | tee "$OUT/new-migrations.txt"
cat > /tmp/mig.sh <<'X'
set -u
export DATABASE_URL="$VERIFY_DATABASE_URL"
echo "== 1 · main's migrations folder (production's order)"
npx prisma migrate deploy --schema /tmp/mainprisma/prisma/schema.prisma; echo "step1 rc=$?"
echo "== 2 · this branch's folder, on the same database"
npx prisma migrate deploy; echo "step2 rc=$?"
echo "== 3 · a second deploy"
npx prisma migrate deploy; echo "step3 rc=$?"
echo "== 4 · each new migration's SQL replayed once"
for m in $(cat "$OUT/new-migrations.txt"); do npx prisma db execute --file "prisma/migrations/$m/migration.sql" --schema prisma/schema.prisma; echo "replay $m rc=$?"; done
X
step migrate npx tsx scripts/db-scratch.mts --run bash /tmp/mig.sh
step backup-schema npm run verify:backup-schema
finish
