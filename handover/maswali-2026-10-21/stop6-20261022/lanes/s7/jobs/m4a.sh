#!/usr/bin/env bash
# S7-MERGE 4 proof, part A: the typecheck, the static and browser suites the merge touches, the D19a pins (item 1) and
# both objection drives, each on its own FRESH in-memory dev server (item 2, and the door because its seed moved).
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step blob-pin npm run test:house-bot-blob-pin
step disclosure npm run test:house-bot-disclosure
step red-anchors npm run test:red-anchors
step design npm run test:maswali-design
step doors npm run test:maswali-doors
step hub npm run test:maswali-hub
step register npm run test:maswali-register
step tickets npm run test:maswali-tickets
step facts npm run test:maswali-facts
step seed-clock npm run test:maswali-seed-clock
step plan npm run test:maswali-plan
step ui npm run test:maswali-ui
step money npm run test:maswali-money
step design-register npm run test:maswali-design-register
step slip-design npm run test:maswali-slip-design
step week-money npm run test:maswali-week-money
step week-cache npm run test:maswali-week-cache
step i18n npm run test:maswali-i18n
step shell npm run test:millionea-shell
step dark-edge npm run test:millionea-dark-edge
step journey-home npm run test:journey-home
step betting-ink npm run test:betting-ink
step design-frozen npm run test:design-frozen
step r5h npm run test:visual-pass-r5h
step r5i npm run test:visual-pass-r5i
step r7b npm run test:visual-pass-r7b
step r7c npm run test:visual-pass-r7c
step r8b npm run test:visual-pass-r8b
step r9a npm run test:visual-pass-r9a
step gold npm run test:gold-is-money
step glyph-source npm run test:glyph-source
step guards-exist npm run test:guards-exist
step ui-consistency npm run test:ui-consistency
step control-gates npm run test:control-gates
step rbac npm run test:maswali-rbac
step admin-touch npm run test:maswali-admin-touch
step labels npm run test:labels
step popup-fit npm run test:popup-fit
step cert-c1 npm run test:cert-c1
step fact-mark npm run test:maswali-fact-mark
step strike npm run test:maswali-strike
serve 3530 FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  bash -c 'node scripts/maswali-objection-console-drive.mjs > "$OUT/objection-console.log" 2>&1; rc=$?; echo "objection-console rc=$rc" >> "$OUT/summary.txt"; echo "---- [objection-console] rc=$rc"; tail -40 "$OUT/objection-console.log"; exit $rc' || LIB_FAILED=1
serve 3531 FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  bash -c 'node scripts/maswali-objection-door-drive.mjs > "$OUT/objection-door.log" 2>&1; rc=$?; echo "objection-door rc=$rc" >> "$OUT/summary.txt"; echo "---- [objection-door] rc=$rc"; tail -40 "$OUT/objection-door.log"; exit $rc' || LIB_FAILED=1
finish
