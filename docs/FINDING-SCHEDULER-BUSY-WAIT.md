# 🔴 FINDING — THE UP & DOWN SCHEDULER BUSY-WAITED ON EVERY BOUNDARY OF EVERY CHAIN

> **STATUS: 🟢 FIXED — session 3, 2026-08-14.** Sibling of
> `docs/FINDING-GOLD-CHAINS-STALLED.md`: the same re-arm, wrong in a second way. The gold
> deadlock made a chain stop; this made every chain spin. Found while measuring the first.
>
> Pinned by `npm run test:updown-tick-cadence` (28 assertions) and
> `npm run red:updown-tick-cadence` (8/8 mutations, positive control printed first).

---

## §1 · WHAT IT WAS DOING, MEASURED

`railway logs` on the live service returned **500 identical lines** covering 72 seconds — the
same six chains, the same boundary, the age counter creeping 90s → 91s across dozens of them:

```
[updown] udc_21ed3cf096ad2000 boundary pending — open price for 2026-08-14T16:56:00.000Z
         not published yet (90s) — not opening a round that could only void; will retry
```

| Measurement | Value | Source |
|---|---|---|
| Log lines | **6.9/sec**, 6 chains × ~1.15 fires/sec each | `railway logs --json`, 72.1s window |
| Transactions | **2,269/sec** | `pg_stat_database`, 45s window, 75-user platform |
| Rows returned | **20,105/sec** | same |
| What was running | **only** Up & Down scheduler statements — `UpDownRound`, `UpDownChain`, `UpDownObservation`, `UpDownAsset`, `SystemConfig` | 150 samples of `pg_stat_activity` |

⛔ **AND THE LOGS SHOWED ONLY HALF OF IT.** `fireChain` logs only when the observation reads
`pending`. The three stalled gold chains returned *above* that line, at the market-hours gate —
so they turned the same loop in complete silence, and had done since 2026-08-10. Counting
transactions is what sees both; the log alone would have understated the load by the three
chains that were spinning hardest and producing least.

---

## §2 · THE MECHANISM

```ts
const raw = nextMs - Date.now();
let delay = raw <= 0 ? (opts?.graceOnPast ? BOOT_GRACE_MS : 0) : raw;   // ← the 0
```

Two branches of `advanceChain` deliberately **do not move** `nextBoundaryAt`:

1. **The bar has not published yet.** Correct, and load-bearing — a bar labelled T does not
   exist until ~+19s (BTC/ETH/XAU) or ~+87s (SOL), so the boundary must be retried or no round
   would ever open. E-83's whole point.
2. **The market is shut** (the gold deadlock, fixed separately).

On both, `fireChain`'s `finally` re-armed with `minDelayMs: 0`, `armChain` saw a boundary
already in the past, and computed **`delay = 0`**. Fire → decline → re-arm at 0 ms → fire, as
fast as the database could answer, for the whole ~90–130 seconds a bar takes to appear, on
every boundary of every chain, for ever on the stalled ones.

⭐ **AND IT BOUGHT NOTHING AT ALL.** The provider is gated by the observation backoff ladder
(E-86), so the extra fires never re-read the price — they returned *"waiting Ns before attempt
N+1"* from the same row and threw away ~10 database round-trips each time. On the live tape a
BTC 5-minute round's bar publishes at ~+90s and the round opened at **+91s**: reads at +0, +15,
+30 … +90 (rung 1 = 15s), which is the ladder, and ~450 fires to take 7 reads.

---

## §3 · THE FIX

Two parts, and the second is the one that matters.

**① A floor, as a backstop.** `nextFireDelayMs` is extracted as a pure function so the spin is
provable without a clock, and a past boundary now re-arms at `REFIRE_FLOOR_MS` (1s) instead of
0. ⛔ The boot path keeps its own, longer `BOOT_GRACE_MS` (20s) — collapsing the two would make
a restart hammer every chain at once, which is the same outage wearing a different hat.

