# Navigation & routing — IA review (2026-07-09)

Audit of how a user moves through 50pick: global nav, back navigation, and
post-action routing. Grounded in the actual components, reviewed through the
five lenses (integration / UI-UX / architect / manager / player). Verdict up
front: **the system is already well-built.** There is **one real structural
gap** (the tablet breakpoint) and a few **prioritization calls**. Nothing here
is a launch blocker; items are ranked so we fix the highest-impact first.

---

## 1. What exists today (the current model)

**Three nav surfaces** (`src/components/layout/*`):

| Surface | Where it shows | Contents |
|---|---|---|
| **Top bar** (`top-app-bar.tsx`) | every page | brand→`/`, primary links **only ≥1280px (`xl`)**, language, balance pill, persistent gold **Deposit**, notifications, avatar |
| **Avatar menu** (`avatar-menu.tsx`) | every breakpoint | **full directory**: Profile · Wallet · Invite · Propose · Positions · Results · Leaderboard · Verify ID · (Admin) · language · Sign out |
| **Bottom nav** (`bottom-nav.tsx`) | **only <1280px (`xl:hidden`)** | 5 tabs: Markets · Live · Wallet · Invite · Profile |

**Back navigation** (`ui/back-link.tsx`): `router.back()` when in-app history +
referrer exist, else `router.push(fallbackHref)` to the logical parent. Used on
every sub-page (`/markets/[id]`→markets, `/wallet/{deposit,withdraw}`→wallet,
`/profile/*`→profile, `/positions/performance`→positions, `/proposals/new`→proposals).

**Post-action routing** (thoughtful, context-aware):
- login→`/?welcome=back`; **new** user→`/profile/kyc?welcome=new` (onboarding).
- deposit/withdraw result modal→`router.replace('/wallet')`.
- propose success→`/proposals?f=mine` (see your submission).
- bet placed→stays on page, result modal with **View positions** CTA.
- `next=` param is preserved through the whole auth chain (safe deep-link return).
- logout→POST `/auth/logout`.

**This is a mature setup.** Back is never a dead-end (history OR parent),
money-in is always one tap away (persistent Deposit), the full directory is
always reachable (avatar menu), and flows land where the user expects.

---

## 2. The principles (what "correct" means here)

1. **Every screen answers three questions instantly:** where am I, how do I go
   back, how do I get anywhere. Today: page hero/title (where), BackLink (back on
   sub-pages), avatar menu (anywhere).
2. **Primary destinations get a persistent tab; sub-pages get a BackLink.** A
   "primary destination" = a top-level noun the user returns to (Markets, Live,
   Results, Wallet, Positions, Leaderboard). A "sub-page" = a leaf of a flow
   (deposit, kyc, market detail, proposal form). Never both.
3. **Back ≠ nav.** Back returns you along *your* path (router.back). Nav jumps you
   to a *destination*. A screen that is a destination shouldn't lean on Back.
4. **After an action, land where the user's next intent is** — not where they
   were. Deposit→wallet (see new balance), propose→my proposals, bet→positions
   affordance. Already true.
5. **Discoverability must not depend on a drawer.** If the only way to reach a
   primary destination is opening the avatar menu, that destination is hidden.
   ← this is where the one real gap lives.

---

## 3. Gaps & recommendations (ranked)

### 🔴 R1 — The tablet/small-laptop gap (the one structural issue)
Primary top-bar links appear **only ≥1280px**; the bottom nav appears **only
<1280px** and holds just 5 tabs. So on **768–1279px** (tablets, split-screen,
small laptops — a large real slice of traffic) the user sees the bottom-nav 5
**and nothing else**: **Results, Positions, Propose, Leaderboard have no visible
nav** — only the avatar drawer. A mobile-style floating pill bottom-nav also
reads oddly on a 1100px-wide laptop.

**Fix (recommended):** decouple the two breakpoints.
- Show a **condensed top nav from `lg` (≥1024px)** — the 4–5 core links inline,
  the rest behind a **"More ▾" overflow** menu (Results, Leaderboard, Propose).
- Keep the floating bottom nav for **true mobile only (`<lg`/`md`)**.
- Net: no viewport class is left with hidden primary destinations, and the
  phone idiom stays on phones. This is the highest-value change.

### 🟠 R2 — Bottom-nav slot prioritization (player-value call)
The 5 mobile tabs are Markets · Live · Wallet · **Invite** · Profile. For a
*bettor*, **Positions** (my active bets / did I win?) is a more frequent return
than **Invite** (a once-in-a-while growth action). Invite already has: a top-bar
gold-adjacent slot at xl, the avatar menu, and its own hero page.

**Options (pick one, product call):**
- (a) Swap **Invite → Positions** in the bottom nav (my-bets is the daily loop).
- (b) Make the middle tab a **Markets/Live** the primary and add **Results or
  Positions** as the 5th, moving Invite to Profile's sub-menu.
