# 50pick — Motion + Haptics kit adoption & de-duplication (copy-paste prompt)

> Focused continuation prompt. The designers dropped two kits at the repo root and said
> they are the perfect, consistent motion + haptics language for 50pick. This session
> makes them the CANONICAL rule, uses them correctly everywhere, and removes all
> redundancy (one source of truth; delete or archive the rest). Paste everything below.

---

You are working on **50pick** (repo `F:\kipindi-main`, branch `main`; Node 24, Next 16).
Read `.claude/skills/50pick-standards` + `.claude/skills/50pick-audit` first.
Standing rules: work on `main`, commit + push cleanly yourself (every push is a LIVE deploy);
one control one place; full QA before EACH commit (run twice); kit-only, extend the kit never
ad-hoc; real data or nothing; ⚠️ a Railway deploy can FAIL after a clean build — verify the
deploy (poll `https://www.50pick.tz/api/health` uptimeSec reset). Local dev:
`NODE_ENV=development DISABLE_ADMIN_TOTP=true npm run dev`; gate `tsc && build && test:all`;
visual `node scripts/final-visual-sweep.mjs` (READ the PNGs). These two folders are currently
gitignored (`/Motion Language/`, `/Haptics/`) and untracked — they must NOT stay loose at the
root; by end of session they are adopted into `src/` and the loose folders are gone.

## The task
Make the two designer kits the SINGLE canonical motion + haptics system, use them correctly
and consistently across the whole app, and eliminate redundancy. No unused/duplicate files
anywhere (local or git) — one canonical home a future session will find, or delete for good.

## The kits (analyzed — read the files, don't re-derive)
- **`Motion Language/packages/motion/`** — "The Settle" motion language.
  - `motion.css` — the deliverable: 4 curves (`--m-settle`/`--m-glide`/`--m-leave`/`--m-pivot`
    + `--m-breathe`), 6 duration tiers (`--t-flick…--t-max`, 620ms ceiling), the `-14deg`
    signature axis, and `.m-*` utilities (`.m-in`, `.m-raise`, `.m-press`, `.m-float-in`,
    `.m-dialog-in`, `.m-sheet-in`, `.m-scrim`, `.m-indicator`, `.m-tick`, `.m-seal`, `.m-aura`,
    `.m-needle`, `.m-skeleton`, `.m-live-pip`, `.m-urgent`, …) + a reduced-motion clamp +
    `html.reduce-motion` in-app switch. Laws: Anchored · Settled (one hair of overshoot) ·
    Weighted (money = one duration tier up). "Load AFTER globals.css; overrides nothing;
    legacy `--ease-*`/`--dur-*` stay valid so components migrate incrementally."
  - `README.md` — the three laws, the four curves, the six tiers, the `-14deg` signature.
  - `theme/globals.css` — a FULL app-stylesheet snapshot (~2015 lines, "Direct port of
    kit/tokens.css"). ⚠️ Almost certainly redundant with the live `src/app/globals.css` —
    diff them; it's a reference, not a second theme to load. Reconcile or delete; NEVER load two.
- **`Haptics/packages/haptics/`** — "Needle haptics".
  - `needle-haptics.js` — named vocabulary (`grab · wake · cross · tuck · settled · impactSoft
    · impactHard`) + `hapticImpact(speed)` (proportional, px/ms, <0.35 = no fire), 40ms
    rate-limit, mute via `localStorage["50pick.haptics.muted"]`, silent under
    prefers-reduced-motion / hidden doc / unsupported (iOS Safari → none; do NOT fake it).
  - `README.md` — RULE: **physical events only — contact, passing true, coming to rest;
    NEVER encouragement, reward, or to pull attention.**

## What already exists in the app (the redundancy to resolve)
- **`src/lib/haptics.ts`** ALREADY EXISTS — a different haptics module: `HapticToken` type,
  `PATTERNS`, `getPrefs/setPrefs/motionReduced/fire`, exported `haptics` object; a per-token
  prefs system wired to a **settings panel** (`src/components/settings/feedback-settings.tsx`);
  imported by ~10 components (`conviction-dial`, `bet-confirm-modal`, `sell-confirm-modal`,
  `win-celebration`, `watch-star`, `vote-control`, `comments-thread`, `notifications-panel`,
  `stats-band`, `feedback-settings`). ⇒ TWO haptics systems. Pick ONE canonical.
  - ⚠️ **Philosophy conflict to resolve with intent:** the kit says haptics are for PHYSICAL
    events only — never reward/encouragement — but the app currently buzzes on
    `win-celebration`, `watch-star`, `vote-control` (reward/attention). Adopting the kit "as
    the final rule" means removing those reward haptics (or making a documented, deliberate
    exception). The designers called the kit perfect + consistent — honour its philosophy;
    don't half-adopt. Reconcile the mute mechanism too (existing per-token prefs + settings
    panel vs the kit's single `50pick.haptics.muted`) into ONE the settings panel drives.
