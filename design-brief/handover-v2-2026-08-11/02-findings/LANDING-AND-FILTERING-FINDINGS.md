# Findings — in scope only

Measured from the live production site on 11 August 2026, rendered in Chromium at 2× DPR, captured
at 390 / 768 / 1440 / 1920. Every figure below is measured from the live DOM, not estimated.

**This document deliberately excludes findings about the colour palette, the market card, the
conviction bar and the YES/NO control.** Those are frozen — see `FROZEN.md`. Nothing here should be
read as licence to touch them.

Screens referenced live in `../02-current-state/screens/`.

---

## A. Landing page

### A1 · A modal covers the entire hero on first visit

`landing-first-visit-modal.jpg`

Every first-time visitor gets a `1440 × 900` modal — the full viewport — as step 1 of 3, with the
hero blurred behind it. Its copy is the best writing on the site (*"Predict events. Not chance…"*)
and it is invisible to anyone who reflexively closes modals.

The page needs to carry that message itself, in the composition, without an interaction.

### A2 · The page prints zeros

`landing-full-1440.jpg`, roughly 4,900px down.

**`0` MARKETS SETTLED** and **`TZS 0` PAID OUT**, set large and centred.

These are real aggregates and showing real rather than invented numbers is the right principle. But
the composition needs something true and non-zero in that slot until those figures read well —
live market count, predictor count, categories covered, the sourcing guarantee.

Note that `/markets` already computes `41 live · TZS 1669k in play`, which is a genuinely strong
number and is currently set in 11px mono in a corner.

### A3 · The sticky header is see-through — rendering bug

`BUG-nav-overlap-1440.jpg`, `BUG-nav-bleed-390.jpg`

Mid-scroll, card content passes visibly **through** the header. Conviction bars, avatar stacks and
"2 predictors" are legible on top of and behind the nav labels. The mobile bottom tab bar has the
same problem — "YES @ 100%" reads straight through the tab captions.

The header also has no bottom border, so it has no visual boundary at all.

### A4 · No vertical rhythm

Measured across the whole page:

- every gap between sections is **exactly 80px**
- every section has `padding-top: 0` and `padding-bottom: 0`
- every section background is `transparent`

The result is a uniform drone with no pacing — nothing tells a reader where one idea ends and the
next begins. This is the single biggest composition problem on the page.

### A5 · The topic band carries no information

`landing-full-1440.jpg`

Eight boxes at roughly `197 × 125 px`, each containing one small icon and one word. Identical weight,
no counts, no live indicator, no preview. Nothing tells a user which is worth clicking, so the eye
skips the entire band.

### A6 · "How it works" has the least weight and the most important job

15px headings, 13px body, compressed into a single box. This is the section that turns a curious
visitor into a registered one.

It also uses internal engineering language. Live copy: *"Every market resolves against a public
source URL, signed off by an officer — or two, when two-admin authorization is enabled."* And
*"Price Competition pool. Drag the conviction needle on any market."* Both are sentences from a
spec document. A user needs *"Two people verify every result."*

Copy rewriting is in scope for this section.

### A7 · The Up & Down promo has a hole in the middle

At 1440px the copy sits far left, the button far right, with roughly **500px of empty box** between
them. The eye has to travel across nothing to find the action.

### A8 · The header is five treatments in one bar

| Item | Shape | Height | Type |
|---|---|---|---|
| Markets (active) | 8px radius, filled | 34px | 13.5px Inter |
| Up & Down | 999px pill, outlined, + icon | 34px | 13.5px Inter |
| Live / Results / Top | 8px radius, plain | 34px | 13.5px Inter |
| EN / SW / 中文 | 999px pill group | 34px | 11.5px Mono |
| Sign in / Sign up | 999px pill | 30px | 13px Inter |

Five treatments, three font sizes, two radius systems, two families — in one 56px bar.

