# Disclosure to the Gaming Board — the operator is re-imposing an identity precondition on withdrawal

> **Status:** DRAFT FOR ALI, written 2026-09-05, **before** the change reaches players.
> **Companion to:** [`BOARD-DISCLOSURE-B-E.md`](BOARD-DISCLOSURE-B-E.md) (2026-08-20), which
> disclosed the removal this letter partially reverses. Read the two together and in order.
> **Owner ruling of record:** [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), 2026-09-05.
> **Every control named below was read out of the source on 2026-09-05**, not recalled.

---

## 1 · What is changing

From this release, a 50pick player may not **deposit**, **place a bet**, or **withdraw** until the
operator's compliance team has approved their identity. They may register, sign in, and browse the
whole platform freely; no money moves in either direction until approval.

Two thirds of that is new operator policy on ground the Board has not spoken to. **One third is a
deliberate reversal of Board comment #1, and this letter exists because of that third.**

## 2 · What the Board instructed, and what we are now doing differently

Board comment **#1**, relayed by the owner on **2026-08-19**, was that identity verification must
stop being a precondition of **withdrawal**. It was implemented on 2026-08-20 and disclosed in full.

The operator is now re-imposing that precondition. **This is a control stricter than the Board
required, not a lapse in implementing the instruction.** It is being taken deliberately, by the
owner, on management's decision, and it is stated here rather than left for a later audit to
discover.

⚠️ **Deposits and staking are NOT covered by comment #1.** The instruction addressed money leaving.
§9.4 of the August letter records that deposits were deliberately left unbound, for an unrelated
reason (destination binding, comment #8). Gating them on identity contradicts nothing the Board has
said; we name it here only so the Board sees the whole shape at once.

## 3 · The shape, stated plainly

**An account that has not proved its identity now holds no money and can move none.** It cannot fund
itself, cannot stake, and has nothing to withdraw. Where the August position accepted a payout to an
unverified account and *recorded* it, the current position prevents that account from ever coming to
hold a balance in the first place.

## 4 · Why the withdrawal gate does not trap money — the one thing worth checking

The Board's concern in this area is money being trapped. Three properties keep that from happening,
and each is enforced in code rather than by policy:

1. **The withdrawal gate asks a different question from the other two.** Depositing and betting ask
   whether the account is approved **now**. Withdrawal asks whether it was **ever** approved
   (`KycSubmission.approvedAt`, set once and never cleared). A player whom compliance has asked to
   re-verify — an expired document, a name mismatch — is stopped from adding money and from placing
   new bets, and **keeps full access to money they already hold**. This is the harm §6 of the August
   letter identified, closed by construction.
2. **Nothing that returns a player's own money is gated.** Cash-out, market settlement, one-sided
   and void refunds all proceed regardless of identity status. A bet already accepted always settles.
3. **A deposit already authorised always completes.** The payment provider's callback, the hosted-
   checkout return leg, the fast-credit lane and the reconciliation sweep credit a transaction that
   was authorised before the money left the player's handset. Refusing there would take a player's
   money and give them nothing.

With deposits gated and the production database reset before launch, the withdrawal gate is expected
never to refuse a real balance. It is a second lock, not the operative one.

## 5 · What is unchanged

- **The AML ≥ TZS 1,000,000 two-officer hold.** It never read identity status and is untouched.
- **Payout destination binding** (comment #8): payouts go only to the account's registered handset.
- **The identity system itself:** any one of NIDA, passport, driving licence or voter's card, plus a
  selfie; one document may only ever be used on one account; there is no authority check for any of
  the four, as [`IDENTITY-POLICY.md`](IDENTITY-POLICY.md) has always stated.
- **The record.** Every withdrawal still carries `kycStatus` on its `withdraw.initiated` audit
  entry, and a payout to an account under re-verification still produces an awaited COMPLIANCE fact
  (`withdraw.unverified_payer`) carrying the transaction id. That event is now **narrower and more
  useful** than when it covered everybody: it is the only record of a payout made while an identity
  was in doubt.

## 6 · What this costs the player, stated honestly

A player cannot do anything with money until a human has looked at their documents. The operator's
review queue therefore sits directly between a new player and any activity at all. We commit to
telling the player plainly, on every page, which state they are in — including when the delay is
ours and there is nothing for them to do.

⚠️ **This is an operational commitment, not a technical one.** No code change can compensate for an
understaffed review queue, and the operator accepts that the queue's throughput is now a compliance
obligation as much as a commercial one.

## 7 · Disclosure of a limitation we have not removed

The COMPLIANCE audit write is **fail-open**: `audit()` keeps the entry in a per-instance in-memory
ring and lets the request proceed if the database write throws. Under a database outage a payout can
therefore succeed while the record explaining it does not durably persist. This was disclosed in
§6.3 of the August letter and is **unchanged** — it is stated again rather than allowed to lapse out
of the record.
