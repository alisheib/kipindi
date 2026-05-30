# Handoff: 50pick.tz — Affiliate / Referral (Feature 1)

## Overview
Screen designs for the **Affiliate / Referral program** on 50pick.tz (working name *Kipindi*),
a Tanzania-licensed pari-mutuel prediction-markets platform. Every player gets a referral link;
referrers earn via three independently-toggleable reward modes (Commission / Bonus / Prize) that
an officer controls from an admin master switch. Mobile-first, bilingual **EN + SW**, fully
responsive (mobile + desktop). Built strictly inside the existing **50pick UI kit**.

## About the design files
The files in this bundle are **design references created in HTML/JSX** (React via in-browser
Babel) — prototypes showing intended look + behavior, **not production code to ship as-is**. The
task is to **recreate these designs in the target codebase's environment** (e.g. Next.js + React +
Tailwind/shadcn) using its established patterns. Open `Affiliate Program.html` to explore; the
left control rail toggles **screen · viewport (mobile↔desktop) · theme (dark↔light) · program
state (active↔paused) · data state (empty↔populated) · sign-up bonus (on↔off)**.

The `kit/` files are the **existing 50pick kit, verbatim** (`atoms.jsx`, `brand.jsx`,
`markets.jsx`, `extras.jsx`) plus `tokens.css` with the 50pick brand override appended. Treat the
kit as the source of truth and reuse the host app's real implementation of these components.

## Fidelity
**High-fidelity.** Exact OKLCH colors, type scale, spacing, radii are in `kit/tokens.css`.
Recreate pixel-faithfully using the host app's component library. Copy is final (EN + SW).

## Brand rules (non-negotiable)
| Token | Role |
|---|---|
| **Royal indigo** `hue 268` — `--indigo-*`, surfaces (`--bg`, `--bg-elevated`, `--bg-overlay`) | Brand canvas + chrome (nav, accents, secondary controls) |
| **Gold** `hue 80` — `--gold-*`, `.btn-gold` | **Primary accent: every primary CTA is gold**; also every "money received" figure (earnings, payouts) |
| **Claret** `hue 22` — `--claret-*` | Heritage / danger only (e.g. compliance note) |
| **YES emerald** `hue 150` / **NO rose** `hue 25` | **Betting actions ONLY** — never a Share / Submit / nav CTA |
| Sora / Inter / JetBrains Mono | Display / body / **all numbers, amounts, codes, countdowns** |
No emojis. Bilingual on every screen (EN primary, SW italic secondary). Amounts `TZS` in mono.
+30% string-length tolerance (Swahili runs longer).

## Screens / Views

### 1.1 Invite & Earn — `/profile/invite` (the hero)
- **Purpose:** player copies/shares their link and tracks earnings.
- **Layout:** single column (mobile) / centered max-680 with sidebar nav (desktop).
- **Components:**
  - Title bar: "Invite & Earn · Alika upate" + **status pill** (Active = indigo chrome / Paused = warning amber). Never betting-green.
  - Hero card (`hero-dark` scope, indigo gradient): **gold earnings ring** (`CircularProgress tone="gold"`, label = "31K") + headline "Invite friends. Earn together. · Alika marafiki. Pateni pamoja." + **adaptive promise lines** that reflect which reward modes are on (Commission → "Earn 50% of your friends' fees for 24 months"; Prize → "Get TZS 5,000 when a friend places their first bet").
  - Referral link: mono `input-group` (gold link icon) + **Copy** button + full-width **gold** `btn-gold btn-lg` "Share with Friends · Shiriki"; secondary row WhatsApp / SMS / Copy link (`btn-ghost`).
  - Two stat tiles: **Referrals** (count) and **Earned** (TZS mono, gold).
  - How It Works: 3 numbered steps (steps 1–2 indigo discs, step 3 gold disc) — Share your link · They sign up & play · You earn.
  - Recruit list (populated): masked name, join date, status chip, earned-from-them (gold).
- **States:** empty (dashed `EmptyState`, 0/0) ↔ populated; active ↔ paused (adds amber banner); dark ↔ light.

### 1.2 Profile entry
- New row in the "Account · Akaunti" grid: **Invite & Earn · Alika upate**, gift icon, subtle gold left-accent + gold "New" tag, chevron — matching existing row pattern (icon + title + SW subtitle + chevron).

### 1.3 Registration ribbon — registration screen
- Tasteful ribbon: `FiftyMark` + "You were invited by Asha M. · Umealikwa na rafiki". When a sign-up bonus mode is active, adds a **gold** line "Sign up & get TZS 2,000 to start". **Degrades gracefully** (line hidden) when no bonus mode is on. Referral code field auto-filled (gold check).

