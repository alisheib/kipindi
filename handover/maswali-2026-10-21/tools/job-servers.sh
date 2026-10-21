#!/usr/bin/env bash
# Render job "servers": the server-bound test:all members under FEATURE_MILLIONEA=ACTIVE.
all=0
for s in revoked-deadend.test.mjs motion-adoption-verify.mjs admin-section-gate.test.mjs needle-rest.test.mjs; do
  echo "== $s on $BASE"
  node "scripts/$s" > "$LOGBASE-$s.txt" 2>&1; rc=$?
  grep -E "FAIL|✗|passed|failed|PASS:|failures" "$LOGBASE-$s.txt" | tail -6
  echo "$s rc=$rc"
  [ $rc -ne 0 ] && all=1
done
exit $all
