# 50pick — Strict Whole-Project Evaluation (2026-06-06)

> Read-only audit at commit `8ebaa86` (Sprint 57). 5 parallel audits + build/typecheck
> ground truth. Standard applied: **no margin errors, no responsiveness errors, nothing
> out of perfection.** Severity: CRITICAL (broken/visible bug) → HIGH → MED → LOW.
> Verdict: **NOT yet "super stable" — strong bones, but 3 critical real bugs + several
> high issues must be fixed first.**

## Ground truth
- `npm install` ✅ · `next build` ✅ **— but** `next.config.ts` has `typescript.ignoreBuildErrors: true`,
  which MASKS a real `tsc` error (see C1). So "build passes" ≠ "type-clean".
- `tsc --noEmit` ❌ — 1 real app error + 3 from stray design-reference `.tsx` under
  `50Pick Modernization/uploads/` being included in the typecheck.

---

## CRITICAL — must fix before "stable" (real, visible, corroborated)

**C1 — `--accent-*` tokens are UNDEFINED.** Used as `text-accent-400/300` and
`var(--accent-400)` but NOT in `globals.css :root` and NOT mapped in `tailwind.config.ts`.
→ wrong/inherited color on **high-traffic screens**: bottom-nav **active tab** (`bottom-nav.tsx:69`),
homepage **"View all"** (`page.tsx:181`), every **auth** link (login/register/otp/forgot),
legal/RG helpline links, KYC support link. *(Flagged independently by 3 audits.)*
Fix: port `--accent-{600,500,400,soft}` (aqua hue 195) into globals.css + add `accent` ramp to
tailwind config — OR replace all `accent-*` with the intended `aqua-*`. One consistent fix.

**C2 — `--gold-text` is UNDEFINED.** `.btn-gold { color: var(--gold-text) }` (`globals.css:471`)
but only `--gold-fg` exists → every gold primary CTA label color silently falls back.
Fix: `color: var(--gold-fg);`.

**C3 — `tsc` fails (masked by ignoreBuildErrors):** `operation-result-modal.tsx:104` passes an
`sw` prop to a `Glyph` whose type has no `sw`. Real type error hidden by the build flag.
Fix: remove/relocate the `sw` prop; then consider turning OFF `ignoreBuildErrors` so types are enforced.

---

## HIGH

**H1 — Gold used as generic/active accent (kit invariant breach: gold = wins/payout/needle only).**
- `tabs.tsx:124` active underline `bg-gold-400`; `globals.css:1129` `.tab-indicator` gilt.
- `toggle.tsx:29` focus ring `ring-gold-400` (every toggle, not just gold variant).
- `chip.tsx:77` selected `ring-gold-400`. · `vote-control.tsx` upvote gold.
Fix: brand-blue (chrome/active/focus) or aqua (section) per kit.

