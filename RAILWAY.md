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
| `REDIS_ENABLED` | optional | Must be exactly `true` to arm the Redis layer. **Setting `REDIS_URL` alone does nothing.** |
| `REDIS_URL` | optional | Redis connection string (e.g. `${{Redis.REDIS_URL}}`). Inert unless `REDIS_ENABLED=true`. |

> ⚠️ **Webhook secrets (audit H7).** The code reads the **per-provider** names
> above, not a single `PAYMENT_WEBHOOK_SECRET`. Set the secret for each provider
> you enable. If one is missing, every callback from that provider is rejected
> with 401 and its deposits never credit — boot logs a `[config] WARNING` for
> each missing one in production.

> ⚠️ **Redis is armed by TWO keys (audit H2).** `REDIS_URL` is configuration;
> `REDIS_ENABLED="true"` is activation. Wiring the URL alone leaves the layer
> completely inert — that is deliberate, so a Railway service reference added for
> another reason cannot silently move production rate limiting and SSE onto a
> cache. The whole layer is fail-open and is **never** on the bet/admission path:
> if Redis is unreachable, rate limits degrade to per-container and live updates
> stop, but bets, logins and withdrawals are untouched. Verify the mode on
> **/admin/system** — the card reports `enabled`, `connected` and `subscribed`
> separately, because a connected client subscribed to nothing still means SSE
> fan-out is off.

## Schema migrations

After changing `prisma/schema.prisma`, generate a migration locally:

```bash
npx prisma migrate dev --name describe_change
```

Push to main — Railway's build step runs `prisma migrate deploy` automatically
(configured in the build command).

## Data layer

See `docs/DATA-LAYER.md` for the full architecture guide.
