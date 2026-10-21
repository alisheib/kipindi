#!/usr/bin/env bash
# u43-matrix.sh <round-tag> <sha>
# The full U43 state matrix (7 widths x 3 languages x guest/player x every phase) in small width groups, because one
# run cannot photograph 14 cells inside betting's 30-second last call. Three trees run in parallel, each with its own
# fresh in-memory dev server and port; every tree is first moved (detached) to the SAME committed <sha>.
# Each group is one u43-slot.sh job. Writes .qa-shots/u43/<round-tag>-<lang>-<widths>/ in each tree, then copies every
# group folder into kipindi-udv/.qa-shots/u43/<round-tag>/ so the review reads one place.
set -u
TAG=$1; SHA=$2
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/369118b0-cff5-4315-9366-aad1558bd40d/scratchpad
TREES=(C:/50pick-ssd/kipindi-udv C:/50pick-ssd/kipindi-u43-cap1 C:/50pick-ssd/kipindi-u43-cap2)
PORTS=(3511 3512 3513)
GROUPS=("320,360" "390,768" "1024,1280" "1920")
LANGS=(sw en zh)
for t in "${TREES[@]}"; do
  if [ "$t" != "C:/50pick-ssd/kipindi-udv" ]; then git -C "$t" checkout -q --detach "$SHA" || exit 2; fi
  [ "$(git -C "$t" rev-parse HEAD)" = "$(git -C C:/50pick-ssd/kipindi-udv rev-parse "$SHA")" ] || { echo "tree $t not at $SHA"; exit 2; }
  [ -z "$(git -C "$t" status --porcelain --untracked-files=no)" ] || { echo "tree $t dirty"; exit 2; }
done
JOBS=()
for L in "${LANGS[@]}"; do for G in "${GROUPS[@]}"; do JOBS+=("$L|$G"); done; done
run_lane() {
  local lane=$1; local tree=${TREES[$lane]}; local port=${PORTS[$lane]}
  local i=$lane
  while [ $i -lt ${#JOBS[@]} ]; do
    local L=${JOBS[$i]%%|*}; local G=${JOBS[$i]##*|}; local gt=${G//,/-}
    local log="$S/logs/$TAG-$L-$gt.log"
    echo "$(date -u +%T) lane $lane start $L $G" >> "$S/logs/$TAG.matrix.log"
    ( cd "$tree" && bash "$S/u43-slot.sh" "mx-$L-$gt" bash "$S/u43-server-run.sh" "$tree" "$port" "$log" -- \
        env MATRIX=full LOCALES="$L" WIDTHS="$G" REQUIRE_CLEAN=1 TAG="$TAG-$L-$gt" node scripts/live/updown-visual-states.mjs ) \
      > "$log.slot" 2>&1
    echo "$(date -u +%T) lane $lane done $L $G rc=$? $(grep -a -o 'U43 states .*' "$log" | tail -n 1)" >> "$S/logs/$TAG.matrix.log"
    i=$((i + ${#TREES[@]}))
  done
}
: > "$S/logs/$TAG.matrix.log"
for lane in 0 1 2; do run_lane $lane & done
wait
mkdir -p "C:/50pick-ssd/kipindi-udv/.qa-shots/u43/$TAG"
for t in "${TREES[@]}"; do
  for d in "$t"/.qa-shots/u43/"$TAG"-*; do [ -d "$d" ] && cp -r "$d" "C:/50pick-ssd/kipindi-udv/.qa-shots/u43/$TAG/"; done
done
echo "$(date -u +%T) matrix done" >> "$S/logs/$TAG.matrix.log"
