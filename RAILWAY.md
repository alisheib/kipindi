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
| `SELCOM_WEBHOOK_SECRET` | per-provider | HMAC secret for Selcom payment callbacks. **Exact name** — read by `api/webhooks/payments/route.ts`. |
| `AZAMPAY_WEBHOOK_SECRET` | per-provider | HMAC secret for Azampay payment callbacks. |
| `MIXX_WEBHOOK_SECRET` | per-provider | HMAC secret for Mixx-by-Yas payment callbacks. |
| `POSTMARK_WEBHOOK_SECRET` | optional | Inbound Postmark webhook token. |

> ⚠️ **Webhook secrets (audit H7).** The code reads the **per-provider** names
> above, not a single `PAYMENT_WEBHOOK_SECRET`. Set the secret for each provider
> you enable. If one is missing, every callback from that provider is rejected
> with 401 and its deposits never credit — boot logs a `[config] WARNING` for
> each missing one in production.

## Schema migrations

After changing `prisma/schema.prisma`, generate a migration locally:

```bash
npx prisma migrate dev --name describe_change
```

Push to main — Railway's build step runs `prisma migrate deploy` automatically
(configured in the build command).

## Data layer

See `docs/DATA-LAYER.md` for the full architecture guide.
