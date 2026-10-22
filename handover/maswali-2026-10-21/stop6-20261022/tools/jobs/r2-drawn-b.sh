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
d break-nav 3508 FEATURE_MILLIONEA=ACTIVE -- node scripts/qa-millionea-break-nav.mjs "$OUT/break-nav"
d chat-yield 3509 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/qa-chat-yield.mjs "$OUT/chat-yield"
d chat-yield-red 3510 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/qa-chat-yield.mjs --prove-red "$OUT/chat-yield-red"
d rail-gaps 3511 FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- node scripts/qa-journey-rail-gaps.mjs "$OUT/rail-gaps"
d notice-widow 3512 FEATURE_MILLIONEA=STAFF_PREVIEW -- node scripts/qa-notice-bar-widow.mjs "$OUT/notice-widow"
finish
