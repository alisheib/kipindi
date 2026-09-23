# MOBILE VISUAL — THE CONDITIONS THE MATRIX DEFINED AND NEVER RAN, 2026-09-23

> **STATUS: ⚪ RECORD — evidence, not a work order.** The work order is [`MOBILE-VISUAL-PLAN.md`](MOBILE-VISUAL-PLAN.md).
> This file mints no law and no design value. Every item below was measured on **production** (`https://www.50pick.tz`), signed out,
> read-only, with the `HeadlessChrome` user agent, so no visit was counted as traffic.
>
> ⚠️ **The `scripts/.probe-*.mjs` names that appear in the verifier text below are UNTRACKED SCRATCH FILES and are gone.** They are named so a
> reader can see HOW a number was taken, not so it can be re-run. DESIGN_AUTHORITY §0b keeps evidence out of the repo, and a dot-prefixed
> probe is deliberately untracked. Where a verifier wrote a range like `-1..3`, that shorthand has been replaced with plain words, because
> `test:docs` reads any `scripts/….mjs` in prose as a file reference and is right to.

## §0 — Why this exists

Four of the eight rows of the plan's own §11 test matrix — **Landscape, Keyboard proxy, Large text, Slow network** — were DEFINED and had
never been executed once. Every figure the campaign held through S3 was taken portrait, at 320/360/412, on a settled page, signed out.
Three further conditions had no row at all: **overlays opened**, **keyboard focus**, and **the routes nobody had captured**.

Seven examiners drove production, one per condition. **Every claim was then handed to an independent adversarial verifier** whose default was
that the claim was wrong, and who had to reproduce it on production, take its own measurement and read its own crops before accepting it.

**Totals: 39 claims — 23 CONFIRMED, 16 REFUTED.** A 41% refutation rate is the point of the second pass, not a failure of the first:
the refuted list is at the end **with its reasons**, so nothing here is re-found and re-filed later.

⚠️ **Verifiers corrected the surviving claims as often as they killed them** — a severity, a cause, a width, a population. Where the
verifier's number differs from the examiner's, **the verifier's is the one recorded**, and the correction is stated.

| Condition | Claims | Confirmed | Coverage the examiner drove |
|---|---|---|---|
| **Routes this programme had never captured** | 6 | 4 | 15 guest-reachable routes the programme had never captured. I derived the set from `find src/app -name "page.tsx"` and then checked each candidate's server gate rather than guessing: /watchl |
| **Landscape (740/780/915 × 360–412)** | 4 | 0 | 35 page loads against https://www.50pick.tz, all guest/read-only, every context built with `localisedContext` from scripts/qa-locale.mjs (kp-locale cookie + HeadlessChrome UA, reducedMotion  |
| **The on-screen keyboard (viewport shrunk to 360×500)** | 5 | 1 | 27 production page loads on https://www.50pick.tz, all through `localisedContext` (kp-locale cookie + HeadlessChrome UA) with `assertLang` after every navigation, reducedMotion:"reduce", dev |
| **Overlays, sheets and menus** | 5 | 4 | Dimension: overlays, sheets and menus (guest, never signed in, no form submitted, no data written). Routes × viewports × locales actually driven, all against https://www.50pick.tz: - `/` — 3 |
| **Large text (Android/browser scaling 1.3)** | 9 | 5 | Drove production https://www.50pick.tz read-only (never signed in, never submitted anything) with the repo helper `localisedContext` + `assertLang` after every navigation. 35 page loads. ROU |
| **Keyboard focus, and the reduced-motion rendering** | 6 | 6 | Routes driven: / (home), /markets, /leaderboard, /results, /live. Viewport 360x780 throughout. Locale sw (the default) throughout — I did not run EN or ZH, so every number here is the Swahil |
| **Slow network + slow CPU (400 kbps, 400 ms RTT, CPU 4×)** | 5 | 3 | Routes / , /markets and /results at 360x780, locale sw only, signed out, full motion, every load under CDP Network.emulateNetworkConditions {latency 400ms, 400kbps up/down} + Emulation.setCP |

---

## §1 — Confirmed, most severe first

### 🟠 UNSEEN-01 · The market card's card-wide link paints no focus ring at all: the card's own overflow:hidden clips 100% of it

- **Condition:** Keyboard focus, and the reduced-motion rendering
- **Where:** `/markets (and / — 12 of 12 cards on /markets, 4 of 4 on /)` · 360x780 · sw
- **State:** keyboard Tab focus (:focus-visible), settled page, reducedMotion reduce
- **Severity:** serious · **Extends:** (new) · **Suggested owner:** U3
- **What a player loses:** The whole card is the link to the market — it is the largest target on the board and the one that opens a page where money is staked. A player using a keyboard, a switch, or a Bluetooth keyboard on a phone tabs onto it and the screen does not change in any way. They cannot tell whether Enter will open a market or do nothing. This is a WCAG 2.4.7 (Focus Visible) failure on the product's primary navigation control, and it is not one card — it is every card on the board.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/markets and /, 360x780, locale sw, keyboard :focus-visible, reducedMotion reduce, settled 3s past networkidle. .mcardp-open is position:absolute with computed inset 0px on all four sides inside .mcardp {position:relative; border:1px; overflow:hidden}; walking the whole ancestor clip chain gives clipDelta {l:0.00, t:0.00, r:0.00, b:0.00} on 12 of the 15 cards on /markets and 4 of 4 on /. Focus ring is outline 2px solid at outline-offset 2px (NOT 1px — 1px is the mid-transition value; globals.css:2026 transitions outline-offset), so it occupies 2-4px outside the link box, i.e. entirely outside the clip. Full-viewport pixel diff, focused vs blurred, same run: 0 changed pixels of 280,800 on /markets and 0 of 280,800 on /, against a noise floor of 0 of 280,800 (two shots of the same unfocused state 900ms apart). Controls on the same page and run: the 3 resolved cards, where the card itself is the anchor, give 1,496 changed pixels in a 336x202 box 4px outside their 328x264 rect; the 44x44 .mcardp-info button inside the card gives a plainly visible blue ring in the x6 crop. Causation: holding focus and flipping only overflow:hidden -> visible on the focused card produces 1,553 pixels in a 334x217 box at (13,498) against a link rect at (17,502.4) — the ring, 4px out, visible by eye. Net: 100% of the focus ring is clipped, on 12 of the 15 cards on /markets and 4 of 4 on /.
```

### 🟠 UNSEEN-02 · Plain Tab parks the focused control under the fixed bottom rail — four of thirty stops on home are 100% invisible

- **Condition:** Keyboard focus, and the reduced-motion rendering
- **Where:** `/ (reproduced on /markets and /leaderboard)` · 360x780 · sw
- **State:** keyboard Tab down the page, NO on-screen keyboard involved
- **Severity:** serious · **Extends:** (new) · **Suggested owner:** U22
- **What a player loses:** A player tabbing down the board reaches a control, the page scrolls to "show" it, and it is drawn underneath the navigation bar. There is no focus ring anywhere on screen — I read the /markets screenshot at that moment and the viewport contains no indicator at all. The player's next Enter press fires a control they cannot see. This is not the on-screen-keyboard case the plan already notes in §3 ("the rail can sit over the focused field in layout-resizing browsers"): there is no keyboard open here, it happens on an ordinary portrait page with a hardware or Bluetooth keyboard, and a single scroll-padding-bottom on the root element covers it. The 13 chat-bubble overlaps in the same walk are D3 territory and I am not claiming them.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
CONFIRMED, with the mechanism corrected and /markets 4x worse than claimed. Production, 360x780, sw, consent pre-denied in localStorage (returning-visitor state), Playwright via localisedContext + assertLang. scrollPaddingBottom is "auto" on BOTH :root and body. Rail nav.kp-rail: position fixed, z-index 40, opacity 1, background lab(4.91921 26.0696 -45.6822) — a fully OPAQUE solid, re-read at every step, not once — at [0, 715, 360, 65]. Chat bubble [292, 648, 52, 52].

/ (home), 30 Tab stops: 11 overlap the rail, 14 the bubble, and 4 are 100% behind the rail — exactly the claimed four.
  step 16 BUTTON.mcardp-share 13.0x17.3 at [239.1, 749.7] — 225 of 225 px2 (claim said 221; 13 x 17.3 = 224.9, the claim rounded the height to 17)
  step 17 A.mcardp-details ("Maelezo") 63.9x17.3 at [264.1, 749.7] — 1,105 of 1,105 px2 (claim said 1,088, same rounding)
  steps 29/30 repeat both on the next card at [239.1, 749.5] and [264.1, 749.5].
  step 7, A.kp-qrow 328x121.3 at [16, 658.7] — 21,320 px2 rail + 2,148 px2 bubble = 59.0% of the control. Claim's 59% is exact.

MECHANISM CORRECTED — this is the part of the claim that is false. "The browser's sequential-focus scroll aligns each element flush to the viewport bottom" is not what happens at any of the four 100% stops: they caused NO SCROLL AT ALL (scrollY 834 -> 834 at steps 16/17, 2660 -> 2660 at 29/30; /markets 128 -> 128 and 729 -> 729). What lands flush is the PRECEDING stop, the card link A.mcardp-open — [17, 502.4, 326, 277.5] bottom = 779.9 and [17, 480.3, 326, 299.5] bottom = 779.8, both flush to 780. The card's footer row sits 12.7px above the card's own bottom edge, so once the card is bottom-flush the footer lands at 749.7–767.0, wholly inside the rail's 715–780 band. The two controls are then simply found there, unscrolled.

/markets, 40 stops: 4 fully hidden, NOT the 1 the claim reports — steps 25/26 and 37/38, the same .mcardp-share + .mcardp-details pair on two different cards, each after its card link scrolled bottom-flush (both [17, 502.5, 326, 277.5], bottom = 780.0). Rail overlaps 8, bubble 6.
  The corrected mechanism also predicts WHICH cards: a card PARTIALLY visible when tabbed into gets Blink's nearest alignment -> bottom flush -> footer dead (steps 21, 33). A card ENTIRELY below the fold gets centred instead and is completely clean (step 27 scrolled 128 -> 680 landing at top 240; step 39 scrolled 729 -> 1270 landing at top 251; their footers sat at 588.3 and 509.3, 9/9 SELF). So it alternates with scroll position rather than taxing every card — and on a 49-market board it is 2 dead stops per affected card, indefinitely, not "1".

/leaderboard, 30 stops: 1 of 30, exactly as claimed — SPAN.kp-tooltip tier badge 22x22 at [194.8, 742.5], 484 of 484 px2, after DIV.scrollx (the table container, tabindex=0) aligned flush (bottom 780.5).

Focus ring geometry: outline is "solid 2px" at outline-offset 2px on all of these, so the ring's outer edge at step 16 is 745.7–771.0 — also entirely inside the rail band. Nothing of the indicator escapes.
```

### 🟠 UNSEEN-03 · Under prefers-reduced-motion the live ticker freezes at entry 1 of 12 and shows 245px of a 1,045px sentence — the market it names is never on screen

- **Condition:** Keyboard focus, and the reduced-motion rendering
- **Where:** `/ (identical on /live)` · 360x780 · sw
- **State:** prefers-reduced-motion: reduce, settled page sampled at t=6s and t=14s
- **Severity:** serious · **Extends:** D32 · **Suggested owner:** U33
- **What a player loses:** prefers-reduced-motion is set by players with vestibular disorders and by anyone who turned motion down on a budget phone — and Swahili is the default locale, where these sentences are longest. For them the ticker is not slowed, it is a permanently truncated fragment that names a sum of money and an outcome and then stops before naming the market: "TZS 10K completed YES on". 11 of 12 live events are invisible with no way to reach them. Reduced motion should remove the movement, not 99% of the content.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
Route `/` (and `/live`, identical), 360x780, locale sw, settled page. My probe: `scripts/.probe-refmo-1.mjs`, `scripts/.probe-refmo-2.mjs`. Crops: refmo/home-reduce-t2.png, home-reduce-t14.png, home-no-preference-low-b.png, live-reduce-b.png.

GEOMETRY (mine, matches theirs): clipping window (the `overflow:hidden` flex child holding the track) = 245.0 x 31 at x=115 on a 360 screen; clientWidth 245 vs scrollWidth 27,449 and no scrollbar, no touch scroll, and zero buttons/links inside the strip. `.ticker-track` = 27,440.6px holding 24 spans = 12 events rendered twice. Entry 1 starts at x=123 and is 1,045.4px wide — but that figure INCLUDES its own 32px `pr-8`, so the text is ~1,013px, and the readable share is 24.2%, not the claimed 23.4%. One of 24 spans intersects the window; zero are whole; 11 of the 12 events never intersect it at any time.

FROZEN, CONFIRMED TWICE: under `prefers-reduced-motion: reduce` the computed animation is `ticker-scroll 1e-05s x1` with `transform: none`, and track left = 123.0 at t=2.5s, 3s, 12s and 14.5s. Control on the same page under no-preference: track left -732.8 at t=2s -> -3097.9 at t=14s (197 px/s), entries 0,1 then 2 crossing the window. So the freeze is real and is not a pre-settle sample.

WHAT THE ORIGINAL MISSED, AND IT IS THE BIGGER HALF: this is not only an OS accessibility setting. `theme-provider.tsx:29-32` sets `data-motion="reduced"` for `hardwareConcurrency <= 4` OR `deviceMemory <= 4` OR Save-Data, and `globals.css:2755,2801` gives `[data-motion="reduced"] .ticker-track { animation: none !important }`. I drove production with `hardwareConcurrency=4`, `deviceMemory=2` and NO reduced-motion preference (`matchMedia` false): the product itself stamped `data-motion="reduced"`, animation resolved to `none`, transform `none`, track left 123.0 at t=3s and t=12s — the identical frozen strip, and the crop is pixel-identical to the reduce one. The plan's own U28 calls that device class "most Tanzanian budget phones". So the affected population is the default target device, not a reduced-motion minority.

TEXT (per-character Range against the window, not a box measurement): the characters fully inside the window are "TZS 10K imekamilika NDIO kwenye " — the line stops on the preposition and the market never appears. First character outside: "J" of "Je, Gameweek 5 ya Premier League (Sept 19-21, 2026)...". A refinement in their favour: the strip's right fade is real and measured (x=312, w=48), so the last 48px of the 245 is under a gradient; only "TZS 10K imekamilika NDIO" (197px) is clear of it. I checked this against the crop and THE PICTURE WINS — "kwenye" is dimmed but legible, so their rendering of the line is right as painted; the fade is a gradient, not a cliff.

