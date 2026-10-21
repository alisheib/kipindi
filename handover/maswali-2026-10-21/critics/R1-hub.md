# Critic round 1 — the Millionea HUB (/millionea) and its tab
Tiles show ONE state (open week, signed in, one ticket held, Week 47 grading, Week 48 voided), all CLASSIC shell; no hub tile
of the journey shell. Zoom crops: scratchpad\critics\hub-zoom\

Scores (Player · UI/UX · Visual · Motion · Copy):
| Open week, signed in, holding a ticket (tiles) | 6 | 6 | 7 | 8 | 8 |
| Open week, guest | 6 | 7 | 8 | 8 | 7 |
| Paused, at cap, or on a break | 7 | 7 | 8 | 8 | 6 |
| Sales closed / results coming in / week being voided | 6 | 6 | 7 | 6 | 6 |
| A second week grading beside the open one (GradingBlock) | 6 | 6 | 7 | 9 | 7 |
| After settlement: last-week row and the notices | 7 | 7 | 7 | 5 | 7 |
| Final week, and Millionea ended | 4 | 7 | 8 | 10 | 4 |
| No week on sale | 7 | 7 | 7 | 10 | 7 |
| Loading ghost and error page | 9 | 6 | 8 | 7 | 10 |
| The Millionea tab / nav entry | 9 | 9 | 9 | 10 | 10 |

