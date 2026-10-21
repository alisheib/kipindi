#!/usr/bin/env bash
# mln-slot-s78.sh <lane> <command...> — slots 7 and 8 (lent by U43 while it is paused), for the wrap-up of 2026-10-21 PM
# Runs ONE heavy job (tsc, next build, next dev + drives, a scratch-Postgres suite, a red twin, test:all) in one of the
# Maswali lane's slots F:/kipindi-locks/mln-slot-1..MLN_SLOTS (default 4; U43 owns 5-8, Phosphor 9-12 — agreed by the
# three lanes on OMEGA-COMPILE01, 2026-10-21; Ali: "parallelize as u need its ok").
#  - Yields while ANOTHER session holds the machine-wide exclusive lock F:/kipindi-locks/heavy-node.lock.
#  - Waits while free RAM is under 5 GB.
#  - A slot whose owner PID is dead is reclaimed (a stopped job never runs its trap).
# Usage:  bash <scratchpad>/mln-slot.sh s5 npm run test:maswali-purchase
set -u
LANE=$1; shift
ROOT=F:/kipindi-locks
SLOTS="7 8"
waited=0
while :; do
  if [ -d "$ROOT/heavy-node.lock" ]; then
    owner=$(cat "$ROOT/heavy-node.lock/owner" "$ROOT/heavy-node.lock/owner.txt" 2>/dev/null | head -c 200)
    case "$owner" in MASWALI*|maswali*) ;; *) [ $((waited % 120)) -eq 0 ] && echo "[mln-slot $LANE] waiting: another session holds heavy-node.lock ($owner)"; sleep 15; waited=$((waited+15)); continue ;; esac
  fi
  free=$(powershell -NoProfile -Command "[math]::Floor((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB)" 2>/dev/null | tr -d '\r')
  if [ -n "$free" ] && [ "$free" -lt 5 ]; then
    [ $((waited % 120)) -eq 0 ] && echo "[mln-slot $LANE] waiting: ${free} GB free RAM"; sleep 15; waited=$((waited+15)); continue
  fi
  for i in $SLOTS; do
    d="$ROOT/mln-slot-$i"
    if [ -d "$d" ]; then
      pid=$(awk '{print $2}' "$d/owner" 2>/dev/null)
      if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -f "$d/owner"; rmdir "$d" 2>/dev/null; fi
    fi
    if mkdir "$d" 2>/dev/null; then
      echo "MASWALI-$LANE $$ $(date -u +%FT%TZ) $*" > "$d/owner"
      trap 'if [ "$(awk "{print \$2}" "'"$d"'/owner" 2>/dev/null)" = "'"$$"'" ]; then rm -f "'"$d"'/owner"; rmdir "'"$d"'" 2>/dev/null; fi' EXIT
      echo "[mln-slot $LANE] slot $i taken at $(date -u +%T)Z: $*"
      "$@"
      rc=$?
      echo "[mln-slot $LANE] slot $i done at $(date -u +%T)Z rc=$rc"
      exit $rc
    fi
  done
  [ $((waited % 120)) -eq 0 ] && echo "[mln-slot $LANE] waiting: all $SLOTS slots busy: $(cat $ROOT/mln-slot-[1-8]/owner 2>/dev/null | awk '{print $1}' | tr '\n' ' ')"
  sleep 10; waited=$((waited+10))
done
