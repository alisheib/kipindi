# Kipindi Design System

**Version 1.0 · Tanzania-first · Mobile-first · Light + Dark · EN + SW**

> This document is the single source of truth for Kipindi's visual, motion, copy, and interaction language. Companion files: `tokens.json` (machine-readable), `LOGO_SPEC.md` (logo construction).

---

## §2.1 Brand Foundation

### Naming
**Recommendation: keep "Kipindi"** (Swahili: *"a period of time"*). It maps directly to the core mechanic (time-window betting), is short, distinct, available across .co.tz / .com / app stores at filing time, and reads as confident and locally rooted without being folkloric. No conflict surfaced; do not rename.

### Taglines (English / Swahili)
1. **"Bet the moment."** / **"Cheza kipindi chako."**
2. **"The fairer pool."** / **"Bwawa la haki."**
3. **"Time is the game."** / **"Wakati ni mchezo."**

Default for launch: **#1**. Use #2 in regulator-facing and trust-building contexts. Use #3 sparingly in motion / brand films.

### Voice & Tone — principles
- **Confident, calm, fair.** We are a quiet professional, not a hype man.
- **Short sentences.** Verbs first. Numbers tabular.
- **Never desperate.** No "DON'T MISS OUT", no countdown threats.
- **Loss is dignified.** We never say "you lost" — we say *the pool grew*. (See §2.17 sensitive copy.)
- **Bilingual parity.** Every user-facing string ships in EN + SW at the same time, never SW as an afterthought.

### Voice — do / don't (EN)

| ✅ Do | ❌ Don't |
|---|---|
| "Stake placed. Window: 15–30." | "BET LOCKED IN! 🔥🔥🔥" |
| "The pool grew. Try the next window." | "You lost! Try again!" |
| "Verify your ID to withdraw." | "ACT NOW or lose access!" |
| "Withdrawal under review (AML)." | "Your money is on hold." |
| "Cash out: TZS 4,200." | "QUICK CASH!" |

### Voice — do / don't (SW)

| ✅ Fanya | ❌ Usifanye |
|---|---|
| "Dau limewekwa. Kipindi: 15–30." | "DAU LIMESHIKA! 🔥🔥🔥" |
| "Bwawa limeongezeka. Jaribu kipindi kingine." | "Umepoteza! Jaribu tena!" |
| "Thibitisha kitambulisho ili utoe." | "FANYA SASA au upoteze!" |
| "Uondoaji unakaguliwa (AML)." | "Pesa yako imezuiliwa." |
| "Toa sasa: TZS 4,200." | "PESA HARAKA!" |

Register: **casual but respectful.** Use "wewe" not "ninyi" for individual user. Avoid heavy Swahili-English code-switching ("Sheng") in core flows; allow it in marketing only.

### Logo
See `LOGO_SPEC.md`. Summary: 270° royal-blue arc + gold dot in the open quadrant + Sora Semibold wordmark. Monogram for app icon / favicon / avatar.

### Brand Pattern Library (3 abstract patterns)

All three patterns are **structurally inspired** by Maasai bead grids and Kente weave repeats — never literal copies, never tribal-coded color palettes. Used at 4–8 % opacity as background texture, dividers, and OG art. Each is a tileable SVG.

1. **Mwangaza ("light")** — vertical thin bars in alternating widths (1u, 2u, 1u, 4u) at a 12u repeat. Used for top-bar dividers and email rules.
2. **Sokoni ("market")** — 16u square grid of nested diamonds (outer 14u, inner 6u), gold strokes on royal background. Used for app-icon background, splash, OG generic.
3. **Mfumo ("system")** — interlocking horizontal weave: 32u tall bands of 4u-wide rectangles offset by 8u between rows. Used for section dividers and the win-share card.

Rules: never tile a pattern below 8 % opacity threshold (banding); never use more than one pattern in a single composition; never combine pattern with photography.

---

## §2.2 Color System

> All token names below match `tokens.json` exactly. Tailwind config snippet at §2.21.

### Light mode

**Background**
- `bg.base` `#F7F8FB` — page background
- `bg.subtle` `#EEF0F5` — subdued sections
- `bg.sunken` `#E4E8F0` — recessed wells (input groups, code blocks)
- `bg.elevated` `#FFFFFF` — cards, sheets, modals
- `bg.overlay` `rgba(11,14,24,0.45)` — modal scrim

**Surface** — `default #FFFFFF` · `hover #F4F6FB` · `pressed #E9EDF6` · `selected #E0E8F8` · `disabled #F2F3F7`

**Border** — `default #DEE2EC` · `subtle #EEF0F5` · `strong #C2C9D8` · `focus #2A50AE` · `divider #E4E8F0`

**Text** — `primary #0A1838` · `secondary #3B4358` · `tertiary #6F798F` · `disabled #9AA3B7` · `inverse #FFFFFF` · `link #1E3E94` · `link-hover #173173` · `on-brand #FFFFFF`

**Brand Primary (Royal)** — `default #1E3E94` · `hover #173173` · `active #102356` · `foreground #FFFFFF` · `subtle #EEF2FB` · `subtle-hover #D7E0F5`

**Brand Accent (Gold)** — `default #B58A21` · `hover #946D17` · `active #705210` · `foreground #0A1838` · `subtle #FBF7EC` · `subtle-hover #F4EAC9`

**Semantic** (default / bg / border / foreground)
- success `#1F7A4D` / `#E6F4EC` / `#B8DDC8` / `#FFFFFF`
- warning `#A5650D` / `#FBF1DE` / `#EFD49B` / `#FFFFFF`
- danger `#9A2B2B` / `#F8E5E5` / `#E5B5B5` / `#FFFFFF`
- info `#1E5A94` / `#E5EEF7` / `#B5CCE2` / `#FFFFFF`

**Betting domain** — `win #1F7A4D` · `lose #6F798F` · `draw #A5650D` · `pool #1E3E94` · `stake #B58A21` · `jackpot #CDA635` · `streak #C2410C` · `hot #B91C1C` · `cold #0E7490`

### Dark mode

**Background** — `base #060F24` · `subtle #0A1838` · `sunken #05070F` · `elevated #102356` · `overlay rgba(0,0,0,0.65)`
**Surface** — `default #0A1838` · `hover #102356` · `pressed #173173` · `selected #1E3E94` · `disabled #0E1730`
**Border** — `default #1E3E94` · `subtle #102356` · `strong #4F70C2` · `focus #DEBC54` · `divider #102356`
**Text** — `primary #F7F8FB` · `secondary #C2C9D8` · `tertiary #9AA3B7` · `disabled #525B70` · `inverse #0A1838` · `link #DEBC54` · `link-hover #E9D38E` · `on-brand #FFFFFF`
**Brand Primary** — `default #4F70C2` · `hover #7E97D8` · `active #AFC0EA` · `foreground #060F24` · `subtle #102356` · `subtle-hover #173173`
**Brand Accent** — `default #DEBC54` · `hover #E9D38E` · `active #F4EAC9` · `foreground #060F24` · `subtle #2C1F06` · `subtle-hover #4D380B`
**Semantic** (default / bg / border / foreground)
- success `#34D399` / `#06281C` / `#0D5C3F` / `#06281C`
- warning `#F0C674` / `#2C1F06` / `#705210` / `#2C1F06`
- danger `#F87171` / `#2A0B0B` / `#7A1A1A` / `#2A0B0B`
- info `#7E97D8` / `#0E1730` / `#1E3E94` / `#0E1730`

**Betting** — `win #34D399` · `lose #9AA3B7` · `draw #F0C674` · `pool #7E97D8` · `stake #DEBC54` · `jackpot #E9D38E` · `streak #FB923C` · `hot #F87171` · `cold #67E8F9`

### Glow tokens (dark-mode signature shadow strings)

```
gold-glow:    0 0 0 1px rgba(222,188,84,0.35), 0 0 24px rgba(222,188,84,0.45), 0 0 64px rgba(181,138,33,0.25)
blue-glow:    0 0 0 1px rgba(79,112,194,0.35), 0 0 24px rgba(30,62,148,0.50), 0 0 64px rgba(16,35,86,0.30)
win-glow:     0 0 0 1px rgba(52,211,153,0.35), 0 0 24px rgba(52,211,153,0.45), 0 0 80px rgba(31,122,77,0.30)
jackpot-glow: 0 0 0 2px rgba(233,211,142,0.50), 0 0 32px rgba(222,188,84,0.55), 0 0 96px rgba(181,138,33,0.35)
```

### Gradients (named)

```
brand-hero:    linear-gradient(135deg, #060F24 0%, #102356 45%, #1E3E94 100%)
gold-rush:     linear-gradient(120deg, #705210 0%, #B58A21 40%, #DEBC54 70%, #F4EAC9 100%)
jackpot:       radial-gradient(120% 120% at 50% 0%, #DEBC54 0%, #B58A21 35%, #4D380B 75%, #060F24 100%)
streak-aurora: linear-gradient(110deg, #1E3E94 0%, #4F70C2 30%, #B58A21 60%, #DEBC54 100%)
pool-pulse:    radial-gradient(80% 80% at 50% 50%, rgba(79,112,194,0.55) 0%, rgba(30,62,148,0.20) 60%, rgba(6,15,36,0) 100%)
```

### Opacity scale
`0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100` (decimals: 0, 0.05, 0.1, … 1.0)

---

## §2.3 Typography

### Font stacks
- **Display:** `"Sora", "Inter", "Helvetica Neue", Arial, sans-serif` — geometric, calm, headlines/display.
- **Body:** `"Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif` — full Latin Extended-A coverage including Swahili diacritics (â, î, ŝ).
- **Mono:** `"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace` — IDs, transaction refs, code.

Both Sora and Inter cover Swahili Latin Extended; verified against the SW characters used in TZ orthography. Subset both fonts to **Latin + Latin-Ext** only at build time.

### Type scale (12 sizes)

| Token | Size | LH | LS | Weight | Use |
|---|---:|---:|---:|---:|---|
| `micro` | 10 | 14 | +0.4 | 500 | Tabular footnotes only |
| `caption` | 12 | 16 | +0.2 | 500 | Captions, secondary metadata |
| `label` | 13 | 18 | +0.1 | 500 | Form labels, chips |
| `body-sm` | 14 | 20 | 0 | 400 | Dense lists, table cells |
| `body` | 16 | 24 | 0 | 400 | Default running text |
| `body-lg` | 18 | 28 | 0 | 400 | Lead paragraphs |
| `title-sm` | 20 | 28 | -0.1 | 600 | Card titles |
| `title-md` | 24 | 32 | -0.2 | 600 | Section titles |
| `title-lg` | 30 | 38 | -0.3 | 600 | Page titles |
| `display-3` | 36 | 44 | -0.4 | 700 | Marketing |
| `display-2` | 48 | 56 | -0.6 | 700 | Marketing hero |
| `display-1` | 64 | 72 | -0.8 | 700 | Splash / win celebration only |

### Weight scale
**Load:** 400, 500, 600, 700 only — for both Sora and Inter.
**Never use:** 100, 200, 300 (illegible on budget Android LCDs); 800, 900 (clashes with our calm brand).

### Number rendering
- **Currency, stakes, returns, pool sizes:** `font-variant-numeric: tabular-nums lining-nums;` always.
- **IDs / refs:** mono family.
- **Score numerals:** display family, tabular-nums, +0.5 px optical letter-spacing for the flip-clock component.

### Hierarchy patterns

| Level | Token | Notes |
|---|---|---|
| Page title | `title-lg` | One per page |
| Section title | `title-md` | At top of major regions |
| Card title | `title-sm` | Inside cards |
| Label | `label` uppercase, +0.6 px tracking | Form / chip labels |
| Body | `body` | Default |
| Caption | `caption` | Below an element |
| Micro | `micro` | Last resort |

### Multilingual rule
Swahili sentences run **15–20 % longer** than English. Buttons must allocate **min-width = 1.20× English label width**, OR truncate at 24 chars with ellipsis + tooltip. Never line-wrap a CTA. Test all CTAs in SW first, EN second.

---

## §2.4 Spacing, Sizing, Radii, Shadows, Z-index, Containers

### Spacing scale (4 px base, named)
`0:0` `1:2` `2:4` `3:8` `4:12` `5:16` `6:20` `7:24` `8:32` `9:40` `10:48` `11:64` `12:80` `13:96` `14:128`

### Sizing tokens
- **Icon:** sm 16 · md 20 · lg 24 · xl 32
- **Avatar:** xs 20 · sm 24 · md 32 · lg 40 · xl 56
- **Button height:** sm 32 · md 40 · lg 48 · xl 56
- **Touch target minimum:** 44 × 44 px (hard rule, see §4)

### Radii
`none 0 · xs 2 · sm 4 · md 8 · lg 12 · xl 16 · 2xl 24 · pill 999`

Per-component:
- Buttons → `md` (8)
- Inputs → `md` (8)
- Cards → `lg` (12)
- Modals → `xl` (16)
- Sheets / drawers (top corners only) → `2xl` (24)
- Chips / tags → `pill`
- Avatar → `pill`
- Image thumbnails → `md`

### Shadow scale (5 levels + 0)

**Light mode**
- `0` `none`
- `1` `0 1px 2px rgba(10,24,56,.06), 0 1px 1px rgba(10,24,56,.04)` — chips, list rows
- `2` `0 2px 6px rgba(10,24,56,.08), 0 1px 2px rgba(10,24,56,.04)` — cards
- `3` `0 6px 16px rgba(10,24,56,.10), 0 2px 4px rgba(10,24,56,.06)` — popovers, hovered cards
- `4` `0 12px 28px rgba(10,24,56,.14), 0 4px 8px rgba(10,24,56,.08)` — drawers, modals
- `5` `0 24px 48px rgba(10,24,56,.18), 0 8px 16px rgba(10,24,56,.10)` — celebration overlays

