# Round 3 triage (tiles-m, vodacom-visual 8a2d9d26) — readers b0 b1 b2 b6 so far

## FIX (real, measured)
F1  zh 1024 home hero: trust line "…充值和提 / 现。" and lead "…第一次选 / 择。", "…下一 / 次选择。" — word split + one-char
    last line; NEW (the 32px edge took 8px from the hero column). Tiles 034 064 075 086 099 111. → hero lede + trust
    lines: text-balance, and :lang(zh) keep-all + overflow-wrap:anywhere (G2/G3's pattern).
F2  zh 320 featured card meta "…截止 · 结算来 / 源：CoinGecko" — splits 来源, line 1 stops 83px short. 029 059 074 084 097
    109. → the meta line keeps its CJK words (keep-all in zh), break at the space/separator.
F3  Trust line widow "Tanzania." — sw 360/390 (014 015 037 044 045 077 089 102), en 320 (021 051 072 080 093 105),
    classic sw 390 (001 007). → balance the trust lines.
F4  en 1024 hero lead widow "…to make your / first." (056 073 095 107). → balance the lede (with F1).
F5  Held wallet sheet notice "…itakueleza / kinachofuata." widow (092). → balance .kp-wsheet__held-b.
F6  Deposit/withdraw form's first line still 51px/59px below the card border (067 068 069; 068 pixel-identical to
    round 2). ROOT CAUSE: React's server renderer writes `<input type="hidden" name="$ACTION_ID_…">` straight after
    `<form>` for a server-action form (react-dom-server pushAdditionalFormField, no `hidden` attribute) — Tailwind 3's
    space-y counts it. G4's `hidden` on our own inputs was right but not enough. → space-y on an inner wrapper.
F7  sw hero h1 "NDIO au / HAPANA" ink starts 3/4/5px right of the edge (N/H side bearing ≈ 0.0625em at every size);
    en/zh flush. All sw home tiles. → optical offset for sw.
F8  Empty state body splits "NDIO au / HAPANA" (241 sw 390), "YES or / NO" (244 en 390). → keep an UPPER au/or UPPER
    pair whole in EmptyState's text helper.
F9  Hub "Ukubwa wa kadi" subtitle widow "kinachofichwa." (256 sw 390). → balance hub subtitles.
F10 Featured/market card empty-state copy ("Hakuna dau bado", "Kuwa wa kwanza kutabiri", "Hakuna bwawa bado") ≈10px
    with cap 7–8px, peak contrast ~4.3–4.5:1 — reading copy below 12.5px. Every home tile. → investigate the card's
    empty-pool type.
F11 Held wallet (090 091 095 096 099 100): the hero lead invites "Choose a side … make your first" right above "Pochi
    yako imegandishwa" — logic. → investigate landing-hero's mine/held lead.
F12 091 held sw 1280: the hero lead runs 16px past the frozen box's right edge (x607 vs box 591) — two max widths.
F13 Header 1024–1280: the bell 2.5px off-centre between the SW box and the avatar (gaps 25 / 29). Same in round 2.
F14 069 amount placeholder "10000" with no separator (copy says TZS 1,000 … 2,000,000).
F15 257 sw 1024 (staff preview): the Needle's rim touches the preview strip's "Toka kwenye onyesho" button (button
    border 991, rim 992), glow tints it. → the rest check's clearance.
DONE 8c683440: Tiketi zangu empty-state CTA 40 vs 44px (reader b6 F4 confirms the defect on the old tiles).
DONE 329d1ad7: F6 (the money forms' rhythm on an inner wrapper; React's $ACTION_ID_ input proven in react-dom-server).
DONE a94e6229: F16 + F19 (very likely): G1's `kp-qrow` on QUERY_BAR_ROW2_CLASS collided with the landing board's
     `.kp-qrow` (grid, padding 16, border) → every filter bar laid out as a board row. Renamed to kp-qbar-row + guard
     density-contract 4q. Next lock turn: qa:bar-geometry + its red (server).

