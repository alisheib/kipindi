# Round 4 triage (tiles-r4, vodacom-visual fd7a1fe6) — readers as they land

## FIX
G1  Featured card at sw 390 (045): when the tail fits on line 1, the category and the time left sit 9px apart
    ("UCHUMI masaa 1 yamebaki" reads as one phrase); 412 has 31px; en 390 has 40. → a minimum gap between the category
    group and the time (wrap if it cannot be kept). market-card.tsx / .mcardp-tail.
G2  Deposit 1280 (069): five payment methods in three columns leave an empty third cell in row 2 (x733–894 y570–675).
    → the last row's items share the row (a 6-track grid: items span 2; a last row of 2 spans 3 each; a last row of 1
    spans the row). ProviderRadioGrid (deposit and withdraw; check phone widths too).
G3? Balance capsule with a short figure (TZS 0, compact 9.9M): content right-aligned in the box reserved for 999,999
    (D31) — 39px left vs 10 right (076), 17 vs 10 (072/074). → decide: centre within the reserved box (masking still
    moves nothing) or by-design right alignment; check rule 8a / D31 text first.

G4  Journey bell at 1024/1280 (268 269 276 277 278): the "25" badge (red x919–938 y8–21 at 1024) no longer buries the
    dome, but its dark ring and glow TOUCH the dome's top-right (no gap; the shoulder x918–921 y21–24 tinted red).
    → move the badge a few px further up/right, clear of the dome by its ring + glow, keeping it inside the header and
    clear of the avatar; journey-shell 7.bell pins the values.

DONE bf30c154: G4 (badge 1px higher, no rose glow in the journey slot; red 181/181).
G5  Featured card's empty-state pair not centred between the pool bar and the YES/NO buttons: 18 above / 28 below at
    768–1280, 14 / 18 at phones (002 017 018 020 028 013 015) — also round 3.
G6  REGRESSION (R3-C): the hub's card-size row (259 sw 390): toggle + "Ndogo" on the label's line (centre 146.5–147)
    while the grid icon centres on the row (156.5) — 10px apart; the row 61px (pitch 62) against every hub row's 56
    (pitch 57), two-line rows included. Round 3 had the value centred on the row. → the switch row's grid: icon and
    trailing control both centred on the row like every two-line row; the row back to 56px.
G7  Featured card's pool figure "TZS 10,800" (141 145 142–149): ~11px type (cap 8px), dim (122,139,193), and NO label
    — an unexplained money figure, smaller than the 13px empty state in the same slot. → label it (existing words) and
    lift it to the ladder's step R3-A used.
G8  The hub's Needle row glyph draws at half the ink of the other row glyphs (ring peak 102,107,163 vs 198,209,236) and
    18px vs 16px (122 125 128 124 127 130) — check NeedleMark's deliberate two-tone vs the row glyph family.
G9  Guest tickets sheet × at en 320/390 sits 1.5–2px below the title's cap-band centre (116: × 645–654 vs cap 640–655;
    117: 670–679 vs 665–681) while the 1280 dialog is 0.5px — phone and desktop disagree.
