---
name: railway
description: Railway access, the deploy model, and migration safety for 50pick. Read before running any railway command, writing or applying a Prisma migration, or diagnosing a live incident. The CLI on Ali's machine is already authenticated — verify, do not ask for a login.
---

# Railway — 50pick production

## Access is standing. Verify it, don't ask for it.

The Railway CLI is already logged in and linked to this repo. Check, never request credentials:

```bash
railway whoami    # → Ali Sheib (alisheib07@gmail.com)
railway status    # → Project: 50pick / Environment: production
```

| | |
|---|---|
| Account | `alisheib07@gmail.com` (Ali Sheib) |
| Project | `50pick` — `5e87353c-1d59-433d-a683-a32b9149f74c` |
| Environment | `production` |
| Services | `Postgres` · `Redis` · `50pick` |
| Live | https://50pick.tz · https://www.50pick.tz · `kipindi-production.up.railway.app` |

⚠️ **This machine has more than one Railway account.** AWARKEH Mobiles lives under
`awarkehmobiles@outlook.com` on a different project. Before any 50pick command, confirm
`railway whoami` reads **alisheib07@gmail.com** and `railway status` reads **50pick**. Acting
on the wrong project is the failure mode to guard against here.

If a command returns an auth error, re-run `railway whoami` and report the output. Do not send
Ali to a login page.

## ⚠️ The deploy model — read before touching anything

**There is no staging. Every push to `main` deploys to the live real-money platform.**
The start command is:

```
prisma migrate deploy && node scripts/seed-test-float.mjs && next start
```

Three consequences, each of which has already cost real time:

1. **A broken migration takes the site DOWN.** `migrate deploy` runs *before* `next start`, so
   a migration that fails means the container never boots. Write migrations to be re-runnable
   (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, constraints guarded by a
   `pg_constraint` existence check) and **apply them from your machine before pushing**, so the
   deploy itself is a no-op that cannot fail.
2. **In-memory state is wiped several times a week.** Any `globalThis.__50PICK_*` store without
   a `_HYDRATED` twin that rehydrates from Postgres is effectively erased on every push. This is
   what silently destroyed market price history and led to it being fabricated on render.
3. **Only ONE container runs.** Several invariants — the `admission.ts` semaphore, in-memory
   rate limits, the lifecycle ticker's `lastReconcileAt`/`lastPaymentSweepAt` — are correct
   *only* because of that. They loosen the day a second container exists.

## Migrations against production

`railway run` alone does **not** work for DB scripts from this machine: it injects
`postgres.railway.internal`, which resolves only inside Railway. Use the Postgres service's
`DATABASE_PUBLIC_URL` instead, read from `railway variables --service Postgres`.

⛔ **Never print, echo, paste, or commit a Railway variable value.** They are live production
credentials. Read one into an environment variable and assert only on its presence.

Then, in order:

```bash
npx prisma migrate status    # ALWAYS first — deploy applies EVERY pending migration, not just yours
npx prisma migrate deploy    # applies AND records the row in _prisma_migrations
```

- Use `migrate deploy`. **Never** hand-apply raw SQL: it skips the `_prisma_migrations` row, so
  the next deploy re-runs the same file and dies on a duplicate constraint — an outage.
- ⛔ **Never `prisma migrate dev` here.** It targets whatever `DATABASE_URL` is set and will
  offer to **reset the live database**.

## Read-only commands worth knowing

```bash
railway status                       # project / environment / services
railway logs -s 50pick               # live application logs
railway variables -s 50pick --kv     # variable NAMES — never print the values
```

## Standing rules

- ⛔ **Full `npm run test:all` before ANY push touching a money path.** Not a subset — a money
  change once shipped on a partial run and a stale test slipped through.
- `tsc` and `next build` green before pushing.
- Never `throw` at boot on a non-fatal condition; it costs the entire site.
- Money lock order is wallet → market. Claim rows on update (`updateMany` guarded by the status
  you read) or a concurrent path can pocket the difference.
- The prod seeder (`seed-test-float.mjs`) mints balance and runs on every boot. It refuses when
  `NODE_ENV === "production"`, checked before any flag is read. Do not weaken that guard.
