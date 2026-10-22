#!/usr/bin/env bash
# The release head 641603e2b (before S6-ADMIN merges): the console's shots and acceptance drive, to show which drive
# failures predate S6-ADMIN 6-7 (6.5, 6.5c, 6.5d read the raw hold marks the console no longer prints), with the tiles.
. "$CI_RUN/lib.sh"
serve 3541 FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- \
  bash -c 'node scripts/maswali-admin-shots.mjs > "$OUT/admin-shots.log" 2>&1; s=$?; echo "admin-shots rc=$s" >> "$OUT/summary.txt"; echo "---- [admin-shots] rc=$s"; tail -3 "$OUT/admin-shots.log"; node scripts/maswali-admin-drive.mjs > "$OUT/admin-drive.log" 2>&1; d=$?; echo "admin-drive rc=$d (base)" >> "$OUT/summary.txt"; echo "---- [admin-drive] rc=$d"; grep -E "^(FAIL|SKIP)" "$OUT/admin-drive.log" | head -40; tail -3 "$OUT/admin-drive.log"; exit 0' || LIB_FAILED=1
mkdir -p "$OUT/shots" && cp -r .50pick-shots/. "$OUT/shots/" 2>/dev/null; echo "tiles copied: $(find "$OUT/shots" -name '*.png' | wc -l)"
finish
