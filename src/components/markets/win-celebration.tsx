"use client";

/**
 * WinCelebration — THE STRUCK SEAL (Claude Design spec §3, landed 2026-08-08).
 *
 * The win moment: the seal lands with mass (`.seal-arrive` — seal-impress + a 2px
 * recoil kick), the needle sweeps to the winning vector, the copy settles in the
 * kit's staggered cascade, the amount counts up on tabular figures and STRIKES to
 * gilt (`.gilt-ink`), the mark flips once on its own needle axis, and one closing
 * band of light crosses the face (`.seal-band .seal-sheen`). Calm, heraldic,
 * never casino — the trophy, the rays and the bloom are gone (M3: rays are
 * banned; glow dilutes the financial texture).
 *
 * ⛔ M7 — wins get the seal, losses get the receipt. This vocabulary is EXCLUSIVE
 * to a win: cash-out is an early exit (plain result modal), a loss is a factual
 * toast, a refund states its own truth. Nothing else may mount this.
 *
 * ⛔ M8 — the seal carries the trademark in SINGLE-INK relief (`variant="white"`,
 * `brand-mark.ts`'s one geometry — never a second drawing); full colour stays in
 * chrome. 76px on the 114px enamel face is the clear-space ceiling, not a choice.
 *
 * The component is mounted once via <WinCelebrationHost /> in AppShell. Any
 * client component can fire one with `dispatchWinCelebration({...})`. The popup
 * auto-dismisses after 4.5s; manual close + click-anywhere-outside also work.
 * Choreography lives in the SYSTEM (`.seal-*` paint in globals.css, cascade and
 * flip offsets in motion.css) — this file only composes classes.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Modal } from "@/components/ui/modal";
import { FiftyMark } from "@/components/brand";
import { haptics } from "@/lib/haptics";
import { acknowledgeNeedle } from "@/lib/needle-bridge";
import { useT } from "@/lib/i18n";
import { formatNumber, formatTzs } from "@/lib/utils";

const EVENT_NAME = "50pick:celebrate";

export type WinCelebrationPayload = {
  /** Heading row. Only WIN is used — cash-out doesn't celebrate. */
  kind: "WIN";
  /** Amount in TZS — the headline figure. */
  amount: number;
  /** "Net" delta to display under the amount. Positive numbers get a "+". */
  net?: number;
  /** Market title or short context line. */
  label?: string;
};

export function dispatchWinCelebration(p: WinCelebrationPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WinCelebrationPayload>(EVENT_NAME, { detail: p }));
}

/** All the gates that mean "snap, don't animate" for the JS half of the beat.
 *  The CSS half is handled by motion.css; this mirrors it for the counter (M6).
 *  ⚠️ `data-motion="reduced"` (low-end Android) is deliberately NOT here — that
 *  tier is a THROTTLE (ambient loops off, full durations), and a single-shot
 *  900ms count is not an ambient loop. */
function motionOff(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("kp-reduce-motion") ||
    document.documentElement.getAttribute("data-motion") === "minimal"
  );
}

/** Rolling counter for the payout headline — waits for its own cascade row to
 *  land (base + 2 stagger steps), counts 0 → value over ~900ms on tabular
 *  figures (no reflow — M4), then reports done so the amount can STRIKE to
 *  gilt. Snaps instantly (already struck) when motion is off. */
function RollingAmount({ value, onStruck }: { value: number; onStruck: (s: boolean) => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (motionOff()) { setN(value); onStruck(true); return; }
    setN(0); onStruck(false);
    // The amount row arrives at --t-stage + 2·--m-stagger (motion.css cascade);
    // the count starts as it lands. 520 + 80 — the tokens' current values; a
    // drifting token would only shift the start beat, never the money.
    const dur = 900;
    let raf = 0;
    const t0 = setTimeout(() => {
      const start = performance.now();
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / dur);
        const eased = 1 - Math.pow(1 - t, 4);
        setN(Math.round(value * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
        else onStruck(true);
      };
      raf = requestAnimationFrame(tick);
    }, 600);
    return () => { clearTimeout(t0); cancelAnimationFrame(raf); };
  }, [value, onStruck]);
  return <>{formatTzs(n)}</>;
}

