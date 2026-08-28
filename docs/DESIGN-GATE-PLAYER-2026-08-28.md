# THE DESIGN GATE — Player surface · 2026-08-28

**Programme key: `DESIGN-GATE-2026-08-28`** · sibling report: [DESIGN-GATE-ADMIN-2026-08-28.md](DESIGN-GATE-ADMIN-2026-08-28.md) · implementation task: [SESSION-PROMPT-DESIGN-GATE.md](SESSION-PROMPT-DESIGN-GATE.md)

> **STATUS: RECORD, NOT RULE.** Laws live in [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md); this file
> records what was measured on production and what must change. §1 names existing kit/majority
> recipes to converge on — it mints no law.

## 0 · What this is, and how it was measured

Same commission and method as the admin report: a read-only Playwright drive of **production,
2026-08-28**, signed in as the QA player persona plus a signed-out pass — **40 routes** (every
player page incl. all ten `/profile/*`, both wallet flows, a live market detail, and the
signed-out landing + auth pages). Screenshots at **1440 / 1920 / 390**; every control, heading,
label, card, table, section gap, truncation measured; **947 elements hover-probed**; the mobile
filter sheet, sort menus and the market-detail overlays opened and measured. Instruments:
`scripts/design-gate/` (`SURFACE=player`), raw output `.qa-design-gate/out-player*`.
⛔ One login per account at a time (a second login revokes the first — that is a product feature).

**The player surface is in much better shape than the console.** The 2026-07/08 programmes
(UI-consistency, the design freeze, batch 1–6, the filter language) are visibly holding: zero
horizontal overflow on all 40 routes at all three widths, `FilterPill` everywhere a filter
exists, one card grid, one pagination, tables all on `.admin-tbl`. What remains is listed below —
mostly *rhythm, hover reach, heading discipline and micro-copy*, plus a small number of real
floors.

**Scoreboard.**

| | |
|---|---|
| Routes measured | **40** (incl. 4 signed-out variants) |
| Distinct font sizes in content | **33** (admin: 24) — the widest spread on the platform |
| Distinct UPPERCASE micro-label recipes | **~90** (`analyze player labels`) |
| Hover probe | 947 probed · **333 no-response** (35% — admin: 5%) |
| Section gaps across sibling pages | 24 / 27 / 32 / 16 / 20 / 35 / 4 / **−1** px |
| h1 treatments | **5** (28 · 30 · 34 · 60 · 15-sr-only) + one double-h1 page |
| Confirmed systems | **14** (DG-P-01 … DG-P-14) |

## 1 · THE CANON — player-side

Everything in the admin report’s §1 table that names a kit primitive applies here unchanged
(Button/Input/Select/Chip/FilterPill/focus/icons). Player-specific rows:

| Family | Canonical recipe | Source |
|---|---|---|
| Page title | `PageHeader` — eyebrow 11px mono 0.16em bold + **28px Sora 700** + 13px italic subtitle | page-header.tsx:45 |
| Discovery pages (`/markets`-family) | eyebrow-only header + `sr-only` h1 — allowed, but then **exactly one** h1 | markets/page.tsx |
| Card | `.mcardp` (fixed-width market card; `market-grid` auto-fill) — its 40px CTA literal is LAW (globals.css:3503) | market-card.tsx |
| Filter | `FilterPill` / `kp-fchip`, selected-only outline; phone filters in the sheet | DA §K6/§K6b |
| Section rhythm | `--rh-*` = pairs of padding (never margins) — the landing bands’ system, to be extended to app pages | globals.css:3874 |
| Bottom nav | `.kp-rail__item` 44px pip + `data-on` pill | globals.css:4281 |
| Status words | tone via `status-tone.ts` §B11 — the player board is the **named not-yet-migrated** surface | DA §B11 |

## 2 · FINDINGS BY SYSTEM — worst first

