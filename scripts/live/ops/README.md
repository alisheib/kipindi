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
KP_REPO=F:/kipindi-main node scripts/live/ops/census.cjs
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
| `stranded-check.cjs` | is money stuck, or inside its objection window | timing is the whole answer |
| `e138-diagnose.cjs` · `orphan-stakes.cjs` | why a pool has no positions; is anyone out of pocket | the ledger is the arbiter, not the pool |

## Rules

- ⛔ **Read-only.** Nothing here writes. The one write tool is
  `scripts/ops-backfill-predictor-count.mjs`, which is dry-run by default and lives at the top
  level with the other `ops:` scripts.
- ⛔ **The product cannot be its own witness about money.** Compare a rendered figure to the
  row, never to another rendering of itself.
- ⚠️ **Before believing a red, ask "is this the product, or my list?"** More of what went red
  during session 38 was these instruments than the platform.
