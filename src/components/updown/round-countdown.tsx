"use client";

import { useEffect, useRef, useState } from "react";
// E-104 · the pod derives its phase from the SHARED rule, with a live clock the server cannot give it.
// E-166 · and the same for the HANDOVER, so board and round page cannot describe one settle differently.
import { resultClock, handoverClock } from "@/lib/updown-card-phase";
// ⭐ ONE TIMER FOR THE WHOLE PAGE. Every clock below used to arm its own `setInterval`; they now
// share a single wake-up and each applies its own server offset to it. See the file header there
// for what that costs a low-end handset and what it deliberately does NOT change.
import { subscribeSecond, secondsUntil } from "@/lib/use-shared-second";

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
  return useTickSeconds(targetMs, serverNowMs, true, null);
}

/**
 * The engine under `useCountdown`, with the two knobs only a leaf digit component needs.
 *
 * `enabled` — a branch that is showing `—:—` is not counting anything, and used to keep a timer
 * armed to prove it. Disabled, this subscribes to nothing.
 *
 * `seedNowMs` — ⛔ WHAT MAKES A LEAF SAFE TO REMOUNT. The board card keys its digits on the
 * PHASE, so every phase change remounts them; a countdown that starts at `null` would paint one
 * frame of `--:--` in the middle of the kit's dip-and-land before the first effect ran. Seeded
 * with the instant the parent already holds, the very first paint of a remounted leaf is the
 * right number. `null` on the server and on the first client render, so hydration still matches.
 *
 * ⚠️ `useCountdown` passes `true, null` — i.e. exactly the behaviour it had before this split.
 * Neither knob changes anything for an existing caller.
 */
export function useTickSeconds(
  targetMs: number,
  serverNowMs: number | undefined,
  enabled: boolean,
  seedNowMs: number | null,
): number | null {
  const [left, setLeft] = useState<number | null>(() =>
    enabled && seedNowMs != null ? secondsUntil(targetMs, seedNowMs) : null,
  );
  useEffect(() => {
    if (!enabled) return;
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
    // ⛔ STILL A DERIVATION, NEVER A DECREMENT. The shared ticker says *when* to recompute; the
    // remainder is re-derived from the server-anchored instant on every one of them, which is
    // what keeps this stale-proof by construction across a throttled or skipped tick.
    const apply = (raw: number) => setLeft(secondsUntil(targetMs, raw + offset));
    apply(Date.now());
    return subscribeSecond(apply);
  }, [targetMs, serverNowMs, enabled]);
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
    // ⭐ E-166 · RECOMPUTE THE MOMENT THE TAB COMES BACK, and never trust elapsed ticks.
    //
    // 🔴 Chrome throttles `setInterval` in a hidden tab — to roughly once a minute, and it may
    // not fire at all for the first stretch. Measured in the handover E2E: a backgrounded round
    // page sat on a settled round for nine seconds without advancing, because the ONE thing
    // driving every phase in this file is this clock, and this clock had stopped.
    //
    // ⛔ THE FIX IS TO RE-READ THE INSTANT, NOT TO COUNT THE TICKS. `tick()` recomputes from
    // `Date.now() + offset` — the server-anchored absolute instant — so a tab that was hidden
    // for twenty minutes lands on the correct phase on its first frame back, with no catch-up
    // and no accumulated drift. Counting missed intervals would be the accumulation this whole
    // subsystem is built to avoid (`boundaryAfter`'s "derived, never accumulated").
    //
    // ⚠️ A hidden tab is DELIBERATELY left to drift. The handover navigates a page the player is
    // looking at; moving one they are not is pointless work on the low-end Android over 2G, and
    // this listener is what makes it correct the instant they look again.
    // ⛔ THE LISTENER STAYS THIS HOOK'S OWN, and is deliberately NOT folded into the shared
    // ticker's reveal set. `red:updown-handover` mutates exactly this statement to `void
    // onVisible;` to prove the recovery is real; a shared reveal-broadcast behind it would keep
    // the clock recovering after the mutation, and the proof would go quietly green over a
    // clock that no longer works. A guard whose RED cannot fail is not a guard.
    // ⚠️ THE **INTERVAL** IS SHARED, which is where the cost was: one 1s wake-up for the page
    // instead of one per clock per card. Cadence, anchor and recovery are all unchanged.
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    const stop = subscribeSecond(tick);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisible); };
  }, [serverNowMs]);
  return now;
}