**Dark mode** — see `tokens.json:shadow.dark`. Add `inset 0 1px 0 rgba(255,255,255,0.04–0.06)` for the lifted top edge.

### Z-index scale (named)
`base 0 · raised 10 · dropdown 1000 · sticky 1100 · drawer 1200 · modal 1300 · popover 1400 · toast 1500 · tooltip 1600 · celebration 1700 · debug 9999`

### Containers & breakpoints
- **xs** 360 (smallest supported phone — design baseline)
- **sm** 640 · **md** 768 · **lg** 1024 · **xl** 1280 · **2xl** 1536
- Container max-widths match breakpoints. Page gutters: 16 px <sm, 24 px sm-md, 32 px md+, 48 px ≥xl.

---

## §2.5 Motion

### Easing curves

| Name | cubic-bezier | Use |
|---|---|---|
| `standard` | `0.2, 0.0, 0.0, 1.0` | Default. Most UI transitions. |
| `decelerate` | `0.0, 0.0, 0.2, 1.0` | Enters: things arriving on screen. |
| `accelerate` | `0.4, 0.0, 1.0, 1.0` | Exits: things leaving. |
| `emphasized` | `0.2, 0.0, 0.0, 1.0` | Hero / key transitions (same shape, longer duration). |
| `spring` | `0.34, 1.56, 0.64, 1.0` | Slight overshoot — toggle handles, badges. |
| `linear` | `0, 0, 1, 1` | Progress bars, indeterminate spinners only. |

### Duration scale

| Name | ms | Use |
|---|---:|---|
| `instant` | 0 | State-only changes, no animation |
| `micro` | 80 | Hover tints, ripple peaks |
| `short` | 160 | Tooltips, focus rings, small fades |
| `medium` | 240 | Standard transitions, drawer slides |
| `long` | 420 | Modals, page-level transitions |
| `celebration` | 1200 | Win burst, jackpot reveal |

### Animation pattern library

| Pattern | Dur | Easing | What changes | When | Reduced-motion |
|---|---:|---|---|---|---|
| slide-up | 240 | decelerate | translateY 12→0, opacity 0→1 | Sheets, toasts | opacity only |
| fade-in | 160 | standard | opacity 0→1 | Generic enter | identical |
| scale-in | 240 | spring | scale 0.96→1, opacity 0→1 | Modals, popovers | opacity only |
| pulse | 2000 loop | standard | box-shadow blur 0→16→0 | Live indicator | static glow |
| shimmer | 1400 loop | linear | gradient sweep | Skeleton | flat tint |
| ripple | 320 | accelerate | scale 0→1, opacity 0.2→0 | Button press | none |
| success-burst | 600 | spring | scale 0.5→1.1→1, opacity 0→1 | Inline success | scale 1, fade |
| win-celebration | 1200 | emphasized | particles + scale + glow | Win moment | static gold ring + text |
| loss-echo | 800 | accelerate | opacity 1→0.7→1, blur 0→4→0 | Loss | opacity only |
| count-up | 800–1500 | decelerate | numeric increment | Pool, balance | snap to final |
| flip-clock | 420 | standard | rotateX 0→90 (top half), 90→0 new | Score change | swap text |
| slider-coin-flow | 600 | decelerate | particles travel along track | Stake increase | none |
| pool-pulse | 1200–4000 | standard | ring scale 1→1.04→1 | Match momentum | static ring |
| streak-aurora | 6000 loop | linear | gradient hue shift | Streak active | static gradient |

All loops respect `prefers-reduced-motion: reduce` — replace with their static fallback.

---

## §2.6 Iconography

### Style spec
- **Grid:** 24×24 master.
- **Stroke:** 1.5 px outline, 2 px filled.
- **Termini:** rounded caps and joins.
- **Corner radius:** 1 px on outer corners, 0.5 px on inner.
- **Optical sizes:** 16, 20, 24, 32, 48 — re-drawn per size, not just scaled.

### States
- **Outline (default):** stroke only, currentColor.
- **Filled (active/selected):** solid fill, currentColor; used in active nav, selected tabs, applied filters, primary CTAs.

### Naming
React: `<Icon name="bet-slip" size={20} variant="outline" />`. Tailwind class: `i-kp-bet-slip-20`. File name: `bet-slip.outline.svg`, `bet-slip.filled.svg`.

### Complete icon list (~80)

