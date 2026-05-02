# Design System Requirements — Kipindi (working name)

**To:** Claude Design
**From:** Engineering / Build side
**Project:** Licensed pool-based time-window sports betting platform, Tanzania-first, expanding across Africa.
**Stack the design must implement against:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + Prisma + Postgres. Mobile-first.
**Goal of this document:** Give Claude Design the complete list of artifacts and specifications I need so I can build without ambiguity. Deliver everything below as a single canonical `DESIGN_SYSTEM.md` file plus a machine-readable `tokens.json`.

---

## 1. Project Context (read first)

- **Brand working name:** Kipindi (Swahili: "a period of time"). Open to renaming.
- **License:** Tanzania gaming license obtained. Pool model may need legal reclassification — design must not make commitments to a particular regulatory category (avoid using the words "lottery" or "casino" in UI).
- **Core mechanic:** users bet on time-windows of football matches (0–15, 15–30, 30–45, 45–60, full match) with a simple win/lose/draw outcome. Pool-based payouts.
- **Target user:** mobile-first, Swahili and English speakers, often on slow connections and budget Android devices, sometimes paying for data by the megabyte.
- **Competitors to differentiate against:** SportPesa, Betway, M-Bet, 1XBet. Design must feel *premium and calm* in a market dominated by loud yellow/red shouting.
- **Visual identity direction:** Royal Blue + muted Gold + White, with deep navy in dark mode. Clean, premium, geometric. African identity expressed through abstracted geometric patterns inspired by Maasai bead structure / Kente weave — never literal tribal motifs, never acacia trees, never sunsets.
- **Tone:** confident, calm, fair. Never desperate. Never CAPS-shouting.

---

## 2. Deliverable — what Claude Design must produce

Deliver one comprehensive `DESIGN_SYSTEM.md` file with the sections below, plus `tokens.json` with all design tokens in a machine-readable format. Every section listed below must be present.

### 2.1 Brand Foundation
- Final naming recommendation (with rationale)
- Tagline options (3)
- Voice and tone guide with concrete do/don't examples in English AND Swahili
- Logo system spec: primary mark, wordmark, monogram, app icon (iOS + Android), favicon, social avatar, Open Graph image template. Provide construction grid, clear-space, minimum sizes, color variants, and incorrect-usage examples. SVG-ready specs.
- Brand pattern library (3 abstract patterns based on Maasai/Kente structure, used as backgrounds/dividers)

### 2.2 Color System (light + dark)
For both modes, deliver every token below with hex value and intended usage:

- **Background:** base, subtle, sunken, elevated, overlay
- **Surface:** default, hover, pressed, selected, disabled
- **Border:** default, subtle, strong, focus, divider
- **Text:** primary, secondary, tertiary, disabled, inverse, link, link-hover, on-brand
- **Brand Primary (Royal Blue):** default, hover, active, foreground, subtle, subtle-hover
- **Brand Accent (Gold):** default, hover, active, foreground, subtle, subtle-hover
- **Semantic:** success (default + bg + border + foreground), warning, danger, info — same four sub-tokens each
- **Betting domain tokens:** win, lose, draw, pool, stake, jackpot, streak, hot, cold
- **Glow tokens (dark mode signature):** gold-glow, blue-glow, win-glow, jackpot-glow — full box-shadow values
- **Gradients (named):** brand-hero, gold-rush, jackpot, streak-aurora, pool-pulse — full CSS gradient strings
- **Opacity scale:** 0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100

Format: deliver as Tailwind-compatible config object AND CSS custom properties AND tokens.json.

### 2.3 Typography
- Font stack recommendations (display, body, mono) with fallbacks. Confirm Swahili diacritic support.
- Type scale: 12 sizes (micro through display-1) with size, line-height, letter-spacing, recommended weight per use.
- Weight scale: which weights to load, which never to use, why.
- Number rendering rules (tabular figures for currency, lining figures, monospace for IDs/refs).
- Hierarchy patterns: page title, section title, card title, label, body, caption, micro — with examples.
- Multilingual type rules (Swahili sentence length tends to be 15–20% longer than English — provide guidance for buttons and labels).

