# Next-session handoff — 50pick Final UI enhancement Kit rollout

> **Status: the autonomous UI-kit rollout is COMPLETE.** Every item that could be built without a
> product/compliance decision or new backend is shipped, verified, and pushed to `main`. What remains is a
> different *kind* of work — it needs **Ali's decisions** and, in most cases, **new backend**. So the next
> session is NOT a "run long and build everything" sprint like the last ones. Read "How to start the next
> session" (§6) first.

Single source of truth stays **`docs/ui-rollout-tracker.md`**. Memory: **`ui-kit-rollout`** (+ `five-lens-mindset`,
`kipindi-env-setup`, `kipindi-admin-testing`, `kipindi-card-standard`, `50pick-naming`).

---

## 1 · Progress refresh — what's DONE (all pushed to `main`)

The entire player-facing rollout + the two Ali-requested consistency items + the finishing carry-overs are done.
Each passed the full gate (tsc + i18n 1217³ + money tests + `ui-regression` 158/158 + screenshots read).

- **Foundations F0–F3** · **PART A A1–A10** · **PART B B1–B12** · **PART C C1a–C2m** — ALL complete.
- **Logo** = mark-a everywhere (`fe81145`).
- **App-wide gold-discipline** swept: gold = earned-money / earned-status / money-in ONLY; nav/chrome/categories → royal/aqua/neutral.
- This session's items:
  - **C2l** `b7c7f39` — PWA manifest shortcuts + a real portrait screenshot.
  - **C2m** `18d6a55` — legal "regulator-letter" header (GiltCorner seal + per-doc glyph) → **PART C done**.
  - **ADM1** `76efba1` — `/admin/reports` analytics console on the **normative money module** (`src/lib/server/report-money.ts`).
  - **EMAIL1** `59686e5` — all 43 transactional emails de-golded to the gold law (9 earned emails keep gold).
  - **AI1** `10b6ce1` — chat/AI assistant de-golded (FAB + citations → pearl; live signals emerald→aqua).
  - **Carry-overs** `be4cc89` — reduced-motion sweep (nav-progress + skeleton) + `/not-found` kit frame (A3).
  - **ADM2 gold fix** `11fc2a5` — officer settlement result royal, not gold.
  - **Final cleanup** — deleted the uncommitted `resolve-seed-markets`; tree clean.

**Nothing is half-done or unpushed.** The tracker rows are all `[x]` except the four ADM feature-builds (below).

---

## 2 · Decisions ONLY Ali can make (surface these FIRST)

The next session should put these to Ali before building, because they change money surfaces / need compliance input.

### D1 — GGR definition reconciliation *(money surface — Ali decides)*
- **The issue:** `/admin/finance`, `/admin/live`, and the admin overview label **turnover** (stakes only) as
  "GGR". The correct, standard definition — which your own statutory report prose *and* the new reports console
  use — is **GGR = Stakes − Payouts**. So "GGR" currently means two different numbers across the admin.
- **The fix (once Ali says go):** migrate those legacy surfaces to `src/lib/server/report-money.ts` so GGR =
  Stakes − Payouts everywhere. **This changes the displayed numbers on finance/live/overview** (they'll drop to
  the correct, smaller figure), so Ali must be told before it ships. Low code risk (no test pins the old value);
  the risk is purely "the numbers a person sees change."
- **Where:** `analytics.grossGamingRevenue()` (returns stakes) is the mislabelled source; `report-money.ts` is the
  correct one to standardise on.

### D2 — Which ADM feature(s) to build, and confirm the backend can be built
The four ADM items are **new compliance/payments features**, not UI polish. Each needs a real backend + Ali's
product/compliance decisions (see §3). Ali should say which to prioritise and confirm the backend scope.

### D3 — Remove the committed dev-test endpoints? *(hygiene only)*
- They're already `404` in production (guarded) so **prod already ships only live data**. But `ui-regression.mjs`
  + 7 retest scripts depend on them (seed-admin/seed-markets/fresh-kyc-player…). Removing them would break the
  test harness for **zero prod benefit**. Only do it if Ali wants the code gone for hygiene — and migrate the
  harness off them first. Default: **leave them**.

---

## 3 · The four blocked ADM items — what each needs and how to tackle it