---
### DG-P-01 · P0 — the primary navigation gives no hover feedback at all
- **Measured:** **200 of the 333 hover-dead elements are the top-bar nav links** (`NavLink` — “Markets”, “Up & Down”, “Live”, “Results”, “Top”), plus “More” (36×), the avatar button `AQ` (36×), the brand mark (44px link, only opacity on the lockup variant). The desktop nav of a money product responds to a mouse **only on click**.
- **Mechanism (confirmed):** `top-app-bar.tsx:389-405` sets colour/background as **inline styles** with a `transition` declared — but no hover state exists anywhere (no class, no handler). The bottom rail has `:hover` (globals.css:4300); the top bar never did.
- **Fix:** move NavLink’s paint to classes and add the rail’s own vocabulary: hover = `color: var(--text)` + `background: var(--bg-overlay)`; avatar/More get the same. One file.
- **Also hover-dead (same sweep, smaller):** updown stake presets 1K/2K/5K/10K (5), notification rows (7), wallet “Activity” tab (1), help contact links (2), invite share links (4), auth trust-strip links; the **selected** `kp-fchip`s (15) are fine to leave static.
- **Proof/guard:** hover probe — nav links must change ≥1 paint property; RED today (`changed: []`).

---
### DG-P-02 · P0 — shared with admin: Toggle 26px (RG page) and the clipped search popover
- `/profile/responsible-gambling` runs the 26px kit Toggle (2×) — same kit fix as DG-A-02.
- `/markets`, `/live`, `/results` share the clipped `SearchHelp` popover + the 44/40 search row — same fix as DG-A-03/04. The player “How to search” is equally invisible at rest.

---
### DG-P-03 · P1 — five h1 systems (and one page with two h1s)
- **Measured (`analyze player headings`):** 26 pages at the canonical **28px Sora 700**; `/legal/*` at **30px** (26 at 390); market detail at **34px** (26 at 390 — the hand-typed `text-[26px] md:text-[34px]` DA §T2 itself files); the landing/auth-redirect pages at **60px Sora 800** (fine — hero); `/live /markets /results /profile /profile/invite /proposals` carry a 15px **sr-only** h1 with an eyebrow-only visible header; **`/proposals` renders BOTH** an sr-only h1 and a visible 28px h1 (two h1s in one document); `/updown`’s h1 drops to **24px at 390** while every other PageHeader stays 28.
- **Fix:** legal pages onto `PageHeader` (28); market detail’s question onto the ladder (32 `--type-h1` is the natural step — §T2’s own prescription); `/proposals` keeps exactly one h1; `/updown` stops shrinking at 390.
- **Guard:** headings census — one h1 per document; h1 ∈ {28, 60-hero}.

---
### DG-P-04 · P1 — vertical rhythm: seven different section gaps across sibling pages, and one overlap
- **Measured (`analyze player sections`):** 24px (auth/help/live), **27px** (notifications + six `/profile/*`), **32px** (fairness/leaderboard/positions/profile/proposals), 16px (legal), 20px (results), 35px (performance, once), and `/profile/invite` shows a **4px** gap and a **−1px overlap** between consecutive sections.
- **Expected:** one rhythm per shell (§S1: layout space from `--sp-*` as `gap`). 24 vs 27 vs 32 on pages that sit two taps apart is the “layouts made differently” Ali named.
- **Fix:** `PageContainer` (or the page shells) standardises the stack to `--sp-8` (32) desktop / `--sp-6` (24) phone; `/profile/invite`’s seam gets its own one-line fix.
- **Guard:** sections census — >2 distinct gaps per surface fails.

---
### DG-P-05 · P1 — 33 font sizes; the ladder is not in force on the player side either
- **Measured (`analyze player type`):** 33 distinct sizes (8 → 60). Off-ladder bulk: 11.5px ×347, 13.5 ×229, 12.5 ×207, 10.5 ×134, 9 ×146, 9.5 ×145, 14.5/15.5/16.5/21/26/30. Hand-typed arbitraries measured in code: `text-[13.5px]` (avatar menu, wallet rows), `text-[12.5px]` (needle trigger), `text-[26px]/[34px]` (market question), callout `text-[18px]/[13px]`, nav-more `text-[13.5px]`…
- **Fix:** same ruling as DG-A-12, applied in the same sweep (the two surfaces share the tokens).
- **Guard:** shared with DG-A-12.

