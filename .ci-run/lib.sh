#!/usr/bin/env bash
# lib.sh — sourced by a run's job.sh (`. "$CI_RUN/lib.sh"`). The working directory is the target tree.
#   step <name> <command...>      runs one command, its whole output to $OUT/<name>.log; prints rc + the summary lines;
#                                 on failure the last 60 lines; returns the command's rc and records it in $OUT/summary.txt.
#   serve <port> [VAR=v ...] -- <command...>
#                                 a FRESH in-memory `next dev` of the target tree (rm -rf .next; no DATABASE_URL;
#                                 DISABLE_ADMIN_TOTP=true) with the extra env, warmed, then <command> with
#                                 BASE/KP_BASE=http://localhost:<port>; the server's whole process group stopped after.
#   serve_tree <tree> <port> ...  the same for another checkout (e.g. a `git worktree add` of live main).
#   plant_check <name> <file>     after a planted run: the file restored byte for byte (git checkout) and the tree clean.
# Names must be file-safe: letters, digits, dot, dash, underscore.
set -u
: "${OUT:?OUT unset}"
LIB_SECRETS=(SESSION_SECRET=ci-gate-session-secret-0123456789abcdef OTP_PEPPER=ci-gate-otp-pepper-0123456 AUDIT_CHAIN_SECRET=ci-gate-audit-chain-secret-9876543210 DISABLE_ADMIN_TOTP=true)
LIB_FAILED=0

step() {
  local name="$1"; shift
  local log="$OUT/$name.log"
  echo "::group::$name — $*"
  "$@" > "$log" 2>&1
  local rc=$?
  echo "::endgroup::"
  echo "---- [$name] rc=$rc :: $*"
  grep -a -E "✗|FAIL|ALL PASS|passed, |passed —| passed|failed|NOT MEASURED|PREMISE|REFUSED|OVERRIDDEN|caught|missed|errors?=" "$log" | tail -25
  if [ $rc -ne 0 ]; then echo "     (last lines)"; tail -60 "$log"; LIB_FAILED=1; fi
  echo "$name rc=$rc" >> "$OUT/summary.txt"
  return $rc
}

serve_tree() {
  local tree="$1" port="$2"; shift 2
  local envs=()
  while [ $# -gt 0 ] && [ "$1" != "--" ]; do envs+=("$1"); shift; done
  [ "${1:-}" = "--" ] && shift
  local slog="$OUT/server-$port-$(date -u +%H%M%S).log"
  ( cd "$tree" && rm -rf .next )
  echo "== $(date -u +%T) next dev $(git -C "$tree" rev-parse --short=9 HEAD) on :$port env: ${envs[*]:-none} (log $(basename "$slog"))"
  ( cd "$tree" && exec setsid env -u DATABASE_URL "${LIB_SECRETS[@]}" "${envs[@]}" npx next dev -p "$port" ) > "$slog" 2>&1 &
  local spid=$!
  local code=000 i
  for i in $(seq 1 300); do
    code=$(curl -s -o /dev/null -m 20 -w "%{http_code}" "http://localhost:$port/api/health" || true)
    [ "$code" = "200" ] && break
    sleep 2
  done
  if [ "$code" != "200" ]; then
    echo "server never came up"; tail -60 "$slog"
    kill -KILL -- -"$spid" 2>/dev/null; fuser -k "$port/tcp" >/dev/null 2>&1; LIB_FAILED=1; return 3
  fi
  echo "== $(date -u +%T) up: $(curl -s -m 20 "http://localhost:$port/api/health" | head -c 600)"
  local p
  for p in ${WARM:-/ /markets /positions /wallet /profile /updown /live /results}; do curl -s -o /dev/null -m 300 "http://localhost:$port$p"; done
  echo "== $(date -u +%T) warmed; running: $*"
  ( cd "$tree" && env -u DATABASE_URL "${LIB_SECRETS[@]}" "${envs[@]}" BASE="http://localhost:$port" KP_BASE="http://localhost:$port" "$@" )
  local rc=$?
  echo "== $(date -u +%T) exit=$rc; stopping :$port"
  kill -TERM -- -"$spid" 2>/dev/null; sleep 3; kill -KILL -- -"$spid" 2>/dev/null; fuser -k "$port/tcp" >/dev/null 2>&1
  return $rc
}

serve() { serve_tree "$PWD" "$@"; }

plant_check() {
  local name="$1" file="$2"
  git checkout -- "$file"
  if [ -n "$(git status --porcelain -- "$file")" ]; then echo "PLANT NOT RESTORED: $file"; LIB_FAILED=1; return 1; fi
  echo "$name: $file restored"
}

finish() {
  echo "==== summary"; cat "$OUT/summary.txt" 2>/dev/null
  echo "==== tree"; git status --short | head -40
  exit $LIB_FAILED
}
