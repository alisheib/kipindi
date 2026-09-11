# 50pick — the pre-launch data reset

**Opened 2026-09-11 on Ali's instruction.** One-time. Run it once, against production, on the
day you open the doors to real money.

> Go live with the poll catalogue intact, every player gone so they re-register, the books at
> zero — and every rule we already set (rates, commissions, levies) untouched.

This doc is the runbook **and** the record of what was decided. §1 is the state. §2 is the
four rulings. §3 is the order of operations. §4 is what the reset deliberately does *not* fix.

---

## 0. RESUME AT

| | |
|---|---|
| **STATE** | 🏁 **DONE — executed and verified on production `2026-09-11T15:02:57Z`.** 26/26 invariants held inside the transaction before commit, and again on `--verify` afterwards. |
| **Kept** | 3 accounts, all ADMIN/ACTIVE: `+255777777777` (Ali) · `+255757619808` · `+255772619619` (Jay). Ali, 2026-09-11: *"don't keep any other than those I said."* |
| **Outstanding** | ⏳ **Two SUPPORT logins for Customer Care** — Fulgence Kijuu and James Mziray (UT directory). **Blocked on their phone numbers**; see §4b and `ops:provision-staff`. |

### What actually happened

| | before → after |
|---|---|
| `User` · `Wallet` | 114 → **3** |
| money in all wallets | TZS 19,871,648 → **0.00** |
| `Transaction` · `LedgerEntry` | 3,074 → 0 · 8,529 → 0 |
| `Position` · `HousePoolLedger` | 1,380 → 0 · 199 → 0 |
| `PredictionMarket` | 41,615 → **185** (every UPDOWN row gone) |
| `MarketSnapshot` · `UpDownRound` · `UpDownObservation` | 43,090 → 0 · 41,391 → 0 · 34,785 → 0 |
| `AuditLog` | 266,290 → **0** (chain re-genesises on the next write) |
| `AiUsageEvent` · `Notification` · `KycSubmission` | 4,456 → 0 · 4,958 → 0 · 90 → 0 |
| `SystemConfig` | 31 → **23** |

**Rates read straight from the database afterwards, unchanged:** commission `0.13` · ceiling
`0.333` · operator `0.10` · platform `0.03` · TRA `0.10` · GBT `0.05` · withdrawal `0.015` ·
stakes `1,000–1,000,000` · `loser-share` · `starterBalanceTzs` `0`.

**R2:** 114 KYC objects deleted (every `KycDocument` row was gone first, so none was referenced).
42 of 44 backup objects purged, 1,032.5 MB. **Kept:** the `04-42-18` pre-reset artifact — which
`__BACKUP_LAST_RUN__` records as `"verified": true`, so the retained rollback point is a
*restore-proven* one — plus the clean post-reset backup (`15-04-36`, 1.57 MB, 1,388 rows,
0 wallets money, 0 ledger, 0 audit).

**Chains:** the 9 paused by `--quiesce` were restarted by `--resume`; the 14 already STOPPED were
left alone. `sentinel.paused` restored to `false`.

### ⭐ What the rehearsal actually caught

The SQL and the deletion order were right first time. What `--rehearse` caught was **an
assertion that lied**: `no rule row went missing` printed a green tick beside the words
`absent: bonus.config, lipa.config, proposals.config`. It *passed* correctly — it compares the
before/after count — but its message read like three rules the reset had destroyed. Those three
have no persisted row at all and fall back to code defaults; they were absent *before* the reset
too. ⛔ **A green tick next to the word "absent" is how a reader stops trusting the green ticks.**
Fixed to distinguish LOST from NEVER-STORED *before* `--execute` ran, so the receipt carries the
honest wording.

⚠️ **The pre-reset backup was NOT restore-verified on this machine** — `db:verify-backup` needs a
scratch Postgres cluster and there is neither a local instance nor Docker here. It is sealed and
its sha256 is recorded. The mitigation is that the *retained* R2 rollback point is the 04:42
artifact, which the nightly watchdog **did** restore-verify.

---

## 1. What is on production today (measured 2026-09-11)

