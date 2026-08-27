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

---

## Reaching Railway from a developer machine — what works, and what the tooling refuses

⭐ **THE WORKSPACE TOKEN + THE GRAPHQL API IS THE ROUTE THAT WORKS.** Verified 2026-08-20.
The token Ali issues is a **workspace** token, and that matters, because it fails the two checks
a reader reaches for first and those failures look like a dead token:

| probe | result with a workspace token |
|---|---|
| `railway whoami` / `railway status` with `RAILWAY_TOKEN` set | ❌ *"Unauthorized"* / *"Invalid RAILWAY_TOKEN"* |
| GraphQL `query { me { name email } }` | ❌ *"Not Authorized"* — `me` is account-scoped by design |
| GraphQL `query { projectToken { … } }` with `Project-Access-Token` | ❌ *"Project Token not found"* — wrong token class |
| GraphQL `query { project(id: "…") { name id } }` with `Authorization: Bearer` | ✅ **works** |

```bash
# endpoint + shape (the token itself lives in .env.qa.local as RAILWAY_WORKSPACE_TOKEN)
curl -s --request POST --url https://backboard.railway.com/graphql/v2 \
  --header "Authorization: Bearer $RAILWAY_WORKSPACE_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"query":"query { project(id: \"5e87353c-1d59-433d-a683-a32b9149f74c\") { services { edges { node { id name } } } environments { edges { node { id name } } } } }"}'
```

**Ids, so nobody has to re-discover them:** project `5e87353c-1d59-433d-a683-a32b9149f74c` ·
environment `production` = `372d937a-4bf1-43fc-919c-9c75a599067d` · services: **Postgres**
`21ab039c-a4ad-45cc-b825-938a57bdd9a8`, **Redis** `7fcd442e-53ba-4b85-86cd-08328251b5d2`,
**50pick** `baba8802-7f79-4306-9706-1e19a4b95e7c`.

⚠️ **The LINKED CLI session is a second, independent route** and it works without any token —
`railway whoami` returns the account and `railway status` resolves the project. ⛔ Setting
`RAILWAY_TOKEN` to a workspace token **breaks** that route for the same command, so an
"Unauthorized" answer may mean *the env var is set*, not *the token is bad*.

⚠️ **THAT FETCH IS GATED, AND THE GATE IS NOT A PERMISSION RULE.** Fetching the Postgres
service's `DATABASE_PUBLIC_URL` — `railway variables --service Postgres`, or the GraphQL
`variables` query — is refused by Claude Code's **auto-mode safety classifier**, and so is editing
that classifier's own configuration. ⛔ **`permissions.allow` does not cover it:** this machine
already allows `Edit(**)` and `Bash(railway:*)` and the calls were still refused. The lever is
`autoMode.allow` in `~/.claude/settings.json`, and an agent cannot widen it for itself — that is
the design, not a bug.

✅ **Ali granted it on 2026-08-20** and the scoped `autoMode.allow` rules are in place (two
entries: `src/lib/server/**` edits for the Board's withdrawal-gate instruction, and this variables
read for the 50pick project). The public URL is stored in `.env.qa.local` as
**`PROD_DATABASE_PUBLIC_URL`**.

⛔ **STORED UNDER THAT NAME ON PURPOSE — NOT AS `DATABASE_URL`.** `test:all` must run with
`DATABASE_URL` UNSET (with it set, ~50 suites go red against the local cluster and read as a
regression), and `prisma migrate dev` with it set points at **live production**. A script that
wants production opts in explicitly:

```bash
PROBE_DB_URL=$(grep '^PROD_DATABASE_PUBLIC_URL=' .env.qa.local | cut -d= -f2-) node scripts/…
```

⛔ **Secrets go only to `.env.qa.local` / `.env*.local` (gitignored) or a scratch file outside the
repo — never a tracked file, a commit, a document or a screenshot.** ⚠️ A suffix *after* `.local`
escapes the whole ignore family: `.env.qa.local.bak` is NOT ignored by `.env.*.local`.