---
### DG-P-06 · P1 — ~90 uppercase micro-label recipes
- **Measured (`analyze player labels`):** ~90 distinct recipes; the footer’s `10px mono 700 0.16em subtle` (125× on 40 pages) and the card meta family are coherent — the long tail is one-page-one-recipe inventions (9/9.5/10/10.5/11/11.5/12/12.5px × four weights × eight trackings × a dozen colours; e.g. eight recipes on `/updown` alone, five on `/wallet`).
- **Fix:** the same three named classes as DG-A-11 (eyebrow / label / th) + the chip family; sweep.
- **Guard:** shared census threshold (≤ 8 recipes).

---
### DG-P-07 · P1 — tap floor at 390, the residue
- **Measured (`analyze player small`):** back-links “← MARKETS / PROFILE” **18px** tall (16 instances across detail pages — text-only mono links); `/results` carousel dots **8px** (`h-1.5`, 3×); `/profile/account` email “Change” button **30px**; session-IP reveal 18px; legal sidebar items 36–37px (borderline); `/profile/account` DSAR radios 13px native (`accent-*` styled). Chips (21–23px) are labels, not targets — excluded. `mcardp-share` (13px box) is the documented hit-area extension — excluded.
- **Fix:** back-links and reveal buttons get `min-h-[44px] inline-flex items-center` (text look unchanged); carousel dots get an extended hit area; “Change” to `btn-xs`→40 at touch; DSAR radios onto the kit radio.
- **Guard:** responsive-audit tap rule already exists — add these selectors to its population.

---
### DG-P-08 · P1 — truncation without disclosure (and one clipped email)
- **Measured:** `support@50pick.tz` is **clipped at 1440** on `/auth/forgot-password` (needs 112px, has 106 — a support contact you cannot read); `/wallet` activity titles ellipsise at **174px** with no `title`/no wrap (5 of 6 rows: `Refund · “Will Moshi’s …`); `/positions/performance` titles truncate with no disclosure; `/leaderboard` handles truncate at 67px; `/admin`-style KPI money clipping does **not** occur here (checked — wallet balances wrap correctly). The landing’s `kp-settled__q` two-line clamps are design (line-clamp) — sound.
- **Fix:** the email link gets room (it is one `min-w-0` away); wallet/performance rows get `title` + a second line at 390; leaderboard handle column min-width.
- **Guard:** measure drive — no truncated node matching `/@|support@|\+255/`.

---
### DG-P-09 · P1 — `/auth/login` (signed-in redirect) throws React error #310 on the home page
- **Measured:** navigating to `/auth/login` while authenticated redirects to `/` and the console logs **“Minified React error #310”** (Rendered more hooks than during the previous render) — reproduced on the drive; no other route logged any error.
- **Fix:** locate the conditional-hook in the home/landing composition that only runs on the redirect path (likely the welcome-back flash mounting mid-render — `auth-flash.tsx`).
- **Proof:** `measure.mjs ONLY=/auth/login` as an authed persona — `errors` array non-empty today.

---
### DG-P-10 · P2 — status chips: the board still hand-types its colours (§B11’s named remainder)
- **Measured:** `market-card.tsx:312-317` maps status → `chip-live/chip-pending/chip-resolved` at the call site; `results/page.tsx` and `updown/history` the same (B11 lists all three as “not yet migrated”); two chip heights render side by side on the landing (kit `chip` 23px vs `kp-settled__pill` 21px, 88 + 36 instances).
- **Fix:** the §B11 migration it already prescribes (`status-tone.ts` on the player column), one chip height per size.
- **Guard:** the B11 rule in ui-consistency (chip variant beside a status word must come from `TONE_CHIP`).

