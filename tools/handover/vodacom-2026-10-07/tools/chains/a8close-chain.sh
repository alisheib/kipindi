#!/usr/bin/env bash
# The A8 close-out (2026-10-07): every owed proof of A8d/A8g/A8h, the "opened" fix and the ticker re-arm, on one tree,
# each step its own heavy-lock job so other lanes interleave. Never touch C:\kipindi-journey while this runs.
# usage: a8close-chain.sh <tag>   → $N/<tag>/chain.log and chain.done
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0cb4430f-1841-4f87-b929-7c29d30c9a10/scratchpad/s6
N=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/4d434d2f-fa0e-4e9b-8bfa-71eeeb679f82/scratchpad/a8close
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

# 1 · the re-armed ticker red, alone (file-mutating)
bash $S/reds-alone.sh a8close-reds "$A/reds" red:ticker-honesty
note "reds: $(tr '\n' ' ' < "$A/reds/summary.log" | cut -c1-400) — $(grep -E 'caught|CAUGHT|passed|MISSED' "$A/reds/red_ticker-honesty.log" | tail -2 | tr '\n' ' ' | cut -c1-300)"
clean_or_stop "reds"

# 2 · parity: the harness's self-test (its new 2.13 plant and P.7d included), then compare 2 against the v2 baseline
bash $S/parity-detached.sh "$A/parity-provered.log" --prove-red
note "parity prove-red: $(cat "$A/parity-provered.log.done") — $(tail -3 "$A/parity-provered.log" | tr '\n' ' ' | cut -c1-300)"
bash $S/parity-detached.sh "$A/parity-compare2.log" --compare $S/parity-v2-7c859cdf.json
note "parity compare 2: $(cat "$A/parity-compare2.log.done") — $(tail -3 "$A/parity-compare2.log" | tr '\n' ' ' | cut -c1-300)"
clean_or_stop "parity"

# 3 · tiles with the corrected probe (the strip found by its tint; every date-time must stay on one line)
W=320,338,340,360,366,376,377,383,384,390,412,430,768,1280
mkdir -p "$A/tiles"
bash $S/with-server-detached.sh a8close-tiles-cur "$A/tiles-current-1500.log" node $S/a8dg-drive/a8dg-tiles.mjs "$A/tiles" current 1500 $W
note "tiles current 1500: $(cat "$A/tiles-current-1500.log.done") — $(grep -cE '^PASS' "$A/tiles-current-1500.log") pass, $(grep -cE '^FAIL' "$A/tiles-current-1500.log") fail"
bash $S/with-server-detached.sh a8close-tiles-paid "$A/tiles-paid-1000000.log" node $S/a8dg-drive/a8dg-tiles.mjs "$A/tiles" paid 1000000 $W
note "tiles paid 1000000: $(cat "$A/tiles-paid-1000000.log.done") — $(grep -cE '^PASS' "$A/tiles-paid-1000000.log") pass, $(grep -cE '^FAIL' "$A/tiles-paid-1000000.log") fail"
clean_or_stop "tiles"

# 4 · A8h's drives on this tree (A8i in it; D.3 timed from the result's own entry), then the crash control with its diagnosis
for m in paid current; do
  mkdir -p "$A/out-price-$m"
  bash $S/with-server-detached.sh a8close-price-$m "$A/price-$m.log" node $S/a8h/drive/price-guard-drive.mjs "$A/out-price-$m" $m
  note "price-guard drive $m: $(cat "$A/price-$m.log.done") — $(grep -cE '^PASS' "$A/price-$m.log") pass, $(grep -cE '^FAIL' "$A/price-$m.log") fail"
done
for m in main extra lost; do
  mkdir -p "$A/out-result-$m"
  bash $S/with-server-detached.sh a8close-result-$m "$A/result-$m.log" node $S/a8h/drive/result-drive.mjs "$A/out-result-$m" $m
  note "result drive $m: $(cat "$A/result-$m.log.done") — $(grep -cE '^PASS' "$A/result-$m.log") pass, $(grep -cE '^FAIL' "$A/result-$m.log") fail"
done
~/heavy-node-lock.sh run a8close-crash bash $S/a8h/drive/crash-inner.sh "$A/crash.log"
echo "exit=$?" > "$A/crash.log.done"
note "crash control: $(cat "$A/crash.log.done") — $(grep -E '^(PASS|FAIL)|C\.diag|restored|NOT RESTORED' "$A/crash.log" | tr '\n' ' ' | cut -c1-900)"
clean_or_stop "drives"

# 5 · a production build, read by first-load-parts (the sale-result host off every first load)
bash $S/wp6c/build-detached.sh "$A/build.log"
note "build: $(cat "$A/build.log.done") — $(grep -E 'Compiled|Failed|error' "$A/build.log" | tail -2 | tr '\n' ' ' | cut -c1-200)"
MSYS_NO_PATHCONV=1 python $S/wp6c/first-load-parts.py C:/kipindi-journey / /markets /positions /help > "$A/first-load-parts.log" 2>&1
note "first-load-parts: exit=$? — $(tail -3 "$A/first-load-parts.log" | tr '\n' ' ' | cut -c1-400)"
clean_or_stop "build"

# 6 · the battery
~/heavy-node-lock.sh run a8close-battery bash -c 'cd /c/kipindi-journey && node scripts/test-all.mjs --skip responsive,motion --jobs 4' > "$A/testall.log" 2>&1
note "battery: exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$A/testall.log" | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-900)"
clean_or_stop "battery"
note "chain end"
echo done > "$A/chain.done"
