#!/usr/bin/env bash
# Lane DOORS chain 3: (1) the payload drive on a fresh WITHDRAWN server (question page included, the plant), (2) the
# ACTIVE door drive (job-doors.sh, the full matrix), (3) red:maswali-fence once no server of this tree runs. Each heavy step
# through the slot helper; one server of this tree at a time.
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/doors
bash "$S/mln-slot-s5x.sh" doors bash "$S/mln-server-run.sh" kipindi-mln-ddoor 3530 "$F/dark3-withdrawn.log" FEATURE_MILLIONEA=WITHDRAWN SKIP_QALIVE=1 -- bash "$F/job-dark.sh"
echo "withdrawn rc=$?"
bash "$S/mln-slot-s5x.sh" doors bash "$S/mln-server-run.sh" kipindi-mln-ddoor 3530 "$F/active.log" FEATURE_MILLIONEA=ACTIVE -- bash "$F/job-doors.sh"
echo "active rc=$?"
cd C:/50pick-ssd/kipindi-mln-ddoor || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
bash "$S/mln-slot-s5x.sh" doors npm run --silent red:maswali-fence > "$F/red-fence.log" 2>&1
echo "red:maswali-fence rc=$?"
tail -8 "$F/red-fence.log"
echo "tree after: [$(git status --short | tr '\n' ' ')]"
ls .red-* 2>/dev/null; ls scripts/.red-* 2>/dev/null
