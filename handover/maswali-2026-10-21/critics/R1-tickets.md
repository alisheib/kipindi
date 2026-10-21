# Critic round 1 — Tiketi zangu for Millionea: the list, the kind switch, the single ticket

Scores (Player · UI/UX · Visual · Motion-as-seen · Copy); "c" = judged from code only:
| A. List: ticket cards | 8 | 7 | 6 | 8 | 7 |
| B. List: lens bar + the Maswali / Up & Down / Millionea switch | 8 | 6 | 6 | 9 | 9 |
| C. List: empty, lens-empty, loading, error | 6 | 6 | 7 | 8 | 7 |
| D. Ticket: running in an open week (free cancel, its confirm, the cancelled result) | 7 | 6 | 7 | 6 | 7 |
| E. Ticket: live week ("x of 15 results in", voids, cannot-win) (c) | 7 | 7 | 8 | 7 | 8 |
| F. Ticket: won (paid / held / forfeited), win ledger, seal door (c) | 7 | 7 | 9 | 7 | 7 |
| G. Ticket: lost + the loss receipt (c) | 4 | 4 | 6 | 7 | 7 |
| H. Ticket: cancelled or refunded ("at rest") | 6 | 4 | 6 | 6 | 7 |
| I. Ticket: loading, error, not-found | 9 | 7 | 8 | 9 | 9 |
Critic's contrast script: scratchpad\critic-tickets\contrast.mjs

## HIGH
H1 · A lost ticket shows every counted question twice (src/app/millionea/tickets/[serial]/page.tsx:211-221): the full
ticket (15 clauses) then MaswaliLossReceipt with the same ten positions again — the most common settled state, ~1.5 extra
screens at 360 (the delivery draws two separate frames: T-ticket-settled-lost, W-loss-with-week-line). The receipt drops
loss.carriedForward and loss.nextWeekCode (a loser never learns where the pool went); its week line is a ReceiptRow label
with value="" → a 10px uppercase sentence (breaks §T4). FIX drop `positions` from the loss receipt on the ticket page;
make it a compact card: heading "Did not win", the week line in text-body-sm text-text, finality, legal line, closing rule;
week line = weekLineNoWinner + carriedOut ("Week 49: no 10/10 ticket · Carried forward to Week 50", week number from
weekNumberOf(nextWeekCode)) or settledWon; place it directly after the back link, ABOVE the ticket, so a settled ticket
leads with its outcome (§M7) — do the same for the win ledger (today under all 15 clauses, ~4 screens down).
H2 · A cancelled or refunded ticket fades its WORDS below the contrast floor (3b-cancelled-360; maswali-ticket.tsx:158):
each clause <li> gets inline opacity var(--state-disabled-opacity) (.45) → question text 3.9–4.2:1, "Pick" ink 3.1:1, the
category/time eyebrow 2.2:1 (not controls; the disabled exemption does not apply); on a voided week it fades the VOID stamps
that explain the refund; invisible to test:contrast §P. FIX never put opacity on words; "at rest" is already carried by the
slate chip, the Seal Line's kp-mln-rest sockets and the hidden socket words; if rows must recede, question text
--text-muted (11–13:1). Add a guard (contrast of every text node in an at-rest ticket ≥ the AA floor).
H3 (probable, not shot) · The Swahili free-cancel label overflows its button at 320: "Kughairi bila malipo hadi 10:21" ≈
215px of 15px semibold in a fullWidth btn-lg with ~188px; .btn is white-space: nowrap (globals.css:1260). (The How-to
example button needed .kp-mln-example-button for the same.) FIX part of M4 (the platform's free-exit layout puts the long
clause on a wrapping line). Shoot ticket-sw-320 inside the cancel window.

