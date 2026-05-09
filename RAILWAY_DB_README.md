# Railway Postgres — 5 steps

Follow in order. No alternatives, no detours.

---

## 1. Add Postgres to your Railway project

In the Railway dashboard for the `50pick` project:

1. Top-right of the canvas, click **+ New**.
2. Pick **Database**.
3. Pick **Add PostgreSQL**.
4. Wait ~60 seconds for the new tile to turn green.

You should now have two tiles: `kipindi` and `Postgres`.

---

## 2. Wire `DATABASE_URL` into the kipindi service

1. Click the **kipindi** tile → **Variables** tab → **+ New Variable**.
2. **Name:** `DATABASE_URL`
3. **Value:** type exactly `${{Postgres.DATABASE_URL}}`
4. Click **Add**.

Railway redeploys kipindi automatically. Wait for the deploy to go green (~2 min).

---

## 3. Copy the real Postgres URL to your laptop

1. Click the **Postgres** tile → **Variables** tab.
2. Find `DATABASE_URL` → click the eye icon to reveal → copy the whole `postgresql://...` string.
3. On your laptop, in `C:\kipindi`, create a file called **`.env.local`** with one line:

```
DATABASE_URL=postgresql://postgres:...@...railway.app:6543/railway
```

Paste the value you copied. No quotes around it. `.env.local` is git-ignored.

---

## 4. Run the migration script

In PowerShell, from `C:\kipindi`:

```powershell
node scripts/railway-db-setup.mjs --init init --apply
```

Expect (~30 seconds):

```
✓ DATABASE_URL set (Railway)
✓ prisma/schema.prisma found
▸ Running: npx prisma generate
▸ Running: npx prisma migrate dev --name init
▸ Running: npx prisma migrate deploy
✓ Connected — 19 tables visible
  Done.
```

Your Railway database now has all 19 tables.

---

## 5. Clean up your laptop

Open `.env.local` and **delete** the `DATABASE_URL` line. Never leave the production URL on your laptop.

```
# .env.local — empty for now is fine
```

---

## Done

Push your code with `git push` — players use the Railway DB. From now on every deploy auto-applies pending migrations.

---

# Troubleshooting

| Symptom | Fix |
|---|---|
| `DATABASE_URL is not set` | `.env.local` must be in `C:\kipindi`, not in a subfolder. The line has no quotes around the value. |
| `Can't reach database server` | Wrong URL. Re-copy from the **Postgres tile** in Railway (not the kipindi tile). No trailing newline or stray space. |
| `migrate dev` says "drift detected" | Someone hand-edited the database via Prisma Studio. Stop and message me before continuing. |
| Railway deploy goes red after the migration | Click the **kipindi** service → **Logs** → look for `PrismaClientInitializationError`. Most likely `DATABASE_URL` env var didn't resolve. Re-check Step 2. |
| You need to undo everything | In Railway: **Postgres tile → Backups → Restore** the most recent backup. Then `git revert` the deploy commit. |

---

# After this is done

The `RAILWAY.md` and `CLAUDE.md` files mention the in-memory store. Once Postgres is fully wired, those notes need updating — flag me and I'll do it.