### 2.4 Spacing, Sizing, Radii, Shadows
- Spacing scale (4px base, list every step)
- Sizing tokens (icon sm/md/lg/xl, avatar xs/sm/md/lg/xl, button heights sm/md/lg/xl)
- Radii scale with per-component recommendations
- Shadow / elevation scale (5 levels) for both light and dark mode
- Z-index scale (named, not arbitrary numbers)
- Container widths and breakpoints

### 2.5 Motion
- Named easing curves with cubic-bezier values and intended use
- Duration scale (instant, micro, short, medium, long, celebration)
- Animation pattern library: slide-up, fade-in, scale-in, pulse, shimmer, ripple, success-burst, win-celebration, loss-echo, count-up, flip-clock, slider-coin-flow, pool-pulse, streak-aurora — for each: duration, easing, what changes, when to use, reduced-motion fallback

### 2.6 Iconography
- Style spec (stroke width, grid size, terminus style, corner radius)
- Sizes (16, 20, 24, 32, 48)
- Two states (outline default, filled active) — rules for when to swap
- Complete icon list for the platform (target ~80 icons), grouped:
  - Navigation, Actions, Betting, Sports (football-specific), Payment (incl. each TZ mobile money brand), Status, Mini-game, Admin/compliance
- Naming convention for the icon component API

### 2.7 Illustration & Imagery
- Illustration style direction (abstract geometric, not literal)
- Empty-state illustration list (10 named states, e.g. no-bets-yet, wallet-empty, kyc-pending, no-live-matches, etc.)
- Hero illustration spec for marketing/onboarding
- Faction art for "Tribal Clash" mini-game: 8 abstract factions, each with name, color, geometric motif description
- Photography rules (locally shot in Tanzania, no stock, brief on subject matter)

### 2.8 Sound & Haptics
- Sound palette (5 sounds: tap, success, win, error, alert) with target waveform character
- Haptic patterns (5 patterns, short codes for each event: tap, slider-tick, success, win-celebration, error)
- Defaults (mute on by default? respect system?)

### 2.9 Components — Atoms
Spec each with: visual variants × sizes × all states (default, hover, focus, active, disabled, loading, error). Include props/API names for engineering implementation, anatomy, padding/spacing, border, radius, typography, color tokens used, accessibility (aria roles, keyboard behavior).

Atoms required:
- Button (primary, secondary, ghost, danger, gold-accent — 4 sizes)
- Icon Button
- Input (text, number, currency-TZS, search, password, OTP)
- Textarea
- Select / native-replacement Dropdown
- Combobox (searchable)
- Multi-select
- Checkbox
- Radio
- Switch
- Slider (basic)
- Tag / Chip / Pill
- Badge / Counter
- Avatar (with status indicator)
- Skeleton
- Spinner / Progress (linear + circular)
- Divider
- Kbd (keyboard hint)
- Link

### 2.10 Components — Molecules
- Form Field wrapper (label + input + helper + error)
- Money Input (TZS prefix, thousands separator, max-decimal rules)
- OTP Input (6 digits, paste support, auto-advance)
- Phone Input (TZ +255 default, country selector, validation)
- Date Picker
- Time Range Picker
- File Uploader (KYC documents — front, back, selfie)
- Search Bar (global, with recent searches)
- Card (3 elevations, with header/body/footer slots)
- Tooltip
- Popover
- Notification Toast (4 variants × auto-dismiss × swipe-to-dismiss)
- Alert (inline)
- Banner (page-level)
- Tabs (3 variants: line, segmented, pill)
- Accordion
- Pagination
- Breadcrumb
- Stepper (horizontal + vertical, for multi-step flows)

### 2.11 Components — Organisms
- Top App Bar (mobile + desktop variants)
- Bottom Nav (mobile, exactly 4 items: Home, Live, My Bets, Wallet, plus center FAB for "Quick Bet")
- Sidebar (desktop, collapsible)
- Drawer / Sheet (left, right, bottom — bet slip uses bottom on mobile)
- Modal
- Command Palette (cmd+k, desktop power-user feature)
- Data Table (sortable, paginated, dense + comfortable)
- Empty State
- Error State (network error, 404, 500, geo-blocked, KYC-blocked)
- Loading State (skeleton-first, never blank)
- Footer

### 2.12 Components — Betting-Specific (HIGHEST PRIORITY)
Spec each with full anatomy, all states, and motion behavior. These are the differentiators.

