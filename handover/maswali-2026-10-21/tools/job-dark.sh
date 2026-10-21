#!/usr/bin/env bash
# Render job "dark": production's configuration (no FEATURE_MILLIONEA = the shipped WITHDRAWN ceiling).
# Runs from the tree (cwd) with BASE and LOGBASE set by mln-server-run.sh.
all=0
echo "== qa:live (pre-deploy-live-check) on $BASE"
node scripts/pre-deploy-live-check.mjs > "$LOGBASE-qalive.txt" 2>&1; rc=$?
grep -E "✗|ALL PASS|passed, |NOT MEASURED" "$LOGBASE-qalive.txt" | tail -15
echo "qa:live rc=$rc"; [ $rc -ne 0 ] && all=1
echo "== maswali-player-drive (WITHDRAWN: step W) on $BASE"
node scripts/maswali-player-drive.mjs > "$LOGBASE-drive.txt" 2>&1; rc=$?
grep -E "FAIL|PASS|passed|failed|SKIP|PREMISE" "$LOGBASE-drive.txt" | tail -15
echo "player-drive rc=$rc"; [ $rc -ne 0 ] && all=1
for s in revoked-deadend.test.mjs motion-adoption-verify.mjs admin-section-gate.test.mjs needle-rest.test.mjs; do
  echo "== $s on $BASE (WITHDRAWN)"
  node "scripts/$s" > "$LOGBASE-$s.txt" 2>&1; rc=$?
  grep -E "FAIL|✗|passed|failed|PASS:|failures" "$LOGBASE-$s.txt" | tail -6
  echo "$s rc=$rc"; [ $rc -ne 0 ] && all=1
done
exit $all
