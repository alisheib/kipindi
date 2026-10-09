#!/usr/bin/env bash
# One lock job: clean .next, start an in-memory dev server, run the parity harness in the given mode(s), stop the server.
# usage: run-parity.sh <log> <mode args...>   e.g. run-parity.sh p.log --prove-red  |  --baseline FILE  |  --compare FILE
set -u
LOG="$1"; shift
cd /c/kipindi-journey || exit 2
start_server() {
  # Refuse to start while ANY dev server of this worktree runs: a second job here would delete its .next under it
  # (2026-10-04: another lane's lock breach ran two of my jobs at once; this makes a breach fail safe).
  busy=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.Name -eq 'node.exe' -and \$_.CommandLine -like '*kipindi-journey*node_modules*next*' } | Measure-Object).Count")
  busy=${busy//[^0-9]/}
  if [ "${busy:-0}" != "0" ]; then echo "REFUSED: a kipindi-journey next server is already running ($busy) — another job holds this worktree" >> "$LOG"; return 4; fi
  rm -rf .next
  SESSION_SECRET=s6-parity-local-secret-0123456789abcdef OTP_PEPPER=s6-parity-pepper-0123 DISABLE_ADMIN_TOTP=true \
    npx next dev -p 3041 > "$LOG.server" 2>&1 &
  SERVER_PID=$!
  for i in $(seq 1 180); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3041/ || true)
    [ "$code" = "200" ] && { echo "server up after ${i}x2s" >> "$LOG"; return 0; }
    sleep 2
  done
  echo "server never came up" >> "$LOG"; return 1
}
stop_server() {
  # kill this worktree's next processes only (never another session's server)
  powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*kipindi-journey*node_modules*next*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
  kill $SERVER_PID 2>/dev/null; sleep 3
}
echo "=== $(date -u) mode: $*" >> "$LOG"
start_server; rc0=$?; if [ $rc0 -eq 4 ]; then exit 4; fi; [ $rc0 -eq 0 ] || { stop_server; exit 3; }
# warm the routes so the first measured cell is not a compile
for p in / /markets /positions /wallet /profile /account /auth/demo; do curl -s -o /dev/null http://localhost:3041$p; done
KP_BASE=http://localhost:3041 node scripts/qa-classic-shell-parity.mjs "$@" >> "$LOG" 2>&1
RC=$?
echo "harness exit=$RC" >> "$LOG"
stop_server
exit $RC
