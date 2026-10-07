# chain-lib.sh - sourced by the WP12 lock-turn chains (wb, wc, wd). Needs S, R and LOG set.
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
# a worktree's fingerprint: status with untracked files (ignored ones excluded) + a hash of its diff against HEAD
fp_of() { ( cd "/f/$1" && { git status --porcelain --untracked-files=all; git diff HEAD --binary | sha1sum; } | sha1sum | cut -c1-12 ); }
# run <worktree> <port> <name> <command...> : one fresh in-memory server for one command (the chain holds the lock)
run() {
  local wt="$1" port="$2" name="$3" f0 f1; shift 3
  rm -f "$R/$name.log" "$R/$name.log.done" "$R/$name.log.server"
  f0=$(fp_of "$wt")
  KP_NO_LOCK=1 bash "$S/kp-with-server.sh" "$wt" "$port" "$R/$name.log" "$@"
  f1=$(fp_of "$wt")
  note "$name: $(cat "$R/$name.log.done" 2>/dev/null) · tree $([ "$f0" = "$f1" ] && echo same || echo CHANGED) — $(sed 's/\x1b\[[0-9;]*m//g' "$R/$name.log" | grep -v '^\s*$' | grep -vE '^[0-9]{2}:[0-9]{2}:[0-9]{2} ' | tail -3 | tr '\n' ' ' | cut -c1-700)"
  [ "$f0" = "$f1" ] || { note "  ⛔ $wt changed under $name:"; git -C "/f/$wt" status --short | head -10 >> "$LOG"; }
}
wait_done() { note "waiting for $1"; until [ -f "$R/$1" ]; do sleep 30; done; note "$1 is there"; }
# the WP12 trees: AFTER = the vodacom-wp12 tip; BEFORE = the parent of WP12's own commit (found by its subject)
wp12_trees() {
  AFTER=$(git -C /f/kipindi-wp12 rev-parse --short vodacom-wp12)
  local w; w=$(git -C /f/kipindi-wp12 log --format=%H -1 --grep="^Vodacom S6 WP12: the shell's proof tools" vodacom-wp12)
  BEFORE=$(git -C /f/kipindi-wp12 rev-parse --short "$w^")
}
