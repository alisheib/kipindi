# Session notes — bet-stake single-transaction (`feat/bet-stake-single-tx`)

> Dedicated money-hardening session, 2026-07-16. Spec followed exactly:
> `docs/bet-stake-session-prompt.md` DESIGN ("Option 3 — checks first, one tx,
> both locks held"). Branch only — **NOT merged**; Session M reviews + merges.

## What changed

### 1. `buyPosition` (`src/lib/server/market-service.ts`)
Before: five separate commits with hand-rolled compensation (real debit →
bonus spend → pool write in market lock → position + txn → fire-and-forget
ledger). A crash between any two left partial state for the nightly trial
balance to find.

Now, inside `withLock(wallet)` (unchanged order of gates: idempotency → wallet
read → loss-limit (C4) → affordability pre-check on the locked read):

```
withLock(wallet)
  … checks, build position + betTxnId (NO money moved yet) …
  outcome = withLock(market) {                 // lock order wallet→market PRESERVED
    fresh close re-check  → CLOSED? return (wallet UNTOUCHED)
    withMoneyTx(tx => {                        // ONE tx, opened AFTER both locks
      real debit (guarded)        — throw BetAbort(NO_FUNDS) on miss
      spendBonusLocked(…, tx)     — throw BetAbort(NO_FUNDS) on under-spend
      pool += stake · predictorCount += 1
      marketStore.set(fresh, tx)
      positionStore.set(position, tx)
      db.txn.create(BET_PLACED, tx)
      postLedgerEntries('stake_'+betTxnId, …, tx)   // THROWS → whole bet rolls back
    })
    recordSnapshot + SSE emit — AFTER COMMIT only
    return OK
  }
  CLOSED   → audit bet.rejected.closed_in_flight {side, stake, moneyMoved:false}
  NO_FUNDS → "Not enough balance."
  OK       → (deferred bonus.spent audit) → market.position.opened → notify → email
             → recordWageringLocked (outside tx, best-effort BY DESIGN)
affiliate onRecruitBet — outside the wallet lock (unchanged)
```

- `BetAbort` is a private control-flow error; it never escapes `buyPosition`.
- Any **unexpected** error inside the tx propagates (tx already rolled back) —
  surfaced to the API layer like any other server error, no partial state.

### 2. tx threading (new optional `tx` params, all backward-compatible)
- `MarketStore.set(m, tx?)` — interface + memory + PG impls (`market-dal.ts`),
  mirroring what `PositionStore.set` already had from C3.
- `spendBonusLocked(userId, amount, tx?)` → `spendBonusCore` (`bonus-service.ts`):
  every read+write threaded — `wallet.findByUserId(…, tx)`,
  `bonusGrant.listActiveByUser(…, tx)`, `bonusGrant.update(…, tx)`,
  `wallet.adjust(…, tx)`. Guard-miss self-compensation is **skipped in tx mode**
  (rollback undoes the grant decrements; the manual re-increment would
  double-apply after rollback). The `bonus.spent` audit is **deferred to
  post-commit** in tx mode so it can never narrate a rolled-back spend
  (in-memory mode audits inline, exactly as before).
- `prisma-dal.ts`: `wallet.findByUserId(…, tx?)`,
  `bonusGrant.listActiveByUser(…, tx?)` (in-tx reads MUST use the tx client —
  a pooled read inside an open tx would borrow a second connection per
  in-flight bet and not see the tx's own writes), and `bonusGrant.update(…, tx?)`
  (tx mode PROPAGATES db errors so the movement rolls back — same contract as
  `wallet.adjust`; self-committing mode keeps catch → null).
- Already had tx from C3 (verified, param positions confirmed):
  `wallet.adjust(id, deltas, opts?, tx?)` · `txn.create(t, tx?)` ·
  `positionStore.set(p, tx?)` · `postLedgerEntries(gid, entries, tx?)`.

### 3. New probe: `scripts/fault-injection-bet.test.mts` (npm run e2e:fault)
PG-only (same disposable-DB triple gate as the load harness; NOT in test:all).
Injects the fault at the **database level** — a `BEFORE INSERT` trigger that
RAISEs — so the failing statement is the real production INSERT, not a JS mock:
- **Phase 1** poisons `LedgerEntry` (the LAST write; the one that used to be
  fire-and-forget) → bet throws → row-level assert: wallet.balance,
  bonusBalance, grant.remainingTzs, grant.wageredTzs, pools, predictorCount all
  unchanged; zero Position/Transaction/LedgerEntry rows.
- **Phase 2** poisons `Transaction` (a middle write) → same full assert.
- **Phase 3** heals → same bet → lands EXACTLY once (every row value asserted,
  ledger group sums to 0, conservation holds).

## Behavior deltas (all intended, per spec)
1. **Ledger stake posting: fire-and-forget → in-tx.** A ledger failure now
   rejects the whole bet (rollback) instead of silently dropping the ledger row
   (old code: `.catch(() => {})`). In-memory mode postLedgerEntries no-ops as
   before (no LedgerEntry model there).
2. **closed-in-flight debits NOTHING.** The close re-check runs before any
   money write, so the refund/unwind path is deleted. Audit payload changed:
   `{side, stake, refundedReal, refundedBonus}` → `{side, stake, moneyMoved:false}`.
3. **Pool snapshot + SSE odds emit fire only after COMMIT** — subscribers can
   no longer see a pool state that later rolled back.
4. **`bonus.spent` audit is post-commit in tx mode** (see above). Same payload,
   same order relative to `market.position.opened`.
5. Defensive-only improvement: on a bonus under-spend in-memory the partial
   allocations are now refunded too (old code only re-credited the real part;
   unreachable under the wallet lock, but no longer leaks even in theory).
6. Everything else byte-identical: loss-limit timing, idempotency, wagering
   (outside tx, best-effort), affiliate, notifications, emails, fee math,
   error strings, result payloads.

## Why this exact shape (from the spec — do not re-derive)
- Checks-first kills the entire closed-in-flight unwind path.
- **Both advisory locks are acquired BEFORE the tx opens.** Tx-first would hold
  the bettor's wallet ROW inside an open tx while waiting on the market lock,
  while settlement (market lock → withMoneyTx paying that same wallet) waits on
  the row — an advisory/row-lock deadlock cycle that doesn't exist today.
  Locks-then-tx preserves today's deadlock-free property.
- Lock order wallet→market everywhere (cashOut depends on it) — unchanged.
- Accepted cost: the market lock is held for the whole short tx (~5–15 ms)
  instead of just the pool write. Correctness > per-market throughput.

## The bug the probe caught (why fault injection is not optional)
First implementation passed **tsc, build, all 66 in-memory suites, e2e:money
(drift 0.00) and s10** — and was still wrong: `db.txn.create` in the rewritten
buyPosition was missing its `tx` argument, so the BET_PLACED row committed on
its own connection outside the transaction. Phase 1 of the probe failed with a
stray Transaction row surviving an otherwise-perfect rollback. One-line fix
(`}, tx)`), full battery re-run green. No green suite short of row-level fault
injection would have caught it — the row is CORRECT whenever the tx commits,
which is every non-fault run.

## Proofs (all after the fix, final code)
| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run build` | clean |
| `npm run test:integrity` | OK |
| `node scripts/test-all.mjs --skip responsive` | **66/66 green** (battery grew by 1 since the prompt: `test:admin-money-ops` from Session M) |
| — incl. late-bet 14 · wallet-atomic 8 · bonus-betting 24 · bonus-stress 17 · money-invariants 78 · concurrency 34 · cashout-fee 21 · fee-model 78 | all green |
| `npm run e2e:money` (local PG, USE_PRISMA_DAL) | **57/57 · conservation drift 0.00** · all 25 ledger groups balanced · winner floor held |
| s10 double-spend (2 OS processes × 8 bets, wallet funded for 5) | **PASS — exactly 5 accepted, balance 0, pool 5000, Σ stakes 5000** |
| `npm run e2e:fault` (new probe) | **34/34** — full rollback at both poison points, exactly-once landing after heal |

Stale-test rule honoured: `late-bet.test.mts` needed **zero changes** — its
"wallet unchanged / pool unchanged" assertions on closed-in-flight pass
unchanged because the new design debits nothing (the spec predicted this).

Note: one s10 run (of two) showed a single transient `P2024` (Prisma pool-wait
timeout) among the 11 rejections, on the harness's deliberately tiny
`connection_limit=10` pool — the bet was cleanly rejected, no money moved, and
the verdict was exact. Per-bet connection footprint at the deepest point is now
3 (wallet-lock tx + market-lock tx + money tx) vs 2 before; all reads/writes
INSIDE the money tx use the tx client precisely so no 4th connection is ever
borrowed. Worth remembering when sizing `connection_limit` in prod.

## Files touched
- `src/lib/server/market-service.ts` — buyPosition rewrite + `BetAbort`
- `src/lib/server/bonus-service.ts` — spendBonusLocked/Core tx threading
- `src/lib/server/market-dal.ts` — `MarketStore.set(m, tx?)`
- `src/lib/server/prisma-dal.ts` — wallet.findByUserId / bonusGrant.update /
  bonusGrant.listActiveByUser tx params
- `scripts/fault-injection-bet.test.mts` — NEW probe
- `package.json` — `e2e:fault` script (not `test:*` on purpose — needs a DB)
- `docs/session-betstake-notes.md` — this file

## For Session M review
- The diff is small and localized; the buyPosition diff reads top-to-bottom as
  the spec pseudocode.
- Nothing outside bet placement was touched. Settlement/cashout/void paths
  still use their existing (C3) withMoneyTx shapes.
- No schema change, no migration, no new dependency.
- In-memory semantics preserved for every suite (tx === null → same call path,
  hand compensation at the two designed abort points).
