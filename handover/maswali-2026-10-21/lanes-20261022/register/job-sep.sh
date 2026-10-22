#!/usr/bin/env bash
# job-sep.sh — S5-R2-REGISTER item 3 (+ item 2's measured check), TARGETED: one fresh in-memory next dev on :3580, the
# sunset scenario (a final week with its reserves band; How at the real floor), the week page at 360 (cards) and 1280
# (table) in en/sw/zh with no scroll tiles, then How's loading drawing caught on the way in. Not the acceptance re-shoot.
set -u
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad
cd C:/50pick-ssd/kipindi-mln-dreg || exit 2
echo "sep job at $(git rev-parse --short HEAD) (+ working tree) $(date -u +%T)"
WARM="/millionea /millionea/register /millionea/how" bash "$S/mln-server-run.sh" kipindi-mln-dreg 3580 "$F/register/sep${TAG:-}.log" \
  FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false MASWALI_REGISTER_SCENARIO=sunset \
  MASWALI_SHOTS_PAGES=${PAGES:-week-beforeFinal,how-ghost} MASWALI_SHOTS_LOCALES=${LOCALES:-en,sw,zh} MASWALI_SHOTS_WIDTHS=${WIDTHS:-360,1280} \
  MASWALI_SHOTS_SCROLL=0 -- node scripts/maswali-register-shots.mjs
echo "sep job: $(cat "$F/register/sep${TAG:-}.log.done" 2>/dev/null) $(date -u +%T)"
