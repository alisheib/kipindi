Project: Kipindi (50pick) — C:\kipindi-main, deployed on Railway, repo alisheib/kipindi

## ELEVATION PHASE — Active (started 2 July 2026)

The platform is being elevated from v2.5 (commit 0499a42) to production-grade
using a 142-recommendation spec from professional reviewers.

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

### After finishing each item

1. Run `npx next build` — must pass clean
2. Run relevant test suites if touching money paths
3. Update `docs/elevation-tracker.md`:
   - Mark the item `[x]`
   - Add the commit hash in the Commit column
   - Add a row to the Session Log table at the bottom
4. Commit with message: `elevation #{N}: short description`
5. Push — Railway auto-redeploys, Ali reviews live

### Phase order (STRICT — never jump ahead)

- **Phase 1A** (items 1-7): Pure correctness — locks, ledger, idempotency, outbox
- **Phase 1B** (items 8-16): Infrastructure — Redis, observability, indexes, jobs
- **Phase 2** (items 17-56): Trusted & loved — trust, UX, design elevation
- **Phase 3** (items 57-71): Without peer — USSD, Vikundi, multi-outcome, social

### The spec

Full spec with detailed requirements for every item:
`NEW PHASE DESIGN/50pick Elevation Spec.dc.html`

Refer to it when implementing — it has the exact technical approach for each item.

### Rules (always enforced)

- **Always commit AND push** — Ali reviews on live Railway deploy, not local
- **Run `npx next build` before pushing** — tsc --noEmit misses typedRoutes + proxy conflicts
- **No boot-time API calls** — never call external APIs on deploy/startup, only on intervals
- **Middleware is `src/proxy.ts`** not middleware.ts (Next.js 16)
- **3-locale i18n** (EN/SW/ZH) for every user-facing string
- **pos_* ticket IDs** everywhere a bet is referenced
- **Money paths are sacred** — test after every change to wallet/bet/resolve/withdraw
- **Migrations must be reversible** — always write a rollback plan for schema changes
- **P0 before P1 before P2** — never jump ahead in priority
- **Never break the theme kit** / UI kit / CSS kit / logo system
- **All rates/amounts/thresholds** must be admin-configurable (no hardcoded values)
- **Sequential bonuses** enforced (one active at a time, others QUEUED)
- **Cashback is REQUEST-based** by default (not auto-deposit)

### What to tell Ali at end of session

"I completed elevation items #X-#Y. Tracker updated. Next session: item #Z."

### Quick start for a new session

User says: "Elevation session — continue"
You do:
1. `git pull`
2. Read `docs/elevation-tracker.md`
3. Find next `[ ]` item
4. Implement it
5. Update tracker, commit, push
6. Repeat