Their two sampled screenshots being identical: confirmed at t=2s vs t=14s in both modes I drove.
```

### 🟠 UNSEEN-04 · On market cards the pool figure is the only thing allowed to shrink at large text: it ellipsises to "TZS 70,..." at 360 and to "TZS..." — the whole amount gone — at 320, while the countdown beside it never gives up a pixel

- **Condition:** Large text (Android/browser scaling 1.3)
- **Where:** `/markets (12 of 15 cards) and / (4-6 cards, hero card included)` · 360x780 @ zoom 1.3 (277 layout) and 320x780 @ zoom 1.3 (246 layout); reproduced at 277x600 native · sw only — EN is clean at every width I measured
- **State:** browser/Android text scaling 1.3. Ordinary pooled markets, NOT cold-start cards.
- **Severity:** serious · **Extends:** D35 · **Suggested owner:** U32
- **What a player loses:** The pool is the number that tells a player how much money is on the market — it is the reason to tap the card. At 320 with large text it reads "TZS...", which is not a small number or a rounded number, it is no number, and it sits next to a countdown that kept its full width. The platform forbids clipping money outright, and this is 13 of 15 cards on the main board in the DEFAULT locale.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
`.mcardp-meta > span` (pool slot) vs its `flex-shrink:0` sibling `.mcardp-meta-right`, production, own probes `three untracked scratch probes (since deleted)`, 10 loads, 9 crops read.

PAGE ZOOM 1.3 (`documentElement.style.zoom`), the claimed instrument:
- /markets 360x780 sw: **12 of 15** pooled cards clip. Pool box 76.0 painted px vs 85.8 px of unclipped text demand (Range rect) = 9.8px short; clientWidth 58 / scrollWidth 66 layout px. Crop reads "TZS 79,…".
- /markets 320x780 sw: **13 of 15**. Box 36.0 vs 85.8 (worst row 27.4 vs 85.8). Crop reads "TZS…" — the whole amount gone, currency code alone.
- / (home) 360x780 sw: **4 of 4** pooled cards. Crop "TZS 50,…".
- Countdown `.mcardp-timeleft` = **192.3px at 360 AND at 320, identical** — it never yields, because `.mcardp-meta-right` is `flex-shrink:0` (globals.css:4159) while the pool span alone carries `min-width:0; overflow:hidden; text-overflow:ellipsis` (globals.css:4153).
- EN control at the HARSHEST cell (320 @1.3, 183px meta box): **0 of 15**, crop "TZS 79,000  1d left". Cause is sibling length: "siku 1 zimebaki" 148px vs "1d left" 95px native.
- Control, 320 sw NATIVE, no scaling: **0 of 15** — so D35's registered population (cold-start, "Hakuna bwawa bado", no "TZS") does not cover these cards.

ANDROID TEXT SCALING 1.3 (font-only: `.mcardp-meta{font-size:14.3px}`, container/gaps/44px info plate keep their layout px — the faithful model):
- 360 sw: **0 of 15 — CLEAN.** Crop paints "TZS 79,000" whole. 296px content box vs 85.8 + 7 + 177.7 = 25.5px of slack.
- 320 sw: **12 of 15**, ox 15–23 layout px, crop "TZS 79,…". Home 320 sw: 4 of 4.
```

### 🟠 UNSEEN-05 · At 130% text the /markets sort control collapses to a 12-unit sliver underneath its own direction toggle: 0 of 5 hit-test points reach it, so the sort menu cannot be opened

- **Condition:** Large text (Android/browser scaling 1.3)
- **Where:** `/markets` · 360x780 @ zoom 1.3 (277 layout); reproduced at 277x600 native and 320x780 @ zoom 1.3 · sw AND en — identical, so this is structural, not a Swahili-length problem
- **State:** browser/Android text scaling 1.3 (page zoom). Guest session, no menu open.
- **Severity:** serious · **Extends:** (new) · **Suggested owner:** U9
- **What a player loses:** A player who has raised their phone font size loses the ability to re-sort the board. /markets is the main board; the sort menu is how you get from "Newest" to "Biggest pool". Every tap aimed at it instead flips the sort DIRECTION, which silently reorders the list the opposite way — so the control does not feel dead, it feels wrong. The active sort value is still printed in the sub-line ("masoko 49 · Pesa nyingi"), so the player can see what the sort is and cannot change it.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/markets, sw, guest, production, measured by me.

CONTROL — 360x780 @ zoom 1 sw: details.kp-menu = 67px at x=182-249; summary 67 x 44, clientWidth 66 = scrollWidth 66 ("PANGA" whole); the direction link a.rounded-r-pill starts at x=249 — overlap 0px. A 1px sweep across the sort cell reaches the summary at 67 of 68 x-positions. Playwright trial click: PASS.

DEFECT — 360x780 @ zoom 1.3 sw: details.kp-menu width = 0 (x=236.6, right=236.6); the summary paints as a 16.6 x 57.2 sliver, clientWidth 12 vs scrollWidth 61 (49 units of label hidden); a.rounded-r-pill href="/markets?dir=asc" occupies x=236.6-293.8 — identical left edge, overlap 16.6 = 100% of the summary — and is AFTER the summary in DOM order (compareDocumentPosition), so it paints on top. Tappable: 0 of 14 points across the summary, 0 of 37 across the whole sort cell band. Playwright's own actionability check fails and names the interceptor: <a href="/markets?dir=asc" aria-label="Imepangwa kushuka" class="inline-flex h-[44px] w-[44px] …">.

EN identical: summary 16.6 x 57.2, clientWidth 12 vs scrollWidth 54, 0 tappable. Structural, not a Swahili-length problem — confirmed.

TWO CORRECTIONS:
1. The invariant number is not 16.6 x 57.2 — that is the zoom-scaled painting of a 13 x 44 CSS box. The zoom-free 277x600 NATIVE cell reports summary 13 x 44 at x=182-195, details width 0, dirLink x=182-226, overlap 13 = 100%, 0 of 14 tappable. Quote 13 x 44 / clientWidth 12 vs scrollWidth 61.
2. The cliff, from a zoom-free viewport sweep on one page load (360 → 240 at zoom 1): 360 det=67, tappable 67/68, label whole; 344 det=51 (clientWidth 50 vs scrollWidth 61 — the label is ALREADY clipped here), 52/52; 320 det=27, 27/28; 310 det=17, 17/18; 300 det=7, summary 13, overlap 6, tappable 7/14 (HALF covered); ≤290 det=0, overlap 13, tappable 0/14 — dead. The control dies at ≤ ~290 effective CSS px, i.e. about 1.25x zoom at 360 and anything above; 360@1.3 = 277 and 320@1.3 = 246 are both well past it.

NEW FACT THE CLAIM DID NOT ESTABLISH — there is no second path. I opened the Filters sheet at 277 native: its entire text is "Chuja masoko / UWEZEKANO / DIMBWI / MADA / Onyesha masoko 49". No sort section, no sort word, none of the four sort values. Sort can only be changed from the bar control or by editing the URL. The active sort does stay legible on the count line ("masoko 49 · Pesa nyingi"), so the player is not misinformed about state, only unable to change it.
```

### 🟠 UNSEEN-06 · The sort listbox's bottom two options are taken by the chat bubble: tapping "Mpya kwanza" opens support chat instead of sorting

- **Condition:** Overlays, sheets and menus
- **Where:** `/markets` · 320x640 · sw
- **State:** portrait, at the top of the page (scrollY 0), guest, reduced motion; the sort menu open
- **Severity:** serious · **Extends:** D30 · **Suggested owner:** U33
- **What a player loses:** Sort is the primary way a player re-orders a 49-market board, and "Mpya kwanza" (newest first) is its last and most-used row. On a 640-tall phone — the cheap Android portrait viewport once browser chrome is subtracted — a thumb landing on the right-hand two thirds of that row does not sort the board, it opens a support conversation covering the whole screen. The player has to close a chat they did not ask for and try again, aiming left.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
**/markets · 320×640 · sw · guest · reduced motion · scrollY 0 · sort menu open** (my own probe `scripts/.probe-refute-1.mjs`, run against https://www.50pick.tz):

Panel `[data-bar-cell="sort"] [role=listbox]` x=100 y=307 w=220 h=274 bottom=581, computed `z-index: 30`, but its only positioned ancestor is `div.kp-discovery-bar.sticky.top-[56px].z-20` — so it resolves at **20** against the page. `.cm-bubble.cm-bubble-mobile` x=252 y=508 w=52 h=52 bottom=560, itself `z-index: auto` inside a `position: fixed` wrapper at **z-index 60**. Overlap = the bubble's full 52px width over x 252–304 of a panel that ends at x=320, across y 508–560.

Nine-point `elementFromPoint` census per row (x = row.left+4 → row.right−4): rows 0–3 lose 0/9; **row 4 "Mabadiliko makubwa ↓" (href `/markets?sort=move`, cy=510) loses 2/9** — x=263 → the bubble's fixed wrapper `div`, x=289 → `button.cm-bubble.cm-bubble-mobile`; **row 5 "Mpya kwanza ↓" (href `/markets?sort=new`, cy=554) loses 2/9** — x=263 and x=289, both `button.cm-bubble.cm-bubble-mobile`. 2 of 6 rows, 4 of 54 points.

**Real click, and a control that discriminates it** (`.probe-refute-2.mjs`, one context per click):
- `mouse.click(263, 554)` over "Mpya kwanza ↓" → `url` stays `https://www.50pick.tz/markets`, `sort` param `null`, active sort label still "PANGA", and `.cm-list` + `.cm-scrim` are both present: the full-screen "Msaada wa 50pick" chat opened.
- **Same row, same cell, x=170 (centre): → `https://www.50pick.tz/markets?sort=new`.** So the option is alive; the bubble is what takes the tap.
- 360×780 sw, same relative x (303) on the same row: → `?sort=new`. Height-bound, not an x problem.

**Screenshots read, not just measured** (`.probe-shots-refute/crop-320x640-sw.png`, `click-320x640-sw-x263-OVER-BUBBLE.png`): the crop shows the bubble sitting on the panel with row 5's ↓ arrow completely hidden behind it and row 4's arrow clipped; the click shot is the support chat filling the screen. **Picture and numbers agree.**

**Three corrections to the claim as stated:**
1. **The "shorter than 713 CSS px" bound is derived, not measured, and it is wrong.** `innerH − bubble.top` is a constant 132.0 at every cell I drove, and panel bottom is a constant 581 — so 713 is the *geometric-overlap* threshold. It is not the tap-loss threshold. At **412×700 sw** — inside the claimed range — bubble top = 568 vs panel bottom = 581, a real 13px overlap, and **0 of 6 rows lose a point**, because the overlap falls below the last row's centre line (554). Measured thresholds: **innerH < 686** covers the last row's centre line; **innerH < 642** covers both bottom rows. The claim's own census samples 7 points horizontally but only the centre line vertically, which is the same single-point blindness it credits itself with avoiding.
2. **It is not a Swahili defect.** 320×640 **en** loses the identical 2 rows × 2 points ("Biggest move ↓", "Newest first ↓"). Panel width is a fixed 220 in both locales.
3. **360×640 bites too** — the claim tested only 360×780 and reported it clean, which reads as "360 is safe". At 360×640 (a standard Android viewport) the panel is x=140..360, the bubble x=292..344, and rows 4 and 5 lose the same 2/9 each.

**Confirmed bound (claim was right here):** at 320×640 scrollY 600 the bar pins and the panel moves to y 137.3–411.3 — 0/6 rows lost. Matches the claim's numbers exactly.
```

### 🟠 UNSEEN-07 · The header and the hero fade to opacity 0 and re-rise 2.7 seconds AFTER the page was already readable — and CLS cannot see it

- **Condition:** Slow network + slow CPU (400 kbps, 400 ms RTT, CPU 4×)
- **Where:** `/` · 360x780 · sw
- **State:** cold load, slow 4G (400 kbps, 400 ms RTT) + CPU 4x, signed out, full motion (data-motion="full")
- **Severity:** serious · **Extends:** (new) · **Suggested owner:** U28
- **What a player loses:** A player who has been reading the hero for three seconds — the headline, the 49 open markets, the TZS 482K staked — watches the header and those figures vanish to nothing and slide back in. It reads as a crash or a reload, on the one surface that is supposed to establish that this platform is solid with money. The CSS comment at globals.css:5257 explains that `.js` is added from JavaScript so that a load where the bundle never arrives still shows everything: that correctly protects the no-JS case and creates the slow-JS case, because `kp-rise`/`kp-fade` carry `both` fill and so replay from their invisible first frame whenever `.js` lands late. The fix has a natural home: U28 already plans a tiny pre-paint inline script to resolve the motion tier (data-motion only appears at t=12190 here, also after paint), and `.js` belongs in that same script.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/ at 360x780, sw, signed out, cold, slow 4G (400 kbps / 400 ms RTT) + CPU 4x, data-motion="full" (read back from <html>, not forced).

Timeline, clean run (in-page rAF sampler only, no capture overhead — scripts/.probe-refute-reveal-4.mjs cell A):
- FCP t=9416. Hero column FULLY readable at t=9761: all 5 `.kp-hero__inner > *` at computed opacity 1, `main` h=6032.3.
- Last pre-`.js` sample t=12518: topbar 1, kids [1,1,1,1,1], hero child1 y=121.8.
- `.js` flips at t=12539: topbar 0, kids [0,0,0,0,0], y 121.8 -> 129.6.
- GAP readable -> flip = 2778 ms (claim said 2707; run 3 gave 2707-equivalent, run 1 gave 3156 from FCP). CONFIRMED.
- ⛔ NO FRAME IS RENDERED FOR THE NEXT 132 ms. First painted frame carrying the new styles is t=12671: topbar 0.152, kids [0.264, 0, 0, 0, 0].
- Fully back t=13077. VISIBLE EVENT = 406 ms (claim said 338).

What the screen actually shows (CDP Page.screencast, per-frame metadata timestamps, scripts/.probe-refute-reveal-3.mjs):
- Frame c021261, timestamped inside the run of computed-0.00 samples: header pills, "The wisdom of YES & NO.", 49, TZS 482K, 27 ALL AT FULL BRIGHTNESS. It is a live frame, not a stale one — the MUBASHARA ticker advanced ~3 characters between c021178 and c021261, so the compositor was producing fresh frames while the main thread was blocked.
- Deepest topbar value ever PAINTED: 0.152 (throttled) / 0.076 (unthrottled). Deepest headline value painted: 0.264.
- Frame c021344 (topbar 0.152): 579 of 780 visible px of the hero column are at opacity < 0.05 — 49 / MASOKO YALIYO WAZI, TZS 482K / FEDHA ZILIZOWEKWA, 27 / UTABIRI ULIO WAZI, the BODI YOTE SASA HIVI tipping bar and the YANAYOFUNGWA KARIBUNI block with both market cards are GONE. Those are hero children 2-5, sitting in the backwards fill of their 40/80/120 ms kp-rise delays.

CLS, measured myself (scripts/.probe-refute-reveal-5.mjs, PerformanceObserver layout-shift buffered): 2 entries this load, 0.00106 at t=14040 and 0.15897 at t=14803, both BEFORE `.js` (t=15698). Entries inside the replay window [15648, 16391]: 0, summed value 0.00000. Confirmed.

Unthrottled control (same probe, cell B): gap readable -> flip = 81 ms, event 424 ms. Identical mechanism, invisible as a defect. The defect is purely a function of how late the bundle lands.
```

### 🟠 UNSEEN-08 · /fairness: the SOURCE (CHANZO) proof column — the page's entire purpose — starts 157px outside its own scroller, with no at-rest affordance that it can be reached

- **Condition:** Routes this programme had never captured
- **Where:** `/fairness` · 360x780 (also 320x640, also 360x780 en) · sw (reproduced in en)
- **State:** portrait, at rest, signed out, reduced motion, first paint — no interaction needed
- **Severity:** serious · **Extends:** (new) · **Suggested owner:** new
- **What a player loses:** This is the fairness page. Its promise, printed above the table, is that every market was resolved against a named official source URL — the row's `srcHref` values are real (wikipedia.org, premierleague.com, accuweather.com). On a phone a player sees MARKET / OUTCOME / OFFICERS and nothing else: the source link and the resolution timestamp, the two facts that make the claim checkable, are off-screen behind a horizontal scroll that gives no sign it exists. A player who suspects a resolution cannot audit it, which is the one thing this page is for. It is also the page the footer link "Uthibitisho wa utatuzi" sends them to.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/fairness, at rest, signed out, reduced motion, scrollLeft=0, 12 of 12 rows, re-measured twice in independent contexts and agreeing to 0.0px.

