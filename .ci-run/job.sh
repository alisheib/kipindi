#!/usr/bin/env bash
# R5b: the switch suite, and every suite that reads the files it touched (boot, health, the gate).
. "$CI_RUN/lib.sh"
step typecheck npm run typecheck
for s in fee-law-switch fee-gate audit-drain health-readiness contacts-boundary maswali-claims monitoring money-busy multi-container house-bot-holder-lifecycle encoding; do step "t-$s" npm run "test:$s"; done
finish
