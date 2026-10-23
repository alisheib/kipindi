#!/usr/bin/env bash
# job-ul-gate.sh <sha> — the UDDOT + LICBASIS release's gates at the EXACT commit (gate tree, detached): tsc · next build ·
# qa:live at production's setting (ACTIVE) and at the default · the phone rail drawn (the dot gone; Millionea's track) ·
# the licence gate suite (both stores). Each server fresh.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
SHA="$1"; TREE=kipindi-mln-gate; PORT=3596; OUT="$F/lead/ulgate/$SHA"
mkdir -p "$OUT"; SUM="$OUT/summary.txt"
note() { echo "$(date -u +%T) $*" | tee -a "$SUM"; }
cd "/c/50pick-ssd/$TREE" || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp' KP_SCRATCH_PORT=5477
[ -n "$(git status --short)" ] && { note "tree not clean: $(git status --short | tr '\n' ' ')"; exit 8; }
git fetch -q origin && git checkout -q --detach "$SHA" || exit 8
note "== UDDOT+LICBASIS gate at $(git rev-parse --short=9 HEAD); next $(node -e "console.log(require('./node_modules/next/package.json').version)")"
npx tsc --noEmit > "$OUT/tsc.log" 2>&1; note "tsc rc=$? errors=$(grep -c 'error TS' "$OUT/tsc.log")"
[ -d .next ] && rm -r -f -- .next
env -u DATABASE_URL SESSION_SECRET=omega-mln-local-secret-0123456789abcdef0123 OTP_PEPPER=omega-mln-pepper-0123456 \
  npx next build > "$OUT/build.log" 2>&1; note "next build rc=$? :: $(grep -E 'Compiled successfully|Build error|SecurityFatal' "$OUT/build.log" | head -1 | cut -c1-120)"
npm run -s test:maswali-licence-gate > "$OUT/licence-gate.log" 2>&1; note "licence-gate rc=$? :: $(grep -E 'passed|failed|PASS|FAIL' "$OUT/licence-gate.log" | tail -2 | tr '\n' ' ' | cut -c1-200)"
run() { local name="$1" env="$2"; shift 2; local envs=(); [ "$env" != "-" ] && read -r -a envs <<< "$env"
  bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/$name.log" "${envs[@]}" -- "$@"
  note "$name [$env] $(cat "$OUT/$name.log.done" 2>/dev/null) :: $(grep -E 'passed|failed|ALL PASS|✗' "$OUT/$name.log" | tail -1 | cut -c1-200)"; }
run qalive-active "FEATURE_MILLIONEA=ACTIVE" node scripts/pre-deploy-live-check.mjs
run qalive-default - node scripts/pre-deploy-live-check.mjs
run rail-drawn "FEATURE_MILLIONEA=ACTIVE" env RAIL=drawn node scripts/qa-classic-rail.mjs "$OUT/rail-drawn"
note "== tree after: $(git status --short | tr '\n' ' ')"; note "== done"
