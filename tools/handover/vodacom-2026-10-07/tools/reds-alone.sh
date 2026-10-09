#!/usr/bin/env bash
# File-mutating red harnesses, ONE AT A TIME inside one heavy-lock job, detached. After each: git's view of the tree, so
# a mutation left behind is named at once. Never piped (a pipe would mask the harness's exit code).
# usage: reds-alone.sh <who> <logdir> <npm-script>...   writes <logdir>/summary.log and <logdir>/summary.log.done
WHO="$1"; DIR="$2"; shift 2
mkdir -p "$DIR"
cd /c/kipindi-journey || exit 2
run_all() {
  for k in "$@"; do
    log="$DIR/$(echo "$k" | tr ':/' '__').log"
    npm run -s "$k" > "$log" 2>&1
    rc=$?
    dirty=$(git status --short | grep -v '^??' | head -5 | tr '\n' ' ')
    echo "$k exit=$rc tree=[${dirty:-clean}]"
    if [ -n "$dirty" ]; then echo "STOP: $k left the tracked tree modified — restore with git checkout before anything else"; return 3; fi
  done
}
~/heavy-node-lock.sh run "$WHO" bash -c "$(declare -f run_all); DIR='$DIR'; run_all $*" > "$DIR/summary.log" 2>&1
echo "exit=$?" > "$DIR/summary.log.done"