- **StakeSlider** — gold fill, animated coin flow on drag, snap points, live return estimator, locked state, haptic ticks, min/max indicators, accessibility (keyboard arrow steps).
- **MatchCard** — two team badges with tilt-parallax, live score with flip-clock animation on goal, momentum bar between teams, 5-chip time-window selector below, status indicator (pre-match / live / finished).
- **TimeWindowSelector** — 5 chips, gold underline on selected (never gold fill), disabled when window has expired, tooltip showing historical pay rate.
- **OddsCard** — three buttons (Win / Draw / Lose) with stake hint, current pool size, your stake highlight if already placed.
- **PoolDisplay** — animated counter that counts up only, donut showing your share, "if you win" estimator, particle burst at round-number milestones.
- **PoolPulseRing** (signature) — outer ring around pool number that pulses in sync with match momentum (literal heartbeat tied to live event frequency). Calm = slow breathing, goal scored = sharp pulse. **No competitor has this.**
- **BetSlip** — bottom drawer (mobile) / right drawer (desktop), legs are draggable cards, risk meter gradient bar, total stake, total potential return, place-bet CTA with confirmation.
- **BundleBuilder** — multi-leg bet creation, correlation warnings, bonus multiplier display.
- **BetLeg** — single bet within a slip (team, window, outcome, stake, status).
- **TeamBadge** — circular badge with subtle shine, tilt-parallax on mobile, focus state for keyboard users.
- **MomentumBar** — horizontal bar between two teams, shifts based on shots/possession in last 5 min, animated.
- **LiveScore** — flip-clock animation on score change, subtle gold flash on goal.
- **ResultChip** — W / L / D pills with semantic color, used in history.
- **LeaderboardRow** — rank, avatar, name, win rate, ROI, streak indicator, follow button.
- **StreakIndicator** — flame icon + count, with gold tint that intensifies with streak length.
- **WinCelebration** — full-screen overlay, gold particles (max 60, perf-budgeted), pool share visualization, share button. Disable in reduced-motion.
- **LossEcho** — subtle, dignified loss feedback. Never red explosion. Calm dissolve. Includes constructive copy ("the pool grows").
- **CashoutButton** — pulse animation when value rises, locked state when not allowed.
- **HeatmapTile** — used in "Time Window Heatmap" — color-coded grid showing historical pay rates per fixture per window.
- **WalletCard** — balance, pending, hold; deposit + withdraw buttons; recent activity preview.
- **TransactionRow** — type icon, amount, status, timestamp, expandable for details.
- **KYCStatusBanner** — top-of-app banner showing verification state and CTA to complete.
- **ResponsibleGamblingTimer** — session length indicator, optional reality-check breaks.

### 2.13 Components — Mini-Games
- **TribalClashFaction** card visual spec for all 8 factions
- **LuckyIntervalSpinner** — radial time-window picker with reveal animation
- **MomentumRushBar** — vertical surge bar, 5-minute cycles
- **PredictionStreakChain** — visual chain of predictions, gold link added per correct call
- **VoiceBetMic** — microphone button with waveform visualization, Swahili wake-state

### 2.14 Page Templates
Deliver layout spec + content hierarchy for each. Mobile + desktop. Light + dark.

- Home / Lobby
- Live Matches
- Match Detail
- Bet Slip (full screen on mobile, drawer on desktop)
- My Bets (active, settled, all)
- Wallet (balance, deposit, withdraw, history)
- Deposit flow (mobile money, card)
- Withdrawal flow (with AML threshold UX)
- Profile
- KYC flow (multi-step wizard)
- Responsible Gambling Settings
- Leaderboard
- Mini-Games Hub
- Each Mini-Game (5 separate templates)
- Auth: Login, Register, OTP, Forgot Password
- Help / Support / Live Chat
- Terms, Privacy, Compliance pages
- Admin Dashboard (separate visual treatment, denser, more data-forward)
- Admin: Users, KYC Queue, Transactions, Bets, Audit Log, Anti-Fraud Flags, Match Integrity

### 2.15 Flow Specifications
Step-by-step screen flows with happy path + error states for each:
- Onboarding + first deposit
- Login (phone + OTP)
- KYC (NIDA verification + document upload + selfie + verification pending)
- Place a single bet
- Place a bundle bet
- Cash-out an active bet
- Deposit (each mobile money provider + card)
- Withdrawal (with AML hold UX)
- Win celebration → optional share
- Loss feedback
- Self-exclusion / take-a-break
- Report a problem / dispute a bet

