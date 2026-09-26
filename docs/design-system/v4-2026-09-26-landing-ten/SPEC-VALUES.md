# SPEC-VALUES: exact values from concept v3

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
| Money: pools, balance, paid, needle, Deposit | #f2c14e | `--gilt` |
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
| Board row | priced · one-sided · slip open (inline, ≥ 1024) · placed | Title link and meta; price and time; bar or dashed rail; YES@/NO@ at least 44px |
| Grid card | priced · one-sided · slip open · placed | Fixed 58px note slot; Share + Details in the footer |
| Pick sheet | open (< 1024) | Handle, time left, question, "Your pick", 4 chips, Confirm (side colour), min stake + rule, Set limits, Take a break, Cancel |
| Proof rail | phone ledger / 3 columns | Live pip on the open-markets figure only |
| Conviction bar | priced / empty (dashed) | `role="img"` + aria and a text reading |
| Up & Down band | open · final 30s · closing · no live round | Asset label from admin config, duration, mini line with dashed open price, ring countdown (`role="timer"`) |
| Results row | settled YES / NO · silent (no pool) | Pill, question, "Settled {date} · signed off by {n} officers", source link, paid (gold) |

## 5. Motion
- Needle and fill: width/left over 800ms, cubic-bezier(.2,.8,.2,1), **only on a real pool change**.
- Live dot: opacity 1 → .35, 2s ease-in-out, infinite (a state loop).
- Up & Down final 30s: `ud-count-pulse`, opacity 1 → .55, 1s.
- No other loops. `prefers-reduced-motion`: everything off. `Save-Data` / low data: no price-line animation.
- Per-second re-render only inside the countdown components.

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
