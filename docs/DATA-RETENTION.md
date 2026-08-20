# 50pick — Data Retention Schedule

> **This is the authority.** Every other statement of a retention period on the platform —
> `/admin/retention`, `/legal/privacy` §5 in three locales, `src/lib/server/retention.ts`,
> `docs/gli-remediation-plan.md` — must agree with this file or be corrected to.
>
> Written **2026-08-20** to close audit finding **F-01** (`DATA-AUDIT-2026-08-20.md`).
>
> ⚠️ **Read the Enforcement column before quoting any row to anybody.** The whole reason this
> document exists is that the platform was publishing a schedule no code enforced. A row
> marked *policy* is a statement of intent, not a control — and describing intent as a control
> is the defect, not the intent itself.

---

## 1. The schedule

| Class | Period | Measured from | Legal basis | Enforcement | Where |
|---|---|---|---|---|---|
| Transactions (deposit / withdrawal / bet / payout) | **7 years** | Transaction date | POCA Cap 423 §16; TRA Income Tax Act §80 | **Never deleted** — by design | `Transaction`, `LedgerEntry` |
| Double-entry ledger | **7 years** | Entry date | POCA Cap 423 §16 | **Never deleted** — trial-balanced nightly | `LedgerEntry` |
| Positions / bet history | **7 years** | Settlement date | POCA Cap 423 §16 | **Never deleted** | `Position` |
| Audit log (HMAC-chained) | **7 years** | Event date | ISO 27001 A.12.4; GLI-19 §11 | **Cannot be deleted** — see §3 | `AuditLog` |
| Identity documents + KYC decisions | **7 years** | Account closure | POCA Cap 423 §16; FATF R.11 | **Never deleted** by any automated path | `KycSubmission`, `KycDocument`, R2 `50pick-kyc` |
| In-app notifications | **180 days** | Creation | Operational only | ✅ **Code** — `retention.purge.daily` | `Notification` |
| OTP code hashes | **30 days** | Issue | Operational only | ✅ **Code** — `retention.purge.daily` | `Otp` |
| Up & Down price observations | Indefinite | — | Fairness evidence (GLI-19) | **Never deleted** — write-once per `(asset, boundary)` | `UpDownObservation` |
| Market snapshots (pool history) | Newest N per market | — | Operational only | ✅ **Code** — FIFO prune in `market-history.ts` | `MarketSnapshot` |
| AI usage events | `RETAIN_DAYS` | Event date | Operational only | ✅ **Code** — opportunistic prune in `ai-usage.ts` | `AiUsageEvent` |
| AI poll raw payloads (`rawResponse`, `trace`, `generation`) | *Unset* | — | Operational only | ⚠️ **Nothing** — 621 rows, 8.4 MB, kept forever (audit F-09, open) | `AIPoll` |
| Self-exclusion register | **5 years** | End of exclusion | LCCP SR Code 3.4.4 | 📋 Policy | `ResponsibleGambling` |
| Behavioural-marker logs (RG) | **5 years** | Event date | LCCP SR Code 3.4.1 | 📋 Policy | `ResponsibleGambling` |
| Marketing-consent records | **2 years** | Last activity | PDPA 2022 §15 | 📋 Policy | `User.marketingOptIn` |
| Customer-support tickets | ⛔ **N/A — no ticket store exists** | Ticket close, once built | PDPA 2022 §22 | ⛔ Nothing to enforce against; revisit with Unit K | — |
| Backup artifacts | **90 days** rolling | Snapshot date | DR/BCP | 📋 Policy — operator action | R2 `50pick-backups` |
| Session records | — | — | — | ⛔ **N/A** — the `Session` model has never been written to; the platform uses a signed cookie plus `ActiveSession`. A prune here would be a permanent no-op dressed as a control. | — |

---

## 2. The four open questions — ANSWERED 2026-08-21

> Ali answered all four on **2026-08-21**. The reasoning for each is in
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § *2026-08-21 · The four open retention /
> erasure questions*. Summarised here because this is the file people read for a period.

