# RAILWAY — the live 50pick platform, as measured

---

## ▶ HOW TO USE THIS FILE IN A NEW SESSION

Paste the prompt below into a fresh Claude Code session, with this file attached or
present at `C:\kipindi-main\docs\RAILWAY-LIVE.md`.

```text
You are working on 50pick — a LIVE, licensed, real-money betting platform in Tanzania,
hosted on Railway at https://50pick.tz. Repo: C:\kipindi-main. Pushing to `main` DEPLOYS
TO PRODUCTION.

Read docs/RAILWAY-LIVE.md first. It is a MEASURED snapshot of the live Railway setup
taken 2026-09-03 — services, IDs, deploy config, database settings, costs, and the traps.
Then read docs/LIVE-QA-CAMPAIGN.md §6b for where the work stands.

Rules for this platform:
1. RE-DERIVE BEFORE YOU QUOTE. Every number in RAILWAY-LIVE.md has the command that
   produced it. Numbers rot; §11 lists the stale ones that have already caused wrong
   conclusions (max_connections, Redis being off, the plan tier).
2. NEVER trust a code comment or doc about infrastructure state. Measure it live —
   the Railway CLI, MCP tools and GraphQL API are all authenticated and working.
3. EVERY NEW GATE NEEDS A CONTROL THAT MUST GO RED. A check that cannot fail is not a
   check. Prove it fails before you claim it works.
4. Real money. Do not change anything on the bet, wallet, settlement or payment path
   without reading the invariants first.
5. Ask before anything that causes downtime. There is ONE environment — production.

Tell me what you find before you change anything.
```

---

> 🟢 **This is a MEASURED SNAPSHOT, not a design document.** Every figure below was read
> off the live system on **2026-09-03** via the Railway CLI, the Railway GraphQL API, the
> Railway MCP tools, the production PostgreSQL database, and timed HTTP requests to
> `50pick.tz`. Nothing here was copied from another document.
>
> ⛔ **Numbers rot.** Before you quote anything in this file as current, re-derive it with
> the command printed beside it. Several figures carried in this repo's *other* documents
> were measured months ago and are now wrong — §11 lists the ones that bit us.

**Purpose.** Hand a fresh session (or a new engineer) everything needed to operate,
diagnose and change the Railway side of 50pick without discovering it all again.

---

## 1 · Identity and access

| | |
|---|---|
| Railway account | `alisheib07@gmail.com` (Ali Sheib), user id `a9524758-fef7-459e-a8a8-7e6755f45e10` |
| Workspace | **Ali Sheib's Projects** — `bb92e6b1-7d44-46bc-b818-1f091ab0b50a`, type `personal` |
| Plan | **PRO**, state `ACTIVE`, not trialing |
| Billing period | 20th → 20th (currently 2026-08-20 → 2026-09-20) |
| Project | **50pick** — `5e87353c-1d59-433d-a683-a32b9149f74c` |
| Environment | **production** — `372d937a-4bf1-43fc-919c-9c75a599067d` (⚠️ the **only** environment; there is no staging) |

### Three ways in, all verified working

```bash
railway whoami          # CLI v4.59.0, already linked to 50pick/production/50pick
railway status --json   # full service manifest incl. deploy config
```

The **Railway MCP tools** are connected and authenticated as the same account.
`list_projects`, `list_services`, `environment_status`, `list_deployments`,
`get_service_config`, `service_metrics`, `get_logs`, `http_*` all work.

⛔ **`mcp__railway__list_variables` is blocked by the Claude Code safety classifier** — it
would dump 41 secrets in plaintext. Get variable **names** without values instead:

```bash
railway variables --kv | sed 's/=.*//' | sort
```

The **GraphQL API** answers everything the CLI hides (billing, plan limits, usage):

```bash
# The CLI's own user token, at ~/.railway/config.json → user.token
curl -s https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query{ me { workspaces { name plan } } }"}'
```

⚠️ `.env.railway.local` in this repo holds an **older project-scoped token that no longer
authorises `project` or `me` queries** — it returns `Not Authorized`. Use the CLI's user
token from `~/.railway/config.json` instead. (A project token returning `Not Authorized`
for `me` is *correct* behaviour and not itself evidence of a dead token — this one is dead
for a different reason: it was rotated.)

---

## 2 · What is deployed

