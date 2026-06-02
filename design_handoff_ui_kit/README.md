# 50pick / Kipindi — UI Kit & Component Handoff

> 🗑️ **TEMPORARY HANDOFF FOLDER — delete after Claude Design returns this round.**
> This is a snapshot we share with the designer, not part of the app. Once the
> `REQUEST-next-round.md` work is delivered, this whole `design_handoff_ui_kit/`
> folder can be deleted.

One folder, the whole front-end design system. Everything the platform renders
is here: the **design tokens** (the single source of truth), the **shared kit
primitives** (used everywhere, defined once), and **every feature** in its own
subfolder. No file is duplicated — a primitive lives in `kit/` and features
import it, they don't copy it.

> These are the **live components** (real source, current as of this handoff),
> not sanitised sketches — so what you read is exactly what ships. Imports like
> `@/components/ui/button` show you the real dependency graph. You don't need to
> run them; read them as the source of truth for markup, class names, variants,
> and how the tokens are applied.

---

## How this folder is organised

```
design_handoff_ui_kit/
├─ README.md            ← you are here (system overview + index)
├─ tokens/
│  ├─ globals.css       ← THE design system: OKLCH ramps, semantic vars,
│  │                       type/space/radius/motion scales, component CSS
│  └─ TOKENS.md         ← human-readable cheat-sheet of every token group
├─ kit/                 ← shared primitives — ONE copy, used platform-wide
│  ├─ brand/            ← logo/marks, brand spinner, signal pip, theme provider
│  └─ ui/               ← button, chip, card, input, tabs, toast, avatar, …
├─ features/            ← each product area, isolated
│  ├─ markets/          ← the heart: cards, detail, charts, conviction dial …
│  ├─ proposals/        ← community market proposals + voting
│  ├─ badges/           ← achievements + tier badges
│  ├─ chat/             ← AI help companion
│  ├─ layout/           ← app shell, top bar, bottom nav, wallet pill …
│  ├─ landing/          ← marketing hero
│  ├─ onboarding/       ← first-visit primer
│  ├─ profile/          ← avatar + name editing
│  ├─ responsible-gaming/ ← reality-check, self-exclusion (regulatory)
│  ├─ settings/         ← feedback/motion settings
│  └─ admin/            ← operator console shell + charts
└─ REQUEST-next-round.md ← the current ask (read this)
```

**Start with `tokens/TOKENS.md`**, then `tokens/globals.css`, then `kit/`,
then whichever feature you're touching.

---

## The design language (non-negotiables)

The theme is **heraldic gilt-on-royal**: a deep midnight-indigo canvas (hue
268), pearl ink, a gilt (champagne gold) soloist for accents, with claret +
aqua as a supporting chord. It should read **sovereign, financial,
trustworthy** — a serious market board, not a casino.

| Rule | Detail |
|---|---|
| **Color space** | Everything is **OKLCH**. Don't introduce hex/HSL. |
| **YES / NO are semantic & untouchable** | YES = emerald (hue 152), NO = rose (hue 22). Never repurpose these hues for anything else, and never put claret near NO-rose. |
| **Gilt is a soloist** | Gold/gilt is for focal accents only (current value, crests, tier). Not large fills. |
| **Aqua ≤ 8% coverage** | Finishing pass only — live glow, sparkline highlight, focus ring, "new" pip. Never a chip/button label. |
| **Claret is editorial** | Politics chip, Sovereign tier, regulator/footer crest. Never on money surfaces. |
| **Bilingual** | Every user-facing string is **English · Swahili** (e.g. "Markets · Soko"). |
| **Reduced motion** | Every animation has a `prefers-reduced-motion` branch — render the final state, no draw-on. |
| **Performance** | 60fps on mid-range Android. Animate transform/opacity only. Charts are hand-rolled dependency-free SVG. |
| **Tokens only** | No hardcoded colors in components — reference the CSS vars / Tailwind theme that map to `globals.css`. |

---

## Tech context (so the markup makes sense)

- **Next.js (App Router) + React + TypeScript + Tailwind CSS.** Class names you
  see (e.g. `bg-bg-elevated`, `text-text-subtle`, `rounded-md`) are Tailwind
  utilities wired to the tokens in `globals.css`.
- Raw class names like `.mcard`, `.pchart`, `.chip` are **component CSS** that
  also lives in `globals.css` (search for them there).
- `"use client"` at the top of a file just means it runs in the browser
  (interactivity) — ignore it for design purposes.

---

## Recent direction (context for what's "current")

The market **browse grid** was just re-densified toward a Polymarket-grade
board: a wider container, **1 → 2 → 3 → 4 columns** (4-up at ≥1360px), and a
**lighter, flatter card** (flat at rest, shadow on hover; the YES% is the hero).
The card is a CSS container query — on a narrow column the sparkline folds away
and chip/meta rows wrap, so it never overflows. See `features/markets/market-card.tsx`
and the `.mcard*` rules in `tokens/globals.css`.

---

## 👉 Current ask
**`REQUEST-next-round.md`** (top level) is the active brief: the **market-card
system** (binary + multi-outcome + compact list-row) and the **identity / avatar
system**. Read it first.

## What we'd love from you

Elevate the signature surfaces (market card, detail page, probability chart) into
something unmistakably 50pick while staying inside the rules above. Reserve
decoration for accents; let the data breathe. See `REQUEST-next-round.md` for the
specific deliverables this round.
