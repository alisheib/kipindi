#!/usr/bin/env bash
# S5-R2-HUB 8 · H6 DIAGNOSTIC: the state drive's "after" state alone (run a), with the carry's own measurement and every
# server action recorded (INFO H6 timelines).
. "$CI_RUN/lib.sh"
if ! fc-list :lang=zh | grep -q .; then
  ( sudo apt-get update -q && sudo apt-get install -y -q fonts-noto-cjk ) > "$OUT/fonts-install.log" 2>&1
fi
export WARM="/millionea /millionea/how /millionea/tickets /markets"
serve 3550 FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=after -- \
  bash -c 'node scripts/maswali-hub-states.mjs > "$OUT/drive-after.log" 2>&1; rc=$?; echo "drive-after rc=$rc" | tee -a "$OUT/summary.txt"; grep -a -E "^(FAIL|INFO H6)|maswali-hub-states \(run" "$OUT/drive-after.log" | cut -c1-2500 | head -40; exit $rc' || LIB_FAILED=1
mkdir -p "$OUT/shots" && cp -r .50pick-shots/maswali-hub-states "$OUT/shots/" 2>/dev/null
finish
