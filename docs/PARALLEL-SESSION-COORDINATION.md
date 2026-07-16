# 50pick — Parallel-Session Coordination Contract

> Two sessions run in parallel to finish the enhancement plan before payment.
> **Session M (money-ops)** and **Session E (everything-else)**. This contract is
> LAW for both. The whole point: they can never corrupt each other's work,
> conflict on a file, or double-deploy. Read it fully before editing anything.

## Roles
- **Session M — money-ops (OWNS `main` + all deploys).** Scope: A2 player
  balance-adjust + per-player controls, A3 reconciliation match/write-off, A4
  withdrawal/bulk retry, A5 materialize aggregates. Owns the schema, the money
  services, and the local Postgres. **The only session that pushes to `main` or
  deploys.**
- **Session E — everything-else (branch only, NEVER deploys).** Scope: the §9
  quality/feature work that does NOT need a money service or the schema — A8
  twoOfficerGate/`<AttestationRail>`, A9 config-factory rollout (non-money
  configs), A10 money-format in UI components + lint rule, A11 migrate the 6
  player popups to `<Modal>` (wrapper only — DO NOT change bet/sell/settlement
  logic), A17 hide/tidy live-ops empty section, A18 L6 remaining tap targets, A19
  P1 delighters (`/live` auto-advance+swipe, `/results` arrows), plus §9.2/§9.4 UI
  cleanups. If an item needs a DENYLIST file, SKIP it and note it for M.

## Filesystem isolation (mandatory)
Session E runs in a **separate clone** (not the main working dir), so working
files, `.next/`, and node processes never collide:
```
git clone https://github.com/alisheib/kipindi.git F:\kipindi-enhance
cd F:\kipindi-enhance
git checkout -b enhance/perfection-9
npm ci && npx prisma generate
```
- Session M stays in `F:\kipindi-main` on `main`.
- Session E works in `F:\kipindi-enhance` on `enhance/perfection-9`.
- If Session E runs the app, use **port 3001** (`next dev -p 3001`), never 3000.
- Session E must **NOT** touch the local Postgres at `F:\pg-loadtest:5433`
  (Session M's). In-memory tests only (no `DATABASE_URL`).

## Git rules
- **Session M:** commits to `main`, runs the full pre-push gate, pushes → Railway
  deploys. Owns every deploy + all verify-after-push.
- **Session E:** commits to `enhance/perfection-9`. `git push -u origin
  enhance/perfection-9` is allowed (a BRANCH push — no deploy). **NEVER**
  `git push origin main`. **NEVER** deploy / run `railway`.
- **Merge:** when E signals a batch is ready, **M** fetches `enhance/perfection-9`,
  reviews, runs `tsc` + `npm run build` + `test:all` + `test:integrity`, merges to
  `main`, deploys, and verifies. Merges are conflict-free by construction (disjoint
  files — see ownership).

## File ownership — DENYLIST for Session E (do NOT edit; flag to M if needed)
- `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`
- `src/lib/server/`: `wallet-service.ts`, `market-service.ts`, `ledger.ts`,
  `payments.ts`, `payment-ops.ts`, `market-dal.ts`, `prisma-dal.ts`, `store.ts`,
  `storage.ts`, `lifecycle.ts`, `analytics.ts`, `report-money.ts`,
  `market-config.ts`, `bonus-config.ts`, `bonus-service.ts`
- `src/app/admin/`: `players/**`, `payments/**`, `finance/**`, `settlement/**`, `aml/**`
- `scripts/load/**` and the money test scripts
- `docs/FINAL-AUDIT-REMEDIATION.md`, `GO-LIVE-READINESS.md`,
  `ENHANCEMENT-PLAN-STATUS.md` (M maintains the trackers; E keeps its own
  `docs/session-E-notes.md`)

**Everything else is Session E's** — `src/components/**`, the other `src/app/**`
routes, the non-money config modules, `src/lib/i18n/**`, `globals.css`,
`admin-shell`, compliance UI (kyc/resolver/objections/reports), etc.

## Shared-resource rules
- **i18n dictionaries** belong to Session E. Session M will not add i18n keys; if M
  needs copy it reuses existing keys or uses admin-only literals.
- **Schema / migrations / deps:** M only. E flags any need in its notes.
- **The `<Modal>` primitive** (`src/components/ui/modal.tsx`) is E's. M does not
  touch UI modals.

## Handoff / status
- Session E maintains `docs/session-E-notes.md` (its own progress log) and reports
  each ready batch (branch pushed + summary + any DENYLIST needs).
- Session M merges, deploys, and records the audit/enhancement trackers.
- Neither session edits the other's tracker/notes file.
