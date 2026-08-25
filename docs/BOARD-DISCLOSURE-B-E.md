# Disclosure to the Gaming Board — the joint effect of comment #1 and comment #8

> **Status:** DRAFT FOR ALI, written 2026-08-20, **before** any code was changed.
> **Register row:** `E-175` · **Commission:** `SESSION-PROMPT-JAY-COMMENTS.md` §B and its `B × E`
> row in §6, which requires this shape to be **stated in writing, not quietly mitigated**.
> **Every control named below was read out of the source on 2026-08-20**, not recalled. Line
> references are given so the Board's own reviewer can check each one.

---

## 1 · What was instructed

Board comment **#1**, relayed by the owner on **2026-08-19**: identity verification must stop being
a precondition of withdrawal. Board comment **#8**: the player's registered mobile number must be
prefilled on the withdrawal form.

Comment #1 is being implemented now. Comment #8 is approved and queued behind it. **This letter is
sent before either reaches players**, because the two are individually correct and jointly change
the shape of the money-out path.

## 2 · The joint shape, stated plainly

**Together, #1 and #8 mean that a payout leaves the platform to the registered mobile number of an
account that has never proved its identity, with the destination prefilled, and with no identity
check anywhere in the path.**

That is the shape the instruction asks for. We are not mitigating it silently, and we are not
recording it only in a system that would have to be asked the right question later.

## 3 · What identity verification was, and was not

This matters to the size of the change, and it is easy to overstate in both directions.

- Verification means: **a declared document number in an accepted format**, **three or four
  attached images**, and **a human officer's review** of those images against four attestations.
- Verification has never meant a government confirmation. `src/lib/server/nida.ts` is a
  deterministic **mock**; **no request has ever reached the National Identification Authority**,
  and there is no equivalent endpoint for a passport, a driving licence or a voter's card. The
  stored `idVerifiedAt` therefore means *"format accepted"*, **not** *"government confirmed"*.
  This is recorded in `docs/IDENTITY-POLICY.md` and predates this instruction.

So #1 removes a **format check, an image set and a human review** from the withdrawal path. It does
not remove an authority-verified identity check, because there has never been one.

## 4 · The residual identity control, stated accurately

⛔ **We must not tell the Board "one NIDA, one account."** Since 2026-08-20 that sentence
overstates the control.

Uniqueness is enforced by one partial unique index on the **tuple** `("idType", "idNumber")` over
non-rejected submissions (`KycSubmission_idType_idNumber_active_key`). It binds a **document**, not
a **person**:

- It prevents the **same document** being used on a second account.
- It does **not** prevent **one human** holding several of the four accepted documents — NIDA,
  passport, driving licence, voter's card — from opening **several** accounts. Four documents,
  four accounts.
- The only control that closes that gap is the **human document review** (the selfie against the
  document), and that reviewer only ever sees accounts that **chose** to verify. After #1, the
  population this letter is about is precisely the population no reviewer sees.
