#!/usr/bin/env bash
# S7 WP2 proven on OMEGA-COMPILE01 (2026-10-12), ported from ALI-BLADE15's chain-wp2-proof.sh
# (origin/vodacom-visual-tools tools/s7-blade-2026-10-12/wp2/): typecheck, the gates, the population plants and the
# file-mutating reds in the branch worktree; next build, local qa:live, parity v3 against WP1's baseline and the
# served-skeleton pair in the server worktree. One dev server at a time, each checkout VERIFIED, 30 s between runs.
#   LOCK_ME=vodacom-s7 bash /f/kipindi-locks/withlock.sh wp2-proof bash <this file> <wp2 sha> <wp1 sha> <v3 baseline file>
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/ac776495-2d6d-4c28-8534-f93a90c6f786/scratchpad
R=$S/s7/wp2proof
TIP=/f/kipindi-s7b
SRV=/f/kipindi-s7srv
SRVNAME=kipindi-s7srv
PORT=3077
WANT="$1"; WP1="$2"; PB="$3"
mkdir -p "$R"
note() { echo "$(date '+%H:%M:%S') $*" >> "$R/STATUS"; }
freegb() { powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)" | tr -d '\r'; }
stop() { note "STOP: $*"; echo "exit=2" > "$R/DONE"; exit 2; }
srv_at() {
  local want; want=$(git -C $TIP rev-parse "$1") || stop "cannot resolve $1"
  git -C $SRV checkout -q --detach "$want" || stop "checkout of $1 failed"
  [ "$(git -C $SRV rev-parse HEAD)" = "$want" ] || stop "the server tree is at $(git -C $SRV rev-parse --short HEAD), not $1"
  note "server tree VERIFIED at $(git -C $SRV rev-parse --short HEAD)"
}
stop_server() {
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { \$_.CommandLine -like '*${SRVNAME}*next*' } | ForEach-Object { taskkill /PID \$_.ProcessId /T /F | Out-Null }; \$c = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue; if (\$c) { taskkill /PID \$c.OwningProcess /T /F | Out-Null }" >/dev/null 2>&1
}
FONT_FAIL="next/font/google queries have exactly one entry"
run_srv() {
  local tag="$1"; shift
  local log="$R/$tag.log" srv="$R/$tag.server.log" up=0 tries
  for tries in 1 2; do
    stop_server; rm -rf "$SRV/.next"
    ( cd "$SRV" && env -u DATABASE_URL SESSION_SECRET=omega-s7wp2-local-secret-0123456789abcdef OTP_PEPPER=omega-s7wp2-pepper-0123 \
        DISABLE_ADMIN_TOTP=true npx next dev -p "$PORT" > "$srv" 2>&1 & )
    up=0
    for i in $(seq 1 180); do
      code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || true)
      [ "$code" = "200" ] && { up=1; break; }
      grep -q "$FONT_FAIL" "$srv" 2>/dev/null && break
      sleep 2
    done
    [ $up -eq 1 ] && break
    note "$tag: server did not come up (try $tries)"
  done
  if [ $up -ne 1 ]; then stop_server; echo 99 > "$R/$tag.code"; note "$tag: NO SERVER"; return; fi
  for p in / /markets /positions /wallet /profile /auth/demo /updown /results /live /account /watchlist; do curl -s -o /dev/null "http://localhost:$PORT$p"; done
  ( cd "$SRV" && BASE="http://localhost:$PORT" KP_BASE="http://localhost:$PORT" LIVE_BASE="http://localhost:$PORT" "$@" ) > "$log" 2>&1
  local rc=$?
  stop_server
  echo $rc > "$R/$tag.code"
  note "$tag: exit $rc (free $(freegb) GB)"
}
fonts_ok() { [ "$(curl -s -o /dev/null -m 15 -w "%{http_code}" "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap")" = "200" ]; }
font_invalid() { grep -a -q "issue establishing a connection while requesting https://fonts.googleapis.com" "$R/$1.server.log" && note "INVALID $1: the dev server could not fetch Google Fonts"; }
verdict() { sed 's/\x1b\[[0-9;]*m//g' "$R/$1.log" | grep -a -E "$2" | tail -${3:-3} | tr '\n' ' ' | cut -c1-300; }

