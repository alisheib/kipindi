# S6 close-out reads — the triage records (rounds 7–8 at c706c7c6; round 9 at 9a740922)

Every finding of the S6 close-out reads, as triaged: REAL (fixed, with its commit), KNOWN (owner item, by design or
accepted, with the reason), OWNER (an appendix-K question of S6-VISUAL-PASS-STATE.md), S12 (appendix G). A reader of
a later round starts here: what is KNOWN is "seen, as recorded", never a new finding. Tile numbers are each run's
own (`qa:journey-shell`; 333 tiles in the first read, 336 in round 9's — match by name).

---

# S6 close-out read (rounds 7+8 tiles, c706c7c6) — triage, as the eight readers report

Status: OPEN (to check) · REAL (checked, to fix) · FIXED (sha) · KNOWN (owner/by design) · REFUTED.

## Reader 7 (tiles 249–291: hub, Tiketi zangu won lens, preview band) — 43/43
- R7-F1 OPEN · the hub's Bingwa / Leaderboard / 排行榜 row: the PODIUM GLYPH's ink sits 2px below the row's centre (2–3px
  below its label's ink) on every hub tile, every locale and width (e.g. 262 en 390: row y600–655 centre 628.0, ink
  y624–635 centre 630.0); every other hub glyph centres within 0.5–1px. Cause (reader): the glyph's ink fills only the
  lower 12px of its 20px box — one glyph fix.
- R7-F2 OPEN · 255 sw 390: the stacked INAKUJA tag's caps sit 1.1px HIGH in its (correct, 18px) box: 4.85 above / 7.0
  below (R7-C predicted 5.86 | 5.94); the same tag beside its label (257/258/263/265/266) and the footer's (259/267) are
  centred (5.49|5.88, 5.85|6.0, 6.0|6.0). The two-line block itself is centred 8.0 | 8.0 (item 16 partly verified).
