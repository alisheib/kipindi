# Data-Handling Audit — full platform scan (2026-08-20)

> **What this is.** A pre-launch, whole-platform audit of how 50pick stores, moves,
> retains, and uses data — schema to render path, player and admin, both products,
> simple tasks to the most complicated flows — run as: software architect · data
> architect · data analyst · compliance engineer · routing engineer ·
> gambling-industry engineer.
>
> **How to use this file (next session, read this first).** §4 is the ranked
> findings; each one is a **self-contained work order**: exact files and lines, the
> precise change, and the acceptance check that proves it. §5 is the sequence. §3
> is the flow atlas — the map of what every flow writes and reads, so you never
> have to re-discover it. Do NOT re-audit what §1 already verified sound; those
> have positive evidence.
>
> **Method.** (1) Full read of `prisma/schema.prisma` (42 models), the DAL layer
> (`store.ts`, `prisma-dal.ts`, `market-dal.ts`), the lifecycle engine
> (`lifecycle.ts`, `market-scheduler.ts`), every retention/deletion path in `src/`,
> every `dev-test` route, the admin surfaces, and the public API routes.
> (2) **Read-only measurement of the production database** via the Railway public
> URL — row counts, table sizes, orphan probes, overdue-lifecycle probes, audit-log
> composition. `SELECT`s only; nothing was written to prod.

---

## 0. Verdict

**The core is sound.** Money data is transactional, dual-booked (Transaction +
double-entry LedgerEntry), trial-balanced nightly, tamper-evident (HMAC audit
chain), and frozen-at-write wherever pricing depends on it (fee snapshots, pinned
sources, write-once observations). Market END timing is verified healthy **on live
data**: zero overdue transitions in every probe. Nothing deletes financial
records, which is correct for a licensed operator.

**What launch actually needs fixed** is at the edges: a data-retention engine that
exists in player-facing copy but not in code (F-01), 11 MB of identity documents
still inline in Postgres (F-02), a regulator-facing report that silently mislabels
orphaned money rows (F-03), a privacy policy that declares collection that doesn't
happen (F-04), six dead tables (F-05), raw emails in Railway logs (F-06), and a
family of whole-table reads that are fine at 100 users and will not be at 10,000
(F-07/F-08). None is architecturally deep; all are pre-launch-sized.

---

## 1. What was verified SOUND (positive evidence — do not re-audit)

### 1.1 Storage safety
| Control | Evidence |
|---|---|
| Passwords: scrypt + per-user salt (NIST SP 800-132) | `src/lib/server/crypto.ts` |
| OTP codes + 2FA backup codes: HMAC-hashed + peppered, never plaintext | `crypto.ts`, `backup-codes.ts`, `Otp.codeHash` |
| TOTP secrets: AES-256-GCM at rest (`v1.` envelope), legacy rows upgraded on read | `crypto.ts`, `totp.ts:89-113` |
| Sessions: signed HttpOnly cookie + durable `ActiveSession` registry, DB-authoritative revocation, single active session per user | `session.ts`, `session-registry.ts` |
| Audit log: append-only HMAC chain, physically fork-proof (`@@unique([prevHash])`), no FK to User so erasure can never break it, in-memory ring capped at 10,000 (`audit.ts:63`) | schema + `audit.ts` |
| New KYC documents → R2 (`r2:` keys); read path routes by key shape so old inline rows still read | `storage.ts`; prod: 43/67 on R2 |
| KYC uploads capped 3 MB decoded (`MAX_DOC_BYTES`, `kyc-service.ts:372`); avatars capped 96 KB (`profile/actions.ts:21`) | verified |
| Wallet CHECK constraints (balance/hold/bonusBalance ≥ 0); Decimal(18,2); whole-TZS everywhere | migration `20260702140000` |
| Identity uniqueness enforced by the DATABASE: partial unique `(idType, idNumber)` WHERE not REJECTED | migration `20260820120000` |
| Audit payloads: phones masked via `maskPhoneForAudit`; grep found **no credential in any `payload:`** | `auth-service.ts` et al. |
| `msisdn`-bearing CSV export: RBAC-gated, every export COMPLIANCE-audited with filter set + row count | `api/admin/transactions/export` |
| KYC document reads TOTP-gated | `api/admin/kyc-doc/route.ts:46` |
| All 40 `api/dev-test/*` routes 404 in production — **verified per-file, 0 unguarded** | grep sweep |
| `/api/diagnostic`: session-required, masked phone, self-only data | `api/diagnostic/route.ts` |
| SSE `/api/events`: session-validated, user-scoped events filtered to the connected session's userId | `api/events/route.ts` |
| Redis: optional, fail-open, never on bet/admission path; two keys to arm | `redis.ts` |
| Backups: table set DERIVED from Prisma DMMF (cannot drift), aborts on unknown live table, gzip → optional passphrase encryption | `backup/core.ts`, `scripts/db-backup.mts:684-688` |
| Ticker/charts/history: real data only (A-5) — synthetic ticker and `seedHistory()` both dead, guarded by `test:history` | `ticker-feed.ts` header |