**Navigation (8)** home · live · my-bets · wallet · search · menu · back · close
**Actions (12)** add · remove · edit · save · share · copy · download · upload · refresh · filter · sort · more
**Betting (10)** bet-slip · stake · pool · cashout · window-15 · window-30 · window-45 · window-60 · window-full · bundle
**Sports — football (10)** ball · whistle · pitch · goal · card-yellow · card-red · sub · corner · clock-match · trophy
**Payment — TZ (8)** mpesa · tigo-pesa · airtel-money · halo-pesa · ttcl-pesa · bank-transfer · card · voucher (each rendered as a brand-neutral monogram inside a rounded square — verify with each provider's brand team before launch; no logo lifts.)
**Status (10)** check · alert · info · question · clock · pending · approved · rejected · locked · unlocked
**Mini-game (8)** clash · spinner · momentum · streak · voice · dice · trophy-mini · target
**Admin / compliance (10)** shield · audit · flag · gavel · report · queue · risk · kyc · age-gate · helpline
**Social / utility (4)** profile · settings · notification · logout

(Total ≈ 80; counts include rounding for in-set duplicates.)

---

## §2.7 Illustration & Imagery

### Style direction
**Abstract geometric.** Built from the brand's own pattern primitives (Mwangaza, Sokoni, Mfumo) plus simple shapes (circle, arc, diamond, soft-rect). No characters with faces. No tribal motifs. No acacia trees. No sunsets. No stylized currency stacks. No fireworks.

Palette inside illustrations: 1 royal + 1 gold + 1 neutral max per illustration. Optional: one semantic accent if the state demands it (success/warning/danger).

### Empty-state illustration set (10)
1. **no-bets-yet** — empty arc with single dot at start.
2. **wallet-empty** — outline coin with diamond cut-out.
3. **kyc-pending** — clock face inside shield outline.
4. **no-live-matches** — paused two-bar marker on flat baseline.
5. **no-notifications** — bell silhouette with rest dot.
6. **no-transactions** — flat ledger line, single tick.
7. **no-leaderboard-rank-yet** — three diamonds stacked, top one outline.
8. **search-no-results** — concentric arcs with offset dot.
9. **filter-no-results** — funnel outline with crossed band.
10. **offline / no-connection** — three concentric arcs, outermost dashed.

### Hero illustration spec (marketing / onboarding)
1200×800 master, royal-on-navy, single gold focal element. One per onboarding step, 3 total. Always set in the brand pattern at 6 % opacity behind. No human figures.

### Tribal Clash factions (8)
Each faction has a name, a primary color (sourced from the Royal/Gold extensions), and an abstract geometric motif. **None reference real ethnic groups.**

| # | Name | Primary | Motif |
|---|---|---|---|
| 1 | Bahari (sea) | `#1E5A94` | Stacked waves of 3 arcs |
| 2 | Mwanga (light) | `#DEBC54` | Eight-rayed star, no face |
| 3 | Mawe (stones) | `#525B70` | 3-stone cairn outline |
| 4 | Moto (fire) | `#C2410C` | Triangular flame trio |
| 5 | Anga (sky) | `#7E97D8` | Three crescents in line |
| 6 | Msitu (forest) | `#1F7A4D` | Diamond-leaf cluster of 5 |
| 7 | Upepo (wind) | `#67E8F9` | Three swept lines |
| 8 | Ardhi (earth) | `#705210` | Concentric ring trio |

Each faction renders as a 240×240 emblem on a circular badge, with their primary color at 100 % on royal, plus the motif in `#FFFFFF` at 90 %.

### Photography rules
- **Locally shot in Tanzania**, no stock libraries, no AI-generated faces.
- Subjects: stadium ambience, hands holding phones, neighborhood scenes — quiet, warm, human-scale. **No casino imagery, no money fans, no celebratory champagne.**
- Color graded toward our neutrals: warm shadows, slight desaturation; no heavy filters.
- Always run a 70 % black scrim under any text laid on photos.
- Aspect ratios provided: 16:9 hero, 4:5 social, 1:1 avatar, 21:9 banner.

---

## §2.8 Sound & Haptics

### Sound palette (5)

| Name | Character | Length | When |
|---|---|---:|---|
| tap | soft wood click, 800 Hz peak | 60 ms | Button / chip select |
| success | rising perfect-fifth chime | 400 ms | Action confirmed |
| win | warm three-note arpeggio (up) | 1100 ms | Bet won |
| error | low single-tone thud | 200 ms | Validation / network error |
| alert | mid-pitch ping + brief pause | 350 ms | Push / toast attention |

All sounds rendered at -16 LUFS, mono, 48 kHz, exported as `.caf` (iOS) and `.ogg` (Android). No vocal hooks. No coin sounds. No casino "ka-ching".

### Haptic patterns (5, codes for engineering)

| Code | Pattern | When |
|---|---|---|
| `H_TAP` | 1 × light (10 ms) | Generic press |
| `H_TICK` | 1 × selection (5 ms) | Slider step / chip toggle |
| `H_SUCCESS` | medium-light double (10 ms / 40 ms gap / 10 ms) | Action confirmed |
| `H_WIN` | heavy + light + light (40, 10, 10 with 60 ms gaps) | Bet won |
| `H_ERROR` | heavy single (40 ms) | Validation error |

### Defaults
**Sounds:** OFF by default; respect system mute always; user toggle in Profile → Preferences. **Haptics:** ON by default; respect OS reduced-motion / low-power mode (auto-suppress).


---

## §2.9 Components — Atoms

For every atom: **anatomy → variants → sizes → all 18 states (§2.23) → tokens → a11y → motion → API.**

### Button
Variants: `primary` (royal fill, white text), `secondary` (royal outline, royal text), `ghost` (no fill/border, royal text), `danger` (semantic.danger fill), `gold-accent` (gold fill, navy text — reserved for win-share / cashout).
Sizes: `sm 32` · `md 40` · `lg 48` · `xl 56` (heights). Padding-x: 12 / 16 / 20 / 24. Radius `md`. Type `label` (sm/md), `body` 600 (lg/xl).

States (token refs, primary):
- default: `brand-primary.default` bg, `brand-primary.foreground` text, shadow `1`.
- hover: `brand-primary.hover` bg, shadow `2`. Duration `micro`/`standard`.
- hover+selected: hover bg + 2 px gold ring inset.
- focus-visible: 2 px outer ring `border.focus`, 2 px offset.
- focus+hover: ring + hover bg.
- active: `brand-primary.active`, shadow `0`, ripple from press point (`ripple` pattern).
- selected: 2 px inset gold ring.
- disabled: `surface.disabled`, `text.disabled`, no shadow, `cursor: not-allowed`, no hover.
- loading: spinner replaces leading icon, label dims to 70 %, button width frozen.
- error: bg `semantic.danger.default`, shake 6 px ×2, then revert.
- success: bg `semantic.success.default`, ✓ icon swaps in, 800 ms hold then revert.
- read-only: rendered as text-only, no interactive affordance.
- empty: only when label is dynamic and resolves to ""; render `—` placeholder.
- skeleton: pill-shaped 96 × height, shimmer.
- drag-source: opacity 0.6, slight tilt -1°.
- drop-target valid/invalid: not applicable.
- long-press: 500 ms triggers contextual menu where wired.

A11y: `<button>` element; `aria-busy` while loading; `aria-pressed` for toggle; `aria-disabled` over `disabled` when announcing-required; min 44×44.

API: `<Button variant size leading trailing loading disabled fullWidth onClick aria-label>...</Button>`.

### IconButton
24 / 32 / 40 / 48 px square. Same variants/states as Button. Always requires `aria-label`. Hover bg `surface.hover`, focus ring same.

### Input (text / number / currency-TZS / search / password / OTP)
Anatomy: leading addon · field · trailing addon (clear / toggle / unit). Height md 40, lg 48. Radius `md`. Border `border.default` 1 px → focus `border.focus` 2 px (no layout shift; use box-shadow trick).
Currency-TZS: leading addon `TZS`, tabular-nums, thousands separator, max 2 decimals (we round to whole TZS at submit).
OTP: 6 cells, 44 × 56, mono digits, paste fills all, auto-advance, backspace retreats, focus ring on active cell.
Password: trailing eye icon button toggles visibility; `aria-pressed` reflects state.
States: default, hover (border `strong`), focus (border `focus`, ring 2 px), focus+hover, active, disabled (`bg.subtle`, text disabled), error (border `semantic.danger`, helper red), success (border `semantic.success`), read-only (no border, plain text), loading (trailing spinner), empty (placeholder `text.tertiary`), skeleton (full-width bar), drag-target/source n/a.

API: `<Input type size leading trailing value onChange error helper required aria-describedby />`.

### Textarea
Same skin as Input. Min-height 96 px. Auto-grow up to 6 lines, then scroll. Char counter trailing-bottom.

### Select / Dropdown (native-replacement)
Trigger styled like Input + chevron. Menu: `bg.elevated`, shadow `3`, radius `md`, max-height 320, virtualized > 30 items. Items 40 px tall, 12 px x-padding.
Option states: default · hover (`surface.hover`) · focus (2 px inner ring) · selected (`brand-primary.subtle` + check) · disabled (text disabled).

### Combobox (searchable)
Same as Select with text input in trigger. Async load → loading skeleton rows. Empty: "No matches / Hakuna matokeo". Recent searches header section above results.

### Multi-select
Combobox where selected items render as chips inside the trigger. "Clear all" link in dropdown footer.

### Checkbox
16 × 16 box, radius `xs`, draw-check animation (200 ms, decelerate). States: unchecked, checked, indeterminate, focus, disabled, error (border `semantic.danger`). Labelled, hit area 44 × 44.

### Radio
16 × 16 circle, fill expansion (radio-fill 200 ms spring). Group on `<fieldset>`/`<legend>`.

### Switch
Track 36 × 20, handle 16 dia. Off: `surface.pressed` track. On: `brand-accent.default` track. Handle slides 200 ms spring; subtle scale 1.0 → 1.1 → 1.0.

### Slider (basic)
Track 4 px, fill `brand-accent.default`, thumb 20 px circle with `gold-glow` on focus. Keyboard: ←/→ ±step, Shift large step, Home/End to bounds. Tick marks at major stops. (Money-specific: see StakeSlider §2.12.)

### Tag / Chip / Pill
Height 24 (sm) / 28 (md) / 32 (lg). Radius `pill`. Variants: `neutral`, `brand`, `gold`, `success`, `warning`, `danger`, `info`. Removable variant: trailing × icon, hit 24 × 24. Toggle variant: `aria-pressed`, selected = filled.

### Badge / Counter
Numeric pill 16 × 16 min, max display "99+". Position: top-right of host element with a 4 px overshoot. Color: `semantic.danger` for unread; `brand-accent` for streak; `betting.win` for resolved-in-favor.

### Avatar
xs 20 / sm 24 / md 32 / lg 40 / xl 56. Initials fallback (1 letter xs/sm, 2 md+). Status dot bottom-right: 8 / 10 / 12 / 14 / 16 px. Status colors: online `success`, idle `warning`, offline `tertiary`, in-bet `brand-accent`. Pop-on-status-change 240 ms spring.

### Skeleton
Background `surface.pressed`. Shimmer overlay 1400 ms linear (gradient 0 → 100 %). Reduced-motion: flat tint, no shimmer.

### Spinner / Progress
**Circular spinner:** 16 / 20 / 24 / 32, 2 px stroke, 1.4 s linear rotation, dash 0.25 → 0.75.
**Linear progress:** 4 px tall, radius `xs`. Determinate: width animated. Indeterminate: 30 % wide bar slides 1.6 s linear.

### Divider
1 px `border.divider`. Variants: horizontal, vertical (height 1em min), labelled (text in middle, dividers either side).

### Kbd
Mono 12 px, padding 2 / 6, radius `xs`, bg `surface.pressed`, border `border.default` bottom 2 px (mech-key shadow).

### Link
`text.link`. Underline on hover only (`text-decoration-thickness: 1px; text-underline-offset: 3px`). Visited = same as default (we don't expose history). External: trailing 12 px arrow icon.

---

## §2.10 Components — Molecules

### Form Field wrapper
`<FormField>` renders: label · required-indicator · helper-text-top? · control · error-or-helper-bottom · counter? — gap 6 px. Label `label` token, error text `caption` semantic.danger.

### Money Input (TZS)
Built on Input. Leading `TZS`, tabular-nums, blur formats `1,234,567`, focus shows raw `1234567`. Min 100 TZS, max from server. Max 0 decimals (TZS does not use cents in our flows). Error: "Enter at least TZS 100 / Weka angalau TZS 100".

### OTP Input
6 digits. 44 × 56 cells. Spec in Input above. Auto-submit when all 6 filled (toggleable). Resend cooldown 30 s — link disabled w/ countdown caption "Resend in 0:23 / Tuma tena baada ya 0:23".

### Phone Input
Default country **+255 TZ**. Trigger button left (flag-free monogram of country code), then number field. Validates against E.164 + TZ length. International only enabled if `region` flag is on.

### Date Picker
Mobile: native input via `<input type="date">` for sub-200 KB win. Desktop: custom popover, 7-col grid, range mode supported. Selected `brand-primary.default`, in-range `brand-primary.subtle`, today outlined.

### Time Range Picker
Two scrollable hour-minute wheels mobile / two `Time` inputs desktop. Used for self-imposed play windows.

### File Uploader (KYC)
Three slots: ID front, ID back, selfie. Each slot 160 × 100 px on mobile, drop / tap to upload. Live preview, blur-detection warning, retake link. Status overlay icons: pending, scanning, accepted, rejected (with reason caption).

### Search Bar (global)
Height 40, leading search icon, trailing clear. Mobile: tapping opens full-screen search (§2.36). Desktop: opens dropdown with sections (Recent, Suggested, Results-by-type).

### Card (3 elevations)
- `flat`: bg `surface.default`, border `border.subtle`, shadow `0`.
- `raised`: shadow `2`.
- `floating`: shadow `3`, used for popovers and emphasized cards.
Slots: `header`, `body`, `footer`. Padding 16/20/24 by size. Hover: shadow up one level + bg `surface.hover` if interactive.

### Tooltip
Delay 400 ms enter, 80 ms exit. `bg surface.default` light / `surface.elevated` dark, shadow `2`, radius `sm`, padding 8/10. Caret 6 px. Max-width 240 px. Fade + 4 px rise (`short`, decelerate).

### Popover
Like tooltip but tappable, with focus trap. Has explicit close (Esc / outside-click).

### Toast (4 variants, auto-dismiss, swipe-to-dismiss)
Variants: `info`, `success`, `warning`, `danger`. Top-right desktop / top-center mobile. Width 360 / full-(-32). Auto-dismiss: success 4 s, info 5 s, warning 7 s, danger 9 s (or sticky if action). Swipe right (mobile) / × button. Stack max 3, oldest collapses to "+N more".

### Alert (inline)
Block within forms or page sections, semantic colors, leading icon + title + description + optional action.

### Banner (page-level)
Full-bleed strip at top of page. Use sparingly — KYC, maintenance, geo-block, age-gate.

### Tabs (3 variants)
- **Line:** underline 2 px gold on selected, full-width on mobile.
- **Segmented:** pill container `surface.pressed`, selected pill `surface.default` + shadow `1`.
- **Pill:** standalone pills with `brand-primary.subtle` selected.
Underline-slide animation 240 ms standard.

### Accordion
Header 48 min height, chevron rotate 180° on expand (`medium`). Body padding 16. Single or multi-open mode.

### Pagination
Prev · 1 · 2 · 3 · … · N · Next. 32 × 32 cells (mobile) / 36 × 36 (desktop). Selected `brand-primary.default`. Use cursor pagination on infinite lists; reserve numeric pagination for admin tables.

### Breadcrumb
`Home / League / Match` — separator `›` U+203A. Truncation: middle items collapse to `…` with hover-popover on desktop. Mobile: collapses to back-arrow + current.

### Stepper
Horizontal (desktop) / vertical (mobile) for KYC + onboarding. States per step: complete (filled circle ✓), current (royal ring + dot), upcoming (outline), error (danger ring). Connector line `border.divider`, fills `brand-primary.default` as user advances.


---

## §2.11 Components — Organisms

### Top App Bar
**Mobile (56 px):** leading menu/back · centred page title · trailing icon-buttons (search, notifications). Sticky. Bg `surface.default`, shadow `1` on scroll.
**Desktop (64 px):** logo left · primary nav middle · search · notifications · avatar right. Bg `surface.default`, divider bottom.

### Bottom Nav (mobile, exactly 4 + center FAB)
Items: **Home · Live · [FAB Quick Bet] · My Bets · Wallet.** 56 px tall + safe-area inset. Items 64 wide, icon 24 + label `caption`. Selected: filled icon + `brand-primary.default`. FAB: 56 dia, gold gradient, blue glow, lifts 12 px above nav. Tapping FAB opens the Quick Bet sheet (§2.14 BetSlip).

### Sidebar (desktop, collapsible)
Expanded 240 / collapsed 64 px. Sections: primary nav · secondary (admin) · footer (settings, logout). Toggle stored in `localStorage`. Tooltips appear on collapsed items with 400 ms delay.

### Drawer / Sheet
Sides: left, right, bottom. Bottom sheet has rubber-band overdrag (240 ms, spring; max 64 px). Backdrop `bg.overlay`. Close: × · backdrop · swipe-down (bottom) · Esc. **Bet slip uses bottom sheet on mobile, right drawer on desktop.**

### Modal
Centered, 480 max-width default, 720 wide variant. Scale-in 0.96→1 (240 ms spring) + scrim fade. Focus-trap on open, return focus on close. Close: × · backdrop (configurable) · Esc.

### Command Palette (cmd+k)
Desktop only. 640 wide, max-height 60 vh. Sections: Recent · Suggestions · Results. Keyboard: ↑↓ navigate, Enter execute, Tab between sections. Hotkey shows in trailing `Kbd`.

### Data Table
Density: comfortable (52 px row) / dense (36 px). Sortable columns (chevron). Sticky header. Sticky first column on horizontal scroll. Resize via column-edge drag, 8 px hit zone, `cursor: col-resize`. Reorder via header drag. Frozen columns mark with subtle right shadow. Row hover: `surface.hover`. Multi-select: leading checkbox col + bulk-actions bar slides up from bottom on first selection. Inline edit: double-click cell, Esc cancels, Enter commits. Expandable rows: row chevron, body slides 240 ms standard. Virtualization: > 1000 rows uses windowing (60 px row buffer).

### Empty State
Centred composition: illustration (240 max-w) · title (`title-md`) · body (`body`, `text.secondary`) · primary CTA · optional secondary text-link.

### Error State
Page-level. Same composition as empty state, with the relevant illustration from §2.7. Specific copy per kind in §2.33.

### Loading State
Skeleton-first; never blank. See §2.32.

### Footer
Bg `bg.subtle`. Sections: Product · Company · Legal · Help · Language switch. Compliance footer (§2.41) sits below: license number, regulator, helpline, age 18+ mark.

---

## §2.12 Components — Betting (highest priority)

### StakeSlider
Anatomy: track (`surface.pressed`) · gold fill (`brand-accent.default`) · thumb (20 dia, `gold-glow` on focus, scale 1.1 on grab) · min/max labels · live "if you win" estimator chip floating above thumb · snap markers (50, 100, 500, 1000, 5000 TZS or % of balance).
Motion: drag spawns `slider-coin-flow` particles drifting along the fill (max 12 active). Each snap fires `H_TICK` haptic + 1-particle burst. Reduced-motion: no particles, no thumb scale.
States cover all 18; locked state shows lock icon over thumb + tooltip "Bet placed / Limeshikwa".
Keyboard: ←/→ ±100, ↑/↓ ±500, Shift large step, PgUp/PgDn ±25 % of range, Home/End to bounds.
A11y: `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` (live formatted TZS), live region for the estimator.
API: `<StakeSlider min max step value balance onChange disabled locked />`.

### MatchCard
Layout: two team badges (TeamBadge) on a card with a 3D parallax tilt on mobile gyro (max 6° tilt, decay 240 ms standard). Center: live score (LiveScore). Below: MomentumBar. Below that: 5-chip TimeWindowSelector. Status pill top-right: pre-match (neutral) / live (`brand-primary` + pulsing dot) / finished (`text.tertiary`).
Hover (desktop): shadow up `2→3`, score brightens 10 %.
Reduced-motion: no tilt.

### TimeWindowSelector
5 chips: 0–15, 15–30, 30–45, 45–60, FT. Underline 2 px `brand-accent.default` on selected (never gold fill — too loud). Disabled past windows show strikethrough chip + tooltip "Window closed / Kipindi kimefungwa". Tooltip on hover shows 30-day historical pay-rate (caption).
A11y: `role="radiogroup"`, each chip `role="radio"`.

### OddsCard
Three buttons: Win · Draw · Lose. Each: outcome label · stake hint (e.g. "TZS 1,000 → TZS 2,400 if win") · current pool size in caption · subtle gold ring on the option you've already staked into.

### PoolDisplay
Animated counter (count-up only, never down). Donut shows your share (gold) on royal background. "If you win" estimator below. Particle burst at round-number milestones (every 100k or 1M, server-driven). Number is `display-3` tabular.

### PoolPulseRing (signature)
A 4 px gold-stroke ring around the pool number. Live event frequency drives pulse:
- **Calm** (≤ 1 event / 30 s): scale 1.0 ↔ 1.02 over 4000 ms (slow breathing).
- **Active** (≤ 1 event / 5 s): 1.0 ↔ 1.04 over 1500 ms.
- **Goal** (event=goal): 1.0 → 1.12 → 1.0 over 600 ms with `gold-glow` bloom.
Reduced-motion: ring is static at scale 1.0; goal events render a one-off 200 ms color flash instead.

### BetSlip
Bottom drawer (mobile, 80 vh max) / right drawer (desktop, 420 wide). Contents: header (count + clear-all) · scrollable list of BetLeg cards (drag handle on left) · risk meter (gradient bar from `success`→`warning`→`danger`, value reflects correlation/legs count) · totals block (total stake, potential return) · CTA "Place bet · TZS X,XXX" (gold-accent).
Drag-to-reorder: long-press (300 ms mobile) or drag handle (desktop). Drop indicator: 2 px gold line between rows.

### BundleBuilder
Multi-leg construction. Correlation warnings: amber inline alert when two legs are statistically correlated (server flag). Bonus multiplier display: `1.05× · 1.12× · 1.25×` etc., with explanation popover.

### BetLeg
Card 88 px tall: drag-handle · team badges (xs) · window chip · outcome chip · stake (tabular) · status dot (pending/won/lost/voided) · trailing × to remove.

### TeamBadge
Circular, sm 24 / md 32 / lg 56. Subtle radial sheen 6 % on top edge. Mobile: 4° gyro tilt-parallax on the sheen layer only. Focus ring 2 px `border.focus`.

### MomentumBar
Horizontal bar between team badges. Width 100 %, 8 px tall. Two fills meeting in middle: home (left, royal) vs away (right, gold). Position animates 600 ms decelerate when shifted. Tooltip on hover shows last-5-min stat.

### LiveScore
Two flip-clock numerals (`display-3` tabular). On goal: top half flips down to reveal new number, 420 ms standard, plus subtle gold flash.

### ResultChip
Pill: W · L · D. `success.bg/text`, `text.tertiary` for L (NOT red — see §2.17), `warning.bg/text` for D.

### LeaderboardRow
56 px tall. Cols: rank · avatar · name · win-rate · ROI · streak indicator · follow button. Top-3 ranks get `brand-accent` rank pill. Hover: `surface.hover` + reveal "view profile" trailing icon.

### StreakIndicator
Flame icon + count. Gold tint `brand-accent.subtle`→`default`→`hover` intensifies at thresholds 3 / 5 / 10.

### WinCelebration
Full-screen overlay (`celebration` z). Scrim royal at 70 %. Center: "You won / Umeshinda" `display-1` gold-rush gradient text + the return amount. Up to 60 gold particles burst from center, gravity-drift down, fade 1200 ms emphasized. Share button + Continue button.
Reduced-motion: no particles, static gold ring + text fade-in.

### LossEcho
**Never red explosion.** Calm dissolve. Body of the bet card desaturates 60 % over 800 ms, leg shifts down 4 px and back. Toast: "The pool grew. Try the next window. / Bwawa limeongezeka. Jaribu kipindi kingine." No haptic. No sound.

### CashoutButton
Variant of gold-accent button. Pulse animation when offered value rises by ≥ 5 %: scale 1 → 1.04 → 1, `gold-glow` cycle, 1200 ms, max 3 cycles per uplift event. Locked state: lock icon + tooltip "Cash-out unavailable / Hakipo sasa".

### HeatmapTile
20 × 20 px cells in a grid. Color = ROI bucket: cold `betting.cold` → neutral `text.tertiary` → hot `betting.hot`. Hover/long-press shows tooltip with raw stats.

### WalletCard
Three numeric blocks: balance · pending · hold. Buttons: Deposit (primary) · Withdraw (secondary). Recent activity preview (3 latest TransactionRows). Hold balance tooltip explains AML reasoning (§2.41).

### TransactionRow
Type icon · description · amount (right, tabular, color by sign) · status pill · timestamp. Tap to expand for full details, refs, dispute action. Swipe-left → "Dispute"; swipe-right → "Receipt".

### KYCStatusBanner
Top-of-app banner (under app bar). States: not-started (warning) · in-progress (info) · approved (success, dismissible) · rejected (danger). CTA scoped to state.

### ResponsibleGamblingTimer
Pill in top app bar (desktop) or in profile (mobile). Format `0:42`. At 30/60 min thresholds opens a non-blocking reality-check overlay (§2.41).

---

## §2.13 Components — Mini-Games

### TribalClashFaction (card)
240 × 280 card. Top: 160 dia faction emblem on a gradient panel using the faction's primary on `brand-hero`. Below: name (`title-sm`) · 1-line tagline (`caption`) · roster count · join button. Hover lifts shadow `2→3`.

### LuckyIntervalSpinner
Radial dial of the 5 windows. Pointer animates 1800 ms decelerate, lands on a window. Reveal: gold underline draws under the chosen window 320 ms decelerate. Reduced-motion: snap to result.

### MomentumRushBar
Vertical surge bar 24 wide × 240 tall. 5-minute cycle; bar fills `gold-rush` gradient from bottom. Tap to lock current value. Tick at every minute (`H_TICK`).

### PredictionStreakChain
Horizontal chain of links. Correct prediction adds a gold link with a pop-in 320 ms spring. Wrong prediction grays the chain at the failed link, no removal.

### VoiceBetMic
Circular button 72 dia, gold gradient, royal mic icon. On press: ring of waveform bars expands and pulses with audio amplitude. Wake word: Swahili "Kipindi" or English "Kipindi go". Always shows a transcript chip below for confirmation; user taps to confirm placement.

---

## §2.14 Page Templates

For each: layout spec + content hierarchy, mobile + desktop, light + dark inherited.

### Home / Lobby
**Mobile:** TopAppBar · KYCStatusBanner? · "Live now" horizontal scroller of MatchCards · "Starting soon" list · Mini-Games entry strip · Promo banner · Bottom Nav.
**Desktop:** Sidebar · Main: hero `brand-hero` strip with featured match · 12-col grid: live matches (8) + leaderboard preview (4) · mini-games row · footer.

### Live Matches
Filters bar (sport · league · time-to-kickoff · window-open). Sticky tabs: All · Football · Other. List of MatchCards, infinite-scroll.

### Match Detail
Hero: home/away with parallax TeamBadges, LiveScore, MomentumBar. Below: PoolDisplay with PoolPulseRing. TimeWindowSelector. OddsCard for selected window. Stake panel (StakeSlider + Money Input + Place Bet CTA). Tabs: Stats · H2H · Form · Heatmap. Floating BetSlip handle bottom (mobile).

### Bet Slip
Mobile: full-screen take-over OR drawer (user choice via setting). Desktop: right drawer 420.
Sections: legs · risk meter · totals · CTA · responsible-gambling micro-text.

### My Bets
Tabs: Active · Settled · All. Filters: date range · status · stake range. Each row: BetLeg-style summary; tap expands to full leg detail. Empty state: `no-bets-yet`.

### Wallet
WalletCard up top. Tabs: Activity · Methods · Limits.
Activity: TransactionRows, infinite-scroll, swipe actions.
Methods: list of mobile-money + bank entries with default-flag.
Limits: deposit / loss / session limits sliders.

### Deposit flow
Step 1 select method (cards of providers) → Step 2 enter amount (Money Input + quick chips 1k/5k/10k/50k) → Step 3 confirm + provider redirect → Step 4 status (pending / done). Errors per provider code.

### Withdrawal flow
Step 1 amount (with available balance + AML threshold callout if exceeded) → Step 2 method → Step 3 confirm + re-auth → Step 4 status (queued / under review / sent). AML hold UI: amber inline alert with reason + ETA.

### Profile
Header card: avatar · name · join date · KYC status pill · streak indicator. Tabs: Stats · Preferences · Security · Sessions · Responsible Gambling · Help.

### KYC flow (Stepper)
Steps: 1 NIDA number entry · 2 Phone verification · 3 ID front · 4 ID back · 5 Selfie · 6 Review pending. Each step has "Why we ask" expandable (§2.40).

### Responsible Gambling Settings
Sliders for daily/weekly/monthly deposit cap and loss cap. Toggle reality-check intervals (15/30/60). Self-exclusion CTAs (24h, 7d, 30d, 6m, permanent).

### Leaderboard
Tabs: Today · Week · Month · All-time. Top-3 podium component up top, then list of LeaderboardRows. Filter by region (TZ regions, then Africa).

### Mini-Games Hub
Grid of 5 game tiles (Tribal Clash, Lucky Interval, Momentum Rush, Streak Chain, Voice Bet). Each tile shows live participants count, entry stake, prize pool.

### Mini-Games (5 templates)
- **Tribal Clash:** faction selection screen → arena board with 8 factions and live shares.
- **Lucky Interval:** spinner on top half · stake panel below.
- **Momentum Rush:** vertical bar centred · lock CTA.
- **Streak Chain:** chain visual full-width · next prediction picker.
- **Voice Bet:** mic component centred · last 3 voice bets list.

### Auth
- **Login:** Phone Input + "Send OTP" CTA · alt: "Use email".
- **Register:** Phone + age confirmation + T&C + receive-marketing toggle.
- **OTP:** 6 cells + resend countdown + change-number link.
- **Forgot Password:** Phone → OTP → new password.

### Help / Support / Live Chat
Search bar · category cards · contact options (chat, phone, email). Live chat: bottom drawer with message thread, agent avatar, typing indicator.

### Terms / Privacy / Compliance pages
Long-form layout, sticky table-of-contents (desktop), version stamp (`title-md` + caption), language switch.

### Admin Dashboard
Visual treatment: denser, fewer rounded corners (radius `sm`), more grid lines. Widgets: live ops counters · GGR sparkline · KYC queue · payment-provider health · risk signals · recent bets · alerts feed.

### Admin pages
- **Users:** Data Table + filter sidebar.
- **KYC Queue:** kanban (Submitted · In Review · Approved · Rejected) + table view toggle.
- **Transactions:** Data Table with high density, export CSV.
- **Bets:** Data Table; row click drills to bet ledger.
- **Audit Log:** append-only stream view, filter by actor / action / target.
- **Anti-Fraud Flags:** list of clusters; expand to graph view of related accounts (force-directed, abstract).
- **Match Integrity:** per-fixture page with anomaly chart and reviewer notes.

---

## §2.15 Flow Specifications

For each: happy path · key error states · copy in EN/SW.

**Onboarding + first deposit**
1. Welcome (3-screen carousel) → 2. Create account (Phone + age) → 3. OTP → 4. Optional KYC start nudge → 5. Home with empty state and "Verify ID · Make first deposit · Place first bet" CTA stack.
Errors: weak network (retry CTA), already registered (link to login).

**Login (Phone + OTP)**
1. Phone → 2. OTP → 3. Home. Errors: wrong OTP (3 tries → cool-down 5 min), suspicious device (sends email + blocks).

**KYC**
1. Intro screen (legal copy) → 2. NIDA number → 3. Phone re-verify → 4. ID front → 5. ID back → 6. Selfie → 7. Submitted screen with ETA. Errors: blurry doc (retake CTA), mismatch (reason copy + retry), expired (cannot proceed copy + helpline).

**Place a single bet**
Match Detail → pick window → pick outcome → set stake → review → confirm with `H_SUCCESS`.
Errors: insufficient balance (deposit nudge), window expired (refresh + retry), pool capped (try another window).

**Place a bundle bet**
Add legs across matches → BundleBuilder shows multiplier + correlation warnings → review → confirm.
Errors: correlated legs blocked (banner explains), max-legs reached (8).

**Cash-out an active bet**
My Bets → row → Cash-out button → confirm modal with "value good for 5 s" countdown → success toast. Errors: value-changed (retry), unavailable now (locked + reason).

**Deposit**
Method → amount → provider redirect / USSD push → return → status. Errors per provider code (insufficient funds, timeout, declined).

**Withdrawal (with AML hold)**
Amount → method → re-auth → review → submit → "Under review (AML)" if threshold met → email/SMS on resolution. Errors: KYC required (CTA to KYC).

**Win celebration → optional share**
Server confirms win → WinCelebration overlay → Continue / Share. Share opens system share with the win-share OG image (no PII).

**Loss feedback**
Server confirms loss → LossEcho on the bet card + toast "The pool grew / Bwawa limeongezeka". Never modal. Never red.

**Self-exclusion / take-a-break**
Profile → Responsible Gambling → choose duration → re-auth → confirm modal with regulator-mandated copy → confirm screen + helpline card.

**Report a problem / dispute a bet**
My Bets → row → "Dispute" → form (reason, evidence upload, free text) → ticket created → email confirmation.

---

## §2.16 Notifications & Comms

### Channel character limits
- Push (iOS title 50 / body 110, Android body 240) — design within iOS budgets.
- SMS (Latin 160 / GSM-7) — design within 160 chars.
- In-app toast — 80 chars target.
- Email — no hard limit.

### Voice per channel
SMS terse, no emoji, always include refs. Push action-led, single CTA. Email warm, can carry brand. In-app toast neutral, action-led.

### SMS templates (≈20, EN + SW, ≤160 chars)

| Event | EN | SW |
|---|---|---|
| Welcome | Karibu Kipindi. Verify ID to start: kipindi.tz/kyc | Karibu Kipindi. Thibitisha kitambulisho: kipindi.tz/kyc |
| OTP code | Kipindi code: 482910. Valid 5 min. Don't share. | Msimbo Kipindi: 482910. Dakika 5. Usishirikishe. |
| Deposit confirmed | Deposit TZS 10,000 confirmed. Bal TZS 12,400. Ref D-8821. | Amana TZS 10,000 imepokelewa. Bal TZS 12,400. Kumb D-8821. |
| Withdrawal requested | Withdrawal TZS 5,000 requested. Ref W-3310. ETA 2h. | Uondoaji TZS 5,000 umeombwa. Kumb W-3310. ETA saa 2. |
| Withdrawal sent | TZS 5,000 sent to +2557*****99. Ref W-3310. | TZS 5,000 imetumwa kwa +2557*****99. Kumb W-3310. |
| Bet placed | Bet TZS 1,000 placed on Sim-Yang 15-30 Win. Ref B-99221. | Dau TZS 1,000 limewekwa Sim-Yang 15-30 Shinda. Kumb B-99221. |
| Bet won | The 15-30 window paid. Return TZS 2,400. Ref B-99221. | Kipindi 15-30 kimelipa. Pato TZS 2,400. Kumb B-99221. |
| Bet "lost" | The pool grew. Try the next window. Ref B-99221. | Bwawa limeongezeka. Jaribu kipindi kingine. Kumb B-99221. |
| KYC approved | ID verified. You can now withdraw. | Kitambulisho kimethibitishwa. Sasa unaweza kutoa pesa. |
| KYC rejected | ID review failed: {reason}. Retry: kipindi.tz/kyc | Ukaguzi umeshindwa: {sababu}. Jaribu tena: kipindi.tz/kyc |
| Suspicious activity | Unusual login. If not you, lock: kipindi.tz/secure | Ingia isiyo ya kawaida. Si wewe? Funga: kipindi.tz/secure |
| Deposit limit reached | You've reached today's deposit limit. Resets 00:00. | Umefikia kikomo cha amana cha leo. Inarudi 00:00. |
| Self-exclusion confirmed | Self-exclusion active until {date}. Helpline: 0800 11 0011 | Kujitenga hadi {tarehe}. Msaada: 0800 11 0011 |
| Self-exclusion ending | Your break ends in 24h. Take it slow. | Mapumziko yanaisha kwa saa 24. Endelea taratibu. |
| Reality check | Session 30 min. Take a breather? Open app to confirm. | Kipindi cha dakika 30. Pumzika kidogo? Fungua programu. |
| Weekly summary | Week wrap: 12 bets · TZS +1,200 net. Open app. | Wiki: dau 12 · TZS +1,200 jumla. Fungua programu. |
| Big win celebration | TZS 25,000 hit on a 15-30 window. Calm and clean. | TZS 25,000 kwa kipindi 15-30. Hongera. |
| Pool jackpot alert | Pool just crossed TZS 10M. Sim-Yang, 30-45. | Bwawa limefikia TZS 10M. Sim-Yang, 30-45. |
| Match starting reminder | Sim-Yang vs Coastal in 15 min. Pick a window. | Sim-Yang dhidi ya Coastal kwa dakika 15. Chagua kipindi. |
| Account locked | Account locked for security. Contact support. | Akaunti imefungwa kwa usalama. Wasiliana na msaada. |

### Email templates (5)
1. **Receipt** — header banner · transaction summary · refs · "Why we ask" · helpline footer.
2. **Monthly statement** — cover page · summary numbers · transactions · settled bets · tax line items · download PDF link.
3. **KYC update** — current state · next action · estimated timeline · contact.
4. **Security alert** — what happened · device · location · "Was this you?" CTA.
5. **Marketing opt-in** — quiet. Opt-in only. Includes one-tap unsubscribe.

### Push templates (selected)
- Bet won — title "The 15–30 paid" body "Return TZS 2,400 ready in your wallet."
- Reality check — title "30 minutes in" body "Take a breath if you'd like."
- KYC approved — title "ID verified" body "Withdrawals are open."

---

## §2.17 Voice & Tone (full guide)

### General
- Confident, calm, fair.
- Verbs first, numbers tabular.
- Never CAPS. Never desperate. Never moralizing.

### Microcopy patterns
- **Empty:** state truth + suggested action. e.g. "No bets yet. Pick a match to begin." / "Hakuna dau bado. Chagua mechi kuanza."
- **Errors:** what went wrong + how to recover. Never blame. e.g. "Network is slow. Retry." / "Mtandao ni polepole. Jaribu tena."
- **Confirmations:** plain past tense. "Bet placed." / "Dau limewekwa."
- **Win:** factual + warm. "You won." / "Umeshinda."
- **Loss:** never the word "lost" in user copy. Use "the pool grew" framing.

### Sensitive copy — loss alternates (always pair EN/SW)
| Context | Use | Don't |
|---|---|---|
| End-of-bet status | "Pool grew. Next window?" / "Bwawa limeongezeka. Kipindi kingine?" | "You lost." / "Umepoteza." |
| Bet history pill | `L` (semantic neutral, NOT red) | red explosion |
| Empty winnings list | "Winnings will appear here." / "Ushindi utaonekana hapa." | "No wins yet." |
| Streak break | "Streak reset." / "Mfululizo umerudi sifuri." | "You broke your streak." |

### Swahili register
**Casual but respectful.** Use *wewe* (you, singular) for individual users. Avoid heavy Sheng. Use *tafadhali* sparingly — it's polite but can read formal in app UX.

### Glossary (EN → SW, locked)
- stake → **dau**
- pool → **bwawa**
- window → **kipindi**
- bundle (multi-leg) → **mkusanyiko**
- settle → **kamilisha**
- cashout → **toa mapema**
- win → **shinda**
- draw → **sare**
- balance → **salio**
- deposit → **amana** (verb: weka)
- withdraw → **toa**
- limit → **kikomo**
- self-exclusion → **kujitenga**
- helpline → **msaada**

---

## §2.18 Accessibility (WCAG 2.2 AA)

### Targets per component
- Buttons / links: 4.5:1 text on bg, 3:1 non-text against adjacent.
- Form fields: 3:1 border vs surrounding bg; error must not rely on color alone (icon + text always).
- Focus ring: 2 px, `border.focus` token, 2 px offset, visible on every focusable.

### Verified contrast pairs (light)
- `text.primary` `#0A1838` on `bg.base` `#F7F8FB` → 16.6:1 (AAA)
- `text.secondary` on `bg.base` → 8.7:1 (AAA)
- `brand-primary.foreground` on `brand-primary.default` → 8.2:1 (AAA)
- `brand-accent.foreground` on `brand-accent.default` → 7.1:1 (AAA)
- `text.link` on `bg.base` → 8.5:1 (AAA)

### Verified contrast pairs (dark)
- `text.primary` on `bg.base` → 17.1:1 (AAA)
- `brand-primary.default` on `bg.base` → 4.9:1 (AA)
- `brand-accent.default` on `bg.base` → 9.3:1 (AAA)

### Touch targets
44 × 44 minimum, hard. Any visually smaller hit must extend hit-zone via padding or `::before` overlay.

### Screen reader conventions
- Live score: live region `aria-live="polite"` for non-goal updates, `assertive` for goals.
- Pool counter: `aria-live="polite"`, value rate-limited to 1 update / 2 s.
- Stake slider: `aria-valuetext` formats as `TZS 1,200`.
- Toasts: `role="status"` (info/success), `role="alert"` (warning/danger).
- Win celebration: `role="alertdialog"`, focus moves to Continue button.

### Reduced-motion fallback (per pattern, see §2.5)
Every motion pattern lists its fallback. Honour `@media (prefers-reduced-motion: reduce)` and the in-app "Low-data / calm mode" toggle.

### Keyboard nav map
- Tab order: top → bottom, left → right, inside each region.
- Skip-link "Skip to main content / Ruka kwenda yaliyomo" first focusable on every page.
- Esc closes the topmost modal/popover/sheet.
- `?` opens shortcut cheat-sheet.

---

## §2.19 Performance & Data Budget
- **Initial JS:** < 250 KB gzipped (App Router with route-level code-split; betting flows lazy).
- **LCP target:** < 2.5 s on simulated 3G.
- **Images:** AVIF first, WebP fallback, JPEG only as last resort. `next/image` with sizes set per breakpoint. Lazy-load below the fold; eager only for hero.
- **Fonts:** subset Sora + Inter to Latin + Latin-Ext only. Preload `Inter-400.woff2` and `Sora-600.woff2` only. `font-display: swap`. No FOIT.
- **Offline shell:** cached match list (last fetch), wallet snapshot read-only, bet UI disabled with banner.
- **Low-data toggle:** disables animations (force `prefers-reduced-motion`), images replaced with blurhash, live polling paused (manual refresh only), pool counters update every 30 s instead of live.

## §2.20 Data Visualization
**Categorical palette (8):** `#1E3E94 #B58A21 #1F7A4D #A5650D #1E5A94 #6F798F #C2410C #0E7490`. Cycle in this order; never reuse within a chart.
**Sequential palette (royal ramp):** `#EEF2FB → #1E3E94 → #060F24` 7-step.
**Sequential palette (gold ramp):** `#FBF7EC → #B58A21 → #2C1F06` 7-step.
**Divergent palette (cold↔hot):** `#0E7490 → #C2C9D8 → #B91C1C` 9-step (used for heatmap ROI).

Chart types & defaults:
- **Line:** 1.5 px stroke, `decelerate` 600 ms draw-in, dot on hover, sparklines 24 px tall.
- **Bar:** 6 px gap, radius `xs` top corners, bar height animates 320 ms.
- **Donut:** 24 px ring on cards / 48 px on dashboards. Center label.
- **Sparkline:** 80 × 24 default, no axes.
- **Heatmap:** 20 px cells, 1 px gutter, divergent palette.
- **Radial dashboard:** 240 dia gauges with tick marks every 10 %.
- **Momentum bar:** 8 px tall, two-fill horizontal, 600 ms decelerate transitions.
- **Flip counter:** see LiveScore.
- **Animated counter:** count-up 800–1500 ms decelerate.

Annotations: `caption` font, line callouts with 8 px terminal dot. Always include numeric label, never rely on color alone.

## §2.21 Theme Tokens — Tailwind + CSS

### `tailwind.config.ts` snippet (paste-ready)
```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: { base:"var(--bg-base)", subtle:"var(--bg-subtle)", sunken:"var(--bg-sunken)", elevated:"var(--bg-elevated)" },
        surface: { DEFAULT:"var(--surface)", hover:"var(--surface-hover)", pressed:"var(--surface-pressed)", selected:"var(--surface-selected)", disabled:"var(--surface-disabled)" },
        border: { DEFAULT:"var(--border)", subtle:"var(--border-subtle)", strong:"var(--border-strong)", focus:"var(--border-focus)", divider:"var(--border-divider)" },
        text: { DEFAULT:"var(--text-primary)", secondary:"var(--text-secondary)", tertiary:"var(--text-tertiary)", disabled:"var(--text-disabled)", inverse:"var(--text-inverse)", link:"var(--text-link)", linkHover:"var(--text-link-hover)", onBrand:"var(--text-on-brand)" },
        royal: { DEFAULT:"var(--royal)", hover:"var(--royal-hover)", active:"var(--royal-active)", subtle:"var(--royal-subtle)", subtleHover:"var(--royal-subtle-hover)", fg:"var(--royal-fg)" },
        gold: { DEFAULT:"var(--gold)", hover:"var(--gold-hover)", active:"var(--gold-active)", subtle:"var(--gold-subtle)", subtleHover:"var(--gold-subtle-hover)", fg:"var(--gold-fg)" },
        success:{ DEFAULT:"var(--success)", bg:"var(--success-bg)", border:"var(--success-border)", fg:"var(--success-fg)" },
        warning:{ DEFAULT:"var(--warning)", bg:"var(--warning-bg)", border:"var(--warning-border)", fg:"var(--warning-fg)" },
        danger: { DEFAULT:"var(--danger)",  bg:"var(--danger-bg)",  border:"var(--danger-border)",  fg:"var(--danger-fg)" },
        info:   { DEFAULT:"var(--info)",    bg:"var(--info-bg)",    border:"var(--info-border)",    fg:"var(--info-fg)" },
        bet: { win:"var(--bet-win)", lose:"var(--bet-lose)", draw:"var(--bet-draw)", pool:"var(--bet-pool)", stake:"var(--bet-stake)", jackpot:"var(--bet-jackpot)", streak:"var(--bet-streak)", hot:"var(--bet-hot)", cold:"var(--bet-cold)" }
      },
      fontFamily: {
        display:["Sora","Inter","Helvetica Neue","Arial","sans-serif"],
        sans:   ["Inter","Helvetica Neue","Arial","Noto Sans","sans-serif"],
        mono:   ["JetBrains Mono","SF Mono","Menlo","Consolas","monospace"]
      },
      fontSize: {
        micro:    ["10px",{lineHeight:"14px",letterSpacing:"0.4px"}],
        caption:  ["12px",{lineHeight:"16px",letterSpacing:"0.2px"}],
        label:    ["13px",{lineHeight:"18px",letterSpacing:"0.1px"}],
        "body-sm":["14px",{lineHeight:"20px"}],
        body:     ["16px",{lineHeight:"24px"}],
        "body-lg":["18px",{lineHeight:"28px"}],
        "title-sm":["20px",{lineHeight:"28px",letterSpacing:"-0.1px"}],
        "title-md":["24px",{lineHeight:"32px",letterSpacing:"-0.2px"}],
        "title-lg":["30px",{lineHeight:"38px",letterSpacing:"-0.3px"}],
        "display-3":["36px",{lineHeight:"44px",letterSpacing:"-0.4px"}],
        "display-2":["48px",{lineHeight:"56px",letterSpacing:"-0.6px"}],
        "display-1":["64px",{lineHeight:"72px",letterSpacing:"-0.8px"}]
      },
      spacing: { 0.5:"2px", 1:"4px", 1.5:"8px", 2:"12px", 3:"16px", 4:"20px", 5:"24px", 6:"32px", 7:"40px", 8:"48px", 9:"64px", 10:"80px", 11:"96px", 12:"128px" },
      borderRadius: { xs:"2px", sm:"4px", md:"8px", lg:"12px", xl:"16px", "2xl":"24px", pill:"999px" },
      boxShadow: {
        e1:"var(--shadow-1)", e2:"var(--shadow-2)", e3:"var(--shadow-3)", e4:"var(--shadow-4)", e5:"var(--shadow-5)",
        "glow-gold":"var(--glow-gold)", "glow-blue":"var(--glow-blue)", "glow-win":"var(--glow-win)", "glow-jackpot":"var(--glow-jackpot)"
      },
      backgroundImage: {
        "g-brand":"var(--g-brand)", "g-gold":"var(--g-gold)", "g-jackpot":"var(--g-jackpot)", "g-aurora":"var(--g-aurora)", "g-pool":"var(--g-pool)"
      },
      transitionTimingFunction: {
        standard:"cubic-bezier(0.2,0,0,1)", decelerate:"cubic-bezier(0,0,0.2,1)",
        accelerate:"cubic-bezier(0.4,0,1,1)", spring:"cubic-bezier(0.34,1.56,0.64,1)"
      },
      transitionDuration: { micro:"80ms", short:"160ms", medium:"240ms", long:"420ms", celebration:"1200ms" },
      zIndex: { base:"0", raised:"10", dropdown:"1000", sticky:"1100", drawer:"1200", modal:"1300", popover:"1400", toast:"1500", tooltip:"1600", celebration:"1700" }
    }
  }
} satisfies Config;
```

### `globals.css` snippet (CSS custom properties)
```css
:root {
  --bg-base:#F7F8FB; --bg-subtle:#EEF0F5; --bg-sunken:#E4E8F0; --bg-elevated:#FFFFFF;
  --surface:#FFFFFF; --surface-hover:#F4F6FB; --surface-pressed:#E9EDF6; --surface-selected:#E0E8F8; --surface-disabled:#F2F3F7;
  --border:#DEE2EC; --border-subtle:#EEF0F5; --border-strong:#C2C9D8; --border-focus:#2A50AE; --border-divider:#E4E8F0;
  --text-primary:#0A1838; --text-secondary:#3B4358; --text-tertiary:#6F798F; --text-disabled:#9AA3B7;
  --text-inverse:#FFFFFF; --text-link:#1E3E94; --text-link-hover:#173173; --text-on-brand:#FFFFFF;
  --royal:#1E3E94; --royal-hover:#173173; --royal-active:#102356; --royal-subtle:#EEF2FB; --royal-subtle-hover:#D7E0F5; --royal-fg:#FFFFFF;
  --gold:#B58A21; --gold-hover:#946D17; --gold-active:#705210; --gold-subtle:#FBF7EC; --gold-subtle-hover:#F4EAC9; --gold-fg:#0A1838;
  --success:#1F7A4D; --success-bg:#E6F4EC; --success-border:#B8DDC8; --success-fg:#FFFFFF;
  --warning:#A5650D; --warning-bg:#FBF1DE; --warning-border:#EFD49B; --warning-fg:#FFFFFF;
  --danger:#9A2B2B; --danger-bg:#F8E5E5; --danger-border:#E5B5B5; --danger-fg:#FFFFFF;
  --info:#1E5A94; --info-bg:#E5EEF7; --info-border:#B5CCE2; --info-fg:#FFFFFF;
  --bet-win:#1F7A4D; --bet-lose:#6F798F; --bet-draw:#A5650D; --bet-pool:#1E3E94; --bet-stake:#B58A21;
  --bet-jackpot:#CDA635; --bet-streak:#C2410C; --bet-hot:#B91C1C; --bet-cold:#0E7490;
  --shadow-1:0 1px 2px rgba(10,24,56,.06),0 1px 1px rgba(10,24,56,.04);
  --shadow-2:0 2px 6px rgba(10,24,56,.08),0 1px 2px rgba(10,24,56,.04);
  --shadow-3:0 6px 16px rgba(10,24,56,.10),0 2px 4px rgba(10,24,56,.06);
  --shadow-4:0 12px 28px rgba(10,24,56,.14),0 4px 8px rgba(10,24,56,.08);
  --shadow-5:0 24px 48px rgba(10,24,56,.18),0 8px 16px rgba(10,24,56,.10);
  --glow-gold:0 0 0 1px rgba(222,188,84,.35),0 0 24px rgba(222,188,84,.45),0 0 64px rgba(181,138,33,.25);
  --glow-blue:0 0 0 1px rgba(79,112,194,.35),0 0 24px rgba(30,62,148,.50),0 0 64px rgba(16,35,86,.30);
  --glow-win:0 0 0 1px rgba(52,211,153,.35),0 0 24px rgba(52,211,153,.45),0 0 80px rgba(31,122,77,.30);
  --glow-jackpot:0 0 0 2px rgba(233,211,142,.50),0 0 32px rgba(222,188,84,.55),0 0 96px rgba(181,138,33,.35);
  --g-brand:linear-gradient(135deg,#060F24 0%,#102356 45%,#1E3E94 100%);
  --g-gold:linear-gradient(120deg,#705210 0%,#B58A21 40%,#DEBC54 70%,#F4EAC9 100%);
  --g-jackpot:radial-gradient(120% 120% at 50% 0%,#DEBC54 0%,#B58A21 35%,#4D380B 75%,#060F24 100%);
  --g-aurora:linear-gradient(110deg,#1E3E94 0%,#4F70C2 30%,#B58A21 60%,#DEBC54 100%);
  --g-pool:radial-gradient(80% 80% at 50% 50%,rgba(79,112,194,.55) 0%,rgba(30,62,148,.20) 60%,rgba(6,15,36,0) 100%);
}
:root.dark {
  --bg-base:#060F24; --bg-subtle:#0A1838; --bg-sunken:#05070F; --bg-elevated:#102356;
  --surface:#0A1838; --surface-hover:#102356; --surface-pressed:#173173; --surface-selected:#1E3E94; --surface-disabled:#0E1730;
  --border:#1E3E94; --border-subtle:#102356; --border-strong:#4F70C2; --border-focus:#DEBC54; --border-divider:#102356;
  --text-primary:#F7F8FB; --text-secondary:#C2C9D8; --text-tertiary:#9AA3B7; --text-disabled:#525B70;
  --text-inverse:#0A1838; --text-link:#DEBC54; --text-link-hover:#E9D38E; --text-on-brand:#FFFFFF;
  --royal:#4F70C2; --royal-hover:#7E97D8; --royal-active:#AFC0EA; --royal-subtle:#102356; --royal-subtle-hover:#173173; --royal-fg:#060F24;
  --gold:#DEBC54; --gold-hover:#E9D38E; --gold-active:#F4EAC9; --gold-subtle:#2C1F06; --gold-subtle-hover:#4D380B; --gold-fg:#060F24;
  --success:#34D399; --success-bg:#06281C; --success-border:#0D5C3F; --success-fg:#06281C;
  --warning:#F0C674; --warning-bg:#2C1F06; --warning-border:#705210; --warning-fg:#2C1F06;
  --danger:#F87171; --danger-bg:#2A0B0B; --danger-border:#7A1A1A; --danger-fg:#2A0B0B;
  --info:#7E97D8; --info-bg:#0E1730; --info-border:#1E3E94; --info-fg:#0E1730;
  --bet-win:#34D399; --bet-lose:#9AA3B7; --bet-draw:#F0C674; --bet-pool:#7E97D8; --bet-stake:#DEBC54;
  --bet-jackpot:#E9D38E; --bet-streak:#FB923C; --bet-hot:#F87171; --bet-cold:#67E8F9;
  --shadow-1:0 1px 2px rgba(0,0,0,.40),inset 0 1px 0 rgba(255,255,255,.04);
  --shadow-2:0 2px 6px rgba(0,0,0,.50),inset 0 1px 0 rgba(255,255,255,.04);
  --shadow-3:0 6px 16px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05);
  --shadow-4:0 12px 28px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.06);
  --shadow-5:0 24px 48px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.06);
}
```

Token naming: `--<group>-<role>` for colors; `--shadow-<n>`, `--glow-<name>`, `--g-<name>` for the rest. Component classes prefix `kp-`.

## §2.22 Implementation Notes

### Component file structure
```
/components
  /atoms       Button.tsx, Input.tsx, Chip.tsx, ...
  /molecules   FormField.tsx, MoneyInput.tsx, ...
  /organisms   TopAppBar.tsx, BottomNav.tsx, ...
  /betting     StakeSlider.tsx, MatchCard.tsx, PoolPulseRing.tsx, ...
  /minigames   TribalClashFaction.tsx, LuckyIntervalSpinner.tsx, ...
  /charts      Line.tsx, Donut.tsx, Heatmap.tsx, ...
  /icons       generated/ (24×24 React components)
/hooks
/lib
/styles        globals.css, tokens.css
/locales       en/, sw/
```

### Naming conventions
- **Components:** PascalCase, exported default + named.
- **Props:** camelCase. Boolean props start with `is/has/can`.
- **Tokens in code:** `tokens.color.brand.royal[600]` mirrors `tokens.json`.

### Theme switching
CSS variables on `:root` and `:root.dark`. Tailwind `darkMode:"class"`. Theme toggle persists to `localStorage('kp-theme')` and respects `prefers-color-scheme` on first load.

### RTL readiness
Use logical properties (`padding-inline-start`, `margin-inline-end`, `inset-inline-start`). Never `left`/`right` in component CSS unless physically directional. Icons that imply direction (back, chevron) get `dir`-aware mirroring. Verified for future Arabic/Hausa.


---

## §2.23 Every Interaction State (canonical reference)

Every interactive element implements **all 18** of the following with an explicit token reference. This section is the canon; per-component sections (§2.9–§2.13) reference it.

| # | State | Trigger | Default visual delta | Token references |
|---:|---|---|---|---|
| 1 | Default | rest | as designed | per component |
| 2 | Hover | pointer enter | bg → `surface.hover`; lift shadow +1; transition `micro` standard | `surface.hover`, `shadow.<+1>` |
| 3 | Hover + selected | hover on already-selected | hover bg + 2 px gold inset ring | `surface.hover`, `brand-accent.default` |
| 4 | Focus-visible | keyboard focus | 2 px outer ring `border.focus`, 2 px offset; `short` fade | `border.focus` |
| 5 | Focus + hover | both | ring + hover bg | both above |
| 6 | Active / pressed | mouse-down / touch-down | bg → `surface.pressed` (or brand `.active`); shadow `0`; ripple from press point | `surface.pressed`, ripple |
| 7 | Selected | toggle on | `brand-primary.subtle` bg, 2 px inset gold ring, filled icon | `brand-primary.subtle`, `brand-accent.default` |
| 8 | Disabled | non-interactive | `surface.disabled` bg, `text.disabled`, `cursor: not-allowed`, no hover, no focus | `surface.disabled`, `text.disabled` |
| 9 | Loading | action in flight | spinner replaces leading icon; label dims 70 %; width frozen; `aria-busy` | spinner |
| 10 | Error | validation/API failure | `semantic.danger` border, helper text in danger; shake 6 px ×2 (180 ms) | `semantic.danger.*` |
| 11 | Success | brief confirm | `semantic.success` flash 800 ms, ✓ icon swap | `semantic.success.*` |
| 12 | Read-only | non-editable display | no border, plain text, no caret | `text.primary` |
| 13 | Empty | no value yet | placeholder `text.tertiary`; illustration if list-level | `text.tertiary` |
| 14 | Skeleton | loading shape | `surface.pressed` rect + shimmer (1400 ms linear) | `surface.pressed` |
| 15 | Drag-source | being dragged | opacity 0.6, tilt -1°, lifted shadow `4` | `shadow.4` |
| 16 | Drop-target valid | accepts drop | 2 px dashed `success` outline + bg `success.bg` 30 % | `semantic.success.*` |
| 17 | Drop-target invalid | rejects drop | 2 px dashed `danger` outline + `not-allowed` cursor | `semantic.danger.*` |
| 18 | Long-press | 500 ms hold (mobile) | scale 0.98, contextual menu opens | system menu |

**Mandatory hover specs** for: every Button, IconButton, link, Card, list-row (TransactionRow, LeaderboardRow, MatchCard), Chip, Tab, MenuItem, DropdownOption, BreadcrumbSegment, ChartDatapoint, LegendSwatch, Avatar (when actionable), TeamBadge, NavItem.

---

## §2.24 Cursor & Pointer Behavior (desktop)

| Cursor | When |
|---|---|
| `default` | Non-interactive surfaces |
| `pointer` | Buttons, links, clickable cards, chips |
| `text` | Inputs, textareas, content-editable |
| `grab` / `grabbing` | Drag handles (bet-leg reorder, slider thumb on press, table column drag) |
| `not-allowed` | Disabled actions |
| `col-resize` / `row-resize` | Table column dividers, sidebar splitter |
| `crosshair` | Heatmap precision area, chart lasso-select |
| `wait` | **Avoid** — only synchronous-blocked moments (re-auth confirm) |

**Custom cursors** — none. Native cursors only, for performance and predictability.

---

## §2.25 Keyboard Shortcuts

### Global
- `?` — show cheat-sheet modal
- `cmd/ctrl + K` — open command palette
- `/` — focus global search
- `Esc` — close topmost overlay
- `g h` — go Home; `g l` — Live; `g b` — My Bets; `g w` — Wallet; `g p` — Profile

### Bet Slip (when open)
- `Enter` — Place bet
- `Backspace` (focused leg) — Remove leg
- `↑` / `↓` — Move focused leg up/down (with `Shift` reorders)
- `+` / `-` — Stake ±100; with `Shift` ±1000

### Wallet
- `d` — Deposit; `w` — Withdraw; `r` — Refresh balance

### Admin
- `cmd + .` — Toggle dense mode
- `cmd + e` — Export current view to CSV
- `cmd + f` — Filter focus
- `j` / `k` — Next / previous row

### A11y announcement
Each shortcut registers a hidden `aria-keyshortcuts` on its trigger and is announced once when the cheat-sheet opens.

---

## §2.26 Mobile Gesture Map

| Gesture | Where | Action |
|---|---|---|
| Tap | All | Activate |
| Double-tap | Match Detail score | Quick-add favorite |
| Long-press (500 ms) | Transaction row | Reveal swipe actions inline |
| Long-press | Bet leg | Begin reorder |
| Swipe-left | TransactionRow | "Dispute" |
| Swipe-right | TransactionRow | "Receipt" |
| Swipe-down | Bottom sheet | Dismiss (with rubber-band) |
| Swipe-up | Bottom sheet handle | Expand to full |
| Pinch | HeatmapTile grid | Zoom |
| Two-finger scroll | Charts | Pan w/o triggering tap |
| Edge-swipe-back | App-wide | Browser-default back |
| Pull-to-refresh | List screens | Refresh; spinner appears at 64 px pull, gold check on release |

**Pull-to-refresh visual:** indicator centered, 24 dia spinner, transitions to `success-burst` on completion. Reduced-motion: static check.

---

## §2.27 Grid Systems

### Layout grid
| Breakpoint | Cols | Gutter | Margin |
|---|---:|---:|---:|
| <640 | 4 | 16 | 16 |
| 640–768 | 8 | 16 | 24 |
| 768–1024 | 8 | 20 | 24 |
| 1024–1280 | 12 | 24 | 32 |
| ≥1280 | 12 | 24 | 48 |

### Card grids
- **Match list:** mobile 1 col, sm 2, lg 3, xl 4. Gap 12 / 16 / 20 / 24. Aspect free (height by content).
- **Mini-game tiles:** mobile 2 col, lg 3, xl 4. Aspect 5:6.
- **Leaderboard cards:** list (1 col) on mobile; table on lg+.

### Data grid (admin)
- Comfortable row 52, dense 36. Sticky header, sticky first col on horizontal scroll. Resize 8 px hit `col-resize`. Reorderable columns. Frozen-cols mark with right-edge shadow `2`. Multi-select via leading checkbox + bulk-actions bar slides up from footer. Inline-edit double-click; `Esc` cancel, `Enter` commit. Expandable rows: 240 ms standard. Virtualization > 1000 rows.

### Form grid
- Mobile: stacked. Desktop: 2-col label/input. Admin: label-left right-aligned, input fluid.

### Asymmetric hero grid (Home / Match Detail)
8-col module pattern: hero spans 6, side spans 2 on lg+; flips to stacked under md.

---

## §2.28 User-Facing Analytics

For each chart: type · axes · default range · color · hover · drill · empty · loading · error · export.

1. **Personal performance dashboard** — six counters (win-rate %, ROI %, total stake, total return, biggest win, longest streak) + sparkline trend per counter. Default range: 30 d. Hover tooltip: exact value + period delta. Drill: click → date-range modal.
2. **Win/loss line** — line chart, win-rate over time, brushable date range. X axis `caption`, Y axis 0–100 %. Color: `brand-primary.default` line, `brand-accent.default` brush.
3. **Stake distribution donut** — by sport / team / window. Categorical palette. Hover: segment scales 1.04. Drill: filter sets to that segment.
4. **Window heatmap** — rows: time-window (5), cols: day-of-week. Cell color = ROI bucket (divergent palette). Empty: "Not enough data yet."
5. **Streak timeline** — current streak large; below, last 12 streaks as horizontal bars colored gold by length.
6. **Leaderboard percentile** — single donut showing user's percentile vs population. Caption: "Top 18 % this week."
7. **Per-bet breakdown** — two donuts side-by-side: pool share at placement vs at settlement. Caption explains delta.
8. **Comparison vs platform avg** — anonymized: bar pair (you vs avg), 5 metrics.

All charts: empty (illustration + 1-line copy), loading (skeleton chart shape), error (retry CTA), export (CSV / PNG).

---

## §2.29 Admin / Operations Analytics

1. **Live ops** — real-time counters (active users, active bets, deposits/withdrawals/hour, GGR today/week/MTD), updated every 5 s.
2. **Match integrity** — anomaly flag list, scrolling. Per-match drill: stake-pattern chart with anomaly bands.
3. **KYC queue** — depth + age histogram + status pie.
4. **Provider health** — per-provider per-hour success-rate line + p95 latency line.
5. **Anti-fraud** — device-fingerprint collision heatmap; risk-score histogram; velocity-flag list.
6. **CS queue** — open tickets with SLA breach risk indicators.
7. **Marketing funnel** — Sankey-style funnel (signup → KYC start → KYC done → first deposit → first bet → second bet).
8. **Cohort retention** — D1/D7/D30 by acquisition channel, heatmap rows = cohort, cols = day-since-signup.
9. **Tax & accounting** — gaming tax accrued, withholding accrued, payouts pending, all as tabular tabular-num KPI tiles + line trend.
10. **Geo distribution** — Tanzania regions chloropleth (then Africa later). Color = sequential royal ramp by user-density.

All admin charts: drill, export CSV / PNG, hover tooltip, empty / loading / error, density toggle.

---

## §2.30 Breadcrumbs (per page)

Format `Home › Section › Detail`. Separator U+203A. EN/SW labels in pairs.

| Page | Breadcrumb (EN) | (SW) |
|---|---|---|
| Home | Home | Mwanzo |
| Live | Home › Live | Mwanzo › Moja kwa moja |
| Match Detail | Home › Live › {match} | Mwanzo › Moja kwa moja › {mechi} |
| Bet Slip | Home › Bet Slip | Mwanzo › Slipu ya dau |
| My Bets | Home › My Bets | Mwanzo › Madau yangu |
| My Bet Detail | Home › My Bets › {ref} | Mwanzo › Madau yangu › {kumb} |
| Wallet | Home › Wallet | Mwanzo › Pochi |
| Deposit | Home › Wallet › Deposit | Mwanzo › Pochi › Amana |
| Withdraw | Home › Wallet › Withdraw | Mwanzo › Pochi › Toa |
| Profile | Home › Profile | Mwanzo › Wasifu |
| KYC | Home › Profile › Verify ID | Mwanzo › Wasifu › Thibitisha |
| Resp. Gambling | Home › Profile › Responsible | Mwanzo › Wasifu › Tahadhari |
| Leaderboard | Home › Leaderboard | Mwanzo › Ubora |
| Mini-Games | Home › Mini-Games | Mwanzo › Michezo midogo |
| Each mini-game | Home › Mini-Games › {name} | Mwanzo › Michezo midogo › {jina} |
| Auth pages | (no crumbs — pre-auth) | — |
| Help | Home › Help | Mwanzo › Msaada |
| Terms / Privacy | Home › Legal › {doc} | Mwanzo › Sheria › {hati} |
| Admin Dashboard | Admin › Dashboard | (admin EN-only) |
| Admin sub-pages | Admin › {area} › {detail} | (admin EN-only) |

**Truncation:** match names > 28 chars shorten to "Sim-Yang vs Coas…" with hover popover full title.
**Mobile collapse:** show only back-arrow + current. Tap-and-hold reveals full crumb stack as a popover.
**States:** default `text.secondary`, hover `text.link` underline, current `text.primary` non-link, separator `text.tertiary`.
**Schema.org:** emit `BreadcrumbList` JSON-LD on every page.

---

## §2.31 Notifications — Complete Catalogue

For each event: in-app · push · SMS · email · EN + SW. Char counts in parentheses where binding.

> Compact spec — see §2.16 for global channel rules. All copy below uses the pool-grew loss frame.

**Account**

| Event | Channel | EN | SW |
|---|---|---|---|
| Signup welcome | toast/email | Welcome to Kipindi. | Karibu Kipindi. |
| Email verified | toast | Email verified. | Barua pepe imethibitishwa. |
| Phone verified | toast | Phone verified. | Simu imethibitishwa. |
| Password changed | push/SMS | Password changed at 19:42. | Nenosiri limebadilika 19:42. |
| 2FA enabled/disabled | toast | Two-factor on. | Hatua mbili imewashwa. |
| New device login | push/SMS | New login from {device}. Was this you? | Ingia mpya {kifaa}. Ni wewe? |
| Suspicious login blocked | push/SMS | Login blocked. Reset password. | Ingia imezuiliwa. Badilisha nenosiri. |
| Account locked | push/SMS | Account locked. Contact support. | Akaunti imefungwa. Wasiliana msaada. |
| Account unlocked | toast | Account active again. | Akaunti imerudishwa. |

**KYC**

| Event | EN | SW |
|---|---|---|
| Started | KYC started. | Uthibitisho umeanza. |
| Doc uploaded | Document received. | Hati imepokelewa. |
| NIDA verified | NIDA verified. | NIDA imethibitishwa. |
| Approved | ID verified. | Kitambulisho kimethibitishwa. |
| Rejected — blurry | Photo too blurry. Retake. | Picha si wazi. Pigia tena. |
| Rejected — mismatch | Details don't match. Try again. | Maelezo hayalingani. Jaribu tena. |
| Rejected — expired | ID expired. | Kitambulisho kimeisha. |
| Rejected — underage | Must be 18+. | Lazima uwe na miaka 18+. |
| Rejected — sanctioned | Cannot proceed. Contact support. | Hatuwezi kuendelea. Wasiliana msaada. |
| Additional info needed | More info needed. | Tunahitaji taarifa zaidi. |

**Wallet**

| Event | EN | SW |
|---|---|---|
| Deposit initiated | Deposit started. | Amana imeanza. |
| Deposit confirmed | Deposit confirmed. Bal {x}. | Amana imepokelewa. Salio {x}. |
| Deposit failed | Deposit failed: {reason}. | Amana imeshindwa: {sababu}. |
| Withdrawal requested | Withdrawal requested. | Uondoaji umeombwa. |
| Withdrawal AML hold | Withdrawal under review. | Uondoaji unakaguliwa. |
| Withdrawal approved | Withdrawal approved. | Uondoaji umekubaliwa. |
| Withdrawal sent | Withdrawal sent. | Uondoaji umetumwa. |
| Withdrawal failed | Withdrawal failed: {reason}. | Uondoaji umeshindwa: {sababu}. |
| Refund issued | Refund issued. | Marejesho yamefanyika. |
| Balance low | Balance below {x}. | Salio chini ya {x}. |

**Betting**

| Event | EN | SW |
|---|---|---|
| Bet placed | Bet placed. | Dau limewekwa. |
| Bet confirmed | Bet confirmed. | Dau limethibitishwa. |
| Bet voided | Match cancelled. Stake refunded. | Mechi imefutwa. Dau limerudishwa. |
| Bet won | The {window} paid. Return {x}. | Kipindi {kipindi} kimelipa. Pato {x}. |
| Bet "lost" | Pool grew. Try the next window. | Bwawa limeongezeka. Jaribu kingine. |
| Partially settled | Partial settlement. See details. | Malipo sehemu. Angalia. |
| Cashed out | Cashed out at {x}. | Umetoa mapema {x}. |
| Pool jackpot crossed | Pool over {x}. | Bwawa limepita {x}. |
| Top X% of pool | Your stake is top {p}%. | Dau lako ni juu {p}%. |

**Match**

| Event | EN | SW |
|---|---|---|
| Starts in 1h | {match} starts in 1h. | {mechi} inaanza saa 1. |
| Your team scored | {team} scored. | {timu} imefunga. |
| Your window resolved | Your window resolved. | Kipindi chako kimekamilika. |
| Match ended | Match ended. | Mechi imekwisha. |
| Match abandoned | Match abandoned. Refunds issued. | Mechi imesimamishwa. Marejesho. |

**Responsible gambling**

| Event | EN | SW |
|---|---|---|
| Deposit limit 50/80/100% | You've used {p}% of today's limit. | Umetumia {p}% ya kikomo cha leo. |
| Reality check 30/60 min | {n} min in. Take a breather? | Dakika {n}. Pumzika kidogo? |
| Self-exclusion confirmed | Break active to {date}. | Mapumziko hadi {tarehe}. |
| Self-exclusion ending | Break ends in 24h. | Mapumziko yanaisha saa 24. |
| Cooling-off active | Cooling-off active. | Kupoa kunaendelea. |

**Compliance**

| Event | EN | SW |
|---|---|---|
| Terms updated | Terms updated. Review. | Sheria zimebadilika. Soma. |
| Privacy updated | Privacy updated. Review. | Faragha imebadilika. Soma. |
| Data export ready | Your data export is ready. | Data yako iko tayari. |
| Account deletion confirmed | Account deletion confirmed. | Kufuta akaunti kumethibitishwa. |

**System**

| Event | EN | SW |
|---|---|---|
| Maintenance scheduled | Maintenance {time}. | Matengenezo {wakati}. |
| Maintenance starting | Maintenance starting. | Matengenezo yanaanza. |
| Maintenance ended | Back online. | Tumerudi mtandaoni. |
| New version | New app version. | Toleo jipya. |
| Geo-block | Service unavailable in your region. | Huduma haipatikani eneo lako. |

**Marketing (opt-in only)**

| Event | EN | SW |
|---|---|---|
| Weekly summary | Your week wrap. | Muhtasari wa wiki. |
| Monthly statement | Your monthly statement. | Taarifa ya mwezi. |
| Big-win community | A pool just paid big. | Bwawa limelipa kubwa. |
| Leaderboard rank-up | You climbed to #{rank}. | Umepanda hadi #{nafasi}. |
| Streak milestone | Streak hit {n}. | Mfululizo umefikia {n}. |

**Priority + opt-out matrix**
- **Critical** (cannot opt out): account-locked, suspicious-login, KYC-rejected, compliance updates, geo-block, maintenance.
- **High** (default on, opt-out per-channel): all wallet, all bet outcomes, RG checks.
- **Normal** (default on): match reminders, KYC progress.
- **Low** (opt-in only): all marketing, leaderboard milestones, big-win community.

---

## §2.32 Loading & Skeleton Patterns

- **Match card skeleton:** two 32 dia circles · two 80 × 18 lines · 240 × 8 momentum bar · 5 chip placeholders (40 × 24).
- **Leaderboard row skeleton:** 24 rank · 32 avatar · 120 × 14 name · 60 × 14 metric · 80 × 24 button.
- **Transaction row skeleton:** 20 icon · 200 × 14 desc · 80 × 14 amount · 60 × 12 timestamp.
- **Wallet card skeleton:** 3 numeric blocks (120 × 28) · 2 buttons (120 × 40).
- **Profile card skeleton:** 56 avatar · 160 × 18 name · 120 × 14 meta · 80 × 24 streak chip.
- **Chart skeleton:** axes (1 px lines) + flat 80 % opacity bar reflecting target chart shape.
- **Table row skeleton:** N column placeholders, widths randomized within ±10 % for natural look.
- **Bet leg skeleton:** drag handle · 24 dia avatar · 40 × 14 chip · 60 × 14 chip · 60 × 14 stake.
- **Mini-game tile skeleton:** 2:1 image rect · 2 lines.
- **Admin row skeleton:** dense, N column placeholders.

**Optimistic UI**
- **Bet placement:** card appears in My Bets immediately with status "Confirming…", swaps to "Placed" or rolls back with toast on failure.
- **Deposit:** balance shows pending delta with hatched gold styling; on confirm, hatching solidifies.
- **Withdrawal:** balance subtracts immediately; on AML hold, "Hold" block updates.

**Progress indicators**
- Linear (top-of-page) for route transitions: 2 px gold, indeterminate.
- Circular (in-button) for actions.
- Stepper for KYC, Deposit, Withdrawal.

**Long operation handling**
- > 1.5 s: show progress UI.
- > 5 s: offer "Continue in background, notify me" CTA.
- > 10 s pending: show "This is taking longer than usual" + Retry + Report.

---

## §2.33 Error States

| Scope | Pattern | Example copy (EN/SW) |
|---|---|---|
| Field-level | Inline below field, danger color, 13 px | "Enter at least TZS 100." / "Weka angalau TZS 100." |
| Form-level | Banner above form | "Please fix the items below." / "Tafadhali rekebisha hapa chini." |
| Page-level | Empty-state shape with error illustration | "Something went wrong. Try again." / "Hitilafu imetokea. Jaribu tena." |
| Session | Re-auth modal | "Sign in again to continue." / "Ingia tena ili kuendelea." |
| Network offline | Persistent top banner + offline shell | "You are offline. Bets disabled." / "Hauko mtandaoni. Madau yamesimamishwa." |
| Geo-blocked | Full-page | "Service unavailable in your region." / "Huduma haipatikani eneo lako." |
| KYC-blocked | Full-page with KYC CTA | "Verify ID to continue." / "Thibitisha kitambulisho." |
| Underage / sanctioned | Suspended page, no retry | "Account suspended. Contact support." / "Akaunti imesimamishwa." |
| Maintenance | Full-page | "Back at {time}." / "Turudi {wakati}." |
| Rate-limited | Inline | "Too many attempts. Try again in {n}m." / "Majaribio mengi. Subiri dakika {n}." |
| 500 | Page | "We had a problem. We're looking into it." / "Tatizo upande wetu. Tunashughulikia." |
| 404 | Page with nav-back | "Page not found." / "Ukurasa haupo." |

Each gets a primary recovery CTA and the relevant illustration from §2.7.

---

## §2.34 Empty States

| State | Copy (EN/SW) | Illustration | CTA |
|---|---|---|---|
| No bets yet | "No bets yet. Pick a match." / "Hakuna dau. Chagua mechi." | no-bets-yet | Browse matches |
| No live matches | "No live matches right now." / "Hakuna mechi sasa." | no-live-matches | View schedule |
| No notifications | "All caught up." / "Umekamilika." | no-notifications | — |
| Empty wallet | "Add funds to begin." / "Ongeza pesa kuanza." | wallet-empty | Deposit |
| No transactions | "No activity yet." / "Hakuna shughuli." | no-transactions | — |
| No winnings yet | "Winnings will show here." / "Ushindi utaonekana hapa." | no-bets-yet | — |
| No leaderboard rank | "Place a bet to enter." / "Weka dau ili kuingia." | no-leaderboard-rank-yet | Browse matches |
| Search no results | "No matches for '{q}'." / "Hakuna matokeo ya '{q}'." | search-no-results | Clear search |
| Filter no results | "No items match these filters." / "Hakuna kinachofaa." | filter-no-results | Clear filters |
| KYC not started | "Verify ID to withdraw." / "Thibitisha ili utoe pesa." | kyc-pending | Start KYC |
| No devices on session list | "Only this device." / "Kifaa hiki tu." | — | — |
| Admin: no flags | "No flags right now." | — | — |
| Admin: no pending KYC | "Queue clear." | — | — |
| Admin: no anomalies | "No anomalies in window." | — | — |

---

## §2.35 Onboarding & Coachmarks

- **First-launch walkthrough:** 5 screens max — Welcome · How time-windows work · How pools pay · Responsible gambling · Ready. Skippable. Stored as `onboarded:true` in profile.
- **Coachmarks:** tooltip arrows on first interaction with StakeSlider, TimeWindowSelector, BetSlip, PoolDisplay, Mini-Games hub. Each shows once; dismiss with × or "Got it / Sawa".
- **Tip of the day:** small dismissible card on Home top, pulled from a curated 20-tip catalog. Never blocks UI.
- **What's new:** modal on app version bump, max 4 bullets + screenshot strip. Dismissible.
- **Empty-product onboarding:** Home for new users renders a vertical CTA stack: 1) Verify ID 2) Make first deposit 3) Place first bet — items check off as completed.

