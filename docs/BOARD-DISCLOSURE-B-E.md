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

---

**Prepared for the owner to forward. Nothing in the money path was changed before this was written.**
