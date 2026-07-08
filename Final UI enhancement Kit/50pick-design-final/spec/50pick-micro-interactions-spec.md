# 50pick — Micro-Interaction & Detail Specification (v1 · 2026-07-07)

Developer-ready. Every value is normative — no judgment calls left open.
Identity is unchanged: palette, glyph idiom, and rules per `design-master-brief.md`.
Companions: `code/micro-patterns.css` (implements §0–§9 tokens/classes),
`specimens/50pick-micro-board.html` (renders every pattern below),
`svg/badges/` (§13 assets). Strings are given EN / SW / ZH; SW strings shown
are the longest permitted form — layouts must fit them.

---

## §0 Constants (single source for all patterns)

**Motion tokens**
- `--ease-micro: cubic-bezier(.2,.8,.2,1)` · 120ms — hovers, chips, toggles, focus
- `--ease-stage: cubic-bezier(.4,0,.2,1)` · 240ms — panels, dropdowns, tabs
- `--ease-enter: cubic-bezier(.4,0,.2,1)` · 480ms — page sections, sparkline draw
- `--ease-spring: cubic-bezier(.2,1.4,.4,1)` · 280ms — celebrations only
- Spinner rotation: **0.7s linear** (kit invariant, everywhere, no exceptions)
- Stagger: list/grid children 40ms apart, cap at 8 children (9th+ appear with the 8th)
- Nothing on screen may pulse continuously except the LIVE pip (1.8s) — one
  pulsing element per viewport maximum; if two would pulse, the newer wins.

**Z-index scale** (only these values): base 0 · sticky header 40 · dropdown 50 ·
tooltip 60 · toast 70 · modal scrim 80 · modal 81 · critical (RG interstitial) 90.

**Radii**: control 10px (`--r-md`) · card/panel 14px (`--r-lg`) · pill 999px ·
input 10px · badge medallion is round/hex per asset.

**Glow recipe** (the only sanctioned glows):
- Gold CTA rest: `box-shadow: 0 4px 18px -8px rgba(212,152,36,.45)`
- Gold CTA hover: `0 6px 24px -8px rgba(212,152,36,.60)`
- Royal focus ring: `0 0 0 2px #0A0E33, 0 0 0 4px #6CA2FF`
- Live aqua halo (pip only): `0 0 0 4px rgba(54,186,186,.15)`
- Nothing else glows. Panels use borders, not shadows, except modals:
  `0 24px 60px -24px rgba(0,0,0,.65)`.

**Number & time standard**
- TZS always JetBrains Mono, `font-variant-numeric: tabular-nums`, thousands
  separator comma, no decimals below TZS 1,000,000; compact form `4.2M` only
  in card meta, never in wallet/ledger/receipts.
- Signed amounts: `+` green `#00A24F`, `−` (U+2212, not hyphen) rose `#E6424C`.
- Times: relative under 48h ("in 6h" / "baada ya saa 6" / "6小时后"),
  absolute otherwise as `15 Apr, 14:00 EAT`; the `EAT` suffix is mandatory on
  all market close/resolve times. Countdown formats: `6d 4h` → `4h 12m` →
  `12:04` (mm:ss under 1h) → `0:42` final minute.

**Hit targets**: minimum 44×44px touch, 24×24px pointer; icon-only buttons get
`aria-label` always.

---

## §1 Buttons — exact anatomy

Sizes (height / padding-x / font): sm 32/12/13 · md 38/16/14 · lg 44/20/15 ·
xl 52/24/16. Weight 600, Inter. Radius `--r-md` (xl uses `--r-lg`).
Icon gap 8px; icon 16px (sm/md), 18px (lg/xl). **SW rule:** if the label
exceeds the button at lg, drop the leading icon before wrapping text —
labels never wrap.

Variants → fill / text:
- `primary` royal `#4983F4` / white — navigation-grade actions
- `gold` `linear-gradient(120deg,#FEC766,#D49824)` / `#1a1508` — money-in and
  earned-money actions ONLY (Deposit, Weka dau, Claim). Carries the gold glow (§0).
- `yes` `#00A24F` · `no` `#E6424C` / white — the pick pair, always YES left
- `ghost` transparent, 1px `rgba(245,248,255,.14)` border / `#F5F8FF`
- `danger-ghost` ghost with claret `#A4273F` text+border — destructive entry
  points (Revoke, Close account); solid claret appears only inside hard confirms (§10)

States (apply to every variant): hover `filter:brightness(1.06) saturate(1.05)`;
focus-visible = royal ring (§0), never `outline:none` without it; active
`transform:scale(.98)` 120ms; disabled 45% opacity, filter none, cursor
not-allowed; loading = label swaps to gerund + spinner 14px left of text
(EN "Placing…" / SW "Inaweka…" / ZH "下注中…"), button stays same width
(reserve via `min-width` captured at click).

