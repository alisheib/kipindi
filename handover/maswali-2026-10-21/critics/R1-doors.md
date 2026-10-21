# Critic round 1 — the doors into Millionea (markets card, journey-home card, nav doors, /results section)

Scores (Player · UI/UX · Visual · Motion-as-seen · Copy):
| Card, open, phones 320–767 (journey + /markets) | 6 | 5 | 6 | 7 | 6 |
| Card, open, 768–1279 | 7 | 7 | 7 | 5 | 6 |
| Card, open, ≥1280 (one row) | 8 | 8 | 7 | 5 | 6 |
| Card, other states (code: presale, paused, closed, voiding, voided, settledWon, settledRollover, cap full, final week) | 6 | 7 | 7 | – | 6 |
| Card while loading (ghosts on / and /markets) | 5 | 3 | 5 | 3 | – |
| Nav doors (journey rail tab + desktop link, classic core link, classic More row) | 10 | 10 | 10 | 10 | 10 |
| /results Millionea section | 8 | 7 | 7 | 10 | 9 |
Zoomed crops: scratchpad\critics\doors\zoom\

## HIGH
H1 · The card loads with a 66–303px layout shift. The journey ghost's card slot (journey-home-ghost.tsx: plate + three
bars) is ~114px tall while the real card is 287 (320 sw), 234 (360 sw), 216 (360 en), 180 (360 zh), 144 (768 sw), 97
(1280). /markets/loading.tsx → MarketsGhost reserves no slot at all (soft navigation drops search, filters and grid by the
card's height + 16px: ~231px at 360 en, 303 at 320 sw, 113 at 1280). The root loading.tsx journey route ghost of / also
draws no slot. FIX: markets/loading.tsx and the root loading.tsx (for /) ask millioneaCardShown(), as app/page.tsx does,
and draw the slot (on /markets between the header row and the search, mb-3). All three ghosts draw ONE shared
MaswaliHomeCardGhost whose lines are the card's own dictionary words in transparent ink over the shimmer (the How-to ghost
title's technique: .kp-jhome-ghost__title, box-decoration-break: clone) on the same MaswaliFacts layout="phone" grid, so it
wraps exactly like the card in every language/width; the placeholder figure invisible. (Zero-shift alternative: resolve
the card before the Suspense boundary.) GUARD: slot height vs card height within 2px at 320/360/768/1280 × sw/en/zh.

## MEDIUM
M1 · Phones use a 2-line door's anatomy for a 9–13-line card: plate column + gaps + chevron (48+12+12+18) run the full
height; facts wrap in ~164px at 320 / 204 at 360; wrapped lines read as separate facts ("shared equally by every" / "10/10
ticket"); labels split from values against A1 ("Mauzo yanafungwa" / "Ijumaa 18:00", "Tiketi zako wiki hii:" / "1 kati ya
10", "Jackpot at least" / "TZS 1,000,000"); zh orphans "金额". Tiles markets-card-sw-320, journey-home-sw-320, -en-320,
-en-360, -zh-320. FIX below 768 the market card's anatomy: row 1 plate · title · chevron items-center (the How-to's row of
three); row 2 the fact lines at full inner width — a `.kp-mln-door` class family in globals.css: grid-template-areas
"plate title chev" "facts facts facts" below 768, the current layout from 768, one row from 1280.
M2 · The carry line hangs after the fee ("13% fee at payout / plus Week 47's carry-over once it is final" reads as adding to
the fee; same in sw/zh). FIX one order everywhere — figure, carry, rule, state: card facts={[headline[0], pending &&
keep(pending), ...headline.slice(1)]}; hub MaswaliPoolFigure puts the pending line between the figure and the rule.
M3 · zh yourTicketsThisWeek "您本周的彩票：{n}/{cap}" prints "10/10" under "由所有 10/10 彩票平分" (the misreading LOW 12 fixed in
en/sw). FIX "您本周的彩票：{n} 张，上限 {cap} 张".
M4 · The plate's tint is hand-typed (bg="var(--bg-overlay)", the sunken-well ink: reads as a hole); PHOSPHOR W5 ruled a
plate's tint is never typed at the call site. FIX <IconPlate size={48} variant="identity" aria-hidden><MillioneaGlyph
name="millionea" s={plateGlyph(48)} tier="duo" /></IconPlate> (+ the ghost plate).
M5 · No hover on either host (mat-raised without mat-raised-i); the How-to card above turns --border-royal on hover;
.mcardp lifts. FIX in .kp-mln-door the How-to's recipe: transition: border-color var(--t-quick) linear; @media (hover:hover)
:hover { border-color: var(--border-royal) }.
M6 · settledRollover draws "Jackpot —" + the live rule (maswali-card-model.ts jackpot: null). FIX no headline in
settledRollover (as void states); only "no 10/10 · TZS X carried forward".
M7 · The door never says what a ticket costs. FIX (lead accepts): for a reader holding 0 tickets, and guests, show the
week's frozen price in place of "0 of 10": en "Ticket TZS 1,000", sw "Tiketi TZS 1,000", zh "每张彩票 TZS 1,000".

## LOW
L1 chevron off-axis (mt-2 = 12px here; centre at y 413 vs title 404, plate 415.5) — M1's row centres it; s={20}.
L2 insets/material per host: at 360 plate x=33 vs How-to's 29, titles 93 vs 91; below 640 .mcardp insets 12px so on
/markets the content edge is 4px off; xl:px-4 (20px) matches nothing; mat-raised is the only shadowed surface among the
journey's flat --bg-elevated cards. FIX drop xl:px-4; the door takes its host's recipe (journey: bg-bg-elevated border, the
How-to's inset; /markets: mat-raised + 12px below 640).
L3 figure 13px below 1280, 16px from 1280 → text-body-lg at every width.
L4 untiled xl states: void states (no headline) hug the title → xl:ml-auto; final week's line becomes a 4th text column at
xl → put it under the title.
L5 zh "大奖 至少" (space between two Han words) → zh ruleWithFigure "大奖：{amount} · …".
L6 zh "第49周" vs maswali-format.ts's digit/Han spacing convention — LEAD RULING: keep the 2026-10-19 ruling (zh ordinals
UNSPACED, "第{week}周"); record the exception in maswali-format.ts's convention comment and fix any doc that says otherwise.
L7 close time in mono mid-sentence; hosts print a close in body type (.mcardp-closes, .kp-jcard__when) → body face with
tabular-nums whitespace-nowrap (one rule for all Millionea times).
L8 paused wording: en "Paused for now" / sw "Imesimamishwa kwa muda" don't say what → en "Sales paused for now", sw "Mauzo
yamesimamishwa kwa muda" (zh "暂时停售" already does).
L9 settledWon repeats the week with R9's retired colon grammar ("Week 48: 3 tickets won") → regWon/regWonOne (as register
and /results).
L10 presale "Opens Monday" ambiguous when weeks away → add the EAT date when ≥ 7 days ahead.
L11 the link's accessible name is all ~45 words → aria-labelledby (title + figure), aria-describedby (facts).
L12 no preview mark on the doors at STAFF_PREVIEW (every Millionea page and /results have one) → an info Chip with the eye
glyph in the title row.
L13 zh ticket noun 彩票 (card) vs 我的注单 (tab, Tiketi zangu) — listed for Gate B native review (no change now).
L14 /results separators hand-rolled (~2× the platform's 12px; at md+ a dot can open/end a line, A1) → <MaswaliFacts
layout="phone" facts={facts}/>.
L15 /results rows stretch ~1166px at ≥1280, the chevron ~900px from the facts (R9's flaw) → from 1024 one line per row,
facts right-aligned before the chevron.
L16 /results section ignores filters (shows under any search/category/page 2+) → draw only where the notable carousel draws
(page 1, no search).
Also: the /positions Millionea row ends in arrowRight 14; every other Millionea door uses chevronRight.
Known items seen: P6 (closed state "15 of 15 results in" then nothing — extend P6's fix to the card); P14 (sw verbs on the
card's settledRollover / carry line / voided state).

## Already 10 — leave alone
Break/rollout rules on every door; no gold on the card's figure or plate; no countdown/poll of its own; "At least … plus Week
N's carry-over" (true lower bound, week named); no headline on void states; fact lines at ≥768 never open/end a line with a
separator; the ≥1280 one-row card (but L2, M5); the nav ink per §M8a item 11 (still gradient, gold glyph on the journey pip
only); the More menu (opaque, Results first); the 1024 sw top bar fits; P13's "No other open questions".
