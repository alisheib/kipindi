# Component contract — Player Market Proposals (Feature 2)

Every UI element, its source, and how it maps to the existing kit. **Rule:** reuse the kit
component; never re-style with one-off inline overrides. Anything not in the kit is **NEW** and
should be promoted into the kit.

## Reused from the existing kit (no changes)

| Element | Source | Props | Notes |
|---|---|---|---|
| `Btn` | `kit/atoms.jsx` | `variant="gold"` (primary), `ghost`, `danger`; `size`; `leadingIcon`; `disabled` | Create / Submit / Approve / Save = gold; Decline = ghost tinted claret / `danger` on confirm |
| `Chip` | `kit/atoms.jsx` | `variant` | `neutral` (category), `pending` (review), `resolved` (gold: Hot/Resolved/Listed flag), **`active`/`claret`** |
| `Input` / `.input-group` / `.prefix` | `kit/atoms.jsx` | `prefix`, `mono`, `placeholder` | title, date, config fields |
| `MarketCard` | `kit/markets.jsx` | full set | shown in the entry-point context (2.4) |
| `Avatar`, `Icon` | `kit/atoms.jsx` | — | + carets/flame/calendar/tag/edit/checkCircle/xCircle/doc appended to `Icon` map |
| `FiftyLockup` / `Phone` | `kit/brand.jsx` / `kit/extras.jsx` | — | logo + mobile frame |
| `Kpi` (shared w/ F1) | `affiliate-player.jsx` | `label,value,sub,gold,icon` | admin KPI tiles |
| `Toggle` (shared w/ F1) | `affiliate-admin.jsx` | `on,onClick,gold` | proposals master switch (gold) |
| Tokens | `kit/tokens.css` | CSS vars | single source of truth |

## Feature-local components (composed from kit primitives — port as-is)

| Component | File | Props | Role |
|---|---|---|---|
| `ProposalsBoard` | `proposals-player.jsx` | `populated, paused, wide` | 2.1 board |
| `ProposalCard` | `proposals-player.jsx` | `p, vote, onVote` | repeating proposal unit |
| `CreateProposal` | `proposals-player2.jsx` | `wide` | 2.2 form (kit `Input` + styled textarea + category chips) |
| `ProposalDetail` | `proposals-player2.jsx` | `resolved, wide` | 2.3 detail |
| `ProposalNotifications` | `proposals-player2.jsx` | `wide` | 2.4 alerts (uses shared `NRow`) |
| `ProposalEntryCard` / `ProposalFooterLink` | `proposals-player.jsx` | — | 2.4 entry points |
| `AdminProposals` | `proposals-admin.jsx` | `paused, setPaused, wide` | 2.5 queue + review + config |

## NEW — promote into the kit

| Component | File | Props | Why new |
|---|---|---|---|
| **`VoteControl`** | `proposals-player.jsx` | `score, vote, onVote, horizontal` | up/score/down with **idle / upvoted (gold) / downvoted (claret)** states. **Vote arrows are neutral/gold — never YES-green / NO-red.** |
| **`StatusBadge`** | `proposals-player.jsx` | `status` | maps `hot/listed/resolved/review/declined` → kit chip variant + icon |
| **`StatusTimeline`** | `proposals-player2.jsx` | `current` | Submitted → Under review → Listed → Resolved → Paid stepper |
| **`OperationResultModal`** | `proposals-player2.jsx` | `open, onClose` | gold success/failure crest confirmation (the brief's `OperationResultModal`) |
| **`.chip-claret`** | `kit/tokens.css` | — | declined/danger chip; extends the kit chip system |
| **`Icon` additions** | `kit/atoms.jsx` | — | `caretUp, caretDown, flame, calendar, tag, edit, checkCircle, xCircle, doc` — same 1.5px stroke |

## Component-usage rules (enforce in review)
1. **Primary CTA = `Btn variant="gold"`** (Create / Submit / Approve & list / Save).
2. **Vote arrows + score** use `VoteControl` — neutral idle, gold up, claret down. **No green/red.**
3. **Prize / money** figures render gold (`--gold-300`), mono.
4. **Decline** is claret and **requires a reason** from the fixed list; **votes never auto-approve** — an officer always decides.
5. Status uses `StatusBadge` (→ kit chip), never an inline-coloured span.
6. Every stat tile = `Kpi`; every config input = the config-field pattern; the master switch = `Toggle` (gold).
7. Bilingual everywhere (EN + italic SW); all numbers mono.
