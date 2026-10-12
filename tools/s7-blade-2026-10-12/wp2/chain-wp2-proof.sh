#!/usr/bin/env bash
# S7 WP2 proven: typecheck and its gates in the WP2 worktree; next build, local qa:live, parity v3 vs the WP1 baseline and the served-skeleton pair in the journey worktree.
# One dev server at a time, each checkout VERIFIED, 30 s between runs. Helpers copied whole from r10p2 and asserted.
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad
R=$S/r12wp2
TIP=/c/kipindi-s7wp2
BASEWT=/c/kipindi-journey
WANT="$1"
BASESHA="$2"
note() { echo "$(date '+%H:%M:%S') $*" >> "$R/STATUS"; }
freegb() { powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)" | tr -d '\r'; }
stop() { note "STOP: $*"; git -C $BASEWT checkout -q vodacom-visual 2>/dev/null; echo "exit=2" > "$R/DONE"; exit 2; }
# ⛔ move the journey worktree to a commit and PROVE it is there — never trust a checkout's silence
journey_at() {
  local want; want=$(git -C $TIP rev-parse "$1") || stop "cannot resolve $1"
  git -C $BASEWT checkout -q --detach "$want" || stop "checkout of $1 failed"
  [ "$(git -C $BASEWT rev-parse HEAD)" = "$want" ] || stop "journey is at $(git -C $BASEWT rev-parse --short HEAD), not $1"
  note "journey VERIFIED at $(git -C $BASEWT rev-parse --short HEAD)"
}
stop_server() {  # stop ONLY this run's dev server: node processes of that worktree's next, and the port's owner
  local wt="$1" port="$2"
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { \$_.CommandLine -like '*${wt}*next*' } | ForEach-Object { taskkill /PID \$_.ProcessId /T /F | Out-Null }; \$c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if (\$c) { taskkill /PID \$c.OwningProcess /T /F | Out-Null }" >/dev/null 2>&1
}
FONT_FAIL="next/font/google queries have exactly one entry"
# run_srv <worktree-name> <port> <tag> <command...>: a FRESH in-memory dev server for that worktree, the command run from
# it with BASE/KP_BASE set, then the server stopped. Exit code to $R/<tag>.code.
run_srv() {
  local wt="$1" port="$2" tag="$3"; shift 3
  local dir="/c/$wt" log="$R/$tag.log" srv="$R/$tag.server.log" up=0 tries
  for tries in 1 2; do
    stop_server "$wt" "$port"; rm -rf "$dir/.next"
    ( cd "$dir" && env -u DATABASE_URL SESSION_SECRET=blade-r12wp2-local-secret-0123456789abcdef OTP_PEPPER=blade-r12wp2-pepper-0123 \
        DISABLE_ADMIN_TOTP=true npx next dev -p "$port" > "$srv" 2>&1 & )
    up=0
    for i in $(seq 1 180); do
      code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" || true)
      [ "$code" = "200" ] && { up=1; break; }
      grep -q "$FONT_FAIL" "$srv" 2>/dev/null && break
      sleep 2
    done
    [ $up -eq 1 ] && break
    note "$tag: server did not come up (try $tries)"
  done
  if [ $up -ne 1 ]; then stop_server "$wt" "$port"; echo 99 > "$R/$tag.code"; note "$tag: NO SERVER"; return; fi
  for p in / /markets /positions /wallet /profile /auth/demo /updown /results /live /account; do curl -s -o /dev/null "http://localhost:$port$p"; done
  ( cd "$dir" && BASE="http://localhost:$port" KP_BASE="http://localhost:$port" LIVE_BASE="http://localhost:$port" "$@" ) > "$log" 2>&1
  local rc=$?
  stop_server "$wt" "$port"
  echo $rc > "$R/$tag.code"
  note "$tag: exit $rc (free $(freegb) GB)"
}

for f in note freegb stop journey_at stop_server run_srv; do declare -F $f >/dev/null || { echo "helper $f missing" >> "$R/STATUS"; echo "exit=2" > "$R/DONE"; exit 2; }; done
WP1="$BASESHA"; PB="$3"
fonts_ok() { [ "$(curl -s -o /dev/null -m 15 -w "%{http_code}" "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap")" = "200" ]; }
font_invalid() { grep -a -q "issue establishing a connection while requesting https://fonts.googleapis.com" "$R/$1.server.log" && note "⛔ INVALID $1: the dev server could not fetch Google Fonts"; }
[ "$(git -C $TIP rev-parse HEAD)" = "$(git -C $TIP rev-parse $WANT)" ] || stop "the WP2 worktree is not at $WANT"
[ -z "$(git -C $TIP status --porcelain --untracked-files=no)" ] || stop "the WP2 worktree is dirty"
[ -z "$(git -C $BASEWT status --porcelain --untracked-files=no)" ] || stop "the journey worktree is dirty"
[ -s "$PB" ] || stop "no v3 baseline at $PB"
note "start: WP2 $(git -C $TIP rev-parse --short $WANT) on WP1 $(git -C $TIP rev-parse --short $WP1) · free $(freegb) GB"
( while [ ! -f "$R/DONE" ]; do f=$(powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)" | tr -d '\r'); echo "$(date +%H:%M:%S) $f" >> "$R/free.txt"; if awk -v f="$f" 'BEGIN{exit !(f<0.45)}'; then note "⛔ WATCHDOG: free $f GB — stopping the journey dev server"; powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { \$_.CommandLine -like '*kipindi-journey*next*' } | ForEach-Object { taskkill /PID \$_.ProcessId /T /F | Out-Null }" >/dev/null 2>&1; sleep 60; fi; sleep 10; done ) &

