# 50pick / Kipindi — Session status & handover

**Updated:** 2026-07-12 (solo-resolution prod-lock hotfix + Track 2b money-format client subset) · **Branch:** `main` · **HEAD:** see `git log -1`
**Live:** https://kipindi-production.up.railway.app (Railway auto-deploys on push to `main`; custom domain `www.50pick.tz` registered but **not cut over** — DNS pending).

> This is the **read-first** doc. It's a current-state snapshot + the launch
> blockers + the gotchas that have bitten us. Deep history lives in git and in
> `docs/ui-rollout-tracker.md` (batch-log). Architecture bible = `CLAUDE.md`.
> To start the next work session, open **`docs/next-session-prompt.md`**.

---

## 1 · What this is
A **licensed real-money** pool-based prediction-market platform for Tanzania
(Gaming Board of Tanzania). Players stake TZS on YES/NO market questions settled
by official sources; the house takes a fee; winners share the pool. Trilingual
(EN/SW/ZH). Next.js 16 · React 19 · TypeScript · Prisma · Postgres (prod) /
in-memory store (dev). Prod flag `USE_PRISMA_DAL=true` on Railway.

## 2 · Current state (feature-complete, hardening for launch)
The platform is **feature-complete and passing its gates**. Recently landed:

- **2026-07-13 · SECURITY — TOTP secrets encrypted at rest** (`aa3938f`) — closed the
  gap found during F2: the TOTP secret column stored the **raw base32 seed in
  plaintext** (for players AND admins) despite a code comment claiming AES-256-GCM.
  Anyone with DB read access could mint valid 2FA codes. Now encrypted with
  **AES-256-GCM at the store boundary** (all callers unchanged). **Legacy rows
  self-heal**: detected on read, still verify (no 2FA interruption), re-written
  encrypted in place — no data migration. Undecryptable/tampered → **fails closed**
  (falls back to hashed backup codes), never bypasses. Key = `TOTP_ENC_KEY` if set,
  else derived from `SESSION_SECRET` → **deployed with zero env changes**.
  New `test:totp-enc` 22/22 → `test:all` **47/48**. Live-drive: full enrollment works
  with encryption active. ⚠ **Set `TOTP_ENC_KEY` in Railway BEFORE ever rotating
  `SESSION_SECRET`** (otherwise existing TOTP secrets become undecryptable and users
  must re-enroll via backup codes — recoverable, but avoidable).

