# Management specification, 2026-09-05 — the player "In Progress" view and the 1-hour objection window

> ⚪ **RECORD — the request, as management wrote it.** Transcribed from the two-page PDF
> *"IT Specification: Player-Centric 'In Progress' View & Dispute Window"* that Ali relayed on
> 2026-09-05. It is kept because the programme it opened spans three deploys and several
> sessions, and a request that lives only in a chat transcript is a request the next session
> cannot check its work against.
>
> ⛔ **This file is the ASK, not the answer.** What the platform actually does about it is the
> `MGMT-SPEC-2026-09-05` row on [`NEXT-PLAN.md`](NEXT-PLAN.md), the owner rulings in
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), and the session-87 handoff in
> [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) §6b. Where the two disagree, the ask is not
> automatically right — see "What could not be delivered as written" below.

---

## What management asked for, verbatim in substance

### Core requirements

1. **Player "In Progress" view** — enable players to track polls where betting has officially
   closed, but the underlying event or match remains active pending final resolution.
2. **Accelerated dispute window** — reduce the post-event objection and review period from
   **24 hours down to 1 hour** to streamline payout cycles.

### §1 · Player perspective

> *"Once wagering closes, tickets should not simply disappear or remain locked without feedback.
> Players need a dedicated interface to monitor their active stakes while waiting for outcomes."*

- **Dedicated "In Progress" tab** — a clean, separate section, distinct from active betting
  (Open Polls) and finalized history (Settled Polls).
- **Definition** — triggered the exact second betting closes (`bet_closing_time`), signifying
  that no new stakes are accepted while the real-world match, game, or asset movement is ongoing.
- **Locked action controls** — betting buttons, option selectors and stake inputs are disabled
  or hidden to prevent wagering after closure.
- **Real-time engagement metrics**
  - a countdown timer showing remaining duration until final event resolution and settlement;
  - live baseline tracking (initial asset price vs current live price for Up & Down asset polls,
    or live match scores);
  - clear confirmation of the player's locked prediction and staked amount.

### §2 · Backend and database

Lifecycle: `[Open / Betting Active] → [Locked / In Progress] → [Settled / Completed]`

- **Automation trigger** — a cron job or scheduler shifts poll status automatically when
  `bet_closing_time` arrives: `status = 'in_progress'`, `is_betting_allowed = false`.
- **Active-tickets query** — join tickets to polls, selecting `p.title`, `p.resolution_time` and
  `p.live_data_feed_id` where `t.user_id = :player_id` and `p.status = 'in_progress'`.

### §3 · Operational update

- **Previous rule** — a 24-hour objection window allowing players or administrators extended
  time to flag disputes.
- **Updated rule** — the objection time frame is shortened from 24 hours to **1 hour**
  post-settlement.
- **Impact** — settlement results lock in automatically for payout release after just 1 hour,
  unless an official dispute is raised by an authorized admin.

---

## How to read this against the platform

⭐ **Almost all of the machinery §2 describes already existed under other names**, and the
translation is the first thing to establish before building anything:

| The spec's word | What 50pick already calls it |
|---|---|
| poll | `PredictionMarket` (an Up & Down round is one too, `productLine: "UPDOWN"`) |
| ticket | `Position` |
| `bet_closing_time` | `selectionClosedAt ?? resolutionAt` — see `isSelectionClosed()` |
| `resolution_time` | `resolutionAt` |
| the cron setting `status='in_progress'` | the per-market scheduler's **`notify-closed`** deadline, which already fires at the exact cutoff second, freezes the pools and restamps every position's exact payout |
| `status = 'in_progress'` as a column | ⛔ **not built as a column** — the phase is DERIVED. `CLOSED` already means "awaiting an officer's seal", and a new enum value on a live money database would touch the bet path, the board and the scheduler. **Consequence to state plainly: nothing in the database is queryable as "in progress"; any reporting query must apply the same derivation.** |

## What could not be delivered as written, and why

- **`live_data_feed_id` for long-form polls does not exist and cannot be faked.** There is no
  sports, score or price feed behind a long-form market — only the public source URL an officer
  resolves against. Up & Down rounds are the one product with a real price feed. The in-progress
  card therefore shows what is true: the locked side, the stake, the exact payout-if-win, the
  frozen pool split, the countdown and the source link. ⛔ Inventing a live score would break the
  platform's own no-fabrication rule, which has already cost it once (fabricated price history
  shown to real bettors).
- **"Triggered the exact second"** is true of the SERVER (the scheduler fires at the cutoff
  second). The VIEW refreshes on a 20-second poll, so the tab flips within 20 seconds unless the
  countdown is wired to dispatch the page's own refresh event as it crosses zero.
- **"Unless an official dispute is raised by an authorized admin"** described a mechanism that
  **did not exist**: only a player holding a stake could freeze a payout. Ali ruled to build it
  (`E-296`); it is live.
- **Up & Down has no in-progress TAB**, only its round page. `/positions` is long-form only by a
  dated owner decision, and `/updown/[roundId]` itemises a player's positions only once the round
  is decided.