360x780 sw — `div.scrollx.overflow-x-auto` (role=region, aria-label "Resolved markets", tabIndex 0), box x=16..344, clientWidth 326, scrollWidth 559, table 558.7 wide. 233px = 41.7% outside. th x: SOKO 17.0 · MATOKEO 144.8 · MAAFISA 243.9 · IMETATULIWA 327.7 · CHANZO 485.1..575.7. All 12 "Chanzo" anchors at x=501.1 (text rect 501.1..540.7) = 157.1px past the x=344 edge.
320x640 sw — clientWidth 286, scrollWidth 559, hidden 273px = **48.8%** (the claim said 48.9). Link 197.1px past x=304.
360x780 en — clientWidth 326, scrollWidth 551, table 550.8. SOURCE th x=477.2..567.8, links x=493.2 = 149.2px past.
412x915 sw (NOT in the claim, and it extends there) — clientWidth 378, scrollWidth 559, 181px = 32.4% hidden, link 105.1px past x=396.

CORRECTION 1 — the RESOLVED/IMETATULIWA figure is a BOX number and it understates at the default locale. `.admin-tbl th/td` carry `padding: 10px 16px` / `12px 16px`, so of the 16.3px sliver at 360 sw, 16px is padding: the header word begins at x=343.7 against a 344 edge and **zero glyphs** of the timestamp render. My head crop settles it — the header row at 360 SW reads "SOKO  MATOKEO  MAAFISA" and stops. The orphan "2" the claim leans on is a 360 **EN** effect only (24.2px = 16 padding + 8.2px of glyph); I read that crop and 9 of 9 visible rows do paint a bare "2" hard against the edge. At 360 SW there is no orphan digit — there is nothing at all.

CORRECTION 2 — the affordance is measured, not inferred. `clientHeight 802` vs `offsetHeight 804` with `border 1px/1px` ⇒ the scrollbar occupies **0px** of layout: it is an overlay, and no thumb paints in a crop of the scroller's bottom edge at rest **or** at scrollLeft=120. `mask-image: none`, `::before`/`::after` `content: none`, and the section's innerText runs straight from the filter row into the header row with no hint copy.

NEW, and it sharpens the affordance half: exactly ONE element on this page carries a fade — the lens nav strip directly above the table (`kp-thin-scroll kp-strip-fade`, clientWidth 203 / scrollWidth 462 at 320) with `mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent)`. The product owns the affordance, spends it on the less important scroller on this very page, and gives the proof table `mask-image: none`.

Reachability (this is what caps the severity): scrollLeft max = 233 and the gesture works — after scrolling, the timestamp and "Chanzo" render cleanly (crop read). And the market title in the *visible* first column links to /markets/[id], which publishes the same source three times in plain view at 360 SW: "Chanzo" at x=103.6 (h 18), "Chanzo" at x=212.1, and the raw URL at x=55.5, w=263.5 (drove /markets/mkt_28b5f6f151aed5266092).

Tap sub-claim holds: anchors are 54.6 x 16.5px, `--tap-min: 40px` (globals.css:310) → 41%. Separate defect class, and moot while the column is off-screen.
```

### 🟠 UNSEEN-09 · /fairness: every market title is clamped to 2 of up to 16 lines in a 91.8px column, and in Swahili two different markets paint identical text

- **Condition:** Routes this programme had never captured
- **Where:** `/fairness` · 320x640 (and 360x780) · sw (geometry identical in en; the collision is sw-only)
- **State:** portrait, at rest, signed out — 12 of 12 rows
- **Severity:** serious · **Extends:** (new) · **Suggested owner:** new
- **What a player loses:** The log's job is to say which market was resolved how. On a phone no row identifies its market — "Je, Gameweek …" is 14 characters of a 103-character question — and in the platform's default language two separate resolutions, one YES and one on a different competition, are indistinguishable rows. A player checking whether the market they lost on was resolved correctly cannot find it. The title IS a link to /markets/<id>, so the row is still navigable, but you have to tap blind.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
Re-driven on https://www.50pick.tz/fairness, signed out, portrait, at rest, 8 page loads: 320x640 sw/en, 360x780 sw/en, 412x915 sw, 320x720 sw/en.

GEOMETRY (my numbers, two independent instruments agreeing):
- `td.p-3.max-w-[420px] > a.font-display.line-clamp-2` content box = **91.8px at 320, at 360 AND at 412** — width-INVARIANT. The `td` border box is **127.8px at every one of those widths**.
- Why it never moves: the table is inside `ScrollX` (`role=region aria-label="Resolved markets"`). `scrollWidth 559` vs `clientWidth 286 / 326 / 378` at 320 / 360 / 412. `.admin-tbl{width:100%}` loses to the five columns' content minimums (SOKO 127.8 · MATOKEO 99.1 · MAAFISA 83.8 · IMETATULIWA 157.4 · CHANZO 90.6 = 558.7), so the page scrolls sideways 273 / 233 / 181px and the title column gains nothing from a bigger phone.
- `-webkit-line-clamp: 2`, `line-height 19.5px`, `font-size 13px`, `clientHeight 39` on **12 of 12 rows in both locales**. `scrollHeight` at 320 sw = 215, 273, 234, 273, 195, 195, 312, 215, 234, 234, 254, 234 → **2 painted of 10–16 lines** (en: 156–312 → 2 of 8–16). Cross-checked against a class-stripped clone of each link laid out at the same 91.8px with no clamp: `naturalHeight` equals `scrollHeight` to ≤0.5px on all 36 measurements.

WHAT ACTUALLY PAINTS (per-character Range walk keeping chars whose `bottom - top <= clientHeight`, NOT a `getClientRects().length` count, and confirmed against crops):
- 320 sw: **15 to 25 characters**, median 20 — not "roughly 26". 26–27 is the English figure.
- Row 0 paints `"Je, timu 3 au zaidi za "` (23 chars). Row 5 paints `"Je, timu 3 au zaidi za "` (23 chars). **Byte-identical.** Full titles 107 and 95 chars, common prefix exactly 48.
- English row 0 `"Will at least 3 away teams "` vs row 5 `"Will 3 or more away teams "` — distinguishable. The sw-only collision is confirmed.

THE PICTURE (one 232x388 clip holding both rows, 320 sw, read with the Read tool): two rows read `Je, timu 3 au / zaidi za…` with the ellipsis painted — and **row 1 is chipped BATILI (void) while row 6 is chipped NDIO (yes)**. The English crop of the same six rows shows the two titles diverging at word two.
```

### 🟡 UNSEEN-10 · Focusing a podium tier badge opens a tooltip that runs 87px off the right edge of the phone, cutting the clause that defines the tier

- **Condition:** Keyboard focus, and the reduced-motion rendering
- **Where:** `/leaderboard` · 360x780 · sw
- **State:** keyboard focus on the tier badge (the popover appears after the deliberate 300ms hover-intent delay)
- **Severity:** minor · **Extends:** D41 · **Suggested owner:** U10
- **What a player loses:** The tier badge is the only place the leaderboard explains what Dhahabu or Almasi mean, and the part that is cut is precisely the qualification — how many settled markets and what ROI a player needs. A player on a 360px phone who focuses or taps the third-place badge gets the tier's name and loses its definition. It is the same failure shape as D41 but in a different component and on a different surface, so fixing D41's InfoHint will not touch it.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/leaderboard, 360x780, sw, my own probes (F:\kipindi-main\scripts\.probe-refute-1.mjs / -2.mjs / -3.mjs), 4 page loads.

Population: 11 `.kp-tooltip` triggers, all really visible, all `tabIndex=0`; podium 22x23.3, list 22x22. Podium badge #3 trigger at [301, 377.9, 22, 23.3] — the claim's [301,378,22,23] to the pixel.

Podium badge #3 (gold), at t=1.2s, opacity 1, visibility visible, white-space:nowrap, 11px mono:
  popover BOX   [176.7, 339.4, 270.6, 30.5] → right edge 447.3 = 87.3px past a 360px viewport
  popover TEXT  own client rect x=187.7 w=248.6 → right edge 436.3 = 76.3px of GLYPHS past 360
So the headline "87px" is the box (padding + border included); the text actually lost is 76.3px, ~11 characters at ~6.9px/char — which is exactly " · ≥15% ROI".
shots-refute/crop-2.png read by eye: "Dhahabu · ≥10 imetatuliwa" with the final "a" sliced by the screen edge and the ROI clause absent. Picture and numbers agree.

Podium badge #1 (diamond): box x=-18.6, TEXT x=-7.6 → 7.6px cut at the left ≈ ONE glyph. crop-0.png reads "lmasi · ≥20 imetatuliwa · ≥30% ROI" — the "A" only.
Podium badge #2 and all 8 list badges: cutR=0, cutL=0. 2 of 11 clipped, 1 of 11 loses meaning.

No recovery path: `document.scrollingElement.scrollWidth` = 360 = clientWidth, and html/body are `overflow-x: clip`. The text cannot be scrolled into view.

NOT Swahili-specific (the claim files it as an sw defect): at 360 EN the same badge #3 popover is [197.1, 426.9] with TEXT cut 55.9px on the right, losing "15% ROI" from "Gold · ≥10 resolved · ≥15% ROI". Locale sets the magnitude; the driver is the third podium column's centre at x=312 against a nowrap popover, `left:50% + translateX(-50%)`, no collision handling.

Broader than "keyboard focus": a pointer click on the badge leaves it focused (document.activeElement === the span), opens the popover to opacity 1, and does not navigate (location stays /leaderboard) — so a phone tap reaches it too.

