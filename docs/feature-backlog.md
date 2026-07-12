# 50pick / Kipindi — Feature Backlog & Planning Input

> **Purpose:** the ranked, planning-ready catalog of *new* features (post-launch-
> hardening). This is the INPUT for the feature-planning phase — the next session
> reads this in **plan mode**, picks the batch, and produces a concrete
> implementation plan (via ExitPlanMode) before writing any code.
>
> Created 2026-07-12 from the product brainstorm (player · owner · designer ·
> compliance · growth · ops lenses). See `next-session-prompt.md` for the
> canonical handoff and `responsiveness-audit.md` (a separate parallel sprint).

---

## 0 · Non-negotiable constraints (apply to EVERY feature here)

Embody ALL of these expert lenses while planning **and** implementing — hold them
at once; if any objects, resolve before shipping:
**software engineer · QA engineer · responsiveness engineer · front-end developer
· owner · player · compliance engineer.**

1. **Kit-only.** Use ONLY our design system: `src/components/ui/**` atoms, the
   brand vocabulary (`src/components/brand.tsx`), tokens in `src/app/globals.css`
   / `state-tokens.css`, in-house glyphs (`glyphs.tsx`), and the **Final UI
   enhancement Kit/** design source. **Never** introduce a new UI library, a
   one-off component, an ad-hoc colour/spacing, or anything outside the kit. One
   primitive per concern; status wording from `admin-status-lexicon.ts`; money via
   `formatTzs`; no hardcoded user-facing strings (trilingual EN/SW/ZH parity).
2. **Never fabricate** legal/business/audit/user data — production shows only live
   data; empty-states when aggregates are empty. RG enforced on every money path;
   PII masked; audit-on-every-mutation.
3. **Verified before submission — every item must be:**
   - **stress-tested** (concurrency / money-invariant / edge-load `*.test.mts` where money or state is touched; add a red-without-fix test for any money path),
   - **visually tested** (Playwright live-drive at **320 first** → 1920 + landscape, EN/SW/ZH, screenshot + READ; 0 h-overflow, overlays on-screen, ≥40px targets),
   - **hardened / "tampered"** (adversarial: bad input, forged cookies/roles, double-submit, race, offline, huge/long values — prove it can't be abused),
   - green on a FRESH server; tsc + `test:all` 45/45; six-role sign-off in the commit (`6-role: ✓`); commit AND push; confirm Railway deploy green.
4. **Gold-discipline:** player = earned-money / money-in only; admin = resolved-seal only.

---

## 1 · Ranked backlog

Legend — **Impact** (player+owner) · **Effort** · **Compliance sensitivity** · each lists
the WHY, the kit pieces to reuse, the infra that already exists, and acceptance criteria.

### P0 — highest value, low risk, infra mostly exists

#### F1 · Settlement-proof on resolved markets  ⭐  ✅ SHIPPED 2026-07-12 (5edd74b)
- **Status:** DONE. The `ResolutionPanel` already surfaced verdict + two-officer
  seal + source link + objection window + pool/fee; this batch added the missing
  **officer evidence excerpt** — persisted to `PredictionMarket.resolutionEvidence`
  at stage-1 of the ceremony (migration `20260712..._add_resolution_evidence`) and
  rendered as a gilt-bordered quote (trilingual `market.resEvidence`, empty-state
  when absent, injection-inert). +12 hardening assertions in `test:officer-conflict`;
  live-drive 320→1920 × EN/SW/ZH clean. 6-role: ✓.
- **What:** on a RESOLVED/VOIDED market, show players *how* it was settled — the
  officer's evidence excerpt + official source link + "sealed by two officers" +
  the objection-window state.
- **Why (trust):** answers the #1 fear of a real-money product ("is it rigged / will
  I get paid"). Turns our biggest compliance strength into the biggest trust signal.
  No sketchy competitor can fake a two-officer + sourced settlement.
- **Exists:** the resolution ceremony already captures the evidence excerpt + source
  URL + two-officer attestation + 24h objection window (admin side). This is largely
  a *surfacing* job — verify the fields are readable player-side and render them.
- **Kit:** `Card`, `Chip` (resolved/objection variants), `glyphs` (shieldcheck,
  fileText, external-link), `formatDateTime`, market-detail layout. Trilingual copy.
- **Compliance:** HIGH-positive — never fabricate; show only the real recorded
  evidence; mask officer identity per policy (officer A/B, not raw ids).
- **Accept:** resolved market on `/markets/[id]` shows verdict + quoted evidence +
  source link (opens official source) + "Two-officer sealed" + objection status; EN/SW/ZH;
  empty/void variants handled; 320→1920 clean; screenshot read.

#### F2 · Player security & activity self-serve (2FA + "Your activity")  ✅ SHIPPED 2026-07-13 (d9d7091)
- **Status:** DONE (both halves, one batch). **2FA:** opt-in TOTP reusing the admin
  RFC-6238 engine + **self-service backup codes** (new `TotpBackupCode` model, migration
  `20260712130000`; HMAC-hashed, single-use). Login is a TRUE pre-session gate — no
  session/cookie is minted until the challenge passes (`/auth/2fa`, rate-limited);
  disable+regenerate require fresh proof; a provisioned-but-unconfirmed secret can
  never lock a player out. **Activity:** `/profile/activity` — deposits/withdrawals/
  staked/won/net over week|month|all from real DB aggregates, with the invariant
  `net === won − staked === sumGamblingNetSince` (the exact number the loss-limit gate
  uses), plus RG limits-used-vs-cap computed from the SAME sums the gates enforce.
  **"Time played" deliberately NOT shown** — no server-side session history exists, so
  it would be fabrication. New suites `test:2fa` (29/29) + `test:activity` (21/21).
  Live-drive 320→1920 × EN/SW/ZH, 0 overflow. 6-role: ✓.
- **⚠ Follow-up (pre-existing, now documented):** the TOTP secret column is stored
  **plaintext** (totp.ts's comment claims AES-256-GCM at rest — it does not). Affects
  admin 2FA equally. Backup codes ARE hashed. Encrypting the shared secret at rest is
  a separate cross-cutting hardening item — recommend before real-money launch.
- **What:** (a) let players enable/disable **2FA** in profile; (b) a **"Your activity"**
  money-honesty dashboard — staked / won / lost / net this period, deposits vs
  winnings, time played, with RG limits inline.
- **Why (trust + RG):** self-serve security is table-stakes for real money; the
  activity view doubles as transparency ("honest about *my* money") and RG harm-
  prevention.
- **Exists:** `twoFactorEnabled` field on the user; admin already has TOTP; txn
  aggregates (`sumConfirmedByTypes`, per-user txn), `/positions/performance`, RG
  settings/limits.
- **Kit:** profile page shell, `Card`, `Chip`, `submit-button`, `otp-input`,
  `qrcode` dep (already present), the stat-tile/meter pattern, `formatTzs`.
- **Compliance:** HIGH — RG limits must show truthfully; PII masked; audit 2FA changes.
- **Accept:** player can turn 2FA on/off (TOTP enroll + verify) and is challenged on
  login; activity screen reconciles to the ledger (real numbers, not fabricated); RG
  limits + reality-check surfaced; trilingual; responsive; hardened (no bypass of the
  2FA challenge; rate-limited).

### P1 — retention & growth (the habit + viral loop)

#### F3 · Watchlist / follow + smart alerts  ⭐
- **What:** ⭐ a market to a watchlist; get alerts — "closes in 1h", "odds moved",
  "settled". Home surface for the alerts = push (F4) + in-app inbox.
- **Why (habit):** prediction markets are episodic; a follow-list + timely nudges is
  the #1 return-visit driver.
- **Exists:** notifications infra (`notification-service`, inbox bell), SSE event-bus.
  New: a `Watchlist` model (userId × marketId) + the alert triggers.
- **Kit:** `Chip`/star glyph toggle, `EmptyState`, notification inbox, market-card.
- **Compliance:** MED — alerts must not be pressuring ("place your bet now!" = RG risk);
  keep informational. No alerts to self-excluded/cooled-off users.
- **Accept:** follow/unfollow persists; a "closing soon" + "settled" alert fires to
  followers via inbox (+ push if F4); a watchlist view; trilingual; responsive; RG-suppressed
  for excluded users; stress-tested (many followers, no duplicate alerts).

#### F4 · Push notifications — actually live
- **What:** finish web-push: VAPID keys, subscription capture + storage, send path
  wired to the notification service; opt-in UI.
- **Why (retention):** mobile-first TZ; push is the highest-ROI return channel and the
  delivery arm for F3.
- **Exists:** `src/lib/register-sw.ts` already has the PushManager/VAPID scaffold +
  `public/sw.js`. Needs: VAPID env, a `PushSubscription` store, send integration, opt-in UX.
- **Kit:** a permission-prompt using `modal`/`confirm-dialog`, `submit-button`, glyphs.
- **Compliance:** MED — explicit opt-in; respect self-exclusion/cool-off; no push to
  excluded users; unsubscribe honored; never fabricate.
- **Accept:** opt-in flow; subscription persisted; a real settled-result push arrives on
  a device; opt-out works; excluded users never receive; hardened (no send without consent).

#### F5 · WhatsApp result / pick share cards
- **What:** one-tap share of "I picked YES on [market]" and especially "I won TZS X ✅",
  rendering our per-market OG image, defaulting to WhatsApp (TZ's default channel).
- **Why (acquisition):** cheapest authentic viral loop for Tanzania.
- **Exists:** `/api/og/market/[id]/route.tsx` already renders per-market cards. Needs a
  player-facing share action + a result-share variant + Web Share API.
- **Kit:** `button`/icon-button, share glyph, `modal` for fallback, brand OG styling.
- **Compliance:** MED — a shared "win" must be real (never fabricate an amount); no
  sharing that exposes another player's PII; gold-discipline on the win card.
- **Accept:** share action on a placed pick and on a win; WhatsApp deep-link + Web Share
  fallback; OG renders correctly; real amounts only; responsive; screenshot read.

### P2 — structural & owner tooling (bigger, higher-care)

#### F6 · Seeded / guaranteed liquidity on new markets  ⭐ (structural)
- **What:** transparent house-backed minimum liquidity (or a guaranteed-floor mechanic)
  so fresh markets aren't thin/one-sided → ugly payouts → bounce.
- **Why (liquidity):** the pari-mutuel cold-start is the ceiling on volume; solving it
  makes every new market worth betting from minute one.
- **Exists:** `traderSeeds` (display only) — real liquidity backing is different and needs
  house-risk controls + settlement accounting.
- **Kit:** market-card/detail pool viz, `Chip`.
- **Compliance:** HIGH — house participation in a pool it also settles is a conflict/
  fairness + accounting concern (POCA/GBT); must be transparent, ring-fenced, audited,
  and NOT let the house profit from resolving. **Plan this one carefully with compliance
  first; may need Ali/regulator input before build.**
- **Accept:** *design-first* — produce the mechanic + risk/accounting/compliance model in
  planning; only build once the model is signed off.

#### F7 · Owner insight dashboard (decision-grade BI)
- **What:** cohort retention, LTV, funnel (visit→register→KYC→deposit→first-bet), GGR by
  category, top markets by volume.
- **Why (owner):** tells you which features/markets earn — steers the roadmap.
- **Exists:** admin finance/analytics + `report-*`; materialized aggregates (`platform-stats`).
- **Kit:** admin-shell, `AdminCard`/`AdminKpi`, the dataviz system (dark-theme charts),
  `ScoreBadge`/`band`, tables with `overflow-x-auto`.
- **Compliance:** LOW-MED — internal; still real data only; PII masked in cohorts.
- **Accept:** admin-only; real aggregates (perf-safe, no full scans); trilingual N/A (admin
  EN·SW); responsive tables; screenshot read.

#### F8 · Local events content engine (AI-poll calendar)
- **What:** point AI-poll generation at a Tanzanian events calendar — Ligi Kuu (Simba/
  Yanga), CECAFA/AFCON, weather, crypto, entertainment — scheduling markets around real moments.
- **Why (growth):** relevance = organic virality; a market on tonight's Simba match sells itself.
- **Exists:** AI poll generation pipeline + admin candidates/curation.
- **Kit:** admin config/candidates surfaces.
- **Compliance:** MED — no markets on prohibited categories (e.g. anything violating GBT
  rules / minors / fixed-outcome integrity); source must be official/verifiable.
- **Accept:** a calendar-driven generation mode; officer approval retained; sources verifiable.

### P3 — polish & reach (do alongside)

- **F9 · Richer market detail** — odds-over-time chart + live pool split + projected-payout
  line (`projectedPayout` exists) + "why this market" context. Kit + dataviz. *Why:* comprehension → conversion.
- **F10 · Low-data "lite" mode** — text-first fast path (drop hero/charts) for true 2G
  (Phase-D found ~20s LCP on 2G). Toggle in profile. *Why:* widens rural reach.
- **F11 · Player-facing dispute/objection flow** — a visible "question this result" path
  into the admin queue (24h window exists server-side). *Why:* demonstrable fairness (POCA).
- **F12 · Live odds via SSE** — pools update live as bets land. *Why:* liquidity *feels* alive.
- **F13 · Public fairness ledger** — upgrade `/fairness` to a live, real-data transparency
  page (recent sourced settlements, dispute stats). *Why:* category-defining trust.

---

## 2 · Recommended first batch (my proposal)

~~Start with **F1 (settlement-proof)**~~ ✅ **F1 SHIPPED 2026-07-12 (5edd74b).**
~~Then **F2** (2FA + activity)~~ ✅ **F2 SHIPPED 2026-07-13 (d9d7091)** — both halves.
Next: the **F3+F4** retention pair (watchlist + push). Hold **F6** (liquidity) for a
compliance-led design pass before any code.

**Why this order:** F1/F2/F5 = *trust*, F3/F4 = *habit*, F6 = *liquidity* — the three
axes a real-money prediction market lives or dies on — and F1–F5 all reuse infrastructure
we already built (lowest risk, fastest to value).

## 3 · How the planning phase runs
1. In **plan mode**, read this doc + `next-session-prompt.md §2` (paths) + `CLAUDE.md`.
2. Pick the batch (default: F1). Research the exact files/fields/kit atoms it touches.
3. Produce an implementation plan (ExitPlanMode) covering: data model changes (if any),
   server + UI, the kit atoms reused, trilingual keys, the stress/visual/hardening test
   plan, and the six-role sign-off checklist — **before** writing code.
4. On approval, build → verify (stress + visual + hardened) → six-role → push → deploy green.
5. Tick this doc, mirror into `SESSION_STATUS.md`, append to `ui-rollout-tracker.md`.