Spec: **`Final UI enhancement Kit/50pick-design-final/spec/50pick-admin-reporting-spec.md`** (companion HTML:
`specimens/50pick-admin-batch3.html`). Admin idiom: EN primary + SW subtitle, **no ZH**, mono-heavy, **no gold
except the resolved/sealed state**, aqua = live, claret = destructive, royal = nav/selection.

> **Golden rule for all four:** never fabricate compliance state (fake officer names, fake objection windows,
> fake reconciliation numbers) and never risk the settlement money-path. Build the UI over REAL backend state or
> not at all. Where a behavior doesn't exist yet, it needs backend first — that's the blocker.

### ADM1 remainder — Regulator-pack maker-checker signing chain
- **Done already:** the analytics console (KPIs, Daily P&L, category breakdown) + the statutory report library.
- **Blocked part:** the "Regulator pack" card with the state chain `Draft → Prepared → Approved → Submitted →
  Acknowledged` and **mandatory two-officer signatures** (Prepared-by / Approved-by, Submit disabled until both
  signed), file artifact + sha256.
- **Needs:** (a) a **report-pack signing backend** — a data model for pack state + two server actions
  (prepare / approve) + audit; (b) an Ali/compliance decision on **who the officers are and their signing
  authority**. The generation-log already records who *generated* a report (real actor) — that's the only real
  signal today; everything past "Prepared" needs new state.
- **Build order once unblocked:** backend model + actions → render the chain (reuse the fairness-chain pattern)
  bound to REAL state → typed-confirm on Submit → the seal on Acknowledged (the one sanctioned gold here).