## MEDIUM
M1 · The Millionea ticket card is a fourth kind of card (maswali-ticket.tsx:414-454) vs its siblings in the same switch
(journey/tickets/ticket-card.tsx, markets/position-card.tsx, the Up & Down history card): radius var(--r-xl) 24px (the only
--r-xl in src/components; every sibling and the ticket page are 16px — §S2 cards take --r-lg); p-3/gap-2 (16/12px) vs
p-4/mt-3 (20/16px); the state chip has no glyph (platform chips are glyph + ink + word: positionStatusGlyph, PHOSPHOR W4);
equal-halves stats break en-320 "When the / result is in" (the platform fixed it with
grid-cols-[minmax(max-content,2fr)_minmax(0,3fr)]); only the Seal Line and "View ticket" link, no hover (siblings are
whole-card links with hover). FIX the journey card's shell (rounded-xl border border-border bg-bg-elevated p-4, mt-3 rhythm,
the 2:3 grid); a millioneaTicketGlyph beside millioneaTicketChip (positionStatusGlyph for running/won/lost/refunded,
rotateCcw for cancelled, void for forfeited); the whole card the <Link> with the classic card's hover; keep "View ticket ›".
M2 · The lens bar is hand-rolled and wraps into orphans (tickets-sw-360 "Ulizoshinda" alone on row 2; tickets-zh-320 /
-s2 "已中奖" alone; tickets-sw-320-s2 a two-row sticky bar ~120px of 780). FIX the kit QueryStrip exactly as
PositionsBarJourney does (scrolls below lg, wraps from lg); the ghost matches it.
M3 · Empty and lens-empty diverge from their siblings (tickets/page.tsx:105-118): no `fill` (switching kinds changes the
box width — the PV-03 defect fixed for Up & Down); the CTA is a ghost button with a noun ("Maswali Millionea") where siblings
use btn btn-primary btn-md with a verb; lens-empty is a dead end ("No ticket matches this filter.", no body, no exit). FIX
fill={journey}; primary btn-md labelled millionea.titleSlip ("Fill a ticket") still behind P2's break gate; per-lens titles
from the platform (journey.ticketsEmptyOpenTitle, ticketsEmptySettled, ticketsEmptyWon), body positions.emptyLensBody, exit
button journey.ticketsExitLens with its count linking to ?lens=all (as TicketsView does).
M4 · The free cancel invents its own control (3a/3c/5-holder-ticket-360, 3b-cancel-confirm-*): no ticking m:ss and no
money on the control (the platform's free exit — journey SellButton — says "Uza bila ada hadi 11:23 · 3:42" role=timer,
then a button "Uza bila ada" over "Rudishiwa TZS 1,000 kamili"); the rule note never renders (cancelWindowMins never
passed; the delivery's T-ticket-open-cancellable draws it); the confirm title holds the serial so it breaks at every width
(en-1280 "Cancel ticket MLN-" / "2026-W49-000041?", zh-360 three lines); the confirm wears the warning-triangle plate on a
free cancel (the platform's free-exit confirm has no plate — DS-6); the refusal toast is titled with the button's verb.
FIX reuse the journey sell look: a clock line + timer, then the button "Ghairi tiketi" over journey.sellFullRefund;
cancelNote under it; confirm title en "Cancel this ticket?" / sw "Ughairi tiketi hii?" / zh "取消此彩票？" with the serial on
its own mono line (as SellConfirmModal), icon={<I.rotateCcw/>}; refusal toast title en "Not cancelled" / sw "Haijaghairiwa" /
zh "未取消".
M5 · The stub breaks phrases (A1): ticket-sw-320-s4 "Jumatano 21 / Okt, 10:18"; sw-360-s4 "Jumatano 21 Okt, / 10:18";
zh-360-s4 "…10月21日 / 10:18"; en-360-s4; the serial "MLN-2026-W49- / 000042" in all three. FIX the serial its own full-width
stub row (col-span-2, nowrap; ~150px fits); the date-time one whitespace-nowrap run (as the card's <time>), breaking only
after the weekday.
M6 · The ticket's trust doors are missing: legal={null} on both receipts; view.resolution read and dropped (manifest L3's
line "Imethibitishwa… · Uthibitisho wa utatuzi…", drawn in W-win-ledger-single, never prints); the stub's "Question set
19813468…" hash fragment has no door to the register. FIX pass legal from view.resolution (the read model carries no
attestation hash: add it, or make hash optional and print the sentence alone); on a SETTLED/VOIDED public week link the stub
hash and the legal line to registerWeekHref(view.week.code).
M7 · One fact, two wordings between the list and the ticket (§3.9: row text matches the receipt byte for byte): en card
"Stake / Placed 21 Oct" vs stub "Price / Bought Wednesday 21 Oct"; sw "Dau / Imewekwa" vs "Bei / Imenunuliwa"; zh card betting
words "投注额 / 下注于" and "赔付" vs the stub's "价格 / 购买时间", §D decided 派奖. FIX card label millionea.stubPrice; new key
millionea.boughtAt "Bought {date}" / "Imenunuliwa {date}" / "购买于 {date}"; zh-only payout labels "派奖" / "最终派奖" (platform
keys untouched).
M8 · Most first-view motion plays off-screen and is then marked seen (ticket-acts.tsx TicketSeen; motion.css): N3's cut and
reverse (on the stub), the stamp reveal, M6's closing rule and N2's presses below the fold all start on mount; the stub is
~1,700px down at 360 and 1280; TicketSeen marks everything seen on mount, so the "performs once" moment is spent unseen; the
cancel's undo plays under the result modal. FIX start each moment on first intersection with the platform's
components/layout/reveal.tsx pattern (threshold 0.12, unobserve after firing, the three motion gates → end frame); mark a
fact seen only once its moment has entered view.
M9 · Loading ghosts move the page (§B7 rule 3): the list ghost draws one lens row where sw below ~500px and zh-320 draw two
(cards drop ~50px); the journey ghost (route-ghost.tsx:123) draws a two-kind switch but /millionea/tickets always has three;
the ticket ghost's Seal Line box is 70px vs 108px real and has no slot for the cancel control (clauses drop ~40px, +~56px
inside the cancel window). FIX match each ghost's geometry: M2's strip makes the lens row one row; TicketsHeadGhost takes a
kinds count; the ticket ghost a 108px Seal Line box and a cancel-height slot when the window is open.