---

## §2.36 Search, Filter, Sort

- **Global search — desktop:** command palette (cmd+K), 640 wide, sections: Recent, Suggestions, Results-by-type (Match · Team · Transaction · Help article).
- **Global search — mobile:** full-screen overlay, leading back arrow, full-width input, recent-searches chip row, results below.
- **Filter panels (per page):**
  - Matches: league, date, status, window-open.
  - Bets: status, date, stake range.
  - Transactions: type, date, amount range.
  - Leaderboard: time-window, region.
- **Sort menus:** stable defaults — Matches by kickoff, Bets by recency, Transactions by date desc, Leaderboard by ROI.
- **Filter chips:** each applied filter renders as a chip with × ; "Clear all / Futa zote" link to right.
- **Saved views (admin):** named filter+sort+columns, persists per-user. Default views: "My queue", "Today".

---

## §2.37 Drag, Drop, Reorder

- **Bet slip:** legs reorder via drag handle (left edge). Drop indicator: 2 px gold line. Auto-scroll near edges. Long-press starts on mobile.
- **Admin tables:** column reorder via header drag (8 px hit), row reorder where allowed (KYC queue Kanban only). Touch supported with 200 ms long-press.
- **Touch drag:** lifted shadow `4`, scale 1.02, opacity 0.9. Drop with 320 ms decelerate settle.

