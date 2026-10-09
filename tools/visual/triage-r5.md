# Round 5 triage (tiles-r5, vodacom-visual 88ee1a42) — readers as they land

## VERIFIED in round 5 (r5-1, r5-2)
R4-A no-bets pair centred (phones 15–16 / 16, desktop 22–23 / 22–23, card height unchanged) · R4-A sw 390 top row (two
lines, category left, time right; en/zh/768+ one line) · R4-B the Needle ≥238px from the bubble · R4-E capsule centred
(zero, compact 9.9M, 999,999, held, masked — within 0.5–1px) · R4-E deposit methods 3+2 at 1280, two columns + spanning
tile on phones · rounds 2–3: header/page edges 16/32, sw headline x16/x32, "Tanzania." whole, en 1024 lead, zh trust line
and lead, held wallet without "Chagua upande…", bell 29/29, deposit first line 27/35, back-link chevron, "200毫米" whole.
NOT SHOWN on r5-1/r5-2's tiles (no pool, no ticker, no unread badge): R4-A pool label, ticker fade, journey bell badge.

## FIX
F1  zh 320 featured title splits the WORD 超过: "…降雨超 / 过200毫米" (r5-1 029; r5-2 059 074 084 097 109) — the
    figure glue took the ideograph before the number. Sent to the text-shaping reviewer (keepFigures on the tip).
    → only the number + unit is glued; 超过 never split.
F2  Featured card at 1024–1280 sits 4.5–6.5px low against the hero column (centred on the layout box, not the ink): a
    near-miss with the eyebrow (en 1280 card top y197 vs eyebrow y193; 034 1px under the eyebrow's bottom). Raised by
    three readers (r4 CHECK). → top-align: the card's top edge on the eyebrow's cap top at every desktop width.
F3  Held Wallet sheet footer (092 sw 390): frozen box → hairline 16, hairline → actions 8, actions → border 20 — the
    hairline hugs the actions. → equal air both sides of the hairline.
F4  The en featured title wraps greedily — "…exceeds 200mm / in July" (49px vs 286px at 390; 1024 too) → balanced.
F5  CAPTURE (qa-journey-shell, repo harness): hover left on a desktop nav tab (095 099 held 1024: hover box + a second
    underline beside the active one) → park the pointer before every shot (R4-G's parkPointer technique).
CHECK: the zero-balance lead splits "mobile / money" and "pesa ya / simu" (a payment term); the zh frozen box text 1.5px
    high (17 | 20 vs 19 | 18); the deposit's selected-tile check badge 3px from the M-Pesa logo at sw 320 (067); the
    avatar disc colour changed between r4 and r5 ((30,51,148) → (0,56,148)) — intended?
OWNER (item 10/20 class): classic en 1280 (010): the Needle now rests on the featured card's right frame (~6px inside,
    glow over the pool bar) — R4-B's carried rest point; r4 rested on the rule below. Classic gold dots on "• Juu na
    Chini" (nav and rail) — frozen classic chrome vs gold-is-money.
DOUBT: classic dial rest height differs by language at one cell (the rest carries between pages — by design).

## r5-3 (tiles 113–168) — VERIFIED: R4-A sw 390 top row (63px apart), the pool line ("Bwawa" label ink + "TZS 10,800"
mono, same baseline), the ticker fade (17–19px solid, ~24px fade, full ink after; 32px edges at 1280); R4-B (no dial
near the bubble); the bell badge (≥1px of bar between ring and dome, no rose glow, 29|29); R4-C Tiketi zangu 42/42 and
its unread signs; R4-D chart controls 12/12/12, star 25|25, title edge x16/x132; R4-E card-size row (56px, glyph and
switch both at 477.0), Needle row glyph (198,209,236 like its siblings), guest sheet × (0.0–0.4px), "Weka mipaka" ring
(7/6px air, text unmoved), capsule centred. Earlier rounds hold (hub 2 columns, ticket grid, empty state 48/48, market
page columns and watermark).
F3+ The Wallet sheet (390: 132 134 136 151 152) and popover (1280: 133 135 137 153 154) in EVERY state: the hairline above
    the bottom row sits 17–18px under the captions and only 8px above the Funga/Close button's border (the links' text
    ~25px under it) → the hairline centred in its gap, the row's controls on one rhythm.
