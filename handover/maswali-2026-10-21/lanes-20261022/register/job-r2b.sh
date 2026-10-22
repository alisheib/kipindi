#!/usr/bin/env bash
# job-r2b.sh — S5-R2-REGISTER: tsc, then (A) the shot script's SEP + How's band hop (sunset seed; week-beforeFinal and
# how-ghost at 320/360/768/1280 × en/sw/zh, no scroll tiles) and (B) qa:millionea-ghost-hops (every hop, fresh server).
# PROVE_RED=1 runs only the drive's --prove-red (after the commit). One slot, servers in order.
set -u
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad
cd C:/50pick-ssd/kipindi-mln-dreg || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
TAG=${TAG:-}
if [ "${PROVE_RED:-0}" = "1" ]; then
  echo "prove-red at $(git rev-parse --short HEAD) $(date -u +%T)"
  WARM="/millionea /millionea/register" bash "$S/mln-server-run.sh" kipindi-mln-dreg 3583 "$F/register/hops-red$TAG.log" \
    FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- node scripts/qa-millionea-ghost-hops.mjs --prove-red
  echo "prove-red: $(cat "$F/register/hops-red$TAG.log.done" 2>/dev/null) $(date -u +%T)"
  git status --short
  exit 0
fi
if [ "${TSC:-1}" = "1" ]; then
  echo "tsc at $(git rev-parse --short HEAD) (+ working tree) $(date -u +%T)"
  npx tsc --noEmit > "$F/register/tsc$TAG.log" 2>&1; echo "tsc rc=$? $(date -u +%T)" | tee -a "$F/register/tsc$TAG.log"
fi
if [ "${SHOTS:-1}" = "1" ]; then
  WARM="/millionea /millionea/register /millionea/how" bash "$S/mln-server-run.sh" kipindi-mln-dreg 3580 "$F/register/shots$TAG.log" \
    FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false MASWALI_REGISTER_SCENARIO=sunset \
    MASWALI_SHOTS_PAGES=${PAGES:-week-beforeFinal,how-ghost} MASWALI_SHOTS_LOCALES=en,sw,zh MASWALI_SHOTS_WIDTHS=${WIDTHS:-320,360,768,1280} \
    MASWALI_SHOTS_SCROLL=0 -- node scripts/maswali-register-shots.mjs
  echo "shots: $(cat "$F/register/shots$TAG.log.done" 2>/dev/null) $(date -u +%T)"
fi
if [ "${HOPS_RUN:-1}" = "1" ]; then
  WARM="/millionea /millionea/register /millionea/how /millionea/slip /millionea/tickets" bash "$S/mln-server-run.sh" kipindi-mln-dreg 3583 "$F/register/hops$TAG.log" \
    FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false HOPS=${HOPS:-} -- node scripts/qa-millionea-ghost-hops.mjs
  echo "hops: $(cat "$F/register/hops$TAG.log.done" 2>/dev/null) $(date -u +%T)"
fi
if [ "${REGBANDS:-1}" = "1" ]; then
  WARM="/millionea /millionea/register" bash "$S/mln-server-run.sh" kipindi-mln-dreg 3584 "$F/register/reg-bands$TAG.log" \
    FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- node "$F/register/reg-bands.mjs"
  echo "reg-bands: $(cat "$F/register/reg-bands$TAG.log.done" 2>/dev/null) $(date -u +%T)"
fi
git status --short
