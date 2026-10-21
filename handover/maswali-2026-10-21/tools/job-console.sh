#!/usr/bin/env bash
# Render job "console": FEATURE_MILLIONEA=ACTIVE, the Millionea tick and the lifecycle ticker off (the drive's week void).
# Tiles in the tree's .50pick-shots/maswali/, copied to $LOGBASE-tiles/.
all=0
rm -rf .50pick-shots/maswali
echo "== maswali-admin-shots on $BASE"
node scripts/maswali-admin-shots.mjs > "$LOGBASE-shots.txt" 2>&1; rc=$?
grep -E "FAIL|passed|failed|SKIP" "$LOGBASE-shots.txt" | tail -20
echo "admin-shots rc=$rc"; [ $rc -ne 0 ] && all=1
mkdir -p "$LOGBASE-tiles" && cp -r .50pick-shots/maswali/. "$LOGBASE-tiles/" 2>/dev/null
echo "== maswali-admin-drive on $BASE"
node scripts/maswali-admin-drive.mjs > "$LOGBASE-drive.txt" 2>&1; rc=$?
grep -E "FAIL|passed|failed|SKIP" "$LOGBASE-drive.txt" | tail -20
echo "admin-drive rc=$rc"; [ $rc -ne 0 ] && all=1
exit $all