F6  Tiketi zangu sub-tabs (165–168): the first tab's underline starts 12px and its label 20px inside the column edge
    (390: x28/x36 vs x16 for heading, rule, chips, cards; 1280: x144/x152 vs x132) — R4-E's "one content edge per
    column" → the first tab's label on the column edge (its underline with it).
F7  Docked sheets (tickets sheet, Wallet sheet) draw their outer border along the screen's last row (y779, inner line
    y778, square corners) — a sheet flush with the bottom has no bottom border.
CHECK: the Up & Down chart with a dead price feed reads "Inapakia…" (loading) for ever on a 1216px empty card (163 164)
    — a dead feed must say so (an existing "no price" sentence?), never "loading" indefinitely; the probability bar's
    marker in money gold (243,203,122) on the featured card and market bar — gold-is-money ruling; header focus rings
    2–3px from the next control (balance ring → gold pill 3px; "Ingia" ring → "Jisajili" 3px) at 390.
DOUBT: zh dial rests 18px higher than sw/en for the same cell (130: 10.5px from the 帮助 chevron — at the glow's edge).
OWNER: the "holding" notice (161 162) and every warning drawn in gilt (`--warning-fg` = gilt) — R4-K's owner item.
S12: zh 直播 (ticker, hub) vs 实时 (featured chip) for LIVE; sw chart spans "15M 1H 7D" (English letters) vs SIKU/SAA/
    DAK/SEK; "Bado hakuna dau za Juu na Chini" vs "…litaonekana" (noun-class agreement, native speaker); zh ticker word
    order "已结算 否 在 Will…".

## r5-5 (tiles 225–280) — no new measured defect; VERIFIED: R4-C Tiketi zangu 42/42 (three layouts); R4-E card-size row
(56px, glyph and switch at 153.5), Needle row glyph, capsule centred on all 51 player tiles (≤0.5px, margins ±1px); the
journey bell badge on 15 tiles (no red on the dome, ≥5.4px clear, no rose glow, 29|29); R4-B (≥138px from the bubble);
R4-F journey footer pill on one line at 1280. Rounds 2–3 hold (18 empty states 48/48, pills 18px, hub 56px rows and
16px gaps, header edges, strip fades, zh motto upright, "Tanzania.").
F8  The journey bell badge's DARK DROP still darkens the dome's right shoulder by up to ~16 per channel (225: x1175,y23
    426 vs mirrored 475) — the bar is opaque, the badge's own dark ring separates it → no drop shadow on the journey
    badge (the classic keeps its glow and drop).
BY DESIGN: the capsule box is the wider of figure and mask (D31/rule 8a), so a 5-digit balance has a narrower box than
    a 6-digit one; WIN pills in gold (M3: a resolved win is money earned); the Needle's rest differs by locale in one
    cell (the position carries between pages).
CHECK (gold audit): the empty-state illustrations' accents (223,176,59 — compass needle, briefcase clasp).
E45 still to settle (zh empty-state title/button face) — M16b's CDP font probe.
S12: sw "Juu na Chini" (empty state heading and button) vs "Juu/Chini" (nav, rail, tab) on one screen.

## r5-4 (tiles 169–224) — VERIFIED: R4-A ticker; R4-B (dial far from the bubble, ≥24px from text); bell badge; R4-C
/results 390 34·12·34 and 1280 34·12·12·34, notifications 34·12·34, /markets 1280 35·12·12·34 with dividers 23|23 and
14|14, Tiketi zangu 42/42 on 14 tiles, Wallet 12/12, notification title/body/✓× (centres within 0.6px), unread signs on
all ticket tiles; R4-D chart controls 12/12/12, /live rows level + 16px gutters + caption centred upright, market page
star 25|25 and title edge, tallies lower case, /markets 390 count line; R4-E badge names, one content edge per column
(x41/x165), AKAUNTI 16/16, fairness numerals, agent hints, "Act 2022", withdraw 2×2/4-across, capsule. Earlier hold.
F9  LOGIC+lang: a Swahili notification body reads "…kuanzia 9 Oct 2026, 11:53…" (192) — market-service.ts:2280 builds ONE
    English date (formatDateTime) and notification-service.ts:1095–1097 puts it into the sw, en and zh bodies → each
    locale's body formats its own date (eat-day's localized formatters); zh too.
