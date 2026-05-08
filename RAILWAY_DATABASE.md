# Add a Postgres database on Railway

> Step-by-step. Aimed at a non-technical operator with terminal access.
> ~30 minutes from "no database" to "Railway running on Postgres."

## Why now

The current persistence is an in-memory `Map` in
[`src/lib/server/store.ts`](src/lib/server/store.ts), snapshotted to disk
every 1.5 s. It works for hundreds of concurrent users. It will not
work for 6M clicks/month, will lose 1.5 s of in-flight transactions on
every redeploy/crash, and cannot scale horizontally. The Prisma schema
([`prisma/schema.prisma`](prisma/schema.prisma)) is already shaped for
Postgres — the swap is straightforward.

---

## Phase 1 · Provision the database (10 min)

1. Sign in to [railway.app](https://railway.app) and open your
   `kipindi` project (the one that already runs the Next.js service).
2. Click **+ New** in the project canvas → **Database** → **Add PostgreSQL**.
3. Wait for the Postgres service tile to go green (~1 min).
4. Click the Postgres tile → **Variables** tab → copy the value of
   `DATABASE_URL`. It looks like
   `postgresql://postgres:xxxx@containers-us-west-1.railway.app:6543/railway`.
5. Click your **Next.js service** tile → **Variables** → **+ New Variable**:
   - Name: `DATABASE_URL`
   - Value: paste from step 4
   - Click **Add**.
6. The service will **redeploy automatically** with the new env var.
   That's expected — the app currently ignores `DATABASE_URL`, so this
   redeploy is a no-op until Phase 3.

**Tip:** Railway also exposes Postgres as `${{Postgres.DATABASE_URL}}` —
when you reference it that way the connection string updates if Railway
rotates credentials. Use the variable-reference syntax in Railway's
Variables UI for `DATABASE_URL` in the Next.js service.

---

## Phase 2 · Run migrations (5 min, on your laptop)

1. Add `DATABASE_URL` to your local `.env` (so you can run the migrate
   command). For convenience use a **separate** local Postgres or a
   second Railway database; running migrations against production
   from your laptop the first time is fine but be aware it makes
   schema changes immediately.

   Quick local Postgres (Windows, with Docker Desktop):
   ```
   docker run -d --name kipindi-pg -p 5432:5432 \
     -e POSTGRES_PASSWORD=local -e POSTGRES_DB=kipindi \
     postgres:16
   ```
   Then `DATABASE_URL=postgresql://postgres:local@localhost:5432/kipindi`.

2. From `C:\kipindi`:
   ```
   npm run db:generate          # generates the Prisma Client types
   npm run db:migrate -- --name init
   ```
   You should see Prisma create one migration in
   `prisma/migrations/init/` and apply it. The 19 tables (User, Wallet,
   Bet, Market, Transaction, KycSubmission, Notification, AuditLog, …)
   will exist in the target database.

3. Verify: `npm run db:studio` opens Prisma Studio in your browser —
   you should see all 19 tables, empty.

4. **For Railway production:** the same migrations need to run against
   the Railway Postgres. Easiest path:
   - Set `DATABASE_URL` in your local `.env` to the **Railway**
     `DATABASE_URL` (from Phase 1 step 4).
   - Run `npm run db:migrate -- --name init` again (Prisma is idempotent
     — if init already exists it'll skip).
   - Switch your local `.env` back to your dev DB.

---

## Phase 3 · Switch the store to Prisma (60–90 min, code change)

This is the only step that needs code. The in-memory `db` object in
[`src/lib/server/store.ts`](src/lib/server/store.ts) exposes
`user`, `kyc`, `otp`, `wallet`, `txn`, `notification`, `audit`, etc. —
each method is one line. Replace each with the Prisma equivalent.

### 3a · Add a Prisma client singleton

Create `src/lib/server/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

declare global { var __prisma: PrismaClient | undefined; }
export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ log: ["error", "warn"] });
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
```

### 3b · Replace one slice at a time

Inside `store.ts`, swap each `db.<entity>.<op>` for the Prisma call.
Example for users:

```ts
import { prisma } from "./prisma";

export const db = {
  user: {
    findById: (id: string) => prisma.user.findUnique({ where: { id } }),
    findByPhone: (phone: string) => prisma.user.findUnique({ where: { phoneE164: phone } }),
    create: (u: StoredUser) => prisma.user.create({ data: u }),
    update: (id: string, patch: Partial<StoredUser>) =>
      prisma.user.update({ where: { id }, data: { ...patch, updatedAt: new Date() } }),
    list: () => prisma.user.findMany(),
  },
  // … same pattern for kyc, otp, wallet, txn, notification, audit …
};
```

Two things to watch:

- **All call sites already `await`** the methods (the in-memory ones
  return synchronously but the consuming code is in `async` functions).
  Audit one call site per entity to confirm.
- **Backups become Postgres-native.** Delete the snapshot machinery in
  `src/lib/server/backup.ts` once Prisma is the source of truth.

### 3c · Delete the in-memory bits

Remove `store.users`, `store.usersByPhone`, etc., once every method is
on Prisma. Keep the `StoredUser` / `StoredKyc` *types* — Prisma will
infer them, but the explicit types document intent.

### 3d · Smoke test locally

```
npm run dev
node scripts/sprint35-full-e2e.mjs     # should still pass 15/15
node scripts/break-it-player.mjs       # should still pass 22/23
node scripts/break-it-admin.mjs        # should still pass 10/10
```

If any test fails, the Prisma swap dropped a behaviour the in-memory
store had. The most likely places: ordering (`store.users.values()`
preserves insertion order, Prisma queries don't unless you `orderBy`),
default values (Prisma fills `createdAt` itself, the in-memory store
expected the caller to pass it).

### 3e · Push and watch Railway

```
git add prisma/ src/lib/server/prisma.ts src/lib/server/store.ts
git commit -m "Sprint NN: persistence on Postgres via Prisma"
git push
```

Railway will redeploy. Watch the **Logs** tab for the first 30 s after
deploy — Prisma will connect, run any pending migrations (if you set
`postinstall` to `prisma migrate deploy`), and start serving. After
that, every register/bet/cashout writes to Postgres.

---

## Phase 4 · Make migrations automatic on deploy (optional, 5 min)

Add to `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma migrate deploy && next build"
  }
}
```

Now every Railway redeploy:
1. Installs deps → triggers `prisma generate`.
2. Runs `prisma migrate deploy` (applies any new migrations from `prisma/migrations/` that haven't been applied yet).
3. Builds Next.js.

You can author new migrations locally with `npm run db:migrate -- --name <name>` and push them; Railway picks them up on the next deploy. Don't run `db:migrate dev` against production — `migrate deploy` is the production-safe variant.

---

## Phase 5 · Backups (5 min)

Railway Postgres has automatic daily backups on the Hobby+ tier. Verify:

1. Postgres tile → **Backups** tab.
2. Confirm the schedule shows "Daily" and a recent successful backup
   exists.
3. Note the retention window (Hobby = 7 days; upgrade if you need longer
   for regulator audit).

For point-in-time export before risky migrations:

```
railway db backup create --service postgres
```

---

## Costs (rough, May 2026)

| Plan | Postgres | Notes |
|---|---|---|
| Hobby ($5/mo + usage) | included | fine for soft launch / staging |
| Pro ($20/mo + usage) | included, more RAM/CPU | recommended once real money flows |

Storage is metered separately — figure ~$0.25/GB/month. At 6M clicks/month
the audit log is the largest consumer; budget ~5–10 GB after a year.

---

## When Postgres is live

Update [`README.md`](README.md) and [`CLAUDE.md`](CLAUDE.md) so future
sessions know the in-memory path is gone. Drop the snapshot machinery
in `backup.ts` and delete `.50pick-backups/` from disk.