## HIGH
H1 · The phone's main button is below the first screen (hub-{sw,en,zh}-{320,360}; first in -s2): at 320/360 "Fill a ticket"
starts at y≈713–808, the rail at y 716 hides it; the first screen is the strip, the jackpot and a 6-row ledger (v6 put the
button at y≈587). FIX split MaswaliPoolFigure into its head (eyebrow, figure, rule, carry line) and its ledger; below 1280
draw head → BuyBlock → ledger; from 1280 today's order (head ends y≈500 sw 360, y≈560 sw 320 → the button lands above the
rail in every language).
H2 · The sticky right column slides under the 56px header at 1280/1920 (hub-*-1280-s2, -1920-s2; crop sticky-en-1280-s2):
xl:top-5 (24px; page.tsx:309); the market page fixed exactly this on 2026-09-13 (markets/[id]/page.tsx:739-749). FIX
xl:top-[72px]; make only the jackpot head and the button sticky (held rows and the grading block in normal flow — at 780px the
whole column doesn't fit); mirror in hub-ghost.tsx. (Same bug on the slip: maswali-slip.tsx:316, slip-ghost.tsx:51.)
H3 · In the final week the hub states an incomplete payout rule (page.tsx:298; poolRule in maswali-pool-figure.tsx:132): in
the final week (MR-30) a pool with no 10/10 goes to the week's highest-scoring tickets; the hub still says "Shared equally by
every 10/10 ticket" and the callout only "Final week of Millionea" (v6's final-week frame states the consequence). FIX one key
for the callout's body and the rule line in a final week, glyph finalWeek (P17): en "Final week: if no ticket gets 10/10, the
pool is shared equally by this week's highest-scoring tickets · {pct}% fee at payout"; sw "Wiki ya mwisho: ikiwa hakuna tiketi
itakayopata 10/10, bwawa litagawanywa sawa kwa tiketi zenye alama za juu zaidi wiki hii · ada {pct}% wakati wa malipo"; zh
"最后一周：若无彩票答对 10/10，奖池由本周得分最高的彩票平分 · 派奖时扣除 {pct}% 费用" (sw/zh to Gate B). CHECK the words against
RULES.md §2.12 / MR-30 and How to play's final-week sentence — one wording.
H4 · After Millionea has ended the hub promises future sales (page.tsx:294-346): under "Millionea has closed… the final payout
is complete" the empty-week branch still prints "No Millionea week is on sale right now." and "The 15 questions are published
when sales open, with the question set's hash." (AGENTS §6). FIX when hub.life === "RETIRED", draw only the closed statement,
the final week's row and the Week register link; drop hubNoWeek and questionsAtOpen.

## MEDIUM
M1 · At 768 and 1024 the page is a stretched phone layout (hub-*-768*, -1024*): one column; ledger rows span 926px at 1024
(label x 49, value x 975); each question row 95px; the held row 960px wide with 230px of content (v6 768: pool and buy block
side by side, questions as table rows). FIX question rows md:grid-cols-[32px_104px_1fr_auto] md:items-baseline; page grid from
lg: lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 (the market detail page's), the strip lg:col-span-2; from 768 to 1023 pool
and buy blocks two-up; mirror in the loading ghost.
M2 · The front door has no one-line explanation and no doors in its head (hub-*-360; "How to play" ~2,800px down: hub-sw-360-s5,
hub-en-360-s5) — Up & Down's PageHeader has a tagline plus Rules and My bets pills. FIX subtitle={fill(t.millionea.howOne,
{price})} (How to play's first step, all 3 languages); actions = a How to play pill (I.howTo) and a Your tickets pill
(I.ticket); move Up & Down's HEADER_PILL (updown/page.tsx:50) into the kit so both pages share one recipe (⚠ updown/page.tsx is
U43's file — message the lead before touching it; prefer adding the kit export and leaving Up & Down's call site to U43).
M3 · The guest door only offers sign-in (page.tsx:222, millionea-parts.tsx:37): a hand-built signInHref, no Sign up door, drops
?ref / ?invite (the defect the market page removed 2026-10-14). FIX authDoorHrefs("/millionea/slip", query) with the market
page's guest pair: Sign up (btn-primary) + Sign in (common.signUp / common.signIn) — §K 8d sign-up-first.
M4 · The pool ledger hand-rolls rows the kit draws (hub-sw-320, hub-sw-360; compare how-en-360-s3): maswali-pool-figure.tsx:183's
<dl> is a home-made ReceiptRow; register, How to play and the win ledger use the kit row — two typographies for the same rows;
sw "Kiwango cha / chini kilichohakikishwa" ends a line on the connective "cha". FIX ReceiptRow (emphasis="amount" on Jackpot,
muted on rows whose value is words), as register/[week]/page.tsx:270-303.
M5 · The week's state is in the label ink, not a status (hub-en-360 "WEEK 49 · OPEN", -s2 "WEEK 47·SALES CLOSED"; §T3: a state
word keeps its state's ink; the register uses WeekStateChip): while sales are paused the hub says "OPEN" (the card says "Paused
for now"); while certain to void it says "Results coming in" (the card: "Week being voided"). FIX extend WeekStateChip
(register/register-parts.tsx:22) to every state via status-tone.ts (royal while live, slate when terminal) + two derived
states pausedShort and weekVoiding; draw the chip under the title (as the register), the eyebrow just "WEEK 49"; same in the
GradingBlock.
M6 · A week being voided is never named on the hub (weekVoiding / weekVoidingBody have no readers; v6 U-hub-week-voiding has a
band). FIX when voidingNow(w): a neutral Callout with weekVoidingBody ({voided} main questions void, {valid} valid reserves
left, {when} = the latest void deadline).
M7 · A moved sales close is never announced (closeMoved exists in all 3 languages, no readers; v6 U-hub-close-moved). FIX carry
the previous close time in the hub's data; a neutral notice while sales are open.
M8 · Held tickets not capped on the hub (at cap 10: 10 rows ~900px inside the sticky column; seeAllTickets has no readers).
FIX at most 3 rows newest first, then "See all {n} tickets ›" → /millionea/tickets.
M9 · Returning notices use the wrong container (hub-notices.tsx:54: boxed Callouts; §F9 and §M8a item 10 name the calm bar
NoticeBar = the platform's AwaySummaryBar; v6 a full-width band). FIX NoticeBar + NoticeBarAction.
M10 · The carry motion starts off screen (page.tsx:317, maswali-carry.tsx): N1 starts from last week's row at the bottom
(≈2,200px away at 360, ≈830 at 1280) vs the spec's ≈118px from the rollover notice. FIX origin id on the rollover notice's
.amount; MaswaliCarry plays only when both points are on screen, else the end frame.
M11 · The result-stamp press never plays on the hub (page.tsx:150: QuestionRow never passes press; SM3 names the hub). FIX a
small client wrapper sets press and index (capped at 4) when a row's outcome changes while on screen (GlyphSwap's rule).
M12 · At 1280 a weekend with results will squeeze the question text (page.tsx:147; inferred): event time and result stamp side
by side in an auto column → ~120px of question. FIX xl:flex-col xl:items-end in that cell; shoot a weekend week at 1280.

