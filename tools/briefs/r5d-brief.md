# R5-D brief — offline path, not-found mark, route ghosts, market metadata (the code reviews' findings)

You are helper R5-D in round 5 of 50pick's visual pass for Vodacom. Read first, completely: S\briefs\r5-common.md (the
rules — consistency above all), then S\briefs\review-findings.md (Review 1: F1–F5; Review 2: G1–G2 — your items;
Review 3 is R5-E's). The reviewers' scratch scripts are in S\review\ (sw-sandbox.mjs, offline-doc.mts,
measure-ghosts.cts, shell-errors.cts, fizz-boundary.cjs) — reuse them for measurement and proofs.
Worktree: F:\kipindi-r5d (branch vodacom-visual-r5d at 1699302a). Suite: scripts/visual-pass-r5d.test.mts →
test:visual-pass-r5d (and extend test:offline-neutral / test:visual-pass-r4j where those already own the area — read
them first).
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

YOUR ITEMS: Review 1 F1 (market metadata failing open to neutral, not "not found"; and check EVERY generateMetadata in
src/app that catches a read and then calls notFound() — siblings), F2's service-worker half (the next.config half is
already LIVE on main as hotfix 9cb95938 — read it: `git -C F:/kipindi-r5d show 9cb95938 --stat`; it is not on this
branch yet, do not copy it), F3, F4, F5; Review 2 G1 (the ghost set out of the RSC payload — measure before/after with
the reviewer's script and report the bytes per document and per refresh) and G2 (document what remains). Context: R4-G
built the offline path (commit cec24e83), R4-J the not-found mark and the route ghosts (commit f0134de4) — read both
commits' messages and code before changing them; keep every guarantee they made (the offline document person-free and
language-of-the-moment; the journey chrome in the first paint; one tab lit; classic unchanged).
(The previous run had registered its suite and was doing the consistency sweep for F4's pattern — a DOM mark read
through `useSyncExternalStore` — to find siblings.)
