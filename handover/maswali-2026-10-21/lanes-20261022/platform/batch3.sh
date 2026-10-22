#!/usr/bin/env bash
# PLATFORM r2 · batch 3 (one slot): perceived performance on a PRODUCTION build (`next build` + `next start`, where links
# prefetch their loading state). P1 builds and serves the journey + Millionea ACTIVE; P2 reuses the build for a classic
# guest (Millionea ACTIVE). Each: the ghost sequence (prefetched, and a slow network tapped at once); P2 also runs
# qa:route-entrance on production CSS.
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
R="$S/mln-server-run.sh"
T=kipindi-mln-fplt
MODE=start WARM="/ /markets /millionea /millionea/how /millionea/register" bash $R $T 3500 $F/b3-p1.log FEATURE_SIMPLEJOURNEY=ACTIVE FEATURE_MILLIONEA=ACTIVE -- node $F/ghost-seq-prod.mjs $F/ghost-prod journey
MODE=start BUILD=skip WARM="/ /markets /help /millionea /millionea/how /millionea/register" bash $R $T 3500 $F/b3-p2.log FEATURE_MILLIONEA=ACTIVE -- bash $F/b3-p2-job.sh
cd C:/50pick-ssd/kipindi-mln-fplt && git status --short > $F/b3-status.txt
echo "BATCH 3 DONE"
