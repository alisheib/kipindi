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
| Error tracking | ⚠️ **Durable, not alerting** — exceptions persist to the audit chain (scrubbed + deduped, `test:monitoring`); no `@sentry/*` installed, so nothing pages anyone |
| Database backups | ⚠️ **Toolchain built, never run for real** — `db:backup`/`db:verify-backup`/`db:restore` + `test:backup`; needs scheduling, an off-box destination, and one real drill |
| KYC storage | `@aws-sdk/client-s3` is installed; R2 needs bucket + env to be switched on |
| Multi-container | ❌ unsafe — `admission.ts`, `rate-limit.ts` and the ticker keep state in module scope |

### The four things that would hurt most, worst first

1. ✅ **Backups — DONE 2026-07-30. THE DRILL HAS BEEN RUN AGAINST PRODUCTION.** A sealed
   13 MB artifact was taken, shipped, restored into a throwaway PostgreSQL 18.3, checked
   by 79 assertions, and `db:restore` was rehearsed to exit 0. `/admin/compliance` now
   reads that run. Nightly at 00:15 UTC via `.github/workflows/backup-nightly.yml`.

   🔴 **The drill found EIGHT defects, and that is the finding.** The toolchain had been
   green on 59 checks the whole time. Among them: `db:restore` summed a column that does
   not exist and so **reported a successful recovery as a failure**; the seal key had two
   different names, so the one tool needed during a recovery could not open what the other
   two produce; **a unique index was missing from every artifact ever written** (an FK's
   `conindid` made the index filter skip it) — row counts, money and the audit chain all
   still matched, and the only symptom would have been a duplicate months later; the dump
   read data and invariants on different connections, so a live platform made the manifest
   contradict itself; and two of the files **could not be parsed** while
   `npm run typecheck` reported success, because `.mts` is outside the root tsconfig.
   Full list and what changed: [`BACKUP-RUNBOOK.md`](BACKUP-RUNBOOK.md).

   ⚠️ **Source problems are not backup problems.** The first verification ended in "DO NOT
   TRUST THIS BACKUP" over four failures that production reports identically. The artifact
   was flawless. Verification now compares restored-vs-**source**, and the source's health
   is reported separately — otherwise the nightly is red forever and people stop reading it.

   ⏳ **Operator actions left:** add the repository secrets (the workflow fails its config
   check until then, deliberately), and create an `R2_BACKUP_BUCKET` **separate** from the
   KYC bucket. `BACKUP_ENCRYPTION_KEY` was generated locally into `.env.backup.local`
   (gitignored) — **copy it into a password manager**; a key that lives only where the
   database lives is not a key.

   🔴 **A live money finding the drill surfaced, needing Ali:** one wallet holds
   **TZS 100,000 with no ledger entry, no `Transaction` and no audit row**, and the audit
   chain reports a broken link. Both are on production, both are on `/admin/compliance`
   under the backup card, and neither is a backup problem. See the runbook's "Open
   finding" section for what was and was not confirmed about its origin.

   ⚠️ Worse, until 2026-07-29 `/admin/compliance` rendered a **hardcoded green ✓**
   reading *"Auto-snapshot on every mutation · HMAC-signed · last 12 retained ·
   disk-backed"*, and `/admin/system` stated *"Backup → Postgres point-in-time recovery
   … replicated across two regions"* as fact. None of it existed: no script, no snapshot
   writer, and nothing reads `STORE_BACKUP_DIR` (it survives only in `.gitignore`). The
   tick sat beside the audit-chain card, which reads live state, so it borrowed real
   credibility. Both now state the truth. **When you build backups, wire this card to the
   REAL last-run state — do not restore a static tick.**
2. ✅ **Error tracking — CODE COMPLETE 2026-07-30, one operator action left.**
   `@sentry/node` is installed and the seam is **proven end to end**: `test:alerting`
   (27 checks) points a real Sentry client at a throwaway HTTP server on `127.0.0.1`,
   pushes a real error through the real `captureServerError`, and inspects the bytes that
   arrive. **Ali sets `SENTRY_DSN` and redeploys — that is the whole remaining step.**

   🔴 **That gate found a dormant data-protection bug.** `captureException` was handed the
   **raw** error while only the audit sink ran `scrubForAudit`. The scrubber sat one line
   above the call that ships data off-box and was not applied to it, so the *first alert
   ever sent* would have carried a player's phone number out of Tanzania. Proven, not
   argued: delete `beforeSend` and the gate catches a real `+255…`, a real email and a
   real NIDA in the envelope on the wire. It was invisible only because no DSN was ever
   set. Now every string in an event is scrubbed — messages, stack frames, breadcrumbs,
   `extra`, framed local variables — cycle-safe, built on the same `scrubForAudit` the
   audit sink uses so the two lists cannot drift.

   **Durable ≠ alerting, and both `/api/health` and `/admin/compliance` now say which is
   which.** Until the DSN is set the card reads "Durable — but nobody is paged".

   Historical detail below.

   ~~**HALF CLOSED.**~~ ✅ Production exceptions are **durable**:
   `onRequestError` → `captureServerError` writes a PII-scrubbed, deduped `SYSTEM /
   server.error` audit row (stack included, repeat-count carried) alongside the `[snag]`
   log. This mattered more than it sounds — chasing a payout failure ten minutes old that
   day, Railway's log buffer had **already rolled past it**, so nothing survived to find.
   Guarded by `test:monitoring` (23 checks, scrubber driven behaviourally).
   ⚠️ **Still missing: ALERTING.** Nothing pages anyone; you must go and look. `monitoring.ts`
   is a ready seam — `npm i @sentry/node` + `SENTRY_DSN` activates the off-box mirror with no
   other code change. Sending a licensed operator's data off-box is Ali's call.
