# The S6 visual pass's working tools (from OMEGA-COMPILE01's session scratchpad, 2026-10-09)

Pushed so nothing of the Vodacom lane stays on one machine (Ali, 2026-10-09). This branch holds ONLY these tools — it is
not the product. The product is `origin/vodacom-visual`; the state and the plan are in main's
`docs/design-system/v5-2026-09-29-simplified-journey/S6-VISUAL-PASS-STATE.md`.

`tools/` mirrors the scratchpad (on OMEGA: `C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-…\scratchpad`,
written `S` in every brief and script). Scripts that name that path must have it changed on another machine.

- Lock-turn chains: `wm16a-chain.sh`…`wm16d-chain.sh` (the final proof), `wrt-chain.sh` (the route-entrance probe),
  `wh3-chain.sh`/`wh3b-chain.sh` (the proxy hotfix's proof), with `kp-lock.sh` (the shared heavy-job lock and its queue
  — `ME` is this session's lock name, `asheib-c5`), `chain-lib.sh`, `kp-with-server.sh` (an in-memory dev server per
  command), `kp-procs.ps1`, `watch-deploy.sh`.
- Merging helpers: `merge-check.sh` (every suite reading a staged file, the helper's lists, the red twins, then
  mutation proofs), `reds-for.cjs`, `reds-final.cjs`, `resolve-*.cjs` (each merge's conflict resolution).
- Briefs: `briefs/` (`r5-common.md` is the rules every helper follows; `review-r6-brief.md` the reviewers').
- Notes: `visual/triage-r4.md`, `visual/triage-r5.md` (every finding by tile), `visual/owner-items.md` (the questions
  for Ali; `owner-plain.md` the plain version), `visual/msg-*.txt` (each commit's message).
- Proofs: each round's mutation script (`r5a/mutate-r5a-vis.mjs`, `r5b/mutate-vis.cjs`, `r5c/mutate-vis.cjs`,
  `r5d/mutation-r5d-vis.mjs`, `r5e/mutation-r5e.mjs`, `r5h/mutation-r5h-vis.mjs`, `r5i/mutate-vis.cjs`) and suite lists;
  the edge drive `edges/qa-journey-edges.mjs` with `r4j/r4j-verdict.mjs`; `r5h/probe-route-blink.mjs` and
  `r5h/route-transition.r5h.patch`; `r5h/probe-refresh-bytes.mjs`.
- Not here: the round tiles (PNG, ~400 MB — the drives regenerate them), logs, big JSON captures, repo snapshots.

- Added 2026-10-10 ~00:20 EAT (the R5-L and R6 merges): `merge-check-range.sh` (as `merge-check.sh`, the suites chosen from
  `git diff $BASE HEAD` for merges already committed), every round's proof as a `*-vis.*` script (ROOT `F:/kipindi-vis`) and a `*-wip.*` copy
  (ROOT `F:/kipindi-wip`, an identical checkout so the proofs run beside the suites), `reaim-*.cjs` (each plant moved to
  the code a later round changed, with the reason), `fix-*.cjs` and `r5l/fix-r5l-census.cjs` (the merges' re-pins and
  ghost fixes), `runs/merge-r5l*.txt`, `runs/merge-r6*.txt`, `runs/wip-proofs-r6*.log` (the merged-tree results).
