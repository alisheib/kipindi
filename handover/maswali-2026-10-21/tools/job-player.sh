#!/usr/bin/env bash
# Render job "player": FEATURE_MILLIONEA=ACTIVE — the player drive, then the full player shots (tiles in the tree's
# .50pick-shots/maswali-player-shots/, copied to $LOGBASE-tiles/ afterwards so a later run cannot overwrite them).
all=0
echo "== maswali-player-drive on $BASE"
node scripts/maswali-player-drive.mjs > "$LOGBASE-drive.txt" 2>&1; rc=$?
grep -E "FAIL|passed|failed|SKIP|PREMISE" "$LOGBASE-drive.txt" | tail -20
echo "player-drive rc=$rc"; [ $rc -ne 0 ] && all=1
rm -rf .50pick-shots/maswali-player-shots
echo "== maswali-player-shots on $BASE"
node scripts/maswali-player-shots.mjs > "$LOGBASE-shots.txt" 2>&1; rc=$?
grep -E "FAIL|passed|failed|SKIP|PREMISE" "$LOGBASE-shots.txt" | tail -20
echo "player-shots rc=$rc"; [ $rc -ne 0 ] && all=1
mkdir -p "$LOGBASE-tiles" && cp -r .50pick-shots/maswali-player-shots/. "$LOGBASE-tiles/" 2>/dev/null
echo "tiles copied: $(ls "$LOGBASE-tiles" | wc -l)"
exit $all