---
### DG-P-11 · P2 — active/current markers stop at the top bar
- **Measured (`analyze player nav`):** top-bar and filter rails carry `aria-current`/`data-on` correctly on 20+ pages, but **none of the ten `/profile/*` pages, `/wallet/*`, `/watchlist`, `/proposals/new`, `/help`, `/fairness`, `/leaderboard` mark anything current anywhere** (no top-bar item covers them, and their local nav — avatar menu / profile hub cards — carries no current state). The legal sidebar has its own active recipe (brand-tint bg, weight 400) differing from the top bar’s (pill bg, weight 600).
- **Fix:** avatar-menu items get `aria-current` when their href matches; the legal sidebar adopts the pill/weight vocabulary (or documents its divergence).

---
### DG-P-12 · P2 — auth & date-input details
- Register’s `DateSelect` inner day/month/year inputs are 24px tall inside their 44px group (fine) but the three fields carry **no visible focus join** and placeholders at 3 tints; the “I confirm I am 18” checkbox row is the 19px kit box inside a 13.5px label with no min-height (the row measures ~20px — floor at 390); the auth trust-strip rows (53.5px pills) are a one-page card recipe.
- **Fix:** min-h 44 on the consent rows; one placeholder tint (shared with DG-A-04’s kit pass).

---
### DG-P-13 · P2 — landing/auth duplication artefacts
- The signed-out landing renders identically at `/`, and (authed) at `/auth/login` and `/auth/register` post-redirect — three URLs, one page, all measured: hero CTAs (`btn-xl` 56px pill) + “Browse by topic” 32px h3 + proof strip are consistent (sound). The PWA “Add to home screen” prompt renders on **1440 desktop** over the market grid (`markets-1440` shot) — a phone affordance on a desktop viewport.
- **Fix:** gate the install prompt to touch/small viewports.

---
### DG-P-14 · P2 — miscellany, one line each
- `/profile` identity row: 40px camera button beside a 35px name-button in one flex row (spread 5; 20 at 390 where the name wraps to 60px).
- `/profile/invite` link field 74px (two-line URL) beside a 44px Copy at 390 (spread 30) — truncate the URL.
- `/updown` history pill 42.5px beside 44px chips (once).
- Wallet method rows: label 15px Inter beside 12.5px Sora on `/profile/source-of-funds` radio cards — two label faces for one control family (radio-card recipe ×2).
- `/notifications` marks its filter chips `aria-current` **with glow** — the only rail whose selected state also casts `--glow-selected` shadow; either promote that to the rail recipe or drop it (one place).
- Bottom rail “more” sheet vs avatar menu vs nav-more popover: three menus, three item paddings (px-3/py-2 · px-3.5/py-2.5 · px-3/min-h-44) — one menu-item recipe.

## 3 · Per-route index

