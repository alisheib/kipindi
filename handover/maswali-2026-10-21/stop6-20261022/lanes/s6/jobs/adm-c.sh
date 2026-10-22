#!/usr/bin/env bash
# S6-ADMIN 7 on its head: the five reds of run 39824239196 re-run (admin-plain + its red, rbac + its red, unsaved-changes,
# the drive), the shots and the drive on one fresh in-memory dev server with every tile copied into $OUT (the artifact
# leaves hidden folders out), then part B: every suite on both stores that reads the services G1-G8 changed, the reports'
# classification, and the engine's, the objections' and the money path's plants on the re-worded lines.
. "$CI_RUN/lib.sh"
step tsc npx tsc --noEmit
step red-anchors npm run test:red-anchors
step admin-plain npm run test:maswali-admin-plain
step red-admin-plain npm run red:maswali-admin-plain
step rbac npm run test:maswali-rbac
step red-rbac npm run red:maswali-rbac
step unsaved-changes npm run test:unsaved-changes
step admin-words npm run test:maswali-admin-words
step docs npm run test:docs
step retention npm run test:retention
step erasure npm run test:erasure
serve 3540 FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  bash -c 'node scripts/maswali-admin-shots.mjs > "$OUT/admin-shots.log" 2>&1; s=$?; echo "admin-shots rc=$s" >> "$OUT/summary.txt"; echo "---- [admin-shots] rc=$s"; tail -3 "$OUT/admin-shots.log"; node scripts/maswali-admin-drive.mjs > "$OUT/admin-drive.log" 2>&1; d=$?; echo "admin-drive rc=$d" >> "$OUT/summary.txt"; echo "---- [admin-drive] rc=$d"; grep -E "^(FAIL|SKIP)" "$OUT/admin-drive.log" | head -40; tail -3 "$OUT/admin-drive.log"; [ $s -eq 0 ] && [ $d -eq 0 ]' || LIB_FAILED=1
mkdir -p "$OUT/shots" && cp -r .50pick-shots/. "$OUT/shots/" 2>/dev/null; echo "tiles copied: $(find "$OUT/shots" -name '*.png' | wc -l)"
step engine npm run test:maswali-engine
step adversarial npm run test:maswali-adversarial
step integrity npm run test:maswali-integrity
step evidence npm run test:maswali-evidence
step settle npm run test:maswali-settle
step void npm run test:maswali-void
step notify npm run test:maswali-notify
step shared-paths npm run test:maswali-shared-paths
step reporting npm run test:maswali-reporting
step batch-edit npm run test:maswali-batch-edit
step objections npm run test:maswali-objections
step purchase npm run test:maswali-purchase
step fence npm run test:maswali-fence
step hb-reports npm run test:house-bot-reports
step red-engine npm run red:maswali-engine
step red-objections npm run red:maswali-objections
step red-money-path-g4 npm run red:maswali-money-path -- --only "(S7-move-names),(S7-close-db-clock),(F2-stop-next-act)"
test -z "$(git status --porcelain)" && echo "tree clean after the reds" || { echo "TREE DIRTY after the reds"; git status --short | head; LIB_FAILED=1; }
finish
