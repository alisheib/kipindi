# R5-H brief — the loading ghosts out of every refresh, and the journey flag before the first paint (follow-up)

You are helper R5-H in the follow-up round of 50pick's visual pass for Vodacom. Read first, completely:
S\briefs\r5-common.md (the rules — CONSISTENCY above all; where it says "1699302a" read the tip named below), then
S\briefs\review-findings.md (Review 2: G1–G2 — R5-D's items, whose technique you extend), and R5-D's commit message
(`git log --format=%B --grep "R5-D" -1` in your worktree) and its scratch scripts in S\r5d\ (measure-ghosts-before.cts,
measure-ghosts-after.cts, per-page.cjs, extract-ghosts.cjs — reuse them for the before/after bytes).
Worktree: F:\kipindi-r5h (branch vodacom-visual-r5h at vodacom-visual's tip 95ff793b: R5-F, R5-D, R5-B and R5-C merged; R5-A and R5-E are still finishing in
F:\kipindi-r5a / F:\kipindi-r5e and merge later — read their diffs there if you touch a file they touch, never edit
them). Working at the same time: R5-A (the dialogs' ✕), R5-E (text wrapping, keep-words), R5-G (names, counts, the
regulator's name — starts after R5-A merges), R5-H (loading ghosts, the journey flag), R5-I (state inks).
Suite: scripts/visual-pass-r5h.test.mts → test:visual-pass-r5h (and extend test:visual-pass-r5d / test:visual-pass-r4j
where those already own the area — read them first).
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

YOUR ITEMS
G-2 The segment loading skeletons still ride every refresh of their pages. R5-D measured, per refresh: wallet/receipts
    9,466 B, results 8,217, wallet 6,698, positions 5,125, markets 4,721, live 3,551, markets/[id] 2,963,
    updown/[roundId] 1,614 (every 5 s while a round awaits its result). Apply R5-D's G1 technique to every segment
    `loading.tsx` a player can reach: the drawing lives in a client module the browser already has, and the server
    passes only what the browser cannot know — so a refresh carries a reference, not a drawn tree. Keep every guarantee
    R4-J and R5-D made: the ghost's words and boxes land where the page's do (same components, same props), the first
    document paint is unchanged (server-rendered), one tab lit, the journey's chrome in the first paint, classic
    unchanged (its ghosts may change transport, not pixels). Measure before/after per page (document and per refresh),
    and prove the drawn markup is byte-identical before/after for each ghost (render both with react-dom/server).
    Sweep: every `loading.tsx` under src/app (player and admin — say which you leave and why).
G-2b The /wallet ghost draws no filter bar at all (pre-existing, named by R5-B), so the page's bar appears from nothing
    when the data lands: draw it as /wallet/receipts' ghost does (R5-B's `data-rail-ghost` and the shared bar constants,
    QUERY_BAR_ROW1_WRAP_CLASS). Check every other ghost for a missing or extra band the same way (a ghost/page pair whose
    vertical rhythm differs is the defect class) and list each pair with its measured rows.
G-3 `components/journey/journey-flag.tsx` raises `data-journey` in a passive effect, so a `router.refresh()` that flips
    the journey on paints one frame of the old answer (R5-D). Decide the right phases for BOTH directions (raise before
    the journey shell's first paint; lower before the classic shell's first paint — or say why a direction must stay
    passive), considering that the flag is mounted lazily (`next/dynamic` in layout/shell-lazy.tsx, WP6c) and that
    readers subscribe through `useJourneyOn` (`lib/journey/journey-on.ts`, a `useSyncExternalStore` store). Find the
    siblings: every DOM mark raised/lowered in an effect that a first paint depends on (R5-D swept `useSyncExternalStore`
    readers for F4 — start from its list in test:visual-pass-r5d's READERS).

PROOF as r5-common.md says (suite, controls/plants, mutation proof under S\r5h\, every suite that reads a touched file).
Name the files that need tsc and exactly what a lock turn must re-tile or re-measure (a dev-server byte measurement of
the refresh payloads is a lock-turn task — write the probe script and say how to run it).
