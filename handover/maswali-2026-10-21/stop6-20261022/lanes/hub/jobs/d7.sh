#!/usr/bin/env bash
# S5-R2-HUB 7 · Run D on the hub's branch head: tsc, every derived static suite (with the design censuses the drawing's
# widths could meet), the red twins, then the state drive (run a: open, noweek, after, voiding) — its tiles copied into
# $OUT (the workflow's artifact skips the hidden .50pick-shots folder).
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

step tsc npx tsc --noEmit -p tsconfig.json
for s in maswali-hub maswali-design maswali-design-register maswali-doors maswali-i18n maswali-multi-slip maswali-plan \
  maswali-register maswali-slip-design maswali-strike maswali-tickets maswali-ui millionea-shell popup-fit simple-journey-flag \
  gold-is-money journey-shell journey-tickets campaign-gates visual-pass-r10 visual-pass-r3c visual-pass-r4i visual-pass-r4j \
  visual-pass-r4k visual-pass-r5c visual-pass-r5h visual-pass-r5i visual-pass-r5j visual-pass-r6c visual-pass-r7b \
  visual-pass-r7c visual-pass-r8b visual-pass-r9a chat-yield enter-where-pressed maswali-seed-clock millionea-dark-edge \
  glyph-source dead-css css-vars-defined maswali-facts house-bot-blob-pin ui-consistency spacing-scale type-scale measure-system; do
  step "$s" npx tsx "scripts/$s.test.mts"
done
for r in maswali-tickets maswali-multi-slip journey-tickets glyph-source simple-journey-flag campaign-gates enter-where-pressed journey-shell; do
  step "red-$r" npx tsx "scripts/$r.test.mts" --prove-red
done
step red-visual-pass-r4k npx tsx scripts/visual-pass-r4k.test.mts --prove
step red-visual-pass-r5c node scripts/visual-pass-r5c-red.mjs
step red-css-vars-defined node scripts/red-css-vars-defined.mjs
git status --short > "$OUT/status-after-reds.txt"
if [ -s "$OUT/status-after-reds.txt" ]; then
  echo "tree-after-reds rc=1 ($(wc -l < "$OUT/status-after-reds.txt") paths changed: $(tr '\n' ' ' < "$OUT/status-after-reds.txt"))" | tee -a "$OUT/summary.txt"
  LIB_FAILED=1
  git checkout -- . && git status --short
else
  echo "tree-after-reds rc=0 (clean)" | tee -a "$OUT/summary.txt"
fi

export WARM="/millionea /millionea/how /millionea/tickets /markets"
serve 3550 FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=open,noweek,after,voiding -- \
  bash -c 'node scripts/maswali-hub-states.mjs > "$OUT/drive-a.log" 2>&1; rc=$?; echo "drive-a rc=$rc" | tee -a "$OUT/summary.txt"; grep -a -E "^(FAIL|INFO (H6|premise))|maswali-hub-states \(run" "$OUT/drive-a.log" | cut -c1-700 | head -80; exit $rc' || LIB_FAILED=1
mkdir -p "$OUT/shots" && cp -r .50pick-shots/maswali-hub-states "$OUT/shots/" 2>/dev/null; echo "tiles copied: $(ls "$OUT/shots/maswali-hub-states" 2>/dev/null | wc -l)"
finish
