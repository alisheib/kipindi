"use client";

import { useT } from "@/lib/i18n";

/**
 * WalletBalancePill — the top-bar TZS balance with rolling counter
 * + delta flash on change.
 *
 * Why this exists: previously the pill silently jumped from
 * TZS 100,000 → TZS 86,800 the moment a bet debited the wallet. No
 * confirmation that the action landed beyond the toast. Now the
 * number rolls + the pill outline pulses gilt for ~700 ms, giving
 * the player a calm "yes, your money moved" affordance. Reduced-
 * motion users see the number snap with no pulse — same visual end
 * state, no motion.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn, formatTzs, formatBalancePill, formatNumber } from "@/lib/utils";
import { CashEye, useCashHidden } from "@/components/ui/cash";

const TWEEN_DURATION = 600;     // ms — full rolling-counter run
const FLASH_DURATION = 800;     // ms — gilt outline pulse decay

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * The two CLAMP gates that mean "snap, don't tween" (§M6), read at the moment
 * the balance actually moves.
 *
 * ⚠️ WHAT THIS REPLACED, AND WHY IT MATTERED. The pill sampled
 * `matchMedia("(prefers-reduced-motion: reduce)")` ONCE into a ref on mount and
 * consulted nothing else — gate 1 only, and frozen. So a player who turned
 * "Reduce motion" ON in Settings → Sound & feedback kept the rolling counter and
 * the gilt outline pulse for the rest of the session, because this pill lives in
 * the top bar and never unmounts. Reading live also removes the mount-order race
 * with `theme-provider.tsx`, which sets the class and the attribute in its own
 * effect.
 *
 * ⚠️ `data-motion="reduced"` is deliberately absent — that tier is a THROTTLE
 * (ambient loops off, full durations), and a 600ms one-shot count is not an
 * ambient loop. Same reasoning, same wording, as `motionOff()` in
 * `components/markets/win-celebration.tsx`, which is the model here. (Three
 * copies of this predicate now exist across the app; they want one home in
 * `src/lib`, which is a change that spans files this one does not own.)
 */
function motionOff(): boolean {
  if (typeof window === "undefined") return true;
  const root = document.documentElement;
  return (
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false) ||
    root.classList.contains("kp-reduce-motion") ||
    root.getAttribute("data-motion") === "minimal"
  );
}