### 1.4 Notifications
- In-app rows: "You earned TZS X from a referral" (gold coins icon, amount gold), "Your friend just joined" (indigo users icon), milestone prize (gold ticket). Plus kit `Toast` specimens (success / info). Reuses the kit notification/toast style; unread dot = gold.

### 1.5 Admin · Affiliate — `/admin/affiliate` (new "Growth" sidebar group)
- **Master switch** = the money lever: prominent **gold** `Toggle` when ON; unmistakable amber paused state with explanatory copy.
- **KPI tiles:** Total referrals · Active affiliates · Commission paid (TZS, gold) · Top referrer.
- **Three reward-mode cards**, each with its own enable `Toggle` (indigo) + inputs:
  - *Commission:* % rate + window (months) + per-recruit cap (TZS).
  - *Bonus:* who gets it (New player / Referrer / Both segmented) + new-player & referrer amounts + trigger (Sign-up / First deposit).
  - *Prize:* milestone (First bet / Deposit ≥ threshold) + fixed TZS prize + cap per player.
- **Gold "Save · Hifadhi"** (matches `/admin/config`).
- **Payout ledger** table (referrer · recruit · type · amount · date · status) and **referral leaderboard**.
- **Claret compliance-note slot** for "program is dark / limited" staff messaging.

## Interactions & behavior
- Copy button → clipboard + transient "Copied" confirm. Share → native share sheet.
- Admin toggles: master ON/OFF gates the three mode toggles; disabling master dims + disables modes and flips the player status pill + paused banner.
- Reward-mode segmented controls and inputs are live; "Save" persists config.
- Motion: kit easings (`--ease-micro` 120ms, `--ease-stage` 240ms). Ring/bar fills animate width/stroke on mount.
- Responsive: mobile = phone frame + bottom nav (Markets · Live · Positions · Board · Profile); desktop = sidebar + top bar + centered content reflowing to multi-column; admin sidebar collapses on narrow widths and the ledger scrolls horizontally.

## State management
- `affiliateProgram { enabled, modes: { commission{rate, windowMonths, capPerRecruit}, bonus{recipient, newAmount, referrerAmount, trigger}, prize{milestone, depositThreshold, amount, capPerPlayer} } }`
- per-user `referral { code, link, recruits[{maskedName, joinedAt, status, earnedTZS}], earnedTZS }`
- admin `payoutLedger[{referrer, recruit, type, amountTZS, date, status}]`, `leaderboard[]`
- `theme` (dark|light, persisted), `locale` (en|sw, persisted).

## Design tokens
Source of truth: `kit/tokens.css`. Indigo `hue 268`, gold `hue 80`, claret `hue 22`, YES `hue 150`,
NO `hue 25`; type scale 56/44/34/26/20/17/15/13/11px; spacing 4–64; radius 4/6/10/14/20/999;
fonts Sora · Inter · JetBrains Mono. The brand override block at the bottom of `tokens.css` sets
indigo surfaces (dark + light), the claret ramp, and gold focus rings.

## New component to promote into the kit (flag)
- **`Toggle`** (switch) — the kit had none. Gold when ON for the master money-lever, indigo for
  sub-toggles, `--bg-overlay` off. See `screens/affiliate-admin.jsx`.
- ~14 icons appended to the kit `Icon` map (gift, copy, link, users, coins, percent, ticket,
  trophy, megaphone, wallet, clock, pause, info, user, chevron, whatsapp) — same 1.5px stroke.

## Assets
No raster assets. All icons are inline SVG in `kit/atoms.jsx` (`Icon`). The logo is the kit
`FiftyMark` / `FiftyWordmark` / `FiftyLockup` in `kit/brand.jsx` — do not recolor it.

## Files
- `Affiliate Program.html` — entry/reference prototype.
- `kit/tokens.css` — tokens + 50pick brand override.
- `kit/atoms.jsx`, `kit/brand.jsx`, `kit/markets.jsx`, `kit/extras.jsx` — kit components (verbatim).
- `screens/affiliate-player.jsx` — 1.1 Invite & Earn.
- `screens/affiliate-player2.jsx` — 1.2 / 1.3 / 1.4.
- `screens/affiliate-admin.jsx` — 1.5 admin dashboard.
- `app.jsx` — responsive shells (mobile Phone / desktop web-app / operator console) + prototype harness (presentation only; not part of the product).

## Out of scope (next pass)
Feature 2 — **Player Market Proposals** (proposals board, create form, detail + timeline, admin
review queue). Specced in the original brief; reuses the same shell, tokens and components.
