#!/usr/bin/env bash
# S6-INT 21 proof, part B: every Maswali suite that runs on both stores (memory, then scratch PostgreSQL 18.3), the
# objection suite S7 brought, and the house-bot suites that read the settlement's and the console's money and reports.
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
step evidence npm run test:maswali-evidence
step fairness npm run test:maswali-fairness
step reporting npm run test:maswali-reporting
step notify npm run test:maswali-notify
step hub-reads npm run test:maswali-hub-reads
step batch-edit npm run test:maswali-batch-edit
step hb-money npm run test:house-bot-money
step hb-reports npm run test:house-bot-reports
step hb-console npm run test:house-bot-console
finish
