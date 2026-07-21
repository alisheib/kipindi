# Proposals feature-state — session kickoff (COPY-PASTE)

> Paste everything from the line below as the FIRST message of a fresh session. It is
> self-contained: it points at our skills, our pattern of work, our design system, and how we test.

---

You are a DEDICATED session with ONE mandate: build, wire, and FINALIZE an **admin-controlled
feature-state for the player PROPOSALS feature** ("propose & earn") — end to end, 100% functional
and controllable **entirely from admin**, reflected **everywhere** it appears on the platform,
users always **well-guided**, and **aesthetically perfect at every component size and breakpoint**.
Work autonomously; do NOT stop until it passes THE BAR on screen AND when driven live.

## Read first (in order) — our skills + how we work
1. `.claude/skills/50pick-standards/SKILL.md` + its `references/` — the quality bar, the **9-role
   acceptance gate**, UI-kit & design discipline, the responsiveness matrix (360 / 768 / 1280 /
   1920), visual-verification discipline (we LOOK at real screenshots), testing discipline, copy
   rules, and the verify-after-push protocol. This IS how we build — follow it exactly.
2. `.claude/skills/50pick-audit/SKILL.md` — safe DB / Railway / Prisma ops, money & compliance
   invariants, verify protocol. ⚠️ Every push to `main` is a LIVE deploy to https://50pick.tz.
3. `docs/NEXT-SESSION.md` — current state. **We are SOON LIVE** — keep all money/compliance safety
   intact; this is an entry-gating + presentation feature, not a money change.
4. `docs/DESIGN_AUTHORITY.md` + `docs/design-master-brief.md` + `src/app/globals.css` — design
   invariants + the authoritative tokens: royal hue 268; **YES=green / NO=rose untouchable**;
   single dark theme; **gold = earned-money / resolved-seal** (the existing gilt "coming soon"
   badge is an Ali-blessed exception — keep it for COMING_SOON only); claret = editorial;
   aqua ≤ 8%; **`--warning` = amber "temporary caution"**. Build every new component from the UI
   kit; never hand-roll a one-off that duplicates a primitive.
5. `docs/COMPLIANCE-DECISIONS.md` — a "get-paid-to-propose" reward is a **regulated inducement**;
   the operator MUST be able to pause/hide the whole feature. That is the compliance point of this
   work, so the block must be **server-enforced**, not just a UI hide.

## The feature — a 4-state, admin-controlled proposals switch
Today `src/lib/server/proposals-config.ts` carries a boolean `enabled` (audited via the
`defineConfig` factory, hydrated from `globalThis`/SystemConfig). **Replace it with a 4-state
machine**, keeping the audited factory and **migrating old snapshots so hydration never breaks**
(`enabled:true` → `ACTIVE`, `enabled:false` → `DISABLED`):

- **ACTIVE** — proposals work normally. No badge. Players can propose.
- **COMING_SOON** — announced but not open. Show the existing **gilt "coming soon" badge**
  (`src/components/ui/coming-soon-badge.tsx`); block the propose action; guide the user
  ("coming soon — check back"). Wire the badge to THIS state (visible in COMING_SOON, hidden
  otherwise) — that is the golden tag we already have.
- **MAINTENANCE** — temporarily paused. Use the **amber `--warning`** treatment (on-system
  "temporary caution", deliberately DISTINCT from the gilt coming-soon and never NO-rose/danger).
  Block propose; guide ("temporarily unavailable — back shortly").
