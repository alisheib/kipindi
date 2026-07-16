# Bet-stake single-transaction — dedicated session prompt + design handoff

> Copy-paste the PROMPT block into a fresh session. The design below it is the
> completed analysis from Session M (2026-07-16) — follow it; don't re-derive.
> Session M stays the go-live command center and will review + merge the branch.

---

## PROMPT (copy-paste)

You are running a DEDICATED money-hardening session for 50pick: make bet
placement fully atomic — every money write in ONE Prisma `$transaction`.
**Work ONLY in the separate clone `F:\kipindi-enhance` on branch
`feat/bet-stake-single-tx`. NEVER push/merge to `main`, never deploy, never touch
`F:\kipindi-main` or Railway.** Session M (the go-live session) reviews + merges.

Setup: `cd F:\kipindi-enhance && git checkout main && git pull && git checkout -b feat/bet-stake-single-tx`.
Read first: `.claude/skills/50pick-standards` + `.claude/skills/50pick-audit`,
then the DESIGN section of `docs/bet-stake-session-prompt.md` — it is the spec.
The local disposable Postgres (`F:\pg-loadtest`, port 5433) is YOURS this session
(start/reset per the 50pick-audit skill; 3 prod-safety gates apply).

Verification bar — ALL required before handoff:
1. `npx tsc --noEmit` clean · `npm run build` clean · `npm run test:integrity` clean.
2. FULL `node scripts/test-all.mjs --skip responsive` 65/65 — pay special attention
   to test:late-bet, test:wallet, test:bonus-betting, test:bonus-stress,
   test:money-invariants, test:concurrency, test:cashout, test:fee-model.
   If a test asserts the OLD closed-in-flight refund payload, verify intent
   before touching it (stale-test rule: the new design debits nothing on
   closed-in-flight, so "wallet unchanged" assertions must still pass unchanged).
3. On the local PG (`USE_PRISMA_DAL=true` + DATABASE_URL → :5433):
   `npm run e2e:money` → conservation drift 0.00; the s10 double-spend harness
   (`scripts/load/`) PASS; and a NEW fault-injection probe — force the ledger or
   txn insert to fail mid-bet and PROVE the wallet debit + bonus spend + pool
   increment all roll back (row-level evidence, not inference).
4. Document everything in `docs/session-betstake-notes.md` (what changed, the
   proofs with numbers, every behavior delta). Commit in small batches to the
   branch with clear messages; push the branch after each batch. Final commit
   message starts `HANDOFF READY:`. Do NOT merge, do NOT touch main.

---

## DESIGN (completed analysis — the spec)

### Current state (`placeBet`, `src/lib/server/market-service.ts` ~L290–590)
Money writes today are FIVE separate commits with hand-rolled compensation, all
inside `withLock(wallet:userId)`:
1. `db.wallet.adjust(-realPart, {requireBalanceGte})` — claim-guarded real debit.
2. `spendBonusLocked(userId, bonusPart)` — bonus wallet + grant rows; on
   under-spend, manually re-credits the real debit.
3. Inside nested `withLock(market:id)`: close re-check → pool `+= stake`,
   `predictorCount += 1`, `marketStore.set(fresh)` (+ snapshot + SSE emit).
   If closed in-flight → manual refund of #1 + #2 (`refundBonusLocked`).
4. `positionStore.set(position)` + `db.txn.create(BET_PLACED)`.
5. `postLedgerEntries('stake_'+txnId, …)` — currently FIRE-AND-FORGET
   (`.catch(()=>{})`).
A crash between any two leaves partial state (caught later by the nightly trial
balance, but not rolled back).