```
Players (Tanzania)
   │   no CDN · no WAF · every response `cache-control: no-store`
   ▼
Railway edge (anycast, `server: railway-hikari`)
   ▼
ORIGIN — region us-west2 (California), ALL THREE SERVICES
   ├── 50pick     baba8802-7f79-4306-9706-1e19a4b95e7c   Next.js 15, RAILPACK, repo alisheib/kipindi
   ├── Postgres   21ab039c-a4ad-45cc-b825-938a57bdd9a8   ghcr.io/railwayapp-templates/postgres-ssl:18
   └── Redis      7fcd442e-53ba-4b85-86cd-08328251b5d2
```

### Deploy configuration — identical on all three, and this is the problem

| Setting | Value | Consequence |
|---|---|---|
| `numReplicas` | **1** | any restart is a full outage |
| `multiRegionConfig` | `{us-west2: 1}` | single region |
| `healthcheckPath` | **`null`** | Railway never verifies a new deploy works before switching to it |
| `healthcheckTimeout` | `null` | (default 300 s if a path is set) |
| `overlapSeconds` | **`null`** | no old/new overlap → downtime on every deploy |
| `drainingSeconds` | **`null`** | in-flight bets are cut mid-request on deploy |
| `restartPolicyType` | `ON_FAILURE`, 10 retries | |
| `limitOverride` | `null` | uses plan defaults (24 vCPU / 24 GB) |
| `cronSchedule` | `null` | no Railway cron on any service |

Re-derive:
```bash
railway status --json   # → environments.edges[0].node.serviceInstances.edges[].node
                        #     .activeDeployments[0].meta.serviceManifest.deploy
```

### Domains (on the `50pick` service)
- `https://50pick.tz` ← canonical
- `https://www.50pick.tz` ← `NEXT_PUBLIC_APP_URL` points here
- `https://kipindi-production.up.railway.app`

### Current deployment
`b00b2b80-0dfb-4593-82f1-6c85c8317b7c` · commit **`78c3876e`** · deployed 2026-09-02 18:47 UTC.

⚠️ **`/api/health` does not report a commit SHA.** To verify what is actually live, compare
the deployment's `meta.commitHash` against `git rev-parse origin/main`:
```bash
railway deployment list   # or the MCP list_deployments — it prints the commit hash
```

---

## 3 · Plan limits (Pro) — read these before believing any "we can't scale" claim

Straight from `subscriptionPlanLimit` on the workspace:

| Limit | Value |
|---|---|
| Container CPU / memory | 24 vCPU / 24 GB default · **max 1,000 vCPU / 1 TB** |
| **Replicas** | **42** |
| Volume default / **max** | 50 GB / **1 TB** · 20 volumes per project |
| Volume backups | 10 retained · manual backup capped at 50% of volume size |
| Projects / services | 100 / 100 per project |
| Custom domains | 20 |
| **HTTP req/sec per host** | **10,000** (burst 25,000) |
| **Active TCP connections per host** | **10,000** ← the real SSE ceiling |
| HTTP response timeout | 900 s |
| Log retention | 30 days |
| Build timeout | 60 min soft / 90 min hard, 10 concurrent |

⛔ **The 5 GB volumes are a leftover setting, not a plan ceiling.** Pro's *default* for a new
volume is 50 GB and the max is 1 TB. Live resize is zero-downtime on all paid plans — but if
a volume ever reaches **100%**, Railway performs an **offline** resize instead, which
restarts the service. Grow it early, never late.

---

## 4 · Storage

```bash
railway volume list --json
```

| Volume | Service | Mount | Used | Size |
|---|---|---|---|---|
| `postgres-volume` (`7441dd97-…`) | Postgres | `/var/lib/postgresql/data` | **897 MB** | 5000 MB |
| `redis-volume-5JMf` (`6e395138-…`) | Redis | `/data` | 126 MB | 5000 MB |

**Measured growth: +100 MB over 7 days ≈ 14.3 MB/day** → about **6 months** of headroom.

```bash
# re-derive growth from Railway metrics (DISK_USAGE_GB, 7 days)
# MCP: service_metrics(service_id=<Postgres>, hours_back=168, measurements=["DISK_USAGE_GB"])
```

**89% of that growth is the platform's own automation, not players.** Audit rows, last 7 days:

| rows | action |
|---|---|
| 8,577 | `market.settled` |
| 8,555 | `market.resolved` |
| 8,482 | `updown.round.opened` |
| 8,262 | `updown.round.resolved` |
| 8,237 | `updown.observation.confirmed` |
| 2,651 | `session.revoked_by_newer_login` |
| 1,527 | all genuinely player-driven events combined |

So **user count barely moves disk growth** — markets and Up&Down rounds do.

⛔ **`AuditLog` cannot be pruned.** `docs/DATA-RETENTION.md:23` — 7-year statutory retention
(ISO 27001 A.12.4, GLI-19 §11), HMAC-chained, so deleting rows breaks a chain a regulator
walks. It is 279 MB of the 450 MB database. **Plan to grow the disk, never to trim it.**

---

## 5 · PostgreSQL — the real numbers

```bash
# Read-only; DATABASE_URL comes from scripts/live/ops/.env, NOT `railway run`
# (Railway injects postgres.railway.internal, which does not resolve off-cluster).
node scripts/live/ops/census.cjs
```

| Setting | Value |
|---|---|
| Version | **18.6** (Debian) |
| **`max_connections`** | **500** ⚠️ **not 100** — see §11 |
| `superuser_reserved_connections` | 3 → **497 usable** |
| `shared_buffers` | 128 MB |
| `effective_cache_size` | 4 GB |
| `work_mem` | 4 MB |
| **`archive_mode`** | **off** → **no PITR, no WAL archiving** |
| `wal_level` | `replica` |
| Connections in use | 49 total (40 idle) from **one** app container |
| Database size | 450 MB |

Largest tables: `AuditLog` 221,122 · `MarketSnapshot` 34,218 · `PredictionMarket` 33,022 ·
`UpDownRound` 32,831 · `UpDownObservation` 27,635 · `LedgerEntry` 7,135 · `Position` **1,166**.

### Replica arithmetic (corrected)
Prisma pool is **40 per process** (`DEFAULT_PRISMA_CONNECTION_LIMIT`, `prisma.ts:29`);
`PRISMA_CONNECTION_LIMIT` is **not set** in production, so the default applies.

| Replicas | Steady | During a rolling deploy | vs 497 usable |
|---|---|---|---|
| 1 | 40 | 80 | fine |
| 2 | 80 | 160 | fine |
| 6 | 240 | 480 | fine, tight |

⛔ The repo's own comment (`prisma.ts:47-52`) says *"if you ever run >2 permanent instances,
drop `PRISMA_CONNECTION_LIMIT`"* — that was measured against **`max_connections = 100` on
2026-07-24** and **no longer applies**. Connections are not what blocks horizontal scaling
here; the per-container config latches in §9 are.

---

## 6 · Redis — armed, and the docs say otherwise

**Live `/api/health` reports:**
```json
"redis": { "configured": true, "enabled": true, "urlPresent": true,
           "connected": true, "clientStatus": "ready", "subscribed": true,
           "breakerOpen": false, "state": "cross-container" }
```

⛔ **`redis.ts:25`, `rate-limit.ts:192` and `event-bus.ts:24` all assert "REDIS_URL unset —
production today". They are STALE.** Redis is on. This matters: cross-container SSE fan-out
and shared (not per-container) rate limits **already work**, so several "we cannot add a
second container" conclusions written earlier no longer hold for that reason.

Redis is armed by **two** variables on purpose — `REDIS_ENABLED=true` **and** `REDIS_URL`.
Setting the URL alone does nothing. It is deliberately **never on the bet or admission
path**, and every access is fail-open behind a circuit breaker (5 consecutive failures →
30 s cooldown), so `connected: false` is a degraded cache, never an outage.

---

## 7 · Environment variables

**52 keys** on the `50pick` service. Names only — get them with
`railway variables --kv | sed 's/=.*//' | sort`.

### The ones whose *values* matter operationally (all non-secret)
| Key | Value | Meaning |
|---|---|---|
| `SMS_PROVIDER` | **`console`** | 🔴 **SMS delivers nothing.** No player can register. |
| `DISABLE_ADMIN_TOTP` | **`true`** | 🔴 admin console is password-only, 9 admin accounts |
| `PAYMENT_AGGREGATOR` | `selcom` | |
| `PAYMENT_API_URL` | `https://apigw.selcommobile.com/v1` | live Selcom, not sandbox |
| `KYC_STORAGE` | `r2` | ID documents in Cloudflare R2 |
| `REDIS_ENABLED` | `true` | |
| `USE_PRISMA_DAL` | `true` | |
| `SELCOM_WIRE_LOG` | `off` | |
| `NODE_ENV` / `SENTRY_ENVIRONMENT` | `production` | |
| `NEXT_PUBLIC_APP_URL` | `https://www.50pick.tz` | |

