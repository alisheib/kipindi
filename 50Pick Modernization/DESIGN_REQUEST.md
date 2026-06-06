# Design Request → Claude Design (FULL) — finish the 50pick kit to 100%

**Product:** 50pick (Kipindi) — Tanzania pari-mutuel prediction-market platform, **"Dark Glass"** kit.
**Goal:** make the *entire* platform (player + admin) use ONLY kit assets — zero `lucide-react`,
zero off-kit detail — and resolve a few design-authority decisions so engineering can finish the
consistency refactors without guessing. Royal-indigo canvas (hue 268) · gilt accent (~80) ·
aqua chrome (195) · YES emerald (152) / NO rose (22). Fonts: Sora / Inter / JetBrains Mono.

This supersedes `DESIGN_REQUEST_glyphs.md`.

---

# PART A — Icon set (the big one)

We removed lucide from the core surfaces using the existing ~70 kit glyphs in
`src/components/ui/glyphs.tsx`. The icons below have **no kit equivalent** — please draw them in
the kit glyph style so we can finish the purge platform-wide.

### Glyph construction (match EXACTLY — copied from `glyphs.tsx`)
```jsx
const G = ({ children, s, ...p }) => (
  <svg viewBox="0 0 24 24" width={s||24} height={s||24} fill="none"
       stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);
```
- 24×24, **1.9px stroke**, `currentColor`, `fill="none"` (tiny accent dots may use
  `fill="currentColor" stroke="none"`). Round caps + joins. Single color, no gradients.
- Legible at **12–14px** (chips/table rows) and crisp at 18–22px.
- Same optical weight / corner feel as existing `economy`, `crypto`, `shieldcheck`, `wallet`,
  `trophy`, `politics` glyphs.
- **Deliver:** the inner markup (children of `<G>`) per icon, so we paste as
  `key: (p) => <G {...p}>…</G>`. A preview sheet at 14px + 22px on `oklch(15% 0.13 268)` helps us validate.

### A1 · Player-facing glyphs (priority — blocks finishing player pages)
| key | meaning | used on | lucide ref |
|---|---|---|---|
| `mail` | envelope | help, forgot-password, account | Mail |
| `calendar` | date | proposals/new, account (DOB) | Calendar |
| `device` | a logged-in device | profile → sessions | MonitorSmartphone |
| `vibrate` | haptics toggle | settings → sound & feedback | Vibrate |
| `smartphone` | mobile handset (distinct from `phone` call-handset) | auth | Smartphone |
| `shieldQuestion` | shield + query — recovery / "why we ask" | forgot-password, privacy | ShieldQuestion |
| `fileSignature` | document being signed — SOF declaration | profile → source-of-funds | FileSignature |
| `percent` | percentage — affiliate commission | profile → invite | Percent |
| `link` | chain link — referral link | profile → invite | Link2 |
| `messageWhatsapp` | WhatsApp share | profile → invite share | (MessageCircle today) |

### A2 · Admin glyphs (to make the WHOLE platform lucide-free)
| key | meaning | lucide ref |
|---|---|---|
| `keyRound` | API key / TOTP | KeyRound |
| `megaphone` | affiliate / promotion | Megaphone |
| `database` | data / snapshot | Database |
| `server` | system / infra | Server |
| `landmark` | bank / house-pool treasury | Landmark |
| `fileText` | report / document | FileText |
| `fileCheck` | verified document / candidate approved | FileCheck |
| `fileSpreadsheet` | XLSX export | FileSpreadsheet |
| `brain` | AI market generation | Brain |
| `bot` | AI assistant / poll bot | Bot |
| `shieldAlert` | compliance alert | ShieldAlert |
| `shieldOff` | suspended / unprotected | ShieldOff |
| `heartPulse` | responsible-gambling health | HeartPulse |
| `rotateCcw` | restore / undo (moderation) | RotateCcw |
| `archive` | retention / archive | Archive |
| `xCircle` | declined / reject (circle variant) | XCircle |
| `alertOctagon` | stop / critical (octagon) | AlertOctagon |
| `arrowUpFromLine` | withdraw / payout out | ArrowUpFromLine |
| `arrowDownToLine` | deposit / funds in | ArrowDownToLine |
| `scrollText` | legal / terms | ScrollText |