Mitigation the claim omits: the identical label "Dhahabu · ≥10 imetatuliwa · ≥15% ROI" renders WHOLE on the list badge ~54px below (trigger #5, box [92.2, 362.9], cutR=0). The threshold is stated nowhere else on the page in plain text — the only other lines matching the threshold words are per-player counts ("43 imetatuliwa") and the "ROI BORA" tile.
```

### 🟡 UNSEEN-11 · Shift+Tab parks the focused control under the sticky header — both bet buttons land 100% behind it, with a different clickable control on the same point

- **Condition:** Keyboard focus, and the reduced-motion rendering
- **Where:** `/markets` · 360x780 · sw
- **State:** keyboard Shift+Tab walking backwards up the page from scrollY 2600
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** U22
- **What a player loses:** NDIO and HAPANA are the money buttons. A keyboard user reversing up the board puts focus on one of them while the point it occupies is painted over by the header's sign-up button. They see the sign-up button, not their own focus; Enter commits to a market side they cannot see. Same one-line root cause as the rail case above (no scroll-padding on the root), so the two want fixing together, but this one is worse because the control that is hidden is the one that takes a position.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/markets · 360x780 · sw · guest · production. Premise confirmed exactly: `scrollPaddingTop` is "auto" on documentElement, body AND scrollingElement (grep confirms no `scroll-padding` or `scroll-margin` anywhere in src/); `<header>` is `position:sticky; top:0; z-index:30` at [0,0,360,56] with `background: lab(4.91921 26.0696 -45.6822)`, `opacity:1`, `transform:none`, NO backdrop-filter — fully opaque. Every focused control reports `scroll-margin-top: 0px`.

WHAT THE CLAIM MISSED — there is a SECOND opaque sticky layer. `.kp-discovery-bar sticky top-[56px] z-20` sits at [0,56,360,76.3], `opacity:1`, opaque background. The top obstruction band is 0 → 132.3px, not 0 → 56px. The claim's instrument compared each stop only against `<header>`, so it was blind to everything parked in the 56–132.3px strip.

Re-measured against the whole band (9 hit-test points sampled per control, scroll settled by polling scrollY to a fixed point before reading):
- 5 of 18 backwards stops are 100% INVISIBLE, 0 of 9 hit-points reachable — not 4:
  · "NDIO @ 100%" [32,-0.2,144,40] — 39.8px under the header, 0.2px above the viewport = 0px visible
  · "HAPANA @ 0%" [184,-0.2,144,40] — same
  · 44px info button "Inavyofanya kazi" [284,15.8,44,44] — 40.3px under the header AND the last 3.7px under the discovery bar, so 100% hidden, NOT the claimed 91%
  · "Maelezo" [264.1,69.8,63.9,17.3] — entirely under the discovery bar; claim's instrument reported 0px overlap
  · "Shiriki soko hili" [239.1,69.8,13,17.3] — same
- 2 further stops are 69% obscured: "HAPANA @ 0%" / "NDIO @ 100%" at [.,104.8,144,40] keep only 12.4px of 40 clear, 3 of 9 hit-points reachable. The claim recorded 0px for both.
- The claim's 4th item, the "326x278 card link at [17,0], 56px", is NOT a hidden control: I measure [17,-0.5,326,277.5] with 144.7px still unobstructed. It is a card clipped at the top, not a lost focus target.

SCREENSHOT (read, clip 0,0,360,170–190): at the HAPANA stop and at the Maelezo stop the top of the page shows only the logo, SW/Ingia/Jisajili, and the discovery bar (okeo 3 · Zote 52 · PANGA · masoko 49 · Pesa nyingi). No focus ring is painted anywhere on screen. The picture agrees with 100% and beats the claim's own 91%/100% arithmetic.

NOT SHIFT+TAB-SPECIFIC — the title's mechanism is wrong. Walking FORWARD with plain Tab over the same 18 stops, 4 of 18 are also fully hidden ("HAPANA @ 0%" top=-0.2, info button top=49.8, share and "Maelezo" both top=103.8). Chrome counts them as already in view and never scrolls. The defect is the missing scroll-padding-top, in both directions.

elementFromPoint mapping is off by one control: at the HAPANA centre I get `A.btn.btn-ghost` ("Ingia"), at the NDIO centre I get the header's own non-interactive `DIV.mx-auto.max-w-board`, and `A.btn.btn-primary` ("Jisajili") sits over the info button — not the claimed Jisajili-over-HAPANA / ghost-over-NDIO pairing.
```

### 🟡 UNSEEN-12 · Filter-strip chips lose three of the four sides of their focus ring to the strip's own horizontal scroller

- **Condition:** Keyboard focus, and the reduced-motion rendering
- **Where:** `/markets` · 360x780 · sw
- **State:** keyboard Tab focus (:focus-visible)
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** U9
- **What a player loses:** These chips are how a player narrows the board (Wazi 49 / Zinafunga leo / Mpya 35 / Inasubiri matokeo / Zote 52). A keyboard user tabbing across them sees at most a 2px vertical sliver on the right-hand cap of the current chip — the two long horizontal edges, which are what actually reads as a ring, are never painted. On the first chip even the left cap is cut, so the strongest signal left is a soft gradient that is easy to mistake for the strip's own fade.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/markets · 360x780 · sw · Tab focus (7 tabs). nav.kp-strip-fade [16,231.75,160,44], padding 0, border 0, clientHeight 44, scrollWidth 583, 5 chips, overflow-x/y = auto AND -webkit-mask-image linear-gradient(90deg,#000 calc(100%-24px),transparent) (globals.css:3133-3138, @media max-width:1023.98px). Chip "Wazi 49" [16,231.75,85.97,44], radius 999px (stadium, r=22, no straight vertical sides), :focus-visible outline 2px solid at offset 2px (globals.css:2021). Focused minus unfocused = 235 changed px, all in rows y=232..275, max 11/row; ZERO at y=228..231 and y=276..279; columns x=16..27 and x=90..105. Control summary "PANGA" [182,231.75,67,44], outline 2px at offset 2px (NOT 0): 56/59 px at y=228/229 and 59/56 at y=278/279 — full four-sided ring. Identical at 412x915 EN ("Open 49", 88.95 wide): 235 changed px, 0 above, 0 below. CAUSE CORRECTED: with overflow forced to `visible` the profile is unchanged (237 px, still 0 above / 0 below); only removing the MASK completes the ring (916 px, 254 above, 256 below). The scroller costs 2 px of ring, the mask 679. SIZE CORRECTED: production paints 235/916 = 26% of the ring; the top and bottom runs are cut to zero but BOTH end caps still paint bright blue with sheared flat ends (read at 3x and 6x) — so "three of the four sides" is wrong; "the ring's two horizontal runs, ~74% of its painted pixels" is right. outline-offset:-2px restores a complete ring (534 changed px, all inside the chip).
```

### 🟡 UNSEEN-13 · At 360x500 the chat bubble lands on the /results Filter control and takes 3 of 6 taps across it, in both locales

- **Condition:** The on-screen keyboard (viewport shrunk to 360×500)
- **Where:** `/results` · 360x500 · sw and en
- **State:** keyboard proxy: search field focused and typed into, viewport shrunk 780 -> 500, scrollY 0
- **Severity:** minor · **Extends:** D3 · **Suggested owner:** U22
- **What a player loses:** This is the D30 failure a player already reported — reaching for a control and getting the chat instead — on a surface D30's fix cannot reach. D30 was closed by giving `.kp-rail` a z rung while its menu is open; the filter trigger is ordinary page content with no such lever, so the same bug is still live here. A player who has just typed a query and wants to narrow it taps the right side of the Filter pill and gets a chat panel over their search.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
Reproduced to the decimal on https://www.50pick.tz, but the stated CONDITION is causally wrong and the tap figure is over-stated.

WHAT MATCHES (my probe, scripts/.probe-refute-1.mjs, /results, 360 wide, sw and en):
- `.kp-fsheet-trigger` x=209.9..344, y=359..403, h=44, w=134.1 sw ("Vichujio") / 122.1 en ("Filter") — identical at every height I drove.
- Chat bubble `.cm-bubble`, fixed z-index:60 wrapper, 52x52. At h=780: x=292..344, y=648..700, overlap 0. At h=500: y=368..420, rect overlap 52 x 35 = 1820px^2 = 30.9% sw / 33.9% en.
- Six-point midline hit line at x-fractions 0.1/0.3/0.5/0.7/0.85/0.95: TRIG,TRIG,TRIG,BUBBLE,BUBBLE,BUBBLE at 500; all six TRIG at 780.

CORRECTION 1 — the keyboard proxy contributes NOTHING. I ran the shrink with the search box never focused and never typed into: byte-identical result (1820px^2, 30.9%/33.9%, same three BUBBLE hits). And at 360x780 WITH "prem" typed: overlap 0, all six TRIG. The trigger is at y=359 in all four cells. The only operative variable is layout-viewport HEIGHT. "search field focused and typed into" is decoration in the stated condition.

CORRECTION 2 — it is a narrow height BAND, and 500 is not the worst cell. Sweeping h = 400,420,440,460,480,500,520,535,540,560,600,640,700,780 at 360 sw: overlap is 0 at h<=420, 52px^2 at 440, then 1092 (18.5% rect / 14.4% hit-tested) at 460, 2132 (36.1% / 32.3%) at 480, 1820 (30.9% / 26.9%) at 500, 780 (13.2% / 8.9%) at 520, and 0 from 535 upward. Band = layout-viewport heights ~439-535 (the bubble is bottom:80, so it spans y = H-132..H-80). 360x480 is worse than the cell reported.

CORRECTION 3 — the rect over-counts and "3 of 6 taps" over-states further. The bubble is a circle, so its rect is not its hit area. A 3px-grid `elementFromPoint` scan of the whole trigger box returns the bubble on 166 of 616 points = 26.9% sw, and 166 of 560 = 29.6% en — not 30.9/33.9. The six-point sample puts three of its six probes inside the right 30% of the control, so "3 of 6" is a sampling artefact; the honest figure is ~27-30% of the control's tap area.

CORRECTION 4 — "keyboard" does not hold on today's production browser. Production serves `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover">` — no `interactiveWidget`, so Chrome on Android uses `resizes-visual`: the soft keyboard does NOT shrink the layout viewport, the fixed bubble stays at y≈648 of the 780 layout viewport and ends up BEHIND the keyboard, not on the pill. A Playwright `setViewportSize` shrink models a LAYOUT-resizing engine — older WebViews, some in-app browsers, and the planned Capacitor shell (the plan's own U22 states this). The band is still reachable without a keyboard: any 360-wide layout viewport 439-535px tall, e.g. Android split-screen/multi-window.

CORRECTION 5 — it does not generalise to the control class. /markets at a native 360x500 in both locales: the same `.kp-fsheet-trigger` is the Compact icon-only one at x=299..344, y=231.8..275.8, bubble at y=368..420, overlap 0, 0 of 196 scan points bubble. So this is /results-specific at 360, not "the filter trigger".

WHAT THE PICTURE ADDS (and the reporter under-stated). Crops read with the Read tool at 360x500 in both locales: the bubble is drawn solid across the right end of the pill. Per-child coverage at h=500 sw: leading filter icon (x=224.9..239.9) 0% covered; label span (x=251.9..303, 51.1px) 22% covered — 11px, the final "o" of "Vichujio" / the "r" of "Filter", visibly eaten in the crop; trailing caret svg (x=315..329) **100% covered**. The reporter said "covering its chevron" — that is right and the caret figure is 100%, which the trigger's own rect cannot see.

MY OWN INSTRUMENT CAVEAT: my `labelPxUnderBubble` reported 11px at EVERY height including 780, because it compared x-extents only and ignored the y axis. It is meaningful only inside the 439-535 band. The sweep is what exposed it; I am not reporting it outside the band.
```

### 🟡 UNSEEN-14 · The /results outcome count is clipped by the viewport at 130%, so "HAPANA 110" paints as "HAPANA 1" — a truncated numeral that still reads as a valid, smaller number

- **Condition:** Large text (Android/browser scaling 1.3)
- **Where:** `/results` · 360x780 @ zoom 1.3 (277 layout); reproduced at 277x600 native (+10 units) · sw only — EN is clean (body 277/277, nothing past the edge)
- **State:** browser/Android text scaling 1.3
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** U9
- **What a player loses:** This is worse than a cut label because the survivor is still a plausible number: a player reads the settled board as 69 YES against 11 (or 1) NO when it is 110. Nothing signals truncation — no ellipsis, no fade — and the page cannot be scrolled sideways to check.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/results, sw, `div.flex.flex-col.leading-tight.font-mono > span.whitespace-nowrap` (the OutcomeDonut legend, `results/page.tsx:324-331`). The line is `NDIO 69 · HAPANA 110`, `whitespace-nowrap`, JetBrains Mono 10px, right-anchored by the parent `flex items-center justify-between`. Character-level Range walk over EVERY text node (React splits `{word} {n}` into three nodes — a single-node walk reports nothing, which is why my first pass came back empty):

360x780 sw, zoom 1.3 — line left 217, right 373.1, **13.1px past the 360 viewport**; per-character advance **7.8px** (the claim said ~8.5). Painted whole: `NDIO 69 · HAPANA 1`. The second `1` gets 2.5px of its 7.8 (a sliver of the stem). The `0` is entirely off. `html`/`body` compute `overflow-x: clip` (globals.css:924/934), `scrollingElement.scrollWidth - clientWidth = 0` — the user cannot pan to it.

277x600 sw native, no zoom — right 287, **+10.0px**, advance 6.0px, painted `NDIO 69 · HAPANA 1`, lost `10`. Identical outcome with the zoom property absent, so the `style.zoom` instrument is not what creates it.

Zoom sweep I ran that the claim does not have (three widths, sw, same page instance):
- **360**: clean to 1.25 (over −1.3) → **1.3: over +13.1, paints `HAPANA 1`, loses `10`** → 1.4: over +41.8, paints `HAPAN`, the whole number gone → 1.5: `HA`.
- **320: the onset is 1.15, not 1.3** — over +10.0, paints `HAPANA 1`, loses `10`; at 1.2 over +24.4 and the entire count is gone (`HAPANA`); at 1.5 only `NDIO 69` survives.
- **412**: clean through 1.4; first break at 1.5 (+18.5, `HAPANA 1`).
- 320 sw at 100%: over −16, `NDIO 69 · HAPANA 110` complete.
- 360 en at 1.3: legend right 339.2 on a 360 viewport, nothing past the edge — EN clean, as claimed.

Magnified 6x crops read: `…O 69 · HAPANA 1` + stem sliver at 360/1.3, and `NDIO 69 · HAPANA 110` whole at 320/100%. Picture and numbers agree.
```

### 🟡 UNSEEN-15 · Market-card category chips lose 82% of their word at large text: "UTAMADUNI" becomes "UTAMA..." at 360 and a single letter "U..." at 320

- **Condition:** Large text (Android/browser scaling 1.3)
- **Where:** `/markets and /` · 360x780 @ zoom 1.3 (277 layout) and 320x780 @ zoom 1.3 (246 layout) · sw (measured); the chip vocabulary is localised so EN words are shorter
- **State:** browser/Android text scaling 1.3
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** U24
- **What a player loses:** The chip is how a player tells a football market from a politics market at a glance on a dense board. A one-letter chip followed by an ellipsis carries no information at all, and it sits in the row that already spends its space on two other chips. The plan's own rule (DG-P-08) forbids reaching for truncation as a fit strategy.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/markets and / (home board), locale sw, `.mcardp-cat` on `.mcardp-top` (a `flex-wrap: nowrap` row, `globals.css:4077`), production www.50pick.tz, 2026-09-23.

REPRODUCED TO THE PIXEL. `.mcardp-cat` clientWidth by effective layout width, card 0 ("Utamaduni", scrollWidth 67 at every rung): 412 -> 67 whole · 360 -> 67 whole · 320 -> 67 whole · 277 -> 43 (24px clipped) · 246 -> 12 (55px clipped). Screenshots agree with the numbers, read with the Read tool: the crop at 360 @ `documentElement.style.zoom = 1.3` paints `UTAMA…`, the crop at 320 @ zoom 1.3 paints `U…`. No instrument lie — the picture and the box agree.

BUT THE DEFECT IS NOT WHAT THE TITLE SAYS. Three corrections, each measured:

1. NOT ONE WORD, AND NOT ABOUT WORD LENGTH. The slot is clamped to the SAME 43px at 277 and 12px at 246 on every affected card: "Michezo" (52px) -> `MICHE…` / `M…`, "Nyingine" (59) -> `NYING…` / `N…`. 8 of 15 cards on /markets, 1 of 4 on the home board. The correct statement is "the category slot collapses from 52-89px of content to 12px", not "UTAMADUNI loses 82% of its word".

2. THE LOCALE ATTRIBUTION IS BACKWARDS. The finding says "the chip vocabulary is localised so EN words are shorter". I drove EN at the identical 277 and 246: 0 of 15 cards cut — CULTURE 52/52, SPORTS 44/44, OTHER 37/37, all whole. The cause is the STATUS chip, not the category word: `MUBASHARA` 83.1px vs `LIVE` 42.5, `MOTO` 56.5 vs `HOT` 45.7 — the two leading chips cost 139.6px in SW against 88.2 in EN, a 51.4px difference, and `.mcardp-cat` is the only item in the row with `min-width: 0`, so it absorbs 100% of the deficit while neither chip gives a pixel back (both measure identically at 412 and at 246).

3. "CREATED ENTIRELY BY THE TEXT SCALE" IS FALSE. At 320 SW with ZOOM 1.0, changing only the signal word from `MOTO` to `INASOGEA` — the product's own SW `tipping` label, `i18n-dict.ts:3299`, emitted whenever `volume > 0 && |yesPct-50| <= 3` on a live market (`market-card.tsx:124`) — cuts "Utamaduni" by 8px (59/67) on /markets and on the home board, painting `HALI YA…` in the planted crop. True free space on the tightest row served today is 21.8px at 320 SW (rowClient 256, used 234.2), while the SW signal vocabulary alone spans 27.1px (MOTO 56.5 -> INASOGEA 83.6). The row is already under-provisioned for its own dictionary; today's 15 markets all happen to carry the 4-letter MOTO.

INSTRUMENT NOTE: with the plan's own prescribed emulation (§11 line 1514, `documentElement.style.zoom = 1.3` at a real 360/320 viewport) the numbers are 45 and 14 CSS px, not 43 and 12 — the box is 58.2 / 18.2 device px. The examiner used bare 277/246 viewports instead; both agree here only because no breakpoint sits below 320 (`(max-width: 559px)` true at both, `(max-width: 319px)` false under zoom).
```

### 🟡 UNSEEN-16 · The sort trigger shrinks to 27px and its own word is cut to three letters — "PAN" in Swahili, "SOR" in English

- **Condition:** Overlays, sheets and menus
- **Where:** `/markets` · 320x640 · sw
- **State:** portrait, guest, the control line in its resting (closed) state; identical in en
- **Severity:** minor · **Extends:** D18 · **Suggested owner:** U9
- **What a player loses:** A player scanning a 49-market board for the sort control sees a 27px stub reading PAN (or SOR) with a circle overlapping its last letters, and has to hit a 27px-wide target to open a six-row menu. In Swahili — the default locale — "PAN" is not a word; the control stops naming itself. The register recorded this control's failure as the active VALUE being clipped; after U4 the value is hidden and it is the control's own label that is cut, so the row is describing a symptom that no longer exists while a worse one is live.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
Production https://www.50pick.tz/markets, 320x640, locale sw, guest, DEFAULT (Compact) density, control line resting/closed. `scripts/.probe-refute-1.mjs` and `-3.mjs` (my own, untracked).

SW 320: `<summary aria-label="Panga masoko">` box x=182→209, 27x44; `clientWidth 26` vs `scrollWidth 61`; `overflow-x: visible`, padding 6/6, gap 4. Key span (`Panga`, 10px mono, uppercase, `flex-shrink: 0`) paints 189→226 = 37.0px — its Range rects and its element box agree, one rect, one line — so it runs 17.0px past the summary's own right edge of 209, which is exactly where the 44x44 direction link (`aria-label="Imepangwa kushuka"`, 209→253, opaque `bg-bg-inset`, later in DOM order) begins and paints over it. `overflow: visible`, `text-overflow: clip`, `white-space: normal` — no ellipsis anywhere.
EN 320: "SORT" 189→218.6 = 29.6px, 9.6px past 209, `scrollWidth 54` in `clientWidth 26`. Same box, same geometry.
Value span `.kp-menu-value` ("Pesa nyingi" / "Biggest pool"): `display: none`, 0x0 — confirmed, and the string is instead on the count line below, `[data-count-sort]` inside "masoko 49 · Pesa nyingi" at y=277.8.
Row at 320: strip nav 16→176 (160px, its own floor), sort 182→209, direction 209→253, filter trigger 259→304. Document `scrollWidth === clientWidth === 320`, so no overflow gate can see it.
360 SW is CLEAN: summary 67px, `scrollWidth 66 === clientWidth 66`. 320-only.

TWO CORRECTIONS to the claim. (1) The sliced letter in SW is the N, not the G. 37px/5 chars ≈ 7.4px per glyph against a 20px content box (189→209) = 2.7 glyphs: "PA" whole, "N" cut by the direction button's left border, "GA" not painted at all. 6x magnification of my own crop reads P-A-N then the divider. EN "SOR" with the R cut and the T gone is exactly right. (2) The claim understates it — it never mentions the CARET. The chevron sits at 230→244, i.e. 21px past the summary edge and wholly buried under the direction button, so the trigger shows neither a whole word nor any affordance that it opens a menu; it is a 27px stump reading "PAN".

Stability checked against the "measured too early" trap: identical after `document.fonts.ready` + 5s, and identical again with the bar in its sticky state after scrolling 600px.
Hit test: `elementFromPoint` at y=254 gives the summary's key span at x=203, and the direction `<a>` at x=215 and x=221 — so the overflowing 17px is not part of the sort trigger's hit area either. Trigger tap width 27px against this repo's `--tap-min: 40px` (globals.css:310) — 13px under, on the horizontal axis; same class as registered D28.

Coverage: /markets x {320x640 sw, 320x640 en, 360x780 sw} + one deep re-drive at 320 sw with fonts-ready, scrolled-sticky and a forced `data-density="comfortable"` state = 4 production page loads; crops read at 1x and at 6x (magnified locally, no extra load).
```

### 🟡 UNSEEN-17 · The rail More menu and the language menu have no scrim: the tap that dismisses them also fires the control under the finger

- **Condition:** Overlays, sheets and menus
- **Where:** `/markets` · 320x640 · sw
- **State:** portrait, guest, menu open, single tap on page content outside the panel
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** U33
- **What a player loses:** Tapping away is how a phone player closes a menu — there is no visible ✕ on either panel. Here that gesture costs them the page: they open Zaidi, decide against it, tap the board to dismiss, and land on a market detail page they never chose, losing their scroll position on a 49-card board. The product's own `<Modal>` and `.kp-fsheet` both ship a scrim that absorbs this tap; the two menus that a guest meets most often do not.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
320x640 sw /markets, guest, rail "Zaidi" menu open (panel x=98.2 y=315 w=209.8 h=253, 4 rows): one REAL TOUCH tap (CDP `Input.dispatchTouchEvent`, not synthetic mouse) at (47,469) on `a.mcardp-open` both closed the menu (`aria-expanded` -> false) and navigated `/markets` -> `/markets/mkt_78acfcce86564e4e5a48`. Same at 360x780 sw (panel x=138.2 y=455 w=209.8 h=253). Language listbox: same tap-through at both widths (listbox 196x142 at x=125.8 320 / x=13.8 360). NEW, and the claim's main omission: the discovery bar's SORT menu ("Panga masoko", shared `MenuShell`, listbox x=100 y=307 w=220 h=274) does it too — 7 components share the scrimless outside-click pattern. Scrim scan while any of them is open: `[]`; `document.documentElement`/`body` overflow `clip visible` (unlocked) — both confirmed. THE DISCRIMINATOR the original lacked: the filter sheet on the same page and width DOES carry `.m-scrim.kp-fsheet-scrim.bg-black/60` (`position:fixed`, `pointer-events:auto`), and with it open no link is hit-testable at all, so its dismissing tap is absorbed. EXPOSURE, which the original did not quantify: of 1287 sampled points outside the open panel at 320, 480 (37.3%) hit-test to an interactive control and 284 (22.1%) to a link; only 27 (2.1%) are NDIO/HAPANA card controls, and none of them commits money as a guest. Safe dismissal exists: re-tapping the 64x64 trigger closes with no navigation. Scroll sub-claim: reproduces with `mouse.wheel` only (0 -> 400, panel pinned at 98.2/315, menu open); touch scrolling did not move the page even with the menu closed, so that instrument is mine, not a site behaviour.
```

### 🟡 UNSEEN-18 · The language listbox flips away from the left edge and then runs off the right one, where body overflow-clip slices its border

- **Condition:** Overlays, sheets and menus
- **Where:** `/` · 320x640 · sw
- **State:** portrait, guest (the trigger's x depends on how many controls precede it, which is an auth-state-dependent geometry)
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** U33
- **What a player loses:** Small, and honestly so: 1.8px of border and one rounded corner. But the panel's top-right corner is squared off against the screen edge while its top-left is rounded, so on the narrowest supported phone the language menu reads as running off the screen — on a platform whose default language is Swahili and whose players use this control to leave English.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
Production https://www.50pick.tz/, guest, portrait, my own probes `scripts/.probe-refute-lang-1.mjs` (Playwright via `localisedContext`/`assertLang`) + `full-*.png` pixel reads.

320x640 **sw** — every number the claim gave is right, to the sub-pixel:
- trigger `<summary>` **44.00 x 44.00 at x=125.75** (right=169.75); cluster is `[LanguageMenu, "Ingia", "Jisajili"]`, guest.
- I caught the flip frame by frame: frame 0 = `right-0`, panel **x=-26.25 .. 169.75**; frame 1 onward = `left-0`, panel **x=125.75 .. 321.75**, w=196 (`min-width: 196px`).
- innerWidth = clientWidth = 320, so **overflow right = 1.75px** (claim said 1.8). `documentElement.scrollWidth - clientWidth = 0`, `body`/`html` are both `overflow-x: clip`, and `window.scrollTo(400,0)` leaves `scrollX=0` — nothing reveals it.
- code column ends at **x=304.75** (claim 304.8), so no text is lost in sw.

**The picture agrees with the numbers, and adds the part the claim only half-stated.** Reading the 320-wide viewport PNG column by column at the panel's right edge: at y=80 columns **x=312..319 are all `rgb(7,4,90)` — panel fill, to the last column**; at y=130 all `rgb(16,26,105)` (the selected SW row). The control at 360 shows the border exactly where it should be: fill to x=207, then **x=208 `27,25,106` / x=209 `33,52,128` (the 1px border), x=210 `2,0,43` page bg**. So at 320 the panel's **entire right border stroke is missing down its full 142px height**, and the panel bleeds into the screen edge. The top of the top-right curve does survive (border pixel at x=317, y=57, same 4.75px-from-right offset as the 360 control), so "its corner radius is gone" is slightly overstated — what is gone is the border stroke plus the outer 1.75px of both right corners.

**WHERE THE CLAIM IS WRONG: it is much bigger than 1.8px, in a locale it never drove.** Same route, same 320x640, same guest state:
- **zh: overflow right = 19.86px.** Trigger at x=143.86 (shorter CTAs 登录/注册), right-anchored would be x=-8.14 → flip fires → panel **143.86 .. 339.86** in a 320 viewport. The code column now runs **309.66 .. 322.86**, i.e. **2.86px of every code glyph is sliced by the viewport** — not just the border. Confirmed in pixels (ink at x=317/318/319, `92,109,171`) and in the crop, which reads "EN" with the N cut, "SW" with the W cut, "ZH" with the H cut. So this is a content clip, not only a chrome clip.
- **en: clean** — trigger at x=105.67, panel 105.67..301.67, **18.33px of slack**. English is the one phone locale where you cannot see this at all.
- sw 360x780: clean, stays `right-0` at 13.75..209.75 (claim's numbers exactly). sw 412x915: trigger right=261.75, right-anchoring lands at x=65.75, no flip, fits.

Mechanism, checked in source: `language-menu.tsx:71` is `if (r.left < 4) setAlign("left")` — the only test is the LEFT edge, and `left-0`/`right-0` both anchor to the 44px trigger, so at 320 there is no anchor that fits a 196px panel and it overflows whichever way it picks. A viewport clamp (or letting the 196px floor go — the widest row content measures ~140px) is the fix, not a wider flip.

**And the gate for this cannot fail.** `scripts/overlay-responsiveness-test.mjs:88-101` has a "3a language menu inside viewport" case, and its `rectFitsViewport` does test `okRight` (2px tolerance — which would have caught 1.75 in sw only by luck, and 19.86 in zh easily). But it looks for `button[aria-label^="Language:"]` and `div[role="menu"][aria-label="Language"]`. The shipped control is a **`<summary>`** whose aria-label is "Switch to {lang}" / "Badilisha kwenda {lang}" / "切换到 {lang}" (`i18n-dict.ts:459,3093,5239`), and the panel is **`role="listbox"`**. Neither selector can match, so the `else` branch runs and logs **`true` with "language toggle not visible (acceptable on small screens)"** — the happy path is the absence branch. It also runs only at 393x667 and is not wired to any npm script.
```

### 🟡 UNSEEN-19 · At first paint every route puts the 18+ licence footer inside the viewport, then throws it off screen: CLS 0.159-0.184 against the plan's own ≤0.05

- **Condition:** Slow network + slow CPU (400 kbps, 400 ms RTT, CPU 4×)
- **Where:** `/ , /markets , /results (byte-identical shift on all three)` · 360x780 · sw
- **State:** cold load, slow 4G (400 kbps, 400 ms RTT) + CPU 4x, signed out, full motion
- **Severity:** minor · **Extends:** D26 · **Suggested owner:** U25
- **What a player loses:** The first thing a player on a slow connection sees of 50pick, for about a second, is a spinner box with the 18+ gambling-licence block sitting under it as if that were the page. Then the whole screen jumps. On a money product the first impression is an empty box and a legal disclaimer, and a thumb already moving toward something at y=700 lands on whatever the 4.5x growth has just slid under it.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
360x780, sw, signed out, cold load, slow 4G (400 kbps / 400 ms RTT) + CPU 4x, my own probe (PerformanceObserver layout-shift buffered:true via addInitScript + a rAF geometry poller + screenshots):

/        CLS 0.1594 = one shift 0.158974 (footer.mt-8.lg:mt-12.bg-bg-elevated/40, previousRect {x0 y656 w360 h124} -> currentRect {0,0,0,0}) + 0.000409 (header auth buttons x172 -> x166)
/markets CLS 0.1594 = the SAME 0.158974 footer shift, same rects to the pixel, + the same 0.000409
/results CLS 0.1838 (two independent runs, identical) = the same 0.158974 footer shift + 0.023721 + 0.001062

Geometry, polled: / main 520 -> 6032px, document 1593 -> 7104px, footer y 656 -> 6168 (abs). /markets 520 -> 4247 -> 4935. /results 520 -> 2350 -> 3302. The footer's real height is 936px; the 124 in previousRect is the viewport clip (780 - 656), which the claim words correctly.

Same cell WITHOUT throttling: CLS 0.0000, zero layout-shift entries, although the identical geometry change still happens (main 520 -> 6032 at t=886 -> 994 ms).

Picture read: .probe-refutecls/home-sw-t003000.png and mkt-sw-t006000.png both show the generic empty loader panel with the "18+ 50pick" licence block painted across the bottom of the 780px viewport, partly behind the rail. Picture and numbers agree.
```

### 🟡 UNSEEN-20 · /results paints its list and filters before its own title row, and the whole page snaps 24px upward when the title arrives

- **Condition:** Slow network + slow CPU (400 kbps, 400 ms RTT, CPU 4×)
- **Where:** `/results` · 360x780 · sw
- **State:** cold load, slow 4G (400 kbps, 400 ms RTT) + CPU 4x, signed out
- **Severity:** minor · **Extends:** D26 · **Suggested owner:** U25
- **What a player loses:** This is content arriving in the wrong order made visible: the results list and the filter tabs render before the page's own title and NDIO/HAPANA summary, and the reader gets a second jolt after the big one. Anyone who has started reading the first result, or is reaching for the 'Zote 210' tab, has the target move under the thumb. It also means the structural `space-y-*` idiom is unsafe anywhere a first child can stream in late — a class of bug, not one number.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/results · 360x780 · sw · cold load, 400 kbps / 400 ms RTT + CPU 4x · signed out.

SHIFT (reproduced, not accepted): un-input layout shift **0.0237**, single source `div.space-y-5`, previousRect {x 16, y 144, w 328, h 636} -> currentRect {x 16, y 120, w 328, h 660}. Route un-input CLS total **0.1838**. Two independent runs (t = 26,146 ms and t = 14,449 ms) returned the value to four digits and all eight rect numbers identically. U25's accept line is "CLS <= 0.05 per route, and no single shift > 0.02" — 0.0237 breaks it on its own.

CAUSE, isolated rather than inferred (the examiner's "intermediate stream state ... first child has display:none" is the right effect with the wrong name): the first element child of the container in the fallback state is React's Suspense boundary marker `<template id="B:1">`. It is in the raw streamed HTML from the first bytes — a plain fetch, no browser, no throttling, returns `<div class="space-y-5"><!--$?--><template id="B:1"></template><div class="flex items-center justify-between gap-3">`. The shipped rule is `.space-y-5 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(24px * ...) }`; a `<template>` has computed `display:none` from the UA sheet but no `hidden` ATTRIBUTE, so it satisfies `:not([hidden])`, hands the skeleton's first band a 24px margin-top, and that margin collapses out through the container's own top edge.
A/B on the pinned fallback (stream truncated so the boundary never resolves; identical markup, only the 30 characters `<template id="B:1"></template>` deleted): container top **144 -> 120 px**, skeleton header top **144 -> 120 px**, first band computed margin-top **24px -> 0px**. Delta exactly 24.0px, and with the template gone the fallback container top equals the settled container top (120), so this shift entry does not exist at all.

TITLE IS WRONG. Nothing snaps 24px upward as a page. Measured band by band across the swap at 360 sw: band 1 (MATOKEO header) 144 -> 120 = **24px UP**; band 2 (search) 192 -> 182 = **10px UP**; band 3 (kp-discovery-bar) 260 -> 297 = **37px DOWN**; band 4 (grid) 400 -> 437 = **37px DOWN**. The CLS entry names only `div.space-y-5` because every child was removed and replaced, and removed/inserted nodes never score — so 0.0237 is scored on a container box, not on 636px of content sliding. The 24px is a genuine first-paint offset of the top band; the "whole page" part is not measured and is false.

SCOPE: /results only. The same `class="space-y-N"` + first-child suspense template pattern is absent from /, /markets, /live and /proposals (raw HTML, sw).
```

