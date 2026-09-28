#!/usr/bin/env bash
# The four house-bot fleets driven WHOLE (RESUME-HERE §0b) — console, engine, money+seam and c5 — in a DEDICATED
# detached worktree at one commit, beside the checkout it is run from (`<parent>/kipindi-hb-fleet`).
#
#   bash plans/house-bots/tools/fleet.sh <sha>          # drive (hours: ~700 mutations, each slice under the lock)
#   bash plans/house-bots/tools/fleet.sh <sha> --dry    # print the slices and stop; creates nothing
#
# ⛔ A red runner rewrites tracked files in place, which is why it drives only in its own tree and why every slice
#    starts by refusing a DIRTY tree. ⭐ RESUMABLE: each slice writes its own log ending in `EXIT=`, and a slice whose
#    log already has one is skipped — so after a restart, run the same command again. Each slice takes the lock on its
#    own with a 60 s pause between, so other lanes get the machine. Logs: $FLEET_LOGS/<sha> (default ~/house-bots-fleet).
#    Read them with: grep -E "MISSED|WRONG-ASSERTION|STALE|DIRTY|NOT MEASURED|RED: |EXIT=" <logs>/slice-*.log
set -u
ROOT=$(git rev-parse --show-toplevel) || exit 2
SHA=$(git -C "$ROOT" rev-parse --short=8 "${1:?usage: fleet.sh <sha> [--dry]}") || exit 2
TOOLS="$ROOT/plans/house-bots/tools"
if [ "${2:-}" = "--dry" ]; then (cd "$ROOT" && node "$TOOLS/fleet-slices.mjs"); exit $?; fi
FT="$(dirname "$ROOT")/kipindi-hb-fleet"
D="${FLEET_LOGS:-$HOME/house-bots-fleet}/$SHA"
mkdir -p "$D"
log() { echo "[$(date -u +%H:%M:%S)Z] $*" >> "$D/fleet.log"; }
if [ ! -e "$FT" ]; then
  git -C "$ROOT" worktree add --detach "$FT" "$SHA" > /dev/null 2>&1 || { log "worktree add failed"; exit 4; }
  cmd //c mklink //J "$(cygpath -w "$FT/node_modules")" "$(cygpath -w "$ROOT/node_modules")" > /dev/null 2>&1
  log "fleet tree created at $(git -C "$FT" rev-parse --short=8 HEAD)"
else
  [ "$(git -C "$FT" rev-parse --short=8 HEAD)" = "$SHA" ] || { log "fleet tree exists at another commit — refusing"; exit 3; }
  log "fleet tree resumed at $SHA, dirty=$(git -C "$FT" status --short | wc -l)"
fi
cd "$FT" || exit 4
[ -s "$D/slices.tsv" ] || node "$TOOLS/fleet-slices.mjs" > "$D/slices.tsv" 2>> "$D/fleet.log" || { log "slice list refused"; exit 6; }
log "slices: $(wc -l < "$D/slices.tsv")"
[ -s "$D/redanchors.log" ] || { bash ~/heavy-node-lock.sh run housebots-fleet npx tsx scripts/red-anchors.test.mts > "$D/redanchors.log" 2>&1; log "$(grep -a -E 'red-anchors:' "$D/redanchors.log")"; }
i=0
while IFS=$'\t' read -r harness flag args; do
  i=$((i+1)); L="$D/slice-$(printf %02d $i).log"
  if [ -s "$L" ] && grep -q "^EXIT=" "$L"; then continue; fi
  [ "$(git status --short | wc -l)" = "0" ] || { log "tree DIRTY before slice $i — stopping; inspect $FT"; exit 7; }
  log "slice $i · $harness $flag ${args:0:60}…"
  bash ~/heavy-node-lock.sh run housebots-fleet env KP_SCRATCH_PORT=5453 node "$harness" "$flag" "$args" > "$L" 2>&1
  echo "EXIT=$?" >> "$L"
  log "slice $i done · $(grep -a -E 'RED: |[0-9]+/[0-9]+ caught' "$L" | tail -1) · $(tail -1 "$L") · dirty=$(git status --short | wc -l)"
  sleep 60
done < "$D/slices.tsv"
cd "$ROOT" || exit 4
if [ "$(git -C "$FT" status --short | wc -l)" = "0" ]; then
  cmd //c rmdir "$(cygpath -w "$FT/node_modules")" > /dev/null 2>&1 && git -C "$ROOT" worktree remove "$FT" && log "fleet tree removed"
else
  log "fleet tree LEFT IN PLACE — dirty; inspect before removing"
fi
log "ALL DONE"
touch "$D/fleet.done"
