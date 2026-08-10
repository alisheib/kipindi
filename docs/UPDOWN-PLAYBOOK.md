# The Asset Playbook — how an operator is stopped from creating a bad round

**Status: COMPLETE.** Engine, persistence, the measurement job, the readiness seam, the server
write gate, the calendar gate and the admin console are all wired. Proven end to end against a real
Postgres on 2026-08-10: the job pulled live bars → wrote profiles → and `createChain` refused
`XAU/15m` with the measured sentence, so the board came up with two gold chains instead of three.
Written 2026-08-10. The engine is `src/lib/updown-playbook.ts`, guarded by
`npm run test:updown-playbook` (**78 assertions**, the last 16 of which test the WIRING rather than
the maths) with `scripts/updown-playbook-red.mjs` proving the guard actually fails when the engine
is broken (7/7 mutations caught, byte-for-byte restore).

---

## The problem this closes

`symbolReadiness` already gates a chain on two axes, and both read **our own round history**:
`FeedAdvice` asks whether an asset can be priced in time, `MovementAdvice` whether it moves enough
to decide. That is the right source with one hole that cannot be closed from inside it — **an asset
we have never listed has no history**. Learning that a 5-minute Solana round refunds a third of the
time has meant running Solana rounds and refunding a third of them, in front of real players.

This module reads **the provider's own bars** instead, so the question is answerable before anyone
has staked anything. It is a third advice source feeding the same combinator under the same
escalate-only rule, not a replacement for either.

## The four questions, and why a refund rate answers only one

| Axis | Question | What it caught on 2026-08-10 |
|---|---|---|
| **Coverage** | Did the provider actually return every minute? | XLM 96.4%, LINK 99.0%, AVAX 98.7% — refused. Every other asset returned 100%. |
| **Decisiveness** | Does the price clear the margin often enough? | Gold refunds 21.9% at 3 min and 4.8% at 30. Litecoin refunds 44.5% at 5 min at any margin. |
| **Signal quality** | Is a move the market moving, or the quote wobbling? | GBP/USD variance ratio **0.50** — half of a short round's "move" reverses. Gold **1.48** — it trends. |
| **Exploitability** | Can a naive player beat our commission? | **USD/TZS: betting against the last 5-minute move wins 66.4%.** Its refund rate is 0.0% — every other gate would have waved it through. |

⭐ **USD/TZS is the case that justifies the whole module.** A pegged rate produces a tape that never
sits still enough to refund and never moves enough to be fair. On refund rate alone it looks like
the best asset on the platform. It is the worst.

## What blocks, what warns, and why the line is where it is

- **Exploitability blocks.** Break-even against a 13%-of-pool commission is about 6.5 points over a
  coin, so an asset where a naive strategy clears that is refused outright and cannot be overridden.
- **The variance ratio only warns.** It was a refusal in the first draft, and **gold failed it** —
  a live asset that has settled real money for weeks, whose actual naive edge is 3.2 points,
  comfortably inside the fee. A proxy that condemns a working instrument is worse than no proxy.
  Persistence answers the question that matters; the variance ratio explains why and is a caveat.
- **Refund rate warns above 5% and blocks above 15%**, per duration.
- **Coverage blocks** below 99.5%.
- **A level 2 is overridable with a written reason** that lands in the audit chain. A level 3 never
  is. That difference is the entire contract between this system and the operator: it constrains
  judgement, it does not replace it.

## The two derived numbers

**Minimum round length.** The smallest allowed duration where the margin floor is at most
`maxFloorShareOfMove` of a typical move *and* the refund rate is under the block threshold. Both
conditions, because they fail differently: the first is "the band is too wide for this length", the
second is "the tape is simply flat" — Bitcoin at 3 minutes fails only the second, and no margin
change reaches it. At the default 0.10, gold lands on **30 minutes**. That is a result, not a
constant; move the knob and it moves.

**Dead windows.** Hours whose median 1-minute move falls below `deadWindowRatio` of the asset's own
median across its other hours — *relative*, never absolute, because gold moves cents and Bitcoin
moves tens of dollars. This finds gold's **21:00–22:00 UTC** settlement break (0.064× its own
normal) and correctly finds nothing on Bitcoin (0.62×). ⛔ `market-calendar.ts` models the weekend
only and cannot see this.

## Escalate-only, inherited verbatim

`updown-symbols.ts` §316 states that measurement may only escalate a catalogue floor, never remove
one, because the catalogue rests on price-scale and seam arithmetic that history cannot see. That
reasoning applies to this source with the same force, and `deriveMinDuration` returns the stricter
of the two. **A profile can make an asset harder to list. It can never make one easier.** Guarded at
test 2.2 and mutation 1 of the RED harness.

Freshness is deliberately asymmetric: a stale profile stops being able to *clear* a concern, but its
blocks stand. "We measured this six weeks ago and it was unplayable" is still better evidence than
nothing.

## Everything is a knob

`DEFAULT_POLICY` is the fallback exactly as `DEFAULT_GRANTS` is for RBAC — the system is correct
with an empty table, and one `SystemConfig` row at **`updown.playbook.policy`** overrides any subset
without a deploy. `resolvePolicy` ignores unknown keys, ignores out-of-range values rather than
applying them, and clamps an inverted warn/block pair rather than throwing, because a bad config row
must not take the console down.

