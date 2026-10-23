#!/usr/bin/env bash
# job-next-gate.sh <sha> — the Next.js 16.4.2 security patch's local gates at the EXACT commit (parity tree, on its
# branch fix/next-16.4.2 with node_modules installed at 16.4.2): tsc · `next build` · qa:live on a fresh in-memory dev
# server at production's setting (FEATURE_MILLIONEA=ACTIVE) and at the code's default (WITHDRAWN) · first-load JS.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
SHA="$1"; TREE=kipindi-mln-par; PORT=3597; OUT="$F/lead/nextgate/$SHA"
mkdir -p "$OUT"; SUM="$OUT/summary.txt"
note() { echo "$(date -u +%T) $*" | tee -a "$SUM"; }
cd "/c/50pick-ssd/$TREE" || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
[ "$(git rev-parse --short=9 HEAD)" = "${SHA:0:9}" ] || { note "tree not at $SHA"; exit 8; }
[ -n "$(git status --short)" ] && { note "tree not clean"; exit 8; }
note "== Next.js patch gate at $(git rev-parse --short=9 HEAD); installed next $(node -e "console.log(require('./node_modules/next/package.json').version)")"
npx tsc --noEmit > "$OUT/tsc.log" 2>&1; note "tsc rc=$? errors=$(grep -c 'error TS' "$OUT/tsc.log")"
[ -d .next ] && rm -r -f -- .next
env -u DATABASE_URL SESSION_SECRET=omega-mln-local-secret-0123456789abcdef0123 OTP_PEPPER=omega-mln-pepper-0123456 \
  npx next build > "$OUT/build.log" 2>&1; note "next build rc=$? :: $(grep -E 'Compiled successfully|Build error|SecurityFatal' "$OUT/build.log" | head -2 | tr '\n' ' ' | cut -c1-160)"
grep -q "first-load" package.json && { npm run -s test:first-load > "$OUT/first-load.log" 2>&1; note "first-load rc=$? :: $(tail -2 "$OUT/first-load.log" | tr '\n' ' ' | cut -c1-200)"; }
for mode in ACTIVE WITHDRAWN; do
  bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/qalive-$mode.log" "FEATURE_MILLIONEA=$mode" -- node scripts/pre-deploy-live-check.mjs
  note "qa:live $mode exit=$(cat "$OUT/qalive-$mode.log.done" 2>/dev/null) :: $(grep -E 'ALL PASS|passed, |✗' "$OUT/qalive-$mode.log" | tail -2 | tr '\n' ' ' | cut -c1-220)"
done
note "== tree after: $(git status --short | tr '\n' ' ')"
note "== done"
