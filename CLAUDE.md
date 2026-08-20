# 50pick — Claude Onboarding

<!-- Note: the git repo/dir is legacy-named `kipindi-main` and prod env may still
     carry `kipindi-*` deploy hosts / SMS sender — those are infra, not brand.
     The product is "50pick" everywhere user-facing. -->


> Read this first. It tells you what's true about the codebase right now,
> and where to look before editing anything.

---

## ▶ START HERE — new machine, new session, or new person

| Go to | For |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | **Getting this running on a machine that has never seen it.** Prerequisites, install, how to boot with no database, and the eight symptoms that waste an afternoon. |
| [`docs/README.md`](docs/README.md) | **The doc index** — every doc at that level, each with a status. From the outside a snapshot of a Tuesday in May looks identical to a law. ⚠️ This row used to say "42 docs" and the index itself said 45; the real number was **59**, and eleven were unindexed. A count restated in two places is a count that will disagree with itself — so neither states one now. |
| [`docs/NEXT-PLAN.md`](docs/NEXT-PLAN.md) | **Current state.** Opens with "PICK UP HERE": what shipped last session, what to start on, what not to touch. |
| [`docs/MODULE-CERTIFICATION-PROGRAM.md`](docs/MODULE-CERTIFICATION-PROGRAM.md) | **The programme that finishes the platform** — 52 modules, 8 gates, the 12 laws, the status board. |

⚠️ **About the rest of this file.** The block below (and much of the first ~140 lines) is an
accumulated status log written over months. It is excellent on **how things work** and unreliable
on **what is currently true** — e.g. it still says the payment-aggregator API keys are the one
remaining unblock, which was resolved long ago. **For current state trust `NEXT-PLAN.md`; for
mechanics trust this file.** When the two disagree, `NEXT-PLAN.md` wins and this file should be
corrected.

---

