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
import { cn, formatTzs, formatBalancePill, formatNumber } from "@/lib/utils";
import { CashEye, useCashHidden } from "@/components/ui/cash";
import { I } from "@/components/ui/glyphs";
import { WalletSheet } from "@/components/layout/wallet-sheet";

/**
 * 🔴 THE MASK IS A LAYOUT INPUT, NOT DECORATION — which is why it has a name now.
 * D31: the reserved box was sized from the REAL figure while the hidden state painted THIS
 * string, so a short balance reserved a short box and the mask ran out of it. Measured at 360:
 * the mask needs 75px, and the box reserved 34px at TZS 0, 47.6 at TZS 500, 61.2 at TZS 9,999
 * and 74.8 at TZS 100,000 — so it overflowed at EVERY balance up to a million, by 41px at zero.
 * The eye's own box begins 4px past that edge, so the dots ran under the eye. Ali reported it
 * from his phone: "the eye icon overrides most of the dots".
 * ⛔ Change the glyph count here and the box follows, because both sizers below read this.
 */
const BALANCE_MASK = "TZS •••••";

/**
 * "TZS 12,400" → ["TZS", "12,400"]. The chip drops the currency word below `sm` — the delivery's
 * phone chip reads "12,400 ▾" — and keeps it in the aria-label, so nothing is lost to a listener.
 * Anything that does not start with the currency word is returned whole.
 */
function splitCurrency(s: string): [string, string] {
  return s.startsWith("TZS ") ? ["TZS", s.slice(4)] : ["", s];
}

/**
 * The balance as it moves: the server's figure, replaced by every `wallet:balance` SSE event.
 * ⭐ LIFTED OUT OF THE PILL (landing v3) because the BAR now decides with it: at zero the capsule
 * gives way to a gold Deposit (R1), and a deposit arriving over SSE must bring the capsule back
 * without a navigation — a decision taken on the server prop alone would show "Deposit" beside a
 * balance, or two Deposits, until the next page.
 */
export function useLiveBalance(balance: number): number {
  const [live, setLive] = useState(balance);
  useEffect(() => { setLive(balance); }, [balance]);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.balance === "number") setLive(detail.balance);
    };
    window.addEventListener("50pick:sse:wallet-balance", handler);
    return () => window.removeEventListener("50pick:sse:wallet-balance", handler);
  }, []);
  return live;
}

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

/**
 * `balance` is the LIVE figure — the bar reads it through `useLiveBalance` and hands it down, so
 * the bar's zero/funded decision and this capsule can never disagree about the same number.
 * `held` is the wallet's freeze (app-shell: `wallet.status !== "ACTIVE"`); the Wallet it opens
 * then says so and offers no money buttons.
 */
