#!/usr/bin/env bash
# u43-slot.sh <tag> <command...>
# U43 lane (asheib-bb, Claude, OMEGA-COMPILE01, 2026-10-21): runs ONE heavy job (tsc, next build, next dev + drives,
# a scratch-Postgres suite, a red twin, test:all) in one of U43's slots F:/kipindi-locks/mln-slot-5..8
# (Maswali 1-4, Phosphor 9-12). Copy of the Maswali lead's mln-slot.sh with U43's range.
#  - Yields while ANOTHER session holds the machine-wide exclusive F:/kipindi-locks/heavy-node.lock.
#  - Waits while free RAM is under 5 GB.
#  - A slot whose owner PID (field 2) is dead is reclaimed (a stopped job never runs its trap).
set -u
TAG=$1; shift
ROOT=F:/kipindi-locks
FIRST=${U43_SLOT_FIRST:-5}
LAST=${U43_SLOT_LAST:-8}
waited=0
while :; do
  if [ -d "$ROOT/heavy-node.lock" ]; then
    owner=$(head -c 200 "$ROOT/heavy-node.lock/owner" 2>/dev/null)
    case "$owner" in U43*) ;; *) [ $((waited % 120)) -eq 0 ] && echo "[u43-slot $TAG] waiting: another session holds heavy-node.lock ($owner)"; sleep 15; waited=$((waited+15)); continue ;; esac
  fi
  free=$(powershell -NoProfile -Command "[math]::Floor((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB)" 2>/dev/null | tr -d '\r')
  if [ -n "$free" ] && [ "$free" -lt 5 ]; then
    [ $((waited % 120)) -eq 0 ] && echo "[u43-slot $TAG] waiting: ${free} GB free RAM"; sleep 15; waited=$((waited+15)); continue
  fi
  for i in $(seq "$FIRST" "$LAST"); do
    d="$ROOT/mln-slot-$i"
    if [ -d "$d" ]; then
      pid=$(awk '{print $2}' "$d/owner" 2>/dev/null)
      case "$pid" in ''|*[!0-9]*) ;; *) if ! kill -0 "$pid" 2>/dev/null; then rm -f "$d/owner"; rmdir "$d" 2>/dev/null; fi ;; esac
    fi
    if mkdir "$d" 2>/dev/null; then
      echo "U43 $$ $(date -u +%FT%TZ) $TAG $*" > "$d/owner"
      trap 'if [ "$(awk "{print \$2}" "'"$d"'/owner" 2>/dev/null)" = "'"$$"'" ]; then rm -f "'"$d"'/owner"; rmdir "'"$d"'" 2>/dev/null; fi' EXIT
      echo "[u43-slot $TAG] slot $i taken at $(date -u +%T)Z: $*"
      "$@"
      rc=$?
      echo "[u43-slot $TAG] slot $i done at $(date -u +%T)Z rc=$rc"
      exit $rc
    fi
  done
  [ $((waited % 120)) -eq 0 ] && echo "[u43-slot $TAG] waiting: slots $FIRST-$LAST busy: $(cat $ROOT/mln-slot-[5-8]/owner 2>/dev/null | awk '{print $1,$4}' | tr '\n' ' ')"
  sleep 10; waited=$((waited+10))
done
