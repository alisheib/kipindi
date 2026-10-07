#!/usr/bin/env bash
# Detached: with-server-detached.sh <lockname> <log> <command...>; runs run-with-server.sh under the heavy lock, writes <log>.done
WHO="$1"; LOG="$2"; shift 2
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0cb4430f-1841-4f87-b929-7c29d30c9a10/scratchpad/s6
cd /c/kipindi-journey || exit 2
~/heavy-node-lock.sh run "$WHO" bash $S/run-with-server.sh "$LOG" "$@"
echo "exit=$?" > "$LOG.done"
