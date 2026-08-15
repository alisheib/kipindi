# Up & Down / polls finalisation — ⚪ SESSION RECORD, closed 2026-08-15

> ⛔ **NOT A PROMPT. DO NOT PASTE IT.** Both halves have shipped. It is kept for the three
> measured corrections below, which are still true and still load-bearing.

## ✅ Both halves shipped

- **§5a — every Up & Down position is visible** (`d5863587`). Three defects closed: the two-chip
  `+N` cap on `/updown/history`; the single aggregated line on `/updown/[roundId]`; and
  `myPositionFor` reading the player's 500 most recent positions *before* filtering to the
  market, which told a heavy player they held no position on a round they had played.
  Guards: `test:updown-positions-visible` · `red:updown-positions-visible`.
- **§5b — the bet confirmation modal** shipped as **UD-22** (`de9287e6`), on the shared
  `OperationResultModal`, sibling to `updown-bet-blocked-modal.tsx`. ⚠️ This file said *"STILL TO
  BUILD · NOT STARTED"* for a day after it was live — corrected here.

---

## ⛔ THE THREE CORRECTIONS — still true, and a session that gets them wrong prints falsehoods

Each was checked against the code and against arithmetic, not against memory.

### 1. The locked window is NOT one minute wide — it SCALES

`resultPhaseMinutes(d) = max(1, ceil(lead/60))`, `lead = min(d·60, max(30, round(d·60 × 0.2)))`
— `src/lib/updown-durations.ts`.

| duration | 3 | 5 | 10 | 15 | 30 | 60 |
|---|---|---|---|---|---|---|
| result phase | 1m | 1m | **2m** | **3m** | **6m** | **12m** |

The advertised duration IS the betting time; the result phase is added after it, not carved out.

### 2. There are no 60-second rounds

`ALLOWED_DURATIONS = [3, 5, 10, 15, 30, 60]` **minutes**. The shortest betting window is three
minutes.

### 3. Free cancellation usually does NOT apply to Up & Down

`cashOutValue` gates on **runway**: `hadRunway = graceMs > 0 && closesAt − placedAt >= graceMs`,
where `closesAt` is the **lock** instant. So:

| duration | 3 | 5 | 10 | 15 | 30 | 60 |
|---|---|---|---|---|---|---|
| last moment a bet still gets an exit | **never** | at open only | +5m | +10m | +25m | +55m |

⛔ **And bonus-funded positions are never sellable at all**, independently of runway — a fourth
gate the original brief did not carry. `market-service.ts`'s own comment calls the `TOO_SHORT`
refusal *"the ORDINARY branch"*.

⭐ **This is why UD-22's "way out" row is COMPUTED per bet**, in `src/lib/updown-receipt.ts`,
pinned against the server's own expression by `test:feedback-law` §6.6–6.10 so the two cannot
drift. Both the exit and the no-exit copy exist in the dictionary precisely because the row has
two truthful answers.

---

## ⚠️ One observation from that session, since resolved

It flagged every Up & Down chain refusing to open on *"open price … not published yet"* as
possibly broken. **It is not** — that is designed behaviour (a bar labelled T does not exist
until ~+19s, or ~+87s for SOL), and production has live rounds. Investigated and withdrawn
2026-08-15; see `LIVE-QA-CAMPAIGN.md` §6b. **An `ERROR` in a log is not a defect, and a retry is
not an outage.**
