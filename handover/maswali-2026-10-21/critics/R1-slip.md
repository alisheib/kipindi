# Critic round 1 — THE SLIP (/millionea/slip)
Critic's crops and pixel samples: scratchpad\critics\z-*.png. Multi-ticket frames: C:\50pick-ssd\kipindi-mln-r1\.50pick-shots\maswali-multi-slip\draft-en-320.png, draft-zh-320.png (d1c5910f); confirm-sw-360.png, receipt-sw-360.png (Oct-20 run; folder may be gone after the cleanup — re-shoot).

Scores (Player · UI/UX · Visual · Motion · Copy):
| Slip: answering rows | 7 | 7 | 7 | 6 | 8 |
| Slip: progress (meter, counts, "Answer all 15") | 5 | 5 | 4 | 6 | 7 |
| Slip: multi-ticket composer | 4 | 4 | 5 | 6 | 6 |
| Pay rail (<1280) / summary panel (≥1280) | 6 | 5 | 6 | 8 | 9 |
| Confirm sheet (single, multi, low balance) | 5 | 5 | 6 | 9 | 6 |
| Purchase stamp | 7 | 7 | 7 | 9 | 7 |
| Refusals, closing, closed | 4 | 5 | 6 | 8 | 7 |
| Cancel flow (door, confirm, result) | 8 | 8 | 6 | 9 | 9 |
| Loading ghost and error | – | 6 | 6 | 7 | – |

## HIGH
H1 · The empty meter looks full (slip-sw-360, slip-en-360, 3a-slip-answered-360; z-rail-sw-360 0/15, z-rail-answered-360
15/15): empty = --border-strong (#2F48A4), done = --royal-400 (#5376EA) — two saturated blues 1.99:1 apart; 0/15 reads as
15/15. FIX stepped-progress.tsx GroupedProgress: an empty segment = the kit ProgressBar's track (bg-bg-sunken + inset 1px
--border-control ring, 3.31:1 on --panel); done solid --royal-400; meter 6px (h-1.5); transition: background var(--t-quick)
linear. Hollow vs solid carries the difference.
H2 · No question on the first screen at 320/360 for every player (slip-{sw,en,zh}-{320,360}): the "Tickets in this purchase"
box renders whenever allowed > 1 even with one ticket (slip-client.tsx:255), above the H1, ~190px of chrome, Q1 under the
rail. FIX render the switcher only when count > 1, placed under the head (title and times); "Add ticket" becomes a ghost
button after the reserves box: en "Add another ticket", sw "Ongeza tiketi nyingine", zh "再添加一张彩票".
H3 · Multi-ticket: the rail arms the purchase while another ticket is incomplete (draft-en-320: "Ticket 1 · 14/15" under an
armed "Continue · 2 tickets · TZS 2,000" and "Main 10/10 · Reserve 5/5"): readiness and counts are per ACTIVE ticket only and
nothing says which ticket is being answered. FIX arm only when firstIncompleteSlip(draft) < 0; otherwise the control reads
"Finish ticket {n}" / "Kamilisha tiketi {n}" / "完成第 {n} 张彩票" and selects that ticket; when count > 1 the rail's (and
panel's) count line leads with the active ticket's draftTicket name.
H4 · The low-balance deposit door offers an amount the deposit refuses (slip-client.tsx:237–242; v6 S-confirm-low-balance
"Weka pesa TZS 600"): the raw shortfall, while DEPOSIT_MIN_TZS is 1,000 (the classic form drops a below-minimum prefill; the
journey form refuses it) — a broken money promise (§F7). FIX the bet sheet's offer from lib/journey/shortfall.ts (D =
max(shortfall, DEPOSIT_MIN_TZS), its ceiling chips, belowDepositMin → journey.lowMinNote, no second offer while a deposit is
pending), fed with the main-balance shortfall; add from=low-balance to the link.
H5 · An unknown balance is printed as TZS 0 (slip-client.tsx:113, :178 `balance ?? 0`): when the wallet read fails the
confirm says "from main balance (TZS 0)" — a fabricated zero (AGENTS §6, §C2). FIX unknown → drop the parenthesis or "—" +
common.temporarilyUnavailable, as the bet sheet's BalanceRow.
H6 · Sales closing mid-confirm makes the sheet vanish without a word (slip-client.tsx:296 open={confirmOpen && !closed}); the
closed band (maswali-slip.tsx:261) appears only at the top, off-screen when scrolled, with no next step (§F4). FIX keep the
sheet and swap its body for the bet sheet's closed frame: salesClosedAt with its time, one ghost common.gotIt; on the slip,
the closed statement where the rail was (kit NoticeBar) with "Follow the results" (followResults) → hub.

