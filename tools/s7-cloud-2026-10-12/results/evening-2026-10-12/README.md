# The cloud session's evening, 2026-10-12 (~22:00 EAT on): S7's close, the live fixes L3 and L2, S8's drafts

Records for VODACOM-PLAN §0j (S7's close) and §0h points 80 and 81 (L3, L2). Everything here was run on the cloud VM
(claude.ai/code, Linux) with Node 24 (`/opt/node24/bin` first on PATH — the image's Node 22 fails in-memory suites that
patch a store method, falsely).

| folder | what it holds |
|---|---|
| `prod-readback/` | Production read back after `6da7f936` (= `f20f1617`'s code), READ-ONLY, no QA_SIGNED_IN. `SUMMARY` is the first try, without `NODE_USE_ENV_PROXY=1`: Node's fetch reached nothing, so its reds are the VM, not production. `SUMMARY2` is the re-run through the session proxy: `qa:chunks-prod --origin https://50pick.tz` PASS; `qa:live` exits 1 only on its dead-link lines (`-> 0`: Playwright's request client ignores the proxy) — `links.txt` is the same paths read with curl through the proxy, every one under 400. [E3] is NOT MEASURED (no password on the VM). `cls-classic.log`: classic qa:cls-budget on production, green. |
| `l3-gates/` | Live fix L3 (`origin/live-fix-l3r`, through `4e7504f5`): the gates at its tip, Node 24. `test:orphans` 1 is main's known red. |
| `l2-gates/` | Live fix L2 (`origin/live-fix-l2r`, through `9c254bec`): the money gates in memory at its tip. Its three Postgres lines failed because the scratch Postgres had died — re-run in `l2-postgres/`. |
| `l2-postgres/` | L2 on a scratch Postgres 16 (Node 24): `test:bet-landed-key` against Postgres, `e2e:money`, `e2e:fault` (its DB carries the disposable-target row) — all 0. |
| `s8-drafts/` | Drafts for S8 WP0: `s8-a24-draft.md` (S8-PLAN Amendment A24) and `s8-wp0-0k-draft.md` (VODACOM-PLAN §0k and §0h point 82). Placeholders in braces (`{BASE}`, `{S7_CLOSE}`, `{L3}`, `{L2}`, `{REDS}`, `{DATE}`, `{DELTA}`) are filled at WP0. |
| `scripts/` | The VM's chains: `serve.sh` (a fresh in-memory dev server, its secrets generated per run and never printed), `close-drives.sh` (S7's drives re-run after WP11's review), `prod-readback*.sh`, `l2-pg24.sh`, `l2-gates.sh`, `l3-gates*.sh`; `measure-l3.mjs` (L3's before/after drive), `peek-updown.mjs`, `hyd-results.mjs` (tries to reproduce the hydration mismatch on journey `/results`). |
| `drives/` | S7's drives re-run on a fresh server per drive (kipindi-close's scripts with WP11's review fixes): logs only (the 101 tiles are not committed). |
