#!/usr/bin/env bash
# S6-ADMIN 6 (G2-G8) on its head, part A: tsc, the console's static suites and their reds (the new admin-plain suite with
# its 14 plants, G1's census, the form validation, the lists), the readers of every file the change touched, then the
# console's shots (every page at 360/768/1280/1920, plus the changed cards scrolled into view) and its acceptance drive,
# both on ONE fresh in-memory dev server (the shots seed it; the drive runs right after, as its header asks).
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step red-anchors npm run test:red-anchors
step admin-plain npm run test:maswali-admin-plain
step red-admin-plain npm run red:maswali-admin-plain
step admin-words npm run test:maswali-admin-words
step red-admin-words npm run red:maswali-admin-words
step form-validation npm run test:maswali-admin-form-validation
step red-form-validation npm run red:maswali-admin-form-validation
step admin-touch npm run test:maswali-admin-touch
step admin-checklist npm run test:maswali-admin-checklist
step week-controls npm run test:maswali-week-controls
step red-week-controls npm run red:maswali-week-controls
step question-fields npm run test:maswali-admin-question-fields
step pools-query npm run test:maswali-admin-pools-query
step week-list npm run test:maswali-week-list
step red-week-list npm run red:maswali-week-list
step integrity-list npm run test:maswali-integrity-list
step register-cache npm run test:maswali-register-cache
step rbac npm run test:maswali-rbac
step red-rbac npm run red:maswali-rbac
step control-gates npm run test:control-gates
step admin-act-gate npm run test:admin-act-gate
step unsaved-changes npm run test:unsaved-changes
step client-graph npm run test:client-graph-safe
step read-tiers npm run test:read-tiers
step admin-nav npm run test:admin-nav
step maswali-config npm run test:maswali-config
step maswali-design npm run test:maswali-design
step labels npm run test:labels
step failure-reasons npm run test:failure-reasons
step source-bytes npm run test:source-bytes
serve 3540 FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  bash -c 'node scripts/maswali-admin-shots.mjs > "$OUT/admin-shots.log" 2>&1; s=$?; echo "admin-shots rc=$s" >> "$OUT/summary.txt"; echo "---- [admin-shots] rc=$s"; tail -30 "$OUT/admin-shots.log"; node scripts/maswali-admin-drive.mjs > "$OUT/admin-drive.log" 2>&1; d=$?; echo "admin-drive rc=$d" >> "$OUT/summary.txt"; echo "---- [admin-drive] rc=$d"; grep -E "^(FAIL|SKIP)" "$OUT/admin-drive.log" | head -40; tail -4 "$OUT/admin-drive.log"; [ $s -eq 0 ] && [ $d -eq 0 ]' || LIB_FAILED=1
finish
