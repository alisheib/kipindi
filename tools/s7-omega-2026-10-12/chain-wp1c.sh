#!/usr/bin/env bash
# S7 WP1 step 6 on OMEGA-COMPILE01 (2026-10-12): parity v3 calibrated on fresh in-memory servers at the REBASED WP1 -
# --prove-red, the v3 baseline, then a null compare on a second fresh server. Ported from ALI-BLADE15's
# chain-prove-baseline-null.sh (origin/vodacom-visual-tools tools/s7-blade-2026-10-12/calibration/).
# One dev server at a time, each checkout VERIFIED, 30 s between runs. Run it under the shared lock:
#   LOCK_ME=vodacom-s7 bash /f/kipindi-locks/withlock.sh wp1-calibration bash <this file> <sha>
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/ac776495-2d6d-4c28-8534-f93a90c6f786/scratchpad
R=$S/s7/wp1cal3
TIP=/f/kipindi-s7b
SRV=/f/kipindi-s7srv
SRVNAME=kipindi-s7srv
PORT=3076
WANT="$1"
mkdir -p "$R"
note() { echo "$(date '+%H:%M:%S') $*" >> "$R/STATUS"; }
freegb() { powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)" | tr -d '\r'; }
stop() { note "STOP: $*"; echo "exit=2" > "$R/DONE"; exit 2; }
# move the server worktree to a commit and PROVE it is there - never trust a checkout's silence
srv_at() {
  local want; want=$(git -C $TIP rev-parse "$1") || stop "cannot resolve $1"
  git -C $SRV checkout -q --detach "$want" || stop "checkout of $1 failed"
  [ "$(git -C $SRV rev-parse HEAD)" = "$want" ] || stop "the server tree is at $(git -C $SRV rev-parse --short HEAD), not $1"
  note "server tree VERIFIED at $(git -C $SRV rev-parse --short HEAD)"
}
stop_server() {  # stop ONLY this run's dev server: node processes of the server worktree's next, and the port's owner
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { \$_.CommandLine -like '*${SRVNAME}*next*' } | ForEach-Object { taskkill /PID \$_.ProcessId /T /F | Out-Null }; \$c = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue; if (\$c) { taskkill /PID \$c.OwningProcess /T /F | Out-Null }" >/dev/null 2>&1
}
FONT_FAIL="next/font/google queries have exactly one entry"
# run_srv <tag> <command...>: a FRESH in-memory dev server (Turbopack) in the server worktree, the command run from it
# with BASE/KP_BASE set, then the server stopped. Exit code to $R/<tag>.code.
run_srv() {
  local tag="$1"; shift
  local log="$R/$tag.log" srv="$R/$tag.server.log" up=0 tries
  for tries in 1 2; do
    stop_server; rm -rf "$SRV/.next"
    ( cd "$SRV" && env -u DATABASE_URL SESSION_SECRET=omega-s7wp1c-local-secret-0123456789abcdef OTP_PEPPER=omega-s7wp1c-pepper-0123 \
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
[ -n "$WANT" ] || stop "no commit given"
[ -z "$(git -C $SRV status --porcelain --untracked-files=no)" ] || stop "the server worktree is dirty"
SHA8=$(git -C $TIP rev-parse --short=8 "$WANT")
B="$R/parity-v3-$SHA8.json"
[ -e "$B" ] && stop "a baseline already exists at $B (never overwrite one)"
rm -f "$R/DONE"
note "start: WP1 $SHA8 · free $(freegb) GB"
fonts_ok || stop "Google Fonts unreachable"
srv_at "$WANT"
( cd $SRV && npx prisma generate ) > "$R/0-prisma.log" 2>&1
# memory watchdog: below 0.45 GB free, stop THIS tree's dev server (the run then fails on its own and says so)
( while [ ! -f "$R/DONE" ]; do f=$(powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)" | tr -d '\r'); echo "$(date +%H:%M:%S) $f" >> "$R/free.txt"; if awk -v f="$f" 'BEGIN{exit !(f<0.45)}'; then note "WATCHDOG: free $f GB - stopping the s7srv dev server"; stop_server; sleep 60; fi; sleep 15; done ) &

run_srv 1-prove-red npm run qa:classic-shell-parity -- --prove-red
font_invalid 1-prove-red
note "prove-red: $(sed 's/\x1b\[[0-9;]*m//g' $R/1-prove-red.log | grep -a -E '^  (PASS|FAIL)' | awk '{print $1}' | sort | uniq -c | tr '\n' ' ') · $(verdict 1-prove-red 'ALL PASS|FAILURES|REFUSED' 1)"
[ "$(cat $R/1-prove-red.code)" = "0" ] || { note "STOP after prove-red"; echo "exit=1" > "$R/DONE"; exit 1; }
sleep 30; fonts_ok || stop "Google Fonts unreachable before the baseline"
run_srv 2-baseline npm run qa:classic-shell-parity -- --baseline "$B"
font_invalid 2-baseline
note "baseline: $(verdict 2-baseline 'ALL PASS|FAILURES|REFUSED|written|rejected|INVALID' 3) · file $(ls -la $B 2>/dev/null | awk '{print $5}') bytes"
{ [ "$(cat $R/2-baseline.code)" = "0" ] && [ -s "$B" ]; } || { note "STOP after the baseline"; echo "exit=1" > "$R/DONE"; exit 1; }
sleep 30; fonts_ok || stop "Google Fonts unreachable before the null compare"
run_srv 3-null npm run qa:classic-shell-parity -- --compare "$B"
font_invalid 3-null
note "null compare: $(verdict 3-null '^  FAIL|ALL PASS|FAILURES|REFUSED' 4)"
note "end · server tree at $(git -C $SRV rev-parse --short HEAD) · free $(freegb) GB"
echo "done" > "$R/DONE"
