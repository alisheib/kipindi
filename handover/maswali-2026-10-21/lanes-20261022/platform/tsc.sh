#!/usr/bin/env bash
# tsc on the platform tree; writes the log path given in $1
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
cd C:/50pick-ssd/kipindi-mln-fplt || exit 2
echo "tsc at $(git rev-parse --short HEAD) start $(date -u +%T)Z"
npx tsc --noEmit
rc=$?
echo "tsc exit=$rc at $(date -u +%T)Z"
exit $rc
