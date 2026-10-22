#!/usr/bin/env bash
# S6-INT 21 proof, part A (the merge of S7 at a7feccbef into the S6 release): the typecheck, the static suites that read
# the conflicted files and the merged dictionary, the rbac red twin (S6's and S7-OB's plants), and both objection drives,
# each on a FRESH in-memory dev server (the integrity page and the ticket page merged both lanes' cards).
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step red-anchors npm run test:red-anchors
step blob-pin npm run test:house-bot-blob-pin
step disclosure npm run test:house-bot-disclosure
step control-gates npm run test:control-gates
step rbac npm run test:maswali-rbac
step dal-parity npm run test:dal-parity
step integrity-list npm run test:maswali-integrity-list
step claims npm run test:maswali-claims
step client-graph npm run test:client-graph-safe
step i18n npm run test:i18n
step maswali-i18n npm run test:maswali-i18n
step design npm run test:maswali-design
step labels npm run test:labels
step failure-reasons npm run test:failure-reasons
step feedback-law npm run test:feedback-law
step operator-error npm run test:operator-error
step maswali-law npm run test:maswali-law
step maswali-config npm run test:maswali-config
step maswali-plan npm run test:maswali-plan
step docs npm run test:docs
step cert-c1 npm run test:cert-c1
step cert-c3 npm run test:cert-c3
step notifications-page npm run test:notifications-page
step admin-form-validation npm run test:maswali-admin-form-validation
step admin-touch npm run test:maswali-admin-touch
step unsaved-changes npm run test:unsaved-changes
step admin-act-gate npm run test:admin-act-gate
step read-tiers npm run test:read-tiers
step red-rbac npm run red:maswali-rbac
serve 3530 FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  bash -c 'node scripts/maswali-objection-console-drive.mjs > "$OUT/objection-console.log" 2>&1; rc=$?; echo "objection-console rc=$rc" >> "$OUT/summary.txt"; echo "---- [objection-console] rc=$rc"; tail -40 "$OUT/objection-console.log"; exit $rc' || LIB_FAILED=1
serve 3531 FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  bash -c 'node scripts/maswali-objection-door-drive.mjs > "$OUT/objection-door.log" 2>&1; rc=$?; echo "objection-door rc=$rc" >> "$OUT/summary.txt"; echo "---- [objection-door] rc=$rc"; tail -40 "$OUT/objection-door.log"; exit $rc' || LIB_FAILED=1
finish
