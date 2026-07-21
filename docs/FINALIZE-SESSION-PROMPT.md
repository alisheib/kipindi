# 50pick — FINALIZE session kickoff (autonomous, run-until-done)

> Paste the block below as the session's first message. It is self-contained.
> Ali is AWAY — do not stop for questions; decide from the docs + tokens + code,
> work clean, and only pause for the two hard STOP conditions named inside.

---

cd C:\kipindi-main && git fetch origin && git status && git log --oneline -12 && git pull

Read, in this order, before touching anything:
  1. .claude/skills/50pick-standards/SKILL.md + its references/     (always-on bar + method)
  2. .claude/skills/50pick-audit/SKILL.md                           (safe DB/Railway ops + money invariants)
  3. docs/NEXT-SESSION.md — the **2026-07-21 block is the current truth**. It lists what
     shipped, what is PROVEN-ALREADY-DONE (do NOT re-chase), and the DEFERRED items you
     are here to finish.
  4. docs/DESIGN_AUTHORITY.md (invariants B1–B6) + docs/design-master-brief.md (§9 return
     format) + src/app/globals.css (authoritative tokens; wins on any conflict).
  5. docs/GO-LIVE-READINESS.md + docs/ENHANCEMENT-PLAN-STATUS.md (context on the launch gate).

STATE: the 2026-07-21 platform-wide DESIGN pass is DONE. A grounded survey proved MOST of
the master-brief backlog was already shipped (leaderboard podium, invite share-card+QR+share,
wallet sparkline+MNO logos, reward-bursts, category-art layer, KYC rail, SoF glyphs, fairness
diagram, help/RG/legal art, dynamic OG on all boards + register, manifest shortcuts, /offline).
**Do not re-build any of that.** You are FINALIZING the few genuinely-open items below.

THE BAR (50pick-standards §1): Perfect · 0 issues. Correct · money-safe · compliant ·
consistent · responsive 360→768→1280→1920 · WCAG AA · trilingual EN·SW·ZH (admin EN+SW) ·
fast · and VISUALLY VERIFIED with a human-read screenshot for every state × width × locale
that matters. A green suite is necessary, not sufficient — LOOK at the screenshots.

