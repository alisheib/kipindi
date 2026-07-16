# Session E — everything-else — progress log

> Branch: `enhance/perfection-9` (clone `F:\kipindi-enhance`). NEVER deploys.
> Session M owns `main` + money-ops + all deploys. This file is E's own log.
> Contract: `docs/PARALLEL-SESSION-COORDINATION.md`.

## Baseline (session start, 2026-07-16)
- Cloned from `main` @ `ba3bc51c` (coordination contract commit).
- `npx tsc --noEmit` → clean.
- `node scripts/test-all.mjs --skip responsive` → 64/64 green (110s).

## Scope (only items that DON'T need a money service or the schema)
- [x] A8  twoOfficerGate() + <AttestationRail> (unify maker-checker)
- [x] A10 money .toLocaleString → formatTzs + guard (via test:integrity, no ESLint)
- [x] A9  config-factory rollout — migrated affiliate-config; other 5 done/excluded (see log)
- [x] §9.4 removed the redundant KPI `tone="gold"` alias (kept the `gold` boolean)
- [x] §9.2 Chip overlap — already structurally solved + call-site collapse gated on Ali (documented)
- [x] A17 hide the empty live-ops matches section (render only on a real feed)
- [ ] A9  migrate NON-money config modules to defineConfig
- [ ] A10 money .toLocaleString → formatTzs + lint rule
- [ ] A11 migrate 6 player popups onto <Modal> (wrapper only)
- [ ] A17 hide/tidy empty live-ops matches section
- [ ] A18 L6 remaining tap targets → ≥44px (+ visual verify)
- [ ] A19 P1 delighters (/live carousel auto-advance+swipe; /results arrows/swipe)
- [ ] §9.2/§9.4 UI cleanups (collapse Chip variants; remove dead KPI tone/gold branch)

## DENYLIST needs flagged to Session M
- **A8 (resolver two-officer gate):** the resolver's self-countersign B≠A gate
  and the emergency-void conflict block live in `src/lib/server/market-service.ts`
  (`market.resolve.conflict_blocked` ~L1341, `market.emergency_void.conflict_blocked`
  ~L2166) — DENYLISTED. They could adopt the new `twoOfficerGate()` helper
  (`src/lib/server/two-officer.ts`) for full unification, but I did not touch
  money code. Optional follow-up for M; behaviourally identical today.
