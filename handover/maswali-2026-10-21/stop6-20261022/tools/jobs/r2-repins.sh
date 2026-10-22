#!/usr/bin/env bash
# The four re-pinned suites on the merged round-2 head, their red twins where they exist, and tsc.
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step r4j npm run test:visual-pass-r4j
step shell npm run test:millionea-shell
step landing npm run test:landing-doors
step landing-red npm run red:landing-doors
step spacing npm run test:spacing-scale
step source-bytes npm run test:source-bytes
finish
