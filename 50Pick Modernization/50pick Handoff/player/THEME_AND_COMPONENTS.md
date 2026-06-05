# 50pick — Theme & Components Spec (for design review)

> A plain-language walkthrough of how the design system is built: the palette,
> the **fade / opacity levels**, surfaces, motion, and how each component is
> constructed. Share with the designer — there's an **Approve / Change** checklist
> at the end. Nothing here changes the locked palette; it documents how we use it.

---

## 1. Philosophy
- **Royal-navy canvas, gilt for the moments that matter.** Deep indigo-blue surfaces; gold (gilt) is *earned* — reserved for resolved wins, the confirm-payout button, the conviction needle, and unlocked achievements. It never becomes a generic accent.
- **Green = YES + "working toward it."** Emerald is the YES side, gains, live progress, and in-progress states (energized glow). **Rose = NO + losses.**
- **Numbers are sacred.** Every amount / %, / time / score is JetBrains Mono, tabular figures.
- **Calm, never a casino.** No confetti/chips/dice. Celebration = one gilt ray + a rolling counter. Warnings are calm, bilingual, never alarmist.

---

## 2. Palette & fade levels

### Hues (locked)
| Role | Hue | Notes |
|---|---|---|
| Royal chrome / surfaces | ~264–268 | canvas, cards, nav |
| Brand blue (CTA, links, focus) | ~262 | the "blue" |
| Gilt / gold (earned only) | 80–84 | resolved, payout, needle, unlocked |
| YES / gain / progress | 150–152 | emerald |
| NO / loss | 22–25 | rose |
| Aqua patina (atmosphere) | 195 | hero particles only — never gilt |

### Fade / opacity ladder (how we build depth)
We lean on **alpha**, not new colors, to create hierarchy:
- **Surface fills:** page → elevated (cards) → elevated2 (raised) → inset (tracks/inputs). Each is a lightness step on the royal hue, fully opaque.
- **Borders:** hairline `border` (~0.0–1 solid royal) → `border-strong` for emphasis. On gilt/colored surfaces we use the accent at **28–45% alpha** (e.g. `oklch(78% 0.13 80 / 0.35)`).
- **Glows:** soft same-hue shadow at **10–28% alpha**, blur 16–34px. Hover roughly **doubles** the alpha + blur.
- **Text ladder:** text (96% L) → muted (~73%) → subtle (~58%) → faint (~48%). Used for primary → caption → meta → disabled.
- **Disabled / locked:** **opacity 0.8** on the whole card, glyph at ~52% L, plus a small lock pip — *not* greyscale (greyscale read "cheap").
- **Glass (where used):** fill alpha **0.55–0.65**, `backdrop-blur 16px`, 1px gradient hairline at ~10–45% alpha.

---

## 3. Surfaces & elevation
Two real elevations, kept restrained:
- **Rest:** card fill + 1px hairline + a 1px inset top-highlight (`oklch(98% .. / 0.10)`) + soft 2–8px shadow.
- **Raised / hover:** brand-blue border + deeper 14–34px shadow + (for market cards) a 3px lift. Gilt-bloom hover is reserved for market cards specifically.

Radius scale: xs 4 · sm 6 · md 10 · lg 14 · xl 20 · pill 999. Buttons use 8–10.

---

## 4. Motion & haptics
| Easing | Curve | Duration | Use |
|---|---|---|---|
| micro | (.2,.8,.2,1) | 100ms | hover / press / focus |
| stage | (.4,0,.2,1) | 240ms | sheets, modals, bar reveal |
| celebrate | (.2,.8,.2,1) | 600ms | resolve / payout |

Signature loops: **light-sweep** across progress fills, **edge-pulse** on the bar's leading node, **gold shimmer** on resolved bars, **news flicker** beacon, **breathe** on the dial at rest. All collapse to instant under `prefers-reduced-motion`.
Haptics: light (10ms) select · medium (20ms) confirm/sheet · success [10,40,10] placed/paid · warning [30,30] reality-check.

---

## 5. How key components are built

