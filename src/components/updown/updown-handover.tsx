"use client";

/**
 * ⭐ E-166 · THE AUTO-ADVANCE — round N ends, round N+1 takes the screen.
 *
 * Ali, 2026-08-19: *"No reload, no dead end."* `/updown/[roundId]` was the true dead end of this
 * product: `refreshCadence({settled:true})` returns `{enabled:false}`, so the moment a round
 * settled the page froze — a dead `00:00` under "Round settled", the header word "Resolved", and
 * nothing that would ever change again until the player reloaded by hand.
 *
 * This component does ONE thing: it decides when it is safe to move the player, and moves them.
 * It renders nothing.
 *
 * ── THE FOUR GATES, and every one of them exists because the alternative is hostile ──────────
 *
 * 1 · ⛔ **IT ONLY FIRES ON AN OBSERVED SETTLE.** A player who deliberately opens an old round —
 *     from their history, a permalink, a shared link, the wallet's receipt row — must NOT be
 *     thrown forward to a game that has nothing to do with what they came to read. So the first
 *     render SEEDS: if the round was already settled when this mounted, this component will
 *     never navigate, for the whole life of that mount. Only `unsettled → settled` while the
 *     player is watching counts. Same contract as `updown-result-announcer.tsx`, deliberately —
 *     two rules for "did the player watch this happen" is two chances to disagree.
 *
 * 2 · ⛔ **IT WAITS OUT THE HOLD.** `handoverClock` reports `hold` for `HANDOVER_HOLD_MS` after
 *     the result lands — anchored by `useHoldAnchor` to the instant THIS SCREEN learned it, not
 *     to the server's `resolvedAt`. The result is the thing the player has been waiting ~91
 *     seconds for; taking it off screen the instant it appears is worse than the dead end.
 *     ⚠️ Measured before that anchor existed: the redirect fired **155ms** after the result
 *     rendered, because the poll delivered a `resolvedAt` that was already 11 seconds old and
 *     the hold read as spent. The hold has to be owed from when the PLAYER saw it.
 *
 * 3 · ⛔ **IT DEFERS TO ANY OPEN OVERLAY.** A modal or sheet mid-flight is a player part-way
 *     through a decision, and half of the decisions on this page are about money. Navigating
 *     under an open stake sheet would carry a typed amount onto a DIFFERENT round's pool —
 *     which is the money-surface version of the UD-17 mis-tap this product already guards
 *     against with `tapGuard`. Detected from `document.body.style.overflow === "hidden"`, which
 *     is exactly what `useModalLock` sets and clears for every portaled overlay in the kit, so
 *     this cannot drift from the modals it protects: there is one lock and this reads it.
 *     ⚠️ It DEFERS, it does not cancel. The moment the overlay closes the handover resumes.
 *
 * 4 · ⛔ **IT DEFERS WHILE A REQUEST IS IN THE AIR.** A bet submitted a heartbeat before the
 *     handover must be allowed to land and be reported on the page that owns it. `use-quick-bet`
 *     publishes `data-ud-busy` on `<body>` while a place is pending — the SAME hook the board
 *     card and this page's stake panel both bet through, so there is one flag and no surface
 *     can forget to raise it.
 *
 * 5 · ⛔ **IT DEFERS WHILE THE PLAYER IS READING.** Past `SCROLL_DEFER_PX` they have deliberately
 *     scrolled off the header — into the price hero, the pool, or the settlement proof, which is
 *     the trust artefact this whole page exists for. Replacing the page under someone mid-sentence
 *     is the same discourtesy as yanking their result away, one screen further down.
 *     ⚠️ It DEFERS, it does not cancel, and it is not a dead end while it defers: the handover bar
 *     is pinned at the top of the content with an explicit way forward. Scroll back and the next
 *     clock tick (≤1s) takes them.
 *
 * ── AND THE NAVIGATION ITSELF ────────────────────────────────────────────────────────────────
 *
 * `router.replace`, never `push`. A chain emits a round every few minutes for ever, so `push`
 * would build a back-stack of dead rounds and the back button would walk the player backwards
 * through them one at a time instead of returning them to wherever they came from. `replace`
 * keeps Back meaning "out of Up & Down".
 *
 * ⛔ THE RESULT IS NOT STOLEN. The new URL carries `?from=<oldRoundId>`, and the round page
 * renders a compact last-round strip from it — so a player who just WON sees their result on
 * the new screen, with a link back to the full proof. The old URL stays valid for ever; nothing
 * here deletes or hides anything.
 *
 * ⚠️ NO MOTION LIVES HERE. A route change is the framework's own transition (NavProgress already
 * paints it), and adding a second animation on top would be a new easing this product does not
 * have. The pod's cross-fade is in the pod; this file only decides *when*.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { handoverClock } from "@/lib/updown-card-phase";
import { useServerNow, useHoldAnchor } from "./round-countdown";

/**
 * ⛔ HOW FAR DOWN COUNTS AS "READING" — a named constant, not a number in a condition.
 *
 * 120px is just past the round header and the handover bar, so it is the first scroll that can
 * only have been deliberate: below it the player is in the price hero, the pool, or the
 * settlement proof. ⚠️ It is deliberately SMALL. The cost of deferring when they were not really
 * reading is one extra second and a visible "go to it"; the cost of NOT deferring when they were
 * is the page vanishing mid-sentence, which is the discourtesy this whole feature is about.
 */