> ⏳ **ACTIVE WORK — pre-real-money launch.** The **Final Audit is COMPLETE** (all
> 11 Criticals + Highs + Mediums, record: [`docs/perfection-plan.md`](docs/perfection-plan.md))
> **and the §9 enhancement batch is DONE + LIVE.** Money-ops (A1–A5, M2 exact payouts,
> audited balance-adjust + force-reverify-KYC) and Session-E's §9 UI/compliance work
> (A8 unified maker-checker · A9 config factory · A10 money-format guard · A11 six
> popups→`<Modal>` · A17/§9.2/§9.4 · A18 tap-targets · A19 carousels) merged
> zero-conflict @ `023dfbf` and verified on prod. **ALL money paths are now atomic** —
> bet-stake single-`$transaction` merged @ `595901e` (2026-07-17; verified e2e:money
> 57/57 + e2e:fault 34/34 + s10). **GBT licence obtained.** The go-live mission
> (DNS→R2→payment keys→the switch) is `docs/NEXT-PLAN.md`. **Nothing in
> the plan now blocks launch — the one remaining unblock is the payment aggregator
> API keys.** Remaining code = optional admin features (A6/A7/A13–A16) + polish.
> 💳 **MOBILE-MONEY DEPOSITS NOW WORK END-TO-END (2026-07-20) — full record:
> [`docs/SELCOM-API-DIGEST.md`](`docs/SELCOM-API-DIGEST.md`).**
> EVERY mobile-money deposit had been failing: `create-order-minimal` requires `no_of_items`
> and only the CARD path sent it (`4256d02`). Found only because failure diagnostics were added
> first (`0abdef6`) — the adapter used to `catch { return PROVIDER_DOWN }` and discard Selcom's
> own resultcode/message, so a real failed deposit left NO explanation anywhere. Selcom's reason
> is now written into the `deposit.failed` **audit payload**, which survives log rotation.
> ⚡ **Credit is ~15s, not 30min:** `creditConfirmedDeposits()` re-queries the signed
> order-status on its OWN 15s timer (`lifecycle.ts`, separate from the 60s tick).
> ⚠️ **The lane can ONLY confirm — never fail/reverse/terminalise.** That asymmetry is why
> polling 4×/min is safe; all terminal decisions stay in the 30-min sweep. Do not "simplify" it.
> ⚠️ **Selcom's WEBHOOK NEVER ARRIVES** (zero webhook audit entries, ever) — polling is doing
> the primary job, which is backwards. Ask Selcom to enable callbacks for the vendor.
> 🔴 **FOUR MONEY-SAFETY DEFECTS CLOSED** (`ab72f77`, `6825a32`, `1ec60ca`): approving a
> withdrawal in `/admin/aml` released the hold, credited EXTERNAL in the ledger and emailed
> "on its way" with **ZERO gateway calls** (worst ≥1M, which returned a FABRICATED providerRef
> before the float-PIN guard); a deposit landing after self-exclusion was kept with **no ledger
> entry at all** (trial balance stayed clean *because* nothing was posted) — now booked to
> `HOUSE:RG_SUSPENSE`; reconcile blind-reversed live payouts on `UNSUPPORTED`; and approving a
> **deposit** was equally unsafe (no wallet-credit path). ⛔ **AML approval is BLOCKED for both
> types** — re-enabling means dispatch FIRST, then let `settleWithdrawalConfirmed` own the
> terminal state. ⛔ Never credit `PLAYER` for RG-suspense money (it is trial-balanced against
> the wallet → permanent false drift). **The deposit CREDIT path was audited and is sound —
> double-credit is impossible; do not touch it.** Email is **Postmark**, not Resend.
> 🔴 **PRICE HISTORY WAS FABRICATED — FIXED + LIVE @ `6b1975b` (2026-07-20).** `seedHistory()`
> generated a synthetic LCG random walk and `/markets/[id]` rendered it as real price history
> to real-money bettors, on EVERY market, after EVERY deploy (history lived in a Map that each
> deploy wiped, so the "legacy demo markets only" guard never held). This broke the platform's
> own **A-5 no-fabrication rule** that `market-card.tsx` cites and obeys — which is exactly why
> the card sparkline was blank while the detail chart drew a confident curve. Now: real
> `MarketSnapshot` table, `seedHistory` **deleted**, charts start EMPTY and fill with real bets.
> ⛔ **Never reintroduce a fallback that invents chart points** — guard at `npm run test:history`
> (rejects a seeder by name AND any LCG constant, so a rename does not slip past; verified to
> fail when the bug is reintroduced). Two things the fix surfaced: `recordSnapshot` is called
> **fire-and-forget** from six sites on the bet path, so every history WRITE must swallow its own
> errors (an unhandled rejection kills the container mid-bet); and boards must use
> `getCardCharts()` — never map `getCardChart` across a list. Migration was **pre-applied via
> Railway before the push**, so boot logged "No pending migrations" and could not fail. Access +
> deploy model: `.claude/skills/railway/`. Outstanding polish/i18n/scale backlog (audited, ranked,
> nothing shipped): **`docs/POLISH-BACKLOG.md`**.
> 🚀 **GO-LIVE (2026-07-18) — CARD DEPOSITS + EMAIL-GATED MONEY-IN SHIPPED @ `3a31a87`.**
> **DNS is DONE**: `50pick.tz` AND `www.50pick.tz` both resolve to Railway and serve the
> app (the old "Apache parking page" warning is obsolete — verified 2026-07-18).
> R2 KYC storage **LIVE** (bucket `50pick-kyc`).
> **Card deposits LIVE** (Selcom hosted checkout: `create-order` → gateway → `/wallet/deposit/return`
> → signed order-status re-query → exactly-once credit) + **player receipts** (`/wallet/receipt/[id]`).
> **Email is now mandatory at sign-up and GATES THE FIRST DEPOSIT**; sign-in takes email *or* phone.
> Ladder: browse free → confirm email to deposit → KYC to withdraw.
> ✅ **SELCOM STATES/NOTIFICATIONS/VERIFICATION COMPLETED 2026-07-19.** Every deposit state
> (PROCESSING · CONFIRMED · FAILED · REVERSED) now has a player notification, an email where
> it matters, a truthful label and a receipt link; deposit emails carry BOTH the 50pick and
> the GATEWAY reference. The reconcile sweep — written, tested, and **never actually
> scheduled** — is now on the lifecycle ticker (Ali's call: deposits AND withdrawals), so a
> paid-but-unwebhooked deposit can no longer strand forever. A standing app-wide
> **unconfirmed-email bar** (kit `NoticeBar`) now shows the deposit gate everywhere, with
> Resend in the bar. Five auth/email defects fixed — the worst: **login was rewriting
> `user.email` from `PHONE_EMAIL_MAP` without clearing `emailVerifiedAt`**, laundering an
> unconfirmed inbox into a verified one (that env var is set in prod, to Ali's own number).
> Proof: `test:deposit-notifications` (71) · `test:auth-email-integrity` (28) ·
> `e2e:card` (100) · browser-journey 76×3 identical. See `docs/SELCOM-API-DIGEST.md`.
> ⚡ **BET CONCURRENCY — DEPLOYS 1 & 2 OF 5 SHIPPED 2026-07-19.** A bet used to pin
> THREE pooled connections (wallet lock tx → nested market lock tx → money tx), so the
> ceiling was pool÷3 and past it a raw Prisma `P2024` hit the player. Now: `withLock`
> carries its tx on an `AsyncLocalStorage`, a nested lock joins it, and `withMoneyTx`
> joins too — **1 connection per bet** (round-trips 39→34, txn-control 10→6). On top of
> that, **`admission.ts`** queues bets FIFO beyond `maxInFlight` (=pool−4, clamped to
> pool−2) with a 500-deep queue and a 15s budget, so **load becomes latency, not errors**;
> saturation surfaces as a retryable `BUSY`, never a raw DB error.
> **Measured on real Postgres, pool 20, ONE market: 200 concurrent bets → 200 succeeded,
> p95 1,507 ms, 0 TZS leaked, pool == Σ stakes, nothing shed.** (Old ceiling: ~9.)
> Harness: `scripts/load/spike-f-saturation.mts`; invariants: `npm run test:bet-admission`.
> ⚠️ **Two rules the collapsed transaction imposes — read before touching a money path:**
> (1) an abort must **escape `withLock`**; caught inside, the enclosing tx COMMITS the
> partial debit it meant to discard. (2) any **write** inside a lock must take the
> caller's `tx`, or it blocks on our own uncommitted row and hangs to the 30s timeout
> (`P2028`) — this is what `recordWageringCore` did. Reads are fine un-threaded (MVCC).
> `hashKey64` now lives in `lock-key.ts`: `audit.ts` needs only that pure helper and is
> reachable from the CLIENT graph, so importing it from `locks.ts` pulled
> `node:async_hooks` into a browser chunk and broke the build.
> 📋 Remaining: deploy 3 (transient retry) · deploy 4 (narrow market stamps + atomic pool
> deltas incl. cash-out) · deploy 5 (drop the market lock from the bet path — **only after
> a ≥1 week soak of deploy 4**). Plan: `docs/LOAD_DAY1_FINDINGS.md`.
> 🪪 **IDENTITY POLICY (Ali, 2026-07-19; widened 2026-08-19) — read
> [`docs/IDENTITY-POLICY.md`](docs/IDENTITY-POLICY.md).** ⚠️ That file was
> `NIDA-POLICY.md` until 2026-08-20 and was renamed because it stopped being about one
> document. **A player proves identity with ANY ONE of four: NIDA · passport · driving
> licence · voter's card.** The control is **format + uniqueness only (one DOCUMENT, one
> account)**. There is **no authority check and none is wanted** — `nida.ts` is a mock,
> and there is no endpoint at all for the other three — so `idVerifiedAt` means "format
> accepted", never "government confirmed". Identity assurance comes from the DOCUMENTS a
> human officer reviews, and the selfie is required on all four so that control is never
> weakened by widening the list. Two surfaces once claimed otherwise and are fixed:
> the admin KYC checklist said **"NIDA verified — government match"** (it told an officer
> a government had confirmed an identity, inviting a withdrawal release on evidence that
> does not exist), and player copy said withdrawals go only to a *"NIDA-verified account"*.
> **The mechanics are INTERNAL**: docs and admin state them plainly; player surfaces
> neither claim the check nor advertise its absence — and never name one of the four as
> though it were the only one.
> ✅ The 2026-07-19 "open gap" (an app-level read-then-write with no unique index, so two
> users submitting one national ID at the same instant both passed) was **closed
> 2026-07-31** by a partial unique index, and **widened 2026-08-20** to the tuple
> `("idType","idNumber")` so it spans all four documents.
> 🔴 **The residual gap that CANNOT be closed in code, and is stated to the Board in
> writing:** one human legitimately holds several of these documents, so per-document
> uniqueness does not stop one person holding two accounts on two different documents.
> `docs/COMPLIANCE-DECISIONS.md` (2026-08-20) is the record. Do not describe a
> `DUPLICATE_IDENTITY` rejection as though it blocked a different document.
> ✅ **OPERATOR ACTION 2 OF 2 IS DONE (2026-07-19).** The persisted `test.overrides`
> conflicted-resolution flag was cleared in production via
> `scripts/ops-clear-conflicted-override.mjs` (true → false, confirmed by the compliance
> warning disappearing from the boot log).
> ✅ **BOTH MONEY DIRECTIONS HAVE RUN END-TO-END — corrected 2026-08-08.** The two warnings
> this block used to carry are history: the `selcom` provider WAS flipped (deposits have been
> live since 2026-07-18/20 — the mobile-money and card records above are of real settled
> deposits), and *"withdrawals still need Selcom disbursement creds + float PIN"* stopped
> being true on 2026-07-27 (creds granted) and provably false on 2026-07-31, when **four real
> payouts settled end-to-end on `WALLET_CASHIN`** (2×1,970 on 07-31 08:04/08:06 + two more at
> 13:55/13:57 — `docs/SELCOM-PAYOUT-RAILS.md` § Current state 2026-08-02). The rail WORKS.
> ✅ **AND THE WITHDRAW FORM IS OPEN AGAIN — closed end to end 2026-08-10.** The last of the
> stuck payouts was returned through `/admin/payments` → *Return to player*, so the queue reads
> **0**, `derivePayoutStatus` returns **operational**, and the console shows *"PLAYERS ARE TOLD:
> ✓ OPERATIONAL"*. `PAYOUT_TEST_BYPASS_MSISDN` is cleared on Railway and `isPayoutTestBypass()`
> plus both call sites are **deleted** — one gate, everyone, no exceptions.
> 🔴 **WHAT ACTUALLY LIMITS PAYOUTS NOW IS THE FLOAT, NOT THE RAILS.** The console reads
> **TZS 88,645** and flags it *"low — payouts fail when it runs dry"*. ⛔ And the rail has NOT
> been exercised since the gate reopened (0 withdrawals, 0 cash-outs): **do not read settlement
> `BET_PAYOUT` rows as evidence the payout rail works** — those credit a wallet inside 50pick;
> a WITHDRAWAL is money leaving to Selcom, and only one of the two has been proven today.
> ⚠️ Only **one** rail is provisioned (`WALLET_CASHIN`); the ladder already skips the other two
> on their `NOT_ENABLED` probe, so there is nothing redundant to remove — Ali's call 2026-08-10.
> Full mechanics: `docs/SELCOM-PAYOUT-RAILS.md` § Current state 2026-08-10.
> ⚠️ `NEXT_PUBLIC_LICENSE_REF` is still the placeholder `TZ-GBT-2026-XXXX` — the footer shows
> it as "(pending)". Replace with the real GBT number before public launch.
> ⭐ **Full handoff + copy-paste go-live prompt: [`docs/GO-LIVE-RUNBOOK.md`](docs/GO-LIVE-RUNBOOK.md)**
> (money model, creds/PINs, integration, pending, the switch). Runbook: [`docs/GO-LIVE-RUNBOOK.md`](docs/GO-LIVE-RUNBOOK.md).
> ⚠️ do NOT merge the stale remote `feat/payment-adapter`.
> 🧭 **START HERE — two always-on skills:**
> • **`50pick-standards`** (`.claude/skills/50pick-standards/SKILL.md`) — **how we build**:
>   the quality bar, the 9-role gate, UI-kit & design discipline, the responsiveness matrix
>   (360/768/1280/1920), visual-verification discipline, testing discipline, copy rules.
> • **`50pick-audit`** (`.claude/skills/50pick-audit/SKILL.md`) — the ops playbook (safe
>   DB/migration workflow, Railway access, money invariants, ⚠️ every push = a LIVE prod
>   deploy, verify-after-push protocol).
> 📍 **Current trackers:** [`docs/perfection-plan.md`](docs/perfection-plan.md)
> (the finish-the-plan queue, grouped code-doable / needs-Ali / optional) ·
> [`docs/LAUNCH-GO-NO-GO.md`](docs/LAUNCH-GO-NO-GO.md) (pre-launch ops + payment-gateway
> map) · [`docs/PARALLEL-SESSION-COORDINATION.md`](docs/PARALLEL-SESSION-COORDINATION.md)
> (when two sessions run at once — Session M owns `main`/deploys/money/schema; Session E is
> branch-only).
> Work in stages; after each: test (**full `npm run test:all` before any money push**) →
> verify (tech/logical/visual/live-DB, against `kipindi-production.up.railway.app`) → update
> the trackers → commit → push `main`.

## What this is

**50pick** — Tanzania-licensed pari-mutuel
prediction-markets platform. Players pick YES or NO on a proposition
(sports, weather, macro, crypto, culture); winners share the pool minus
our commission. Mobile-first, trilingual EN + SW + ZH, regulator-ready.

## ⭐ THE MONEY RULES LIVE IN ONE FILE — [`docs/RULES.md`](docs/RULES.md)

**What we charge, what we permit and what we refuse is stated in `docs/RULES.md` and
nowhere else.** Fee, taxes, stake bounds, positions per market, bonus wagering, free
cancellation, the withdrawal fee, and the standard every failure message must meet — each
with where it is enforced in code, where it is configured, and which surfaces state it.

⛔ **Do not restate a rate here or anywhere else.** This block used to carry the fee rule in
full, and on 2026-08-14 it was the *first thing every session read* and it was **wrong** — it
still described `capped-commission` ("10% of the pool, never more than a third of the smaller
side") as THE rule under a "do not change" flag. An administrator was misled by exactly this
class of stale restatement. A number written twice is a number that will disagree with itself.

The one thing worth repeating here, because it is a mechanic and not a number:

- **RATES STICK TO THE MARKET.** Every market freezes its rates at creation
  (`PredictionMarket.feeSnapshot`). Settlement, cash-out and every preview read the
  **snapshot**, never live config — so retuning a rate cannot reprice a bet already placed.
  Use `ratesFor(market)`, not `getEffectiveConfig()`, in any money path. ⛔ A snapshot is
  never rewritten, backfilled or migrated; the two fee models never mix.
- Single source of the arithmetic: **`src/lib/payout.ts`** (isomorphic — client *and* server).
- The `negative` lean level is **deleted** — a winner cannot be paid below stake, so never
  write copy that says they might be.

- Proof: `npm run test:fee-model` · `test:loser-share-fee` · `test:money-invariants` ·
  `test:withdrawal` · `test:config` (+ `red:stake-bounds`).

- **Repo:** ⛔ **DO NOT COPY A `cd` OUT OF THIS FILE. Ask the shell instead:**

  ```bash
  hostname && pwd && git rev-parse --show-toplevel
  ```

  ⚠️ **Corrected a THIRD time, 2026-08-15.** This line has now been wrong on two different
  machines in three days. It said `C:\kipindi-main`; that was corrected on 2026-08-13 to
  `F:\kipindi-main` *"which does not exist on laptop A either"* — and on **2026-08-15 a session
  ran the whole day in `C:\kipindi-main` on `Ali-Blade15`, where `F:\kipindi-main` does not
  exist at all.** Both corrections were true about the machine the session was sitting at and
  false about the other one.

  ⭐ **THE PATH IS NOT A FACT ABOUT THE PROJECT — IT IS A FACT ABOUT THE MACHINE**, so this file
  is the wrong place to keep it and every attempt to keep it here has rotted within days. The
  measured mapping lives in the skill's §8b table, keyed by `hostname` so a session can tell
  which row is its own without guessing. Verify, never assume.
- **GitHub:** `https://github.com/alisheib/kipindi.git` (private)
- **Live site:** `https://www.50pick.tz` (the `kipindi-production.up.railway.app`
  address this line used to name is the pre-DNS Railway host, not where players are)
- **Operator:** Ali, Dar es Salaam (non-technical — lead on architecture
  and design decisions, ask in plain English).

## Stack

- Next.js 16 App Router · React 19 · TypeScript · Turbopack
- Tailwind CSS 3, design tokens in `src/app/globals.css` + `tailwind.config.ts`
- next-themes for light/dark
- Prisma 6.5 with managed Postgres on Railway. All entities have dedicated
  Prisma tables (`USE_PRISMA_DAL=true`). See `docs/DATA-LAYER.md` for the
  full architecture guide.
- Playwright for E2E (driven directly via the SDK, not @playwright/test)

## Source of truth

| Topic | File |
|---|---|
| ⭐ **THE DESIGN RULEBOOK — THE ONLY ONE, FOR ANYTHING VISUAL** | [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md). **Every design law, floor, ratio and threshold is in that one file** — palette, type, spacing, shape, accessibility floors, content honesty, haptics, elevation/motion, kit adoption, and the material law §M. You do **not** need any other design document to build correctly. Its **§0 is the filing law**: where a new design fact goes, and what every other design file actually is. ⛔ Before creating any design doc, brief, spec or plan, read §0 — a design file written anywhere else is a second definition of one truth, the defect this project has been burned by twice. Values are never restated in docs: they live in [`src/app/globals.css`](src/app/globals.css) / `motion.css`, which outrank every document. ⚠️ **Consolidated 2026-08-08** — nine files previously claimed to be the place to start, and three disagreed with the shipped code. |
| Design *record* (not rules) | [`docs/design-system/`](docs/design-system/README.md) is the delivered July-2026 archive + component redlines; [`docs/design-master-brief.md`](docs/design-master-brief.md) is palette *rationale*; [`docs/design-brief/`](docs/design-brief/README.md) is the before-picture and the commission. Each carries a "RECORD, NOT RULE" banner. ⚠️ `50PICK/design_handoff_prediction_market_kit/kit/` is a **SUPERSEDED snapshot** (teal 215, dead light theme) — historical only, do **NOT** build from it. |
| Prisma data model | [`prisma/schema.prisma`](prisma/schema.prisma) |
| In-memory store (Prisma-shaped) | [`src/lib/server/store.ts`](src/lib/server/store.ts) |
| Auth service | [`src/lib/server/auth-service.ts`](src/lib/server/auth-service.ts) |
| Market service / pool engine | [`src/lib/server/market-service.ts`](src/lib/server/market-service.ts) |
| Crypto (scrypt, HMAC, OTP) | [`src/lib/server/crypto.ts`](src/lib/server/crypto.ts) |
| Railway deploy notes + env vars | [`RAILWAY.md`](RAILWAY.md) |
| Postgres swap walkthrough | [`RAILWAY_DB_README.md`](RAILWAY_DB_README.md) |
| Flow architecture (every redirect + gate) | [`docs/FLOWS.md`](docs/FLOWS.md) |

## Auth — current state (June 2026 hardened)

**Phone + password** (interim). OTP code paths preserved — switch back
once SMS provider (Selcom/Beem) is signed.

### Registration flow
```
Form → Zod (phone, DOB 18+, terms) → password rules (min 8, common
blacklist) → rate limit (per-phone + per-IP) → withLock(register:{phone})
→ duplicate check → scrypt hash → create user + wallet → affiliate bind
→ createSession → redirect
```

### Login flow
```
Form → Zod phone → rate limit (per-phone + per-IP) → find user
→ check status (self-excluded/suspended/closed) → check lockout (5
fails → 30 min) → withLock(login:{userId}) → re-read fresh counter
→ verify password → on fail: increment + maybe lock → on success:
clear counter → admin bootstrap check → createSession → redirect
```

### Session system
- **Single active session per account.** New login on any device
  instantly revokes all prior sessions. The revoked device sees
  "Signed out — your account was signed in on another device."
- Server-side registry (`userId → activeSessionId`) in globalThis.
  Self-heals after Railway restart (first device to request claims slot).
- HMAC-SHA-256 signed HttpOnly cookie, SameSite=Lax, Secure in prod.
- 7-day absolute expiry + 24h idle timeout + 5-min refresh throttle.
- Every session event audited (create, expire, idle, revoke, destroy).

### OTP verification (for future SMS)
- Checks ALL active OTPs for a phone+purpose, not just the newest.
  Fixes SMS delivery-order mismatch (user receives OTP #1 after #2).
- On match: consumes ALL active OTPs for that phone+purpose.
- On no match: increments attempt counter on most recent OTP only.

### Race condition protection
- `withLock("register:{phone}")` — prevents duplicate user creation
- `withLock("login:{userId}")` — serialises password check + counter update
- Rate limit per-phone + per-IP on both login and register

### Chat history
Chat (`sessionStorage`) is cleared on logout/session-revoke so the next
user on the same browser starts fresh.

### Admin bootstrap
Set `ADMIN_BOOTSTRAP_PHONES=+255712345678,...` in Railway env.
Auto-promotes on both register AND login (idempotent, never demotes).

### Roles
`PLAYER | AGENT | MODERATOR | ADMIN | COMPLIANCE | SUPPORT`. Non-player
redirects to `/admin` after login.

## SMS — currently dummy

`src/lib/server/sms.ts` defaults to the `console` provider — OTP codes
print to stdout, never leave the server. Selcom / Beem / Africa's Talking
adapters are stubs. Until you sign Selcom or Beem, **OTP cannot be
delivered to a real phone** — that's the only reason auth is on
password right now.

## Persistence

All entities are stored in PostgreSQL via Prisma (`USE_PRISMA_DAL=true`).
Each entity has a dedicated table — no more JSON blob snapshots.
See `docs/DATA-LAYER.md` for the full architecture and how to add entities.

All wallet mutations are protected by `withLock("wallet:{userId}")` —
`deposit`, `withdraw`, `creditInternal`, `buyPosition`, `cashOut`,
`resolveMarket`, and AML reject refund. Zero unprotected balance
read-modify-write sequences remain.

**Lock implementation** (`src/lib/server/locks.ts`):
- **Production** (DATABASE_URL set): Postgres `pg_advisory_xact_lock(namespace, hash)`
  inside a `$transaction` — safe across multiple Railway instances. 30s timeout.
- **Dev** (no DATABASE_URL): in-memory Promise-chain mutex (single-process only).
- 31 call sites across 11 files, all using the same `withLock(key, fn)` API.
- Lock ordering: wallet before market (prevents deadlocks).

## Deploy workflow

🔴 **READ THE BRANCH, EVERY TIME, BEFORE COMMITTING — `git branch --show-current`.**

⚠️ **CORRECTED 2026-08-20. This note used to say the checkout sits on
`qa/live-experience`, so "a bare `git push` pushes the wrong branch and the deploy never
fires."** The checkout on this machine is on **`main`** at `F:\kipindi-main`, so a bare
`git push` **deploys the live real-money platform immediately**. The note promised the
exact opposite of the truth, and a second session shares this working directory.

⛔ Never `git add -A` or `git add .` here — stage the files you touched, by name, from the
current HEAD. (And never put a `#` comment on a command line: Windows `cmd` does not strip
them, so git reads the comment words as refspecs and errors.)

```
cd F:\kipindi-main
git branch --show-current   # main → the next push is a LIVE deploy
# Make your change
git add <files>
git commit -m "Sprint NN: short title — one-line summary"
git push                  # Railway auto-redeploys in 2–3 min
```

Required Railway env vars (set in service → Variables):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Railway Postgres connection string |
| `USE_PRISMA_DAL` | `true` for production |
| `SESSION_SECRET` | ≥ 32 chars; HMAC for session cookies |
| `OTP_PEPPER` | ≥ 16 chars; global pepper for OTP hashing |
| `ADMIN_BOOTSTRAP_PHONES` | comma-separated E.164 list — auto-promote on first register |
| `SMS_PROVIDER` | `console` (current) / `selcom` / `beem` / `africas-talking` |
| `SMS_SENDER_ID` | TCRA-licensed sender ID once SMS goes live |
| `NODE_ENV` | `production` on Railway |
| `NEXT_PUBLIC_APP_URL` | `https://kipindi-production.up.railway.app` |
| `TESTER_BOOTSTRAP_PHONES` | comma-separated E.164 list — auto-fund 100K TZS on register |
| `ADMIN_TEST_DEPOSITS` | `true` to enable uncapped admin deposits; unset = enabled in dev only |
| `ANTHROPIC_API_KEY` | Anthropic API key — powers chatbot + poll generation. Omit = stub mode |
| `POSTMARK_API_KEY` | Postmark Server API Token — transactional email. Omit = console stub |
| `PHONE_EMAIL_MAP` | Pre-KYC phone→email mapping: `+255NNN:a@b.com,+255MMM:c@d.com` |

## Email — Postmark transactional (June 2026)

`src/lib/server/email.ts` — Postmark-backed email service with console
fallback when `POSTMARK_API_KEY` is unset (same pattern as SMS).

- **Domain**: `50pick.tz` — DKIM + Return-Path verified on Postmark
- **From**: `noreply@50pick.tz` — all automated emails
- **Reply-To**: `support@50pick.tz` (falls through to `ali@50pick.tz`)
- **Sender Signatures**: `noreply@`, `support@`, `compliance@` — all `@50pick.tz`

### Emails sent automatically

⚠️ **Corrected 2026-07-31.** This section used to list nine emails and say the
rest were *"built but wired on demand as those features go live"*. **All 47 are
wired and sending** — verified by driving every one of them — and one of the
templates it named (`session revoked`) does not exist. A nine-row table on a
47-template system is how a reader concludes the other 38 are inert.

**The inventory is now code, not prose:
[`src/lib/server/comms-registry.ts`](src/lib/server/comms-registry.ts)** — every
template, its trigger module, its audience, its chrome and whether it is on a
money path. `npm run test:cert-c1` renders all 47 and fails if the registry and
the code disagree, so the list cannot go stale again.

| | |
|---|---|
| Templates | **47**, all wired to a real send call |
| Language | **EN + SW in ONE message**, locale-independent. There is **no Chinese in any email** and no per-locale variant — a deliberate, recorded position, not an oversight |
| Chrome | gold = earned money / earned status only; royal for everything else, enforced by the gate |
| Failure | `sendEmail` never throws. `SendResult.reason` distinguishes `sent` · `stub` · `no-address` · `suppressed` · `failed` — a caller that PROMISES the player an email must read it |

### Pre-KYC email binding

`PHONE_EMAIL_MAP` maps test phones to emails until KYC collects email
directly. Format: `+255777777777:ali@example.com,+255777777775:bob@example.com`.
The mapping runs at both registration and login, writing to `user.email`.

## Activating Claude AI features (chatbot + poll generation)

Both features share one API key from **console.anthropic.com** (pay-per-token,
separate from any claude.ai subscription).

### Setup steps

1. Go to **console.anthropic.com** → sign up or log in
2. **Billing** → add payment method → buy credits ($20–$100)
3. **Settings → API Keys → Create Key** → name it `kipindi-production`
4. Copy the key (starts with `sk-ant-api03-...`) — shown only once
5. **Railway** → kipindi service → **Variables** → add `ANTHROPIC_API_KEY` = the key
6. Railway auto-redeploys — both features go live

### What activates

| Feature | Model | Cost/call | Code path |
|---------|-------|-----------|-----------|
| **Chatbot** (AI Help widget) | `claude-haiku-4-5` | ~$0.001 | `src/app/_actions/chat.ts` — checks key, calls API, falls back to stub |
| **Poll generation** (4-layer pipeline) | `claude-sonnet-4-6` | ~$0.01–0.05 | `src/lib/server/ai-provider.ts` — swap `MockClaudeProvider` → `ClaudeProvider` |

The chatbot activates **instantly** when the key is set (no code change needed).
The poll pipeline currently uses `MockClaudeProvider` — uncomment the factory at
`ai-provider.ts:457-462` to switch to real Claude once the key is live.

### Cost estimate

At typical usage (500 chat messages/day + 50 poll generations/day):
~$2–5/day. Credits expire 1 year after purchase.

## Test scripts

Run with `node scripts/<name>.mjs`. They use the dev server on `:3000` and
hit dev-only helpers under `/api/dev-test/*` (returns 404 in production).

⚠️ **Corrected 2026-08-08 — three of the rows this table carried named DELETED files**
(`multi-player-resolution-e2e.mjs`, `notifications-redirect-test.mjs`,
`demo-auto-resolve-test.mjs`; verified by listing). Their coverage lives on in the
wired suites: settlement + money conservation in `e2e:money` (real Postgres) +
`test:settlement-gate` + `test:fee-model`; bet/win/loss receipts in
`test:updown-result-announce` + `qa:seal` (a REAL two-player settle, celebration
tied to the shilling). The rows below were re-verified to exist. The FULL runnable
inventory is `package.json` (`test:*` / `qa:*` / `e2e:*` / `ops:*` / `red:*`) plus
`scripts/orphan-allowlist.json` for by-hand drivers — trust those two, not a prose
table, for anything not listed here.

| Script | What it covers |
|---|---|
| `candidate-pipeline-e2e.mjs` | AI market-candidate state machine — seed L1–L4 fixtures, officer queue, approve/reject/publish, audit. 22/22. |
| `flow-architecture-e2e.mjs` | Every redirect + gate — auth gates, KYC gate, /not-found, SOF threshold gate, locale preservation. 16/16. |
| `visibility-states-test.mjs` | Top-bar / nav / CTAs per actor (public · player · admin). 44/44. |
| `responsive-overflow-test.mjs` | 393/768/1024/1280/1440 across all public + auth routes. 70/70. |
| `i18n-toggle-e2e.mjs` | EN/SW/ZH cookie + localStorage + `<html lang>` round trip + persistence. 13/13. |
| `report-renderers-smoke.mjs` | Renders every catalogue entry (5 reports × PDF + XLSX) and checks magic bytes. 11/11. |
| `break-it-player.mjs` | 23 manipulator scenarios — auth bypass, cookie tampering, stake validation, race, KYC, XSS, privilege escalation. |
| `break-it-admin.mjs` | 10 admin-portal QA scenarios — anon + player gating, TOTP cookie spoofing, forged Server Actions, CSV gating. |
| `multi-viewport-audit.mjs` | 99 routes × 4 viewports for layout overflow. |
| `overlay-responsiveness-test.mjs` | Notifications / language menu / avatar / reality-check inside viewport. |
| `screenshot.mjs` | Capture all routes (public/authed; single dark-royal theme). |
| `capture-manual-screenshots.mjs` | 19 screenshots (10 player + 9 admin) for the user manuals. |
| `generate-pdfs.mjs` | Render the 4 production PDFs (operator brief, technical brief, player manual, admin manual). |
| `rasterize-pdfs-for-audit.mjs` | Per-page PNGs of every PDF for visual audit before delivery. |
| `auth-stress.js` | 100+ concurrent auth requests — duplicate registration race, login counter corruption, brute-force lockout, malformed input flood. |

### Dev-test helpers

| Endpoint | Purpose |
|---|---|
| `POST /api/dev-test/promote-admin` `{ phone }` | Mark a registered phone as ADMIN |
| `POST /api/dev-test/seed-wallet` `{ phone, amount }` | Credit a wallet for test scenarios |
| `POST /api/dev-test/seed-candidates` | Seed the AI market-candidate pipeline with 6 fixtures across every terminal state (4 PENDING_REVIEW, 1 L2-rejected politics, 1 L4-rejected low-confidence) |
| `POST /api/dev-test/fast-forward-market` `{ marketId }` | Pull a market's resolution to +1h so it appears in the resolver queue |
| `POST /api/dev-test/reset-rate-limits` | Wipe per-IP / per-phone token buckets |
| `GET  /api/dev-test/last-otp?phone=...` | Last OTP code for a phone (when SMS is on `console`) |
| `POST /api/dev-test/updown-seed` `{ durations?, feedProvider? }` | Stand up running Up & Down chains through the real admin service path. `feedProvider: "mock-bars"` (validated against the shared registry) gives DECISIVE local settles — the default `mock` quotes one constant price per symbol, so every round voids on no-move |
| `POST /api/dev-test/updown-advance` | Force every RUNNING chain across one boundary (rounds then resolve on the lifecycle healer's ~60s cadence, not instantly) |

⚠️ The table lists the helpers sessions reach for most — `src/app/api/dev-test/` is the
full set (36 routes, all double-gated out of production).

## Design rules

- **Hue 268 = royal indigo** — the brand canvas. Any "teal-*" token in
  CSS/Tailwind is a backward-compat alias for royal indigo, not actual teal.
- **Gold (~hue 80)** is the primary accent — primary CTAs are `btn btn-gold`.
- **Claret (~hue 22)** is heritage / danger.
- **YES = green / NO = red** — only inside actual betting actions
  (`btn btn-yes` / `btn btn-no`). Never a green/red navigation CTA — those
  are gold.
- **Headings** = `font-display` (Sora). **Body** = default (Inter via `--font-sans`).
  **Numbers / labels / mono** = `font-mono` (JetBrains Mono).
- **No emojis in UI copy** unless explicitly requested.

## Working with Ali

- Lead on architecture and design decisions; he is non-technical.
- He doesn't want screenshots dumped after every sprint — only on request.
- For any color, gradient, hero composition, or banner change: **read
  [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md) first, then
  [`src/app/globals.css`](src/app/globals.css)** (the authoritative
  implementation). Historical note: the `--hero-grad-warm` token was once
  misnamed but is now correctly a deep royal radial (`globals.css`). Lesson
  retained: **trust the tokens, not the name** — and never the superseded teal
  kit, which would revert the brand to teal 215 and resurrect the killed light
  theme (audit C9).
- The Tanzania licensing path (Gaming Board of Tanzania) and the Selcom
  payment + SMS aggregator are real prerequisites. Don't ship paid flows
  before both are signed.

## Open hard blockers before public launch

1. **SMS contract** (no OTP delivery in production right now — currently
   on `console` provider so OTP codes print to stdout).
2. **GBT pre-application meeting** (regulator confirmation that the
   pari-mutuel pool model classifies as betting under their license).
3. **Mobile-money aggregator agreement** — deposit / withdrawal flows
   are wired against a stub `INTERNAL` provider; need a licensed
   Tanzanian aggregator (Selcom / Pesapal / etc.) before paid traffic.
4. **Match-integrity feed** — currently no Sportradar (or equivalent)
   live feed; football market resolution is manual via the admin UI.

Already shipped (was on this list before):

- ✅ **Postgres persistence** — single-row StoreSnapshot pattern wired
  via `DATABASE_URL`. Disk fallback when no DB is configured.
- ✅ **TOTP for admins** — code at `/admin/2fa/setup`, enforced on every
  privileged action.
- ✅ **Two-officer settlement defense-in-depth** — `requireAdminOrThrow`
  in `src/app/markets/actions.ts` runs inside every privileged Server
  Action, not just the layout.

## Postponed features

- **Hero slideshow / video background** — ⛔ **ABANDONED, not postponed (2026-08-13).**
  The landing hero is now the round-2 kit's **question board**: the brand mark as a
  backdrop, the type, and REAL market data (open count · Σ open pools · open predictions ·
  a volume-weighted conviction bar · four live markets closing soonest · one live
  `<MarketCard/>`). It needs **no photography and no new asset** — the kit says so in as
  many words — and `public/hero/hero-bg.webp` is **deleted**. There is nothing here waiting
  on an album. `src/components/landing/hero-slideshow.tsx` was deleted in `5fc3784` and
  `public/hero/slides/` is gone. Do not revive either.
- **Full Prisma entity migration** — COMPLETE. All entities migrated to
  per-row Prisma tables. `USE_PRISMA_DAL=true` on production. See
  `docs/DATA-LAYER.md`.

## UX commitments (kit-faithful)

- **Every consequential mutation goes through the unified `OperationResultModal`**
  ([src/components/markets/operation-result-modal.tsx](src/components/markets/operation-result-modal.tsx)) —
  large ✓ / ✗ crest, eyebrow + headline + bilingual subtitle, optional
  detail rows, primary + ghost CTAs. Success auto-dismisses at 5 s;
  failures stay until dismissed (LCCP informed-consent pattern).
- **Confirmations**: bet → `BetConfirmModal`, sell → `SellConfirmModal`.
  **Never use the native browser `confirm()`** — always portal a kit-
  styled modal. The toast at the corner is a *secondary* signal only.
- **Bootstrap admin** registers / logs in → redirected to `/admin`,
  not `/profile/kyc`. Player → `/profile/kyc?welcome=new` which now
  shows a prominent "Skip for now · Browse markets" CTA.
- **Profile page** displays a yellow `ADMIN` (or `COMPLIANCE` /
  `MODERATOR`) pill so the operator can see at a glance that
  `ADMIN_BOOTSTRAP_PHONES` wired up.
- **Conviction dial** — `NEUTRAL_BAND = 0.005` (threshold ~1.005×). Any
  intentional movement shows full feedback (payout section, side label,
  active button). `effectiveSide` overrides geometric neutral when user
  has typed a value. Pre-click "Insufficient balance" warning when
  `stake > balance`.
- **Viewport consistency — THE MEASURE.** See `docs/DESIGN_AUTHORITY.md` **B7**.
  Pages state their width through `<PageContainer tier>`; the numbers live in
  `src/app/globals.css` and nowhere else. This line used to restate them
  ("1280/1080/640") and had gone stale against a codebase that had drifted to
  eight tiers — which is exactly why it now points instead of repeating.
  Guarded by `npm run test:measure` + the upper-bound assertions in
  `scripts/responsive-audit.mjs`.
- **Positions page** — All/Open/Settled tab filter via URL params.
- **Account activity** — category filter chips (dynamic from actual data).
- **Bottom nav** — `aria-label` on every link.
- **Bet confirm modal** — `safe-area-inset-bottom` padding for notched phones.
- **NavProgress** — gold 3px progress bar at top of viewport during route
  transitions. Fires on every `<Link>` click + `50pick:navigating` custom
  event for programmatic `router.push`. z-[2000], pointer-events-none.
- **`useDeferredToast(pending)`** — toasts fire on the falling edge of
  `useTransition` pending (when `router.refresh()` commits), not on
  arbitrary setTimeout. Error toasts use `toast()` (immediate). Success
  toasts use `deferToast()` (after transition settles). Zero setTimeout
  in the codebase.
- **Loading states** — 50 loading.tsx files cover every async route. All
  forms use `SubmitButton` (spinner + pending label via `useFormStatus`).
  All admin action buttons wire `loading={pending}` from `useTransition`.

## Dark Glass Kit Rebuild (Phase 3 + 3b) — June 2026

The entire UI was rebuilt from the original design kit (Phase 3 + 3b complete).
34 commits on `main` covering:

- **All tokens** updated: `--panel`, `--bg-inset`, `--bg-elevated2`, `--brand-*`,
  `--live-400`, `--text-faint` added to globals.css
- **All components** use kit icons from `src/components/ui/glyphs.tsx` (75+ SVGs
  at 1.85px stroke). Lucide-react removed from all player-facing files.
- **All focus rings** brand-500 (zero aqua-300 remaining)
- **All border radii** rounded-xl / 16px (zero rounded-2xl remaining)
- **Buttons** solid fills, r-sm, kit inset highlights + glow
- **Chips** rebuilt: height-based, 700 weight, 0.06em tracking, uppercase
- **Inputs** bg-inset, 44px, rounded-lg (12px), brand-500 focus
- **Modals** rounded-xl, oklch shadows
- **Toggle/Switch** accent-500/bg-inset, **Checkbox** 19x19 accent-500
- **Form polish**: no native spinners, textarea
- **DateSelect** (`src/components/ui/date-select.tsx`) — segmented DD/MM/YYYY
  input + calendar popup with year grid. Replaces native `<input type="date">`
  everywhere. 926 unit tests pass.
- **Select** (`src/components/ui/select.tsx`) — dark glass dropdown replaces
  every native `<select>`. Keyboard nav, portaled, form-submission compatible.
- **useModalLock** (`src/lib/use-modal-lock.ts`) — body scroll lock + viewport
  zoom reset for all portaled modals (Android pinch-zoom fix).

Modernization is complete — all tokens, components, and focus rings updated.

## Security hardening (June 2026 sprint)

- **CSP**: `unsafe-eval` removed from script-src. `unsafe-inline` kept
  (required by Next.js hydration).
- **Secrets**: production throws FATAL if `SESSION_SECRET` or `OTP_PEPPER`
  missing. Dev-only fallbacks unreachable in production.
- **Dev-test endpoints**: hard-blocked at the edge (proxy.ts) in production,
  on top of per-route `NODE_ENV` check. 25 endpoints, double-gated.
- **Async scrypt**: all password/OTP hashing uses `scryptAsync` (promisified).
  Event loop never blocked by crypto operations.
- **Webhook secrets**: no hardcoded fallback in production. Empty string →
  `verifyWebhookSignature` returns `missing-secret`.
- **AML race conditions**: `approveAmlAction` wrapped in `withLock("aml-txn:{id}")`.
  `rejectAmlAction` wallet refund wrapped in `withLock("wallet:{userId}")`.
- **Distributed locks**: `withLock()` uses Postgres advisory locks in production
  (`pg_advisory_xact_lock`) — safe across multiple instances. In-memory fallback
  for dev without DATABASE_URL.
- **Database constraints**: `@@unique([provider, providerRef])` on Transaction.
  CHECK constraint comments for wallet balance >= 0 (apply after migration).
- **Single active session**: server-side registry prevents concurrent logins.
  New login revokes all prior sessions; revoked device sees explanation.
- **Auth race conditions**: `withLock("register:{phone}")` prevents duplicate
  users; `withLock("login:{userId}")` serialises failed-count updates.
- **Payout floor**: `Math.max(0, ...)` prevents negative payout on settlement.
- **Market-level lock**: `withLock("market:{id}")` on `resolveMarket` prevents
  concurrent settlement of the same market.
- **Negative amount guard**: deposit/withdraw actions reject `amount <= 0`.
- **Admin test deposits**: gated by `ADMIN_TEST_DEPOSITS === "true"` (whitelist)
  in production; defaults to enabled in dev/staging when unset.
- **Loss notifications**: direct language ("Bet lost · TZS X") — no euphemistic
  framing that could delay awareness of losses (LCCP harm-prevention).

## Chatbot (AI Help Companion)

- **Stub mode** (default): keyword-matching in `src/lib/chat/send-message.ts`.
  Covers deposits, dial, payouts, KYC, referrals, proposals.
- **Live mode**: set `ANTHROPIC_API_KEY` in Railway env. Server action
  `src/app/_actions/chat.ts` calls Claude Haiku 4.5 with a 50pick-specific
  system prompt. Falls back to stub on API error.
- **Icon**: gilt chat bubble (FAB) + FiftyMark brand coin (panel/avatars).
- **Chat history**: cleared on logout/session-revoke. Stored in sessionStorage.
- **At-risk language**: always routes to the RG redirect card, never free-text.
- **Betting advice**: refuses to recommend YES or NO on any market.

## Accessibility (June 2026 sprint)

- Skip-to-content link (`app-shell.tsx` → `#main-content`)
- All focus rings: brand-500 (zero gold/teal/aqua remaining)
- iOS Safari auto-zoom prevented: 16px minimum on all inputs (`globals.css`)
- PWA manifest (`public/manifest.json`) + apple-web-app metadata
- OG + Twitter card metadata on all pages via root layout

## QA — pre-deploy live checks (run before pushing UI changes)

A strict Playwright gauntlet guards releases: `scripts/pre-deploy-live-check.mjs`.

- `npm run qa:live` — runs against a LOCAL in-memory dev server (default
  `http://localhost:3009`). Boot it first (in-memory, zero prod risk):
  `SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> npx next dev -p 3009`
  (no `DATABASE_URL` → memory store). `/auth/demo` mints a 100k authed session
  locally (404 in prod) so the authed section can drive History/wallet/invite
  and the **locked betting dial**.
- `BASE=https://kipindi-production.up.railway.app npm run qa:live` — read-only
  subset against prod (auto-skips the local-only authed section). Run on a WARM
  server — the gauntlet warms up, but a just-restarted instance can still race.
- `npm run predeploy` — typecheck + `test:date` + build + `qa:live`.
- `npm run test:date` — pure keystroke unit tests for the segmented date field
  (`scripts/date-mask.test.mts`; logic lives in `src/components/ui/date-mask.ts`).

Fails on ANY: console/page/5xx error, real Next error overlay, broken internal
link, mobile horizontal overflow, clipped date segment, or mis-handled date.

## Betting flow invariant — the dial is ALWAYS side-locked

The conviction dial must never be enterable in the unlocked both-ways state:

- Market cards: **LIVE cards are not clickable**; only the YES/NO buttons enter,
  each navigating to `/markets/<id>?side=YES|NO`. (Non-live cards stay viewable.)
- The detail page passes `?side` → `ConvictionDial lockedSide=...`. The in-dial
  YES/NO pills are **display-only** ("Your pick") — no switching inside; the
  choice is final from the card. The knob is confined to the backed half.
- Logged-in user on the detail page **without** a side → show the "Pick your
  side" gate, never the bidirectional dial.

## Brand Kit v2 "Needle" (June 2026)

Logo redesigned by Claude Design. The gilt NEEDLE crossing the rim is now the
signature element — same object as the TippingBar needle + conviction dial.

- `FiftyMark` accepts `variant="color|white|dark"`, auto-simplifies at < 24px
- `FiftyTile` — rounded-square royal tile for app icons / on-photo plates
- `FiftyWordmark` — gilt underline retired; `.tz` suffix via `tz` prop
- `FiftyLockup` — `layout="horizontal|stacked"`, variant pass-through
- Full favicon set: `/favicon.svg`, `/favicon.ico`, `/icons/` (16/32/180/192/512/maskable)
- OG images: `/og/og-1200x630.png`, `/og/twitter-1200x600.png`
- Master SVGs: `/brand/mark-{color,white,dark,simplified}.svg`
- Hard rules: full mark ≥ 24px, simplified < 24px, never mirror/re-tint/stretch

## Tax model — TAXES ARE ONLY EVER ON OUR COMMISSION (July 2026)

**A player is never taxed. Not on a payout, not on a withdrawal, not ever.** Taxes
come out of the fee *we* earned:
- `traTaxOnCommissionRate` (default 10%) — 10% of **our fee** → TRA
- `gbtLevyOnCommissionRate` (default 5%) — 5% of **our fee** → GBT
- Both admin-editable at `/admin/config` — no redeploy needed

Example: pool 100,000, balanced → fee 10,000 → TRA 1,000 + GBT 500 → we keep 8,500.
**The player's payout is untouched by any of it.**

**⚠️ THE 15% WITHHOLDING TAX IS DELETED (2026-07-14).** `computeWithdrawalTax()`
withheld 15% of **every** withdrawal — including money a player had deposited and
never bet. Deposit 100,000, place no bets, withdraw → he received **85,000**. The
code comment called itself *"naïve"*. It is gone.

**What a player is charged, in full:**
| | |
|---|---|
| The pool commission | indirectly, through the payout — capped, see above |
| `withdrawalFeeRate` (1%) | on withdrawal. `withdrawalGatewayShareRate` (0.5%) of it is the gateway's |
| `cashOutFeeRate` (10%) | only if he exits early, after the free window. Goes to the HOUSE |

Nothing else. If you find yourself adding a deduction to a player's money, stop.

**✅ RESOLVED 2026-07-15 — tax on what we KEEP.** The ledger and the statutory report
now levy TRA/GBT on the same base: our actual commission. GGR is computed net of
refunds (`stakes − payouts − refunds`) so a voided/one-sided poll — where we keep
nothing — is taxed on nothing. Report == ledger, verified end-to-end. Rates live in
admin config. See `docs/F6-LIQUIDITY-DESIGN.md` §6.1 and the decision doc.

## Gold budget (June 2026 design authority)

Gold is reserved for **earned money moments only** (kit invariant #2):
- Place CTA → side-coloured (`btn-yes`/`btn-no`), not gold
- Confirm CTA → `btn-gold` (the actual money commit)
- OperationResultModal strip + button → `stripTone` prop:
  `"gold"` = sell/settlement, `"yes"|"no"` = bet placed, `"brand"` = admin (default)
- BetConfirmModal quote-hold strip → brand-blue, not gold
- Hot chip → `chip-hot-rose` (rose/flame), not `chip-objection` (gold)
- Lean warning → qualitative text, no payout figure (D3 compliance)

## Git workflow — ALWAYS commit AND push

```
git add <files>
git commit -m "Sprint NN: short title"
git push origin HEAD:main
```

**Never leave commits unpushed.** Railway auto-redeploys on push.
Ali checks the live site, not local — unpushed work is invisible to him.
⚠️ `HEAD:main` is not decoration — see the deploy-workflow note above: the working
checkout is on `qa/live-experience`, so a bare `git push` updates that branch and
deploys nothing.

⚠️ **A CLOUD session cannot push at all** — the sandbox proxy returns 403 on every
attempt, every time. Delivery is a git bundle Ali imports; do not burn a session
re-discovering this:
```
git bundle create <name>.bundle origin/main..HEAD      # in the sandbox
git fetch "C:\Users\Ali\Downloads\<name>.bundle" HEAD  # on Ali's machine
git merge --ff-only FETCH_HEAD
git push origin HEAD:main
```

## Where progress is tracked (canonical)

⚠️ **Rewritten 2026-07-31 — five of the paths this section listed no longer
exist**, including `docs/SESSION_STATUS.md`, which it named as the read-FIRST
document. So did `PHASE_E_AUDIT_*`, `ADMIN_VIEW_AUDIT_*`, `PLAYER_VIEW_AUDIT_*`
and `ARCHITECTURE_AUDIT_*`. A pointer to a deleted file is worse than no pointer:
it costs a session the time to discover the absence. Verified by listing, and the
survivors below were verified the same way.

The platform is **feature-complete and hardening for launch**. Read in order:

1. **[`docs/README.md`](docs/README.md)** — the doc index. Every doc with an
   honest status (LAW / LIVE / RECORD / OPEN / DESIGN / HISTORICAL). Read it
   before opening anything else in `docs/`.
2. **[`docs/NEXT-PLAN.md`](docs/NEXT-PLAN.md)** — current state; opens with
   "PICK UP HERE".
3. **[`docs/MODULE-CERTIFICATION-PROGRAM.md`](docs/MODULE-CERTIFICATION-PROGRAM.md)** —
   52 modules, 8 gates, the 12 laws, the status board. This commands the work.
4. **[`docs/perfection-plan.md`](docs/perfection-plan.md)** — the 0-issue launch plan.

Session protocol: `git fetch` → `npm install` → `npx prisma generate` →
`npm run test:all` (**117** `test:*` scripts; `test:responsive` and `test:motion`
need a server on `:3000`) → work one item → test + live-drive → **commit AND
push** (Railway auto-deploys; Ali reviews live). Update the doc that owns the
subject in the same commit — no new tracker files.

Design source of truth: [`src/app/globals.css`](src/app/globals.css) →
[`docs/design-master-brief.md`](docs/design-master-brief.md) →
[`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md). ⛔ Design is FROZEN
behind `npm run test:design-frozen`.