## FIX — from b8 (297–333)
F16 REGRESSION 326 /results sw 390: "Vichujio" dropped to its own line (sort pill x16–166, Vichujio x16–149 next row;
    207px free beside the sort pill; round 2 had it on the row). Suspect G1's `.kp-qrow:has(.kp-qdiv) { column-gap:
    29px }` matching on phones where the divider is hidden.
F17 Needle over controls when parked at the LEFT edge or mid-page: 304 (en 390) hides the Withdraw row icon; 307/315
    (1024) over the Sign-out icon; 299 (sw 1024) mid-page on the Toka button's top border; 301/309/310 crowds the
    footer 18+ mark (0–1px); 321: on top of the open channels panel's border. (Same in round 2 on 299/304.)
F18 Card-size hint widow: "kinachofichwa." (298 331 sw 390), "hidden." (306 en 390, 302 en 320) → with F9.
F19 326 /results: a 69px empty band between the search box and the chip row (other gaps 32/34).
F20 Journey LIVE ticker: the leading edge cuts a glyph hard at x=115 (full ink); trailing edge fades. 318 322 326 327 329.
F21 319 Tiketi zangu: the active "Zote" chip's glow clipped by the strip at x16 / y343 / y386 — a square halo.
F22 326: "HAPANA 2" chip on a dark plate the other inactive chip lacks (also round 2) — hover from the capture?
F23 326: legend "Batili 1" (Zote 6 = 3+2+1) but no Batili chip — logic?
F24 333 KYC: "VYA KUAMBATANISHA" label between the help text and the ID chips — redundant second label?
F25 Back-link chevron "‹ WASIFU"/"‹ POCHI" ink 3px right of the card edge (332/333, 067–069) — icon box inset.

## FIX — from b5 (186–222)
(194 /markets 1280 filter block collapsed into a column with floating dividers; 191/192/201/203 filter-header holes
 59/69px — the kp-qrow collision, a94e6229; re-tile to confirm, and re-measure every filter header's gaps after.)
F26 192 notifications: "…before settlement.. Dau lako…" — the template adds "." after a reason that ends in ".".
F27 192 notifications: "· pos_34d10350dfa7510cfad5" appended into the sentence — a raw position id in prose.
    (Ticket cards' "pos_…" reference line under the ticket icon: by design as a support reference? — check the canvas.)
F28 203 leaderboard sw 390: the top tier "Fedha" (silver) drawn in gold (243,203,122) — word and colour disagree.
F29 194 /markets 1280: the Needle ring 1px from the stat line's last glyph (x1247 vs 1248) — presses on text.
F30 Widows: fairness "lifungwe." (187 204 sw 390); privacy meta line 1 "Toleo 2026-10-07 ·" ends on the dot (207).
F31 Stacked cards' content edges disagree: fairness 1280 hero text 165 vs "Inavyofanya kazi" 158; help 1280 contact
    cards' content 153 vs hero/FAQ 165–166; agent 1280 stat text 147 vs 153; help 390 hero 41 vs contact icon 37.
F32 199 market page sw 390: the favourite star floats at x29–42 with no visible button; chips at 16, SHIRIKI at 68.
F33 200 Up & Down sw 390: subtitle "Je, bei itakuwa / juu au chini muda ukiisha?" on two uneven lines (92 / 164px) in a
    357px column (fits one line ~260px).
F34 Small reading text: agent stat captions ~10–11px (195 196); zh ticket labels 投注额/赔付 9px glyphs (217 218).
## FIX — from b7 (260–296)
F35 267 273 274 275 (1024/1280): the red "25" unread badge (fill x1169–1188 y13–26, ring/glow ~x1162–1195 y8–33)
    buries the bell's dome (bell x1165–1178 y21–36) — only rim and clapper show.
F36 The Needle row's value and chevron sit 2px left of every other hub row's (264 272: 343–348 vs 345–350; 266 274:
    1117–1122 vs 1119–1124; 294 295 too), every width and locale.
F37 296 (sw 390) and 295 (sw 360): the dial is wholly inside the viewport (x331–387 / x294–347), not at its half-off
    rest — on 296 over two tappable cards' right ends (borders x373) and 3–6px above a chevron. (→ the Needle package.)
F38 zh footer tagline 如果博彩不再有趣，请停止。 in a synthesized italic on CJK (275).
DOUBT F39 266: the hub's Notifications row shows "25" while the header bell shows no badge in the same frame (267,
    scrolled, shows it) — the lazy bell's first answer later than the server's row; also en tiles 260–265 show no
    unread signs at all while zh 268–273 do (timing, or an en regression?).
S12: zh footer "游戏RTP和规则", "反洗钱/KYC政策" without CJK/Latin spaces while "WhatsApp 频道" has one; "© 2026 50pick ·
    Tanzania" Latin under 坦桑尼亚.

## FIX — from b3 (112–148)
F40 (→R3-A) ticker strip at 1280: "• LIVE" at x16, pause to 1263 vs header 33–1247 (journey-scoped fix).
F41 (→R3-A) ticker separator dot off-centre: 19px before, 47px after (145).
F42 (→R3-A check) "TZS 48,208 paid to you this week" above the proof band's "TZS 0 PAID OUT TO PLAYERS" (133 135 137).
F43 The Needle hub row built unlike the others: chevron 2px left AND 10px tall vs 12, icon 2px right, row 56 vs 57px
    (122 124 125 127 128 130; joins F36).
F44 Guest tickets sheet/dialog: the × 3.5–4px above the title's centre line (113–121, every width/locale; also round
    2) — the defect G2 fixed on the channels panel.
S12: zh "直播" (ticker, hub) vs "实时" (card pill) for LIVE; zh "K" abbreviations (4.9万?); zh ticker wording.

S12: /live card "NDIO 67%" beside "INAELEKEA NDIYO" — two spellings of yes on one card (dictionary).
S12: English "URL" (fairness) and "ROI bora" (leaderboard) on sw pages.
DOUBTS (b5): gold beyond balance/deposit (badge rings, step numbers, unread dot, agent figures, "INGIA ILI KUTABIRI"
eyebrow, resolved pills, win payout) — check DESIGN_AUTHORITY's gold list; avatar initials as digits; /markets grid gaps
14 vs 16 (also round 2); "siku 5 za kazi" white sans beside gold mono siblings; stepper label 3 lines vs 1 (188);
notification money in sans not mono; /profile AKAUNTI grid 12px gaps.

## BY DESIGN / NOT A DEFECT (with reason)
- Header logo→badge gap 7/21/13 across widths: the row gap's A5 steps (6 / 20 from 640 / 12 at 1024 / 20 at 1280).
- Reading-tier pages at 1280 (tickets, account titles at 132): PageContainer tier="reading" is a centred 1016 column
  by design; the header spans the board. My r3 brief overstated "first card starts at the same x" for those pages.
- Zero-balance capsule's empty left space: the sizer reserves 999,999's width (D31), figure at the end.
- Classic header 13 vs page 16 at 390: classic chrome, frozen (owner item 1/2 territory).
- Nav item hover box on 095/099: the capture's pointer resting there.

## S12 / OWNER (words or decisions)
- zh "HaloPesa或Mixx" without spaces (dictionary copy) → S12.
- "The wisdom of YES & NO." English on sw/zh (brand tagline?) → check, S12 if not a brand line.

## DOUBTS TO CHECK
- Gold "TZS 0" proof figures on the home bands (DESIGN_AUTHORITY: gold is money you can use?).
- Lone "—" right of the featured title (no-bets price) with no label.
- Mobile featured card top inset 11 vs 16 at the sides.
- 1280 board bar ends x791 under a band to 1248.
- zh empty-state bodies 4px left of centre (full-width punctuation advance).
- 259 Toka card leaves a 106px hole under the left column at 1280.
- Proof "46" digit bearing 2px; category glyph 1.5–2px inset (icon box).
- Back-link chevron 3px inset (icon box).
- 069 payment grid 3+2 leaves an empty cell.