### 2.16 Notifications & Comms
- In-app toast templates (per event)
- Push notification templates (per event, character limits respected)
- SMS templates — provide ~20 templates in **English AND Swahili**:
  - Welcome, OTP code, Deposit confirmed, Withdrawal requested, Withdrawal sent, Bet placed, Bet won, Bet lost, KYC approved, KYC rejected (with reason), Suspicious activity flag, Deposit limit reached, Self-exclusion confirmed, Self-exclusion ending soon, Reality check, Weekly summary, Big win celebration, Pool jackpot alert, Match starting reminder, Account locked
- Email templates (5 — receipt, monthly statement, KYC update, security alert, marketing opt-in)
- Voice/tone variations per channel (SMS is terser than email)

### 2.17 Voice & Tone (full guide)
- General principles
- Microcopy patterns: empty states, errors, confirmations, win/loss
- **Sensitive copy rules:** never say "you lost", reframe as "the pool grew" — provide alternates for every loss event
- Swahili tone register (formal vs casual — recommend casual but respectful; sample phrases)
- Glossary: how we translate "stake", "pool", "window", "bundle", "settle", "cashout" into Swahili consistently

### 2.18 Accessibility
- WCAG 2.2 AA targets per component
- Color contrast pairs (which token combos pass AA / AAA)
- Focus-ring spec
- Touch-target rules
- Screen reader labeling conventions
- Reduced-motion alternative for every animation listed in 2.5
- Keyboard navigation map

### 2.19 Performance & Data Budget
- Initial JS budget: < 250 KB gzipped
- LCP target: < 2.5s on simulated 3G
- Image strategy (formats, sizes, lazy rules)
- Font loading strategy (subsetting, preload rules)
- Offline shell behavior (cached match list, disabled bet UI)
- Low-data mode toggle: what changes (no animations, no images, no live polling)

### 2.20 Data Visualization
- Chart color palette (sequential, divergent, categorical)
- Chart types needed: line, bar, donut, sparkline, heatmap, radial dashboard, momentum bar, flip counter, animated counter
- Annotation patterns

### 2.21 Theme Tokens (machine-readable deliverable)
- `tokens.json` covering all of Section 2.2–2.5
- Tailwind config snippet ready to paste into `tailwind.config.ts`
- CSS custom properties snippet ready for `globals.css`
- Token naming convention (e.g. `--color-bg-base`, `--radius-md`)

### 2.22 Implementation Notes
- Component file structure recommendation
- Naming convention for components and props
- Dark/light theme switching strategy (CSS variables vs class strategy)
- RTL readiness (Arabic/Hausa for future expansion — design must not hard-code direction)

### 2.23 Every Interaction State (no gaps allowed)
For EVERY interactive element listed anywhere in this brief, Claude Design must spec all of these states explicitly with token references:

- **Default** (rest)
- **Hover** (desktop pointer enters)
- **Hover + selected**
- **Focus-visible** (keyboard tab landed)
- **Focus-visible + hover**
- **Active / pressed** (mouse down or touch down)
- **Selected** (toggle on)
- **Disabled**
- **Loading** (action in flight)
- **Error** (validation or API error)
- **Success** (action confirmed, brief state)
- **Read-only**
- **Empty** (e.g. empty input, empty list)
- **Skeleton** (shape placeholder while loading)
- **Drag-source** (currently being dragged)
- **Drop-target valid** (this can accept the drop)
- **Drop-target invalid** (rejection feedback)
- **Long-press** (mobile, e.g. transaction row reveals actions)

Hover behaviors must be specified for: every button, every link, every card, every row, every chip, every avatar, every icon-only button, every nav item, every breadcrumb segment, every tab, every menu item, every dropdown option, every team badge, every match card, every leaderboard row, every transaction row, every chart datapoint, every legend swatch.

### 2.24 Cursor & Pointer Behavior (desktop)
- Default arrow
- Pointer (clickable)
- Text (input)
- Grab / grabbing (draggable)
- Not-allowed (disabled action)
- Resize (panel dividers, draggable splits)
- Crosshair (chart precision area)
- Wait (only during synchronous blocking ops — to be avoided)
- Custom-cursor moments (if any) — design must call them out

