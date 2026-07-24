# 50pick — next-session prompt (copy-paste)

> Self-contained continuation prompt. Rewritten 2026-07-24 after the single-admin
> resolution + switchable-payments session. (The previous 2026-07-17 GO-LIVE prompt
> is retired — go-live happened, and its solo-resolution section is now wrong: that
> override was deleted.)

---

You are continuing work on **50pick** (repo `F:\kipindi-main`, branch `main`; Node 24).
Read `.claude/skills/50pick-standards` + `.claude/skills/50pick-audit` first, and
`docs/COMPLIANCE-DECISIONS.md` (newest entries first) before touching resolution or payments.

**Standing rules (Ali):**
- Work on `main` and **commit + push cleanly yourself** — every push to `main` is a LIVE deploy.
- **One control, one place** — never let two surfaces edit the same setting.
- Full QA before EACH commit, run more than once. Update docs/trackers alongside every change.
- Player surfaces never narrate ops detail; real data or nothing (no fabrication).
- ⚠️ **A Railway deploy can FAIL after a clean build.** After pushing, ALWAYS run
  `railway deployment list` — a 200 from the site does NOT mean your commit is live.
  Verify with a code marker (a changed string), then `railway redeploy --service 50pick
  --from-source --yes` if the deploy failed. Railway CLI = **alisheib07**.

**Live state (verified 2026-07-24, main @ `6ee1e5a`, deploy `17c3af50` SUCCESS):**
- Prod is **TEST money-mode** (`TEST_FUNDING=true`) on `https://www.50pick.tz` (+ apex, both 200).
- Boot clean: 44 migrations (none pending), 19 market timers armed, ledger balanced.
- **Resolution:** single-admin is the permanent DEFAULT in all money modes — one admin
  resolves any market in one action, **even one they hold a position in**. The two-officer
  ceremony + officer-conflict block are RETIRED. Two-admin authorization is an OPTIONAL
  toggle in the **resolver-queue header only**, one flag `requireTwoOfficer` (default false)
  in `src/lib/server/resolution-policy.ts`. No real-money hard-lock.
  ⛔ Do NOT re-add an officer-conflict block, and do NOT expose that flag anywhere else
  (not RateConfig, not `/admin/config`). `test-overrides.ts` is DELETED and a
  `content-integrity` **RESOLVE** guard fails the build if its symbols return.
- **Payments:** provider is operator-switchable (**mock ↔ Selcom**) from `/admin/payments`
  in ANY money mode — no Railway env change, no redeploy. Switching to the mock while real
  money is LIVE needs a typed **"MOCK"** confirm, writes a COMPLIANCE audit, and shows a
  persistent simulation banner + "· SIM" chip. Only surviving gate: a real provider needs
  its creds. Kill-switch = the emergency stop. `selcomAdapter` is WIRED; azampay is a stub.
- **Settlement:** per-market timers (no `AUTO_SETTLE`, no global sweep). Auto-resolve is an
  owner toggle in the **AI toolkit** top-bar dropdown (the one place for every AI switch).

**Gate to run before any push** (prod is TEST money-mode):
```
npx tsc --noEmit && npm run build && npm run test:all
# real Postgres (F:\pg-loadtest is a local PG16 on :5433):
DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=<fresh>' \
  USE_PRISMA_DAL=true npx prisma db push --skip-generate --accept-data-loss
DATABASE_URL='...same...' USE_PRISMA_DAL=true npx tsx scripts/money-e2e.test.mts   # expect drift 0.00
# visual (needs: DISABLE_ADMIN_TOTP=true npm run dev):
BASE=http://localhost:3000 node scripts/resolver-queue-shots.mjs
BASE=http://localhost:3000 node scripts/payments-control-shots.mjs
```
Last known green: `test:all` **84/84**, `e2e:money` **63/63 drift 0.00** (both single-admin
and two-officer paths), visual 0 overflow / 0 console errors.

**Known non-issues (don't chase):**
- Boot warns `AZAMPAY_WEBHOOK_SECRET` / `MIXX_WEBHOOK_SECRET` unset — those providers aren't
  contracted. Selcom's secret IS set.
- `resolver-queue-shots.mjs` can report "toolkit switch MISSING" — the AI-toolkit dropdown
  sometimes doesn't open headlessly. The labels DO match the code; it's harness flakiness.

**Open / next candidates (Ali's call):**
- Withdrawals still need their own Selcom creds + `PAYMENT_VENDOR_PIN` (deposits are live-capable).
- ⛔ **REMOVE before public launch:** the dev/test money-credit CLI scripts in the repo; rotate
  the leaked DB password.
- `NEXT_PUBLIC_LICENSE_REF` is still the placeholder `TZ-GBT-2026-XXXX`.
- See `docs/perfection-plan.md` and `docs/feature-backlog.md`.

Tell me what you want to work on, or say "audit" and I'll run the standards + audit skills
across the current state and report findings before changing anything.
