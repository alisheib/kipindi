#!/usr/bin/env bash
# usage: kp-locked.sh <worktree-dir-name> <log> <command...>
# Takes the shared heavy-job lock (F:/kipindi-locks, queue and lock in kp-lock.sh), runs <command> from F:/<worktree> with no server, releases the
# lock (only ever its own owner line), and writes <log>.done with the command's exit code.
set -u
WT="$1"; LOG="$2"; shift 2
DIR="/f/$WT"
cd "$DIR" || { echo "no worktree $DIR" > "$LOG"; echo "exit=2" > "$LOG.done"; exit 2; }
: > "$LOG"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
. "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/kp-lock.sh"
take_lock "$WT $*" || { echo "exit=5" > "$LOG.done"; exit 5; }
note "start: $WT at $(git rev-parse --short HEAD): $*"
"$@" >> "$LOG" 2>&1
RC=$?
note "command exit=$RC"
release
echo "exit=$RC" > "$LOG.done"
exit $RC