G10 NOT FIXED (b8, 329 /results sw 390): still a 69px empty band between the search box (frame bottom y428) and the
    chips (frame y498; glow from 490), then only 8px chips → sort (the selected chip's glow touches the sort pill), then
    34px to the first card — 69 / 8 / 34. The kp-qrow rename did not cure this: a second cause on /results' bar.
    (b4/b6 also: Tiketi zangu tab rule → chips 42, chips → card 44.)
G11 The Needle at zh 320 (313): the disc (y636–688, from x293) touches and partly sits UNDER the chat bubble (ring
    x256–305 y652–702; 0–1px apart y656–684). The rest logic must count the chat bubble as an obstacle. Also: the same
    cell rests at different heights in en and zh captures (305 y550–600 vs 313 y638–697).
G12 REGRESSION (R3-A ticker fade): the fade starts right at the label, so a faded glyph sits 1px after "MUBASHARA"
    (321 325 330 332: label ink to x89, track ink from x91, peaks 113–155 — "MUBASHARAsiku"); full ink from x112. Round 3
    had ~20px clear. The right end keeps 16px clear before the pause control. → a clear gap after the label, then the
    fade.
G10+ (b5) the band under the search box is on every filter bar with a search: /results sw 390 70px (204), notifications
    sw 390 60px (193) and 1280 59px (194), /live 390 49px (205); and chips → sort only 8–10px on /results, notifications
    and /markets 1280 (196: 35 / 8 / 12 / 26, the selected pill's glow touching PANGA's border); /leaderboard is 33/33/32.
G13 (b5 196) /markets 1280 row-3 divider off-centre between groups: 32px after "TZS 50k+ 0"'s ink, 14px before MADA
    (row 2: 14/15). Centre the rule on the VISIBLE gap (an unbordered pill's ink is its edge).
G14 (b5 193 194) notifications: title "Soko limefutwa · TZS / 4,200 imerejeshwa" splits TZS from its figure (193); money
    in titles in the display sans, not mono (194 "TZS 4,200", "TZS 3,500"); body widow "…kwenye pochi / yako." (194);
    the ✓ / × action glyphs 4–5px below the card's icon and ~14px below the title (194: glyph centre y674, icon 669.5,
    title ~660). → R3-D's moneyRuns for titles (TZS + figure whole, .amount), balance the body, align the actions.
G15 (b5 197) agent stat tile caption at 13px ends on one word ("uliowaleta") — balance stat hints (R3-D raised them).
G16 (b5 210) privacy version line splits "Personal Data Protection Act / 2022" — keep a year with the word before it.
G17 (b5 202) Up & Down chart controls uneven: label → interval 10px, → Mstari/Mishumaa 8, → chart card 12; the chart
    axis reads "2896.04" (no separator/currency) beside "$2,896.00".
G18 (b5 195) /markets 390 caption "masoko 40 · Pesa nyingi" 6px under the sort pill and 8px above the hairline — cramped.
G19 (b5 205) the lean label "INAELEKEA NDIYO" in an italic mono — probably synthesized (no mono italic loaded).
CAPTURE (b5 217 218 219): unread signs missing on Tiketi zangu open tiles (en) — the capture's unread wait covers the
    tabs/hub tiles only; extend it to the tickets tiles.
BY DESIGN/ENV (b5): BTC $2,896 (this PC's stub price feed); NBC Premier League split (data title); /markets grid 14px gap
    (check --mcard grid token, doubt); "Dev fixture —" English notification (fixture data).
S12 (b5): /live "NDIO 67%" beside "INAELEKEA NDIYO".
OWNER: the CLASSIC bell's "25" badge covers its dome at 390 (333: badge+glow x307–334 y8–29; only lip/base/clapper
    show) — classic chrome, `qa:bell-untouched` (A1); the journey's equivalent was fixed in R3-D/bf30c154.
DOUBT: LIVE ticker absent on every unblurred r4 home tile (present in r3 on en/zh): capture/server-state, or R3-A? →
    check in the next tiles; the ticker is server-rendered (no first-paint jump) if present.
S8: held (frozen) wallet's featured card YES/NO look live (088–100) — with the break case, S8's bet-sheet gates.
BY DESIGN (b6/b2): zh 1280 data title splitting "NBC Premier League" (market data) · the empty band above the footer at
    1280 (main's min-height keeps the footer at the floor) · the featured card's 10–11px phone top (the Compact rung,
    --mcard-pt 10px, Ali 2026-09-15) · gold won payout (gold is money) · dial at 320 over a card frame (tier 1).

## VERIFIED in round 4 (b7)
dial on its own edge everywhere (302/303 fixed), clearances 15–24px · Needle hub row like the others · card-size hint
own line (one line 360+, two whole lines at 320) · bell 29/29 · badge off the dome · zh motto upright · unread signs
present · header edge · hub two columns, 16px gaps · Pendekeza row · guest Msaada · guest lead · zh hint · footer
"Tanzania." balanced · footer pill one line at 1280.
BY DESIGN (b7): dial at 1024 against the profile card's frame (disc x992 vs border 991, no overlap) — R3-B's tier 1
(content/text clear, a frame allowed; the 32px gutter equals the disc's visible half and the hub's 16px gaps cannot hold
a 64px disc) → owner item 10 extended to 1024 and zh 320.

## VERIFIED in round 4 (b1)
deposit form first line 27/35px · sw headline edge 16/32 · "Tanzania." balanced · zh 1024 trust and lead whole ·
zh 320 meta "截止" / "结算来源" · en 1024 lead · card empty-state 13px, contrast ~6.5:1, heights unchanged · bell 29/29 at
1024/1150/1280 · limits line mono + "10,000" · chevron tip on the edge · no "paid to you" above "TZS 0" · header edge
16/32 on all tiles.

## KNOWN / S12 / BY DESIGN
- "masaa 1 yamebaki" (sw singular) — S12, held on vodacom-s12-timeleft (1468d7cc).
- Header logo→18+ gap 7/21/13 — the A5 row-gap steps (by design; reader b1 says 768 reads like a hole — note for owner?).
- zh "1小时后" vs en "1h left" — copy (S12 if anything).

## From main (ALI-BLADE15's S9 record, 2026-10-09)
G20 The deposit return receipt at 390: a long transaction id or gateway reference leaves one or two characters alone on
    its second line (`ReceiptRow`, src/app/wallet/deposit/return/page.tsx — a file S9's fix touched on main). → break
    ids into balanced chunks / keep a minimum run on the last line; after the rebase onto main (S9's files).

## M9 edges (90cb52ea) — BLOCKED cells, judged
- s2-selfexclude root-wallet-sheet ×9: signed out (2 sign-in pills, no capsule) — correct; the cell cannot exist.
- s4-longtitle root-card ×9: the longest sw title is on no lens of `/` (featured + 7 rows); the longest `/` shows is
  tiled instead (root-card-longest-shown); the title itself is tiled on /markets and its page.
- s5-slow3g cold mid-load ×10+: no frame before content — the DEV server's unminified CSS arrived at ~36 s, render-
  blocking, with the content. Production (a6331ca1): 3 render-blocking stylesheets, 54 KB brotli (3.3 + 7.9 + 43.3) —
  ~1–2 s at Slow 3G. Not provable on a dev server; first load on production is S7 WP1's `qa:first-load` (A9). DOUBT
  for S7, not a pass finding.

## EDGES (M9, 90cb52ea) — readers' findings, for R4-H unless marked
(e8, tiles 449–509)
E1  → R4-G: the OfflineBanner covers the header at every width (phones y0–55 over mark/18+/capsule/pill; 1280 y0–37
    over the nav labels — the likely cause of the 3 BLOCKED 1280 offline taps); back online it stays; cached offline
    page at 1280 has no bell. (sent to R4-G)
E2  488 sw 320 Wallet sheet: the ⊕ icon in "Weka pesa" crushed to ~4×4px (12px at 360 / en / zh) — the long sw label
    squeezes it (flex shrink). → icon shrink-0, label wraps/fits.
E3  496 en 320 Wallet sheet: the Deposit caption "Mobile money or / card" leaves "card" alone; the Withdraw caption is
    one line → balance (and level the two captions).
E4  The home's link to /positions reads "Nafasi zangu / My positions / 我的持仓" (landing-hero.tsx ~540, t.home.myPositions)
    while the journey's tab and the page's h1 say "Tiketi zangu / My tickets / 我的注单" — one page, two names. Check the
    classic nav's name for /positions; in the journey the link should use the tab's own key (composition, no new words).
E5  DOUBT→check: the home's <title> is English ("50pick — Predict events. Not chance.") in sw and zh while other pages
    localise their titles. Find where it is set; localise from existing keys if they exist (else S12).
E6  BY DESIGN/NOTE: a 130% root font size changes nothing on player pages (the type scale is px; only the staff strip
    uses rem). Browser zoom works (WCAG 1.4.4 met by zoom) — an accessibility note for the owner, not a pass fix.
E7  CAPTURE: hovered rail label on offline-tap tiles (pointer left on the tab) — the drive moves the mouse away (R4-G).
E8  DOUBT: at TZS 0 the Wallet sheet's Withdraw button looks live — add a /wallet/withdraw TZS 0 tile to the edges;
    and the deposit form below the fold at TZS 0 (amount + submit not proven) — a scrolled tile.
(e3, tiles 129–192 — s2 self-exclude; gating logic holds: signed out, every gated page → sign-in, guest hub)
E9  LOGIC: the self-exclusion refusal states its end as a bare ISO date ("hadi 2026-10-10" / "until 2026-10-10" /
    "至 2026-10-10") with NO time — a 24h exclusion from ~05:05 EAT reads as if it ended at midnight. → the locale's
    date AND time (EAT) through eat-day's localized formatters (zh "2026年10月10日 05:05"); no dictionary change.
E10 129/130 zh exclusion panel: the (!) icon sits 2px below the title's ink centre (sw/en 122–127 to compare).
E11 Auth widows: register heading "Karibu kwenye / 50pick", "Welcome to / 50pick" (sw 360/390, en 360); en 1280 sign-in
    subtitle "…on your / account."; en 390 phone helper "…starting with 6 / or 7" (keep "6 or 7" whole).
E12 CHECK: the forgot-password link's caps are 8px (sw/en) and zh 9px — probably ~11px type, under the 12.5px floor
    for a key recovery link (D6).
E13 CHECK: featured card hover at 1280 (160 184): the category watermark brightens (28,38,122) behind the share icon,
    "Details" and (i) — decoration lit behind controls. Decide (dim the watermark under the controls / don't lift it).
E14 CHECK: auth pages at 1280 — wordmark twice (header + brand panel) and the brand panel's edges at x64/x640 vs the
    header's x32 edge (D8); the gold eyebrows INGIA / SIGN IN / FUNGUA AKAUNTI vs gold-is-money (D5).
E15 CAPTURE: hover left on tiles (rows, card border, Sign up 2px raised) — the edges drive must park the pointer as
    qa-journey-shell does (§10 "its pointer leaves what it pressed") → with R4-G's drive edit.
BY DESIGN: zh body text breaking between characters inside words (在此之/前) — Chinese typesetting allows any character
    boundary in running text (headings and short labels stay whole, R3-A); NBC Premier League split (data title);
    the featured card's "—" for an unavailable price (this PC's stub feed); the support number as typed (owner ruling
    2026-10-06, Admin → System saves as typed); scroll slivers under the opaque header (scroll position).
OWNER: (F1/D12) a person who self-excluded minutes ago on this device is a guest again: the bet panel's first control is
    Sign up (register first), and "Anza kutabiri" / live NDIO-HAPANA show — should a device that just excluded be
    treated differently? (D4) the English motto "The wisdom of YES & NO." under sw/zh headings — brand line by design?
S12: zh spacing around Latin words and digits (或Mixx, 至少8个字符 vs 以 6 或 7); sw "namba ya simu" vs "Nambari ya
    simu" on one form; the sw register date placeholder "DD / MM / YYYY".
(e1, tiles 001–064 — s1 break; verified: no gold pill, no deposit in Wallet/hub, withdraw offered, break end "9 Okt,
 06:02" correct, the deposit page shows the break sentence instead of the form)
E16 LOGIC: the break explained without its end — /auth/login?cooled=1's panel ("kitaanza chenyewe mapumziko
    yatakapoisha" / "when the break ends", 003–011) and the confirm dialog's "Mapumziko mafupi" (002, no "Saa 1", no
    end). → carry the end into the cooled redirect (as excluded= carries until=) and state it with an existing approved
    sentence (rg.breakActive-style "hadi {date}"); no new words.
E17 LOGIC+lang: the refusal dialog (036 040 044) reads "hadi 9 Oct 2026, 06:02" — an English month on sw tiles and
    a format unlike the deposit page / limits callout ("9 Okt, 06:02"); the date splits across lines ("9 / Oct 2026,",
    "9 Oct / 2026,"); also 027 "9 / Okt,". → eat-day's localized formatter, the date+time one unbreakable run.
E18 The old bet dial and confirm modal (live for classic players; the journey until S8):
    - the tick labels "100K" / "50K" overlap each other and run under the thumb (034 038 042);
    - the caption "Mgao wa bwawa. Thibitisha kwenye popup." squeezed into a 58px column beside the place button
      (034: 6 lines, one word each);
    - at 1280 the "TUMIA KIDHIBITI" pill covers the "UAMUZI WAKO" label (042);
    - the confirm modal is taller than a 780px phone screen — Ghairi, the footnote and the bottom border below the
      fold at 360/390 (035 039).
E19 LOGIC: during a break, sentences that tell the player to bet NOW still show — the signed-in lead "Bado huna chaguo.
    Chagua upande…" (R3-A removed it for a HELD wallet; a break must match), the tickets empty state "Chagua swali,
    bonyeza NDIO au HAPANA…" + "Tazama maswali", the market's "Tumia kidhibiti kuanza". → the held-wallet treatment
    for onBreak. (Generic product lines — the hero lead, the trust line, "Kuwa wa kwanza kutabiri" — OWNER question.)
E20 Widows / dash starts / splits in the break flows: 002 "pesa.", 005 "yatakapoisha.", 008 "account.", 035
    "malipo.", 039 "mdogo.", 040 "kufanya.", 043 modal title "2026-27", 037 KIASI "bado"; lines opening on "—" (006
    035 039 060).
E21 001 limits page: the Pumzika and Jizuie forms do not line up (select x41–173 / button x186 vs x41–188 / x201).
E22 002 RG confirm dialog: × centre 4px above the icon/title centre.
E23 CHECK: gold outside money — the deposit-paused lock tile in the capsule's exact gold (027–029 060–062), the
    countdown labels (041 042); the market's "INAISHA" showing the RESULT time (picks close earlier) — label right?;
    the refusal dialog's role (alertdialog, focus) — D6; the bell badge missing on the market page at 1280 (041 042,
    maybe timing).
OWNER: promoSuppressed during a break vs the hub's Invite friends / Propose & earn / Become an agent (026 059).
S12: "dial" and "popup" (English) in sw sentences (035 039 043; the caption).
(e4, tiles 193–256 — s3 long names, s4 long titles, avatar menus)
E24 233–235: after saving the 40-char CJK name the WHOLE profile hero is shifted 32px left — avatar ring and wallet icon
    cut, the balance reads "ZS 50,000" (TZS ink x17 vs x38 on 203), a 32px gradient-less strip at the right. The overflow
    probe read ok (a scrolled ancestor). → find what scrolls (a scrollLeft on an overflow-hidden ancestor after the
    edit/blur?) and make the hero unscrollable sideways / the name wrap.
E25 218/219: the unbroken 40-letter name never breaks in the hero (button[Hariri jina] 141..722, pencil off-screen,
    focus ring cut) — the hub breaks it cleanly (221 222); name-editor.tsx ~163–174 lacks a break rule.
E26 236/240/244: hub at 360, the 40 CJK name leaves one character alone on its 4th line → balance/keep last two.
E27 LOGIC: name-editor.tsx:50 re-selects the field 30 ms after it opens (setTimeout select) — the first 1–2 keys typed
    were swallowed (saved names lost their first letters). A fast typist or a slow phone loses letters. → select in the
    same tick as focus (no delayed re-select).
E28 Board rows (248 249): the meta line ends on "·" ("…kwa bot.go.tz ·" / "Bwawa TZS 0 · 0 watabiri") → DotSeq.
E29 Title shaping for data titles: keep a season "2026-27" whole (zh 197 199 split "2026-"/"27"), keep a number with its
    unit ("dakika 28:00", 253 255 256). (Proper nouns "World / Athletics", "NBC Premier / League": data, by design.)
E30 CHECK: /markets card clamps the longest title mid-word ("…10K ya Worl…", 251 252) — find a clean answer (a third
    line where the grid's height allows, or a clamp that ends on a word) or justify by design.
E31 Avatar menu (1280): the Needle row inset 10–11px vs every other row (avatar-menu.tsx ~297 `px-2 py-2` wrapper
    around the drawer row), its chevron 12px short; sw "Pendekeza na upate / zawadi" widow beside INAKUJA.
E32 LOGIC: one phone, two masks — menu "+255*****84" vs hub/hero "+255••••84" → one masking function.
E33 LOGIC: the avatar menu calls /positions "Nafasi / Positions / 持仓" (avatar-menu.tsx ~368) while the journey's tab
    and nav say "Tiketi zangu / My tickets / 我的注单" (with E4: one page, one name in the journey).
E34 The "Jina limesasishwa" toast covers the header's controls (1280 x998–1244 y20–95 over the pill/locale/bell/avatar;
    phones the whole header) → the journey's toaster sits below its header (journey-scoped: the classic overlays are
    parity-captured chrome).
E35 CHECK (logic, not tiled): can a self-excluded person REGISTER again with the same phone or email? Prove by code
    and an in-process check that it is refused (and what it says).
CHECK: card footer "Hakuna bwawa bado" ~11px mono; hub vs menu avatar ring / "Inaonekana" vs "INAONEKANA" / icons.
(e5, tiles 257–320 — s4 en/zh, s5 Slow 3G)
E36 LOADING: on every mid-load frame the journey header band is drawn EMPTY (no logo, 18+, capsule, pill; at 1280 no
    nav, locale, bell, avatar) and the bottom rail is missing — though the log has them in the DOM — until hydration
    (~1.0–1.2 s later on this server; on a real slow network, until the JS arrives). Server-rendered chrome must paint
    without JS. → find what hides it before hydration and remove that gate (journey only — classic chrome frozen).
E37 LOADING: tap-navigation frames double-expose the header, staff strip and rail ~4px apart, dimmed ("TZS 188,888",
    301 292 315 306) — a cross-fade of two snapshots that do not line up. → the chrome must not move or ghost during a
    route change.
E38 LOADING: every skeleton is the generic SectionLoader box with the logo — /positions never shows the TicketsGhost its
    own expect names; at 1280 the box spans x32–1247 while the page's column is x132–1147 (a 100px jump each side);
    the skeleton's top (y253) is not where the content lands. → each journey route's loading state is its own ghost,
    in its own column.
E39 LOADING (check): during a pending navigation document.title is "" (the tab shows the bare address ≥2.3 s).
E40 Needle at zh 360 /markets (269): the dial rests 0–1px from "46 个市场 · 奖池最大" (glow over text) — en 360 rests 12px
    below its line. The rest rule must clear this text.
(E28 again: board meta lines end on "·" in en/zh 257 258 266 267; E4 again: hero link "Nafasi zangu / My positions";
 E5 again: the home <title> English in sw/zh — 38 sw + 37 zh entries.)
S12: zh market page "它会朝哪个方向结算?" ends on a half-width "?" (the zh home h1 uses "？").
CHECK (owner item 10 ext.): the Needle beside grid card frames at 1280 (262 271 298 320); hero at 1280 — the featured
    card centred on the text column lands 4px under the eyebrow in en (near-miss) — top-align it?
(e6, tiles 321–384 — s5 zh, s6 not-found)
E41 328 (tap mid-load, zh 360): a completely blank frame (one colour over 280,800 px) while the log says header +
    skeleton + pending — capture timing or a real blank; with E36–E38. Two tabs look lit during a tap (pill left on
    the old tab while the new one is bold; two underlines at 1280) — with E37.
E42 Not-found headings widow: sw 360 "Hatukupata ukurasa / huo", en 360/390 "…page" alone; zh paragraph splits 选择
    (390) and leaves "继续。" alone at 1280.
E43 The markets not-found and the global/updown not-found are two designs (gold "404" + gold browse link, plain cards
    Masoko·Mwanzo·Msaada, no kicker/wave vs periwinkle link, "404 · HAKUNA UKURASA" kicker, icon cards
    Mwanzo·Masoko·Msaada, wave) → one design; gold off non-money; markets not-found shows no chat bubble / Needle.
E44 Markets not-found h1 uses a straight apostrophe "couldn't" where the others use ’ (check source vs dictionary).
E45 zh empty-state title "您还没有进行中的注单" and its button "查看问题" render in a SERIF fallback (SimSun-like) with
    synthetic bold — every other zh heading is sans → the font stack of that element lacks the CJK sans fallback.
E46 1280 global/updown not-found: the wave background is a hard-edged box x320–959 y169–823 (no fade).
E47 LOGIC: not-found pages' titles — markets not-found keeps the home's English title, updown not-found "Up & Down ·
    50pick"; only the global one says "Hakuna ukurasa · 404". And HTTP 200 for /markets/mkt_… and /updown/udr_…
    (streaming after loading.tsx — check the noindex is there; the status itself may be the framework's).
E48 Unexplained "Failed to load resource: 404" subresources on 200 pages (378 380 381, and 399 home at 740×360) — find
    the missing URL (drive: log the failing request URL — R4-G owns the drive).
DOUBT: chat bubble over the last letter of "Msaada" on not-found at 360 (scrollable clear?).
S12: "URL" in sw copy.
(e7, tiles 385–448 — s6 not-found, s7 viewports, s8 text 130%; overflow probe clean on all 64)
E49 433 zh 768×1024 market page: the title's last glyph 赛 runs 22px over the category watermark (title ink to x701,
    watermark x680–741) — R3-D: the watermark sits beside the question, never under it.
E50 zh centred lines ending in 。 or ？ sit 4–5px left of centre (the full-width mark's empty right half): not-found
    paragraph (390 396), tickets empty state (427 428), the market question + sub-line (433 434).
E51 Not-found pages at 360/390: content edge x24, not the journey's 16 (cards x24–336 / x24–366).
(E42 widows, E46 hard-edged wave, E47 soft 404 + titles — again.)
OWNER item 10 extended: the Needle on the profile card's corner at 768 (14–17px inside) and 1024 (0px), and at 740×360
    the Needle and the chat bubble both on the profile card in a 170px reading window (with the staff strip).
CHECK (gold-is-money, raised by four readers): the market page's countdown labels (UCHAGUZI UNAFUNGWA / MATOKEO BAADA
    YA), the markets not-found "404" + browse link, the deposit-paused lock tile, the auth eyebrows (INGIA / SIGN IN /
    FUNGUA AKAUNTI / 登录以预测), the menu's sparkle on Propose & earn — read DESIGN_AUTHORITY and test:gold-is-money's
    registry, then rule each.
CHECK: 768 home — the featured card 736px wide beside ~370–490px of hero copy (stretched?).
(e2, tiles 065–128 — s1 break market/refusal/wallet/RG, s2 exclusion panel; verified: break end right, no deposit
 anywhere, Withdraw alone full width, s2 signed out in every language, empty state centred 48/48)
E52 Refusal dialog: zh date in English ("至 9 Oct 2026, 06:02", 102 106 110 — with E17); the eyebrow repeats the title
    ("无法下注" over "无法下注"; "COULD NOT PLACE BET" over "Could not place"); "冷静期" here vs "休息期" in the RG callout
    and deposit notice (S12 if words). en wraps split the date ("until 9 Oct / 2026, 06:02", "9 Oct 2026, / 06:02").
E53 Bet panel / confirm dialog (the old dial, with E18): "Possible winnings TZS 1,500" not in mono (the stake is);
    the Multiplier label ~12px below its field's centre (067 071 075 100); "YOU ARE / PICKING" wraps; en dialog
    widows ("small.", "closes.", title "2026-27" alone) and "Sell within 5 / minutes"; the dial's scale labels ~7px at
    ~1.4:1 contrast.
E54 Dialog × 3–4px above the title's first-line centre (068 072 076 101 109 112) — the kit Modal, every dialog.
E55 Self-exclusion panel (113–128): "until 2026- / 10-10" splits the date (with E9's date+time fix); widows "us.",
    "utuombe.", zh "请。" alone; a line opening on "—".
E56 zh RG callout (097) leaves "现。" alone; the break callout's key sentence is ~11px type (065 096 097: cap 8px) —
    under the 12.5px reading floor.
E57 Deposit-paused notice (093–095): content 32 above / 38 below (48/53 at 1280); its text held to ~234px inside a 575px
    card at 1280, a line opening on "——"; it says withdrawals still work but gives no way to them (an existing
    "Toa pesa" link?).
E58 LOGIC (break): the Wallet sheet drops Weka pesa without saying why (080 083 086) — the break's own sentence there;
    the hub's "Pumzika / 休息一下" row is offered during an active break with no status (092).
E59 → R4-H: the Wallet's eye (mask) button sits 2–3px off the balance figure's centre (080 083 086).
DOUBT: the times say no "EAT" (the expect asked); the refusal not announced (no alert in the live probe — role).
S12: "1.00× 倍信念" (× and 倍 together), "报价保留 10s" (English unit).
