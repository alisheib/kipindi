# 50pick — next-session prompt (copy-paste)

> Self-contained continuation prompt. Rewritten 2026-07-27 after the Up & Down
> finalization + platform DateTime-filter + stake-bounds + routing-audit sessions.
> Paste everything below the line into a fresh session.

---

You are continuing work on **50pick** (repo `F:\kipindi-main`, branch `main`; Node 24, Next 16).
Read `.claude/skills/50pick-standards` + `.claude/skills/50pick-audit` first, then
`docs/UPDOWN-PROGRESS.md` and `docs/PLATFORM-DATETIME-FILTER.md` (newest first).

**Standing rules (Ali):**
- Work on `main` and **commit + push cleanly yourself** — every push to `main` is a LIVE deploy.
- **One control, one place** — never let two surfaces edit the same setting.
- Full QA before EACH commit, **run more than once**. Update docs/trackers alongside every change.
- Player surfaces never narrate ops detail; **real data or nothing** (no fabrication — A-5).
- Kit-only: extend the kit, never ad-hoc. Audit the READ path, not just the write path.
- ⚠️ **A Railway deploy can FAIL after a clean build.** After pushing, verify the deploy —
  poll `https://www.50pick.tz/api/health` `uptimeSec` for a reset (or `railway deployment list`
  if the CLI is on **alisheib07** — it often flips to the AWARKEH account; re-login first).
  A 200 from the site ≠ your commit is live.

**Local dev / verification:**
- `NODE_ENV=development DISABLE_ADMIN_TOTP=true npm run dev` — dev-test seed endpoints
  (`/api/dev-test/*`) 404 without `NODE_ENV=development`; the admin console 2FA-gates without
  `DISABLE_ADMIN_TOTP=true`. Seed: `POST /api/dev-test/seed-admin`, `updown-seed`, `updown-advance`,
  `seed-real-markets`.
- Gate: `npx tsc --noEmit && npm run build && npm run test:all` (currently **93/93**, run twice).
- Visual: `BASE=http://localhost:3000 node scripts/final-visual-sweep.mjs` (+ `updown-player-shots`,
  `updown-custom-stake-shots`, `datetime-filter-shots`, `routing-audit`). READ the PNGs in
  `docs/shots-*` (gitignored). Real-Postgres `e2e:money`/`updown-engine` run in CI (no local PG).

## Current live state (main @ `99f77cf`, 2026-07-27 — all deploy-verified)

**Up & Down is production-final** (short-term Gold/Silver price rounds, a SEPARATE product line):
- Sealed apart from long-form polls: money/AI-cost/portfolio/admin split by `productLine`
  (`moneyByGame`, `feature:"updown"`, `/updown/history`, `/admin/updown`). `getBoard`/quick-bet.
- One-tap quick-bet via the shared `useUpDownQuickBet` hook + `UpDownStakeControls` (card +
  round page): preset chips + **"＋ Custom"** amount (kit `Input`), optimistic "you're in",
  a **card success pulse + haptic + aria-live** confirmation (NOT a toast; reduced-motion aware).
- Presentation: dedicated `/updown` tab + a **home discovery band** (fast-game promo) + `/live`
  prioritises them (soonest-resolution) with a game chip; `/markets`+`/results` stay poll-only.
- **History groups by round** — `/updown/history` shows one card per round (bets collapse to
  chips, max 2 + "+N"), round-level KPIs (rounds / bets sub-stat / net-positive win-rate);
  fixed a KPI that counted positions as rounds. **Stake floor**: `stakeBoundsFor`/`getBoard`
  clamp the min at the product default so stale chain data can't surface a sub-1,000 preset.
- Full-flow visual scan done (live cards · board · round detail · history, EN/SW/ZH × 4 widths):
  the price-fallback label is **"Awaiting price"** (was ops-jargon "Awaiting read"; EN/ZH aligned
  to SW). Shows only when the live feed is quiet (A-5 fallback), never a fabricated 0.

**Platform-wide (this session):**
- **DateTime range filter** — ONE `resolveRange` (`lib/server/date-range.ts`) +
  `DateTimeRangeFilter` (presets + custom date+hour+minute, EAT-safe) replaced every ad-hoc
  date filter (reports/finance/transactions/updown/ai-usage/ai-polls/candidates). Guard:
  `test:date-range`. See `docs/PLATFORM-DATETIME-FILTER.md`.
- **Stake bounds 1,000 / 1,000,000** — the admin-managed DB default (code default +
  version-gated auto-migration that bumps a stale persisted config on deploy, preserving
  deliberate overrides). `/admin/config` (global + per-market) and `/admin/updown` (per-chain).
- Reports: dead `drawCrest` removed, timestamps UTC→EAT (audit chain stays UTC, labelled).
- Routing audited (`scripts/routing-audit.mjs`, 54 checks): `/updown/history` now edge-protected;
  0 dead links; auth/admin gating + login `?next=` bounce-back all open-redirect-safe.
- The gilt "coming soon" badge was calmed (muted tag, no glint) after a player report.

## Known / carried-forward (not bugs — deliberate or documented)
- **Soft-404**: invalid market/round ids render the correct not-found page with a **200** status
  (the root `app/loading.tsx` streaming limitation — same for `redirect()`). User lands on the
  right page; only the HTTP status is soft. A hard 404 needs an app-wide streaming-shell change —
  weigh carefully before touching it.
- **`/profile/activity`** still uses week/month/all presets (player = presets-first per Ali). A
  precise custom window there needs a between-window txn DAL method (`sumUserByTypesBetween`) —
  a clean, bounded follow-up if wanted.
- **`public/brand.rar`** — a local brand-asset archive; now `*.rar`-gitignored (won't deploy).

## Good candidate next steps (Ali's call)
- **PRIORITY — Motion + Haptics kit adoption & de-dup.** The designers dropped THREE kits at the
  repo root ("perfect, consistent kits"): `/Motion Language/`, `/Haptics/`, and now
  `/Needle Fidget Project/` (needle physics + haptics + its own motion/globals CSS — likely the
  newer consolidated package; read its `NEEDLE-SPEC.md` first). Make them the ONE canonical motion +
  haptics language, use them correctly everywhere, and remove redundancy (there's already a
  `src/lib/haptics.ts` + a bundled `theme/globals.css` snapshot). All three are gitignored/untracked.
  Full self-contained brief: **`docs/MOTION-HAPTICS-ADOPTION-PROMPT.md`** — start there.
- Real-Postgres load pass for the Up & Down concurrent quick-bet (`test:updown-load` PG mode) if a
  scratch DB is available.
- `/profile/activity` → the shared DateTimeRangeFilter (needs the between-window DAL method).
- Consider a hard-404 status for invalid ids if SEO/scraper signals matter (architectural).
- Withdrawals go-live (separate Selcom creds + PIN) — see `docs/GO-LIVE-CONTINUATION-PROMPT.md`.

## Authoritative docs
`docs/UPDOWN-PROGRESS.md` (status + session log) · `docs/UPDOWN-ARCHITECTURE.md` ·
`docs/PLATFORM-DATETIME-FILTER.md` · `docs/COMPLIANCE-DECISIONS.md` · `docs/FINAL-AUDIT-REMEDIATION.md`.