| | rows | note |
|---|---|---|
| `User` | **114** | 97 PLAYER · 9 ADMIN · 8 other staff, six of them named `…(test)` |
| `Wallet` | 114 | holding **TZS 19,858,896** + 12,000 bonus |
| `PredictionMarket` | **41,285** | only **185** are real polls; **41,100** are Up & Down rounds |
| `Position` | 1,380 | **743 of them belong to the nine ADMINs** |
| `Transaction` | 3,070 | 1,495 ADMIN |
| `LedgerEntry` | 8,501 | grand total TZS 0.00 — the books do balance |
| `AuditLog` | **264,595** | HMAC-chained, growing ~11,500/day |
| `MarketSnapshot` | 42,758 | price history of the bets above |
| `UpDownObservation` | 34,518 | child of ASSET, *not* of round — no cascade reaches it |
| `SystemConfig` | 31 | 20 rules · 3 accounting · 8 per-user or dead |
| R2 `50pick-backups` | 43 objects | 1,075 MB, daily 31 Jul → 11 Sep |
| R2 `50pick-kyc` | 114 objects | 16.6 MB across 34 user folders — NIDA, passports, selfies |

### 1a. ⚠️ Three things that are not obvious from the ask

1. **The admins are the heaviest test bettors.** "Keep some admins" is not "keep their data" —
   743 positions, 1,495 transactions and TZS 7,381,473 sit on accounts that survive. The reset
   strips them to a login: id, phone, email, password, role, status, TOTP. Nothing else.
2. **Pools are denormalised onto the market row.** `yesPool` / `noPool` / `predictorCount` live
   on `PredictionMarket`, so keeping a poll and deleting its bets leaves a poll advertising
   money nobody staked — TZS 17.6M of it across the 185. Settlement then divides a losing pool
   it would pay out of. **Zeroing the pools is not tidiness; it is the difference between a
   kept poll and phantom money on a live money surface.**
3. **`User.email` is not unique, and in practice is not unique.** `alisheib07@gmail.com` is on
   **four** accounts — one ADMIN plus three test PLAYER registrations. Only `phoneE164` is
   `@unique`. **Identify keep-list entries by phone.** (The resolver enforces this; an early
   version matched `phone OR email` and over-matched to four on a correct list.)

---

## 2. The four rulings — Ali, 2026-09-11

| # | Decision | |
|---|---|---|
| 1 | **Keep-list** | ⏳ **POSTPONED.** Ali supplies users + emails + roles. Until then the reset cannot run — by design, not by omission. |
| 2 | **Polls** | Keep all **185** MARKET polls (36 LIVE, 135 RESOLVED, 14 VOIDED) with questions, criteria, translations and `feeSnapshot`. **Delete all 41,100 UPDOWN rows** — machine exhaust, one row every few minutes, regenerated by the live chains. |
| 3 | **Audit log** | **Wipe all 264,595 rows; the chain restarts at GENESIS.** See §2a — this overrides written doctrine. |
| 4 | **Backups** | Fresh backup first → reset → verify → **then** purge the 43 old objects, keeping the pre-reset one as the rollback point. |

### 2c. ⭐ THE GOVERNING RULE — Ali, 2026-09-11, and it is the one to test every table against

> *"Support details and support info etc, keep them. You just remove things that affect
> **numbers** and **access**."*

This is sharper than an enumerated list and it is what the classification should be audited
against. **Delete or zero only what is money (a number) or identity (an access).** Everything
else — configuration, content, support surfaces, the poll catalogue, the AI pipeline — stays.

| | affects | treatment |
|---|---|---|
| `Wallet`, `Transaction`, `LedgerEntry`, `HousePoolLedger`, `Position`, `BonusGrant`, `ReferralReward`, `MarketSnapshot`, pool columns, `house.pool.state`, `ai_usage_daily`, `AiUsageEvent`, `AiSpendCycle`, agent `totalCommission`/`totalRecruits` | **numbers** | deleted / zeroed |
| `User` (non-kept), `Session`, `ActiveSession`, `Otp`, `TotpSecret`, `PushSubscription`, `KycSubmission`/`KycDocument` + their R2 objects, `SourceOfFunds`, `ResponsibleGambling`, `email.suppression`, `bootstrap.login_promoted:*` | **access** | deleted / cleared |
| **`support_config`** (msaada@50pick.tz, helpline), `market.config`, `agent.config`, `affiliate.config`, `updown.config` + playbooks, `platform_config`, `resolution.policy`, `payments.control`, `sentinel.schedule`, `ai_*` controls, `sources.disabled_categories`, 185 polls + their `feeSnapshot`, `AIPoll`, `MarketCandidate`, `TrustedSource`, `UpDownAsset`, `UpDownChain`, agent `code`/`commissionPct`/`approvedAt` | **neither** | **KEPT, untouched** |