### 1.2 Lifecycle timing — measured on prod 2026-08-20, all clean
| Probe | Result |
|---|---|
| LIVE long-form markets >2h past `resolutionAt` | **0** |
| RESOLVED/VOIDED unsettled >2h past objection close | **0** |
| Up & Down rounds >30min past boundary still LIVE/CLOSED | **0** |
| OPEN positions on settled markets | **0** |
| Positions whose market row is missing | **0** |

Engine: one precise timer per market (`market-scheduler.ts`) — closing-soon (−1h)
→ notify-closed (cutoff) → resolve (`resolutionAt`) → settle (`objectionsClosedAt`,
default 24h window, `market-config.ts:233`) — hydrated at boot, missed deadlines
fired after 90s grace, fire concurrency gated at 3, every transition idempotent
under the market lock; a 5-min reconcile re-arms lost timers; the E-24 round
healer runs every 60s; a single-leader lease (`leader.ts`) keeps chores
single-instance and fails CLOSED. Up & Down settles immediately
(`objectionsClosedAt = now`, `updown-service.ts:897`) by design.
**Ending markets at the right time: PASS with live evidence.**

### 1.3 Deliberate, guarded redundancy (not defects — keep)
- Transaction + LedgerEntry dual-write, **nightly trial balance** raises a COMPLIANCE audit alert on any drift (`lifecycle.ts` → `trialBalance()`).
- `feeSnapshot` frozen per market; `UpDownRound.capturedSourceUrl/Domain` pinned at open; round open/close prices denormalised from **write-once** observations (`@@unique([assetId, boundaryAt])`).
- Pool counters: atomic increments only (`market-dal.ts` `applyPoolDeltas`); `Comment.authorName` frozen at write (privacy-consistent); affiliate `recruitCount` atomic (audit M7).
- `MarketSnapshot`: FIFO-pruned to newest N per market, 1-in-50 writes (`market-history.ts:100-180`). `AiUsageEvent`: pruned at `RETAIN_DAYS`, 1-in-250 writes (`ai-usage.ts:95-100`).

### 1.4 Read-path discipline already right
- Board query: composite-indexed (`@@index([productLine, status, resolutionAt])`); `productLine` keeps 12,437 settled rounds off every player board (`test:product-line` guards call sites).
- Leaderboard + Up & Down digest: SQL GROUP BY (each carries the war story of why).
- `/admin/transactions`: real SQL pagination + whole-set KPI totals (`txn-filters.ts`).
- Client polling phase-aware, **stops on decided rounds** (`refresh-cadence.ts`); reporting reads `Transaction` via the time index (1,889ms → 54ms at 100k rows).
- Per-user caps: positions 100/200, notifications 30.

---