- **Conviction dial (signature, unchanged):** one drag sets *side + stake-multiplier* (1×→5×, quadratic ease). Neutral at center (genuine grey, breathing ring). Gold knob/needle; numbers roll. Linear + round (squircle) variants. **This is the production component — ship as-is.**
- **Buttons:** one flat-solid family, radius 8. Filled (YES green / NO rose / gold) with a 1px top inset-highlight; hover = brightness +7% + 1px lift + same-hue glow; press = 1px down + brightness −7% + inset shadow. Chrome variants (blue primary / ghost / outline) share the motion.
- **Probability bar:** YES-left emerald / NO-right rose split, gradient fills, animated from 50%, with a **glowing gold boundary needle** (ties to the dial). Variants: split / segmented / minimal / resolved (gold shimmer).
- **Progress bars:** energized gradient fill + outer glow + a **traveling light sweep** + a pulsing leading-edge node; hover intensifies glow & speeds the sweep. Tones: teal/yes/no/gold/blue.
- **Market card:** glass-royal panel; hover = blue border + lift + soft gilt bloom.
- **Achievements & score:** gilt **medallion** (gilt ring + royal radial field + line-art glyph) for **earned**; **in-progress = green glowing ring + green progress bar** (consistent with the bars — *not* gilt); **locked = dim royal + lock pip**, opacity 0.8. Score hero = tier medallion + rolling points + rank/percentile + next-tier ring.
- **States:** every surface has empty / loading (skeleton + sweep) / error+retry / offline. Warnings: reality-check, limits, cooling-off, high-stake, low-balance.
- **Chrome:** top nav 56px, mobile bottom nav 64px, news marquee (gold flicker beacon), live ticker (red pulse), AI assistant panel.

---

## 6. Decisions to approve / change

Please mark each **Approve** or **Change** and add notes:

1. **Gilt budget** — gold only for earned/resolved/payout/needle; in-progress is green. ☐ Approve ☐ Change
2. **Locked styling** — dim + lock pip at opacity 0.8 (not greyscale). ☐ Approve ☐ Change
3. **Probability bar gold boundary needle** — ties to the dial; acceptable use of gold? ☐ Approve ☐ Change
4. **Progress bar light-sweep** — keep the animated streak, or calmer? ☐ Approve ☐ Change
5. **Brand blue vs royal hue** — current chrome hue. Match exactly to production token? ☐ Approve ☐ Change
6. **Achievement set** — 10 achievements + names/Swahili/rarity. Add/remove any? ☐ Approve ☐ Change
7. **Score model** — points + tiers (Bronze→Diamond) + percentile. Correct for launch? ☐ Approve ☐ Change
8. **Motion intensity** — glows/sweeps at current levels, or dial down for mid-tier Android? ☐ Approve ☐ Change

> Open question for the designer: do you want **light mode** specced now, and should the **HeroConstellation** landing be the canonical hero? Both are ready to build on approval.

---

## 7. Review responses (round 1)

Applied from the design-team review:
- **#8 Motion intensity → done.** Added `--motion-level: full | reduced | minimal` on `:root`, driven by a `data-motion` attribute on `<html>`: `reduced` kills ambient loops (light-sweep, flicker, shimmer, breathe, edge-pulse) but keeps functional transitions; `minimal` collapses essentially everything. Pair with battery-saver / low-power detection on mid-tier Android.
- **#4 Progress sweep → done (caveat satisfied).** The light-sweep now respects both `prefers-reduced-motion` and `data-motion`.
- **TopNav wallet balance → done.** Re-added an always-visible gilt balance pill (`TZS …` + quick top-up `+`) before the bell — important for a betting platform.

**Still needs your call — #5 Brand hue (we did NOT change this unilaterally):**
The reviewer recommends unifying chrome + surfaces at **hue 268** and using **262 only for focus/links**. Earlier in this engagement the product owner explicitly asked to move the accent toward **blue** (away from the violet that 268 reads as), which is why surfaces sit near 264 and brand near 262 today. These two directions conflict. **Please confirm one:**
- (a) Unify at 268 (royal indigo, per review #5), 262 only for focus/links, or
- (b) Keep the current blue-leaning split (owner's earlier preference).
It's a one-line token change either way — we just need the tie broken.

**Resolved:** product owner chose **(b) keep the current blue-leaning split** (surfaces ~264, brand ~262). No change required.