| Knob | Default | What moves when you change it |
|---|---|---|
| `maxFloorShareOfMove` | 0.10 | every asset's minimum round length |
| `deadWindowRatio` | 0.25 | which hours are refused |
| `warnRefundRate` / `blockRefundRate` | 0.05 / 0.15 | which lengths are discouraged vs refused |
| `maxDirectionalEdge` / `warnDirectionalEdge` | 0.065 / 0.050 | which assets are refused as exploitable |
| `minCoverage` | 0.995 | how patchy a feed may be |
| `maxVarianceRatioDrift` | 0.35 | when a tape is called out as unfair-looking |
| `minProfileDays` / `maxProfileAgeDays` | 7 / 35 | when a measurement counts, and when it goes stale |
| `allowOverrideOnWarn` | true | whether an operator may proceed past a warning at all |

## What is wired, and where

**Persistence — `SystemConfig`, deliberately NOT a new table.** ⛔ A new Prisma model means a
migration, and `.claude/skills/railway/SKILL.md` states in capitals that `migrate deploy` runs
*before* `next start`: a migration that fails means the container never boots and the live money
site is down. Every profile is a small JSON document keyed by symbol, which is precisely what
`SystemConfig` already holds for bonus config, privacy and market config. One row per asset at
`updown.playbook.profile.<symbol>`, one for the policy, one index. No schema change, no migration,
so this change **cannot take the site down**. Promote it to a table the day profiles want indexing
or history — with a migration pre-applied from a laptop, per that skill.

**The measurement job — `scripts/ops-updown-profile.mts`.** Pulls 1-minute bars and writes the
profile. Touches no market, round, wallet or ledger, so it is safe on a schedule and safe on prod.
It is also the **discovery** path: point it at any TwelveData symbol and it screens one that has
never been listed. Verified against the live provider on 2026-08-10 — it independently reproduced
gold's 30-minute minimum, its 21:00 UTC dead hour, and Bitcoin's clean sheet.

**The readiness seam — `symbolReadiness` takes a fifth argument.** It sits *after* the feed and
movement refusals, because those two describe something that went wrong with a round and this one
describes an asset that should never have been listed; an operator should hear the fixable things
first. A ② joins the caveats rather than winning a race. An ABSENT verdict stays absent — it means
"nobody measured", never "measured and fine". `toReadinessAdvice` is the one place `reason` becomes
`message`, so the catalogue gains no dependency on the playbook.

**The calendar — `marketSessionAt` accepts the measured dead hours** and finally emits the
`session-break` reason its own type has declared since it was written. The hours are derived per
asset and passed in, never listed in the calendar: a file that hardcodes "21" is wrong the day an
exchange moves its settlement and says nothing at all about the next instrument.

⛔ **THE GATE IS ON THE OPEN PATH ONLY — `generateRoundNow` and `advanceChain` — AND NEVER ON
SETTLEMENT.** Declining to open costs nothing, because no round means no stake. `readPrice` is
settling a round that already holds player money, and refusing there would turn a live round into a
refund: the exact harm this gate exists to prevent. A round that opened must settle on its real
boundary, whatever the tape did afterwards. `deadHoursFor` also returns `[]` on any error, so a
missing profile or an unreachable config store can never stop a round opening.

## The console

⭐ **It needed no redesign, and that is the point.** `/admin/updown` already renders each duration
option from a `symbolReadiness` level — greying a ③, showing a ② with its sentence. Handing it the
third advice source is a one-argument change at four seams (each duration option, the
usable-at-any-duration test, the asset's own verdict, and the session pill), and the guided
behaviour falls out: a length the tape refuses is greyed with the measurement that refused it.

⛔ `findSymbol(a.symbol)` is deliberately still called INLINE rather than hoisted to a local. Two
source-text guards anchor on it, and the property they protect — the console uses the same symbol
lookup the server gate does — is real. A redundant call is cheaper than a weakened guard.

⚠️ Three guards did need widening, and the reason is worth recording: they asserted
`…measured, movement)` — anchoring on movement being the LAST argument, which was never the
invariant. Adding a fifth source broke the wording, not the property. They now match
`movement[,)]`, which still fails if movement is dropped or reordered. This is §0.1a's own lesson —
**anchor on structure, not on wording** — arriving from the other direction.

## The honest limits

- The fixture behind the guard is **14 days for BTC and XAU, 7 for everything else**. Enough to
  rank; not enough to launch an asset on. `minProfileDays` exists so the engine says so itself.
- **Seam noise is measured but not yet wired in.** `|open[t] − close[t−1]|` runs at a median of
  **71% of a typical minute's move on gold** and **0% on Bitcoin** — the OTC feeds disagree with
  themselves in a way the crypto feeds do not. Settlement reads `bar.open`, whose series is
  well-behaved on both, so this is not currently a fairness defect. It is the obvious fifth axis.
- **Nothing here measures one-sidedness**, which is a larger cause of refunds than everything in
  this module and is a product problem, not a data problem.
- The exploitability test is one naive strategy. It bounds the floor of the risk, never the ceiling.
