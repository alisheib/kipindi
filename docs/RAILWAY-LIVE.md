# RAILWAY — the live 50pick platform, as measured

---

## ▶ HOW TO USE THIS FILE IN A NEW SESSION

Paste the prompt below into a fresh Claude Code session, with this file present at
`F:\kipindi-main\docs\RAILWAY-LIVE.md`.

```text
You are working on 50pick — a LIVE, licensed, real-money betting platform in Tanzania,
hosted on Railway at https://50pick.tz. Repo: F:\kipindi-main. Pushing to `main` DEPLOYS
TO PRODUCTION.

Read docs/RAILWAY-LIVE.md first. It is a MEASURED snapshot of the live Railway setup
(2026-09-03, re-derived and corrected 2026-09-04) — services, IDs, deploy config,
database settings, costs, and the traps. Then read docs/LIVE-QA-CAMPAIGN.md §6b topmost
RESUME AT for where the work stands.

Rules for this platform:
1. RE-DERIVE BEFORE YOU QUOTE. Every number here has the command that produced it.
   Numbers rot; §11 lists the stale ones that have already caused wrong conclusions.
2. NEVER trust a code comment or doc about infrastructure state. Measure it live.
3. EVERY NEW GATE NEEDS A CONTROL THAT MUST GO RED. A check that cannot fail is not a
   check — §11 trap 13 is a fresh, expensive example.
4. Real money. Do not change anything on the bet, wallet, settlement or payment path
   without reading the invariants first.
5. Ask before anything that causes downtime. There is ONE environment — production.

Tell me what you find before you change anything.
```

---

> 🟢 **This is a MEASURED SNAPSHOT, not a design document.** Figures were read off the live
> system on **2026-09-03** and re-derived / corrected on **2026-09-04** via the Railway CLI
> (v5.49.1), the Railway GraphQL API (workspace token), the production PostgreSQL database,
> and timed HTTP requests to `50pick.tz`.
>
> ⛔ **Numbers rot.** Before quoting anything here as current, re-derive it with the command
> printed beside it. The 2026-09-03 edition of this very file carried a billing recipe that
> was dead by 2026-09-04 (§11 trap 14).

**Purpose.** Hand a fresh session (or a new engineer) everything needed to operate,
diagnose and change the Railway side of 50pick without discovering it all again.

---

## 1 · Identity and access

| | |
|---|---|
| Railway account | `alisheib07@gmail.com` (Ali Sheib), user id `a9524758-fef7-459e-a8a8-7e6755f45e10` |
| Workspace | **Ali Sheib's Projects** — `bb92e6b1-7d44-46bc-b818-1f091ab0b50a`, type `personal` |
| Plan | **PRO**, state `ACTIVE` |
| Billing period | 20th → 20th |
| Billing customer id | `fdb4b92e-db53-4be5-ba52-8fc235ea0f72` (needed by `usageLimitSet`) |
| Project | **50pick** — `5e87353c-1d59-433d-a683-a32b9149f74c` |
| Environment | **production** — `372d937a-4bf1-43fc-919c-9c75a599067d` (⚠️ the **only** environment) |

### Ways in, as of 2026-09-04

```bash
railway whoami          # CLI v5.49.1 (upgraded 2026-09-04 from 5.24 — `railway postgres pitr` needs ≥5.42)
railway status --json   # full service manifest incl. deploy config
```

🔴 **The CLI user token no longer answers billing queries.** The 2026-09-03 recipe (read
`~/.railway/config.json → user.token`, query `me { workspaces … }`) returns `Not
Authorized` as of 2026-09-04. **A workspace-scoped token is the working path** — Ali mints
one at railway.com/account/tokens, and it answers `workspace(workspaceId: …) { plan
customer { invoices currentUsage usageLimit } }`.

⚠️ **Agent sessions: the Claude Code auto-mode classifier blocks Railway INFRA MUTATIONS**
(measured 2026-09-04: `railway postgres pitr enable`, `railway config apply`, and even
GraphQL curl bodies containing those mutation names). Reads pass. Plan the change, hand
Ali the one command. `mcp__railway__list_variables` is likewise blocked (it would dump 41
secrets); get names only: `railway variables --kv | sed 's/=.*//' | sort`.

---

## 2 · What is deployed

