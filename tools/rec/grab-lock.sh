#!/usr/bin/env bash
# Agreed with marketing (asheib-25), 2026-10-07 ~19:55Z: the lock goes straight from wb-chain's release to this session for
# the WP12 push read-back (push, deploy, production qa:live: ~20 min), then to marketing's turn B. Marketing withdrew its
# note and waits until the wb-chain line is gone; it takes a lock left free with no note for 3 minutes. So this takes the
# lock the moment wb-chain releases it and KEEPS it (no trap): the operator releases it by hand when the drive ends.
# ⚠️ Do not write runs/wp12-pushed.done until marketing's turn B holds the lock: A2 would queue ahead of it.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/grab-lock.log"; WT="push-readback"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
: > "$LOG"
until [ -f "$R/wb-chain.done" ]; do sleep 5; done
note "wb-chain.done: $(cat "$R/wb-chain.done")"
. "$S/kp-lock.sh"
if KP_WAIT_MAX=900 take_lock "push-readback: WP12 push + production qa:live, ~20 min (agreed with marketing asheib-25)"; then
  note "HOLDING the lock for the push read-back — release by hand when the drive ends"
else
  note "could not take the lock within 15 min"
fi
