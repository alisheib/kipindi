# 50pick — DESIGN + DETAIL pass (next-session kickoff)

Paste the block below to start the next session. It runs a **design-quality pass**
across the whole platform — **admin AND player-facing** — acting as *Claude Design*
(the highest-access design role that `docs/design-master-brief.md` is written for):
for each surface, produce a grounded spec, then implement it, then verify it visually.

Scope note: the 2026-07-20 session was ADMIN-only and shipped structure (loaders,
pagination, empty-states, two B6 verdict fixes). THIS session is about **design and
missing details** — the visual finish, the asset gaps, the elevations — everywhere.

---

```
cd C:\kipindi-main && git fetch origin && git status && git log --oneline -14 && git pull

Read, in this order, before touching anything:
  1. .claude/skills/50pick-standards/SKILL.md + its references/         (always-on bar + method)
  2. docs/NEXT-SESSION.md            <- the two newest "Done (Session …)" blocks + the
                                        "Deferred / decided" list are your starting backlog
  3. docs/DESIGN_AUTHORITY.md        <- invariants B1–B6 (palette 268, YES/NO, single theme,
                                        claret/aqua, gold discipline, B5 motion tokens,
                                        B6 read-never-infer). Violating one is a bug; "fixing"
                                        one is ALSO a bug.
  4. docs/design-master-brief.md     <- THE design brief. You are the "Claude Design" it
                                        addresses. §4 atoms, §5 per-page manifest, §6 cross-
                                        cutting, §7 assets, §8 constraints, §9 return format.
  5. docs/ADMIN_VIEW_AUDIT_2026-06-28.md  (§3/§4 remaining polish)
  6. src/app/globals.css             <- authoritative tokens; if a doc disagrees, this wins.

THIS SESSION = DESIGN + MISSING DETAIL, platform-wide (admin + player). Not admin-only.
Method — act as Claude Design: for each surface you touch, FIRST write a short grounded
spec in the design-master-brief §9 return format (real EN/SW/ZH copy, real hex/token names,
every state, motion + reduced-motion fallback, the asset to produce, the money-path note),
THEN implement it from the kit, THEN verify it visually. Reuse the kit and tokens by name;
never hand-roll a one-off that duplicates a primitive — extend the kit and use it everywhere.

THE BAR (from perfection-plan §0 / 50pick-standards §1): Perfect · 0 issues. Correct ·
money-safe · compliant · consistent · responsive 360→768→1280→1920 · WCAG AA · trilingual
EN·SW·ZH (admin EN+SW) · fast · and VISUALLY VERIFIED with a human-read screenshot for every
state × width × locale that matters. A green suite is necessary, not sufficient — LOOK.

PLAN — close these gaps (a starting backlog; challenge + extend it):

  GENERAL / PLAYER (docs/design-master-brief §5a–c, §6, §7) — highest-leverage first:
   - Real MNO / payment logo set (M-Pesa, Airtel Money, HaloPesa, Mixx by Yas, Card, Bank) —
     deposit + withdraw + wallet Methods. Biggest single iconography win. [H]
   - Category-art layer: promote the 8 topic glyphs to filter chips + a detail-page watermark
     behind /markets/[id] + a home category row. [H/M]
   - Leaderboard top-3 PODIUM (crest + TierBadge + avatar, gilt #1). [H]
   - Invite share-card image + QR (navigator.share) on /profile/invite; wallet 30-day balance
     sparkline; limit-usage meters on /wallet. [H]
   - KYC progress-rail illustration + per-slot ID silhouettes + gilt burst on APPROVED;
     /profile/sessions device cards (phone/desktop glyph, aqua "live" on current);
     source-of-funds per-source glyphs. [H/M]
   - PageHero adoption on the 5 routes that skip it (3× proposals, /fairness, /profile/invite);
     proposals-approved / create-success "reward burst"; /fairness provably-fair diagram. [M]
   - Per-FAQ topic glyphs (/help); RG self-care line-art (/profile/responsible-gambling);
     legal per-doc header icons; dynamic OG for leaderboard/results/proposals/profile. [M/L]
   - Challenge the built "good" surfaces too (§4g): ConvictionDial/TippingBar, MarketCard
     density, empty-state art, buttons/chips hover-active-focus recipes, modals' reward crests.

  ADMIN (still open after 2026-07-20 — see NEXT-SESSION "Deferred / decided"):
   - AdminKpi `series`/spark slot: feed 24h/7d mini-series into overview/finance/live/markets
     KPI bands (only cohorts + reports use it today) — one helper lifts the whole console. [M]
   - /admin/players: add a KPI band (counts are still header chips); status-mix bar. [M]
   - /admin/players/cohorts: replace hand-rolled distribution/month bars with AdminBarList +
     AdminAreaChart. /admin/players/[id]: risk score → CircularProgress gauge. [M]
   - Silent-zero-on-failure on money/analytics reads (finance, overview, live, approvals,
     players, kyc/[id], resolver*): today a failed query renders "TZS 0" / an empty queue as
     if real. Design an explicit "unavailable / couldn't compute" state (A-5). ⚠️ MONEY-ADJACENT
     — this is a real logic-vs-display bug; decide the state design here but coordinate the
     data-layer change carefully, do not silently swallow.
   - PII in two list views (privacy on-behalf, self-exclusion roster show full names) — a
     compliance/design decision (mask vs. justified need).

INVARIANTS (violating = a bug, "fixing" them = ALSO a bug):
   - Royal indigo hue 268 is the canvas, NOT teal. --teal-* are deprecated aliases of --royal-*;
     the real teal family is --aqua-*. YES=green / NO=rose, never inverted. Gold = earned-money
     ONLY. Claret editorial only. Aqua ≤8% surface, never semantic. Single dark theme, no light.
   - B5: motion tokens have ONE definition site; easings are BARE curves; every transition/anim
     states a duration. Never redeclare an --ease-/--dur-/--glow- in a second stylesheet;
     namespace instead. Guard: npm run test:tokens.
   - B6: a settled outcome is READ from resolvedOutcome, never inferred from a probability/%/pool.
     Prefer showing nothing to a guess on any money surface. Guard: npm run test:outcome.
   - WCAG AA: when a token fails contrast, DARKEN THE FILL, never lighten the label.
   - No mascots; gilt line-art idiom; no baked-in text in reusable art (trilingual);
     prefers-reduced-motion fallback on every motion.

DO NOT touch / "fix" (deliberate + documented): text-[Npx] arbitrary sizes; text-white on
brand-500 pills; bg-black/40..60 scrims; bg-white on QR + toggle knobs; the --teal-* compat
shim; the dual radius scale (CSS --r-* vs Tailwind, deferred).

MONEY = VISUAL ONLY. Restyle/restructure/add states freely; never change payout arithmetic,
settlement, ledger or payment logic. If you find a money-logic bug, STOP and report it — do not
fix it inline (the silent-zero item above is the one place you scope a data change, carefully).

VERIFY before every push (every push is a LIVE deploy to https://50pick.tz):
   npx tsc --noEmit
   npm run build
   npm run test:all            # expect 82/83 — test:responsive needs a live :3000
   npm run test:tokens && npm run test:outcome && npm run test:integrity
Then verify VISUALLY on a real running server (no local Postgres → use `next dev`, in-memory
store is allowed outside production; admin routes need DISABLE_ADMIN_TOTP=true to render):
   DISABLE_ADMIN_TOTP=true npx next dev -p 3000
   BASE=http://localhost:3000 SURFACE=all LOCALES=en,sw,zh SHOTS_ALL=1 node scripts/responsive-audit.mjs
   # screenshots -> .50pick-shots/responsive/ — READ them, don't just count them.
After pushing: poll https://50pick.tz/api/health until uptimeSec resets (fresh boot), then
smoke every changed route (public = 200; admin = 307 auth-redirect, never 500). `railway logs
-s 50pick` for a clean boot (CLI = alisheib07).

WORK AUTONOMOUSLY. Don't stop for questions — decide from the brief + tokens + code, work clean,
commit in coherent batches with real messages, push each batch, and update every doc you
invalidate as you go (design-master-brief §5 rows, DESIGN_AUTHORITY, NEXT-SESSION). Prove every
gap before "fixing" it — read the code, confirm it renders that way, say so plainly if it turns
out not to be real. No placeholders, nothing half-wired, no "coming soon". When finished, update
docs/NEXT-SESSION.md with what changed and what remains.
```

---

## Where things stand going in (from the 2026-07-20 admin pass, @ 6636b65)

- **Structure is solid on admin:** all 41 routes have real skeleton loaders; every unbounded
  list is paginated; table empty-states are unified on `AdminTableEmpty`; two B6 verdict
  surfaces fixed (markets list reads `resolvedOutcome`; resolver-queue shows honest crowd %).
- **Reported, not fixed (open):** widespread silent-zero `.catch` on money reads; PII in two
  list views. See NEXT-SESSION.md "Money-logic risks".
- **Kit already has the primitives** you'll reuse: `AdminKpi` (with an unused `series`/spark
  slot), `AdminAreaChart`, `AdminStackedBars`, `AdminFunnelChart`, `AdminMeter`, `AdminBarList`,
  `AdminSpark`, `AdminTableEmpty`, `admin-skeletons.*`; player side has `EmptyState` (11 kinds),
  `PageHero`, `AuthShell`, `RouteError`, `ConvictionDial`/`TippingBar`, `ConfirmDialog`,
  `Pagination`. Extend these — don't duplicate.
