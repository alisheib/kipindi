# Bonus Wallet — Feature Specification & Implementation Plan

**Date:** 2026-06-26
**Status:** ✅ SHIPPED — all 8 phases + the bulk-poll progress fix built, tested, and deployed (commits `2284499`…`a22c1a4`).
**Session:** Implemented end-to-end 2026-06-26.

### Final decisions (Ali, 2026-06-26)
- **Wagering:** 5× default, by **turnover** (any bet stake counts — the plan's literal "bonus-funded stake only" rule is unclearable for 5×). Admin-configurable.
- **Expiry:** 30 days. Auto-expired by the self-healing maintenance sweep.
- **Withdrawals:** COEXIST — withdrawing real balance leaves active bonuses untouched (no forfeit).
- **Multiple bonuses:** ACCUMULATE (FIFO), industry standard — no one-at-a-time limit, no queue/popup.
- **Affiliate rewards + proposal prizes:** route to the BONUS wallet (admin-toggleable; safe fallback to real).
- **Campaign cap/approval:** none — admin discretion (audit-logged).
- **Cashback (10% deposit-back):** DEFERRED to a follow-up (enum value `CASHBACK` reserved).

### Key safety properties implemented
- Cash-out is BLOCKED on bonus-funded positions (would convert bonus → withdrawable cash).
- Bet placement is real-first, then bonus; void/one-sided/orphan refunds split real→real, bonus→bonus (wagering never reversed).
- All bonus money moves under `withLock("wallet:<userId>")`; invariant `bonusBalance == Σ remainingTzs over ACTIVE grants`.
- Tests: `bonus-service` (59), `bonus-betting` (19), `invite-service` (22) — all wired into the predeploy gauntlet.

---

## 1. What Is This Feature?

A **separate bonus balance** alongside the existing real wallet. Bonus money cannot be withdrawn — it must be wagered (played through) under configurable rules. Once wagering requirements are met, the remaining bonus converts to real, withdrawable balance.

### Use Cases

- **Bulk player invites:** Admin uploads emails/phones, each invitee gets a bonus when they register
- **Referral rewards:** Affiliate bonuses can optionally route to bonus wallet instead of real balance
- **Proposal prizes:** Proposal payouts can optionally route to bonus wallet
- **Admin promotions:** Manual bonus grants to individual players (gift cards, prizes, retention)
- **Campaign marketing:** Branded SMS + email invitations with dynamic bonus amounts

---

## 2. Current System (What Exists Today)

### Wallet Model (prisma/schema.prisma)
- `Wallet` has: `balance`, `pending`, `hold`, `currency`, `status`
- NO separate bonus balance — all bonuses go straight to `balance` via `BONUS_CREDIT` transaction type
- `creditInternal(userId, amount, { description, type })` in `wallet-service.ts` handles all bonus credits

### Transaction Types
`DEPOSIT | WITHDRAWAL | BET_PLACED | BET_PAYOUT | BET_REFUND | BONUS_CREDIT | ADJUSTMENT_DEBIT | ADJUSTMENT_CREDIT | CASHOUT | HOUSE_FEE`

### Affiliate System (affiliate-service.ts)
- 3 reward types: COMMISSION (revenue-share), BONUS (signup/deposit), PRIZE (milestone)
- All rewards credited via `creditInternal()` → real balance immediately
- Config in `affiliate-config.ts` with admin toggle per reward type

### Proposals System (proposals-service.ts)
- Proposal prize (default TZS 20,000) paid on market resolution
- Credited via `creditInternal()` → real balance immediately
- Config in `proposals-config.ts`

### Email (email.ts) & SMS (sms.ts)
- Postmark for email (27+ templates, XSS-escaped, branded)
- SMS: Console (dev), Selcom/Beem/AfricasTalking (prod, awaiting contracts)
- Both are best-effort, never block business logic

### Notification Service (notification-service.ts)
- In-app inbox + multi-channel (FCM, APN, SMS)
- Bilingual EN + SW templates
- Existing notifiers for affiliate rewards, proposal prizes, deposits, withdrawals

---

## 3. Schema Changes

### Modify Existing: `Wallet`
```prisma
model Wallet {
  // ... existing fields ...
  bonusBalance  Decimal  @default(0) @db.Decimal(18, 2)  // NEW — non-withdrawable bonus funds
}
```

### New Model: `BonusGrant`
```prisma
model BonusGrant {
  id                String            @id            // bg_{cuid}
  userId            String
  walletId          String
  amountTzs         Int                              // original grant amount
  remainingTzs      Int                              // unspent portion
  wagerMultiplier   Decimal           @db.Decimal(4, 1)  // e.g. 5.0
  wagerRequiredTzs  Int                              // amountTzs * multiplier (precomputed)
  wageredTzs        Int               @default(0)    // wagering progress
  source            BonusSource                      // ADMIN | REFERRAL | PROPOSAL | INVITE | PROMOTION
  sourceRef         String?                          // FK to invite/affiliate/proposal
  status            BonusGrantStatus                 // ACTIVE | FULFILLED | EXPIRED | CANCELLED | FORFEITED
  expiresAt         DateTime?
  fulfilledAt       DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  wallet            Wallet            @relation(fields: [walletId], references: [id])
  user              User              @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@index([status, expiresAt])
}

enum BonusSource {
  ADMIN
  REFERRAL
  PROPOSAL
  INVITE
  PROMOTION
}

enum BonusGrantStatus {
  ACTIVE
  FULFILLED
  EXPIRED
  CANCELLED
  FORFEITED
}
```

### New Model: `InviteCampaign`
```prisma
model InviteCampaign {
  id                String          @id            // inv_{cuid}
  name              String                         // "June Launch Push"
  bonusAmountTzs    Int                            // default bonus per invitee
  wagerMultiplier   Decimal         @db.Decimal(4, 1)
  expiresInDays     Int                            // bonus validity window
  messageEn         String                         // SMS/email body (English)
  messageSw         String                         // SMS/email body (Swahili)
  status            CampaignStatus                 // DRAFT | SENDING | SENT | CANCELLED
  totalInvites      Int             @default(0)
  totalRegistered   Int             @default(0)
  createdById       String                         // admin who created
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  entries           InviteEntry[]
  createdBy         User            @relation(fields: [createdById], references: [id])
}

enum CampaignStatus {
  DRAFT
  SENDING
  SENT
  CANCELLED
}
```

### New Model: `InviteEntry`
```prisma
model InviteEntry {
  id                String          @id            // ive_{cuid}
  campaignId        String
  contactType       ContactType                    // EMAIL | PHONE
  contactValue      String                         // email or +255...
  bonusAmountTzs    Int                            // can override campaign default
  status            InviteEntryStatus              // QUEUED | SENT | DELIVERED | REGISTERED | FAILED | BOUNCED
  sentAt            DateTime?
  registeredUserId  String?                        // linked when they sign up
  bonusGrantId      String?                        // linked to BonusGrant created
  createdAt         DateTime        @default(now())

  campaign          InviteCampaign  @relation(fields: [campaignId], references: [id])

  @@index([campaignId, status])
  @@unique([campaignId, contactValue])
}

enum ContactType {
  EMAIL
  PHONE
}

enum InviteEntryStatus {
  QUEUED
  SENT
  DELIVERED
  REGISTERED
  FAILED
  BOUNCED
}
```

---

## 4. Money Flow Rules

### Betting with Bonus Balance
```
1. Deduct from REAL balance first
2. If insufficient, use BONUS balance for remainder
3. Track wagering progress on oldest ACTIVE BonusGrant (FIFO)
4. Each TZS wagered from bonus counts toward that grant's wageredTzs
```

### Winning from Bonus-Funded Bets
```
- Winnings go to REAL balance (industry standard)
- The bonus stake portion still counts toward wagering progress
```

### Wagering Fulfillment
```
When wageredTzs >= wagerRequiredTzs on a BonusGrant:
  1. Move grant.remainingTzs from bonusBalance -> real balance
  2. Mark grant status = FULFILLED, set fulfilledAt
  3. Create BONUS_CREDIT transaction on real balance
  4. Notify player: "Your TZS X bonus is now withdrawable!"
```

### Bonus Expiry
```
Cron job (daily or hourly):
  Find grants where status = ACTIVE AND expiresAt < now()
  For each:
    1. Deduct remainingTzs from bonusBalance
    2. Mark status = EXPIRED
    3. Notify player
```

### Withdrawal + Active Bonuses
```
DECISION NEEDED FROM ALI (Question 3):
  Option A: Forfeit all active bonuses on withdrawal (industry standard)
  Option B: Block withdrawal until bonuses played through
  Option C: Let them coexist (withdraw real, bonuses stay)
```

### Refund of Bonus Bet
```
If a market is voided and player had bet with bonus funds:
  - Bonus portion returns to bonusBalance (not real balance)
  - Real portion returns to real balance
  - Wagering progress from that bet is NOT reversed (industry standard)
```

---

## 5. Files to Create

| File | Purpose |
|---|---|
| `src/lib/server/bonus-service.ts` | Core: creditBonus, deductBonus, trackWagering, fulfillGrant, expireGrants, forfeitAll |
| `src/lib/server/bonus-config.ts` | Config: default wager multiplier, expiry days, forfeit policy, bonus destination toggles |
| `src/lib/server/invite-service.ts` | Campaigns: CRUD, bulk send (email+SMS), registration binding, CSV parsing |
| `src/app/admin/bonuses/page.tsx` | Admin page: KPIs, grant ledger, grant-to-player form, config panel |
| `src/app/admin/bonuses/bonus-actions.tsx` | Client components: grant form, config form, ActionOverlay integration |
| `src/app/admin/invites/page.tsx` | Admin page: campaign list, create campaign form |
| `src/app/admin/invites/[id]/page.tsx` | Admin page: campaign detail, delivery table, registration tracking |
| `src/app/admin/invites/invite-actions.tsx` | Client components: create campaign, upload CSV, send |
| `scripts/bonus-service.test.mts` | Tests: credit, wagering, fulfillment, expiry, forfeit, concurrency |
| `scripts/invite-service.test.mts` | Tests: campaign CRUD, send, registration binding, CSV parsing |

## 6. Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add bonusBalance to Wallet, add BonusGrant, InviteCampaign, InviteEntry models + enums |
| `src/lib/server/wallet-service.ts` | Add bonus-aware bet deduction, bonus balance display, forfeit-on-withdraw logic |
| `src/lib/server/market-service.ts` | Bet placement: split real/bonus deduction, call bonus-service for wagering tracking |
| `src/lib/server/affiliate-service.ts` | Add config toggle: `bonus.destination: "REAL" \| "BONUS"`, route rewards accordingly |
| `src/lib/server/proposals-service.ts` | Add config toggle: `prizeDestination: "REAL" \| "BONUS"`, route prizes accordingly |
| `src/lib/server/payments.ts` | Withdrawal: check for active bonuses, apply forfeit/block policy |
| `src/lib/server/email.ts` | 3 new templates: `inviteHtml()`, `bonusCreditedHtml()`, `bonusFulfilledHtml()` |
| `src/lib/server/sms.ts` | 1 new template: invite SMS message |
| `src/lib/server/notification-service.ts` | 4 new notifiers: bonus credited/fulfilled/expired/forfeited |
| `src/lib/server/auth-service.ts` | Registration: accept invite code from URL, auto-credit bonus |
| `src/components/admin/admin-nav-groups.ts` | Add "Bonuses" and "Invites" items to sidebar nav (under Growth or Money group) |
| `src/app/wallet/wallet-client.tsx` | Show bonus balance in balance card, wagering progress per grant |
| `src/app/auth/register/page.tsx` | Accept invite code from URL param, show bonus preview |

---

## 7. Implementation Phases

| Phase | Scope | Risk | Depends On |
|---|---|---|---|
| **Phase 1** | Schema migration + `bonus-service.ts` + `bonus-config.ts` + tests | Zero (no UI, no existing code touched) | Ali's answers to Q1-Q3 |
| **Phase 2** | `/admin/bonuses` page + admin grant-to-player + sidebar nav | Low (additive UI only) | Phase 1 |
| **Phase 3** | Wallet UI: show bonus balance + wagering progress in `/wallet` | Low (additive UI) | Phase 1 |
| **Phase 4** | Bet placement integration (bonus-aware deduction + wagering tracking) | **HIGH** (money flow) | Phase 1 |
| **Phase 5** | Invite system: `invite-service.ts` + `/admin/invites` pages + email/SMS templates | Medium (sending) | Phase 1 |
| **Phase 6** | Registration binding: invite code → auto bonus credit | Medium | Phase 1 + 5 |
| **Phase 7** | Affiliate + proposals config toggles (route to bonus vs real) | Low (optional flags) | Phase 1 |
| **Phase 8** | Withdrawal forfeiture/blocking + expiry cron | Medium (money flow) | Phase 1, Ali's Q3 answer |

---

## 8. Test Plan

### bonus-service.test.mts
```
creditBonus:
  - Creates BonusGrant with correct fields
  - Increases wallet.bonusBalance atomically
  - Respects per-wallet lock (no race conditions)
  - Idempotent by sourceRef (no double credit)
  - Sets expiresAt correctly from config

wagering:
  - Bet fully from real balance: no bonus deduction, no wagering progress
  - Bet split (real insufficient): correct split, wagering tracks bonus portion
  - Bet fully from bonus: full amount counts toward wagering
  - FIFO: oldest ACTIVE grant gets wagering credit first
  - Partial fulfillment (60% wagered): grant stays ACTIVE
  - Full fulfillment (100%+): grant → FULFILLED, remainingTzs → real balance
  - Multiple grants: first exhausted, second starts

winnings:
  - Win from bonus bet: payout goes to REAL balance
  - Win from split bet: payout goes to REAL balance

refunds:
  - Voided market with bonus bet: bonus portion → bonusBalance, real → balance
  - Wagering progress NOT reversed on refund

expiry:
  - Expired grant: remainingTzs deducted from bonusBalance
  - Expired grant: status → EXPIRED
  - Non-expired grant: untouched

forfeit (if Option A chosen):
  - Withdrawal with active bonuses: all grants → FORFEITED
  - bonusBalance → 0
  - Notification sent

concurrency:
  - Simultaneous bonus credit + bet: no lost updates
  - Simultaneous wagering on same grant: serialized correctly
```

### invite-service.test.mts
```
campaign CRUD:
  - Create with valid config
  - Validation: name required, bonus > 0, multiplier > 0, expiry > 0

contacts:
  - Add email contacts (valid format)
  - Add phone contacts (+255 format)
  - Reject duplicates within campaign
  - CSV parsing: valid rows accepted, invalid rows flagged
  - Mixed email + phone in same campaign

sending:
  - Send campaign: all QUEUED entries → dispatched
  - Email contacts: Postmark called with invite template
  - Phone contacts: SMS sent with invite message
  - Failed sends: entry status → FAILED, campaign continues
  - Campaign status: SENDING → SENT when all processed

registration:
  - Register with invite code: bonus auto-credited to bonus wallet
  - Invite entry status → REGISTERED, linked to userId and bonusGrantId
  - Duplicate registration: no double bonus
  - Expired campaign invites: registration still works (bonus expiry handled by grant)

rate limiting:
  - Max sends per minute enforced
```

---

## 9. Design Kit — What the AI Already Knows

The AI agent in this session performed 4 exhaustive codebase analyses and has full knowledge of:

### Admin Page Pattern
- **Layout:** `ConfidentialBand` → `AdminSidebar` → `AdminTopBar` → `AdminPageHead` → content
- **KPI strip:** `AdminKpi` components in `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`
- **Cards:** `AdminCard` with glass-panel styling, optional title/sw/action
- **Tables:** `admin-tbl` class, `SortTh` headers, `AdminPagination` footer
- **Forms:** `Field` + `Input` wrapper, server actions, `ActionOverlay` feedback
- **Tabs:** `Tabs` component (line/segmented/pill variants)

### Component Library (all in src/components/ui/)
`Button`, `Chip`, `Input`, `Field`, `Select`, `Tabs`, `Avatar`, `Card`, `Toast`

### Admin Components (all in src/components/admin/)
`AdminCard`, `AdminKpi`, `AdminPageHead`, `AdminSidebar`, `AdminSidebarNav`, `AdminTopBar`, `SortTh`, `AdminPagination`, `AdminAreaChart`, `AdminStackedBar`, `AdminFunnel`, `FeedRow`, `PeriodPicker`, `ActionOverlay`

### Design Tokens
- Fonts: Sora (display), Inter (body), JetBrains Mono (mono/numbers)
- Colors: gold, royal, yes/no, text hierarchy, glass-panel backgrounds
- Bilingual: every label has EN + SW (italicized)
- Mobile-first responsive with Tailwind breakpoints

### Reference Pages (for cloning patterns)
- `/admin/finance` → KPI dashboard + charts + tables (model for `/admin/bonuses`)
- `/admin/players` → Search + filter + sort + paginate (model for `/admin/invites`)
- `/admin/players/[id]` → Detail + tabs (model for `/admin/invites/[id]`)
- `/admin/config` → Config forms with Field/Input (model for bonus config panel)
- `/admin/affiliate` → Leaderboard + ledger + config (close match for bonuses)

**No external design input needed.** The AI can build all pages from these patterns.

---

## 10. Open Questions for Ali

**These must be answered before implementation begins:**

### Q1: Default Wagering Multiplier
What multiplier should bonus money require before it becomes withdrawable?
- Industry standard: 3x to 10x
- Suggested default: **5x** (grant TZS 10,000 → must wager TZS 50,000)
- This is admin-configurable per grant and per campaign, but we need a platform default.

### Q2: Default Bonus Expiry
How many days should a bonus grant last before expiring?
- Suggested default: **30 days**
- Admin can override per grant and per campaign.

### Q3: Forfeit Policy on Withdrawal
When a player withdraws real balance while they have active (unwagered) bonuses:
- **Option A:** Forfeit all active bonuses (industry standard, simplest). Player sees confirmation: "Withdrawing will forfeit your TZS X active bonuses."
- **Option B:** Block withdrawal entirely until bonuses are played through or expired.
- **Option C:** Allow withdrawal of real balance, bonuses stay active independently.
- **Recommendation:** Option A (with confirmation dialog).

### Q4: Affiliate Rewards Routing
Should existing affiliate bonuses/prizes switch to bonus wallet by default?
- **Option A:** Keep going to real balance (no change). Add a toggle in admin config.
- **Option B:** Switch default to bonus wallet. Admin can toggle back.
- **Recommendation:** Option A (backward-compatible, admin enables per reward type).

### Q5: Proposal Prize Routing
Should proposal prizes (currently TZS 20,000 → real balance) route to bonus wallet?
- **Option A:** Keep going to real balance. Add a toggle.
- **Option B:** Switch to bonus wallet by default.
- **Recommendation:** Option A.

### Q6: Campaign Budget Controls
Should there be a cap on total bonus TZS per invite campaign?
- **Option A:** No cap (admin discretion, audit trail only).
- **Option B:** Max TZS per campaign (e.g., TZS 5,000,000). Requires approval above threshold.
- **Recommendation:** Option A with audit logging. Add cap later if needed.

---

## 11. Also Discussed: Bulk Poll Progress Bar

**Not a bug — a design gap.** Single poll generation has a fake client-side progress bar (hardcoded timers). Bulk generation uses `ActionOverlay` which only shows a spinner.

**Fix planned:** Add simulated per-poll progress to bulk generation (same fake-timer approach as single). Low priority — tackle after Bonus Wallet.

**Files involved:**
- `src/app/admin/ai-polls/poll-actions.tsx` (lines 306-388, BatchGeneratePanel)
- `src/components/admin/action-overlay.tsx` (needs progress bar variant)
- `src/lib/server/ai-poll-generation.ts` (line 819+, generateAIPollBatch)

---

## 12. How to Resume This Work

### For Ali
1. Read this document
2. Answer questions Q1 through Q6 above
3. Start a new Claude Code session with the prompt below

### Prompt for Next Session
```
Project: 50pick (Kipindi)
Location: C:\kipindi-main
Repo: github.com/alisheib/kipindi
Deploy: Railway auto-deploys on push (https://www.50pick.tz)
DB: Postgres on Railway

Start of session:
  cd C:\kipindi-main && git pull

End of session:
  git add . && git commit && git push

Rules:
- Always build (next build) before pushing
- Never make API calls on server boot/deploy
- Commit AND push — Ali reviews on Railway, not local

Read the full plan at docs/bonus-wallet-plan.md — it contains the complete
Bonus Wallet feature specification, schema design, implementation phases,
test plan, and file list. The previous session already analyzed every
relevant file in the codebase (wallet-service, payments, affiliate-service,
proposals-service, email, sms, notifications, all admin pages, all UI
components). No additional exploration is needed.

My answers to the open questions:
  Q1 (wagering multiplier): [ALI FILLS THIS]
  Q2 (bonus expiry days): [ALI FILLS THIS]
  Q3 (forfeit policy): [ALI FILLS THIS - A/B/C]
  Q4 (affiliate routing): [ALI FILLS THIS - A/B]
  Q5 (proposal prize routing): [ALI FILLS THIS - A/B]
  Q6 (campaign budget cap): [ALI FILLS THIS - A/B]

Begin implementation starting from Phase 1 (schema + bonus-service + tests).
Commit after each phase. Build before pushing.
```