```
Players (Tanzania)
   │   no CDN · no WAF (verified 2026-09-04: no cf-ray; server: railway-hikari)
   ▼
Railway edge (anycast — observed edge for this operator: cdg1, Paris)
   ▼
ORIGIN — region us-west2 (California), ALL THREE SERVICES
   ├── 50pick     baba8802-7f79-4306-9706-1e19a4b95e7c   Next.js 16, RAILPACK, repo alisheib/kipindi
   ├── Postgres   21ab039c-a4ad-45cc-b825-938a57bdd9a8   ghcr.io/railwayapp-templates/postgres-ssl:18
   └── Redis      7fcd442e-53ba-4b85-86cd-08328251b5d2   redis:8.2.1
```

### Deploy configuration — all three services, measured 2026-09-04

| Setting | Value | Consequence |
|---|---|---|
| `numReplicas` | **1** | any restart is a full outage |
| `healthcheckPath` | **`null`** | Railway never verifies a new deploy before switching |
| `overlapSeconds` / `drainingSeconds` | **`null`** | downtime on every deploy; in-flight requests cut |
| `restartPolicyType` | `ON_FAILURE`, 10 retries | |

✅ **The fix is authored and one command from live.** `/api/health` can now FAIL (503 when
Postgres is unreachable/unmigrated — live on `main` since `795d31c1`, proven RED 8/8 by
`test:health-readiness` and GREEN against production), and branch **`launch-1k-phase2`**
carries `.railway/railway.ts` with `healthcheckPath /api/health · healthcheckTimeout 300 ·
overlapSeconds 60 · drainingSeconds 30`. `railway config plan` verified: 0 add, **1 change
(exactly those four fields)**, 0 destroy. **Deferred with the rest of phase 2 on Ali's
cost-first call (2026-09-04): merge the branch, then `railway config apply`.**
⛔ Do NOT set the gate without the endpoint fix live first — the old always-200 endpoint
makes a gate that cannot fail (trap 5).

### Domains (on the `50pick` service)
`https://50pick.tz` (canonical) · `https://www.50pick.tz` (`NEXT_PUBLIC_APP_URL`) ·
`https://kipindi-production.up.railway.app`

### Current deployment (2026-09-04 ~09:00 UTC)
`011733eb` — LAUNCH-1K D (backup watchdog), deployed 08:45 UTC. Before it: `795d31c1`
(health gate), `38ecc34f` (PV-10 close). ⚠️ Re-derive: `railway deployment list` vs
`git rev-parse origin/main`.

---

## 3 · Plan limits (Pro) — read before believing any "we can't scale" claim

| Limit | Value |
|---|---|
| Container CPU / memory | 24 vCPU / 24 GB default · max 1,000 vCPU / 1 TB |
| Replicas | 42 |
| Volume default / max | 50 GB / 1 TB · 20 volumes per project |
| Volume backups | 10 retained · manual backup capped at 50% of volume size |
| HTTP req/sec per host | 10,000 (burst 25,000) |
| Active TCP connections per host | 10,000 — the real SSE ceiling |
| Log retention | 30 days |

⛔ The 5 GB volumes are a leftover setting, not a plan ceiling. Live resize is
zero-downtime on paid plans; a volume at **100%** forces an OFFLINE resize. Grow early.
🔴 **Resize is DASHBOARD-ONLY** — no GraphQL mutation, and CLI `railway volume update`
renames only (verified against the v5.49 schema, 2026-09-04).

---

## 4 · Storage — schedules are ON as of 2026-09-04

| Volume | Instance id | Used | Size | Backup schedules (set 2026-09-04) |
|---|---|---|---|---|
| `postgres-volume` | `c6dd9035-1af0-44de-a009-699bc9e135e7` | **919 MB** | 5000 MB | **DAILY + WEEKLY + MONTHLY** (kept 6d / 27d / 89d) |
| `redis-volume-5JMf` | `1dda02b4-389d-4ff4-a5b2-e7228bf07f95` | 128 MB | 5000 MB | **DAILY + WEEKLY** |

Plus a manual baseline: **"launch-1k baseline 2026-09-04"**. Incremental copy-on-write,
billed on incremental GB — cents/month at this size. Re-derive:

```bash
# volume instance ids + usage
query { project(id:"5e87…"){ environments { edges { node { volumeInstances { edges { node
        { id sizeMB currentSizeMB mountPath volume { name } } } } } } } } }
# schedules for one volume instance
query { volumeInstanceBackupScheduleList(volumeInstanceId:"c6dd9035-…"){ kind cron retentionSeconds } }
```

Growth: ~14 MB/day, ~89% of it the platform's own market/round automation, not players.
⛔ **`AuditLog` cannot be pruned** — 7-year statutory retention, HMAC-chained
(`docs/DATA-RETENTION.md`). Plan to grow the disk, never to trim it.

