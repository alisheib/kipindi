#!/usr/bin/env bash
# job-s5-gate.sh <sha> — the S5 dark push's gates at the EXACT commit, in the gate tree (C:/50pick-ssd/kipindi-mln-gate,
# detached): tsc; `next build`; the dark checks on a fresh in-memory dev server (qa:live + the player drive's WITHDRAWN step
# + revoked-deadend + motion-adoption + admin-section-gate + needle-rest = $S/lead/job-dark.sh); the door census on
# WITHDRAWN and on STAFF_PREVIEW (qa:maswali-door-dark); classic parity against main's frozen baseline. One summary line
# per step in $OUT/summary.txt. Run inside ONE slot.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
SHA="$1"; TREE=kipindi-mln-gate; PORT=3596; OUT="$F/lead/s5gate/$SHA"
mkdir -p "$OUT"; SUM="$OUT/summary.txt"
note() { echo "$(date -u +%T) $*" | tee -a "$SUM"; }
cd "/c/50pick-ssd/$TREE" || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
[ -n "$(git status --short)" ] && { note "tree not clean: $(git status --short | tr '\n' ' ')"; exit 8; }
git fetch -q origin && git checkout -q --detach "$SHA" || exit 8
note "== S5 gate at $(git rev-parse --short=9 HEAD)"
git diff --quiet 7e9a314f0 HEAD -- package-lock.json && note "lockfile same as the tree's node_modules (7e9a314f0)" || { note "LOCKFILE DIFFERS — stop"; exit 7; }

npx tsc --noEmit > "$OUT/tsc.log" 2>&1; note "tsc rc=$? errors=$(grep -c 'error TS' "$OUT/tsc.log")"

[ -d .next ] && rm -r -f -- .next
env -u DATABASE_URL SESSION_SECRET=omega-mln-local-secret-0123456789abcdef0123 OTP_PEPPER=omega-mln-pepper-0123456 \
  npx next build > "$OUT/build.log" 2>&1; note "next build rc=$? :: $(grep -E 'Compiled|Failed|error' "$OUT/build.log" | head -2 | tr '\n' ' ' | cut -c1-160)"

bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/dark.log" -- bash "$S/lead/job-dark.sh"
note "dark (WITHDRAWN) rc=$(cat "$OUT/dark.log.done" 2>/dev/null) :: $(grep -E 'rc=' "$OUT/dark.log" | tr '\n' ' ' | cut -c1-300)"

bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/door-w.log" FEATURE_MILLIONEA=WITHDRAWN -- node scripts/maswali-door-dark.mjs
note "door-dark WITHDRAWN $(cat "$OUT/door-w.log.done" 2>/dev/null) :: $(grep -E 'passed|failed|PASS|FAIL' "$OUT/door-w.log" | tail -1 | cut -c1-160)"
bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/door-sp.log" FEATURE_MILLIONEA=STAFF_PREVIEW -- node scripts/maswali-door-dark.mjs
note "door-dark STAFF_PREVIEW $(cat "$OUT/door-sp.log.done" 2>/dev/null) :: $(grep -E 'passed|failed|PASS|FAIL' "$OUT/door-sp.log" | tail -1 | cut -c1-160)"

bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/parity.log" -- env KP_TREE="C:/50pick-ssd/$TREE" \
  node C:/50pick-ssd/kipindi-mln-par/scripts/qa-classic-shell-parity.mjs --compare "$S/s5par/parity-v5-bfa0b7d57.json" --allow-base
note "parity compare $(cat "$OUT/parity.log.done" 2>/dev/null) :: $(grep -E 'passed —|differ|REFUSED|cells' "$OUT/parity.log" | tail -3 | tr '\n' ' ' | cut -c1-300)"

note "== tree after: $(git status --short | tr '\n' ' ')"
note "== done"