**② The ladder's own number, as the cadence.** `acquireObservation` already knows exactly when
the next read is allowed; it now publishes that as `retryAfterMs`, `advanceChain` forwards it
from the one branch that leaves the boundary alone, and `fireChain` arms with it.

⭐ **THE HINT IS NOT AN ESTIMATE OF THE GATE — IT IS THE GATE'S OWN REMAINING WAIT.**
`now + retryAfterMs === readyAt`, asserted directly (§2.1 of the suite) and again through the
real timer (§5.3, which landed within **1 ms**). That identity is the whole no-regression
argument: a fire scheduled by the hint lands on the instant the gate opens, so **every read
happens on exactly the tick it happens today**, and no round opens later than it does now.
The fires that disappear are precisely the ones the gate was already refusing.

Bounded on both sides:
- ⛔ never past the **abandon deadline** — sleeping through it would leave a round waiting to
  be voided, which is E-24's exact shape;
- a **FAILED** reading is terminal, so it waits for the deadline rather than for a rung it can
  never climb (~1 fire instead of ~26).

**③ And the operator's readout stopped lying.** `timers.set(id, { at })` stored the *boundary*,
not the fire instant — so a chain pinned to a stale boundary reported a "next fire" in the
**past** on `/admin/system`. The two agree whenever the boundary is ahead of now, which is why
the difference stayed invisible until three chains were not.

### Proven RED — `npm run red:updown-tick-cadence`, 8/8, positive control 28 green

| Mutation | First assertion it breaks |
|---|---|
| `floor-removed` — the live defect, restored | 1.2 a past boundary re-fires at 0 ms |
| `boot-grace-collapsed` — ⛔ over-correction | 1.4 a restart hammers every chain |
| `hint-ignored-by-scheduler` | 5.2 — only the real fire→re-arm loop can see this |
| `hint-is-a-guess` — ⛔ over-correction | 2.1 the identity with the gate fails |
| `hint-unbounded-by-deadline` — ⛔ over-correction | 3.3 sleeps past the abandon deadline |
| `failed-waits-a-rung` | 3.4 retries a terminal reading |
| `moved-branch-hints-anyway` | 3.5 a stale hint overrides a correct timer |
| `health-reports-the-boundary` | 4.1 the admin readout lies again |

⚠️ **Three of the eight are over-corrections, deliberately.** The failure mode of "space the
fires out" is spacing them past the moment the price becomes readable — which would push every
round's open into its own betting window, and would be invisible in the very logs the original
defect filled. A harness that only proved "fewer fires" would be green on it.

---

## §4 · 🟢 MEASURED ON PRODUCTION AFTER THE DEPLOY

Deployed `e27ea9dd` at 2026-08-14 17:54 UTC. Same instrument, same 45-second window, same
database, chains all running:

| `pg_stat_database` | before | after | |
|---|---|---|---|
| transactions/sec | **2,269.2** | **3.5** | **648× less** |
| rows returned/sec | **20,105** | **110** | **183× less** |
| rows fetched/sec | 875 | 61 | |

⭐ **AND THE CADENCE IS UNCHANGED, which is the claim that had to be checked rather than
asserted.** Open latency — how long after its own boundary a round row is created — is the
number that moves if the fix delayed any read:

| | rounds | min | median | max |
|---|---|---|---|---|
| before the deploy | 179 | 80s | **92s** | 303s |
| after | *re-measured with a full sample at the end of the session* | | **91s** | |

The gold chain's recovered round #267 opened at +106s in the same minute three crypto chains
opened at +106s. ⚠️ The "after" figure was n=1 at the moment of the deploy and is re-measured
below with a real sample — a median over one round is an anecdote, not a measurement.

---

⚠️ **§5's first fixture was wrong and the suite said so.** It left the mock feed to decline a
boundary two seconds old — and the mock quotes the present instant, so the boundary was
CONFIRMED, a round opened, and the chain re-armed six minutes out on the ordinary path. The
assertion went red over a fixture that had quietly tested the opposite case. It now gates on
the ladder instead, so the decline is the product's own and independent of the feed.