### 🟡 UNSEEN-21 · 404 at 320x640: the page says "choose where to go below" and not one of its three destinations is usable — the first is 30px of 101px above the bottom rail, the other two are off-screen

- **Condition:** Routes this programme had never captured
- **Where:** `/ (any non-existent path; requested /this-route-does-not-exist-rtn2)` · 320x640 · sw
- **State:** portrait, short screen, at rest, signed out, scroll position 0
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** U26
- **What a player loses:** A 404 has one job: get the player somewhere. On the smallest common phone this one tells them to choose from a list they cannot see, and the only thing within reach at rest is the sliver of one card that the rail is sitting on — which reads as a cut-off box rather than a choice. A player who lands here from a stale link or a resolved-market link sees a dead end.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/this-route-does-not-exist-rtn2 (HTTP 404), 320x640, locale sw (html lang=sw), signed out, portrait, at rest, scrollY=0, reduced motion. Viewport 320x640, document scrollHeight 1998. Fixed nav.kp-rail: y=575, h=65 — so the visible fold is 575, not 640. Three recovery cards 272x101.5: Mwanzo (/) y=544.5, Masoko (/markets) y=656, Msaada (/help) y=767.5 → card 1 shows 30.5px of 101.5 (30%) above the rail, cards 2 and 3 are entirely below the viewport; the crop shows only a bare rounded border, no icon and no label. elementFromPoint(160,560) = that card's own <a href="/">, i.e. the 272x30.5px strip IS tappable (below the 40px --tap-min in visible height, not obscured). Same cell in en: card 1 at y=523.4 → 51.6px (51%) visible and its 40px icon plate readable. Also on screen at rest, unscrolled: rail targets 64x64 at y=576 (/markets, /updown, /live, /results, More) and the header logo link to / at 26x44, y=5.5 — Home and Markets are one tap away without scrolling. Secondary CTA "TAZAMA MASOKO YALIYO WAZI" 251.5x15 at y=901 (15px against --tap-min 40px) — already recorded as S12-06. Above card 1: header + live ticker ≈ 0..95, mark/badge void 95..316, eyebrow y=316 h=14, h1 y=342 h=70, hint paragraph y=428..512.5 (4 lines) — decoration is ~221px, not 544.
```

### 🟡 UNSEEN-22 · /auth/register: the date-of-birth inputs carry English accessible names "Day", "Month", "Year" on a page served lang="sw"

- **Condition:** Routes this programme had never captured
- **Where:** `/auth/register` · 320x640 and 360x780 · sw
- **State:** portrait, signed out — screen reader / assistive announcement
- **Severity:** minor · **Extends:** (new) · **Suggested owner:** new
- **What a player loses:** A Swahili-speaking player using TalkBack hears the whole form in Swahili and then three English words at the one field that decides whether they are allowed an account. It is the same class as D39 (the raw YES/NO enum surviving into SW copy) on a surface the programme had not opened.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
/auth/register, 320x640 and 360x780, locale sw, portrait, signed out. `assertLang` passed (`<html lang="sw">`). Chrome's OWN accessible-name computation (CDP `Accessibility.getFullAXTree`, not the attribute) returns for the three date-of-birth segments: textbox "Day" (nameFrom attribute[aria-label], placeholder DD), textbox "Month" (MM), textbox "Year" (YYYY). All three are painted and focusable — 25x24, 25x24 and 46.1x24 at x=64 / 106.6 / 149.1, y=697.6 at 320 and 679.6 at 360 — tabIndex 0, no aria-hidden ancestor. Every other computed name in the same form is Swahili: "SIMU +255 Tarakimu 9 …", "ANWANI YA BARUA PEPE …", "NENOSIRI Onyesha nenosiri Angalau herufi 8.", "THIBITISHA NENOSIRI …", "Fungua kalenda", "Ninathibitisha nina miaka 18+.". 3 of 3 segments, at both viewports.

WIDER THAN CLAIMED, two ways:
(a) It is not a Swahili gap — it is a hardcoded constant. Same run at 360x780 locale **zh** (`<html lang="zh">`) yields textbox "Day" / "Month" / "Year" sitting among "手机号…", "邮箱地址…", "密码 显示密码…", "打开日历". Source: `F:\kipindi-main\src\components\ui\date-mask.ts:20-24` — `SEGMENTS = [{ ph:"DD", aria:"Day" }, { ph:"MM", aria:"Month" }, { ph:"YYYY", aria:"Year" }]`, the only aria strings in that component not read from `t.common` (`date-select.tsx:278` `aria-label={seg.aria}` vs `:295 t.common.openCalendar`, `:343 t.common.pickDate`, `:364 t.common.prevMonth`). Same component also renders on `/profile/kyc` and `/proposals/new` (signed-in, not drivable read-only) and in the admin `DateTimeRangeFilter`.
(b) The English word is not the whole loss. Because `aria-label` outranks the associated `<label htmlFor="dob">`, the Day segment's name is "Day" ALONE; the AX name-source list shows the label it displaces reads "TAREHE YA KUZALIWA Month Year Fungua kalenda Lazima uwe na miaka 18+." Every other field on this form keeps its Swahili field name AND its hint inside the name. So on the DOB field a screen-reader user hears neither "Tarehe ya kuzaliwa" nor the 18+ requirement — on the one field that exists to enforce 18+.

ONE CORRECTION AGAINST THE CLAIM: "the only three elements on the page whose aria-label matches an untranslated English term" is not exact. Scanning all 29 `[aria-label]` elements at both widths found a fourth English one — `div aria-label="YES probability 64%"` — which sits in an aria-hidden subtree and measures 0x0, so Chrome drops it from the AX tree and nothing announces it. "Only three" is true of announced names, not of the DOM.
```

