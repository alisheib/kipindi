#!/usr/bin/env bash
# S6-ADMIN 3-6 on its head, part B: every suite on both stores that reads the services G1-G8 changed (the services' words,
# the discard's DAL write on both twins, the console's reads, the seal log's names), the reports' classification of the
# console and integrity modules, and the engine's red twin (G5's plants (110)-(112) among them) and the money path's
# plants that pin the re-worded lines (G4).
. "$CI_RUN/lib.sh"
step engine npm run test:maswali-engine
step adversarial npm run test:maswali-adversarial
step integrity npm run test:maswali-integrity
step evidence npm run test:maswali-evidence
step settle npm run test:maswali-settle
step void npm run test:maswali-void
step notify npm run test:maswali-notify
step shared-paths npm run test:maswali-shared-paths
step reporting npm run test:maswali-reporting
step batch-edit npm run test:maswali-batch-edit
step objections npm run test:maswali-objections
step purchase npm run test:maswali-purchase
step fence npm run test:maswali-fence
step hb-reports npm run test:house-bot-reports
step red-engine npm run red:maswali-engine
step red-objections npm run red:maswali-objections
step red-money-path-g4 npm run red:maswali-money-path -- --only "(S7-move-names),(S7-close-db-clock),(F2-stop-next-act)"
test -z "$(git status --porcelain)" && echo "tree clean after the reds" || { echo "TREE DIRTY after the reds"; LIB_FAILED=1; }
finish
