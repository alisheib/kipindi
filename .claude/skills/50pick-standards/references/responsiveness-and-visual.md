# Responsiveness & visual verification (50pick)

The two disciplines that catch the most bugs. **A green automated suite is necessary but
not sufficient — a human must READ the screenshots.**

## The breakpoint matrix
Mobile-first. The canonical acceptance widths are **360 · 768 · 1280 · 1920**; the driver
sweeps the full set:

| tag | w×h | why |
|---|---|---|
| xs | 320×568 | smallest real phone |
| sm | 360×740 | **canonical mobile** — design here first |
| md | 390×844 | modern phone |
| lgph | 430×932 | large phone |
| land | 740×360 | landscape (overlays must still fit) |
| tablet | 768×1024 | **canonical tablet** |
| tabletL | 1024×768 | landscape tablet |
| laptop | 1280×800 | **canonical laptop** |
| desktop | 1920×1080 | **canonical desktop** |

## Pass criteria (asserted per surface × width [× locale])
1. **0 horizontal overflow** — `documentElement.scrollWidth ≤ clientWidth + 1`.
2. **No clipped-not-scrolled content** — any overflow must live in an `auto`/`scroll`
   container, never simply cut off.
3. **Nothing off-screen** — fixed/sticky overlays sit fully within the viewport.
4. **Touch targets ≥ 40×40** — buttons, nav, chips-as-buttons.
5. **No console/page errors.**
6. **Overlays fit** — notifications, avatar menu, language, bet dial + confirm, admin
   filter/menu open at phone + landscape widths with their primary action reachable.

## The tool
`scripts/responsive-audit.mjs` (`npm run test:responsive`). Needs a **live server on :3000**.
```
BASE=http://localhost:3000 node scripts/responsive-audit.mjs
# env: SURFACE=player|admin|overlays|all  LOCALES=en|en,sw,zh  WIDTHS=320,430,land
#      ONLY=/markets,/wallet  SHOTS_ALL=1
```
Screenshots → `.50pick-shots/responsive/<surface>/<width>[-<locale>].png` — **READ them.**
Emits a per-surface PASS/FAIL table + global summary; exit 1 on any hard fail.

## Screenshot against a REAL running server
- Prefer **`next build && next start`** for CSS fidelity — the dev server can serve stale
  CSS and produce false overflow.
- Run visual/`ui-regression` gates on a **fresh, unseeded** server: a seeded store fires
  `navigator.vibrate` → dozens of false console-error fails.
- Windows orphans the node child — `taskkill //F //IM node.exe`; confirm a single PID on
  :3000 before running.
- First cold-compile of a new page ~30s (Turbopack) — bump Playwright `goto` timeout to 40s.

## The visual matrix — what deserves a shot
Every **meaningful (route × state × width × locale)** cell:
- **State:** empty · loading/skeleton · error/boundary · populated · edge (long text, big
  numbers, SW/ZH length) · the feature's special states (live/closing/resolved/void, KYC
  steps, MNO paused, retry-queue non-empty …).
- **Width:** 360 (first) · 768 · 1280 · 1920.
- **Locale:** EN · SW · ZH (admin: EN + SW).
- **Popups/overlays** are a first-class row — re-sweep all overlays at 360 + 1280 each cycle.

## The classic traps
- **Clipped-not-scrolled passes the auto no-overflow check** — it only shows in the image.
  Fix admin grids with `grid-cols-[minmax(0,1fr)_…]`.
- **SW/ZH overflow** — Swahili is longer than English; the tightest components (chips,
  buttons, KPI tiles, card titles) clip in SW before EN. Always check SW at 360.
- **MarketCards** must have uniform heights + aligned buttons across a row at every width.