### ⚪ UNSEEN-23 · The bottom navigation rail ellipsises its labels at 130% on every route in both locales — "Mubashara" -> "Mubash...", and a third label goes at 320

- **Condition:** Large text (Android/browser scaling 1.3)
- **Where:** `/ , /markets , /results , /leaderboard , /help — all five` · 360x780 @ zoom 1.3 (277 layout); worse at 320x780 @ zoom 1.3 · sw and en both
- **State:** browser/Android text scaling 1.3
- **Severity:** cosmetic · **Extends:** (new) · **Suggested owner:** U24
- **What a player loses:** This is the permanent, five-item primary navigation — the only way a phone player moves between the board, live, results and Up & Down. The rail is also where the plan has already spent work (D30), so it is the surface a fix is cheapest on. Small in pixels, but it is the one component present on every screen, in both languages, at every width once the font is scaled up.

**The verifier's own measurement** (it re-drove production; where it differs from the examiner's claim, this is the number that stands):

```
`.kp-rail__label` (`src/app/globals.css:5176`) is 11px JetBrains Mono with `max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`, in a `repeat(5, minmax(0,1fr))` grid (`bottom-nav.tsx:130`). Label content widths are locale-fixed at 11px: Masoko 44 · Juu/Chini 63 · Mubashara 63 · Matokeo 50 · Zaidi 37; Markets 50 · Up & Down 63 · Live 30 · Results 50 · More 30. Slot = 64px at 320, 72px at 360, 82.4px at 412.

THE THRESHOLD IS NOT 130%. At 320 SW the two longest labels are 63px inside a 64px slot — 1px of headroom — so the ellipsis is painted at **102%**, the first step above Android's default: SWEEP-320-m1_02.png reads "Masoko | Juu/Chi… | Mubasha… | Matokeo | Zaidi". At 130% it is three labels: "Juu/C… | Mubas… | Matok…", overflow 17/17/0px.
At 360 SW headroom is 9px: whole at 100/102/105/110%, painted cut at **115%** ("Juu/Chi…", "Mubasha…") — where `scrollWidth − clientWidth` reads 0 (72/72) and the crop disagrees; at 130% "Juu/Ch…" / "Mubash…", +9px.
At 360 EN only "Up & Down" goes, at 130%, painted "Up & D…" (not "Up & Do…"), +9px.
At 412 SW every label is whole through 130% in both instruments and in the crop.
Identical on /, /markets, /results, /leaderboard, /help — one shared component (`bottom-nav.tsx:150`), so one condition, not five findings.
Unaffected: `aria-label` carries the FULL label on every item (read back live: aria="Mubashara", "Up & Down"); the 20px icon, the 64px `.kp-rail__item` tap slot, the bar height, the viewport bound. Nothing overlaps, nothing wraps to a second row, no node crosses the viewport edge.
```

---

## §2 — Refuted, and why — so they are not filed again

⛔ **These are NOT defects.** Each was claimed by an examiner and then killed by a verifier that re-drove production. The reason is kept
in full, because the most expensive thing a campaign like this can do is re-discover a non-defect every few sessions.

### ⚪ /auth/register: the date-of-birth inputs carry English accessible names "Day", "Month", "Year" on a page served lang="sw"

- **Condition:** Routes this programme had never captured · claimed `/auth/register` 320x640 and 360x780

```
Refuted. I drove /auth/register at 320x640 sw and 360x780 sw myself with `localisedContext` + `assertLang` (kp-locale, HeadlessChrome UA), scrolled #dob into view, measured the rects, ran the same 1px `elementFromPoint` column, then did the one thing the original examiner did not do: I clicked.

1. The instrument lied by answering a different question. `document.elementFromPoint` reports what is PAINTED at a point, not what a tap does. The original turned "the topmost element here is a div" into "this focuses nothing at all". Clicking at +3px from the field top focuses `INPUT|Day|dob`; so does -3px from the bottom, so does the "/" separator, so does the legend, so does the hint. The `Field` helper wraps everything in an implicit `<label>` and `date-select.tsx` puts `id="dob"` on the Day segment precisely so that label has a control — there is a code comment dated 2026-08-21 recording that exact fix. `label.control === document.getElementById("dob")` is true. So the field's entry target is the whole 222 x 92px block, not 25 x 24.

2. The screenshot was read backwards. The crop shows one wide "DD / MM / YYYY" field that gives no hint the segments are separate targets. The original called that "exactly why the box measurement is misleading". It is the opposite: the field looks like one target and behaves like one target. A player taps it anywhere, lands on Day, and types 8 digits with auto-advance doing the rest. The picture and the click test agree; only the elementFromPoint inference disagreed, and it loses.

3. The superlative is false on the claim's own page. "The smallest controls on any of these fifteen routes" — the visible "Ingia" link on /auth/register is 30.6 x 16 (area 489, height 16) against Day's 25 x 24 (area 599), and "0800 11 0011" is 91.2 x 13. Registered D28 already records the card share control at 25-26 x 36-37 on every card of every board, so 25px wide is not new either.

4. The headline number is also slightly off: what a player sees as the field is the bordered 44px box (`--h-input` = 44, i.e. at the preferred floor), not 42. 42 is its inner content height inside the 1px borders — the claim measured the inner div and described it as the field.

5. Register check: grep of `^\| D[0-9]+ \|` in docs/MOBILE-VISUAL-PLAN.md returns D1-D54; none covers the DOB field or date-select tap size (D54 names `date-select` only for landscape safe-area ins
```

### ⚪ /auth/login: "UMESAHAU NENOSIRI?" is 14px tall — D48 records its colour and its wrong hint, not that it is a third of the tap floor

- **Condition:** Routes this programme had never captured · claimed `/auth/login` 320x640

```
I reproduced the NUMBER exactly (133.2 x 14 at x=137.8, y=684.8) on production in two drives via localisedContext/assertLang, and the cropped screenshot agrees with the instrument — the link is a dim, wide-tracked 10px mono microlabel with clear space all round, no collision, no clipping. So the measurement is sound. The finding is still not real as a finding, for two reasons.

(1) IT IS ALREADY RECORDED, and not only inside D48. `docs/MOBILE-VISUAL-FINDINGS-2026-09.md` — the 718-item record that §3a of the plan names as the register's evidence corpus, and which D-rows cite by S-ID (D28's row cites "S02-home-07, S03-03, S07-06") — holds this exact item twice:
  • S09-auth-code-8 (🟡 medium, category "link"), titled "'Forgot password?' link — /auth/login": "The only recovery route for a locked-out player is a 14px-tall target: 26px under the 40 floor... text-micro is 10px/14px line, so the tap box is ≈14px tall x ≈118px, sitting 8px under the password hint." Same element, same 14px, same floor comparison, same source lines (login/page.tsx:308-315).
  • S09-auth-02 (🟠 high, "link"): "Text links on the auth flows... all below the 40px floor: - 'FORGOT PASSWORD?' 118x14, 10px mono (login/page.tsx:311). The only recovery route from sign-in. - 'Create one' 69x16 (login :324)... - Trust-strip helpline tel: link '0800 11 0011' 91x13 at 10px."
That last line is the decisive one: the record already lists BOTH comparison controls the examiner offers as its own corroboration. The examiner's report is the English record re-measured in Swahili — 118 -> 133.2 because "UMESAHAU NENOSIRI?" is wider than "FORGOT PASSWORD?" The height, the font size, the 40px floor, the "only recovery route" framing and the two comparators are all already on the page it was supposedly extending. The plan's §3a summary also names the class outright: "link · card · icon · motion | 71 | sub-floor text links at money moments". So the title's premise — that the programme records the colour and the hint but not the tap floor — is false; D48's one-line summary omits it, but the programme does not.

(2) THE HEADLINE CLAIM IS WRONG ON ITS OWN EVIDENCE. "The recovery link is the shortest thing in the sign-in card by a factor of three" does not survive the ancestry check. I resolved the card: `.rounded-xl.glass-panel.p-6.space-y-5`. "Fungua akaunti" is inside that same panel (panel.contains = true) at 1
```

### ⚪ The chat bubble eats 42% of the usable content window in landscape and covers the HAPANA price button in the two-column grid

- **Condition:** Landscape (740/780/915 × 360–412) · claimed `/markets` 740x360 (and 780x360, where the fab sits at the same y=228..280)

```
REFUTED. Every number reproduces; both novel claims built on them do not.

1. "Eats 42% of the usable content window" is a height-over-height ratio presented as window consumption. A 1px-wide, 52px-tall element would score the same 42.3%. By area the bubble takes 2.97% of the window (2,704 of 91,020 px²), and my full-viewport screenshot shows exactly that: a disc in the right margin with the left ~85% of the window clear. The instrument produces 42.3% with no landscape defect in the bubble present — the bubble's absolute footprint (52x52, right:16, bottom:80) is byte-identical between the two cells. The only thing that moved is the denominator, and it moved because the sticky chrome takes 237 of 360px (65.8%) in landscape vs 197.3 of 780 (25.3%) in portrait — the discovery bar being TALLER at 740 wide (116px) than at 360 wide (76.3px). So the 42.3% measures the chrome and bills it to the bubble. If anything here deserves a line it is the chrome, and that is a different defect from the one claimed.

2. "Covers the HAPANA price button in the two-column grid" is a scroll-phase artifact, not a landscape or two-column property. The examiner sampled y=700 in both orientations. Sweeping 600..840 in 8px steps, PORTRAIT one-column is WORSE: 36x40 = 25.0% of its 144x40 button at y=720, against landscape's 23.5% max of a 153.5x40 button — portrait scores higher precisely because its button is narrower. The 36px horizontal bite is identical in both; only the vertical phase varies, and y=700 caught landscape at its worst phase (2 of 31 offsets reach full button height) and portrait at a middling one. The claimed "23.5% vs 15.8% in portrait" is picking the landscape maximum against a portrait sample that is not portrait's maximum.

So the finding reduces to exactly what its own "CLAIMED DUPLICATE OF" says: D3, the 52px bubble covering content — here a market card's NO-price label, clipped to "HAPANA @ 0". That clipping is real and picture-confirmed, but it happens in portrait too, by more, so it adds no condition the register does not already cover. D3's row already names the bubble covering card content, and the brief explicitly says not to report "the bubble covers X" unless X is a surface class the register does not name.

Severity: the claim reads as blocking ("eats 42% of the usable window"). The residual truth — a D3 instance clipping the % off a price label and ste
```

### ⚪ The sticky discovery bar restacks to two rows in landscape — 76.3px becomes 116px on a screen 420px shorter, with 420–595px of empty width beside the controls that forced the stack

- **Condition:** Landscape (740/780/915 × 360–412) · claimed `/markets and /results` 740x360, 780x360, 915x412

```
REFUTED — already in the register, in four places, with the exact remedy and the exact guard cells already written.

The examiner pre-empted only the 237px/65.8% total. But the decomposition they call new is registered verbatim: plan line 1899 `| Pinned chrome /markets | **237** = header 56 + discovery bar 116 + rail 65, in every phone cell and language — U1 | <= 201px |`, and line 572 says the same. "The bar is SHORTER in portrait" is U4's shipped acceptance row, line 278 and line 79: `bar **116 -> 76.25px**, pinned chrome **237 -> 197.25**`. My 76.25 and 116 are U4's own two numbers.

The cause is registered too — line 192: "Landscape phones (640-1023 wide, <= 480 tall) miss every `< 640px` phone rule. U21 adds a short-height gate." The mechanism the finding presents as its discovery (globals.css:5506 gated at `max-width: 639.98px`) is that sentence.

And U21 already owns it end to end (line 1430-1444): "Measured: at 780x360 /markets pins 237 of 360px (66%), leaving ~123px for cards, and the width misses every `< 640px` rule" — the 237 and the 123px window, already stated; remedy "the discovery bar uses U4's one-line layout in **both** densities" under `@media (max-height: 480px) and (max-width: 1023.98px)`; accept "pinned chrome <= **150px of 360** (from 237)". Its guard line reads "driver at 740x360, 780x360, 915x412, EN/SW" — which is, cell for cell, the matrix the examiner drove. They ran U21's own guard matrix and reported U21's own already-accepted number back as an unregistered finding. Acceptance-table line 1922 carries it as well, re-measured at 740x360 on 2026-09-23 at 65.8%, target <= 150px.

Beyond the duplication, the claim is wrong where it goes past the register. Its route list is /markets AND /results, and on /results there is no restack to report: the bar is 116px at 360x780 portrait too, because /results never opted into U4's row markup. The control was taken on /markets and generalised. The picture settles it — `results-360x780-sw.png` is a 360px portrait crop showing the same two stacked rows. Likewise "two `[data-bar-row]` children" is true on /markets only; /results has none.

The row-2 geometry is mis-measured. The sort group is `flex: 1 1 0%` and 561.9px wide (x=16..577.9), 12px from Filters — not 154px with 420px of void beside it. The examiner appears to have read some inner control's box and called it the group, then subtracted t
```

### ⚪ The header's auth pills take the desktop 48px rung inside the 56px header on a rotated phone — the exact 4px-of-air condition U5 removed for phones