### 2.25 Keyboard Shortcuts (full map)
- Global shortcuts (cmd+k, /, ?, esc)
- Bet slip shortcuts
- Wallet shortcuts
- Admin shortcuts
- Visual cheat-sheet modal (triggered by `?`)
- Each shortcut's accessibility announcement

### 2.26 Mobile Gesture Map
- Tap, double-tap, long-press, swipe-left/right/up/down, pinch, two-finger-scroll, edge-swipe-back
- Per-screen gesture inventory: which gestures do what on Match Detail, Bet Slip, Wallet, transaction list, leaderboard
- Swipe-actions on list rows (e.g. swipe a transaction left to see "Dispute", right to see "Receipt")
- Pull-to-refresh placement and visual

### 2.27 Grid Systems
- **Layout grid:** 4-column (mobile), 8-column (tablet), 12-column (desktop). Gutter values per breakpoint. Margin per breakpoint.
- **Card grid:** match list, mini-game tiles, leaderboard cards — spec column counts per breakpoint, gap, aspect ratio rules.
- **Data grid (admin tables):** dense vs comfortable, sticky header, sticky first column, horizontal scroll behavior, resizable columns, reorderable columns, frozen columns, row hover, row select, multi-select, bulk actions bar, inline-edit, expandable rows, virtualization rules for >1000 rows.
- **Form grid:** label/input alignment per breakpoint (stacked mobile, two-column desktop, label-left for admin).
- **Asymmetric hero grid:** for Home and Match Detail — module placement spec.

### 2.28 Analytics — User-Facing
Every chart users see, with full visual + interaction spec:
- Personal performance dashboard: win rate, ROI, total stake, total return, biggest win, longest streak, favorite team, best window
- Win/loss line over time with brushable date range
- Stake distribution donut by sport / team / window
- Window heatmap (time-window vs day-of-week, color = ROI)
- Streak timeline (current + historical)
- Leaderboard distribution (where you rank percentile-wise)
- Per-bet breakdown (pool share at time of placement vs at settlement)
- Comparison vs platform average (anonymized)

### 2.29 Analytics — Admin / Operations
- Live operations dashboard: active users, active bets, pool sizes by match, deposits last hour, withdrawals last hour, GGR today, GGR this week, GGR month-to-date
- Match integrity board: anomaly flags, unusual stake patterns per window, multi-account flags, IP overlap clusters
- KYC queue depth + age, by status
- Payment provider health (success rate, latency) per provider per hour
- Anti-fraud signals: device fingerprint collisions, velocity flags, risk score distribution
- Customer support queue: open tickets, SLA breach risk, agent load
- Marketing funnel: signups → KYC start → KYC complete → first deposit → first bet → second bet (retention)
- Cohort retention (D1, D7, D30) by acquisition channel
- Tax & accounting: gaming tax accrued, withholding accrued, payouts pending settlement
- Geographic distribution map (Tanzania regions, then Africa once expanded)

For each, spec: chart type, axes, default range, color usage, hover-tooltip content, drill-down behavior, empty state, loading state, error state, export options.

### 2.30 Breadcrumbs (every page)
For every page in §2.14 deliver the breadcrumb structure:
- Crumb labels in English + Swahili
- Truncation rules (long match names)
- Mobile collapse pattern (back-arrow + current page only)
- Hover state, current-page state
- Schema.org structured data for SEO

### 2.31 Notifications — Complete Catalogue
For each event below, deliver: in-app toast copy, push notification copy, SMS copy, email copy (if applicable) in English + Swahili. Include character counts.

Account: signup welcome, email verified, phone verified, password changed, two-factor enabled/disabled, login from new device, suspicious login blocked, account locked, account unlocked.

KYC: KYC started, document uploaded, NIDA verified, KYC approved, KYC rejected (with reason codes: blurry-doc, mismatch, expired, underage, sanctioned), additional info needed.

Wallet: deposit initiated, deposit confirmed, deposit failed (per provider failure code), withdrawal requested, withdrawal under AML review, withdrawal approved, withdrawal sent, withdrawal failed, refund issued, balance low warning.

Betting: bet placed, bet confirmed, bet voided (match cancelled), bet won, bet lost, bet partially settled, bet cashed out, pool jackpot crossed, your stake is now top-X-percent of pool.

Match: match starting in 1 hour, your team scored, your window resolved, match ended, match abandoned.