**H2 — lucide-react still on PLAYER-facing surfaces** (kit mandates `glyphs.tsx`): proposals/*
(vote-control, status-badge, status-timeline, category-icon), profile/* (avatar-uploader,
name-editor + profile sub-pages), onboarding/first-visit-primer, settings/feedback-settings,
help, legal/layout. Fix: swap to `I.*` glyphs (admin may keep lucide).

**H3 — Modals lack `max-height` + scroll → clip on short/landscape phones (393px).**
`bet-confirm-modal.tsx:161`, `operation-result-modal.tsx:220` — content (and the Confirm button)
can become unreachable. Fix: `max-h-[calc(100dvh-24px)] overflow-y-auto` (notifications-panel is the correct reference).

**H4 — `as never` on 40+ `href`s disables typed-route safety** — a genuinely broken link compiles clean.
Fix once globally: drop `typedRoutes` (href→string) or a typed `route()` helper / `as Route`.

**H5 — Dead theme-switching subsystem** (`theme-provider.tsx`): full light/dark machine + boot script
+ `kp-theme` cookie/localStorage, but kit is single-theme and there's no toggle UI. Dead code runs every load.
Fix: collapse to the canonical class; keep only the live `data-motion`/reduce-motion logic.

**H6 — Multiple parallel "elevated box" systems:** `<Card>` (used in 1 file), `.glass-panel`,
`.tpanel`, `.mcardp`, raw `border bg-bg-elevated` divs across 25+ pages — different radius/shadow/
hover per "same" box (`<Card>` hover teal-400 vs `.mcardp` brand-500). Fix: pick one, migrate, delete the rest.

**H7 — Tailwind scale ≠ CSS token scale.** `tailwind.config.ts` `spacing`/`borderRadius`
(`2`=12px, `md`=8px…) don't match `globals.css` `--sp-*`/`--r-*` (`2`=8px, `md`=12px). Same nominal
size renders different padding/corners. Fix: make Tailwind extend reference the CSS vars.

**H8 — Dead route:** `admin/live/page.tsx:89` links `/match/[id]` — no such route → 404. Fix: point to `/markets/[id]`.

**H9 — Performance: sticky top-app-bar `backdrop-filter: blur(14px) saturate(1.3)`** re-rasterizes
every scroll frame — #1 mobile scroll-jank risk (always on screen). `top-app-bar.tsx:53`, admin-shell.
Fix: solid translucent bar on mobile (no blur), blur only ≥1024px via `@supports`/`@media`.

**H10 — Performance: `data-motion="reduced"` doesn't stop most infinite loops** (ticker marquee,
gold-shimmer, prog-sweep, mark-breathe ×7 hero, aqua-pulse) → throttle is defeated on the exact
mid-tier hardware it targets. Fix: add those to the reduced allowlist or pause all `infinite` loops at reduced.

---

## MED
- **Landing TRUST STRIP** large-surface `backdrop-filter` blur (`page.tsx:220`) — big GPU pass on first paint, ~no visual gain (sits on opaque gradient). Remove.
- Hardcoded colors bypassing tokens: `.live-dot #e53e3e` (globals.css:548 → `--live-400`), `checkbox.tsx:81 #06130d`, `#fff` thumbs (toggle/language-toggle), `rgba()` modal/menu shadows (kit uses oklch).
- Market-card top row `flex-wrap:nowrap` (5 chips) clips intra-card at ~300px (`globals.css:1680`).
- Market-detail source URL no `break-all` → panel widen on mobile (`markets/[id]/page.tsx:164`).
- `gold-shimmer`/`gold-pulse`/`aqua-pulse` lack `prefers-reduced-motion` branch; `.pbar-resolved` shimmer runs on every resolved card in a list.
- `theme-color: #F8FAFD` for light preference (`layout.tsx:46`) — near-white browser chrome, off-theme.
- Dead CSS: `.win-card*` (parallel to inline win-celebration), `settling-sweep`/`odds-flash` keyframes, likely-dead `--bet-*` tokens + `--g-aurora/-pool/-jackpot` gradients, stale `win-confetti` comment, `.mcard-move*` misnamed (should be `.mcardp-move*`).
- Inline-style overload (285+ across 60 files); `market-card.tsx:102` does hover via JS `onMouseEnter` style mutation instead of CSS `:hover`.
- Chat citations `/help#deposits` etc. — `/help` has no `id=` anchors, so they don't scroll.

## LOW
- `MarketCard` is a client component ×24 in the live wall each with a RAF (TippingBar) — could be server + small client island.
- Raw `<img>` for uploaded avatar (`identity-avatar.tsx:219`) → use `next/image`.
- Oversized files: `conviction-dial.tsx` (1093 lines), `hero-constellation.tsx` (655), `brand.tsx` (638) — extract helpers.
- `route-transition.tsx:27` forced reflow (`void el.offsetWidth`) + half-finished `key` state.
- `.kp-tooltip` (legacy) + `.tooltip` (kit) coexist; `r.data!` non-null asserts.
- `market-card` `traders`/`spark` props plumbed but unused (dead `.mcardp-traders`/`.av-stack` CSS or unfinished feature).

---

## What is genuinely solid (verified, no action)
- YES=emerald/left, NO=rose/right preserved everywhere; flat-solid YES/NO/gold buttons; conviction dial, probability bar, market card faithful.
- Navigation gates (auth, KYC-withdrawal, admin role + TOTP, self-exclusion/cooling-off) all correct vs `docs/FLOWS.md`; only 1 dead route (H8).
- Page-level overflow safe at all 5 breakpoints (grid auto-fill, tables wrapped, safe-area insets, bottom-nav clearance).
- Avatars (generative crests) exceed kit; mono numbers + Sora/Inter/JetBrains fonts consistent.
- Genuinely performance-conscious base (batched lists, RAF cleanup, visibility-pausing, reduced-motion branches exist).

---

## Recommended fix order (waves)
1. **Critical bug wave:** C1 `--accent-*`, C2 `--gold-text`, C3 tsc `sw` error → then flip `ignoreBuildErrors:false` to keep it enforced.
2. **Invariant + integration:** H1 gold-as-accent, H8 dead route, H3 modal scroll.
3. **Mobile performance:** H9 sticky-blur, H10 data-motion, MED reduced-motion branches + trust-strip blur.
4. **Consistency/cleanup:** H2 lucide→glyphs, H6 one card system, H7 scale unify, H4 `as never`, H5 dead theme, dead CSS/tokens.
5. **Polish:** MED/LOW remainder.

_Each wave: build + tsc verify, commit, update this doc._
