# Live production probes

Read-only instruments for asking production a question and getting an answer you can defend.
Committed **on purpose**, 2026-08-10: they used to live in a session scratchpad, and an audit
of session 38's close-out found the handoff telling the next session to "re-run the census"
when the census had been deleted with the scratchpad it lived in. **A tool named in a handoff
has to exist in the repo, or the handoff is fiction.**

## Getting a live `DATABASE_URL`

⛔ **The `DATABASE_URL` Railway injects is `postgres.railway.internal` and resolves nowhere off
the platform. Every read through it silently returns DEFAULTS** — no error, just wrong answers.
That trap has cost this campaign a whole session before.

```bash
# from the repo root — writes scripts/live/ops/.env (gitignored), never prints the secret
railway run -s 50pick -- node scripts/live/ops/mkenv.cjs
```

`mkenv.cjs` rewrites the host onto the Postgres service's public TCP proxy and **asserts the
rewrite happened**, refusing to write a file that still points at the internal host.

⚠️ `railway variables` is refused by the permission classifier by design — use `railway run`.

## Running a probe

Every script loads `./.env` from this directory and takes `KP_REPO` for its `pg` import:

```bash
node scripts/live/ops/census.cjs
```

| Script | Answers | The trap it encodes |
|---|---|---|
| `census.cjs` | the whole money position in one read | ⭐ **cross-checks `users`/`marketsLive`/`marketsResolved` against `/api/health`** — three matching numbers is what proves you read production and not a default. ⚠️ It separates *in flight* from *stranded*: an OPEN position on a settled market is **correct** while the objection window is open (24h), and reading that as stranding produced a false 🔴 |
| `payout-probe.cjs` | who owns a stuck payout; does the ledger tie | a `DRIFT` it reported was the **instrument**, not the product — it forgot `hold`. `balance + hold` is the identity |
| `txn-forensics.cjs` | the audit trail behind one transaction | how a payout was proven to have **never reached a rail** before it was reversed |
| `payments-now.cjs` | what the payout rail has actually done | ⛔ separates `BET_PAYOUT` (an internal wallet credit) from `WITHDRAWAL` (money leaving to Selcom). Conflating them reads as "payouts work" when the rail is untested |
| `e63-window.cjs` | is a guard measuring the product or the calendar | showed 1,915 "failures" were all rounds **deleted with the board** |
| `e63-red.cjs` | can the E-63 guard still fail | corpus + inverted-predicate proof, read-only |
| `e134-count.cjs` · `e134-timeline.cjs` | audit-row volume and its per-minute pairing | ⚠️ fixing the subject mid-measurement makes the "after" window prove nothing |
| `predictor-zero.cjs` | which POPULATION a count counts | stopped a backfill writing *"TZS 500,000 volume · 0 predictors"* onto 37 cards |
| `e138-diagnose.cjs` · `orphan-stakes.cjs` | why a pool has no positions; is anyone out of pocket | the ledger is the arbiter, not the pool |
| `poll-census.cjs` | the whole POLL lane: clocks, sweeps, settlement, content integrity | ⛔ filters `productLine = 'MARKET'` on EVERY query — the Up & Down rounds outnumber the polls ~12:1, so a forgotten filter reads as a healthy poll lane built entirely out of price rounds |
| `house-money.cjs` | where the platform's own money lives, and how much | ⚠️ separates what is OWNED (`HOUSE:COMMISSION`) from what is merely HELD — the TRA/GBT levies are owed to the state and `POOL:*` is players' stakes in escrow, not revenue |
| `handover-gap-census.cjs` | when round N settles, where is round N+1 | ⭐ **it decided a design.** The handover (E-166) was briefed around a countdown; this measured **1,186 of 1,203 settles in 24h (98.6%) with the successor ALREADY OPEN**, median −91.5s, born **0.1s** after its predecessor settled — so the countdown is the 1.3% case and a naive `nextOpen − now` renders a dead clock. ⚠️ Matches successors on the INSTANT, not `roundNumber + 1`: **20 of 2,357** successions skip a boundary and gap by 11–83 minutes, and the numbers stay adjacent while the clock does not |
| `chain-stall-census.cjs` · `chain-by-id.cjs` | which Up & Down chains have stopped producing rounds, and whether one is pinned to a boundary it can never pass | 🔴 **IT REPORTED GREEN OVER A LIVE OUTAGE (E-167), CORRECTLY, AND THAT IS THE LESSON.** By the time anyone ran it, the two failing chains had been **STOPPED BY HAND** — and it excludes non-RUNNING chains by design, because BTC 30m/60m are stopped on purpose. ⛔ **The remedy silenced the instrument**, and "5 not RUNNING (operator decision, not a stall)" is what a three-day outage looked like. It now calls out a chain STOPPED while still holding a `nextBoundaryAt` — a stop CLEARS that column, so something wrote it back — and it is RED at **one** span, not two, because past its own span no round can open at that boundary at all. ⚠️ Its span arithmetic was also wrong above 5 minutes (`dur + 1`, against a real 10+2 / 15+3 / 30+6 / 60+12), so a 60-minute chain's span read as 61 minutes and the threshold doubled the error |
| `pool-residual.cjs` | does every SETTLED market's pool return to zero | ⭐ found the commission-rounding defect that four money suites were green over: the error hid in a self-cancelling POOL/COMMISSION pair, so the aggregate balanced while the component did not |

<!-- ⛔ `stranded-check.cjs` WAS LISTED HERE AND HAS NEVER EXISTED. Removed 2026-08-11 after
     a close-out audit went looking for it. This file's own opening rule is that a tool named
     in a handoff has to exist in the repo or the handoff is fiction — the table had been
     breaking that rule about itself. The question it claimed to answer ("is money stuck, or
     inside its objection window") is answered by `census.cjs`, which separates IN FLIGHT from
     STRANDED on exactly that distinction. -->


## Rules

- ⛔ **Read-only.** Nothing here writes. The one write tool is
  `scripts/ops-backfill-predictor-count.mjs`, which is dry-run by default and lives at the top
  level with the other `ops:` scripts.
- ⛔ **The product cannot be its own witness about money.** Compare a rendered figure to the
  row, never to another rendering of itself.
- ⚠️ **Before believing a red, ask "is this the product, or my list?"** More of what went red
  during session 38 was these instruments than the platform.