---

## 5 · PostgreSQL — the real numbers (measured 2026-09-03; re-derive before quoting)

| Setting | Value |
|---|---|
| Version | 18.6 |
| **`max_connections`** | **500** (497 usable) — ⚠️ NOT 100; see §11 |
| `archive_mode` | **off** → no PITR until enabled (§10) |
| Connections in use | ~49 from one app container |
| Database size | 450 MB (`AuditLog` 279 MB of it) |

Prisma pool: **40 per process** (`prisma.ts:29`), `PRISMA_CONNECTION_LIMIT` unset in prod.
Overlap of old+new containers during a gated deploy = 80 ≪ 497. Re-derive:
`node scripts/live/ops/census.cjs` (reads `scripts/live/ops/.env`, NOT `railway run` — §11).

---

## 6 · Redis — armed, cross-container; three source comments still say otherwise

Live `/api/health` → `redis`: `configured/enabled/connected/subscribed: true`,
`state: "cross-container"`. The stale comments (`redis.ts:25`, `rate-limit.ts:191`,
`event-bus.ts:24`, `POLISH-BACKLOG.md:211`) predate the 2026-08-21 arming. Deliberately
never on the bet/admission path; fail-open behind a breaker.

---

## 7 · Environment variables (names only — values are secrets)

**The operationally-loaded ones:** `SMS_PROVIDER=console` 🔴 (no SMS delivery — but see
§11 trap 17: registration does NOT need it) · `DISABLE_ADMIN_TOTP=true` 🔴 (campaign
E-255) · `PAYMENT_AGGREGATOR=selcom` (live gateway) · `KYC_STORAGE=r2` ·
`REDIS_ENABLED=true` · `USE_PRISMA_DAL=true`.

**Notably ABSENT (code defaults apply):** `PRISMA_CONNECTION_LIMIT` (→40) · `SMS_API_KEY`
(→ SMS cannot deliver; adapter written but NEVER exercised, `sms.ts:61-77`) ·
schedulers/healer flags (default ON).

---

## 8 · Cost — measured, and now alarmed

### Invoices (GraphQL `workspace.customer.invoices`; **`total` is CENTS**)
May–Jun $5.00 · Jun–Jul $11.15 · **Jul–Aug $25.42** · current period **$20.08 at day 15**
(2026-09-04).

**✅ A spend alert now exists (set 2026-09-04): soft limit $75/mo, email — NO hard limit
on purpose** (a hard limit would stop production services at the cap). Re-derive:
`workspace.customer.usageLimit`. Mutation: `usageLimitSet(input:{customerId, softLimitDollars})`.

### Where the money goes (unchanged from 2026-09-03 measurement)
- 50pick ≈ 74% of the Railway bill; **RAM is 87% of that** (4.68 GB avg, 8.86 peak, near-idle CPU).
  The cheapest saving is a Node heap cap — parked in phase 2 (Ali: minimal changes first).
- **Anthropic ($50.75/mo) exceeds all Railway hosting ($31.81)** and is 99.98%
  system-driven (market generation + settlement), NOT per-player. Only `chat` scales with users.
- All-in ≈ **$84/mo** today. Unmeasured: Twelve Data (billed outside Railway).

---

## 9 · Performance baseline

Server p50 **31 ms** / p95 136 ms · 0×5xx in 500 requests · TTFB from this operator's
machine **~330–490 ms, flat across routes** (re-confirmed 2026-09-04) — the signature of
distance (origin us-west2), not slow code. The Amsterdam move (`europe-west4`) is parked in
phase 2; ⚠️ moving a service WITH a volume migrates the volume and causes downtime — the
app, Postgres and Redis must move together in a maintenance window, maintenance mode ON
(withdrawals stay open by design).

---

## 10 · Backups and recovery — two layers live, third is one command away

