#!/usr/bin/env bash
# job-r2.sh — S5-R2-SLIP's LEFT item 4 on ONE fresh in-memory server (BASE set by mln-server-run.sh): the way-back guard
# with its plant (Chromium + WebKit), the multi-slip drive (ruling (a) measured at 320/360 in en and sw), then the
# targeted proof (View ticket's band; the cancel's one dim). Each step logs to $F/slip/logs/r2/.
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/slip
L=$F/logs/r2b
mkdir -p $L
cd C:/50pick-ssd/kipindi-mln-dslp || exit 3
echo "[r2b] head $(git rev-parse --short HEAD) · drive $(date -u +%T)"
node scripts/maswali-multi-slip-drive.mjs > $L/drive.log 2>&1; echo "drive exit=$?" >> $L/drive.log
echo "[r2] proof $(date -u +%T)"
node $F/r2-proof.mjs > $L/proof.log 2>&1; rc=$?; echo "proof exit=$rc" >> $L/proof.log
echo "[r2] done $(date -u +%T)"
exit $rc
