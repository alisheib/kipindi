# 50pick / Kipindi — next-session opening prompt

> Paste this as the first message of the next session. It is the **single
> canonical handoff**. Read `docs/SESSION_STATUS.md` first (current state +
> gotchas), then `CLAUDE.md` (architecture). Last updated **2026-07-13** ·
> HEAD ≈ `02f0921` on `main`.

---

## 0 · First 5 minutes (before any task)
1. `cd F:\kipindi-main` · `git status` (clean) · `git pull --rebase origin main`.
   ⚠ The repo is on **F:**, not C: — an older copy of this prompt said `C:\kipindi-main`.
2. **`npm install`** if the pull touched `package.json` (F3/F4 added `web-push`; a stale
   `node_modules` shows up as a phantom tsc error "Cannot find module 'web-push'").
   Then **`npx prisma generate`** (a pull often leaves the client stale → phantom tsc
   errors like "field does not exist"; regenerating fixes it — not a code bug).
   ⚠ **Never run `npm install` while a dev server is up.** It rewrites `node_modules`
   under the running server and poisons the Turbopack cache — every route then 500s with
   `FATAL: An unexpected Turbopack error` / exit code `0xc0000142`. Cure: kill the server,
   `rm -rf .next`, restart. It looks like catastrophic breakage and is purely local.
3. `npx tsc --noEmit` → clean · `npm run test:all` → **55/55**.
   `test:responsive` needs a live server on :3000 — boot one and it passes too; without a
   server it is the only acceptable red.
4. Read `docs/SESSION_STATUS.md`, then `docs/feature-backlog.md`.