F10 LOGIC: notification-service.ts:1095–1097 cuts a title at 60 chars (sw/en) / 45 (zh) with NO ellipsis — a long title
    ends mid-word → cut at a word boundary with "…" (or never cut: the UI clamps).
F11 Journey Wallet page (171 172): its buttons read "Amana" / "Toa" while the header pill says "Weka pesa" and the
    journey's keys are "Weka pesa" / "Toa pesa" → the journey page uses the journey's keys (en is Deposit/Withdraw for
    both already; composition, no new words).
F12 /results 1280 featured meta "TZS 19K imekamilika · ⚇ 2 Watabiri" — capital mid-line (cards say "2 watabiri") → the
    sentence word.
F13 Wallet 1280 (172): a 57px empty band under the WAKATI chips, then only the right-aligned "Risiti zote" link, then
    47px to the chart card — every other filter bar has 34 to its content → place "Risiti zote" so the rhythm holds.
F14 Wallet sw 390 (171): the count line "Miamala 19" 8px under the chips (on /markets it is 12 after R4-D) → 12.
F15 /markets 1280 BWAWA chips "TZS 10k+" / "TZS 50k+" in the sans with a lower-case k, while every compact sum is mono
    with a capital K ("TZS 49K") → the money format.
F16 Legal rules sw 390 (210) heading "Kanuni za / Michezo" (wraps by a few px) → balanced.
CHECK: the /markets grid cards' pool figure "TZS 10,800" unlabelled at ~11px (R4-A fixed the featured card only; R3-A
    measured no room for a label at 360) — a pool glyph as its label? (owner/S2 if not); /markets 390 box → filters 31
    vs 34 elsewhere; the featured state pill 19.3px vs the 18px category pill beside it; the AML heading's gradient dims
    its line 3; the guest hub's "Matokeo" and "Uthibitisho wa utatuzi" share one glyph; the agent page's three stat
    treatments and its 5-line italic lead (page-header reserves the slot for a short tagline); the Up & Down chart blank
    with a dead feed (with r5-3's CHECK).
GOLD (audit list): the notifications unread-count dot gold (the rail's is periwinkle); agent page "GHARAMA TZS 100,000"
    (a fee the agent PAYS, gold), "10% ya ada halisi", step numerals; proposals eyebrow/trophy/clock; /results crown and
    "MATOKEO MASHUHURI"; fairness numerals; badge rings and "5/20".
S12: sw "Imetatuliwa" (resolvedOutcome) vs "Imekamilika" (statusResolved) for one state on one page (/results);
    "siku 1 zimebaki" (singular agreement, as "masaa 1 yamebaki").

## r5-6 (tiles 281–333) — VERIFIED: capsule on 36 tiles (≤1px); card-size row (56px, both at the row centre; sw 360 the
known 73px); Needle row glyph at every width; R4-B zh 320 27.4px from the bubble's ring (was overlapping); the journey
bell badge (ring 1–2px clear, no red, no rose glow, 29|29, 11px from the avatar); ticker (17px solid then the fade;
classic hard edge by design); sw 390 top row 63px; pool line (classic 330); /results 34·12·34; Tiketi zangu 42/42; earlier
rounds hold (edges, hub columns 16px, 57px row pitch, channels panel 46/46, KYC back-link and stepper, zh hint, motto).
F17 Hub row "Thibitisha ID" (sw, 331) while the page it opens is "Thibitisha kitambulisho" (h1, eyebrow) — one page, one
    name: the row uses the page's key (composition).
F18 The journey footer at en 1024 (307) splits the regulator's name: "Licensed by the Gaming / Board of Tanzania." —
    "Licensed by the / Gaming Board of Tanzania." fits (166 of 232px) → keep the regulator's name whole (journey footer
    only; the classic footer is frozen chrome).
