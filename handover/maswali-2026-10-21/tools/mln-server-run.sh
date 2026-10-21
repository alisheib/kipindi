#!/usr/bin/env bash
# mln-server-run.sh <tree> <port> <log> [VAR=value ...] -- <command...>
#   e.g. mln-server-run.sh kipindi-mln-r1 3410 $S/lead/qa-dark.log FEATURE_MILLIONEA=WITHDRAWN -- node scripts/pre-deploy-live-check.mjs
# Starts a FRESH IN-MEMORY `next dev` (rm -rf .next; no DATABASE_URL; DISABLE_ADMIN_TOTP=true) for C:/50pick-ssd/<tree>
# on <port> with the extra env, waits for it, warms routes (WARM="/a /b" overrides the default list), runs <command>
# from the tree with BASE/KP_BASE=http://localhost:<port>, then stops ONLY this server (mln-procs.ps1) and writes
# <log>.done with the exit code. Wrap it in mln-slot.sh (it is a heavy job).
# MODE=start runs `next build` + `next start` instead of `next dev` (production CSS fidelity); BUILD=skip reuses .next.
set -u
TREE="$1"; PORT="$2"; LOG="$3"; shift 3
ENVS=()
while [ $# -gt 0 ] && [ "$1" != "--" ]; do ENVS+=("$1"); shift; done
[ "${1:-}" = "--" ] && shift
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
case "$TREE" in kipindi-mln-[a-z0-9-]*|maswali-[a-z0-9-]*) ;; *) echo "refusing: tree must be a Maswali SSD worktree (got '$TREE')" > "$LOG"; echo "exit=2" > "$LOG.done"; exit 2 ;; esac
DIR="C:/50pick-ssd/$TREE"
cd "$DIR" || { echo "no tree $DIR" > "$LOG"; echo "exit=2" > "$LOG.done"; exit 2; }
: > "$LOG"; rm -f "$LOG.done"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
procs() { powershell -NoProfile -ExecutionPolicy Bypass -File "$S/mln-procs.ps1" -Tree "$TREE" -Port "$PORT" "$@" | tr -dc "0-9"; }
stop_server() { left=$(procs -Stop); note "server stopped (left: ${left:-?})"; }
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
MODE=${MODE:-dev}

busy=$(procs)
if [ "${busy:-0}" != "0" ]; then note "REFUSED: a server of $TREE or on :$PORT already runs ($busy processes)"; echo "exit=4" > "$LOG.done"; exit 4; fi

SECRETS=(SESSION_SECRET=omega-mln-local-secret-0123456789abcdef0123 OTP_PEPPER=omega-mln-pepper-0123456 DISABLE_ADMIN_TOTP=true)
if [ "$MODE" = "start" ] && [ "${BUILD:-}" != "skip" ]; then
  note "next build: $TREE at $(git rev-parse --short HEAD)"
  [ -d "$DIR/.next" ] && rm -r -f -- "$DIR/.next"
  env -u DATABASE_URL "${SECRETS[@]}" "${ENVS[@]}" npx next build > "$LOG.build" 2>&1
  brc=$?
  note "next build exit=$brc"
  if [ $brc -ne 0 ]; then tail -30 "$LOG.build" >> "$LOG"; echo "exit=5" > "$LOG.done"; exit 5; fi
fi

start_server() {
  if [ "$MODE" = "start" ]; then
    note "start (next start): $TREE at $(git rev-parse --short HEAD) on :$PORT env: ${ENVS[*]:-}"
    env -u DATABASE_URL "${SECRETS[@]}" "${ENVS[@]}" npx next start -p "$PORT" > "$LOG.server" 2>&1 &
  else
    [ -d "$DIR/.next" ] && rm -r -f -- "$DIR/.next"
    note "start (next dev): $TREE at $(git rev-parse --short HEAD) on :$PORT env: ${ENVS[*]:-}"
    env -u DATABASE_URL "${SECRETS[@]}" "${ENVS[@]}" npx next dev -p "$PORT" > "$LOG.server" 2>&1 &
  fi
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

for p in ${WARM:-/ /markets /positions /wallet /profile /updown /live /results}; do
  curl -s -o /dev/null -m 300 "http://localhost:$PORT$p"
done
note "routes warmed; running: $*"
env "${ENVS[@]}" "${SECRETS[@]}" LOGBASE="${LOG%.log}" BASE="http://localhost:$PORT" KP_BASE="http://localhost:$PORT" "$@" >> "$LOG" 2>&1
RC=$?
note "command exit=$RC"
stop_server
echo "exit=$RC" > "$LOG.done"
exit $RC