# ── A · in the WP2 worktree: typecheck, the gates, the four populations' plants, the file-mutating reds alone ──────
( cd $TIP && npx tsc --noEmit ) > "$R/1-typecheck.log" 2>&1; T=$?; note "1 typecheck: exit $T ($(grep -c 'error TS' $R/1-typecheck.log) errors)"
GATES="test:featured-card test:one-sided test:landing-mine test:hero-copy red:hero-copy test:house-bot-disclosure test:simple-journey-flag test:route-census test:journey-home red:journey-home test:red-anchors test:measure test:docs test:predictor-shown test:visual-pass-r4h test:visual-pass-r4i test:visual-pass-r5e test:withdrawn-features test:agent-terms-binding test:visual-pass-r5l test:failure-reasons test:decomment test:orphans"
: > "$R/2-gates.txt"
for g in $GATES; do ( cd $TIP && npm run $g ) > "$R/2-$g.log" 2>&1; echo "$g $?" >> "$R/2-gates.txt"; done
note "2 gates: $(awk '$2!=0{print $1"="$2}' $R/2-gates.txt | tr '\n' ' ')· $(awk '$2==0' $R/2-gates.txt | wc -l)/$(wc -l < $R/2-gates.txt) exit 0"
bash "$R/plants.sh" "$TIP" > "$R/3-plants.log" 2>&1; note "3 population plants: $(tail -1 $R/3-plants.log)"
for r in red:featured-card red:one-sided; do ( cd $TIP && npm run $r ) > "$R/4-$r.log" 2>&1; rc=$?; git -C $TIP diff --exit-code > /dev/null; d=$?; note "4 $r alone: exit $rc · tree $([ $d -eq 0 ] && echo clean || echo DIRTY)"; [ $d -eq 0 ] || { git -C $TIP checkout -- .; note "restored the WP2 tree"; }; done
sleep 30

# ── B · in the journey worktree at WP2: next build; local qa:live on a fresh in-memory server ──────────────────────
fonts_ok || stop "Google Fonts unreachable before the build"
journey_at "$WANT"
( cd $BASEWT && npx prisma generate ) > "$R/0-prisma.log" 2>&1
( cd $BASEWT && for n in 1 2 3; do rm -rf .next; npx next build > "$R/5-build-$n.log" 2>&1; B=$?; [ $B -eq 0 ] && break; grep -q "$FONT_FAIL\|3221225477" "$R/5-build-$n.log" || break; sleep 20; done; echo "B=$B n=$n" > "$R/5-build.code" )
note "5 next build: $(cat $R/5-build.code) · free $(freegb) GB · cooling 30s"; sleep 30
run_srv kipindi-journey 3077 6-live node scripts/pre-deploy-live-check.mjs
font_invalid 6-live
note "6 qa:live local: $(grep -a -E 'ALL PASS|passed' $R/6-live.log | tail -1 | cut -c1-120)"
sleep 30

# ── C · parity v3: the WP2 tree against WP1's baseline (0 differences, bodies and /'s head included) ───────────────
fonts_ok || stop "Google Fonts unreachable before the parity compare"
run_srv kipindi-journey 3077 7-parity npm run qa:classic-shell-parity -- --compare "$PB" --allow-base
font_invalid 7-parity
note "7 parity v3 vs $(basename $PB): $(sed 's/\x1b\[[0-9;]*m//g' $R/7-parity.log | grep -a -E '^  FAIL|ALL PASS|FAILURES' | tail -4 | tr '\n' ' ' | cut -c1-300)"
sleep 30

# ── D · served skeleton: a null pair at WP1 (two fresh servers), then WP2 — compared offline with --main ────────────
journey_at "$WP1"
( cd $BASEWT && npx prisma generate ) > "$R/0-prisma-wp1.log" 2>&1
run_srv kipindi-journey 3077 8-skel-wp1-a npm run qa:served-skeleton -- --capture "$R/skel-wp1-a.json" --viewers guest,player
sleep 30
run_srv kipindi-journey 3077 8-skel-wp1-b npm run qa:served-skeleton -- --capture "$R/skel-wp1-b.json" --viewers guest,player
sleep 30
journey_at "$WANT"
( cd $BASEWT && npx prisma generate ) > "$R/0-prisma-wp2.log" 2>&1
run_srv kipindi-journey 3077 8-skel-wp2 npm run qa:served-skeleton -- --capture "$R/skel-wp2.json" --viewers guest,player
( cd $TIP && node scripts/qa-served-skeleton.mjs --compare "$R/skel-wp1-a.json" "$R/skel-wp1-b.json" --main --norm store-ids ) > "$R/9-skel-null.log" 2>&1; N=$?
( cd $TIP && node scripts/qa-served-skeleton.mjs --compare "$R/skel-wp1-a.json" "$R/skel-wp2.json" --main --norm store-ids ) > "$R/9-skel-wp2.log" 2>&1; K=$?
note "9 served skeleton --main: null pair exit $N · $(tail -1 $R/9-skel-null.log | cut -c1-120) · WP1→WP2 exit $K · $(tail -1 $R/9-skel-wp2.log | cut -c1-120)"
git -C $BASEWT checkout -q vodacom-visual; note "journey back on $(git -C $BASEWT rev-parse --abbrev-ref HEAD) · free $(freegb) GB"
echo "done" > "$R/DONE"
