#!/usr/bin/env bash
# Lock turn M16c2 (asheib-c5), 2026-10-10: the visual branch at 3d2beb17 (the merged tip + the invite page's fix) —
#  · classic-shell parity against the baseline at main e7a979c6 (captured in turn B), WITH --allow-base: A18 refuses
#    because the merge 1e4586e5 brought 78 served files "from elsewhere", but both merges' main sides (9aa4eec2,
#    e7a979c6) are ancestors of the baseline commit, so the baseline holds every file they brought (verified 05:40 EAT);
#  · local qa:live (turn B's failed only on /profile/invite's in-memory error, fixed in 3d2beb17).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16c2-chain.log"; WT="wm16c2-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16c2-chain.done"
. "$S/chain-lib.sh"
. "$S/kp-lock.sh"
KP_WAIT_MAX=600 take_lock "wm16c2-chain: the visual branch 3d2beb17 - classic parity (--allow-base, A18 verified) and local qa:live, ~40 min" || { echo "exit=5" > "$R/wm16c2-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=3d2beb1708eb
git -C /f/kipindi-vis merge-base --is-ancestor "$VIS" origin/vodacom-visual || { note "STOP: $VIS is not on origin/vodacom-visual"; echo "exit=2" > "$R/wm16c2-chain.done"; exit 2; }
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm16c2-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm16c2-chain.done"; exit 2; }
# The A18 premise, checked again here rather than trusted: every merge since the baseline brings only its ancestors' files.
for m in $(git -C /f/$TREE rev-list --first-parent --merges e7a979c61..HEAD); do
  git -C /f/$TREE merge-base --is-ancestor "$m^2" e7a979c61 || { note "STOP: merge $m's main side is not inside the baseline — --allow-base would be unsafe"; echo "exit=2" > "$R/wm16c2-chain.done"; exit 2; }
done
note "$TREE at $(git -C /f/$TREE rev-parse --short HEAD); every merge since the baseline brings only the baseline's own history"
( cd /f/$TREE && npx prisma generate ) > "$R/wm16c2-prisma.log" 2>&1; note "prisma generate exit=$?"
PB="$S/visual/parity-main-e7a979c6.json"
run $TREE 3074 wm16c2-par-cmp npm run qa:classic-shell-parity -- --compare "$PB" --allow-base
run $TREE 3074 wm16c2-live npm run qa:live
note "tree after: $(git -C /f/$TREE status --short | head -5 | tr '\n' ' ')"
note "chain end"
echo "exit=0" > "$R/wm16c2-chain.done"