## MEDIUM
M1 · The ≥1280 summary panel slides under the top bar (slip-sw-1280-s2…s5, slip-sw-1920-s2, slip-zh-1280-s3): sticky top-5
(24px) under the 56px bar. FIX xl:top-[72px] (the market page aside's offset: 56 + 16); same in slip-ghost.tsx:51.
M2 · Classic shell: the gold Deposit coin collides with the pay rail (z-rail-sw-320, z-rail-en-360): the coin's crown rises
~18px into the rail; at sw 320 it touches "Jibu maswali 15"; the armed "Continue · TZS 1,000" (x 141–327 at 360) would sit
over it. FIX in the classic shell give the rail bottom padding of --rail-h − 65px so the coin rises into empty rail (the
journey shell unchanged).
M3 · The confirm sheet ignores the platform's fit rule: no max-h-[calc(100dvh-40px)] column with a scrolling body and pinned
footer (BetConfirmModal R4-I) — at 360×640 with low balance, and at 320×568 always, the commit and Cancel fall below the fold;
Cancel is md under an lg gold commit (the platform twins them at lg); no grab handle / kp-wsheet panel; a sheet only below
640 while the bet sheet uses sheetUntil="lg". FIX follow BetConfirmModal's structure exactly.
M4 · The low-balance block is not the platform's (P18 misses this box): a hand-rolled amber box (maswali-slip.tsx:447). FIX
Callout tone="info" glyph="alertCircle" title={t.journey.lowTitle} with the Millionea body; the door = the bet sheet's: gold
xl with I.wallet leading, I.chevronRight trailing, and the rails line.
M5 · Cost and picks hard to verify on the confirm (3a-confirm-360, z-confirm-lines): the price a muted body-sm line; all 15
picks the same white mono; numerals mix mono and sans. FIX a total row (label millionea.price, bold .amount at title-sm,
then the balance line); picks in side ink (--yes-300 / --no-300, BetConfirmModal's sideTone.fg; same in the 1280 panel);
every numeral mono (§T5).
M6 · The confirm's rule line has no subject (ruleShared is the hub's line under the figure; alone "Shared equally by every
10/10 ticket"). FIX a new key, no figure: en "Jackpot shared equally by every 10/10 ticket · {pct}% fee at payout"; sw
"Jackpot inagawanywa sawa kwa kila tiketi ya 10/10 · ada {pct}% wakati wa malipo"; zh "大奖由所有 10/10 彩票平分 · 派奖时扣除 {pct}% 费用".
M7 · Phones never show the price before 15/15 (only the 1280 panel has a Price row). FIX replace mainOnly with en "TZS 1,000 a
ticket · main balance only", sw "TZS 1,000 kwa tiketi · salio kuu pekee", zh "每张 TZS 1,000 · 仅限主余额".
M8 · "Answer all 15" is static and its refusal lands off-screen (the refusal box at the end of the list; the multi path says
it as a toast — one fact, two channels). FIX count down (en "Answer {n} more", sw "Jibu {n} zaidi", zh "还需回答 {n} 题");
tapping scrolls to and focuses the first unanswered question's radio; the `factual` toast as the single refusal channel;
the jump link moves focus too.
M9 · The multi-ticket controls are hand-rolled (draft-en-320, draft-zh-320): primary/ghost Buttons instead of the kit Tabs
variant="segmented" (role="group", aria-pressed, --pill-active); the active chip looks like a CTA beside the rail's; "Remove
ticket N" comes first, discards 15 answers with no confirm, and at 320 is four stacked rows; the multi confirm's <details> has
no family caret (.kp-hub__chev / .kp-menu-caret); on the multi stamp the eyebrow "Tiketi imekatwa" sits over "Tiketi 2
zimekatwa". FIX kit Tabs for the switcher; a kit ConfirmModal before removing a ticket that has answers; the family caret; the
multi stamp's eyebrow names product and week.
M10 · Danger refusals auto-dismiss (slip-client.tsx:225, ticket-acts.tsx:77 lack durationMs: 0); §F8 and the market bet's
refusal make a money-path refusal sticky. FIX add it.
M11 · The cancel confirm breaks the serial and the price (3b-cancel-confirm-{en,sw,zh}-{360,1280}): the serial breaks at its
hyphens ("MLN-" / "2026-W49-000041?"); TZS 1,000 not .amount; the medallion draws `warning` while the door draws rotateCcw;
zh eyebrow 确认 is 10px tracked (z-cancel-zh). FIX title en "Cancel this ticket?" / sw "Ughairi tiketi hii?" / zh "取消此彩票？"
with the serial as a mono nowrap first body line; body through moneyRuns; icon={rotateCcw}; extend ConfirmModal with a panel
class so it can carry kp-mln-zh. (Same as the tickets critic's M4 confirm — ONE fix for both surfaces.)
M12 · The whole slip re-renders every second (slip-client.tsx:123 useCountdown for a close days away; all 15 rows + keepFact
scans) — a code read; profile at 4× CPU. FIX one timeout at closesAt and a memoised row.
M13 · The loading ghost does not match the page (slip-ghost.tsx): no switcher box (~190px jump at 360), no rail, pill buttons
where the real ones use --r-md, top-5.

## LOW
- Pick feedback: on each pick the word jumps ~12px and gains weight/tracking (z-answered-row) → reserve the tick slot as
  language-row.tsx's kp-hub__tick; give the unchosen side the lit side's typography; the .btn hover lift sticks on touch →
  @media (hover: hover) as .kp-jcard__pick.
- Times without EAT: the slip head, confirm, stamp and cancel door print times with no zone (the Up & Down receipt says "HH:MM
  EAT").
- Row meta rhythm: rows alternate one/two meta lines (slip-sw-320-s2) → MaswaliFacts layout="phone".
- Reserves column offset: at ≥768 the reserves' YES/NO column sits 17px left of the mains' (slip-sw-768-s3, -1280-s3); at 1024
  the question-to-buttons gap is ~450px.
- Reserve rule repeated (rules box and reserves head); the reserves box composes inline wash and shadow over three elements
  instead of one .mat-inset surface (§M2).
- Rail inset by the page gutter reads as a floating card; the v6 frame docks it full-bleed.
- "Cancel" ambiguity: the purchase sheet's "Cancel" ("Ghairi") right under "Free cancel until…" ("Kughairi…").
- Stamp structure: facts a stacked subtitle where §3.7 and the Up & Down receipt use `details` rows; add "Payout · when the
  week settles"; the multi stamp's autoCloseMs={60_000} literal belongs in feedback-timing.ts.
- zh spacing mixed in "每周 10 张 · 这是第2张"; refusalIncompleteOne and jumpTo give "第A5题" — apply §D's one convention (and
  the 2026-10-19 ruling: zh ordinals unspaced "第{week}周").
- en wording "Cut ticket" / "Ticket cut" / "Cutting…" are calques — LEAD RULING: en "Buy ticket · {price}", "Ticket bought",
  "Buying…" (sw "Kata tiketi" and zh "出票" stay).
- Motion polish: meter segments fill with no transition; the armed button is an element swap (focus lost); switching tickets
  gives no cue.
- NoSlip: the ghost button labelled only "Maswali Millionea", no BackLink.
Known seen: P1 (the confirm's "Free cancel until 10:21"), P13, P18 (misses the low-balance box, the closed band and the
"Unanswered" chip).

## Already 10 — leave alone
The radio-group model (one Tab stop per question, arrows choose, labelled by number and text); one lit control per row in
side ink with the ghost on --border-control; 44px YES/NO targets with the 12px pair gap; the confirm → stamp sequencing (P1
fix); the .seal-commit stamp and the OperationResultModal family with reduced-motion branches; gold only on the armed commit
and the deposit door, brand Continue; idempotent request key and expectedOwnerId; focus and Enter rules (commit focus,
safeFocus, ✕ withheld in flight); fact lines never start with "·"; the draft kept per tab per week; the cancel's consequence
sentence and its Keep/Cancel pair.

## Notes
- The multi-slip drive at d1c5910f printed 4 FAILs and never finished (no summary, no tiles folder): most likely its first
  click (Q1) lands before hydration (Ticket 1 shows 14/15 with Q1 unanswered), cascading. The reducers in
  millionea-slip-draft.ts read correct. The drive needs a hydration wait and a re-run.
- Owed tiles: partial, refusal, last hour, closed, closed-just-now, low-balance confirm, in-flight, the NoSlip variants, the
  journey shell's rail, the ghost.
