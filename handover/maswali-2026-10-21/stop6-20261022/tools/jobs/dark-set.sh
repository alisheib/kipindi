#!/usr/bin/env bash
# The gate's dark set (production's configuration: no FEATURE_MILLIONEA) on this tree, each check on its OWN fresh
# in-memory dev server so one check's leftovers can never fail another; every check runs whatever an earlier one did.
. "$CI_RUN/lib.sh"
for s in pre-deploy-live-check.mjs maswali-player-drive.mjs revoked-deadend.test.mjs motion-adoption-verify.mjs admin-section-gate.test.mjs needle-rest.test.mjs; do
  if [ -f "scripts/$s" ]; then
    step "dark-${s%%.*}" serve 3600 -- node "scripts/$s"
  else
    echo "---- [dark-${s%%.*}] not on this tree"
  fi
done
finish