## LOW
L1 the switch's "Millionea" is plain text while the rail under it wears .kp-millionea-ink (§M8a item 11: the ink is worn by
every nav that draws Millionea; the switch is a <nav>) — LEAD RULING: wear the ink (it IS a nav that draws Millionea).
L2 finality line drift: en "nothing more is owed" vs §C4 "nothing further is owed"; zh spaced dash vs the platform's "——" →
en per §C4; zh "此处每个数字均为最终结果——不再有任何欠付。" in both places (Gate B review).
L3 receipt heading "You won" / "Umeshinda!" / "赢了！" (赢 is the platform's word vs Millionea's decided 中奖; the delivery draws
"Umeshinda" without "!") → new key millionea.wonHeading "You won" / "Umeshinda" / "您中奖了".
L4 the refund said three times: the cancelled stamp "CANCELLED · TZS 1,000 RETURNED TO MAIN BALANCE" is a sentence in 12px
tracked caps (§T4) repeating the head notice → cancelledLine "Cancelled · {price}" / "Imeghairiwa · {price}" / "已取消 ·
{price}"; on a refunded ticket merge the two head lines into the void sentence + "…returned to main balance".
L5 the live line's "next event" lowercase beside capitalised facts, can start its own line → "Next event {when}" / sw
"Tukio linalofuata {when}".
L6 en socket word "Reserve" names the role, not the state → en "Standing by" (sw "Iko akiba", zh "候补中" drafts for Gate B).
L7 the stub reads "Week · Week 49" → the number alone.
L8 the cannot-win box and the sunset line are hand-rolled mat-inset boxes (as P18) → Callout tone="neutral".
L9 the classic list has no way back to the hub (Up & Down's classic history opens with a BackLink) → BackLink
fallbackHref="/millionea" while the product is visible; drop the then-repeated eyebrow (R7).
L10 the seal door's label is only the serial(s) (the delivery: "Millionea · Week 42", "1 ticket at 10/10") → label = facts
"Millionea · Week 49 · {serials}".
L11 an open-week ticket says nothing at week level until sales close → fill the live slot with salesCloseAt + firstEventAt.
L12 a won ticket never says where its money went (a cancel/refund does) → "Paid to main balance · {settledAt}" (consider; the
platform card doesn't say it either) — LEAD RULING: do it (one truth: where the money went, every outcome).
L13 reserve results count toward "x of 15 results in" but their annex sockets never change before the week is final — LEAD
RULING: show a verdict-free "result in" mark on the reserve socket, so the count and the sockets agree.
L14 dead motion path: TicketMoments.lock (M2 .m-seal) never set (no "close" fact) → add the fact or delete the prop.
L15 two nouns for "ticket" on one zh screen (我的注单 / 彩票) → Gate B.
Known items touching these surfaces: P5 (live line nextResultAt), P6 (checkWindow prop never passed; checkWindowUntil),
P10 (auto-filled slot "Pick YES" — the fix must cover the clauses AND the cards), P14 (sw weekVoidedShort), P1 (applies to
the stamp only; the ticket page's own cancel uses the server's instant and removes itself at expiry).

## Already 10 — leave alone
Gold discipline (§M8a item 7); §B11 tones (won green with gold only on the amount; void/cancel slate; loss rose); honesty (no
potential payout, no running score, no near-miss; a refund said only once landed; the cannot-win line in the owner's words,
only while running, never in the final week); the gate (owner-only, no existence oracle; a holder reads their tickets at a
kill); Seal Line grammar (glyph + ink + word, one grader, carry only once final); a11y + list behaviour (polite live region
mounted from the first render; newest first; paged by whole weeks); earlier S5 fixes (P10 "Refunded TZS 1,000", P11 row
alignment, P12 cancel on the first screen).

## Owed frames (seed and shoot these — the 10/10 is judged on them)
Ticket page: closed / results coming in / check window; won (paid, held, forfeited, two tickets, top-up, sunset); lost;
voided (refund pending and landed); the lower half of a cancelled ticket. List: cards in every one of those states; empty and
lens-empty. Swahili layout: the journey at 320 (three-kind switch + lenses); the cancel button at 320 and 360 (H3); the head
"WIKI 49 · MATOKEO YANATOLEWA" at 360 and below.