---

## §2 Chips & tags

Height 22px (dense 20px), padding-x 9px, mono 10px/600, letter-spacing .08em,
uppercase, 1px border, pill radius. Glyph 11px, gap 5px.
Selected (filter chips): fill `rgba(73,131,244,.16)`, border `#4983F4`,
text `#6CA2FF`. Removable chips append a 12px × glyph, hit-area padded to
22px, hover tints rose.
Status palette (normative, from the glyph kit sheet): LIVE aqua+pulse-dot ·
HOT rose+flame · ENDING SOON gold+hourglassHalf · TIPPING aqua+tippingScales ·
RESOLVED gilt-gradient+sealCheck (dark text `#1a1508`) · VOID/PENDING/WAITING/
LOCKED neutral · NEW royal+sparkleNew. Count suffix in chips is mono,
55% opacity: `Sports · 12`.

---

## §3 Filtering (boards: /markets, /results, /live, admin tables)

Anatomy, top-to-bottom: search field → WHEN chip row → TOPIC chip row (with
counts) → active-filter summary row (only when ≥1 non-default filter).
- **Search**: 44px input, leading search glyph 16px muted; placeholder
  EN "Search markets" / SW "Tafuta masoko" / ZH "搜索市场". Debounce 250ms;
  spinner replaces the glyph while fetching; `Esc` clears; show `⌘K` kbd hint
  at ≥1024px (kbd style: mono 10px, 1px border, 3px radius, 2px 5px padding).
- **Chips**: single-select WHEN, multi-select TOPIC. Selecting animates the
  grid per §5 crossfade. Topic chips show live counts; count updates use
  `odds-flash`-style 400ms tint, numerals only.
- **Active-filter row**: "Filters: [Ending soon ×] [Sports ×] · Clear all"
  (SW "Ondoa zote" / ZH "清除全部"). Clear-all is a ghost sm button.
- **URL sync**: every filter/sort/page state serializes to query params
  (`?when=soon&topic=sports&sort=closing`); back button restores state.
- **No results**: the `emptyMarkets` EmptyState with the searched term echoed
  in the body, plus one-tap "Clear filters".

## §4 Sorting

Trigger: ghost sm button, label = current sort + `sortDesc/sortAsc` glyph
(EN "Sort: Closing soon" / SW "Panga: Inayofunga karibuni" / ZH "排序：即将截止").
Menu: panel `#131645`, radius 14px, dropdown motion = fade+4px rise 240ms
`--ease-stage`; options 40px rows, selected row shows check glyph, radio
semantics (`role="menuitemradio"`). Board options, exact order:
Closing soon (default) · Newest · Pool size · Most predictors · Biggest 24h move.
Ledger/tables sort via `SortTh`: click cycles desc→asc→default; header shows
the sort glyph at 70% opacity, 100% when active; sorted column cells tint
`rgba(73,131,244,.05)`.

## §5 Pagination, infinite scroll, scrollers

- **Boards** (/markets, /results): infinite scroll. Sentinel 200px before list
  end prefetches next 24; while loading append **3 skeleton cards** (never a
  spinner row). After 96 items, insert an inline pause card: "You've seen 96
  markets — jump to top? / Umeona masoko 96 / 您已浏览96个市场" with a
  scroll-to-top action (RG-flavored pacing, deliberate).
- **Tables** (ledger, admin): numbered pagination. Anatomy: `‹ 1 … 4 [5] 6 … 12 ›`,
  36px square ghost buttons, current = royal fill; mono numerals; page-size
  select 25/50/100 right-aligned; range caption left "Showing 101–125 of 2,431 /
  Inaonyesha 101–125 kati ya 2,431 / 显示 101–125，共 2,431".
- **Scroll-to-top pill**: appears after 2 viewport-heights, bottom-right 24px,
  44px circle ghost with up glyph, fade+8px rise 240ms; sits left of the chat
  bubble, never overlaps it.
- **Grid transition on filter/sort**: old grid fades to 40% in 120ms → if
  response <150ms swap directly, else show skeletons → new cards stagger-rise
  40ms apart (§0 cap). Scroll position resets to the grid top, not page top.
- **Custom scrollbar** (desktop, overflow panels only): 10px, thumb
  `rgba(245,248,255,.14)` radius 5px, hover `.22`; track transparent. Never
  style the root document scrollbar.

## §6 Loaders & data-freshness

- **Full-page brand loader** (route transitions >400ms only): the 50 mark at
  56px with a TippingBar beneath sweeping 30%↔70% at 1.6s ease-in-out; caption
  mono "Loading / Inapakia / 加载中". Never used inside panels.