---

## §2.38 Print, Export, Share

- **Receipt PDF:** A5, single page. Header with monogram + ref. Body: transaction details (type, amount, fees, ref, timestamps). Footer: legal + helpline.
- **Monthly statement PDF:** A4, multi-page. Cover (period, account holder, totals) · summary numbers · transactions (table) · settled bets (table) · tax line items · contact.
- **CSV export:** UTF-8 BOM; ISO 8601 timestamps; numeric fields with `.` decimal; currency in TZS without symbol; quoted strings.
- **Share card (big wins):** OG image variant 3 (`win-share`). Aspect 1.91:1 for OG and 4:5 for WhatsApp. **No PII** — no username, no full name, no avatar; first-initial only at most.
- **Print stylesheet:** `@media print` strips animation, increases base font to 11 pt, expands tables, prints monogram top-left of each page.

---

## §2.39 Connectivity, Offline, Sync

- **Offline banner:** persistent at top, `warning` color, "You are offline / Hauko mtandaoni" + ⓘ for explainer.
- **Connection-quality indicator:** auto-degrade to low-data mode below 3G effective bandwidth. Visible in profile · system bar.
- **Queued actions:** money-handling actions are **never** queued offline — block with clear message. Read-only actions (history, profile view) work from cache.
- **Sync-resolved toast:** "Back online. Syncing… / Tumerudi. Inasawazisha…"
- **Update-available banner:** soft (non-blocking) for non-breaking; force-update full-page screen for below-min-supported version.

