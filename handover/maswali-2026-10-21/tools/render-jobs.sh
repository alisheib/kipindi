#!/usr/bin/env bash
# render-jobs.sh <tree> <port> <tag> [dark|player|slip|console|servers ...]
# S5's render jobs, each on ONE fresh in-memory `next dev` in <tree>, one after another; each takes a Maswali slot.
# Logs: $S/lead/render-<tag>-<job>*.log (+ the per-step .txt files the job scripts write beside them).
#   dark    — production's configuration (no FEATURE_MILLIONEA = WITHDRAWN): qa:live, the player drive's step W, and
#             the five server-bound test:all members (revoked-deadend, motion, admin-section-gate, needle-rest).
#   player  — FEATURE_MILLIONEA=ACTIVE: the player drive, then the player shots (every page to its end, 6 widths × 3 langs).
#   slip    — FEATURE_MILLIONEA=ACTIVE: the multi-ticket slip drive (MB-89).
#   console — FEATURE_MILLIONEA=ACTIVE, the Millionea tick and the lifecycle ticker off: the admin shots and admin drive.
#   servers — FEATURE_MILLIONEA=ACTIVE: the same five server-bound members as dark, under the ACTIVE rollout.
set -u
TREE="$1"; PORT="$2"; TAG="$3"; shift 3
JOBS="${*:-dark player slip console servers}"
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
L="$S/lead"
run() { # <job> <env...> -- <script>
  local job="$1"; shift
  bash "$S/mln-slot.sh" "s5-render-$job" bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$L/render-$TAG-$job.log" "$@"
  local rc=$?
  echo "$(date -u +%T) job $job rc=$rc :: $(grep -E 'rc=' "$L/render-$TAG-$job.log" | tr '\n' ' ' | cut -c1-400)"
}
for j in $JOBS; do
  case "$j" in
    dark)    run dark -- bash "$L/job-dark.sh" ;;
    player)  run player FEATURE_MILLIONEA=ACTIVE -- bash "$L/job-player.sh" ;;
    slip)    run slip FEATURE_MILLIONEA=ACTIVE -- bash "$L/job-slip.sh" ;;
    console) WARM="/ /admin /admin/maswali /admin/maswali/new /admin/maswali/pools /admin/maswali/integrity" \
             run console FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false -- bash "$L/job-console.sh" ;;
    servers) run servers FEATURE_MILLIONEA=ACTIVE -- bash "$L/job-servers.sh" ;;
  esac
done
