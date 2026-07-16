# Testing & verify discipline (50pick)

## The pre-push gate (non-negotiable — every push is a LIVE deploy)
```
npx tsc --noEmit        # types
npm run build           # the deploy gate — a broken build = prod down
npm run test:integrity  # content-integrity guard (no superseded/false claims)
npm run test:all        # full suite on a FRESH store
```

## The suites
- **`npm run test:all`** (`scripts/test-all.mjs`) auto-discovers every `test:*` script in
  `package.json` and runs it with a PASS/FAIL summary. Must be green on a **fresh, unseeded**
  store. `test:responsive` is the ONE allowed to fail locally — it needs a live `:3000`
  server; that's not a code regression.
- **`npm run test:integrity`** (`scripts/content-integrity.test.mts`) — fails if a
  superseded/removed pattern returns to a current-truth surface (README/CLAUDE/source):
  the 15% withholding tax, a French UI locale, "bilingual EN/SW", the flat-9% fee, a light
  theme / next-themes, a committed `db-check.*`, raw-PII selects outside the server layer, or
  a doc mandating the teal kit. This is how "docs say things that aren't true" stays fixed.
- **Per-suite:** `npx tsx scripts/<name>.test.mts`.
- Default (no `DATABASE_URL`) every suite runs against an in-memory `Map` — fast, hermetic.

## Money paths need REAL Postgres
The in-memory `withLock` is a single-process mutex, so multi-instance defects (cross-instance
double-spend, ledger/audit-chain forks) only surface on real PG.
- Local disposable cluster: **`F:\pg-loadtest`, port 5433** (`fsync=off`, disposable). Full
  setup + the three prod-safety gates are in the `50pick-audit` skill §3.
- Load / cross-instance harnesses live in `scripts/load/`:
  - `s10-cross-instance.mts` — wallet double-spend safety (advisory lock is DB-global).
  - `s11-audit-cross-instance.mts` — audit-chain fork safety (C6).
  Each spawns 2 OS processes = 2 Railway containers against ONE DB.
```
$env:DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public'
node scripts/load/reset-db.mjs                     # clean + migrate + re-plant the safety marker
npx tsx scripts/load/s10-cross-instance.mts
npx tsx scripts/load/s11-audit-cross-instance.mts
```

## Money-invariant bar (every money path)
A money path is only done when a committed `.test.mts` proves ALL of:
- **Conservation** — in = out + house (no money minted or destroyed).
- **No negative balance** — ever, under concurrency.
- **Idempotent** — a replay (same idempotency key / webhook) doesn't double-apply.
- **Audited** — a matching audit entry exists.
- **Race-safe** — a concurrency test exists for every shared-state path.

## Verify-after-push protocol (Ali's rule)
After every `git push origin main`:
1. **Technical** — `tsc` + `test:*` green.
2. **Logical** — reason through that the change does what it claims.
3. **Visual** — screenshot the live page and LOOK (not just HTTP 200).
4. **Live-DB** — prod HTTP 200 + `railway logs -s 50pick` shows a clean boot (no `[snag]`
   error blocks, no boot throw; known fail-open warnings are OK).

⚠️ **Verify against `https://kipindi-production.up.railway.app`** — the custom domain
`50pick.tz`/`www` currently parks on an Apache page (a misleading 200 from the wrong host).
`railway status` / `railway logs -s 50pick` for the real app (CLI = alisheib07).

## Migrations
- Additive where possible; **hand-author** `prisma/migrations/<ts>_<name>/migration.sql` with
  idempotent, fail-open SQL (`IF NOT EXISTS`, defensive `DO $$` blocks that warn-not-fail on
  pre-existing data). A migration that fails = the deploy fails = prod down.
- Test on the **local disposable PG** via `npx prisma migrate deploy` first; prod gets it via
  the normal deploy (`start = prisma migrate deploy && … && next start`), **never by hand**.
- Avoid `prisma migrate dev` — it's interactive and its shadow-DB diff trips on drift.
