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
d rail-drawn 3505 FEATURE_MILLIONEA=ACTIVE -- env RAIL=drawn node scripts/qa-classic-rail.mjs "$OUT/rail-drawn"
d landing-active 3506 FEATURE_MILLIONEA=ACTIVE $QUIET -- node scripts/landing-doors-shots.mjs
d register-shots 3507 FEATURE_MILLIONEA=ACTIVE $QUIET -- env MASWALI_REGISTER_SCENARIO=states node scripts/maswali-register-shots.mjs
finish
