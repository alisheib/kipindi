# 50pick / Kipindi — Design Request: Affiliate Program + Player Market Proposals

> **For Claude Design.** This is a request for screen designs for two new features
> on an existing, live product. Please design within the existing **50pick UI kit**
> (shared separately as `design_handoff_prediction_market_kit/kit/`). Do not invent a
> new visual language — extend the one in the kit. The reference screenshots from
> *5050markets.com* show the *functionality* we want; please elevate the look to
> 50pick's premium standard, not copy their styling.

---

## 0. Product context (read first)

**50pick** (working name *Kipindi*) is a Tanzania-licensed pari-mutuel prediction-markets
platform. Players pick YES or NO on a proposition (sports, weather, macro, crypto, culture);
winners share the losing pool minus an operator margin. Mobile-first, bilingual **English +
Swahili** (every label appears in both, EN primary with SW as an italic subtitle/secondary line).

We are adding two features:
1. **Affiliate / Referral program** — players invite friends with a link and earn rewards.
2. **Player Market Proposals** — players propose markets, the community votes, an officer
   approves, and the proposer earns a prize when their market is listed and resolved.

### Non-negotiable design rules (from the existing kit + brand guide)

- **Royal indigo** (hue ~268) is the brand canvas / background.
- **Gold** (hue ~80) is the **primary accent — all primary CTAs are gold** (`btn btn-gold`).
- **Claret** (hue ~22) = heritage / danger only.
- **YES = green / NO = red ONLY inside actual betting actions.** Never use green/red for a
  navigation CTA, a "Share" button, or a "Submit proposal" button — those are **gold**.
  (The 5050 screenshots use bright green for everything; we do **not** — that's their brand,
  not ours.)
- **Type:** Sora (display/headings) · Inter (body) · JetBrains Mono (numbers, labels, codes,
  amounts, countdowns).
- **No emojis** in UI copy.
- **Mobile-first** — design the phone width first (≈393px); these are primarily used on phones.
  Then note the desktop/admin adaptation.
- **Bilingual** — show EN + SW on every screen. Numbers/amounts always in `TZS` via mono.
- Reuse existing kit components wherever possible: cards, pills/chips, the gold CTA, the
  `OperationResultModal` (success/failure crest) for confirmations, KPI tiles, list rows.

### Existing surfaces these plug into (so the new screens feel native)

- **Player bottom nav:** Markets · Live · Positions · Leaderboard · Profile.
- **Profile page:** a hero card + a "Account · Akaunti" grid of setting rows (icon + title +
  SW subtitle + chevron). New player entry points should match these row patterns.
- **Admin shell:** a left sidebar grouped into Overview / Money / Players / Markets / Compliance
  / System, with `AdminPageHead`, `AdminKpi` tiles, `AdminCard`, and a config-form pattern
  (labelled number/percent inputs with hints, a gold "Save · Hifadhi" button).

---

## FEATURE 1 — Affiliate / Referral Program

**How it works (decided):** every player automatically gets a referral link on sign-up. The
program has a master ON/OFF in admin, plus three independently toggleable reward modes that can
run in any combination (or none):
- **Commission** — referrer earns a % of the operator margin their recruits generate, for a set
  window (e.g. 50% for 24 months).
- **Bonus / discount** — sign-up or first-deposit bonus credit to the new player and/or referrer.
- **Prize** — a fixed reward when a recruit hits a milestone (first bet / deposits X).

### Player screens to design

**1.1 — "Invite & Earn" page** (`/profile/invite`) — the hero of this feature
- Program status pill (Active / Paused).
- **Referral link** in a mono field with a one-tap **Copy** button and a prominent gold
  **Share with Friends** button (opens native share sheet).