## 2. Production data reality (measured 2026-08-20)

| Table | Rows | Size | Note |
|---|---|---|---|
| AuditLog | 111,822 | **141 MB** | ~⅔ of the DB. **105,887 rows in the last 30 days** (~3.5k/day). ~90% is Up & Down machinery: `market.created` 15.4k · `market.settled` 15.2k · `updown.round.opened` 15.2k · `market.resolved` 15.1k · `observation.confirmed` 13.4k · `round.resolved` 12.2k |
| PredictionMarket | 12,572 | 34 MB | 115 long-form; **12,457 UPDOWN** (11,580 RESOLVED · 857 VOIDED · 20 LIVE) |
| KycDocument | 67 | **12 MB** | **24 inline base64 docs = 11 MB of IDs/selfies in Postgres**; 43 on R2 |
| UpDownObservation / UpDownRound | 10.6k / 12.5k | 9.7 / 8.5 MB | +1 row per asset-boundary / per round, forever |
| MarketSnapshot | 13,435 | 3.5 MB | 13,308 on already-settled markets |
| AIPoll | 620 | 8.4 MB | `rawResponse`/`trace`/`generation` kept forever |
| Notification | 2,448 | 1.9 MB | oldest 2026-05-30; nothing prunes |
| Transaction / LedgerEntry / Position | 2,015 / 5,251 / 915 | — | **374 txns carry a `positionId` that no longer exists** (pre-launch reset artifacts) |
| Session · Otp · Device · AntiFraudFlag · MatchIntegrityCheck · ProviderHealth | **0 each** | — | six empty tables (F-05) |
| User / Wallet / ResponsibleGambling | 100 each | — | 1 avatar (38 kB) |
| SystemConfig | 26 keys | — | incl. `bootstrap.login_promoted:+255…` (phone in key), `chat.daily.usr_*` per-user keys |

---

## 3. Flow atlas — what every flow writes and reads (the map)

Verdict key: ✅ sound · finding-ref where not.

**Simple / per-request**
| Flow | Data touched | Verdict |
|---|---|---|
| Any page render (signed in) | `app-shell.tsx:85-115` reads user + wallet + RG per render — includes `avatarDataUrl` blob on every page | F-11c |
| Locale | `kp-locale` cookie only; no DB | ✅ |
| Avatar upload | validated data-URL ≤96KB → `User.avatarDataUrl`, audited | ✅ (placement: F-11c) |
| Profile edit | zod-validated field set, audited with values-not-secrets | ✅ |
| Watchlist star | one row `@@unique([marketId, userId])`; unfollow deletes | ✅ |
| Comment | frozen masked `authorName`, reports as JSON userId[], soft-hide/delete flags | ✅ |

**Auth & identity**
| Flow | Data touched | Verdict |
|---|---|---|
| Register (password) | User + Wallet + RG rows; phone-masked audit; rate-limited by phone AND IP | ✅ |
| Login | scrypt verify → signed cookie + `ActiveSession` upsert (revokes prior session, audited `session.revoked_by_newer_login`) | ✅ |
| OTP flows | code HMAC-hashed; **prod has never issued one** (0 rows, 0 `otp.%` audit actions — password+TOTP won) | F-05 (dormant) |
| 2FA | TOTP secret AES-GCM; backup codes hashed, consumed-once | ✅ |
| Password reset | fingerprint-bound token (`pwh`), temp-password path audited | ✅ |
| KYC submit | submission row (idType+normalised idNumber, DB-unique) + docs → R2 (new) / inline (24 legacy rows) + `extraRequests` JSON; officer decisions audited | F-02 |

