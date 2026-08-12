# DISCOVERY-RATIONALE.md

## The model

One sticky bar, two rows. Row 1 carries **status** and **sort**; row 2 carries **odds**, **pool**
and **topic**. The left rail is deleted.

## The three questions

**What can I get into?** The status segmented control, defaulting to **Open**. This is the whole fix
for B3 — closed markets leave the default view not by being hidden but by `Open` being the selected
state of a visible control, so a user can see that a choice was made on their behalf and undo it in
one tap. `All` is right there, with its own count.

**What's about to close?** Two controls answer this, and they answer it differently on purpose.
`Closing today` is a filter — a hard cut. `Closing soonest` is the **default sort**, so the board
is ordered by urgency before anyone touches anything. The landing grid states the same order in its
heading (*Closing soonest / Pick a side now*), so the two surfaces agree.

**Where is the money?** `POOL: TZS 10k+ / 50k+` as a filter, `Biggest pool` as a sort, and the
board header printing `TZS 1,669,000 in play` at 44px instead of 11px in a corner. The spread on
this page runs from TZS 500 to TZS 172,505 (B4); that is the single biggest practical difference
between two cards and it now has three separate handles.

**Odds** is the fourth control and the one a serious predictor reaches for first: `Close call ·
40–60%`, `Contested · 25–75%`, `Longshots · under 15%`.

## What I did not include

**A dual-thumb odds slider.** It is the obvious answer to B2 and it is wrong here. Two 44px thumbs
on a 358px-wide track is a bad target on a mid-range Android, it produces unshareable states like
"31–68%", and it demands a number from someone who is really asking a categorical question. Three
named ranges answer the same need, fit a chip, survive translation and can be typed into a URL.
If analytics later show people wanting 31–68%, add the slider as a desktop refinement of the
`Contested` chip rather than as the primary control.

**Multi-select topics.** Topic is single-select. Multi-select doubles the state space, makes the
result count harder to predict, and the honest use case — "sport or crypto" — is better served by
`All` plus a good sort.

**Pagination.** Nine results do not need a pager, and `Load more` is cheaper on a slow connection
than a page fetch. The desktop file shows no pager because the filtered set does not warrant one.

**Saved filters and alerts.** Real value, wrong round. They need an account, a notification
surface and a regulatory look at push messaging on a licensed gambling product.

**A "coming soon" banner.** `Propose Markets & Get Paid` is removed from `/markets` (B7) and keeps
its footer link. The largest element above the fold should not be a feature that does not exist.

## At 390

Sort and status stay in the bar at every width — they answer the first two questions and must never
cost a tap. Status becomes a horizontally scrolling chip rail; sort takes the remaining width beside
a `Filters (2)` button. Odds, pool and topic move into a bottom sheet, because fifteen controls do
not fit 390px honestly. The sheet is designed rather than defaulted: bottom-docked,
`--shadow-overlay-up`, a grab bar, and a sticky primary button reading **Show 9 markets** — it
states the outcome, so the sheet never closes into a surprise. The count and the active-filter
tokens sit under the bar, in flow.

## Swahili at +25%

No control has a fixed width. Every one is content-sized with a `min-height: 44px` floor and
`white-space: nowrap`, so a longer label grows its own box and the row rewraps — it never truncates
a neighbour or reflows the grid. `Zenye ushindani · 25–75%` is 38% longer than `Contested · 25–75%`
and simply takes a wider chip. The sort control is the one capped element (360px): its value
ellipsises, its `PANGA` key never does. At 390 the chip rail scrolls instead of wrapping, which is
length-independent by construction. `06-states.html` §06f–06i shows all three locales side by side.
