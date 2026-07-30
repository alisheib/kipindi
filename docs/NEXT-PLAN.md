STATUS: the next plan. Written 2026-07-29, immediately after the design system was
frozen and shipped. **Nothing in here has been started.**

# 50pick — next plan: LAUNCH HARDENING

The design pass is done and live. Design is no longer a source of risk: it is frozen
behind `test:design-frozen`, and a change is a token edit in one place.

**What is left is not features. It is the things that decide whether a live real-money
platform survives its first bad day** — a lost database, an error nobody sees, a second
container, a withdrawal that cannot be paid.

This file is the brief. Copy the block at the bottom into a fresh session.

---

## Where we actually stand (verified 2026-07-29, not assumed)

| | State |
|---|---|
| Live | `www.50pick.tz`, Railway project `50pick` / `production`, deploy `SUCCESS` |
| Money mode | **TEST** — deposits real via Selcom, withdrawals blocked |
| Test suite | **104** `test:*` scripts; `test:all` 102/104 (2 are browser tests needing a live server) |
| Design | FROZEN + LIVE (B9/B10, `test:design-frozen`) |
| Error tracking | ❌ **NONE INSTALLED** — no `@sentry/*` in `package.json` |
| Database backups | ❌ **NO backup or restore script exists** in `scripts/` |
| KYC storage | `@aws-sdk/client-s3` is installed; R2 needs bucket + env to be switched on |
| Multi-container | ❌ unsafe — `admission.ts`, `rate-limit.ts` and the ticker keep state in module scope |

### The four things that would hurt most, worst first

1. **No backups — and the admin console was claiming otherwise.** A licensed real-money
   operator with player balances and a settlement ledger has **no `db:backup`, no
   `db:restore`, no verified restore drill.** Everything else on this list is
   recoverable. This is not.

   ⚠️ Worse, until 2026-07-29 `/admin/compliance` rendered a **hardcoded green ✓**
   reading *"Auto-snapshot on every mutation · HMAC-signed · last 12 retained ·
   disk-backed"*, and `/admin/system` stated *"Backup → Postgres point-in-time recovery
   … replicated across two regions"* as fact. None of it existed: no script, no snapshot
   writer, and nothing reads `STORE_BACKUP_DIR` (it survives only in `.gitignore`). The
   tick sat beside the audit-chain card, which reads live state, so it borrowed real
   credibility. Both now state the truth. **When you build backups, wire this card to the
   REAL last-run state — do not restore a static tick.**
2. **No error tracking.** Nothing reports a production exception. The only reason we know
   the site is healthy is that someone ran a script by hand. A silent 500 on the deposit
   path could run for days.
