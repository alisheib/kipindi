---
name: 50pick-audit
description: Operational playbook for the 50pick (kipindi) real-money platform — how to continue the Final Audit remediation, work safely against Postgres/Railway/Prisma, run the tests, and respect the money-code invariants. Use at the START of any 50pick session and before any DB, migration, or money-path change.
---

# 50pick — audit remediation & safe-ops playbook

50pick is a **Tanzania-licensed, real-money** pari-mutuel prediction market
(repo dir `kipindi-main`; product name is always **50pick**). Money correctness
and provability are the whole job. Read this before touching anything.

## 0. ⚠️ NON-NEGOTIABLE — every push is a LIVE production deploy
`git push origin main` triggers Railway to run `prisma migrate deploy && … &&
next start` **against the live money DB**. There is no staging. So:
- **Never push code that fails `npx tsc --noEmit` AND `npm run build`.** Build is
  the deploy gate; a broken build or a thrown `instrumentation.register()` = prod down.
- **Never crash boot on a non-fatal condition.** (This session's outage: a C7
  compliance *alarm* threw in `register()` → HTTP 500 everywhere. Fixed by
  fail-open. Enforce controls at runtime, alarm at boot — never `throw` at boot
  unless a real secret/DB is missing.)
- **Verify AFTER every push (Ali's rule):** technical (`tsc`+`test:*`) · logical ·
  **visual** (screenshot the live page with playwright + LOOK) · **live-DB**
  (`curl` prod → HTTP 200, and `railway logs -s 50pick` shows a clean boot).
- **⚠️ Verify against the RAILWAY domain `https://kipindi-production.up.railway.app`,
  NOT `50pick.tz`.** As of 2026-07-16 the custom domain (`50pick.tz` + `www.`) DNS
  resolves to an **Apache parking page** (`Server: Apache`, an "Index of /"), NOT
  Railway — so `curl 50pick.tz` returns a misleading HTTP 200 from the wrong host.
  Both customs are ACTIVE on the Railway service; DNS just isn't pointing at it.
  **Ali/ops:** repoint `50pick.tz`/`www` DNS at Railway (CNAME to the service) —
  real users currently see a directory listing, not the platform.
- **Migrations:** additive only where possible; test on local PG first (§3/§4).

## 1. Where the work stands — read this FIRST
- **GO-LIVE runbook & execution record (source of truth for launch):** [`docs/GO-LIVE-RUNBOOK.md`](../../docs/GO-LIVE-RUNBOOK.md) — architecture, the exact DNS-cutover steps we ran (Netpoa→Cloudflare, 2026-07-17) + gotchas, the final DNS/mail config, the env-var registry, and the R2/Selcom/switch procedures. 🔐 It contains NO secret values (secrets live in Railway env vars only).
- **Living tracker (audit source of truth):** [`docs/FINAL-AUDIT-REMEDIATION.md`](../../docs/FINAL-AUDIT-REMEDIATION.md). Its **"▶ WHERE WE ARE"** block names the current stage, what's closed, and what's LEFT. Update it at the end of every stage.
- The audit itself: `Final Audit 1507/50pick-FINAL-AUDIT-v8-FINAL-2026-07-15.md` (11 Critical, 11 High, 11 Medium, 6 Low).
- Work in **stages**: after each → run tests → update the tracker's WHERE-WE-ARE block → commit → `git push origin main`.
- Keep the tracker, `CLAUDE.md`'s "ACTIVE WORK" banner, and the `final-audit-remediation` memory in sync so any new session instantly knows the stage.

## 2. Testing
- **Default (no DB):** every `test:*` suite runs against an in-memory `Map` when `DATABASE_URL` is unset. `npm run typecheck` then `npm run test:all` (stays green, ~57 suites). Per-suite: `npx tsx scripts/<name>.test.mts`.
- **Real Postgres (load/concurrency/ledger/audit-chain):** the in-memory `withLock` is a single-process mutex, so C4/C6-class multi-instance defects only show on real PG. Use the **local disposable cluster** (§3).
- New proof suites added during remediation: `bonus-void-restitution`, `rg-limit-race`, `webhook-security`, `lock-hash`, `contrast` (+ `test:*` scripts). `test-all.mjs` auto-discovers any `test:*` script in `package.json`.
- **`npm run test:integrity`** — content-integrity guard: fails if a superseded/removed pattern returns in a current-truth surface (README/CLAUDE/source): the 15% withholding tax, a French UI locale, "bilingual EN/SW", the flat-9% fee, a light theme / next-themes, a committed `db-check.*`, raw-PII selects outside the server layer, or a doc mandating the teal kit. Keep it green — it's how the "docs say things that aren't true" class stays fixed.

## 3. Local disposable Postgres — the SAFE DB target
A user-space PG16 cluster lives at **`F:\pg-loadtest`, port 5433** (`fsync=off`, disposable). Full guide: `scripts/load/README.md`. Three gates refuse prod (hostname denylist `rlwy.net`/`railway.app`/`50pick.tz`, localhost-only, and a `SystemConfig['__LOAD_TEST_TARGET__']` marker row).

```powershell
# start (idempotent)
& F:\pg-loadtest\pgsql\bin\pg_ctl.exe -D F:\pg-loadtest\data -l F:\pg-loadtest\pg.log start
$env:DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public'
node scripts/load/reset-db.mjs         # clean + migrate + re-plant marker (before any money-total assertion)
npx tsx scripts/load/s10-cross-instance.mts   # the multi-instance (C6/C4) harness
```
psql: `& F:\pg-loadtest\pgsql\bin\psql.exe "postgresql://postgres:pw@localhost:5433/kipindi_load" -c "..."`

## 4. Migrations — the ONLY safe workflow ⛔
**Never hand-run an untested schema change against the production money DB.** A push that outran its schema once took checkout + admin down (see memory).
1. Edit `prisma/schema.prisma`.
2. Author the migration **by hand** as `prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql` (idempotent SQL, e.g. `CREATE INDEX IF NOT EXISTS …`). Avoid `prisma migrate dev` — it is interactive (fails headless) and its shadow-DB diff trips on pre-existing drift.
3. Apply to the **local disposable PG** with `npx prisma migrate deploy` (non-interactive; applies files, doesn't diff). Verify with psql.
4. Commit. **Production gets it via the normal deploy** (`start` = `prisma migrate deploy && next start`, run by Railway on push) — not by you.
- ⚠️ Known pre-existing drift: schema has `@@unique([provider, providerRef])` on `Transaction` that `migrate dev` wants to add — confirm production actually enforces it (it's a double-credit guard) as a follow-up.

## 5. Railway
`https://github.com/alisheib/kipindi.git`, branch `main`. Push to main → Railway builds + runs `prisma migrate deploy && … && next start`. Treat DB writes/migrations to prod as deploy-only (§4).
- **CLI account: `alisheib07@gmail.com`** (interactive `railway login` / `railway login --browserless` → give Ali the pairing URL to approve; login is GLOBAL — it displaces the awarkeh CLI login, so the awarkeh session must re-login as awarkehmobiles@outlook.com afterward).
- **Project `50pick` = `5e87353c-1d59-433d-a683-a32b9149f74c`**, env `production`, app service **`50pick`** (`railway link -p 50pick`; multiple Redis services exist — likely unused, rate limiter is in-memory).
- **Logs:** `railway logs -s 50pick` (instrumentation prints `[snag]` blocks per server error, and boot warnings). This is how the C7 outage was diagnosed.
- **Prod DB host is `postgres.railway.internal`** — only reachable inside Railway (`railway run --service 50pick -- <cmd>` injects it) or via the admin UI; NOT from a local script. `scripts/ops-clear-conflicted-override.mjs` is meant to run under `railway run`.
- If email/payments break in prod, check the provider secrets first (`SELCOM_/AZAMPAY_/MIXX_WEBHOOK_SECRET`, exact names — audit H7; prod is currently missing AZAMPAY/MIXX).

## 6. Money-code invariants (do not break)
- **Lock order is wallet → market.** Refund/bonus/referral helpers take the wallet lock, so they run OUTSIDE the market lock (queued after release) to avoid deadlock.
- **Claim the row:** money writes use conditional updates (`updateMany WHERE status = the status you read`) so a race can't double-spend/pocket cash.
- **RG caps re-checked INSIDE `withLock`** (audit C4); `sumDepositsSince(...true)` counts PROCESSING for the cap/SOF only.
- **Fee = `min(commissionRate·pool, feeCeilingRate·smaller)`**, frozen per poll (`feeSnapshot`). A winning bet is never paid below stake (`assertWinnerFloor` throws rather than underpay). Single source: `src/lib/payout.ts` (isomorphic).
- **Taxes are only ever on 50pick's commission**, never a player's money. The old 15% withholding tax is deleted.
- **POCA §16:** `getConflictedResolutionAllowed()` returns false in production unconditionally; `boot-checks.ts` refuses to boot if the flag is on. Never remove.
- **Bonus never evaporates on void** — `refundBonusToActive` mints a zero-wagering restitution grant (audit C2).
- **Webhook:** timestamp mandatory + HMAC over `${timestamp}.${body}`; amount verified vs the initiated txn (C5/M4).
- Design authority: `docs/DESIGN_AUTHORITY.md` (royal 268, single dark theme). Never build from the deleted teal kit.

## 7. Done — formerly-deep items now closed + live (do NOT re-open as "todo")
- **C3 — DONE + LIVE.** Wallet+txn+ledger writes are in one Prisma `$transaction` across ALL
  money paths (incl. bet placement @595901e); a correct wallet↔ledger trial balance
  (accounts for hold/pending/bonus) runs nightly + surfaces on `/admin/finance`.
- **C6 — DONE + LIVE.** The audit chain is DB-authoritative (advisory lock + SQL head-select +
  `@@unique([prevHash])` + `await persist()`), verified on `s10-cross-instance`.
- Both were verified on the local PG (§3). Kept here as a note so a new session doesn't
  mistake them for open work.
