Project: Kipindi (50pick) — C:\kipindi-main, deployed on Railway, repo alisheib/kipindi

## ELEVATION PHASE — Active

### Before anything

```
cd C:\kipindi-main && git pull
```

Read `docs/elevation-tracker.md`. Find next `[ ]` item. Work top-to-bottom.

### Phase order

0. Schema cleanup (before ledger)
1A. Money-path correctness (ledger, outbox, webhooks)
1B. Infrastructure (Redis, observability, perf)
2. Launch essentials (withdrawal SLA, dispute, WhatsApp, RG)
Post-launch: pick from list after launch

### After each item

1. `npx next build` — must pass
2. Run relevant tests
3. Update tracker: mark `[x]`, add commit hash, add session log row
4. Commit: `elevation #N: description`
5. Push

### Rules

- Always commit AND push — Ali reviews live Railway deploy
- Run next build before pushing
- No boot-time API calls
- Middleware is src/proxy.ts (Next.js 16)
- 3-locale i18n (EN/SW/ZH)
- Money paths: test after every change
- Migrations: verify prod data compatibility first

### Quick start

User says: "Elevation session — continue"
