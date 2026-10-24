#!/usr/bin/env bash
# FEE-TAX R1 — the first-load check alone, on a build tied to the commit (kp-head), as CI does it.
. "$CI_RUN/lib.sh"
step build npm run build
[ -d .next ] && git rev-parse HEAD > .next/kp-head
step first-load npm run qa:first-load -- --read --routes 'index,markets,positions,help,live,results,watchlist,markets/[id],account,updown/history'
finish