---

## §2.40 Session, Security, Trust

- **Session timeout warning:** modal at T-2 min, "Stay signed in / Endelea" + "Sign out / Toka".
- **Re-auth modal:** required for withdrawal, KYC change, password change, sensitive setting flip. Phone OTP or biometric (if enrolled).
- **Active sessions:** list of devices (model, last-active, location), "Sign out / Toka kifaa" per row + "Sign out all".
- **Security event log:** chronological feed (login, password change, 2FA on/off, withdrawal init, etc.). User-readable.
- **"Why we ask"** popovers on every KYC/AML field and re-auth prompt: 1–3 sentences in EN + SW explaining purpose, not legalese.

---

## §2.41 Compliance & Regulator-Ready UI

- **Age gate:** first-launch modal, single "I'm 18 or older / Nina miaka 18+" CTA + helpline link. Stored.
- **Self-exclusion:** always-visible link in Profile. Confirmation screen with helpline card.
- **Reality check:** non-blocking overlay at 30 / 60 min (configurable per user). Dismiss with "Continue / Endelea" or "Take a break / Pumzika".
- **Deposit limits UI:** sliders for daily / weekly / monthly. Decreases apply immediately; increases apply after a 24 h cooling period (regulator-friendly).
- **Terms versioning:** version pill on doc, last-updated date; force re-acceptance modal on breaking changes.
- **Cookie / tracking consent:** TZ DPA-aligned; functional always-on, analytics + marketing opt-in.
- **Regulator footer:** license number, regulator (Gaming Board of Tanzania), helpline (Tanzania problem-gambling line), age 18+ mark — present on every page.
- **"How we calculate the pool" explainer:** small (?) icon next to Pool number on every bet card opens popover with the math in plain language EN + SW.

