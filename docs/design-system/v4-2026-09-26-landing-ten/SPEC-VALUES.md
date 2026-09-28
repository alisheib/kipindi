# SPEC-VALUES: exact values from concept v4

Map every value to an existing token or class in `src/app/globals.css`. Where the concept used a raw value, the closest locked token is named. If no token matches, **ask. Don't add one.**

## 1. Colour (from `tokens-LOCKED.css`)
| Use | Concept value | Token |
|---|---|---|
| Page canvas | oklch(6.5% 0.13 268) | `--bg` |
| Hero band | oklch(10% 0.13 268) | hero surface (`.kp-hero`) |
| Tinted bands (How it works, Results) | oklch(9% 0.13 268) | `.kp-band` tint |
| Cards, sheets, Wallet | oklch(14% 0.13 268) | `--surface` / `--bg-elevated` |
| Borders | oklch(36% 0.13 268), at .35–.8 opacity | `--border` |
| Primary text | oklch(98% 0.012 268) | `--text` |
| Secondary text | oklch(86% 0.05 268) | nearest muted-text token |
| Labels, captions | oklch(70% 0.08 268) | `--text-subtle` |
| YES text | oklch(80% 0.14 152) | `--yes-300` |
| YES fill | oklch(62% 0.17 152) | `--yes-500` |
| YES button | oklch(52% 0.16 152) | `--yes-600` |
| NO text | oklch(80% 0.14 22) | `--no-300` |
| NO bar track / button | oklch(52% 0.19 22) | `--no-600` |
| Live dot | oklch(64% 0.2 25) | `--live-400` |
| Money: pools, balance, paid, needle, Deposit | #E3BC66 (the mark's gold) | `--gilt` |
| Primary action (Create account) | #4263eb | primary button token |
| Focus ring | 2px solid #fff, offset 2–3px | focus token |

Rules: gold only on money; red only for NO, the live dot and the 18+ roundel; nothing is recoloured by locale.

## 2. Type
| Role | Font | Size | Weight / other |
|---|---|---|---|
| h1 brand line | Sora (`--font-display`) | clamp(40px, 6.2vw, 88px) | 800, line-height 1, tracking −.045em, text-wrap balance |
| h1 sub-line (sw/zh only) | Sora | clamp(19px, 2.2vw, 26px) | 600 |
| Section h2 | Sora | clamp(30px, 3.6vw, 44px); How it works up to 48; Trust up to 56 | 800, tracking −.03em |
| Featured question (h2) | Sora | clamp(21px, 2.2vw, 26px) | 800, line-height 1.22 |
| Board question | Sora | clamp(16px, 1.5vw, 18px) | 700, max 44ch |
| Card question (h3) | Sora | 17px | 700 |
| Step title (h3) | Sora | clamp(22px, 2vw, 26px) | 800 |
| Body / lede | Inter (`--font-body`) | 16px body; lede clamp(17px, 1.6vw, 20px) | 400, line-height 1.55–1.65 |
| Eyebrows, meta, labels | JetBrains Mono (`--font-mono`) | 12px (never smaller) | tracking .1–.16em, uppercase except zh |
| Prices on buttons | JetBrains Mono | 13–14px | 700 |
| Proof figures | JetBrains Mono | desktop clamp(32px, 3.6vw, 44px); phone ledger 24px | 700 |
| Featured price | JetBrains Mono | clamp(30px, 3vw, 36px) | 700 |

The CJK fallback (`--font-cjk`) is on every stack. Nothing on the page is smaller than 12px.

## 3. Layout and spacing
- Content max width 1280; side padding clamp(16px, 4vw, 32px).
- Breakpoints: phone < 640 · tablet 640–1023 · desktop ≥ 1024 · header collapses < 1100 · hero becomes two columns at ≥ 1072 (grid `repeat(auto-fit, minmax(min(100%, 480px), 1fr))`, gap clamp(20px, 4vw, 48px)).
- Section vertical padding clamp(48px, 7vw, 80px). Keep the repo's `--rh-*` pairs-of-padding rule; don't add margins.
- Radii: hero and Up & Down cards 22 · market cards 18 · sheets 22 on top corners only · buttons 12–14 · hero CTAs 999 (pill) · chips 10–12.
- Tap targets: at least 40px (`--tap-min`). Row buttons 44 · sheet chips 44 · featured YES/NO 52 · sheet Confirm 54 · hero CTAs 52–54 · menu rows at least 44.

