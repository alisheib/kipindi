/**
 * HOW LONG A MOMENT STAYS ON SCREEN — the dwell times, in ONE place.
 *
 * The law these serve is `docs/DESIGN_AUTHORITY.md` **§F**. This file is the definition
 * site (§0d): a duration a MOMENT chooses deliberately lives here, never as a literal at a
 * call site. `6_000` was written out at FOUR call sites — the Up & Down announcer twice and
 * the long-form poller twice — which is four chances to disagree about how long a player is
 * given to read that their money settled.
 *
 * ⚠️ THE PRIMITIVES KEEP THEIR OWN GENERIC DEFAULTS, and that is not a second definition.
 * `toast.tsx`'s `DEFAULT_DURATION` and `operation-result-modal.tsx`'s
 * `DEFAULT_AUTO_CLOSE_MS` answer *"nobody said, so pick something sane"*. The constants
 * below answer *"this moment is worth exactly this long"*. Different questions.
 *
 * ── THE RULE THAT ORDERS THEM ────────────────────────────────────────────────────────
 * ⭐ **THE MORE A SURFACE INTERRUPTS, THE LESS UNATTENDED TIME IT GETS.**
 * A celebration is a centred modal behind a scrim — it takes the screen, so it may not
 * linger uninvited. A result toast sits in the corner and blocks nothing, so it can afford
 * to wait longer for a player who is mid-scroll. Hence `CELEBRATION < RESULT`, which looks
 * backwards until you notice it is measuring *cost to the player*, not importance.
 *
 * ⛔ EVERY ONE OF THESE IS A CEILING ON WAITING, NEVER A FLOOR ON WATCHING. Dismissal is
 * instant and always available — the celebration takes ✕, click-outside and Esc; a toast
 * takes ✕, an up-swipe or a horizontal swipe. Nothing here delays a player who has seen it.
 * (Ali's standing instruction, 2026-08-15: *"always keep the ability to hide instantly as
 * it is now"*.)
 *
 * ⛔ AND NONE OF THIS APPLIES TO A FAILURE. A money-path refusal is `durationMs: 0` —
 * sticky until dismissed — because a player must be able to read why nothing happened. Not
 * a dwell time; the absence of one.
 */

/**
 * The WIN celebration — the struck seal, the gilt figure, the count-up.
 *
 * **7s.** Raised from 4.5s on 2026-08-15 (Ali: *"more time … for users to feel excited …
 * not to annoy"*). The old figure was tighter than it looked: the amount counts 0 → value
 * over ~900ms, and the modal needs ~400ms to arrive and the eye to land, so of 4.5s only
 * about **3.2s** was spent looking at the final number. Budgeted honestly — arrive 0.4s,
 * count 0.9s, read the figure and the market line 1.6s, absorb ~2s, reach for a control
 * ~1s — the moment wants ~5.9s, and 7s carries that with headroom.
 *
 * ⛔ NOT LONGER. Past ~8s an undismissed overlay stops being a moment and becomes an
 * obstruction, which is the "annoy" half of the same instruction — and on a licensed
 * real-money product a celebration that overstays is the reinforcement pattern §C5 and §H1
 * already forbid in their own channels. 7s is the largest number that is still a beat.
 *
 * ⚠️ Wins QUEUE, so the worst case is bounded by `MAX_INDIVIDUAL` (3) in
 * `win-celebration.tsx`, not by this value: past three the tail collapses into one honest
 * summary. Without that cap this raise would have turned a weekend backlog into ~2½ minutes
 * of modals.
 */
export const DWELL_CELEBRATION_MS = 7_000;

/**
 * A settled RESULT — won, lost, or voided — announced in the corner.
 *
 * **8s.** Raised from 6s on 2026-08-15, and it is longer than the celebration on purpose:
 * a toast blocks nothing, so waiting costs the player nothing, and a player mid-scroll may
 * take a second or more just to notice it.
 *
 * ⭐ **A LOSS TAKES THE SAME 8s AS A WIN, DELIBERATELY.** They are one channel and one
 * class of event, and §F exists precisely to stop two actions of the same kind answering
 * differently. Giving a win longer than a loss would be the platform leaning on the outcome
 * it prefers — which `docs/DESIGN_AUTHORITY.md` §C4 forbids in as many words: losses are
 * *calm, factual, final*. The extra seconds here are READING time, not dwelling time, and
 * they cut the right way for harm prevention: the LCCP standard behind "Bet lost · TZS X"
 * is that a loss must actually register, not that it must pass quickly.
 * ⚠️ VOID keeps the same value for the same reason — a refund is neither good news nor bad,
 * and timing it differently would editorialise a neutral outcome.
 */
export const DWELL_RESULT_MS = 8_000;