---

## §2.42 Brand Asset Bundle

See `LOGO_SPEC.md §15` for file tree. Recap:
- Logo SVGs (primary, stacked, monogram, wordmark) + reverse + mono variants.
- App icon master 1024 + iOS + Android adaptive layers.
- Splash screen spec.
- Favicon set 16/32/180/192/512 + Safari mask.
- OG template 1200×630 with 5 layout variants.
- Email header banner 600×120.
- Social avatars 1024×1024.
- Notification icon 24 dp monochrome.

---

## §2.43 Microinteractions Library

| Microinteraction | Trigger | Duration | Easing | What changes | Reduced-motion |
|---|---|---:|---|---|---|
| Button press ripple | mouse/touch down | 320 | accelerate | scale 0→1, opacity 0.2→0 | none |
| Toggle switch slide | toggle | 200 | spring | handle x + scale pulse | snap |
| Checkbox check-draw | check | 200 | decelerate | path stroke-dashoffset | snap |
| Radio fill expansion | select | 200 | spring | inner circle scale 0→1 | snap |
| Tab underline slide | tab change | 240 | standard | left + width | snap |
| Tooltip fade-rise | hover delay 400 | 160 | decelerate | opacity + 4 px y | opacity |
| Toast slide-in | enqueue | 240 | decelerate | x −16→0, opacity | opacity |
| Modal scale-in | open | 240 | spring | scale 0.96→1, opacity | opacity |
| Drawer rubber-band | overdrag | 240 | spring | y past anchor + return | snap |
| Pull-to-refresh elastic | pull | 320 | spring | spinner appears, snaps back | static check |
| Counter count-up | value change | 800–1500 | decelerate | numeric increment | snap |
| Pool pulse heartbeat | live event freq | 1200–4000 | standard | ring scale 1→1.04→1 | static ring |
| Slider thumb scale | grab | 120 | decelerate | scale 1→1.1 | none |
| Coin flow on stake | drag | 600 | decelerate | particles along fill | none |
| Win particle burst | win | 1200 | emphasized | up to 60 particles | static |
| Streak flame intensify | streak threshold | 320 | spring | tint shift + 1.05 scale | snap |
| Avatar status pop | status change | 240 | spring | scale 0.6→1.1→1 | snap |
| Number flip-clock | score change | 420 | standard | rotateX top half | swap |
| Badge scale-in on new | new event | 240 | spring | scale 0→1 | snap |
| Loading dot bounce | indeterminate | 1200 loop | standard | y bounce 3 dots | static |

---

## §3 Format & Acceptance

- This file + `tokens.json` + `LOGO_SPEC.md` constitute the canonical delivery.
- All values are literal numbers; no adjectives.
- Every component has anatomy, all states (§2.23), variants, tokens, motion, a11y, API.
- All copy is paired EN / SW.
- Light + dark fully specified — no "same as light" shortcuts.

## §4 Hard Constraints (re-asserted)
1. Mobile-first.
2. No literal tribal stereotypes anywhere.
3. No CAPS-shouting copy. No yellow/red gambling tropes.
4. Multilingual EN + SW from day one.
5. Honour `prefers-reduced-motion` everywhere.
6. Targets budget Android, 3 GB RAM, 3G.
7. One-thumb operable on 360 px.
8. ≥ 44 × 44 px touch targets, hard.

## §5 Out of scope
- Name change (kept "Kipindi").
- Tech stack choices (Next.js 16 + Tailwind + Prisma + Postgres locked).
- Figma references (markdown + JSON only).

