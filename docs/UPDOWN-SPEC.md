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

A player bets whether a price will be **higher or lower than the opening price**, when a countdown
reaching **3, 5, 10, 15, 30 or 60 minutes** hits zero. A length is permitted only if it divides
evenly into 1440 — the minutes in a day — so every round starts on the same clock marks daily.

⛔ **CORRECTED 2026-08-04.** This paragraph read *"higher or lower than it is right now"* at
*"5, 15 or 30 minutes"*. Both halves are now wrong:

- **Six lengths, not three** — `ALLOWED_DURATIONS = [3, 5, 10, 15, 30, 60]` on the epoch lattice.
  ⚠️ **Gold is restricted to 15m and above** (`minDurationMinutes`), because XAU/USD's own feed
  disagrees with itself by up to $0.87 at a single instant.
- **Against the OPENING PRICE, not "right now"** — the open is the `open` of the last *completed*
  one-minute bar, which places it 60–120s in the past. That is exactly why the betting window (the
  final 20%, floored at 30s) had to ship in the same change: without it a player could bet against a
  price they can already watch moving.

🔴 **CORRECTED 2026-08-24. This paragraph said chains were MANUAL and that "nothing produces
rounds unattended". Both halves are false, and the paragraph four lines below in this same file
already said the opposite** — *"Chains regenerate themselves, so the product never runs dry"*.
Two statements in one document, contradicting each other across four lines, on the question of
whether this product runs by itself.

**Measured on production 2026-08-24: 19 chains, 16 of them RUNNING and emitting rounds
unattended.** The BTC/USD 3-minute chain alone has produced **2,520 rounds**. `Generate round`
exists and an operator can still use it; it is not how rounds are normally made.

⚠️ **Where the 2026-08-04 decision still holds:** auto-generation is off **in DATA for the chains
an operator has stopped** — three are STOPPED today (BTC 30m/60m, SOL 15m) and those genuinely
produce nothing. That is a per-chain state, not a product-wide mode, and reading it as one is
what put this sentence here. ⛔ **A chain's state is a fact about that chain; never quote it as a
fact about the product.**

Live assets: **BTC** and **ETH** ready · **XAU** (gold) ready at 15m+ · **SOL** enabled but never
proven to pay · **BNB**, **SNP500** and a duplicate **GOLD** row disabled. The asset list is an
operator registry — added, renamed, enabled and disabled from the admin panel with no deploy.

### Business value

- **Frequency.** Long-form polls resolve in days. Up & Down resolves in minutes, which
  turns an occasional visit into a session.
- **Continuity.** Chains regenerate themselves, so the product never runs dry and needs no
  *daily* curation — unlike the AI poll pipeline, where every question passes an officer.
  ⚠️ Since 2026-07-30 the **chain itself** does come from an officer-reviewed AI proposal
  (§7a): the officer decides once, per chain, and the chain then emits rounds on its own.
  Rounds are unreviewed; the thing that emits them is not.
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
| **Up & Down** | short-term price rounds only — see `ALLOWED_DURATIONS` |
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

**A stalled round never stalls the chain** — the grid is derived from `gridAnchorAt`, so a slow
round cannot drift the boundaries that follow it.

🔴 **CORRECTED 2026-08-24 (`E-194`). This paragraph used to continue: *"The next round opens on
schedule while the previous one is still confirming."* It cannot, and never could.** `advanceChain`
closes the round that ENDS at a boundary and opens the round that STARTS at it **inside one call,
both gated on the same confirmed observation** — so the successor is not merely late, it is
*created by* its predecessor's settle. Measured on production over 9,320 confirmed readings: the
successor is born **0.1–0.2s after** the observation confirms, and the observation confirms a
median **91.3s** after the boundary (best ever 72.4s; never under 60s, because the price is the
open of the 1-minute bar labelled with the boundary and that bar is not published until it has
closed).

**So the honest statement of the shape is:**

| | |
|---|---|
| the boundary grid | never drifts — derived, not accumulated |
| the next round's `opensAt` | the boundary, always |
| when that round can first be BET ON | ~91s later, when its opening price exists |
| what a player sees in between | the settled card and its next-match pod (E-166), not a dead end |

⚠️ **The consequence is a real one and it is recorded in `E-194`:** on the 3-minute chain the
reachable betting window is **88.7s of 180** — 49.3% at the median, 40.7% at p95. The console now
says so on any chain running below its own asset's advised minimum
(`chainDurationCaution`, `test:updown-advice` §7).

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

**Fee.** ⛔ **SUPERSEDED 2026-08-14 — [`docs/RULES.md`](RULES.md) is the authority.**
Up & Down and long-form polls now charge the **same** rule: **13% of the LOSING side**
(platform 3% + operator 10%). There is no ⅓ ceiling on a new round, and the two products no
longer use different models.

⚠️ The paragraph this replaced said *"13% of the pool, capped at one third of the smaller
side … Long-form polls use a different model"*. That was true of every round frozen before
2026-08-14 13:08 and is true of **none** created after it. A round settles by the model it
FROZE, so both statements are live facts about different rows — which is exactly why the rate
is not restated here. Verified on production 2026-08-14: Up & Down round #267 charged
1,820.00 = 13% × 14,000, and poll `mkt_3254d2723f3443358300` charged 1,690.00 = 13% × 13,000.

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

### How that rule is enforced (implemented 2026-07-30)

For most of this subsystem's life the three bullets above were **aspiration, not
behaviour**: `UpDownRound` had no source column at all, so resolution read whatever
`UpDownAsset.priceSourceUrl` said *at boundary time* — a link an operator could edit after
the round had opened and players had staked. Four surfaces, including the player-facing
`resolutionCriterion`, already asserted the rule as fact. It is now real:

| Stage | What happens |
|---|---|
| **Open** | `openRound` copies the asset's link and domain into the round's `capturedSourceUrl` / `capturedSourceDomain`, and every other write in that function — the market's `sourceUrl`, the player's `resolutionCriterion`, the audit payload — is built from those same two locals, so the round, the market, and the sentence the player read cannot disagree. |
| **While open** | Both columns are **write-once** (absent from `ROUND_PATCHABLE`, so `roundStore.patch` throws), and `updateAsset` **refuses a source edit** while any round on that asset is unresolved. |
| **Close** | `closeRound` checks each bounding reading's cited host against `round.capturedSourceDomain` — never the asset row — *before* the outcome arithmetic. A genuine contradiction → `VOID` with reason `source-mismatch` → **full refund**. |
| **Legacy** | A round with no capture, or a reading that cited nothing, **skips** the check. A round we cannot verify is not a round we may void on suspicion; skips are audited so the true rate is visible before anyone tightens it. |

Domains are compared, not exact URLs — a source legitimately serves the same quote from a
sub-path, and an exact-URL match would void real rounds for no integrity gain.

Guarded behaviourally by `test:updown-heal` §7C–§7D, structurally by `test:updown-source`.

## 7a · Where a chain's source comes from — the AI proposal (2026-07-30)

Ali's ask: *the AI proposes the round with the link it used, so when it resolves it goes back
to that same source.* §7 is the "goes back to" half; this is the "proposes" half.

`/admin/updown/proposals` is an officer queue in the shape of `/admin/ai-polls`. One proposal
= one chain: an **already-registered** asset, at one grid duration, with a margin, a framing,
and **the exact page the AI verified it could read a timestamped price from**.

| Stage | What happens |
|---|---|
| **Propose** | `web_fetch` pinned by `allowed_domains` to the asset's ONE approved domain — enforced by Anthropic's fetch service, not by asking the model. It reports the price and quote-time it actually found. |
| **Evidence** | `observedPrice` / `observedQuotedAt` are **required and nullable**. Null means "that page showed nothing usable", which is the *correct* answer for most price pages — and it makes the proposal unapprovable. **Neither number ever opens a round**; an armed chain reads its own boundary. |
| **Review** | An officer may edit the link, duration, margin or framing. Every edit re-validates; changing the link **clears the evidence**, because the AI read the old page. An approval does not survive an edit that changes the terms. |
| **Arm** | Points the asset at the approved link, creates/updates the chain, starts it — all through the **same service functions the console uses**, so every refusal there applies. In particular the §7 source lock: arming is refused while any round on that asset is unresolved. |

⛔ **Nothing arms without an officer.** `armProposal` is the only writer of `armedChainId`,
refuses any state but `APPROVED`, and is unreachable from any generation path. The AI pause
switch is the **same** `ai.controls.pollGenEnabled` the poll generator obeys — one switch,
both generators, no second key.

Guarded by `test:updown-proposal` (80 behavioural, incl. a real round holding real money
whose source a proposal cannot move) and `test:updown-source` §10 (structural).

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

## 8b · What the player's OWN positions must show (2026-08-15)

A player may hold **unlimited positions on one round, on either or both sides**
(`docs/RULES.md` §1). Both surfaces that list them used to compress that, and both now
render every one.

| Surface | Rule |
|---|---|
| `/updown/history` round card | **Every** bet on the round is its own chip. No cap, no `+N`, and no `max-height` or scroll box — clipping the row is the same defect wearing a different mechanism. The count LEADS the row: at 360px in SW/ZH ten chips wrap to four lines, and a trailing count lands alone on the last one reading as a stray figure. |
| `/updown/[roundId]` result panel | Every position itemised — side · stake · payout · **its own** stored result — **beside** the aggregate, which is what settlement wrote and is unchanged. Rendered only when the viewer holds more than one: with a single position the aggregate *is* the itemisation. |

⛔ **The itemised list adds NO money logic.** It reads `status` and `finalPayout` and nothing
else. The moment it infers a result from prices or payouts it becomes a second money
authority standing next to settlement's own figures.

⛔ **A hedged holder is never quoted one side.** `myPositionFor` derives a single `side` with
`up >= down` — a tie-break, not a fact about the bet. Where the aggregate must name a side and
the player backed both, it says so (`udBothSides`). Same rule as UD-20 on the board.

⛔ **`myPositionFor` queries by MARKET, never by user-with-a-cap.** It used to read the
player's 500 most recent Up & Down positions and filter to the round afterwards; the store
applies the cap *before* the filter, so a heavy player opening an older round was told they
held no position on a round they had played. One round's positions are bounded by the round.

⚠️ **`/updown/history` reads the most recent `UD_HISTORY_LIMIT` (400) positions and SAYS SO
when it bites.** The P&L strip is computed over exactly that set, so an unstated cap made
"net return" a real shilling figure over a concealed subset.

**Guards:** `test:updown-positions-visible` · `red:updown-positions-visible` (4/4, each
pre-fix defect restored verbatim and on its own).

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
| **Price reading method** | Which reader produces the price money settles against — market feed (default) or AI page reading — and which feed provider. Takes effect at the next boundary; **rounds already open keep the source they captured**. Choosing the simulated feed is a type-to-arm confirmation. See [`UPDOWN-PRICING.md`](UPDOWN-PRICING.md). |
| **Review an AI chain proposal** | Approve, edit or reject at `/admin/updown/proposals`; approving then **arming** starts the chain. §7a. |
| Re-observe / void a round | Operator recovery for a bad or stuck round. ⚠️ A **void moves money** (it refunds every stake), so it is gated at the accounting tier, not market-ops. |

Who may do what: [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) §10.