Also: three always-visible language pills consume the top-right corner, and the switcher
**disappears entirely on mobile** — so a Swahili speaker on a phone has no visible way to change
language.

### A9 · Tap targets are below minimum

Nav items 34px · language toggles 34px · Sign in / Sign up 30px · `Details ›` 17px ·
`VIEW ALL` 18px · `BROWSE MARKETS FIRST` 17px.

**30 interactive elements** on the page are under 40px in at least one dimension. iOS guidance is
44pt, Android 48dp. For an Android-majority market, 44px is the floor — and it costs nothing
visually, since the height comes from padding around the same text.

### A10 · The live ticker does not move

A `ticker-scroll` keyframe is defined in the stylesheet but the element computes to
`animation: none`. The strip is static, and on mobile it hard-clips mid-word at the right edge with
no fade mask, so it reads as broken text rather than as a feed.

Either animate it (slow loop, pause on hover, stop under reduced motion, gradient mask both edges)
or make it a static line. It is currently neither.

### A11 · Motion is mostly absent, and the part that runs is wrong

| Measurement | Value |
|---|---|
| Keyframes declared in the stylesheets | 84 |
| Distinct animations actually running on the landing page | 4 |
| Elements with `transition: all 0s ease` — i.e. no transition | **895** |
| Elements looping `m-breathe 1.6s infinite` | 8 |
| Does `m-breathe` stop under `prefers-reduced-motion`? | **No** |

895 elements snapping between states with no easing is most of the "looks nice but feels
unfinished" impression.

### A12 · Nothing anchors the page to Tanzania

Other than two 10px monospace lines (`TANZANIA · DAR ES SALAAM` and `EST. 2026 · DAR ES SALAAM`,
which say nearly the same thing 240px apart) and the TZS figures inside cards, the composition has
no sense of place. The market questions themselves — Arusha rainfall, Simba SC, the shilling, SGR
Dodoma–Singida — are the most local thing we own and they are not being used compositionally.

---

## B. Market discovery — `/markets`

`markets-1440.jpg`, `markets-1440-full.jpg`, `markets-390-full.jpg`, `markets-filter-rail-1440.jpg`

### B1 · There is no sort control

None at all. A user cannot order by pool size, predictor count, time remaining, or how close the odds
are. On a betting list, sort matters more than filter, and it is entirely absent.

### B2 · No odds-range filter

The genuinely interesting markets are the uncertain ones. There is no way to ask for everything
between 30% and 70%, and no "longshot" or "near-certain" view. This is the first thing a serious
predictor reaches for.

### B3 · Closed markets appear in the default view

The first card in the default grid is `CLOSED · Waiting for results` with a `Closed` button where the
YES/NO control would be. Someone arriving at `/markets` wants markets they can act on.

### B4 · Liquidity is invisible to the filter layer

The grid contains markets from `TZS 500` to `TZS 172,505`. That spread is the single biggest
practical difference between two markets on the page, and there is no way to filter or sort on it.

### B5 · No active-filter summary, no result count

Selecting `Ending soon` + `Sports` produces no chip row showing what is applied, no clear-all, and
no count of what matched.

### B6 · The filter rail is expensive

~**340px of a 1440px viewport** and ~**940px of vertical space** for 13 controls that are
functionally chips — full-width stacked buttons at roughly 72px each. That is a mobile pattern
applied to desktop, and on a betting site the real estate belongs to markets.

### B7 · A "coming soon" banner owns the best position

`Propose Markets & Get Paid · COMING SOON` is the largest element above the fold on `/markets`, for
a feature that does not exist yet.

### B8 · The best number on the page is the smallest

`41 live · TZS 1669k in play` is live proof that the platform is active — and it is set in 11px
monospace in the top-right corner. On the landing page we are printing `0` and `TZS 0`; here we have
real numbers and we are whispering them.

### B9 · Search is under-used

A 640px search field alone on its own row, with no suggestions, no recent searches, and no indication
of what is searchable.