- **`src/app/globals.css`** — 14 legacy `--ease-*`/`--dur-*` tokens + 59 `@keyframes`, imported
  once in `src/app/layout.tsx`. The motion kit is additive on top; plan the migration of the
  hand-rolled keyframes/curves onto the `--m-*`/`--t-*` tokens + `.m-*` utilities.
- **Scattered anti-pattern:** `src/components/updown/use-quick-bet.ts` fires a raw
  `navigator.vibrate?.(12)` inline (exactly what the kit's "named vocabulary, not
  navigator.vibrate scattered" replaces). Route it through the canonical haptics (`settled`).
- Existing motion CSS I added this session: `ud-place-pulse` / `ud-side-flash` (use the legacy
  `--ease-sink`) — migrate to the motion tokens (likely `.m-seal`/`.m-tick` or `--m-settle`).

## Do this
1. **Decide the canonical home** (recommend): motion → import the kit's `motion.css` into the
   app (e.g. `src/app/motion.css`, imported AFTER `globals.css` in `layout.tsx`); haptics →
   the kit's `needle-haptics.js` becomes the ONE haptics source (port to TS as
   `src/lib/haptics.ts`, preserving the settings-panel + per-pref surface the app already
   wires, but with the kit's vocabulary + physical-only philosophy + 40ms limit + mute).
   Delete the now-duplicate implementation; keep ONE.
2. **Reconcile the philosophy conflict** (reward haptics) explicitly — with the designers'
   "perfect, physical-only" intent — and note the decision.
3. **Master usage — map every surface literally** and apply the utilities/vocabulary
   consistently: arrivals → `.m-in`/`.m-in-lift` (+ `data-stagger`); hover/press → `.m-raise`/
   `.m-press`; menus/dropdowns → `.m-float-in`; dialogs/sheets → `.m-dialog-in`/`.m-sheet-in`
   + `.m-scrim`; tabs/filters/bottom-nav travelling indicator → `.m-indicator`; live odds/price
   change → `.m-tick`; skeletons → `.m-skeleton`; live pulse → `.m-live-pip`, urgent countdown
   → `.m-urgent`; bet commit + settlement → `.m-seal` (+ `.m-aura` for a win), the conviction
   dial + Up & Down needle → `.m-needle`/`--m-pivot`. Haptics: `grab` on pick-up, `cross` when
   the dial needle passes centre, `settled` on a committed bet / arrival, `hapticImpact(speed)`
   on the dial hitting a bound — replacing the existing ad-hoc calls + the updown inline vibrate.
4. **Migrate incrementally but finish** — retire the hand-rolled keyframes/tokens that the kit
   now supersedes (or alias them to `--m-*` so nothing is orphaned). Reduced-motion must stay
   correct (the kit clamps; keep the in-app switch working).
5. **Clean up — zero redundancy** (the explicit ask): the loose `Motion Language/` and
   `Haptics/` root folders and the kit's `theme/globals.css` snapshot must NOT remain as
   dead/duplicate copies. After adopting the canonical files into `src/`, either delete the
   loose folders for good OR, if worth keeping as a versioned design-system archive, move them
   under `docs/design-system/` with an index doc a future session will understand — but NOT
   two live copies of the same CSS/JS. Verify nothing in `src/` imports from the loose paths
   before deleting. Remove the `/Motion Language/` + `/Haptics/` lines from `.gitignore` once
   the folders are gone.

## Verify
- `tsc && build && test:all` green (twice); reduced-motion still disables motion + haptics;
  the settings panel still toggles haptics; iOS path still no-ops (no fake haptic).
- Visual: `node scripts/final-visual-sweep.mjs` + shoot the dial, Up & Down card/round, menus,
  dialogs, live pips, skeletons — motion reads as "The Settle" (anchored, one-hair overshoot,
  −14° reveals) consistently; READ the PNGs.
- Confirm ONE motion source + ONE haptics source in the repo; `grep -rn "navigator.*vibrate"
  src/` shows only the canonical module; no import resolves into `Motion Language/` or `Haptics/`.
- Commit in reviewable steps; push; verify the deploy. Update `docs/UPDOWN-PROGRESS.md` +
  retire this prompt when done.
