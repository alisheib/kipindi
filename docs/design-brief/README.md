# 50pick — design commission brief

**One package, one ask.** Prepared 2026-08-06 from the live product. Every screenshot is
production. Every number in `AUDIT.txt` is machine-measured across 133 components.

---

## The product, in one paragraph

A **Tanzania-licensed, real-money pari-mutuel prediction market**. Players stake TZS on YES/NO
outcomes and on a fast "Up & Down" price game; pools settle from official sources. It is a
regulated gambling product, so **it must never read as a casino** — no confetti, no chips, no
reels. The house voice is *heraldic and calm*: a seal being pressed, not a jackpot ringing.

Three languages (EN / SW / ZH), one dark-royal theme, four breakpoints (360 / 768 / 1280 / 1920).

---

## The ask, in one sentence

**Give this product material — light, elevation, weight, metal — inside the design system it
already has, and apply it across the whole kit rather than one screen.**

⛔ **This is not a request for animations.** The motion vocabulary is already disciplined and
opinionated (`law/motion.css`): one signature easing, one hover displacement, one press scale, a
six-step duration ladder. Adding motion on top of flat surfaces will not fix what is wrong.

---

## What is wrong — measured, not felt

`AUDIT.txt` scores all 133 components on light / elevation / motion:

| | |
|---|---|
| **79%** | have **no light** — flat fill only, no gradient, specular or inner highlight |
| **60%** | have **no elevation** — they share the page's plane, no shadow, no ring |
| **44%** | have **no motion at all** |
| **52%** | **animate but bypass the token ladder** — the vocabulary exists and half the product ignores it |
| **43 components** | have **all three absent** |

⚠️ **The audit ranks; it does not judge.** Some of those 43 *should* be flat — `form-column`,
`page-container` and `refresh-poller` have no visible surface at all. Read it against what each
component is for. The ones that matter are called out below.

### The specific failures, worst first

1. **`markets/market-card.tsx` — no light, no elevation, no motion.** Our own standards call
   MarketCards *"the iconic surface"*. It is the most-seen component in the product and it is
   a flat rectangle.
2. **The win celebration** (`shots/win-celebration-*.png`) — a **line-art trophy with eight
   straight-line rays**. No light source, no falloff, no bloom. It reads as clip-art from
   across the room, and it is the most screenshot-able screen we have.
3. **`ui/glyphs.tsx` — 185 icons, zero animation and zero material.** In a product whose
   signature easing is named *settle*, not one icon settles. No state morphs (bell → ringing,
   lock → unlock), no directional emphasis on the up/down arrows that are the core of the game.
4. **Dropdowns and menus** (`shots/avatar-menu-open.png`) — a **flat panel with a 1px border**
   on a dark page. No shadow, so it reads as *"a div appeared"* rather than *"a menu opened"*.
   The icons are hairline strokes that nearly vanish against the background, and ~45% of the
   panel width is dead space.
5. **Modals and dialogs** — `ui/confirm-dialog.tsx` and `markets/sell-confirm-modal.tsx` both
   score 3/3 absent. These are **money-decision surfaces** with no material weight at all.
6. **The identity system is invisible.** `ui/identity-avatar.tsx` is a **generative heraldic
   crest** — four crest kinds, deterministic PRNG per seed, gilt chief with pips, tier rings,
   dependency-free SVG. It renders with the chief at **`opacity="0.16"`** over a
   **`strokeWidth="0.8"`** line. At the 56px the podium uses that is sub-pixel. ⭐ **It was
   designed, built, and dialled below visibility.** See `shots/podium-and-avatars.png` — what
   ships looks like initials in a circle.
7. **The podium does not podium.** #1 is barely larger than #2/#3, ~26px higher, tiny outline
   crown, three flat circles on a panel that shares its background with the page.
8. **Inverted hierarchy on the settled card** (`shots/board-card-settled.png`) — the biggest
   element is a **dead timer** (`ROUND SETTLED 00:00`, 28px mono); the actual news, `↘ Down
   wins`, is a small text row beneath it.