| Route(s) | Systems |
|---|---|
| `/` (+ authed & signed-out) | 01 · 03(hero ok) · 05 · 06 · 10(chips 21/23) · 13 |
| `/markets`, `/live`, `/results` | 01 · **02(popover)** · 03(sr-only h1; results 20px gaps) · 05 · 06 · 07(dots) · 10 |
| `/markets/[id]` | 01 · 03(34px h1) · 05(26/34 hand-typed) · 07(back-link 18px) · 08 |
| `/updown`, `/updown/history` | 01(stake chips hover) · 03(24px@390) · 05 · 06(8 recipes) · 10 · 14 |
| `/positions`, `/positions/performance` | 01 · 04(32/35) · 06 · 08 |
| `/wallet`, `/wallet/deposit`, `/wallet/withdraw` | 01(Activity tab) · 04 · 06(5 recipes) · 08(row titles) · 12(placeholder tints) |
| `/leaderboard`, `/fairness` | 03 · 04(32) · 08(handles) · 11 |
| `/proposals`, `/proposals/new` | 03(**double h1**) · 04 · 11 |
| `/profile` + ten sub-pages | **02(Toggle)** · 04(27px + invite −1px) · 06 · 07(Change 30px, radios) · 11 · 14 |
| `/notifications` | 01(rows) · 04(27) · 14(glow) |
| `/help`, `/legal/*` | 01(contact links) · 03(30px h1) · 04(16) · 11(sidebar recipe) |
| `/auth/*` (signed-out) | 01(trust links) · 08(**email clipped**) · 12 · 13 |
| `/auth/login` authed redirect | **09 (React #310)** |
| shell (top bar / bottom rail / menus) | **01** · 14(three menu recipes) |

## 4 · Checked and found SOUND — do not “fix” these
- **Zero horizontal overflow** on 40/40 routes at 390/1440/1920; zero console errors except DG-P-09.
- **The filter language holds**: every filter control on 12 filter-bearing pages is `FilterPill`/`kp-fchip`, selected-only outline, 44px, in-sheet at phone widths (DA §K6/§K6b) — the batch-5/6 work is intact on production.
- **The market card is one card everywhere** (`.mcardp`, fixed width, same grid on `/`, `/markets`, `/live`, `/watchlist`); its 40px CTAs and the 13px share trigger with the extended hit area are **documented rulings**, not drift.
- **Pagination** is one component at 44px everywhere it appears.
- The three player tables (fairness, leaderboard, account activity) are all `.admin-tbl`, row-hover-only on two (fairness has 24 link-cells — underline hovers, acceptable pattern).
- Money never clips or wraps on the player side (checked at 390 across wallet/positions/updown) — the compact money grammar is doing its job.
- `aria-current` present on top-bar, rails and pagers where they exist; the bottom rail’s `data-on` pip + label-weight is a complete active vocabulary.
- Landing scroll-reveal bands render empty in full-page screenshots — **capture artefact**, not a defect (content verified present in DOM).

## 5 · What this pass did NOT cover
- The bet dial + confirm ceremony, sell flow, deposit/withdraw beyond their landing forms (no money was moved by design); the needle drawer and chat panel interiors; notifications panel / language menu / avatar menu **live geometry** (source-read only — the overlay probe’s name filter skipped them; extend `SAFE_NAME` next run); PWA install surfaces; SW/ZH locales; 768/1024 widths; `/positions/[id]`, `/proposals/[id]`, `/wallet/receipt/[id]`, `/updown/[roundId]` (no discoverable items on the QA account that day); logged-out gating of authed routes.

## 6 · Implementation order for Claude Code
1. Kit/shared (with the admin pass, same files): Toggle hit-area · SearchBox/SearchHelp unclip · NavLink hover (DG-P-01, one file) · chip single-height.
2. Tokens: the type-ladder ruling + label classes (shared with admin) · section-rhythm constant (DG-P-04).
3. Sweeps: h1 discipline (DG-P-03) · tap-floor residue (DG-P-07) · truncation disclosures (DG-P-08) · §B11 board migration (DG-P-10) · aria-current reach (DG-P-11) · the one-liners (DG-P-12/13/14).
4. Bug: React #310 on the authed `/auth/login` redirect (DG-P-09).
5. Gates after each step: `npx tsc --noEmit` · `npm run test:ui-consistency` · `test:design-frozen` · `test:filter-language` · `test:contrast` · then `node scripts/design-gate/measure.mjs` (SURFACE=player, alpha persona, serialized) and `analyze player <section>` diff. Green when: nav hover-dead = 0, one h1 per page at a ladder size, section gaps ≤ 2 values, no clipped contact/email, sub-40px interactive residue = 0 at 390, chip heights = 1 per size.

---
*Written by the design-gate session of 2026-08-28. Regenerate evidence with
`node scripts/design-gate/measure.mjs` (player chain: measure → overlays → shots, ONE login).
Delete `.qa-design-gate/` when the gate is green.*