const SCROLL_DEFER_PX = 120;

export function UpDownHandover({
  roundId,
  settled,
  settledAtMs,
  successorRoundId,
  successorOpensAtMs,
  chainRunning,
  serverNowMs,
  labels,
}: {
  /** The round being LEFT — it becomes the `?from=` the next page renders its strip from. */
  roundId: string;
  settled: boolean;
  settledAtMs: number | null;
  successorRoundId: string | null;
  successorOpensAtMs: number | null;
  chainRunning: boolean;
  serverNowMs?: number;
  /** The sentence for each phase, plus the link text. Translated on the server. */
  labels: { live: string; counting: string; waiting: string; unavailable: string; go: string };
}) {
  const router = useRouter();
  // ⛔ THE SAME SERVER-ANCHORED CLOCK THE POD RUNS ON (E-72). `Date.now()` alone is the device
  // clock, and a handset minutes out would advance a player while the server still calls the
  // round open — the screen and the money path disagreeing about the only deadline that matters.
  //
  // ⛔ AND THIS ONE IS NOT GATED, DELIBERATELY — do not "optimise" it into `useServerNowGated`
  // the way the board card and the pod were. Those two only need a render when their PHASE
  // moves; this component needs a fresh `now` in its dependency list **every second**, because
  // the effect below re-tests the five deferral gates on each one. Gates 3, 4 and 5 are the
  // whole reason: an open modal, a bet in flight and a player who has scrolled into the proof
  // all DEFER rather than cancel, and it is precisely this per-second re-evaluation that picks
  // the handover back up "the next clock tick (≤1s)" after the modal closes or they scroll
  // back. Gate it and a deferred handover would never resume.
  // ⚠️ It costs one interval no longer: `useServerNow` now rides the page's single shared
  // ticker (`@/lib/use-shared-second`) instead of arming a private `setInterval` plus its own
  // `visibilitychange` listener. The cadence and the reveal-recompute are unchanged.
  const now = useServerNow(serverNowMs);

  /** null until the first render has seeded. `true` ⇒ it was ALREADY settled when we arrived. */
  const arrivedSettled = useRef<boolean | null>(null);
  /** One navigation per mount, whatever the render count. */
  const fired = useRef(false);

  useEffect(() => {
    if (arrivedSettled.current === null) arrivedSettled.current = settled;
  }, [settled]);

  // ⛔ ONE RULE, SHARED WITH BOTH PODS. Re-deciding "is the next match live" here would be a
  // third copy of a question the board card and the round pod already answer, and the three
  // would drift the first time the hold changed.
  // ⛔ AND ONE HOLD ANCHOR, for the same reason and a sharper one: if this component's hold
  // ended before the pod's, the page would navigate while the ticker was still counting.
  const holdAnchor = useHoldAnchor(roundId, settled, settledAtMs, now);
  const hand = handoverClock({
    state: settled ? "resolved" : "confirming",
    settledAtMs: holdAnchor,
    successorExists: successorRoundId != null,
    successorOpensAtMs,
    chainRunning,
    nowMs: now ?? 0,
  });
  const visible = now != null && settled && hand.phase !== "none" && hand.phase !== "hold";

  useEffect(() => {
    if (fired.current) return;
    if (now == null) return;                       // pre-hydration tick — no clock yet
    if (arrivedSettled.current !== false) return;  // gate 1 · seeded, or arrived already settled
    if (!successorRoundId) return;                 // nowhere to go, by definition
    if (!hand.ready) return;                       // gate 2 · the hold, and "is it actually open"

    // gate 3 · an overlay is up. ⚠️ `useModalLock` locks BOTH <html> and <body>; reading body is
    // enough and is the one it sets on every path.
    if (typeof document !== "undefined") {
      if (document.body.style.overflow === "hidden") return;
      if (document.body.dataset.udBusy === "1") return;   // gate 4 · a request is in flight
    }
    // gate 5 · the player has scrolled into the detail and is reading. ⚠️ Checked AFTER the
    // overlay gate on purpose: `useModalLock` freezes the page at `scrollY`, so a modal opened
    // low down would otherwise be read as "scrolled" and the two gates would say the same thing
    // twice while one of them was guessing.
    if (typeof window !== "undefined" && window.scrollY > SCROLL_DEFER_PX) return;

    fired.current = true;
    // Tell NavProgress a navigation started, exactly as every other programmatic push here does.
    window.dispatchEvent(new Event("50pick:navigating"));
    // ⛔ `replace`, not `push` — see the header. ⛔ And `from` is the round we are LEAVING, never
    // one we were ourselves handed from: across a chain of handovers the strip must always
    // describe the result the player just watched, not one two rounds old.
    router.replace(`/updown/${successorRoundId}?from=${encodeURIComponent(roundId)}`);
  }, [now, hand.ready, successorRoundId, router, roundId]);

  if (!visible) return null;

  const sentence =
    hand.phase === "live" ? labels.live
    : hand.phase === "counting" ? labels.counting
    : hand.phase === "waiting" ? labels.waiting
    : labels.unavailable;

  return (
    /**
     * ⭐ E-166 · ONE `aria-live` STATEMENT ON THIS PAGE, NOT TWO (§7.8).
     *
     * `updown-result-announcer.tsx` speaks at T+0 — the celebration or the plain factual toast.
     * This speaks at T+HOLD, 2.5 seconds later, because `handoverClock` reports `hold` until
     * then and this element is not rendered during it. The hold is therefore not only a reading
     * beat for the eye; it is what SEQUENCES the two announcements so a screen reader hears
     * *"you won TZS 2,400"* and then *"the next match is already under way"*, rather than both
     * regions firing into each other.
     *
     * ⛔ `polite`, never `assertive`. The result is the assertive one; this is context.
     * ⛔ AND IT MUST EXIST AT ALL. Without it the page would navigate under a screen-reader user
     * with no warning — worse than the dead end, not better.
     *
     * ⚠️ Visible on every branch, not only when the redirect is deferred. When auto-advance
     * fires this bar is on screen for the moment between the hold ending and the route
     * changing; when it is deferred (an open modal, a request in flight, or a player who
     * arrived at an already-settled round) it is the permanent, honest statement plus the way
     * out. `m-in` is the kit's arrival, `--t-move` on `--m-settle`, clamped by all three
     * reduced-motion gates.
     */
    <div
      role="status"
      aria-live="polite"
      className="m-in flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3.5 py-2.5"
      style={{
        background: "var(--bg-inset)",
        border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
        borderRadius: "var(--r-md)",
      }}
    >
      <span className="text-[12px] leading-[1.45] text-text-muted">{sentence}</span>
      {/* ⛔ Only when there is somewhere real to go — `ready` is true solely when a successor
          ROW is open, so this can never point at a round that does not exist.
          ⛔ And it wears the KIT's ghost button, the same control the board card offers this
          action with. Two surfaces offering one action must not offer it in two shapes, and a
          bare coloured word does not read as pressable (`test:ui-consistency`'s
          `bare-text-button`, whose own finding was a destructive control that looked like a
          label). An anchor rather than a `<Button>` because this one is a real navigation and
          must keep middle-click, "open in new tab" and a copyable address. */}
      {hand.ready && successorRoundId && (
        <a
          href={`/updown/${successorRoundId}?from=${encodeURIComponent(roundId)}`}
          className="btn btn-ghost btn-sm inline-flex items-center gap-1 font-mono uppercase tracking-[0.08em]"
          style={{ color: "var(--brand-300)", fontSize: 10.5 }}
        >
          {labels.go}
        </a>
      )}
    </div>
  );
}
