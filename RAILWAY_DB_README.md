# Railway Postgres — Setup README

> Complete guide. Written for a non-technical operator with terminal access.
> Plain-English steps + every command + every env var + every common error.
> ~30–45 minutes from "no database" to "Railway running on Postgres."

---

## Table of contents

1. [Why](#1-why-do-this)
2. [What you need before starting](#2-what-you-need-before-starting)
3. [Phase 1 — Provision Postgres on Railway (10 min)](#3-phase-1--provision-postgres-on-railway-10-min)
4. [Phase 2 — Wire it to the Next.js service (5 min)](#4-phase-2--wire-it-to-the-nextjs-service-5-min)
5. [Phase 3 — Run the schema migration (10 min)](#5-phase-3--run-the-schema-migration-10-min)
6. [Phase 4 — Switch the in-memory store to Prisma (60–90 min, code)](#6-phase-4--switch-the-in-memory-store-to-prisma-60-90-min-code)
7. [Phase 5 — Auto-migrate on every deploy (5 min)](#7-phase-5--auto-migrate-on-every-deploy-5-min)
8. [Phase 6 — Backups, restore, monitoring](#8-phase-6--backups-restore-monitoring)
9. [Cost estimate](#9-cost-estimate)
10. [Troubleshooting](#10-troubleshooting)
11. [Rollback](#11-rollback-if-something-goes-wrong)

---

## 1. Why do this

Right now the app stores everything in **RAM** on the Railway container,
with a backup written to disk every 1.5 seconds. This is fine for a few
dozen players. It will not survive:

- A crash or redeploy without losing 1.5s of in-flight bets / cashouts
- Memory growth as the audit log accumulates (RAM keeps growing forever)
- More than one Railway container (each would have its own state)
- The 6 million clicks / month target you mentioned — disk-snapshot
  serialisation will start blocking the request loop

The Prisma schema (`prisma/schema.prisma`) is already shaped for
PostgreSQL — 19 tables (User, Wallet, Bet, Market, Transaction, KYC,
Audit, …). The swap is mostly mechanical.

**Do this before you take real money.**

---

## 2. What you need before starting

| | |
|---|---|
| Railway account | the same account that hosts `kipindi-production` |
| Local terminal | PowerShell or Git Bash on Windows; works fine |
| Node.js 20+ | already installed for `npm run dev` |
| Docker Desktop (optional) | to run a throwaway local Postgres for testing |
| ~$5/month budget | Railway Postgres add-on baseline |
| 30–45 minutes uninterrupted | so you can test before exposing the change |

**Important:** do not start this 30 minutes before a demo. Schedule a
quiet window. The first migration will lock for a few seconds and any
running session will be reset.

---

## 3. Phase 1 — Provision Postgres on Railway (10 min)

### 3.1 Open the Railway dashboard

1. Go to [railway.app](https://railway.app) and sign in.
2. Open the project that already runs `kipindi-production`. You should
   see one tile: the Next.js service.

### 3.2 Add the Postgres service

1. Top-right of the project canvas, click **+ New**.
2. Pick **Database**, then **Add PostgreSQL**.
3. Railway will provision a Postgres tile next to your Next.js tile.
   Wait ~60 seconds for the tile to turn from yellow to green.

### 3.3 Grab the connection string

1. Click the new **Postgres** tile.
2. Open the **Variables** tab (left sidebar inside the service).
3. You will see Railway-managed variables including
   `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`,
   `PGDATABASE`. Click the eye icon next to `DATABASE_URL` to reveal
   the value, then copy it. It looks like:
   ```
   postgresql://postgres:dEEpRand0m@containers-us-west-1.railway.app:6543/railway
   ```
4. Keep this tab open — you'll paste it into the Next.js service next.

> **Tip — Railway variable references.** Instead of copying the
> literal value, in the Next.js service you can write
> `${{Postgres.DATABASE_URL}}`. If Railway ever rotates the password
> the reference auto-updates. Recommended.

---

## 4. Phase 2 — Wire it to the Next.js service (5 min)

### 4.1 Add the env var

1. Click the **kipindi** Next.js service tile.
2. Open the **Variables** tab.
3. Click **+ New Variable**:
   - **Name:** `DATABASE_URL`
   - **Value:** `${{Postgres.DATABASE_URL}}` (preferred — see tip above)
     OR paste the literal `postgresql://...` from Phase 1.
4. Click **Add**.
5. Railway redeploys automatically. Wait for the deploy to go green
   (~2 minutes). The app currently doesn't read `DATABASE_URL`, so this
   redeploy is a no-op — the database is connected but not used yet.

### 4.2 (Optional) Confirm the connection

In Railway, click the Postgres tile → **Data** tab. You should see an
empty database called `railway`. If you see the table list (which is
empty), the connection is healthy.

---

## 5. Phase 3 — Run the schema migration (10 min)

This creates the 19 tables in your Railway Postgres.

### 5.1 Local Postgres for safety (recommended)

Run a throwaway local Postgres so you can rehearse the migration before
touching production. With Docker Desktop running:

```powershell
docker run -d --name kipindi-pg `
  -p 5432:5432 `
  -e POSTGRES_PASSWORD=local `
  -e POSTGRES_DB=kipindi `
  postgres:16
```

(In Git Bash use `\` instead of `` ` `` for line continuation.)

Local connection string:
```
postgresql://postgres:local@localhost:5432/kipindi
```

### 5.2 Add `DATABASE_URL` to `.env.local`

In `C:\kipindi`, create or edit `.env.local`:

```
DATABASE_URL=postgresql://postgres:local@localhost:5432/kipindi
```

> `.env.local` is git-ignored. Do not commit your Railway database
> URL anywhere — anyone with it can read every player's data.

### 5.3 Generate the Prisma client + run the first migration

From the project root:

```powershell
npm run db:generate
npm run db:migrate -- --name init
```

What happens:

- `db:generate` compiles the Prisma client from `prisma/schema.prisma`
  into `node_modules/@prisma/client`. Always idempotent.
- `db:migrate -- --name init` creates `prisma/migrations/<timestamp>_init/`
  with raw SQL, then applies it to the database in `DATABASE_URL`.

You should see something like:
```
✔ Generated Prisma Client (v7.x.x) to ./node_modules/@prisma/client in 1.2s
Applying migration `20260509_init`
The following migration(s) have been created and applied:

migrations/
  └─ 20260509_init/
    └─ migration.sql

Your database is now in sync with your schema.
```

### 5.4 Verify tables exist

```powershell
npm run db:studio
```

Prisma Studio opens at `http://localhost:5555`. You should see all 19
tables in the left sidebar (User, Wallet, Bet, Market, Transaction,
KycSubmission, Notification, AuditLog, Session, OTP, Device, Sport,
League, Team, MatchEvent, Window, Pool, BetBundle, AntiFraudFlag,
MatchIntegrityCheck, ResponsibleGambling, AffiliateAgent,
ProviderHealth). All empty. Close the browser when done.

### 5.5 Apply the same migration to Railway production

1. Open your **Railway** Postgres tile → **Variables** → copy
   `DATABASE_URL`.
2. Edit `.env.local`, **temporarily** replace the local URL with the
   Railway URL.
3. Run:
   ```powershell
   npm run db:migrate -- --name init
   ```
   Prisma sees the migration already exists and applies it to the
   Railway database. You'll see:
   ```
   1 migration found in prisma/migrations
   The following migration(s) have been applied:
   migrations/
     └─ 20260509_init/
   ```
4. **Switch `.env.local` back to your local URL.** Don't leave the
   production URL in your dev environment.

---

## 6. Phase 4 — Switch the in-memory store to Prisma (60-90 min, code)

This is the only step that needs code edits. The in-memory `db` object
in [`src/lib/server/store.ts`](src/lib/server/store.ts) exposes
`user`, `kyc`, `otp`, `wallet`, `txn`, `notification`, `audit`,
`market`, `position`, `marketHistory`. Each method is one line — replace
with the Prisma equivalent.

### 6.1 Create the Prisma client singleton

`src/lib/server/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
```

### 6.2 Replace one entity at a time

Inside `store.ts`, swap each `db.<entity>.<op>` for the Prisma call.
Keep the `StoredUser` / `StoredKyc` *types* — they document intent
even though Prisma will infer them.

Pattern for `user`:
```ts
import { prisma } from "./prisma";

export const db = {
  user: {
    findById: (id: string) => prisma.user.findUnique({ where: { id } }),
    findByPhone: (phone: string) =>
      prisma.user.findUnique({ where: { phoneE164: phone } }),
    create: (u: StoredUser) => prisma.user.create({ data: u }),
    update: (id: string, patch: Partial<StoredUser>) =>
      prisma.user.update({
        where: { id },
        data: { ...patch, updatedAt: new Date() },
      }),
    list: () => prisma.user.findMany(),
  },
  // … kyc, otp, wallet, txn, notification, audit, market, position, history
};
```

### 6.3 Watch for these gotchas

1. **All call sites already use `await`** because the consuming code is
   `async`. Audit one call site per entity to confirm.
2. **Date fields**: in-memory stores ISO strings; Prisma stores
   `DateTime` objects. The Prisma client returns `Date` objects on read.
   Either accept the change end-to-end, or use a small helper to
   `.toISOString()` on read.
3. **Default values**: `createdAt` / `updatedAt` are passed in by the
   in-memory store. In Prisma, mark them `@default(now())` and
   `@updatedAt` in `schema.prisma` — then drop them from the `data` object.
4. **Ordering**: in-memory `Map.values()` preserves insertion order.
   Prisma queries don't unless you `orderBy`. Add explicit `orderBy: { createdAt: "desc" }`
   wherever order matters (audit log, transactions, notifications).
5. **Snapshots become irrelevant.** Once everything is on Prisma, delete
   the file `src/lib/server/backup.ts` and the snapshot interval in
   `store.ts`.

### 6.4 Smoke-test locally

Make sure your `.env.local` points at the **local** Postgres, then:

```powershell
npm run dev
node scripts/sprint35-full-e2e.mjs   # should still pass 15/15
node scripts/break-it-player.mjs     # should still pass 22/23
node scripts/break-it-admin.mjs      # should still pass 10/10
```

Failures mean the Prisma swap dropped behaviour the in-memory store had.
Most common: missing `orderBy`, or a date-shape mismatch. Fix and re-run.

### 6.5 Push to Railway

```powershell
git add prisma/migrations src/lib/server/prisma.ts src/lib/server/store.ts
git commit -m "Sprint NN: persistence on Postgres via Prisma"
git push
```

Railway will redeploy. Open **Logs** for the Next.js service and watch
the first 30 seconds — Prisma will connect, then start serving. After
that, every register / bet / cashout writes to Postgres.

---

## 7. Phase 5 — Auto-migrate on every deploy (5 min)

So you never have to manually run migrations again, edit
`package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma migrate deploy && next build"
  }
}
```

Now every Railway redeploy:

1. Installs deps → triggers `prisma generate` (so the Prisma client
   matches the latest schema)
2. Runs `prisma migrate deploy` (applies any pending migrations from
   `prisma/migrations/` that haven't been applied to the production DB)
3. Builds Next.js

You then author new migrations locally with
`npm run db:migrate -- --name <name>` and push them. Railway picks them
up on the next deploy.

> **Critical:** never run `prisma migrate dev` against production — it
> can wipe data. `migrate deploy` is the production-safe variant and
> only applies migrations forward, never resets.

---

## 8. Phase 6 — Backups, restore, monitoring

### 8.1 Automatic backups

Railway Postgres has automatic daily backups starting on the Hobby
tier. To verify:

1. Postgres tile → **Backups** tab.
2. Confirm **Daily** schedule is shown and at least one successful
   backup is listed.
3. Note the retention window:
   - **Hobby:** 7 days
   - **Pro:** 30 days
   - For regulator audit (Tanzania Gaming Board commonly asks 5 years)
     you'll need an external archive — see 8.3.

### 8.2 Manual backup before risky changes

Before any schema migration on production, create a one-off backup:

1. Postgres tile → **Backups** → **Create Backup**.
2. Wait for the green tick.
3. Then run your migration.

If anything goes wrong → **Restore** from that backup (next section).

### 8.3 External long-term archive (regulator-grade)

Railway's 7-day window is not enough for the GBT 5-year audit
requirement. Set up a weekly export to S3-compatible storage:

```bash
# Sample cron in any external runner (GitHub Actions, cron-job.org, etc.)
pg_dump "$RAILWAY_DATABASE_URL" \
  | gzip \
  | aws s3 cp - "s3://kipindi-audit-archive/db-$(date +%Y%m%d).sql.gz"
```

S3 Glacier Deep Archive at ~$1/TB/month is the right tier — cold
storage, occasional reads.

### 8.4 Restore from backup

1. Postgres tile → **Backups** → click the backup row → **Restore**.
2. Railway shows a confirmation modal — read it carefully, then
   confirm. Restore is to the **same** Postgres service, replacing
   current state.
3. After restore (~2-5 min), verify by opening Prisma Studio against
   the Railway URL.

### 8.5 Monitoring

Postgres tile shows live charts:
- **CPU usage** — keep under 70% sustained
- **Memory usage** — keep under 80%
- **Disk usage** — Railway charges per GB; bump the plan when you hit
  80% of allocated storage
- **Connections** — should stay well under the connection limit
  (Hobby = 100, Pro = 250). If you see connections spike near the cap,
  add a connection pooler — see 10.5.

---

## 9. Cost estimate

(Approximate, Railway pricing as of May 2026 — verify on the day.)

| Tier | Postgres | App | RAM/CPU | Storage | Backups | Notes |
|---|---|---|---|---|---|---|
| Hobby ($5/mo + usage) | included | included | 8GB / shared CPU per service | 5GB free, then $0.25/GB | 7-day daily | Soft launch, internal beta |
| Pro ($20/mo + usage) | included | included | up to 32GB / 8 vCPU | 100GB included | 30-day daily | Recommended once real money flows |

**Estimated bill at 6M clicks/month after Phase 4 swap:**
- App service: ~$12-18/mo (Pro tier RAM/CPU)
- Postgres: ~$8-15/mo (~10GB used after audit log accumulates)
- Backups storage (Railway-hosted): negligible
- External S3 archive: ~$1/mo

Total: **~$25-35/mo** for the Pro tier. Cheap relative to revenue
ceiling at that scale.

---

## 10. Troubleshooting

### 10.1 `npm run db:migrate` says "Can't reach database server"

- Wrong `DATABASE_URL` — re-copy from Railway, watch out for trailing
  spaces or quote characters.
- Local Docker Postgres not running — `docker ps` should show
  `kipindi-pg`. If it died, `docker start kipindi-pg`.
- Firewall blocking outbound 6543 (Railway's pgbouncer port). Try a
  hotspot or different network.

### 10.2 `prisma migrate deploy` fails on Railway with "drift detected"

Means the database schema doesn't match `prisma/migrations/`. Causes:

- Someone hand-edited the database via `psql` or Prisma Studio.
- A migration was applied locally but never committed.
- Two parallel migrations were merged out of order.

Fix:
```bash
# In a quiet window, with a backup taken:
npx prisma migrate resolve --applied <migration_name>
# OR if the DB is acceptable as-is, snapshot it:
npx prisma db pull
# then squash and recreate the migration history.
```

### 10.3 App boots but every request returns 500 with "PrismaClientInitializationError"

- `DATABASE_URL` env var not set on Railway, or set on the wrong
  service. Re-check 4.1.
- Schema in the database is older than what the Prisma client expects.
  Run `npm run db:migrate` against Railway again.

### 10.4 "Too many connections" in production logs

The default Prisma client opens one connection per process. With
multiple containers or hot-reload, you can run out:

1. Add a Postgres connection pooler — Railway has one built in. Use
   the **pooled** `DATABASE_URL` Railway exposes (port `6543` instead
   of `5432`), which is `pgbouncer`-pooled.
2. In `prisma/schema.prisma`, set:
   ```prisma
   datasource db {
     provider          = "postgresql"
     url               = env("DATABASE_URL")        // pooled, port 6543
     directUrl         = env("DIRECT_DATABASE_URL") // direct, port 5432, for migrations
   }
   ```
3. Add a second Railway env var `DIRECT_DATABASE_URL` pointing at
   `5432` (Railway's Postgres tile shows both).

### 10.5 Migration takes too long / locks production

Prisma applies migrations as a single transaction. For tables with
millions of rows this can lock writes for minutes.

Mitigations (advanced):
- For column adds: SQL is fast, no concern.
- For column drops or renames: write a multi-step migration —
  add new column → backfill → switch reads → drop old column —
  across multiple deploys.
- For indexes on large tables: add `CONCURRENTLY` manually in the
  migration SQL after Prisma generates it.

For Kipindi's expected scale (millions of rows, not billions), default
Prisma migrations are fine. Revisit when the audit log crosses 10M rows.

### 10.6 Local OOM during `npm run dev`

The in-memory store eats RAM as the audit log grows in dev. After
Phase 4 swap, this disappears — Postgres handles it. In the meantime,
restart `npm run dev` once a day during heavy testing.

---

## 11. Rollback if something goes wrong

If after deploy the app is broken:

### Fast option — revert the commit

```powershell
git revert HEAD          # creates a "Revert Sprint NN" commit
git push                 # Railway redeploys with the revert
```

The DB is now empty / migrated forward, but the app is back on the
in-memory store. Players who registered or bet during the broken
window: nothing was lost (audit log, snapshot to disk).

### Full rollback option — restore DB and redeploy

1. Postgres tile → **Backups** → **Restore** the most recent
   pre-migration backup (Phase 8.4).
2. Revert the code commit (above).

### Lessons learned for next time

After any production schema change, watch the app logs for 10 minutes:

```bash
railway logs --service kipindi
```

Look for `PrismaClientInitializationError`, `connect ETIMEDOUT`,
`relation "X" does not exist`. First sign of trouble → roll back
immediately, then debug locally.

---

## When this is done

Update [`README.md`](README.md) and [`CLAUDE.md`](CLAUDE.md) to note that
the in-memory store is gone. Delete `.50pick-backups/` and
`.kipindi-backups/` from the repo (already gitignored). Drop the
snapshot machinery in `src/lib/server/backup.ts`. Update
`MEMORY.md` so future Claude sessions know.

That's the full path from "fragile in-memory" to "production-grade
Postgres on Railway." Take it in two sittings if you want — Phases 1-3
in one (just provision + migrate), Phases 4-5 in another (the code
swap).
