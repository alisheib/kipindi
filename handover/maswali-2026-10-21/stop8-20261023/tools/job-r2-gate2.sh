#!/usr/bin/env bash
# job-r2-gate.sh <sha> — round 2's gates at the EXACT commit (gate tree, detached), at production's real setting
# (FEATURE_MILLIONEA=ACTIVE, the Railway variable since 2026-10-22 23:32 UTC) and at the code's default (WITHDRAWN):
#   tsc · next build · qa:live ACTIVE + WITHDRAWN · the phone rail (qa:classic-rail drawn at ACTIVE, dark at WITHDRAWN) ·
#   the landing door row (dark, drawn) · break nav + break money doors · the door census (WITHDRAWN, STAFF_PREVIEW) ·
#   NoticeBar widows (STAFF_PREVIEW). Each drive on its OWN fresh in-memory dev server (the break drives take a real
#   one-hour break). One summary line per step in $OUT/summary.txt; tiles under $OUT/<step>/.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
SHA="$1"; TREE=kipindi-mln-gate; PORT=3596; OUT="$F/lead/r2gate/$SHA"
mkdir -p "$OUT"; SUM="$OUT/summary.txt"
note() { echo "$(date -u +%T) $*" | tee -a "$SUM"; }
cd "/c/50pick-ssd/$TREE" || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
[ -n "$(git status --short)" ] && { note "tree not clean: $(git status --short | tr '\n' ' ')"; exit 8; }
git fetch -q origin && git checkout -q --detach "$SHA" || exit 8
note "== round-2 gate at $(git rev-parse --short=9 HEAD)"
WANT=$(node -e "console.log(require('./package.json').dependencies.next)"); HAVE=$(node -e "console.log(require('./node_modules/next/package.json').version)"); if [ "$WANT" != "$HAVE" ]; then note "node_modules has next $HAVE, the commit pins $WANT: npm install (only the changed packages)"; npm install --no-audit --no-fund > "$OUT/npm-install.log" 2>&1; note "npm install rc=$? next now $(node -e "console.log(require('./node_modules/next/package.json').version)")"; else note "node_modules fits (next $HAVE)"; fi

npx tsc --noEmit > "$OUT/tsc.log" 2>&1; note "tsc rc=$? errors=$(grep -c 'error TS' "$OUT/tsc.log")"
[ -d .next ] && rm -r -f -- .next
env -u DATABASE_URL SESSION_SECRET=omega-mln-local-secret-0123456789abcdef0123 OTP_PEPPER=omega-mln-pepper-0123456 \
  npx next build > "$OUT/build.log" 2>&1; note "next build rc=$? :: $(grep -E 'Compiled|Failed to compile|Build error' "$OUT/build.log" | head -2 | tr '\n' ' ' | cut -c1-140)"

run() { # <name> <ENV=…|-> <command…>  — a fresh server, then the command from the tree with BASE set
  local name="$1" env="$2"; shift 2
  local envs=(); [ "$env" != "-" ] && read -r -a envs <<< "$env"
  bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/$name.log" "${envs[@]}" -- "$@"
  note "$name [$env] exit=$(cat "$OUT/$name.log.done" 2>/dev/null | tr -d 'exit=') :: $(grep -E 'passed|failed|ALL PASS|FAIL|✗|rc=' "$OUT/$name.log" | tail -2 | tr '\n' ' ' | cut -c1-260)"
}
run qalive-active "FEATURE_MILLIONEA=ACTIVE" node scripts/pre-deploy-live-check.mjs
run qalive-withdrawn - node scripts/pre-deploy-live-check.mjs
run rail-drawn "FEATURE_MILLIONEA=ACTIVE" env RAIL=drawn node scripts/qa-classic-rail.mjs "$OUT/rail-drawn"
run rail-dark - env RAIL=dark node scripts/qa-classic-rail.mjs "$OUT/rail-dark"
run landing-dark "FEATURE_MILLIONEA=WITHDRAWN" node scripts/landing-doors-shots.mjs
run landing-drawn "FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false" node scripts/landing-doors-shots.mjs
run break-nav "FEATURE_MILLIONEA=ACTIVE" node scripts/qa-millionea-break-nav.mjs "$OUT/break-nav"
run break-money - node scripts/qa-break-money-doors.mjs "$OUT/break-money"
run door-dark-w "FEATURE_MILLIONEA=WITHDRAWN" node scripts/maswali-door-dark.mjs
run door-dark-sp "FEATURE_MILLIONEA=STAFF_PREVIEW" node scripts/maswali-door-dark.mjs
run notice-widow "FEATURE_MILLIONEA=STAFF_PREVIEW" node scripts/qa-notice-bar-widow.mjs "$OUT/notice-widow"
note "== tree after: $(git status --short | tr '\n' ' ')"
note "== done"
