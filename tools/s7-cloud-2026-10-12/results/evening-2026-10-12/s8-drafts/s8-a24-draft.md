### A24 · The base moved: S7 closed, the TZS 500 minimum, the two classic gaps fixed live, and Ali's answers (2026-10-12)

*Overrides:* A1's base and every number read at it; WP2 (the chips, the preset, the goldens); the low-balance table and
A1's `belowDepositMin` correction; WP6 and WP11 (the frames, the drive premises, the chip row); WP7 (Onyesha zaidi, the
address); WP10 (the observer); the WP7 and WP9 gates; WP7 and WP8 (the Up & Down row); A6 items 2, 4 and 6; A23; WP11a
step 5 cell (b); Open point 43; and the Points for Ali, item by item below.

Re-read 2026-10-12 (S8 WP0 step 3, helper A on its own VM, read-only): 729 citations at origin/main `6da7f936` — 459
unchanged, 256 moved, 14 changed, 0 gone (`origin/vodacom-visual-tools`
`tools/s7-cloud-2026-10-12/results/s8-citations-6da7f936-summary.md`); then the files S7's close and the live fixes L3 and
L2 changed, re-read at S8's base `{BASE}` ({DELTA}). The changes that alter what a package does:

1. **The base.** S7 closed and went live at `{S7_CLOSE}` (§0j); L3 (`{L3}`) and L2 (`{L2}`) went live after it (§0h points
   80 and 81). S8 branches from origin/main at `{BASE}`, and every number in this file is read there. A1 item 3's
   conversion table held for `e5b5c9da` only and is retired.
2. **The minimum stake is TZS 500** (`de44e087`, the owner's ruling of 2026-10-12; `PLATFORM_MIN_STAKE`, payout.ts:173),
   and Ali answered "start at 500" on 2026-10-12. The sheet's chips are `quickStakes(500, max)` = 500 · 1,000 · 2,500 ·
   5,000 and the preset at open is 500; the goldens are cut at 500; the minimum is read per market, since a market's
   override or an unreconciled stored value may still say 1,000. The deposit minimum stays TZS 1,000.
3. **Low balance at the 500 preset.** A zero balance is short by 500, below the 1,000 deposit minimum, so it falls under
   `belowDepositMin`. The rows-to-boards mapping (s4-5-low-zero against s4-5-low-min500), the frames and the drive
   premises are re-cut on that, and the loss room's threshold is 500.
4. **The chip row** differs from the deck's 1,000-based ladder: it is re-measured at 320 and 360, with a §0h point.
5. **WP7 and "Onyesha zaidi"** (`show-more.tsx`, §0h point 78). The home and journey `/live` page by a soft navigation to
   `?page=N`. The `?bet=` push and the address-without-bet replace keep `cat`, `q`, `page` and `from`, and the cards
   "Onyesha zaidi" draws are intercepted too (a drive cell).
6. **WP10's IntersectionObserver** picks up the cards that arrive after a soft navigation.
7. **The WP7 and WP9 gates** name `test:journey-home` §9 (S7's pins of the journey card on `/live`, `/watchlist` and the
   similar rail) beside §3, §4 and §7.
8. **The Up & Down row** on journey `/live` links to `/updown/<roundId>` while its picks point at `/markets/<id>?side=`:
   WP7's "leaves the click alone" and WP8's Up & Down translation cover it.
9. **The two classic gaps are fixed live, for every player** (Ali's answer to point 22: "fix now"; A23 item 3's overrule
   taken):
   - **L3** (§0h point 80): in Next 16 an action's redirect REJECTS the call, and the dial, the sell button and the quick
     bet each showed it as a failure (measured: "Could not place", "Couldn't cash out"/"CASH-OUT FAILED", "Bet not
     placed"). Each catch now asks `isActionRedirect` (`src/lib/action-redirect.ts`) first. So A6 item 6's measurement
     is done; A6 item 4's annotation of §3.3 is done; and the sheet's host uses `isActionRedirect`, not a digest test of
     its own (A6 item 2).
   - **L2** (§0h point 81): `buyPosition` answers any refusal of a keyed request (but BUSY) with the bet that key already
     placed for that player (`landedKeyAnswer`). WP11a step 5 cell (b) — the answer dropped, the key reads held,
     maintenance on, a retry, `failSystemError` — no longer happens for a key that landed: the retry is answered with
     the receipt. The cell is re-cut: hold the FIRST request in flight (its key not committed) while maintenance comes
     on, then retry → the refusal arrives with the doubt open → `failSystemError`, the key kept; release the first →
     `replayed`, one position, one BET_PLACED row. And a new cell: a landed key retried under maintenance → the receipt,
     no doubt frame. The sheet's doubt state (A2, A3, A7) stands for the key still in flight, which L2 cannot see.
   - Open point 43 is closed by both.
10. **Ali's answers to the Points for Ali, amended (2026-10-12):** 17 (Tiketi zangu opens that ticket), 18 (the ✕ beside
    the chosen side), 19 (the two big buttons in the right-hand column from 1024), 20 (our nearest standard sizes) and 21
    ("bet what you have" after 30 minutes) — each as written, no overrule; 22 — the overrule, done as L3 and L2 (item 9);
    and the start amount, asked on its own: 500 (item 2).

*From:* S8 WP0 steps 1 and 3; Ali's answers of 2026-10-12.
