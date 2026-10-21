#!/usr/bin/env bash
# Render job "slip": FEATURE_MILLIONEA=ACTIVE — the multi-ticket slip drive (MB-89: two different tickets, one
# reviewed charge, both serials), tiles copied to $LOGBASE-tiles/.
rm -rf .50pick-shots/maswali-multi-slip
echo "== maswali-multi-slip-drive on $BASE"
node scripts/maswali-multi-slip-drive.mjs > "$LOGBASE-drive.txt" 2>&1; rc=$?
grep -E "FAIL|passed|failed|PREMISE" "$LOGBASE-drive.txt" | tail -20
echo "multi-slip rc=$rc"
mkdir -p "$LOGBASE-tiles" && cp -r .50pick-shots/maswali-multi-slip/. "$LOGBASE-tiles/" 2>/dev/null
exit $rc
