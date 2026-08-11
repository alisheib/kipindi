# 50pick — landing page composition & market discovery

**Client:** 50pick.tz — Tanzania-licensed pari-mutuel prediction market, Dar es Salaam
**Live:** www.50pick.tz
**Round:** 2. Round 1 went out of scope — read `FROZEN.md` first, it is not optional.

---

## 0. What this round is, in one paragraph

Our design system is done and approved. The market card, the conviction needle, the YES/NO control
and the colour palette are all signed off and shipping. **We are not redesigning them and we are not
redesigning the palette.**

What we need is **composition and discovery**: how the landing page is assembled out of components
we already have, and how a user finds a market worth predicting on. Think of yourself as an art
director laying out a magazine whose typeface and photography style are already fixed — the craft is
in the sequence, the rhythm, the hierarchy and the pacing, not in redrawing the letterforms.

Two deliverables:

- **A. The landing page** — structure, section order, rhythm, hero. Assembled from existing components.
- **B. Market discovery on `/markets`** — filtering, sorting, active-filter state, empty states.

---

## 1. Who you are on this job

We want all five of these at once, and the deliverable should show evidence of each:

**Visual engineer.** Everything you specify must be buildable with the tokens that exist. Values, not
adjectives. `24px`, not "a bit more space".

**Graphic designer.** Rhythm, hierarchy, negative space, the pacing of a page. The current landing has
seven sections on one flat surface with an identical 80px gap between every one of them — a uniform
vertical drone with no sense of where one idea ends and the next begins. That is a composition
problem and it is your core job here.

**Gamer.** You know what a good live scoreboard feels like — where the eye goes, what earns motion,
what a "live" state should do, how a lobby communicates *there is something happening right now*.

**Gambler.** This is the one most design work on betting products misses. A punter arriving at a
market list has three questions in this order: *what can I still get into?*, *what's about to close?*,
and *where is the money?* If a filter set does not answer those three fast, it is decoration. See §4.

**Manager of an esports company.** You care about the funnel and about looking like a real venue, not
a skin. You know that empty states, zero counts, and "coming soon" banners in prime positions read as
a company that has not launched.

---

## 2. Deliverable A — the landing page

### What is wrong today

Evidence and screenshots in `02-findings/LANDING-AND-FILTERING-FINDINGS.md` and
`02-current-state/screens/`. The short version:

| # | Problem | Measured |
|---|---|---|
| 1 | A first-visit modal covers the entire hero, 3 steps deep | 1440 × 900, full viewport |
| 2 | "0 MARKETS SETTLED / TZS 0 PAID OUT" printed large near the footer | — |
| 3 | The sticky header is see-through; card content scrolls visibly through it | see `BUG-nav-*.jpg` |
| 4 | Uniform section rhythm — no pacing | every gap exactly 80px, every section `padding: 0` |
| 5 | 8 topic boxes with one icon and one word, no information scent | ~197 × 125 px each |
| 6 | "How it works" is the most important content with the least visual weight | 15px headings, 13px body |
| 7 | Up & Down promo has ~500px of dead space between copy and button | at 1440 |
| 8 | Nav mixes 5 treatments, 3 font sizes, 2 radius systems in one 56px bar | — |
| 9 | Tap targets below minimum | nav 34px, auth 30px, text links 17px |
| 10 | The live ticker does not move and hard-clips mid-word on mobile | `animation: none` |
| 11 | Nothing anchors the page to Tanzania except two 10px mono lines | — |

### The hero

The current hero is a stock Formula 1 podium photograph. It is coming out and is **not** being
replaced with another photograph — no stock, no AI imagery, no new illustration commissions.

Build the hero from what we own: the brand mark, the type, the tokens, and **live product data**.
Our strong steer — argue against it if you disagree — is that the hero should contain **a real live
market**, using the approved market card exactly as it ships. It is proof the product works, it
teaches the mechanic in one glance, it is automatically local (Arusha rain, Simba SC, the shilling),
it weighs nothing, and it never goes stale.

Keep the headline **"The wisdom of YES & NO."** It is a real brand asset. You may re-set it.