### Notably ABSENT (so code defaults apply)
`PRISMA_CONNECTION_LIMIT` (→ 40) · `SMS_API_KEY`, `SMS_API_URL`, `SMS_SENDER_ID` (→ SMS
cannot work) · `PAYMENT_DISBURSE_*` (→ payouts fall back to the base Selcom credentials,
`selcom.ts:82`) · `SENTINEL_ENABLED`, `MARKET_SCHEDULER`, `UPDOWN_SCHEDULER`,
`LIFECYCLE_TICKER` (all default **ON** — they are `!== "false"` checks) · `OTP_ENABLED`.

### Present secrets (names only)
`DATABASE_URL` · `REDIS_URL` · `SESSION_SECRET` · `AUDIT_CHAIN_SECRET` · `OTP_PEPPER` ·
`SX_REGISTER_SALT` · `BACKUP_ENCRYPTION_KEY` · `PAYMENT_API_KEY/SECRET`,
`PAYMENT_VENDOR_ID/PIN`, `PAYMENT_WEBHOOK_URL`, `SELCOM_WEBHOOK_SECRET` ·
`POSTMARK_API_KEY`, `POSTMARK_WEBHOOK_SECRET` · `R2_*` (5) · `ANTHROPIC_API_KEY` ·
`TWELVEDATA_API_KEY` · `SENTRY_DSN` · `VAPID_*` (3) · `ADMIN_BOOTSTRAP_PHONES` ·
`PHONE_EMAIL_MAP` · `NEXT_PUBLIC_LICENSE_REF`.

---

## 8 · Cost — measured, not estimated

### Invoices (Railway GraphQL; **`total` is in CENTS**)
| Period | Invoiced |
|---|---|
| May → Jun | $5.00 |
| Jun → Jul | $11.15 |
| **Jul → Aug (last full month)** | **$25.42** |
| Aug 20 → 2026-09-03 (day 14, running) | $17.38 |

### This period by project
Rates: RAM `$0.000231`/GB-min · CPU `$0.000463`/vCPU-min · volume `$0.15`/GB-month ·
egress `$0.05`/GB. **Volume is billed on GB *used*, not provisioned** — so resizing a volume
costs nothing until the space is actually consumed.

| Project | CPU | RAM | Disk | Egress | Total |
|---|---|---|---|---|---|
| **50pick** | $1.50 | **$20.60** | $0.10 | $1.33 | **$23.57** |
| generous-elegance | $0.02 | $3.89 | $0.15 | $0.01 | $4.07 |
| amanat-watan | $0.20 | $2.12 | $0.11 | $0.40 | $2.83 |
| intercontinental-glass | — | $0.92 | $0.09 | — | $1.01 |
| lmc-sagesse | — | $0.33 | — | — | $0.33 |
| **All six** | | | | | **≈ $31.81/mo** |

**50pick is ~74% of the Railway bill and RAM is 87% of 50pick's share.** The container is
near-idle on CPU (3–30%) while holding **4.68 GB average, 8.86 GB peak**. Capping the Node
heap is the cheapest available saving.

### AI — the largest single line, and it is NOT Railway
```sql
select feature, count(*), round(sum("costUsd")::numeric,2)
from "AiUsageEvent" where "createdAt" > now() - interval '30 days' group by 1;
```
| Feature | Calls (30d) | Avg | 30-day cost |
|---|---|---|---|
| `polls` (market generation) | 185 | $0.185 | **$34.15** |
| `sentinel` (auto-settlement) | 72 | $0.230 | **$16.59** |
| `chat` (player help) | 5 | $0.002 | $0.01 |
| **Total** | 262 | | **$50.75** |

⭐ **99.98% of AI spend is system-driven, not per-player.** It is the cost of generating and
settling markets on a clock, and it will **barely move** going from 104 to 1,000 players.
Only `chat` scales with users.

**All-in today ≈ $84/month.** Not yet measured: the Twelve Data price-feed subscription
(billed outside Railway).

