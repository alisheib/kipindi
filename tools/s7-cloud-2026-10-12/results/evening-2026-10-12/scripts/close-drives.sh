#!/bin/bash
# close-drives.sh — WP11 review re-run: each drive on a FRESH in-memory server (port 3082, app code = kipindi-srv), the
# drives from kipindi-close (scripts with the review fixes). Logs in /tmp/claude-0/l3/drives/.
export PATH=/opt/node24/bin:$PATH
OUT=/tmp/claude-0/l3/drives; mkdir -p $OUT
PORT=3082; BASE=http://localhost:$PORT
stop() { if [ -n "$SRVPID" ]; then kill -TERM -- -$SRVPID 2>/dev/null; sleep 5; kill -KILL -- -$SRVPID 2>/dev/null; SRVPID=""; fi; }
start() {
  stop
  rm -rf /home/user/kipindi-srv/.next
  /tmp/claude-0/l3/serve.sh /home/user/kipindi-srv $PORT $OUT/server-$1.log & SRVPID=$!
  for i in $(seq 1 120); do curl -s -o /dev/null --max-time 5 $BASE/api/health && break; sleep 3; done
  curl -s -o /dev/null --max-time 300 $BASE/ ; curl -s -o /dev/null --max-time 300 $BASE/live
}
step() { local name=$1; shift; echo "== $name $(date +%T)" >> $OUT/STATUS; start $name; ( cd /home/user/kipindi-close && "$@" ) > $OUT/$name.log 2>&1; echo "   exit $? $(date +%T)" >> $OUT/STATUS; }
: > $OUT/STATUS
step journey-home env KP_BASE=$BASE node scripts/qa-journey-home.mjs $OUT/jh-tiles
step above-fold env KP_BASE=$BASE node scripts/qa-journey-above-fold.mjs
step above-fold-red env KP_BASE=$BASE node scripts/qa-journey-above-fold.mjs --prove-red
step cls-journey node scripts/cls-budget.mjs $BASE --journey
step cls-journey-red env RED_SHELL=1 node scripts/cls-budget.mjs $BASE --journey
step qa-live env BASE=$BASE node scripts/pre-deploy-live-check.mjs
step qa-live-nonlocal env BASE=http://127.0.0.2:$PORT node scripts/pre-deploy-live-check.mjs
step qa-live-nonlocal-optin env QA_SIGNED_IN=mobile01 BASE=http://127.0.0.2:$PORT node scripts/pre-deploy-live-check.mjs
stop
echo "DONE $(date +%T)" >> $OUT/STATUS
