#!/usr/bin/env bash
# Every suite that reads docs/MASWALI-PLAN.md or docs/NEXT-PLAN.md, after a docs-only change to them.
. "$CI_RUN/lib.sh"
step plan npm run test:maswali-plan
step plan-red npm run red:maswali-plan
step docs npm run test:docs
for s in landing-ten-plan marketing-setup-plan mobile-visual-plan phosphor-plan vodacom-plan maswali-fence maswali-engine maswali-player maswali-purchase maswali-settle maswali-void; do
  step "$s" npm run "test:$s"
done
finish