for f in note freegb stop srv_at stop_server run_srv fonts_ok font_invalid verdict; do declare -F $f >/dev/null || { echo "helper $f missing" >> "$R/STATUS"; echo "exit=2" > "$R/DONE"; exit 2; }; done
[ -n "$WANT" ] && [ -n "$WP1" ] || stop "usage: <wp2 sha> <wp1 sha> <baseline>"
[ "$(git -C $TIP rev-parse HEAD)" = "$(git -C $TIP rev-parse $WANT)" ] || stop "the branch worktree is not at $WANT"
[ -z "$(git -C $TIP status --porcelain --untracked-files=no)" ] || stop "the branch worktree is dirty"
[ -z "$(git -C $SRV status --porcelain --untracked-files=no)" ] || stop "the server worktree is dirty"
[ -s "$PB" ] || stop "no v3 baseline at $PB"
git -C $TIP merge-base --is-ancestor "$WP1" "$WANT" || stop "WP1 $WP1 is not an ancestor of WP2 $WANT"
rm -f "$R/DONE"
note "start: WP2 $(git -C $TIP rev-parse --short $WANT) on WP1 $(git -C $TIP rev-parse --short $WP1) · free $(freegb) GB"
( while [ ! -f "$R/DONE" ]; do f=$(powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)" | tr -d '\r'); echo "$(date +%H:%M:%S) $f" >> "$R/free.txt"; if awk -v f="$f" 'BEGIN{exit !(f<0.45)}'; then note "WATCHDOG: free $f GB - stopping the s7srv dev server"; stop_server; sleep 60; fi; sleep 15; done ) &

# ── A · in the branch worktree at WP2: typecheck, the gates, the four populations' plants, the file-mutating reds alone ──
( cd $TIP && npx tsc --noEmit ) > "$R/1-typecheck.log" 2>&1; T=$?; note "1 typecheck: exit $T ($(grep -c 'error TS' $R/1-typecheck.log) errors)"
GATES="test:featured-card test:one-sided test:landing-mine test:hero-copy red:hero-copy test:house-bot-disclosure test:simple-journey-flag test:route-census test:journey-home red:journey-home test:red-anchors test:measure test:docs test:predictor-shown test:visual-pass-r4h test:visual-pass-r4i test:visual-pass-r5e test:withdrawn-features test:agent-terms-binding test:visual-pass-r5l test:failure-reasons test:decomment test:orphans test:hero-contract test:landing-contract test:cert-devroutes test:live-target-safe test:vodacom-plan test:visual-pass-r8d"
: > "$R/2-gates.txt"
for g in $GATES; do ( cd $TIP && npm run $g ) > "$R/2-$g.log" 2>&1; echo "$g $?" >> "$R/2-gates.txt"; done
note "2 gates: $(awk '$2!=0{print $1"="$2}' $R/2-gates.txt | tr '\n' ' ')· $(awk '$2==0' $R/2-gates.txt | wc -l)/$(wc -l < $R/2-gates.txt) exit 0"
bash "$S/s7/plants-wp2.sh" "$TIP" "$R" > "$R/3-plants.log" 2>&1; note "3 population plants: $(tail -1 $R/3-plants.log)"
for r in red:featured-card red:one-sided; do ( cd $TIP && npm run $r ) > "$R/4-$r.log" 2>&1; rc=$?; git -C $TIP diff --exit-code > /dev/null; d=$?; note "4 $r alone: exit $rc · $(verdict 4-$r 'caught|CAUGHT|ALL|FAIL' 1) · tree $([ $d -eq 0 ] && echo clean || echo DIRTY)"; [ $d -eq 0 ] || { git -C $TIP checkout -- .; note "restored the branch tree"; }; done
[ -z "$(git -C $TIP status --porcelain --untracked-files=no)" ] || note "WARNING: the branch tree is not clean after section A"
sleep 30

# ── B · in the server worktree at WP2: next build; local qa:live on a fresh in-memory server ──────────────────────────
fonts_ok || stop "Google Fonts unreachable before the build"
srv_at "$WANT"
( cd $SRV && npx prisma generate ) > "$R/0-prisma.log" 2>&1
( cd $SRV && for n in 1 2 3; do rm -rf .next; npx next build > "$R/5-build-$n.log" 2>&1; B=$?; [ $B -eq 0 ] && break; grep -q "$FONT_FAIL\|3221225477" "$R/5-build-$n.log" || break; sleep 20; done; echo "B=$B n=$n" > "$R/5-build.code" )
note "5 next build: $(cat $R/5-build.code) · free $(freegb) GB · cooling 30s"; sleep 30
run_srv 6-live node scripts/pre-deploy-live-check.mjs
font_invalid 6-live
note "6 qa:live local: $(verdict 6-live 'ALL PASS|passed|failed|FAIL' 2)"
sleep 30

# ── C · parity v3: the WP2 tree against WP1's baseline (0 differences, bodies and /'s head included) ──────────────────
fonts_ok || stop "Google Fonts unreachable before the parity compare"
run_srv 7-parity npm run qa:classic-shell-parity -- --compare "$PB" --allow-base
font_invalid 7-parity
note "7 parity v3 vs $(basename $PB): $(verdict 7-parity '^  FAIL|ALL PASS|FAILURES|REFUSED' 4)"
sleep 30

# ── D · served skeleton: a null pair at WP1 (two fresh servers), then WP2 - compared offline with --main ─────────────
srv_at "$WP1"
( cd $SRV && npx prisma generate ) > "$R/0-prisma-wp1.log" 2>&1
run_srv 8-skel-wp1-a npm run qa:served-skeleton -- --capture "$R/skel-wp1-a.json" --viewers guest,player
sleep 30
run_srv 8-skel-wp1-b npm run qa:served-skeleton -- --capture "$R/skel-wp1-b.json" --viewers guest,player
sleep 30
srv_at "$WANT"
( cd $SRV && npx prisma generate ) > "$R/0-prisma-wp2.log" 2>&1
run_srv 8-skel-wp2 npm run qa:served-skeleton -- --capture "$R/skel-wp2.json" --viewers guest,player
( cd $TIP && node scripts/qa-served-skeleton.mjs --compare "$R/skel-wp1-a.json" "$R/skel-wp1-b.json" --main --norm store-ids ) > "$R/9-skel-null.log" 2>&1; N=$?
( cd $TIP && node scripts/qa-served-skeleton.mjs --compare "$R/skel-wp1-a.json" "$R/skel-wp2.json" --main --norm store-ids ) > "$R/9-skel-wp2.log" 2>&1; K=$?
note "9 served skeleton --main: null pair exit $N · $(tail -1 $R/9-skel-null.log | cut -c1-140) · WP1->WP2 exit $K · $(tail -1 $R/9-skel-wp2.log | cut -c1-140)"
note "end · server tree at $(git -C $SRV rev-parse --short HEAD) · free $(freegb) GB"
echo "done" > "$R/DONE"
