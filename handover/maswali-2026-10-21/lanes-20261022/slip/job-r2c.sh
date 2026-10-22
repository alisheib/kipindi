#!/usr/bin/env bash
# job-r2c.sh — the order that failed in run 1: qa:dialog-way-back (it leaves the demo player holding one ticket per engine)
# THEN the multi-slip drive, whose own premise now cancels them first. Logs to $F/slip/logs/r2c/.
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/slip
L=$F/logs/r2c
mkdir -p $L
cd C:/50pick-ssd/kipindi-mln-dslp || exit 3
echo "[r2c] head $(git rev-parse --short HEAD) · way-back $(date -u +%T)"
node scripts/dialog-way-back-drive.mjs > $L/wayback.log 2>&1; echo "wayback exit=$?" >> $L/wayback.log
echo "[r2c] drive $(date -u +%T)"
node scripts/maswali-multi-slip-drive.mjs > $L/drive.log 2>&1; rc=$?; echo "drive exit=$rc" >> $L/drive.log
echo "[r2c] done $(date -u +%T)"

echo "[r2c] proof $(date -u +%T)"
mv $F/frames $F/frames-run2 2>/dev/null
node $F/r2-proof.mjs > $L/proof.log 2>&1; prc=$?; echo "proof exit=$prc" >> $L/proof.log
echo "[r2c] done $(date -u +%T)"
[ $rc -eq 0 ] && exit $prc || exit $rc
