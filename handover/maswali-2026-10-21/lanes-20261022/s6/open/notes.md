# S6 open items — working notes (read-only survey, 2026-10-22)

Heads: int 81c60f0f5 (base 3f6af84e1) · R 57624a2fa (base b495ede21) · N bd74c982c (base b495ede21)
S5 release local tip 41e61987c (81e312f01 + 1 commit) · S7 0f0d42fcc · main 67e47f8d2
Every S6 file exists only on the lane branches (none on main/S5/S7).

## Confirmed lead-survey items
- int maswali-config MIN_ASSERTIONS 56 (S7 77) -> merged printed count
- int stale-form rule only in ruleSunset (dict 3556/6423/9259); binding rules §11 (_content-millionea.tsx:314-338) lacks it
- dangling shas: legal-lane 3e8ba9a6 4c70541a 7ff0cfde 87893ff8 c252ef65 already unreachable from every ref
  (COMPLIANCE-DECISIONS.md, millionea-rules-version.ts, house-bot-chatbot-cases.mts); R shas 2bd52278 9246708b f1769983 in
  int's COMPLIANCE-DECISIONS; R e3ab693a (house-book floor comment); N 05896502 1c359163 44e86a8c 9533cfe7
- R: pools page money()/CANNOT_BE_READ vs S7 "Unreadable" (pools:21, admin/maswali/page.tsx:69-72); R pools:73 formatTzs(v.requirement)
- R: HARM_WATCH_CANDIDATE_DAYS = 8 literal (harm-watch.ts:55); responsible-gambling.ts exports no detector windows
- N: rbac pin 23 on N and S7 (21 base) -> merged 25 (S7 saveMaswaliConfig/saveMaswaliHolidays + N markMillioneaWinnerReached/clearUnresolvedLetter)
- N: SmsMessage prod measure (migration header query)

## New findings
- int proof page asks millioneaGate (⏳ swap to millioneaTicketGate) fairness/millionea/[serial]/page.tsx:29,46,70
- rules version stamp not wired: maswali-money-service.ts:466 `${week.code}@${rules.frozenAt}`; MILLIONEA_RULES_VERSION only on rules page
- Terms page: no Millionea section (MB-69)
- privacy notice: only S5 slip paragraph; no tickets/exports/retention text (item 7)
- operator guide: no lookup/evidence routes, no scripts/notices/claims/tax/house-book/measures; "A result is wrong" routes to trading officer vs scripts' Compliance; "verified identity" vs "typed identity details"
- ARCHITECTURE.md: no evidence/support/lookup (D), notify/claims/winner-sms/marketing (N), tax/house-book/catalogue/finance-window/measures/harm/week-record (R)
- support-scripts header says operator guide "not written yet" (stale)
- evidence EVIDENCE_WEEK_ACTIONS lacks maswali.settlement.float_unread
- AUDITOR: pools/integrity/evidence only, not trading console (/admin/maswali) — MB-92 text says /admin/maswali
- N receipt title "Ticket cut" (notification-service.ts:2734) vs Ali 2026-10-21 ruling 7 "Ticket bought"
- N red:maswali-money-path plant 6b missed (handover MERGE-NOTES 370)
- N migration 20261018120000 sorts before main's 20261018150000_counts_as_by_hand
- MB-11: post-credit floatCheck alert visible only to trading viewers (consoleAlerts gated canView trading); Finance sees pools KPI (pending vs float, no buffer); SAR provenance absent everywhere
- MB-35: no alert when a cluster holds a winner (page ordering only); SAR provenance absent
- MB-33: register week page prints no criterion, no seal evidence; L17 corrected-on-objection
- MB-70: slip rules strip = final/reserve/cap/main-only (+close time); lacks all-15, week void, void deadlines, absolute close, last-5-min
- MB-44: millioneaClosureTickets has no page caller on S5/S7/int
- MB-86: script "awaits legal review"; no estate-payment act
- MB-64: no Millionea chat handoff (send-message.ts has no Millionea topic; LLM passage says raise with support)
- TAX-REPORT.md:18,236 still say Finance confirmation owed (ruled 2026-10-21)
- agent terms version not bumped (OD-20, Gate B 10)
- Millionea campaign wordings (claims.ts:824-833) have no recorded owner approval
- test:tax-report and the pre-existing suites have no floor constant
