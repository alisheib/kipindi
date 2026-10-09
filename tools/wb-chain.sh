#!/usr/bin/env bash
# WP12 lock turn B (asheib-c5): classic-shell parity, calibrated before it is trusted, two ways.
#  · S6's v2 compare (S6-PLAN WP12 step 4; S7-PLAN's start line): the v2 baseline RE-CAPTURED on this PC from the pre-S6
#    commit 7c859cdf (the original parity-v2-7c859cdf.json lives on ALI-BLADE15) — the harness of the WP12 tree run against
#    a server of 7c859cdf, KP_TREE naming it: --prove-red, --baseline, a null --compare on a fresh 7c859cdf server (must
#    exit 0); then the --compare at the WP12 tip (with --allow-base only if the base check refuses on the merges since).
#  · WP12's own claim, that it serves no new byte: the same three at WP12's parent BEFORE, then the --compare at the tip.
# The pre-S6 tree runs on today's install: package-lock.json is unchanged from 7c859cdf to the WP12 tip.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wb-chain.log"; WT="wb-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wb-chain.done"
. "$S/chain-lib.sh"
# 2026-10-07 ~17:55Z: B runs BEFORE A2 (marketing's turn runs to ~20:25Z), so WP12 can go live after parity and A2's
# battery and controls run against it. The branch must be the rebased one A2 would have moved it to; A's typecheck ran
# before the rebase, so the rebased tip is typechecked here first, and a type error stops parity (nothing goes live).
wait_done wa-chain.done
. "$S/kp-lock.sh"
take_lock "wb-chain: typecheck + classic-shell parity x8 (v2 re-captured at 7c859cdf + WP12's fresh baseline), ~75 min" || { echo "exit=5" > "$R/wb-chain.done"; exit 5; }
trap release EXIT
[ "$(git -C /f/kipindi-wp12 rev-parse vodacom-wp12)" = "$(git -C /f/kipindi-wp12 rev-parse wp12-rb)" ] || { note "STOP: vodacom-wp12 is not the rebased wp12-rb"; echo "exit=2" > "$R/wb-chain.done"; exit 2; }
( cd /f/kipindi-wp12 && [ -z "$(git status --porcelain)" ] && timeout 1800 npx tsc --noEmit ) > "$R/wb-typecheck.log" 2>&1
TC=$?
note "typecheck of the WP12 tip $(git -C /f/kipindi-wp12 rev-parse --short HEAD) exit=$TC — $(grep -c 'error TS' "$R/wb-typecheck.log") error(s)"
[ $TC -eq 0 ] || { note "STOP: the rebased tip does not typecheck (or kipindi-wp12 is not clean)"; echo "exit=2" > "$R/wb-chain.done"; exit 2; }
wp12_trees
for t in kipindi-a8i2 kipindi-a8j; do
  git -C "/f/$t" diff --quiet && git -C "/f/$t" diff --cached --quiet || { note "STOP: $t has tracked changes"; echo "exit=2" > "$R/wb-chain.done"; exit 2; }
done
H="F:/kipindi-wp12/scripts/qa-classic-shell-parity.mjs"
V2="$S/wp12/parity-v2-7c859cdf-omega.json"; FB="$S/wp12/parity-$BEFORE.json"
for f in "$V2" "$FB"; do [ -e "$f" ] && { mv "$f" "$f.old-$(date -u +%H%M%S)"; note "an earlier $f moved aside"; }; done
note "BEFORE $BEFORE · AFTER $AFTER · harness $H"

git -C /f/kipindi-a8i2 checkout -q --detach 7c859cdf && note "kipindi-a8i2 at $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (pre-S6)"
run kipindi-a8i2 3071 wb-v2-provered env KP_TREE=F:/kipindi-a8i2 node "$H"
run kipindi-a8i2 3071 wb-v2-base env KP_TREE=F:/kipindi-a8i2 node "$H" --baseline "$V2"
run kipindi-a8i2 3071 wb-v2-null env KP_TREE=F:/kipindi-a8i2 node "$H" --compare "$V2"

git -C /f/kipindi-a8i2 checkout -q --detach "$BEFORE" && note "kipindi-a8i2 at $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (WP12's parent)"
run kipindi-a8i2 3071 wb-f-provered env KP_TREE=F:/kipindi-a8i2 node "$H"
run kipindi-a8i2 3071 wb-f-base env KP_TREE=F:/kipindi-a8i2 node "$H" --baseline "$FB"
run kipindi-a8i2 3071 wb-f-null env KP_TREE=F:/kipindi-a8i2 node "$H" --compare "$FB"

git -C /f/kipindi-a8j checkout -q --detach "$AFTER" && note "kipindi-a8j at $(git -C /f/kipindi-a8j rev-parse --short HEAD) (the WP12 tip)"
run kipindi-a8j 3073 wb-f-wp12 npm run qa:classic-shell-parity -- --compare "$FB"
run kipindi-a8j 3073 wb-v2-wp12 npm run qa:classic-shell-parity -- --compare "$V2"
if grep -q "exit=2" "$R/wb-v2-wp12.log.done" 2>/dev/null && grep -q "carried served files in from elsewhere" "$R/wb-v2-wp12.log"; then
  note "the v2 compare was refused on the merges since 7c859cdf: again with --allow-base"
  run kipindi-a8j 3073 wb-v2-wp12-ab npm run qa:classic-shell-parity -- --compare "$V2" --allow-base
fi
note "chain end"
echo "exit=0" > "$R/wb-chain.done"
