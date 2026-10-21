# U43 hand-over toolbox — 2026-10-21 (RECORD, not rules)

U43 was resumed by the Claude session asheib-bb on OMEGA-COMPILE01 on 2026-10-21 (Ali: "from now on claude will proceed
only") and PAUSED by Ali the same day after the CI-repair release. **The state and the owed work are in
`docs/MOBILE-VISUAL-PLAN.md` §0 (⏸ U43) on `main`** — this branch only carries the tools used, so a later session does
not rebuild them. Every script names this session's scratchpad path in a `S=` / path constant: re-point it first.

| File | What it is |
|---|---|
| `u43-slot.sh` | Runs one heavy job in U43's slot range `F:/kipindi-locks/mln-slot-5..8` (Maswali 1–4, Phosphor 9–12); yields to `heavy-node.lock`, waits under 5 GB free RAM, reclaims a dead PID's slot. |
| `u43-server-run.sh` | Fresh in-memory `next dev` for a tree + port (round timer and healer OFF, as the state driver needs), warms U43 routes (never `/auth/demo`), runs a command with `BASE`, stops only its own process tree. Unlinks every junction inside `.next` before deleting it (AGENTS.md §10). |
| `u43-matrix.sh` | The full state matrix (7 widths × sw/en/zh × guest/player × every phase) in width groups `320,360` · `390,768` · `1024,1280` · `1920`, three trees in parallel at one committed sha. ⚠️ One run cannot photograph 14 cells inside betting's 30-second last call (R21, 2026-10-21: p6/p7 failed in all 14 cells); 2–4 cells per run pass (R22: 18 phases, 0 problems). |
| `U43-CRITIC-BRIEF.md` | The eight-lens critics brief (rulings, fixed points, what counts as a defect, scoring, output shape). |
| `U43-READING-LIST-PROD.md`, `U43-READING-LIST-STATES-R1.md` | The frame lists the R1 critics were given. |
| `U43-LANE-RULES.md` | The rules the three CI-repair helper lanes worked under (repair a guard, never weaken one). |
| `pin-compare.mjs` | Proves a line-pinned nine-line money write only MOVED (byte-identical body at the new line). |
| `one-plant.mjs` | Applies one declared house-bot anchor plant on disk, runs the reports memory child, restores byte for byte. |

Evidence frames are gitignored and stay on OMEGA under `C:\50pick-ssd\kipindi-udv\.qa-shots\u43\` (removed with that tree
at the session close); regenerate them with `npm run qa:u43-capture` (any BASE, read-only) and `qa:u43-states`.
