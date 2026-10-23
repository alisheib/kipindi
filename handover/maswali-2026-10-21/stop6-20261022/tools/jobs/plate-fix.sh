#!/usr/bin/env bash
# The door-ghost plate fix: tsc, the doors suite and the suites that read the edited files, then the EXACT production rule
# (qa:chunks-prod) against a fresh in-memory server with Millionea ACTIVE — the state production is in — on every route,
# and the door census on WITHDRAWN (with its plant) and STAFF_PREVIEW so the dark rules still hold.
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step doors npm run test:maswali-doors
step dead-css npm run test:dead-css
step css-vars npm run test:css-vars-defined
step design-one-door npm run test:design-one-door
step r4j npm run test:visual-pass-r4j
step r5j npm run test:visual-pass-r5j
step journey-home npm run test:journey-home
step chunks-active serve 3611 FEATURE_MILLIONEA=ACTIVE -- npm run -s qa:chunks-prod -- --origin http://localhost:3611
step door-dark-w serve 3612 FEATURE_MILLIONEA=WITHDRAWN -- bash -c 'node scripts/maswali-door-dark.mjs && DOOR_DARK_PLANT=1 node scripts/maswali-door-dark.mjs'
step door-dark-sp serve 3613 FEATURE_MILLIONEA=STAFF_PREVIEW -- node scripts/maswali-door-dark.mjs
finish
