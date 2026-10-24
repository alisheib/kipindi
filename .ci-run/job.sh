#!/usr/bin/env bash
# e2e:card alone on a fresh, certified scratch PostgreSQL — the baseline question: does it pass at this commit?
. "$CI_RUN/lib.sh"
cat > "$OUT/pg-card.sh" <<EOS
set -u
export DATABASE_URL="\$VERIFY_DATABASE_URL"
export USE_PRISMA_DAL=true
npx prisma migrate deploy > "$OUT/pg-card-migrate.log" 2>&1 || { echo "MIGRATE FAILED"; exit 3; }
node scripts/load/ci-plant-marker.mjs || exit 3
npm run -s e2e:card
EOS
step pg-e2e-card npx tsx scripts/db-scratch.mts --run bash "$OUT/pg-card.sh"
finish
