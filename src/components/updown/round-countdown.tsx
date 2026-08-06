"use client";

import { useEffect, useState } from "react";
// E-104 · the pod derives its phase from the SHARED rule, with a live clock the server cannot give it.
import { resultClock } from "@/lib/updown-card-phase";

/**
 * Seconds remaining until `targetMs`, ticking client-side.
 *
 * ⚠️ Returns `null` until the first client effect runs, and callers render `--:--` for
 * that tick. Seeding the state from `Date.now()` — the obvious implementation — reads
 * the clock ONCE on the server during SSR and AGAIN on the client, so the two disagree
 * by however long the response took and React throws a hydration mismatch. (It did;
 * this is the fix, not a precaution.) A countdown is inherently client-only state and
 * must not participate in the server render.
 *
 * Lives here rather than inside the card so the card and the round detail page share
 * ONE implementation — two countdowns drifting apart by a second reads as broken.
 */
export function useCountdown(targetMs: number, serverNowMs?: number): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    // ⛔ ANCHOR TO THE SERVER'S CLOCK WHEN WE HAVE IT (E-72).
    //
    // `Date.now()` is the DEVICE clock, and a handset running 40 seconds fast showed a
    // different countdown to the player standing beside it — on a 3-minute round that is a
    // fifth of the game, and it decides whether the Up/Down buttons look live. Worse, the
    // server settles against ITS clock, so a fast device would show time remaining on a round
    // whose bets `buyPosition` has already refused: the screen and the money path disagreeing
    // about the only deadline that matters.
    //
    // The offset is captured ONCE, on mount, against the instant the server rendered — not
    // re-measured per tick, which would make the digits jitter by the network latency.
    const offset = serverNowMs != null ? serverNowMs - Date.now() : 0;
    const compute = () => Math.max(0, Math.floor((targetMs - (Date.now() + offset)) / 1000));
    setLeft(compute());
    const id = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(id);
  }, [targetMs, serverNowMs]);
  return left;
}

/** `--:--` on the server tick, so the markup is identical on both sides. */
export function mmss(s: number | null): string {
  return s == null ? "--:--" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * ⭐ E-104 · THE CURRENT INSTANT, ANCHORED TO THE SERVER, TICKING.
 *
 * 🔴 WHY IT EXISTS, caught by watching a real round settle on production (2026-08-05,
 * `udr_8bd25a9f786ea498f132`): at the close the pod read a **dead `00:00` under a live
 * "Result in" caption for 14 seconds**, then jumped to `01:18`. The countdown to the CLOSE
 * ran out, and the phase did not change until the next poll arrived with a fresh server
 * render.
 *
 * ⛔ THIS IS E-82's DEFECT AT THE NEXT BOUNDARY. `roundPhase`'s own header already says it:
 * *"the instants do not go stale, so the phase is derived from them"* — but the round page
 * derived `awaitingResult` from `round.state`, a value rendered ONCE on the server. A phase
 * decided by a prop cannot change without a round trip; a phase decided from instants changes
 * by itself, on the tick, which is what a countdown hitting zero has to do.
 *
 * ⛔ SERVER-ANCHORED, never `Date.now()` alone. A device clock can be minutes out (this
 * campaign's own laptop is 94s slow, E-81) and would put the player in a different phase from
 * the server — the screen and the money path disagreeing about the only deadline that matters.
 * Returns `null` before the first client effect, exactly as `useCountdown` does, so the server
 * and client render the same markup.
 */
export function useServerNow(serverNowMs?: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const offset = serverNowMs != null ? serverNowMs - Date.now() : 0;
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverNowMs]);
  return now;
}

/**
 * D3 round-detail countdown POD — the boxed readout in the round header: 28px tabular
 * digits with the label beside them, in the kit's inset-pod chrome. Open rounds tick
 * live and pulse rose in the final 30s (reduced-motion turns the pulse off); once closed
 * it shows a static 00:00 in `--text-subtle`. Same shared hook as everywhere else.
 */
