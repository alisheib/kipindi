#!/usr/bin/env bash
# OMEGA-COMPILE01 port of handover tools/run-with-server.sh.
# usage: kp-with-server.sh <worktree-dir-name> <port> <log> <command...>
#   e.g. kp-with-server.sh kipindi-a8i2 3071 /path/drive.log node scripts/qa-enter-where-pressed.mjs
# Takes the shared heavy-job lock (F:/kipindi-locks, queue and lock in kp-lock.sh), starts an IN-MEMORY next dev
# server (no DATABASE_URL) for F:/<worktree> on <port>, warms the routes, runs <command> from that worktree with BASE and
# KP_BASE set, then stops ONLY the processes this run started (matched by the worktree's node_modules path and the port)
# and releases the lock. Writes <log>.done with the command's exit code.
set -u
WT="$1"; PORT="$2"; LOG="$3"; shift 3
DIR="/f/$WT"
cd "$DIR" || { echo "no worktree $DIR" > "$LOG"; echo "exit=2" > "$LOG.done"; exit 2; }
: > "$LOG"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }

# 1 · the shared lock (kp-lock.sh: our turn in the queue, then the lock; 90 minutes at most)
if [ "${KP_NO_LOCK:-}" = "1" ]; then
  note "lock not taken here (KP_NO_LOCK=1: the chain that runs this holds it)"
  release() { :; }
else
  . "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/kp-lock.sh"
  take_lock "$WT:$PORT $*" || { echo "exit=5" > "$LOG.done"; exit 5; }
fi

stop_server() {
  left=$(powershell -NoProfile -ExecutionPolicy Bypass -File "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/kp-procs.ps1" -Wt "$WT" -Port "$PORT" -Stop | tr -dc "0-9")
  note "server stopped (left: ${left:-?})"
}

# 2 · refuse if a server of this worktree already runs (it would lose its .next under it)
busy=$(powershell -NoProfile -ExecutionPolicy Bypass -File "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/kp-procs.ps1" -Wt "$WT" -Port "$PORT")
busy=${busy//[^0-9]/}
if [ "${busy:-0}" != "0" ]; then note "REFUSED: a $WT next server already runs ($busy)"; release; echo "exit=4" > "$LOG.done"; exit 4; fi

free=$(powershell -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB)" | tr -dc "0-9")
note "free memory: ${free:-?} GB"
if [ "${free:-0}" -lt 5 ]; then note "REFUSED: under 5 GB free"; release; echo "exit=6" > "$LOG.done"; exit 6; fi

# 3 · a fresh in-memory dev server
rm -rf .next
note "start: $WT at $(git rev-parse --short HEAD) on :$PORT"
env -u DATABASE_URL SESSION_SECRET=omega-a8i2-local-secret-0123456789abcdef OTP_PEPPER=omega-a8i2-pepper-0123 DISABLE_ADMIN_TOTP=true \
  npx next dev -p "$PORT" > "$LOG.server" 2>&1 &
up=0
for i in $(seq 1 180); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || true)
  if [ "$code" = "200" ]; then up=1; note "server up after $((i * 2))s"; break; fi
  sleep 2
done
if [ $up -ne 1 ]; then note "server never came up"; stop_server; release; echo "exit=3" > "$LOG.done"; exit 3; fi
for p in / /markets /positions /wallet /profile /auth/demo /updown; do curl -s -o /dev/null "http://localhost:$PORT$p"; done
note "routes warmed; running: $*"

# 4 · the command
BASE="http://localhost:$PORT" KP_BASE="http://localhost:$PORT" "$@" >> "$LOG" 2>&1
RC=$?
note "command exit=$RC"
stop_server
release
echo "exit=$RC" > "$LOG.done"
exit $RC
