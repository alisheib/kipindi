#!/usr/bin/env bash
# Lane DOORS (S5 round 2, ITEM 1's real bytes): run by mln-server-run.sh from the tree with BASE set, on a server started with
# FEATURE_MILLIONEA=WITHDRAWN or STAFF_PREVIEW:
#   1. qa:live's dark section, locally (QA_LIVE_ROLLOUT_ONLY=1: the focused rollout control — [M] included);
#   2. the doors' payload drive (qa:maswali-door-dark), with the in-place plant on a WITHDRAWN server;
#   3. on STAFF_PREVIEW, when DOOR_PREVIEW_SHOTS=1: the doors at STAFF_PREVIEW (qa:maswali-door-preview) on the same server.
# Then the tree is checked: a plant must never outlive the run.
if [ "${SKIP_QALIVE:-0}" != "1" ]; then
  QA_LIVE_ROLLOUT_ONLY=1 node scripts/pre-deploy-live-check.mjs > "$LOGBASE-qalive.txt" 2>&1
  echo "qa:live (focused) rc=$?"
  grep -E "^\[M\]|Millionea|FOCUSED|✗|passed|failed" "$LOGBASE-qalive.txt" | tail -40
fi
if [ "$FEATURE_MILLIONEA" = "WITHDRAWN" ]; then PLANT=1; else PLANT=0; fi
DOOR_DARK_PLANT=$PLANT node scripts/maswali-door-dark.mjs > "$LOGBASE-dark.txt" 2>&1
rc=$?
echo "door-dark rc=$rc"
grep -E "^FAIL|PREMISE|PLANT|CONTROL|maswali-door-dark:" "$LOGBASE-dark.txt" | tail -40
if [ "$FEATURE_MILLIONEA" = "STAFF_PREVIEW" ] && [ "${DOOR_PREVIEW_SHOTS:-0}" = "1" ]; then
  rm -rf .50pick-shots/maswali-door-preview
  node scripts/maswali-door-preview-shots.mjs > "$LOGBASE-preview.txt" 2>&1
  prc=$?
  grep -E "FAIL|passed|failed|PREMISE|FOCUSED|weeks:" "$LOGBASE-preview.txt" | tail -40
  echo "door preview rc=$prc"
  rm -rf "$LOGBASE-preview-tiles" && mkdir -p "$LOGBASE-preview-tiles" && cp -r .50pick-shots/maswali-door-preview/. "$LOGBASE-preview-tiles/" 2>/dev/null
  echo "preview tiles copied: $(ls "$LOGBASE-preview-tiles" | wc -l)"
fi
echo "tree after: [$(git status --short | tr '\n' ' ')]"
exit $rc
