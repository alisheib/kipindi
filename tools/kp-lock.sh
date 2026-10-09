# kp-lock.sh - sourced by kp-with-server.sh, kp-locked.sh and the chains. The shared heavy-job lock and its queue.
# Needs WT and note(). take_lock "<what>" returns 0 holding the lock, 5 after 90 minutes; release frees only our own.
# Queue (agreed with the other sessions): heavy-node.wait names ONE waiter, who goes first. We write our line only
# when no note is there (noclobber) and NEVER overwrite another session's note, even while that session holds the lock
# (it may queue a second job: 2026-10-07 12:23Z this script took marketing's place that way, put back at once). Until our
# line is the note we never try the lock; once we hold it we delete our note (and only ours).
ME="asheib-c5"
LOCK="/f/kipindi-locks/heavy-node.lock"
WAITF="/f/kipindi-locks/heavy-node.wait"
first_word() { awk 'NR==1{print $1; exit}' "$1" 2>/dev/null; }
take_lock() {
  local what="$1" waited=0 queued=0 w line
  line="$ME vodacom: $WT queued since $(date -u +%FT%TZ)"
  while :; do
    # Our place is re-read on EVERY try: a note that is someone else's now (another session rewrote its own note in
    # the moment it was gone) means we wait again — we never try the lock on a place the note no longer shows.
    if [ $queued -eq 1 ]; then
      [ -f "$WAITF" ] || ( set -C; echo "$line" > "$WAITF" ) 2>/dev/null || true
      if [ "$(first_word "$WAITF")" != "$ME" ]; then queued=0; note "queue place yielded to $(first_word "$WAITF")"; fi
    fi
    if [ $queued -eq 0 ]; then
      if ( set -C; echo "$line" > "$WAITF" ) 2>/dev/null; then queued=1; note "queued: wait note written"
      else
        w=$(first_word "$WAITF")
        if [ "$w" = "$ME" ]; then queued=1
        fi
      fi
    fi
    if [ $queued -eq 1 ] && [ "$(first_word "$WAITF")" = "$ME" ] && mkdir "$LOCK" 2>/dev/null; then break; fi
    if [ $waited -ge "${KP_WAIT_MAX:-5400}" ]; then
      note "LOCK not reached in $(( ${KP_WAIT_MAX:-5400} / 60 )) min (owner: $(head -c 200 "$LOCK/owner" 2>/dev/null); queue: $(head -c 200 "$WAITF" 2>/dev/null))"
      [ "$(first_word "$WAITF")" = "$ME" ] && rm -f "$WAITF"
      return 5
    fi
    [ $((waited % 300)) -eq 0 ] && note "waiting (owner: $(head -c 200 "$LOCK/owner" 2>/dev/null); queue: $(head -c 200 "$WAITF" 2>/dev/null))"
    sleep 15; waited=$((waited + 15))
  done
  [ "$(first_word "$WAITF")" = "$ME" ] && rm -f "$WAITF"
  echo "$ME vodacom $what since $(date -u +%FT%TZ)" > "$LOCK/owner"
  note "lock taken"
  return 0
}
release() {
  for i in $(seq 1 60); do
    if [ -f "$LOCK/owner" ] && [ "$(first_word "$LOCK/owner")" != "$ME" ]; then return 0; fi
    rm -f "$LOCK/owner"; rmdir "$LOCK" 2>/dev/null && { note "lock released"; return 0; }
    [ -d "$LOCK" ] || return 0
    sleep 1
  done
  note "WARNING: could not remove $LOCK"
}