- **A10 (server money toLocaleString):** raw-money `.toLocaleString` hits live in
  DENYLISTED `src/lib/server/**` (M's) and were NOT touched; my A10 guard skips
  `src/lib/server/`. M may want to route them through the money formatters too:
  `analytics.ts:384`, `validators.ts:85`, `responsible-gambling.ts:432`,
  `reports/brand.ts:91`, `reports/xlsx.ts:20`, `reports/pdf.ts:232`,
  `reports/catalogue.ts` (many money rows). Admin money pages
  (players/payments/finance/settlement/aml) already have NO money toLocaleString.

## Work log
_(newest last)_

### A8 — twoOfficerGate() + <AttestationRail> (DONE, batch 1)
- New `src/lib/server/two-officer.ts` — `twoOfficerGate({makerId, checkerId, reason, audit})`:
  when maker===checker, writes a COMPLIANCE `*.conflict_blocked` audit entry and
  returns `{error: "Second officer required — <reason>"}`; else returns null.
- New `src/components/admin/attestation-rail.tsx` — `<AttestationRail tone title>`:
  the shared maker-checker callout (tone `info`=amber/"rule", `blocked`=claret/
  "you're the maker"); bilingual title via `bi()`. Presentational, no state.
- Refactored to use them:
  - `reports/pack-actions.ts` approveReportPack → twoOfficerGate (behaviour identical).
  - `kyc/[id]/kyc-actions.ts` approveKycWorkstationAction → twoOfficerGate.
    **Behaviour change (improvement):** the KYC self-approval block now writes a
    `kyc.approve.conflict_blocked` COMPLIANCE audit entry (reports already did;
    KYC previously blocked silently). Consistent + better trail.
  - `reports/report-pack-controls.tsx`, `kyc/[id]/kyc-decision-rail.tsx`,
    `resolver/[id]/resolution-ceremony.tsx` banners → <AttestationRail>.
  - **Copy change (parity):** KYC high-risk banner heading was EN-only
    "Two-officer approval required"; now bilingual `CEREMONY.twoOfficerRule`
    ("Two-officer rule · Kanuni ya maofisa wawili"). Body text unchanged.
  - Resolver self-countersign banner normalised to the shared chrome
    (rounded-md/px-3 py-2.5/tracking-0.14em/icon-15 vs its old
    rounded-lg/px-3.5 py-3/0.16em/icon-16) — removes the drift the component exists to kill.
- objections: single-officer by design (uphold/reject + mandatory note) — no
  two-officer gate applies, nothing to unify there.
- Verified: `tsc` clean; test:kyc 12/12, test:officer-conflict 33/33,
  test:solo-resolution 18/18, test:audit 17/17 green.
- ⚠️ Visual re-verify of the 3 admin banners (kyc/reports/resolver) deferred to
  the consolidated admin visual pass in A18 (server up w/ DISABLE_ADMIN_TOTP).

### A10 — money format hygiene + guard (DONE, batch 2)
- Converted every editable UI money `.toLocaleString` to the shared formatters
  (`formatTzs`/`formatTzsCompact`/`formatNumber` in src/lib/utils):
  - components: `win-celebration.tsx` (RollingAmount → formatTzs),
    `live-ticker.tsx` (deleted the local `fmtAmt` dup → formatTzsCompact),
    `wallet-balance-pill.tsx` (delta → formatNumber, keeps its own +/− sign).
  - app routes (mine, same defect class): `profile/invite/page.tsx` (×2, bare
    cells → formatNumber), `proposals/page.tsx` (bare → formatNumber),
    `auth/register/page.tsx` (→ formatTzs), `admin/invites/invite-admin-client.tsx`
    (→ formatTzs), `admin/proposals/page.tsx` (deleted local `fmt` dup: counts →
    formatNumber, money → formatTzs), `admin/proposals/admin-proposals-client.tsx`
    (→ formatTzs).
  All output-identical (formatTzs(n)=="TZS "+grouped for +ints; compact edge
  cases like billions/≥10M read cleaner, e.g. "2.0B" not "2000.0M").
- **Guard (no ESLint in repo — `lint`==`tsc`):** added an A10 rule to the existing
  `scripts/content-integrity.test.mts` (`npm run test:integrity`, in test:all/CI).
  Two precise regexes over `src/components` + `src/app` (skips denylisted
  `src/lib/server`): bans `TZS {…toLocaleString}` (toLocaleString INSIDE the unit
  interpolation) and `*Tzs.toLocaleString`. Verified: catches the 4 antipatterns,
  no false-positive on count/date toLocaleString (incl. finance's count line).
- Verified: tsc clean; test:integrity OK.

### A9 — config-factory rollout (DONE, batch 3)
Migrated **affiliate-config.ts** onto the shared `defineConfig` factory (the clean,
intended deep-merge adopter): removed its hand-rolled `globalThis.__50PICK_AFFILIATE_CONFIG`
cache + eager `loadConfig().then()` hydrate + manual `saveConfig`/`audit`; kept its
types, DEFAULT, `validate`, deep `mergeConfig` (passed as the factory `merge`), and
`deepClone` on the sync getter (preserves nested-object isolation the factory's
shallow get() doesn't give). Audit shape unchanged (ADMIN `affiliate.config.updated`,
`{before,after,changes}`). Confirmed no external reader of the old global (grep:
only self-references — the docstring's "backup snapshots the global" was stale).
- Verified: tsc clean; test:config 10/10, test:referral 15/15, test:invites 32/32,
  test:invite-flow 25/25.

**The other 6 named modules — deliberately NOT force-migrated (rationale):**
- `proposals-config` — ALREADY on defineConfig (nothing to do).
- `ai-config` — no admin-mutable persisted state (static env const + one async
  `getConfiguredModel` helper); has no `set`, so the factory shape doesn't apply.
- `ai-poll-config` — INTENTIONALLY not DB-persisted (explicit comment; `updateAIPollConfig`
  clamps fields in place). defineConfig always loads/saves via config-store, so
  migrating would start persisting to Postgres in prod — a behaviour change. Left as-is.
- `ai-ops-config` — async getter with read-time model/interval **whitelist coercion**
  (a stored deprecated model silently falls back to default), and per-field setters
  (`setAiModel`/`setSentinelInterval`) with **no officerId and no audit**. Migrating
  would change those signatures + start emitting audits + drop the read-time coercion.
- `platform-config` — `getPlatformConfig()` **awaits** the DB load on first read, so
  `isMaintenanceMode()` (gates NEW bets/deposits in the DENYLISTED wallet/market
  services) is correct from the very first call. defineConfig hydrates eagerly+async,
  so `get()` returns defaults until the background load resolves → a brief post-boot
  window where maintenance could read OFF on a money path. **Money-safety regression —
  not migrated.**
- `test-overrides` — POCA §16 control: `getConflictedResolutionAllowed()` hard-returns
  false in prod and the setter writes a **COMPLIANCE**-category audit with a custom
  payload; defineConfig only emits ADMIN audits. Compliance-sensitive — not migrated.

**Flag for M (optional, needs the factory owner):** to migrate `platform-config`
safely the factory would need an "await-first-read" hydration option; that change
would also touch the DENYLISTED `bonus-config` (which uses defineConfig), so it's
an M-side call, not E's.

### §9.4 + §9.2 UI cleanups + A17 (DONE, batch 4)
- **§9.4 KPI de-dup:** `AdminKpi` (admin-shell.tsx) had BOTH a `gold` boolean and a
  redundant `tone="gold"` alias; no caller ever passed `tone="gold"` (only the
  boolean, at insights/page.tsx). Dropped `"gold"` from the `tone` union
  (now `"danger" | "success"`); kept the `gold` boolean + the live `text-gold`
  branch. tsc-verified no AdminKpi caller relied on `tone="gold"` (other
  components' own `tone="gold"` — Stat/PageHeader/PageHero — are untouched).
- **§9.2 Chip:** NOT changed — chip.tsx already solves the overlap structurally
  (the semantic pairs neutral/cat, yes/success, brand/active, gold/objection share
  ONE style object so they can't drift), and its own docstring says collapsing the
  aliases at call sites is "a separate design decision — pending Ali's sign-off."
  That's an Ali call (and it's listed under "(C) optional polish"), so E leaves it.
- **A17 live-ops matches:** the `matches` feed is a permanently-empty stub
  (`ui-stubs.ts`, awaiting the Sportradar integrity feed) used only on
  `/admin/live`. Changed the "Live matches · in progress" card to render ONLY when
  `liveMatches.length > 0` — so the perpetual "No live matches at the moment" empty
  card is gone, the table scaffolding stays ready for the signed feed, and the
  truthful "0 live matches" KPI (doesn't pulse at 0) stays. Never fabricates.
- Verified: tsc clean.