### Re-derive costs
```bash
# invoices + plan
query{ me { workspaces { plan customer { currentUsage
        invoices { total periodStart periodEnd status } } } } }
# per-project usage
query($w:String!,$m:[MetricMeasurement!]!){ estimatedUsage(workspaceId:$w,measurements:$m){
        measurement estimatedValue projectId } }
```

---

## 9 · Performance baseline (2026-09-03)

| | |
|---|---|
| Server-side | p50 **31 ms** · p90 53 ms · p95 136 ms · p99 1953 ms |
| Errors | **0× 5xx** in 500 requests (488 2xx, 10 3xx, 2 4xx) |
| App CPU | 0.026–0.295 vCPU (avg 0.093) |
| App memory | avg **4.68 GB**, min 1.79, **peak 8.86 GB** |
| Postgres | CPU avg 0.023 vCPU, memory avg 0.48 GB |

**Measured TTFB from a browser: ~510 ms**, and **flat across every route** (`/`, `/markets`,
`/updown`, `/leaderboard`, `/results`, `/live` all 0.47–0.57 s). A 31 ms server behind a
510 ms wait, identical on every page, is the signature of **distance, not slow code**.

⚠️ Those samples were taken from the operator's machine, **not from a Tanzanian network**,
and while logged **out**. Authenticated board renders (~35–45 DB queries) are not covered by
this measurement. Re-measure from a real handset in Dar es Salaam before drawing conclusions
about what players experience.

Regions available: `us-west2` (current), `us-east4-eqdc4a`, **`europe-west4-drams3a`**
(Amsterdam — closest to East Africa), `asia-southeast1-eqsg3a`.
⛔ Moving a service **with a volume** migrates the volume and **causes downtime**. The app
and Postgres must move together, or every query crosses the Atlantic.

---

## 10 · Backups and recovery

### Two layers, only one of which currently exists

**1. Application-level nightly (LIVE and healthy).** GitHub Action
`.github/workflows/backup-nightly.yml`, `cron: "15 0 * * *"`. Dumps → seals with AES-256-GCM
→ uploads to R2 `50pick-backups` → **restores into a throwaway Postgres 18 and re-checks the
money invariants and audit chain**. Last verified run: **32.89 MB, 360,843 rows, sealed**,
17 h old at time of writing.

```bash
node scripts/live/ops/backup-status.cjs   # read-only; exits non-zero when stale
```

⚠️ GitHub delays scheduled runs: the 00:15 UTC job finished at **04:36 UTC**. Real RPO is
therefore **up to ~27 h**, not 24.

**2. Railway-native volume backups + PITR (NOT YET ENABLED).** Pro allows daily/weekly/
monthly schedules, 10 retained. The GraphQL schema exposes
`volumeInstancePitrRestoreEstimate`, so **point-in-time restore is available natively**.
⛔ The CLI cannot see or set backup schedules (`railway volume` has no `backup` subcommand) —
use the dashboard or GraphQL. Turning this on gives **two unrelated recovery paths** and
collapses RPO from ~24 h to minutes. It is the single largest risk reduction available.

### Where recovery actually stands
| Question | Answer |
|---|---|
| Data loss window (RPO) | **up to 24–27 h** |
| Time to restore (RTO) | **UNKNOWN** — `db:restore` rehearsed **once**, 2026-07-30, against a 13 MB / 32,750-row artifact. Never run against production, never at today's 360k rows. |
| Written procedure | **None.** No DR runbook, no incident plan, no on-call. Open GLI-19 blockers. |
| Would we notice a failure? | Errors yes (Sentry). **Backup failure — no.** |

🔴 **The August lesson.** The nightly failed **eleven consecutive nights** (2026-08-14 → 24).
`/admin/compliance` showed amber for ten of them, exactly as designed. **Nobody looked.** The
fix shipped was a tool an operator must remember to *run*, not an alert that *arrives* — so
the failure mode is structurally unchanged. There is still **no email, SMS, webhook, Slack or
PagerDuty** on backup failure anywhere in the repo.

🔴 **The seal-key lesson.** For a period, every backup was sealed with a key that existed
**only as a GitHub secret** — which cannot be read back by anyone, ever. Every artifact
restored, verified, and recorded `verified: true`, and **not one could have been opened**.
Rotated 2026-07-31; the key now also lives in Railway env and `.env.backup.local`.
⚠️ Railway holds **both** the backup key and the R2 credentials, so one compromised
environment reaches both the backups and the KYC documents inside them.

