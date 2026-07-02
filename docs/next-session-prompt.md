Project: Kipindi (50pick) — C:\kipindi-main, deployed on Railway

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
