# 🔴 FINDING — GOLD HAS BEEN DEAD SINCE ITS LAST SESSION CLOSE, AND CANNOT RESTART ITSELF

> **STATUS: 🟢 FIXED IN CODE — session 3, 2026-08-14. Ali cleared it to go first.**
> The re-arm is in `advanceChain`'s market-hours branch; the contract is pinned by
> `npm run test:updown-rearm` (24 assertions) and `npm run red:updown-rearm` (8/8 mutations
> caught, positive control green in the same run). ⏳ Live recovery of the three stranded
> chains is verified in §5 below — ⛔ **a deploy alone does NOT recover them**, see §3.
>
> Found 2026-08-14 while driving workstream A4. It was written up rather than shipped inside
> that programme because a change to the money engine's scheduler deserves its own commit, its
> own RED harness and its own live verification — not a ride-along in a fee-and-copy sweep.

---

## §1 · WHAT IS TRUE ON PRODUCTION RIGHT NOW

Read from the live database, re-measured 2026-08-14 17:16:48 UTC with
`scripts/live/ops/chain-stall-census.cjs`:

| Chain | State | `nextBoundaryAt` (UTC) | Last round OPENED | Dead for |
|---|---|---|---|---|
| **XAU 15m** | `RUNNING` | 2026-08-13 21:08 | 2026-08-13 20:50 | **20.1 hours** |
| **XAU 30m** | `RUNNING` | 2026-08-10 21:08 | 2026-08-10 20:32 | **3.8 days** |
| **XAU 60m** | `RUNNING` | 2026-08-10 21:49 | 2026-08-10 20:37 | **3.8 days** |
| BTC 3/5/10/15m · ETH 3/5/10/15m · SOL 30/60m · XRP 15m | `RUNNING` | all within minutes of now | 17:01–17:14 | — |
| BTC 30m/60m | `STOPPED` | — (no boundary at all) | 2026-08-13 09:44 | operator decision, not a stall |

🔴 **AND THE FIRST VERSION OF THAT CENSUS REPORTED ALL SIXTEEN CHAINS STALLED BY THREE HOURS.**
Prisma maps `DateTime` to `timestamp` **without** time zone, and node-postgres parses a naive
timestamp in the *client's* zone — so on a laptop in EAT every value came back shifted −3h and
the healthy chains looked dead too. The product was fine; the instrument was lying, and it was
lying in the direction that would have sent this session chasing a phantom platform-wide
outage. The census now reads every timestamp as `::text` and parses it as the UTC it is.
⚠️ The stall table's own first draft carried the same error in the other direction: it recorded
the boundaries as local EAT and labelled them UTC. The hours above are the corrected ones.

⭐ **The three boundaries all fall in 21:00–22:00 UTC — gold's measured daily settlement
break**, not "Monday's close" as this file first said. That matters: the break happens EVERY
weekday, so the deadlock had a fresh chance to fire once a day, and the reason 30m and 60m
died on the 10th while 15m survived to the 13th is only which chain happened to have a
boundary land inside the hour first.

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

## §3 · THE FIX, AND HOW IT WAS PROVEN

```ts
if (!openSession.open) {
  // ⛔ RE-ARM BEFORE RETURNING, OR THE CHAIN DEADLOCKS ON THIS BOUNDARY FOREVER.
  const fromMs = Math.max(Date.parse(boundaryIso), now);
  const skipTo = new Date(boundaryAfter(anchorMs, chain.durationMinutes, fromMs)).toISOString();
  if (skipTo !== boundaryIso) await chainStore.patch(chain.id, { nextBoundaryAt: skipTo });
  return { observation: obs.state, closed, opened: false, detail: describeClosure(openSession) };
}
```

⛔ **`Math.max(boundaryIso, now)`, and NOT `Date.now()` as this file first prescribed.** All
weekend a gold chain sits pinned to a boundary that is still in the FUTURE and already shut;
`boundaryAfter(…, now)` alone would rewind it to a boundary *before* the one it was holding,
and a rewound chain can re-open a boundary it has already passed. Taking the later of the two
is what makes the re-arm strictly forward on both sides of the boundary. The harness's §5
exists for that case and it is a real one, not a hypothetical: it went red against the
prescription above.

⚠️ **If the NEXT boundary is also inside the closed session**, the chain re-arms to it and
waits — correct, and it costs one tick per boundary until the session reopens. What must NOT
happen is a re-arm to the same instant, which is why the equality check is there: a patch that
writes back the value it read is how a "fix" reproduces the bug while looking busy.

### Proven RED first — `npm run test:updown-rearm` · `npm run red:updown-rearm`

Against the unfixed code the suite ran **19 passed, 5 failed**, and the five were exactly the
deadlock: the boundary did not move, did not reach now, was written back unchanged, was still
pinned on the second tick, and was not moved forward from a future shut boundary. Everything
else — the refusal to open into a closed market, the crypto control, the abandon deadline, a
real round opening on a priced boundary — was green in that same run. After the fix: **24/24**.

The RED harness caught **8/8** mutations, and prints the unmutated suite's result first so a
broken suite cannot masquerade as a working guard. Each mutation fails a *different*
assertion, which is what says the sections are not padding:

| Mutation | First assertion it breaks |
|---|---|
| `rearm-deleted` — the live defect, restored | 1.1 the boundary never moves |
| `rearm-writes-back-what-it-read` | 1.1 — "moved" to itself, so pinned |
| `rearm-from-boundary-not-now` — the one-span crawl | 1.2 lands one span on, not at/after now |
| `rearm-from-now-only` — the rewind | 5.1 dragged backwards |
| `gate-always-closed` — ⛔ over-correction | 2.1 a live boundary is skipped |
| `abandon-deadline-disarmed` — ⛔ over-correction | 2.1 skipped before its price can publish |
| `gate-read-at-now` | 1.4 opens a round into a shut market |
| `crypto-loses-its-24-7-calendar` | 0.2 — proves §3's immunity claim is not vacuous |

🔴 **AND THE HARNESS CAUGHT A DEFECT IN THE SUITE, WHICH IS WHY IT EXISTS.** On the first full
run `gate-always-closed` scored **MISS**. Not because the guard was weak: with no round ever
opening, §6 dereferenced a round that was not there, the suite died *before* printing its
`FAILURES — n passed, m failed` line, and the harness reads that line to decide whether the
guard fired. So the loudest possible failure — the product throwing — was scored as **"the
guard did NOT catch this"**. A crash IS a red, but only if it is counted. The suite now traps
`uncaughtException` and `unhandledRejection`, counts them as a failure and still emits its
summary; and §6 guards the dereference so a missing round is reported as a FAIL that says why.
⚠️ Worth copying into the other suites: every one of them ends with a summary line the RED
harnesses trust, and none of the others survives a throw either.

**Then recover the three stranded chains on production.** A deploy alone does NOT fix them:
`nextBoundaryAt` is persisted, so each stalled chain is still pinned to its 2026-08-10 /
2026-08-13 boundary and hits the same gate. They need the re-arm to run once, which the fixed
branch does on the first tick after deploy — ⛔ **verify that by reading `nextBoundaryAt` and
`opensAt` off the live DB afterwards, not by assuming the deploy did it.** §5 records that.

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