---

## 11 · Traps — read before changing anything

1. ⛔ **`max_connections` is 500, not 100.** Every doc and code comment says 100 (measured
   2026-07-24). Any "we can only run 2 replicas" conclusion built on it is void.
2. ⛔ **Redis IS armed.** Three source comments say it is not. They are stale.
3. ⛔ **The plan is PRO, not Hobby.** A 5000 MB volume looks exactly like the Hobby cap and
   is *not* — Pro defaults to 50 GB and allows 1 TB.
4. ⛔ **Invoice `total` from GraphQL is in CENTS.** `2542` is $25.42.
5. ⛔ **`/api/health` returns 200 while Postgres is down** (on `main` as of `78c3876e`).
   Pointing a Railway healthcheck at it as-is creates a gate that cannot fail.
   *Fixed on branch `launch-1k-readiness`, not yet on main.*
6. ⛔ **Pushing to `main` deploys to LIVE**, and with no `overlapSeconds` that means a brief
   outage plus killed in-flight bets — **even for a docs-only commit**.
7. ⛔ **`railway run` injects `postgres.railway.internal`**, which does not resolve
   off-cluster. Ops scripts read `DATABASE_URL` from `scripts/live/ops/.env` instead.
8. ⛔ **`start` is `prisma migrate deploy && … && next start`.** If Postgres is unreachable at
   boot, the container never starts → restart loop. Fail-closed in front of otherwise
   fail-open boot checks.
9. ⛔ **A volume at 100% forces an OFFLINE resize** (service restart). Grow early.
10. ⚠️ **Anthropic ($50.75/mo) costs more than all Railway hosting.** Watch it separately;
    Railway's dashboard will never show it.
11. ⚠️ **Never clear a stuck payout with SQL** — use `/admin/payments` → *Return to player*.
12. ⚠️ `railway volume list` shows sizes but **not** backup schedules.

---

## 12 · Command cheat sheet

```bash
# state
railway status                       # linked project/service/env + live URL
railway status --json                # full manifest incl. deploy config
railway volume list --json
railway domain
railway variables --kv | sed 's/=.*//' | sort     # names only, no secrets

# health & verification
curl -s https://50pick.tz/api/health | jq
railway deployment list               # commit hash actually live
git rev-parse origin/main             # compare against it

# logs (30-day retention)
railway logs --deployment
railway logs --build

# read-only production probes (all in scripts/live/ops/)
node scripts/live/ops/census.cjs            # whole money position
node scripts/live/ops/backup-status.cjs     # is there a restorable backup?
node scripts/live/ops/payout-probe.cjs
node scripts/live/ops/deposit-failures.cjs
```

---

## 13 · Open items on the Railway side

| | Item | Severity |
|---|---|---|
| 1 | `SMS_PROVIDER=console` → **nobody can register** | 🔴 blocks launch |
| 2 | `DISABLE_ADMIN_TOTP=true` → admin console password-only | 🔴 |
| 3 | No `healthcheckPath` (and health can't fail — fix is on a branch) | 🔴 |
| 4 | No PITR / Railway volume backup schedule | 🔴 |
| 5 | No push alert on backup failure | 🔴 |
| 6 | No `overlapSeconds` / `drainingSeconds` → every deploy is an outage | 🟠 |
| 7 | Single replica on all three services | 🟠 |
| 8 | Origin in California, players in Tanzania | 🟠 |
| 9 | Volume 5 GB (~6 months headroom); raise to 50 GB, costs nothing | 🟡 |
| 10 | App memory 4.68 GB avg = 87% of the bill; cap the heap | 🟡 |
| 11 | No WAF / DDoS layer in front of a licensed gambling site | 🟡 |

**Deferred until a second container exists** (all per-container config latches that would
apply to only one replica): maintenance mode `platform-config.ts:45`, payment kill switches
`payment-ops.ts:93`, RBAC revocation `rbac.ts:44`, **session revocation
`session-registry.ts:71` — which affects self-exclusion**, the unleadered 15 s payment poll
`lifecycle.ts:462`, and leader-lease renewal during an overrun `lifecycle.ts:320-373`.

---

*Measured 2026-09-03 against production commit `78c3876e`. Re-derive before quoting.*
