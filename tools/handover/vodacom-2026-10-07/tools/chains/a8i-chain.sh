#!/usr/bin/env bash
# A8i on ALI-BLADE15 (2026-10-06): the real-browser proof on the rebased tree, each step its own heavy-lock job so other
# lanes interleave; then A8h's drives on the A8i tree (they press the same dialogs) and A8h's crash control with its
# diagnosis. Never touch C:\kipindi-journey while this runs. usage: a8i-chain.sh <tag> [drives|all]   → $N/<tag>/chain.log, chain.done
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0cb4430f-1841-4f87-b929-7c29d30c9a10/scratchpad/s6
N=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/4d434d2f-fa0e-4e9b-8bfa-71eeeb679f82/scratchpad/a8i
TAG="${1:-c1}"
A=$N/$TAG
mkdir -p "$A"
LOG=$A/chain.log
rm -f "$A/chain.done"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
clean_or_stop() {
  cd /c/kipindi-journey || exit 2
  d=$(git status --short | grep -v '^??' | head -5 | tr '\n' ' ')
  if [ -n "$d" ]; then note "STOP after $1: the tracked tree is modified: $d"; echo stopped > "$A/chain.done"; exit 3; fi
  note "tree clean after $1"
}
cd /c/kipindi-journey || exit 2
note "chain start at $(git rev-parse --short HEAD) on $(git branch --show-current)"
clean_or_stop "start"

# 1 · A8i's own drive (OMEGA's cases A–J), a fresh in-memory server
bash $S/with-server-detached.sh a8i-drive "$A/a8i-drive.log" env BASE=http://localhost:3041 node scripts/qa-enter-where-pressed.mjs
note "a8i drive (A–J): $(cat "$A/a8i-drive.log.done") — $(grep -cE '^\s*PASS' "$A/a8i-drive.log") pass, $(grep -cE '^\s*FAIL' "$A/a8i-drive.log") fail"
clean_or_stop "a8i drive"

# 2 · the 2026-10-04 draft's own 12-case drive (S J K W W2 PW R P B F BE E) against this build: an independent check;
#     P is a known design difference (that draft sold on Enter with focus on the page itself; this build does nothing)
mkdir -p "$A/out-old-drive"
bash $S/with-server-detached.sh a8i-olddrive "$A/old-drive.log" node $S/a8i/drive.mjs "$A/out-old-drive" main
note "old 12-case drive: $(cat "$A/old-drive.log.done") — $(grep -cE '^\s*PASS' "$A/old-drive.log") pass, $(grep -cE '^\s*FAIL' "$A/old-drive.log") fail"
clean_or_stop "old drive"
if [ "${2:-all}" = "drives" ]; then note "chain end (drives only)"; echo done > "$A/chain.done"; exit 0; fi

# 3 · A8h's drives on the A8i tree (D.3 timed from the result's own entry since 2026-10-06)
for m in paid current; do
  mkdir -p "$A/out-price-$m"
  bash $S/with-server-detached.sh a8i-price-$m "$A/price-$m.log" node $S/a8h/drive/price-guard-drive.mjs "$A/out-price-$m" $m
  note "price-guard drive $m: $(cat "$A/price-$m.log.done") — $(grep -cE '^PASS' "$A/price-$m.log") pass, $(grep -cE '^FAIL' "$A/price-$m.log") fail"
done
for m in main extra lost; do
  mkdir -p "$A/out-result-$m"
  bash $S/with-server-detached.sh a8i-result-$m "$A/result-$m.log" node $S/a8h/drive/result-drive.mjs "$A/out-result-$m" $m
  note "result drive $m: $(cat "$A/result-$m.log.done") — $(grep -cE '^PASS' "$A/result-$m.log") pass, $(grep -cE '^FAIL' "$A/result-$m.log") fail"
done
clean_or_stop "A8h drives"

# 4 · A8h's lost-chunk control, with its diagnosis (the throwaway edit + restore live inside crash-inner.sh, in ONE lock job)
~/heavy-node-lock.sh run a8i-crash bash $S/a8h/drive/crash-inner.sh "$A/crash.log"
echo "exit=$?" > "$A/crash.log.done"
note "crash control: $(cat "$A/crash.log.done") — $(grep -E '^(PASS|FAIL)|C\.diag|restored|NOT RESTORED' "$A/crash.log" | tr '\n' ' ' | cut -c1-900)"
clean_or_stop "crash control"
note "chain end"
echo done > "$A/chain.done"
