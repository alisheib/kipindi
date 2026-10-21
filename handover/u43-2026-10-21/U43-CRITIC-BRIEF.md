# U43 · eight-lens critics read — brief for every reviewer (lead: asheib-bb, 2026-10-21)

## What you are judging
50pick (www.50pick.tz) is a Tanzania-licensed real-money pari-mutuel prediction platform; one dark-royal theme; three
languages (Swahili = default and longest, English, Chinese). Ali (owner) asked for the **Up & Down board** (`/updown`),
**the Up & Down round card in every state** (and the round page's matching words), and **the `/markets` market card** to
score **10/10 from every perspective**, "perfectly and logically and visually". Three surfaces:
- **page** = the `/updown` board as a whole (title row, chips, card order, history strip, price chart toggle, desktop layout)
- **round card** = the Up & Down round card in every phase (open, receipt, held, moved up/down, last 30 s, locked,
  closed/confirming, settled/refund, handover/successor, round detail page)
- **market card** = the `/markets` card (and the same card on home)

Eight lenses (you are assigned ONE): **visual** (alignment, spacing rhythm, type ladder, hierarchy, density, crops,
overflow/clipping, consistency across widths), **uiux** (task flow, affordances, tap targets ≥ 40px, first-screen reach of
Up/Down, states and empty states, feedback), **motion** (what animates, timing, reduced-motion tiers, pulse only in the
last 30 s, no gratuitous motion — read the index.json animation records and the CSS if needed), **palette** (token
semantics: green/red ONLY for the two sides YES/UP and NO/DOWN, gold = 50pick's house metal at its named sites + earned
money, LIVE/HOT neutral, contrast AA), **clarity** (every word understandable at a glance in each language, one word per
concept, numbers formatted, no jargon), **player** (a Tanzanian phone player deciding fast with real money: is it obvious
what to do, what it costs, what they get, when the result comes?), **appeal** (overall visual quality and polish vs. a
best-in-class betting/trading app), **logic** (every statement TRUE and CONSISTENT: prices, times, states, counts, money
words, across card/board/round page/history/live/home; nothing fabricated).

## Binding rulings and fixed points (do not propose changing these; judge execution within them)
- Ali's four rulings (2026-10-19): (1) a small live price line inside the bettable round card (opens at label time,
  dashed opening-price reference, same feed as settlement), the big chart one tap away and never contradicting the card;
  (2) slim card — one line per fact (window, opening reference once, time left, pool·players·split, stake chips, Up/Down),
  Up/Down on the first phone screen; (3) on phones assets and durations are TWO SHORT ROWS of chips, no sheet unless they
  stop fitting; (4) NO odds/multipliers/figures on any card choice (side word + arrow only).
- Gold ruling (Ali, 2026-10-20, DESIGN_AUTHORITY §M3a): house gold restored on the mark, shared needle/split instrument,
  wallet balance, deposit entries (the gold Deposit coin in the bottom nav is CORRECT), bet and sell commits, classic
  bell/shell accents, RESOLVED status. Struck win amounts = earned only. LIVE/HOT neutral. Micro charts aqua.
- Fixed: never a fabricated price/point/time/chart; settlement = OPEN of the 1-minute vendor bar at the boundary; the
  countdown is the only manufactured urgency; house bots never named; every string in en/sw/zh; glyphs from the one
  family (no text characters as icons); tap targets ≥ 40px; no horizontal overflow; nothing clipped.
- Local state frames come from a dev server with SYNTHETIC test prices (the local feed has no vendor key; planted
  confirmed reads; the minute line may show the honest "unavailable" sentence, or a line labelled as synthetic layout
  evidence). Judge layout, words and truth-to-data there — NOT price realism. Production frames show real data.
- Swahili "dakika 5" (numeral after the noun) is the ruled form on the board/detail/receipt.

## Evidence
Frames (PNG, 2× DPR) and an `index.json` per folder (card boxes, font sizes, radii, row gaps, dollar-figure counts,
`upDownOnFirstScreen`, phase per card, animation records). Your reading list is given in your prompt. Open every frame on
it with the Read tool; open the index.json to check numbers. For a positional claim, MEASURE it: use index.json boxes, or
probe the PNG with PowerShell System.Drawing (`Add-Type -AssemblyName System.Drawing; $b=[System.Drawing.Bitmap]::FromFile(path); $b.GetPixel(x,y)`),
remembering pixels are CSS px × 2. Do not report what you cannot see or measure.

## What counts
- A **defect** = something concretely wrong or below a professional standard for your lens, visible or measurable in a
  named frame: misalignment, clipping, overflow, inconsistent spacing/type, contradiction, untrue/ambiguous statement,
  wrong colour semantics, missing state info, unreadable contrast, tap target < 40px, a word that differs across
  surfaces for the same concept, an awkward/unnatural sentence in any language (say which and give the natural form).
- A **taste** note = a preference that is not a defect. List it separately; it never lowers a score.
- **Score each of the three surfaces 0–10 for your lens.** 10 = no defect you can find after a real search. Each confirmed
  defect must cost points in proportion to its severity (high ≈ −2 or more, medium ≈ −1, low ≈ −0.5). Be adversarial and
  exhaustive — the owner rejects anything below 10, and a missed defect is worse than a strict score. But never invent:
  every claim needs its frame and, for positions, its measurement.

## Output (your final message, exactly this shape)
```
LENS: <lens>
SCORES: page=<x> round-card=<y> market-card=<z>
FINDINGS:
- id=<LENS>-<n> | surface=<page|round-card|market-card> | sev=<high|medium|low> | kind=defect | claim=<one sentence> | evidence=<frame file(s) + what/where, with measurement if positional> | fix=<concrete proposal>
...
TASTE:
- <one line each>
NOT EXAMINED:
- <frames you could not open or states missing from the evidence>
```