| # | Question | Answer | State |
|---|---|---|---|
| 1 | Marketing consent: 2 years or 3? | **2 years from last activity** — the number the player was told. You may not retain longer than you disclosed to the data subject, and correcting the admin row down requires notice to nobody while raising the player's would. | ✅ Implemented |
| 2 | Who may file a DSAR? | **The player, from `/profile/account`, on their authenticated session** — already the accepted standard for handing over their whole data bundle via "Export my data", so a higher bar for *asking* than for *receiving* would be incoherent. Officers may also file on a player's behalf. ⭐ Note the ACCESS right needs no DSAR at all; the register is for **erasure and correction**. | 🟠 Unblocked, not wired |
| 3 | How is a national ID erased? | **Keyed HMAC of the number — never NULL.** ⚠️ Nulling `idNumber` frees the partial unique index that is the **sole** enforcement of one-document-one-account, so the obvious implementation would repeal a P0 AML control. Hashing destroys the number while preserving collision, so uniqueness survives erasure. Document **images** are deleted outright — `deleteKycDocument` exists for it. | 🟠 Decided, not built |
| 4 | Support-ticket retention? | **N/A until a ticket store exists.** Publishing a period for data we do not hold is the same defect as the rest of F-01. Row kept and labelled so Unit K picks it up. | ✅ Implemented |

### What is still to BUILD (the decisions no longer block it)

`anonymizeClosedAccount` — deliberately not rushed. It touches an AML control and needs its own
suite proving: every PII column null or tombstoned · money, ledger and positions byte-identical
· `trialBalance()` still ok · the audit chain still verifying · **and the identity tuple still
colliding for the same document after erasure.** One further unresolved detail inside it:
`Comment.authorName` is NOT NULL and freezes the last three digits of the pre-tombstone phone
number, so erasure is incomplete until that value is overwritten too.

---

## 3. Why the audit log is not on any deletion path

The audit chain is HMAC-linked: each row's `prevHash` is the previous row's `entryHash`, and
`@@unique([prevHash])` makes it physically fork-proof. **Deleting any row breaks the chain at
that point, and the break is exactly the signal the chain exists to produce.** There is no
"prune the audit log" option that leaves it still able to prove anything.

That is a real cost and it is growing: **144 MB / 114,480 rows, ~11,500 rows a day.** Ali's
decision on 2026-08-20 (recorded in `COMPLIANCE-DECISIONS.md`) was to **reduce what Up & Down
writes** rather than accept the growth or archive it — one entry per round was removed and four
were protected by test. The honest position is that this does not solve the curve, and the
remaining lever is the number of rounds, not the code.

---

## 4. What runs, and where to look

**`retention.purge.daily`** — `src/lib/server/retention.ts`, called from the lifecycle pass
(`lifecycle.ts` → `maybeRunRetention`). Once per 24 hours, after a 5-minute boot grace.
Leader-leased by the surrounding pass and **fails closed**, so two containers cannot double-run
it. Its own `.catch` means a failed purge can never take the market lifecycle down.

It deletes exactly two classes and **cannot reach a third** — it names them. Money, identity
and audit records are outside its reach by construction, and `test:retention` proves it by
seeding a 400-day-old confirmed deposit and asserting it survives.

### ⛔ One coupling that is invisible from either side

`NOTIFICATION_RETENTION_DAYS` is **bounded from below**, not just chosen.
`db.notification.existsWithHref()` is deliberately unbounded in time — *"the answer must not
become false again simply because time passed"* — because it is the **only** idempotency key
for the Up & Down daily digest (E-37), which keys on `/updown/history?day=YYYY-MM-DD`.

A prune deletes exactly the rows that answer is read from. `runUpDownDailyDigest` defaults to
`daysBack = 1`, but that parameter exists so a missed day can be **replayed after an outage** —
and if the notification for that day has been pruned, the replay tells every affected player
about their day a second time.

So: **180 days, not the 90 the audit proposed.** `test:retention` §4 asserts the constant stays
at least 30 days clear of `MAX_DIGEST_REPLAY_DAYS`, and that assertion was driven red by
tightening the period, so it cannot be lowered for disk without a failing build.

---

## 5. Verification

```sh
npm run test:retention      # 20 assertions: aged rows go, money/ledger/chain untouched,
                            # the digest coupling holds, and a second pass is a no-op
```

The suite runs against the in-memory store, which is also what forces both DAL halves to
exist — `tsc` cannot catch a missing in-memory twin, and a Prisma-only method throws in every
unit test.

**Production reality when this was written (2026-08-20):** `Notification` 2,450 rows, oldest
2026-05-30 — *82 days old, so the first live run of this chore will delete nothing.* That is
expected and is not evidence the chore is broken; the first deletions land once rows cross 180
days. `Otp` is empty and will stay empty while `SMS_PROVIDER=console`.