### Target design ("Option 3" — checks first, one tx, both locks held)
```
withLock(wallet) {
  idempotency check · wallet read · loss-limit (C4, unchanged position) ·
  affordability pre-check (realPart/bonusPart from the locked read)
  build position object + betTxnId
  outcome = OK
  withLock(market) {                       // lock order wallet→market PRESERVED
    fresh = marketStore.get
    if (!LIVE || selectionClosed || past resolution) { outcome = CLOSED; return }
    try {
      withMoneyTx(tx => {                  // ONE transaction, opened AFTER both locks
        debited = db.wallet.adjust(-realPart, {requireBalanceGte}, tx)  // verify param order!
        if (!debited) throw BetAbort(NO_FUNDS)
        spend = spendBonusLocked(userId, bonusPart, tx)   // NEW tx param — thread it
        if (spend.spent < bonusPart) throw BetAbort(NO_FUNDS)
        fresh pools/predictorCount/updatedAt mutations
        marketStore.set(fresh, tx)          // NEW tx param — thread it (PG impl ~L168)
        positionStore.set(position, tx)     // tx param EXISTS already (C3)
        db.txn.create({...BET_PLACED...}, tx)  // tx param exists (C3)
        await postLedgerEntries('stake_'+betTxnId, stakeEntries(...), tx)
        // tx-mode postLedgerEntries THROWS on failure → rolls back the whole bet.
        // This intentionally REPLACES today's fire-and-forget .catch(()=>{}).
      })
    } catch (BetAbort) { outcome = NO_FUNDS (+ in-memory compensation, below) }
    if (outcome === OK) { recordSnapshot(...); emit("market:odds", ...) }  // AFTER commit only
  }
  if (outcome === CLOSED)  → audit bet.rejected.closed_in_flight (payload now
      {side, stake, moneyMoved:false} — NOTHING WAS DEBITED, no refunds exist)
      → return SELECTION_CLOSED
  if (outcome === NO_FUNDS) → return "Not enough balance."
  audit market.position.opened · notifyBetPlaced · email · recordWageringLocked
  (wagering stays OUTSIDE the tx — best-effort by design, must never fail a bet)
}
affiliate onRecruitBet stays outside the wallet lock (unchanged).
```

### Why this exact shape (do not deviate without re-deriving)
- **Close re-check BEFORE any money write** kills the whole closed-in-flight
  unwind path — no compensation, no refund audit, wallet untouched.
- **Both advisory locks acquired BEFORE the tx opens.** If the tx were opened
  first (debit, then wait on the market lock), a bet's open tx would hold the
  bettor's wallet ROW while settlement (market lock → withMoneyTx paying that
  same wallet) holds the market lock → advisory-lock/row-lock deadlock cycle
  that does NOT exist today. Locks-then-tx keeps today's deadlock-free property.
- **Lock order wallet→market everywhere** (cashOut depends on it) — unchanged.
- **Cost accepted:** the market lock is now held for the whole short tx
  (~5–15ms) instead of just the pool write — slightly lower per-market bet
  throughput, zero cross-market impact. Correctness > throughput here.

### Threading work required
- `spendBonusLocked(userId, amount)` → add `tx?: Prisma.TransactionClient | null`
  and pass it through to EVERY write inside (bonus wallet adjust + grant-row
  updates). Check whether `refundBonusLocked`/`recordWageringLocked` share inner
  helpers with it — thread ONLY what the spend path needs; wagering stays out.
- `MarketStore.set(m)` (market-dal.ts interface ~L103, memory impl ~L128, PG impl
  ~L168) → add optional `tx` exactly like `PositionStore.set` (~L115/248) already has.
- VERIFY the exact `db.wallet.adjust` signature (prisma-dal.ts ~L703) — C3
  threaded a tx param; confirm its position (opts vs tx order) before calling.
- `withMoneyTx` (ledger.ts L44): `fn(tx|null)`; in-memory → `fn(null)`, PG →
  `$transaction(fn, {timeout: 30000})`.

### In-memory store caveat (tests run on it!)
`withMoneyTx` gives NO rollback in-memory (tx === null). The design already
makes the two abort paths safe there:
- Real-debit failure: it's the FIRST write; nothing to unwind.
- Bonus under-spend AFTER the real debit (defensive only — can't normally happen
  under the wallet lock): when `tx === null`, compensate exactly as today
  (re-credit realPart, `refundBonusLocked(allocations)`); when tx !== null, just
  throw (rollback handles it). Capture a `usedTx` flag inside the callback.

### Behavior deltas to document in the notes (all intended)
1. Ledger stake posting: fire-and-forget → in-tx (a ledger failure now rejects
   the bet instead of silently dropping the ledger row). tx-mode only; in-memory
   keeps postLedgerEntries' own retry+audit, awaited not .catch'd.
2. closed-in-flight: no debits ever happen → audit payload loses
   refundedReal/refundedBonus (use `moneyMoved:false`).
3. Pool snapshot + SSE odds emit fire only after a COMMITTED bet.
4. Everything else (loss-limit timing, idempotency, wagering, affiliate,
   notifications, emails, fee math) byte-identical.

### Fault-injection probe (write it as a small .mts under scripts/, PG-only)
Place a bet with a poisoned ledger/txn layer (e.g. monkey-patch `db.txn.create`
or pass a groupId that violates the ledger balance check) → assert: wallet
balance unchanged, bonusBalance unchanged, grants unchanged, pool unchanged,
no Position row, no Transaction row, no LedgerEntry rows. Then remove the poison,
place the same bet, assert everything lands exactly once.