**Full detail + verification steps: `docs/BACKUP-RUNBOOK.md` (§ "2026-09-04 — the alert
that ARRIVES").** Summary:

1. **Application nightly** (GitHub Actions): dump → seal → R2 → restore into scratch →
   re-check money invariants. LIVE and healthy.
2. **🟢 NEW — Railway volume backup schedules** (2026-09-04): Postgres DAILY+WEEKLY+MONTHLY,
   Redis DAILY+WEEKLY, plus a manual baseline. Independent mechanism and storage.
3. **🟢 NEW — the backup watchdog** (commit `011733eb`, live): daily, leader-leased,
   officers get bell + email on none/failed/unverified/stale — fires on the ABSENCE of a
   good run, closing the eleven-nights structure (`test:backup-watchdog` 24/24).
4. **⛔ PITR — pending exactly one command from Ali:**
   `railway postgres pitr enable --service Postgres`
   (redeploys Postgres — seconds of DB blip; restore window starts POST-enable; ~$1–3/mo;
   restore is a non-destructive sibling service). RPO collapses ~24 h → minutes.

| Question | Today (2026-09-04) | After PITR + rehearsal |
|---|---|---|
| Data loss window | up to 24–27 h (nightly) + volume dailies | minutes |
| Time to restore | **UNKNOWN — still never measured at production size** | measured, recorded in BACKUP-RUNBOOK |
| Would we be told of backup failure? | **YES — watchdog bell + email** (was: no) | unchanged |
| Written procedure | BACKUP-RUNBOOK.md (drill + four gates); DR runbook still owed | one page, phase 2 |

---

## 11 · Traps — read before changing anything

1. ⛔ **`max_connections` is 500, not 100.** Comments citing 100 are stale (2026-07-24).
2. ⛔ **Redis IS armed.** Three source comments say otherwise; they are stale.
3. ⛔ **The plan is PRO.** A 5000 MB volume looks like a Hobby cap and is not.
4. ⛔ **Invoice `total` from GraphQL is CENTS.** `2542` = $25.42.
5. ✅ **FIXED on main (`795d31c1`): `/api/health` now returns 503 with the DB down**, HEAD
   agrees, and `test:health-readiness` proves RED before GREEN. The RAILWAY gate that
   consumes it is authored on `launch-1k-phase2`, pending apply (§2).
6. ⛔ **Pushing to `main` deploys LIVE** — and until the §2 gate is applied, every deploy
   is a brief outage, docs-only commits included.
7. ⛔ **`railway run` injects `postgres.railway.internal`** — does not resolve off-cluster.
   Ops scripts read `scripts/live/ops/.env`.
8. ⛔ **`start` is `prisma migrate deploy && … && next start`** — Postgres unreachable at
   boot = restart loop.
9. ⛔ **A volume at 100% forces an OFFLINE resize.** Grow early — and growing is
   **dashboard-only** (no API/CLI mutation; verified 2026-09-04).
10. ⚠️ **Anthropic costs more than all Railway hosting.** Railway's dashboard never shows it.
11. ⚠️ **Never clear a stuck payout with SQL** — `/admin/payments` → *Return to player*.
12. ⚠️ `railway volume list` shows sizes but not backup schedules — use the GraphQL query in §4.
13. 🔴 **`railway.json` / `railway.toml` config-as-code is DEPRECATED and a NEW file is
    silently IGNORED.** Proven 2026-09-04: a deploy built from a commit carrying a fresh
    `railway.json` went live with `fileServiceManifest: {}` and every deploy field still
    null — while a 1 Hz availability probe read 329 ok / 0 fail and would happily have been
    quoted as "zero-downtime proven". **Verify the CONFIG took (deployment
    `meta.serviceManifest`), never just that the site stayed up.** The supported home is
    `.railway/railway.ts` + `railway config plan/apply` (needs devDependency `railway`;
    ⚠️ on Windows put `%APPDATA%\npm\node_modules\@railway\cli\bin` — the dir with
    `railway.exe` — on PATH first, or the SDK's CLI-version probe dies on the `.ps1` shim).
14. 🔴 **The CLI user token no longer authorizes billing/`me` queries** (2026-09-04).
    Workspace token only. The 2026-09-03 edition of this file said otherwise.
15. ⚠️ **Enabling PITR redeploys Postgres** (brief DB blip) and the restore window is NOT
    retroactive — it starts at the first post-enable base backup. Enable early, quiet hour.
16. ⚠️ **The auto-mode classifier blocks Railway infra mutations from agent sessions**
    (enable PITR, config apply, serviceInstanceUpdate — reads pass). Don't fight it; hand
    Ali the command.
17. 🔴 **"Nobody can register without SMS" is FALSE.** Registration is phone+password
    (`auth/register/actions.ts:11` → `registerWithPassword`); the OTP path is
    preserved-but-bypassed pending the Selcom SMS contract. SMS is a phone-verification /
    compliance item, not a sign-up blocker. (The 2026-09-03 launch brief had this wrong.)
18. ⚠️ **The settlement cliff is REAL and re-measured (2026-09-04):** 26 queries per winner,
    sequential, inside the 30 s lock transaction → dies at **~576 winners** at same-region
    RTT (the brief's "~660" was right). And the atomicity fix makes an over-cliff market
    **permanently stuck** (full rollback, 5-min retry, zero progress) — the tell is
    "Ready to settle > 0" on `/admin/system`. Baseline + harness:
    `scripts/load/spike-c-settlement-cliff.mts` (disposable-DB-gated); the set-based
    rewrite is phase 2's first code item.

---

## 12 · Command cheat sheet

```bash
# state
railway status --json                       # manifest incl. deploy config
railway volume list --json
railway variables --kv | sed 's/=.*//' | sort

# health & verification
curl -s https://50pick.tz/api/health | jq '.ok, .database'   # 503/ok:false when DB is unreachable
railway deployment list                     # commit actually live vs git rev-parse origin/main

# infrastructure as code (the ONLY supported config-as-code path)
railway config pull | plan | apply          # plan is read-only; apply asks (Ali runs apply)

# PITR (CLI ≥ 5.42)
railway postgres pitr status --service Postgres --json
railway postgres pitr enable --service Postgres              # ← Ali, one command
railway postgres pitr restore --service Postgres --at <RFC3339>   # NEW sibling service

# read-only production probes
node scripts/live/ops/census.cjs            # money position (cross-checks /api/health)
node scripts/live/ops/backup-status.cjs     # exits non-zero when the backup is stale
npm run test:backup-watchdog                # the alert-that-arrives proof, 24/24
```

---

## 13 · Open items on the Railway side (status 2026-09-04)

| | Item | Status |
|---|---|---|
| 1 | `SMS_PROVIDER=console` | 🔴 open — commercial (Selcom contract + TCRA sender id). NOT a registration blocker (trap 17); adapter written, never exercised |
| 2 | `DISABLE_ADMIN_TOTP=true` | 🔴 open — campaign E-255; forced-enrolment flow EXISTS in code (exempt `/admin/2fa/setup`), lockout fear is contradicted by `admin/layout.tsx:110-122`, but the flow has never been driven; prove locally → flip → drive a QA admin through enrolment live |
| 3 | Health endpoint can't fail | ✅ **FIXED on main** (`795d31c1` + `test:health-readiness`) |
| 3b | Railway healthcheck/overlap/draining | 🟡 authored on `launch-1k-phase2` (.railway/railway.ts, plan verified) — merge + `railway config apply` (Ali) |
| 4 | No PITR | ⛔ **one command** (Ali): `railway postgres pitr enable --service Postgres` |
| 4b | No volume backup schedules | ✅ **DONE 2026-09-04** (§4) + baseline backup |
| 5 | No alert on backup failure | ✅ **DONE — watchdog live** (`011733eb`, 24/24) |
| 5b | No Railway spend alert | ✅ **DONE — $75 soft limit, email** |
| 6 | Single replica | 🅿️ deliberate — per-container latches incl. SELF-EXCLUSION (`session-registry.ts:72`) make >1 replica a regulatory hazard; keep 1 |
| 7 | Origin in California | 🅿️ phase 2 (maintenance window; app+PG+Redis together) |
| 8 | Volume 5 GB (~6 mo headroom) | 🅿️ dashboard click when convenient — $0 until used |
| 9 | App RAM 4.68 GB avg = 87% of bill | 🅿️ phase 2 (`NODE_OPTIONS=--max-old-space-size=1536`, observe, then cap) |
| 10 | Settlement cliff ~576 winners | 🔴 phase 2 FIRST CODE ITEM — measured baseline exists (trap 18) |
| 11 | Leaked Postmark token in repo | ✅ removed (`011733eb`); ⛔ **Ali: rotate the token in the Postmark console** — treat it as burned |
| 12 | No DR runbook / measured RTO | 🟡 backup half documented (BACKUP-RUNBOOK §2026-09-04); RTO rehearsal owed after PITR |

**Deferred until a second container exists** (unchanged): maintenance-mode latch
`platform-config.ts:45`, payment kill switches `payment-ops.ts:93`, RBAC cache
`rbac.ts:44`, **session revocation `session-registry.ts:71` (self-exclusion)**, the
un-leadered 15 s payment poll (⚠️ its payout lane's idempotency-under-N is UNARGUED —
resolve before ever scaling out).

---

*Measured 2026-09-03, re-derived and corrected 2026-09-04 (LAUNCH-1K validation session).
Re-derive before quoting.*
