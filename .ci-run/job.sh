#!/usr/bin/env bash
# R5b guard fixes: the three suites it turned red, the switch suite, and types.
. "$CI_RUN/lib.sh"
step typecheck npm run typecheck
for s in pii-logs fee-model-census orphans fee-law-switch; do step "t-$s" npm run "test:$s"; done
finish
