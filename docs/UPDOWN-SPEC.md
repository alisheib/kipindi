# Up & Down — product specification

> **This document owns WHAT Up & Down is** — the rules, the workflows, the states and
> the copy. It contains no table shapes and no function names; those belong to
> [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md), which also carries the
> **document-ownership table** for the whole feature.
>
> Requirements source: `Up and Down/` at the repo root — the management team's
> documents, treated as primary throughout.

---

## 1 · What it is

A player bets whether the price of a commodity will be **higher or lower than it is
right now**, when a countdown reaching **5, 15 or 30 minutes** hits zero. Rounds run
back-to-back in continuous **chains** — one ends, the next is already open.

Launch assets: **Gold and Silver** (Ali, 2026-07-24). The asset list is an operator
registry — assets are added, renamed, enabled and disabled from the admin panel with
no deploy. BTC exists as an option and is **off** by default, per the management note:
*"we will use gold, silver etc., not BTC — make admin flexible."*

### Business value

- **Frequency.** Long-form polls resolve in days. Up & Down resolves in minutes, which
  turns an occasional visit into a session.
- **Continuity.** Chains regenerate themselves, so the product never runs dry and needs
  no daily curation — unlike the AI poll pipeline, which needs an officer.
- **A second revenue line** on infrastructure that already exists: the same wallet,
  ledger, settlement engine, audit chain and reports.

### What it is NOT

Not a casino, not fixed-odds, not a tick-accurate trading product. It is pari-mutuel:
players share the pool. The multiplier shown before a bet is a **display estimate**,
never a promise — see §5.

---

## 2 · Where it lives

Per `Markets Appearing.txt`, the platform now has three destinations:

| Destination | Shows |
|---|---|
| **Markets** | long-form polls only — a day or more |
| **Up & Down** | short-term price rounds only — 5 / 15 / 30 min |
| **Live** | everything, both product lines |

---

## 3 · The round lifecycle

```
OPEN ──────────────► CLOSING ──────► CONFIRMING ──────► RESOLVED
 betting open        00:00, no        awaiting the       winners paid
 countdown runs      new bets         close price        immediately
                                          │
                                          └────────────► VOID
                                                         all stakes refunded
```

1. **Open.** The round opens at a grid boundary with a recorded **open price** taken
   from the asset's declared source link. Betting is open; the countdown runs.
2. **Closing.** At the boundary the countdown reaches zero and selections shut. The bet
   is on the price *at* the boundary, so late entry would be betting on a known move.
3. **Confirming.** The close price is read from **the same source link**. This can take
   time and is allowed to — the round shows *Confirming price* and never a guessed
   number.
4. **Resolved.** Outcome sealed, winners paid immediately (§6).
5. **Void.** Full refund at zero fee (§4).

**A stalled round never stalls the chain.** The next round opens on schedule while the
previous one is still confirming. This is what makes the management requirement — *"no
need for the AI to rush; show regenerating, then confirm with 100% sources"* —
compatible with a continuous product.

---

## 4 · Outcome rules

| Condition | Outcome |
|---|---|
| Close price is above the open price by more than the asset's minimum move | **UP** |
| Close price is below the open price by more than the minimum move | **DOWN** |
| The move is within the minimum | **VOID** — full refund |
| The close price cannot be confirmed from the source | **VOID** — full refund |
| An operator voids the round | **VOID** — full refund |

The **minimum move** is per asset. It exists so a real-money bet is never decided by
noise below the source's own quoting precision.

**One-sided rounds.** If every player picks the same side there is no opposing pool to
win from, so all stakes are refunded at zero fee — the platform's existing rule. The
licence wording is **"one-sided win"**, never "one-sided market".

VOID is a **neutral** outcome, not a failure. Copy and design must treat it that way.

---

## 5 · Money rules