- **Condition:** Landscape (740/780/915 × 360–412) · claimed `all routes (header)` 740x360 (holds at 780x360 and 915x412)

```
REPRODUCED THE NUMBERS, REFUTED THE FINDING. My own probe (scripts/.probe-rf1-1.mjs, scripts/.probe-rf1-2.mjs; F:\kipindi-main\scripts\.shots-rf1\) drove https://www.50pick.tz/ signed out, locale sw via kp-locale + assertLang, HeadlessChrome UA confirmed, reducedMotion reduce, at 740x360, 780x360, 915x412, plus two controls: 360x640 (portrait) and 1280x800 (desktop) — 7 page loads, home only. The stated measurement is exactly right: at 740x360 sw both `.kp-auth-cta` ("Ingia", "Jisajili") are h=48, y=3.5, bottom=51.5, font-size 15px, padding 20px, inside a `.app-topbar` of h=56 (border-box, padding 0, 1px bottom border). Identical at 780x360 and 915x412. Portrait 360x640 gives h=40, y=7.5..47.5, 13px, padding 14px. So the numbers are not the problem.

THREE REASONS THE FINDING IS WRONG AS STATED.

(1) IT IS NOT A ROTATED-PHONE CONDITION. My desktop control at 1280x800 sw returns byte-identical values: h=48, y=3.5, bottom=51.5, font-size 15px, padding 20px, bar h=56. The two 3x crops (z740x360-right-zoom.png and z1280x800-right-zoom.png) are the same picture. This is simply what ships at every width >= 640 — every tablet, every desktop — and it ships there by design. The title calls it "the exact 4px-of-air condition U5 removed for phones"; U5's comment names 48-in-56 as its REASON to step down BELOW sm, not as a defect in itself, which is why the product still renders it above sm without complaint. A rotated phone getting the >=sm chrome is the true statement, and that is a different, already-known claim.

(2) THE ASYMMETRY IS AN INSTRUMENT ARTIFACT. "3.5px of air above and 4.5px below" is produced by measuring the pill against the bar's BORDER box. The bar is 56px border-box with a 1px bottom border and zero padding, so its content box is 55px: 3.5 above and 55-51.5 = 3.5 below — the pills are exactly centred, `align-items: center`. The extra 1px is the header's own rule, not air. The same method makes the portrait case 7.5/8.5, not the "8px each side" quoted. No control is off-centre anywhere.

(3) ALREADY KNOWN, AND THE REMEDY IS ALREADY SCHEDULED. No D-number covers it, so I cannot name one — but docs/MOBILE-VISUAL-PLAN.md:192 records the class verbatim in the known-traps list: "Landscape phones (640-1023 wide, <= 480 tall) miss every '< 640px' phone rule. U21 adds a short-height gate", repeated at :588 ("The 780 width misses every `< 640px` phone rule"),
```

### ⚪ Rotating the phone silently cancels Compact card spacing AND hides the control that sets it — both gates are at 640px

- **Condition:** Landscape (740/780/915 × 360–412) · claimed `/markets (all boards)` 740x360, 780x360, 915x412

```
I drove it myself (10 page loads) and reproduced every figure, including the mechanism behind them. It is still not a defect, for one decisive reason: BOTH "gates" are the written, Ali-approved, guard-enforced contract of the units that shipped this week, and the plan says so in plain text.

`F:\kipindi-main\docs\MOBILE-VISUAL-PLAN.md`:
- line 447-449, U2 as built: "A phone's rail More menu opens with a **Card spacing** row (Compact ↔ Comfortable), **a 44px `menuitemcheckbox` hidden from 640px up**". The hidden control is not a discovery; it is the spec sentence.
- line 1030, the [Compact] acceptance control for every unit: "with `kp-density=comfortable`, **and at every width ≥ 640, the drivers show a zero diff** against the U1 baseline."
- line 1059: `test:density-contract` — "every Compact rule sits inside `@media (max-width:639.98px)` and `html:not([data-density="comfortable"])`". The 639.98 in `globals.css:5461` is what that guard exists to enforce.
So "Compact does not apply at ≥640 and its switch is hidden there" is the pass condition of U2/U3/U4, reported as their failure. The two gates agreeing at 640 is the contract being kept, not two bugs stacking. The claim's title frames that consistency ("both gates are at 640px") as the finding.
- line 455 also records that U2's own adversarial review already vetted this exact code — "its `sm:hidden` check matched `max-sm:hidden`. Three claims were refuted."

The genuine half — a rotated phone is still a phone but falls outside the phone rules — is already recorded three times and owned by an open unit:
- line 192 (instrument traps): "Landscape phones (640–1023 wide, ≤ 480 tall) miss every '< 640px' phone rule. U21 adds a short-height gate."
- line 588 (§3 conditions table): "Landscape 780×360 /markets | pinned chrome 237 of 360px (66%), a ≈ 123px window of content. **The 780 width misses every `< 640px` phone rule**" — the claim's own 123px window is quoted from the same measurement.
- line 1431, U21 (⬜, S12), which already proposes the fix: `@media (max-height: 480px) and (max-width: 1023.98px)`.

Not a D-number, so not a register duplicate — but a duplicate of the measured line that is U21's entire reason to exist.

THE PICTURE AGREES WITH THE NUMBERS AND KILLS THE SEVERITY. `360x780-more-open.png` shows the row with its toggle blue/ON; `740x360-more-open.png` shows the same menu with three rows and no such
```

### ⚪ On /auth/login at 360x500 the bottom rail is painted over the focused phone field and the page never scrolls, so you cannot see what you are typing or the Sign in button

- **Condition:** The on-screen keyboard (viewport shrunk to 360×500) · claimed `/auth/login` 360x500

```
REFUTED on three independent grounds; the pixels are right but the finding is not.

A. ALREADY REGISTERED — D19, unit U22. The register line for D19 names the filter sheet, but D19's unit is U22 "On-screen keyboard and viewport units (D19)", and U22 already owns this exact thing in three places in docs/MOBILE-VISUAL-PLAN.md: its "Measured in code" line (~:1448) — "no keyboard handling (the only visualViewport user is the Needle); the rail, consent/install cards (148) and chat bubble are fixed at the bottom"; its GUARD (~:1466), which is this cell verbatim — "focus each form field on login, register, OTP, deposit, withdraw, stake, comment and search at 360x780, then resize to 360x500 (keyboard proxy). The field rect is fully visible, the rail and bubble are hidden, and submit is reachable"; and the §11 acceptance row (~:1924) "Keyboard proxy: focused field visible, rail and bubble hidden | not handled | 100% of form fields". §5's evidence table (~:593) already states the mechanism and its scope: "no keyboard handling anywhere; the rail (64), consent card (148) and chat bubble can sit over the focused field in layout-resizing browsers and the planned Capacitor shell". Login and register are named; the viewport is named; the verdict "not handled, 100% of form fields" is recorded. This is not a new defect, it is U22's own RED state re-measured.

B. THE INSTRUMENT PRODUCES THE HEADLINE WITH NO EXTRA DEFECT PRESENT. `page.setViewportSize()` is a synthetic window resize; it does not re-run the UA's "scroll the focused editable into view", which is what a resizes-content engine does when the keyboard raises. The examiner focused at 780 (where the field was already in view, so no scroll was owed) and then shrank, an order in which no engine ever has cause to scroll. Drive the same live page the other way round — viewport already 500, then focus — and Chromium scrolls to scrollY=231 by itself and all three hit points return the field. Their probe-2 `scrollIntoView({block:"center"})` landing the field at y=226.8 was read as "what a keyboard handler would do"; it is in fact what the BROWSER did unprompted in my run, to the same y. So the probe establishes only that the app has no handler of its own — which is already written down (A) — not that a player sees 0px of the field.

C. SEVERITY IS WRONG BY TWO NOTCHES, AND THE CONDITION IS HYPOTHETICAL TODAY. The finding's ow
```

### ⚪ D19 names the wrong victim: at 360x500 the filter sheet keeps its Done button and instead hides 57-61% of its own filter controls

- **Condition:** The on-screen keyboard (viewport shrunk to 360×500) · claimed `/markets and /results` 360x500

```
REFUTED — reproducible numbers, wrong reading, and no defect behind them.

1. I re-drove the exact cell with my own probe on https://www.50pick.tz (4 loads across /markets and /results x sw/en at 780 then 500, plus one fresh 360x500 load for the scroll sweep) and every figure in the claim came back identical. So the arithmetic is honest. The conclusion is not.

2. THE INSTRUMENT WOULD PRODUCE THIS NUMBER WITH NO DEFECT PRESENT. `scrollHeight - clientHeight` on `.kp-fsheet-body` measures a scroll container scrolling. globals.css:3470-3480 declares it one ("`.kp-fsheet-body` is a scroll container") and ships the hairline at its bottom edge as the FUNCTIONAL scroll boundary that says the list continues. The same instrument reports 73px (13.9%) "hidden" at the untouched 360x780 baseline the claim itself uses as the control, and 187px (35.5%) at 360x640 — a real, common phone with no keyboard involved. A percentage that rises automatically as the viewport shrinks is the definition of a scroll container, not evidence of a defect. The claim's headline percentages (57.2%, 61.3%) are just 301/526 and 357/582.

3. THE PICTURE REFUTES THE CLAIM'S OWN EVIDENCE LINE. The claim reads its screenshot as "only UWEZEKANO and DIMBWI are reachable". They are the only groups visible AT REST. My shot after one wheel gesture (shot-mk-sw-bottom.png) shows the whole MADA group — Zote 49, Michezo 21, Uchumi 9, Hali ya hewa 2, Kripto 0, Utamaduni 4, Teknolojia 1, Nyingine 12, all eight topic chips — on screen with "Onyesha masoko 49" still pinned below the hairline. A mid-scroll shot (shot-mk-sw-mid.png) shows DIMBWI complete including "TZS 50k+ 5", the chip a coarse two-position sample calls unreachable. Nothing is hidden; it is below the fold of a box built to be scrolled, and it comes back with a flick.

4. THE CONDITION IS MANUFACTURED. The claim calls 360x500 a "keyboard proxy", but the open sheet contains 0 text fields, so no keyboard can be raised from inside it; and a Playwright viewport resize models `interactive-widget=resizes-content`, which is not Chrome Android's default (`resizes-visual`, where `vh` and therefore `82vh` do not shrink at all). At the short viewports a player actually meets — 640 and 568 — the panel is 524.8 and 465.8, the footer ends at 623 and 551 inside the viewport, and the Done button hit-tests SELF.

5. IT IS ALSO NOT NEW. The claim marks itself dupl
```

### ⚪ On /results at 360x500 the search shows zero of its 12 matching results: 237px of the 500px screen is pinned chrome, leaving a 22px content window

- **Condition:** The on-screen keyboard (viewport shrunk to 360×500) · claimed `/results` 360x500

```
REFUTED — already registered, and the part that would have been new is contradicted by my own drive.

ALREADY IN THE REGISTER: this is D20 (U21 "Short screens + landscape"), whose accept clause at MOBILE-VISUAL-PLAN.md:1464 is literally "pinned chrome <= 150px of 360 (from 237)" — the same 237 the claim presents as a discovery. The keyboard half is the U22 row at :1943, "Keyboard proxy: focused field visible, rail and bubble hidden | not handled | 100% of form fields", against U22's guard at :1466-1468 which defines the test as "resize to 360x500 (keyboard proxy)". The examiner drove the register's own defined test cell and reported its already-recorded status as a new finding. The claim's own note says "Overlaps U21", but the overlap is not partial — the measurement IS U21's number and the condition IS U22's guard.

THE CONDITION IS FALSE, WHICH IS THE ONLY THING THAT COULD HAVE MADE IT NEW. The claim's novelty rests on "the keyboard is the condition that makes it bite during a search". I removed the search entirely — fresh context straight to /results at 360x500, empty field, no focus, no typing — and read chrome 237, gap 22.0px, first card visible 0.0px, and a crop indistinguishable from the searched one. Then I typed "prem" and the first card rose 23.5px. A condition that changes nothing when removed and improves the number when applied is not the condition.

THE INSTRUMENT DID NOT LIE, THE FRAMING DID. Two framing errors produce the alarming figure with no extra defect present. (a) Measuring at scrollY 0 and calling the result a "content window": at scrollY 0 the sticky discovery bar has not stuck, so 116 of the 237 is ordinary in-flow content, and the 22px is just "the first card starts at document y=469.5 on a 500px screen". Any scroll dissolves it — 263px of window by y=240, and the field is still fully on screen at y=180 beside 145.5px of card. (b) Reading 12 DOM card links as "12 matching results" when the page states 120.

ONE FURTHER CAVEAT THE CLAIM DOES NOT CARRY. 65 of the 237 is the fixed rail, and the proxy only puts it at 435..500 because setViewportSize resizes the LAYOUT viewport. The plan records at :1448 that `interactiveWidget` is unset, so Chrome Android uses `resizes-visual`: the layout viewport stays 780, the rail stays at layout y 715..780 behind the keyboard, and the scrollY-0 band would be 413..500 = 87px with ~30px of the first 
```

### ⚪ The analytics consent card is mounted alive behind the first-visit primer with all three of its controls untappable

- **Condition:** Overlays, sheets and menus · claimed `/` 320x640

```
REFUTED as a finding, though every measurement in it is accurate. Two independent grounds, either one sufficient.

(1) THE INSTRUMENT PRODUCES THIS NUMBER WITH NO DEFECT PRESENT. `elementFromPoint` under an open modal returns the modal for every point. My tautology control proves it on this very page: 12/12 background controls scored identically dead, including the header logo and the Ingia/Jisajili buttons. The claim's own "discrimination" (dead -> live after pressing Skip) does not discriminate a defect from correct behaviour — it is the same before/after you would get for the logo, and it demonstrates that the modal works. The dialog carries `aria-modal="true"` and a `bg-black/60` scrim; content behind a modal being unreachable is what a modal is for. "3 of 3 controls dead" restates "a modal is open".

(2) THE UNDERLYING STATE IS D4, AND D4 CITES THE EXACT LINES. Register line 913: "D4 | First visit: primer modal and consent card both show, uncoordinated | `first-visit-primer.tsx:296-317`, `consent-prompt.tsx:61-62`". `consent-prompt.tsx:61-62` IS the `eligible` / `useInvitationSlot` pair that mounts the card while the primer is up — the mounting is already the registered defect. The co-occurrence is genuine for real users (GA_HOSTS = ["50pick.tz","www.50pick.tz"], consent "unset", no `50pick-primer-seen`); the force switches only lift the HeadlessChrome block and the host check, so they reveal D4's state rather than manufacture a new one.

AND THE CLAIMED EXTENSION POINTS THE WRONG WAY. The new element offered over D4 is "entirely inside the primer's box, so not merely uncoordinated but invisible". Invisible is the good case: the picture shows a clean full-bleed sheet with nothing showing through, so at phone widths the visual collision D4 worries about does not happen at all. That narrows D4; it does not extend it. What is left after removing the tautology is "a card that is going to be shown is mounted early and is covered while a dialog is up", and nothing is lost by it — the card is still there, fully painted and reachable, the instant the primer is dismissed (proven, not assumed), and it does not land under the dismissing tap: its buttons sit at y 435-475 while the primer's Endelea/× controls are at y~570-600 and y~167.

Severity: cosmetic at most, and arguably nil. The only conceivable change is not mounting the card until the primer closes, or def
```

### ⚪ At 360x500 the chat bubble covers the right 51px of the /live search field, which is where its clear button sits

- **Condition:** The on-screen keyboard (viewport shrunk to 360×500) · claimed `/live` 360x500

