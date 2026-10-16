# 50pick

**The wisdom of YES & NO.** A Tanzania-licensed, pari-mutuel prediction market — live at https://www.50pick.tz.

Players pick **YES** or **NO** on a question (sports, weather, the economy, crypto, culture, tech). Every stake on a
question joins one pool; when the question settles, the pool less our commission is shared by the players who were
right, in proportion to their stakes. A winning bet is never paid below its stake, and players are never taxed — taxes
are levied only on 50pick's commission. The commission and every other money rule are stated once, in
[`docs/RULES.md`](docs/RULES.md).

Mobile-first, in English, Swahili and Chinese, on one dark-royal theme.

---

## Working on this repository

**Read [`AGENTS.md`](AGENTS.md) first** — the working rules for every engineer and every coding agent (Claude Code
reads it through [`CLAUDE.md`](CLAUDE.md); Codex reads it directly). It says how to start a session, where each kind of
truth lives, and how a change reaches production. ⚠️ Every push to `main` deploys the live, real-money platform.

- A machine that has never run 50pick: [`docs/SETUP.md`](docs/SETUP.md).
- Every document, with its status: [`docs/README.md`](docs/README.md).
- What is live and what is next: the board at the top of [`docs/NEXT-PLAN.md`](docs/NEXT-PLAN.md).

## Quick start

```bash
# Node 24
npm ci
npm run dev
```

With no `DATABASE_URL` the app runs on an in-memory store; `docs/SETUP.md` covers secrets, the database and the
symptoms that cost an afternoon. The test and drive commands are the `test:*`, `qa:*`, `e2e:*` and `red:*` scripts in
[`package.json`](package.json).

## Stack

Next.js 16.4 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 3 · Prisma 6 on PostgreSQL · Playwright.
Hosted on Railway; payments through Selcom; SMS through Blackball; email through Postmark.

## Project layout

```
src/
  app/            routes, pages, server actions and route handlers (player, admin, api, auth)
  components/     the UI kit (ui/, admin/), the shell (layout/), and feature components
  lib/            shared logic; lib/server/ is server-only (money, auth, KYC, audit, payments, SMS, email)
  proxy.ts        edge proxy: security headers and auth gates
prisma/           schema and migrations
scripts/          test suites, browser drives and operations scripts
docs/             the owning documents (index: docs/README.md)
```

## Where the rules are

| Subject | Document |
|---|---|
| Money: commission, taxes, stakes, limits | [`docs/RULES.md`](docs/RULES.md) |
| Design: palette, type, components, accessibility | [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md) |
| Every redirect and gate | [`docs/FLOWS.md`](docs/FLOWS.md) |
| Data model and persistence | [`docs/DATA-LAYER.md`](docs/DATA-LAYER.md) · [`prisma/schema.prisma`](prisma/schema.prisma) |
| Owner rulings and compliance positions | [`docs/COMPLIANCE-DECISIONS.md`](docs/COMPLIANCE-DECISIONS.md) |
| Identity checks | [`docs/IDENTITY-POLICY.md`](docs/IDENTITY-POLICY.md) |
| Production and deployment | [`RAILWAY.md`](RAILWAY.md) · [`docs/RAILWAY-LIVE.md`](docs/RAILWAY-LIVE.md) |
| Backups | [`docs/BACKUP-RUNBOOK.md`](docs/BACKUP-RUNBOOK.md) |

## Compliance posture

- An HMAC-chained, append-only audit log; every money and compliance event is written to it.
- Responsible-gambling controls — self-exclusion, cooling-off, deposit, loss and session limits — on every path that
  deposits, bets or withdraws.
- Identity is verified before a player's first withdrawal ([`docs/IDENTITY-POLICY.md`](docs/IDENTITY-POLICY.md)).
- Regulator reports (Gaming Board, TRA and others) as PDF and spreadsheet from the admin console.

Operator: Ali, Dar es Salaam · Regulator: the Gaming Board of Tanzania.