**Money (the most complicated flows — all verified single-transaction)**
| Flow | Data written | Verdict |
|---|---|---|
| Bet (`buyPosition`) | ONE tx: wallet debit + Position + Transaction + atomic pool deltas + balanced LedgerEntry pair (`ledger.ts:275`) + audit; fire-and-forget snapshot AFTER commit; idempotency key on both Position and Transaction | ✅ |
| Deposit | Selcom order → `Transaction(PROCESSING)`; 15s fast-credit lane re-queries signed status (confirm-only); 5-min reconcile owns terminal states; `@@unique([provider, providerRef])` makes double-credit impossible | ✅ |
| Withdrawal | hold → dispatch → `settleWithdrawalConfirmed` owns terminal; `payoutRail` stored so re-query hits the endpoint that owns the transid (money-safety, schema comment) | ✅ |
| Cash-out | same lock+tx discipline; fee snapshot pricing; blocked for bonus-funded positions | ✅ |
| Settle (`settleMarket`) | per-winner payout txns + ledger groups + commission/levies + `settledAt` stamp; gated on objection window; objection row FREEZES settlement | ✅ |
| Up & Down round | round row + PredictionMarket row per round; observation write-once per (asset,boundary); settle immediate; healer refunds any stuck stake (E-24) | ✅ (volume → F-10) |
| Bonus | BonusGrant lifecycle + `bonusBalance` invariant (trial-balanced); expiry swept per-minute | ✅ |

**Admin & reporting**
| Flow | Data touched | Verdict |
|---|---|---|
| /admin/transactions | SQL-paginated + audited CSV export (msisdn gated) | ✅ |
| /admin/audit | in-memory ring (last 10k) — at launch volume that window is ~1 day | F-10 note |
| /admin/insights · /admin/reports | **whole-table in-memory aggregation** (users + all txns + all markets/positions) | F-07 |
| /admin/players (+cohorts, retention, self-exclusions) | `db.user.list()` full scans (drag avatar blobs) | F-07/F-11c |
| by-game money split | orphaned positionId → silently bucketed MARKET | **F-03** |
| AML EDD queue | flags computed live (`detectSuspiciousBets()`) — honest, nothing pretends `AntiFraudFlag` is populated | ✅ |
| Backups | DMMF-derived table set, abort-on-unknown; local `BACKUP_DIR`, encrypted **only if passphrase set** | F-02 note |

**Public / polling**
| Flow | Data touched | Verdict |
|---|---|---|
| /markets board | indexed board query + `getCardCharts` batch; but resolved rail loads the whole RESOLVED partition | F-08 |
| `/api/fairness/recent` | 2s per watching client; loads ALL RESOLVED + ALL VOIDED MARKET rows, JS-sort, slice 50 | **F-08** |
| `/api/positions/settled` | own user, capped 200 | ✅ |
| /wallet | `db.txn.findByUser(userId, 1000)` per render | F-11e |
| SSE `/api/events` | session-scoped fan-out, Redis-optional | ✅ |

---

## 4. Findings — ranked work orders

### 🔴 P0 — before go-live

**F-01 · No data-retention engine, and player copy promises one.**
- *Facts:* `privacy.ts:88-96` blocks DSAR-erasure honestly ("routine isn't wired — escalate"). But `buildDsarBundle` (`privacy.ts:160-164`) tells the player: *"Erasure: available 7 years after account closure (POCA Cap 423 §16)."* No anonymization routine exists; no per-class retention schedule exists anywhere in `docs/`; nothing prunes `Notification` (2,448 rows, oldest 2026-05-30), `Otp`, or `Session`. PDPA 2022 §31 + a stated capability that doesn't exist = written promise exceeds capability on a licensed product.
- *Do:* (1) Write `docs/DATA-RETENTION.md`: one table, class → retention → mechanism (money/audit/KYC-decision rows: 7y POCA; notifications: 90d; OTP: 24h post-expiry; snapshots-on-settled: 90d; AIPoll raw payloads: 30d). (2) Implement `anonymizeClosedAccount(userId)` in `privacy.ts`: null `displayName`/`email`/`avatarDataUrl`/`region`/`dob`, tombstone `phoneE164` (`erased:<cuid>` — keep row, FKs live), delete R2 KYC objects + `KycDocument` rows, keep money + audit untouched; wire `fulfillDsarRequest` ERASURE branch to it, gated on `closedAt` + 7y. (3) Add a retention chore to `lifecycle.ts` (daily cadence, leader-leased, same pattern as `maybeReconcileLedger`) pruning per the schedule. (4) Until (2) ships, change the DSAR bundle's erasure sentence to state the request channel, not the capability.
- *Accept:* a unit that closes an account, runs the routine, and proves PII gone + wallet/ledger/audit intact + trial balance still OK; retention chore deletes an aged Notification/Otp fixture and leaves young rows.

