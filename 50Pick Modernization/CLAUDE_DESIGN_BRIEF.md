# 50pick — Claude Design Brief (single file, everything inside)

> Fresh chat? This ONE file has it all: the request, the current icon code to
> match, the design tokens, and the component spec. Live app to open:
> https://kipindi-production.up.railway.app

=============================================================================
# 1. THE REQUEST
=============================================================================

# Design Request â†’ Claude Design (FULL) â€” finish the 50pick kit to 100%

**Product:** 50pick (Kipindi) â€” Tanzania pari-mutuel prediction-market platform, **"Dark Glass"** kit.
**Goal:** make the *entire* platform (player + admin) use ONLY kit assets â€” zero `lucide-react`,
zero off-kit detail â€” and resolve a few design-authority decisions so engineering can finish the
consistency refactors without guessing. Royal-indigo canvas (hue 268) Â· gilt accent (~80) Â·
aqua chrome (195) Â· YES emerald (152) / NO rose (22). Fonts: Sora / Inter / JetBrains Mono.

This supersedes `DESIGN_REQUEST_glyphs.md`.

---

# PART A â€” Icon set (the big one)

We removed lucide from the core surfaces using the existing ~70 kit glyphs in
`src/components/ui/glyphs.tsx`. The icons below have **no kit equivalent** â€” please draw them in
the kit glyph style so we can finish the purge platform-wide.

### Glyph construction (match EXACTLY â€” copied from `glyphs.tsx`)
```jsx
const G = ({ children, s, ...p }) => (
  <svg viewBox="0 0 24 24" width={s||24} height={s||24} fill="none"
       stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);
```
- 24Ã—24, **1.9px stroke**, `currentColor`, `fill="none"` (tiny accent dots may use
  `fill="currentColor" stroke="none"`). Round caps + joins. Single color, no gradients.
- Legible at **12â€“14px** (chips/table rows) and crisp at 18â€“22px.
- Same optical weight / corner feel as existing `economy`, `crypto`, `shieldcheck`, `wallet`,
  `trophy`, `politics` glyphs.
- **Deliver:** the inner markup (children of `<G>`) per icon, so we paste as
  `key: (p) => <G {...p}>â€¦</G>`. A preview sheet at 14px + 22px on `oklch(15% 0.13 268)` helps us validate.

### A1 Â· Player-facing glyphs (priority â€” blocks finishing player pages)
| key | meaning | used on | lucide ref |
|---|---|---|---|
| `mail` | envelope | help, forgot-password, account | Mail |
| `calendar` | date | proposals/new, account (DOB) | Calendar |
| `device` | a logged-in device | profile â†’ sessions | MonitorSmartphone |
| `vibrate` | haptics toggle | settings â†’ sound & feedback | Vibrate |
| `smartphone` | mobile handset (distinct from `phone` call-handset) | auth | Smartphone |
| `shieldQuestion` | shield + query â€” recovery / "why we ask" | forgot-password, privacy | ShieldQuestion |
| `fileSignature` | document being signed â€” SOF declaration | profile â†’ source-of-funds | FileSignature |
| `percent` | percentage â€” affiliate commission | profile â†’ invite | Percent |
| `link` | chain link â€” referral link | profile â†’ invite | Link2 |
| `messageWhatsapp` | WhatsApp share | profile â†’ invite share | (MessageCircle today) |

### A2 Â· Admin glyphs (to make the WHOLE platform lucide-free)
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

# PART B â€” Design-authority decisions (so we unify without guessing)

We have a few **wide-ripple consistency refactors** queued. They're safe only with your call on
the canonical spec, because changing them touches the whole app. Please confirm each:

**B1 Â· Canonical elevated-surface system.** Today there are 4 ways to draw an "elevated box":
`.mcardp` (market card), `.glass-panel` (section panels), `<Card>` (component), and `.tpanel`.
Please confirm ONE canonical spec we standardize on, with exact values for:
- rest: background (gradient or flat?), border token, shadow, 1px inner light-edge
- hover: lift distance, border (brand-blue?), glow
â€¦so we collapse to a single surface primitive.

**B2 Â· Canonical spacing + radius scale.** Our CSS tokens (`--sp-*`, `--r-*`) and our Tailwind
scale currently **disagree** (e.g. CSS `--sp-2 = 8px` but Tailwind `2 = 12px`; CSS `--r-md = 12px`
but Tailwind `md = 8px`). Please confirm the single authoritative px scale for spacing (1â€“16) and
radius (xs/sm/md/lg/xl/pill) and we'll align both to it.

**B3 Â· Light mode â€” keep or kill?** The app ships a dormant light/dark theme engine but renders
single dark-royal only (kit says single theme). Confirm: **no light mode ever** (we delete the
dead engine) â€” or do you want a light theme specced (then we need light tokens)?

**B4 Â· Motion tiers for mid-tier Android.** We throttle via `data-motion: full | reduced |
minimal`. Confirm which ambient loops are OK at **reduced** vs must stop: ticker marquee,
probability-bar resolved shimmer, gold-shimmer/pulse, hero dial breathe, progress light-sweep,
status-dot pulse. (Default: reduced stops all ambient loops, keeps functional transitions.)

**B5 Â· Gold budget edge case.** Proposal **upvote** currently uses gold. Kit rule = gold for
resolved-wins / payout / dial-needle only. Should upvote move to brand-blue / aqua, or is gold
intentional there as a "value" signal? (We left it gold pending your call.)

**B6 Â· Chips.** Should status/category chips get the kit's micro-bounce entrance + state-change
pulse, or stay static? (We kept them static to avoid over-animation in lists.)

---

