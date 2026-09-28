# The four-expert frame panels (landing v3)

Workflow scripts (the Claude Code **Workflow** tool) that score a unit's REAL rendered frames 1–10, one agent per
reviewer — UI/UX lead, graphic designer, gambling-industry designer, accessibility/RG — each agent READING every PNG.
A frame's score is its lowest; every frame must reach 10 before the unit ships (Ali's R5 standard, applied to every
landing v3 unit). The agents run no Node: they read frames, the drive's report JSON and the code.

- `band-panel.js` — the Up & Down band (WP12). Args: `{ repo, framesDir, report, contrast, round, prior, note,
  frames: ["S1-360-sw.png", …] }`. `panel-args.mjs <label> [round] [priorFile]` builds the frame list from a
  `verify-band.sh` output folder.
- `hero-panel.js` — the hero v3. Args: `{ repo, dir, reports, served, gate, round, prior,
  frames: ["visitor/build-360-sw-t00.png", …] }` from a `verify-hero.sh` output folder.

How a round works (it took the band five rounds, 6/10 → 45 of 52 frames at 10):
1. Drive the unit locally (`verify-*.sh` under the heavy-node lock) — frames land in `.qa-shots/landing-v3/<label>/`.
2. Run the panel on those frames (`Workflow({ scriptPath, args })`). Paths in the args are this machine's; `repo` is
   the checkout the agents read the spec, manifest and code from.
3. Fix every concrete finding, or DECLINE it with its recorded reason (a spec decision or an owner ruling is final),
   and write both into a brief (`prior`) — "what changed, what was declined and why" — for the next round.
4. Re-drive, re-run the WHOLE panel on the new frames; repeat until every frame is 10.
The band's rounds and declines are recorded in `docs/LANDING-TEN.md` §2.1 WP12 "Frame rating", and the decisions the
build took in `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` ("R8 applied — WP12").