✅ **Checked 2026-09-11: there is no support, ticket, FAQ, help, CMS or content table in the
database at all.** Every support surface is either `support_config` — which is on the keep list
and verified byte-identical by `rulesHash` — or lives in code and i18n, which a data reset
cannot reach. So nothing support-side is in the blast radius.

#### The stale `helpline` keys in `support_config` — what is and is not true

The live row is
`{email, phone: "+255769777877", helpline, phoneTel, helplineTel}` and still carries
`helpline`/`helplineTel` holding **50pick's own desk number**. Peer session `asheib-8c` flagged
this as a restore-time hazard that would route a self-excluding player to the operator. **I
checked it, and the exposure is narrower than that** — worth recording precisely, because
overstating it would send a future reader hunting a bug that E-328 already closed:

1. `helpline`/`helplineTel` are **not in the `SupportConfig` type** — it is `{email, phone, phoneTel}`.
2. The statutory number is a **pinned code constant**: `STATUTORY_HELPLINE = "0800 11 0011"`,
   read through `HELPLINE()` / `HELPLINE_TEL()`, with *no setter, no persisted field and no
   admin control*. The self-exclusion route and `/legal/responsible-gambling` read **that**, not
   the row.
3. `migrate()` in `src/lib/server/support-config.ts` is an **allowlist** — it copies only the
   three fields it owns, so the stale keys are dropped on every hydration rather than blacklisted.
4. **Nothing in `src/` reads a persisted helpline.** The `t.*.helpline` hits are i18n *label*
   keys; the number beside them comes from the constant.

⭐ So the keys are inert, and the residual risk is the real one the code's own comment names:
*"a later `set()` would write them out again."* `asheib-8c`'s pending save removes them
permanently, which is strictly better than relying on a read-time allowlist — and it is a reason
to sequence that save **after** this reset, so its audit row survives.

⛔ **One genuine restore-time obligation, though:** the pre-reset backup I retain as the rollback
point contains the row *with* those keys. A restore is fine for the three live fields, but if it
happens after `asheib-8c`'s save it silently reintroduces what that save removed. **After any
restore of a pre-2026-09-11 artifact, re-apply the `support_config` correction.**

⚠️ **The two judgement calls this rule makes, stated so they can be overruled:**
`email.suppression` is cleared because a suppressed address blocks mail — that is **access**, and
it currently holds only test addresses, one of which (`vickyhabibalalji13@icloud.com`) would
silently swallow mail if a real person later registered it. `Notification` history is deleted
because every row narrates a **number** ("you won TZS …") about a bet that no longer exists.

### 2b. ⭐ One refinement made without asking, because the instruction already decided it

*"Keep all rules we already set like rates and commissions"* and *"0 everything in accounting"*
**both** land on `AffiliateAgent`, which holds a rule and an account balance in one row:

| column | is | treatment |
|---|---|---|
| `code`, `commissionPct`, `approvedAt`, `active` | **the rule** — the negotiated rate and the only marker of a vetted agent | **kept** |
| `totalRecruits`, `totalCommission` | **accounting** — what they have earned | **→ 0** |

There is **exactly one real approved agent**: code `50PICK-AG-NHKQNC`, **commissionPct 10.00**,
approved 2026-09-06, on the kept AGENT account `+255769777877`
(`ocean.entertainment.tz@gmail.com`), with 1 recruit and TZS 248 earned.

⛔ **The first version of this script deleted `AffiliateAgent` whole**, which would have stripped
that agent of the 10% rate Ali explicitly said to keep and left `policyFor` **refusing to price
them at all** — `commissionPct` is nullable with no default precisely so that "unpriced" fails
closed. So kept accounts keep the row; only the earnings zero. Their **APPROVED
`AgentApplication`** (the vetting evidence) is kept for the same reason.

⚠️ The other **56** `AffiliateAgent` rows are auto-minted by `ensureAffiliateAccount` on anyone
who opens the referral page — all have `approvedAt` NULL **and** `commissionPct` NULL, so they
carry no rule, and their owners are being deleted anyway.

