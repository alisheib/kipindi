#!/usr/bin/env bash
# Lane DOORS (S5 round 2, ITEM 3): the ACTIVE door drive, run by mln-server-run.sh from the tree with BASE set
# (FEATURE_MILLIONEA=ACTIVE): the door pages of the player shots — every card state and both ghosts, measured in the real
# pages, /results' section and /positions' row — then the tiles copied out of the tree. DOOR_LOCALES / DOOR_WIDTHS narrow
# it (a focused run); unset = the full matrix. (From $S/s5ddoor/job-doors.sh, re-pointed for this lead's scratch.)
rm -rf .50pick-shots/maswali-player-shots
MASWALI_SHOTS_PAGES="${DOOR_PAGES:-door-ghosts,door-states,door-results}" MASWALI_SHOTS_LOCALES="${DOOR_LOCALES:-}" MASWALI_SHOTS_WIDTHS="${DOOR_WIDTHS:-}" \
  node scripts/maswali-player-shots.mjs > "$LOGBASE-shots.txt" 2>&1
rc=$?
grep -E "FAIL|passed|failed|PREMISE|FOCUSED" "$LOGBASE-shots.txt" | tail -60
echo "door shots rc=$rc"
rm -rf "$LOGBASE-tiles" && mkdir -p "$LOGBASE-tiles" && cp -r .50pick-shots/maswali-player-shots/. "$LOGBASE-tiles/" 2>/dev/null
echo "tiles copied: $(ls "$LOGBASE-tiles" | wc -l)"
echo "tree after: [$(git status --short | tr '\n' ' ')]"
exit $rc
