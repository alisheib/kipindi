# Round 6 — what rounds 4 (late), 5 and 6 fixed, and what each fix must look like now

These tiles were taken on the branch at commit 4b754b89 (tiles-r6b2, folder S\visual\tiles-r6b2), after every fix since
round 5's tiles (tiles-r5, 88ee1a42); the diff overlays compare r6 against r5. For EACH fix your tiles show: VERIFIED
(with the measurement) or NOT FIXED / FIXED WRONG (with the measurement). Earlier rounds' fixes (read-brief-r3-fixes.md,
read-brief-r4-fixes.md, read-brief-r5-fixes.md) still hold — a regression of one of them is a finding too; what the r5
brief listed as fixed after its tiles (R4-G, R4-H, R4-I, R4-J, R4-K) is in these tiles and is read below. Every "after"
below was COMPUTED from code and fonts, never seen in a browser before these tiles: read them hard, and measure. The
branch also merged main (up to e7a979c6): a changed region that no fix below explains is judged like any other region.
A bullet or clause marked "Journey" holds for journey tiles only; everything else holds in both shells (page bodies are
shared). Owner items are numbered as in owner-items.md.

## Rules every tile now follows (R5-C; R5-I; R5-E; R5-J; R4-K; R5-A · F5/F20)
- Gold is money earned: a payout, a celebration, the resolved seal, WIN, a granted bonus, commission above 0 — and the
  bet / sell commits, the live balance and the gold deposit pill (D1). Gold on anything else in a page body is a
  finding; allowed by rule: the resolved seal, the probability bar's gilt needle, an empty state's one gold accent, WIN.