> Already in the kit (do NOT redraw): chevron L/R/U/D, check, checkCircle, x, info, warning,
> alertCircle, edit, camera, trash, phone, lock, unlock, user, users, wallet, coins, gift,
> ticket, share, comment, copy, download, upload, clock, pause, sparkle, trophy, shield,
> shieldcheck, logOut/In, activity, settings, star, crown, flag, bell, search, plus, menu, ext,
> play, + category sigils (football, crypto, weather, economy, entertainment, tech, politics).
> Loaders use our `Spinner` component (no glyph).

---

# PART B — Design-authority decisions (so we unify without guessing)

We have a few **wide-ripple consistency refactors** queued. They're safe only with your call on
the canonical spec, because changing them touches the whole app. Please confirm each:

**B1 · Canonical elevated-surface system.** Today there are 4 ways to draw an "elevated box":
`.mcardp` (market card), `.glass-panel` (section panels), `<Card>` (component), and `.tpanel`.
Please confirm ONE canonical spec we standardize on, with exact values for:
- rest: background (gradient or flat?), border token, shadow, 1px inner light-edge
- hover: lift distance, border (brand-blue?), glow
…so we collapse to a single surface primitive.

**B2 · Canonical spacing + radius scale.** Our CSS tokens (`--sp-*`, `--r-*`) and our Tailwind
scale currently **disagree** (e.g. CSS `--sp-2 = 8px` but Tailwind `2 = 12px`; CSS `--r-md = 12px`
but Tailwind `md = 8px`). Please confirm the single authoritative px scale for spacing (1–16) and
radius (xs/sm/md/lg/xl/pill) and we'll align both to it.

**B3 · Light mode — keep or kill?** The app ships a dormant light/dark theme engine but renders
single dark-royal only (kit says single theme). Confirm: **no light mode ever** (we delete the
dead engine) — or do you want a light theme specced (then we need light tokens)?

**B4 · Motion tiers for mid-tier Android.** We throttle via `data-motion: full | reduced |
minimal`. Confirm which ambient loops are OK at **reduced** vs must stop: ticker marquee,
probability-bar resolved shimmer, gold-shimmer/pulse, hero dial breathe, progress light-sweep,
status-dot pulse. (Default: reduced stops all ambient loops, keeps functional transitions.)

**B5 · Gold budget edge case.** Proposal **upvote** currently uses gold. Kit rule = gold for
resolved-wins / payout / dial-needle only. Should upvote move to brand-blue / aqua, or is gold
intentional there as a "value" signal? (We left it gold pending your call.)

**B6 · Chips.** Should status/category chips get the kit's micro-bounce entrance + state-change
pulse, or stay static? (We kept them static to avoid over-animation in lists.)

---

# PART C — Anything else you'd want to perfect
Optional, only if you see gaps when reviewing the live build against the kit:
- Empty-state line-art illustrations (markets/positions/leaderboard empty) — confirm the set.
- Win-celebration: confirm the calm gilt-ray + rolling counter is final (we removed confetti per invariant #7).
- Any surface where the current build still reads "classic" to your eye — flag it with the kit reference.

---

## How we'll use your delivery
- **Part A glyphs** → pasted into `glyphs.tsx`; we swap remaining `lucide` → `I.<key>` everywhere
  (player first, then admin), making the platform lucide-free.
- **Part B answers** → we run the unify refactors (one surface primitive, one spacing/radius
  scale, delete-or-build light mode, finalize motion tiers).
- Validate against `VALIDATION_CHECKLIST.md` (every kit detail → code location, sections A–O).