9. **Toasts** (`components/toast.tsx`) — four variants, and the visual difference between them
   is colour alone. There is no material distinction between *"your money moved"* and *"here is
   some information"*.

---

## What we want delivered

### 1 · A material system  ← highest leverage; everything else inherits it
- **the light source** — where light comes from in this theme, and consistently;
- **an elevation ladder** — how a surface catches light at each z (flat card → raised card →
  dropdown → modal → toast), as tokens we merge into `law/tokens.css`;
- **a real gilt treatment** — our gold is a flat fill. Make it behave like struck metal:
  specular highlight, edge catch, defined hover/press behaviour. ⛔ Gold on player surfaces
  means **earned money only** — this carries meaning, not decoration.

### 2 · The seal, replacing the trophy
⭐ **Our own keyframes already name it and nobody built it:** `seal-impress`, `seal-place`,
`badge-seal-rays` sit defined and unused in `law/keyframes.css`. We want a **struck heraldic
seal** — pressed metal, real specular light, landing with mass — instead of a drawn cup. No
rays, or a soft radial bloom instead of eight strokes.

### 3 · Elevation applied to the overlay family
Dropdown, popover, modal, confirm dialog, toast, sheet. One coherent treatment so an overlay
reads as *above* the page, not merely *on* it.

### 4 · Icon + identity motion primitives
A small primitive set — entrance, state morph, directional emphasis — applied across the 185
glyphs; plus the crest dialled to legible, with an arrival and a tier-ring reveal.

### 5 · The card family
`market-card`, `updown-card`, `position-card`, `stat`, `chip` — the surfaces a player spends
their time on. Material + the corrected hierarchy on settled states.

---

## The law — non-negotiable; violating it makes the output unusable

Full text in `law/DESIGN_AUTHORITY.md`.

| | |
|---|---|
| **Theme** | ONE dark-royal theme. No light mode, no toggle, no `dark:` variants. |
| **Colour** | Palette is **`oklch()`**, royal hue 268. ⛔ **Never emit hex or rgb.** Extend by adding a token to `law/tokens.css`. |
| **YES / NO** | YES = green (hue 152), NO = rose (hue 22). **Untouchable** — never inverted, re-hued, or reused for anything non-money. |
| **Gold** | `--gilt` on player surfaces = **earned money only**; on admin = resolved-seal only. Never decorative. |
| **Motion** | Use ONLY the easings and durations in `law/motion.css`. Do not invent one. |
| **Reduced motion** | **Every** animation must be disabled under `prefers-reduced-motion: reduce`. |
| **Register** | ⛔ No confetti, chips, dice, reels, coin showers, slot spins, fireworks. Calm, not casino. |
| **Language** | EN / SW / ZH. Swahili runs ~40% longer than English, Chinese ~50% shorter. Nothing may depend on string length. |
| **Layout** | 360 / 768 / 1280 / 1920, mobile-first. Tap targets ≥ 40px. Zero horizontal overflow. |

### The motion vocabulary you must build inside

```
--m-settle   cubic-bezier(0.16, 0.9, 0.24, 1.004)   arrivals — the signature
--m-glide    cubic-bezier(0.32, 0.72, 0, 1)         neutral travel, no overshoot
--m-leave    cubic-bezier(0.55, 0, 0.85, 0.3)       exits — accelerate away
--m-pivot    cubic-bezier(0.34, 1.4, 0.44, 1)       needles & dials ONLY
--m-breathe  cubic-bezier(0.65, 0, 0.35, 1)         symmetric loops

--t-flick 90ms · --t-quick 140ms · --t-base 220ms
--t-move 340ms · --t-stage 520ms · --t-max 620ms (ceiling: settlement + celebration only)

--m-tilt   -14deg   THE axis — same angle as the divider in the brand mark
--m-lift   -2px     the only hover displacement in the product
--m-press  0.97     the only press scale
--m-stagger 40ms    between siblings, never more than 4 steps
```

