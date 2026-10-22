# S6 addendum — the helpers' results (draft; merged into the second hand-back)

## Lint (helper; traced by hand on copied regex literals, no repo code run) — verdict NOT merge-ready
- Round 17's review sentences all get the ruled verdict; suite 635/0 (floor 634 = printed 634 ran), red 29/29.
- HIGH 1 limit/price early return (:486 before :491/:517/:521; windows [^.!?;,]{0,24}$ cross the stake figure):
  "Weka TZS 1000 upate TZS 50,000,000 Ijumaa", "Deposit TZS 1000 and get TZS 50,000,000", "Ukiweka TZS 1000 utapata…"
  (REGRESSION via M4), "Ticket price TZS 1000 for TZS 50,000,000", "Bei ni TZS 1000 tu kwa TZS 50,000,000".
  Fix: windows [^.!?;,0-9]{0,24}$; compute gets before :486 (limit && !gets, price && !gets); ranges on their own words.
- HIGH 2 prize sentence + bare-figure sentence ("Shinda Ijumaa hii! TZS 50,000,000!"): sentenceOf :290-297 joins back
  only ≤2 words. Fix: a figure whose own sentence is ≤2 words joins the previous sentence whatever its length.
- HIGH 3 reader rule holes: (a) money needs a shilling word (:504) — "Imagine 10,000,000 in your wallet!", "$1,000,000";
  (b) time word before a sw you-verb (CLAUSE_START :400) — "Ijumaa utakuwa na TZS 10,000,000!"; (c) you-verb after the
  figure (READER_AFTER :385); (d) account words anywhere (ACCOUNT_FACT :392, HYPOTHETICAL :395) — "Salio lako litakuwa
  TZS 10,000,000 Ijumaa!".
- HIGH 4 payments by 50pick (H2) escape: limit return first; narrow payer/payee verbs — "Tumetoa TZS 500,000,000 kwa
  wachezaji", "We transferred TZS 80,000,000 to players", "TZS 500,000,000 paid out so far!", "Wachezaji wetu wamepokea…".
