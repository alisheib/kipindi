#!/usr/bin/env bash
# batch-light-2.sh (lane TICKETS): the rest of the readers, in this order, alone in the tree:
#  - test:deposit-status-read and its red twin (memory mode; it reads empty-state-text's noticeBody),
#  - red:visual-pass-r4k, which PLANTS INTO SOURCE FILES ON DISK and restores them (so nothing else may read the tree
#    meanwhile), then `git status --short` and any red leftovers.
set -u
TREE=C:/50pick-ssd/kipindi-mln-dtkt
OUT=${1:?log dir}
mkdir -p "$OUT"
cd "$TREE" || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
for s in test:deposit-status-read red:deposit-status-read red:visual-pass-r4k; do
  log="$OUT/${s//:/_}.log"
  start=$(date +%s)
  npm run --silent "$s" > "$log" 2>&1
  rc=$?
  secs=$(( $(date +%s) - start ))
  sum=$(grep -E "[0-9]+ (passed|failed|caught)|[0-9]+/[0-9]+|plants caught|red:" "$log" | tail -1 | tr -d '\r' | cut -c1-200)
  printf "%-28s rc=%s %4ss  %s\n" "$s" "$rc" "$secs" "$sum"
done
echo "--- git status --short after the on-disk red:"
git status --short
ls -a | grep -E "^\.red-|red-in-place" || echo "(no red leftovers)"
