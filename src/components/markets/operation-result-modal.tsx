"use client";

/**
 * OperationResultModal — the single, kit-faithful "this happened"
 * confirmation popup for a consequential action.
 *
 * ⚠️ THIS HEADER USED TO CLAIM MORE GROUND THAN IT HOLDS, and the matrix in
 * `docs/FAILURE-INVENTORY.md` §6 measured it. It said it was used "after every
 * consequential action: bet placed, position sold, deposit, withdrawal, KYC
 * submit, self-exclusion, password change, etc." — and **none of the last three
 * uses it**. KYC submit, self-exclusion and password change are `<form action>`
 * server actions that redirect to an inline banner or fire a toast. A component
 * doc that overstates its own adoption is how the next reader concludes a gap is
 * already covered, so the real list is stated instead:
 *
 *   · poll bet          `conviction-dial.tsx`
 *   · Up & Down bet     `updown-bet-receipt-modal.tsx`  (UD-22)
 *   · Up & Down refusal `updown-bet-blocked-modal.tsx`
 *   · sell / cash-out   `sell-button.tsx`
 *   · deposit/withdraw  `wallet-result-modal.tsx`  (redirect-driven)
 *   · proposal created  `create-form.tsx`
 *   · every admin action via `action-overlay.tsx`
 *
 * ⛔ Whether the three that don't SHOULD is a product decision about three flows,
 * not a defect to be quietly closed — `docs/DESIGN_AUTHORITY.md` §F2 describes the
 * shape that actually ships.
 *
 * Design language mirrors the BetConfirmModal so the user gets a
 * recognisable beat at every checkpoint:
 *
 *   • A11: dialog chrome (portal, scrim, Android scroll/zoom lock, focus-trap,
 *     focus-return, Esc, kit rise/fade, ✕) is the shared <Modal>; the panel is
 *     `overflow-hidden !p-0` so the gold auto-close strip clips flush.
 *   • Large branded ✓ / ✗ / ! crest at the top — the visual hit
 *   • One headline, one bilingual subhead, optional summary rows
 *   • Single primary CTA (defaults to "Done · Sawa") + optional ghost
 *   • Auto-dismiss countdown for success; failures stay open until
 *     dismissed (so the user can read the reason)
 *   • Enter fires the primary action (bespoke); Esc closes via <Modal>.
 *
 * Why one shared component for every flow: the result modal is a
 * category, not a single screen — every mutation pipes through it.
 * That keeps the toast / corner notification a *secondary* signal and
 * the centered modal the *primary* one, which is the pattern serious
 * payment apps use because corner toasts get missed.
 */

