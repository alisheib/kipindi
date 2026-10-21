# Critic round 1 — MOTION (all Millionea surfaces), at S5 head 8c468393b
Frames (CDP screencast, 40 ms samples "-fNN", coarse "-c-fNN", contact sheets "-SHEET.png", per-moment .json logs of
every animation/transition start, layout shifts, long tasks, view transitions):
- run 1: scratchpad\motion\frames\   - run 2: scratchpad\motion\frames2\   - scripts: scratchpad\motion\ (capture.mjs,
  capture2.mjs, lum.mjs, sum.mjs). Phones 360×780 touch, sw; desktop 1280 en; reduced motion, CPU×4 and a faked clock as
  separate passes. Dev build (a cold-load double entrance = StrictMode, not reported). M7 (rollover carry) judged from code
  + tile geometry; N2 played synthetically; N1 captured on How to play's example (same carry code).

Overall MOTION ≈ 5.5. Per surface/moment:
| Hub · route to the slip | 5 | skeleton → page jumps 210px; the classic cross-fade dims the chrome |
| Hub · countdown pill | 6 | pops in after hydration, pushes the buy block 56px |
| Hub · live pool update | 7 | jackpot tick correct; sales and pool rows change silently |
| Hub · rollover carry (M7) | 2 | starts 2,240px away, off screen |
| Hub · result arriving (N2) | 5 | the hub never presses |
| Slip · YES/NO pick | 6 | label jumps ~9.4px, check paints a frame late, fill and meter out of step |
| Slip · counts and meter | 8 | counts never roll ✓; segments snap while the control fades |
| Slip · refusal → recovery | 3 | rows shift ±25px under the finger; pay control jumps 165px |
| Slip · sales close while looking (M2) | 3 | the explanation plays off screen; the rail just vanishes |
| Confirm sheet · open/close | 9 | kit sheet, holds under CPU×4; docks only below 640 |
| Confirm → stamp hand-off | 3 | dim lifts; slip resets in the open; stamp fades in over it |
| Stamp · arrival / dwell / exit | 7 | arrival = the Up & Down receipt ✓; content empties on exit |
| Stamp → ticket | 4 | no progress bar; ~300ms flash of the site footer |
| Ticket · first view (N3 cut) | 2 | plays ~1,000px below the fold, then marked seen |
| Ticket · free cancel (N3 undo) | 2 | dialogs overlap; result torn down after ~0.3s; undo unseen |
| Ticket · results (N2) + live line | 7 | keyframe lawful; presses below the fold; count doesn't tick |
| Win seal (roll:false) | 9 | the platform's seal; amount lands final |
| How to play · example (N1) | 4 | line blanks a frame; token starts ~2× size; "ended" shown at start |
| Register | 10 | static document |
| Tickets list (code) | 9 | platform pills; card has no hover |
| Home / board card | 8 | no hover where every board card lifts |
| Tab label ink | 10 | still by ruling, verified |
| Reduced-motion parity | 7 | N-block and route entrance clamped ✓; hand-off flash; line blank |
| Perceived performance | 7 | sheet holds at CPU×4; "View ticket" gives no feedback |

ROUTING (lead): SLIP lane = H1, H2, H5, M1, M2, M3, M4, M6, M8 (the slip's pill), L4, L6 (gilt sheen + stamp strip), L7 ·
TICKETS lane = H3, H4, L2 (the ticket's live count tick) · HUB lane = H6, M8 (the hub's pill), L1, L2 (the hub press) ·
REGISTER/HOW lane = M5 · DOORS lane = L5 (already its M5) · PLATFORM = M7 (classic route transition) + the `.btn:hover`
touch fix of M1 — the S5-FIX-PLATFORM lane, contained or reported. The kit Modal `handoff`/`panelDelay` of H1 is the SLIP
lane's (first consumer), byte-identical for every caller that does not pass it (prove it like r5j 3.7.2's parity).

