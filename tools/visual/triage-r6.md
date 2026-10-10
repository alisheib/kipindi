# Round 6's read — triage (tiles-r6b2 at 4b754b89; readers' reports as they arrived, then each finding checked)

Status keys: OPEN (to check) · REAL (checked, to fix) · FIXED (sha) · DATA (live/QA data, not code) · KNOWN (owner/S12/by design)
· REFUTED (measured wrong or rule misread).

## Summary (2026-10-10 ~08:40 EAT) — what the read found, and where each stands
All 8 readers done (333 tiles). Fixes since, on origin/vodacom-visual (each owes a tile in the next lock turn):
- FIXED 3d2beb17 · /profile/invite lost its body on in-memory servers (found by turn B's qa:live; 334/334 after).
- FIXED 11e8e628 · R7-1 the journey hub's Sign out row in the danger ink (r5i 2.3 lists it).
- FIXED 34245fd4 · R5-1/R8-1 (REGRESSION since R5-A) /results' spotlight flag one unbreakable unit.
- MERGED 94bf79ad · 4d6dab4b · 5c13a9a2 · the history-bar branch (R5-L's named items 1–3).
Still OPEN (next round of fixes, then re-tile and re-read):
- R6-1 REGRESSION · en 390 Tiketi zangu empty state: "… YES or NO — your / ticket shows up here." (r5: "… — / your ticket…").
  Cause to confirm in a browser: R5-E's round-5 H4 rewrite made the held runs nowrap spans instead of inserted
  characters; its note claims identical breaks, but this body (pair "YES or NO" + the dash, merged into one span) now
  balances differently under text-wrap: balance. Check emptyStateBody in Chromium at 390 with and without the span.
- P-1, P-2 · classic parity: register R4-K's not-found robots (32 cells) and the sell confirm's ✕-on-title (R5-A F20) +
  the panel's transparent outline/tabIndex (R6-B B-1) in EXPECTED_DIFFS (S/visual/parity-main-e7a979c6.json.current.json
  holds the capture; S/r7/par-cell-diff.cjs-style reading of regions.confirm.layout gives the line pairs), then re-run.
- R1-1/R2-2/R3-1 · zh 320 featured card meta: the source name split ("Tanzania / Meteorological Authority").
- R5-7 · /leaderboard ribbon "ROI BORA 54.1%" without its sign (podium and table "+54.1%").
- R5-3, R5-4 · legal titles ending a line on "ya" / "wa" (RG, AML at sw 390); R5-A's rule (owner 37).
- R5-9 · /fairness 1280 tracked right-aligned reference 2px short of its edge (C11's census missed it).
- R5-6 · two page-head eyebrow inks (info-tone heroes 181,207,255 vs 137,157,209; /proposals inconsistent).
- R5-2 · /leaderboard 390 podium "you" coin: white initials on metal, 2.05:1 (or a captured hover).
- R8-3 · the void chip in brand/royal on Tiketi zangu vs slate on /results (state inks: void = cancelled = slate?).
- R8-4 · /results' session-ended notice band 4–5px inside the 16px page edge.
- R6-3 · en "My tickets" h1 ~2px inside the column edge ("M"'s side bearing; sw/zh on the edge).
- R6-2 · a market title splitting "NBC / Premier League" (title balancing over a proper name; data-dependent).
- R2-D5 · the selected payment tile's 2px ring 1px outside the column (gap 11 instead of 12).
- R7-3/R8-5 (low) · the stacked INAKUJA tag at a half-pixel (17 vs 18 rows) and the stack ~2px low in its row.
- R5-8 (low) · /profile badge count "5/20" squeezed between coin and name. R5-10 (low) · the error view's hard-edged waves.
- HAZARD to audit: any multi-word kp-track-end label inside a shrink-to-fit box wraps by the take-back (R5-1's cause):
  the Up & Down streaming note, the round page's "pick · stake", withdraw's frozen-balance label.
By design / KNOWN (no change): R7-2 (DotSeq lets a whole item stand alone; "Self-exclude" is whole), avatar hues (data:
the crest is per account id), the live ticker's presence, staff strip widows, R1/R2 claret band rules.
S12 (wording, no dictionary change here): the zh trust line's HaloPesa或Mixx spacing, "INAELEKEA NDIYO" vs "NDIO",
"amana" in the deposit prose, zh "许可证: ", "Market Proposals" Title Case.
Doubts for the owner list: the void ink; "No fee" in green; /help's plate hues; the Needle's glow near chevrons at 390;
the error view's door wording "Rudi kwenye wasifu" vs "AKAUNTI".

## Reader 1 (tiles 001–042: classic root, header root) — 42/42
- R1-1 OPEN · 029 journey zh 320 guest: the featured card's meta line "结算来源：Tanzania / Meteorological Authority" splits
  the source's name; "结算来源：" / "Tanzania Meteorological Authority" (210px in a 255px line) would keep it whole. Same in
  r5. Probably sw 320–360 / en 320 too (hidden under the rail there). Rule: a name split where its line could hold it.
- R1-2 OPEN (likely DATA) · 007–012 classic player: the header avatar crest's fill changed (008 (1236,22) r5 rgb(0,62,156) →
  r6 rgb(69,46,152)); shape identical. The hue comes from the account id (identity-avatar.tsx crestParams, app-shell.tsx
  passes session.userId) — the in-memory server's QA account id. Check: identity-avatar.tsx unchanged vs main.
- Doubts: zh payments line "HaloPesa或Mixx" has no space where "可通过 M-Pesa" has 4px (dictionary, unchanged); the claret
  rule under the hero (by design?); the featured card's YES/NO 8px apart vs the market page's 12px (R6-C's pair rule).
- Verified: the card top on the claim's first ink row (18/18 tiles), titles balanced, trust row, one pill size, journey
  "Tiketi zangu" link, the eyebrow tick in brand blue, no "·" line ends, no regressions.

## Reader 6 (tiles 211–252: Tiketi zangu, hub top) — 42/42
- R6-1 OPEN (REGRESSION?) · 244 en 390 new player, Questions empty state: the hint breaks "Pick a question, tap YES or NO —
  your / ticket shows up here." (r5: "… — / your ticket shows up here."); "your" torn from "ticket", 128/234 against r5's
  159/202. R5-E's rule: empty-state sentences break where they broke in r5. Every other empty state keeps r5's extents.
- R6-2 OPEN · 225/228 en/zh 1280 settled: the market title splits "NBC / Premier League" (English title, data). Unchanged.
- R6-3 OPEN · every en Tiketi zangu tile: the h1 "My tickets" ink starts at x18.17 (1280: 134.17) where sw starts at 16.39
  and zh at 16.17 — ~2px inside the column edge (the "M"'s side bearing?). Unchanged since r5.
- Doubts: the voided pill royal (state rule says cancelled = slate); the loss pill in NO rose beside a green YES side
  pill; sw titles ending lines on "ya" (owner 37's rule is the legal titles'); zh synthetic bold beyond E45; the first
  chip's label 17px in; the avatar tint swap (data).
- Verified: sub-tabs on the column edge (41 tiles), the journey bell (blue badge, no shadow), zh "。" lines centred on ink,
  empty-state breaks 20/21, the hub's "Bingwa" and Matokeo glyph, gold only where allowed, no regressions.

## Parity (turn C, 3d2beb17 vs the baseline at main e7a979c6, --allow-base) — 37/39
- P-1 REAL (EXPECTED, unregistered) · 32 cells /kp-parity-no-such-page: notFound.robots "index, follow\nnoindex" →
  "noindex\nnoindex, nofollow" — R4-K (0dbaa118): the not-found page's robots right. Needs a named EXPECTED_DIFFS entry.
- P-2 REAL (EXPECTED, unregistered) · the 2 classic sell-confirm cells (en, sw at 360): R5-A F20 moved the ✕ from the
  panel's corner (279,174.5) into the title row (279,187.5, on the title's capitals; the title column 278 → 222px), and
  R6-B B-1 gave the panel `tabIndex=-1` and `outline-none` (2px solid TRANSPARENT: computed "solid", nothing drawn —
  forced colours only). Needs named entries (html + layout per language).

## Reader 7 (tiles 253–294: hub) — 42/42
- R7-1 OPEN · 256/259/264/267/272/275/294: the journey hub's Sign out row ("Toka" / "Sign out" / 退出登录) is in the plain row
  ink (label 245,248,255, glyph 198,209,236) where R5-I made every other Sign out danger red (avatar menu, /profile,
  /profile/sessions). Unchanged since r5. Rule: one control, one look.
- R7-2 OPEN · 260 en 320 player hub-top: the "Set limits" line wraps "Limits · Take a break" / "Self-exclude" — a one-part last
  line (the row 72px instead of 56). Unchanged since r5. Rule: no one-word last line (G2 fixed the guest Msaada line so).
- R7-3 OPEN · 255 sw 390: the INAKUJA tag stacked under "Mapendekezo ya Masoko" is 17px tall (capitals 4 | 5), 18px (5 | 5)
  everywhere else; its two-line block sits 12 above / 9 below in the 56px row. Unchanged since r5.
- Doubts: D1 the hub identity card's avatar is a flat brand disc where the header and /profile use the id-derived crest
  (r4's open check); D2 the Sign out box 56px outer vs 58px one-row cards; D3 189px empty at 1280 between Sign out and the
  footer (80 on phones); D4 "Market Proposals" Title Case beside "Privacy policy" sentence case (wording); D5 guest hubs
  show no Needle (intended?).
- Verified: R6-C's names (Bingwa, Mapendekezo ya Masoko, Sera ya faragha, Msaada/Help, one invite name, no identity door
  for a verified player), the Results glyph, neutral COMING SOON tags, the bell, the Arifa count, the footer (regulator
  whole), brand-blue highlights, no hover state, earlier rounds hold.

## Reader 3 (tiles 085–126: header root, unread, hub) — 42/42
- R3-1 = R1-1 (corroborated) · 097/109 zh 320 held/masked: "结算来源：Tanzania" / "Meteorological Authority" (name 210px, line
  256px). Unchanged since r5.
- Doubts: D1 two avatar styles on /account (header id-derived crest vs the hub card's flat royal disc); D2 = R7-1 (hub Sign
  out ink); D3 092 bottom row: the links' baseline y742, Funga's y744 (1.6px; same in r5); D4 docked sheets all +1px vs r5
  (R5-B F7 moved the box 1px; relative geometry identical); D5 the ✕ box is unpainted (inset unreadable); D6 the "—" mark
  ~0.58px past the right edge (borderline).
- Verified: card top on the claim's ink (14 tiles), titles, trust row, right-aligned labels, one pill size, Tiketi zangu link,
  TZS 0 lead, inks, held Wallet sheet 16 | 16, docked sheets without an edge line, ✕ on the title's capitals (±0.4px),
  the bell, hub names and glyphs, hub geometry, earlier rounds.

## Reader 4 (tiles 127–168: unread, home, market page, Up & Down, Tiketi zangu) — 42/42
- R4-1 S12 · 137/146–149 zh home: the trust line "可通过 M-Pesa、Airtel Money、HaloPesa或Mixx by Yas 充值和提现。" has 3–4px
  Latin–CJK gaps at 通过|M-Pesa and Yas|充值 but none at HaloPesa|或|Mixx (dictionary copy; same in r5; R1 noted it too).
- Doubts: 156 the guest sheet's ✕ glyph 41.5px from the panel edge (unpainted box; unchanged); 162 "· Hakuna ada" in the
  subtle ink where the state-ink rule puts "No fee" in success green (stated for the sell confirm; unchanged); 167/168 the
  voided pill in brand ink (rule: cancelled = slate; is void cancelled?); 128 hub Sign out (= R7-1); 158 two avatar colours
  (data + the hub card); 1px air difference above the hairline at 390 vs 1280; the live ticker's presence varies (data).
- Verified: card top (7 tiles), titles balanced, trust row, NDIO caption on the figure's edge, Tiketi zangu link, hero
  hairline; market page: clock label subtle, "INATATULIWA", NDIO/HAPANA 12px apart (r5 10), header rule plain, title clear
  of the watermark, bar label on its edge; Up & Down dead feed message centred, history pill "TIKETI ZANGU"; sub-tabs on
  the edge; hub names and Matokeo glyph; neutral tags; the bell (15 tiles); Wallet sheet 16 px below the hairline; no
  bottom border on docked sheets; ⊕ 12px; guest sheet without bottom border; focus rings whole; ticker spacing.

## Turn C (3d2beb17): local qa:live 334/334 ALL PASS — the invite page's in-memory fix confirmed.

## Reader 2 (tiles 043–084: header root, deposit) — 42/42
- R2-1 = R4-1 (S12) · zh trust line spacing at HaloPesa|或|Mixx (dictionary copy).
- R2-2 = R1-1 · zh 320 featured meta "结算来源：Tanzania / Meteorological Authority" (059/074/084).
- Doubts: D1 the capsule box grows 14–17px for six-digit balances (owner 14); D2 the mark ↔ 18+ badge gap 7 / 21 / 13px by
  breakpoint (unchanged); D3 the home's band rules are claret (unchanged; R5-C's "hero hairline" is the eyebrow tick); D4
  the avatar hue (data); D5 the SELECTED payment tile's 2px ring sits 1px outside the column (067 x40 vs x41; 069 x384 vs
  x385) — the gap beside it 11 not 12; D6 "POCHI" twice on the journey deposit (back link + eyebrow, by spec); D7 "amana"
  ×3 in the deposit limits prose (S12); D8 en 1150 proof labels 1px lower than r5 (invisible).
- Verified: card top (16 tiles), nothing moved below 1024, titles, trust row, one pill size, TZS 0 lead, Tiketi zangu link,
  eyebrow tick, POCHI / Weka pesa head, check badge 4px in its corner, capsule centring, earlier fixes.

## Reader 5 (tiles 169–210: results, wallet, withdraw, live, leaderboard, RG, proposals, profile, fairness, help,
## notifications, markets, agent, legal) — 42/42
- R5-1 REGRESSION (FIXED WRONG) · 169/170/201 /results notable card: the spotlight flag "MATOKEO MASHUHURI" wraps to two
  lines in a narrowed box (390: ink x202–287, r5 one line x201–346; 1280: x1067–1153, r5 x1067–1212) — no longer ending on
  its column's edge; the title and bar move 14px (390), the chip row 4px and the card 8px (1280).
- R5-2 OPEN (pre-existing) · 177 /leaderboard 390 signed in: the podium #1 "@Demo" coin is solid metal (193,173,127) with
  white initials at 2.05:1 (r5 gold, ~1.8:1); at 1280 the same #1 is a violet disc with a metal ring (~14:1). One element,
  two looks, and a contrast failure (unless a pointer hover was captured).
- R5-3 OPEN (pre-existing) · 206 /legal/responsible-gambling sw 390: "Sera ya / Mchezo Salama" ends line 1 on "ya"; "Sera /
  ya Mchezo Salama" fits by ~2px (253px column).
- R5-4 OPEN (pre-existing) · 208 /legal/aml sw 390: "Sera ya Kuzuia / Uoshaji wa / Fedha na KYC" ends line 2 on "wa"; "Sera /
  ya Kuzuia Uoshaji / wa Fedha na KYC" fits (242 / 233 in 253px).
- R5-5 S12 · 175/176/202 /live: the bar caption "INAELEKEA NDIYO" beside the side label "NDIO 67%" (one YES spelt two ways).
- R5-6 OPEN · page-head eyebrows in two inks: 181,207,255 on RG, /fairness, /help, /notifications (info-tone heroes) vs
  137,157,209 on /proposals (also an info hero), withdraw, /profile, /wallet, /leaderboard, /agent, /markets, /results,
  /updown. R5-C's rule: one eyebrow ink. (The RG eyebrow changed this round from green.)
- R5-7 OPEN (NOT FIXED per brief) · /leaderboard ribbon "ROI BORA 54.1%" without its sign; the podium and the table say
  "+54.1%".
- R5-8 OPEN (pre-existing) · 186 /profile badges 1280: the "Sharp / Mahiri" count "5/20" has 2px above / 3px below between
  coin and name (siblings 15px coin→name).
- R5-9 OPEN (pre-existing) · 188 /fairness 1280: the tracked right-aligned reference "FATF R.10 · POCA CAP 423 §16" ends
  ~2px short of its edge (x1113 vs x1115) — a tracked label C11's census did not reach.
- R5-10 OPEN (low) · 182 the error view at 1280: its wave backdrop is a hard-edged 560px box (the not-found view fades
  64px).
- Seen, fixed after r6: 181/182 /profile/invite's error view (3d2beb17).
- Doubts: the void chip "BATILI" royal (void vs cancelled = slate?); "Imebatilishwa 1" lens vs "Batili" legend;
  "IMETATULIWA · HAPANA" (notable) vs "IMEKAMILIKA" (grid); /results pill heights 18 / 20 / 23px; /live's "LILILO NA SHAKA
  ZAIDI" caption and live dot still aqua beside brand arrows; /help contact plates in three hues; avatars (data); the error
  view's door "Rudi kwenye wasifu" vs the journey's "AKAUNTI"; R5-2 maybe a hover.

## Reader 8 (tiles 295–333: hub, staff, Tiketi zangu, channels panel, results, classic home, KYC) — 39/39
- R8-1 = R5-1 (corroborated) · 326 sw 390: the spotlight flag "MATOKEO / MASHUHURI" two lines, x221–287, 61px short of the
  edge x348; the title 14px lower. Estimate: one line needs ~128px from x221 → ~x349 against x348: misses by 1–2px.
- R8-2 likely DATA · 330 classic sw 390: the header avatar's inner disc blue → violet (both DP players changed, the staff SS
  avatars did not) — the per-account crest.
- R8-3 OPEN (pre-existing) · 319 Tiketi zangu: the voided chip "IMEBATILISHWA" in brand/royal (153,196,255 on 57,76,157)
  where /results draws the same void ("Batili 1", its donut segment) in slate 137,157,209 — like-with-like + R5-C's slate
  for reversed/cancelled. (Readers 4, 5, 6 doubted the same.)
- R8-4 OPEN · 326: the session-ended notice band ("Umetolewa… · Ingia") sits 4–5px inside the 16px page edges (icon ink x21,
  the Ingia box x310–369) where everything else keeps x16 / x373.
- R8-5 = R7-3 · 297/331 sw 390: the "Mapendekezo ya Masoko" + INAKUJA stack 12 above / 8 below in its row (centre 2px low);
  other two-line rows centre within ~1.5px.
- Verified: R5-A/R6-C names, the identity door's name, "‹ AKAUNTI" on KYC, the Matokeo glyph, neutral tags, the card-size
  row, the Needle row glyph, the hub's columns, the KYC stepper's current step in brand, the bell and Arifa count, the
  sub-tabs, the channels panel ✕ (0.17px), the home trust row, the price caption, the ticker fade, /results' colours and
  search band, the journey footer's licence (sw 1280 whole; sw 1024 split allowed; en 1024 "Licensed by" / "the Gaming Board
  of Tanzania." — not the brief's "Licensed by the / Gaming…" but the name whole), the proposals link, the Needle, the
  phone mask, the lens fade.
- Doubts: the hub Sign out (= R7-1, fixed 11e8e628); the Needle's glow 0–5px from row chevrons at 390 (R3-B asks ~10px);
  connective line ends outside legal titles ("Mapendekezo ya", "Leseni ya" — the break-before-the-name rule); staff strip
  widows (by design); zh "许可证: " ASCII colon (S12); the /help phone plate green; two eyebrow inks (= R5-6).