**Reverse it with `--drop-agent-approvals`** if Ali would rather re-vet every agent from
scratch. The 15 `ReferralReward` rows (TZS 248, all PAID) are commission *accounting* and are
deleted either way.

### 2a. ⛔ Ruling 3 is a deliberate override of `DATA-RETENTION.md` §3

§3 says the audit log is on no deletion path, and its reasoning is sound: the chain is
HMAC-linked with `@@unique([prevHash])`, so **deleting any row breaks it, and the break is
exactly the signal the chain exists to produce.** There is no partial prune that leaves it
able to prove anything.

The override is not a disagreement with that reasoning — it is the only coherent option once
the users are gone. 264,595 rows describing test activity by 97 erased players, carrying
payload PII about them, cannot be selectively cleaned. Wiping whole and re-genesising means
the real-money chain begins unbroken on day one.

**Recorded in `COMPLIANCE-DECISIONS.md`. §3 of `DATA-RETENTION.md` carries a pointer to this
section, so the doctrine and its one exception are not two separate claims.**

---

## 3. The order of operations

⚠️ **Run from `F:\kipindi-main`** (the Railway CLI link lives there) and point at the **public**
proxy:

```bash
export RESET_DATABASE_URL="$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL)"
```

⛔ **Not `railway run`** — it injects the *internal* DB host, which does not resolve off-box,
and the failure looks like a dead database.

### 3.1 Fill the keep-list

`prelaunch-keep-users.json` is generated with all 17 non-player accounts and `keep: false` on
every row. **Flip the ones to survive to `keep: true`.** That is the whole edit.

```json
{ "phone": "+255777777777", "keep": true, "role": "ADMIN",
  "email": "alisheib07@gmail.com", "note": "owner" }
```

It is gitignored — it carries staff phone numbers and emails.

Four guards run before anything is touched, and **all four were tested firing**:

- an empty list, or a roster with nothing flagged → refuses
- a file that *mixes* flagged and unflagged rows → refuses (a missing flag would mean opposite
  things on two rows of one file)
- any entry that matches no account, or more than one → refuses, naming the entry
- **the lockout guard**: refuses unless at least one surviving account is `ADMIN` + `ACTIVE`
  with a password. A reset that leaves nobody able to sign in has no way back through the
  product.

### 3.2 Run it

```bash
npm run ops:prelaunch-reset -- --plan        # read-only; read this output before continuing
npm run db:backup && npm run db:verify-backup   # the pre-reset rollback point
npm run ops:prelaunch-reset -- --quiesce     # pause 9 RUNNING chains + the sentinel
npm run ops:prelaunch-reset -- --rehearse    # run every statement, then roll back
npm run ops:prelaunch-reset -- --execute --confirm "RESET 50PICK FOR LAUNCH"
npm run ops:prelaunch-reset -- --verify
npm run db:backup && npm run db:verify-backup   # the first clean backup
npm run ops:prelaunch-purge -- --purge-kyc     --confirm "PURGE 50PICK R2"
npm run ops:prelaunch-purge -- --purge-backups --confirm "PURGE 50PICK R2"
npm run ops:prelaunch-reset -- --resume       # restart the chains
```

**`--quiesce` is not optional.** Nine chains are RUNNING and wrote ten rounds during the ten
minutes it took to write this doc; the sentinel resolves markets on its own timer. Rows
appearing mid-wipe make the verification meaningless, so `--execute` refuses while either is
live. It is reversible — `--resume` restarts exactly the chains `--quiesce` paused (recorded in
`.prelaunch-quiesced.json`), and never the 14 that were already STOPPED.

### 3.2a 🔴 A SEEDING SCRIPT RUNS ON EVERY PRODUCTION BOOT — check it twice

Found by `asheib-b6` during this work, and it is the single largest thing in the blast radius:

```
"start": "prisma migrate deploy && node scripts/seed-test-float.mjs && next start"
```

`seed-test-float.mjs` tops **every ACTIVE wallet up to a TZS 1,000,000 floor.** If it fired on
the first boot after the reset, the launch state would become 100-odd freshly zeroed wallets
refilled with a million shillings each, and an unbalanced ledger. **FIVE of the nine admin
wallets sit at exactly 1,000,000 — `WHERE balance = 1000000`, measured — so this script has run
against production before.** Filed as **E-380** in `LIVE-QA-CAMPAIGN.md` §6; it stays OPEN,
because the reset does not change the boot path.

