Project: Kipindi (50pick) — C:\kipindi-main, deployed on Railway

## Latest (2026-07-03) — platform STABLE

P0 login outage on 2026-07-02 (advisory lock shipped broken) is **fixed + live**
(`c3f2a31`, `62a1075`). Full prod-only bug sweep done + money-path hardening
(`4c52ad9`). Verified: 33 unit suites, `next build`, 121/1 browser gauntlet green.
**Read `docs/SESSION_STATUS.md` top section first** — it has the full incident,
fixes, and open items (pending: confirm a real prod login with Ali; run
`railway run npm run backfill:zh`). Key lesson: raw SQL via Prisma only runs in
prod (dev is in-memory) — see memory `reference_kipindi_raw_sql_bigint`.

## Start every session

```
cd C:\kipindi-main && git pull
```

Read `docs/elevation-tracker.md`. Next `[ ]` item. Work top-to-bottom.

## Phases

0. Schema cleanup → 1. Ledger → 2. Payment integration → 3. Production readiness

## After each item

1. `npx next build` — must pass
2. Run relevant tests
3. Update tracker: `[x]` + commit hash + session log row
4. Commit and push

## Rules

- Always push — Ali reviews live Railway deploy
- Run next build before push
- Middleware is src/proxy.ts (Next.js 16)
- 3-locale i18n (EN/SW/ZH)
- Money paths: test after every change

## Quick start

"Elevation session — continue"
