#!/usr/bin/env bash
# Detached parity run under the heavy lock: parity-detached.sh <log> <mode args...>; writes <log>.done with the exit code.
LOG="$1"; shift
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0cb4430f-1841-4f87-b929-7c29d30c9a10/scratchpad/s6
cd /c/kipindi-journey || exit 2
~/heavy-node-lock.sh run s6-parity bash $S/run-parity.sh "$LOG" "$@"
echo "exit=$?" > "$LOG.done"
