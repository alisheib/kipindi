#!/usr/bin/env bash
# job-reds.sh <tree> <listfile> <tag> — every red:* twin named in <listfile> (one key without "red:" per line), run
# sequentially by the repo's own red:all runner (it fingerprints the tree after each harness), then the tree's status.
set -u
TREE="$1"; LIST="$2"; TAG="$3"
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
cd "C:/50pick-ssd/$TREE" || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp' KP_SCRATCH_PORT=${KP_SCRATCH_PORT:-5474}
FILTER=$(paste -sd, "$LIST")
echo "$(date -u +%T) red battery on $TREE at $(git rev-parse --short HEAD): $(wc -l < "$LIST") keys"
node scripts/red-all.mjs --filter "$FILTER" --timeout 900 > "$S/lead/reds-$TAG.log" 2>&1
rc=$?
echo "$(date -u +%T) red:all rc=$rc"
tail -60 "$S/lead/reds-$TAG.log"
echo "== git status after the battery:"
git status --short
exit $rc
