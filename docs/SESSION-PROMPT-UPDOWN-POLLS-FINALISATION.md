# Up & Down / polls finalisation — SESSION RECORD (2026-08-15)

⚠️ **This is no longer a prompt to paste.** It was one; §5a is now shipped and live, so a
session pasting it would redo finished work. What remains is below, with the brief's own
factual errors corrected — those errors change what the remaining work must SAY, so they are
the most important thing on this page.

---

## SHIPPED AND LIVE — `d5863587`, verified RUNNING on Railway

**§5a · every Up & Down position is visible.** Full record in `docs/UPDOWN-SPEC.md` §8b and
`docs/NEXT-PLAN.md`. Three defects closed: the two-chip `+N` cap on `/updown/history`; the
single aggregated line on `/updown/[roundId]`; and `myPositionFor` reading the player's 500
most recent positions *before* filtering to the market, which told a heavy player they held no
position on a round they had played. The 400-row history read cap is now stated.
Guards: `test:updown-positions-visible` · `red:updown-positions-visible` (4/4).

---

## ⛔ THREE THINGS THE ORIGINAL BRIEF ASSERTED THAT ARE FALSE

Each was checked against the code and against arithmetic, not against memory. A session that
builds the §5b modal from the brief's numbers will print false statements on a money screen.

### 1. The locked window is NOT "one minute wide whatever the round duration"

It is the **result phase**, and it scales: `resultPhaseMinutes(d) = max(1, ceil(lead/60))`
where `lead = min(d·60, max(30, round(d·60 × 0.2)))` — `src/lib/updown-durations.ts`.

| duration | 3 | 5 | 10 | 15 | 30 | 60 |
|---|---|---|---|---|---|---|
| result phase | 1m | 1m | **2m** | **3m** | **6m** | **12m** |

The brief is right that **the advertised duration IS the betting time** (E-72's result phase is
added after the betting window, not carved out of it). It is wrong that the tail is fixed.

### 2. There are no 60-second or 15-second rounds

`ALLOWED_DURATIONS = [3, 5, 10, 15, 30, 60]` **minutes**. The shortest betting window is three
minutes. The brief's "some rounds are 60 seconds" drove its worry that a blocking modal could
cost a player the round; at a three-minute floor and a 5s auto-dismiss that concern is much
smaller than stated — but it is still the reason the modal must not gate repeat taps.

### 3. Free cancellation usually does NOT apply to Up & Down

`docs/RULES.md` §2.6 sets it at 5 minutes, but `cashOutValue` gates on **runway**:
`hadRunway = graceMs > 0 && closesAt - placedAt >= graceMs`, where `closesAt` is the LOCK
instant. An Up & Down round's betting window is its advertised duration, so:

| duration | 3 | 5 | 10 | 15 | 30 | 60 |
|---|---|---|---|---|---|---|
| last moment a bet still gets an exit | **never** | open only | +5m | +10m | +25m | +55m |

`market-service.ts`'s own comment says it: on a 5-minute round under a 5-minute grace the
TOO_SHORT refusal "is not an edge case — it is the ORDINARY branch".

⛔ **So the receipt's "way out" row must be COMPUTED per bet, never stated as a constant.** The
copy for both cases is already in the dictionary and shipped in `d5863587`: `udRcExitLabel` /
`udRcExitValue` and `udRcNoExitLabel` / `udRcNoExitValue`, in EN + SW + ZH.

---

## §5b · STILL TO BUILD — the Up & Down bet confirmation modal

**Status: NOT STARTED.** The i18n is done and live; the component and its threading are not.

⚠️ **One more brief correction:** it says a placed Up & Down bet produces only a pulse and an
`aria-live` line. A **toast** was added 2026-08-05 (E-64, `use-quick-bet.ts` — `variant:
"success"`, `durationMs: 3000`). What is genuinely missing is the **modal**. The stale claim
comes from `updown-stake-controls.tsx`'s own header comment, which still says the SR line is
"in place of a toast" — that comment is wrong and should be corrected in the same change.

**Shape.** `OperationResultModal` (never a new primitive), sibling to
`updown-bet-blocked-modal.tsx`. `variant="success"`, `stripTone={side === "UP" ? "yes" : "no"}`
— that prop is the modal's own definition of "a side was staked" and buys the `seal-commit`
crest and the side-coloured button. Auto-dismiss at the shared 5s default. Host it beside the
blocked modal inside `UpDownStakeControls`, one per bet instance, so all surfaces agree.

⛔ **It must not gate repeat taps.** Repeat taps are repeat bets (Ali's standing decision). A
burst should COALESCE into one modal showing the latest bet, never a stack.

**Keys already live** (all EN + SW + ZH): `udRcProjected` · `udRcOpenPrice` · `udRcBetsClose` ·
`udRcResultDue` · `udRcExitLabel`/`udRcExitValue` · `udRcNoExitLabel`/`udRcNoExitValue` ·
`udRcKeepPlaying` · `udRcWatchRound`.
Reuse, do not restate: `udBetPlaced` (eyebrow), `udUp`/`udDown`, `udStake`, `udRoundLabel`, and
**`udEstimateNote`** — the projection disclaimer already exists and already says exactly the
right thing, so the card and the receipt cannot drift.

⛔ **The projected return is never gilded.** Gold is money that was EARNED; a projection has not
been decided (`test:gold-is-money`). Derive it from `impliedMultiplier(pricing, side, amount)` —
the same rule the buttons and `myExactPayout` use — never a second formula.

**Threading needed** (the actual remaining work): `UpDownStakeControls` today receives only
`bet`, `pricing`, `assetName`, `size`. The receipt also needs `durationMinutes`,
`selectionClosedAt`, `closesAt`, `openPrice` + `decimals`, the source class, the round href, and
the market's **frozen** `freeExitGraceMinutes` for the exit row. `BoardRound` already carries the
first four; the cleanest route is one `receipt` object added to `BoardRound` (where `ratesFor` is
already imported) so the board card and `round-stake-panel.tsx` both get it from one place
rather than two call sites diverging.

---

## NOT DONE — and not attempted, so do not read silence as a pass

- **§4's end-to-end live validation of either game** (admin → player → resolution, poll drivers,
  `qa:*` live drivers, money tie-outs, the statutory report).
- **§4b concurrency.** No load harness was run. `scripts/load/spike-f-saturation.mts` and
  `npm run test:bet-admission` are untouched this session; the 200-concurrent-bet figure in the
  brief is the PREVIOUS measurement, not one taken here.
- **§4c's defect hunt** beyond what surfaced while reading these files.
- **The 4 widths × 3 locales visual matrix**, on any surface. §5a is verified by typecheck,
  build, suites and guards — **not by a frame read on production**. The layout judgement (ten
  chips wrapping at 360px in SW/ZH) is reasoned, not photographed.
- `npm run test:all` and `npm run red:all` in full. Six suites plus the two new gates were run;
  the other ~110 were not.

## ⚠️ ONE LIVE OBSERVATION WORTH SOMEONE'S ATTENTION

`railway logs -s 50pick` at 2026-08-15 00:08–00:14Z shows **every** Up & Down chain refusing to
open on `open price for <boundary> not published yet`, retrying every 15s across at least five
chains (`udc_f8d666a0…`, `udc_2ba58e2e…`, `udc_5820850e…`, `udc_f5b881a7…`, `udc_9c46117b…`).
The guard itself is behaving correctly — it declines to open a round that could only void. The
FX/metals chain is separately and correctly reporting the Saturday closure. **But no crypto
round appeared to be opening either**, which is not obviously a weekend effect and was not
investigated. Confirm against the feed before the next session assumes the board is healthy.
