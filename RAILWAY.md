# Railway deployment notes

## Persistent storage (so user accounts survive redeploys)

The in-memory store snapshots itself to disk every 1.5 s. By default the
snapshots land in `.50pick-backups/` inside the container's working
directory — which Railway wipes on every redeploy. To persist user
accounts, wallets, audit history, and resolved markets across deploys,
attach a Railway volume:

1. In the service settings, **Volumes → New Volume**, size ≥ 1 GB, mount
   path `/data`.
2. Add an environment variable on the service:
   ```
   STORE_BACKUP_DIR=/data/50pick-backups
   ```
3. Redeploy. On first boot the snapshot path will be created; every
   subsequent boot restores from the most recent valid snapshot.

The backup file is HMAC-signed with `SESSION_SECRET`. If you rotate the
session secret you'll lose the ability to restore old snapshots — copy
them out first if you care about the history.

## Required env vars

| Var | Required | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | yes | ≥ 32 chars, used for session HMAC + snapshot HMAC. |
| `OTP_PEPPER` | yes | ≥ 16 chars, OTP global pepper. |
| `STORE_BACKUP_DIR` | recommended | Path on a Railway volume; default is ephemeral. |
| `SMS_PROVIDER` | optional | `console` (dev) / `selcom` / `beem` / `africas-talking`. Default `console`. |
| `SMS_SENDER_ID` | for production SMS | TCRA-licensed sender ID, e.g. `50PICK`. |
| `DEMO_MODE_ENABLED` | optional | Legacy — demo mode has been removed. Setting this has no effect. |
| `NEXT_PUBLIC_LICENSE_REF` | optional | Footer license reference; default placeholder. |

## Database upgrade path

When traffic outgrows the in-memory + snapshot setup, swap to
PostgreSQL — the `db` API in `src/lib/server/store.ts` matches the
Prisma schema 1:1 so each method is a single-line replacement.
Keep the snapshot HMAC machinery in `src/lib/server/backup.ts` for
forensic exports.
