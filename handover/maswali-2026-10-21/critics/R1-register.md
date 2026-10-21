# Critic round 1 — the Week register (index + week page) and How to play
Only Week 48 (VOIDED) is in the week-page tiles; settled / no-10/10 / sunset judged from code and the v6 P-register-*
artboards. Crops: scratchpad\critic-register\zoom\ (how-sw-320-s3-sold, how-sw-360-s2-sold, how-sw-360-s2-button,
how-1280-main4, week-en-1280-tablehead).

Scores (Player · UI/UX · Visual · Motion · Copy):
| Register index, weeks listed | 7 | 8 | 8 | 10 | 7 |
| Register index, empty (launch day, code) | 5 | 6 | 6 | 10 | 6 |
| Week page, VOIDED (Week 48 tiles) | 5 | 6 | 6 | 10 | 6 |
| Week page, SETTLED with winners (code) | 5 | 6 | 6 | 10 | 6 |
| Week page, SETTLED with no 10/10 (code) | 6 | 6 | 6 | 10 | 7 |
| Week page, sunset week (code) | 4 | 6 | 6 | 10 | 5 |
| How to play | 6 | 6 | 5 | 6 | 6 |
| Loading / error, both routes | 10 | 10 | 10 | 10 | 10 |

## HIGH
H1 · A voided week never says why, and How to play never teaches the rule (register-week-sw-320-s7/-s8, -360-s8,
-1280-s3/-s4 + en/zh: mains 1–6 "batili", A1–A5 NDIO above, then "Wiki imebatilishwa" with no reason; how-*: neither the
four steps nor the rules state MR-18; regSubRule states only the substitution). FIX (a) regSubRule gains the void clause: en
"…from A1 to A5. If more main questions void than there are valid reserves, the whole week is void and every ticket is
refunded." / sw "…kuanzia A1 hadi A5. Maswali makuu batili yakizidi akiba halali, wiki nzima inabatilishwa na kila tiketi
inarejeshwa." / zh "……按 A1 至 A5 的顺序。若作废的正选题多于有效备选题，整周作废，每张彩票均退款。" (b) the log's closing line gets its
counts (the ticket view computes voidedMains and usableReserves — move that count into the register read model): en "Week
voided: {mains} main questions void, only {reserves} valid reserves" / sw "Wiki imebatilishwa: maswali makuu {mains} batili,
akiba halali {reserves} tu" / zh "整周作废：{mains} 道正选题作废，仅有 {reserves} 道有效备选题". (c) How to play gets the rule: en "More main
questions void than valid reserves? The whole week is void and every ticket is refunded {price}, with no fee." / sw "Maswali
makuu batili yakizidi akiba halali, wiki nzima inabatilishwa na kila tiketi inarejeshwa {price}, bila ada." / zh
"若作废的正选题多于有效备选题，整周作废，每张彩票退款 {price}，不收费用。" (sw verb per §D: "inarejeshwa" family; one verb everywhere.)
H2 · The commitments become public only after the results, and "Audit chain" leads nowhere useful: millioneaRegister /
millioneaRegisterWeek serve final weeks only and the hub prints no hash, so the question-set hash (MR-13: published at the
open) and the ticket root (published at the close) are first visible after the results; the root is printed without its
close time and ticket count (MR-13 publishes all three; closedAt is in the read model, never rendered); /fairness has no
Millionea section (§10c commitment row; MR-13 "published on /fairness") yet the register's last link "Audit chain › / Msururu
wa ukaguzi ›" (register-week-*-s4/-s5) opens /fairness, whose table lists Yes/No markets only.
**LEAD RULING:** (1) show the two commitments the moment they are stamped: serve /millionea/register/[week] for OPEN, CLOSED and
RESOLVING public weeks with ONLY the commitments, the questions and confirmed outcomes (the delivery's P-register-week-open /
-live / -check-window frames; money only once final), the index lists the current week with its chip; AND print the
question-set hash (and the root once closed) in the hub's week section. (2) The root line: en "Fixed {when} · {n} tickets" /
sw "Zimefungwa {when} · tiketi {n}" / zh "锁定于 {when} · {n} 张彩票". (3) Millionea rows on /fairness are S6's (MASWALI-PLAN S6
"Fairness…") — NOT in S5: remove the "Audit chain" link from the register in S5 (the lead records the /fairness rows as owed by
S6, which restores a link to the row's anchor).
H3 · Money split across lines and letter-spaced inside ledger labels: how-sw-320-s3 "TIKETI 300 KWA TZS / 1,000", how-sw-360-s2
"TIKETI 1,050 KWA TZS / 1,000", how-en-360-s2 "1,050 TICKETS AT TZS / 1,000" (§A5, S5-VIS A1: How's WorkedLedger passes a plain
string where the register uses kept(sold, ticketSalesRuns(sold, price))); every amount inside a label ("…KWA TZS 1,000", "KILA
TIKETI IMEREJESHWA TZS 1,000", register-week-sw-768-s8) takes ReceiptRow's uppercase micro label with 0.14em tracking (§M4:
money is never letter-spaced); labels are verb-phrase sentences styled as eyebrows (§T4 / DG-A-14; at 320 sw the floor label
takes three lines). FIX extend the kit ReceiptRow with a sentence-case label variant (body-sm, no tracking) — as the
delivery's ledger and the rules pages' RulesTable row labels draw; extend, don't fork; nouns as labels, detail as a note line
(noted() exists); every amount an .amount run ("Ticket sales — 30 × TZS 1,000 — TZS 30,000"); ONE helper for How and the register.
H4 · A result cannot be checked from the page: (a) the source is plain text (sourceLabel(q.sourceDomain)) while /fairness links
every source (<a href={sourceUrl} target="_blank" rel="noopener noreferrer"> + I.ext) and q.sourceUrl is in the read model;
(b) the resolution criterion (q.criterion, en/sw/zh, in the read model) appears on no Millionea surface (MB-33: "criteria and
sources"); (c) "Afisa · Afisa wa matokeo" is a constant (q.sealerRole ? t.millionea.officerRole : "—") on all 15 — it can never
say two officers or corrected on objection (officerRoleDisputes unused) while /fairness prints One officer / Two officers /
Corrected on objection (signoffWord) with shieldcheck / users / flag; (d) the week's legal line (w.resolution computed, never
rendered) is missing (the win ledger prints it: resSingleOfficer / resTwoOfficer). FIX the source = /fairness's link; the
criterion a muted body-sm line under each question; the attested cell = time + signoffWord(t.common, …) with /fairness's
glyph, per question (expose a per-question sign-off in the read model); drop the Officer field/column; the legal line once
under the questions.
H5 · The ledger does not reconcile visibly: every row the same weight and hairline (ROW = border-b); the top-up comes after the
fee and levies ("Pool 300,000 … Fee −130,000 … TRA … GBT … Top-up 700,000": the money that made the jackpot appears after it
was spent); "÷ k winning tickets" before "To winners" (How and the win ledger reverse it); the floor row never mutes (plan
§10.1: when real money passes the floor, the floor line drops to muted) — in the void week it sits at full ink between pool
and refunds (register-week-sw-768-s8), same in a no-winner week. FIX the kit's receipt vocabulary (divider + emphasis="total",
as the withdraw confirm's bottom line) to print MR-26's identity as two matching totals: "Money in / Pesa iliyoingia / 资金流入"
= carried in + sales + top-up; "Money out / Pesa iliyotoka / 资金流出" = fee + paid + carried (void week: refunds + carried
again) — read both from the settlement's ledger group; row order carried in → sales → top-up → Jackpot → fee
(formatTzsSigned, amber) → one muted levies line with amounts → To winners → ÷ k → remainder → carried forward; the floor
emphasis="muted" whenever it did not bind; ONE row list for the register, How's two examples and the win ledger.

## MEDIUM
M1 · The week page has no answer at the top (head = name, chip, two hashes; money starts ~4,300px down at 320, tile s8; closedAt
and settledAt never rendered). FIX under the chip the index row's own weekFacts(t, w); en "Sales closed {when} · Settled
{when}" / sw "Mauzo yalifungwa … · Ilikamilika …" / zh "销售截止于 … · 结算于 …" (a voided week prints no void instant); show the
week code (MLN-2026-W48); consider the ledger before the questions.
M2 · The 15 questions are not scannable (below 1024 each a five-row label/value list ~225px at 320/360 sw → ~3,300px; at 768
values use < half the width, register-week-sw-768-s3; from 1024 the question sits on the cell's second line while source,
event, attested and outcome are on the first, week-en-1280-tablehead). FIX the ticket's clause grammar (maswali-ticket.tsx, the
delivery's cards): category eyebrow → question → criterion → "Tukio 28 Nov, 09:00 · nbc.co.tz ↗" (the hub's eventAt +
/fairness's source link) → stamp, sign-off and time → void reason (~110px per card); in the table, the category under the
question as a muted meta line so every first line shares a baseline.
M3 · Which ten questions counted is invisible (stand-ins only in the log; voided mains and unused reserves look like any row).
FIX the ticket's grammar per row: a voided main "→ A1" with I.standIn, its number struck in --text-muted, I.void; the reserve that
stood in "↳ 4"; unused reserves in a settled week notUsed. Icons per §10c (standIn, reserve, void, carry, refund, commitment,
register — all in I; the pages draw only chevronRight today).
M4 · Content runs the full 1016px from 1024 (ledger labels x149, figures x1131: register-week-sw-1280-s4, -1920-s4; How's rule
lines ~170 characters, how-sw-1920-s3; the example's sockets ~100px apart, how-sw-1920). FIX ledgers and How's example + worked
ledgers at max-w-receipt (560, the ticket's tier) so the example is drawn exactly as a real ticket; prose at /fairness's
max-w-[68ch].
M5 · The 56px right lane (ledger pr-[56px] xl:pr-3, standing list pr-[56px]: dividers and figures stop 56px short from 320 to
1279 — register-week-sw-320-s8, -768-s8, -1024-s4 — sw labels wrap to three lines): a second home for a platform rule (the
Needle's rest logic already keeps clear of text: needle-rest.ts, the host's census); How's identical ledger has no lane and the
chat button sits over "TZS 1,050,000" in how-sw-768. FIX remove the lane; if a resting Needle/chat bubble still covers
right-aligned .amount text, fix it once in the census (⚠ needle-rest.ts is platform — coordinate with the lead; note
test:needle-rest is currently red on S5 and being diagnosed).
M6 · How to play leaves out two facts a first visit needs: the guaranteed floor in words; where a win is paid (MR-27). FIX step 3
uses the hub/card headline (atLeast + ruleShared): "Jackpot at least {floor} · shared by every 10/10 ticket · {pct}% fee at
payout"; add a rule: en "A win is paid into your main balance when the week settles" / sw "Ushindi unalipwa kwenye salio kuu
wiki ikikamilika" / zh "中奖金额在本周结算时计入主余额".
M7 · The example shows the end state, the void is invisible, and the button is dead with motion off: main 4 drawn as a green
check like the other nine; its strike (<s className="decoration-border-strong"> on a 10px digit) ~2.2:1 (#3049A4 on #07075D)
under §A1's 3:1 (how-1280-main4); under reduced motion (motionClamped()) the tap moves nothing yet the button flips to "Replay"
and "Example ended". FIX render the before frame (main 4 shows the void mark and "Batili", A1 on standby); the tap moves to the
after frame (teaches with or without N1); under reduced motion the same tap swaps by GlyphSwap (N1's ruled fallback, §M8a item 1).
M8 · How to play ends on one link ("Daftari la wiki ›", how-*-s4/-s5; on phones the hub is inside More). FIX <MillioneaReadingLinks
t={t} how={false} hub /> (the week page's own call).
M9 · The sunset week contradicts itself (code; delivery P-register-week-sunset-360-sw): basis and winningScore computed, never
rendered; a final week paid on 9/10 reads "2 tickets won" above a standing list that ends at 0 tickets without a miss. FIX add the
existing sunsetScore / sunsetScoreOne line ("Highest score this week: 9 of 10 · 2 tickets") to the head and the ledger.
M10 · No way in from a ticket; the carries have no chain (no ticket/receipt links to its week's register page; registerWeekHref
used only by hub, register, /results; "Carried in from Week 41" / "Carried forward to Week 43" plain text, P9). FIX "Week 48 in the
register ›" beside the receipt's legal line (ReceiptCard, maswali-win-ledger.tsx, the ticket page — the TICKETS lane's files:
the lead routes it there); once P9 gives real codes, link both carry rows to those weeks' pages (the delivery's history section).
M11 · The index does not say what it is, and its empty state is the default box (no intro while /fairness opens with one; W45 then
W48 with no word about 46/47; launch day = <EmptyState title={regEmpty} /> default compass, no body, no action, centred 360px under a
left-aligned heading — PV-03; /results' identical empty state passes fill; "No week has been settled yet" excludes voided weeks).
FIX an intro at max-w-[68ch]: en "Every Maswali Millionea week appears here once its results are final: the fifteen questions with
their sources and outcomes, how each was attested, and every shilling — sales, fee, top-up, winners and what carried on. No player
is named." / sw "Kila wiki ya Maswali Millionea inaonekana hapa matokeo yake yakishakuwa ya mwisho: maswali kumi na tano pamoja na
vyanzo na matokeo yake, jinsi kila tokeo lilivyothibitishwa, na kila shilingi — mauzo, ada, nyongeza, washindi na kilichohamishiwa
mbele. Hakuna mchezaji anayetajwa." / zh "每个 Maswali Millionea 周在结果确定后于此公示：15 道题目及其来源与结果、每个结果的认证方式，以及每一笔资金——销售、
费用、补足、中奖者与滚存。不显示任何玩家。" (adjust "once its results are final" if H2's ruling lists the live week too: say live weeks
show their questions and commitments, money once final); <EmptyState fill kind="fairness" body=… action={<EmptyStateLink
href="/millionea">…}>; regEmpty en "No week is final yet." / zh "尚无已确定的周。" (sw already right).
M12 · The commitments card dresses sentences as eyebrows ("SETI YA MASWALI IMECHAPISHWA 23 NOV, 00:01" a verb clause in 10px caps, its
date upper-cased; zh adds "（哈希）", en/sw don't). FIX the eyebrow a noun (the stub's stubHash: "Question set" / "Seti ya maswali" /
"题目集"; "Tickets at the close" / "Tiketi wakati wa kufunga" / "截止时的彩票"); then the hash; then a muted body-sm line "Published {when}" /
"Fixed {when} · {n} tickets"; I.commitment on the root; once H2 makes it true one explainer: en "Both were published before the first
result. Change one question or one ticket and its fingerprint no longer matches." / sw "Zote mbili zilichapishwa kabla ya tokeo la
kwanza. Ukibadilisha swali moja au tiketi moja, alama yake haitalingana tena." / zh "两者均在首个结果公布前发布。任何一道题目或一张彩票被改动，其指纹都将不再匹配。"

## LOW
L1 a no-10/10 index row drops "no 10/10" (the hub's lastWeekRolled says it) → settledRollover + feeZero.
L2 WeekStateChip paints SETTLED with STATUS_TONE.VOID.player (against §B11) → Millionea week SETTLED/VOIDED rows in
STATUS_TONE_EXCEPTIONS with the plan's reason (IMEKAMILIKA is never gilt). (Coordinate: the HUB lane extends WeekStateChip to every
state — ONE chip.)
L3 the index row is written twice → one WeekRow in register-parts.tsx replacing the copies in register/page.tsx and
results/millionea-results-view.tsx (⚠ the results view is the DOORS lane's — the lead routes the call-site swap).
L4 two zh words for "officer": the register 认证人 (§D) vs /fairness 审核员 — LEAD RULING: keep Millionea's §D word 认证人; do not
change /fairness in S5; list for Gate B.
L5 two names for one window — LEAD RULING: the platform's words everywhere: en "Objection window", sw "Dirisha la pingamizi", zh
"异议窗口" (S5-FIX-PLAYER applies it in P6).
L6 two sw nouns for the floor: topUp "Nyongeza ya dhamana" vs "Kiwango cha chini kilichohakikishwa" and How's "…hadi kiwango cha
chini" → "Nyongeza hadi kiwango cha chini".
L7 two rules worded differently across surfaces: the reserve rule has three wordings (slip reserveRule, How howTwo, register
regSubRule) → open with the slip's sentence; the cap reads "per player per week" on How but "a week" on the slip → one phrase.
L8 "Question 1 void" beside "Week voided" → "Question 1 voided" / "Swali 1 limebatilishwa" / "第1题已作废".
L9 zh digit spacing mixed ("派奖前有24小时复核期" vs "购买后 5 分钟内") → Millionea's spaced convention (digit/Han spaced; ordinals
unspaced "第{week}周", the 2026-10-19 ruling).
L10 the example button wraps at 360 sw ("…ya swali / 4", how-sw-360-s2), enabled by .btn.kp-mln-example-button forking the kit
Button → "Show the swap" / "Onyesha ubadilishaji" / "演示替补", drop the override.
L11 carry rows inconsistent at zero ("Carried forward again in full · TZS 0" shows while "Carried in" hides at 0) → show or hide both
(hide at 0 unless the week's identity needs it: decide by the in/out totals of H5).
L12 timeline order on How → the week timeline right after the four steps.
L13 How has no responsible-play line (the Yes/No rules page has §9) → one rule: limits, Pumzika and Jizuie cover Millionea, with the
footer's "Weka mipaka" link.
L14 the example is an unannounced 10/10 ticket → say so (or, calmer, give it one miss).
L15 missing headings: How's example and worked ledgers, the week page's commitments have aria-labels but no h2.
L16 one meaning drawn two ways: How's eyebrow text arrow "4 → A1" while the standIn glyph sits two rows below.
L17 licence basis and the rules chooser (/legal/rules still says "two products", MR-32) — Ali's call / S6: NOT S5; listed.
L18 the register table has no panel (/fairness and RulesTable sit on glass-panel).
Known items: P3 (+ the register's row order reversed: ÷ k before "To winners"), P4 (H5's totals remove it), P6 (the register week page
is a second site: regCheck exists, never rendered; the delivery prints "Muda wa ukaguzi {from} → {to}" in the log — use the L5 ruling's
words), P7 (How's timeline), P9 (+ link the carry rows, M10), P11 (cause: fig(-w.fee) via formatTzs → "TZS −136,500"; the no-winner "Fee"
row too), P14 (Refunded: regRefunded "imerejeshewa", refundEachIfVoid "itarejeshewa" vs refundEach "imerejeshwa"; Carry: regCarried,
carriedOut, carriedForwardAgain, lastWeekRolled, settledRollover, rolloverNotice "imeletwa mbele" vs howFour "linahamishiwa").

## Already 10 — leave alone
Public and gated correctly (server-rendered, works without JS, no personal data — roles never names, counts never tickets; the gate
first; the 404 and its title identical for a hidden product); no gold on the register or How (neutral .amount; the fee only the
receipt's amber); honesty guards ("Every ticket refunded" only once refunds landed; the week-void log line untimed rather than
invented; every figure the settlement's own column; How's examples priced by settleArithmetic from the frozen rules, dropped rather than
bent); the outcome stamp (platform outcomeWord, neutral ink, no N2 press on the public record); table semantics (admin-tbl, scopes, a
rowgroup head for the reserves, a labelled ScrollX, ol/dl cards); earlier visual-pass fixes R1, R2, R6, R7; zh typography (keep-all
scoped to kp-mln-zh, 12px untracked zh eyebrows, U+200B phrase breaks); loading/error ghosts from each page's own bands, RouteError's
way back to the hub; How's demo plays only on tap, never auto-plays, keeps no seen key.
