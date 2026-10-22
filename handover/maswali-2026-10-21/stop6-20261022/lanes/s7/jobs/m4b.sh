#!/usr/bin/env bash
# S7-MERGE 4 proof, part B: every Maswali suite that runs on both stores (memory, then scratch PostgreSQL 18.3), the two
# money e2e suites, and the house-bot reports memory child (it re-derives the settlement's ledger pins).
. "$CI_RUN/lib.sh"
step engine npm run test:maswali-engine
step purchase npm run test:maswali-purchase
step settle npm run test:maswali-settle
step void npm run test:maswali-void
step close-race npm run test:maswali-close-race
step shared-paths npm run test:maswali-shared-paths
step adversarial npm run test:maswali-adversarial
step player npm run test:maswali-player
step fence npm run test:maswali-fence
step integrity npm run test:maswali-integrity
step objections npm run test:maswali-objections
step hub-reads npm run test:maswali-hub-reads
step batch-edit npm run test:maswali-batch-edit
step money-e2e npm run e2e:maswali-money
step fault-e2e npm run e2e:maswali-fault
step reports-mem env DATABASE_URL="" USE_PRISMA_DAL=false HB_MONEY_STORE=memory npx tsx scripts/lib/house-bot-reports-cases.mts
finish
