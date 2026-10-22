#!/usr/bin/env bash
# S5-R2-HUB 7 · Run C — THE GHOST AGAINST REGISTER'S LEDGER, item 4d (a THROWAWAY overlay, never merged): the hub head
# a6e5844cc with origin/claude/maswali-s5-r2-register merged in. The state drive's "ghost" state: every band of the drawing
# (the eyebrow and the questions' heading included) against the page, the ledger against REGISTER's one-rhythm ledger.
# ⚠️ The workflow's artifact skips hidden folders (actions/upload-artifact@v4: include-hidden-files defaults to false), so
# the tiles are copied into $OUT, which is uploaded.
. "$CI_RUN/lib.sh"
{
  echo "nproc $(nproc)"
  echo "zh faces before: $(fc-list :lang=zh family | sort -u | head -4 | tr '\n' ';')"
} > "$OUT/env.txt" 2>&1
if ! fc-list :lang=zh | grep -q .; then
  ( sudo apt-get update -q && sudo apt-get install -y -q fonts-noto-cjk ) > "$OUT/fonts-install.log" 2>&1
  echo "fonts-noto-cjk install rc=$?" >> "$OUT/env.txt"
fi
echo "fc-match zh-cn: $(fc-match 'sans-serif:lang=zh-cn')" >> "$OUT/env.txt"
cat "$OUT/env.txt"
export WARM="/millionea /millionea/how /millionea/tickets /markets"
serve 3550 FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=ghost -- \
  bash -c 'node scripts/maswali-hub-states.mjs > "$OUT/drive-ghost.log" 2>&1; rc=$?; echo "drive-ghost rc=$rc" | tee -a "$OUT/summary.txt"; grep -a -E "^FAIL|maswali-hub-states \(run" "$OUT/drive-ghost.log" | cut -c1-400 | head -60; exit $rc' || LIB_FAILED=1
mkdir -p "$OUT/shots" && cp -r .50pick-shots/maswali-hub-states "$OUT/shots/" 2>/dev/null; echo "tiles copied: $(ls "$OUT/shots/maswali-hub-states" 2>/dev/null | wc -l)"
finish
