# 🔴 FINDING — GOLD HAS BEEN DEAD SINCE ITS LAST SESSION CLOSE, AND CANNOT RESTART ITSELF

> **STATUS: 🟠 OPEN ON PRODUCTION · ✅ CLEARED TO FIX — Ali, 2026-08-14: "ship it first".**
> It is item 1 of `docs/SESSION-PROMPT-RATES-SESSION-3.md` §4, ahead of the remaining rules work.
>
> Found 2026-08-14 14:10 UTC while driving workstream A4. It was written up rather than shipped
> inside that programme because a change to the money engine's scheduler deserves its own commit,
> its own RED harness and its own live verification — not a ride-along in a fee-and-copy sweep.
> That reasoning still holds; what has changed is that it now has its own slot, at the front.
>
> ⛔ **A deploy alone does NOT recover the three stalled chains** — see §3.

---

## §1 · WHAT IS TRUE ON PRODUCTION RIGHT NOW

Read from the live database, 2026-08-14 14:10:30 UTC:

| Chain | State | `nextBoundaryAt` | Last round OPENED | Dead for |
|---|---|---|---|---|
| **XAU 15m** | `RUNNING` | 2026-08-13 21:08 | 2026-08-13 20:50 | **~17 hours** |
| **XAU 30m** | `RUNNING` | 2026-08-10 21:08 | 2026-08-10 20:32 | **~4 days** |
| **XAU 60m** | `RUNNING` | 2026-08-10 21:49 | 2026-08-10 20:37 | **~4 days** |
| BTC 3/5/10/15m · ETH 3/5/10/15m · SOL 30/60m · XRP 15m | `RUNNING` | all within minutes of now | 14:01–14:08 | — |

**Every Gold chain reads `RUNNING` and has opened nothing.** Every non-Gold chain is current.
Gold is an ENABLED asset: it is offered on the player board at `/updown?asset=XAU`, and a
player who taps it sees only CLOSED and settled cards. Measured from the product side too —
a live drive on `asset=XAU&d=15` timed out with *"the board showed only CLOSED/settled
cards"* while every crypto chain took bets normally.

⚠️ **And Gold is the asset that VOIDs most** — 11 of the 30 voids in the preceding 24 hours.
That matters here only because it is why the stall was noticed at all: A4 needed a real
voided round, Gold was the obvious chain to bet on, and it would not open one.

---

## §2 · WHY IT CANNOT RECOVER — the mechanism, not a guess

`advanceChain` in `src/lib/server/updown-service.ts`:

```ts
const openSession = marketSessionAt(asset.category, boundaryIso, await deadHoursFor(asset.symbol));
if (!openSession.open) {
  return { observation: obs.state, closed, opened: false, detail: describeClosure(openSession) };   // ← returns
}
...
// 4 · Re-arm: the next boundary is DERIVED, never accumulated.
const nextIso = new Date(boundaryAfter(anchorMs, chain.durationMinutes, Date.parse(boundaryIso))).toISOString();
await chainStore.patch(chain.id, { nextBoundaryAt: nextIso });                                       // ← never reached
```

**The re-arm is BELOW the session gate, and the session gate returns.** So:

1. Gold's session closes. The tick fires on a boundary that now falls inside the closed
   session. `marketSessionAt` says closed, the function returns early, and `nextBoundaryAt`
   is left pinned at that boundary.
2. The session reopens hours later. The tick fires again — and the gate is evaluated at
   **`boundaryIso`, the stale pinned boundary**, not at now. That instant is still inside the
   closed session. It returns early again.
3. There is no path out. The chain is deadlocked on the boundary that closed it.

⛔ **This is a deadlock by construction, not a race.** It is deterministic: any asset with
trading hours stalls permanently at its first session close after a deploy, and only crypto
(`sessionKindFor` → `"always"`) is immune. That is exactly what the table in §1 shows —
crypto fine, gold stopped, and the two 30m/60m chains stopped four days ago at Monday's close
and never came back.

⭐ **The correct shape already exists thirty lines below, in the abandon branch:**

```ts
const skipTo = new Date(boundaryAfter(anchorMs, chain.durationMinutes, Date.now())).toISOString();
await chainStore.patch(chain.id, { nextBoundaryAt: skipTo });
```

That branch re-arms from **`Date.now()`**, so it walks forward past a backlog instead of
grinding. The session-closed branch needs the same and does not have it.

---

## §3 · THE FIX, AND HOW TO PROVE IT

```ts
if (!openSession.open) {
  // ⛔ RE-ARM BEFORE RETURNING. Without this the chain is pinned to a boundary INSIDE the
  // closed session, the gate is re-evaluated at that same stale instant on every later tick,
  // and the chain can never reopen — measured on production 2026-08-14: all three XAU chains
  // RUNNING with nothing opened for 17 hours / 4 days. Same shape as the abandon branch below.
  const skipTo = new Date(boundaryAfter(anchorMs, chain.durationMinutes, Date.now())).toISOString();
  if (skipTo !== boundaryIso) await chainStore.patch(chain.id, { nextBoundaryAt: skipTo });
  return { observation: obs.state, closed, opened: false, detail: describeClosure(openSession) };
}
```

⚠️ **`boundaryAfter(..., Date.now())` alone is not sufficient and must be checked.** If the
NEXT boundary is also inside the closed session the chain simply re-arms to it and waits —
correct, and it costs one tick per boundary until the session reopens. What must NOT happen is
a re-arm to the same instant, which is why the equality check is there: a patch that writes
back the value it read is how a "fix" reproduces the bug while looking busy.

**Prove it RED first**, and with a positive control in the same run:

1. A chain on a market-hours asset (`category: "commodity"`), armed at a boundary inside a
   closed session, advanced twice: the SECOND tick must arm a boundary at or after now.
   Against today's code the boundary never moves — that is the red.
2. **The positive control that matters:** the same chain, session OPEN, must still open a
   round. A "fix" that re-armed unconditionally would skip live boundaries, and a suite that
   only checked "the boundary moved" would be green on it.
3. And a crypto chain must be unaffected in both directions — it never reaches this branch.

**Then recover the three stranded chains on production.** A deploy alone does NOT fix them:
`nextBoundaryAt` is persisted, so each stalled chain is still pinned to its 2026-08-10 /
2026-08-13 boundary and hits the same gate. They need the re-arm to run once, which the fixed
branch does on the first tick after deploy — ⛔ **verify that by reading `nextBoundaryAt` and
`opensAt` off the live DB afterwards, not by assuming the deploy did it.**

---

## §4 · WHAT IT IS NOT

- ⚠️ **Not the instrument.** The stall was measured from the DATABASE (chain rows, round
  rows) *and* seen from the PRODUCT (a live drive found no open round on `asset=XAU&d=15`
  across a full five-minute poll). Two independent readings, one conclusion.
- ⚠️ **Not the price feed.** The provider is fine: Gold's price renders on the live board's
  ticker (`GOLD $4,351.59`) in every screenshot taken this session. It is the CHAIN that is
  not opening rounds, not the data that is missing.
- ⚠️ **Not the `STOPPED` state.** BTC 30m/60m are `STOPPED` and have no `nextBoundaryAt` at
  all — that is an operator decision and is working as designed. The Gold chains are
  `RUNNING`, which is what makes this an outage rather than a setting.
- **Not a money loss.** No round means no stake: nothing is stranded and no player is out of
  pocket. The cost is a dead asset on the board and, per `docs/UPDOWN-SPEC.md`'s own
  reasoning, the thing that makes "the game is closed" and "the game is broken" look
  identical to an operator.