/**
 * ⭐ E-166 · WHEN DID **THIS SCREEN** LEARN THE RESULT — the instant the handover hold is owed
 * from.
 *
 * 🔴 THE DEFECT THIS EXISTS TO FIX, found while writing the E2E for the hold and not by any
 * suite. The hold was anchored to the server's `resolvedAt`, which is correct about the ROUND
 * and wrong about the PLAYER. A surface does not learn of a settle at `resolvedAt`; it learns
 * of it on its next poll — up to 5s later on the round page and up to 20s later on the board.
 * By then `now − resolvedAt` already exceeds a 2.5s hold, so the player would have seen their
 * result and been moved off it **in the same paint**. The hold would have existed in the rule,
 * passed its unit tests, and done nothing whatsoever for the person it is for.
 *
 * ⛔ AND THE OBVIOUS FIX IS THE OTHER DEFECT. Anchoring to the mount, or to "now" on the render
 * that first shows a settled round, restarts the hold on every `router.refresh()` — and the
 * poller fires those constantly, so the ticker would appear and vanish for ever. That is the
 * failure `handoverClock`'s own header warns about.
 *
 * ⭐ SO IT IS STAMPED EXACTLY ONCE, PER ROUND, ON THE OBSERVED TRANSITION — the same contract
 * `updown-result-announcer.tsx` uses to decide whether a result is news: the first render
 * SEEDS and never stamps, and only `unsettled → settled` while mounted counts.
 *
 *   · observed the settle here → the stamp, so the player gets the whole hold;
 *   · arrived already settled  → `resolvedAtMs`, which is old, so no hold is owed. They did not
 *     watch the result land, and holding a screen they opened deliberately is not a courtesy.
 *
 * ⛔ SERVER-ANCHORED like every other clock in this file: the stamp is taken from the same
 * offset `useServerNow` applies, never from `Date.now()` raw, so it is comparable to the
 * server's own `resolvedAt` on a handset whose clock is minutes out (E-72).
 */
export function useHoldAnchor(
  roundId: string,
  settled: boolean,
  resolvedAtMs: number | null,
  /** The SERVER-ANCHORED current instant — `useServerNow`, never `Date.now()`. Null pre-hydration. */
  nowMs: number | null,
): number | null {
  /** roundId → the instant THIS mount first saw that round settled. Written once, never again. */
  const stamps = useRef<Map<string, number>>(new Map());
  /** roundId → what we knew before. `undefined` = never seen, i.e. this render is the seed. */
  const seen = useRef<Map<string, boolean>>(new Map());

  // ⛔ STAMPED DURING RENDER, NOT IN AN EFFECT — and this is the whole correctness of the hook,
  // paid for by the E2E on the first run.
  //
  // 🔴 The first version stamped in a `useEffect`. Effects run AFTER the commit, so on the very
  // render where `settled` first flips true the stamp did not exist yet and the hook fell back
  // to `resolvedAtMs` — an instant already ~11 seconds old by the time the poll delivered it.
  // The hold therefore evaluated as ALREADY SPENT on exactly the render it exists to govern, and
  // the auto-advance fired **155ms after the result appeared**, measured. The result flashed and
  // the player was gone. A hold that is computed one commit too late is not a hold.
  //
  // ⚠️ Writing a ref during render is safe HERE and only here: the write is keyed, idempotent and
  // guarded by `has()`, so a StrictMode double-invoke keeps the first value and nothing outside
  // this hook observes it. It is the same shape as `useState`'s lazy initialiser.
  const prev = seen.current.get(roundId);
  if (prev === undefined) {
    // SEED. A round this mount has never heard of is recorded, never stamped — otherwise opening
    // an already-settled round would hold a result the player did not watch arrive.
    seen.current.set(roundId, settled);
  } else if (settled && prev === false && nowMs != null && !stamps.current.has(roundId)) {
    // THE OBSERVED TRANSITION. Exactly once, on the render that first carries the result.
    seen.current.set(roundId, true);
    stamps.current.set(roundId, nowMs);
  }

  if (!settled) return resolvedAtMs;
  return stamps.current.get(roundId) ?? resolvedAtMs;
}

/**
 * D3 round-detail countdown POD — the boxed readout in the round header: 28px tabular
 * digits with the label beside them, in the kit's inset-pod chrome. Open rounds tick
 * live and pulse rose in the final 30s (reduced-motion turns the pulse off). Same shared
 * hook as everywhere else.
 *
 * ⚠️ THIS COMMENT USED TO END *"once closed it shows a static 00:00 in `--text-subtle`"*, and
 * that was both a description and a defect: E-99's rule 3 is **never a dead `0:00`**, and the
 * settled branch was the one place it survived — measured on production 2026-08-19. Past the
 * close the pod now shows `—:—` when nothing is counting, and once the handover facts are
 * supplied it becomes the ticker for the round that follows (E-166).
 */