3. **Withdrawals cannot be paid — and as of 2026-07-30 we know exactly why.** ~~Blocked on
   the Selcom float PIN (`PAYMENT_VENDOR_PIN`).~~ The PIN is set. **The disbursement float
   is EMPTY**, confirmed by Selcom's own `990 "Insufficient account balance"` on a real
   dispatch. Deposits do NOT fund it: collections and the payout float are separate
   balances at Selcom, and the float is prepaid. **Waiting on Selcom to say how to top it
   up.** Players can put money **in** and not take it **out** — the single worst asymmetry
   a gambling operator can ship, and a licence question, not just an ops one.
   Full state: [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state.
4. ~~**`scripts/gift-admin-credit.ts` still exists.**~~ ✅ **DONE 2026-07-30.** Deleted, along
   with `docs/OPERATOR-CREDIT-TOOLS.md` (per that file's own removal checklist);
   `scripts/credit-user.ts` was already gone. Nothing in the repo can mint balance now
   except `scripts/seed-test-float.mjs`, which **refuses outright when
   `NODE_ENV=production`** and is guarded by `test:float-guard`. ⚠️ Step 4 of that
   checklist — **rotate the Postgres password** — is still outstanding and is Ali's call.

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
- **Lifecycle ticker:** serial sweeps on a 60s interval guarded by a process-local boolean.
  Past one pass > 60s it starts skipping. ✅ **No longer silent (2026-07-30):** each skip is
  logged with how long the pass has held and which chores did not run, consecutive and
  lifetime counts are kept, a COMPLIANCE audit fires after 5 consecutive skips (~5 min of
  stalled payment reconcile), and `/api/health` reports `ticker`. Guarded by
  `test:payout-observability` §7. The ceiling itself is unchanged — a pass still has to fit
  in 60s; you will now simply know when it does not.

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

**2. Error tracking — the durable half is DONE (2026-07-30); what remains is alerting.**
Server exceptions now persist to the audit chain, PII-scrubbed and deduped, so they survive
the log buffer. What is still missing is anything that *tells you* — install `@sentry/node`,
set `SENTRY_DSN` (the seam in `monitoring.ts` needs no other change), and prove it by
triggering a real error and watching it arrive. The scrubber already runs before anything is
written, so the PII work is not repeated — but re-verify it before data leaves the box.

**3.** ~~Remove or hard-gate `scripts/gift-admin-credit.ts`~~ ✅ **DONE 2026-07-30** — see the
correction above. The only remaining balance-minting path is `seed-test-float.mjs`, which
refuses in production and is guarded by `test:float-guard`. **Still outstanding: rotate the
Postgres password**, and the credentials exposed in chat (API key, vendor PIN, Railway token).

**4. Withdrawals.** Confirm the `PAYMENT_VENDOR_PIN` blocker with Ali. Until it clears,
make sure the product tells a player the truth about when they can take money out — an
operator that accepts deposits while withdrawals are down must say so plainly.

**5. Scale ceilings, cheapest first.** The leaderboard N+1, `txn.listAll()`, the missing
composite indexes, then the SSE ceiling. Each has a measured threshold in
`POLISH-BACKLOG.md` §3 — fix the ones that bite first, and **state the new ceiling you
measured** rather than declaring it solved.

**6. Multi-container readiness** — ✅ **the dangerous half is CLOSED (2026-07-30).** The
lifecycle chores run behind a **leader lease** (`src/lib/server/leader.ts`): a short-lived
`SystemConfig` row claimed and renewed inside a Postgres advisory lock, so the
read-then-write is atomic across containers. Fails **closed** (an unreachable database
returns `false` — driven, 2.1 s), hands the lease back on `SIGTERM`, and expires on its own
if a container dies holding it. `/api/health` reports the holder.

Proven by `scripts/load/s12-leader-contention.mts`: **two real OS processes** racing
against real Postgres, 10/10, now in CI beside s10/s11. It cannot be proven in-process —
`leader.ts` keeps its instance id in module scope, so two calls in one process always
agree. Removing the advisory lock makes **both instances win**; that was run, and s12
caught it.

⚠️ Still per-container **by design**, each with a stated consequence in
`POLISH-BACKLOG.md` §3: `admission.ts` (Redis must never touch the bet path ⇒ N containers
need the DB pool sized N×; at pool 40 that is ~36 in-flight bets each), rate limits and SSE
fan-out (cross-container code exists in `redis.ts` but is **inert** until Ali sets
`REDIS_ENABLED=true` **and** `REDIS_URL` — until then two containers would each grant the
full OTP/login budget, audit H2), and the deposit fast-poll (idempotent on purpose).
Redis fail-open verified against a dead port: 2 ms, then 0 ms, never throws.

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