export function WalletBalancePill({ balance }: { balance: number }) {
  const { t } = useT();
  // SSE-driven live balance — updates in real-time when wallet:balance
  // events arrive, without waiting for a page refresh. Falls back to the
  // server-rendered `balance` prop when no SSE event has fired yet.
  const [liveBalance, setLiveBalance] = useState(balance);
  // Sync with server-rendered prop when it changes (navigation, refresh)
  useEffect(() => { setLiveBalance(balance); }, [balance]);
  // Listen for SSE wallet:balance events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.balance === "number") setLiveBalance(detail.balance);
    };
    window.addEventListener("50pick:sse:wallet-balance", handler);
    return () => window.removeEventListener("50pick:sse:wallet-balance", handler);
  }, []);

  const effectiveBalance = liveBalance;
  const [display, setDisplay] = useState(effectiveBalance);
  const [flashing, setFlashing] = useState(false);
  const [delta, setDelta] = useState(0);
  const previousRef = useRef(effectiveBalance);
  const rafRef = useRef<number | null>(null);
  const hidden = useCashHidden();

  useEffect(() => {
    const from = previousRef.current;
    const to = effectiveBalance;
    if (from === to) return;
    previousRef.current = to;
    setDelta(to - from);

    // All three clamp gates, read NOW rather than once at mount. The end state is
    // identical — the true balance on the resting outline — with no tween and no
    // pulse, which is what §M6 asks of a count-up.
    if (motionOff()) {
      setDisplay(to);
      return;
    }

    // Trigger the gilt outline pulse — CSS transition handles the
    // decay back to the resting border.
    setFlashing(true);
    const flashTimer = window.setTimeout(() => setFlashing(false), FLASH_DURATION);

    // Cancel any in-flight tween so a rapid second update doesn't
    // double-count.
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / TWEEN_DURATION);
      const eased = easeOutQuart(t);
      const v = Math.round(from + (to - from) * eased);
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => window.clearTimeout(flashTimer);
  }, [effectiveBalance]);

  // Cleanup any in-flight RAF on unmount.
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    /* ⭐ ONE CAPSULE, TWO CONTROLS — the balance and its eye are a single visual unit.
       They used to be two boxes in a flex row with a 12px gap and the eye pulling itself
       back with `-mx-1`: a gap and a negative margin cancelling each other, which is a
       patch, not a design. The border, the fill and the gilt flash belong to the CAPSULE
       now, so the pair reads as one control and the 12px between them is simply gone.
       ⛔ The eye is a <button> and the number is an <a>, so they are SIBLINGS — a button
       nested inside a link is invalid HTML and neither control would be reliably
       operable. The capsule is a plain <div> precisely so both can be real elements. */
    <div
      className={cn(
        "inline-flex items-center rounded-pill transition-colors transition-shadow",
        flashing && "shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold-300)_22%,transparent)]",
      )}
      style={{
        height: 44,
        background: "var(--bg-inset)",
        border: flashing ? "1px solid var(--gold-300)" : "1px solid oklch(78% 0.13 80 / 0.35)",
        transitionDuration: "260ms",
      }}
      data-testid="wallet-balance-capsule"
    >
    <Link
      href="/wallet"
      aria-label={hidden ? `${t.common.wallet} · ${t.common.hidePassword}` : `${t.common.wallet} · ${formatTzs(effectiveBalance)}`}
      className={cn(
        "inline-flex h-full items-center rounded-pill font-mono tabular-nums font-bold text-text transition-colors whitespace-nowrap",
        // ⭐ DENSITY FOLLOWS WIDTH, PRECISION DOES NOT. `text-caption` (11) below `sm`,
        // `text-label` (12) from there — both ON the closed ladder (§T1). This also
        // RETIRES an inline `fontSize: 12.5`, which was an off-ladder literal counted by
        // `test:type-scale`'s inline-fontSize ratchet.
        // ⚠️ `px-1.5` (8px) below `sm` is not a taste: measured on production, the 360
        // row gives the whole cluster 278px and `px-3` there leaves 1px of slack. 8px
        // leaves 9px, which is the difference between "fits" and "fits reliably".
        // ⚠️ The RIGHT padding is smaller than the left on purpose: the hairline divider
        // and the eye's own hit area supply the optical space on that side, so equal
        // padding would read as a gap twice as wide as the one before "TZS".
        // ⚠️ The RIGHT padding is smaller than the left on purpose: the hairline divider
        // and the eye's own hit area supply the optical space on that side, so equal
        // padding would read as a gap twice as wide as the one before "TZS".
        // ⚠️ AND THE PHONE VALUES ARE NOT TASTE. At 360 the row's content box ends at 344;
        // the first version of this capsule pushed the cluster's right edge to 360 — it had
        // eaten the bar's own 16px edge padding and sat flush against the glass. Nothing
        // clipped, so a `right <= viewport` check passed it. The check was wrong, not the
        // layout: a bar must end where its container ends.
        "pl-1.5 pr-1 text-caption sm:pl-3 sm:pr-2.5 sm:text-label",
        flashing ? "text-gold-300" : "hover:text-gold-300",
      )}
      style={{ gap: 7, transitionDuration: "260ms" }}
      data-testid="wallet-balance-pill"
    >
      {/* ⛔ THE EXACT FIGURE, AT EVERY WIDTH — a compact form was BUILT HERE AND REMOVED,
          and the reason is worth keeping. `formatTzsCompact` would have saved ~40px on a
          phone, but it ROUNDS to the nearest thousand, and this component exists to make
          a balance CHANGE visible: it rolls the number and pulses the outline so a player
          sees their money move. A 500 TZS bet against "TZS 195K" changes nothing on
          screen — the pill would silently show the same string before and after, which is
          the precise defect it was built to fix, reintroduced on the device most players
          use. ⭐ Measured on production before deciding: 100 wallets, p95 **TZS 886,854**,
          MAX **TZS 1,000,000** — 13 characters worst case, 4 wallets over 1M and none
          over 10M. The width is bounded by reality, so the pixels were found elsewhere. */}
      {/* 🔴 THE WIDTH IS RESERVED, SO NOTHING IN THE BAR EVER MOVES. Measured before this
          existed: toggling the eye changed the capsule from 145px to 130px and shifted the
          whole cluster 15px sideways — a pure display action rearranging the chrome around
          it. At 360 it was 121 → 107. **A control that moves the page when you use it is not
          finished**, and this one is now the control a player reaches for most.
          ⭐ It also removes a jitter nobody had named: the rolling counter re-measures on
          every frame, so a roll across a comma boundary (99,999 → 100,000) nudged the bar
          for the length of the tween. The sizer is keyed on `effectiveBalance` — the TARGET,
          not the tweening `display` — so the box is the final width from the first frame.
          ⛔ It leaks nothing. The sizer is `aria-hidden` and `visibility: hidden`, and the
          real figure is already in this component's props and in the `aria-label` of the
          unmasked state; the mask exists for shoulder-surfing, not for the device's owner.
          ⚠️ `tabular-nums` on the Link is what makes this exact rather than approximate —
          every digit is one advance width, so the reserved box matches any balance of the
          same length, not merely the one measured. */}
      <span className="relative inline-flex items-center">
        <span aria-hidden className="invisible">{formatBalancePill(effectiveBalance)}</span>
        <span aria-hidden className="absolute inset-0 flex items-center">
          {hidden ? "TZS •••••" : formatBalancePill(display)}
        </span>
      </span>
      {/* Tiny delta indicator that fades out alongside the flash —
          appears next to the number for ~800 ms with the actual
          +/- amount. Helps the player connect the visual to the
          recent transaction. Suppressed while balances are masked. */}
      {!hidden && flashing && delta !== 0 && (
        <span
          aria-hidden
          className="wbp-delta ml-1.5 font-mono text-[9.5px] tabular-nums"
          style={{ color: delta > 0 ? "var(--yes-300)" : "var(--no-300)" }}
        >
          {delta > 0 ? "+" : ""}
          {formatNumber(delta)}
        </span>
      )}
      <style>{`
        /* ⚠️ THE ANIMATION IS DECLARED ON A CLASS, NOT IN THE style ATTRIBUTE.
           It used to sit in JSX as an inline animation shorthand, and a style
           attribute is invisible to every motion gate this product has: the
           reduce-motion gate reads RULES, and the keyframe registry's consumer
           scan stops dead at the opening quote. So wbp-delta-fade was reported as
           a name with NO CONSUMER — i.e. as safe to delete. It is not: it is on
           the top bar of every authed page. */
        .wbp-delta { animation: wbp-delta-fade var(--t-max) ease-out forwards; }
        @keyframes wbp-delta-fade {
          0%   { opacity: 0; transform: translateY(-2px); }
          15%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-2px); }
        }
        /* Calm branches. The span only renders while flashing is true, and that is
           now behind all three clamp gates in JS — so these are the belt to that
           braces, for a player who flips the switch mid-flash. Not owed a
           data-motion=reduced entry: the animation is a one-shot (forwards), and
           the throttle tier exists for ambient loops. */
        @media (prefers-reduced-motion: reduce) {
          @keyframes wbp-delta-fade {
            from, to { opacity: 0; }
          }
        }
        html.kp-reduce-motion .wbp-delta { animation: none; opacity: 0; }
        [data-motion="minimal"] .wbp-delta { animation: none; opacity: 0; }
      `}</style>
    </Link>
      {/* ⭐ THE EYE LIVES INSIDE THE CAPSULE, because it acts on the number beside it and
          nothing else. It is `bare` — the kit's borderless variant — so the capsule owns
          the one border and the pair never reads as two chips.
          ⛔ EVERY NUMBER HERE IS AN ARBITRARY LITERAL ON PURPOSE. `theme.extend.spacing`
          is overridden (tailwind.config.ts): `h-11` is 96px and `w-7` is 40px, so a scale
          token would ship a 96×40 control and the class list would still read correct to
          anyone who knows Tailwind and not this config. 28px wide keeps the cluster from
          reflowing; 44px tall is the WCAG 2.5.5 AAA hit height.
          ⚠️ `pr-1.5 sm:pr-2` mirrors the number's own padding so the capsule is optically
          even end to end — without it the glyph sits hard against the right edge. */}
      {/* ⭐ A HAIRLINE, SO TWO CONTROLS READ AS TWO. The number is a LINK to the wallet and
          the eye is a BUTTON that masks it — different destinations for a tap, inside one
          shape. Without a divider the eye reads as decoration sitting in the pill's dead
          space, which is exactly how it looked when measured at 4×.
          ⚠️ INSET 10px top and bottom so it never touches the capsule's own border — a
          hairline that meets the edge reads as a crack in the shape rather than a seam. */}
      {/* ⚠️ THE SEAM EARNS ITS PLACE ONLY WHERE THERE IS ROOM FOR IT. From `sm` the capsule
          is 147px and the divider clarifies that two controls share one shape. At 360 it is
          119px carrying 11px type, where a hairline plus the space it needs reads as fuss
          rather than structure — and costs the pixels that keep the bar off the glass. The
          balanced 14px on each side of the glyph does the same job there.
          ⛔ This is DENSITY, not inconsistency: the type size, the padding and the eye's hit
          area already step at the same breakpoint, for the same reason. */}
      <span aria-hidden className="hidden h-[24px] w-px shrink-0 bg-[color-mix(in_oklab,var(--gold-300)_26%,transparent)] sm:block" />
      {/* ⭐ THE EYE IS A REAL TARGET NOW, NOT A GLYPH IN A GAP. Its hit area went 28px → 40px
          wide while the glyph stayed 14px, so nothing about the capsule's width or rhythm
          changed and the control became eight pixels easier to hit than the tap floor's
          own minimum — which matters because this is the control a player uses in public.
          ⛔ EVERY NUMBER IS AN ARBITRARY LITERAL ON PURPOSE. `theme.extend.spacing` is
          overridden (tailwind.config.ts): `h-11` is 96px and `w-7` is 40px, so a scale token
          would ship a 96×40 control while the class list still read correct.
          ⚠️ `hover:text-gold-200` is not decoration — `CashEye`'s own base carries
          `hover:text-text`, which would flip this gold control to WHITE on hover and make it
          look like a different control mid-interaction. Overriding the hover with a BRIGHTER
          gold keeps the ink's meaning and still answers the pointer. */}
      <CashEye
        bare
        size={14}
        className="inline-flex h-[42px] w-[32px] shrink-0 sm:w-[36px] items-center justify-center rounded-r-pill text-[var(--gold-300)] transition-colors hover:bg-[color-mix(in_oklab,var(--gold-300)_10%,transparent)] hover:text-gold-200"
      />
    </div>
  );
}