## 1 · Where we stand (2026-07-13)
Feature-complete, launch-hardening. Live on Railway
(`kipindi-production.up.railway.app`; `www.50pick.tz` registered but **not cut over** —
deep routes 404 on it. That's expected; use the railway host).

### ⚠ 2026-07-13 — SETTLEMENT IS NOW GATED. Read this before touching the money path.
`resolveMarket` **no longer pays anyone.** Stage-2 of the ceremony *adjudicates*: it records
the verdict, opens the objection window, and leaves the pool whole with every position OPEN.
Money moves only in **`settleMarket()`**, called by **`settleDueMarkets()`** on the lifecycle
ticker, and only once the window has elapsed **and** no objection is standing.

This was F11. The old "24h objection window" was decoration — `objectionsClosedAt` was stamped
and the winners were paid on the next line, so a player could only ever object to money that
had already left, and an upheld objection had no remedy (`emergencyVoidMarket` refuses a
settled market). `REGULATOR_STRESS_REPORT.md` meanwhile told a regulator settlement *was*
gated on it. It is now true, and `scripts/settlement-gate.test.mts` (72 assertions) proves it.

Consequences you must know:
- A market can be **RESOLVED with `settledAt: null`** — verdict final, money untouched. Any new
  code that reads `status === "RESOLVED"` and assumes the money moved is **wrong**; check
  `settledAt`.
- A test that resolves a market and asserts a payout must now settle explicitly:
  `await settleMarket(id, { force: true })`. `force` skips the window + objection checks; it can
  never skip the already-settled guard, so it cannot double-pay.
- `emergencyVoidMarket` now refuses on `settledAt`, not on status — so it CAN kill a resolved
  but unsettled market (that is the uphold escape hatch) and stamps `settledAt` itself.
- Objection rulings are **COMPLIANCE-gated in the service** (not just the route): a MODERATOR
  cannot VOID/REVERSE a market, and the attempt is audited as `privilege_escalation_blocked`.

**The feature backlog F1–F8 is COMPLETE except F6** (which is a decision, not code):

| | |
|---|---|
| F1 settlement-proof · F2 2FA + activity · F3 watchlist/alerts · F4 web push · F5 share cards · F7 owner BI · F8 event calendar | ✅ shipped |
| **F6 seeded liquidity** | 📋 **design delivered — awaiting Ali** (`docs/F6-LIQUIDITY-DESIGN.md`) |

**Five live defects were found + fixed** during that build-out (none were asked for):
plaintext TOTP secrets · a MODERATOR money-data leak · a fabricated tax figure on
`/admin/finance` · the AI publish path bypassing the source allowlist · the AI budget
never actually blocking overspend.

## 2 · 🔴 OPEN — needs ALI, not code
1. **F6 decision.** Recommendation: **do NOT build house-backed liquidity.** It destroys
   pari-mutuel outcome-neutrality and contradicts our own POCA §16 rule ("an officer who
   holds a position MUST NOT resolve it") — the house holds a position in every market its
   own officers settle and **cannot recuse itself**. Read `docs/F6-LIQUIDITY-DESIGN.md` §7
   and pick A / B / C.
2. **VAPID keys** → push is in graceful **stub mode** until they're set in Railway.
   Generate: `node -e "console.log(require('web-push').generateVAPIDKeys())"`, then set
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (= the public
   key) and `VAPID_SUBJECT=mailto:support@50pick.tz`. Claude is blocked from writing prod
   secrets unless Ali names them explicitly.
3. **Tax-base ruling.** The ledger levies TRA/GBT on the **3% commission**
   (`ledger.ts:191`); the statutory Daily-Ops return levies them on **~9% GGR**
   (`reports/catalogue.ts:525`). That is a **3× discrepancy in a regulator-facing filing**.
   Needs a tax/legal answer, not an engineering one.

## 3 · Paths — where things live
**Repo root:** `C:\kipindi-main` (branch `main`; **push = deploy**). GitHub `alisheib/kipindi`.

| What | Path |
|---|---|
| Player routes | `src/app/**` (`markets`, `wallet`, `positions`, **`watchlist`**, `profile/{activity,security,notifications}`, **`auth/2fa`**, …) |
| Admin console | `src/app/admin/**` (incl. **`insights`** = owner BI, **`events`** = F8 calendar) |
| Server logic / DAL | `src/lib/server/**` — `market-service`, `wallet-service`, `prisma-dal.ts` + `store.ts` (in-memory twin), `roles.ts`, **`report-money.ts` (normative money defs — do not re-derive GGR)**, `insights.ts`, `events-service.ts`, `watchlist-service.ts`, `push-service.ts`, `player-2fa.ts`, `share-token.ts`, `ai-poll-generation.ts` |
| Money/date format | `src/lib/utils.ts` (`formatTzs`, `formatDate*`) |
| Design-system kit | `src/components/ui/**` · admin: `src/components/admin/**` |
| i18n (en/sw/zh) | `src/lib/i18n-dict.ts` — **never hardcode user-facing strings** (`npm run test:i18n`) |
| Prisma | `prisma/schema.prisma` (prod Postgres; dev = in-memory store) |
| Tests (in `test:all`) | `scripts/*.test.mts` (53 `test:*` suites) |
| Docs | `SESSION_STATUS.md` (read-first) · `feature-backlog.md` · **`F6-LIQUIDITY-DESIGN.md`** · `ui-rollout-tracker.md` (batch log) |

## 4 · Standing rules (Ali)
- **Commit AND push** every change (Railway auto-deploys). Pull/rebase first.
- **NEVER fabricate** legal/business/audit/money data. Show real data or an empty state.
  This is a licensed real-money product — **an invented number is a defect**.
  *(Three of this session's five defects were fabrication/authorisation bugs.)*
- **RG on every money path** · PII masked · audit every mutation · gold = earned-money only.
- **Kit-only.** No new UI library, no one-off component, no ad-hoc colour.
- **Verify by DRIVING it, not by reading code.** Three of the five defects looked fine on
  the page and only fell out of an adversarial live drive (e.g. minting a MODERATOR
  session and hitting the money pages).
- Every change: stress-tested (`*.test.mts`) + visually driven (Playwright, **320 first**
  → 1920, EN/SW/ZH, screenshot **and read it**) + hardened (bad input, forged role, race).
- Six-role sign-off in the commit body (`6-role: ✓`).

## 5 · Gotchas that have bitten us
- **Fresh server needed** for `ui-regression`/responsive drivers; a seeded store causes
  false fails. Reset: kill the :3000 listener → `rm -rf .next/dev` → reboot.
  A Turbopack 500-on-every-route is a **stale-cache artifact** — same reset fixes it.
- **Only one `next dev` per repo dir.** For an isolated server a git worktree seems
  attractive, but **Turbopack rejects a junctioned `node_modules`** ("points out of the
  filesystem root") so the worktree needs a full `npm ci`, and `--webpack` chokes on this
  project's `node:` imports. Simplest: kill the existing dev server and boot in the main repo.
- `redirect()` from an admin **page body** fires after the shell starts streaming → a soft
  200 + client bounce (and a "Rendered more hooks" error). For role gates, **return an
  `<AdminRestricted>` panel instead** (`src/components/admin/admin-restricted.tsx`).
- The in-memory DAL returns values **synchronously** (the Prisma twin is async), so
  `.catch()` on a `db.*` call throws. `await` inside `try/catch` instead.
- `db` is typed as `typeof prismaDb` — any method added to the memory twin must exist on
  the Prisma DAL with an identical async signature or tsc breaks.
- Playwright: this app has pollers, so `networkidle` never settles — use
  `domcontentloaded`. And allow ~2s after a soft redirect before asserting.

## 6 · What to do next (if Ali gives no other steer)
The backlog is done. Highest-value remaining, in order:
1. **P3 polish** (`feature-backlog.md` §P3) — F9 richer market detail, F10 low-data lite
   mode, F12 live odds via SSE, F13 public fairness ledger.
   *(F11 shipped 2026-07-13 — it became the settlement gate; see §1.)*
2. **Instrument analytics** — there is *zero* pageview tracking, which is why the F7 funnel
   honestly has no "visit" stage. Adding it unlocks a real top-of-funnel.
3. **Launch blockers** (Ali-owned): real payment aggregator (Selcom/Azampay), MNO logos,
   telco SMS sender ID, GLI cert — and **flip the solo-resolution toggle OFF before real money**.
4. **Decide the production objection window.** `objectionWindowHours` now GATES settlement
   (default 24). That is a real product trade-off nobody has signed off: winners wait a day.
   Set it at `/admin/config`. **0 disables the gate** — legal for play-money, but it is the
   control the regulator report describes, so it must never be 0 at real-money launch.
   F13 (public fairness ledger) should now surface real dispute stats — they exist.

## 7 · Living doc — UPDATE BEFORE YOU END THE SESSION
Keep this file true. Update §1/§2 with what landed and what's open, tick
`feature-backlog.md`, mirror into `SESSION_STATUS.md`, append to `ui-rollout-tracker.md`,
confirm a clean tree, stop the dev server.