**F-02 · 24 identity documents (11 MB) inline in Postgres.**
- *Facts:* pre-R2 `KycDocument.storageKey` rows hold `data:image/...;base64` (measured: 24 rows, 11 MB). Every backup/dump copies national IDs + selfies; dumps are encrypted **only when** `BACKUP_PASSPHRASE` is set (`scripts/db-backup.mts:687`).
- *Do:* one-off migration script (pattern: `scripts/` one-offs): for each `storageKey LIKE 'data:%'` row → upload to R2 via the same seam `writeKycDocument` uses → rewrite `storageKey` to `r2:<key>` → read back through `readKycDocument` and byte-compare before committing each row. Then confirm `BACKUP_PASSPHRASE` is set wherever backups run.
- *Accept:* `SELECT count(*) FROM "KycDocument" WHERE "storageKey" LIKE 'data:%'` → 0; spot-open 3 docs in `/admin/kyc/[id]`; table size drops ~11 MB after vacuum.

**F-03 · `moneyByGame` silently mislabels orphaned money rows as MARKET.**
- *Facts:* `report-money.ts:246`: `plByPosition.get(t.positionId) ?? "MARKET"`. Production holds **374** transactions whose position is gone (pre-launch resets). The per-game GGR split — a regulator-facing number — counts unknown-game money as MARKET with no disclosure. Data inconsistency pre-launch is acceptable (Ali's standing rule); a code path that *hides* one is not. Header claim "bounded by markets" is stale — markets include every UPDOWN round ever (12.5k).
- *Do:* third stated bucket: `unattributable: { rows, stakes, payouts, refunds }` rendered in the report viewer as its own line; never fold into either game. Optionally resolve via the txn's LedgerEntry `marketId` (same `groupId`) before declaring unattributable.
- *Accept:* a test seeding a txn with dangling `positionId` proves it lands in `unattributable` and MARKET/UPDOWN totals are unchanged; run against prod window shows 374 rows disclosed.

**F-04 · Privacy policy declares collection that doesn't happen.**
- *Facts:* `src/app/legal/privacy/page.tsx:43` claims "IP address, **device and browser fingerprint**, session timestamps". No code computes a fingerprint; `Device` has zero writes anywhere in `src/`. Overclaiming fails a PDPA accuracy review too.
- *Do:* Ali decides: (a) correct the policy to actual collection (IP + user-agent on audit/security events, session timestamps) — 1-line edit ×3 locales; or (b) wire device tracking for AML (then F-05 keeps `Device`). Recommend (a) — AML flags are computed live today and launch doesn't need fingerprinting.
- *Accept:* policy sentence matches a grep of what's actually written; decision recorded in `docs/COMPLIANCE-DECISIONS.md` with date.

### 🟠 P1 — next fixing session

**F-05 · Six dead/dormant tables, three dead columns.**
- *Facts:* zero rows AND zero code references: `Device` (+`pushToken`), `MatchIntegrityCheck`, `AntiFraudFlag`, `ProviderHealth`. Zero rows, code exists but prod never uses: `Session` (signed-cookie + `ActiveSession` won), `Otp` (password+TOTP won; 0 `otp.%` audit actions ever). Dead columns: `KycDocument.ocrText`, `.blurScore`. A schema that implies fraud flags persist misleads every future reader (AML computes live).
- *Do:* per table, a dated decision: DROP (expand→contract, **two releases, schema-first then DDL** — the NIDA-column lesson, `schema.prisma:336-345`) or KEEP with a `/// RESERVED:` comment naming the plan and date. `Session`/`Otp`: keep (code paths exist; OTP may activate with SMS), comment them dormant. `Device`+`MatchIntegrityCheck`+`ProviderHealth`+`AntiFraudFlag`+2 columns: drop unless F-04 chooses (b).
- *Accept:* schema has no undocumented dead model; migrations applied via the pre-push ritual (`.claude/skills/railway`).

**F-06 · Full email addresses in Railway logs.**
- *Facts:* `email.ts:247, 255, 294, 576` log raw recipients (`to=${to}`, `→ ${email}`) on every suppress/stub/failure/send. Phones are masked platform-wide; emails aren't. Railway log retention is not ours to control.
- *Do:* add `maskEmail()` (`a***@domain.tz`) beside `maskPhoneForAudit` and use it in all four lines + any future ones (grep `\${to}` / `\${email}` in `email.ts`, `email-verification.ts`).
- *Accept:* grep of `src/lib/server` for interpolated bare `to`/`email` in console lines → 0; send-failure log shows masked form.

**F-07 · Whole-table in-memory aggregation on admin/report/boot paths.**
- *Facts:* the shape that already broke `/leaderboard` (pool exhaustion; fixed by SQL GROUP BY) still lives at: `insights.ts:88-90` (`db.user.list()` + `db.txn.listAll()` + `marketStore.values()`); `reports/catalogue.ts:245, 343, 592, 855, 952`; `report-money.ts:230-231` (`positionStore.values()` + `marketStore.values()`); `analytics.ts:194, 217, 250`; `responsible-gambling.ts:588`; admin pages `players`, `players/cohorts`, `retention`, `self-exclusions`, `system`, `privacy` via `db.user.list()`; and `repairOrphanedPositions()` (`market-service.ts:1886`) loads the ENTIRE Position table **on every boot** to filter `status === "OPEN"` in JS. Bounded today (100 users / 2k txns) — but `marketStore.values()` already returns 12,572 rows and Position grows per round.
- *Do:* (1) boot repair first (it runs every deploy): push down `WHERE status='OPEN'` + market-existence check (`LEFT JOIN … IS NULL` raw query or `pending()`-style DAL method). (2) `moneyByGame`: replace the two `values()` with one grouped SQL join (LedgerEntry already carries `marketId`). (3) insights/catalogue/analytics: windowed SQL aggregates in the DAL, following `leaderboard()` / `settledTotalsByUser()`. (4) admin user lists: paged query + `select` without `avatarDataUrl`/`passwordHash`.
- *Accept:* `s13-scale-ceilings.mts` extended with a 100k-position / 50k-market fixture: boot repair + insights + one report render each stay <500ms and don't exhaust the pool.

**F-08 · Unbounded-growth query on the 2-second public polling path.**
- *Facts:* `api/fairness/recent/route.ts:46-48` (NotifyPoller heartbeat, 2s cadence per watching client, `notify-poller.tsx:129`) runs `listMarkets({status:"RESOLVED"})` + `({status:"VOIDED"})` — the entire resolved partition, no `take`, JS-sorted by `settledAt`, sliced to 50. `/markets/page.tsx:250` same shape for the resolved rail. 65 rows today; grows with every resolved poll forever, × every open tab.
- *Do:* (1) add `@@index([productLine, status, settledAt])` (or extend `listBoard` with `orderBy: settledAt desc` + `take`), new DAL method `listRecentlySettled(take)`. (2) 2s in-process memo in the route (module-level `{at, body}`) so N clients cost one query per 2s per container. (3) point `/markets` resolved rail at the same method.
- *Accept:* route handler shows one DB query per 2s window under parallel curl; EXPLAIN uses the new index; NotifyPoller still fires the win celebration (drive one settle through `dev-test/fast-forward-market` locally).

### 🟡 P2 — hygiene batch (after P0/P1)

**F-09 · Write-only data.** `recordSnapshot` fires on the UPDOWN bet path (`market-service.ts:1111, 1332, 1786, 1817`) but round surfaces render price observations, not pool history — verify no consumer reads round snapshots, then skip `productLine === "UPDOWN"` at the call sites. `AIPoll.rawResponse`/`trace`/`generation` (8.4 MB / 620 rows) kept forever — null the payload columns after 30d (keep decision fields), same opportunistic pattern as `ai-usage.ts:95`.

**F-10 · AuditLog growth economics — needs a dated decision, not code.** 141 MB in ~3 months pre-launch; ~90% Up & Down transition entries (~6 rows/round). At ~6 active chains ≈ 10k rows/day ≈ 4–5 GB/yr. The chain is tamper-evident — **pruning breaks it by design** — so the options are: yearly export-to-R2 + chain re-anchor ceremony, or accept growth and budget it. Also decide whether `notification.delivered` (2.3k rows) belongs in the compliance chain at all (it duplicates the Notification table). Note: `/admin/audit` shows the 10k ring ≈ 1 day at launch volume — page needs a DB-paged "older" view when that starts to pinch. Record in `docs/COMPLIANCE-DECISIONS.md`.

**F-11 · Small placements.**
- (a) `PHONE_EMAIL_MAP` env still set in prod (pre-KYC relic; already caused the email-laundering login bug) — **remove at go-live**, it's on no checklist. Add to `docs/LAUNCH-GO-NO-GO.md`.
- (b) SystemConfig junk-drawer: phone numbers inside keys (`bootstrap.login_promoted:+255…`), per-user `chat.daily.usr_*` keys — migrate to hashed/user-id keys next time each module is touched.
- (c) `avatarDataUrl` on the hottest row: `app-shell.tsx:100` drags it every page render; `db.user.list()` drags all avatars into 6 admin pages. Serve via a cacheable `/api/avatar/[userId]` (ETag) or R2, or `select`-exclude on hot reads. Cheap now (1 avatar), expensive at 10k users.
- (d) `docs/DATA-LAYER.md` is stale: claims market history + market config are memory-only; both are durable (`MarketSnapshot`, `SystemConfig`/`config-store.ts`). Fix — it's the file that teaches new sessions how data works.
- (e) `/wallet` pulls 1,000 txns per render (`wallet/page.tsx:78`) — paginate when UPDOWN volume makes heavy players real.

---

## 5. Next-session sequence

| # | Item | Size | Depends on |
|---|---|---|---|
| 1 | F-03 unattributable-money bucket + test | S | — |
| 2 | F-02 inline-KYC → R2 migration + passphrase check | S | — |
| 3 | F-04 privacy-policy correction (needs Ali's a/b call) | S | decision |
| 4 | F-06 email masking | S | — |
| 5 | F-08 fairness/recent pushdown + memo + index | M | — |
| 6 | F-01 retention doc + anonymization + prune chore + DSAR copy | L | decisions in doc |
| 7 | F-07 SQL-ification (boot repair first) | M–L | — |
| 8 | F-05 dead-schema contract migrations (two-release order) | M | F-04 |
| 9 | F-09 / F-10 / F-11 hygiene batch | M | — |

**Migration safety for 2/8:** expand→contract across TWO releases, schema-first,
DDL-second (`20260821090000_kyc_drop_nida_legacy` is the worked example); apply
from the machine before pushing — `prisma migrate deploy` runs before
`next start`, so a failing migration is a platform-wide sign-in outage.

---

*Probes were read-only (`SELECT` only) against the Railway Postgres public URL.
No production data was modified. Numbers are as of 2026-08-20.*
