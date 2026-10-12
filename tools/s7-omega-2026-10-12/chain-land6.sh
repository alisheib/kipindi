#!/usr/bin/env bash
# S7 WP5-WP10 + L1 proven together at one tip on OMEGA-COMPILE01 (2026-10-12). One dev server at a time, each checkout
# VERIFIED, 30 s between runs, a memory watchdog. Run it under the shared lock:
#   LOCK_ME=vodacom-s7 bash /f/kipindi-locks/withlock.sh land6-proof bash <this file> <tip> <main> <L1> <v3 baseline>
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/ac776495-2d6d-4c28-8534-f93a90c6f786/scratchpad
R=$S/s7/land6
TIP=/f/kipindi-s7b
SRV=/f/kipindi-s7srv
SRVNAME=kipindi-s7srv
PORT=3077
WANT="$1"; MAIN="$2"; L1="$3"; PB="$4"
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
    ( cd "$SRV" && env -u DATABASE_URL SESSION_SECRET=omega-s7land6-local-secret-0123456789abcdef OTP_PEPPER=omega-s7land6-pepper-0123 \
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
  for p in / /markets /positions /wallet /profile /auth/demo /updown /results /live /account /watchlist /help; do curl -s -o /dev/null "http://localhost:$PORT$p"; done
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
[ -n "$WANT" ] && [ -n "$MAIN" ] && [ -n "$L1" ] || stop "usage: <tip> <main> <L1> <baseline>"
[ "$(git -C $TIP rev-parse HEAD)" = "$(git -C $TIP rev-parse $WANT)" ] || stop "the branch worktree is not at $WANT"
[ -z "$(git -C $TIP status --porcelain --untracked-files=no)" ] || stop "the branch worktree is dirty"
[ -z "$(git -C $SRV status --porcelain --untracked-files=no)" ] || stop "the server worktree is dirty"
[ -s "$PB" ] || stop "no v3 baseline at $PB"
git -C $TIP merge-base --is-ancestor "$MAIN" "$WANT" || stop "main $MAIN is not under the tip"
git -C $TIP merge-base --is-ancestor "$L1" "$WANT" || stop "L1 $L1 is not under the tip"
rm -f "$R/DONE"
note "start: tip $(git -C $TIP rev-parse --short $WANT) on main $(git -C $TIP rev-parse --short $MAIN) · free $(freegb) GB"
( while [ ! -f "$R/DONE" ]; do f=$(powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)" | tr -d '\r'); echo "$(date +%H:%M:%S) $f" >> "$R/free.txt"; if awk -v f="$f" 'BEGIN{exit !(f<0.45)}'; then note "WATCHDOG: free $f GB - stopping the s7srv dev server"; stop_server; sleep 60; fi; sleep 15; done ) &

# ── A · the branch worktree at the tip: typecheck, the in-process gates, the population plants, the file-editing reds ──
( cd $TIP && npx tsc --noEmit ) > "$R/1-typecheck.log" 2>&1; T=$?; note "1 typecheck: exit $T ($(grep -c 'error TS' $R/1-typecheck.log) errors)"
: > "$R/2-gates.txt"
for g in $(cat "$S/s7/land6-gates.txt"); do ( cd $TIP && timeout 900 npm run -s $g ) > "$R/2-$g.log" 2>&1; echo "$g $?" >> "$R/2-gates.txt"; done
note "2 gates: $(awk '$2!=0{print $1"="$2}' $R/2-gates.txt | tr '\n' ' ')· $(awk '$2==0' $R/2-gates.txt | wc -l)/$(wc -l < $R/2-gates.txt) exit 0"
bash "$S/s7/plants-wp2.sh" "$TIP" "$R" > "$R/3-plants.log" 2>&1; note "3 population plants: $(tail -1 $R/3-plants.log)"
for r in red:featured-card red:one-sided red:ticker-honesty red:contrast red:timer-date red:filter-language red:measure red:chat-availability red:failure-reasons; do ( cd $TIP && timeout 1800 npm run $r ) > "$R/4-$r.log" 2>&1; rc=$?; git -C $TIP diff --exit-code > /dev/null; d=$?; note "4 $r alone: exit $rc · $(verdict 4-$r 'caught|CAUGHT|ALL|FAIL|MISSED' 1) · tree $([ $d -eq 0 ] && echo clean || echo DIRTY)"; [ $d -eq 0 ] || { git -C $TIP checkout -- .; note "restored the branch tree"; }; done
[ -z "$(git -C $TIP status --porcelain --untracked-files=no)" ] || note "WARNING: the branch tree is not clean after section A"
sleep 30

# ── B · the server worktree at the tip: qa:first-load builds at HEAD and reads the build; local qa:live ────────────────
fonts_ok || stop "Google Fonts unreachable before the build"
srv_at "$WANT"
( cd $SRV && npx prisma generate ) > "$R/0-prisma.log" 2>&1
( cd $SRV && rm -rf .next && timeout 2400 npm run -s qa:first-load -- --build --read --log "$R/5-first-load-build.log" ) > "$R/5-first-load.log" 2>&1; FL=$?
note "5 qa:first-load --build --read: exit $FL · $(verdict 5-first-load 'PASS|FAIL|refused|not measured|route' 2)"
note "  · free $(freegb) GB · cooling 30s"; sleep 30
run_srv 6-live node scripts/pre-deploy-live-check.mjs
font_invalid 6-live
note "6 qa:live local: $(verdict 6-live 'ALL PASS|passed|failed|FAIL' 2)"
sleep 30

# ── C · parity v3 against WP1's baseline: a classic reader's pages unchanged ──────────────────────────────────────────
fonts_ok || stop "Google Fonts unreachable before the parity compare"
run_srv 7-parity npm run qa:classic-shell-parity -- --compare "$PB" --allow-base
font_invalid 7-parity
note "7 parity v3 vs $(basename $PB): $(verdict 7-parity '^  FAIL|passed —|FAILURES|REFUSED' 4)"
sleep 30

# ── D · served skeleton --main, classic readers: a null pair at main, then the tip ─────────────────────────────────────
srv_at "$MAIN"
( cd $SRV && npx prisma generate ) > "$R/0-prisma-main.log" 2>&1
run_srv 8-skel-main-a npm run qa:served-skeleton -- --capture "$R/skel-main-a.json" --viewers guest,player
sleep 30
run_srv 8-skel-main-b npm run qa:served-skeleton -- --capture "$R/skel-main-b.json" --viewers guest,player
sleep 30
srv_at "$WANT"
( cd $SRV && npx prisma generate ) > "$R/0-prisma-tip.log" 2>&1
run_srv 8-skel-tip npm run qa:served-skeleton -- --capture "$R/skel-tip.json" --viewers guest,player
( cd $TIP && node scripts/qa-served-skeleton.mjs --compare "$R/skel-main-a.json" "$R/skel-main-b.json" --main --norm store-ids ) > "$R/9-skel-null.log" 2>&1; N=$?
( cd $TIP && node scripts/qa-served-skeleton.mjs --compare "$R/skel-main-a.json" "$R/skel-tip.json" --main --norm store-ids ) > "$R/9-skel-tip.log" 2>&1; K=$?
note "9 served skeleton --main: null pair exit $N · $(tail -1 $R/9-skel-null.log | cut -c1-110) · main->tip exit $K · $(tail -1 $R/9-skel-tip.log | cut -c1-110)"
sleep 30

# ── E · L1's drive on the tip, then its control (lazy-overlays.tsx as L1's parent had it) ──────────────────────────────
run_srv 10-lost-chunk npm run -s qa:lost-chunk
note "10 qa:lost-chunk on the tip: $(verdict 10-lost-chunk 'PASS|FAIL|NOT MEASURED|controls?' 2)"
sleep 30
git -C $SRV checkout "$L1~1" -- src/components/layout/lazy-overlays.tsx || stop "could not put L1's parent file back"
run_srv 11-lost-chunk-control npm run -s qa:lost-chunk -- --expect-crash
git -C $SRV checkout "$WANT" -- src/components/layout/lazy-overlays.tsx; rm -rf "$SRV/.next"
[ -z "$(git -C $SRV status --porcelain --untracked-files=no)" ] && note "11 qa:lost-chunk control (parent's file): $(verdict 11-lost-chunk-control 'PASS|FAIL|NOT MEASURED|control' 2) · server tree restored, clean" || note "11 WARNING: the server tree is not clean after the control"
( cd $TIP && npm run -s qa:chunks-prod -- --self-test ) > "$R/12-chunks-self.log" 2>&1; note "12 qa:chunks-prod --self-test: exit $? · $(verdict 12-chunks-self 'PASS|FAIL|controls?' 1)"
note "end · server tree at $(git -C $SRV rev-parse --short HEAD) · free $(freegb) GB"
echo "done" > "$R/DONE"