- A highlight that is not money is brand blue (the active pill's, focus ring's and links' family): unread dots, current
  steps, rings, carousel pips and arrows, toggles, the navigation progress glow, the language loader, Create / Confirm
  buttons. PageHeader / PageHero eyebrows in the eyebrow ink and their rules a plain border line; callouts that were
  gold are info (royal).
- Identity (tier, rank, streak, achievement, coin, podium) is metal (--metal-gold, duller), never the balance's gold.
- State inks: success green (2FA on, attestation seals, the paid-out tick, "No fee", an uploaded slot); danger red (a
  failure, Sign out, clear photo, dismiss a notice, an error at its field — the dial's chips, Up & Down's custom amount,
  proposals/new, the password pair); royal (info, pending, in review); slate (reversed, cancelled, held, expired). The
  betting YES / NO (UP / DOWN) pair only for a bet's two sides, a price, an outcome, a position's side.
- A refusal the player can fix, or a plain fact, is a calm toast that stays until read (not red, not gold); a hard
  block or a fault is red, with the pop-up.
- Figures whole and mono: never "TZS" / "1,000" on two lines, never a figure torn from its unit or range ("200毫米",
  "15万美元", "8月1日", "2026-27赛季", "dakika 28:00", "$5.5 bilioni", "TZS 1 bilioni"); "TZS −4,200", "−TZS 1,234",
  "+TZS 1,234" one run each; every amount in a toast in mono.
- Counts: one grouping in sw, en and zh ("12,479") with the dictionary's lower-case word after it ("2 watabiri");
  identical below 1,000; from 1,000 a comma appears (+6.6px per pill at 11px mono); the share card says "1 predictor".
- Titles (cards, board rows, the /live carousel, /results' notable, /proposals, /fairness, the classic position card,
  the bet dialog) balanced with figures whole: no short last line where two even lines fit.
- zh centred lines ending in "。" or "？" (empty states, the side picker's question, the not-found hint) centred on their
  ink (≤0.2px; r5: 4–4.5px left of centre).
- Empty-state sentences break exactly where they broke in r5 (R5-E changed how runs are held, not where lines break);
  the search echo, time select, trust band and analytics choice are pixel-identical to r5.
- Every close ✕ is the kit's one ✕: centred on its title's first-line capitals (within ~0.5px), its box 16px inside the
  panel's right edge.
- No tile is in a hover state (the harness parks the pointer and waits): a hover box or a second underline beside the
  active tab is a capture defect — report it as one.

## Home: hero, featured card, board rows (R5-A · F2/F18/F19; R5-E · F1/F4/H1; R4-H; R5-B; R5-I; R6-C · C16)
- 1024 / 1150 / 1280, sw / en / zh, both shells: the featured card's top border on the same pixel row as the first ink
  row of the hero's 13px mono claim (its capitals' top; zh: its ideographs' top, one row higher). r5 ranged from 2px
  over to 66px under (y191–259 over 48 tiles). Below 1024 nothing moved (the blocks stack).
- The featured title balanced: zh 320 "达累斯萨拉姆七月 / 降雨超过200毫米" (超过 whole — never "…降雨超 / 过200毫米"); en
  "Dar es Salaam rainfall / exceeds 200mm in July" (never "…exceeds 200mm / in July"). Board rows the same way.
- Figure runs: "超过15万美元？" keeps "15万美元" whole; "7月降雨量" glues "7月", never "7月降"; "TZS 4,200以上" keeps
  "TZS 4,200" whole; a month stays only with its day.
- Board rows' meta line: no line ends on "·".
- Trust row: the regulator's name on one line where the line can hold it — sw 360–390 "Bodi ya Michezo ya Kubahatisha
  Tanzania", en 320 "Gaming Board of Tanzania" (the break falls before the name); narrower lines wrap as before, nothing
  overflows.
- Right-aligned tracked labels end on their column's edge (within ~0.5px): the price caption "NDIO" at the figure's
  edge (x357; r5 x355), the card's one-sided move label, the probability bar's right label.
- Board cards: the signal pill the same height and type size as the status pill (one pill size per card).
- TZS 0: the lead keeps "pesa ya simu" / "mobile money" on one line.
- Journey, signed in: the link to /positions reads "Tiketi zangu"; the capsule's ±delta (when shown) in the plain text
  ink, not YES / NO green or rose.
- Inks: the landing's eyebrow tick brand; the hero hairline and the closing-soon pill neutral; CLOSED words in the royal
  word ink; the probability bar's needle gilt (allowed).

## /markets: bar and cards (R5-A · F15 and checks; R4-H · E30)
- Search box → pills 34px at every width (r5: 31 on phones, 35 on desktop); its loading drawing the same.
- Pool chips in the mono money face with a capital K — "TZS 10K+", "TZS 50K+" — never the sans "TZS 10k+".
- Known: the cards' two-line title clamp with "…" (E30); the grid card's pool figure without a visible word (owner 33).

## Market page (R4-K; R4-I; R5-C; R5-E; R6-C · pair gap)
- zh 768 and every width: the h1 keeps 8px of air from the category watermark (r5: 22px over it at zh 768); its first
  capital still on the page edge (R4-D: x16 at 390, x132 at 1280).
- The clock's label ("UCHAGUZI UNAFUNGWA BAADA YA" / "MATOKEO BAADA YA") in the subtle label ink, like the stat labels —
  not gold; the zh guest eyebrow "登录以预测" subtle, not gold.
- The resolution-date stat's label reads "INATATULIWA" / "RESOLVES" / "结算于" (r5: "INAISHA").
- The YES and NO buttons 12px apart (r5: 10).
- The title balanced, figures whole (a very wide figure at 320 may reach the watermark: owner 38).
- The resolution panel: heading and evidence glyphs subtle, its quote rule in the page's border colour, the seal gilt.
  Comments: "hidden" neutral; the report toast calm.
- During a break or an exclusion the bet column holds the break notice, not the picker (Responsible gambling, below).
- Known: "Nafasi zako" / "Your positions" on this page (S12).

## The old dial and its confirm — classic players (R4-I; R5-I · I-2; R5-J · G-6; R5-C)
- The scale's figures 10px at 6.67:1, a figure only where it clears the thumb; the caption on its own lines; at 1280 the
  pill never covers "UAMUZI WAKO"; the range connectors neutral; the two out-of-range chips' errors in danger red.
- The confirm never taller than the screen minus 40px: the clock, Confirm, Ghairi and the footnote all on screen;
  "Possible winnings" in mono; the Multiplier label centred; "YOU ARE PICKING" on one line; no one-word last line.
- Its receipt figure mono and whole: "HAPANA · TZS 1,000,000" wraps with the figure whole.
- A fixable refusal (a short balance, a plain fact): a calm toast that stays — never the ✗ pop-up, never gold; the
  short-balance line is Up & Down's faint 13px info line (words unchanged). A hard block: red with the pop-up (Retry
  where the outcome is unknown); the refusal states its reason, without a repeated eyebrow.
- Known: the thumb's text under the reading floor (owner 23); the session-limit refusal a calm sticky message (owner 50).

## Up & Down: board, round page, history (R5-A; R6-B · B-2; R6-C · C7/C8/C11/C14; R5-I; R5-G; R5-E; R4-H)
- No price feed: within 12s the chart reads "Chati haipatikani — inajaribu tena" / "Chart unavailable — retrying" /
  "图表暂不可用——正在重试", never "Inapakia…" for ever; a verified empty answer reads "Hakuna bei zilizothibitishwa
  katika kipindi hiki" / "No confirmed price reads in this window" / "此时间段内暂无已确认价格"; a drawn chart is never
  replaced by either. A stale line in danger red.
- The invalid-stake line (card and round panel): its words wrap inside the box — at sw 320 nothing past the 256px box
  (r5: ≈348px on one line); only the range is a mono amount, whole.
- 320: the board and history grids inside the screen (no card cut at the right edge).
- The round labels (right-aligned, tracked) end on their edge (~1.4px nearer than r5); the live note too.
- The quote stamp ("Imenukuliwa 04:01:21 EAT") one unbroken run; the "placed" pulse success green on either side; the
  custom amount's error at its field in danger red.
- Round page: heading and evidence glyphs subtle, the seal gilt. Journey: its door to the tickets says "Tiketi zangu".
- Journey /updown: the history pill reads "Tiketi zangu" (the word from 640, icon only below) with the ticket glyph;
  classic keeps "Juu na Chini zako" with the portfolio glyph.
- /updown/history: the search band's gaps 34 · 34 · 34; the net figure gilt above 0, rose below 0, text ink at 0.

## /live (R4-H; R5-A · F17; R5-E; R5-C)
- The search band's gaps 34 · 34; the eyebrow "MUBASHARA" (page and loading drawing).
- zh titles wrap inside their cards (never a whole title held on one unbreakable line); figures whole; carousel titles
  balanced; carousel pips and arrows brand.
- Known: "Juu au Chini" here (owner 73).

## /results and /leaderboard (R5-A · F12/§A5; R5-C; R5-E; R5-J; R5-I; R6-A · A3)
- /results: the count line "2 watabiri" (never "2 Watabiri"); counts grouped from 1,000 ("Zote 12,479", "12,479
  imetatuliwa" — never "Zote 12479").
- The notable card: crown and "MATOKEO MASHUHURI" in brand on a royal edge (r5: gold); the page glyph subtle; the
  resolved pill keeps its gold seal (allowed); its title balanced, figures whole.
- The spotlight flag in brand ink, ending on its column's edge.
- An empty archive: no search band and no filter bar.
- /leaderboard: its count label lower case; the rate of return in the text ink with its sign (not green, red or gold);
  the podium's #1 and the hot-streak chip metal; an empty board during a break without "Place a prediction to get on
  the board".

## Wallet, the Wallet sheet and the money pages (R5-B · F3/F7/F11/F13/F14; R4-H; R5-G · G-1; R5-C; R5-I; R6-C)
Journey Wallet sheet (phones) and popover (1280):
- The hairline over the bottom row: 16px of air above it and 16px down to the Funga / Close button's border, in every
  state (normal, held, break); r5: 16–18 | 8.
- 320: the doors pad 12px, the ⊕ glyph full size (r5: crushed to ~4px), each caption keeps its last two words ("Mobile
  money / or card").
- Docked at a phone's bottom: no border line or edge light along the screen's last rows (r5: y778 / y779); the box runs
  1px past the screen; nothing else moved.
/wallet:
- Journey: the page's header buttons, the balance card and both empty-state doors read "Weka pesa" / "Toa pesa"
  ("Deposit" / "Withdraw", 充值 / 提现), never "Amana" / "Toa"; the sw pair on one row at 320. Classic keeps its words.
- Journey section rail: the first label and its underline on the column edge (x16 at 390, x132 at 1280), each underline
  exactly its label's width.
- 1280: "Risiti zote" 42px under the bar and 42px over the list (r5: 59 / 49); the list 24px higher than r5.
- The count line ("Miamala 19") 12px under the chips and 12px over what follows (r5: 8) — /wallet and /wallet/receipts.
- The balance eyebrow subtle; the dormant bonus card neutral with a brand progress bar; the dormant cashback tag neutral
  and its button primary; the history row on the Receipts row's plates; history status labels ending on their edge;
  when payout is unavailable, the payout notice's edge in the danger border of the failure box above it.
- Bonus (grant) states on the standard 18px chip: queued and historic pending-KYC royal, unlocked green, expired /
  cancelled / forfeited slate (r5: 8px hand-made gold pills).
Deposit, withdraw, receipts:
- Journey deposit: the eyebrow "POCHI" / "WALLET" / 钱包 over the h1 "Weka pesa" / "Deposit" / 充值, and the confirm
  dialog's send button "Weka pesa"; journey withdraw "POCHI / Toa pesa" ("WALLET / Withdraw", 钱包 / 提现); nothing
  moved vertically. Classic keeps "WEKA PESA / Amana" and "TOA / Toa fedha".
- The chosen method's check badge 4px into its corner: 7px clear of the logo at sw 320 (r5: 3).
- "Confirm deposit" / "Confirm withdrawal" primary (brand), not gold; "you receive" in the text ink; validation toasts
  calm.
- Withdraw: the balance label (right-aligned, tracked) ends on its edge.
- Deposit return: its two buttons 12px apart (r5: 10).
- Receipt ids break only between runs of four characters, a short tail joined to the run before, lines balanced —
  never 1–3 characters alone on a line.
- Known: "Thibitisha amana" (the submit and the dialog title) on the journey's "Weka pesa" screen (S12).

## Tiketi zangu, /positions, /positions/performance (R5-B · F6; R6-C · C11/C14/C17; R6-B · A6; R4-F; R4-H; R5-C; R5-E)
- Journey sub-tabs: the first label and its underline on the column edge — x16 at 390, x132 at 1280 (r5: x28 / x36 and
  x144 / x152); each underline exactly its label's width.
- Journey: doors one tap from Tiketi zangu use its words — the door after a bet, /positions/performance's back link,
  eyebrow and empty title, /help's card, the round page's door: "Tiketi zangu" (or its settled-empty title), never
  "nafasi" / "positions".
- Ticket cards keep figures whole ("2026-27赛季", "dakika 28:00").
- /positions/performance: an Up & Down row names its round as the round page's h1 ("Bitcoin Juu na Chini · 15 dakika"),
  not the stored English title; the best-market line's figures whole; status words end on their edge; the streak chain
  metal; the best-win crest gold only with a win.
- The classic position card and the win seal show the whole question (no clipped line).
- An unsettled position's exact "payout if win" in the text ink, not gold.
- Classic /positions empty state: every box 14px higher than main's, nothing moved sideways — named in the parity
  harness, not a finding.
- Known: "{n} positions" on the performance bar (S12).

## Hub, avatar menu, profile, KYC, invite, agent (R4-H; R5-A · F17; R5-G; R6-C · C1/C13; R5-C; R5-I; R4-I)
Names (journey hub, avatar menu and footer; /profile's rows in both shells):
- The identity door reads "Uthibitisho wa kitambulisho" / "Identity verification" / 身份验证 (the page's tab and
  eyebrow; R5-A's "Thibitisha kitambulisho" is superseded) — and a verified player sees NO identity door.
- The invite page has one name on the hub row, the journey menu and footer, the page's h1 and hero line and /profile's
  row: an approved agent "Agent dashboard" / "Dashibodi ya wakala" / 代理面板; while invites pay "Alika na upate
  zawadi" / "Invite & Earn" / 邀请赚钱; otherwise "Alika marafiki" / "Invite friends" / 邀请朋友.
- Leaderboard "Bingwa"; proposals "Mapendekezo ya Masoko" (no "Pendekeza na upate zawadi" on a journey door); privacy
  "Sera ya faragha"; help "Msaada" / "Help" / 帮助 (/profile's help row in both shells; r5 "Help & support" / 帮助与支持).
  RG doors name an action (by design).
- Journey back links on notifications, invite, agent dashboard, KYC and limits: "‹ AKAUNTI" (the Akaunti tab's word).
Journey avatar menu:
- The Needle row on the menu row's geometry: inset 16, glyph → label 10, chevron at the row's edge.
- /positions as "Tiketi zangu" with the ticket glyph; the phone "+255••••84" (never "+255*****84"); the invite and
  proposals rows in the row family's ink (no gold, no sparkle).
Profile and account:
- A 40-character name: the hero never scrolled sideways ("TZS 50,000" whole, never "ZS 50,000"); the name wraps in its
  column, balanced, never one character alone; the hub's 40-character CJK name 10·10·10·10, never 13·13·13·1. A saved
  name reads exactly as typed (no lost first letters).
- /profile/account: the phone "+255••••84" (both shells); the search band's gaps 26 · 26 · 26.
- /profile's hero and its open count in the info tone; Sign out on /profile and /profile/sessions in danger red;
  /profile/activity's Won / Net labels one neutral ink.
- Badges: ring brand, count ("5/20") brand, coin metal. The KYC stepper's current step brand (r5: gold "NIDA").
- Password: key and eyebrow subtle, Save the kit's primary + ghost pair; 2FA on in success green.
- Source of funds: "under review" royal; the banner royal while under review, amber only for "resubmit".
- Upload, consent and install glyphs brand; the account's COOLED_OFF chip neutral.
Journey hub:
- The guest hub's "Matokeo" row wears /results' own glyph (not the "Uthibitisho wa utatuzi" glyph); during a break the
  Pumzika row shows its status; INAKUJA tags neutral.
Agent and invite pages:
- /agent: its three facts one tile treatment; the fee box ("GHARAMA TZS 100,000") in the text ink; step 5 a royal disc;
  notices neutral except "an officer asked for one more thing" (amber); /agent/apply and /agent/status without gold;
  dashboard figures gold only when commission > 0; the Lipa panel's number and fee not gold; share buttons primary; an
  uploaded application slot green. Journey: the top-up door "Weka pesa".
- /profile/invite: share buttons primary; the Earned figure and dial gold only once earned; a paying friend's chip green.
- Journey onboarding primer: no gilt corners; progress strip, step bars and pager dot brand; eyebrow subtle; "drag" and
  "share" brand.

## /proposals, /fairness, /help (R5-C; R5-E; R6-C · C14)
- /proposals: eyebrow subtle, hero info, the coming-soon box royal, Create primary; list and page titles balanced,
  figures whole; the proposal page's "view resolved market" a ghost button.
- /fairness: the step numerals in the list's ink, not gold, at R4-E's place (numerals x165–166, words x189 at 1280);
  step 4 a brand ring; titles balanced.
- Journey /help: the tickets card says "Tiketi zangu". Known: zh help's 持仓中 line (S12).

## Notifications and the bell (R5-B · F8/F9/F10/§A5; R5-C; R5-I; R5-J; R6-B · A5/A7; R6-C · C10; R4-I; R6-A · A1)
- An empty inbox: no search box and no filter bar; any notice (cleared ones too) brings both back.
- Dates in the reader's language: sw "Malipo kuanzia 9 Okt, 11:53", zh "2026年10月9日 11:53" — never "9 Oct 2026" in a sw
  or zh notice (verdict and revoked-agent notices).
- A cut title ends on a whole word with "…" (zh: never inside a Latin word or a figure); a win notice's quoted title is
  cut the same way.
- Free text as written: "range 1..2" stays "1..2" (only the old template's ".." is mended).
- The page's unread dot brand (as the rail's), not gold.
- Journey bell: no drop shadow under the badge — the dome's right shoulder reads as its mirror (r5: ~425 against 475,
  R+G+B; tile 225, x1175 y23); the count badge a brand pip (fill brand-600) with pearl digits, not rose — the journey's
  Arifa count too; the dot and wash brand; the count grouped from 1,000.
- Journey bell list: a title whole (no line ends on "·", figures whole and mono); a body with its figures whole and no
  one-word last line.
- RG notices: the end in the reader's words as one run ("hadi 10 Okt, 05:05"); a permanent exclusion's notice without a
  date (no "until 2126").
- The classic bell is main's (rose badge with glow and drop, ungrouped count).

## Dialogs, sheets, overlays, close ✕ and toasts (R5-A · F20; R6-C · C2/C9/C11/C12; R4-I; R5-I; R5-J · G-6; R4-H; R4-J · E40)
- ✕ on its title's first-line capitals (within ~0.5px), its box 16px inside the panel's right edge: the channels panel
  (r5: 1.70px low; now ≈0.1), how-it-works, share, objection, ConfirmModal (the title's capitals, no longer the
  medallion's centre), the sell confirm (a header-row ✕), the bet confirm (cap band 28 vs 27.94px, 16px in), the filter
  sheet (16px in — 12px further in than r5), the install card, the reality check (no word changed), toasts, the Needle
  drawer and the chat (the kit ✕ now).
- Crest-first dialogs (a result, the win celebration) keep the corner ✕ — the one exception.
- A dialog mid-request: its corner ✕ not drawn; a header-row ✕ invisible with its box kept — no row changes height.
- Bet confirm at 320–412, sw / en: the stake never splits "TZS" / "1,000" (r5: 28 of 64 cases); when it does not fit
  beside the side word it sits under it, right-aligned, mono.
- Bet and sell confirms: right-aligned tracked labels end on their edge (~1.4px nearer than r5); the bet dialog's title
  balanced, figures whole. The objection counter reads "0/1,000".
- Result dialogs (bet, Up & Down receipt and refusal, deposit, withdraw, sale): the success / failure circle and the
  detail rows in success / danger, not YES / NO; the failure's main button primary, not the NO rose; a placed bet's
  strip keeps its side colour.
- Result figures whole and mono in title, subtitle and footnote: "TZS 1.2M" (never "TZS 1" + ".2M"), "TZS 2.5",
  "+TZS 1,234" (the "+" in the run).
- The wallet result: pending / in review royal; reversed, cancelled, held slate; failed danger.
- The sell confirm's free window and "No fee" in success green.
- Toasts: every amount mono; calm for anything the player can fix. Journey: toasts hang under the header — top at 72px
  on phones, 64 from 640.
- Journey docked sheets (Wallet, guest, primer, reality check, filter, Needle drawer, chat): no border or edge light
  along the screen's last rows.
- The Needle at rest at least 14px clear of a caption.

## Loading ghosts and the route entrance (R4-J; R5-D; R5-H; R5-K; R5-L; the state titles; the route entrance)
If a tile is a loading (mid-load) capture:
- Journey chrome in the first paint: header (mark, capsule, pill, bell, avatar) and tabs whole — never a one-colour band
  (r5 edges: rgb 5,2,79) or a missing rail. The capsule may show its mask in the figure's box width; the bell's slot
  holds a still bell (no count yet).
- The page's own drawing inside the page's column (1280: x132–1147, never the old x32–1247 box): its bands in the page's
  order; words set but not shown — a rounded overlay bar on each line the words take, the letters transparent; figures
  as shapes (zeros); kit parts at the page's sizes. Words a drawing shows are the page's own, in the tile's language.
- When the page lands, its bands land where the drawing put them (0px for the case drawn). A gap made by data the
  drawing cannot know is owner 79 (QA's small board lands /results 106–162px and /live phones 24–56px higher).
- Journey first loads: "/" the hero's intro (the card on the claim's capitals from 1024); Tiketi zangu its tickets
  drawing (the rail on the column edge, pills 18px); /account the hub column; /updown, /updown/history,
  /wallet/deposit and its return, /markets/<id> their own drawings; any other page a frameless spinner.
- Page drawings (both shells):
  - /wallet and /wallet/receipts: one bar drawing (kit pills; its groups wrap at 1024 / 1280 in sw and en as the page's
    do), the count line 12 | 12, receipt rows 79px; the list where the page's lands (r5: 133px low on a phone, up to
    216 at lg in sw; receipts 56 low on desktop).
  - /wallet/receipt/[id]: back link, head, status chip, details at a 51px row pitch, both buttons, footnote (r5: buttons
    251.5–341.5px off).
  - /wallet/deposit: back link, the journey's head for a journey reader, 106.25px method tiles (r5: 86), quick-amount
    pills, the phone hint and the trust strip in the page's order; its confirm brand, not gold.
  - /wallet/deposit/return: hero, six receipt rows, two buttons 12px apart, footnote — nothing about the outcome (no
    success / failure colour or word).
  - /wallet/withdraw: the hero with the balance block's box and the form (rails, amount, destination, both notices,
    confirm) — never a 138px spinner panel.
  - /profile: an 80px avatar, the name bar, pills, three stats, the achievements shelf, 12 rows in the page's order,
    sign-out; 16px grid gaps.
  - /positions (classic): the head's button box, the P&L strip, 14px exposure keys, the bar.
  - /positions/performance: back link, eyebrow (journey: Tiketi zangu's words), the net P&L panel, the chart at 3:1,
    the best-win and streak cards, stake tiles, five rows.
  - /results: the carousel at its real height (r5: 67.5–117.5px too tall), 24px to the grid, row 2 on the bar kit
    (four lines at 1024), titles at the board's line count.
  - /markets: search → pills 34px, row 2 on two lines, the count line 17.25px.
  - /live: the search band, "MUBASHARA", the hero's call-to-action row fitting its width (r5: a 150px box that held one
    line only from 392px), pulse cards at each language's height.
  - /leaderboard: ribbon, lens, sort, podium, the table's head and twelve rows — no spinner.
  - /agent: 120.75px stat tiles (r5: 96), its panels at their sizes, a 647px waterfall (r5: 326), a 48px button;
    /agent/apply, /agent/status and /agent/invite/[token] their own bands.
  - /updown: the real header and tagline, one 48px phone trigger, 44px durations, the board band, the price tape;
    /updown/[roundId] two columns from lg, the action panel first; /markets/[id] its header bands; /updown/history
    its search band, bar and 89.5px tiles (its bar at lg: see the last section).
  - The back link's 44px box first on deposit, withdraw, performance, round, question, history, agent/apply,
    agent/status and the receipt; none on the agent invite.
  - Every other page (the sixteen generic loaders): the page's own opening band with its heading words shown (the back
    link's box, the PageHeader inside the PageHero, the hero's sentence) in the page's rhythm, then the spinner where
    the data begins — never a spinner first (r5: a 257px spinner first on 16 routes); /proposals/[id] keeps its
    spinner first.
  - /profile/kyc and /profile/invite: the title a word bar — no legible "Verify your identity" / "Invite friends" (a
    state the drawing cannot know); the KYC eyebrow shown.
- The navigation progress bar's glow brand, not gold.
- Classic: the root loading box is main's (no journey drawing); the page drawings above serve both shells; on a
  document load /results and /markets draw their bar while the board streams in.
Route entrance:
- A journey tap frame never shows the chrome doubled or dimmed, nor two tabs lit; the tab pip and the nav underline
  snap. No blink (never full opacity, then transparent) and no replay at hydration; a page scrolled before hydration
  keeps its place (/legal/privacy at §5 stays at §5). Classic keeps its cross-fade.

## Offline and not-found (R4-G; R5-G · G-5; R4-K; R4-J; R5-D · F5)
The /offline page (one look for both shells):
- No person on it: no header, capsule, balance, name, initials, avatar, gold pill or staff strip, no tabs.
- The mark, the wifi-off disc, the backdrop, a pill "Try again" button, 16px gutters; the system font (owner 15).
- In the tile's language: "Hauko mtandaoni" / "You’re offline" / "您已离线", "Baadhi ya vipengele huenda visifanye kazi"
  / "Some features may not work" / "部分功能可能无法使用", "Jaribu tena" / "Try again" / "再试一次", and the footer's 18+,
  licence and stop lines — an en or zh tile never in Swahili.
- The regulator's name whole wherever the line can hold it.
The offline notice (a page open when the network drops; both shells):
- A warning bar in the page's flow under the header, first of the notices — the mark, capsule and pill fully visible
  above it (r5: a strip over the 56px header); online, nothing.
Not-found (/, /markets/<id>, /updown/<round>, /proposals/<id>):
- One view: three doors "Mwanzo · Masoko · Msaada" / "Home · Markets · Help" / "首页 · 市场 · 帮助", one brand-300 link,
  no gold anywhere (no gold "404", no gold link); the proposal one also keeps its own way back.
- Heading and hint balanced: in sw, where it wraps, "Hatukupata / ukurasa huo"; the zh hint two lines at 320–1280, no
  word split, its line-end mark centred on its ink.
- Phones: 16px from the edge (r5: 24); 1280: the wave's edges fade over 64px (no hard 640px box).
- Journey: no tab lit (not Maswali, not Juu-Chini) from the first paint, under a loading file too; the Needle, the chat
  bubble and the channels panel as on any page; no dot on Akaunti and no bell badge (the live bell is not mounted
  there).

## Legal pages and the footer (R5-A · F16/F18; R4-F; R5-C; R5-G · G-5; R5-I)
- No legal title line ends on a connective (sw ya / za / wa / la / cha / vya / kwa / na, en of / and / &): "Kanuni /
  za Michezo", "Terms / of Service", "Sera / ya Faragha" where they wrap (320–412); no name split.
- The legal header's corners claret, not gold (the RG links' gold: owner 31; the claret rule's gold midpoint: owner 30).
- Journey footer: at en 1024 "Licensed by the / Gaming Board of Tanzania." (r5: "…the Gaming / Board of Tanzania.");
  the proposals link balanced (no COMING SOON pill alone on a line), the pill neutral; its doors named as the pages
  name themselves.
- Classic footer: main's, byte for byte (its pill alone at 768 / 1024: owner 13).
- The error page: "Try again" primary, the RG link brand, the error box and the "CRITICAL ERROR" eyebrow in danger red,
  the mark's needle gilt; the regulator's name whole. The marketing stop page (/s): its footer keeps the regulator's
  name whole.

## Responsible gambling: break, exclusion, RG page, sign-in (R4-I; R6-A · A1/A2/A3; R6-C · C4; R5-C; R5-I)
Ends:
- Every end shows date AND time in the tile's language as one unbroken run inside its approved sentence: "hadi 10 Okt,
  05:05" / "until 10 Oct, 05:05" / "至 2026年10月10日 05:05" — the exclusion panel, the sign-in refusal, the cooled
  sign-in panel, the RG confirm (which names the length picked), the Wallet sheet, the bell's notices, the bet-column
  notice. Never a raw day ("hadi 2026-10-10", or "2026- / 10-10" split), never an English month in sw / zh ("hadi 9
  Oct 2026, 06:02"). No "EAT" label on these ends (owner 22).
During a break or an exclusion, signed in — nothing invites a bet or a deposit; the break's own notice stands there:
- Market page: the bet column holds the break notice — the kit callout, neutral grey, lock glyph, 13px, the full
  approved sentence with its end whole ("Mapumziko yanaendelea hadi …" / "A break is active until …" / "休息期至 …
  结束。…"; exclusion "Umejizuia hadi …" / "You are self-excluded until …" / "您已自我排除至 …") — and NO YES / NO
  picker, stake or confirm; the column heading and the one-sided note stay; "place another" is hidden. The break
  sentence also stands under "Nafasi zako" (twice on a market with no position: owner 66).
- Up & Down: each board card holds that notice instead of its one-tap stakes; the round page's panel instead of its
  stake card, its section label kept.
- Home: the lead and the add-funds prompt give way to the break notice.
- Tiketi zangu: the break sentence without "Tazama maswali"; its Juu/Chini tab and /positions/performance: the break
  sentence, no "place your first…", no bet button; an empty leaderboard without "Place a prediction to get on the
  board"; /profile/activity without a first-bet invitation; classic /positions without Browse.
- Journey Wallet sheet: no Deposit door; "Kuweka pesa kumesitishwa" / "Deposits paused" / "充值已暂停" over the break
  sentence with its end; "Toa pesa" stays, alone at full width (R3).
- /wallet/deposit: the deposit-paused notice, its content centred with 32 / 32 above and below on phones and 48 / 48
  from 640, the text full width, neutral (not gold, not amber); a cooling-off adds a Withdraw door ("Toa pesa" in the
  journey, "Toa" in classic).
- Journey hub: the Pumzika row shows its status.
- Still shown by the owner's call (do not report): the generic product lines (tagline, trust line, "Kuwa wa kwanza
  kutabiri") — owner 16; the invite and proposals doors — owner 56; classic chrome's deposit doors — owners 4 / 57.
Self-exclusion and sign-in:
- Signing up again with the same phone (+255… or 07…) or email (any case) is refused as "account already exists —
  sign in"; signing in lands on the exclusion panel with its end.
- The sign-in break notice neutral; the exclusion panels danger red.
- A permanent exclusion names no date (the bell's notice: no "until 2126").
- Auth pages: eyebrows and buttons brand (not gold), an eyebrow beside a success / danger icon in that icon's ink; bonus
  cards gold only on the money figure; the forgot-password link 13px with a 40px tap area, the form no taller; the zh
  exclusion icon on the title's ink line; no one-word last line; from 1024 the brand panel's edge at x32 (the header's
  edge), no wordmark in it from 1280; the OTP page's phone "+255••••84"; reset-password's and verify-email's two
  buttons 12px apart (r5: 10).
The RG page:
- The two limit forms line up: one field width and one button width at the same x (the other form's label space kept);
  the callout 13px (r5: 11); zh "提现。" never split ("现。" never alone on a line).
- Hero in the info tone; the pending-increase box the kit callout (neutral, clock glyph, 13px, words unchanged); the
  reality check without gold; the COOLED_OFF chip neutral.
- Report a missing notice, a wrong or missing end, or any bet / deposit invitation during a break; never report an RG
  sentence, notice, helpline or limit control as one to cut or reword.

## Classic shell — chrome frozen to main, bodies shared (R4-F; R4-J; every round's classic line)
- A classic tile's CHROME — the header and its nav, the More rail, the footer, the bell, the avatar menu, the capsule,
  the ticker, the language tick, the root loading box and the navigation cross-fade — must be byte-for-byte main's: any
  change there IS a finding (red in a classic chrome region of the overlay: name it; the integrator checks it against
  main e7a979c6).
- Main's chrome keeps (owner, do not report): the footer's pill alone at 768 / 1024 (13); the bell's rose badge over
  its dome at phones, 2.64:1, its glow and drop, its ungrouped count (12, 42, 63); the capsule's figure without "TZS"
  below 640 and its ±delta in YES / NO colours (2, 43); gold on the "• Juu na Chini" dots, the bell, the language tick,
  the avatar-menu rows, the ticker separator and the header's INAKUJA tag (29); the avatar menu as main draws it, with
  "Invite & Earn" for agents and "Verify ID" for verified readers, and "Alika marafiki" in the top bar, More rail and
  footer for agents and paid players (75); the deposit doors during a break (4, 57).
- Classic BODIES follow every bullet above not marked "Journey": a classic page body that kept r5's look where such a
  fix applies is NOT FIXED.
- Classic keeps its words where the journey renamed: "WEKA PESA / Amana", "TOA / Toa fedha", /wallet's "Amana" /
  "Toa", the /updown pill "Juu na Chini zako" with the portfolio glyph.
- Classic /positions: its empty state 14px higher than main's (named in the parity harness, not a finding); no Browse
  during a break.

## Known and by design (do not report)
- Everything under "Known and by design" in read-brief-r2.md, read-brief-r4-fixes.md and the r5 brief, and every item
  in owner-items.md, still holds: note an owner item when a tile shows one, never as new.
- (R4-F · owner 13) The classic footer's COMING SOON pill alone on its line at 768 / 1024.
- (R4-G · owner 15) /offline in the system font.
- (R4-K) Not-found pages answer HTTP 200 with a streamed noindex (framework); their console 404 is a server action's POST.
- (R4-K · E45, open) The zh empty-state title in SimSun with synthetic bold (font probe pending): seen, not new.
- (R4-H · E30) /markets cards clamp titles to two lines with "…"; the cards do not read S2's short titles (owner).
- (R4-J · E39) The browser tab's title blank between navigations (framework).
- (R4-J) A blank frame inside the classic cross-fade is a capture artifact (r4 tile 328).
- (R4-I · owner 21) A new phone + email can open a fresh account after a self-exclusion.
- (R4-I · owner 16) Generic product lines stay during a break (tagline, trust line, "Kuwa wa kwanza kutabiri").
- (R4-I · owner 22) Break and exclusion ends carry no "EAT" label.
- (R5-B · judged, owner 25) The journey header's focus rings end 2px from the next control at 390.
- (R5-B · judged, owner 26) zh text in boxes sits ~1.5px high (17 | 20 against Latin's 19 | 18).
- (R5-B) Notices stored before the fix keep their text; "Dev fixture —" notices are English fixture data.
- (R5-B) A band with its own padding may differ from the sheets' 16 | 16 foot.
- (R5-C · allowed) The resolved seal, the probability bar's gilt needle, an empty state's one gold accent, WIN pills.
- (R5-C · owner 28) Warnings paint in the money gold (the offline notice, a refused sign-in, a hold, "one more thing").
- (R5-C · owner 29) Classic chrome's gold: header / rail dots, bell, language tick, avatar menu, ticker dot, INAKUJA.
- (R5-C · owner 30) The claret rule's gold midpoint.
- (R5-C · owner 31) The legal pages' RG links in gold.
- (R5-C · owner 32) Landing totals in gold; §C7's accent; the crest's chroma; §C5's flames (hot chip, streak chain).
- (R5-E · owner 38) Very wide figures in a market h1 at 320 kept whole (a "?" may reach the watermark).
- (R5-E · owner 39) Chinese words still cut under balance at 320 (fewer, not zero).
- (R5-E · owner 40) Mono amounts in every toast.
- (R5-E · owner 41) A month and its year may wrap apart ("December" / "2026").
- (R5-A · owner 33) The grid card's pool figure has no visible word.
- (R5-A · owner 34) ConfirmModal's ✕ on the title's capitals.
- (R5-A · owner 35) The journey's proposals doors without "earn".
- (R5-A · owner 36) sw "Bingwa" (the page) against "Jedwali la Washindi" (classic nav).
- (R5-A · owner 37) The legal titles' connective rule itself.
- (R5-A · S12) The rules page's name on its hub row and footer link ("RTP ya mchezo na sheria").
- (R5-A · S12) sw AML and limits doors ("Sera ya AML / KYC", "Weka mipaka") against their pages' titles.
- (R5-A · S12) sw "hai" in count lines ("40 hai") against "Mubashara".
- (R5-A · S12) The zh regulator's two names.
- (R5-A · S12) sw `proposals.earned` reads "umepataa".
- (R5-A) RG doors name an action, not their page.
- (R5-I · owner 42) The classic bell's rose badge (2.64:1) and its NO-rose "Clear all" hover.
- (R5-I · owner 43) The classic capsule's ±delta in YES / NO colours.
- (R5-I · owner 44) The board's "hot" chip in the NO rose.
- (R5-I · owner 45) The identity crest's YES / NO split.
- (R5-I · owner 46) Password, 2FA and email refusals stay red pop-ups.
- (R5-I · owner 47) An unlocked bonus in green, not gold.
- (R5-I · owner 48) A rejected source-of-funds declaration amber on /profile, red on its own page.
- (R5-I · owner 49) Payout credits in /wallet's history neutral.
- (R5-I · owner 50) The old dial's session-limit refusal a calm sticky message.
- (R5-I · owner 51) The leaderboard's rate of return neutral.
- (R5-I · S12) "Couldn't copy" has no next step.
- (R5-I · S12) The agent application's pop-up prints the server's English error.
- (R5-G · owner 52) Sign-up's two names ("Jisajili" against "Fungua akaunti").
- (R5-G · owner 53) Where "earn" may stand.
- (R5-G · owner 54) The licence line's wording differs by surface.
- (R5-G · owner 55) "Kuwa wakala" against "Kuwa Wakala wa 50pick".
- (R5-G · S12) "Thibitisha amana" on the journey's "Weka pesa" screen.
- (R5-G · S12) The push-settings page shares the inbox's name.
- (R5-G · S12) The auth shell's "GBT".
- (R5-G) Legal prose prints the regulator's name as published (it may split there).
- (R5-K · owner 59) The deposit return's drawing is shaped by the PAID outcome's hidden words.
- (R5-K · owner 60) /profile's drawing draws "unverified, no email".
- (R5-K · owner 61) The withdraw drawing draws the form for everyone (a KYC-gated reader sees it swap).
- (R5-J · owner 62) The filter sheet's topic grid at sw 360 / 390 (a long topic with a 3–4 digit count overflows).
- (R5-J · owner 63) The classic bell's count ungrouped.
- (R5-J · owner 64) Kept refusal sentences draw their figures in the sentence face.
- (R5-J · owner 65) The objection counter re-wraps the hint while the player types.
- (R5-J · S12) "3 Hai" / "3 Open".
- (R5-J · S12) "W · L · C" in English in all three languages.
- (R5-J · S12) "{wins}/{decided} decided" in English.
- (R5-J · S12) No word with the Up & Down player count or the comment count.
- (R5-J · S12) Capitalised sw result phrases ("Miamala {n}", "Nafasi {n}", "Risiti {n}").
- (R5-J) Left bare by design: page-number buttons, "99+", ordinals, durations, the primer's multipliers, ghosts' "00",
  the chart's price readout.
- (R5-L · owner 79) Drawings draw a live product: on QA's small board /results lands 106–162px higher than drawn.
- (R6-B · owner 71) The sw selection-closed and cash-out notices name no market.
- (R6-B · owner 72) Notice quote lengths differ by family.
- (R6-B · owner 73) "Juu au Chini" on /live, /results, /fairness and new notices.
- (R6-B · owner 74) /live's hyphenated title parts.
- (R6-A · owner 66) The break sentence twice on a market page with no position.
- (R6-A · owner 67) A shorter break inside a longer one: its email's wording.
- (R6-A · owner 68) The exclusion email's "until" / "Unlocks".
- (R6-A · owner 69) No title on the bet-column notice.
- (R6-A · owner 70) "Sept" in email rows.
- (R6-A · S12) "for permanent" in the permanent-exclusion email.
- (R6-A · S12) The bell's permanent-exclusion wording.
- (R6-C · owner 53) "earn" on every invite door while invites pay.
- (R6-C · owner 75) Frozen classic chrome names the invite page differently and offers "Verify ID" to verified readers.
- (R6-C · owner 76) "‹ AKAUNTI" against a generic "‹ RUDI".
- (R6-C · owner 77) Identity doors in the tab's noun ("Uthibitisho wa kitambulisho").
- (R6-C · owner 78) Crest-first dialogs keep the corner ✕.
- (R6-C · S12) "Nafasi zako" / "Your positions" on the market and round pages.
- (R6-C · S12) "{n} positions" on the performance bar.
- (R6-C · S12) zh help's 持仓中 line.
- (R6-C · S12) The dial's unreachable fallback subtitle.

## Not visible on a tile (for the record)
- (118fc75c, hotfix) Every page address runs the proxy: a page at an image-like address carries the security headers.
- (R4-F) The parity harness names the classic /positions empty state's diffs (checks 4.2b, P.5p, P.6p).
- (R4-G) The worker fetches /offline without cookies and drops older caches; Retry and the `online` event reload the
  address asked for; offline at 1280 the nav takes its clicks.
- (R4-K) The not-found pages' <title> and noindex; their HTTP 200 (the framework's).
- (R4-H) The home's <title> ("50pick — Tabiri matukio. Si bahati." / "50pick — 预测事件，而非运气。"); the featured
  card's hover keeps its watermark down (tiles are never hovered).
- (R4-J) E39's title swap; a page's hydration waits for two small preloaded chunks; the drive waits for the Needle.
- (R4-I) The refusal is an alertdialog that takes focus; the cooled redirect carries &until=.
- (R5-F) qa:bar-geometry measures painted boxes and says NOT MEASURED on an empty book or a short page.
- (R5-D) A failed metadata read titles a record page with the board's name; a real market is never served as 404 on a
  database blip; the worker keeps only ok images and fonts (v6) and refreshes /offline in the background; no one-frame
  not-found state after leaving one; the ghosts and the not-found view ride as client code.
- (R5-B) The emails' dates and subject cuts.
- (R5-E) No helper glues across two spaces or splits a grapheme cluster; no invisible character in copied or searched
  text; the CJK gap is generated; the helpers run in linear time; keep-units.tsx deleted.
- (R5-A) The bet confirm's ✕ is announced "Funga"; admin dialogs' ✕ and Cancel are held mid-request; the grid card's
  pool figure is read out with a word.
- (fabf68dea) The colour gate judges /offline against its own tokens; implicit-submit's plants re-anchored.
- (R5-H) Loading drawings ride as client references (92,274 → 3,298 B over all player segments); the journey flag and
  the not-found mark change in a layout effect; a strip's fades are right on its first frame after a move.
- (R5-J) A German-locale phone reads "12,345" after hydration (never "12.345"); machine attributes stay bare integers;
  a census of private figure readers.
- (R5-L) The /results and /markets fallbacks' payloads (9,023 → 51 B; 13,079 → 19 B).
- (R6-B) Tab stays inside a busy dialog; the chart's polls run every 30s and never queue behind a hung request; linear
  helpers (0 differences); /profile's name cut decided on the server; the round page's <title> in the reader's words.
- (R6-A) The break and exclusion emails state the end in EAT, the permanent one no date; a failed lockout read fails
  open.
- (R6-C) The identity-door read rides the shell's existing batch; the gold census counts the warning family (no paint
  changed).
- (cb389b52f) The verdict fan-out awaits its notices (server timing).

## Fixed AFTER these tiles (branch vodacom-visual-history-bar; the next round shows them) — note, do not report as new
- /updown/history's loading drawing: from lg its row 2 was one line — a 180px sort box and a 104px Filters box — where
  the page wraps its sort and the asset, duration and day groups onto two lines in sw, en and zh, so the list landed
  56px lower than the drawing promised; row 1 drew four fixed pills (56 / 76 / 76 / 76) where the page has six lenses
  with counts and the count's phrase. Now on the bar kit (below lg the sort is the flexible cell; a 320 row stays one
  line).
- /positions' loading drawing: a hand-drawn sort — on a phone at its content's width, not filling its cell beside
  Filters, its value in the body face rather than the menu's 13px — and a typed 104px Filters box; the money books'
  drawing (/wallet, /wallet/receipts): the same typed 104px Filters box. Now the kit's sort (filling a phone's cell)
  and Filters.
- The count-truth and player-filter drives' count selector (not visible).
If a tile shows one of these, list it under "seen, already fixed after r6".