⚠️ **52% of animating components currently bypass this ladder.** Part of the commission is a
migration note: which hardcoded timings map to which token.

---

## What is already good — please do not "fix" it

- **Typography and density.** Our closest competitors (Polymarket, Kalshi) win on exactly this
  and we are already there. Do not soften it.
- **Information architecture on money surfaces.** The settlement proof, refund copy and result
  states were each corrected against real money. **Out of scope.**
- **The restraint itself.** The no-casino rule is right; the mistake was answering it with
  *flatness* rather than *better material*. **Apple Wallet is extremely restrained and feels
  expensive.** That is the target.

## References we consider on-target

**Apple Wallet / Apple Pay** — material + specular gold, the benchmark for "money feels
premium" · **Monzo / Revolut card reveal** — material plus one confident motion · **Stripe** —
motion precision and depth without decoration.

⛔ **Off-target:** Duolingo, casino apps, any confetti library. Wrong register entirely.

---

## What is in this package

```
README.md                 this brief
CURRENT-STATE.md          the critique with per-surface evidence
AUDIT.txt                 all 133 components scored on light / elevation / motion
law/DESIGN_AUTHORITY.md   the full design law
law/motion.css            the motion vocabulary — build inside it
law/tokens.css            256 design tokens extracted from globals.css (oklch)
law/keyframes.css         all 33 existing keyframes — do not duplicate under new names
components/               13 surfaces under critique, as they ship today
shots/                    production screenshots — 3 languages, 2 widths, 4 surfaces
```

⚠️ `shots/podium-and-avatars.png` shows leaderboard display names — QA personas plus one real
team member. Flagged so the decision to share it is explicit.

---

# THE DELIVERABLE — read this section twice

We are not commissioning ideas, mood boards, or a motion "direction" to interpret. **We are
commissioning the finished thing**: production CSS and SVG/React that we paste in and ship,
complete enough that nothing is left for us to invent.

## D-0 · The typefaces you are designing for

Loaded via `next/font/google`, already in the product. Design to these and nothing else:

| token | family | used for |
|---|---|---|
| `--font-display` | **Sora** | headings, the amount on a celebration, card titles |
| `--font-body` | **Inter** | all prose |
| `--font-mono` | **JetBrains Mono** | every number, every identifier, every countdown, every money figure |
| `--font-cjk` | PingFang SC / Noto Sans SC stack | Chinese fallback, appended to all three above |

⛔ **Money is always `--font-mono` with `tabular-nums`.** A payout that reflows as digits change
is a defect. If a motion involves a changing number, it must not shift layout — **verify with
tabular figures, not proportional ones.**
⛔ **Do not introduce a typeface.** If a treatment needs one, say so; we will not add it.

## D-1 · Every animation, fully specified — no gaps for us to fill

For **each** motion you deliver, give all of:

1. the **keyframes**, named in our existing convention (see `law/keyframes.css` — do not
   duplicate a motion that already has a name there);
2. the **easing token** and **duration token** it uses, by name (`--m-settle`, `--t-base`, …);
3. the **trigger** — mount, hover, press, focus, state change, arrival of data;
4. the **exit** — every entrance needs its leave, using `--m-leave`;
5. the **reduced-motion fallback**, written out, not described. ⛔ *Every* animation must have
   a `@media (prefers-reduced-motion: reduce)` branch that is still legible and still conveys
   the state change;
6. the **compositor cost** — we only accept `transform`, `opacity`, `filter` and `box-shadow`.
   ⛔ Nothing that animates `width`, `height`, `top`, `left` or `margin`. If a layout change is
   unavoidable, say so and we will decide;
7. **what it must NOT do** — the failure mode you are guarding against.

## D-2 · Every state and accessory, for every component you touch

A component is not delivered until all of these exist. This is the "accessories" list and it is
where most design handoffs stop short:

- **states** — default · hover · active/press · focus-visible · disabled · loading · error ·
  success · empty · skeleton