- **Skeletons**: shimmer = `linear-gradient(90deg, rgba(245,248,255,.05) 25%,
  .10 50%, .05 75%)`, 200% width, 1.4s linear. Shapes must match the real
  component's geometry (card skeleton = the A1 skeleton specimen; row skeleton
  = 52px; KPI skeleton = 96px). Skeletons appear only if wait >150ms, and
  persist ≥300ms once shown (no flash).
- **Inline dots** (chat/feed contexts): three 4px dots, opacity wave 1.2s.
- **Determinate progress** (uploads/KYC): 8px bar, royal fill, mono percent
  right; completes with a 240ms fill-to-green then check.
- **Stale-data chip** (signature pattern): when the live socket drops, every
  odds surface gets a mono chip "as of 12s ago / tangu sekunde 12 / 12秒前"
  (aqua at <30s, gold 30s–2m, rose >2m) + a reconnecting pip; on reconnect,
  values update with a single 400ms numeral flash — bars never animate.
- **Never**: full-screen spinners over content, blocking overlays for
  background refreshes, optimistic money states.

## §7 Form controls

- **Input**: 44px, bg `rgba(245,248,255,.04)`, 1px `rgba(245,248,255,.10)`
  border; focus = royal border + `0 0 0 3px rgba(73,131,244,.18)`; error =
  rose border + 12.5px rose helper below (helper reserves its 18px line —
  layout never jumps); validation runs on blur, then on change once dirty.
- **Amount stepper** (deposit/dial fallback): mono input center, −/+ 44px
  ghost squares; long-press repeats at 80ms after 400ms hold; steps TZS 500
  under 10K, 1,000 to 100K, 5,000 above; hard min/max from config, clamped
  with a 120ms shake (4px, 2 cycles) + helper "Minimum TZS 500 / Kima cha
  chini TZS 500 / 最低 TZS 500".
- **Checkbox** 20px radius 6px; check draws in 120ms (stroke-dashoffset).
  **Radio** 20px, inner dot scales in 120ms. **Toggle** 44×24, knob 20px,
  travel 120ms `--ease-micro`; ON = royal (gold only if the toggle enables an
  earned-money feature — currently none).
- **Select** = §4 menu anatomy. **OTP**: 6 boxes 48×56 mono 20px; auto-advance;
  paste splits; error shakes the row once and clears.
- **ConvictionDial detents**: soft detents at 1× 2× 5× 10× (4px magnetic
  window, 10ms haptic where supported); crossing 50× requires gesture release
  + second drag (RG hard rule); keyboard: ←→ = one detent, PgUp/PgDn = 10×,
  Home/End = min/max; `aria-valuetext` "TZS 25,000 on YES / TZS 25,000 kwa
  NDIO / TZS 25,000 押是".

## §8 Toasts & banners

Toast: 320–420px, panel bg, 14px radius, left accent bar 3px (green success /
rose error / royal info / gold **money-credited only**), glyph 18px, title
14px/600 + optional 12.5px body, close ×; enters bottom-right (mobile: bottom,
full-width minus 16px) rise+fade 240ms; auto-dismiss 5s (errors 8s, money 6s)
with a 2px progress bar draining along the bottom; hover pauses. Queue: max 3
stacked, older collapse. Money toasts always show the mono amount:
"+ TZS 20,000 credited / imewekwa / 已入账". Banners (page-level) are static,
no auto-dismiss, one per page max, dismissal persisted per `bannerId`.

## §9 Tooltips

Delay 400ms in / 0ms out; panel `#060A50`, 1px border, 8px radius, 12px text,
max-width 240px, 6px arrow; fade+2px shift 120ms; never contains actions;
touch devices use press-and-hold 500ms. Info glyphs (ⓘ 14px muted) are the
only tooltip triggers on money surfaces, and their copy must also exist on the
Fairness/Help pages (tooltips are never the sole source of a rule).

## §10 Confirmation hierarchy (normative)

1. **Soft** — the dial slide itself; no dialog. Undo affordance: position card
   shows "Placed just now" for 10s with no cancel (pari-mutuel bets are final —
   say so *before*, never surprise after; the confirm sheet carries it).
2. **Medium** — bet-confirm sheet: market question, side chip, stake mono,
   pool-share line (mandatory): "If YES wins, you share the pool /
   NDIO ikishinda, unagawana mfuko / 若"是"获胜，您将分享奖池", fee line,
   "Bets are final once placed / Dau likiwekwa ni la mwisho / 下注后不可撤销"
   in 12.5px muted, gold confirm + ghost cancel. Sheet motion: rise 240ms.