- VERIFIED: item 20 (doors present for a normal player, all locales), item 12 (preview band on the edge: x16/x17 phones,
  x33 + W−32 desktop), item 19 (footer column heads rgb(137,157,209)), item 3 (no connective line end; "Leseni ya Bodi ya
  Michezo" / "ya Kubahatisha Tanzania." at 1280), item 1 (won-lens empty state, no "—" line start, centred).
- Owner items seen: 1/10/20 (Needle + bubble), 8 (two-column hub heights), 14, 26 (zh tag 0.4px high), 30, 32, 35, 36,
  52, 55, K5, K12, K20.
- Doubts: 189px blank band above the footer at 1280 under Sign out (min-height: 100svh "footer below the fold" rule —
  by design?); "DP" initials 1.41px high in their circle (Sora metrics — owner item 26's Latin twin); zh footer © line
  keeps "Tanzania" in Latin while the licence line says 坦桑尼亚.

## Reader 6 (tiles 212–248: Tiketi zangu open/settled/won/lost, the Up & Down tab, new-player empty states) — 37/37
- R6-F1 REAL · the Questions empty-state hint still tears the possessive from its noun outside en 390–412: en 320 (243)
  "Pick a question, tap" / "YES or NO — your" / "ticket shows up here."; sw 320 AND 390 (240/241) "Chagua swali, bonyeza"
  / "NDIO au HAPANA — tiketi" / "yako itaonekana hapa." ("tiketi yako" = "your ticket"). The lines match R7-A's own
  predictions 1c/1d (R7-A restored ROUND 5's breaks, which already tore the phrase there) — the rule in the fixes brief
  (never tear "your" from "ticket") is stricter than round 5. Fix: hold the possessive phrase with its noun in that
  body (all locales), the way the YES/NO pair is held; re-tile 240–248.
- VERIFIED: item 1 where predicted (244 en 390 "Pick a question, tap YES or NO —" / "your ticket shows up here."; zh
  246/247 "选择一个问题，点击是或否——" / "您的注单将显示在这里。"), item 3 (231 "Bado hakuna dau / za Juu na Chini"), item 8 (void
  chip ink exactly 198,209,236 on 21,28,96, 18px), item 12, item 14 (en "My tickets" ink ≈16.17 / 132.17 — round 6
  had 18.17 / 134.17), item 19 (ticket-card data labels 137,157,209).
- Owner items: F7, F14, F22, F26, F32, K1 (sw titles ending on kwa / ya), K2, K6 ("Back a round on the / board…").
- Doubts: D1 the rail at en/zh 320 stacks from the top (globals.css ~7298: deliberate below 360 so a wrapped label does
  not lift its pip) — bottom-heavy where no label wraps; D2 state-pill captions 1px higher on phones (3/6 vs 4/5 at
  1280 — maybe the staff preview strip's sub-pixel offset); D3 zh synthetic bold; D4 English market titles on zh (data);
  D5 first chip label 17px in (ghost-pill padding).

## Reader 2 (tiles 046–089: header root 999999, deposit, compact, zero, held) — 44/44
- R2-F1 REAL · 088/089 the HELD (frozen) capsule's contents sit ~2px right of centre: the 16px lucide lock's glyph is
  inset ~2.7px inside its own box, so lock ink starts 11.7px inside the left ring while the caption ends 7px from the
  right ring (every live capsule centres within 1px). Cause: `.kp-jbal` pads 10/10 + the icon box inset.
- R2-F2 REAL (pre-existing) · the featured card's footer chevron ("Maelezo ›" / "Details ›" / "详情 ›") ends 3.8px short of
  the card's right content edge (its neighbours end on it): `<I.chevronRight s={11}>` last in `.mcardp-details`
  (market-card.tsx ~740) — the icon-box inset R4 fixed for back links; and the chevron draws a ~0.9px stroke, fainter
  than its word.
- ⭐ FAMILY (with R7-F1 and D5 below): EDGE ICONS — a glyph at a row's start or end sits inside its own box (lucide's
  24-unit padding / a glyph drawn low): bring every edge glyph to its edge/centre by one rule, not per site.
- VERIFIED: item 2 (zh "结算来源：Bank of Tanzania" whole), item 3 / R7-A 3i (no line ends on "ya"; the brand claim fine),
  item 4, item 5, item 7 (deposit eyebrow 137,157,209), item 12, item 13 (time-left ends ≤0.52px in), item 14 (sw N/H
  stems ≈16.04–16.10 / 32.23), item 15 (payment ring on the column, 12px gaps, pip 3px clear), item 17 (frozen capsule
  neutral — not gold, not amber), item 18 (home links 153,196,255 underline 48,73,164), item 19.
- Owner items: F14, F32/F9 (home totals gold), F26, K5, K6 ("Licensed by" / "the Gaming Board…"; "Add funds by" /
  "mobile money…"), K15, K17, S12 (masaa 1 yamebaki; amana ×3; HaloPesa或Mixx), S8 (held wallet's YES/NO look live).
- Doubts: D1 sw 390 regulator line "Leseni" / "ya Bodi ya Michezo ya Kubahatisha Tanzania." — a ONE-WORD first line
  (R7-A's keep: column 318 ≥ 281 holds the name whole) → K5's companion; D2 the frozen capsule keeps a GOLD ring while
  its figure turns plain (gold = usable money?); D3 featured card YES/NO 8px apart (R6-C's 12px rule was the market
  page's); D4 "—" overhangs 0.58px; D5 deposit page-head eyebrow glyph ink 1.3px inside the title's ink (icon inset);
  D6 zh hero 是 1.23px in at 1280 (CJK bearing); D7 the board bar a fixed 760px under a W−32 band.

## Reader 1 (tiles 001–045: classic root, header root) — 45/45 · NO FINDINGS
- VERIFIED: item 2 (zh "结算来源：Bank of Tanzania" whole; classic sw "Linatatuliwa kwa Bank of Tanzania"), item 3 (no line
  ends on "ya"), item 12, item 14 (NDIO/HAPANA stems ≈x16.15 / x32.25), item 18 (hero links + the card's Maelezo blue —
  was aqua), item 19 (proof-band labels 137,157,209; the white claim kept), item 13 (card time label on the edge).
- Owner items: F1/F10/F20 (bubble over the card's ⓘ at classic 390), F2, F14, F18, F26, F29, F32/F9, F36, F52, K5, K6,
  K17, S12 (masaa 1 yamebaki; HaloPesa或Mixx).
- Doubts: D1 = reader 2's D1 (sw 360–390 "Leseni" alone over the 279px name — the mirror of the row's own "never one word
  under a full line" rule) → TWO READERS: make it owner question K34 (name whole + a stub first line, or balanced lines
  with the name split, or the trust row's text taking the roundel's width so it fits on one line); D2 sw 320 hero
  eyebrow "SOKO LA KWANZA / LA UTABIRI LENYE / LESENI TANZANIA" ends a line on "LENYE" (a relative that introduces the
  next noun, like the connectives) → REAL-ish: add the -enye relatives (lenye yenye wenye zenye chenye vyenye) and
  "kwenye" to lib/connectives.ts with R7-A's census; D3 = R2-F2 (the card chevron 3px short); D4 "—" 0.58px overhang;
  D5 the CLASSIC capsule's eye toggle in money gold (a control; classic chrome frozen — F29's family, not in its list);
  D6 featured YES/NO 8px; D7 mark ↔ 18+ gap by width.

## Reader 3 (tiles 090–132: header root, unread, hub, sheets, dialogs) — 43/43
- = R7-F1 CORROBORATED (podium glyph 2–3px low: 1280 ink centre 333.5 vs caps ≈330.75; 390 base 3px below the label's
  baseline) → REAL.
- = R7-F2 CORROBORATED (stacked INAKUJA caps 4.85 | 7.0 in the 18px box at sw 390; inline 5.85 | 6.0) → REAL. Reader's
  guess at the cause: the stacked tag lands on a fractional y (≈85.75), its border snaps to 86, its text renders ~1px
  higher.
- R3-D1 + R6-D1 → REAL (two readers): the TAB BAR at en/zh 320 stacks from the top (globals.css ~7298–7304: below 360 in
  EVERY language, though only sw wraps "Tiketi / zangu") → 6px above / 15px below where nothing wraps; at 390 centred
  12/11. Fix: the top-stacking only where a label wraps (sw at 320), centred otherwise.
- R3-D2: STALE COMMENT at hero-intro.tsx:128–130 still says the row reads "Leseni ya" / "Bodi ya…" → fix the comment
  with K34.
- R3-D3 = R2-D2 (the held capsule keeps the 35% gold ring) → owner question with K34's batch (gold on a balance that is
  not usable?).
- R3-D4: the gold pill's glow crosses the header's bottom hairline (33,52,128 → 44,59,123), fading by y68 — measurable,
  barely visible → KNOWN/accept unless the owner asks.
- VERIFIED: items 12, 14 (NDIO/HAPANA stems 32.22–32.27 / 15.89–15.92), 16 partial (box 18px, block 8.0|8.0), 18 (hero +
  card + Wallet sheet links 153,196,255; navigation quiet), 19, 20 (doors present), 3 / 3i; header 23 tiles clean;
  sheets/dialogs/hub/unread dot clean.
- Owner items: F32, F9, F26, F1/10/20, F34, F35, F36, F52, F55, F8, F14, K1, K5, K6, K12, K20, S12.

## Reader 4 (tiles 133–172: wallet sheet, focus rings, tabs, empty states, /results, wallet) — 40/40
- R4-F1 REAL · /results says "0 imetatuliwa" + "Bado hakuna soko lililotatuliwa" (169/170) while the LIVE strip on the same
  tile shows settled bets and the same player's tickets (168) list 6 settled — `listTerminalMarkets` (market-service.ts
  ~526–546) memoises RESOLVED+VOIDED for 5 min (TERMINAL_TTL_MS) and stores an EMPTY read too; the drive warmed /results
  before the seeds settled. On production a just-settled market is off /results for up to 5 min. Fix: invalidate on
  resolve / void / settle. (Re-tile /results after.)
- R4-F2 REAL · the guest Tiketi sheet's "Ingia" is `btn btn-outline` (tickets-guest-sheet.tsx:51: border = the focus
  ring's 73,131,244, label link blue) — the header's Ingia and the Wallet sheet's second action are `btn-ghost`; the S4
  frame draws it light-on-mid-blue; with Jisajili focused its ring sits 12px from Ingia's border in the identical blue.
- D1 → REAL (three readers: R1-D6, R2-D3, R4-D1): the home featured card's YES/NO are 8px apart; every other pair is
  12px (market page R6-C, sheets, wallet, Up & Down) → 12px.
- D6 → the EDGE-ICON family (R2-F2): "Maelezo ›" 3px short (133/135/141/153/154/160), "详情 ›" 4px (146–148), "Risiti zote ›"
  5px (172).
- D8 → REAL: the wallet's "Bonasi 0" lens (172) can only be empty (the bonus programme is withdrawn) — ledger.ts already
  hides the agent lenses for exactly that reason ("a lens that can only ever be empty is a dead end").
- D2 (MUBASHARA note faint) KNOWN (a state note); D3 "Hakuna ada" not green → owner K37; D4 notice sentence in mono
  KNOWN (DG-A-14 kept the face); D5 1px near-miss of independent stacks — accepted; D7 the focused active link's
  underline + ring 2px apart — accepted (focus state only).
- VERIFIED: items 1 (sw), 2 (CoinGecko), 3, 5 (Up & Down note), 7, 8 (tickets), 12, 13, 14, 16 (inline), 17, 18, 19, 20;
  round-6 rules holding (12px pairs, ✕ on caps, featured top, 19 focus rings whole).
- Owner items: F25, F32/F9, F14, F1/F10/F20, F8, F36/F35/F55, F34, F22, K1, K19; S12 (zh 直播 vs 实时, sw chart spans
  "15M…7D", "Nafasi zako", zh "HaloPesa或Mixx" spacing); data (English titles under zh).

## Reader 5 (tiles 173–211: /live, /leaderboard, /profile/invite, /profile, help, limits, legal, /results guest) — 39/39
- R5-F1 REAL · /leaderboard's podium: #1 stands 26–27px LOWER than #2/#3 (178, 177, 203) — page.tsx ~575 gives #1
  `-translate-y-3`, but `.kp-rise` (globals.css:4386, `animation … both`, `to { transform: none }`) overrides `transform`
  once the rise ends; with `items-end` the winner sinks.
- R5-F2 REAL · /live masthead caption at sw 390 "LILILO NA" / "SHAKA ZAIDI" (175, 202) — featured-contest.tsx:116
  `text-balance`, no connective keep.
- R5-F3 KNOWN → S12 · "NDIO 67%" · "INAELEKEA NDIYO" in one row (sw `market.leansYes`) — S12's "NDIYO → NDIO" sweep
  (VODACOM-PLAN S12 table) covers it.
- R5-F4 REAL · the invite dial caption "MARAFIKI WALIOJIUNGA" is still royal-300 (181/182): profile/invite/page.tsx:365
  `<Cap className="sm:mb-1.5 !text-royal-300">` — the local `Cap` (page.tsx:136) hid it from R8-B's census.
- R5-F5 REAL · /live pager dots: gaps 12/18/18 (the 18px active pill eats into a 24px pitch) at 390 and 1280.
- Doubts: blue on non-links (178 table rank numerals, 201 the notable flag + crown, 188 the fairness current step) →
  owner K36; 176 /live masthead at 1280 ~540×230px empty beside its content → owner K38; 200 two stacked eyebrows in one
  ink → accepted (ruling 3); ledes ending on a connective → accepted (the rule names titles/labels); 194 the one-sided
  dashed track ends on a 2px stub → REAL-low (fit the pattern); 192 English void reason in a sw notice → data.
- VERIFIED: items 3 (206–210, 198), 5, 6, 7, 8, 9, 10, 11 (/live), 12, 13, 14, 15, 18, 19 (but F4), 20.
- Owner items: K1, K3, K5, K7, K12, K15, K17, K27; F1/F10/F20, F7, F11/F32, F14, F22, F25, F33, F35, F36, F52, F53,
  F76, F8; S12 (masaa 1, 40 hai vs Mubashara, Arifa 25, badge names, Weka mipaka vs Vikomo, masoko 40, 5 dakika).

## Reader 8 (tiles 292–333: hub, footer, results, overlays, KYC) — 42/42
- R8-F1 REAL · the sign-out row draws a sign-IN icon: glyphs.tsx:177–178 `logOut` = `logIn`'s geometry (bracket on the
  RIGHT, arrow pointing INTO it) — every sign-out on the platform (hub Toka, avatar-menu.tsx:397, profile/page.tsx:439,
  profile/sessions/page.tsx:120).
- R8-F2 REAL · journey footer at sw 1024 (299): "Mapendekezo ya" / "Masoko [INAKUJA]" — public-footer.tsx:276–277
  `FooterLink balance`, no connective hold (the hub's label is held).
- R8-F3 = R7-F2 (third reader): stacked INAKUJA caps 4.85 | 7.0 (297, 331); inline 5.85 | 6.0 everywhere.
- R8-F4 KNOWN → K6 · en footer at 1024 "Licensed by" / "the Gaming Board of Tanzania." (articles are not connectives).
- D1 tool note: the overlays-on tiles show no chat bubble though the drive PASSes "on screen" (it fades after the
  panel's dwell) — the drive's bubbleShown is not a visibility proof (record in the drive's notes).
- D2 → RE-TILE: KYC tiles 331–333 show the superseded photo flow (main went typed-only after c706c7c6). Agents keep
  photo identity (16e0be5e), so `bodyNotStartedAgent`'s "picha ya uso" is intended.
- D3 → REAL-low (with F1, the same row): the Toka box is 56px against 58px for the single-row cards.
- D4 KNOWN (item 26's Latin twin: name block 1–1.5px above the avatar centre); D5 zh 指针玩具 → S12; D6 "Market
  Proposals" Title Case → S12.
- VERIFIED: items 2, 3 (but F2), 7, 8, 12, 13, 14, 17, 19, 20; round 6's earlier items seen fixed (ticker fades, chip
  glow, Vichujio, channels ✕, Needle off the panel and Toka, bell 29|29, KYC stepper blue, no widow).
- Owner items: 8, 30, 1/10/20, K5, K1, K20, K12, K15, 52, 76, 77, 35, 26, classic 2/3/4/12/13/29/42/43; S12 (zh "许可证:"
  half-width colon, "© 2026 50pick · Tanzania" not localised, mixed slash styles).

## ⭐ DECISION — round 9 (one batch; then re-tile only what it touches and re-read)
- R9-A edges & glyphs: R7-F1 podium glyph centred · R8-F1 logOut drawn as sign-OUT · R8-D3 Toka box 58 · EDGE-ICON rule
  (R2-F2 chevrons "Maelezo ›" / "Details ›" / "详情 ›" / "Risiti zote ›" on the edge, stroke as heavy as its word; R2-D5
  the deposit eyebrow glyph) · R2-F1 held capsule centred · featured YES/NO 12px · the dashed track fitted.
- R9-B line breaks: R6-F1 possessive held with its noun · -enye relatives + kwenye as connectives (census) · R5-F2
  /live caption keep · R8-F2 FooterLink keep · R3-D2 stale hero-intro comment.
- R9-C components: R5-F1 podium #1 raised · R5-F5 pager gaps · R5-F4 invite caption ink · R3-D1/R6-D1 tab bar at 320
  centred unless a label wraps · R7-F2 stacked INAKUJA centred · R4-F2 guest-sheet Ingia ghost · R4-D8 empty Bonus lens
  hidden.
- R9-D data: R4-F1 /results memo invalidated on resolve / void / settle (two stores).
- Owner (Appendix K): K34 Leseni stub · K35 held capsule gold ring · K36 blue on non-links · K37 "No fee" ink · K38 /live
  masthead space at 1280. S12 (Appendix G): zh 指针玩具, "Market Proposals" case, zh 直播/实时, sw chart spans, zh footer
  colon/©/slashes, zh "HaloPesa或Mixx" spacing, K32's worklist caption + the expired applicant's refund line.

---

# S6 round 9 read (9a740922, 336 tiles, eight readers, 2026-10-11) — triage

Status: REAL (to fix before the push) · KNOWN (owner/by design/accepted) · OWNER (new question) · REFUTED.

## Reader 6 (211–252) — 42/42 · NO NEW FINDINGS
- VERIFIED: B1 (243 sw 320, 244 sw 390, 246 en 320 exactly as predicted; controls 247/250/249 unchanged), C4 (en/zh 320
  centred 11|11 and 11|12; sw 320 stacks; 390 unchanged), A4 (legal head glyph ink on the edge; the tickets' meta-row
  glyph column exempt by the rule), empty states centred within 0.5px, B3 (no label ends on a connective).
- Diffs vs old twins: only data, the policy date (KYC lane's 2026-10-10 notice), the rail at en/zh 320 and B1's lines.
- Doubts: D1 a ghost button's caps 1px high (sub-2px, unchanged) → KNOWN; D2 the legal page's three boxes at three
  insets (pinned legal chrome, unchanged since round 8) → KNOWN; D3 the AML title's one-word middle line "Uoshaji" →
  name it beside K3 (OWNER); D4 the won chip/payout gold = money earned → KNOWN; D5 blank under the 1280 empty card
  (min-height rule) → KNOWN.

## Reader 7 (253–294: hub, footer) — 42/42 · NO FINDINGS
- VERIFIED: A1 podium glyph centred everywhere (265: 628.1 on 628.0; was 630.37), headset centred (±0.05), A2 log-OUT
  drawn and centred, A3 Toka 58px like the one-row cards, A4 hub row chevrons end within 0.31px of the edge (values move
  with them, the gap kept 18.74px), C4 en/zh 320 centred (sw stacks), B1 guest intros keep "your wallet and tickets" /
  "tiketi zako", B4c sw 1280 footer link one line, B5b the sw 1280 licence line as predicted (K34's companion).
- C5 → the stacked INAKUJA no longer occurs at sw 390: R9-A's chevron pull gave the label column 6px, so "Mapendekezo
  ya Masoko" + its tag fit one line (inline, 5.85 | 6.01, centred — hub-row.tsx's own rule). The stacked case now
  happens only below 390 in sw, which the drive does not tile → accepted on R9-C's guard (the 20px line rule) — D1.
- Doubts: D2 the tab bar's 1px edge ring on the screen edges (--shadow-overlay-up's edge-lit inset, pre-existing) →
  KNOWN; D3 the guest Msaada subtitle wraps at sw 320/360 by DotSeq's rule → KNOWN; D4 en "Licence" (main's KYC commit,
  British spelling) → KNOWN; D5 tag-cap colour fringing is a capture artefact → KNOWN.

## Reader 1 (001–042: classic root, journey header root) — 42/42
- VERIFIED: A4 card "Maelezo ›" ink on the edge everywhere (classic 390 357.6/358; journey 1280 1231.6/1232) with the
  word's full ink (was ~55%); A4 heavier arrows read right, centred on the caps; A5 12px pairs at every width; A6 every
  track ends on whole dashes; B2a/B2b claim lines exactly as predicted; B5a; C4 en/zh 320 centred (10|10, 10|11), sw
  stacks; the ⓘ glyph centred in its 44px box.
- F1 → KNOWN + OWNER: the hero LEDE "…Chagua upande kwenye" / "soko ili…" at sw 1280 (038, classic 008) — prose, outside
  the connective keep (titles/labels/eyebrows), unchanged since rounds 7–8; my read brief's "anywhere" overstated B2.
  Joins R9-B's owner question 6 (extend the keep to prose?) → K39.
- F2 → KNOWN (low): at sw 320/360 the card meta row wraps and the UCHUMI glyph starts row 2 with its ink 1.65px inside
  the column — a position only the wrap creates (a static pull would misplace it beside its chip), unchanged.
- Doubts: D1 proof-band figures' side bearing (K19's family) → KNOWN. The chat bubble at classic sw 390 now also covers
  "Maelezo"'s "o" (the edge rule moved it 4px right; F1/F10/F20, scrolls clear) → KNOWN.

## Reader 2 (043–084: header root, deposit, compact, zero) — 42/42
- VERIFIED: A4 card chevron (0.42px inside the edge everywhere; stroke = the word's stems), the deposit eyebrow glyph on
  the column (41.55 vs 41), the back link "‹ POCHI" on the edge, A5 12px on all 36 pairs, A6 whole dashes (card + board
  bar), B2 claim lines, B5 controls, C4 en/zh 320 centred, heavier arrows read right; capsules centred.
- F1 (low) = reader 1's F2 (the wrapped UCHUMI glyph 1.65px in at sw 320/360) → KNOWN: pulling it would cut the designed
  2px chip-to-glyph gap on every unwrapped card; the position exists only when the tail wraps.
- D1 = the "kwenye" lede → K39. D2 deposit eyebrow glyph 1.28px low at 1280 (sub-pixel snapping, unchanged) → KNOWN. D3
  the brand mark's circle 1.2px inside its box (a logo) → KNOWN.

## Reader 3 (085–126: zero/held/masked capsules, sheets, unread hub) — 42/42
- VERIFIED: A1, A2, A3, A4 card + hub chevrons, A4 held capsule on phones (±0.05–0.08), heavier arrows, A5, A6, B2, B5,
  C4, C6 (Ingia ghost: border 33,52,128, label 245,248,255 in all three sheets).
- F1 = the "kwenye" lede (third reader) → K39 (sentences outside the line rule; the read brief's "anywhere" overstated).
- F2 → KNOWN: the held capsule at 1024/1280 now sits 0.71–0.85px LEFT (was 0.65–0.95 right); phones centred — inside the
  1px every live capsule keeps (R9-A's ~0.5px holds on phones only).
- Doubts: D1 masked "TZS •••••" 0.65–1.02px left (accepted before, within 1px) → KNOWN; D2 Arifa badge digits 1px high
  (F26 family) → KNOWN; D3 the sheet ✕ vs the dialog ✕ insets (icon-only controls keep their box) → KNOWN; D4 C5 inline at
  sw 390 with ~1px to spare → noted.

## Reader 8 (295–336: hub, footer, results, KYC) — 42/42
- F1 REAL → FIXED `35efb6a9`: the journey footer at sw 1024 (302) tore the name "Mapendekezo" / "ya Masoko [INAKUJA]" —
  only "ya" was held and the real flag (72 + 8.4px) made that split the narrower balance; the name is now ONE unit
  (143.8px; the narrowest column 160px), the guard models every flag width 60–95px, the old rendering planted is caught.
- VERIFIED: A1 (all hub tiles), A2, A3 (58px on 15 tiles), A4 (hub + staff external mark on the edge, the KYC eyebrow
  shield, "‹ AKAUNTI"), A5, B2, B4 at 1280, B5, C4, C5 inline (stacked case gone at 390), D1 (/results 6 settled), the
  KYC re-tile (typed-only flow, two steps, centred).
- Doubts: D1 the header avatar's hue (hashed from an in-memory id — data) → KNOWN; D2 the 1280 "‹" and KYC shield ~1px
  low against caps (unchanged, F26 family) → KNOWN; D3 hub glyphs within 0.86px → KNOWN; D4 badge digits 1px high →
  KNOWN; D5 = C5's stacked case untiled → accepted on the guard. New: the chat bubble's ring now reaches the Language
  value (the 6px chevron shift) — F1/F10/F20, scrolls clear → KNOWN.

## Reader 4 (127–168: wallet sheet, focus, tabs, market/round pages, /updown) — 42/42
- VERIFIED: A1, A2, A3, A4 (card chevrons, hub chevrons, back links on the edge at 2px stroke, "Chanzo ↗", text arrows,
  Up & Down title pills now centred), A5 12px everywhere incl. the market and round pages and the sheets, A6 (round
  page's BWAWA track: 29 whole dashes), B2/B5, C4, C5 inline, C6, focus rings whole.
- F1 → ROUND 10 (check): /updown at sw 1280 (164) — the live chart pane blank (watermark only, no grid, no state line)
  where 390 (163) draws; the first run with a live feed (rounds 7–8 drew the empty sentence) — capture timing or a real
  desktop draw gap; check production after the push and the component.
- F2 → S12: sw udEstimateNote / howItWorksFine say "odds" (translator's call).
- F3 → ROUND 10: /updown's filter field — its sliders glyph 1.74px in, its chevronDown caret 3.01px short of the field's
  edge (filter-sheet.tsx:314/337 carry no `edge`; R9-A's census never classified chevronDown).
- F4 → KNOWN (F26's Latin family): count-badge digits 1px high at phone width (11px type in a 20px box).
- F5 → ROUND 10: the edge rule never reached `Stat`'s `icon` slot (11 call sites; the market page's KIASI / WATABIRI /
  INATATULIWA glyphs 1.07–1.84px in) nor a section h2's leading glyph ("Nafasi zako" 1.12px in).
- Doubts: D1 the Withdraw ghost's ↑ glyph box makes its content 0.9–1.7px right (glyphs in buttons keep their box by
  R9-A's rule) → round 10 to judge with F3/F5; D2 the bet hint ends on "na" (a sentence) → K39; D3 the round chart's
  strike label "UFUNGUZI $2,896.00" in a muted gold on a non-balance figure → OWNER K40; D4 the live price label ends
  10px left of JUU/CHINI's labels in one chart → round 10 to judge; D5 the header bell badge's digits ~0.8px high →
  KNOWN (F26); D6 = F1.

## Reader 5 (169–210: wallet, /live, leaderboard, invite, profile, help, legal, /results) — 42/42
- VERIFIED: A1 (guest hub, six glyphs on one axis; coins whole), A4 ("Risiti zote ›" 1147.28; hub chevrons; every page-
  head eyebrow glyph and back link on its column; "Maelezo ›"), A5 (all cards 12px; "HAPANA @ 33%" inside), A6 (card 2's
  24 whole dashes; Up & Down tracks), B2b, B3a ("LILILO / NA SHAKA ZAIDI", fits the 44px row), C1 (#1 16px higher, crown
  whole and centred; the ragged base reads as a podium, its weak spot a 42px hole under #1 — K41), C2 (round 6×6 dots,
  18px gaps), C3 (137,157,209), C7 (no Bonasi; lens counts sum), D1 (/results 6 settled, agrees with strip and tickets).
- F1 → ROUND 10: the coming-soon banner's body tears "masoko / yako" at sw 390 (ComingSoonBanner, FeatureStateBanner,
  Invite's coming-soon state draw their bodies raw — outside R9-B's possessive rule).
- F2 → ROUND 10: the wallet's "↓ Weka pesa" / "↑ Toa pesa" arrows keep the thin stroke (hand-rolled links, no `text`)
  while round 9 stroked other button arrows at their label's stem — two weights now; D3 the copy's own "→" in "Fungua
  soko →" a third (a dictionary character → S12 or a glyph).
- F3 → ROUND 10: /help's FAQ chevrons (chevronDown) end 2.9px short of the row edge (= reader 4's F3 family).
- F4 → ROUND 10: /profile's stat cells' glyphs 1.1–2.5px inside their columns (`Stat`'s icon slot = reader 4's F5).
- Doubts: D1 /results' lens strip at 390 hides its 4th lens exactly at the clip edge, no hint to scroll (pre-existing) →
  ROUND 10 to judge; D2 "Imebatilishwa" (lens) vs "Batili" (legend/chip) → S12; D4 the search box's glyph insets
  16.76 / 13.34 → ROUND 10 to judge; D5 legal meta lines split proper names → K2's precedent; D6 seed duplicates and D7
  the localhost referral origin → data/environment.

## ⭐ DECISION — the round-9 read: NO REGRESSION; one real item (reader 8's footer) FIXED `35efb6a9`
- PUSH round 9 (35efb6a9) once the hub re-tile confirms the footer (r9h) — it is strictly better than live.
- ROUND 10 (pre-existing, round 9's own rules not yet reaching): R10-A the edge rule's remaining glyphs (chevronDown:
  /updown filter caret, /help FAQ; the filter field's sliders; `Stat`'s icon slot — market page and /profile and
  /profile/activity; a section h2's leading glyph; the search box's two glyphs) and the stroke rule's remaining arrows
  (the wallet's ↓/↑; the Withdraw ghost's glyph box); R10-B the possessive hold in banner bodies (coming-soon,
  maintenance, invite); R10-C /updown's chart at 1280 drawing nothing with a live feed (check production first); R10-D
  /results' lens strip hiding its 4th lens at 390.
- OWNER (appendix K): K39 the line rule for SENTENCES (ledes, hints, banners' prose) — default no; K40 the Up & Down
  strike label in a muted gold; K41 the podium's ragged base (the hole under #1).
- S12: "odds" in sw; "Imebatilishwa" vs "Batili"; the copy's "→" character.

---

# S6 round 10 read (177981c1, 336 tiles, eight readers, 2026-10-12) — triage

Status: REAL (fix before the push) · KNOWN (owner / by design / accepted) · OWNER (a K question) · REFUTED.
Known before the read: /updown's chart at 1280 blank after the drive widens the page — R10-C, FIXED `efbeddae` (the
build generation), proven in a browser (r10c4).

## Reader 7 (253–294: hub, footer, the empty states, /positions performance) — 42/42 · NO FINDINGS
- VERIFIED: A6e the journey header pill (box unchanged; content by ink 0.20–0.45px left of centre, was 0.32–0.58; at
  320 unchanged), A3c the language caret at 1280 (caps on 1117.0/1123.0, box 58 → 56, cluster gaps 12px, nothing wraps),
  A6j "Angalia utendaji" (148 → 146px, glyph −2.000px, content 0.30px left of centre), R10-D 253 (the 4th lens shows
  35px ≥ 32 — no cut due), round 9's hub items unchanged (A1, A3, C5 inline, B1, C4), the empty states centred.
- Doubts: D1 the language box by ink 0.67–0.89px right of centre (the mono code's bearing; inside the 1px precedent) →
  KNOWN; D2 the browser-check text misread round 9's padding shorthand (record only — the drive's 11.74375px pin is
  right) → noted; D3 the language caret keeps the pictogram stroke beside a code (carets are pictograms by R10's rule;
  unchanged since round 9) → KNOWN.

## R10-C PROVEN FIXED (efbeddae, browser, 2026-10-12 00:46)
- Before (r10c2, 177981c1): /updown drawn at 390 (pane 17,990 inked px + the price scale); the SAME page widened to 1280
  → watermark only (157 px), no price scale, never recovering; a fresh 1280 load drawn (107,231 px).
- After (r10c4, efbeddae): drawn at 390 (17,990); widened → drawn at +500 ms (107,231 px + the price scale 4,854) —
  identical to the fresh 1280 load. Screenshot `scratchpad/r10/chart4-A-1280-widened.png`: grid, $2,895.95–$2,896.05
  scale, the confirmed-price line, the time label. Cause: the height-keyed rebuild (300 → 380) batched the ready flag to
  "unchanged"; now a build generation.

## Reader 8 (295–336: hub, overlays, viewer, emailbar, KYC) — 42/42 · NO FINDINGS
- VERIFIED: A6e the header pill (box unchanged, ink group −0.53…+0.32px of centre), A3c the language caret (ring 58 → 56,
  ink on the end padding edge ±0.5px snap, cluster gaps 12/12; classic header unchanged), /results' sort trigger and
  filter pill (content within 0.12px of centre), A7c the search box (magnifier 13.76px in), R10-D on /results (fade end
  ≈234.3 inside "HAPANA 2") and /positions (inside "Umeshinda"), the journey footer at sw 1024 ("Mapendekezo ya Masoko"
  whole on line 1 — round 9's 35efb6a9 fix), the signed-out notice body's holds; no narrower control wraps or clips.
- Doubts: D1 whole-pixel SVG placement leaves <1px residues (a DOM check would meet ±0.15) → KNOWN; D2 = reader 7's D2
  (A6e's note mirrored) → record; D3 the desktop capsule's contents 0.79–0.94px right after the language ring's
  fractional pull (inside the 1px capsule tolerance) → KNOWN; D4 the strip rule's look — the peeking lens fades to ≤50%
  ink with ~84px of fade beside it (by R10-D's rule: it says "more follows", it is not meant to be read) → KNOWN; D5 =
  reader 7's D3 (carets keep the pictogram stroke) → KNOWN.

## Reader 3 (085–126: header zero/held/masked, the guest Tiketi sheet, the unread hub) — 42/42
- VERIFIED: A6e the pill (box unchanged, ink within ±0.6px of centre), A3c on all 16 desktop tiles (trigger 2px
  narrower, caret on its edge, gaps 12.13/12.02), R10-B notice bodies ("timu yetu" whole, the last two words together),
  round 9's A1/A3/A5/A6/C4/C6, "Maelezo ›" on the edge, the held capsule on phones, no line on "LENYE".
- F1 (low, data) → K34: zh 320, the featured card's source line leaves "结算来源：" alone above "Tanzania Meteorological
  Authority" (a 33-character name kept whole, R7-A's rule — the same choice as the sw regulator line's "Leseni"); the
  sw "Linatatuliwa kwa …" twin at 320/360. Recorded beside K34, no code change.
- Seen, as recorded: the held capsule at desktop now −0.51 / +0.08 (was −0.61 / −0.71); the masked figure; the wrapped
  category glyph (now also at sw 390 with a longer category word: its ink in line with the title's).
- Doubts: D1 = the A6e record (sides swapped in the check text); D2 Chrome paints inline svg at whole pixels → sub-pixel
  pulls show as 0/±1px (KNOWN, rendering); D3 a calibration note for the arrow-weight instrument; D4 the staff strip's
  "Toka kwenye onyesho" (staff chrome, centred anyway) → KNOWN.

## Reader 1 (001–042: classic root, journey header root) — 42/42
- VERIFIED: the hero CTAs frame their ink (sw 181 → 178px, content −1.10 → +0.40px of centre; en −0.95 → +0.05; zh
  −1.17 → −0.17; gaps 12px, nothing wraps), the full-width phone CTA centred (−0.15, was −1.37), A6e as coded, one arrow
  weight (CTA → 2.00 / links 1.49 / "Maelezo ›" 1.52 — each within 0.1–0.16px of its words' nominal stem), the classic
  header and rail byte-identical (frozen chrome), round 9's A4/A5/A6/B2/C4/item 13 unchanged, the ⓘ centred.
- F1 (low, sub-pixel) → KNOWN (rendering): the language trigger's caret ends 0.74px PAST its 12px padding edge on 12
  desktop tiles and the trigger's ink group sits 0.81–1.02px right of centre (round 9: ~0.85 left) — Chrome paints an
  inline svg on a whole pixel, so the 2.525px pull painted as 3.0px. Readers 3, 7 and 8 measured the same family (D1s).
  Under 1px, inside the platform's 1px tolerance, invisible; a remedy (integral box widths / whole-pixel pulls) moves the
  residue, it does not remove it.
- K34's zh twin (029, the weather card's source line) → K34, as reader 3's F1.
- Doubts: D1 = the whole-pixel family; D2 = the A6e record; D3 arrows at the NOMINAL stem read ~20–25% lighter than
  Chrome's rendered letters (unchanged since round 9) → KNOWN; D4 the weather card's head one line taller at sw 390/412
  (data; the designed wrap) → KNOWN; D5 the 1150 YES/NO half-pixel split (unchanged) → KNOWN.

## Reader 2 (043–084: header root 999999, deposit, compact, zero) — 42/42
- VERIFIED: A6e the gold pill on 30 tiles (box edges pixel-identical, ink −0.58…+0.27px of centre — every locale closer
  than round 9), A3c pulled (bell still 29|29), round 9's A4 (card chevron, deposit eyebrow and "‹ POCHI" unchanged), A5,
  A6, B2, C4; every capsule centred (figure ±0.31, caption ±0.44); chips within ±0.35 (zh 实时 +0.6, item 26).
- F1 (low, <1px) = reader 1's F1 → KNOWN: the desktop language box leans +0.81/+1.02/+0.97px right by the instrument
  (+0.67/+0.89/+0.83 by the drawing) — the mono code keeps its left side bearing (12.87–13.31px in, R9/R10 never pull a
  word's bearing) while the caret is pulled onto its edge and painted on a whole pixel; round 9 leaned the same amount
  left. Same class as round 9's held-capsule lean, accepted under the 1px rule.
- D1 zh 320 "结算来源：" / the weather resolver's whole name → K34 (readers 1, 3); D2 the wrapped topic glyph at sw 320–412
  (data: "HALI YA HEWA" wraps the meta row) → KNOWN (R1-F2/R2-F1); D3 the plus's whole-pixel snap → KNOWN; D4 capture
  re-rasterisation; D5 data moves card heights → noise.

## Reader 5 (169–210: /positions, /results, wallet, /live, leaderboard, invite, profile, help, markets, legal) — 42/42
- VERIFIED: A6e, the 1280 language trigger (2px narrower, gaps kept), A7a–c the search box, R10-D Da/Db (+ /positions,
  /markets; 1280 strips hide nothing; pressed lenses whole), R10-B Ba exactly as predicted (+ the notice's "Dau lako",
  "pochi yako"), A2a the FAQ carets on 1115, A4c/A4d the stat glyphs on their columns (values unmoved), A4f trailing card
  glyphs, A5b /live's category glyph, A1a/A1b/A1c the filter field (lone sliders boxed), the sort controls, A6a/A6b the
  wallet doors (shafts 1.76–1.79px, centred), A6f "→ Omba sasa", A6j the invite buttons (−0.36…+0.16), "Vichujio", MADA;
  no row wraps or clips; A8 unchanged.
- F1 (low, 0.63px) → KNOWN (remedy recorded): the market page's "SHIRIKI" share pill (share-button.tsx ~101, a hand-built
  button outside census 6.6/6.7) keeps its glyph boxed — ink group 0.63px left of centre, inside the 1px tolerance. The
  remedy is an `edge` pull AND the label's trailing 0.14em tracking taken back (a pull alone would lean 1.36px).
- OWNER K43 (readers 5 and 8): R10-D's peek fades the last visible lens so a strip says "more follows" — at rest that
  lens's name cannot be read ("Umes…", "HAPA…"); accept? (Default: accept.)
- Doubts: D1 the whole-pixel residues (IMEKAMILIKA +0.47, sliders −0.26, magnifier −0.24…) → KNOWN (rendering); D2 the
  language lean → KNOWN; D3 the WhatsApp brand glyph keeps its box (+0.53) → KNOWN; D4 "Dhibiti Sindano" centred within
  0.19 → fine; D6 the AKAUNTI glyph 1.29px low against its caps (F26 family, unchanged) → KNOWN. Item 22 has an
  exception: /updown's round page prints "EAT".

## Reader 4 (127–168: wallet sheet, focus, tabs, the market and round pages, /updown, /updown/history) — 42/42
- VERIFIED: R10-A1 (caret on 357.0, sliders 32.74), R10-A4 (KIASI/WATABIRI within 0.24px; values unmoved), R10-A5
  ("Nafasi zako" glyph 157.12), R10-A6 the Withdraw door centred (sw −0.19 / en +0.15 / zh +0.31 at 390; was +0.86…+1.36)
  and the Deposit door, A6e, the QuerySort caret exact, R10-D on /updown/history (fade into "Juu imes…", pressed lens
  whole), R10-B elsewhere ("dau lako", "malipo yako", "dau zako" held), focus rings whole, nothing wraps or clips.
- F2 REAL → FIX: the Up & Down stake panel's empty-side note tears "dau / lako" at sw 1280 (166) — `emptyCopy`
  (udNobodyBacked) drawn raw in updown-stake-controls.tsx ~353, round-stake-panel.tsx ~308 and updown-card.tsx ~1057;
  R10-B's census missed them. Route all three through `noticeBody`.
- F1 → S12 (already listed, R5-J): /updown/history's "{wins}/{decided} decided" in English in every locale.
- F3 → S12 (dates): /updown/history's numeric "12/10, 00:10 EAT" (its own en-GB `month: "2-digit"` formatter) where every
  other date names its month.
- F4 → KNOWN (rendering): the INATATULIWA stat glyph 0.93px past its column after a whole-pixel paint (moved 2.00 for a
  1.20 pull); the same family as the other residues.
- Doubts: the A6e record (again); the ⓘ's 13.78 (layout) vs 13.34 (drawn) — the code's own note; /updown/history's side
  chips draw TEXT arrows (Inter 700's ↑/↓) beside the round page's svg arrow — a census gap of R10-A6 for text arrows →
  S12/round-11 polish, recorded; FAIDA HALISI counts settled rounds only (with "decided" its only word) → S12; the
  390 sort caret 1.0px short or snap (unsettled, sub-pixel) → KNOWN; SHIRIKI = reader 5's F1. Round 9's D4 (the live
  price label 10px left of JUU/CHINI's) still open → recorded for the next polish.