/**
 * ⭐ E-166 · THE HANDOVER HOLD — how long an Up & Down result stands alone before the surface
 * says what comes next, and (on the round page) before it moves the player there.
 *
 * **2.5s.** It is the shortest dwell in this file and the only one that is not a ceiling on an
 * overlay, so it is worth saying what it actually measures: not *"how long may this stay"* but
 * *"how long is this the only thing on screen"*. A chain emits a round every few minutes for
 * ever; the round that just settled has to be readable before the next one takes the surface.
 *
 * ⛔ IT LIVES HERE, WITH THE OTHER TWO, BECAUSE IT HAS TO BE READ AGAINST THEM. A winner's
 * celebration is `DWELL_CELEBRATION_MS` (7s) behind a scrim, which is **2.8× this hold** — so
 * on the face of it the handover would fire while the seal was still up. It does not, and the
 * reason is structural rather than numeric: the celebration is a kit `<Modal>`, `<Modal>` calls
 * `useModalLock`, and the auto-advance defers to exactly that lock. ⚠️ **Which means these two
 * numbers are only independent while that stays true.** If a celebration ever renders without
 * the kit's lock, a winner is navigated off their own seal at 2.5s — and the person who makes
 * that change will be looking at this file, not at `updown-handover.tsx`.
 *
 * ⛔ AND IT IS DELIBERATELY SHORTER THAN EVERYTHING ELSE HERE. The successor is already open by
 * a measured **median 91.5 seconds** when the result lands (`handover-gap-census.cjs`, n=1,203),
 * so the player is late to the next match before the hold even starts. A generous hold here is
 * not generosity — it is betting time taken from them. 2.5s is a comfortable read of the outcome
 * line and the payout beside it, and no more.
 *
 * ⚠️ The hold is owed from when the SCREEN learned the result, not from `resolvedAt` — see
 * `useHoldAnchor`. Anchoring it to the server's stamp made it expire before the player saw
 * anything, which is a hold that exists in the code and nowhere else.
 */
export const DWELL_HANDOVER_HOLD_MS = 2_500;

/**
 * ⭐ A ROUTINE CONFIRMATION — "that worked", nothing earned, nothing to read twice.
 *
 * The two constants below are the OTHER end of the ladder from the three above. A
 * settlement is news the player did not ask for and may have missed; a routine
 * confirmation answers a tap they just made, while their eye is still on the control
 * they pressed. It needs long enough to register and no longer — the acknowledgement is
 * the point, not the dwelling.
 *
 * ⛔ THEY LIVE HERE FOR THE SAME REASON THE OTHER THREE DO. Both were written out as
 * literals at their call sites, which is the defect §F8 already records re-accumulating:
 * a duration a MOMENT chose deliberately, typed as a bare number, is invisible to anyone
 * comparing it against the moment beside it. `2000` and `3000` say nothing about each
 * other at a call site; named and filed together they state a ladder.
 *
 * ⭐ AND THEY OBEY THE SAME INTRUSION RULE — the blocking surface gets LESS unattended
 * time than the corner one, exactly as `DWELL_CELEBRATION_MS < DWELL_RESULT_MS`. The
 * admin confirmation is a centred `<Modal>` over the screen an officer is working on; the
 * bet-placed toast blocks nothing. So 2s < 3s is not an accident of two independent
 * guesses — it is the same law applied one rung down.
 */

/**
 * The admin ActionOverlay's SUCCESS card — "Approved", "Published", "Saved".
 *
 * **2s.** An officer is mid-queue and already looking at the dialog they opened; the card
 * confirms and gets out of the way so the next item can be worked. It is the shortest
 * dwell on the platform because it is the most interruptive surface with the least to
 * read: an eyebrow, a title, and a subtitle the officer wrote the inputs for.
 *
 * ⛔ FAILURE IS NOT TIMED AND MUST NEVER BE. The error card is `autoCloseMs` UNSET —
 * sticky until dismissed — because an officer must be able to read why a money operation
 * did not happen. Same rule as a player-facing refusal, one desk over.
 * ⚠️ This is NOT the `<OperationResultModal>` default (`DEFAULT_AUTO_CLOSE_MS`, 5s). That
 * default answers *"nobody said, so pick something sane"*; this says *"this moment is
 * worth exactly this long"*. Different questions — see the header note.
 */
export const DWELL_ADMIN_RESULT_MS = 2_000;

/**
 * A placed Up & Down bet, announced in the corner.
 *
 * **3s.** Ali's standing instruction on the 2026-08-15 retune was *"keep placing bets
 * popups normal"* — the settlement dwells were lengthened and this one was deliberately
 * NOT. It is also the value that made the toast viable at all: the toast had been removed
 * because it piled up on rapid taps, leaving four quiet channels a sighted player does not
 * notice, so a real bet was silent while a FAILED one shouted. The pile-up was a DURATION
 * problem; 3s is the answer to it. Longer and rapid taps stack again; shorter and the tap
 * that placed money is a flicker.
 *
 * ⛔ NOT A CEILING ON READING — a refusal on this same path is `durationMs: 0`, sticky
 * until dismissed. Only the good news is timed.
 */
export const DWELL_BET_PLACED_MS = 3_000;
