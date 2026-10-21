#!/usr/bin/env bash
# u43-server-run.sh <tree-dir> <port> <log> [VAR=value ...] -- <command...>
# U43 lane (asheib-bb). Starts a FRESH IN-MEMORY `next dev` in <tree-dir> on <port> (no DATABASE_URL; the Up & Down
# round timer and healer OFF, as scripts/live/updown-visual-states.mjs requires), waits for /api/health, warms the
# U43 routes (never /auth/demo — warming it would sign the demo player in again), runs <command> from the tree with
# BASE=http://localhost:<port>, then stops ONLY the process tree this script started (taskkill /T on its own PID).
# Wrap it in u43-slot.sh (a heavy job).
set -u
DIR="$1"; PORT="$2"; LOG="$3"; shift 3
ENVS=()
while [ $# -gt 0 ] && [ "$1" != "--" ]; do ENVS+=("$1"); shift; done
[ "${1:-}" = "--" ] && shift
cd "$DIR" || { echo "no tree $DIR" > "$LOG"; echo "exit=2" > "$LOG.done"; exit 2; }
: > "$LOG"; rm -f "$LOG.done"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
if curl -s -o /dev/null -m 3 "http://localhost:$PORT/api/health"; then note "REFUSED: something already answers on :$PORT"; echo "exit=4" > "$LOG.done"; exit 4; fi
SRV_WINPID=""
TREE_NAME=$(basename "$DIR")
stop_server() {
  if [ -n "$SRV_WINPID" ]; then taskkill //PID "$SRV_WINPID" //T //F > /dev/null 2>&1; note "server tree $SRV_WINPID stopped"; SRV_WINPID=""; fi
  # An orphaned listener left by the tree kill: stop it only if its command line names THIS tree.
  local lp cl
  lp=$(powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess" 2>/dev/null | tr -dc '0-9')
  if [ -n "$lp" ] && [ "$lp" != "0" ]; then
    cl=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=$lp').CommandLine" 2>/dev/null)
    case "$cl" in *"$TREE_NAME"*) taskkill //PID "$lp" //T //F > /dev/null 2>&1; note "orphan listener $lp on :$PORT stopped" ;; *) note "listener $lp on :$PORT is not this tree's; left alone" ;; esac
  fi
}
trap stop_server EXIT
unlink_next_links() {
  # AGENTS.md §10: unlink every junction/symlink inside .next (the LINK only) before deleting the folder,
  # or the delete follows it into node_modules.
  U43_NEXT="$DIR/.next" powershell -NoProfile -Command 'Get-ChildItem $env:U43_NEXT -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object { if ($_.PSIsContainer) { [System.IO.Directory]::Delete($_.FullName) } else { [System.IO.File]::Delete($_.FullName) } }'
  local left
  left=$(U43_NEXT="$DIR/.next" powershell -NoProfile -Command '@(Get-ChildItem $env:U43_NEXT -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue).Count' | tr -dc '0-9')
  [ "${left:-1}" = "0" ]
}
start_server() {
  if [ -d "$DIR/.next" ]; then
    unlink_next_links || { note "REFUSED: links remain inside .next"; return 5; }
    rm -r -f -- "$DIR/.next"
  fi
  note "start: $DIR at $(git rev-parse --short HEAD) on :$PORT env: ${ENVS[*]:-}"
  env -u DATABASE_URL SESSION_SECRET=omega-u43-local-secret-0123456789abcdef0123 OTP_PEPPER=omega-u43-pepper-012345 \
    DISABLE_ADMIN_TOTP=true UPDOWN_SCHEDULER=false UPDOWN_HEALER=false MARKET_SCHEDULER=false "${ENVS[@]}" \
    npx next dev -p "$PORT" > "$LOG.server" 2>&1 &
  local msys=$!
  SRV_WINPID=$(cat /proc/$msys/winpid 2>/dev/null)
  note "server msys pid $msys winpid $SRV_WINPID"
  for i in $(seq 1 200); do
    code=$(curl -s -o /dev/null -m 20 -w "%{http_code}" "http://localhost:$PORT/api/health" || true)
    if [ "$code" = "200" ]; then note "server up after ~$((i * 2))s"; return 0; fi
    if grep -q "queries have exactly one entry" "$LOG.server" 2>/dev/null; then note "next/font transient at start"; return 7; fi
    sleep 2
  done
  return 3
}
start_server; rc=$?
if [ $rc -ne 0 ]; then stop_server; note "retrying the start once (rc=$rc)"; start_server; rc=$?; fi
if [ $rc -ne 0 ]; then note "server never came up (rc=$rc)"; tail -20 "$LOG.server" >> "$LOG"; stop_server; echo "exit=3" > "$LOG.done"; exit 3; fi
for p in ${WARM:-/ /updown /markets /live /results /updown/history}; do
  curl -s -o /dev/null -m 300 "http://localhost:$PORT$p"
done
note "routes warmed; running: $*"
env "${ENVS[@]}" BASE="http://localhost:$PORT" KP_BASE="http://localhost:$PORT" "$@" >> "$LOG" 2>&1
RC=$?
note "command exit=$RC"
stop_server
echo "exit=$RC" > "$LOG.done"
exit $RC
