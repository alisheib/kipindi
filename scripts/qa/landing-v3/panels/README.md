# The four-expert frame panels (landing v3)

The unsupported Claude Workflow DSL has moved to [historical panel rubrics](../../../../docs/qa/landing-v3-panels-history.md).
That document preserves both original sources, the four review disciplines, the real-frame procedure and immutable
Git recovery instructions. The old `.js` files were not Node programs and had no current runnable caller; they are
removed from `scripts/`. No package task or allowlist entry pretends to execute them.

`panel-args.mjs <label> [round] [priorFile]` still builds a frame list from a `verify-band.sh` output folder.
The captures and measurements can support an actual review using the archived rubrics, subject to current design
authority. The archive is history and review guidance, not evidence that any current panel ran.

The historical process (the band took five rounds, 6/10 → 45 of 52 frames at 10):
1. Drive the unit locally (`verify-*.sh` under the heavy-node lock) — frames land in `.qa-shots/landing-v3/<label>/`.
2. Have each reviewer read those real frames, the current applicable spec and the measurements; keep the results
   attached to the exact build and captures. The historical Workflow host is no longer a runnable tool here.
3. Fix every concrete finding, or DECLINE it with its recorded reason (a spec decision or an owner ruling is final),
   and write both into a brief (`prior`) — "what changed, what was declined and why" — for the next round.
4. Re-drive and review the WHOLE new frame set; repeat until every concrete finding is resolved or declined with authority.
The band's rounds and declines are recorded in `docs/LANDING-TEN.md` §2.1 WP12 "Frame rating", and the decisions the
build took in `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` ("R8 applied — WP12").