WORK — do the SAFE lanes first, fully verify + push each, THEN the money-adjacent lane:

  LANE 1 — Sparse "Today" board (pure UI · first screen a tester hits). [H]
   /markets defaults to the "Today" filter; on a quiet day that renders ONE card + a large
   empty gap while the header reads "N live". KEEP Today as the default. Add a graceful
   continuation when the current filter yields few cards: after the matching cards, a slim
   "That's all closing today — see this week → / all →" band (real EN/SW/ZH copy; the
   §2b empty-window strings exist: "Nothing closing that soon" / "Hakuna yanayofunga hivi
   karibuni" / "近期没有即将结束的市场"). Do NOT inject markets that don't match the filter —
   it's a navigational nudge, not a filter override. Verify at 360 EN/SW/ZH.

  LANE 2 — PII in two admin list views (compliance/design). [M]
   privacy on-behalf table + self-exclusion roster render full `displayName` (phones already
   masked). Default to MASKING to match the player-detail treatment (mask in the list, full
   only on the detail page) — that is the safer, PDPA-aligned call. Emit no new PII to a
   broad view. Pure display; no data-model change. (This closes the last 2026-06-28 §3 item.)

  LANE 3 — Full-platform visual QA sweep (find + fix OBJECTIVE defects only). [H]
   Run the responsive-audit across ALL player + admin surfaces at 360/768/1280/1920 in
   EN/SW/ZH (admin EN+SW), SHOTS_ALL=1, and READ the screenshots — do not just count.
   Fix ONLY objective defects: horizontal overflow, clipped-not-scrolled content, off-screen
   overlays, SW/ZH truncation, misaligned MarketCard rows/heights, sub-40px tap targets that
   are genuinely reachable. Do NOT restyle already-polished surfaces for taste (that risks
   regressing them — perfection-plan / DESIGN_AUTHORITY). Screenshot → fix → re-screenshot.

  LANE 4 — The two DEFERRED money-adjacent design items. ⚠️ CAREFUL · do LAST · READ-ONLY.
   These were deferred 2026-07-21 because they need REAL per-metric data, and a proxy would
   fabricate a figure (A-5 / no-fabrication). You MAY add **read-only analytics aggregations**
   for them, but:
     • 🛑 STOP AND REPORT — do not fix inline — if the work requires touching ANY payout
       arithmetic, settlement, ledger, wallet-mutation, or payment logic. Those are off-limits
       to an unsupervised session.
     • Run the FULL `npm run test:all` + every money suite (money-invariants, wallet, ledger,
       trial-balance, payout-alloc, concurrency, admin-money-ops) GREEN before ANY push here.
     • If you cannot prove the displayed figure is the REAL metric (not a proxy), LEAVE IT
       DEFERRED and say so. A missing spark is fine; a misleading one is a money-surface bug.
   (a) AdminKpi money-tile sparks (overview/finance/live GGR/NGR/active): add a bucketed
       per-metric 24h/7d series helper (read-only) and feed `AdminKpi series=`. The metric's
       OWN trend only — `moneyFlowSeries` (net flow) is NOT the GGR trend.
   (b) Wallet limit-usage meters: add a read-only "used today/this-week deposits + loss today"
       aggregation and render value-vs-cap meters on the RG/limits surface (reuse AdminMeter's
       idea via a player meter). Honest numbers or nothing.

INVARIANTS (violating one = a bug; "fixing" a correct one = ALSO a bug):
   - Royal hue 268 is the canvas, NOT teal (--teal-* are deprecated aliases of --royal-*;
     the real teal family is --aqua-*). YES=green / NO=rose, never inverted. Gold = earned
     money ONLY. Claret editorial only. Aqua ≤8% surface, never semantic. Single dark theme.
   - B5 motion tokens: one definition site, bare-curve easings, every transition states a
     duration. Guard: npm run test:tokens.
   - B6: a settled outcome is READ from resolvedOutcome, never inferred. Guard: test:outcome.
   - A-5: never present a fabricated figure as fact — if it can't be computed, show the
     explicit "unavailable / couldn't compute" state (AdminKpi `unavailable` + AdminLoadError
     already exist), never a substantiated-looking zero.
   - WCAG AA: when a token fails contrast, DARKEN THE FILL, never lighten the label.
   - No mascots; gilt line-art idiom; prefers-reduced-motion fallback on every motion;
     no baked-in text in reusable art (trilingual).

DO NOT touch / "fix" (deliberate + documented): text-[Npx] arbitrary sizes; text-white on
brand-500 pills; bg-black/40..60 scrims; bg-white on QR + toggle knobs; the --teal-* compat
shim; the dual radius scale. Do NOT re-chase the PROVEN-ALREADY-DONE list in NEXT-SESSION.

VERIFY before every push (each push = a LIVE deploy to https://50pick.tz):
   npx tsc --noEmit && npm run build
   npm run test:tokens && npm run test:outcome && npm run test:integrity
   # money-adjacent (Lane 4) or any money-touching change → the FULL suite:
   npm run test:all      # expect the money suites green; test:responsive fails locally (needs :3000)
Then verify VISUALLY on a real running server (no local Postgres → in-memory store is allowed
outside production; admin routes need DISABLE_ADMIN_TOTP=true):
   DISABLE_ADMIN_TOTP=true npx next dev -p 3000
   # seed via a THROWAWAY playwright context (POST /api/dev-test/seed-markets etc.); keep the
   # admin context clean = ONLY POST /api/dev-test/seed-admin (other seed endpoints set their
   # own session cookie and will clobber the admin session). In Git Bash, prefix env with
   # MSYS_NO_PATHCONV=1 or an ONLY=/path filter is silently mangled to a Windows path.
   MSYS_NO_PATHCONV=1 BASE=http://localhost:3000 SURFACE=all LOCALES=en,sw,zh SHOTS_ALL=1 node scripts/responsive-audit.mjs
   # screenshots → .50pick-shots/responsive/ — READ them.
After pushing: poll https://50pick.tz/api/health until uptimeSec resets (fresh boot), then
smoke every changed route (public = 200; admin = 307 auth-redirect, NEVER 500). Kill orphaned
node between dev-server restarts on Windows: taskkill //F //IM node.exe. Railway CLI = alisheib07.

WORK AUTONOMOUSLY until every lane above is DONE or explicitly (and correctly) deferred.
Commit in coherent batches with real messages; push each batch; verify live; update the docs
you invalidate (NEXT-SESSION new "Done" block, master-brief §5 rows, DESIGN_AUTHORITY, and the
memory index) as you go. Delete any temp scripts/preview routes before committing (never leave
a temp route under src/app/). No placeholders, nothing half-wired, no "coming soon".

🛑 The two hard STOP-and-report conditions (do NOT push through them):
  1. Any change that would touch payout / settlement / ledger / wallet-mutation / payment logic.
  2. Any money/analytics figure you cannot prove is the REAL metric — leave it deferred.

NOT your job (operator/Ali only — document, don't attempt): the go-live gate — flip
/admin/payments provider mock→selcom + redeploy; clear the conflicted-resolution flag; the
Selcom float PIN for cash-out; turn OFF TEST_FUNDING + rebaseline the DB at launch; set the
webhook secrets / R2 / Sentry / VAPID keys; DNS. These are in docs/GO-LIVE-READINESS.md.

When finished, update docs/NEXT-SESSION.md with a new dated "Done" block: what shipped, what
you deferred (with the money-safety reason), and what genuinely remains for launch.