- **DISABLED** — off. **Hide/remove every proposals entry point entirely** (not a badge — the
  feature simply isn't there for players); direct navigation to `/proposals*` is blocked/redirected
  with an honest message.

**Aesthetic system (make it beautiful + unmistakable):** COMING_SOON = gilt (aspirational) ·
MAINTENANCE = amber/warning (temporary) · DISABLED = hidden/absent. Run every added component past
the **graphic-designer + art-evaluator** lenses. The new components (badge, state banner,
blocked-composer state, disabled-nav treatment) MUST be pixel-clean and correctly **SIZED at
360 / 768 / 1280 / 1920** — component sizing at every breakpoint is a first-class requirement here.
0 horizontal overflow, tap targets ≥ 40px, EN+SW+ZH with no truncation/clipping.

## Controllable 100% from admin
- `/admin/proposals` (`admin-proposals-client.tsx` + `saveProposalsConfigAction`): add a clear
  **state selector** (segmented control — Active · Coming soon · Maintenance · Disabled) with a
  plain-language note of what each state does to the player experience. It takes effect immediately
  (no redeploy — like the platform maintenance switch in `platform-config.ts`), and every change is
  written to the audit chain (`proposals.config.updated`).

## Reflect it EVERYWHERE — users always well-guided
Grep `coming.?soon` / `propose` / `/proposals` and wire the state into every surface + entry point:
- Chrome/nav: `nav-more.tsx`, `avatar-menu.tsx`, `top-app-bar.tsx`, `public-footer.tsx`.
- Board + detail: `src/app/proposals/page.tsx`, `src/app/proposals/[id]/page.tsx`.
- Composer: `src/app/proposals/new/page.tsx` (block + guide per state) — and the SERVER action in
  `src/app/proposals/actions.ts` MUST also refuse in every non-ACTIVE state (never trust the client).
- Promo/badge: `src/components/ui/propose-promo.tsx`, `src/components/ui/coming-soon-badge.tsx`.
- Any home/discovery entry to proposing.
Each surface renders the correct treatment for the current state with **trilingual (EN/SW/ZH)**
guidance (add keys to `src/lib/i18n-dict.ts`; `test:i18n` parity must stay green). A player must
never hit a dead button or a silent no-op — always a clear, friendly explanation.

## THE BAR (50pick-standards §1 — "Perfect · 0 issues") — all must hold
Correct (verified live, not just tests) · compliance-safe (the inducement block is
**server-enforced**) · **A-5 no-fabrication** · consistent (UI kit + tokens, no divergent one-off) ·
responsive 360/768/1280/1920 with special care on component sizing · accessible (WCAG 2.1 AA:
keyboard, focus-visible, contrast ≥ 4.5:1, reduced-motion) · all states (skeleton · empty · error ·
blocked) · trilingual · verified VISUALLY with a **human-read screenshot** for every meaningful
(surface × state × width × locale). Pass the 9-role gate before shipping.

## Invariants (don't break)
- **Server-enforce** the gate in `proposals/actions.ts`; the client treatment is UX only.
- **Backward-compat**: migrate the persisted `enabled` boolean → the new `state` inside the
  `defineConfig` hydration/validate so a restored or old snapshot never crashes at boot.
- Design tokens are law (gold only for the coming-soon gilt + earned-money/seal; maintenance =
  amber; never invert YES/NO; single dark theme).
- ⛔ Do NOT touch money/payout/ledger logic. The proposal PRIZE payout path is unchanged — you are
  gating the ENTRY to proposing, not the money math. If a change would touch payout/ledger, STOP.

## How we test + verify (our pattern)
- Before any push: `npx tsc --noEmit` · `npm run build` · `npm run test:all` (green on a fresh
  store; only `test:responsive` may fail locally — it needs a live `:3000`). Plus `test:i18n`
  parity · `test:tokens` · `test:integrity`.
- **Add a focused test** `scripts/proposals-state.test.mts` (wire it into `package.json` `test:*`)
  proving: each state gates the propose server action (ACTIVE allows; COMING_SOON / MAINTENANCE /
  DISABLED refuse); the config migrates `enabled`→`state`; the audit entry is written.
- **Drive it LIVE** — `DISABLE_ADMIN_TOTP=true npx next dev -p 3000`; seed admin via
  `POST /api/dev-test/seed-admin`; a player via `/auth/demo`. For EACH of the 4 states: set it in
  `/admin/proposals`, then LOOK at every player entry point + the composer at 360/768/1280/1920 in
  EN+SW+ZH, confirm the block + guidance are correct and the components are sized beautifully, and
  try to propose to confirm the SERVER refuses. Screenshot and READ them (base:
  `scripts/responsive-audit.mjs`). A green suite is NOT proof — you must LOOK.

## Verify-after-push (every push = LIVE deploy)
`tsc` + `build` + `test:all` green → push → poll https://50pick.tz/api/health until `uptimeSec`
resets (fresh boot) → confirm `/proposals`, `/proposals/new`, `/admin/proposals` return 200/307
(never 500) + `railway logs -s 50pick` clean (CLI = alisheib07). ⚠️ A prior `next build` leaves a
production `.next` that 404s `next dev` — `rm -rf .next` first. ⚠️ A parallel session may share this
repo — only stage/commit YOUR files; delete any temp scripts before committing.

WORK AUTONOMOUSLY UNTIL DONE. When all 4 states are 100% functional, controllable from admin,
reflected + guided everywhere, aesthetic at every size + breakpoint, trilingual, and
screenshot-verified live — and only then — you are done. Commit in coherent batches with real
messages; update `docs/NEXT-SESSION.md` (dated block) + the memory index.