**Verified 2026-09-11, by reading the script and the live service config rather than trusting
either alone — two independent gates both hold:**

| gate | order | live value | effect |
|---|---|---|---|
| `NODE_ENV === "production"` → hard refuse | checked **FIRST**, before the flag | **`"production"`** ✅ | refuses outright |
| `TEST_FUNDING !== "true"` → skip | second | **UNSET** ✅ | skips anyway |

⚠️ **Both gates are service configuration, not code.** The refusal runs in a separate node
process before `next start`, so nothing in Next.js sets `NODE_ENV` for it — the Railway service
variable does. **Check both before `--execute`, and check them AGAIN after the first boot
following the reset.** The second reading is the one that proves it:

```bash
railway variables --service 50pick --json | jq '{NODE_ENV, TEST_FUNDING}'
# then, after the reset and the next deploy, re-run --verify
```

⛔ **The `&&` chain is a second hazard in the same line.** If `prisma migrate deploy` fails,
`next start` never runs and **the platform is down** — the failure mode is an outage, not a bad
row. This reset applies **no migration and no DDL**; it only deletes and updates rows, and never
touches `_prisma_migrations`. Keep it that way. If a schema change is ever bundled with a reset,
hand-apply it to production first with the app still up, per the payments-campaign practice.

### 3.2b ⭐ `--rehearse` — run the whole thing against production, then throw it away

Everything else in this doc is an *argument* that the reset will work: the deletion order came
from the real FK graph, the invariants are written down, `--plan` prints the right numbers.
**None of that is the same as having run it.** `--rehearse` executes every statement in order
against the real rows, asserts every invariant on the real post-delete state, and then rolls the
transaction back.

It answers the one question a plan cannot: **does the ORDER hold?** A missed `RESTRICT` edge
surfaces as a foreign-key error on a transaction that was always going to be discarded, rather
than halfway through the real run. After a green rehearsal the order is *executed*-verified, not
derived.

⛔ **It takes real locks for its duration.** ~350k row deletions inside a transaction lock those
tables until the rollback, and every request the app serves writes an audit row — so an
un-quiesced rehearsal can stall the platform. It therefore demands the same `--quiesce` as
`--execute`, and sets `lock_timeout = 15s` / `statement_timeout = 180s` so a rehearsal that meets
contention **dies rather than waiting**. The waiting is what would stall things, not the failing.

⚠️ Run it **after** the pre-reset backup, not before — a rehearsal is safe by construction but
"safe by construction" is a claim, and the backup is what makes it recoverable if the claim is
wrong.

### 3.3 Why the purge is last

Deleting the backups first destroys the rollback path at the moment it is most likely to be
needed. `--purge-backups` therefore refuses unless **both**:

1. `.prelaunch-verified.json` exists — the invariants actually passed; and
2. a backup object exists that is **newer than the reset** — otherwise the purge would leave
   the platform with no current backup at all.

`--purge-kyc` separately refuses while any `KycDocument` row survives: an object a live row
points at is in use, and only a bucket whose rows are all gone is safe to empty.

### 3.4 How the verification avoids lying

The reset is **one transaction**, and the invariants are asserted *inside* it — a failure
`ROLLBACK`s, so the database is never briefly wrong.

⛔ **The rule checks compare against a fingerprint taken before the deletes, not against
literal values.** The first draft asserted `polls === 185` and `commissionRate === 0.13`. Both
are today's numbers, and both would have gone red the moment Ali added a poll or retuned a
rate between the plan and the run — a check that accuses correct code. Worse, naming the nine
rates I happened to read means a tenth rule could be clobbered silently and still pass. So:

- `rulesHash` — sha256 over every kept rule row, answering *"did the reset change any rule?"*
- `feeSnapshotHash` — sha256 over `(id, feeSnapshot)` for all 185 polls, so the rates **frozen
  onto each poll** are provably untouched. Settlement reads these, never live config.
- `marketPolls` — the pre-reset count, compared to the post-reset count.

`--verify` reads the baseline from the receipt the reset wrote. It **refuses to run without
it**: re-measuring now and comparing it to itself is a check whose two sides move together,
which cannot fail and proves nothing.

