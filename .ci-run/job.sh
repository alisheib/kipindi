#!/usr/bin/env bash
# The five suites R2a+R2b left red at 6b7f35085, re-run after their re-pins.
. "$CI_RUN/lib.sh"
step typecheck npm run typecheck
for s in fee-model-census house-bot-rules house-bot-reports house-bot-disclosure journey-measures-view; do step "t-$s" npm run "test:$s"; done
finish
