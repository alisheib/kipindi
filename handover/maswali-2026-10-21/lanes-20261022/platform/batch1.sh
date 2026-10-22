#!/usr/bin/env bash
# PLATFORM r2 · server batch 1 (one slot; five fresh in-memory dev servers in turn on :3500, each stopped after its job).
#   R1 default env (Millionea WITHDRAWN, the journey at its shipped level → a guest is classic): qa:route-entrance (D10 + 2.1/2′)
#   R2 the journey ACTIVE, Millionea withdrawn (FOUR tabs): qa:journey-rail-gaps
#   R3 the journey + Millionea ACTIVE (FIVE tabs): qa:journey-rail-gaps; the ghost sequence (journey shell)
#   R4 Millionea ACTIVE (classic shell): qa:millionea-break-nav (D13); the ghost sequence (classic shell)
#   R5 Millionea ACTIVE, scheduler and ticker off: qa:chat-yield guard + --prove-red (D15)
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
R="$S/mln-server-run.sh"
T=kipindi-mln-fplt
WARM="/ /markets /help" bash $R $T 3500 $F/b1-r1.log -- node scripts/qa-route-entrance.mjs
WARM="/ /markets" bash $R $T 3500 $F/b1-r2.log FEATURE_SIMPLEJOURNEY=ACTIVE -- node scripts/qa-journey-rail-gaps.mjs $F/r2-rail4
WARM="/ /markets /millionea /millionea/how" bash $R $T 3500 $F/b1-r3.log FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- bash $F/b1-r3-job.sh
WARM="/ /markets /millionea /millionea/how /millionea/tickets /profile/responsible-gambling /auth/login" bash $R $T 3500 $F/b1-r4.log FEATURE_MILLIONEA=ACTIVE -- bash $F/b1-r4-job.sh
WARM="/ /wallet /millionea/register" bash $R $T 3500 $F/b1-r5.log FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- bash $F/b1-r5-job.sh
cd C:/50pick-ssd/kipindi-mln-fplt && git status --short > $F/b1-status.txt
echo "BATCH 1 DONE"