## LOW
L1 separator spacing differs between labels (mono labels 5px each side; the page head's " · " 13px; crops eyebrow-*,
reserves-head-en-360) → .font-mono .kp-mln-facts{--mln-sep:calc(3ch + .42em)} or plain strings for the two single-line labels.
L2 week-strip times in the body face (every other hub time is mono; strip-en-360 vs close-en-360; §T5) → font-mono tabular-nums.
L3 the reserves block composes its inset look inline (--wash-inset per row, --edge-shade inline; page.tsx:138,163; §M2) → wrap
head + reserve rows in .mat-inset.
L4 held ticket row: no .mat-raised-i hover/press; link named only by the serial → .mat-raised-i + aria-label="{viewTicket} ·
{serial}".
L5 the grading block has no door; for a reader with no ticket it's a dead card saying "0 of 10" (P8) → link to the week's register
page with a chevron; drop the tickets line at 0.
L6 "No week on sale" is a Callout; the platform and Millionea's register/tickets use EmptyState → EmptyState.
L7 loading ghost mismatch: the strip ghost in column 1 at ≥1280, the pool ghost 320px tall → ~70px jump at 1280, ~160 at 360.
L8 zh results count "15 个结果已公布 0 个" → "已公布 {n}/15 个结果".
L9 the close time prints without the button ("Sales close Friday 18:00" while paused/at cap/on a break; adds to P15) → only
with the button.
L10 "At least" wraps alone at 320 (en, sw: "at least / TZS 1,000,000") → text-title-sm xs:text-title-md on the figure.
L11 on a break the classic shell lights nothing on /millionea → mirror the journey's fallback (light Markets).
L12 no "next event" time on the hub's results count (in the v6 closed band) → add after P5.
L13 a voided main question says only "Result · Void" → voidAwaiting / voidWeekCertain.
L14 last-week row for a voided week says "Week 48 · Voided"; the home card says weekVoidedShort / weekVoidedShortPending → one
wording.
L15 refund row with a dash: in a voiding week the row states TZS 1,000 in the sentence and shows "—" as its value.
L16 ghost button border override border-border-control at the call site on 3 Millionea pages → fix once in the kit's .btn-ghost
(§A1 needs 3:1) or drop the override (⚠ kit change = platform-wide: check every ghost button's contrast, parity names it).
L17 the <aside> has no name (the market page names its bet panel) → aria-labelledby the Jackpot label.
L18 current phase shown by colour only (§A4) → a word or shape (filled vs hollow dot).
L19 rail crowding at en 320: "Up & Down" and "Millionea" 5px apart (journey-home-en-320; crop jrail-en-320).
L20 free-cancel window missing from the held row (cancelFreeUntil exists).
L21 paused + no week: "The next week opens Monday 00:01" prints under "paused for now".
L22 where is OD-03's one-week-ahead final-week announcement drawn? Not on the hub — find the plan's answer; draw it where ruled.
L23 the staff preview mark is a Callout; the platform's preview marker is a NoticeBar (staff only).
Known seen: P7, P8 (+L5), P9, P15 (+L9), P16 (+ no chevron), P17 (+ the paused callout draws the default info glyph instead of
§10c's salesPaused).
Other surfaces: the Needle rests over the held row's chevron at 320/360 (hub-sw-320-s2); the slip's top-5 sticky; the ticket
card's inline --r-xl.

## Already 10 — leave alone
Gold discipline (§M8a item 7, §M3a); the honest headline ("at least" + "plus Week 47's carry-over once it is final"; no
potential payout, no pick totals; the floor only when funded); fact lines (A1) across 105 tiles (but L1 and M4's connective);
zh typography (keep-all, 12px untracked labels); formatTzs / .amount; RG (a break swaps the button for the kit
BetBreakNotice; the cap callout names the next week; the countdown only in the last hour, but P15); notices (once per player and
week, marked seen after showing, nothing fired, the win seal only on the reader's own tap); the tab's ink (§M8a item 11; the
red end reads pink on the lit pill — Ali's open tint decision); the jackpot tick (only on a real change, never on mount, never
counts up); reading links and the error page (kit RouteError).
