#!/usr/bin/env bash
# PLATFORM r2 · server batch 1b: R3–R5 of batch 1 again. Batch 1 refused them because the lane's own light sweep was
# running node processes from the tree (mln-procs.ps1 counts every node process naming the tree). Nothing else runs now.
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
R="$S/mln-server-run.sh"
T=kipindi-mln-fplt
WARM="/ /markets /millionea /millionea/how" bash $R $T 3500 $F/b1-r3.log FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- bash $F/b1-r3-job.sh
WARM="/ /markets /millionea /millionea/how /millionea/tickets /profile/responsible-gambling /auth/login" bash $R $T 3500 $F/b1-r4.log FEATURE_MILLIONEA=ACTIVE -- bash $F/b1-r4-job.sh
WARM="/ /wallet /millionea/register" bash $R $T 3500 $F/b1-r5.log FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- bash $F/b1-r5-job.sh
cd C:/50pick-ssd/kipindi-mln-fplt && git status --short > $F/b1b-status.txt
echo "BATCH 1B DONE"
