#!/usr/bin/env bash
# e2e:maswali-fault on Linux, then its plant: the harness without the child's own process group must turn 1.2 red.
. "$CI_RUN/lib.sh"
step fault npm run e2e:maswali-fault
keep=$LIB_FAILED
sed -i 's/, detached: process.platform !== "win32" })/ })/' scripts/maswali-fault.test.mts
if git diff --quiet -- scripts/maswali-fault.test.mts; then
  echo "PLANT NOT APPLIED"; keep=1
else
  git diff --stat -- scripts/maswali-fault.test.mts
  step fault-plant npm run e2e:maswali-fault
  if grep -q "^FAIL 1.2" "$OUT/fault-plant.log"; then echo "PLANT caught by 1.2"; else echo "PLANT MISSED"; keep=1; fi
fi
plant_check fault-plant scripts/maswali-fault.test.mts || keep=1
LIB_FAILED=$keep
finish
