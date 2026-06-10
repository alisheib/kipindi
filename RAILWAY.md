# Railway deployment notes

## Persistence

All data is stored in PostgreSQL via Prisma ORM. The `DATABASE_URL` env
var points to a Railway-managed Postgres service. No disk volumes needed.

## Required env vars

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Railway Postgres connection string (auto-set if linked). |
| `USE_PRISMA_DAL` | yes | Must be `true` for production. |
| `SESSION_SECRET` | yes | >= 32 chars, used for session HMAC. |
| `OTP_PEPPER` | yes | >= 16 chars, OTP global pepper. |
| `SMS_PROVIDER` | optional | `console` (dev) / `selcom` / `beem` / `africas-talking`. Default `console`. |
| `NEXT_PUBLIC_APP_URL` | yes | Public URL of the app (e.g. `https://kipindi-production.up.railway.app`). |
| `NEXT_PUBLIC_LICENSE_REF` | optional | Footer license reference. |

## Schema migrations

After changing `prisma/schema.prisma`, generate a migration locally:

```bash
npx prisma migrate dev --name describe_change
```

Push to main — Railway's build step runs `prisma migrate deploy` automatically
(configured in the build command).

## Data layer

See `docs/DATA-LAYER.md` for the full architecture guide.