- MEDIUM 5 narrow GET/PRIZE lists; who-questions; stake needs a currency on both figures.
- MEDIUM 6 COUNT_AFTER before the prize rule (:574): "Shinda TZS 50,000,000 Watanzania wote!".
- MEDIUM 7 NEW in r17: the stake rule refuses ordinary two-figure copy (ranges, VIP price tiers, charity, "Ongeza … upate
  bonasi", rate "TZS 1,000 per TZS 1,000,000", two taxes).
- MEDIUM 8 NEW in r17: "malipo" any payment; "Wewe je?" after someone else's spend; INCOME_QUESTION on others' money;
  joined question's reader over someone else's figure; payee without 50pick (Yanga's players were paid…); "We pay out up
  to TZS 5,000,000 a day".
- MEDIUM 9 QUADRATIC TIME on the server: the save action has no length cap (campaigns/new/actions.ts:82-106; Next 1 MB),
  composeMarketing runs the lint after the length refusal (footer.ts:144-162); TAX_HEADS (:359) and MONEY_IN (:404)
  quadratic on a long whitespace run; per-figure re-split of the whole text (:291-292, :464, :515). Helper's measurement:
  8,000 spaces → 116 ms, quadrupling per doubling → ~1 MB ≈ 30 min of a blocked event loop (one growth-role request).
  Fix: skip the rules over 640 chars (the length rule refuses anyway), collapse \s+ in baseForm, spans once per text,
  no adjacent \s* in TAX_HEADS. Case: that body < 50 ms.
- MEDIUM 10 FRAME still frames i-/li- class waits ("Yanga inasubiri mshambuliaji wa TZS 1,000,000,000").
- LOW 11 L2 rewrites still spell carve-outs ("every figure is a claim unless …"); :252 is false; :454 not enforced.
- LOW 12 L3 incomplete ("Win TZS 1OOOOOO"); REGRESSION: "Derby leo | 100 000 tiketi zimeuzwa!" folded to 1,100,000.
- LOW 13 suite/red gaps (PLATFORM_PAYS alternatives without a sole case; sender-strip :490 without a plant).
- LOW 14 L4 redundant (the composer refuses non-GSM already) but sound.

## Words / RG (helper)
- H1 = MB-44 (ruled: drop the figure). Wording given: en "No ticket reached 10/10, so the jackpot carries forward to Week
  {n}, with no fee." sw "Hakuna tiketi ya 10/10, hivyo jackpot imehamishiwa Wiki {n}, bila ada." zh
  "无 10/10 彩票，大奖滚存至第{n}周，不收费用。" (+ "to the next week" forms).
- H2 HIGH (verified): a self-excluded winner (the only CANNOT_SIGN_IN status that reaches the paid branch — SUSPENDED and
  CLOSED are held, maswali-settlement.ts:107-108) is told "Our team pays it to your registered number when you ask"
  (notification-service.ts:2927-2929, email.ts:1463-1464; SMS "Contact 50pick support to receive it",
  maswali-winner-sms.ts:87/92/96). No code can: self-exclusion freezes the wallet (responsible-gambling.ts:315-316) and
  withdraw() refuses every freeze but an identity-refused return (wallet-service.ts:2113-2114); "OD-13" exists only in
  comments. OD-13 (accepted) = "a Compliance officer pays to the registered number at the holder's request; identity and
  email rules unchanged" — the officer payout act was never built. Lead: build it before ACTIVE, or until then the true
  wording: en "Your account cannot sign in, so this share cannot be withdrawn in the app. Contact 50pick support about
  it." (sw/zh in the helper report).
- M1 ladder words: "typed identity details" is an internal mode name; use the platform's withdrawal words (faq3a,
  wallet.securedBody, taxNotice).
- M2 decided words not applied (hard-coded strings): zh 主题→正选题; zh ordinals 第${n}题; zh 派发; sw "imeletwa mbele"→
  "imehamishiwa"; en "Ticket cut"→"Ticket bought" (ruling 7; verified S5rel ticketCut="Ticket bought"); sw/zh objection
  window words; " EAT" after times; close-moved titles. Structural fix: read the millionea dictionary namespace.
- M3 win notice lacks pool/fee/shared-by (R-HEADLINE "the win result shows pool, fee and paid") — owner to confirm.
- M4 approved wordings say "this week's questions" even when no week is on sale — timeless wording or refuse unless open.
- M5 gold chrome and dead buttons for readers who cannot sign in → royal, no buttons.
- LOW: not-won letter "Keep this reference" without a reference; held-win subject count; mixed paid+held winner (wallet
  frozen but ladder given); held-share wording ("held for now" vs S5 "Held for review"); raw void code fallback;
  sw/zh missing objects; DRIVE week told "carried forward".
- Card (#8): central claim now true; inexact parts — absent-newest letters closed but counted as failed; success note;
  dialog; empty message; sw label. Wording given.

## Open items (helper; spot-verified: inclusion-proof gate, Ticket cut, float_unread, alerts audience, closure screen,
## scripts' complaint routing)
- Item 1: /fairness proof page still on millioneaGate (int …/[serial]/page.tsx:29,46,70) → millioneaTicketGate (L5).
- Item 2: receipt "Ticket cut" (ruling 7); N's red (6b) via S5/S7.
- Item 4: TAX-REPORT.md says OD-08 owed (recorded 2026-10-21); test:tax-report has no floor.
- Item 6: harm-watch window literal (HARM_WATCH_CANDIDATE_DAYS) — needs exported detector windows.
- Item 7: privacy notice NOT STARTED (tickets in exports, salt, 7-year keep); S5 just moved the privacy page (edf79c2b0).
- Item 8: EVIDENCE_WEEK_ACTIONS lacks maswali.settlement.float_unread (S7); Auditor scope vs MB-92 (decision).
- Item 9: chat handoff missing; census decisions (admin-act-gate, unsaved-changes, type-scale) unrun; scripts route a
  check-window claim to "Compliance rules on it" while binding §6 has the sealing officer correct; header says the guide
  "is not written yet"; death script awaits legal review.
- Item 10: operator guide lacks evidence/lookup/notices/…; says "verified identity"; MASWALI-ARCHITECTURE lacks D/N/R
  modules; Terms section NOT STARTED; rules version not stamped on tickets (maswali-money-service.ts:466); stale-form
  rule missing from binding §11.
- MB-11 partial: float not checked before crediting; Millionea alerts strip on /admin only for trading viewers + Owner
  (Finance and Compliance never see the float or 24h alerts); SAR provenance not started. MB-33 partial (register page
  lacks criteria/evidence). MB-35 partial (no alert when a cluster holds a winner; SAR provenance). MB-44 partial
  (millioneaClosureTickets has no caller). MB-70 partial (slip strip). MB-86 partial. MB-91: maswali-config 1.10 says the
  5-day answer is owed. MB-93: alert audience.
- Suites: fairness (int), reporting (R), notify/claims (N) exist only on lanes; maswali-rbac pin 25; maswali-config floor
  from the merged tree.
- Dangling shas: legal lane's 3e8ba9a6, 4c70541a, 7ff0cfde, 87893ff8, c252ef65 already unreachable (cited in
  COMPLIANCE-DECISIONS, millionea-rules-version.ts, house-bot-chatbot-cases.mts); R's and N's will dangle at deletion.
- For Ali (helper's list): SmsMessage probe; death script legal review + OD-18 before the Terms section; approve the four
  campaign wordings; Auditor scope; GBT's OD-08 answer; L17 "corrected on objection".

## S5 moved
origin/claude/maswali-s5-release is now edf79c2b0 (4 commits after 81e312f01: ratchets; English buy wording in the
privacy notice; D19a's privacy pin; red:journey-home anchor) — touching COMPLIANCE-DECISIONS, house-bot-absence-cases
(D19a), privacy page/test: re-run the maps at the integration's start.
