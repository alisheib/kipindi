#!/usr/bin/env bash
# S5 round 2 — the integrated head's drives, each on its OWN fresh in-memory dev server (several take a real break or
# publish an announcement on the dev store). Tiles land under .50pick-shots/ (brought back) and each drive's log in $OUT.
. "$CI_RUN/lib.sh"
QUIET="MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false"
d() { # d <name> <port> [VAR=v ...] -- <node script args...>
  local name="$1" port="$2"; shift 2
  local envs=(); while [ "$1" != "--" ]; do envs+=("$1"); shift; done; shift
  step "$name" serve "$port" "${envs[@]}" -- "$@"
}
# Dark (production's configuration): the rail, the doors' payloads with the census's plant, the landing row (Live alone).
d rail-dark 3501 -- env RAIL=dark node scripts/qa-classic-rail.mjs "$OUT/rail-dark"
d door-dark-w 3502 FEATURE_MILLIONEA=WITHDRAWN -- bash -c 'node scripts/maswali-door-dark.mjs && DOOR_DARK_PLANT=1 node scripts/maswali-door-dark.mjs'
d door-dark-sp 3503 FEATURE_MILLIONEA=STAFF_PREVIEW -- node scripts/maswali-door-dark.mjs
d landing-dark 3504 FEATURE_MILLIONEA=WITHDRAWN -- node scripts/landing-doors-shots.mjs
# Drawn (the product's configuration).
d rail-drawn 3505 FEATURE_MILLIONEA=ACTIVE -- env RAIL=drawn node scripts/qa-classic-rail.mjs "$OUT/rail-drawn"
d landing-active 3506 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/landing-doors-shots.mjs
d register-shots 3507 FEATURE_MILLIONEA=ACTIVE $QUIET -- env MASWALI_REGISTER_SCENARIO=states node scripts/maswali-register-shots.mjs
d break-nav 3508 FEATURE_MILLIONEA=ACTIVE -- node scripts/qa-millionea-break-nav.mjs "$OUT/break-nav"
d chat-yield 3509 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/qa-chat-yield.mjs "$OUT/chat-yield"
d chat-yield-red 3510 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/qa-chat-yield.mjs --prove-red "$OUT/chat-yield-red"
d rail-gaps 3511 FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- node scripts/qa-journey-rail-gaps.mjs "$OUT/rail-gaps"
d notice-widow 3512 FEATURE_MILLIONEA=STAFF_PREVIEW -- node scripts/qa-notice-bar-widow.mjs "$OUT/notice-widow"
d route-entrance 3513 -- node scripts/qa-route-entrance.mjs
d hover-touch 3514 -- node scripts/qa-hover-touch.mjs
d break-money-doors 3515 -- node scripts/qa-break-money-doors.mjs "$OUT/break-money-doors"
finish
