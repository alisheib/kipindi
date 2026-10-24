#!/usr/bin/env bash
# The suites R2c left red at 774f333e7 (plus the layout passes the keep change touches), after their fixes.
. "$CI_RUN/lib.sh"
step typecheck npm run typecheck
for s in updown-config journey-estimate u43-card-compact spacing-scale below-stake-warning visual-pass-r10 visual-pass-r4i visual-pass-r9b house-bot-blob-pin house-bot-disclosure fee-model-census; do step "t-$s" npm run "test:$s"; done
finish