export function WalletBalancePill({ balance, held = false }: { balance: number; held?: boolean }) {
  const { t } = useT();
  const effectiveBalance = balance;
  // ⭐ R1 · THE CAPSULE OPENS THE WALLET instead of navigating to it. The capsule is the anchor:
  // from lg the panel hangs under it, right edges aligned.
  const [open, setOpen] = useState(false);
  const capsuleRef = useRef<HTMLDivElement>(null);
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
    <>
    <div
      ref={capsuleRef}
      className="inline-flex items-center rounded-pill transition-colors transition-shadow"
      style={{
        // ⚠️ PV-13a (2026-09-03) — WAS the bare literal `44`. Reading the rung means the
        // eye's own `h-full` below (which used to be a hand-typed `h-[42px]`, off-rung by
        // 2px) inherits the SAME number the rest of the kit calls --h-control-md, rather
        // than two places agreeing on 44 by coincidence. test:tap-target §6 checks this.
        //
        // ⚠️ AND THE BORDER MOVED TO AN INSET box-shadow, measured, not stylistic. A real
        // `border` is INSIDE the box per Tailwind's border-box preflight, so it was eating
        // 2px off this element's CONTENT height (44 outer − 1px × 2) — which is exactly
        // the 42px `h-full` on the eye first resolved to when this capsule still said
        // `height: 44`. An inset box-shadow paints the same hairline WITHOUT consuming
        // layout space, so a child's `h-full` reaches the full 44px rung instead of the
        // capsule's own border tax. The outer flash ring folds into the same property
        // (comma-joined) because an inline `boxShadow` and the Tailwind `shadow-[…]`
        // class would otherwise fight over the same CSS property at equal specificity.
        height: "var(--h-control-md)",
        background: "var(--bg-inset)",
        boxShadow: flashing
          ? "0 0 0 3px color-mix(in oklab, var(--gold-300) 22%, transparent), inset 0 0 0 1px var(--gold-300)"
          : "inset 0 0 0 1px oklch(78% 0.13 80 / 0.35)",
        transitionDuration: "260ms",
      }}
      data-testid="wallet-balance-capsule"
    >
    <button
      type="button"
      /* ⭐ R1 (2026-09-26) · A BUTTON NOW, NOT A LINK — the chip opens the Wallet (balance, Deposit and
         Withdraw at equal size, Set limits, the full wallet page) instead of navigating to /wallet.
         It is still the ONE wallet door; the door simply opens onto the Wallet rather than a page. */
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
      /* 🔴 D31 · `hideBalances`, NOT `hidePassword`. With balances masked this control announced
         "Pochi · Ficha nenosiri" — **"Wallet · Hide password"** — on the wallet button, to the only
         users who cannot see the mask and must rely on the name. The string was simply the wrong
         one: `common.hidePassword` is the password field's toggle, `common.hideBalances` is this
         one, and both already existed in all three locales. */
      aria-label={hidden ? `${t.common.wallet} · ${t.common.hideBalances}` : `${t.common.wallet} · ${formatTzs(effectiveBalance)}`}
      className={cn(
        // ⚠️ `relative` IS LOAD-BEARING: it is the containing block for the absolutely-positioned
        // delta below. Without it the delta anchors to some ancestor further up and lands nowhere near
        // the figure it belongs to.
        "relative inline-flex h-full items-center rounded-pill font-mono tabular-nums font-bold text-text transition-colors whitespace-nowrap",
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
        // ⭐ R1 · THE FIGURE IS GOLD — it is money (the delivery's law: gold only on money — pools,
        // paid out, balance, Deposit). The currency word stays in muted ink, so the number carries the metal.
        "cursor-pointer text-gold-300 hover:text-gold-200",
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
      {/* 🔴 D31 · THE BOX IS THE WIDER OF THE TWO STATES, AND THAT IS THE FIX.
          It used to be sized from the figure alone, so the mask — which is a FIXED nine
          characters — overflowed whenever the balance was shorter than it. That is most
          balances: measured at 360, the mask needs 75px and the box reserved 34px at TZS 0.
          The overflow ran right, into the hairline divider and under the eye.
          ⭐ THREE CHILDREN IN ONE GRID CELL. Two invisible sizers and the painted value all
          occupy `[grid-row-start:1] [grid-column-start:1]`, so the container takes the WIDTH OF THE WIDEST and neither
          state can exceed it. An absolutely-positioned second sizer could not do this — an
          out-of-flow element contributes no width, which is precisely how the old one failed.
          ⛔ It keeps the property the old code existed for: toggling the eye still moves
          NOTHING, because the box is now the max and therefore identical in both states. */}
      {/* ⭐ R1 · THE CURRENCY WORD IS ITS OWN SPAN, IN MUTED INK, AND IT YIELDS BELOW `sm` — the
          delivery's phone chip reads "12,400 ▾" (SPEC-VALUES, Header). It is in the aria-label at
          every width. ⚠️ OUTSIDE the sizer grid on purpose: the three cells below measure the FIGURE
          only, so the reserved box is the wider of figure and mask at every width, as before. */}
      <span aria-hidden className="hidden font-medium text-text-muted sm:inline">{splitCurrency(formatBalancePill(effectiveBalance))[0] || "TZS"}</span>
      <span className="relative inline-grid items-center">
        <span aria-hidden className="invisible [grid-row-start:1] [grid-column-start:1]">{splitCurrency(formatBalancePill(effectiveBalance))[1]}</span>
        <span aria-hidden className="invisible [grid-row-start:1] [grid-column-start:1]">{splitCurrency(BALANCE_MASK)[1]}</span>
        <span aria-hidden className="flex items-center [grid-row-start:1] [grid-column-start:1]">
          {hidden ? splitCurrency(BALANCE_MASK)[1] : splitCurrency(formatBalancePill(display))[1]}
        </span>
      </span>
      {/* ▾ says the chip OPENS something (the delivery's "TZS 12,400 ▾"). Decorative: the button's
          aria-haspopup + aria-expanded say the same thing to a listener. */}
      <span aria-hidden className={cn("-ml-1 inline-flex shrink-0 text-text-subtle transition-transform", open && "rotate-180")}>
        <I.chevronDown s={12} />
      </span>
      {/* Tiny delta indicator that fades out alongside the flash — the actual +/- amount for
          ~800ms. Suppressed while balances are masked. */}
      {/* 🔴 D31 · ABSOLUTE, SO IT CANNOT MOVE THE HEADER. Rendered inline with `ml-1.5` this
          span was in the LAYOUT, so every balance change widened the capsule and shoved the
          controls beside it sideways for the ~800ms it was up. Measured on production, signed in:
          capsule **113 → 164px (+51)** at 320 and 360, **132 → 182 (+50)** at 768 and 1280, moving
          the notifications bell and the account menu by **~50px at EVERY width** — this was never a
          phone-only problem.
          ⛔ A BALANCE CHANGES AFTER EVERY BET, WIN AND DEPOSIT, so the jump lands exactly when a
          player is most likely to be reaching for something: the same shape as D30, where this
          product already lost taps to a floating element.
          ⭐ It is `aria-hidden` decoration and the colour flash carries the same meaning, so it does
          not need a box — it needs to be VISIBLE. Absolutely positioned inside the capsule's own
          44px height, below the centred figure, where there is ~15px of clear space and nothing to
          push. `pointer-events: none` because it must never take a tap from the wallet link it
          sits on. */}
      {!hidden && flashing && delta !== 0 && (
        <span
          aria-hidden
          className="wbp-delta pointer-events-none absolute bottom-0 right-1 font-mono text-[9.5px] leading-none tabular-nums"
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
    </button>
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
          gold keeps the ink's meaning and still answers the pointer.
          ⛔ PV-13a (2026-09-03) — `h-[42px]` WAS HAND-TYPED HERE, 2px off the 40/44 rung
          ladder (§K1), on every top bar (measured on production: 42px inside a 44px
          capsule — the comment three lines up already said "44px tall is the WCAG 2.5.5
          AAA hit height", so the literal disagreed with this file's own stated intent).
          Invisible to `test:tap-target` §3 because CashEye is a kit component, not one
          of the native tags/role attrs that gate reads — a scanner that reads a
          VOCABULARY of tag names cannot see a wrapper around one. `h-full` inherits the
          capsule's own height above (--h-control-md) instead of re-typing the number, so
          there is exactly one place this control's height is decided. Guarded by
          `test:tap-target` §6 (new), RED-proven by `red:tap-rung`. */}
      <CashEye
        bare
        size={14}
        className="inline-flex h-full w-[var(--tap-min)] shrink-0 items-center justify-center rounded-r-pill text-[var(--gold-300)] transition-colors hover:bg-[color-mix(in_oklab,var(--gold-300)_10%,transparent)] hover:text-gold-200"
      />
    </div>
    <WalletSheet open={open} onClose={() => setOpen(false)} balance={effectiveBalance} held={held} anchorRef={capsuleRef} />
    </>
  );
}
