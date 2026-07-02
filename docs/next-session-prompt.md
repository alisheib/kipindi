Project: Kipindi (50pick) — C:\kipindi-main, deployed on Railway, repo alisheib/kipindi

## ELEVATION PHASE — Active (started 2 July 2026)

Platform elevated from v2.5 using a 142-item spec + external review (Claude Fable).
The external review is at `50PICK/Claude Fable final recommendation/PLATFORM-REVIEW-FINAL.md`.

### Before you do ANYTHING

```
cd C:\kipindi-main
git pull
```

Then read the tracker:

```
docs/elevation-tracker.md
```

Find the next `[ ]` item in the current phase. Work top-to-bottom, phase-by-phase.

### Phase order (STRICT)

- **Phase 0** (items 0a-0g): Schema cleanup — BEFORE the ledger. betId split, CHECK constraints, dead code removal.
- **Phase 1A** (items 1-7): Pure correctness — ledger, outbox, webhooks, withdrawals
- **Phase 1B** (items 8-16): Infrastructure — Redis, observability, perf budgets
- **Phase 2** (items 17-55): Trusted & loved — withdrawal SLA first, then trust/UX
- **Phase 3** (items 56-70): Without peer — USSD, Vikundi, multi-outcome (frozen until ledger stable)

### Ali Decision Memo

Items marked A1-A6 in the tracker NEED ALI'S INPUT before engineering proceeds.
If the next item is blocked on an Ali decision, skip to the next unblocked item.

### After finishing each item

1. Run `npx next build` — must pass clean
2. Run relevant test suites if touching money paths
3. Update `docs/elevation-tracker.md`:
   - Mark the item `[x]`
   - Add the commit hash
   - Add a row to the Session Log
4. Commit with message: `elevation #N: short description`
5. Push — Railway auto-redeploys

### Key references

- Elevation Spec: `NEW PHASE DESIGN/50pick Elevation Spec.dc.html`
- Fable Review: `50PICK/Claude Fable final recommendation/PLATFORM-REVIEW-FINAL.md`
- Platform onboarding: `CLAUDE.md`
- Schema: `prisma/schema.prisma`

### Rules (always enforced)

- **Always commit AND push** — Ali reviews on live Railway deploy
- **Run `npx next build` before pushing** — catches typedRoutes + proxy conflicts
- **No boot-time API calls** — only on intervals
- **Middleware is `src/proxy.ts`** not middleware.ts (Next.js 16)
- **3-locale i18n** (EN/SW/ZH) for every user-facing string
- **Money paths are sacred** — test after every change
- **Migrations must be reversible** — always verify prod data compatibility
- **P0 before P1 before P2** — never jump ahead
- **Phase 0 before ledger** — schema cleanup is prerequisite

### Quick start

User says: "Elevation session — continue"
You do:
1. `git pull`
2. Read `docs/elevation-tracker.md`
3. Find next `[ ]` item (skip Ali-blocked items)
4. Implement it
5. Update tracker, commit, push
6. Repeat