3. **Hard** — claret modal for irreversible/destructive (close account, admin
   void, revoke all sessions): claret header band, consequences list, and a
   typed-word gate — the user must type the shown word (EN "CLOSE" / SW
   "FUNGA" / ZH "关闭"; admin void types the market ID); confirm button stays
   disabled until exact match; no gold anywhere in hard confirms.

## §11 Ledger & receipt (money-table anatomy)

Row 52px: [type glyph 18px in 32px tinted circle] [title 14px + 12px mono
reference `DP-260707-8241`] [right: signed mono amount + running balance 11px
muted beneath]. Types: deposit (arrowDownToLine, green), withdraw (cashOut,
ink), stake (target, ink), payout (trophy, gold tint), bonus (gift, gold),
fee (percent, muted), void-refund (voidX, muted). Row press expands a receipt
drawer (240ms) with: timestamp EAT, method + masked account `+255 ••• 678`,
fee, status chip, and actions [Copy reference] [Download receipt].
**Receipt card** (share/PDF/WhatsApp, also the win receipt): 640×800 royal
field, BrandTopo 0.06, gilt seal top-right, dashed perforation rule above the
footer, all figures mono, receipt number `50P-2026-070841`, footer
"Settled by official sources · 18+ / Imetatuliwa kwa vyanzo rasmi /
依据官方来源结算". Numbers on receipts are never compact-form.

## §12 Celebration choreography (exact timelines)

**Win sequence** (fires only after server-confirmed settlement):
0ms scrim fades in (240ms, 40% black) → 120ms seal stamps (`seal-impress`
360ms: scale 1.15→1 + 6°→8° rotate settle) → 480ms outcome chip pops
(`celebrate-pop` 280ms spring) → 760ms payout line count-up (800ms,
easeOutExpo, mono; count-up only ≥ TZS 1,000, else instant) → 1,560ms reward
rays stagger in (420ms) → CTA row fades in. Total ≤2.4s; a tap anywhere
skips to the end frame. **Losers**: seal + calm ledger line only — no rose
burst, no shake; body copy is factual, never consoling-cute
(EN "Resolved: NO. Your stake: TZS 10,000" — dignity in loss is an RG stance).
**Voided**: neutral toast + refund ledger row, no ceremony.
**Tipping Point** (signature): when a market crosses 50/50 while on screen,
the TippingBar plays a one-time balance wobble — rotate 0→−1.2°→+0.8°→0 over
600ms (transform-origin center) + the TIPPING chip appears; once per market
per session. Reduced-motion: chip appears, no wobble.
**Count-up rules**: only money and only on earned moments; never animate
balances on page load.

## §13 Badges (svg/badges/, 48-grid)

Sizes: 48px profile hero · 28px leaderboard rows · 20px inline chips.
Earned = gilt `#FEC766` on `rgba(212,152,36,.08)` circle; locked = 30% muted
ink + lock overlay 12px bottom-right; awarding uses the A5 reward-burst with
the badge as the medallion. Set: tier-1…tier-5 (map names to the canonical
TierBadge enum — designs are distinct silhouettes so tiers are never
letter-ambiguous again), streak-3/5/10, proposer, centurion, founder,
verified. Tooltip on every badge states the earn rule in one sentence.
New-badge row in /positions/performance: horizontally scrollable, earned
first, locked ghosted with progress mono "62/100".

## §14 Focus, dividers, misc

Focus ring per §0 on EVERY interactive element — verified by tabbing the
specimen board end-to-end. Dividers: 1px `rgba(245,248,255,.06)`; section
eyebrow = mono 11px, .16em tracking, gold, with the gradient hairline (as in
specimens) — this eyebrow is the standard section opener product-wide.
Selection color: `rgba(73,131,244,.35)`. Image placeholders: panel bg +
category glyph 6%. Drag affordances use `dragHandle` glyph, cursor grab.

## §15 Calibration chart (profile · the honesty flex)

SVG 320×320: diagonal reference line (muted, 1px dashed) = perfect
calibration; player dots 6px at (stated confidence, actual hit-rate) per
decile, aqua fill 70%; dot count label mono beneath. Header "How good are
your predictions? / Utabiri wako ni mzuri kiasi gani? / 您的预测有多准？".
Under 30 settled bets: show the frame with the diagonal + EmptyState copy
"Settle 30 markets to unlock / Maliza masoko 30 kufungua / 结算30个市场后解锁"
and progress mono. No score-shaming: copy explains reading the chart, tone
neutral. This chart is unique to 50pick — it frames the product as prediction
skill, not chance, and no betting competitor can honestly ship it.

---
*Reduced-motion (global): every animation in §§1–13 has a defined static end
state; `prefers-reduced-motion` renders that state immediately. The specimen
board and `micro-patterns.css` implement the fallbacks — copy them, don't
re-derive them.*