## 4. Components and states
| Component | States | Notes |
|---|---|---|
| Header | signed out wide / compact · signed in with balance · signed in zero balance · menu open | Phone signed in: logo mark only, chip reads `12,400 ▾` with aria `Wallet: TZS 12,400` |
| Menu panel | closed / open | Contains nav, Sign in (signed out), Set limits, language switch; closes on Esc, route change, width ≥ 1100 |
| Language switch | en / sw / zh | Segmented control, `aria-pressed`; header on desktop, inside the menu below 1100 |
| Balance chip | closed / open (`aria-expanded`) | Hidden at zero balance |
| Wallet | sheet (< 1024) / panel (≥ 1024) | Balance (gold), "TZS X can be withdrawn now", Deposit and Withdraw at equal size, mobile money note, Set limits; Esc and backdrop close it |
| Hero intro | signed out · signed in with balance · signed in zero balance | Signed in: Your picks (open · awaiting · paid this week) plus the money pair or an empty-balance prompt, plus Set limits |
| Featured card | priced · one-sided · slip open (inline, ≥ 1024) · placed | Top row: category and "CLOSES IN …"; question; meta and source; price row with 24h delta; bar with 24h mark; predictors and pool; YES@/NO@; optional estimate; Share + Details |
| Board header | toggle soon/pools · topic chips | Eyebrow follows the toggle |
| Board row | priced · one-sided · slip open (inline, ≥ 1024) · placed | Title link and meta; price and time; bar or dashed rail; YES@/NO@ at least 44px |
| Pick sheet | open (< 1024) | Handle, time left, question, "Your pick", 4 chips, Confirm (side colour), min stake + rule, Set limits, Take a break, Cancel |
| Proof rail | phone ledger / 3 columns | Live pip on the open-markets figure only |
| Conviction bar | priced / empty (dashed) | `role="img"` + aria and a text reading |
| Up & Down band | open · final 30s · closing · no live round | Asset label from admin config, duration, mini line with dashed open price, ring countdown (`role="timer"`) |
| Results row | settled YES / NO · silent (no pool) | Pill, question, "Settled {date} · signed off by {n} officers", source link, paid (gold) |

## 5. Motion (only `transform` and `opacity` animate; nothing animates layout)
| What | Enter | Exit | Easing | Rule |
|---|---|---|---|---|
| Needle + YES fill | on a real pool change, 800ms (conviction bar 1s) | n/a | cubic-bezier(.2,.8,.2,1) | fill = `scaleX` from the left edge, needle = `translateX` on a full-width wrapper. **Never width/left** |
| Pick and Wallet bottom sheets | slide up 280ms + backdrop fade 200ms | slide down 200ms, then unmount | enter (.2,.8,.2,1), exit (.4,0,1,1) | Esc, backdrop and Cancel all use the exit |
| Wallet panel (desktop) | drop-in 180ms (8px + fade) | fade 150ms | (.2,.8,.2,1) | |
| Menu panel | drop-in 180ms | instant | (.2,.8,.2,1) | |
| More menu | pop-up 160ms from its bottom-right corner (scale .94 + 8px) | instant | (.2,.8,.2,1) | backdrop fades in 160ms |
| Inline slip (desktop) | fade-up 220ms (6px) | instant | (.2,.8,.2,1) | |
| "Placed" line + "▲ You" mark on the featured bar | fade-up 240–300ms | n/a | (.2,.8,.2,1) | shows where the player joined the split; while it shows, hide the "24h ago" text (keep the tick) so the labels never collide |
| Press (every button, the coin) | scale .97 (coin .96), 120ms | release 120ms | ease-out | plus a 150ms colour transition |
| Up & Down price line | continuous leftward slide of one sample per second, linear | n/a | linear | translate the group; points never re-layout |
| Up & Down ring | `stroke-dashoffset` 1s linear per tick | n/a | linear | no transition on round reset |
| Live dot | opacity 1 → .35, 2s loop | n/a | ease-in-out | a state loop (law 3) |
| Final 30s | `ud-count-pulse` opacity 1 → .55, 1s | n/a | ease-in-out | a state loop (law 3) |
| Numbers (pools, balance) | change instantly | n/a | n/a | **no count-up and no flash** (law 2) |

Engineering rules:
- One per-second clock per countdown component; the page never re-renders every second. Pause every timer on `document.hidden`, and pause the price line and rings when off-screen (IntersectionObserver).
- `prefers-reduced-motion`: all of the above off, and state changes are instant. `Save-Data`: no price-line slide.
- Budgets on a Moto E class device: INP under 200ms, no long task over 50ms during a glide, CLS 0 from any motion.

## 5b. Contrast (computed from the oklch values)
White on the YES button 5.0:1 · white on the NO button 6.1:1 · muted label on the panel 7.3:1 · secondary text on the panel 12.7:1 · YES text 11.0:1 · NO text 9.4:1 · gold on the panel ≈ 11:1 · ink on gold ≈ 10:1 · rail muted label 10.4:1. **All pass AA for text**; recheck against the real token values in the build.

## 5c. Brand (from `public/brand/*.svg`)
- Mark: a disc split along a line tilted −14° (green `#1EA362` on the left, red `#B03A3E` on the right), a gold `#E3BC66` needle along the split, and a gold hub with a navy `#1A2140` centre.
- Wordmark: use `lockup-horizontal.svg` or match it exactly: Sora 700, −0.025em, `#F7F8FC`; ".tz" in JetBrains Mono 500 at 62% opacity. Signed in on a phone, use the mark only.
- **One gold everywhere:** the mark's gold is the money gold (`--gilt`). If `--gilt` differs from `#E3BC66`, ask Ali which one wins; never ship two golds.
- The centre coin is the mark as a control: the ring follows the mark's split and orientation, the needle runs the mark's −14° line and shows past the rim, and the "+" hub is navy.