# PART C â€” Anything else you'd want to perfect
Optional, only if you see gaps when reviewing the live build against the kit:
- Empty-state line-art illustrations (markets/positions/leaderboard empty) â€” confirm the set.
- Win-celebration: confirm the calm gilt-ray + rolling counter is final (we removed confetti per invariant #7).
- Any surface where the current build still reads "classic" to your eye â€” flag it with the kit reference.

---

## How we'll use your delivery
- **Part A glyphs** â†’ pasted into `glyphs.tsx`; we swap remaining `lucide` â†’ `I.<key>` everywhere
  (player first, then admin), making the platform lucide-free.
- **Part B answers** â†’ we run the unify refactors (one surface primitive, one spacing/radius
  scale, delete-or-build light mode, finalize motion tiers).
- Validate against `VALIDATION_CHECKLIST.md` (every kit detail â†’ code location, sections Aâ€“O).


=============================================================================
# APPENDIX A — CURRENT KIT GLYPHS  (glyphs.tsx — MATCH THIS EXACT STYLE)
=============================================================================
```tsx
/**
 * 50pick custom line-icon family â€” 24px grid Â· 1.9 stroke Â· round joins.
 * Ported from Claude Design's Identity Sprint. One coherent heraldic set:
 * categories Â· actions Â· nav Â· status Â· trust + decoratives (crown/shield/seal).
 * Pure SVG, dependency-free, currentColor. Use `<I.crypto s={14} />`.
 */
import type { SVGProps } from "react";

type GlyphProps = { s?: number } & Omit<SVGProps<SVGSVGElement>, "ref">;

const G = ({ children, s, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={s || 24} height={s || 24} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

export const I = {
  /* categories */
  football: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5l3.2 2.4-1.2 3.8h-4l-1.2-3.8z" /><path d="M12 7.5V4.5M15.2 9.9l2.8-1M13.8 13.7l1.8 2.5M10.2 13.7l-1.8 2.5M8.8 9.9l-2.8-1" /></G>,
  politics: (p: GlyphProps) => <G {...p}><path d="M3 9l9-5 9 5" /><path d="M4 9h16" /><path d="M6 9v8M10 9v8M14 9v8M18 9v8" /><path d="M3 21h18" /><path d="M4 17h16" /></G>,
  forex: (p: GlyphProps) => <G {...p}><path d="M4 8h12l-3-3M20 16H8l3 3" /><path d="M7.5 11.5v1M7 12h1" /></G>,
  weather: (p: GlyphProps) => <G {...p}><path d="M7 16a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.3 3.3 0 0 1 17 16H7z" /><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" /></G>,
  economy: (p: GlyphProps) => <G {...p}><path d="M4 4v16h16" /><path d="M7 15l3.5-4 3 2.5L20 7" /><path d="M20 7v3.5M20 7h-3.5" /></G>,
  crypto: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 6.5v11M9.5 9h4a1.8 1.8 0 0 1 0 3.6h-4M9.5 12.6h4.5a1.8 1.8 0 0 1 0 3.6H9.5" /></G>,
  entertainment: (p: GlyphProps) => <G {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" /></G>,
  tech: (p: GlyphProps) => <G {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" /></G>,
  /* actions */
  trade: (p: GlyphProps) => <G {...p}><path d="M8 4v16M8 20l-3-3M8 20l3-3" /><path d="M16 20V4M16 4l-3 3M16 4l3 3" /></G>,
  watch: (p: GlyphProps) => <G {...p}><path d="M6 4h12v16l-6-4-6 4z" /></G>,
  share: (p: GlyphProps) => <G {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></G>,
  comment: (p: GlyphProps) => <G {...p}><path d="M5 5h14v10H9l-4 4z" /><path d="M8.5 10h7M8.5 7.5h4" /></G>,
  bell: (p: GlyphProps) => <G {...p}><path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 2 6H5c.5-1 2-2 2-6z" /><path d="M10.5 20a1.7 1.7 0 0 0 3 0" /></G>,
  search: (p: GlyphProps) => <G {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></G>,
  filter: (p: GlyphProps) => <G {...p}><path d="M4 5h16l-6 7v5l-4 2v-7z" /></G>,
  plus: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></G>,
  /* nav */
  home: (p: GlyphProps) => <G {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></G>,
  markets: (p: GlyphProps) => <G {...p}><path d="M12 4v16" /><path d="M6 7h12" /><path d="M6 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M18 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M8.5 20h7" /></G>,
  portfolio: (p: GlyphProps) => <G {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18M14 12v2.5h-4V12" /></G>,
  trophy: (p: GlyphProps) => <G {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /><path d="M12 13v3M9 20h6M10 20l.5-4h3l.5 4" /></G>,
  profile: (p: GlyphProps) => <G {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" /></G>,
  /* status */
  live: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" /></G>,
  tipping: (p: GlyphProps) => <G {...p}><path d="M12 4v16M7 20h10" /><path d="M12 6l-7 2 7-2 7 2" transform="rotate(-8 12 7)" /><path d="M5 8l-2 4.5a2.3 2.3 0 0 0 4 0z" transform="rotate(-8 12 7)" /><path d="M19 8l-2 4.5a2.3 2.3 0 0 0 4 0z" transform="rotate(-8 12 7)" /></G>,
  hot: (p: GlyphProps) => <G {...p}><path d="M12 3c.5 2.5 2 4 3.5 5.5S18 12 18 14a6 6 0 0 1-12 0c0-1.2.4-2.3 1-3 .2 1 .8 1.8 1.6 2.2C8.3 11 9 8.5 8.5 6.5c2 .8 3 2.4 3.2 4 .6-.6 1-1.6 1-2.8 0-1.6-.7-3.2-.7-4.7z" /></G>,
  soon: (p: GlyphProps) => <G {...p}><path d="M7 3h10M7 21h10" /><path d="M8 3c0 4 8 4.5 8 9s-8 5-8 9M16 3c0 4-8 4.5-8 9s8 5 8 9" /></G>,
  resolved: (p: GlyphProps) => <G {...p}><path d="M12 3l1.9 1.4 2.3-.3 1 2.1 2.1 1-.3 2.3L21 13l-1.4 1.9.3 2.3-2.1 1-1 2.1-2.3-.3L12 21l-1.9-1.4-2.3.3-1-2.1-2.1-1 .3-2.3L3 13l1.4-1.9-.3-2.3 2.1-1 1-2.1 2.3.3z" /><path d="M9 12.5l2 2 4-4.5" /></G>,
  void: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></G>,
  /* trust / misc */
  shieldcheck: (p: GlyphProps) => <G {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /><path d="M9 11.5l2 2 4-4.5" /></G>,
  bolt: (p: GlyphProps) => <G {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6z" /></G>,
  wallet: (p: GlyphProps) => <G {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h.01M3 9h13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3" /></G>,
  /* heraldic decoratives */
  crown: (p: GlyphProps) => <G {...p}><path d="M4 18h16M5 18l-1.5-9 5 4 3.5-7 3.5 7 5-4L19 18z" /><circle cx="3.5" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="20.5" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" /></G>,
  shield: (p: GlyphProps) => <G {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /></G>,
  sparkle: (p: GlyphProps) => <G {...p}><path d="M12 3c.4 4 1.5 5.1 5.5 5.5C13.5 8.9 12.4 10 12 14c-.4-4-1.5-5.1-5.5-5.5C10.5 8.1 11.6 7 12 3z" fill="currentColor" stroke="none" /><path d="M18.5 14c.2 2 .8 2.6 2.8 2.8-2 .2-2.6.8-2.8 2.8-.2-2-.8-2.6-2.8-2.8 2-.2 2.6-.8 2.8-2.8z" fill="currentColor" stroke="none" /></G>,
  star: (p: GlyphProps) => <G {...p}><path d="M12 3.5l2.5 5.1 5.6.8-4.05 3.95.96 5.6L12 16.3 6.99 18.95l.96-5.6L3.9 9.4l5.6-.8z" /></G>,
  flame2: (p: GlyphProps) => <G {...p}><path d="M12 3c1 3 3 4.5 3 8a3 3 0 1 1-6 0c0-1 .3-1.8.8-2.4C9 11 10 12.5 11 12c-.5-2 .5-7 1-9z" /></G>,
  /* ---- kit50.jsx extended set â€” replaces lucide-react for consistency ---- */
  check: (p: GlyphProps) => <G {...p}><path d="M5 12.5l4.5 4.5L19 7" /></G>,
  x: (p: GlyphProps) => <G {...p}><path d="M6 6l12 12M18 6L6 18" /></G>,
  info: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></G>,
  ext: (p: GlyphProps) => <G {...p}><path d="M14 5h5v5M19 5l-8 8M12 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-6" /></G>,
  phone: (p: GlyphProps) => <G {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></G>,
  globe: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.5 2.6 15 0 18M12 3c-2.6 2.5-2.6 15 0 18" /></G>,
  chart: (p: GlyphProps) => <G {...p}><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" /></G>,
  warning: (p: GlyphProps) => <G {...p}><path d="M12 4.2 21 19.5H3z" /><path d="M12 10v4.5M12 17.4h.01" /></G>,
  alertCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></G>,
  eye: (p: GlyphProps) => <G {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></G>,
  eyeOff: (p: GlyphProps) => <G {...p}><path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5.1c6 0 9.5 6.9 9.5 6.9a17.3 17.3 0 0 1-3.1 3.9M6.5 6.6A17.2 17.2 0 0 0 2.5 12S6 18.9 12 18.9a10.5 10.5 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></G>,
  edit: (p: GlyphProps) => <G {...p}><path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17z" /><path d="M13.5 7.5l3 3" /></G>,
  camera: (p: GlyphProps) => <G {...p}><path d="M4 8h3l1.5-2.2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.2" /></G>,
  trash: (p: GlyphProps) => <G {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.9 13a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L18.5 7M10 11v6M14 11v6" /></G>,
  flag: (p: GlyphProps) => <G {...p}><path d="M5.5 21V4M5.5 4.5h11l-2.2 3.2 2.2 3.2h-11" /></G>,
  menu: (p: GlyphProps) => <G {...p}><path d="M4 7h16M4 12h16M4 17h16" /></G>,
  chevronDown: (p: GlyphProps) => <G {...p}><path d="M6 9l6 6 6-6" /></G>,
  chevronUp: (p: GlyphProps) => <G {...p}><path d="M6 15l6-6 6 6" /></G>,
  chevronRight: (p: GlyphProps) => <G {...p}><path d="M9 6l6 6-6 6" /></G>,
  chevronLeft: (p: GlyphProps) => <G {...p}><path d="M15 6l-6 6 6 6" /></G>,
  checkCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M8.4 12.4l2.5 2.5 4.7-5.2" /></G>,
  bellRing: (p: GlyphProps) => <G {...p}><path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 2 6H5c.5-1 2-2 2-6z" /><path d="M10.5 20a1.7 1.7 0 0 0 3 0" /><path d="M3.6 6.4A6 6 0 0 1 6 3M20.4 6.4A6 6 0 0 0 18 3" /></G>,
  bellOff: (p: GlyphProps) => <G {...p}><path d="M8.6 4.2A5 5 0 0 1 17 8c0 2.6.6 4 1.2 5M16.5 16.5H5c.5-1 2-2 2-6 0-.4 0-.7.05-1M10.5 20a1.7 1.7 0 0 0 3 0M3 3l18 18" /></G>,
  trendingUp: (p: GlyphProps) => <G {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5M21 7h-5" /></G>,
  trendingDown: (p: GlyphProps) => <G {...p}><path d="M3 7l6 6 4-4 8 8" /><path d="M21 17v-5M21 17h-5" /></G>,
  clock: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></G>,
  arrowDown: (p: GlyphProps) => <G {...p}><path d="M12 5v14M6 13l6 6 6-6" /></G>,
  arrowUp: (p: GlyphProps) => <G {...p}><path d="M12 19V5M6 11l6-6 6 6" /></G>,
  arrowRight: (p: GlyphProps) => <G {...p}><path d="M5 12h14M13 6l6 6-6 6" /></G>,
  play: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5.5 3.5L10 15.5z" fill="currentColor" stroke="none" /></G>,
  download: (p: GlyphProps) => <G {...p}><path d="M12 5v10M7 12l5 5 5-5M5 19h14" /></G>,
  upload: (p: GlyphProps) => <G {...p}><path d="M12 15V5M7 8l5-5 5 5M5 19h14" /></G>,
  copy: (p: GlyphProps) => <G {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></G>,
  lock: (p: GlyphProps) => <G {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></G>,
  unlock: (p: GlyphProps) => <G {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.4-2" /></G>,
  user: (p: GlyphProps) => <G {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" /></G>,
  users: (p: GlyphProps) => <G {...p}><circle cx="9" cy="8" r="3" /><path d="M4 19a5 5 0 0 1 10 0" /><circle cx="17" cy="9" r="2.5" /><path d="M20.5 19a4 4 0 0 0-5-3.6" /></G>,
  settings: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="3" /><path d="M12 1.5v3M12 19.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.5 12h3M19.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></G>,
  logOut: (p: GlyphProps) => <G {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></G>,
  logIn: (p: GlyphProps) => <G {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M3 12h12M10 7l5 5-5 5" /></G>,
  gift: (p: GlyphProps) => <G {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" /><path d="M7.5 8C7.5 6 9 4.5 10.5 4.5S12 6 12 8M16.5 8c0-2-1.5-3.5-3-3.5S12 6 12 8" /></G>,
  receipt: (p: GlyphProps) => <G {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2z" /><path d="M8 10h8M8 14h5" /></G>,
  coins: (p: GlyphProps) => <G {...p}><circle cx="10" cy="10" r="6" /><path d="M14.5 13.5a6 6 0 1 0 0-7" /><path d="M10 8v4M8.5 10.5h3" /></G>,
  activity: (p: GlyphProps) => <G {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></G>,
  ticket: (p: GlyphProps) => <G {...p}><path d="M2 9a3 3 0 0 1 0 6v4h20v-4a3 3 0 0 1 0-6V5H2z" /><path d="M13 5v2M13 17v2M13 11v2" /></G>,
  /* aliases â€” map lucide naming to kit naming */
  listChecks: (p: GlyphProps) => <G {...p}><path d="M3 6h2.5M3 12h2.5M3 18h2.5M8 6h13M8 12h13M8 18h13" /><path d="M1 5.5l1 1 2-2M1 11.5l1 1 2-2M1 17.5l1 1 2-2" /></G>,
  layoutGrid: (p: GlyphProps) => <G {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></G>,
  radio: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" /></G>,
  pause: (p: GlyphProps) => <G {...p}><rect x="7" y="5" width="3" height="14" rx="1" /><rect x="14" y="5" width="3" height="14" rx="1" /></G>,
} as const;

export type GlyphKey = keyof typeof I;

/** Map a market category to its sigil. Falls back to the markets glyph. */
const CATEGORY_GLYPH: Record<string, GlyphKey> = {
  sports: "football", football: "football",
  politics: "politics", macro: "economy", economy: "economy", forex: "forex",
  weather: "weather", crypto: "crypto",
  culture: "entertainment", entertainment: "entertainment", tech: "tech",
};
export function categoryGlyph(category: string): GlyphKey {
  return CATEGORY_GLYPH[category?.toLowerCase?.() ?? ""] ?? "markets";
}

```

=============================================================================
# APPENDIX B — KIT TOKENS  (kit50.css)
=============================================================================
```css
/* ============================================================
   50pick â€” production-matched tokens (from the live screenshot + kit README)
   Deep navy-indigo chrome Â· YES emerald (left) Â· NO rose (right)
   Â· gold = needle + payouts + resolved Â· teal-green chrome accent
   Hues locked. Dark is default.
   ============================================================ */
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  /* fonts */
  --font-display: 'Sora', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ---- surfaces (snapped 1:1 to production globals.css â€” royal indigo #060a50) ---- */
  --bg:           oklch(15% 0.130 268);
  --bg-elevated:  oklch(22% 0.140 268);
  --bg-elevated2: oklch(26% 0.150 268);
  --bg-inset:     oklch(11% 0.110 268);
  --bg-overlay:   oklch(11% 0.110 268);
  --bg-royal-soft:oklch(30% 0.165 268);
  --panel:        oklch(20% 0.130 268);
  --border:       oklch(34% 0.130 268);
  --border-strong:oklch(44% 0.150 268);
  --border-gold:  oklch(78% 0.13 80);

  /* ---- text (production values) ---- */
  --text:        oklch(98% 0.012 268);
  --text-muted:  oklch(86% 0.040 268);
  --text-subtle: oklch(70% 0.080 268);
  --text-faint:  oklch(60% 0.090 268);

  /* ---- YES emerald (hue 152) â€” production ---- */
  --yes-700: oklch(44% 0.14 152);
  --yes-600: oklch(52% 0.16 152);
  --yes-500: oklch(62% 0.17 152);
  --yes-400: oklch(72% 0.16 152);
  --yes-300: oklch(80% 0.14 152);
  --yes-soft: oklch(30% 0.075 152);

  /* ---- NO rose (hue 22) â€” production ---- */
  --no-700: oklch(44% 0.17 22);
  --no-600: oklch(52% 0.19 22);
  --no-500: oklch(62% 0.20 22);
  --no-400: oklch(72% 0.18 22);
  --no-300: oklch(80% 0.14 22);
  --no-soft: oklch(31% 0.105 22);

  /* ---- gold (hue 76â€“80) â€” production champagne ---- */
  --gold-600: oklch(64% 0.13 76);
  --gold-500: oklch(72% 0.14 78);
  --gold-400: oklch(80% 0.14 78);
  --gold-300: oklch(86% 0.13 80);
  --gold-200: oklch(90% 0.10 80);
  --gold-text: oklch(20% 0.05 80);
  --gold-soft: oklch(34% 0.075 78);

  /* ---- aqua chrome accent (VIEW ALL, live label, links, focus) â€” matches globals.css aqua-* ---- */
  --accent-600: oklch(52% 0.100 195);
  --accent-500: oklch(62% 0.110 195);
  --accent-400: oklch(72% 0.110 195);
  --accent-soft: oklch(32% 0.070 195);

  /* ---- BRAND BLUE â€” soon chip, focus ring, card-hover glow, info ---- */
  --brand-600: oklch(54% 0.165 262);
  --brand-500: oklch(63% 0.180 262);
  --brand-400: oklch(72% 0.160 262);
  --brand-300: oklch(82% 0.120 262);
  --brand-soft: oklch(34% 0.120 262);

  /* ---- live indicator (red, per globals .live-dot) ---- */
  --live-400: oklch(64% 0.20 25);

  /* ---- info / soon (brand blue) ---- */
  --soon-400: var(--brand-400);
  --soon-soft: var(--brand-soft);

  /* ---- radius (kit scale) ---- */
  --r-xs: 4px; --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 24px; --r-pill: 999px;

  /* ---- motion (kit easings) ---- */
  --ease-micro: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-stage: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-celebrate: cubic-bezier(0.2, 0.8, 0.2, 1);

  /* ---- Official type scale (QA #6) â€” components snap to these ---- */
  --t-9: 9px; --t-10: 10px; --t-11: 11px; --t-12: 12px; --t-13: 13px; --t-14: 14px;
  --t-16: 16px; --t-18: 18px; --t-20: 20px; --t-24: 24px; --t-26: 26px; --t-30: 30px; --t-34: 34px; --t-44: 44px;
  /* ---- Spacing grid (QA #7) â€” 4px base ---- */
  --sp-2: 2px; --sp-4: 4px; --sp-6: 6px; --sp-8: 8px; --sp-10: 10px; --sp-12: 12px; --sp-14: 14px; --sp-16: 16px; --sp-20: 20px; --sp-24: 24px; --sp-32: 32px; --sp-40: 40px; --sp-48: 48px; --sp-64: 64px;
  /* ---- Radius aliases (QA #18) ---- */
  --r-phone: 30px;
}

* { box-sizing: border-box; }
/* subtle film grain on every screen surface (â‰ˆ1.5%) â€” adds depth vs flat fills */
.kit-screen { position: relative; }
.kit-screen::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNDAnIGhlaWdodD0nMTQwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC44NScgbnVtT2N0YXZlcz0nMicgc3RpdGNoVGlsZXM9J3N0aXRjaCcvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPScxNDAnIGhlaWdodD0nMTQwJyBmaWx0ZXI9J3VybCgjbiknLz48L3N2Zz4=");
}
.kit-screen > * { position: relative; z-index: 1; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.disp { font-family: var(--font-display); letter-spacing: -0.02em; }
.body { font-family: var(--font-body); }

/* hide scrollbars inside artboards */
.kit-screen *::-webkit-scrollbar { display: none; }
.kit-screen * { scrollbar-width: none; }

/* custom scroller (opt-in via .ds-scroll) */
.ds-scroll { scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent; }
.ds-scroll::-webkit-scrollbar { display: block; width: 8px; }
.ds-scroll::-webkit-scrollbar-track { background: var(--bg-inset); border-radius: 999px; }
.ds-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 999px; }
.ds-scroll:hover::-webkit-scrollbar-thumb { background: var(--brand-500); }

@keyframes lpulse { 0%,100% { opacity: 0.5; box-shadow: 0 0 0 0 currentColor; } 50% { opacity: 1; box-shadow: 0 0 6px 1px currentColor; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes goldShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes barReveal { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes typing { 0%,60%,100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-4px); opacity: 1; } }
@keyframes lightSweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }
@keyframes routeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.route-in { animation: routeIn 0.32s var(--ease-stage) both; }
@keyframes cardRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.stagger-grid > * { animation: cardRise 0.44s var(--ease-stage) both; }
.stagger-grid > *:nth-child(1) { animation-delay: 0.04s; } .stagger-grid > *:nth-child(2) { animation-delay: 0.09s; }
.stagger-grid > *:nth-child(3) { animation-delay: 0.14s; } .stagger-grid > *:nth-child(4) { animation-delay: 0.19s; }
.stagger-grid > *:nth-child(5) { animation-delay: 0.24s; } .stagger-grid > *:nth-child(6) { animation-delay: 0.29s; }
.stagger-grid > *:nth-child(n+7) { animation-delay: 0.33s; }
/* focus-visible â€” keyboard accessibility on every interactive element (QA #4) */
:where(button, a, input, textarea, select, summary, [role="button"], [role="checkbox"], [tabindex]:not([tabindex="-1"])):focus-visible {
  outline: 2px solid var(--accent-400); outline-offset: 2px; border-radius: 3px;
}
@keyframes edgePulse { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 1; } 50% { transform: translate(-50%,-50%) scale(1.25); opacity: 0.7; } }
@keyframes pop { 0% { transform: scale(0.92); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes tickerUp { 0% { transform: translateY(16px); opacity: 0; } 12% { transform: translateY(0); opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(-16px); opacity: 0; } }
@keyframes dotBounce { 0%,80%,100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-6px); opacity: 1; } }
@keyframes barSlide { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes liftIn { from { transform: translateY(6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
@keyframes hcDrift { 0% { transform: translate3d(0, 14vh, 0); } 100% { transform: translate3d(0, -120%, 0); } }
@keyframes hcVerdictIn { 0% { opacity: 0; transform: translateX(18px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes aquaPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes hotPulse { 0%,100% { box-shadow: 0 0 0 0 oklch(80% 0.13 80 / 0); } 50% { box-shadow: 0 0 7px 0 oklch(80% 0.13 80 / 0.4); } }

/* ---- Motion level (reviewer #8): full | reduced | minimal ----
   Default --motion-level:full. Host sets data-motion on <html> to throttle
   looping decorative motion on mid-tier devices / battery saver.
   reduced = kill ambient loops (sweep, flicker, shimmer, breathe) but keep
   functional transitions. minimal = collapse essentially everything. */
:root { --motion-level: full; }
[data-motion="reduced"] [style*="lightSweep"],
[data-motion="reduced"] [style*="goldShimmer"], [data-motion="reduced"] [style*="shimmer"],
[data-motion="reduced"] [style*="edgePulse"], [data-motion="reduced"] [style*="barSlide"],
[data-motion="reduced"] [style*="csrf-breathe"], [data-motion="reduced"] [style*="aqua-pulse"] { animation: none !important; }
[data-motion="minimal"] *, [data-motion="minimal"] *::before, [data-motion="minimal"] *::after {
  animation: none !important; transition-duration: .001ms !important;
}

```

=============================================================================
# APPENDIX C — DEVELOPER REFERENCE (components + invariants)
=============================================================================
# 50pick â€” Design System Â· Developer Reference

> One-time reference for replacing the old kit. Dark is default. Palette, components,
> conviction dial, copy and YES/NO semantics are **preserved identically**; the refresh
> lives only in surface detail, button consistency, motion and micro-interactions.

Open **`Design System.html`** to see every specimen on one canvas. Source lives in the
files listed under *File map*. Tokens are the source of truth â€” recreate them 1:1.

---

## Hard invariants (never violate)
1. **YES = green, LEFT. NO = rose-red, RIGHT.** Every binary control, bar, button pair.
2. **Gold is sacred** â€” resolved-winner moments + the confirm-payout button only. Never a generic accent.
3. **Brand blue = chrome** (canvas, primary CTA, links, focus, active, "Soon" chip, card-hover frame).
4. **Green chrome accent** = live label, "VIEW ALL", section links.
5. **Mono numbers** â€” JetBrains Mono, tabular, for every amount / %, / time / stat.
6. **Pool-share copy** â€” "stake", "share of the pool", "if you're right". Never "guaranteed / risk-free / easy money".
7. **No casino imagery** â€” no confetti, chips, dice, slot reels.
8. **+30% string tolerance** (Swahili/French run longer). 44px min hit target. WCAG AA.

---

## Tokens (`kit50.css`) â€” source of truth

### Color (OKLCH)
| Token | Value | Role |
|---|---|---|
| `--bg` | `oklch(16.5% 0.092 264)` | vivid royal-navy canvas |
| `--bg-elevated` | `oklch(20% 0.090 264)` | cards |
| `--bg-elevated2` | `oklch(23.5% 0.092 264)` | raised |
| `--bg-inset` | `oklch(13% 0.080 264)` | tracks, inputs |
| `--panel` | `oklch(18.5% 0.090 264)` | nav, bands |
| `--border` | `oklch(39% 0.095 264)` | hairline (blue) |
| `--border-strong` | `oklch(50% 0.105 264)` | emphasis |
| `--brand-{600..300}` | hue 262 | blue chrome / focus / soon / hover frame |
| `--accent-{600..400}` | hue 195 | aqua chrome (VIEW ALL, links, live label) |
| `--yes-{700..300}` | hue 150 | YES, gains |
| `--no-{700..300}` | hue 25 | NO, losses |
| `--gold-{600..300}` | hue 84 | resolved + payout + needle only |
| `--live-400` | `oklch(64% 0.20 25)` | live label + pulse dot (red) |
| `--text / -muted / -subtle / -faint` | hue 264 | text ramp |

### Type
Sora 600/700 (display) Â· Inter 400â€“700 (body, Latin+Swahili+French) Â· JetBrains Mono 400â€“600 (numbers, `tabular-nums`).
Scale (px): display-1 44 Â· h1 34 Â· h2 26 Â· h3 20 Â· h4 17 Â· body 15 Â· small 13 Â· micro 11.

### Spacing  `--sp-*`: 4 8 12 16 20 24 32 40 48 64
### Radius  `--r-xs 4 Â· sm 6 Â· md 10 Â· lg 14 Â· xl 20 Â· pill 999` (buttons use 8)

### Motion
| Easing | Curve | Duration | Use |
|---|---|---|---|
| `--ease-micro` | cubic-bezier(.2,.8,.2,1) | 100ms | hover, press, focus |
| `--ease-stage` | cubic-bezier(.4,0,.2,1) | 240ms | sheets, modals, bar reveal |
| `--ease-celebrate` | cubic-bezier(.2,.8,.2,1) | 600ms | resolve, payout reveal |

Loops: `live-pulse` 1.5s Â· `goldShimmer` 1.6s (resolved bar) Â· `shimmer` 1.4s (skeleton) Â·
`spin` .7s (spinner) Â· `dotBounce` 1.1s Â· `barSlide` 1.2s. All collapse to instant under
`prefers-reduced-motion: reduce`.

---

## Haptics (mobile)
| Pattern | Vibration | Trigger |
|---|---|---|
| Light | `10` | side select Â· quick-chip Â· toggle Â· tab |
| Medium | `20` | confirm pressed Â· sheet open |
| Success | `[10,40,10]` | prediction placed Â· payout received |
| Warning | `[30,30]` | reality-check Â· objection window < 1h |

`navigator.vibrate(pattern)` â€” guard with a feature check; never block UI on it.

---

## Components & states

### Button (one flat-solid family) â€” `kit50.jsx â†’ Btn`, `SideButton`
- Radius 8. Sizes: sm 30 Â· md 38/44 Â· lg 46/50 Â· xl 56. **â‰¥44px on mobile.**
- Filled (`yes` green / `no` rose / `gold`): solid fill, inset 1px top highlight.
  - hover â†’ `brightness(1.07)` + `translateY(-1px)` + soft same-hue glow
  - press â†’ `translateY(1px)` + `brightness(0.93)` + inset shadow
- Chrome (`primary` green tint / `ghost` / `outline`): same radius + motion.
- States: rest Â· hover Â· press Â· `disabled` (opacity .45) Â· `loading` (spinner replaces leading icon).
- **SideButton** = bold side label + inline mono price (no chip). Faithful to live platform.

### Conviction dial (the "dial") â€” `ds-charts.jsx`
- `ConvictionSlider` â€” draggable; gold round handle on a green fill, dark track. Mouse + touch. Clamped 1â€“99.
- `ConvictionDial` â€” 270Â° radial gauge; green arc + gold needle + mono value (shows `64%` and price `0.64`).

### Probability / conviction bar â€” `kit50.jsx â†’ ConvictionBar` (single source of truth)
**One component, two names.** `ProbabilityBar` is now an alias of `ConvictionBar` â€” both resolve to the same function, so existing call-sites keep working. Always reads YES + NO: emerald YES fill from the left, rose NO fill on the right, **gold needle at the boundary**.
- Props: `yes` (0â€“100) Â· `h` (exact px height) **or** `size` `micro`(12)/`large`(24) Â· `variant` `split`(default)/`segmented`/`minimal`/`resolved` Â· `resolved` (bool â†’ gold shimmer) Â· `needle` (bool, default true) Â· `reveal`/`animate` (entrance).
- `large` shows inline `YES 64` / `36 NO` labels. `minimal` is the only needle-less, single-fill variant (dense lists).
- Built-in `role="progressbar"`, `aria-valuenow`, `aria-label="YES x% Â· NO y%"`.

### Balance privacy â€” `kit50.jsx â†’ Cash` / `CashEye` (global toggle)
One eye masks **every** personal balance at once (banking-app pattern). State lives on `window.__cashHidden` + a `cash-privacy` event so independent React roots on the canvas stay in sync.
- `<Cash style={â€¦}>TZS 84,200</Cash>` â€” renders the amount, or masks the numeric part to `TZS â€¢â€¢â€¢â€¢â€¢` when hidden (sign + currency prefix preserved so layout rhythm holds).
- `<CashEye />` â€” boxed 28px toggle; `<CashEye bare size={14} />` â€” borderless inline variant for tight spots (e.g. the nav balance pill).
- `useCashHidden()` hook + `setCashHidden(bool)` for programmatic control.
- Applied to: TopNav balance pill, Wallet (balance / in-play / lifetime / transactions), Position cards (stake / value / P&L). Market pool sizes, buy-tray stake and payout lines are intentionally **not** masked â€” they're flow figures, not the user's balance.

### Loaders â€” `ds-atoms2.jsx`
`Spinner` Â· `DotsLoader` Â· `BarLoader` Â· `RingProgress` Â· `Skeleton` / `SkeletonCard`.

### Others
`Switch` Â· `Checkbox` Â· `Radio` Â· `Select` Â· `Stepper` Â· `textarea` (`ds-forms.jsx`) Â· `Chip` (live/hot/soon/resolved/yes/no/cat) Â· `Input` / `OtpBoxes` Â· `Avatar` + `TierBadge` (bronze/silver/gold/diamond) Â· `ProgressBar` (tones) / `SteppedProgress` Â· `Tooltip` Â· `Toast` (success/gold/info) Â· `MarketCard` Â· `BuyTray` Â· `PositionCard` Â· `LeaderboardRow` Â· `ResolutionPanel` Â· `WinCelebration` / Loss Â· nav (`TopNav` 56 / `BottomNav` 64 / `LiveTicker` 32 / `Tabs` / `Segmented`).

### Betting dial (MAIN FEATURE) â€” `ds-betting.jsx`
Kept, refined. Drag the conviction needle to set your side + price; **stake stays, payout updates live**.
Adjustments vs. old: gold round handle, value bubble on drag, snap haptic (`navigator.vibrate(4)`),
grab cursor, 24px touch target, scale-up + ring on active. YES left/green, NO right/rose, gold needle.
- `BetDial` â€” full in-context panel (title â†’ dial â†’ YES/NO % â†’ stake â†’ live payout â†’ YES/NO).
- `BetDialRound` â€” draggable radial gauge for tight layouts.
- `ConvictionBar` â€” read-only fill + needle (in cards).

### Text & legal clauses â€” `ds-forms.jsx â†’ TextClauses`
Standing RG/resolution clauses (pool-share, outcome risk, two-officer, objection window, 18+) in EN + Swahili. Never promissory.

### Scroller â€” `.ds-scroll` (kit50.css)
8px thumb, `--border-strong` â†’ `--brand-500` on hover; track `--bg-inset`. Momentum on touch.

### Card hover (locked: blue)
`translateY(-3px)` + `--brand-500` border + soft blue glow, 200ms `--ease-stage`. Gold reserved for win/payout.

---

## File map
```
kit50.css          tokens + keyframes (source of truth)
kit50.jsx          Icon set (+ play, eye/eyeOff, chevrons, warningâ€¦), Chip, ConvictionBar (= ProbabilityBar), Cash/CashEye, SideButton/SidePair, Btn, RollNum, MovePill, LiveDot, TIERC/TIER_GLYPH
ds-brand-nav.jsx   Logo, Wordmark, TopNav, BottomNav, LiveTicker, Tabs, Segmented
ds-charts.jsx      ProbabilityChart, Sparkline, PoolDepth, ConvictionSlider, ConvictionDial
ds-atoms2.jsx      loaders, Input/OtpBoxes, Avatar(+tier glyph)/TierBadge, ProgressBar/Stepped, Tooltip, ProbabilityBar (alias â†’ kit50 ConvictionBar), Skeleton
ds-foundations.jsx foundation specimens + Patterns (betslip, KYC, reality check, empty)
ds-showcase.jsx    Loaders/Atoms/Charts/Nav specimen boards
ds-forms.jsx       Switch/Checkbox/Radio/Select/Stepper, FormsBoard, TextClauses, Scroller
ds-betting.jsx     BetDial (main feature), BetDialRound, BettingDialBoard
features.jsx       MarketCard, PickASide, ButtonShowcase, BuyTray, PositionsLeaderboard, ResolutionPanel, WinLoss, HoverCompare
Design System.html assembles all sections on the canvas
```

These JSX files are **design references** (Babel-in-browser). Re-implement in the host stack
(React+Tailwind / Next, etc.) using the tokens above as the contract â€” don't ship Babel-in-browser.


=============================================================================
# APPENDIX D — THEME & COMPONENTS SPEC
=============================================================================
# 50pick â€” Theme & Components Spec (for design review)

> A plain-language walkthrough of how the design system is built: the palette,
> the **fade / opacity levels**, surfaces, motion, and how each component is
> constructed. Share with the designer â€” there's an **Approve / Change** checklist
> at the end. Nothing here changes the locked palette; it documents how we use it.

---

## 1. Philosophy
- **Royal-navy canvas, gilt for the moments that matter.** Deep indigo-blue surfaces; gold (gilt) is *earned* â€” reserved for resolved wins, the confirm-payout button, the conviction needle, and unlocked achievements. It never becomes a generic accent.
- **Green = YES + "working toward it."** Emerald is the YES side, gains, live progress, and in-progress states (energized glow). **Rose = NO + losses.**
- **Numbers are sacred.** Every amount / %, / time / score is JetBrains Mono, tabular figures.
- **Calm, never a casino.** No confetti/chips/dice. Celebration = one gilt ray + a rolling counter. Warnings are calm, bilingual, never alarmist.

---

## 2. Palette & fade levels

### Hues (locked)
| Role | Hue | Notes |
|---|---|---|
| Royal chrome / surfaces | ~264â€“268 | canvas, cards, nav |
| Brand blue (CTA, links, focus) | ~262 | the "blue" |
| Gilt / gold (earned only) | 80â€“84 | resolved, payout, needle, unlocked |
| YES / gain / progress | 150â€“152 | emerald |
| NO / loss | 22â€“25 | rose |
| Aqua patina (atmosphere) | 195 | hero particles only â€” never gilt |

### Fade / opacity ladder (how we build depth)
We lean on **alpha**, not new colors, to create hierarchy:
- **Surface fills:** page â†’ elevated (cards) â†’ elevated2 (raised) â†’ inset (tracks/inputs). Each is a lightness step on the royal hue, fully opaque.
- **Borders:** hairline `border` (~0.0â€“1 solid royal) â†’ `border-strong` for emphasis. On gilt/colored surfaces we use the accent at **28â€“45% alpha** (e.g. `oklch(78% 0.13 80 / 0.35)`).
- **Glows:** soft same-hue shadow at **10â€“28% alpha**, blur 16â€“34px. Hover roughly **doubles** the alpha + blur.
- **Text ladder:** text (96% L) â†’ muted (~73%) â†’ subtle (~58%) â†’ faint (~48%). Used for primary â†’ caption â†’ meta â†’ disabled.
- **Disabled / locked:** **opacity 0.8** on the whole card, glyph at ~52% L, plus a small lock pip â€” *not* greyscale (greyscale read "cheap").
- **Glass (where used):** fill alpha **0.55â€“0.65**, `backdrop-blur 16px`, 1px gradient hairline at ~10â€“45% alpha.

---

## 3. Surfaces & elevation
Two real elevations, kept restrained:
- **Rest:** card fill + 1px hairline + a 1px inset top-highlight (`oklch(98% .. / 0.10)`) + soft 2â€“8px shadow.
- **Raised / hover:** brand-blue border + deeper 14â€“34px shadow + (for market cards) a 3px lift. Gilt-bloom hover is reserved for market cards specifically.

Radius scale: xs 4 Â· sm 6 Â· md 10 Â· lg 14 Â· xl 20 Â· pill 999. Buttons use 8â€“10.

---

## 4. Motion & haptics
| Easing | Curve | Duration | Use |
|---|---|---|---|
| micro | (.2,.8,.2,1) | 100ms | hover / press / focus |
| stage | (.4,0,.2,1) | 240ms | sheets, modals, bar reveal |
| celebrate | (.2,.8,.2,1) | 600ms | resolve / payout |

Signature loops: **light-sweep** across progress fills, **edge-pulse** on the bar's leading node, **gold shimmer** on resolved bars, **news flicker** beacon, **breathe** on the dial at rest. All collapse to instant under `prefers-reduced-motion`.
Haptics: light (10ms) select Â· medium (20ms) confirm/sheet Â· success [10,40,10] placed/paid Â· warning [30,30] reality-check.

---

## 5. How key components are built

- **Conviction dial (signature, unchanged):** one drag sets *side + stake-multiplier* (1Ã—â†’5Ã—, quadratic ease). Neutral at center (genuine grey, breathing ring). Gold knob/needle; numbers roll. Linear + round (squircle) variants. **This is the production component â€” ship as-is.**
- **Buttons:** one flat-solid family, radius 8. Filled (YES green / NO rose / gold) with a 1px top inset-highlight; hover = brightness +7% + 1px lift + same-hue glow; press = 1px down + brightness âˆ’7% + inset shadow. Chrome variants (blue primary / ghost / outline) share the motion.
- **Probability bar:** YES-left emerald / NO-right rose split, gradient fills, animated from 50%, with a **glowing gold boundary needle** (ties to the dial). Variants: split / segmented / minimal / resolved (gold shimmer).
- **Progress bars:** energized gradient fill + outer glow + a **traveling light sweep** + a pulsing leading-edge node; hover intensifies glow & speeds the sweep. Tones: teal/yes/no/gold/blue.
- **Market card:** glass-royal panel; hover = blue border + lift + soft gilt bloom.
- **Achievements & score:** gilt **medallion** (gilt ring + royal radial field + line-art glyph) for **earned**; **in-progress = green glowing ring + green progress bar** (consistent with the bars â€” *not* gilt); **locked = dim royal + lock pip**, opacity 0.8. Score hero = tier medallion + rolling points + rank/percentile + next-tier ring.
- **States:** every surface has empty / loading (skeleton + sweep) / error+retry / offline. Warnings: reality-check, limits, cooling-off, high-stake, low-balance.
- **Chrome:** top nav 56px, mobile bottom nav 64px, news marquee (gold flicker beacon), live ticker (red pulse), AI assistant panel.

---

## 6. Decisions to approve / change

Please mark each **Approve** or **Change** and add notes:

1. **Gilt budget** â€” gold only for earned/resolved/payout/needle; in-progress is green. â˜ Approve â˜ Change
2. **Locked styling** â€” dim + lock pip at opacity 0.8 (not greyscale). â˜ Approve â˜ Change
3. **Probability bar gold boundary needle** â€” ties to the dial; acceptable use of gold? â˜ Approve â˜ Change
4. **Progress bar light-sweep** â€” keep the animated streak, or calmer? â˜ Approve â˜ Change
5. **Brand blue vs royal hue** â€” current chrome hue. Match exactly to production token? â˜ Approve â˜ Change
6. **Achievement set** â€” 10 achievements + names/Swahili/rarity. Add/remove any? â˜ Approve â˜ Change
7. **Score model** â€” points + tiers (Bronzeâ†’Diamond) + percentile. Correct for launch? â˜ Approve â˜ Change
8. **Motion intensity** â€” glows/sweeps at current levels, or dial down for mid-tier Android? â˜ Approve â˜ Change

> Open question for the designer: do you want **light mode** specced now, and should the **HeroConstellation** landing be the canonical hero? Both are ready to build on approval.

---

## 7. Review responses (round 1)

Applied from the design-team review:
- **#8 Motion intensity â†’ done.** Added `--motion-level: full | reduced | minimal` on `:root`, driven by a `data-motion` attribute on `<html>`: `reduced` kills ambient loops (light-sweep, flicker, shimmer, breathe, edge-pulse) but keeps functional transitions; `minimal` collapses essentially everything. Pair with battery-saver / low-power detection on mid-tier Android.
- **#4 Progress sweep â†’ done (caveat satisfied).** The light-sweep now respects both `prefers-reduced-motion` and `data-motion`.
- **TopNav wallet balance â†’ done.** Re-added an always-visible gilt balance pill (`TZS â€¦` + quick top-up `+`) before the bell â€” important for a betting platform.

**Still needs your call â€” #5 Brand hue (we did NOT change this unilaterally):**
The reviewer recommends unifying chrome + surfaces at **hue 268** and using **262 only for focus/links**. Earlier in this engagement the product owner explicitly asked to move the accent toward **blue** (away from the violet that 268 reads as), which is why surfaces sit near 264 and brand near 262 today. These two directions conflict. **Please confirm one:**
- (a) Unify at 268 (royal indigo, per review #5), 262 only for focus/links, or
- (b) Keep the current blue-leaning split (owner's earlier preference).
It's a one-line token change either way â€” we just need the tie broken.

**Resolved:** product owner chose **(b) keep the current blue-leaning split** (surfaces ~264, brand ~262). No change required.


