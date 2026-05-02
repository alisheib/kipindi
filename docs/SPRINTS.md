# Kipindi — Sprint Plan

Each sprint is gated by a **government / regulator validation milestone**. Build proceeds in sprints; validation gate sits between sprints. Working name: Kipindi. Folder: `C:\kipindi`.

---

## Pre-Sprint Gate (BLOCKING)
**Status:** ❌ Outstanding
**Owner:** Ali + Tanzania gaming lawyer
**What:** Confirm pool-based time-window model classifies as **betting** under the held license, NOT lottery. Get written legal opinion on file.
**Why blocking:** Wrong classification = wrong license = shutdown risk after launch.

---

## Sprint 0 — Foundation (in progress)
**Output:** working scaffold, design system wired, schema in place.
- [x] Folder + Next.js 16 + TS + App Router + Tailwind 3
- [x] Design tokens fully wired (light + dark CSS variables, Tailwind config)
- [x] Theme provider + light/system/dark toggle
- [x] Logo component (4 variants from LOGO_SPEC)
- [x] Token-showcase home page (verifies the system in browser)
- [x] Prisma schema covering: User, Session, OTP, Device, KYC, Wallet, Transaction, Sport, League, Team, Match, MatchEvent, Window, Pool, BetBundle, Bet, AntiFraudFlag, MatchIntegrityCheck, ResponsibleGambling, Notification, AuditLog, AffiliateAgent, ProviderHealth
- [x] `.env.example` with every external integration named
- [ ] PostgreSQL via Docker compose (next step before Sprint 1)
- [ ] CI workflow (lint, typecheck, prisma validate) — light pass

**Acceptance:** `npm install && npm run dev` shows the token-showcase page; both modes work; `npx prisma validate` passes.

---

## Sprint 1 — Auth + KYC
**Validation gate:** TZ regulator review of KYC flow + NIDA integration + age gate + helpline visibility.
- Phone-first registration (TZ +255)
- OTP via SMS (Selcom or Beem)
- NIDA number entry + verification API integration
- Document upload (ID front, back, selfie) with blur detection
- KYC review queue (admin)
- Age gate at first launch
- Self-exclusion / responsible gambling settings UI
- Session management + active sessions list
- Re-auth modal for sensitive actions
- Audit log writing on every auth/KYC event
- `Why we ask` popovers on every KYC field

---

## Sprint 2 — Wallet + Payments
**Validation gate:** TZ regulator review of AML thresholds, withholding tax math, deposit-limit enforcement.
- Wallet card UI (balance, pending, hold)
- Deposit flow per provider: M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Mixx (via Selcom or Azampay aggregator)
- Card payment (Stripe or local processor)
- Withdrawal flow with AML review hold UX
- Tax handling: 25% gaming tax + 15% withholding deducted at withdrawal
- Transaction history + filters + receipt PDF
- Provider health monitoring
- Daily/weekly/monthly deposit + loss limits

---

## Sprint 3 — Match data + Pool engine
**Validation gate:** Internal math review with betting-platform consultant; stress-test pool model under cold-start liquidity.
- API-Football integration (matches, scores, events)
- Live score push via WebSocket
- Window lifecycle: open → close → settle
- Pool calculation engine (proportional payout)
- House seed liquidity for first 6–12 months
- Match list, match detail, time-window selector
- Pool display + (signature) PoolPulseRing

---

## Sprint 4 — Bet placement + Settlement
**Validation gate:** Regulator demo of bet flow end-to-end including loss reframing and responsible-gambling timer.
- Stake slider with live return estimator
- Single bet flow
- Bundle bet flow + correlation guards
- Optimistic UI with rollback
- Settlement engine (idempotent, transactional)
- Cash-out (with locked / value-changed states)
- Win celebration + Loss echo (no red explosion)

---

## Sprint 5 — Real-time + Notifications
**Validation gate:** SMS template approval by mobile carriers; push approval by Apple/Google.
- WebSocket layer for live pool, score, momentum
- Push notifications (FCM + APNS)
- SMS templates (20 from DESIGN_SYSTEM §2.16) — EN + SW
- Email receipts + monthly statements
- In-app toast + banner system
- Notification center

---

## Sprint 6 — Anti-fraud + Match integrity
**Validation gate:** Submit anti-fraud + integrity-monitoring posture to TZ Gaming Board.
- Device fingerprinting
- Multi-account detection
- IP/device overlap clustering
- Velocity flags
- Stake-pattern anomaly detection per window
- Match-fixing suspect flagging hooks (Sportradar Integrity API ready)
- Risk score per user
- Admin investigation tools

---

## Sprint 7 — Responsible gambling + Admin
**Validation gate:** TZ regulator final audit of compliance UI before public launch.
- Reality check overlay (30/60 min)
- Self-exclusion (24h, 7d, 30d, 6m, permanent)
- Cooling-off
- Helpline card always reachable
- Admin dashboard (live ops, KYC queue, payment health, fraud signals)
- Admin Users / KYC / Transactions / Bets / Audit / Anti-Fraud / Integrity pages
- Tax & accounting reports
- CSV export everywhere admin

---

## Sprint 8 — Mini-games + Engagement
**Validation gate:** Marketing approval; if any game has its own license requirement, classify before launch.
- Tribal Clash (8 abstract factions)
- Lucky Interval spinner
- Momentum Rush
- Streak Chain
- Voice Bet (Swahili wake word)
- Leaderboards
- Time Window Heatmap

---

## Sprint 9 — Polish + Soft Launch
**Validation gate:** Final regulator sign-off; soft launch in Dar es Salaam only.
- Performance pass: < 250 KB initial JS, LCP < 2.5s on 3G
- Accessibility pass: WCAG 2.2 AA against every component
- Multilingual QA (every string EN + SW)
- Low-data mode toggle
- Offline shell
- Onboarding walkthrough + coachmarks
- Full test suite
- Soft launch with capped user count
- Iterate based on first-1000-user telemetry

---

## Validation gates — what each looks like
1. **Legal classification** — written opinion from gaming lawyer.
2. **Regulator KYC review** — meeting + demo at Gaming Board.
3. **AML/tax review** — same.
4. **Math review** — independent betting consultant report.
5. **Bet flow demo** — regulator demo session, recorded.
6. **Carrier/store approvals** — SMS sender ID; Apple/Google store reviews.
7. **Anti-fraud posture** — written submission to regulator.
8. **Compliance audit** — final pre-launch audit.
9. **Public launch sign-off** — regulator approval letter.
