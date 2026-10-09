# R5-B brief — wallet, sheets, notifications, tickets, bell

You are helper R5-B in round 5 of 50pick's visual pass for Vodacom. Read first, completely: S\briefs\r5-common.md (the
rules — consistency above all), then S\visual\triage-r5.md (the findings with tiles and measurements).
Worktree: F:\kipindi-r5b (branch vodacom-visual-r5b at 1699302a). Suite: scripts/visual-pass-r5b.test.mts →
test:visual-pass-r5b.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

YOUR ITEMS (ids from triage-r5.md):
- F3 + F3+ the Wallet sheet (390) and popover (1280), in EVERY state (held, normal, break — R4-I added a break notice to
  the sheet, read it): the hairline above the bottom row sits 16–18px under the content and only 8px above the
  Funga/Close button (the links' text ~25px under it) → the hairline centred in its gap and the bottom row's controls on
  one rhythm; every sheet/popover with a hairline over its actions is a sibling.
- F6 Tiketi zangu's sub-tabs: the first tab's underline starts 12px and its label 20px inside the column edge (390:
  x28/x36 vs x16; 1280: x144/x152 vs x132) → the first tab's label on the column edge, its underline with it — and
  every other line-tab strip in the journey (siblings: find them) to the same rule.
- F7 docked sheets (the tickets sheet, the Wallet sheet) draw their outer border along the screen's last row (y779,
  inner line y778, square corners) → a sheet flush with the bottom has no bottom border; every docked sheet.
- F8 the journey bell badge's dark drop still darkens the dome's right shoulder by up to ~16 per channel → no drop shadow
  on the journey badge (its dark ring separates it; the bar is opaque — R4's badge commit removed the rose glow for the
  same reason; read it); classic keeps its glow and drop (frozen chrome).
- F9 (logic + language) a Swahili notification body reads "…kuanzia 9 Oct 2026, 11:53…" — market-service.ts ~2280
  builds ONE English date (formatDateTime) and notification-service.ts ~1095–1097 puts it into the sw, en and zh bodies
  → each locale's body formats its own date with eat-day's localized formatters (R4-I made formatBreakEnd /
  formatEatDateTime the one path for break ends — reuse; read src/lib/break-end.ts); find EVERY notification that
  embeds a date or time (siblings) and fix them all; stored past notifications keep their text (say so).
- F10 (logic) notification-service.ts ~1095–1097 cuts a title at 60 characters (sw/en) / 45 (zh) with NO ellipsis — a
  long title ends mid-word → cut at a word boundary (CJK: at a character) with "…", or do not cut and let the UI clamp
  — decide by reading where titles are shown; every truncation sibling in notifications.
- F11 the journey Wallet page's buttons read "Amana" / "Toa" while the header pill says "Weka pesa" and the journey's own
  keys are "Weka pesa" / "Toa pesa" → the journey page uses the journey's keys (composition, no new words; classic keeps
  its words); check every deposit/withdraw door in the journey for the same pair.
- F13 Wallet 1280: a 57px empty band under the WAKATI chips, then only a right-aligned "Risiti zote" link, then 47px to
  the chart card (every other filter bar has 34 to its content) → place "Risiti zote" so the band's rhythm holds (R4-C's
  search-band rule; read query-bar.tsx's QUERY_* constants).
- F14 Wallet sw 390: the count line "Miamala 19" 8px under the chips (on /markets R4-D made it 12) → 12; every count line
  under a filter bar (siblings) to one rhythm.
- ADDED LATER (consistency, from R5-F's audit of the filter bars): eight routes withhold their filter bar on an empty
  book by design (§A5 — positions/page.tsx:372, wallet-client.tsx:785, updown/history/page.tsx:335,
  proposals/page.tsx:238, watchlist/page.tsx:179, fairness/page.tsx:249, positions/performance/page.tsx:191), but
  /notifications (notifications/page.tsx:192) renders its bar over an EMPTY inbox — a brand-new player sees filters for
  nothing. Bring /notifications to the same rule (withhold the bar — search box included if it is part of the band —
  when there is nothing to filter; keep it once there is), match §A5's wording in your comment, and guard it with a
  plant. (R5-A has /results.)
- CHECKS (decide with numbers; fix if defective): the zero-balance lead splits "mobile / money" and "pesa ya / simu" (a
  payment term — keep it whole with the keep-words technique?); the zh frozen-box text 1.5px high (17 | 20 vs 19 | 18 in
  sw/en); the deposit page's selected-tile check badge 3px from the M-Pesa logo at sw 320 (067); the journey header's
  focus rings ending 2–3px from the next control at 390 (balance ring → gold pill; "Ingia" ring → "Jisajili").
