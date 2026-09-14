# To the Gaming Board — identity verification is now enforced at withdrawal only

> **Status:** DRAFT FOR ALI, written 2026-09-13, the day the change was built.
> **Follows:** the Board's permission, obtained by the owner, for 50pick to enforce identity
> (KYC) finalisation only at withdrawal.
> **Supersedes, unsent:** [`BOARD-DISCLOSURE-KYC-FIRST.md`](BOARD-DISCLOSURE-KYC-FIRST.md)
> (2026-09-05), which was never sent and describes a gate that no longer exists.
> **Owner ruling of record:** [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), 2026-09-13.
> **Every control named below was read out of the source on 2026-09-13**, not recalled.

---

## 1 · What 50pick now does

A player registers, confirms their email address, and may then **deposit and play**. Before any
money can be **withdrawn** to a mobile-money account, the player must verify their identity and
the operator's compliance team must approve it.

| Step | What is required |
|---|---|
| Register | Phone number, a declared date of birth showing 18 or older, acceptance of the Terms |
| First deposit | A **confirmed email address** |
| Deposits and bets | Nothing further. Self-set limits and the Source-of-Funds thresholds still apply |
| **Withdrawal** | **Identity approved by a compliance officer** — one of NIDA, passport, driving licence or voter's card, plus a selfie, reviewed by a person |

### How a player learns of the requirement

The requirement is published in **Terms §3 and §3a**, the AML policy and the help pages, in English,
Swahili and Chinese. Inside the product it is stated in two places, and deliberately nowhere else:

- **On the withdrawal screen**, before the withdrawal form, under the heading *"Before you
  withdraw"*: a one-time check with an identity document and a selfie. Until identity is approved,
  that screen shows the identity step instead of the form.
- **Once, after the first deposit**, a small notice on the wallet that the player can dismiss:
  *"Verify your identity anytime before your first withdrawal."*

The player's own identity page shows where their verification stands. There are no repeated
reminders, banners or emails asking a player to verify before they want to withdraw; this is the
owner's instruction. The cost is stated in the ruling of record: more players meet the identity step
for the first time when they ask to withdraw, and wait for review then. The review target is 24 hours.

## 2 · What the operator has accepted by adopting this position

The owner was told each of these plainly before ruling, and they are recorded under his name:

1. **Age is declared, not checked, until withdrawal.** A person under 18 who types a false date of
   birth can deposit and gamble. If they never withdraw, no officer ever sees a document.
2. **A self-excluded person can open a new account on a new phone number** and play it. Nothing
   compares a new registration against the exclusion register; the identity review, which used to
   come first, now comes at withdrawal.
3. **Sanctions and PEP screening happens at withdrawal.** The only screening is the officer's
   assessment at identity review. No deposit and no bet is screened.
4. **A large withdrawal is not reviewed by a person before it is sent.** Once identity is approved, a
   withdrawal of any amount up to TZS 5,000,000 is paid out at once; the two-officer review of withdrawals of
   TZS 1,000,000 or more was removed by the owner on 2026-09-13. The human checks on money leaving are the
   identity review and, on the way in, the Source-of-Funds declaration.

## 3 · The controls that still apply before a withdrawal can happen

- **The identity review**, by a person, on the documents themselves. There is no authority check
  for any of the four documents, as the operator has always stated.
- **One document, one account**, enforced by a unique database index across all four document
  types.
- **An account that has been approved once keeps the right to withdraw what it holds**, even if
  compliance later asks it to verify again. A re-verification does not trap money earned under an
  identity the operator accepted. An officer who needs to stop money moving freezes the wallet.
- **A per-withdrawal cap** of TZS 5,000,000; a larger amount is refused. ⚠️ Since the owner's ruling of the
  same day, no officer reviews a withdrawal before it is sent — the earlier two-officer review of withdrawals of
  TZS 1,000,000 or more was removed (§2, item 4).
- **Payout destination binding:** a payout goes only to the number registered on the account.
- **The Source-of-Funds gate** on deposits: a single deposit of TZS 1,000,000 or more, or TZS
  5,000,000 within 30 days, requires an accepted declaration first. For an account that has not
  yet verified its identity this is the operator's first compliance contact, and the reviewing
  officer is shown that the account is unverified.

## 4 · A player we cannot verify who holds a balance

This position creates a situation the previous one could not: a player who has deposited and
played, perhaps won, and is then refused at identity review while holding money. The operator's
answer is published in **Terms §3a** in English, Swahili and Chinese, from the same release:

- **A refusal the player can fix** (an unreadable photo, an expired document, details that do not
  match): the player is told why and may submit again. Nothing is frozen.
- **A final refusal** (under 18, a sanctions concern, an identity already used on another
  account): **the wallet is frozen at once** — no further deposits, bets or withdrawals — and the
  document number stays reserved so it cannot be reused on another account.
- **An officer then decides what happens to the balance, case by case**, choosing one of four
  recorded outcomes: return the deposits, return the whole balance, hold pending an appeal, or
  forfeit. Every decision carries a written justification, is recorded in the tamper-evident
  compliance log under its own action, and is written to the player with the reason.
- **Returns** go through the ordinary payout rail, to the registered number only, within the
  TZS 5,000,000 per-withdrawal cap. No fee is charged on a return. A return larger than the cap is not
  offered — the officer holds the balance instead, because no split return has been decided — and no money
  outcome is available while any other hold stands on the wallet (an officer's own freeze, or a
  self-exclusion), until that hold is lifted on its own recorded control.
- **A return counts as made only once the payout confirms.** If a return fails, the money stays in the frozen
  account, the player is told the return did not go through, and the case returns to the officer.
- **Every such decision appears in a single report** — who decided, when, the amounts and the
  reason — alongside every finally-refused account still holding money with no decision yet.

## 5 · The record

- Every deposit and every bet carries the account's identity status on its existing audit entry,
  so "which bets were placed by unverified accounts?" has an exact answer.
- Every withdrawal carries the identity status on `withdraw.initiated`; a refused withdrawal writes
  `withdraw.kyc_blocked` with the amount the player tried to take out; a payout to an account under
  re-verification writes `withdraw.unverified_payer`.
- ⚠️ **The audit write is fail-open**, as disclosed in August: under a database outage an action
  can succeed while its record does not durably persist. Unchanged, and stated again.

## 6 · What this costs the player who is refused, stated honestly

For most players the change removes a wait before they can play. For a player the old gate would
have stopped at the door and who is refused at withdrawal, the position is worse: they may have
lost money they could not have lost, or won money they cannot collect. The operator does not
present that as a benefit. Its answer is §4: a published process, a frozen account, a recorded
decision and a report.
