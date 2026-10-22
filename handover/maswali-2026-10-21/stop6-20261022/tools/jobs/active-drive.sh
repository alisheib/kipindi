#!/usr/bin/env bash
# The product's own drive (maswali-player-drive, FEATURE_MILLIONEA=ACTIVE + the journey previewable: steps 1–6) ALONE, on a
# fresh in-memory dev server, bounded to 60 minutes, its output written to $OUT as it goes (so a hang still leaves its last
# lines), the CJK face installed, its tiles kept. It hung past 180 minutes inside the gate's dark job twice.
. "$CI_RUN/lib.sh"
sudo apt-get install -y --no-install-recommends fonts-noto-cjk > "$OUT/apt-cjk.log" 2>&1 || echo "fonts-noto-cjk install failed (see apt-cjk.log)"
fc-list | grep -ci "noto.*cjk" | sed 's/^/CJK faces: /'
step active-drive serve 3599 FEATURE_MILLIONEA=ACTIVE FEATURE_SIMPLEJOURNEY=STAFF_PREVIEW MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  timeout --signal=TERM --kill-after=30 3600 node scripts/maswali-player-drive.mjs
echo "---- the drive's last 60 lines"; tail -60 "$OUT/active-drive.log"
mkdir -p "$OUT/tiles" && cp -r .50pick-shots/maswali-player "$OUT/tiles/" 2>/dev/null
finish