- **sizes** — every size the component already ships (`sm` / `md` / `lg`, and `xs`/`2xl` where
  the avatar uses them: **20 · 28 · 40 · 48 · 56 · 80px**)
- **variants** — every variant already in the file (e.g. `toast.tsx` has `default` / `success` /
  `warning` / `danger` / `factual`; `factual` exists because a tick over "you lost TZS 2,000"
  was a real defect — respect why each one is there)
- **densities** — the same component on a 360px phone and a 1920px desktop
- **languages** — EN / SW / ZH. **Swahili runs ~40% longer, Chinese ~50% shorter.** Nothing may
  break, clip, wrap to three lines, or depend on string length
- **the dark-royal theme only** — there is no second theme to design

## D-3 · A SYSTEM, not a set of one-offs

⭐ **This is the part that determines whether the commission is worth it.** We have 133
components today and we will add more. Deliver primitives that a component we have not built yet
can adopt without asking you again:

- a named **elevation ladder** — flat → raised → overlay → modal → toast — as tokens, with the
  shadow/ring/light recipe at each step, so any future surface picks a rung rather than inventing one;
- a named **entrance/exit family** — the two or three arrivals every surface may use, and their
  matching exits;
- a **gilt/metal recipe** as tokens, so any future money surface gets the same metal;
- an **icon motion primitive set** applied to the 185 we have, expressed so glyph #186 inherits it;
- a **"how to extend this" note** — the rules a future component follows, in the voice of
  `law/DESIGN_AUTHORITY.md`, which we will merge into it.

## D-4 · Coverage — the components in `components/` are the START, not the scope

The 15 files shipped here are the worst offenders and the representative shapes. The system in
D-3 must cover **the whole kit** (`AUDIT.txt` lists all 133), grouped as:

| family | representatives shipped | what the family needs |
|---|---|---|
| **overlays** | `modal` · `confirm-dialog` · `toast` · `tooltip` · `select` · `avatar-menu` | one elevation + one entrance/exit language so an overlay reads as *above* the page |
| **cards** | `market-card` · `updown-card` · `stat` · `chip` | light + a hierarchy that leads with the news, not the chrome |
| **controls** | `button` | the press/hover/focus vocabulary, with `--m-lift` / `--m-press` honoured |
| **identity** | `identity-avatar` · `avatar` | the crest made legible, plus arrival + tier-ring reveal |
| **celebration** | `win-celebration` · `reward-burst` | the struck seal replacing the drawn trophy |
| **iconography** | `glyphs-excerpt` | the primitive set, applied to all 185 |

## D-5 · Format, and what "perfectly rendered" means here

- **CSS**: custom properties + `@keyframes` we merge into `globals.css` / `motion.css`. Use our
  token names. ⛔ **`oklch()` only — never hex, never rgb.**
- **Components**: SVG / React matching the **existing props** in `components/*.tsx`.
  ⛔ **No public prop changes. No new runtime dependency.** (We have no animation library and do
  not want one — everything here is CSS + inline SVG, and it must stay that way.)
- **Rendered proof**: for each deliverable, a still at **360px and 1280px**, and for anything
  with a moving number, a still at the **midpoint of the motion** — our own celebration was once
  photographed with a rolling counter 10 short, which reads exactly like a money bug.
- **Naming**: every choice cites the token it uses. ⛔ **If something needs a token that does not
  exist, say so and stop — do not invent a value.** We will add it to the system deliberately,
  because the token file is the single definition site and drift there is the defect we spend
  the most time repairing.

## D-6 · How we will judge it

1. It **passes `test:design-frozen`** — our ratchet over 45 files, which may only shrink.
2. It **passes `test:ui-consistency`** — no new drift beyond the tracked baseline.
3. Every animation has a **reduced-motion branch**.
4. Nothing animates a layout property.
5. It renders correctly in **EN, SW and ZH at 360 and 1280**.
6. ⭐ **A component you never saw can adopt it from the written rules alone.** If we have to ask
   you how to apply it to component #134, D-3 was not delivered.
