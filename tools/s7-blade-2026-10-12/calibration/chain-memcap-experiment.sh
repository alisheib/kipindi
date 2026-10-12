#!/usr/bin/env bash
# An experiment, not a gate: does experimental.turbopackMemoryLimit keep the dev server smaller? parity v3 --prove-red with the cap applied LOCALLY (restored after), its peak memory sampled.
# One dev server, the checkout VERIFIED. Helpers copied whole from r10p2 and asserted.
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad
R=$S/r11mem
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
    ( cd "$dir" && env -u DATABASE_URL SESSION_SECRET=blade-r11mem-local-secret-0123456789abcdef OTP_PEPPER=blade-r11mem-pepper-0123 \
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
CAP_MB="${CAP_MB:-2560}"
note "start: WP1 $(git -C $TIP rev-parse --short $WANT) · cap ${CAP_MB} MB · free $(freegb) GB"
journey_at "$WANT"
( cd $BASEWT && npx prisma generate ) > "$R/0-prisma.log" 2>&1
python -I - "$BASEWT/next.config.ts" "$CAP_MB" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_bytes().decode("utf-8")
a = 'optimizePackageImports: ["lucide-react", "date-fns"],'
assert t.count(a) == 1
t = t.replace(a, a + ' turbopackMemoryLimit: ' + sys.argv[2] + ' * 1024 * 1024,')
p.write_bytes(t.encode("utf-8"))
PY
grep -c "turbopackMemoryLimit" "$BASEWT/next.config.ts" >> "$R/STATUS"
( while [ ! -f "$R/SAMPLER_STOP" ]; do powershell -NoProfile -Command "\$n=(Get-Process node -ErrorAction SilentlyContinue | Sort-Object WorkingSet64 -Descending | Select-Object -First 1); '{0} {1} {2}' -f (Get-Date -Format HH:mm:ss),[math]::Round(\$n.WorkingSet64/1MB),[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)" | tr -d '\r' >> "$R/rss.txt"; sleep 5; done ) &
run_srv kipindi-journey 3078 1-prove-red-capped npm run qa:classic-shell-parity -- --prove-red
touch "$R/SAMPLER_STOP"; sleep 6
git -C $BASEWT checkout -- next.config.ts
[ -z "$(git -C $BASEWT status --porcelain --untracked-files=no)" ] && note "next.config.ts restored · tree clean" || note "⛔ journey tree NOT clean after restore"
note "prove-red capped: exit $(cat $R/1-prove-red-capped.code) · $(sed 's/\x1b\[[0-9;]*m//g' $R/1-prove-red-capped.log | grep -a -E '^  (PASS|FAIL)' | awk '{print $1}' | sort | uniq -c | tr '\n' ' ') · peak node $(sort -k2 -n $R/rss.txt | tail -1 | awk '{print $2}') MB · least free $(sort -k3 -n $R/rss.txt | head -1 | awk '{print $3}') GB"
git -C $BASEWT checkout -q vodacom-visual; note "journey back on $(git -C $BASEWT rev-parse --abbrev-ref HEAD)"
echo "done" > "$R/DONE"