- A short earning promise line that adapts to which reward modes are on (e.g. "Earn 50% of
  your friends' fees for 24 months" / "Get TZS 5,000 when a friend places their first bet").
- Two stat tiles: **Referrals** (count) and **Earned** (TZS, mono).
- **How It Works** — three numbered steps: 1) Share your link · 2) They sign up & play ·
  3) You earn. (See 5050 screenshot #3 for the pattern; render it in our kit.)
- **Empty state** (0 referrals, 0 earned) and a **populated state** (a small list of recruits:
  masked name, join date, status, earned-from-them).
- Design both **light and dark**.

**1.2 — Referral entry point in Profile**
- A new setting row in the "Account · Akaunti" grid: "Invite & Earn · Alika upate" with an
  appropriate icon, matching the existing rows. Possibly a subtle gold accent since it's a
  growth/earning feature.

**1.3 — New-player welcome when arriving via a referral link**
- A small, tasteful banner/ribbon on the registration screen: "You were invited by a friend —
  [reward, if a sign-up bonus is active]." Must degrade gracefully when no bonus mode is on.

**1.4 — Notifications (in-app)** — design the toast/notification-row look for:
- "Your friend just joined" · "You earned TZS X from a referral."
  (Reuse the existing notification row style; just specify copy + icon + accent.)

### Admin screens to design (`/admin/affiliate`)

**1.5 — Affiliate admin page** — lives in the admin shell, "Players" group (or a new "Growth"
group — your call). Needs:
- **Master toggle** (program ON/OFF) — clear, prominent, with a "paused" state that's visually
  unmistakable (this is a money lever).
- **Three reward-mode cards**, each with its own enable toggle + inputs:
  - *Commission:* percent input + window (months) + per-recruit cap.
  - *Bonus:* who gets it (new player / referrer / both) + amounts + trigger (sign-up / first deposit).
  - *Prize:* milestone selector (first bet / deposit threshold) + fixed TZS amount + cap.
- A **config-save** affordance matching the existing `/admin/config` form (gold "Save · Hifadhi").
- **KPI tiles:** total referrals, active affiliates, commission paid (TZS), top referrer.
- A **payout ledger** table (referrer, recruit, type, amount, date, status) and a **referral
  leaderboard**.
- A subtle **compliance note** slot (this is a regulated inducement — we want a place to surface
  "program is dark / limited" messaging to staff).

---

## FEATURE 2 — Player Market Proposals ("Propose & Get Paid")

**How it works (decided):** any (KYC-permitted) player can submit a market proposal. Proposals
appear on a public board where players upvote/downvote; **votes only rank/sort — an admin officer
always makes the final decision** (consistent with our "AI accelerates, humans decide" standard).
When an officer approves a proposal it becomes a live market. The proposer earns a **fixed prize
when their market is both listed AND resolved**. Amount, vote-threshold for "Hot", and a master
toggle are all admin-configurable.

### Player screens to design

**2.1 — Proposals board** (`/proposals`)
- Header: "Market Proposals · Mapendekezo" with a sub-line "Vote for the markets you want to see
  · Pigia kura soko unayotaka." A reward banner: "Earn TZS [X] for each proposal that gets listed
  and resolved." A prominent gold **+ Create / Pendekeza** button.
- A stats strip: "[N] proposals · [N] votes" in mono.
- **Proposal cards** (the core repeating unit): an optional status badge (**Hot** / **Listed** /
  **Resolved** / **Under review** / **Declined**), age ("2d ago · siku 2"), title, one-line
  description, and an **upvote / score / downvote** control. (See 5050 screenshots #2 — same
  anatomy, our kit.) Design the voting control in **idle, upvoted, and downvoted** states. Note:
  vote arrows are **neutral/gold-accented, not green/red** (this isn't a YES/NO bet).
- Sort/filter chips: Hot · New · Listed · Mine.
- **Empty state** (no proposals yet) + an example populated list.

**2.2 — Create-a-proposal form** (`/proposals/new`)
- Fields: **Title** (EN, optional SW), **Description / why it matters**, **Resolution criterion**
  (how we'll know the answer — important, give it a clear helper), **Category** (sports / macro /
  weather / crypto / culture / infrastructure), **Resolution date**.
- A friendly **guidelines panel** ("Good proposals are specific, have a clear yes/no answer, and
  a trustworthy source. Politics and ambiguous outcomes are declined.") — this mirrors the
  officer's rejection reasons so players self-filter.
- Gold **Submit proposal · Wasilisha** button → success via the existing `OperationResultModal`.

**2.3 — Proposal detail** (`/proposals/[id]`)
- Full proposal, vote control, current status + a **status timeline** (Submitted → Under review →
  Listed → Resolved → Paid), and, when listed, a link to the live market. When resolved, a "You
  earned TZS X" celebration for the proposer.

**2.4 — Player entry points**
- A row/card on the **Markets** page and/or a **public-footer** link "Propose Markets & Get Paid ·
  Pendekeza soko" (5050 puts this in the footer — we can too).
- Notifications: "Your proposal is under review" · "Your proposal is now live" · "Your proposal
  resolved — you earned TZS X."

### Admin screens to design (`/admin/proposals`)

**2.5 — Proposal review queue** — lives in the admin shell **"Markets" group, right beside
"AI candidates"** (it's the same officer-review muscle, different source). Needs:
- A queue table/list sorted by votes: title, proposer (masked), category, score (▲/▼), age,
  status. Filters by status.
- A **review panel** per proposal: full detail, vote stats, and officer actions —
  **Approve & list** (gold), **Decline** (with a reason picker: politics / ambiguous outcome /
  no official source / duplicate / past resolution / outside jurisdiction / officer decision),
  and **Request changes**. Approving should flow into the existing market-creation path.
- A small **config block** (or a section on `/admin/config`): master toggle for the proposals
  feature, the **listing+resolution prize amount**, the **"Hot" vote threshold**, and a
  per-player **rate limit** (max open proposals).
- KPI tiles: proposals pending, listed-from-proposals, prizes paid, top proposer.

---

## Deliverables we'd love from Claude Design

For each screen above:
- **Mobile layout first** (≈393px), then a note on desktop/admin adaptation.
- **Light + dark** for the player-facing hero screens (Invite & Earn, Proposals board, Create).
- All states called out above (empty / populated / loading / success / paused / declined).
- Bilingual copy (EN + SW) baked into the mockups.
- Exact reuse of kit tokens/components where they exist; flag any genuinely new component.
- Copy suggestions for headings, helper text, and the "How It Works" / guidelines panels.

**Reminder on the screenshots:** *5050markets* is the functional reference (link card, How-It-Works,
proposals board, vote arrows, "get paid to propose"). Their bright-green, rounded look is **not**
our brand — please translate every pattern into 50pick's royal-indigo + gold kit with our
YES/green-NO/red discipline reserved strictly for betting.