## HIGH
H1 · Confirm → stamp: the dim lifts, the slip resets in the open, the stamp fades in over it (known P1, partly fixed).
Frames frames2\cut-stamp2-sw-360-f05…f09 + SHEET; frames\cut-stamp-sw-360-f05…f08; frames\cut-stamp-en-1280-f05; reduced
motion frames2\cut-stamp2-rm-sw-360-f06/f07. The sheet exits over 0–140ms (.m-out); the stamp's dim, panel and crest start
only at +253ms (360), +274ms (360 after a refusal), +254ms (1280). From +160 to +240ms the bare slip is undimmed (rows
luminance 15.5 → 20.1) and still reads "Makuu 10/10 · Endelea · TZS 1,000" — that pay control is LIVE (a tap re-opens the
confirm with the same picks). At ~+240ms the answers clear (CLS 0.66 at 360); at +280–320 the stamp's half-opaque panel
collides with "NDIO/HAPANA / Jibu maswali 15"; at 1280 one frame shows the panel at "Main 0/10 · —" while rows still show YES
with "UNANSWERED"; reduced motion = a hard flash (header luminance 13.4 → 18.1 → 4.5). FIX keep one dim across the hand-off:
(a) kit Modal gets a `handoff` prop — a dialog opened in the same commit another closes starts its dim at full opacity (no
.m-scrim fade); the closing dialog drops its dim at once, its panel still plays .m-out; (b) slip-client.tsx opens the stamp
in the same commit the sheet closes and deletes the exitBeatMs("--t-quick") timer; the stamp panel's .m-dialog-in delayed by
var(--t-quick) (a `panelDelay` prop through OperationResultModal → Modal; the clamps zero it) — keeps P1's rule that two
panels are never up at once; (c) clear the answers in that same commit, under the dim; router.refresh() after the stamp
lands. The same handoff also fixes H4 and the classic market confirm → receipt (the platform keeps the page dim but overlaps
the two panels) — prove the platform flow too.
H2 · After a successful cut, the fresh slip shows a false refusal ("Tiketi haijakamilika · Maswali 15 hayajajibiwa…",
"HAIJAJIBIWA" on every row; en 1280 "UNANSWERED"). Frames frames\cut-stamp-sw-360-f07; frames\stamp-rest-sw-360 (after the
stamp's 5s auto-close); frames\cut-stamp-en-1280-f05. Cause: MaswaliSlip's `refused` survives the reset (its key draft.active
stays 0) whenever the player tapped "Jibu maswali 15" earlier. FIX key the slip on a purchase counter bumped in the landing
commit (key={`${cuts}-${draft.active}`}) or clear `refused` when the picks reset. (A real logic bug — guard it.)
H3 · The cut (N3) on the ticket's first view plays off screen and is consumed: frames2\ticket-geometry-sw-360.json puts the
perforation at document y 1,789 in a 780px viewport (~1,000px below); at 1280 y 1,771 in 900px; stamp-to-ticket-sw-360 shows
m-axis-reveal at +373ms (rect y1789) and maswali-cut at +580ms (y1808). TicketSeen marks the fact seen at mount; same for the
closing rule (M6) and N2 presses on clauses below the first screen. FIX trigger these on first intersection with the platform's
<Reveal> mechanism (components/layout/reveal.tsx: IntersectionObserver, fires once, state rendered by React) — a small
MaswaliOnView adding the moment's class when ≥50% of the stub is in view; unlike Reveal, keep playing on the `reduced` low-end
tier (the N-block plays there); under both clamps render the end frame; send the seen-mark only once played. (Same as the
TICKETS critic's M8 — one fix.)
H4 · Free cancel: the confirm and the result overlap, then the result is torn down: frames2\cancel-result-sw-360-f03/f04 (+49,
+96ms) "Ughairi tiketi…? / Inafanya kazi…" reading through "Tiketi imeghairiwa · Sawa"; at c-f07 (+218ms) the result is up; by
c-f08 (+378ms) gone, no exit (header luminance 3.1 → 22.3); reduced motion the same (cancel-result-rm-sw-360). Cause: the
result lives inside TicketCancel, which router.refresh() unmounts once the ticket is no longer cancellable; the stub's undo
(y1722) and the "IMEREJESHWA" reveal (y1908) play under the dim and off screen. FIX hoist the result into an island always
mounted on the ticket page (or keep TicketCancel mounted, only its button conditional); H1's handoff; the undo on view (H3).
H5 · Sales close while mid-slip: the explanation plays off screen (frames\slip-close-sw-360 SHEET, frames\slip-closed-rest-sw-360):
the band's m-axis-reveal plays at y −355 above the viewport; the rail removed in one frame with no .m-out; all 30 controls drop
to 0.45 at once — the Friday-rush moment. FIX (the plan's M2): reveal the closed band in the rail's sticky slot where the pay
control stood (.m-axis-reveal, --t-stage); the pay control leaves with .m-out (--t-quick); keep the top band for pages loaded
after the close. (Pairs with the SLIP critic's H6 — one design.)
H6 · The rollover carry (M7) starts off screen (code + tiles): HubPool carries from #mln-carried-figure (last week's row: on
hub-sw-360-s6.png at document y ≈ 2,750; the "carried in" row on hub-sw-360.png at y ≈ 510) — 2,240px in 340ms starting
~1,970px below the fold; rollovers are the common weekly case. FIX carry from the ROLLOVER notice's own amount at the top of the
hub (~150–300px above the target): CARRIED_FIGURE_ID on the notice's money run when notice === "ROLLOVER"; play only when both
ends are in the viewport. (Same as the HUB critic's M10.)

## MEDIUM
M1 · Pick feedback jumps (frames\pick-yes-sw-360-f00/f01/f02; samplers pick-yes, pick-no, pick-yes-en-1280): the word moves
107.3 → 116.7 (+9.4px; +9.7 at 1280); switching moves the NO label +8.2; weight 600→700 with tracking; the check glyph paints one
frame after the word moved (newly mounted sprite <use>); the fill fades 140ms linear while the meter segment and the count snap
at frame 0; on touch the tapped answer stays lifted 2px (.btn:hover transform at globals.css:1264 not limited to hover pointers).
FIX always render <I.check s={16}/> in the leading slot, `invisible` when unpicked; the meter segment takes the control's own
background var(--t-quick) linear; wrap the .btn:hover transform in @media (hover:hover) (platform — as L17 did for the fills).
M2 · The refusal and its "unanswered" marks shift the list and the pay control (refusal-sw-360: row q-4 518 → 543, CLS 0.035;
answer-after-refusal-sw-360: q-5 554 → 529 under the finger; arm-sw-360-f00→f01: the box vanishes and the rail + button jump up
~165px). FIX the bet sheet's rule: the refusal line stands directly above the button it explains (kp-bsheet__footer) — put the
refusal and its "Nenda kwenye swali 1" link inside the rail; mark an unanswered row in its existing eyebrow line ("MICHEZO ·
HAIJAJIBIWA") so the row never changes height (adds to P18).
M3 · The stamp empties as it leaves (frames2\stamp-to-ticket-sw-360-c-f02 at rest vs c-f03 mid-exit: serial and facts gone;
panel 570 → 476, CLS 0.088; same on the 5s auto-close cut-stamp2-auto-sw-360). Cause: setCut(null) before the exit beat. FIX keep
the last cut for the exit, as the bet-sheet host does with lastView ("only a drawing survives the kit's exit beat").
M4 · "Tazama tiketi" gives no progress (no NavProgress in any stamp-to-ticket log; hub → slip completes its bar at +80ms; the bare
slip shows ~1.2s, c-f04…c-f10, dev). FIX window.dispatchEvent(new Event("50pick:navigating")) before router.push in the stamp's
onPrimary (rule F10; as market-card.tsx:476).
M5 · How to play's example (N1): how-carry-sw-360-f02 — at +30ms every socket is blank (line luminance 40.2 → 17.5), same under
reduced motion (how-carry-rm-sw-360-f01); at f03 the token starts 47px vs a 24px end size (the origin measured is the annex
column); "↪4" shown from t0; "Mfano umeisha" and "Rudia" appear at the tap and the button collapses 294×60 → 72×44. FIX drop
key={run} and pass a run counter into MaswaliCarry's effect deps; measure the annex glyph (#…-aN > :first-child) so --carry-s =
0.75; show "↪4" with .g-settle, and the label and status, on the carry's animationend (at once under the clamps). The scale and
"↪4" fixes apply to real tickets too (MaswaliCarry is shared — the TICKETS lane consumes; the REGISTER/HOW lane owns How's call).
M6 · Hub → slip jumps 210px when the loading skeleton is replaced (hub-to-slip-sw-360-f08 skeleton title bar y≈170 → f10 real
title y≈380). FIX slip-ghost.tsx draws the slip's first band, the ticket-drafts card (mat-flat, a label bar and two
--h-control-md pills) and the rail below 1280, as its own comment promises. (Same as the SLIP critic's M13.)
M7 · Classic route changes (platform, felt on Millionea): the root View Transition dims the chrome (rail luminance 32 → 24.4 at
+120ms hub → slip; the lit Millionea tab 58.9 → 47.8 at +200–240ms on tab-nav-en-1280); leaving the deep-scrolled slip shows the
site footer for ~300ms before the ticket (frames2\stamp-to-ticket-sw-360-c-f11/f12, CLS 1.0) — the scroll reset runs only inside
the transition's callback. FIX classic takes the journey's path (R4-J): the CSS entrance on the content wrapper, the scroll reset
before paint (RouteTransition's own note says the transition never captures the previous page anyway). → S5-FIX-PLATFORM:
fix if contained, else report as a platform item with its proof.
M8 · The countdown pill pops in (hub-pill-appear-sw-360: "Tiketi zako…" 178 → 234, CLS 0.049); the slip's rail grows 85 → 105px
when its compact pill wraps (slip-pill-sw-360). FIX seed the hook from the server: useTickSeconds(closesAt, serverNow, true,
serverNow) (its seedNowMs), and reserve the pill's place in the close line or the rail's counts row.

## LOW
L1 pool rows change silently (a real sale changed sales and pool 41,000 → 42,000 at +2.69s, pool-tick-sw-360) → .m-tick on each
changed ledger value (key each dd on its value).
L2 no press on the hub (N2 never presses there; SM3 says "ticket or hub") → a client wrapper that presses on a committed change
(GlyphSwap's pattern) + .m-tick keyed on resultsIn for the ticket's live count.
L3 dead lock-line moment (M2's .m-seal never plays: momentsOf never sets lock, no "close" fact) → add the fact or delete the
branch. (= TICKETS L14.)
L4 sheet width: MaswaliSlipConfirm is a sheet only below 640 while the bet sheet and wallet use sheetUntil="lg" → sheetUntil="lg".
L5 card hover: the Millionea board card has no hover (market cards lift −2px with a brand ring over --t-base/--m-glide;
frames2\card-hover vs mcard-hover-en-1280) → pointer-only hover; the How-to card's border hover on the journey home. (= DOORS M5.)
L6 platform items on Millionea's path: .gilt-metal:hover's sheen fires on a touch tap of the commit (shimmer-gilt at the press) →
@media (hover:hover); the stamp's strip keeps draining under reduced motion (rAF-driven) → hold it at scaleX(1) when
motionReduced(), as the toast (E-269).
L7 pick latency under throttle: at CPU×4 (dev) a pick's first visual change came 755ms after the tap (a 553ms long task); every
pick re-renders all 15 rows → measure on a production build; memo SlipRow if it costs more than a frame. (= SLIP M12.)
Notes for other critics: the win seal's eyebrow reads "MADAU YAMEFANIKIWA" (the platform's bet words) for a ticket → Millionea's
own eyebrow (TICKETS lane); any 7-digit amount wraps "TZS / 1,234,500" at 360 (win-seal-mln-rest-sw-360) → keep an amount whole
(TICKETS lane; check every Millionea amount at 320/360).

## Already 10 — leave alone
The N-block as written (N1–N3: tokens only — --t-move/--t-base, --m-settle/--m-glide, --sp-2, --m-tilt, stagger capped at four,
individual translate/scale, both reduced-motion branches; N2 measured 220ms, 8px along −14°, 40ms stagger, 1.02/0.98 press);
the confirm sheet's own rise and exit (kit .m-sheet-in/.m-out, steady at CPU×4); the stamp's arrival (identical to the Up & Down
receipt: dim 220ms, m-dialog-in 340ms, seal-place 520ms); the win seal with roll:false; the tab ink (0 animations, 0
transitions; hover and lit brighten in place); reduced-motion clamps on the N-block, the route entrance, the sheet and
NavProgress; things with no motion by design (the week strip, the register, counts that never roll).