Three keys are excluded from the hash because they are operational, not rules —
`sentinel.paused` (flipped by `--quiesce` itself), `__LEADER_lifecycle__` (rewritten by
whichever instance holds the lease) and `__BACKUP_LAST_RUN__` (the nightly watchdog).

Two aggregate checks were rewritten after `asheib-84` pointed out the hole: **a sum of zero is
not "every row is zero"** — `+100` and `−100` sum to zero too, and neither `Wallet.balance` nor
the pool columns carry a non-negative constraint. Both now assert the **worst single row** and a
**count of non-zero rows**, not the total. An aggregate hides a per-account spread, which is the
same defect as reading a balanced trial balance as proof that each account is right.

### 3.5 Does the wiped audit chain still verify? Yes — *because* the wipe is total

`asheib-b6` asked whether a hand-rolled `DELETE` leaves the chain unable to tell a reset from
tampering. It does not, and the reason is worth stating because it is the opposite of the
intuition: **`classifyChainLinks` in `src/lib/server/audit.ts` treats an empty table as a chain
that has not started, not a broken one** —

> `// An empty table is not a broken chain — it is a chain that has not started. Saying`
> `// otherwise would make every fresh environment look tampered with.`
> `if (counts.total === 0) return { linkBroken: false };`

and `selectHead()` returns `GENESIS` when the table is empty, so the next append roots the new
chain correctly with no special handling.

⭐ **The safety comes from totality.** A *partial* delete would leave rows whose `prevHash`
names a removed `entryHash` — `dangling > 0`, reported as *"entries were REMOVED"*. A whole-table
wipe leaves nothing dangling, so it reads as a fresh environment. **This is the strongest
argument that there is no middle option: the only audit-log deletion the verifier cannot
distinguish from tampering is the partial one.**

⚠️ **There is no first-class re-genesis path, and there should not be one** — see
`COMPLIANCE-DECISIONS.md` § 2026-09-11. `--verify` therefore checks the table is empty; the
chain's own verification becomes meaningful again after the first audited action (an admin
sign-in will do it). **Do that, then confirm the chain on `/admin/retention`, before opening the
doors.**

---

### 3.6 ⚠️ The two npm keys and their two scripts reached `main` in SEPARATE commits

Recorded because the working state is right **by an accident of ordering**, and the next person
to run `git revert` needs to know:

| | commit | what it carries |
|---|---|---|
| the KEYS | `33ef87ab` (a Support & Care commit) | `ops:prelaunch-reset`, `ops:prelaunch-purge` in `package.json` |
| the SCRIPTS | `32292aed` (this work) | `scripts/ops-prelaunch-{reset,purge-r2}.mts` |

The keys were swept onto `main` by another session's commit while the scripts were still
untracked — `package.json` publishes a **reference** and leaves its **referent** behind, and
`test:guards-exist` went red for every clone. When the scripts were finally cherry-picked on
top, `package.json` **dropped out of that commit** (8 files, not 9): `origin/main` already held
the keys, so git skipped the hunk as already applied.

⛔ **So neither commit contains the pair, and reverting either one alone re-breaks `main`** — in
opposite directions. Revert `33ef87ab` and the scripts become orphans (`test:orphans`); revert
`32292aed` and the keys dangle again (`test:guards-exist`). They are a unit in effect and not in
history. ⭐ The general lesson, from three sessions sharing one trunk: **a correct fix has a shelf
life — re-verify its premise at the moment you PUSH, not the moment you commit.** A fourth commit
that removed the keys was written, measured, correct when written, and would have inverted the
bug by the time it could ship; it was dropped minutes before landing.

## 4. What the reset does NOT do

- **It does not touch dates.** Some of the kept LIVE polls have a `resolutionAt` already in
  the past; they will fall straight into the resolver queue at launch. `--plan` counts them.
  **Reschedule or void them in `/admin` before opening the doors.**
- **It does not re-seed the house pool.** `house.pool.state` keeps its `config`
  (`minReserve` 200,000 · `seedPerSide` 50,000) but goes to balance 0 with no seeds. Fund it
  deliberately, or the low-reserve behaviour fires on the first real bet.
- **It does not change `WHISH_ENV`, payment provider gates, or any feature flag.** Those are
  separate go-live switches.
- **It does not fix `RoleDomainGrant` / `RoleReadGrant` being empty.** That is already
  correct — the resolver falls back to `DEFAULT_GRANTS` in code, and the tables store only
  overrides.