export function RoundCountdownPod({
  closesAtMs, isOpen, label, serverNowMs, resultMode = false,
  roundClosesAtMs, resultTargetMs = null, settled = false, resultLabels,
}: {
  closesAtMs: number; isOpen: boolean; label: string; serverNowMs?: number;
  /**
   * ⭐ E-104 · THE BOUNDARY, so the pod can enter the result phase BY ITSELF.
   *
   * 🔴 Without these the phase came from `round.state`, a server-rendered prop, and the pod
   * showed a **dead `00:00` for 14 seconds** at the close on production while it waited for the
   * next poll. Given the boundary, the measured target and the settled flag, the pod decides
   * from the instants on every tick — and the transition is instant, with no round trip.
   * ⛔ Omit them and the component behaves exactly as before (the board card passes its own
   * phase in), so this is additive, not a rewrite of every caller.
   */
  roundClosesAtMs?: number;
  /** The measured result instant, or null when the asset is under the sample floor (A-5). */
  resultTargetMs?: number | null;
  settled?: boolean;
  /** Captions for the phases the pod can now enter on its own. Translated on the server. */
  resultLabels?: { resultIn: string; awaiting: string; settled: string };
  /**
   * ⭐ E-99 · this clock is counting to the RESULT, not to a deadline the player can act on.
   * Two consequences, and both are deliberate:
   *   · it inks BRAND, not white — "something is coming", not "hurry";
   *   · when it runs out it shows `—:—`, never `00:00`. The estimate is a MEDIAN, so about
   *     one round in ten legitimately overruns it (p90 116s vs ~92s median). A zeroed clock
   *     reads as "this should have happened and didn't"; `—:—` reads as "we've stopped
   *     counting", which is the truth, and it keeps the calm `confirming` contract.
   */
  resultMode?: boolean;
}) {
  // ⭐ E-104 · DERIVE THE PHASE FROM THE INSTANTS, ON THE TICK. `now` is null until the first
  // client effect, so the server render is untouched and hydration matches.
  const now = useServerNow(serverNowMs);
  // ⛔ ONE RULE, NOT A SECOND COPY. `resultClock` already decides "are we waiting for a price,
  // and is there an honest instant to count to" — it is pure precisely so it can be reached
  // from a suite, and re-deriving it here would create the two-definitions drift §0 exists to
  // stop. The only thing this component adds is a LIVE `nowMs`; the server can only ever supply
  // a stale one, which is the whole defect.
  const clock = roundClosesAtMs != null && now != null
    ? resultClock({
        state: settled ? "resolved" : "confirming",
        closesAtMs: roundClosesAtMs,
        expectedResultAtMs: resultTargetMs,
        nowMs: now,
      })
    : null;
  const pastClose = clock?.awaiting === true;
  // The pod only takes over once it is genuinely past the boundary; before that the caller's
  // phase stands, which is what keeps this additive for the board card.
  const inResult = pastClose || resultMode;
  const target = pastClose ? (clock!.targetMs ?? roundClosesAtMs!) : closesAtMs;
  const caption = pastClose && resultLabels
    ? (settled ? resultLabels.settled : resultTargetMs != null ? resultLabels.resultIn : resultLabels.awaiting)
    : label;

  const left = useCountdown(target, serverNowMs);
  const running = (isOpen || pastClose) && (left == null || left > 0);
  // ⛔ Never urgent in result mode: `confirming` is CALM by design, and rose here would tell a
  // player something is wrong at the exact moment the platform is working correctly.
  const urgent = !inResult && isOpen && left != null && left > 0 && left <= 30;
  // ⛔ `—:—`, NEVER a dead `0:00`. Past the boundary with no measured target — or past a target
  // that has been overrun — we say we have stopped counting, which is the truth. This branch is
  // now reached the INSTANT the boundary passes rather than at the next poll.
  const spent = inResult && !running;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)", borderRadius: "var(--r-md)" }}>
      <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">{caption}</span>
      <span
        className={urgent ? "ud-count-pulse" : undefined}
        style={{
          fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700,
          fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em", lineHeight: 1,
          color: urgent ? "var(--no-300)"
            : inResult && running ? "var(--brand-300)"
            : running ? "var(--text)" : "var(--text-subtle)",
          // ⛔ THE LADDER, NOT A TYPED NUMBER (E-113's ratchet). This was `240ms ease`, exempted
          // only because another session was live in this directory — a SCHEDULING exemption,
          // never a design one.
          // ⚠️ `--t-base` (220ms) is the NEAREST rung, chosen to preserve the behaviour rather
          // than to re-tune it. The ladder's own semantics would argue for `--t-flick` (a colour
          // change travels nowhere), but 240 → 90 is a feel change on the clock that tells a
          // player their last seconds are running out, and that is the design pass's call to
          // make deliberately — not a side effect of a token migration.
          transition: "color var(--t-base) var(--m-glide)",
        }}
      >
        {spent ? "—:—" : (isOpen || pastClose) ? mmss(left) : "00:00"}
      </span>
    </div>
  );
}

/**
 * The countdown as a standalone readout — used on the round detail page, where the
 * card's full countdown band would be redundant but the player still needs to see how
 * long is left. Same hook, same digits, same urgency rule as the card.
 */
export function RoundCountdown({ closesAtMs, label }: { closesAtMs: number; label: string }) {
  const left = useCountdown(closesAtMs);
  const running = left == null || left > 0;
  const urgent = left != null && left > 0 && left <= 30;
  return (
    <div className="text-right">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{label}</div>
      <div
        className={urgent ? "ud-count-pulse" : undefined}
        style={{
          fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700,
          fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em", lineHeight: 1.1,
          color: urgent ? "var(--no-300)" : running ? "var(--text)" : "var(--text-subtle)",
        }}
      >
        {mmss(left)}
      </div>
    </div>
  );
}
