#!/usr/bin/env bash
# job-langfix-gate.sh <sha> — the lead's AGENTS §4 gates for the classic loader-colour release at the EXACT commit, in the
# read-back tree kipindi-mln-rb (detached): tsc, then next build + next start (production fidelity) + local qa:live.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
SHA="$1"; TREE="${2:-kipindi-mln-gate}"; OUT="$F/lead/langfix"
cd "/c/50pick-ssd/$TREE" || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
[ -n "$(git status --short)" ] && { echo "tree not clean"; git status --short; exit 8; }
git fetch -q origin
git checkout -q --detach "$SHA" || exit 8
echo "head $(git rev-parse --short=9 HEAD)"
if git diff --quiet da3d32180 HEAD -- package-lock.json; then echo "lockfile same as da3d32180"; else echo "LOCKFILE DIFFERS"; exit 7; fi
echo "== tsc $(date -u +%T)"
npx tsc --noEmit > "$OUT/tsc-$SHA.log" 2>&1; echo "tsc rc=$? errors=$(grep -c 'error TS' "$OUT/tsc-$SHA.log")"
echo "== next build + next start + qa:live $(date -u +%T)"
MODE=start bash "$S/mln-server-run.sh" "$TREE" 3595 "$OUT/qalive-$SHA.log" -- node scripts/pre-deploy-live-check.mjs
echo "server-run rc=$?"; cat "$OUT/qalive-$SHA.log.done" 2>/dev/null
grep -E "ALL PASS|passed, |✗|FAIL" "$OUT/qalive-$SHA.log" | tail -8
echo "== tree after: $(git status --short | tr '\n' ' ')"
echo "== done $(date -u +%T)"