- Two of the four documents (**driving licence** and **voter's card**) are accepted with a sanity
  band only — 4–20 alphanumeric — because neither number format is published. That is an
  instructed decision (owner, 2026-08-19), recorded in `docs/IDENTITY-POLICY.md`.

## 5 · What remains on the money-out path — enumerated, with where it is enforced

| Control | Where it actually runs | Unaffected by #1? |
|---|---|---|
| **AML hold, gross ≥ TZS 1,000,000, two different officers** | `payments.ts:176` in `dispatchWithdrawal`, before any gateway adapter is touched; evaluated on the **gross** value | ✅ Yes — and note `src/lib/server/payments.ts` contains **no reference to KYC at all**, so this control never read identity status and cannot be weakened by removing the gate |
| **Wallet freeze** (`wallet.status !== "ACTIVE"`) | inside the wallet lock in `wallet-service.withdraw()` | ✅ Yes |
| **Balance, and the atomic balance re-check** | inside the same lock | ✅ Yes |
| **Payout pause** (operator shuts payouts) | the **route action**, `wallet/withdraw/actions.ts:60` | ✅ Yes — but see §6, it is not in the service |
| **Per-provider withdrawals kill-switch** | `wallet-service.withdraw()` | ✅ Yes |
| **Gateway floor on the net-of-fee amount** | `wallet-service.withdraw()` | ✅ Yes |
| **Rate limit and idempotency** | `wallet-service.withdraw()`, idempotency re-checked inside the lock | ✅ Yes |
| **Suspension / self-exclusion** | enforced **upstream** by session revocation — `admin/players/[id]/actions.ts:114` and `responsible-gambling.ts:227` | ⚠️ Yes, but see §6 |
| **Human document review** | `/admin/kyc` | ✅ Unchanged — for accounts that verify |
| 🆕 **Payout destination bound to the registered number** | `payoutDestinationFor()` in `wallet-service.withdraw()`, before the balance is moved into `hold` | 🆕 **Added 2026-08-25 — see §9.** It did not exist when §1–§8 above were written, and its absence is what made the combination in §9 material |

## 6 · What does NOT remain, and three limits we are not hiding

1. **`forceReverifyKyc` stops being a money control.** Its entire stated purpose is to *"re-lock
   withdrawals"*, and after #1 it re-locks nothing in the money path. What a compliance officer has
   instead is: **wallet freeze**, **payout pause**, and the **AML ≥ TZS 1,000,000 two-officer
   hold**. Four surfaces that currently claim otherwise are being corrected in the same change.

2. **`withdraw()` contains no `user.status` check and no self-exclusion check.** Once the identity
   gate is removed, **`wallet.status !== "ACTIVE"` is the only account-level control inside the
   function itself.** Suspension and self-exclusion are enforced by revoking sessions, which stops
   a *player* reaching the form — it does not stop a call that arrives without a session. Two
   **operator** retry paths (`payment-actions.ts:171` and `:299`, the latter up to 50 rows per
   click) call `withdraw()` directly and therefore pass neither the session-level controls nor the
   route-level payout pause. Today the identity gate incidentally stops those two paths for
   unverified accounts; after #1 it will not. We are threading the operator's identity through so
   the record names the officer rather than the player, and we are **not** changing the controls
   themselves in this unit — that is a separate decision, disclosed here rather than fixed quietly.

3. **The new record is best-effort, on the one path where it is the only evidence.** In place of the
   refusal we stamp the identity status on every withdrawal's audit entry and emit a COMPLIANCE
   fact, carrying the transaction id, whenever an unverified account is paid. Audit writes are
   deliberately **fail-open**: on a database error the entry is kept in a per-instance in-memory
   ring and the payout proceeds (`audit.ts:443-449`). So under a database outage a payout can
   succeed while the record that explains it does not durably persist. We are stating that rather
   than implying a durability we have not built.

## 7 · What deliberately did NOT change

- **The identity system itself.** Collection, the four documents, the uniqueness tuple, the human
  review and the audit trail all stand. #1 removes a **gate on a payout**, not identity checking.
- **The AML/FIU controls.** The thresholds and the two-officer review come from a **different
  authority**. A Gaming Board instruction about identity-on-withdrawal does not repeal them, and
  they have not been touched.
- **The human review queue** for every account that does verify.

## 8 · The attribution, corrected

`docs/FLOWS.md` currently cites the *"TZ Gaming Board model"* as the **reason** the withdrawal gate
exists. Left standing, that sentence invites someone to re-add the gate in six weeks by reading our
own documentation correctly. It is being replaced, dated, naming the owner's relay of Board comment
**#1** on **2026-08-19** as the authority of record, with the full decision logged in
`docs/COMPLIANCE-DECISIONS.md`.

## 9 · ⚠️ THE COMBINATION NOBODY AUTHORISED — and what has now been done about it

*Added 2026-08-25. Sections 1–8 were written on 2026-08-19/20 and are unchanged; this section
reports something they could not have known, because half of it was not measured until now.*

### 9.1 The composition

Comment **#1** removed identity verification as a precondition of withdrawal. That was
instructed, and §§3–6 above state its effect accurately. What §5 could not say, because nobody
had asked the question, is that **the platform also had no control over WHERE a payout went.**

The destination was a free-text field on the withdrawal form. `wallet-service.withdraw()` stored
and dispatched whatever that field contained; `phoneE164` — the number the account is registered
to — appeared exactly once anywhere on the withdrawal path, and it was the form **prefill**.
Nothing compared the two.

> **So below TZS 1,000,000 — beneath the AML two-officer threshold — there was no identity**
> **control AND no destination control on money leaving the platform.**

⛔ **Each half was individually authorised. The combination was not, and it was never put to
anyone as a combination.** Comment #1 was considered against the controls §5 lists; the
destination question was not among them, because it had not been identified. This section is
written so that it is on the record as a composition rather than as two separate footnotes.

### 9.2 It is not hypothetical — the population, re-derived from production on 2026-08-25

Of **25 lifetime withdrawals**, **7 were paid to a number other than the account’s registered
one**, and **6 of those reached CONFIRMED** — the money left.

⚠️ **Three of the seven are not harm, and saying so matters more than the larger number does.**
The account `+255757619808` and the destination `+255772619619` are **both ADMIN accounts
belonging to the same operator** (Jaykishan Kaba, two registered emails). Those rows are an
operator moving test money between two numbers he controls. Reporting them to the Board as
“payouts to third parties” would overstate the exposure, and a disclosure that overstates is
worth less than one that does not.

**The genuine exposure, stated exactly:**

| Account | Paid to | Confirmed | Amount | Destination held by |
|---|---|---|---|---|
| `+255690979354` (PLAYER) | `+255690939754` | 2 | TZS 7,000 | ⛔ no account on this platform |
| `+255769434985` (PLAYER) | `+255783160044` | 2 | TZS 8,000 | ⛔ no account on this platform |

**4 confirmed payouts · TZS 15,000 · two real player accounts · destinations belonging to no
account here.**

⭐ **Read the first row again: `979354` → `939754` transposes two digits of the account’s own
number.** That is not a player choosing a different wallet. That is a player who mistyped their
own number and paid a stranger — and the platform had no reason to stop them, because a
free-text destination has no correct value to compare against. **The strongest argument for
binding the destination came out of our own data, not out of the statute.**

### 9.3 What has been done

From 2026-08-25 a withdrawal may only be paid to the number the account is registered to. The
rule is `payoutDestinationFor()` (`src/lib/payout-destination.ts`), and four properties of it are
the disclosure:

1. **It is enforced on the SERVER**, inside `wallet-service.withdraw()` — not on the form. The
   withdrawal screen now states the destination instead of accepting one, but that is manners;
   the seal is below it, where a request that never touched a browser still meets it.
2. **It runs BEFORE the balance is moved into `hold`,** so a refused payout debits nothing.
3. **It REFUSES; it does not correct.** Silently redirecting a mismatched payout to the
   registered number would keep the rule and tell the player their instruction succeeded when it
   did not. Being quietly given something else is not the same as being told no.
4. **It binds the two OPERATOR retry paths named in §6.2,** which replay a stored destination and
   bypass both the session controls and the route-level payout pause. They call `withdraw()`
   directly, so they meet this control where they met none of the others.

A refusal is recorded as `withdraw.destination_refused` on the audit chain, carrying the number
that was submitted. ⭐ **That record is itself part of the finding:** the seven historical rows
were all in the ledger the whole time, and the reason nobody knew is that no query anywhere ever
asked whether a destination matched its account.

### 9.4 What has deliberately NOT been done

- **The four historical payouts are settled money and are not being reversed.** TZS 15,000 has
  left to numbers we do not control; there is no mechanism here that could recall it, and
  inventing one would be worse than recording the loss. It is recorded, dated and bounded.
- **Deposits are deliberately NOT bound.** Money arriving from a friend’s or a relative’s
  handset is ordinary in this market, and refusing it would harm exactly the players least
  likely to hold the SIM they signed up with. The asymmetry is the control: the risk is money
  *leaving* to a number the account holder does not command.
- **The identity gate has NOT been re-added.** This closes a destination hole; it does not
  reverse comment #1, and §§3–6 stand as written.

### 9.5 What is still open, stated rather than implied

Binding the destination narrows the gap in §9.1; it does not close it. **Below TZS 1,000,000
there is still no identity control on money leaving the platform** — what has changed is that
the money can now only reach the number the account was opened with. An account opened under a
false identity is still paid; it is simply paid to itself. **That remains the Board’s decision to
revisit, not ours to reverse.**

---
---

**Prepared for the owner to forward. Nothing in the money path was changed before this was written.**