F19 The featured card's tracked "NDIO" label ends x355 while everything it lines up with ends x357–358 ("67%", the time
    left, the pool bar, the HAPANA button) — the trailing letter-spacing/side bearing (R3-C's right-aligned heads class).
F20 The channels panel's × sits 1.7px below the title's cap-band centre — R4-E put the guest sheet's × on the cap band:
    one convention for both closes.
BY DESIGN: the avatar fill differs between runs (derived from the user's id; the in-memory server mints new ids per run);
    the 1024 header shows the mark without the wordmark (the A5 fit rule); the Toka card under unequal hub columns
    (owner item 8, "column bottoms may differ"); the dial's rest per locale (carried).
GOLD (audit list, r5-6): /results resolved pill "IMETATULIWA · HAPANA", "MATOKEO MASHUHURI" + crown, the signed-out
    notice's text/icon/"Ingia" (the warning token = gilt); the KYC stepper's active step "NIDA" (ring + label, capsule gold).
S12: zh footer "许可证: …" (half-width colon + space after CJK; the shared ": " join) and its mixed slash styles; zh
    "© 2026 50pick · Tanzania" under a localised line; en footer proposals link "get / paid" at 1024 (needs a full-footer
    tile — the journey footer is balanced since R4-F).

## qa:bar-geometry, judged (BM control on main a6331ca1 vs M15 tip 88ee1a42; stick-probe M15x)
- 88 failures are identical on main and the tip: the drive is STALE on main (NO [data-filter-rail] on seven routes that
  no longer carry one, /markets 360 OVERLAP lines, sticky checks) — it guards nothing as it stands → a repair task for
  the instrument (not this pass's product code).
- The tip's 4 extra ("THE BAR DID NOT STICK" /results sw/en/zh 1280, /notifications zh 1280): the probe shows every page
  at its MAXIMUM scroll (559/559 — the in-memory fixture is thin), the bar at the bottom of its own parent (room below
  0 on /results), pushed off by the parent's end — the same mechanism main shows (/markets −98 on main). R4-C moved
  the bar 35px higher (natural top 210 vs 245: the empty band gone), so the push lands past the drive's 0..200
  tolerance. Real data (production: 12,479 resolved markets) gives a long page and a stuck bar. BY DESIGN of sticky;
  the instrument should report "page too short to prove a stick" when the parent ends inside the scroll.

## For the follow-up round (R5-G, after R5-A/C/E merge — consistency items the R5 helpers named)
G-1 One page, one name (journey): /wallet/deposit's h1 "Amana" (eyebrow "WEKA PESA") and /wallet/withdraw's "Toa fedha"
    (eyebrow "TOA") sit under journey buttons saying "Weka pesa" / "Toa pesa" (R5-B) → the journey's pages take the
    journey's keys (composition; classic keeps its words).
G-2 The segment loading skeletons still ride every refresh of their pages (R5-D measured: wallet/receipts 9,466 B,
    results 8,217, wallet 6,698, positions 5,125, markets 4,721, live 3,551, markets/[id] 2,963, updown/[roundId] 1,614
    every 5 s while awaiting a result) → the G1 technique (a client drawing; the server passes only what the browser
    cannot know). Also the /wallet ghost draws no filter bar at all (pre-existing, R5-B).
G-3 journey-flag.tsx:18 raises its flag in a passive effect → one frame of the old journey answer on a refresh that flips
    it (R5-D) → raise in a layout effect, lower in the passive cleanup.
