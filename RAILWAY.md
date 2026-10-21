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
| `SMS_PROVIDER` | optional | `console` (dev) / `blackball`. Default `console`. ⚠️ An unrecognised value sends NOTHING and marks nothing sent. |
| `SMS_SENDER_ID` | with blackball | TCRA sender ID, ⛔ max 12 chars — the gateway refuses anything longer. |
| `BLACKBALL_CLIENT_ID` / `BLACKBALL_CLIENT_SECRET` | with blackball | From the portal, Configurations → API Configurations. |
| `BLACKBALL_WEBHOOK_SECRET` | with blackball | >= 16 chars. Register the DLR URL as `https://<host>/api/webhooks/blackball?token=<this>`. |
| `OTP_ENABLED` | optional | `1` opens phone-code SIGN-IN: the `/auth/otp` page and the code actions (`otp-door.ts`); no login UI links to it yet (docs/BLACKBALL-SMS.md section 7 step 6). Leave unset until that UI ships. |
| `NEXT_PUBLIC_APP_URL` | yes | Public URL of the app, for absolute links in email, SMS and share images (`appUrl()`, `src/lib/app-url.ts`; `https://www.50pick.tz` when unset). |
| `NEXT_PUBLIC_LICENSE_REF` | not read | ⛔ Nothing reads it any more. The footer's licence number is `LICENCE_NUMBER()` (`src/lib/support-config.ts`), saved in Admin → System; setting this variable changes nothing. |
| `NODE_ENV` | yes | `production` on Railway. Everything production-only keys off it: a missing `SESSION_SECRET` or `OTP_PEPPER` is FATAL at first use, the session cookie is `Secure`, `/api/dev-test/*` and `/auth/demo` answer 404, and real money is live when it is `production` AND `TEST_FUNDING` is not `"true"` (`isLiveMoneyMode()`, `src/lib/server/runtime-mode.ts`). |
| `ADMIN_BOOTSTRAP_PHONES` | optional | Comma-separated E.164 list (`+255712345678,+255700000000`). A listed phone is created ADMIN at sign-up; an existing non-admin account on the list is promoted ONCE, at its next password sign-in, and the promotion is recorded durably, so a demoted admin is never promoted again by the list. Never demotes. Admin → System shows how many phones it holds. |
| `TESTER_BOOTSTRAP_PHONES` | optional | Comma-separated E.164 list. A listed phone's new wallet gets a test starter balance at sign-up — except in LIVE money mode, where every starter credit is forced to 0 (it would be money with no ledger entry) and the refusal is audited `wallet.starter_credit_refused_live`. |
| `ADMIN_TEST_DEPOSITS` | optional | Off production only: ADMIN, COMPLIANCE and MODERATOR accounts may make uncapped test deposits that skip the source-of-funds and deposit-limit gates — on by default there, off with `false`. ⛔ In production it enables NOTHING, whatever its value: `NODE_ENV=production` short-circuits it (`wallet-service.deposit()` and the deposit page). |
| `ANTHROPIC_API_KEY` | optional | One key for every AI feature: the help chat, AI poll generation and the market-resolution check (the sentinel). Unset: the chat answers from its offline keyword helper, generation runs the mock provider (`/admin/ai-polls` names it), and the sentinel does not run. Set: the real provider is chosen automatically — no code change. `docs/AI-POLL-SOURCES.md` § Activating the AI features. |
| `POSTMARK_API_KEY` | yes | Postmark server token — the transactional email rail (`docs/EMAIL.md`). Unset: every send is only logged (`[email-stub]`) and returns the reason `stub`; nothing is delivered. |
| `PHONE_EMAIL_MAP` | legacy | `+255…:a@b.com,+255…:c@d.com`. A READ-ONLY delivery fallback: for an account with NO email on file, a listed phone's non-money mail (the sign-in notice, officer alert lists) goes to the mapped address. It never writes `user.email`, never receives money mail (`confirmedOnly`) and never a password-reset link. Removing it is a go-live step (`docs/LAUNCH-GO-NO-GO.md` §5). |
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

A schema change ships ONLY as a migration file in `prisma/migrations/`, committed with the change. Every deploy
starts the container with `prisma migrate deploy && next start` (the `start` script in `package.json`), so pending
migrations are applied at boot, before the app serves. ⛔ Never point `prisma migrate dev` at production, and use it
at all only against a throwaway database — it is interactive and diffs against a shadow database. The protocol (write
the SQL by hand, apply it to a disposable Postgres, `npm run verify:backup-schema`, commit) is
`.claude/skills/50pick-audit/SKILL.md` §4; `docs/DATA-LAYER.md` says the same.

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

⚠️ **2026-10-21 (U43 session): the stored `RAILWAY_WORKSPACE_TOKEN` answered "Not Authorized" to that very project query**
— revoked or expired. Ali issued a new workspace token the same day; it is in `.env.qa.local` under the same name, and the
project query above answered with project 50pick and its three services. A token can die without notice: if this route
says "Not Authorized", ask Ali for a new one. Meanwhile the linked CLI session's `railway api` sends read-only GraphQL with
that session (e.g. a service's `repoTriggers` and `serviceInstances.latestDeployment`).

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