export function RoundCountdownPod({
  closesAtMs, isOpen, label, serverNowMs, resultMode = false,
  roundClosesAtMs, resultTargetMs = null, settled = false, resultLabels,
  handover, handoverLabels,
}: {
  closesAtMs: number; isOpen: boolean; label: string; serverNowMs?: number;
  /**
   * ⭐ E-166 · THE HANDOVER'S SERVER FACTS. Given these the pod stops saying "Round settled"
   * over a dead `00:00` and becomes the ticker for the round that follows.
   * ⛔ Omit them and the pod behaves exactly as it did before — additive, not a rewrite.
   */
  handover?: {
    /** Which round this is — the key the hold stamp is kept under. */
    roundId: string;
    /** The server's `resolvedAt`. `useHoldAnchor` decides what the hold is actually owed from. */
    settledAtMs: number | null;
    successorExists: boolean;
    successorOpensAtMs: number | null;
    chainRunning: boolean;
  };
  /** Captions for the four handover phases, translated on the server. */
  handoverLabels?: { counting: string; live: string; waiting: string; unavailable: string };
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
  // ⚠️ NOT GATED, AND THAT IS DELIBERATE — see the note on `useServerNowGated`'s call site in
  // `updown-card.tsx`. This pod is ONE instance on a page, its whole body is a caption and a
  // number, and its per-second render is the cheapest thing on the screen; the board card is
  // 60 elements × N cards, which is where the gate earns its complexity. What the pod DOES get
  // is the shared ticker underneath `useServerNow` and `useCountdown` — three private intervals
  // become three subscriptions to the page's one.
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

  // ── ⭐ E-166 · THE HANDOVER, from the SAME shared rule the board card uses ────────────────
  //
  // 🔴 WHAT IT REPLACES on this exact pod, read off production 2026-08-19 for round
  // `udr_038998ddaeb0ab9b950f`: **`Round settled  00:00`** — a dead zero under a settled
  // caption, with the poller already disabled behind it, so the page was final until a manual
  // reload. E-99's rule 3 says never a dead `0:00`; this branch is where that stopped being
  // true, because `spent` requires `inResult` and a SETTLED round never entered it.
  // ⛔ THE HOLD IS OWED FROM WHEN **THIS SCREEN** LEARNED THE RESULT, not from `resolvedAt` —
  // see `useHoldAnchor`. The poll can be 5s late, and a hold measured from the server's stamp
  // would already be spent by the time the player first sees the outcome.
  const holdAnchor = useHoldAnchor(
    handover?.roundId ?? "", settled, handover?.settledAtMs ?? null, now,
  );
  const hand = handover && now != null
    ? handoverClock({
        state: settled ? "resolved" : "confirming",
        settledAtMs: holdAnchor,
        successorExists: handover.successorExists,
        successorOpensAtMs: handover.successorOpensAtMs,
        chainRunning: handover.chainRunning,
        nowMs: now,
      })
    : null;
  const inHandover = hand != null && hand.phase !== "none" && hand.phase !== "hold";

  const left = useCountdown(target, serverNowMs);
  // ⛔ UNCONDITIONAL, like every hook here: the handover's own digits count to their own
  // instant, and `hand.counting` decides whether they are shown at all.
  const handLeft = useCountdown(hand?.targetMs ?? closesAtMs, serverNowMs);
  const running = (isOpen || pastClose) && (left == null || left > 0);
  // ⛔ Never urgent in result mode: `confirming` is CALM by design, and rose here would tell a
  // player something is wrong at the exact moment the platform is working correctly.
  const urgent = !inResult && isOpen && left != null && left > 0 && left <= 30;
  // ⛔ `—:—`, NEVER a dead `0:00`. Past the boundary with no measured target — or past a target
  // that has been overrun — we say we have stopped counting, which is the truth. This branch is
  // now reached the INSTANT the boundary passes rather than at the next poll.
  const spent = inResult && !running;
  // ⭐ E-166 · past the hold, the pod is the handover ticker. The BOX does not move: same flex
  // row, same padding, same 28px digits — only the caption and the digits cross-fade, which is
  // what makes it read as one object changing state rather than a component being swapped.
  const handCaption = !inHandover || !handoverLabels ? null
    : hand!.phase === "counting" ? handoverLabels.counting
    : hand!.phase === "live" ? handoverLabels.live
    : hand!.phase === "waiting" ? handoverLabels.waiting
    : handoverLabels.unavailable;
  const shownCaption = handCaption ?? caption;
  // ⛔ `—:—` ON EVERY NON-COUNTING BRANCH, INCLUDING SETTLED. The `"00:00"` this used to fall
  // through to is the dead clock measured on production; see the block above.
  const shownDigits = inHandover
    ? (hand!.counting ? mmss(handLeft) : "—:—")
    : settled ? "—:—"
    : spent ? "—:—"
    : (isOpen || pastClose) ? mmss(left) : "—:—";

  /**
   * ⭐ E-166 · THE POD IS ONE OBJECT CHANGING STATE, NOT A COMPONENT BEING SWAPPED.
   *
   * `.m-tick` is the kit's existing vocabulary for exactly this — *"live value change: dips and
   * lands. NEVER translates, NEVER counts up"* — `--t-base` on `--m-glide`, which is the pairing
   * §7.1 asks for. ⛔ NO NEW KEYFRAME AND NO NEW EASING: the ladder's rule is that a timing not
   * on it takes the nearest rung, and the honest way to obey that is to reuse the rung that
   * already exists rather than to type 220ms somewhere new.
   *
   * ⛔ KEYED ON THE PHASE, NEVER ON THE VALUE. The digits change every second; dipping them
   * each time is the counting-up animation `.m-tick`'s own comment forbids. The key changes
   * only when the pod starts saying a different KIND of thing.
   *
   * ⚠️ The box does not participate. Padding, gap, font size and the caption's single line are
   * all fixed, so the pod occupies the same rectangle before and after — no layout shift.
   * ⚠️ Reduced motion needs no branch here: all three gates clamp `animation-duration` to
   * 0.01ms globally (motion.css §"THREE GATES"), so this becomes an instant state change and
   * the handover still happens. That is why the kit utility is used instead of a bespoke one.
   */
  const podPhase = inHandover ? `h:${hand!.phase}`
    : settled ? "settled" : spent ? "spent" : inResult ? "result" : isOpen ? "open" : "idle";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)", borderRadius: "var(--r-md)" }}>
      <span key={`c-${podPhase}`}
            className="m-tick font-mono text-micro font-semibold uppercase eyebrow text-text-faint"
            /* ⛔ ONE LINE IN EVERY LOCALE — SW and ZH run ~35% longer and this pod sits inline
               beside 28px digits in a wrapping header. A wrapped caption grows the pod and
               shifts the whole header row, which is the layout shift §6 forbids. */
            style={{ whiteSpace: "nowrap" }}>{shownCaption}</span>
      <span
        key={`d-${podPhase}`}
        className={urgent ? "m-tick ud-count-pulse" : "m-tick"}
        style={{
          fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700,
          fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em", lineHeight: 1,
          color: urgent ? "var(--no-300)"
            // ⭐ E-166 · a counting handover is "something is coming" — the same brand ink the
            // result clock uses, for the same reason. Never rose: a void hands over as a win does.
            : inHandover ? (hand!.counting ? "var(--brand-300)" : "var(--text-subtle)")
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
        {shownDigits}
      </span>
    </div>
  );
}

/**
 * The countdown as a standalone readout — used on the round detail page, where the
 * card's full countdown band would be redundant but the player still needs to see how
 * long is left. Same hook, same digits, same urgency rule as the card.
 *
 * ⭐ E-260 · THE LOCK PHASE, additive. The board chart panel composed this clock with the
 * ROUND close while the card one viewport-inch below counted to the BETTING lock — two
 * clocks ~2 minutes apart on one screen, captions differing by one word, and the chart's
 * was not the deadline a betting player acts on (E-99's order: deadlines in the order the
 * player meets them). Given `lockAtMs` + `lockLabel`, the readout counts to the LOCK while
 * it is in the future and hands over to the close the moment it passes — derived from the
 * instants on the tick (E-104's law), never from a server-rendered phase. Omit them and
 * the component behaves exactly as before.
 */
export function RoundCountdown({ closesAtMs, label, lockAtMs, lockLabel, serverNowMs }: {
  closesAtMs: number; label: string;
  /** The betting lock instant, when it differs from the round close. */
  lockAtMs?: number | null;
  /** Caption while counting to the lock (e.g. udBetsCloseIn), translated by the caller. */
  lockLabel?: string;
  /** The server's clock at render (E-72) — anchors both counts on a drifting handset. */
  serverNowMs?: number;
}) {
  const hasLock = lockAtMs != null && lockLabel != null;
  // Unconditional hooks, like every clock in this file; `enabled` keeps the idle one silent.
  const lockLeft = useTickSeconds(lockAtMs ?? closesAtMs, serverNowMs, hasLock, null);
  const closeLeft = useCountdown(closesAtMs, serverNowMs);
  // Pre-hydration both are null — decide the caption from the server's own instant so the
  // first paint already says the right thing and no caption flip lands on hydration.
  const inLock = hasLock && (lockLeft != null ? lockLeft > 0
    : serverNowMs != null ? lockAtMs! > serverNowMs : true);
  const left = inLock ? lockLeft : closeLeft;
  const shownLabel = inLock ? lockLabel! : label;
  const running = left == null || left > 0;
  const urgent = left != null && left > 0 && left <= 30;
  return (
    <div className="text-right">
      <div className="font-mono text-micro uppercase eyebrow text-text-faint">{shownLabel}</div>
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