import { useCallback, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { useResultModalPresence } from "@/lib/result-modal-presence";

const DEFAULT_AUTO_CLOSE_MS = 5_000;

export type OperationVariant = "success" | "danger" | "warning" | "info";

export type OperationDetail = { label: string; sw?: string; value: string; tone?: "default" | "good" | "bad" };

type Props = {
  open: boolean;
  variant: OperationVariant;
  /** Big eyebrow line — e.g. "Bet placed · Dau lipo". */
  eyebrow: string;
  /** Hero headline — e.g. "Position open" or "Withdrawal failed". */
  title: string;
  /** Bilingual subhead, optional — e.g. "Inakaguliwa · Ufanye baadaye". */
  subtitle?: string;
  /** Optional summary rows shown in a kit-styled grid. */
  details?: OperationDetail[];
  /** Optional micro-copy at the bottom (e.g. "We notified you in the bell"). */
  footnote?: string;
  /** Primary action — defaults to "Done · Sawa". */
  primaryLabel?: string;
  /** Optional secondary ghost action (e.g. "View positions"). */
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose: () => void;
  /**
   * Override the success auto-close timer. Default 5000 ms.
   * The gold progress strip animates over the SAME value — both are
   * driven from a single RAF loop sharing the same start timestamp,
   * so the bar reaching empty and the modal closing happen on the
   * exact same frame. No drift between visual countdown and timer.
   */
  autoCloseMs?: number;
  /** Controls the auto-close progress strip gradient on success variants.
   *  - "gold"  — earned money moments (payout, win, position sold)
   *  - "brand" — administrative success (deposit, KYC, password, etc.)
   *  - "yes"   — YES-side bet placed
   *  - "no"    — NO-side bet placed
   *  Defaults to "brand". Ignored for non-success variants. */
  stripTone?: "gold" | "brand" | "yes" | "no";
};
/* `celebrate`/`celebrateGlyph` (the A5 reward-burst swap) were DELETED 2026-08-08:
   zero call sites ever passed them, and the win moment they anticipated is the
   struck seal in `win-celebration.tsx` now (M7 — the celebration vocabulary is
   exclusive to a win, so a generic result modal must not be able to wear it). */

/**
 * DS-3 (2026-08-07) — the crest consumes the SYSTEM, not hand-typed oklch.
 * Each variant's disc is the `.mat-tint-*` recipe (colour as LIT GLASS: an even
 * tinted ring + an 18% fill composed off the semantic ramp with color-mix),
 * anchored on the same four families the toast tints use — yes / no / warning /
 * brand. A token retune now moves the crest, the toast ring and the buttons
 * together instead of leaving a re-typed copy behind (the one-fact rule).
 */
const crest = (ramp: string, fg: string) => ({
  fg,
  bg: `color-mix(in oklab, ${ramp} 18%, transparent)`,
  brd: `color-mix(in oklab, ${ramp} 55%, transparent)`,
  shadow: `0 0 0 6px color-mix(in oklab, ${ramp} 14%, transparent)`,
});

const TONE: Record<OperationVariant, { fg: string; bg: string; brd: string; shadow: string; primaryBtn: string }> = {
  success: {
    ...crest("var(--yes-400)", "var(--yes-300)"),
    // NOT btn-gold. Success is not the same thing as EARNED MONEY, and gold means
    // only the latter (RULES law 3). A deposit, a KYC approval and a submitted
    // proposal are all "success", and none of them is money the player has won.
    // The gold button is opted INTO with stripTone="gold"; see effectiveBtn below.
    primaryBtn: "btn-primary",
  },
  danger: {
    ...crest("var(--no-400)", "var(--no-300)"),
    primaryBtn: "btn-no",
  },
  warning: {
    ...crest("var(--warning-500)", "var(--warning-500)"),
    primaryBtn: "btn-gold",
  },
  info: {
    ...crest("var(--brand-400)", "var(--brand-300)"),
    primaryBtn: "btn-primary",
  },
};

function CrestIcon({ variant, color }: { variant: OperationVariant; color: string }) {
  const glyph = variant === "success" ? I.check
              : variant === "danger"  ? I.x
              : variant === "warning" ? I.warning
              :                         I.info;
  return <span style={{ color }}>{glyph({ s: 36 })}</span>;
}

const STRIP_GRADIENTS: Record<string, string> = {
  gold:  "linear-gradient(90deg, var(--gold-500), var(--gold-300))",
  brand: "linear-gradient(90deg, var(--brand-600), var(--brand-400))",
  yes:   "linear-gradient(90deg, var(--yes-700), var(--yes-400))",
  no:    "linear-gradient(90deg, var(--no-700), var(--no-400))",
};

export function OperationResultModal({
  open, variant, eyebrow, title, subtitle, details, footnote,
  primaryLabel, secondaryLabel, onPrimary, onSecondary, onClose,
  autoCloseMs, stripTone = "brand",
}: Props) {
  const { t } = useT();
  const closeRef = useRef(onClose);
  const primaryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  // ⭐ §F1 · THE SECONDARY STANDS DOWN WHILE THE PRIMARY IS UP (Ali, 2026-08-15).
  // Registering here covers every result popup in the product in one place — the bet receipt,
  // the compliance block, the wallet result, the sell result and the dial — because all of
  // them ARE this component. ⛔ Not a z-index change: toasts sit above modals deliberately so
  // a failure fired during a confirm dialog stays readable. See `result-modal-presence.ts`.
  useResultModalPresence(open);

  // RAF-driven gold strip. Same pattern as BetConfirmModal — direct
  // DOM mutation each frame keeps the bar exactly aligned with the
  // close timer (single start timestamp, single duration). No CSS
  // animation racing against setTimeout.
  const stripRef = useRef<HTMLDivElement>(null);
  const closeMs = autoCloseMs ?? DEFAULT_AUTO_CLOSE_MS;

  // Anchor the close target as an ABSOLUTE timestamp set ONCE per
  // open cycle. Survives prop-changes / re-renders / dep-change
  // effect re-runs that would otherwise reset a relative timer and
  // close the modal early. The bar uses the same anchor so the gold
  // strip can never drift away from the close moment.
  const closeTargetRef = useRef<number | null>(null);

  /* ── 🔴 A5 / WCAG 2.2.1 (2026-08-21) — THE RECEIPT PAUSES WHILE IT IS BEING READ ─────────
   *
   * This modal is the bet, sell and withdrawal RECEIPT, and it took itself off the screen
   * after five seconds with no way to hold it — no pause on hover, no pause on focus, no
   * extend. Five seconds is the whole reading budget for an eyebrow, a headline, a bilingual
   * subhead and up to four detail rows including a 25-character gateway reference, in the
   * player's second or third language. A time limit on the only place a reference is shown is
   * a time limit on evidence.
   *
   * ⭐ SAME MACHINERY AS THE TOAST, deliberately (`ui/toast.tsx` `pause`/`resume`): bank the
   * remaining time on pause, resume FROM the banked figure rather than restarting. The strip
   * freezes with it, so the bar never disagrees with the timer — which is the property the
   * absolute-timestamp anchor above exists to protect and the reason this could not be a
   * second, independent countdown.
   *
   * ⛔ AND THE BACKSTOP MUST BE RE-ARMED, NOT LEFT RUNNING. The `setTimeout` below is what
   * closes the modal when RAF is throttled (background tab); a pause that only stopped the
   * RAF loop would freeze the bar and then close anyway, mid-read, with the bar half full.
   * That is precisely the defect §F1 fixed in the toast, reproduced on the primary signal.
   *
   * ⚠️ FOCUS PAUSES ONLY WHEN IT IS `:focus-visible`, and that is not fussiness. <Modal>
   * moves focus onto `primaryRef` 30 ms after opening, so a plain `focusin` pause would fire
   * on the modal's own programmatic focus and the receipt would NEVER auto-close for anyone.
   * `:focus-visible` is false for that programmatic focus after a mouse-driven action and
   * true after a keyboard-driven one — so a mouse user keeps the 5-second dismissal, and a
   * keyboard or screen-reader user (who cannot skim while a timer runs) keeps the receipt
   * until they dismiss it. Both readings are the correct one for their user.
   */
  const pausedRef = useRef(false);
  const remainingRef = useRef<number | null>(null);
  const backstopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseAutoClose = useCallback(() => {
    if (pausedRef.current) return;
    const target = closeTargetRef.current;
    if (target === null) return;          // nothing is counting (non-success, or already closed)
    pausedRef.current = true;
    remainingRef.current = Math.max(0, target - performance.now());
    if (backstopRef.current) { clearTimeout(backstopRef.current); backstopRef.current = null; }
  }, []);

  const resumeAutoClose = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    const remaining = remainingRef.current ?? 0;
    remainingRef.current = null;
    // Re-anchor from NOW plus what was banked: the absolute target stays the single source
    // the RAF strip and the backstop both read, exactly as before the pause.
    closeTargetRef.current = performance.now() + remaining;
    if (backstopRef.current) clearTimeout(backstopRef.current);
    backstopRef.current = setTimeout(() => closeRef.current(), remaining + 50);
  }, []);

  /** Keyboard focus entering the panel holds the receipt; leaving it releases. */
  const onFocusIn = (e: React.FocusEvent) => {
    const el = e.target as HTMLElement | null;
    let visible = false;
    try { visible = !!el?.matches?.(":focus-visible"); } catch { visible = false; }
    if (visible) pauseAutoClose();
  };

  /**
   * 🔴 THE HOVER HOLD IS ARMED BY MOVEMENT, NOT BY `pointerenter`. This is the difference
   * between a receipt that dismisses itself and one that never does.
   *
   * The receipt opens directly under the cursor that just clicked Confirm — the dialog it
   * replaces occupied the same middle of the screen. Chromium recomputes hover state when
   * content appears beneath a STATIONARY pointer and dispatches the boundary events anyway,
   * so `onPointerEnter` would fire on essentially every desktop bet, with no one hovering
   * anything: the 5-second auto-dismiss would quietly become "stays until you move the
   * mouse". That is a product change, not an accessibility fix, and `dial-adversarial-e2e`
   * §G.2 (which times the receipt's auto-close after a mouse-driven bet) would have caught
   * it as a failure without ever saying why.
   *
   * A pointer that is genuinely being moved over the panel emits a stream of `pointermove`s
   * with CHANGING coordinates. So: remember the last position, ignore the first sighting
   * (which is the one a freshly-mounted panel gets for free), and ignore any event that
   * repeats the same point. Real movement pauses within one frame; a resting cursor never
   * does. ⛔ The seed must be cleared when the modal closes — see the anchor effect.
   */
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerMoveHold = (e: React.PointerEvent) => {
    const last = lastPointRef.current;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    if (!last || (last.x === e.clientX && last.y === e.clientY)) return;
    pauseAutoClose();
  };
  const onPointerLeaveHold = () => {
    lastPointRef.current = null;
    resumeAutoClose();
  };

  // Anchor / release the close target as `open` toggles. Separate
  // from the tick effect so closeMs prop changes can't reset the
  // anchor mid-cycle. Also reset the strip transform eagerly so
  // reopening never flashes the empty bar from the previous cycle.
  useEffect(() => {
    if (open && variant === "success") {
      if (stripRef.current) stripRef.current.style.transform = "scaleX(1)";
      if (closeTargetRef.current === null && !pausedRef.current) {
        closeTargetRef.current = performance.now() + closeMs;
      }
    } else {
      closeTargetRef.current = null;
      // A closed modal holds no pause. Without this a receipt dismissed while the pointer
      // was over it would reopen already-paused, with no pointerleave coming to release it.
      pausedRef.current = false;
      remainingRef.current = null;
      lastPointRef.current = null;
      if (backstopRef.current) { clearTimeout(backstopRef.current); backstopRef.current = null; }
    }
  }, [open, variant, closeMs]);

  useEffect(() => {
    if (!open) return;
    // Errors / warnings / info don't auto-close (LCCP informed-consent).
    // Enter fires the primary action; Esc closes via <Modal>.
    if (variant !== "success") {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); (onPrimary ?? closeRef.current)(); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }

    // Success path — RAF-driven countdown anchored to the absolute
    // close target. The strip width pct = remaining/closeMs, so the
    // bar always lines up with the moment-of-close regardless of
    // how many times the effect re-runs.
    if (stripRef.current) stripRef.current.style.transform = "scaleX(1)";
    let rafId: number | null = null;
    const tick = () => {
      // Held: the strip sits at the banked figure and the loop stays alive waiting for the
      // release. ⛔ It must NOT fall through — the target is a fixed timestamp, so a paused
      // tick that kept measuring against it would drain the bar and close the receipt anyway.
      if (pausedRef.current) {
        const banked = remainingRef.current ?? 0;
        if (stripRef.current) {
          stripRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, banked / closeMs))})`;
        }
        rafId = requestAnimationFrame(tick);
        return;
      }
      const target = closeTargetRef.current;
      if (target === null) { rafId = null; return; }
      const remaining = target - performance.now();
      const pct = Math.max(0, Math.min(1, remaining / closeMs));
      if (stripRef.current) stripRef.current.style.transform = `scaleX(${pct})`;
      if (remaining <= 0) {
        rafId = null;
        closeRef.current();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // setTimeout backstop — fires from the ABSOLUTE target so a
    // dep-change re-run can't extend the close past the intended
    // moment. Idempotent with the RAF (both call closeRef.current
    // and parent owns the open state).
    // ⚠️ The backstop is held in a REF now, because the pause has to be able to clear it and
    // the resume has to be able to re-arm it. Armed only while running: a re-run of this
    // effect during a pause must not resurrect the timer the pause just cancelled.
    if (!pausedRef.current) {
      const target = closeTargetRef.current ?? performance.now() + closeMs;
      const remainingForBackstop = Math.max(0, target - performance.now()) + 50;
      if (backstopRef.current) clearTimeout(backstopRef.current);
      backstopRef.current = setTimeout(() => closeRef.current(), remainingForBackstop);
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); (onPrimary ?? closeRef.current)(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (backstopRef.current) { clearTimeout(backstopRef.current); backstopRef.current = null; }
      window.removeEventListener("keydown", onKey);
    };
  }, [open, variant, onPrimary, closeMs]);

  const tone = TONE[variant];
  // For success, override the primary button and crest tones based on stripTone.
  // Gold = earned money (btn-gold), side = bet placed (btn-yes/btn-no),
  // brand = administrative (btn-primary). Non-success variants keep their
  // semantic defaults.
  const effectiveBtn = variant === "success"
    ? (stripTone === "gold" ? "btn-gold" : stripTone === "yes" ? "btn-yes" : stripTone === "no" ? "btn-no" : "btn-primary")
    : tone.primaryBtn;

  return (
    <Modal
      open={open}
      onClose={onClose}
      role={variant === "danger" ? "alertdialog" : "dialog"}
      ariaLabel={title}
      maxWidth={460}
      initialFocus={primaryRef}
      panelClassName="overflow-hidden !p-0"
    >
      {/* Auto-close progress strip — success only. Driven by the same RAF tick
          that schedules the close, so the bar and the dismiss land on the same
          frame. The panel's `overflow-hidden` clips it to the rounded corners. */}
      {variant === "success" && (
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-modal" aria-hidden>
          <div
            ref={stripRef}
            className="h-full w-full origin-left"
            style={{
              background: STRIP_GRADIENTS[stripTone] ?? STRIP_GRADIENTS.brand,
              transform: "scaleX(1)",
              willChange: "transform",
            }}
          />
        </div>
      )}

      {/* The hold surface. It is this div rather than a new wrapper because it already
          covers the whole panel below the 4px strip, and every focusable control in the
          receipt lives inside it — so `onFocusCapture` sees them all without adding a node
          to the focus trap's `querySelectorAll`. Non-success variants never auto-close, so
          the handlers no-op there (`pauseAutoClose` returns on a null target). */}
      <div
        className="p-6 lg:p-7 text-center"
        onPointerMove={onPointerMoveHold}
        onPointerLeave={onPointerLeaveHold}
        onFocusCapture={onFocusIn}
        onBlurCapture={resumeAutoClose}
      >
        {/* Crest — the visual hit. ⭐ A BET COMMIT takes the micro-seal (spec §8's
            "micro-commit .seal-commit" — `seal-place`, the stamp landing) instead of
            the generic pop: `stripTone` yes/no is the modal's own definition of "a
            side was staked", so the commit moment is detected from the prop that
            already means it, not a new one. Everything else keeps `orm-pop`. */}
        <div
          className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full${
            variant === "success" && (stripTone === "yes" || stripTone === "no") ? " seal-commit" : ""
          }`}
          style={{
            background: tone.bg,
            border: `2px solid ${tone.brd}`,
            boxShadow: tone.shadow,
            ...(variant === "success" && (stripTone === "yes" || stripTone === "no")
              ? {}
              : { animation: "orm-pop var(--t-move) var(--m-pivot)" }),
          }}
          aria-hidden
        >
          <CrestIcon variant={variant} color={tone.fg} />
        </div>

        <p
          className="mt-4 font-mono text-micro uppercase tracking-[0.16em] font-bold"
          style={{ color: tone.fg }}
        >
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-[22px] font-bold text-text leading-tight tracking-[-0.018em]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-[13px] text-text-muted leading-snug">
            {subtitle}
          </p>
        )}

        {details && details.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 text-left">
            {details.map((d, i) => (
              /* The value must FIT, wrapping to a second row if it has to.
                 A reference here is a 25-character cuid with no spaces in it
                 (wallet-result-modal passes the transaction id), and this row used
                 to be a plain `flex justify-between`: flex items default to
                 `min-width:auto`, so neither child could shrink below its content,
                 the value overflowed the panel, and the panel's `overflow-hidden`
                 CLIPPED it. Wide screens hid this — at 360px the reference a player
                 needs to quote to support was cut off mid-string. Reported from a
                 real withdrawal, 2026-07-29.
                 `min-w-0` restores shrinkability, `break-all` is the only break that
                 works on an unbroken token, and `flex-wrap` + `ml-auto` lets the
                 value drop onto its own full-width row and stay right-aligned. */
              <div
                key={i}
                className="rounded-md border border-border bg-bg-overlay/60 px-3 py-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-subtle">
                    {d.label}
                  </p>
                  {d.sw && (
                    <p className="text-body-sm italic text-text-subtle">{d.sw}</p>
                  )}
                </div>
                <p
                  className="min-w-0 ml-auto text-right font-mono text-[14px] font-bold tabular-nums break-all"
                  style={{
                    color:
                      d.tone === "good" ? "var(--yes-300)" :
                      d.tone === "bad"  ? "var(--no-300)"  :
                                          "var(--text)",
                  }}
                >
                  {d.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={primaryRef}
            type="button"
            // 🔴 THE PRIMARY OWNS ITS OWN DISMISSAL — the same defect the ghost CTA below
            // was fixed for, in the same component, on the same modal. This was
            // `onPrimary?.(); onClose();`, and on the dial's bet receipt BOTH push the
            // board, so "Keep predicting" pushed /markets twice on every click. The Enter
            // handler above has always been `(onPrimary ?? closeRef.current)()`; click and
            // keyboard now agree. Callers that pass no `onPrimary` still get plain dismissal.
            onClick={() => { if (onPrimary) onPrimary(); else onClose(); }}
            className={`btn ${effectiveBtn} btn-lg w-full`}
          >
            {primaryLabel ?? t.common.doneSawa}
          </button>
          {secondaryLabel && (
            <button
              type="button"
              // 🔴 THE SECONDARY OWNS ITS OWN DISMISSAL. This used to be
              // `onSecondary?.(); onClose();` — and on the bet receipt `onClose` also
              // does `router.push(boardHref)`. So tapping "View positions" fired a
              // push to /positions and then IMMEDIATELY a second push to /markets,
              // which won. The button did the opposite of what it said, every time.
              // Callers that pass no `onSecondary` still get plain dismissal.
              onClick={() => { if (onSecondary) onSecondary(); else onClose(); }}
              className="btn btn-ghost btn-md w-full"
            >
              {secondaryLabel}
            </button>
          )}
        </div>

        {footnote && (
          <p className="mt-3 text-body-sm text-text-subtle">
            {footnote}
          </p>
        )}
      </div>

      <style>{`
        @keyframes orm-pop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
      `}</style>
    </Modal>
  );
}
