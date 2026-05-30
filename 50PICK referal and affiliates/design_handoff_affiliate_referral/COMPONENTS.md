# Component contract — Affiliate / Referral

Every UI element in this feature, where it comes from, and how it maps to your existing code.
**Rule:** reuse the kit component; never re-style with one-off inline overrides. Anything not in
the kit is flagged **NEW** and should be promoted into the kit.

## Reused from the existing kit (no changes)

| Element | Source | Props used | Notes |
|---|---|---|---|
| `Btn` | `kit/atoms.jsx` | `variant` (`gold` = primary CTA, `ghost` = secondary, `danger`), `size` (`sm/md/lg/xl`), `leadingIcon`, `disabled`, `loading` | Primary CTA is always `variant="gold"` per brand guide |
| `Chip` | `kit/atoms.jsx` | `variant`, `dot` | Variants used: `resolved` (gold, e.g. "New", "Earning"), `pending`, `neutral`, **`active`/`paused`** (added — see below) |
| `Input` / `.input-group` / `.prefix` | `kit/atoms.jsx` + `tokens.css` | `prefix`, `mono`, `placeholder`, `readOnly`, `value` | Used for referral link, config fields, phone/name |
| `Avatar` | `kit/atoms.jsx` | `initials`, `size`, `hue` (268 = indigo) | Profile, recruits, leaderboard, officer |
| `CircularProgress` | `kit/atoms.jsx` | `value`, `size`, `stroke`, `tone="gold"`, `label` | The earnings ring on Invite & Earn |
| `Toast` | `kit/atoms.jsx` | `kind` (`success`/`info`), `title`, `body` | Notification toast specimens |
| `Icon` | `kit/atoms.jsx` | `name`, `size`, `stroke` | + ~14 names appended (see below) |
| `EmptyState` / `EmptyPositionsArt` | `kit/markets.jsx` | `illustration`, `title`, `body`, `action` | "No referrals yet" empty state |
| `FiftyMark` / `FiftyWordmark` / `FiftyLockup` | `kit/brand.jsx` | `size`, `color` | Logo — never recolored |
| `Phone` | `kit/extras.jsx` | `w`, `h` | Mobile presentation frame |
| Tokens | `kit/tokens.css` | CSS vars | Single source of truth |

## Feature-local components (composed from kit primitives — port as-is)

| Component | File | Props | = existing code |
|---|---|---|---|
| `Kpi` | `affiliate-player.jsx` | `label, value, sub, gold, icon` | your **AdminKpi** / KPI-tile — one shared contract for player tiles AND admin KPIs |
| `StatusPill` | `affiliate-player.jsx` | `paused` | renders `<Chip variant="active\|paused">` |
| `Bi` | `affiliate-player.jsx` | `en, sw, size, weight` | the bilingual EN-over-SW label pattern |
| `Cap` | `affiliate-player.jsx` | `children, style` | the mono uppercase micro-label |
| `NRow` | `affiliate-player2.jsx` | `icon, gold, title, body, time, unread, last` | notification row (your existing notification-row style) |
| `RewardCard` | `affiliate-admin.jsx` | `icon, title, sw, desc, on, onToggle, disabled, children` | = your **AdminCard** + header toggle |
| `Field` | `affiliate-admin.jsx` | `label, hint, prefix, suffix, value, w` | = your **config-form field** (labelled number/percent + hint) |
| `Seg` | `affiliate-admin.jsx` | `options, value, onChange` | segmented control (who-gets-it / trigger / milestone) |

## NEW — promote into the kit

| Component | File | Props | Why new |
|---|---|---|---|
| **`Toggle`** | `affiliate-admin.jsx` | `on, onClick, gold` | The kit ships no switch. **Gold** when on for the master money-lever; **indigo** for sub-toggles; `--bg-overlay` off. This is the canonical switch — add it to `atoms.jsx`. |
| **Icon additions** | `kit/atoms.jsx` (appended to the `Icon` map) | — | `gift, copy, link, users, coins, percent, ticket, trophy, megaphone, wallet, clock, pause, info, user, chevron, whatsapp` — same 1.5px stroke; the kit README explicitly sanctions extending the set. |
| **Chip variants** | `kit/tokens.css` | — | `.chip-active` (indigo) / `.chip-paused` (amber) — added because program status must not read as betting-green. Extends the kit chip system. |

## Component-usage rules (enforce in review)

1. **Primary CTA = `Btn variant="gold"`.** Never green/red/teal for Share / Submit / Save / nav.
2. **Money figures** (earnings, payouts, balances) render in **gold** (`--gold-300`), mono.
3. **YES emerald / NO rose** appear **only** inside betting controls — none in this feature.
4. Use the **`Kpi`** component for every stat tile; the **`Field`** component for every config input.
5. Status uses **`StatusPill`** (→ `Chip` `active`/`paused`), never an inline-coloured span.
6. All numbers/amounts/codes/countdowns use the **mono** class; prose uses Inter; headings Sora.
7. Bilingual: every label is `Bi` (EN) + italic SW, or "EN · SW" inline.