3. **Withdrawals cannot be paid — and as of 2026-07-30 we know exactly why.** ~~Blocked on
   the Selcom float PIN (`PAYMENT_VENDOR_PIN`).~~ The PIN is set. **The disbursement float
   is EMPTY**, confirmed by Selcom's own `990 "Insufficient account balance"` on a real
   dispatch. Deposits do NOT fund it: collections and the payout float are separate
   balances at Selcom, and the float is prepaid. **Waiting on Selcom to say how to top it
   up.** Players can put money **in** and not take it **out** — the single worst asymmetry
   a gambling operator can ship, and a licence question, not just an ops one.
   Full state: [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state.
4. **`scripts/gift-admin-credit.ts` still exists.** A tool that mints real balance, in the
   repo, at public launch. It must be gone or hard-gated before the doors open.

### Known scale ceilings (measured, from `POLISH-BACKLOG.md` §3)

Each is fine today and bites at a stated threshold — none is speculative:

- **~125 concurrent SSE clients** (`event-bus.ts` `setMaxListeners(500)`, 4 listeners per
  client) on a product whose pitch is live odds.
- **~1k users:** the public leaderboard runs `db.user.list()` with no `where`/`take`, then
  one positions query per user, uncached. Whoever shares that link is the trigger.
- **~1k users:** `db.txn.listAll()` walks the whole transactions table into memory from
  12+ call sites — while the adjacent `txn.search` does it correctly and its own comment
  says the table "must never be walked in memory".
- **Multi-container is unsafe today.** Correct only because production runs ONE container.
- **Lifecycle ticker:** serial sweeps on a 60s interval guarded by a process-local
  boolean. Past one pass > 60s it silently starts skipping, and nothing alerts.

---

## What still governs (read before touching anything)

- `CLAUDE.md` — how this repo works
- `docs/DESIGN_AUTHORITY.md` — B1–B10, and "what the freeze pass found — do not undo"
- `docs/design-system/v2-2026-07-27/06-patterns-and-rules/` — RULES.md (16 laws) +
  MERGE-DISCIPLINE.md
- `docs/perfection-plan.md` — the 0-issue launch plan and its 9 role gates
- `docs/LAUNCH-GO-NO-GO.md` — the env/infra checklist
- `docs/POLISH-BACKLOG.md` — §2 FIX SOON and §3 LATER are still open; §1 and §4 are done
- `docs/GO-LIVE-RUNBOOK.md`, `docs/SELCOM-DISBURSEMENT-ACTIVATION.md` — payments ops

---

=== BEGIN NEXT PROMPT ===

You are working in the **50pick** repo (`kipindi-main`), a licensed real-money prediction
platform that is **already live** at `www.50pick.tz` in TEST money mode. This is the
**launch-hardening** pass. It is not a feature pass and not a design pass — design is
frozen and must not be reopened.

Read first: `CLAUDE.md`, `docs/NEXT-PLAN.md` (this file's "where we stand"),
`docs/DESIGN_AUTHORITY.md`, `docs/perfection-plan.md`, `docs/LAUNCH-GO-NO-GO.md`,
`docs/POLISH-BACKLOG.md` §2–§3.

**Verify every claim above before you act on it.** The last pass found three test gates
that were passing while the thing they guarded was broken — a contrast audit that
hardcoded the token values it was meant to check and hid a real AA failure, a bridge test
querying the wrong Tailwind map, and a component that re-typed its own tokens by hand. A
green gate is evidence, not proof. Check the artifact the user actually receives.

### Work in this order — worst risk first

**1. Backups, and a PROVEN restore.** There is no backup script at all. Build
`db:backup` / `db:verify` / `db:restore`, schedule it, and then **actually restore into a
scratch database and diff it**. An unverified backup is not a backup. Player balances and
the settlement ledger are the assets.

**2. Error tracking.** Nothing reports a production exception today. Install it, wire the
server + client + edge paths, scrub PII (phone, NIDA, email) before anything leaves the
box, and prove it by triggering a real error and seeing it arrive.

**3. Remove or hard-gate `scripts/gift-admin-credit.ts`** and anything else that can mint
balance. Flag to Ali rather than silently deleting if it is load-bearing for TEST mode.

**4. Withdrawals.** Confirm the `PAYMENT_VENDOR_PIN` blocker with Ali. Until it clears,
make sure the product tells a player the truth about when they can take money out — an
operator that accepts deposits while withdrawals are down must say so plainly.

**5. Scale ceilings, cheapest first.** The leaderboard N+1, `txn.listAll()`, the missing
composite indexes, then the SSE ceiling. Each has a measured threshold in
`POLISH-BACKLOG.md` §3 — fix the ones that bite first, and **state the new ceiling you
measured** rather than declaring it solved.

**6. Multi-container readiness** — `admission.ts`, `rate-limit.ts`, the ticker's
`lastReconcileAt`. Only correct today because production runs one container. Decide with
Ali whether this pass makes it safe or documents it as a hard constraint.

### Rules

- **Money paths are gated.** Anything touching payout, settlement, the ledger or wallet
  needs the money suite green (`test:money-invariants`, `test:fee-model`,
  `test:settlement-gate`, `test:concurrency`, `e2e:money`) plus a stated reason it is safe.
- **Do not reopen design.** No token edits, no component restyling. If something looks
  wrong, write it down for a later pass.
- **Every push to `main` is a LIVE deploy.** Work on a branch, run the gates, stop for Ali.
- **Same change updates code AND docs.** No new tracker files — update the doc that already
  owns the subject, and delete this file's items as they are finished.
- **`npm run test:all` before you claim done**, and drive the real site, not just the suite.

=== END NEXT PROMPT ===
