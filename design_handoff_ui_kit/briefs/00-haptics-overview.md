# 50pick · Design Request — Haptics, Micro-Animations & Badges

**From:** 50pick / Kipindi product team
**To:** Claude Design
**Goal:** Add a cohesive **haptics system**, a **micro-animation / motion layer**, and an **achievements & badges system** to the existing app — *extending* our current design kit, never replacing or drifting from it.

> ⚠️ **Most important instruction:** Everything you propose must be built on the tokens, components, motion vocabulary, and brand language **already in this repo** (see `/kit`). Do **not** introduce new color palettes, new fonts, new radii, new shadow scales, or a parallel motion system. We already have a deep, opinionated kit — your job is to *complete* it, on-theme. When in doubt, reuse an existing token or keyframe.

---

## What's in this folder

```
README.md                     ← you are here (the brief + constraints)
kit/
  globals.reference.css        ← THE source of truth: all design tokens + every
                                 existing @keyframes + motion utility classes
  brand.reference.tsx          ← brand marks + existing motion components
                                 (FiftyMark, PulseRing, TippingBar, BrandSpinner…)
  avatar-and-tierbadge.reference.tsx  ← Avatar + the EXISTING TierBadge we extend
  empty-state.reference.tsx    ← EmptyState + its line-art illustration style
  button.reference.tsx         ← Button variants (the press/hover surface)
  toast.reference.tsx          ← toast system (entrance motion lives here)
  wallet-balance-pill.reference.tsx ← reference for a "number roll + delta flash"
                                 micro-interaction we already ship
requests/
  01-haptics.md                ← request #1
  02-micro-animations.md       ← request #2
  03-badges-achievements.md    ← request #3
  04-extras.md                 ← optional stretch ideas (streaks, levels, celebrations)
```

---

## Hard theme constraints (read before designing)

These are non-negotiable — they are what makes 50pick *feel like 50pick*:

1. **Tokens only.** Colors come from the families in `kit/globals.reference.css`:
   `--gold-*` (champagne gilt), `--royal-*`/`--teal-*` (indigo hue 268 — same scale, aliased), `--claret-*` (deep red), `--aqua-*` (focus/secondary, hue 195), `--yes-*` (emerald 152) / `--no-*` (rose 22) for outcomes, `--pearl-*` (ink on dark), plus semantic `--bg / --bg-elevated / --border / --text*`. **All colors are OKLCH.** Never hardcode hex.
2. **Radii:** `--r-xs 4 · --r-sm 8 · --r-md 12 · --r-lg 16 · --r-xl 24 · --r-pill 999`.
3. **Shadows:** `--shadow-1..5`, `--shadow-card`, `--shadow-royal`.
4. **Motion tokens already exist — use them:**
   - Easing: `--ease-micro` (100ms snap), `--ease-stage` (240ms), `--ease-celebrate` (600ms), `--ease-glide` (snappy out), `--ease-arrive` (gentle overshoot in), `--ease-sink` (exit), `--ease-conduct` (breathing in/out).
   - Duration: `--dur-flick 120 · --dur-quick 220 · --dur-glide 360 · --dur-arrive 520 · --dur-stage 820`.
5. **`prefers-reduced-motion` is mandatory.** Every animation must have a reduce branch (see the two existing `@media (prefers-reduced-motion: reduce)` blocks). Haptics must also be user-disablable.
6. **Heraldic, restrained aesthetic.** Gilt-on-royal, line-art (no fills) for illustrations/badges, no full-color cartoons or mascots, no emoji. Think "licensed institution that's also delightful," not "arcade."
7. **Bilingual (EN · SW) at all times** for any user-facing copy: `"Won · Umeshinda"`.
8. **Mobile-first.** Tanzania is a mobile-money, mid-range-Android market. Animations must stay 60fps on cheap phones (transform/opacity only — never animate layout/width/top), and haptics target the Web Vibration API + iOS Safari behavior.

---

## What we already ship (so you don't reinvent it)

The kit already contains a surprisingly rich motion layer — please **reuse/extend** these rather than duplicate. Full list with line numbers in `kit/globals.reference.css`; highlights:

- **Entrances:** `dialog-rise` + `scrim-fade` (`.dialog-anim`/`.dialog-scrim-anim`), `sheet-rise` (bottom sheets), `kp-slide-up`, `reveal-up`.
- **Celebration:** `win-confetti`, `win-burst`, `wc-trophy-pulse`, `wc-ray-spin`, `celebrate-pop`, `count-up-flash`, `seal-impress`, `gavel-strike` (settlement), `confetti-fall`.
- **State/feedback:** `gold-pulse`, `live-pulse`, `aqua-pulse`, `pulse-urgent`, `pulse-critical`, `odds-flash-up/down`, `settling-sweep`, `mark-breathe`.
- **Loaders:** `skel` (skeleton shimmer), `shimmer-gilt`, `spin`, plus `BrandSpinner`/`SectionLoader`/`BrandLoader` and `PulseRing` in `brand.reference.tsx`.
- **Toast:** `toast-slide` + `toast-bar`.
- A live **number-roll + delta-flash** micro-interaction in `wallet-balance-pill.reference.tsx` (`wbp-delta-fade`) — a good template for the "value changed" feel.
- An existing **TierBadge** (bronze/silver/gold/diamond/sovereign) in `avatar-and-tierbadge.reference.tsx` — achievement badges should be a sibling system in the same visual family.

---

## Deliverable format (so it drops straight into our codebase)

For each request, please return:

1. **Spec doc** (markdown) — the vocabulary/system, decisions, and a mapping table of *event → response*.
2. **Tokens/CSS** — any new motion or badge styles as **additions to `globals.css`** using our existing token names (new `@keyframes` + utility classes, each with a `prefers-reduced-motion` branch).
3. **Component specs** — props + states for any new React component (e.g. `<Badge>`, `<AchievementToast>`), in the same prop-style as `button.reference.tsx` / `avatar-...reference.tsx`. JSX/TSX sketches welcome; we'll wire the logic.
4. **SVG assets** (for badges) — inline line-art SVGs in the EmptyState illustration style (teal stroke + single gold accent, `viewBox="0 0 56 56"`, `stroke="currentColor"`, no fills except the gold accent).
5. **A "do-not-do" note** confirming nothing introduces off-kit color/font/radii.

Keep it implementable by us in a day or two per request — favor a clear system over a huge set of one-off assets.

---

Three request files follow in `/requests`. Build #1–#3; #4 is optional stretch. Thank you — keep it tasteful, keep it 50pick.
