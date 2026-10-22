#!/usr/bin/env bash
# job-empty-shots.sh (lane TICKETS, S5-R2 LEFT item 3): the targeted list-empty-* shots — Tiketi zangu with no ticket
# (`empty`: the week on sale in the body) and on a break (`empty-break`: the title alone), classic and journey shells,
# 320 · 360 · 1280 × sw · en · zh — on ONE fresh in-memory `next dev` (port 3570), with the body's numeral faces read
# from the computed style. Run inside the slot helper. Waits first until no node process of this tree runs (the server
# runner refuses beside one, and its stop takes every node process naming the tree).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/tickets"
RUN=${1:?run name}
cd C:/50pick-ssd/kipindi-mln-dtkt || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
for i in $(seq 1 120); do
  n=$(powershell -NoProfile -ExecutionPolicy Bypass -File "$S/mln-procs.ps1" -Tree kipindi-mln-dtkt -Port 3570 | tr -dc "0-9")
  [ "${n:-0}" = "0" ] && break
  sleep 5
done
rm -rf "$F/$RUN"; mkdir -p "$F/$RUN"
WARM="/ /millionea /millionea/tickets" bash "$S/mln-server-run.sh" kipindi-mln-dtkt 3570 "$F/$RUN.log" \
  FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false \
  MLN_OUT="$F/$RUN" MLN_STATES=none MLN_LISTS=empty,empty-break MLN_SEALS=0 MLN_WIDTHS=320,360,1280 MLN_LOCALES=sw,en,zh \
  -- node scripts/maswali-ticket-shots.mjs
echo "job exit=$?"