/** The struck seal — geometry here, paint in globals.css (`.seal-*`), motion in
 *  motion.css. 132px stage → 114px enamel face → 76px single-ink mark (M8's
 *  clear-space ceiling). The needle group takes `.needle-sweep`; the whole mark
 *  flips on its axis once the needle has found the winning vector. */
function StruckSeal() {
  return (
    <div aria-hidden className="seal-arrive relative mb-[22px] h-[132px] w-[132px]">
      <div className="seal-rim" />
      <div className="seal-spec" />
      <div className="seal-enamel">
        <span className="seal-mark-flip inline-block">
          <FiftyMark size={76} variant="white" needleClassName="needle-sweep" />
        </span>
      </div>
      <div className="seal-band seal-sheen" />
    </div>
  );
}

export function WinCelebrationHost() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<WinCelebrationPayload | null>(null);
  const [struck, setStruck] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Focus lands on the primary CTA, not the demoted ✕ — the spec's copy law says
  // the close control "rings only on focus-visible", and letting the Modal's
  // default first-focusable pick it painted a loud ring on the quietest control.
  const continueRef = useRef<HTMLButtonElement | null>(null);

  // A won position is a HELD position that just resolved — the one signal that earns
  // The Needle its acknowledge() nudge (one quarter-turn back to true, no win/loss
  // variant). Fired on dismiss so the quiet nod is visible as the celebration clears,
  // not hidden behind its modal. No-ops if the object is hidden/suppressed.
  // 🔴 WINS QUEUE — THEY USED TO OVERWRITE EACH OTHER.
  //
  // `setPayload(detail)` on a single slot meant that when two wins arrived in the same
  // poller tick — one `for` loop, synchronous `dispatchEvent` per position — the second
  // replaced the first before React ever painted it. The player saw ONE seal.
  //
  // ⛔ And the lost win was gone for good: `notify-poller` marks each position `seen`
  // and persists that set in the same pass, so a win that was overwritten is never
  // re-announced. Two bets on one market settling together is the ordinary case, and
  // it is the exact scenario that file's own header says it exists to handle.
  //
  // The queue presents them one at a time, each with its own open cycle so the
  // seal-arrive impact, the count-up and the mark flip all restart cleanly rather than
  // half-playing over a swapped-out figure.
  const queueRef = useRef<WinCelebrationPayload[]>([]);
  const openRef = useRef(false);
  const gapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⭐ A weekend backlog must not become twenty modals. Past this many the tail is
  // collapsed into ONE honest summary — the total actually paid and how many wins it
  // covers — which is a truthful statement rather than a queue the player has to
  // dismiss their way out of.
  const MAX_INDIVIDUAL = 3;

  /** Present the next queued win, or go idle.
   *  ⚠️ The clean restart between two seals depends on `Modal` returning null while
   *  closed: that unmounts `RollingAmount`, so its count-up effect re-runs even when
   *  two consecutive wins are for the IDENTICAL amount (its deps are `[value]`, which
   *  would not change). If the modal is ever changed to keep its children mounted,
   *  this needs an explicit remount key or the second win will show a final figure
   *  with no count and no strike. */
  const present = () => {
    const next = queueRef.current.shift();
    if (!next) { openRef.current = false; return; }
    openRef.current = true;
    setPayload(next);
    setStruck(false);
    setOpen(true);
    if (!motionOff()) {
      // `success` (money settled), NOT `celebrate`. The 7-pulse celebrate flourish
      // is reinforcement, and the kit's haptic rule is explicit: physical events
      // only — never reward. On a real-money product a congratulatory buzz on a win
      // is also the exact pattern responsible-gambling guidance warns about. The
      // money landing is a real event and still deserves feedback, so it keeps one.
      haptics.success();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, 4_500);
  };

  // Dismiss closes THIS seal, then hands over to the next after a short gap so the
  // two never cross-fade into one another.
  const dismiss = () => {
    setOpen(false);
    acknowledgeNeedle();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (gapRef.current) clearTimeout(gapRef.current);
    if (queueRef.current.length > 0) gapRef.current = setTimeout(present, 350);
    else openRef.current = false;
  };

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<WinCelebrationPayload>).detail;
      if (!detail) return;
      queueRef.current.push(detail);
      if (queueRef.current.length > MAX_INDIVIDUAL) {
        const tail = queueRef.current.splice(MAX_INDIVIDUAL - 1);
        queueRef.current.push({
          kind: "WIN",
          amount: tail.reduce((s, p) => s + p.amount, 0),
          net: tail.every((p) => typeof p.net === "number")
            ? tail.reduce((s, p) => s + (p.net ?? 0), 0)
            : undefined,
          // No market title — this seal stands for several, and naming one of them
          // would be a false statement about the figure above it.
          label: undefined,
        });
      }
      if (!openRef.current) present();
    };
    window.addEventListener(EVENT_NAME, onCelebrate as EventListener);
    return () => {
      window.removeEventListener(EVENT_NAME, onCelebrate as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (gapRef.current) clearTimeout(gapRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!payload) return null;

  // "Won! · Congratulations" collapsed to ONE headline (spec §3 copy law): mono
  // eyebrow, Sora headline, struck mono amount — three treatments, down from five.
  const heading = t.market.wonHeading;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      ariaLabel={heading}
      maxWidth={380}
      zIndex={1700}
      initialFocus={continueRef}
      panelClassName="overflow-hidden !p-0"
    >
      <div className="seal-cascade flex flex-col items-center px-7 pb-7 pt-10 text-center">
        <StruckSeal />

        {/* Eyebrow */}
        <p
          className="g-settle font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-gold-300"
          style={{ "--i": 0 } as CSSProperties}
        >
          {t.common.positionWon}
        </p>

        {/* Headline — one line, Sora */}
        <h2
          className="g-settle mt-2 font-display text-[20px] font-bold leading-tight text-text"
          style={{ "--i": 1 } as CSSProperties}
        >
          {heading}
        </h2>

        {/* The amount — mono, tabular, NEVER letter-spaced (M4); strikes to gilt
            as the count lands. Gold ink before the strike so the roll is already
            an earned-money figure, struck metal once it is final. */}
        <p
          className={`g-settle mt-3 font-mono text-[38px] font-bold leading-[1.1] tabular-nums ${struck ? "gilt-ink" : "text-gold-300"}`}
          style={{ "--i": 2 } as CSSProperties}
        >
          <RollingAmount value={payload.amount} onStruck={setStruck} />
        </p>

        {typeof payload.net === "number" && (
          <p
            className="g-settle mt-1.5 font-mono text-[13px] tabular-nums text-gold-300"
            style={{ "--i": 3 } as CSSProperties}
          >
            {payload.net >= 0 ? "+" : "−"}TZS {formatNumber(Math.abs(payload.net))}{" "}
            <span className="text-text-subtle">{t.common.net}</span>
          </p>
        )}

        {payload.label && (
          <p
            className="g-settle mt-2.5 text-[13px] text-text-subtle line-clamp-2"
            style={{ "--i": 4 } as CSSProperties}
          >
            {payload.label}
          </p>
        )}

        {/* Struck gilt — the earned-money CTA (M3). Rows past the 4th land
            together with the cascade cap; that is the stagger law. */}
        <button
          ref={continueRef}
          type="button"
          onClick={dismiss}
          className="g-settle btn gilt-metal btn-md mt-5 w-full"
          style={{ "--i": 5 } as CSSProperties}
        >
          {t.common.continue}
        </button>
      </div>
    </Modal>
  );
}