For ambient background, the brand mark is a disc split green/red — which *is* the YES/NO dial. It
scales to any size and costs nothing.

### What you decide

Section inventory and order · what is above the fold · the vertical rhythm system (a spacing scale,
not one repeated gap) · how many cards and in what grid at each breakpoint · where trust signals sit
(licence, M-Pesa, sourcing) · what the topic band becomes · how "How it works" earns its weight ·
what replaces the zero-stat band until those numbers are real · the header at rest and scrolled ·
the entry motion.

---

## 3. Deliverable B — market discovery and filtering

`/markets` is where a user actually chooses. Screens in `02-current-state/screens/markets-*.jpg`.

### What exists today

A search field, then a left rail with two stacked groups — **WHEN** (New · Ending soon · Today ·
This week · All) and **TOPIC** (All · Sports · Macro · Weather · Crypto · Culture · Tech · Other).
Each filter is a full-width button roughly 72px tall.

### What is wrong with it

**As a gambler:**

1. **There is no sort.** None. A punter cannot order by pool size, by predictor count, by time
   remaining, or by how close the odds are. Sort is more important than filter on a betting list and
   it is entirely absent.
2. **No odds-range filter.** The interesting markets are the uncertain ones. There is no way to say
   "show me everything between 30% and 70%" — which is exactly the request a serious predictor makes
   first. Equally no "longshots" or "near-certain" view.
3. **Closed markets are in the default view.** The first card in the grid is `CLOSED · Waiting for
   results`. Someone arriving at `/markets` wants things they can act on.
4. **No liquidity signal in the filter layer.** `TZS 172,505` vs `TZS 500` is the single biggest
   difference between two markets on this page, and there is no way to filter or sort on it.
5. **No active-filter summary and no result count.** Select "Ending soon" + "Sports" and nothing
   tells you what is applied or how many markets matched.

**As a visual engineer / designer:**

6. **The rail costs ~340px of a 1440px viewport** and ~940px of vertical space for 13 controls that
   are, functionally, chips. On a betting site, real estate belongs to markets.
7. **A mobile pattern applied to desktop** — full-width stacked buttons at 72px each.
8. **"Propose Markets & Get Paid · COMING SOON"** is the largest element above the fold, for a
   feature that does not exist yet.
9. **`41 live · TZS 1669k in play`** is the best number on the page — live proof — and it is set in
   11px monospace in the top-right corner.

### What we want

A discovery layer that answers *what can I get into, what is about to close, where is the money* in
one glance, that returns the space to the markets themselves, and that works on a mid-range Android
phone as the primary case.

You decide the mechanism: chips, a segmented control, a sticky filter bar, a sort menu, a
combination. We are not prescribing it. We are prescribing that it must:

- be **built entirely from existing tokens** and hold the approved market card unchanged
- expose **sort** as a first-class control, not buried
- show **active filters and a result count**
- have a **designed empty state** ("no markets match" is a real screen, design it)
- keep the `41 live · TZS 1669k in play` proof visible and give it real weight
- fit a 390px viewport without a drawer if possible, and if a drawer is unavoidable, design it

---

## 4. Constraints

1. **`FROZEN.md` is binding.** Palette, market card, conviction bar, YES/NO control, brand.
2. **No photography, no stock imagery, no AI-generated imagery.**
3. **No new fonts.** Sora, Inter, JetBrains Mono.
4. **No new colour tokens.** None. See `FROZEN.md` §1.
5. **Every tap target ≥ 44 × 44 px**, including text links and the language control.
6. **Mobile is the primary case.** Mid-range Android, Tanzanian mobile networks. If a layout only
   works at 1440, it is not finished.
7. **Trilingual — EN / SW / 中文.** Swahili strings run roughly 15–25% longer than English. Any
   control with a text label must survive that without reflowing the layout.
8. **Dark theme only.** The light theme was deliberately removed; do not revive it.

---

## 5. Deliverable

See `06-handover-contract/OUTPUT-SPEC.md`.

There is **no token file and no token diff** in this round. You are composing with a fixed system,
and the output is layout specs, component HTML that uses existing tokens, a motion table, and an
argument.
