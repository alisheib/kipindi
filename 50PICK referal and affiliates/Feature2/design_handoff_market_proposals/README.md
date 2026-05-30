# Handoff: 50pick.tz — Player Market Proposals (Feature 2)

## Overview
Screen designs for **Player Market Proposals ("Propose & Get Paid")** on 50pick.tz. Any
KYC-permitted player submits a market proposal; the community upvotes/downvotes on a public board
(**votes only rank/sort — an officer always makes the final decision**, per the "AI accelerates,
humans decide" standard). When an officer approves, it becomes a live market; the proposer earns a
**fixed prize when their market is both listed AND resolved**. Prize amount, the "Hot" vote
threshold, and a master toggle are admin-configurable. Mobile-first, bilingual EN+SW, fully
responsive. Built inside the existing **50pick kit**.

> This bundle also contains **Feature 1 (Affiliate / Referral)** because both features run in one
> prototype off the same kit + responsive shell. Open `50pick prototype.html`; the left rail
> **Feature** switch toggles Affiliate ↔ Proposals, plus viewport / theme / state.

## About the design files
HTML/JSX **design references** (React via in-browser Babel) — not production code. Recreate them in
the host app's environment (e.g. Next.js + React + Tailwind/shadcn) using its real components and
the tokens in `kit/tokens.css`. The `kit/` files are the existing 50pick kit, verbatim, plus the
brand override appended to `tokens.css`.

## Fidelity
**High-fidelity.** Exact OKLCH colors / type / spacing / radii in `kit/tokens.css`. Copy final (EN+SW).

## Brand rules (non-negotiable)
Royal **indigo** canvas + chrome · **gold** = every primary CTA + prize/money figures ·
**claret** = danger / declined only · **YES emerald / NO rose = betting only** ·
**vote arrows are neutral/gold-accented, never green/red** (a proposal is not a YES/NO bet) ·
Sora / Inter / JetBrains Mono · no emojis · bilingual EN (primary) + SW (italic) · TZS in mono.

## Screens / Views

### 2.1 Proposals board — `/proposals`
- **Header:** "Market Proposals · Mapendekezo" + sub "Vote for the markets you want to see · Pigia kura soko unayotaka."
- **Reward banner** (gold): "Earn TZS 20,000 for each proposal listed & resolved" + gold **Create · Pendekeza** CTA.
- **Stats strip:** "128 proposals · 4,210 votes" (mono).
- **Filter chips:** Hot · New · Listed · Mine (gold when selected).
- **Proposal card** (repeating unit): `VoteControl` (left) + status badge (**Hot / Listed / Resolved / Under review / Declined**) + category chip + age ("2d ago · siku 2") + title (Sora) + SW subtitle + one-line description + by-line. Listed → "View market"; Resolved → "+TZS 20,000 earned" (gold).
- **States:** empty (dashed) ↔ populated; active ↔ paused (board read-only).

### 2.2 Create a proposal — `/proposals/new`
- **Guidelines panel** (indigo): "Good proposals are specific, have a clear yes/no answer, and a trustworthy source. Politics and ambiguous outcomes are declined."
- **Fields:** Title (EN) · Title (SW, optional) · Why it matters · **Resolution criterion** (with a precise helper + example) · **Category** chips (Sports / Macro / Weather / Crypto / Culture / Infrastructure) · **Resolution date** (mono).
- Gold **Submit proposal · Wasilisha** → **`OperationResultModal`** (gold success crest): "Proposal received — an officer will review it shortly."

### 2.3 Proposal detail — `/proposals/[id]`
- Full proposal + horizontal `VoteControl` + vote count + resolution criterion.
- **Status timeline:** Submitted → Under review → Listed → Resolved → Paid (gold for done/current).
- When **listed**: link to the live market. When **resolved**: a gold "You earned +TZS 20,000 · Imelipwa" celebration for the proposer.

### 2.4 Player entry points
- **`ProposalEntryCard`** — a gold-accented card for the Markets page: "Propose Markets & Get Paid · Pendekeza soko."
- **`ProposalFooterLink`** — the public-footer version.
- **Notifications:** "Your proposal is under review" · "Your proposal is now live" · "Your proposal resolved — you earned TZS X" (gold).

### 2.5 Admin · Proposal review queue — `/admin/proposals` (Markets group, beside "AI candidates")
- **Queue** sorted by net votes: net score + title + category + proposer (masked) + age + status; filters (All / Review / Flagged); click to select.
- **Review panel:** full detail, **vote stats** (upvotes gold / downvotes claret / net score) with the note *"Votes only rank the queue — the officer makes the final call,"* and officer actions: **Approve & list · Orodhesha** (gold), **Request changes** (ghost), **Decline** (claret) → reason picker (Politics / Ambiguous outcome / No official source / Duplicate / Past resolution / Outside jurisdiction / Officer decision) → confirm.
- **Config block:** gold master switch + **listing+resolution prize** + **"Hot" vote threshold** + per-player **rate limit** (max open proposals).
- **KPI tiles:** Proposals pending · Listed-from-proposals · Prizes paid (gold) · Top proposer.

## Interactions & behavior
- `VoteControl` has three states: idle (neutral arrows), upvoted (gold up + gold score), downvoted (claret down + claret score); toggling re-applies/clears; score updates optimistically. **Never green/red.**
- Approve flows into the existing market-creation path. Decline requires a reason. Votes never auto-approve.
- Responsive: mobile = phone frame + bottom nav; desktop = sidebar web-app (board reflows to 2-up cards); admin = operator console (queue + review panel side by side on desktop, stacked on mobile).

### Refinements in this pass
- **Working filters** — Hot / New / Listed / **Mine** actually filter the board (Mine = the player's own proposals + their statuses); empty-filter message when none match.
- **Loading state** — skeleton card list (kit `Skeleton`); rail data-state is Empty / Loading / Full.
- **Create validation** — required marks, a live title counter (×/80), a "2 of 3 open proposals used" rate-limit hint, and **Submit disabled** until title + criterion + a valid date are present.
- **Vote control** — 36×34 hit targets, `aria-pressed` + `aria-label`.
- **Proposal cards** — hover lift + indigo border + chevron, clearly tappable → detail.
- **Admin decline** — optional officer note (logged) beside the reason picker.

## State management
- `proposals[]` `{ id, title{en,sw}, description, resolutionCriterion, category, resolutionDate, status (review|hot|listed|resolved|declined), up, down, proposerId(masked), createdAt }`
- per-user `myVotes { [proposalId]: 'up'|'down'|null }`, `myProposals[]`
- admin config `proposalsProgram { enabled, prizeTZS, hotThreshold, rateLimit }`
- officer actions log; approval emits a market into the existing markets pipeline.

## Design tokens
`kit/tokens.css` is the source of truth. New this feature: `.chip-claret` (declined) added to the
kit chip system; vote-caret / flame / calendar / tag / edit / checkCircle / xCircle / doc icons
appended to the kit `Icon` map (same 1.5px stroke).

## New components to promote into the kit (flag)
- **`VoteControl`** — up/score/down, idle/up/down states, neutral+gold (NOT betting colours).
- **`StatusBadge`** — maps proposal status → kit chip variant + icon.
- **`StatusTimeline`** — Submitted→…→Paid vertical stepper.
- **`OperationResultModal`** — gold success/failure crest confirmation (referenced in the brief).
- (Shared with Feature 1: **`Toggle`** switch, **`Kpi`** tile.)

## Files
- `50pick prototype.html` — entry (both features).
- `kit/` — kit components (verbatim) + `tokens.css` brand override.
- `screens/proposals-player.jsx` — 2.1 board + `VoteControl` / `StatusBadge` + 2.4 entry helpers.
- `screens/proposals-player2.jsx` — 2.2 create + `OperationResultModal` · 2.3 detail + `StatusTimeline` · 2.4 notifications.
- `screens/proposals-admin.jsx` — 2.5 review queue + config.
- `screens/affiliate-*.jsx` — Feature 1 (bundled).
- `app.jsx` — responsive shells + feature/screen/viewport/theme/state harness (presentation only).
