# Round 4 — what round 3 fixed, and what each fix must look like now

These tiles were taken on the branch after round 3's fixes (tiles-r4). Round 3's tiles are tiles-m; the diff overlays
compare r4 against them. For EACH fix your tiles show: VERIFIED (with the measurement) or NOT FIXED / FIXED WRONG
(with the measurement). The fixes of round 2 (read-brief-r3-fixes.md) still hold — a regression of one of them is a
finding too. Everything below was computed, never seen in a browser before these tiles: read them hard.

## Two regressions round 3 found in this pass, fixed (verify they are gone)
- Filter bars (every page with a search box and chips: /markets, /results, /live, /leaderboard, Tiketi zangu,
  notifications, fairness): G1 had laid every filter row out as the home board's question row. Now: the sort pill and
  "Vichujio" share one row at 390 when they fit; no 59–69px empty band under the search box (the gaps around the chips
  and sort are even, ~16–32px as the page's rhythm); at 1024+ every filter GROUP is one line (MCHEZO, MADA, UWEZEKANO,
  HALI, WAKATI — never stacked into a column), dividers sit between groups, never floating.
- Deposit and withdraw forms: the form card's first line ("CHAGUA NJIA YA KULIPA", "MAHALI") ~27px below the card's top
  border under 1024 and ~35px from 1024 — the same as the hero card above it. 51/59px is the old defect.

## Home (R3-A)
- zh 1024: the trust line and the signed-in lead never split a word (提现, 选择, 下一次) and never end on one character;
  they break between clauses.
- zh 320 featured card meta: "2026年10月9日 截止" / "结算来源：CoinGecko" — 来源 whole, no line ending on "·".
- "Tanzania." never alone on a line (sw 360/390, en 320, classic sw 390 too) — the licence row is balanced.
- en 1024 signed-in lead: "No picks yet. Choose a side on" / "a market to make your first." — no "first." alone.
- The sw headline "NDIO au / HAPANA?": both lines' ink starts within 1px of the page edge (16 below 1024, 32 from it),
  like en "YES or NO?" and zh 是 — it was 3–5px inside.
- Card empty-state words ("Hakuna dau bado", "Kuwa wa kwanza kutabiri", featured "Hakuna bwawa bado") at 13px type,
  readable contrast; card heights unchanged.
- Held wallet, signed in: NO "Chagua upande … chaguo lako la kwanza" lead above the frozen box; the box's and the lead's
  right edges agree.
- Journey LIVE ticker: no glyph cut at full ink where the label meets the track (a soft fade instead); from 1024 its
  "• LIVE" starts at 32 and the pause control ends at W−32 (the header's edges); the separator dot centred between
  items (equal space each side). Classic ticker unchanged by design.
- Signed-in demo player: never "TZS X paid to you this week" above a proof band reading "TZS 0 PAID OUT".

## The Needle dial (R3-B)
- At rest it is tucked HALF OFF ITS OWN EDGE (normally the right), never wholly inside the viewport, never parked
  left/mid-page by a resize; it covers no control, no text, no icon, no open panel (channels panel, install/consent
  cards), and keeps clear of them by its glow (~10–25px) — a full-width card's frame under it at 360–390 is allowed.

## Lists, sheets, notifications, hub (R3-C)
- No one-word last line: held Wallet notice ("…itakueleza kinachofuata."), the hub's card-size hint (now on its own line
  under the label: one line from 360, "Kwa simu tu." / "Hakuna kinachofichwa." at 320), fairness lead ("…hadi
  lifungwe."), RG page paragraphs, the invite call on phones ("Shiriki kiungo chako" / "uone wanaojiunga" under the
  dial), privacy/legal version line never ending on "·".
- Empty states: "NDIO au HAPANA" / "YES or NO" never split across lines; content centred in its dashed box (equal space
  above and below, ±1px).
- Chip strips: a selected pill's glow drawn whole (round, not square); the trailing fade 64px, so a strip with more
  chips beyond the edge visibly fades its last visible label (on /results sw 390 the 4th lens "Batili" is signalled).
- Notifications: no ".." and no "pos_…" in any sentence.
- Leaderboard: the "Fedha" tier in plain ink (not gold); the sort row's spacing even (32/32); right-aligned table heads
  end on their column (±1px).
- The hub's Needle row built like every other row: chevron at the same x and size, glyph slot aligned, row 56px.
- The guest tickets sheet/dialog: the × centred on the title's first line (±1px).
- zh footer RG motto upright (no fake italic).
- Unread signs present on the demo player's tiles (the capture now waits for them).

## Header bell, money, market and ticket pages, details (R3-D)
- Journey bell at 1024/1280: the "25" badge no longer buries the bell's dome (badge up-right, dome clear); the bell
  centred between the locale box and the avatar (equal gaps ±1px).
- Money in mono: the limits line's "TZS 1,000 … TZS 5,000,000" in the mono face; the amount placeholder "10,000"; the
  market page's KIASI and WATABIRI values mono, INAISHA with its icon, value tops level.
- Market page: both columns start at the same y; the category watermark sits on the question (not into the gold rule,
  not under SHIRIKI); Chanzo · ☆ · SHIRIKI one right-aligned group (no floating star at x29).
- Ticket cards: the ticket-id icon 4px from its text (like the clock); at 768+ cards in a row have level inner rows
  (DAU labels, detail lines at the same y).
- Up & Down page: the subtitle on ONE line at 390 ("Je, bei itakuwa juu au chini muda ukiisha?").
- One content edge per column: fairness, help (contact cards, quick links) and agent stat tiles align with their
  heroes.
- Stat hints (agent captions) at 13px; zh stat labels 11px untracked.
- /profile/invite: the link field and "Nakili" the same 44px height, tops and text centres level.
- KYC: no "VYA KUAMBATANISHA" label; back links' chevron tip on the card's edge (x16 / x352 at 1280).

## Known and by design (do not report)
- Reading-tier pages at 1280 (tickets, account, KYC forms) are a centred column (x132 / x352), by design.
- The "pos_…" ticket reference line on ticket cards (support reference, A19).
- Badge names bilingual on /profile (S12); English market titles on zh tiles (data); "TZS 1.0M" compact staff capsule.
- The leaderboard podium's gold ring/crown and HotChip flame (owner decision pending).