**Fee.** 13% of the pool, capped at one third of the smaller side, frozen onto each
round at creation. On a balanced TZS 10,000 pool that is TZS 1,300. Long-form polls use
a different model; the two never mix. Rationale and mechanism:
[`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) §8.

**A winner is never paid less than their stake.** Platform invariant, unchanged.

**Taxes come out of the operator's commission, never a player's money.** Unchanged.

**The multiplier is an estimate.** The "× 1.4" on the buttons is a fixed display figure,
not fixed odds. The real payout is pari-mutuel and depends on how the pools close. It
must always carry a qualifier and must never be styled as a guaranteed return.

**Cash-out.** Up & Down rounds are minutes long, so the platform's existing free-exit
grace already exceeds most round durations. Treatment is settled in Phase 3; until
then, assume the standard poll rules apply.

---

## 6 · Settlement timing

Winners are paid **immediately** on a confirmed outcome (Ali, 2026-07-24). A five-minute
round cannot hold money for the platform's standard 24-hour objection window.

What still protects the money:

- A standing objection still **freezes** settlement — the existing gate is not bypassed.
- Every round stores a full **settlement proof**: open price, close price, both source
  links, both source-quoted timestamps, and an evidence excerpt.
- Disputes are handled **after** payout, with `emergencyVoidMarket` as the reversal
  path.

This diverges from the platform-wide objection window and is therefore recorded in
[`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md).

---

## 7 · The source requirement

From `Makret Generation Tips.txt`, and treated as a hard rule:

- A round **captures its source link when it is generated**.
- It **resolves against that same link**.
- Resolution is **not rushed** — the round shows a confirming state until the source is
  confirmed.

The link must belong to a domain the operator has enabled in the existing trusted-source
registry. There is no second allowlist.

**Precision is bounded by the source.** Every surface shows the timestamp the source
itself quoted, not our boundary time. We do not imply accuracy we do not have.

---

## 8 · What the card must show

Mandatory per the management note, and all four must survive a 360px screen:

**Volume · Players · Amount · Timer.**

Plus, from the supplied mockup: the asset icon, the live price and its move, the
Up/Down actions with their estimate multiplier, and the source line.

Currency for player money is **TZS** with thousands separators — never KSH (the mockup's
label is wrong), never a bare number. The asset's own price is quoted in USD because
that is what the source publishes; it must read as visually distinct from player money.

Design detail — states, redlines, prop contracts:
`Up Down Design System/handoff/D1-updown-card-spec.md`.

---

## 9 · Copy rules

Inherited from the platform, restated only where Up & Down makes them easy to break:

- **Player surfaces never narrate ops detail.** A round that is confirming says
  "Confirming price", not which model is being called or how many attempts remain.
- **Real data or nothing.** No placeholder price, no stale price, no zero standing in
  for unknown. Every unknown value has a defined empty state.
- **Losses are stated plainly**, without euphemism and without alarm.
- **VOID reads as neutral** — "returned in full", not an error.
- **No emojis.** Trilingual EN + SW + ZH, with no truncation at any width.

---

## 10 · Notifications

Per-round bet-placed, win and loss notifications and emails are **suppressed** for
Up & Down: a player running twenty rounds an hour would otherwise receive forty emails.
They are replaced by an in-app result on the card and a **daily digest**.

The money record is untouched — transaction, ledger and audit rows are written exactly
as today. Only the *notification* is digested. Because this changes a player
communication control, it is recorded in
[`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md).

---

## 11 · Operator controls

| Control | Effect |
|---|---|
| Enable / disable an **asset** | Whether it can run chains at all |
| Start / pause / stop a **chain** | Pause stops new rounds; in-flight rounds settle normally. This is the first rung of the rollback ladder and needs no deploy. |
| Stake bounds per chain | Min/max stake for that asset+duration |
| Rate profile | The fee the chain freezes onto its rounds |
| Confirmation thresholds | Staleness window, confidence floor, retry attempts |
| Re-observe / void a round | Operator recovery for a bad or stuck round |

Who may do what: [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) §10.