- **It writes no audit row of its own.** The audit table is wiped in the same transaction, so
  an in-chain record of the reset would be deleted by the act it describes. The record is
  `.prelaunch-reset-receipt.json` plus this doc.

---

## 4b. 🔴 GETTING STAFF THEIR ROLES BACK — read this BEFORE writing the keep-list

Ali, 2026-09-11: *"when I share [the list] we create for them access roles as well."* The
product does not do that the way the phrase implies, and the difference decides what belongs
on the keep-list.

⛔ **`/admin/staff` PROMOTES; it does not CREATE.** `actions.ts` says it in its own header:
*"already have a normal 50pick account — **we never create logins here**."* There is no
admin-side account creation anywhere in the product. A person must **register themselves** at
`/auth/register` first; the Owner then grants the role by phone.

⛔ **AND ADMIN (Owner) IS NOT GRANTABLE THAT WAY AT ALL.**
`EDITABLE_ROLES = STAFF_ROLES.filter(r => r !== "ADMIN")` — the staff form offers the six
non-Owner roles only, deliberately, so the Owner seat cannot be handed out through a form.

### So there are exactly three routes, by role

| role | how they get it after the reset |
|---|---|
| **ADMIN** (Owner) | **Either keep the account** through the reset, **or** their phone is in `ADMIN_BOOTSTRAP_PHONES` → they register → **first login auto-promotes them**, one-shot and audited (`user.bootstrap_promoted_on_login`). |
| **COMPLIANCE · FINANCE · SUPPORT · MODERATOR · GROWTH · AUDITOR** | They register normally, then the **Owner** promotes them by phone at `/admin/staff` with a typed reason. Audited. |
| **AGENT** | Not a staff role — the agent application + approval flow, priced by an officer. |

### ⭐ The bootstrap net, measured on the live service 2026-09-11

`ADMIN_BOOTSTRAP_PHONES` currently holds **six** numbers, all of them present ADMINs:

    +255777777777  +255777777772  +255777777775
    +255772619619  +255757619808  +255772388888

**Any of those six can be deleted by the reset and still recover the Owner seat unaided** — the
one-shot record is keyed by `user.id`, so a re-registered account gets a fresh id and the
promotion fires again. That is a real safety net under the lockout guard.

⚠️ **Three current ADMINs are NOT in that list — `+255777777771`, `+255777777776` and
`+255700000001`** (husseinsheib / "Ali Admin"). Delete those and they cannot self-restore;
they would need another Owner to... except ADMIN is not grantable at `/admin/staff` either. **So
for those three the keep-list is the only route back.** Keep them, or add their phones to
`ADMIN_BOOTSTRAP_PHONES` before running the reset.

### ⭐ The recommendation

**Keeping an existing staff account is strictly less work and less risk than recreating one** —
the login, the role and the audit of how they got it all survive, and nobody has to re-register
during a launch. Use register-then-promote only for people who are genuinely new. The reset
strips a kept account to a login regardless, so keeping it costs nothing in data terms.

⛔ **Do not provision staff by writing `User` rows directly.** `seed-staff-local.mts` does that
for LOCAL personas and says so; on production it would mint a role with no audit row explaining
it, on the one surface where "who granted this and why" is the whole point.

## 5. The rates that must read identically afterwards

From `market.config`, verified byte-identical by `rulesHash`:

| | |
|---|---|
| commission | **0.13** |
| fee ceiling | **0.333** |
| operator fee | **0.10** |
| platform fee | **0.03** |
| TRA levy on commission | **0.10** |
| GBT levy on commission | **0.05** |
| withdrawal fee | **0.015** (gateway share 0.005) |
| stake bounds | **1,000 – 1,000,000** |
| fee model | `loser-share` |
| `starterBalanceTzs` | **0** — new registrations get nothing, which is what a real launch wants |

Also preserved: `agent.config` (the 10% agent programme), `affiliate.config`,
`updown.config` + the BTC/USD and XAU/USD playbooks, `proposals.config`, `support_config`,
`resolution.policy`, `payments.control`, `sentinel.schedule`, the `ai_*` controls,
`sources.disabled_categories`, 30 `TrustedSource` rows, 7 `UpDownAsset` rows with their
enabled flags, 23 `UpDownChain` definitions, 716 `AIPoll` and 304 `MarketCandidate`.