- (c) Keep as-is if Invite-driven growth is the current top business KPI (then
  it's a deliberate, defensible trade — just name it as one).
Recommend **(a)** unless growth is explicitly the priority quarter.

### 🟠 R3 — `/positions` BackLink points to `/markets`
`positions/page.tsx` BackLink falls back to `/markets`, which frames Positions as
a *child* of Markets. But Positions is a **primary destination** (it's in the
avatar menu and should be a bottom-nav tab per R2). A primary destination
generally shouldn't carry a Back-to-sibling link.
**Fix:** drop the BackLink on `/positions` (it's a destination, not a leaf), or
if kept, it's cosmetic-only. Low effort, low risk.

### 🟡 R4 — Home (`/`) identity
The brand logo → `/`, and active-state code treats `/` as "Markets". If `/` is
just the markets board, that's fine (brand→board). If `/` is a distinct
**home/dashboard**, it deserves its own discoverable entry and a clear active
state. **Action:** confirm the intent of `/`; if it's a real dashboard, give it
a "Home" affordance; if it's markets, consider making brand→`/markets`
explicitly to remove the ambiguity. (Confirm before changing — cheap either way.)

### 🟡 R5 — One consistent "up" affordance on leaf pages
BackLink is used well, but a couple of admin leaves and system pages
(`not-found`, `offline`) should be audited to guarantee every leaf has **either**
a BackLink **or** a clear destination CTA — no page should rely solely on the
browser back button. (Spot-audit; most already comply — `route-error` has
Home/Markets, 404 has Home/Markets/Help.)

---

## 4. The target model (the "perfect approach", concretely)

- **Phones (`<lg`):** floating bottom nav = **Markets · Live · Positions · Wallet
  · Profile** (R2a). Avatar menu = full directory + Invite/Propose/Leaderboard/
  Results/KYC. BackLink on every leaf.
- **Tablets/laptops (`lg`–`xl`):** **condensed top nav** (Markets · Live · Results
  · Wallet · Positions) + **"More ▾"** (Leaderboard · Propose · Invite). No bottom
  nav. (R1)
- **Desktop (`≥xl`):** full top nav as today. (Already good.)
- **Everywhere:** persistent Deposit (money-in one tap), avatar = full directory,
  notifications bell, balance pill. BackLink on leaves only; destinations never
  carry a Back.
- **After actions:** unchanged — they already land on intent (wallet / my-
  proposals / positions-affordance) with a modal that offers the next step.

**Guiding rule to encode in the rollout:** *a screen is either a **destination**
(has a persistent nav entry, no Back) or a **leaf** (has a BackLink to its
parent, no nav tab). Nothing is both; nothing is neither.*

---

## 5. Suggested sequencing (non-blocking, fits the kit rollout)
1. **R1** condensed `lg` top nav + "More" overflow — one focused change, biggest
   win. (New: an overflow menu component; reuse the avatar-menu portal pattern.)
2. **R2** bottom-nav slot decision (needs Ali's product call: Invite vs Positions).
3. **R3/R4/R5** cleanups — small, do alongside the PART C per-page pass.

None of this blocks the current B-series kit rollout; R1/R2 are the ones worth a
dedicated slot. Everything else is polish that rides along with PART C.

---

## 6. Per-screen exit contract ("from here, where can I go?")

The architect's view: **every screen must offer more than Back.** The rule we
encode:

> A screen offers three tiers of exit: **(G) global** — always present, **(C)
> contextual** — the screen's specific onward moves, and **(B) back** — only on
> leaves. **No screen is Back-only. No screen is a dead-end.**

**(G) Global exits — present on EVERY authed screen** (so the rows below omit them):
the **avatar menu = the whole directory** (Profile · Wallet · Invite · Propose ·
Positions · Results · Leaderboard · Verify ID · Admin), the persistent **Deposit**,
**notifications**, **balance pill**, brand→home, and (per breakpoint) the top/bottom
nav tabs. **This is why nothing is ever truly stranded** — the drawer is the
universal escape. R1 (§3) is exactly about making these visible without the drawer
on tablets.

Legend: **D** = destination (persistent nav entry, no Back) · **L** = leaf (has
BackLink) · **F** = flow step.

### Discovery
| Screen | Type | (C) Contextual exits it should offer | (B) Back | Status |
|---|---|---|---|---|
| `/` home | D | featured/most-active market → `/markets/[id]`, `/live`, `/results`, category → filtered board, Deposit | — | ✅ (confirm `/` identity — R4) |
| `/markets` board | D | market → `/markets/[id]`, in-page search/filter, category chips, empty→clear-filters | — | ✅ |
| `/markets/[id]` **(money leaf)** | L | **pick side → dial → bet-confirm → result → {View positions ∣ stay}**, share, source (ext), category→board, guest→register/login, notify-prompt | →`/markets` | ✅ richest-exit screen; correct |
| `/live` | D | market → detail, most-contested hero, `/results` | — | ✅ (slim header by design) |
| `/results` | D | resolved market → detail, `/fairness` (attestation), `/markets` | — | ✅ |
| `/leaderboard` | D | (optionally player rows), `/markets` | — | ✅ |

### Money
| Screen | Type | (C) Contextual exits | (B) Back | Status |
|---|---|---|---|---|
| `/wallet` hub | D | **Deposit**, **Withdraw**, Methods, txn receipts, `/positions` | — | ✅ |
| `/wallet/deposit` | F/L | method pick (in-page) → confirm → result → `/wallet`; KYC prompt if required | →`/wallet` | ✅ |
| `/wallet/withdraw` | F/L | confirm → result → `/wallet`; **KYC gate → `/profile/kyc`** if unverified | →`/wallet` | ⚠️ gate doesn't pass `next` back to withdraw (R6 below) |

### Identity / profile (a secondary directory)
| Screen | Type | (C) Contextual exits | (B) Back | Status |
|---|---|---|---|---|
| `/profile` hub | D | account, kyc, sessions, source-of-funds, responsible-gambling, invite, positions, results, wallet | — | ✅ (this is the profile drawer) |
| `/profile/account` | L | edit actions, close-account (hard confirm) | →`/profile` | ✅ |
| `/profile/kyc` | F/L | submit → result; on approval → **should return to the gated action (withdraw)** if arrived via a gate | →`/profile` | ⚠️ R6 |
| `/profile/sessions` | L | revoke session (in-page, claret confirm) | →`/profile` | ✅ |
| `/profile/source-of-funds` | L | per-source select → confirm | →`/profile` | ✅ |
| `/profile/responsible-gambling` | L | set limits, self-exclude (hard confirm), helpline (ext) | →`/profile` | ✅ |
| `/profile/invite` | L | share (native/QR/copy) | →`/profile` | ✅ |

### Proposals
| Screen | Type | (C) Contextual exits | (B) Back | Status |
|---|---|---|---|---|
| `/proposals` board | D | proposal → `/proposals/[id]`, **New proposal**, filter (Hot/New/Listed/Mine) | — | ✅ |
| `/proposals/[id]` | L | vote (in-page), (if approved → linked market) | →`/proposals` | ✅ |
| `/proposals/new` | F/L | submit → result → `/proposals?f=mine` | →`/proposals` | ✅ |

### Support / legal / fairness
| Screen | Type | (C) Contextual exits | (B) Back | Status |
|---|---|---|---|---|
| `/help` | D-ish | FAQ topics, contact, legal links, `/fairness` | (via menu/footer) | 🟡 ensure a clear return (R5) |
| `/fairness` | D-ish | resolved markets, attestation detail, legal, how-it-works | (via menu) | ✅ |
| `/legal/*` | L-ish | cross-links between legal docs, back to source page | (via footer/menu) | 🟡 leaf-audit (R5) |

### Auth (pre-login, no global nav — self-contained flow)
| Screen | Type | (C) Contextual exits | (B) Back | Status |
|---|---|---|---|---|
| `/auth/login` | F | → OTP (chain), → register, → forgot-password; success→`/` or `next`; new→`/profile/kyc` | — | ✅ |
| `/auth/register` | F | → OTP, → login | — | ✅ |
| `/auth/otp` | F | verify→home/next; **resend**; **← Change number** (→login/register, `next` kept) | ← change number | ✅ good escape hatch |
| `/auth/forgot-password` | F | send → reset flow, → login | → login | ✅ |
| `/auth/reset-password` | F | reset → login | → login | ✅ |

### 🟠 R6 — KYC-gate return path (new, from this per-screen pass)
`/wallet/withdraw` sends unverified users to `/profile/kyc` **without a `next`**,
so after (async) approval they land on the KYC page, not back on Withdraw. KYC
approval isn't instant, so an immediate bounce isn't always possible — but we
should (a) pass `next=/wallet/withdraw` into the gate link, and (b) on the KYC
*approved* state, show a **"Continue to withdraw"** CTA when `next` is present.
Small, high-clarity fix. Same pattern applies to any future action that gates on
KYC.

---

## 7. The one-paragraph answer

**"If I'm on screen X, where can I go?"** — On every authed screen: *anywhere*,
via the avatar directory + Deposit + notifications (global tier). Plus that
screen's **contextual** onward moves (a board → its detail; a form → confirm →
result → the hub; the market detail → the bet flow → your positions). Plus
**Back** if it's a leaf. **No player screen is Back-only, and none is a
dead-end** — the audit found the flows already land on intent and always keep the
directory reachable. The gaps are (R1) making the directory *visible without the
drawer on tablets*, (R2) putting **Positions** in the mobile bottom nav, and (R6)
returning users to Withdraw after a KYC gate. Fix those three and the reachability
model is complete.

