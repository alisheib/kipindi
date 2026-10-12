#!/usr/bin/env bash
# S7 WP1 step 6: parity v3 calibrated on fresh in-memory servers - --prove-red, the v3 baseline at WP1's commit, a null compare.
# One dev server at a time, each checkout VERIFIED, 30 s between runs. Helpers copied whole from r10p2 and asserted.
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad
R=$S/r11cal2
TIP=/c/kipindi-r10
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
    ( cd "$dir" && env -u DATABASE_URL SESSION_SECRET=blade-r11cal2-local-secret-0123456789abcdef OTP_PEPPER=blade-r11cal2-pepper-0123 \
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
[ -z "$(git -C $BASEWT status --porcelain --untracked-files=no)" ] || stop "the journey worktree is dirty"
fonts_ok() { [ "$(curl -s -o /dev/null -m 15 -w "%{http_code}" "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap")" = "200" ]; }
font_invalid() { grep -a -q "issue establishing a connection while requesting https://fonts.googleapis.com" "$R/$1.server.log" && note "⛔ INVALID $1: the dev server could not fetch Google Fonts"; }
SHA8=$(git -C $TIP rev-parse --short=8 "$WANT")
B="$R/parity-v3-$SHA8.json"
note "start: WP1 $SHA8 · free $(freegb) GB"
fonts_ok || stop "Google Fonts unreachable"
journey_at "$WANT"
( cd $BASEWT && npx prisma generate ) > "$R/0-prisma.log" 2>&1
( while [ ! -f "$R/DONE" ]; do f=$(powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)" | tr -d '\r'); echo "$(date +%H:%M:%S) $f" >> "$R/free.txt"; if awk -v f="$f" 'BEGIN{exit !(f<0.45)}'; then note "⛔ WATCHDOG: free $f GB — stopping the journey dev server"; powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { \$_.CommandLine -like '*kipindi-journey*next*' } | ForEach-Object { taskkill /PID \$_.ProcessId /T /F | Out-Null }" >/dev/null 2>&1; sleep 60; fi; sleep 10; done ) &
sleep 30; fonts_ok || stop "Google Fonts unreachable before the baseline"
run_srv kipindi-journey 3076 2-baseline npm run qa:classic-shell-parity -- --baseline "$B"
font_invalid 2-baseline
note "baseline: $(sed 's/\x1b\[[0-9;]*m//g' $R/2-baseline.log | grep -a -E 'ALL PASS|FAILURES|REFUSED|written|rejected' | tail -2 | tr '\n' ' ' | cut -c1-200) · file $(ls -la $B 2>/dev/null | awk '{print $5}') bytes"
if [ "$(cat $R/2-baseline.code)" != "0" ] || [ ! -s "$B" ]; then git -C $BASEWT checkout -q vodacom-visual; note "STOP after the baseline"; echo "exit=1" > "$R/DONE"; exit 1; fi
sleep 30; fonts_ok || stop "Google Fonts unreachable before the null compare"
run_srv kipindi-journey 3076 3-null npm run qa:classic-shell-parity -- --compare "$B"
font_invalid 3-null
note "null compare: $(sed 's/\x1b\[[0-9;]*m//g' $R/3-null.log | grep -a -E '^  FAIL|ALL PASS|FAILURES' | tail -4 | tr '\n' ' ' | cut -c1-300)"
git -C $BASEWT checkout -q vodacom-visual; note "journey back on $(git -C $BASEWT rev-parse --abbrev-ref HEAD) · free $(freegb) GB"
echo "done" > "$R/DONE"
