# S8 WP0 step 3 — S8-PLAN's citations re-read at origin/main 6da7f936 (helper A, session_01SrWuXa3LR3Rew6zEyHBXzJ, 2026-10-12)

The full per-citation table stayed on the helper's VM (/tmp/s8-citations-6da7f936.md); this is its reported summary, verbatim in substance.

**Totals: 729 citations — 459 unchanged · 256 moved · 14 changed · 0 gone.**
- Method: each citation read at the base the plan names (2322cf09 by default; the WP5/WP6 branch where the plan names it and the file differs there; e5b5c9da for docs cited inside the Amendments) and mapped to 6da7f936 with `git diff -U0`, line by line.
- Moved: 175 of the 256 are in VODACOM-PLAN.md (shifted about +247 to +338 lines); the rest small offsets in `[id]/page.tsx`, CLAUDE.md, S4-COPY-AUDIT.md, globals.css and app-shell.tsx.
- `nothingIfLost` moved out of `shell-lazy.tsx:57-79` into `lost-chunk.ts:38-60` with the same body (counted as moved).
- Nothing gone: every cited file exists; `market-service.ts` byte-identical (every refusal-matrix line stands); `i18n-dict.ts` differs only by e5b5c9da's three `failLossLimitDaily` lines.
- Changed (14): VODACOM-PLAN §0j (now :500-866, S7's close record); §3.2 (now :3785-3842: S7 WP9's note — the /markets 307 comes from AppShell, more query parameters kept); `PLATFORM_MIN_STAKE` now 500 at `payout.ts:173` (was 1,000 at :166; de44e087, the owner's ruling of 2026-10-12); the S4-COPY-AUDIT `failLossLimitDaily` line and note and the loss-limit words A5 quotes (already recorded by A1 and A5); A1 item 3's conversion table from e5b5c9da no longer holds.
- Caveat: bare `:N` numbers attributed by rule and by hand; a small number could be credited to the wrong file.

## What changes a package (candidate A24)
1. WP0: S7 was not closed at 6da7f936 (WP11, WP12 open) — wait (Open point 1) or take its overrule; re-base every number at S8's real base; retire A1 item 3's table.
2. WP2: the minimum stake is 500 — chips `quickStakes(500, max)` = 500 · 1,000 · 2,500 · 5,000; the preset at open 500; goldens at 500; `min` read per market (a per-market override or an un-reconciled stored value may still say 1,000).
3. The low-balance table, A1's `belowDepositMin` correction, WP6/WP11: at the 500 preset a zero balance is short by 500, below the 1,000 deposit minimum, so it falls under `belowDepositMin`; re-cut the rows-to-boards mapping (s4-5-low-zero vs s4-5-low-min500), the frames and the drive premises; the loss-room threshold is now 500.
4. WP6/WP11: the chip row differs from the deck's 1,000-based ladder — re-measure at 320 and 360; a §0h point.
5. WP7 (Onyesha zaidi, `show-more.tsx`): the plan never mentions it — the home and journey /live page by a soft navigation to `?page=N`; the `?bet=` push and the "address without bet" replace keep `cat`, `q`, `page` and `from`; cards added by "show more" must still be intercepted (a drive cell).
6. WP10: the IntersectionObserver must pick up cards that arrive after a soft navigation.
7. WP7/WP9 gates: name test:journey-home §9 (S7 pins the journey card on /live, /watchlist and the similar rail there) beside §3, §4 and §7.
8. WP7/WP8: the Up & Down row on journey /live links to /updown/<roundId> but its picks point at /markets/<id>?side= — WP7's "leaves the click alone" and WP8's Up & Down translation must cover it.
