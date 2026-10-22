#!/usr/bin/env bash
# S5-R2-HUB · Run B — THE GHOST AGAINST REGISTER'S LEDGER (a THROWAWAY overlay, never merged): the hub head d28b33c31
# with origin/claude/maswali-s5-r2-register merged in (REGISTER's round 2, not yet in the release). The state drive's
# "ghost" state only: the frame's bands (the drawing's ledger against REGISTER's one-rhythm ledger), and item 4b — the
# new G2 checks (the eyebrow, the questions' heading) against round 1's drawing, with the page's widths printed (INFO).
. "$CI_RUN/lib.sh"
{
  echo "nproc $(nproc)"
  echo "zh faces before: $(fc-list :lang=zh family | sort -u | head -6 | tr '\n' ';')"
} > "$OUT/env.txt" 2>&1
if ! fc-list :lang=zh | grep -q .; then
  ( sudo apt-get update -q && sudo apt-get install -y -q fonts-noto-cjk ) > "$OUT/fonts-install.log" 2>&1
  echo "fonts-noto-cjk install rc=$?" >> "$OUT/env.txt"
fi
{
  echo "zh faces after: $(fc-list :lang=zh family | sort -u | head -6 | tr '\n' ';')"
  echo "fc-match zh-cn: $(fc-match 'sans-serif:lang=zh-cn')"
} >> "$OUT/env.txt" 2>&1
cat "$OUT/env.txt"
export WARM="/millionea /millionea/how /millionea/tickets /markets"
serve 3550 FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=ghost -- \
  bash -c 'node scripts/maswali-hub-states.mjs > "$OUT/drive-ghost.log" 2>&1; rc=$?; echo "drive-ghost rc=$rc" | tee -a "$OUT/summary.txt"; grep -a -E "^FAIL|maswali-hub-states \(run" "$OUT/drive-ghost.log" | cut -c1-400 | head -60; exit $rc' || LIB_FAILED=1
finish