```
REFUTED AS A NEW FINDING — it is already in the register, in four places, and the two numbers in its headline belong to two different states of the page.

ALREADY REGISTERED (this is the decisive reason). It is not D3-with-a-new-surface; it is the condition U22/D19 already owns, written down before this examiner drove it:
• `MOBILE-VISUAL-PLAN.md:593`, §11 conditions table — "*code* keyboard | no keyboard handling anywhere; the rail (64), consent card (148) **and chat bubble can sit over the focused field** in layout-resizing browsers and the planned Capacitor shell". Same offender, same victim class, same caveat about which engines.
• `:1899`, §11 device matrix — "| Keyboard proxy | **360×780 → 360×500 after focusing a field** | the on-screen keyboard |". The examiner's cell is the register's own defined cell, down to both heights.
• `:1467` (U22, "Measured in code") — "the rail, consent/install cards (148) and chat bubble are fixed at the bottom; … `interactiveWidget` is unset, so Chrome uses `resizes-visual`, while older engines and a Capacitor WebView resize the layout."
• `:1485-1487`, U22's guard — "focus each form field on login, register, OTP, deposit, withdraw, stake, comment **and search** at 360×780, then **resize to 360×500 (keyboard proxy)**. The field rect is fully visible, **the rail and bubble are hidden**." The remedy is already specified at `:1471-1473` (`html[data-keyboard]` hides the rail, chat bubble, consent/install cards), the motion is already specced at `:1016`, and the real-phone check already names search at `:1616`. Nothing about this drive changes a decision that has not already been made.

THE INSTRUMENT COULD PRODUCE THIS NUMBER WITH NOTHING NEW PRESENT. Two of your listed traps fired at once. (a) A BOX WAS MEASURED WHERE THE CLAIM IS ABOUT A CONTROL: the 51px/17.8%/2244px² was read off a 286-wide EMPTY field, and the clear button it names does not exist in that state (`{q && …}`) — the picture shows the bubble over empty rounded corner. Typing shrinks the input to 245 and moves its right edge to 302, so the field figure becomes 10px/4.1%; the "51px of the field" and "where its clear button sits" are measurements of two mutually exclusive renderings. (b) THE POPULATION IS THE INSTRUMENT'S OWN ARITHMETIC: field top 368 = 780/2 − 22, bubble top 368 = 500 − 132. The full-height overlap exists only in a ±20px window around h=500 (4
```

### ⚪ The /markets board stats row runs 72px past the right edge at 360 with large text (112px at 320) and `overflow-x: clip` makes it unreachable — 4.5x worse than the registered 320 case

- **Condition:** Large text (Android/browser scaling 1.3) · claimed `/markets` 360x780 @ zoom 1.3 (277 layout) and 320x780 @ zoom 1.3 (246 layout)

```
REFUTED AS A NEW FINDING — it is D34, and the headline condition ("at 360") is false. But be clear: the pixels are real. I reproduced every number the examiner gave, to the tenth, with my own probes.

WHAT I DROVE (13 loads, all https://www.50pick.tz/markets, read-only, `localisedContext`-equivalent contexts with the `kp-locale` cookie + `assertLang` after every nav, reducedMotion=reduce): 412x780 sw z1, 360x780 sw z1, 320x780 sw z1, 340/333/327 sw z1, 277x600 dsf1.3 sw (=360@z1.3), 246x600 dsf1.3 sw (=320@z1.3), 277 dsf1.3 en, plus two full-page unclipped-overflow scans. Scripts: F:\kipindi-main\scripts\.probe-refute-1.mjs .. .probe-refute-5.mjs (all untracked; `git status` shows no tracked file touched, branch mobile-s2).

WHAT I CONFIRMED
- The element is `main p.flex.items-center.whitespace-nowrap.font-mono.text-[12.5px]`, innerText "49 hai · TZS 482K katika mchezo", width 251.5 CSS at EVERY width (it is a flex item that cannot shrink below min-content).
- 360@z1.3 sw: layout vw 277, box right 332.3 → +55.3 CSS = 71.9 device px. 320@z1.3 sw: vw 246 → +86.3 = 112.2 device px. 360@z1.3 en → +26.0 = 33.8 px. SW/EN ratio 2.13. All three match the claim exactly.
- `html` and `body` are both `overflow-x: clip`, `document.scrollingElement.scrollWidth == clientWidth`, and `scrollTo(400,0)` leaves `scrollX` at 0. The overflow is unreachable. True.
- My own unclipped-offender scan over all 1890 body nodes returns exactly ONE offender at both zoomed widths: `span.text-text-subtle "katika mchezo"`. The "only page-level offender" claim holds.
- THE PICTURE AGREES WITH THE NUMBERS (no instrument lie here): my crop at 360@z1.3 sw reads "MASOKO ● 49 hai · TZS 482K katika" cut mid-word; at 320@z1.3 "…TZS 482K ka"; at 360@z1.3 en "…TZS 482K in p".

WHY IT IS STILL NOT A NEW FINDING
1. SAME DEFECT, SAME ELEMENT, SAME LINE OF THE REGISTER. D34 (docs/MOBILE-VISUAL-PLAN.md:943): "At 320 SW the board stats row ('25 hai · TZS 27K katika mchezo') cannot wrap or shrink and runs past the viewport edge beside a money figure". I measured the registered case myself — 320x780 sw at 100%: box right 332.3 in a 320 viewport = +12.3, crop reads "…TZS 482K katika mche". Identical element, identical nowrap/no-shrink mechanism, identical page.
2. "AT 360" IS FALSE. At a real 360 viewport at 100% zoom the row FITS with 16px to spare — box right 344 of 360 (I measured it; 412 gives 396 of 412)
```

### ⚪ The card's HAPANA (NO) button clips its own price at large text — "HAPANA @ 34%" loses characters inside a hard 40px button that cannot wrap

- **Condition:** Large text (Android/browser scaling 1.3) · claimed `/markets and /` 320x780 @ zoom 1.3 (246 layout); one card also at 360x780 @ zoom 1.3

```
REFUTED AS STATED. I drove the exact cell myself (scripts/.probe-refute-1.mjs, -2, -3; 7 page loads on production via `localisedContext` + `assertLang`, HeadlessChrome UA, read-only) and got the examiner's numbers to the unit — and then the screenshot contradicted his conclusion.

WHY THE INSTRUMENT LIED. `scrollWidth − clientWidth` says the content is wider than the content box. It says NOTHING about whether anything is clipped — that needs `overflow: hidden` or `text-overflow: ellipsis`, and `.btn` has neither (`overflow-x: visible`, and `text-overflow: clip` is the inert default that applies only under hidden overflow). `.mcardp-actions .btn` (globals.css:4147) sets `height: var(--tap-min); min-width: 0; padding: 0 10px` and never adds hiding; the one `overflow: hidden` ancestor is `.mcardp` itself, and the label's right edge stops 5–15px INSIDE the card border on every one of the 24 buttons. So "clips its own price", "loses characters", "6 units clipped", "9 units clipped" are all wrong: the units counted are units of SPILL, not of loss. This is the register's own named trap — measuring a BOX when the claim is about TEXT. Measured the text's way (Range rects per text node vs the button's border box) the overflow turns out to be symmetric, left and right, which is what `justify-content: center` + visible overflow must produce and what a clip could never produce: a clip would eat BOTH ends, not "only the price".

THE PICTURE WINS AND IT DISAGREES WITH THE FINDING. The examiner cites his own C-320z13-sw-_markets.png as showing "a HAPANA button whose text stops short". My ×5 crops of the worst three cards (ox 12, 9, 5) show "HAPANA @ 100%", "HAPANA @ 34%" and "HAPANA @ 5%" complete — the price is there, every digit. What "stops short" at thumbnail size is the RED FILL, not the text; the last glyph or two are painted just outside it on the navy card. He read the pill's edge as the end of the string.

TWO SECONDARY CLAIMS ALSO FAIL. "The paired NDIO button never clips at any width" — NDIO also overflows, ox 1 with spill 0.11px on every "NDIO @ 100%" card at 320 SW, so the asymmetry is a matter of degree, not a one-sided defect. And "it clips rather than growing or wrapping" mis-states the consequence: it neither grows, wraps nor clips — it spills.

WHAT IS REAL, MUCH SMALLER, AND NOT WHAT WAS REPORTED. At 320 SW under 1.3 scaling the NO label leaves its own fi
```

### ⚪ The /leaderboard ranking table is a fixed `min-w-[640px]` that does not scale, so large text pushes the ROI column — the column the page is sorted by — from 10px to 120px outside the scroll window

- **Condition:** Large text (Android/browser scaling 1.3) · claimed `/leaderboard` 360x780 @ zoom 1.3 (277 layout)

```
REFUTED AS A NEW FINDING — it is D43, to the pixel, and its stated mechanism and condition are both wrong.

1. It is D43. The register reads: "The leaderboard list is ranked by ROI and no row shows ROI: the podium prints +26.8% / +13.2% / -3.9%, then rows 2-6 drop the number they are sorted by and leave 105-142px empty at the right (critics panel) | `leaderboard/page.tsx:460` (list row) | U10". Line 460 of `src/app/leaderboard/page.tsx` is the predictor `<td>` of this very table. I measured the empty gutter right of each row's last painted element (the tier badge) to the scroll window's right edge at 360 sw: 130.6 / 111.2 / 105.5 / 127.7 / 120.5 / 105.5px for rows 1-6 — inside D43's recorded 105-142px band, its lower bound matched exactly. Same route, same table, same rows, same missing sort key, same empty gutter, same code line. The claimed finding restates D43's symptom and adds a diagnosis of it; the claimant's own "CLAIMED DUPLICATE OF: D43" is correct, and the extension does not survive.

2. The title's causality is false. "Large text pushes the ROI column" — the column does not move. It sits at x=353.6-475.5 in layout units at 320 sw, at 360 sw, and at 130% zoom alike (only EN's longer header shifts it to 371.2, a locale effect, not a scaling one). What shrinks is the WINDOW: 326 -> 243 layout units. Nothing is "pushed".

3. The condition is not a condition, and it is mislabelled. The ROI value is already outside the window at 100% at every phone width I drove — 320 (108.7px past), 360 sw (68.7), 360 en (93.8), 412 (16.7). Zoom only widens a gap that is fully present at rest. And "browser/Android text scaling 1.3" is not what was emulated: their own "277 layout" figure is PAGE ZOOM (`documentElement.style.zoom`), while Android Chrome's text-scaling setting multiplies font sizes inside an unchanged 360px layout viewport. I could not emulate true font scaling (`Page.setFontSizeMultiplier` no longer exists in this CDP build) and make no claim about it — but the cell as driven is page zoom wearing a text-scaling label.

4. THE PICTURE REFUTES THE EVIDENCE. My crop at 360 sw 100% and my crop at 277 (=130%) are the same frame: ranked rows carrying only `#` and `MTABIRI` + handle + tier dot, no ROI anywhere, no scrollbar, no fade. So `crop-lb-table-360z13-sw.png` — described as showing "eight ranked rows carrying only # and MTABIRI" — is a picture of D43 at 
```

### ⚪ The /results sort control shows an ellipsised value at 130% — "Newest resolved" loses 76 units — where it was whole at 100%

- **Condition:** Large text (Android/browser scaling 1.3) · claimed `/results` 360x780 @ zoom 1.3 (277 layout)

```
REFUTED as stated. The measurement is honest — I reproduced 51 (sw) and 76 (en) to the unit — but the finding's load-bearing claim, "where it was whole at 100%", is wrong, and what is left is D18 verbatim.

1. It is not a text-scaling condition. The instrument is `document.documentElement.style.zoom = "1.3"` (I read the original probe, `.probe-lgtext-1.mjs:120`). Android/Chrome "Text scaling" multiplies FONT SIZE inside an unchanged 360px layout; CSS root `zoom` shrinks the LAYOUT to 360/1.3 = 277 units. I drove a native 277×600 context and got the same numbers within one unit (52 vs 51, 77 vs 76). So the condition reduces to "layout narrower than ~320px", not "the player raised their text size".

2. And the register already owns that width. At a plain 320×780 at 100%, with no zoom and no scaling, the same span on the same route clips in BOTH locales — sw hides 9 units painting "Mpya z…", en hides 34 painting "Newest r…". That is D18: "Active sort value clipped at 320 … `query-bar.tsx` QuerySort" (MOBILE-VISUAL-PLAN.md:927). The plan's matrix at line 585 even states the same consequence the claim offers as its novelty: "active sort value clipped …, so the player can't read which sort is on (D18)". 320 is a standard cell of this matrix; the examiner measured 360 and 360-at-zoom and skipped it.

3. The consequence is overstated. At 277 the control still paints one character plus an ellipsis against a TWO-option set whose other member starts with a different letter (Mpya zaidi / Kiasi kikubwa; Newest resolved / Highest volume), the summary carries its own `aria-label`, and opening the menu shows both labels at 218px with the active one `aria-selected="true"`. "They cannot read which sort is active" is not what the screen shows.

4. What is genuinely new here is not a defect: "unlike /markets the control itself survives" is the control passing. The one fact worth carrying back to D18 is a relocation, not a new row — on /markets the value is now `display:none` on phones (globals.css:5540 hides it inside the Compact one-line bar and prints the sort name on the count line), so D18's own example ("Pesa nyingi" at 320) no longer reproduces where the row says it does; /results, whose ResultsBar carries no `data-bar-row`, is where D18 still bites.

Housekeeping: a peer agent and I collided on the filename `scripts/.probe-refute-2.mjs` — I wrote mine, then read back the
```

### ⚪ The home route's entire loading state is a wordless 360px box — and U25's fix list does not name the root loader that produces it

- **Condition:** Slow network + slow CPU (400 kbps, 400 ms RTT, CPU 4×) · claimed `/` 360x780

```
I re-drove the exact cell twice on https://www.50pick.tz (read-only, no sign-in, 2 loads of / plus nothing else) with the repo's localisedContext/assertLang, CDP Network.emulateNetworkConditions 400 kbps/400 ms and Emulation.setCPUThrottlingRate 4, sampling the DOM every 20-40 ms and capturing a CDP screencast.

The component numbers reproduce: the root loader IS src/app/loading.tsx rendering SectionLoader (brand.tsx:565), the box is 360px inside a 520px <main> (px-3=16, py-10=80 on this project's overridden scale), and the finished home <main> is 6032.3px. So the examiner measured a real element.

But the finding is wrong as stated on the two points it is built on, and the picture settles both. RULE 7 applied: I read the frames. At t=15,106 ms the bordered panel with the centred needle is on screen exactly as described -- and so is the header with the SW chip, Ingia and Jisajili, the live ticker running "MUBASHARA · TZS 10K imekamilika NDIO kwenye", the 18+/50pick band and the five-item bottom rail in Swahili. "It is the whole screen" and "the screen says nothing at all in Swahili or otherwise" are both false by picture and by a filtered text-node count of 267 visible characters. The panel occupies 46% of a 780px viewport, not the screen.

The instrument could also produce the 1.1s with no defect present: the number is the network draw, not the component. On the identical profile the styled window was 1,290 ms in one run and 301-735 ms in the other. And both runs show the claim looked at only the styled tail -- for the 14-19 s before it the same loader was on screen with the stylesheet not yet applied (5 CSS rules, body margin 8px, main 360px), which the claim never saw and which is a CSS-delivery artefact of the 400 kbps profile rather than a property of loading.tsx.

The claimed novelty is also false. Per rule 3 I re-grepped the register: D26 is "Loading ghosts don't match phone content (/live 180px, /results 220px, GENERIC LOADERS) ... so the page jumps" -- a bare bordered spinner box on / is precisely a generic loader that doesn't match phone content, so the substance is D26 in the register's own words. And the headline -- that the plan "does not name the root loader" -- is refuted by the plan itself: MOBILE-VISUAL-PLAN.md:1096 names `app/loading.tsx:8` by file and line, and :1117 already carries a ruling on it ("NOT market cards -- keep them off --mcar
```