## 6. Data each component needs
| Need | Exists? | Source |
|---|---|---|
| Question, pools, predictors, closing time, source | Yes | `HeroRow` in `page.tsx` |
| Featured `move24h` (24h mark) | Yes | `getCardCharts` (already fetched for the featured card) |
| Board rows `move24h` | Optional | only if the same batched query covers them; otherwise show no mark |
| Competition / date meta line | Check | market fields; if missing, ask before adding a column |
| `showEstimate` + `estimatedWinningsRate` per market | Yes | admin wizard fields |
| Settlement function for est. × | Yes | the settlement module; reuse it, don't re-derive |
| Signed-in summary (open, awaiting, paid this week) | Partly | the `/positions` queries; one batched read |
| Balance + withdrawable | Yes | wallet service; follow `BONUS-WITHDRAWAL.md` |
| Soonest live Up & Down round (asset, duration, open price, recent ticks, ends at) | Partly | `listMarkets({productLine: "UPDOWN"})` plus the tick source; one read |
| Settled rows with sign-off count and date | Check | `getPlatformStats().recentSettlements` |
| Minimum stake | Yes | config (TZS 100 at the time of writing; read it, don't hard-code it) |

## 7. Bottom rail (`bottom-nav.tsx`)
- Surface: `--panel`, 1px `--border` top, `--shadow-overlay-up`, safe-area padding. Opaque, anchored to the bottom edge, no radius, no blur.
- Five equal `minmax(0,1fr)` tracks. Each item is at least 56px tall with a 12px label.
- Active: a 44×26 `--pill-active` pip plus a `--text` label. Inactive: a muted label and no pip. Up & Down keeps its 5px gilt dot.
- Glyphs: `I.markets`, `I.trendingUp`, `I.bolt`, and the More glyph from `NavMore`. (The concept's SVGs are stand-ins.)
- Labels: `t.common.markets`, `t.nav.updown` (short: "Juu/Chini" in the concept draft; use the repo's value), `t.nav.live`, `t.common.more`, and the deposit key.
- Centre coin (final): 52px, rising 14px above the rail edge, with no notch. A 3.5px ring `conic-gradient(from -14deg, #B03A3E 0 50%, #1EA362 50% 100%)`. A gold fill with an inset shadow of 0 -3px 0 rgba(0,0,0,.18). A navy "+" at 24px, stroke 2.8. A gold needle 3×62px at rotate(−14deg) behind the fill. A halo of 0 0 0 4px `--panel` plus 0 6px 14px rgba(0,0,0,.45). Pressed: .95. The slot is 56px and the label sits on the rail's baseline.
- The footer reserve: unchanged, the existing 88px + the safe area. It covers the rail (about 71px) plus the 14px rise.

## 8. Size and dimension system (the concept uses only these values)
- **Spacing:** component internals in 2px steps up to 16 (2 · 4 · 6 · 8 · 10 · 12 · 14 · 16); layout in 8px steps (16 · 24 · 32 · 48 · 64 · 80), mapped to the repo's `--rh-*` pairs.
- **Radii: five for components** (bars and needles are listed separately below):
  - 10: chips and stake chips
  - 12: buttons, slips, dashed states
  - 16: cards, menus, the Wallet panel
  - 22: hero and Up & Down cards, sheet tops
  - 999: pills, pips, hero CTAs
- **Bars and needles:** a track's radius is half its height (featured 10→5 or 6, whole board 12→7, rows 6→4, empty dashed rail matches its bar). Fills share the track radius on the left end only. Needles are 2, and hubs are round.
- **Type scale:** 12 · 13 · 14 · 16 · 18 · 20 · 24 · 28 · 36 · 44 · 56 · 88. **12 is the floor with no exceptions:** the "18+" roundel is 12px text in a 30px circle.
  - Clamps: headline 36→88 · h2 28–30→44 (trust up to 56) · featured question 19→26 · row title 16→18 · lede 16→20.
  - The concept's 19/21/22/26 values appear only inside those clamps, and 12 is the floor.
- **Hit targets:**
  - at least 40 (`--tap-min`)
  - rail slots 56, and the **whole centre slot (coin + label) is one button**
  - row YES/NO 44 · featured YES/NO 52 · sheet Confirm 54 · hero CTAs 52–54 · menu rows 44
- **Fixed dimensions:**
  - coin 52 (3.5px ring, 14px rise, 4px halo) · rail pip 44×26 · needle hub 11/9
  - needle 4×24 (featured), 5×26 (whole board), 3×16 (rows)
  - the ring countdown is 96, with a 7px stroke
- **Measures:** content 1280 · row titles 44ch · lede 34em · rail and sheets 640 max · Wallet panel 340.

## 9. World-benchmark additions
- **Search field:** 44px tall, radius 12, a 1px `--border`, a fill one step darker than the panel. An 18px magnifier at left 14. 16px text, and a muted placeholder (at least 4.5:1).
- **Featured 7-day line:** 56px tall, a 2px `--yes-300` line, a fitted scale, no fill and no dots, with a 12px mono label. Shown at 640px and wider only.