### ADM2 — Two-officer Resolution *Ceremony* (`/admin/resolver/[id]` — new detail page)
- **Done already:** the safe two-officer flow lives in `resolver-queue` (stage-1 stages / stage-2 settles + pays,
  same-officer-can't-confirm-twice) and it's kit-clean; its one gold leak is fixed.
- **Blocked part:** the dedicated **ceremony** page — evidence-left / verdict-right, a two-slot attestation rail,
  **seal & publish with a typed-`SEAL` hard confirm**, a **24-hour objection-window ring**, and **VOID must toast
  the player** (closes the silent-void bug).
- **Needs:** new backend — an **objection-window** timer, a **void→player-notification**, and **evidence
  paste-storage**; plus it's **money-critical** (it wraps the settlement action), so Ali should greenlight
  redesigning the settlement UI.
- **Safe-to-build-first slice (no backend, no money-path change):** the ceremony *layout* over the existing
  `resolveMarketAction` + the typed-`SEAL` confirm gate (a stricter client confirm for the irreversible stage-2).
  Defer objection-window / void-toast / evidence-storage until their backends exist. Verify the two-officer
  settlement end-to-end after ANY change here (`test:markets` 18, `test:officer-conflict` 17 must stay green).

### ADM3 — KYC / AML workstation (`/admin/kyc/[id]` — new route)
- **Needs a new backend + UI:** a document viewer (ID front/back/selfie, zoom/rotate, EXIF/liveness strip), a
  tri-state decision checklist, an `AdminMeter` risk score, an SLA countdown, reason-code reject, escalate-to-AML,
  and the **same two-slot maker-checker rail as ADM2** above a configurable risk score.
- **Blocked because:** the decision/checklist/risk backend + document pipeline don't exist. Existing KYC review
  (`test:kyc`) is the seed to build on. Compliance decision needed on the risk-score maker-checker threshold.

### ADM4 — Payments ops (`/admin/payments` — new route)
- **Needs new backends:** per-MNO health telemetry (success rate, p50/p95, last failure), **deposit/withdrawal
  kill-switches** (hard-confirm, claret "PAUSED BY … " header), **ledger-vs-PSP reconciliation** (drift must be
  TZS 0), and a **retry queue** (retry-now / cancel-&-refund). B6 referenced a per-MNO availability flag as the
  seed for the kill-switch.
- **Blocked because:** none of the telemetry/reconciliation/retry backends exist; all are money/ops-critical. Only
  live data — cannot fabricate MNO health or reconciliation numbers.

---

## 4 · Work the next session CAN do autonomously (no Ali decision needed)

### A8-breadth — opportunistic admin-primitive adoption *(the only purely-autonomous item left)*
- Adopt `AdminMeter` / `AdminBarList` / `AdminSpark` (all in `components/admin/admin-charts.tsx`) on the ~12 admin
  screens whose data genuinely fits (players/cohorts already done). **Only where it truly adds value** — do NOT
  force a meter/bar-list onto a screen where a table already reads fine (that would fail the quality bar).
- Candidates to scan for a real data-fit: ai-usage, moderation, aml, self-exclusions, retention, affiliate,
  bonuses, invites, privacy, audit, players/[id], system. Distribution/count data → `AdminBarList`;
  value-vs-cap → `AdminMeter`; a ≥2-point real series → `AdminSpark`.
- **Gotcha:** `db.user.list()` is a SYNC array in the dev store — wrap `.catch` in `Promise.resolve(...)`. Don't
  put `prog-sweep` on an `absolute` bar fill (it forces `position:relative` and collapses the fill).

### Bitmap assets — ⊘ Ali's pipeline, not code
Still needed from Ali (drop-in ready in code): hero `hero-bg.webp` (TZ-appropriate), propose/bonus/invite banners,
category `*.webp`, navy-weave texture, `win-seal.png`, the 4 **official MNO logos** (`PaymentLogo.MNO_LOGOS` is a
1-line-per-slug drop-in), and the **regulator seal** (the deposit trust-strip slot is labelled + waiting).

---

## 5 · Laws + per-item loop (unchanged — carry forward)

**Five lenses on every item:** integration engineer · UI/UX engineer · software architect · manager · player.
Resolve or record every concern a lens raises.

**Design laws:**
- Gold = earned-money / earned-status / money-in ONLY. Everything else → royal / aqua / neutral.
- Only live data in prod — hide UI when aggregates are empty; **never fabricate** (no fake data, signatures, or state).
- Never regress money paths. Trilingual EN/SW/ZH (admin is EN + SW subtitle, no ZH; emails are EN/SW).
- Reduced-motion on every animation. Logo = mark-a.

**Per-item loop:** five lenses → implement against the kit → **mobile 360 FIRST** then 768/1280/1920 →
`tsc --noEmit` + `test:i18n` (1217³) + relevant money tests → **ONE fresh dev server** (`taskkill //F //IM
node.exe`, confirm a single PID on :3000) and **READ the screenshots** → `node scripts/ui-regression.mjs`
(158/158) → commit + push to `main` with the `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer → update
the tracker row **and** the `ui-kit-rollout` memory.

**Key gotchas (learned this rollout):**
- `ui-regression` false-fails: a **seeded store** makes player pages fire `navigator.vibrate` on load → dozens of
  false console-error fails. Run the 158/158 gate against a **fresh, unseeded** server (kill node, one clean PID).
- Read the screenshots even when the automated check passes — a **clipped-not-scrolled** overflow (e.g. an admin
  grid track that won't shrink) passes the no-h-overflow check but visibly cuts content. Fix grids with
  `grid-cols-[minmax(0,1fr)_…]`.
- Dev server: `SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3000`; seed admin via
  `POST /api/dev-test/seed-admin`; locale cookie is `kp-locale` (sw/zh/en).
- To render + eyeball an email: a temp `api/dev-test/email-preview?t=<name>` route returning the template HTML
  (delete it after). To drive resolved-market/payout data for reports/results: re-create a `resolve-seed-markets`
  dev endpoint (bets both sides on real seed markets, fast-forwards, two-officer resolves) — the one from this
  session was uncommitted and deleted at cleanup.

---

## 6 · How to start the next session

This is **not** a fire-and-forget autonomous sprint anymore. Do this in order:

1. **Recall** the `ui-kit-rollout` memory + read `docs/ui-rollout-tracker.md` — confirm this handoff still matches
   reality (all `[x]` except the four ADM rows).
2. **Ask Ali the §2 decisions** (D1 GGR reconciliation, D2 which ADM to build + backend go-ahead, D3 dev-test).
   Don't build the money-surface / compliance items until he answers — they change what people see or need
   compliance input.
3. **While waiting / if Ali is away again:** do the one safe autonomous item — **A8-breadth** (§4), strictly where
   a primitive genuinely improves a screen. Follow the per-item loop; ship each.
4. **Once Ali answers:** build the greenlit ADM item(s) per §3 — backend first, then UI over REAL state, verifying
   the money path stays green at every step. For ADM2 you can ship the safe layout + typed-`SEAL` slice even
   before the objection-window backend exists.

**When to stop:** when every tracker row is done or genuinely blocked on an Ali decision / missing backend /
⊘ asset. Record blockers, don't halt on one — move to the next non-blocked item (today that's only A8-breadth).