Responsible gambling: deposit limit warning (50%, 80%, 100%), session length reality-check (30min, 60min), self-exclusion confirmed, self-exclusion ending, cooling-off active.

Compliance: terms updated, privacy policy updated, data export ready, account deletion confirmed.

System: maintenance scheduled, maintenance starting, maintenance ended, new app version available, geo-block triggered.

Marketing (opt-in only): weekly summary, monthly statement, big-win community celebration, leaderboard rank-up, streak milestone.

For each: priority level (low/normal/high/critical), default channel(s), whether user can opt out.

### 2.32 Every Loading & Skeleton Pattern
- Skeleton spec for: match card, leaderboard row, transaction row, wallet card, profile card, chart, table row, bet slip leg, mini-game tile, admin row.
- Optimistic UI patterns: bet placement, deposit, withdrawal — what shows immediately vs after server confirms.
- Progress indicators: linear (top of page), circular (in-button), step (multi-step flows).
- Long operation handling: anything > 1.5s gets a clear progress UI; > 5s gets an option to background and notify.
- "Stuck request" recovery: after 10s of pending, offer retry + report.

### 2.33 Every Error State
- Field-level (inline)
- Form-level (banner above form)
- Page-level (replaces content)
- Session-level (re-auth modal)
- Network offline (persistent banner + offline-shell behavior)
- Geo-blocked
- KYC-blocked
- Underage / sanctioned (account suspended)
- Maintenance mode (full-page)
- Rate-limited
- Server error 500 (page)
- 404 (page, with helpful nav back)
- Each with recovery CTA in English + Swahili

### 2.34 Every Empty State
- No bets yet, no live matches, no notifications, empty wallet, no transactions, no winnings yet, no leaderboard rank yet, search returned nothing, filter returned nothing, KYC-not-started, no devices on session list, admin: no flagged users, no pending KYC, no anomalies — each with illustration ref (from §2.7), copy, and primary CTA.

### 2.35 Onboarding & Coachmarks
- First-launch walkthrough (5 screens max)
- Tooltip coachmarks for first interaction with: stake slider, time-window selector, bet slip, pool display, mini-games hub
- Dismissible "tip of the day" pattern
- "What's new" modal for app updates
- Empty-product onboarding: gentle CTA stack on Home for new users (verify identity → make first deposit → place first bet)

### 2.36 Search, Filter, Sort
- Global search: command palette (desktop), full-screen search (mobile), recent searches, suggested results, search result types (match, team, transaction)
- Filter panels: per page (matches by league, by date, by status; bets by status, by date; transactions by type, by date, by amount range)
- Sort menus: per data view, with stable defaults
- Filter chips with clear-individual + clear-all
- Saved filters / saved views (admin)

### 2.37 Drag, Drop, Reorder
- Bet slip: drag legs to reorder, drag-handle visual, drop indicator, animation
- Admin tables: column reorder, row reorder where applicable
- Touch drag patterns

### 2.38 Print, Export, Share
- Receipt PDF spec (transaction receipt, withdrawal proof)
- Monthly statement PDF spec (cover, summary, transactions, settled bets, tax line items)
- CSV export spec (admin: users, transactions, bets, audit log)
- Share card spec for big wins (Open Graph image, WhatsApp-friendly aspect ratio, no PII leak)
- Print stylesheet for receipts and admin reports

### 2.39 Connectivity, Offline, Sync
- Offline banner (persistent at top)
- Connection-quality indicator (auto-degrade to low-data mode under 3G)
- Queued-action UI (bet placement attempted offline gets queued? recommend behavior — likely BLOCK with clear message, since money is involved)
- Sync-resolved toast
- Update-available banner (after deploy with breaking changes)
- Force-update screen (when version is below minimum supported)

### 2.40 Session, Security, Trust
- Session timeout warning modal (2 min before expiry)
- Re-auth modal (sensitive actions: withdrawal, KYC change, password change)
- Active sessions list (devices, locations, last active, sign out)
- Security event log (for the user)
- "Why we ask for this" expandable explanation on every KYC/AML field — builds trust

