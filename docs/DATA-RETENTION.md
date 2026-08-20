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
| Identity documents + KYC decisions | **7 years** | Account closure | POCA Cap 423 §16; FATF R.11 | **Never deleted** by any automated path. ⭐ Officer-initiated erasure destroys the **images** once the 7 years have run (`KYC_DOCUMENT_HOLD_YEARS`); the **number and name** are pseudonymised immediately — see §2b | `KycSubmission`, `KycDocument`, R2 `50pick-kyc` |
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
| 3 | How is a national ID erased? | **Keyed HMAC of the number — never NULL.** ⚠️ Nulling `idNumber` frees the partial unique index that is the **sole** enforcement of one-document-one-account, so the obvious implementation would repeal a P0 AML control. ⛔ **And hashing it IN PLACE does not preserve the collision either — see §2b before touching any of this.** Document **images** are held for the statutory 7 years, then destroyed. | ✅ **Built 2026-08-21** |
| 4 | Support-ticket retention? | **N/A until a ticket store exists.** Publishing a period for data we do not hold is the same defect as the rest of F-01. Row kept and labelled so Unit K picks it up. | ✅ Implemented |

---

## 2b. Erasure, as built — 2026-08-21

`src/lib/server/erasure.ts` · `anonymizeClosedAccount(userId)` · `npm run test:erasure`
(155 assertions) · `npm run red:erasure` (16 defects put back, all 16 caught).

### 🔴 The decision was right and its reasoning had a hole. Read this before touching any of it.

Answer 3 above says the number is replaced by a keyed HMAC *"so the same document still hashes
to the same value, so the index still rejects the second account."* **The second clause does not
follow.** A unique index compares STORED STRINGS:

| implementation | erased row holds | next applicant writes | collides? |
|---|---|---|---|
| hash in place (`idNumber`) | `a3f9…` — the HMAC | `19900101…` — the raw number | **NO** |
| a fingerprint column | `a3f9…` in `idFingerprint` | `a3f9…` in `idFingerprint` | **yes** |

So hashing in place repeals the AML control exactly as nulling does — it just looks safe while
doing it. Measured, not argued: `red:erasure` case 1 implements the decision as literally
written, and `test:erasure` §5.5 then reports **a second account on one national ID**.

The fix is `KycSubmission.idFingerprint` (migration `20260821140000_kyc_identity_fingerprint`):
HMAC(`OTP_PEPPER`, `idfp:v1:<idType>:<number>`), written at the identity step for **every**
submission, carried past erasure untouched, and unique-indexed with the tuple index's exact
partial predicate. ⛔ It must be written for every submission, not only for erased rows — an
index only collides if BOTH rows carry a value.

⚠️ **Rotating `OTP_PEPPER` disarms this control silently.** Every stored fingerprint stops
matching every new one, so each erased document quietly frees its slot. There is deliberately
no separate `ID_PEPPER` and no optional override: an override would run on the fallback for
months and break on the day somebody "tightened" it.

### The two tiers

| | When | What |
|---|---|---|
| ① Immediate | on fulfilment | **`User`** — email, verified-at, password hash + salt, display name, dob, region, avatar, last-login → NULL; `phoneE164` → `erased:<userId>` tombstone; `marketingOptIn` → false. **`KycSubmission`, every submission and not just the newest** — number → its keyed HMAC, full name → `Erased <fp12>`, dob → NULL, officer request descriptions → `[erased]`. **`Comment`** — author mask overwritten, body redacted, row soft-deleted. **`Notification`** — the account's own deleted, *and the frozen mask redacted out of other people's rows*. **Gone** — `Otp`, `PushSubscription`, `Watchlist`, `TotpSecret`, `TotpBackupCode`, `ActiveSession`. |
| ② Held 7 years from closure | `KYC_DOCUMENT_HOLD_YEARS` | Identity **images** and officer-requested extra documents — the R2 objects *and* the rows — plus the source-of-funds declaration. |
| ⛔ Never | — | `Wallet`, `Transaction`, `LedgerEntry`, `Position`, `AuditLog`. The module names what it writes and cannot reach these; `test:erasure` §11.12 asserts it mentions none of them. |

### ⚠️ One departure from the letter of answer 3, flagged rather than decided quietly

Answer 3 says the images are *"deleted outright"*. They are **held for the statutory 7 years**
instead, because §1 of this file has said since 2026-08-20 that identity documents are kept
7 years from account closure under POCA Cap 423 §16 / FATF R.11 — and destroying a passport
scan in year 1 is irreversible, while holding it is a one-constant change
(`KYC_DOCUMENT_HOLD_YEARS`). The number and the name are still pseudonymised immediately, which
is exactly what `/admin/retention` has been publishing to the Board all along (*"we partially
fulfil"*). **Ali's call if he wants the images gone sooner.**

### What an officer sees

Pressing **Fulfil** on an ERASURE request now runs the routine. Three outcomes, kept distinct:

- the account is not CLOSED → refused, the request stays PENDING, the officer is told why;
- the hold is still running → status **PARTIAL** (*"Partly done · docs held"*) carrying the
  release date, and the request **stays in the queue**;
- nothing is left to hold → FULFILLED.

⚠️ **Nothing re-runs erasure at year seven.** There is no 7-year timer, and building one nobody
can test for seven years would be worse than saying so. The open PARTIAL request is the
reminder, `/admin/privacy` shows the next release date as a KPI, and the Fulfil button stays on
a PARTIAL row so the job can be finished when the date arrives. **This is a known manual step.**

### Ops

```sh
railway run --service 50pick -- npm run ops:backfill-id-fingerprints            # --dry default
railway run --service 50pick -- npx tsx scripts/ops-backfill-id-fingerprints.mts --write
```

Fills `idFingerprint` on the rows that predate the column (67 on production). ⛔ **Production
only, and it refuses to run without `OTP_PEPPER`** — under the dev fallback it would write 67
fingerprints the live application can never reproduce, which *disarms* the index instead of
arming it. It never overwrites a value, so a re-run is a no-op, and it pre-flights for a
collision rather than letting the UNIQUE index abort it half way.

⛔ Not load-bearing, deliberately — while a row holds its raw number the tuple index does the
work, and erasure computes the fingerprint itself from the number it is about to destroy. What
the backfill buys is the invariant *every active submission carries one*, which turns a NULL
fingerprint from the normal case into something worth investigating.

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
npm run test:erasure        # 155 assertions. §5 is the one that matters — the erased
                            # document is still SPENT, driven through the real service
                            # rather than through the DAL. §8 sweeps the WHOLE store for
                            # any surviving identifier and allowlists only statutory
                            # holders; it found two surfaces no checklist had.
npm run red:erasure         # 16 plausible defects put back one at a time, each of which
                            # must be caught. Case 1 is answer 3 implemented as literally
                            # written, and it hands out a second account.
```

The suite runs against the in-memory store, which is also what forces both DAL halves to
exist — `tsc` cannot catch a missing in-memory twin, and a Prisma-only method throws in every
unit test.

**Production reality when this was written (2026-08-20):** `Notification` 2,450 rows, oldest
2026-05-30 — *82 days old, so the first live run of this chore will delete nothing.* That is
expected and is not evidence the chore is broken; the first deletions land once rows cross 180
days. `Otp` is empty and will stay empty while `SMS_PROVIDER=console`.
