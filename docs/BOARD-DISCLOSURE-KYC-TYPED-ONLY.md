# To the Gaming Board — players now verify identity with typed details only

> **Status:** DRAFT FOR ALI, written 2026-10-10, the day the change was built. Not sent.
> **Follows:** the Board's request, relayed by the owner on 2026-10-10, that players should not be asked to upload
> identity documents and that 50pick should use the simplest form of identity verification: typed input fields.
> **Owner rulings of record:** [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), § "2026-10-10 · Players verify
> identity with typed details and are approved at once; agents keep photo identity — Privacy v2026-10-10, Terms
> v2026-10-10, AML v2026-10-10 (Gaming Board request, relayed by the owner)".
> **Supersedes, in part:** [`BOARD-DISCLOSURE-B-E.md`](BOARD-DISCLOSURE-B-E.md) §4 (the selfie review as the control
> against one person holding several accounts) and [`BOARD-DISCLOSURE-KYC-AT-WITHDRAWAL.md`](BOARD-DISCLOSURE-KYC-AT-WITHDRAWAL.md)
> §1 (identity "approved by a compliance officer … plus a selfie, reviewed by a person").
> **Every control named below was read out of the source on 2026-10-10**, not recalled.
> ⚠️ **Before sending — §5's second paragraph** describes the 7-year hold on the typed identity at erasure, which the
> owner ruled the same day and which ships in a LATER release than this change (Part C). Send this letter once that
> release is live, or strike that paragraph.

---

## 1 · What 50pick now does

Identity is still verified **before a player's first withdrawal**, and before nothing else. What the player provides
has changed:

| Step | What is required |
|---|---|
| Register | Phone number, a declared date of birth showing 18 or older, acceptance of the Terms |
| Deposits and bets | Nothing further. Self-set limits and the Source-of-Funds thresholds still apply |
| **Withdrawal** | **The details of one identity document, typed** — NIDA, passport, driving licence or voter's card: its number, its expiry where it has one, and the full name as printed; the date of birth is the one on the account — **plus a confirmed email address** |

No photograph of a document and no selfie is asked of a player at any step.

**Most players are verified at once.** When the typed details pass the automatic checks below, the identity is
approved immediately and the player can withdraw. Every automatic approval then goes on a compliance officer's
post-check list — flagged cases first, with an alert to the officers — and the officer can mark it checked, ask the
player to correct their details, reject the identity, refuse it finally (which freezes the wallet), or freeze the
wallet.

**Some are sent to an officer before approval:** when the NIDA number's own birth digits show the holder is under 18;
when the player earlier typed a date of birth under 18; when an officer has already ruled on that identity (a refusal, a request for corrections, a correction of the date of
birth, or a re-opened refusal); when the account's risk score is 70 or more (two officers then decide); when the wallet
is held by an officer or by an identity refusal, the source-of-funds declaration was rejected, or an AML escalation is
open; and when the same name and date of birth belong to an account that is self-excluded, cooled off, suspended,
closed, frozen or finally refused.

**Agents are unchanged.** A person applying to become a 50pick agent still verifies their own identity with a
photograph of the document and a selfie, reviewed by an officer, and still provides the agent application's documents.
An automatic approval from typed details never qualifies anyone as an agent.

## 2 · The automatic checks

1. **Format** — the number must have the right shape for its document. A NIDA number has a published format: 20
   digits, the first eight a real date. A passport number is expected to follow the current booklet's shape; one that
   does not is accepted and flagged for the officer. Driving-licence and voter's-card numbers have no published format;
   only a length and character band (4 to 20 letters and digits) applies to them.
2. **One document, one account** — a document number already on another account is refused, enforced by the database.
3. **Age** — the account's date of birth must show 18 or older; an under-18 date is refused finally and the wallet is
   frozen.
4. **Expiry** — a passport or licence past its expiry date is refused.
5. **The routing and flag checks of §1** — they never refuse anyone: they send the identity to an officer before
   approval, or mark it for the officer's post-check.

## 3 · What the operator has accepted by adopting this position

The owner was told each of these plainly before ruling, and they are recorded under his name:

1. **Nothing ties the typed number to the person typing it.** Anyone who knows a real document number can verify with
   it; the real holder is then refused as "already linked to another account" and must contact 50pick, whose
   compliance officers resolve it: the other account's identity is rejected, which frees the number, and its wallet
   is frozen. For an automatic approval no officer has checked yet, the platform will not record that rejection
   without the freeze.
2. **Age is declared.** For a NIDA the number's birth digits are checked against it; for the other three documents
   nothing is.
3. **One person can hold accounts on two different documents.** The same-name-and-date-of-birth check narrows this;
   nothing closes it. The selfie review that 50pick described to the Board on 2026-08-20 as the control for this gap no
   longer exists for players.
4. **Sanctions and PEP screening can happen after a withdrawal.** The officer's assessment is part of the post-check of
   an automatic approval, which may come after money has been paid out.

## 4 · What remains in place

Payout only to the mobile-money number registered on the account · the TZS 5,000,000 per-withdrawal cap · the
source-of-funds declaration above TZS 1,000,000 in one deposit or TZS 5,000,000 in 30 days · the confirmed-email step ·
final refusals freeze the wallet and an officer decides the balance · every identity decision is recorded in the
tamper-evident audit log.

## 5 · Records

Identity photographs — those players sent before 10 October 2026, and those agent applicants send — are kept, readable
only by compliance officers, for 7 years from the closure of the account.

The typed identity details (name, date of birth, document number) are also kept for 7 years from closure, including
when a closed account asks to be erased, and are then erased except for a coded fingerprint of the number that stops
the same document opening another account.