### 2.41 Compliance & Regulator-Ready UI
- Age gate (first-launch)
- Self-exclusion CTA always visible in profile
- Reality check overlay every 30 / 60 min (configurable)
- Deposit limits UI (daily, weekly, monthly)
- Terms acceptance with versioning
- Cookie / tracking consent (TZ DPA aligned)
- Reg ID / license number footer on every page
- Helpline contact card (Tanzania problem-gambling helpline)
- "How we calculate the pool" explainer accessible from every bet card — transparency builds trust and is regulator-friendly

### 2.42 Brand Asset Bundle (final delivery)
- Logo: SVG primary, SVG monogram, SVG wordmark, PNG fallbacks at 1x/2x/3x
- App icon: 1024×1024 master with iOS rounded preview and Android adaptive layers spec'd
- Splash screen spec
- Favicon set (16, 32, 180, 192, 512)
- OG image template (1200×630) with 5 layout variants (homepage, match, win-share, leaderboard, generic)
- Email header banner spec
- Social avatars (1:1)
- Notification icon (monochrome silhouette)

### 2.43 Microinteractions Library
Spec each tiny moment that compounds into "premium feel":
- Button press ripple (subtle, 200ms)
- Toggle switch handle slide
- Checkbox check-draw animation
- Radio fill expansion
- Tab underline slide
- Tooltip fade + slight rise
- Toast slide-in from corner
- Modal scale-in 0.96 → 1
- Drawer rubber-band on overdrag
- Pull-to-refresh elastic
- Counter count-up easing
- Pool pulse heartbeat (signature)
- Slider thumb scale on grab
- Coin flow animation on stake increase
- Win particle burst (perf-budgeted)
- Streak flame intensification
- Avatar status-dot pop
- Number flip-clock (live score)
- Badge scale-in on new
- Loading dot bounce (3-dot)

For each: trigger, duration, easing, what changes, reduced-motion fallback.

---

## 3. Format Requirements

- **Single canonical file:** `DESIGN_SYSTEM.md` — comprehensive, 100% complete, no "TBD" sections.
- **Plus:** `tokens.json` for machine consumption.
- **Plus:** `LOGO_SPEC.md` if logo construction needs more visual detail than fits cleanly in the main file.
- All hex values, ms durations, px values, and cubic-bezier curves must be **literal numbers**, never adjectives like "fast" or "blue-ish".
- Every component spec must include: visual description, all states, all variants, anatomy with token names, accessibility notes, motion behavior, props/API recommendation.
- Every flow must include: happy path screens, error states, edge cases, copy in English + Swahili.

---

## 4. Hard Constraints

1. Mobile-first — desktop is secondary.
2. No literal tribal stereotypes anywhere.
3. No CAPS-shouting copy. No yellow/red gambling tropes.
4. Multilingual from day one (English + Swahili).
5. Must respect `prefers-reduced-motion` for every animation.
6. Must work on budget Android with 3 GB RAM and 3G.
7. Buttons, sliders, and key CTAs must be operable one-thumb on a 360px-wide screen.
8. Every interactive element ≥ 44×44 px touch target.

---

## 5. Acceptance Criteria

I will accept the design system when:
- Every section in §2 (including 2.23–2.43) is filled in with concrete values.
- A frontend engineer can implement any component listed without asking a follow-up question.
- `tokens.json` parses and maps cleanly into Tailwind config.
- Light and dark modes both fully specified — no "same as light" shortcuts.
- All copy provided in both English and Swahili.
- 5 differentiator components (StakeSlider, MatchCard, PoolPulseRing, WinCelebration, TribalClashFaction) are spec'd in detail and feel ownable — no competitor in Africa has anything close.
- **Every interactive element has all 18 states from §2.23 explicitly specified.**
- **Every page in §2.14 has a corresponding breadcrumb spec from §2.30.**
- **Every notification event in §2.31 has copy in both languages and all four channels where applicable.**
- **Every loading, empty, and error state from §2.32–2.34 has a visual spec, not just a description.**
- **Every microinteraction in §2.43 has duration, easing, and reduced-motion fallback.**

---

## 6. What to Skip

- Don't propose a name change unless current "Kipindi" has a real conflict.
- Don't recommend technology choices — those are locked (Next.js 16 + Tailwind + Prisma + Postgres).
- Don't include Figma file references — deliverables are markdown + JSON only.

---

**Once delivered, paste the file back to the engineering side and Sprint 0 (folder scaffold + Tailwind config + base layout + Prisma schema) begins immediately.**