- **2026-07-13 · FEATURE F2 — player 2FA + "Your activity"** (`d9d7091`) — both halves
  shipped in one verified batch. **2FA:** opt-in TOTP (reuses the admin RFC-6238 engine)
  + **self-service backup codes** (new `TotpBackupCode` table, migration
  `20260712130000` — applied on Railway; HMAC-hashed, single-use). Login is a **true
  pre-session gate**: no session/cookie is minted until `/auth/2fa` passes (5-min signed
  `kp_pending_2fa` token, rate-limited); disable + regenerate both require fresh proof;
  an unconfirmed enrollment can never lock a player out. **Activity:** `/profile/activity`
  — deposits/withdrawals/staked/won/net (week|month|all) from real DB aggregates, with
  the locked invariant `net === won − staked === sumGamblingNetSince` (the exact number
  the loss-limit gate uses), and RG limits-used computed from the **same sums the gates
  enforce**. "Time played" deliberately NOT shown (no server-side session history → would
  be fabrication). New `test:2fa` (29/29) + `test:activity` (21/21) → `test:all` **46/47**
  (only red = the responsiveness sprint's `test:responsive`, needs a live server).
  i18n parity 1287³. Live-drive: 39 screens, 0 overflow, full enrollment lifecycle driven.
  6-role: ✓. **⚠ Follow-up:** the TOTP **secret** column is stored plaintext (the code
  comment claims AES-256-GCM at rest — it does not); affects admin 2FA equally; backup
  codes ARE hashed. Encrypt-at-rest = separate hardening item, advise before real money.
  **Next backlog item: F3+F4 (watchlist + push).**

- **2026-07-12 · FULL-PLATFORM RESPONSIVENESS SPRINT (Lanes A–G COMPLETE)** —
  built `scripts/responsive-audit.mjs` (master driver: player + all 27 admin
  routes × **320/360/390/430/landscape/768/1024/1280/1920** × EN/SW/ZH + overlays;
  asserts 0 h-overflow, **no clipped-not-scrolled controls**, no off-screen fixed,
  ≥40px targets) + `npm run test:responsive`. Its clipped-control detector caught
  a class of real bugs that `overflow-x: clip` on <body> hid from
  `scrollWidth`. **Fixed + shipped:** (A) top-bar bell `h-10 w-10`=**80px** on the
  custom spacing scale → 40px (matched avatar; the oversized bell + balance pill
  were **clipping the account menu off-screen at 320** — unreachable); balance pill
  visibility banded so the account menu is always reachable (hidden on phones +
  the 1024–1279 and ≥1536 tight bands); WCAG tap sizes for the bare eye + language
  pills. (C) **AuthShell `grid place-items-center`→flex** — the grid track
  auto-sized to the heading's max-content and clipped all six `/auth/*` forms +
  submit off a 320 phone; same fix on the bespoke `/auth/admin` login. (B) wallet
  header + (F) `/proposals` hero stack on phones; invite share row 2/3-up grid.
  (D/E) admin filter clusters / action rows / report cards `flex-wrap`;
  DurationInput `w-full`. (F) top bar made **locale-robust** (SW/ZH ~20% wider:
  nav overflow-links → 2xl, header gap). **Results (fresh server):** player EN
  1000/0, player SW+ZH **2016/0**, admin EN **972/0**, overlays **15/15**;
  ui-regression extended to **320 + landscape**; tsc clean; admin-grids-smoke
  125/125. Commits `e5d22dc · bd7d539 · 9cd1739 · f2c4b05 · d77a85f`. Shots read at
  320/1024/landscape/ZH. Full spec + checklist: `docs/responsiveness-audit.md`.
  _(axe-core is not installed in this local node_modules — a11y-reflow intent is
  covered by the driver's 0-overflow/0-clip checks; changes are layout-only.)_


- **2026-07-12 · FEATURE F1 — settlement-proof on resolved markets** (`5edd74b`) —
  first feature-backlog item shipped. Player `ResolutionPanel` now shows the
  **officer evidence excerpt** (the exact quote justifying the verdict) alongside
  the existing two-officer seal + source link + objection window + pool/fee. New
  `PredictionMarket.resolutionEvidence` column (migration
  `20260712120000_add_resolution_evidence`, additive/nullable — **run
  `prisma migrate deploy` / verify it applied on Railway**) written at ceremony
  stage-1; gilt-bordered blockquote, empty-state when absent (never fabricated),
  injection-inert, trilingual `market.resEvidence` (parity 1221³). +12 hardening
  assertions in `test:officer-conflict` (33/33). Verified: tsc · test:all 44/44
  real suites (the parallel sprint's `test:responsive` is the only red, needs a
  live server) · i18n parity · live-drive 320→1920 × EN/SW/ZH on an isolated
  worktree server, 0 overflow. 6-role: ✓. See `docs/feature-backlog.md` F1 +
  `ui-rollout-tracker.md` batch log. **Next backlog item: F2 (2FA + activity).**

- **2026-07-12 · solo-resolution prod-lock removed** (`8e0cde3`) — see Launch
  blocker #6 + `[[project_kipindi_solo_resolution]]`. **2026-07-12 · Track 2b
  money-format** — client subset (`657c7f9`, 12 renders) THEN **server subset
  DONE**: 71 direct-interpolation + 6 pre-computed-var money strings across 12
  server files (notification-service, email [local `fmtTzs` reimpl deduped],
  sms, affiliate, market, wallet, bonus, kyc-risk, responsible-gambling,
  proposals, invite, reports/catalogue) routed through the canonical
  `formatTzs`. **Byte-identical** (proven over 140,020 values; all inputs are
  integer money; `formatTzs` also pins en-US grouping → removes latent
  host-locale drift). Prefix-less report cell formatters (`reports/brand.ts`
  `fmtTzs`, catalogue stat cells labelled "(TZS)") + the RG internal diagnostic
  string are intentionally left (adding a "TZS " prefix would corrupt them).
  **Track 2b item (b) COMPLETE.**

- **2026-07-12 · Track 2a·1 — admin status-lexicon, Family 3 (ceremony)** — built
  `src/lib/admin-status-lexicon.ts` (`CEREMONY`, 13 canonical `{en,sw?}` entries +
  `bi()`) as the ONE source for the console's bilingual EN·SW status vocabulary;
  migrated 9 admin files and **fixed the "Afisa wa pili" → "Afisa wa pili
  anahitajika" drift** (report-pack-controls now matches the resolver ceremony).
  SW never fabricated (lifted from shipped admin/dict strings). Verified on a fresh
  server: admin-grids-smoke 125/125 + 13/13 rendered-string assertions (drift fix
  captured in situ) + test:all 45/45. See `docs/status-lexicon-inventory.md`.

- **2026-07-12 · Track 2a·2 — admin status-lexicon, Family 2 (selection/betting-
  close)** — added the `SELECTION` group (selectionClose, selectionCloses, betsClose,
  betsClosed, selectionClosedWaiting) + migrated 8 admin files. **Fixed** the
  "Selection Close" vs "Selection close" case drift (same label, same file) and the
  config help text that quoted a title-cased state string players never actually see
  (now mirrors the real sentence-cased player wording). Present/past "Bets
  close"/"Bets closed" tense split kept intentionally. Verified: admin-grids-smoke
  125/125 + 9/9 fresh-server assertions + read screenshot + test:all 45/45.
  **Next:** items (c)–(f) + Track 1 Phase D perf. _(Player-dict intra-locale dupe
  collapse — closesIn/waitingForResults/recentlyResolved — is a separate
  test:i18n-path task.)_

- **2026-07-12 · FINALIZATION SPRINT — our engineering tracks COMPLETE** —
  Track 4 (materialize aggregates: landing payout-sum → DB `sumConfirmedByTypes`
  + 60 s cache; per-MNO health/reconcile → windowed `listSince`; byte-identical),
  Phase C tail (loading/error/empty states + light-scheme resilience — all
  verified, no defects), 2G perf (background-shell lazy-split — critical-path win;
  total JS unchanged, deeper lever documented), Phase G (**regression-lock ALL
  GREEN**: tsc · build · test:all 45/45 · ui-regression 158/158 · admin-grids-smoke
  125/125 · 6-role EN/SW/ZH walk clean). **Remaining to launch = external/Ali-owned
  only** (real payments, bitmap assets, license/TIN/SMS-ID, GLI cert) + flip
  solo-resolution OFF. See `docs/ui-rollout-tracker.md` batch log for each.
- **2026-07-12 · Perfection items (c)–(f) + Track 1 Phase D perf baseline** —
  (c) `band()`+`<ScoreBadge>` (score→tone, byte-proof); (d) `officerLabel()`/`playerLabel()`
  (one by-id name resolver, 2 dupes removed); (e) Chip variant set documented + 4
  identical pairs de-duped to shared bases; (f) `defineConfig()` factory (bonus + proposals
  configs migrated, 7 custom modules flagged). Each: tsc + admin-grids-smoke 125/125 +
  fresh-server verify + test:all 45/45, shipped separately. **Phase D perf:** `next build`
  passes; new `npm run perf:smoke` harness (Playwright+CDP, CPU×4 mobile vs live prod) —
  baseline **JS ~410 kB gzip, LCP 1.9–3.1 s, FCP 1.2–1.7 s (within budget)**; on 2G LCP
  5.6–19.8 s (landing heaviest → JS-reduction follow-up). See `docs/ui-rollout-tracker.md`.
- **2026-07-12 · Track 2a·4 — Family 4 (KYC/DSAR review states) · CLOSES TRACK 2a** —
  added the `REVIEW` lexicon group + `<KycStatusBadge>`/`<DsarStatusBadge>`; migrated
  the KYC chips (players/[id]) + DSAR chip (privacy). Officers no longer see raw
  `PENDING_REVIEW`/`ADDITIONAL_INFO_REQUIRED` — now "Pending review"/"More information
  needed". Proposal states already dict-backed; audit payloads keep raw enums (compliance);
  account-status enum is a separate future cleanup. Verified: admin-grids-smoke 125/125 +
  7/7 fresh-server assertions + screenshot + test:all 45/45. **Track 2a (admin
  status-lexicon) COMPLETE — Families 1–4; lexicon = CEREMONY+SELECTION+LIFECYCLE+REVIEW.**
- **2026-07-12 · Admin "Back to app" → landing** — the admin topbar's "Back to app"
  now lands on `/` (the landing hub), not the raw `/markets` board (Ali: felt like a
  dead-end). One-line href in `admin-shell.tsx`. Verified: admin→click→lands on `/`
  with full player nav; direct `/` load has no admin-chrome leak; test:all 45/45.

- **2026-07-12 · Track 2a·3 — Family 1, shared `<MarketStatusBadge>`** — built
  `src/components/admin/status-badge.tsx` (the ONE market-lifecycle badge: owns
  enum→variant + enum→label via the new `LIFECYCLE` lexicon group) and replaced the
  raw `<Chip>{m.status}</Chip>`/`STATUS_LABEL` + duplicated inline variant ternaries
  on /admin/markets and /admin/markets/[id]. Byte-identical rendered output (the Chip
  atom upper-cases via CSS); the win is one reusable component + no duplicated logic.
  Server-safe (`import type MarketStatus`). Position-status + the resolver seal chip
  are a different enum, kept separate. Verified: admin-grids-smoke 125/125 + 4/4
  fresh-server assertions + read screenshot + test:all 45/45.

- **Phase E — security/compliance/money-safety audit (2026-07-11)** — 6 findings
  fixed & shipped incl. a 🔴CRITICAL money race (`cashOutPosition` now holds the
  `market:` lock), THEN money-H1 (withdrawal idempotency), money-M2 (affiliate
  reward lock+sourceRef) — each with a red-without-fix concurrency test (case E,
  F) — and compliance-H2 (GBT pack reports its calendar month, not rolling 28d).
  **Every actionable Phase E finding is now fixed.** Still open ONLY because they
  need Ali/credentials/policy: payments MOCK (P0), withdrawal-tax-on-principal ⚠.
  Full record: **`docs/PHASE_E_AUDIT_2026-07-11.md`**.
- **Re-evaluation (round 2, 2026-07-11)** — a second independent 3-lane re-audit
  re-confirmed all fixes and caught 2 more 🔴HIGH, both now fixed: a MODERATOR
  live-market-void escalation (ai-poll delete path) and **non-resumable
  settlement** (RESOLVED persisted before payouts → a crash stranded winners;
  now persisted last + resume test). Plus MED/LOW: completed phone masking
  (raw E.164 was in audit `targetId`), removed a fabricated leaderboard sparkline,
  prod-gated the AI-poll seed-fixtures button, TOTP on reopen/create, timing-safe
  Postmark. Fast-follows listed in the audit doc §Re-evaluation.
- **Sentinel run progress-loader (2026-07-11, Ali)** — admin "Run now" shows a
  theme-kit loader (spinner + phased progress bar → burst-result card).
- **Phase C visual matrix (2026-07-11)** — `scripts/visual-matrix.mjs`. Player:
  9 routes × en/sw/zh × 4 widths = **108 cells 324/324 auto** + 7 read. Admin
  (`SURFACE=admin`): 11 routes × EN/SW × 360/1280 = **44 cells 132/132 auto** + 4
  read. **Zero defects both surfaces.** Next Phase C slice: below-fold full-page
  reads + per-state seeding (loading/error/edge).

- **Admin console fully built** — ADM1 regulator-pack maker-checker signing chain,
  ADM2 two-officer resolution ceremony, ADM3 KYC/AML workstation, ADM4 payments
  ops (per-MNO health + kill-switches + reconciliation + retry). GGR reconciled to
  Stakes−Payouts everywhere. Full admin gold-discipline sweep (gold = resolved seal only).
- **Perfection-plan pass (2026-07-10)** — Phase B test net (`npm run test:all`:
  money-invariants + concurrency), §9.1 primitives (one `<Modal>`/`<ConfirmModal>`,
  one money-format rule, `appUrl()`), §9.3 admin controls (platform maintenance mode,
  broadcast banner), Phase D a11y (axe 0 serious/critical across 22 routes).
- **This session (2026-07-11)** — discovery-audit sprint + two Ali requests:
  - never-fabricate: removed the leaderboard's synthesized "consensus" chart +
    prod-gated the synthetic sample board (real empty state in prod).
  - correctness: 4 admin handlers no longer report false success on failed writes.
  - gold-discipline: wallet tabs → kit `Tabs` (killed a gold underline).
  - home hero YES/NO → tokens.
  - compact `DateSelect` variant → adopted on `/admin/ai-usage` (last raw date inputs gone).
  - **lockable bet dial** — the drag defaults LOCKED and the dial renders
    **greyed/inactive**; **only the royal "Unlock" button** activates it (tapping
    the dial never unlocks — it just pulses the button). Exact-type inputs stay
    live at all times, so exact stakes can't be knocked by a stray touch. Verified
    `scripts/dial-lock-verify.mjs` 24/24 (YES+NO).

**Green gates (do not regress):** `tsc` · `next build` · `npm run test:all`
**45/45** (money/security/concurrency/i18n) · i18n parity **1220³** (en=sw=zh) ·
`scripts/ui-regression.mjs` 360/768/1280/1920 · `admin-grids-smoke` 125/125 ·
pre-deploy gauntlet `npm run qa:live`.

> **Note — rare `/markets` hydration warning (investigated 2026-07-11):** one
> ui-regression run showed a transient hydration mismatch on `/markets` (6–9 flaky
> "fails"). Investigated hard: **not reproducible** in 26 isolated loads (warm,
> cold-compile, authed) nor in two consecutive fresh-server runs (both **158/158**).
> The board is a server component, so its `Date.now()` bakes into the HTML and
> cannot cause a hydration mismatch — the earlier "seed `now`" hypothesis was
> wrong. Conclusion: a **rare dev-only timing artifact under load**, not a prod
> bug — do NOT speculatively patch the money-adjacent board. Always run the gate
> on a genuinely FRESH server (per the ui-regression gotcha). **If it recurs,
> capture the FULL React hydration diff (the specific element/attribute) first**,
> then fix that element — don't guess.

## 3 · How to run / test / deploy (essentials — full detail in CLAUDE.md)
- **Local dev (in-memory, no prod risk):**
  `SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development DISABLE_ADMIN_TOTP=true npx next dev -p 3000`
  → `GET /auth/demo` = 100k authed player session (404 in prod). Admin:
  `POST /api/dev-test/seed-admin {"phone":"+255700000000"}`.
- **Only ONE `next dev` per repo dir** (Next enforces it). Seed markets:
  `POST /api/dev-test/seed-markets`. Other seeds: `stress-money`, `proposals-seed`,
  `seed-candidates`, `seed-ai-polls`, `seed-kyc`.
- **Gate before deploy:** `npx tsc --noEmit` · `npm run test:all` · then
  `BASE=http://localhost:<port> node scripts/ui-regression.mjs` (needs a FRESH
  server — see gotchas) · `npm run qa:live` (pre-deploy gauntlet).
- **Deploy:** `git push origin main` → Railway auto-deploys (~3–6 min; `start`
  runs `prisma migrate deploy` first). Verify with `railway deployment list` /
  `railway logs`. **Push norm for this repo: commit AND push** (per CLAUDE.md).

## 4 · Launch blockers & open items
1. **🔴 P0 — payment provider is a MOCK.** `src/lib/server/payments.ts`
   (`dispatchDeposit` always CONFIRMED, `dispatchWithdrawal` always succeeds) has
   NO real BoT-licensed aggregator (Selcom/Azampay) behind the webhook path. In
   prod this moves no real money. **Postponed by Ali**, but it is the single
   biggest go-live blocker — needs the real integration + credentials.
2. **⊘ Bitmap assets (Ali's pipeline):** `hero-bg.webp`, propose/bonus/invite
   banners, category `*.webp`, navy-weave texture, `win-seal.png`, the 4 official
   MNO logos, the regulator seal. All are drop-in-ready code slots.
3. **Legal/business values are placeholders — never fabricate:** license no.
   (`TZ-GBT-2026-XXXX (pending)`, footer reads `NEXT_PUBLIC_LICENSE_REF`), TIN,
   SMS sender ID (`"KIPINDI"`, env `SMS_SENDER_ID` — telco-registered, confirm
   before flipping), reports "50pick Africa" vs "50pick". Set in Railway at launch.
4. **GLI certification** — see `docs/gli-remediation-plan.md` / `gli-remediation-tracker.md`.
5. **Stale dev-tool e2e scripts** — `scripts/dial-*-stress-e2e.mjs` + broader
   `betting-*/qa-killer/sprint*` scripts self-register and `page.fill` a DOB field
   that is now a `DateSelect` (hidden), so they die at registration. NOT in any
   gate (the gate is `qa:live`). Reviving = DateSelect-DOB entry + arm-the-dial;
   deferred maintenance.
6. **🔴 Solo-resolution override MUST be OFF before real-money launch.** The
   resolver-queue "Solo resolve" toggle (`allowConflictedResolution`, default OFF)
   lets ONE admin resolve a market they bet on — a POCA §16 conflict of interest.
   On **2026-07-12** the `NODE_ENV === "production"` hard-lock in
   `src/lib/server/test-overrides.ts` was **removed at Ali's request** so a
   consultant could evaluate the resolution flow on the live-config deployment
   (the lock was blocking them). It is now enforceable **only by discipline** —
   the toggle works in every environment. It is testing/consultant-only: leaving
   it ON with real funds lets an admin pay their own bets. **Before go-live:
   confirm it is OFF (and consider reinstating the hard-lock).** Every toggle +
   bypass is in the COMPLIANCE audit trail.

## 5 · Risk register / gotchas (carry forward — these have bitten us)
- **After `git pull`, run `npx prisma generate`** before trusting `tsc`. Schema
  changes arrive via pull but the client isn't regenerated → false "field does not
  exist" errors (hit 2026-07-11 with `selectionCloseDate`). Not a code bug.
- **Prod-only bugs the dev in-memory store hides:** the dev store is a sync
  Promise-chain mutex; real Postgres behaves differently. The 2026-07-02/03 login
  outage was a `pg_advisory_xact_lock` bug invisible in dev — (1) Prisma binds JS
  numbers as **bigint**, PG needs `::int` casts (SQLSTATE 42883); (2) `void`-returning
  PG funcs need **`$executeRaw`**, not `$queryRaw`. **For digest-only prod 500s,
  read `railway logs` first** — it shows the real stack.
- **`ui-regression.mjs` needs a genuinely FRESH server** (158/158). A dirty store
  from prior live-drives fails its `/auth/demo` setup; a stress-seeded store throws
  dozens of false `navigator.vibrate` console-error fails. Reset: `Stop-Process`
  the port's listener → `rm -rf .next/dev` → reboot. **Never** `taskkill //IM
  node.exe` (kills parallel sessions; it's blocked).
- **Dev store is SYNC** — some `db.*` return values not Promises; wrap
  `await Promise.resolve(db.x()).catch(...)` where async parity matters.
- **First cold-compile of a new page ~30s (Turbopack)** — bump Playwright `goto`
  timeouts to 40s.
- **Testing overrides default OFF** — payment kill-switches + solo-resolution.
  ⚠️ Solo-resolution is **no longer prod-hard-locked** (removed 2026-07-12, see
  Launch blocker #6) — it works everywhere and must be kept OFF for real money.

## 6 · Standing directives (Ali)
- **Never fabricate** legal/business/audit data or history — flag placeholders.
- **Production shows ONLY live data**; UI hides/empties when aggregates are empty.
- **Commit AND push** always (this repo). Full Railway CLI access granted here.
- **Gold-discipline:** player = earned-money / money-in only; admin = resolved seal only.
- **Visual-test every UI change** (screenshot + read) at 360 first, then up.
- **Motion must be genuinely polished** or not shipped.

## 7 · Key docs map
- `CLAUDE.md` — architecture bible (routes, DAL, roles, invariants).
- `docs/next-session-prompt.md` — **the handoff prompt for the next session.**
- `docs/ui-rollout-tracker.md` — per-batch work log (newest at top of Batch log).
- `docs/perfection-plan.md` — the 0-issue launch plan (phases A–G).
- `docs/gli-remediation-{plan,tracker}.md` — certification gaps.
- Audits: `ADMIN_VIEW_AUDIT_*`, `PLAYER_VIEW_AUDIT_*`, `ARCHITECTURE_AUDIT_*`.
- `docs/PHASE_E_AUDIT_2026-07-11.md` — the security/compliance/money-safety audit
  (6 fixed findings + the ranked flagged list for the next session).
