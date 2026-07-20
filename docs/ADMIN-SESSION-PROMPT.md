# Admin session — copy-paste prompt

Written 2026-07-20. Paste the block below as the FIRST message of a fresh session.

---

```
Fetch the latest first — a lot changed on 2026-07-20 and your context is stale:

  cd C:\kipindi-main && git fetch origin && git status && git log --oneline -12 && git pull

Then read, in this order, before touching anything:
  1. .claude/skills/50pick-standards/SKILL.md + references/ (always-on)
  2. .claude/skills/50pick-audit/SKILL.md
  3. docs/NEXT-SESSION.md            <- read the "Session N" block at the top
  4. docs/DESIGN_AUTHORITY.md        <- the invariants, especially B5 and B6 (new)
  5. docs/design-master-brief.md     <- the ADMIN gap list
  6. docs/ADMIN_VIEW_AUDIT_2026-06-28.md
  7. src/app/globals.css             <- authoritative tokens; if a doc disagrees, this wins

THIS SESSION IS ADMIN-ONLY. Do not touch player-facing surfaces. The whole scope is
the operator console: src/app/admin/** (41 routes) and src/components/admin/**.

THE BAR: every detail must be worth it. Nothing "basic", nothing placeholder, nothing
half-wired. This is a professional operator console handling real money — treat it like
one. Concretely, EVERY one of these must be true on EVERY admin route before you call it
done:
  - Every LOADER exists, matches its page's width and layout, and mirrors the real
    content shape (skeleton rows == real rows, not a generic spinner).
  - Every TABLE COLUMN is intentional: aligned, tabular-nums on numbers, right-aligned
    money, truncation/overflow handled, sortable where it should be, and a header that
    doesn't clip in SW at 360px.
  - Every BUTTON is consistent (variant, size, icon, label voice), has hover/active/
    disabled/pending states, and every destructive one has a confirm.
  - Every FLOW is consistent end-to-end and every REDIRECT actually works — no dead
    links, no 404, no landing on a blank tab, no action that leaves the operator
    guessing whether it worked.
  - PAGINATION everywhere a list can exceed one screen — no silent 100-caps, no
    infinite unpaged tables. Reuse the shared admin pagination
    (src/components/admin/admin-pagination.tsx); do not hand-roll per page.
  - CONSISTENCY everywhere: the same KPI tile, the same status badge, the same empty
    state, the same page header, the same spacing rhythm across all 41 routes. If two
    screens solve the same problem two ways, unify them.
  - DISCIPLINED, STABLE CODE everywhere: shared primitives over copy-paste, no dead
    props, no TODO left as UI, no "coming soon". If a pattern repeats, extract it.

Goal: make the admin console genuinely complete and coherent — design, logical flow,
and correctness of states. Specifically hunt for:

  - WRONG / MISSING LOADERS. Known already: 8 admin routes have NO loading.tsx at all
    — /admin/events, /admin/insights, /admin/kyc/[id], /admin/objections,
    /admin/payments, /admin/resolver/[id], /admin/settlement, /admin/transactions.
    Three of those are money surfaces. Where a loading.tsx does exist, verify its
    width and shape MATCH the real page — a mismatch reflows on every navigation
    (that exact bug was fixed on 4 player routes; assume it exists here too).
  - WRONG / MISSING ERROR + EMPTY STATES. All 41 admin routes currently share ONE
    error boundary (src/app/admin/error.tsx). Decide where segment-level boundaries
    belong. Every table and list needs a real empty state, not a blank panel.
  - WRONG STATES generally: a screen that shows stale data after an action, an
    action with no pending/disabled state, a destructive action with no confirm, a
    success that gives no feedback, a filter that silently returns nothing.
  - LOGICAL FLOW: walk each operator job end-to-end (resolve a market, review a KYC,
    approve a payout, handle an objection, void, freeze a player, run a report).
    Where does the flow dead-end, loop, or leave the operator guessing what happened?
  - DESIGN: table density and alignment, tabular-nums on every number column, column
    overflow at narrow widths, KPI tile consistency, the unused AdminKpi `spark` slot,
    /admin/moderation (documented as the sparsest page), /admin/ai-usage (a cost
    dashboard with no time-series), and the literal "Coming soon" chip in
    src/components/admin/reports/generate-button.tsx.
  - SWAHILI. Admin is EN + SW. SW runs 20-40% longer; check every chip, button, KPI
    tile and table header at 360px in SW before calling a screen done.

Invariants — violating these is a bug, and "fixing" them is ALSO a bug:
  - Royal indigo hue 268 is the canvas. NOT teal. --teal-* are deprecated aliases of
    --royal-*. The real teal family is --aqua-*.
  - YES=green / NO=rose, never inverted. Gold = earned-money ONLY. Claret editorial
    only. Aqua <=8% surface, never semantic. Single dark theme, no light mode.
  - B5: motion tokens have ONE definition site; easings are BARE CURVES and every
    transition/animation states a duration (`var(--dur-micro) var(--ease-micro)`).
    Never redeclare an --ease-*/--dur-*/--glow-* in a second stylesheet; namespace
    instead. Guarded by `npm run test:tokens`.
  - B6: a settled outcome is READ from resolvedOutcome, NEVER inferred from a
    probability, percentage or pool comparison. On a money surface prefer showing
    nothing to showing a guess. Guarded by `npm run test:outcome`.
  - WCAG AA: when a token fails contrast, DARKEN THE FILL, never lighten the label.

Do NOT report or "fix" these — they are deliberate and documented:
  - text-[Npx] arbitrary sizes (1478 uses) — the pixel values ARE the system.
  - text-white on brand-500 pills (--text-on-brand is dark; "fixing" inverts it).
  - bg-black/40..60 scrims, bg-white on QR codes and toggle knobs.
  - The --teal-* compat shim existing at all.
  - The dual radius scale (CSS --r-* vs Tailwind) — known, deferred, needs design QA.

VISUAL ONLY on money. You may restyle, restructure and add states anywhere in admin,
but do not change payout arithmetic, settlement, ledger or payment logic. If you find
a money-logic bug, STOP and report it rather than fixing it inline.

Verify before every push (every push is a LIVE deploy):
  npx tsc --noEmit
  npm run build
  npm run test:all          # expect 81/82 — test:responsive needs a live :3000
  npm run test:tokens && npm run test:outcome && npm run test:integrity

Then verify VISUALLY on a real server, not just a green suite:
  npm run build && npx next start -p 3000     # NOTE: needs DATABASE_URL or it 500s by
                                              # design (store.ts refuses in-memory in prod)
  BASE=http://localhost:3000 SURFACE=admin LOCALES=en,sw node scripts/responsive-audit.mjs
  # screenshots -> .50pick-shots/responsive/ — READ them, don't just count them.

After pushing, verify live: https://50pick.tz (NOT the railway host — the old "Apache
parking page" warning in older docs is obsolete). `railway logs -s 50pick` for a clean
boot. `npm run qa:visual` and `npm run qa:outcome` are quick post-deploy checks.

Work through the whole console and don't stop early. Commit in coherent batches with
real commit messages, push each batch, and update the docs you invalidate as you go —
several docs were found asserting things that were already fixed, which wasted real
time. When you finish, update docs/NEXT-SESSION.md with what you did and what's left.

If you find something you believe is a bug, prove it before fixing it: read the code,
verify it actually renders that way, and say so plainly if it turns out not to be real.
Do not pad the report.
```

---

## Why this prompt says what it says

- **Fetch first** — 2026-07-20 landed 5 commits (`b031fd3`, `5120e6b`, `ff776b3`, `72900a2`,
  `8b0c96e`) touching tokens, docs, package.json scripts and market-card. A stale checkout
  will conflict and a stale *context* will re-raise fixed issues.
- **The do-not-fix list exists** because three separate doc claims were found already-fixed
  during the 2026-07-20 session (BrandTopo opacity, the orphan hero components, MarketCard
  spark/traders) and were nearly "re-fixed".
- **B6 is new and load-bearing** — real users hit it, and 4 of 8 sampled resolved markets on
  prod were displaying the wrong side.
- **Admin loader/error gaps are pre-counted** so the session starts with real targets instead
  of a discovery phase.
