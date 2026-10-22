#!/usr/bin/env bash
# job-testall.sh — the lead's full battery on the gate tree (C:/50pick-ssd/kipindi-mln-gate, detached at the release head
# it was made at): `test:all` with the database suites, 3 jobs at once (six lanes share the machine), the lead's scratch
# PostgreSQL port. One Maswali slot holds it. Log: lead/gate2/test-all-<sha>.log; the tree is checked after.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
cd /c/50pick-ssd/kipindi-mln-gate || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp' KP_SCRATCH_PORT=5477
mkdir -p "$S/lead/gate2"
SHA=$(git rev-parse --short=9 HEAD)
LOG="$S/lead/gate2/test-all-$SHA.log"
echo "== start $(date -u +%FT%TZ) head $SHA" > "$LOG"
bash "$S/mln-slot-s5x.sh" lead-testall node scripts/test-all.mjs --jobs 3 >> "$LOG" 2>&1
rc=$?
echo "== exit $rc $(date -u +%FT%TZ)" >> "$LOG"
echo "== tree: $(git status --short | tr '\n' ' ')" >> "$LOG"
tail -40 "$LOG"
