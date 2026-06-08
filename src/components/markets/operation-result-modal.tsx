"use client";

/**
 * OperationResultModal — the single, kit-faithful "this happened"
 * confirmation popup used across the platform after every consequential
 * action: bet placed, position sold, deposit, withdrawal, KYC submit,
 * self-exclusion, password change, etc.
 *
 * Design language mirrors the BetConfirmModal so the user gets a
 * recognisable beat at every checkpoint:
 *
 *   • Portaled to body (escapes any backdrop-filter trap)
 *   • Scrim + raised card + 200ms rise / 160ms fade
 *   • Large branded ✓ / ✗ / ! crest at the top — the visual hit
 *   • One headline, one bilingual subhead, optional summary rows
 *   • Single primary CTA (defaults to "Done · Sawa") + optional ghost
 *   • Auto-dismiss countdown for success; failures stay open until
 *     dismissed (so the user can read the reason)
 *   • Esc + Enter close on success; Esc dismisses on failure too
 *
 * Why one shared component for every flow: the result modal is a
 * category, not a single screen — every mutation pipes through it.
 * That keeps the toast / corner notification a *secondary* signal and
 * the centered modal the *primary* one, which is the pattern serious
 * payment apps use because corner toasts get missed.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";

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
};

const TONE: Record<OperationVariant, { fg: string; bg: string; brd: string; shadow: string; primaryBtn: string }> = {
  success: {
    fg: "oklch(78% 0.13 152)",
    bg: "oklch(40% 0.10 152 / 0.18)",
    brd: "oklch(45% 0.13 152)",
    shadow: "0 0 0 6px oklch(45% 0.13 152 / 0.18)",
    primaryBtn: "btn-gold",
  },
  danger: {
    fg: "oklch(78% 0.16 22)",
    bg: "oklch(40% 0.13 22 / 0.18)",
    brd: "oklch(48% 0.15 22)",
    shadow: "0 0 0 6px oklch(48% 0.15 22 / 0.18)",
    primaryBtn: "btn-no",
  },
  warning: {
    fg: "oklch(78% 0.13 86)",
    bg: "oklch(40% 0.10 86 / 0.18)",
    brd: "oklch(58% 0.12 76)",
    shadow: "0 0 0 6px oklch(58% 0.12 76 / 0.18)",
    primaryBtn: "btn-gold",
  },
  info: {
    fg: "oklch(78% 0.10 240)",
    bg: "oklch(40% 0.10 240 / 0.18)",
    brd: "oklch(48% 0.10 240)",
    shadow: "0 0 0 6px oklch(48% 0.10 240 / 0.18)",
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

export function OperationResultModal({
  open, variant, eyebrow, title, subtitle, details, footnote,
  primaryLabel, secondaryLabel, onPrimary, onSecondary, onClose,
  autoCloseMs,
}: Props) {
  useModalLock(open);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

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

  useEffect(() => { setMounted(true); }, []);

  // Anchor / release the close target as `open` toggles. Separate
  // from the tick effect so closeMs prop changes can't reset the
  // anchor mid-cycle. Also reset the strip transform eagerly so
  // reopening never flashes the empty bar from the previous cycle.
  useEffect(() => {
    if (open && variant === "success") {
      if (stripRef.current) stripRef.current.style.transform = "scaleX(1)";
      if (closeTargetRef.current === null) {
        closeTargetRef.current = performance.now() + closeMs;
      }
    } else {
      closeTargetRef.current = null;
    }
  }, [open, variant, closeMs]);

  useEffect(() => {
    if (!open) return;
    // Errors / warnings / info don't auto-close (LCCP informed-consent).
    if (variant !== "success") {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
        if (e.key === "Enter")  { e.preventDefault(); (onPrimary ?? closeRef.current)(); }
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
    const target = closeTargetRef.current ?? performance.now() + closeMs;
    const remainingForBackstop = Math.max(0, target - performance.now()) + 50;
    const backstop = setTimeout(() => closeRef.current(), remainingForBackstop);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key === "Enter")  { e.preventDefault(); (onPrimary ?? closeRef.current)(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(backstop);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, variant, onPrimary, closeMs]);

  if (!mounted || !open) return null;

  const tone = TONE[variant];

  return createPortal(
    <div
      role={variant === "danger" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex justify-center px-3 py-4 overflow-y-auto overscroll-contain"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        style={{ animation: "orm-fade 160ms ease-out" }}
      />

      <div
        className="relative my-auto w-full max-w-[460px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
        // `overflow-hidden` clips the gold auto-close strip to the
        // rounded corners; without it, the strip's `rounded-t-2xl`
        // can render slightly past the popup's `rounded-xl` + 1 px
        // border edge (same bug Ali caught on BetConfirmModal).
        //
        // Kit `--ease-arrive` is the gentle overshoot reserved for
        // entry surfaces — gives the modal a confident "land" that
        // a generic cubic-bezier can't match.
        style={{ animation: "orm-rise 240ms var(--ease-arrive)" }}
      >
        {/* Auto-close progress strip — success only. Driven by the
            same RAF tick that schedules the close, so the bar and the
            dismiss are guaranteed to land on the same frame. No CSS
            animation that could race against the timer. */}
        {variant === "success" && (
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-xl" aria-hidden>
            <div
              ref={stripRef}
              className="h-full w-full origin-left"
              style={{
                background: "linear-gradient(90deg, var(--gold-500), var(--gold-300))",
                transform: "scaleX(1)",
                willChange: "transform",
              }}
            />
          </div>
        )}

        {/* Close affordance — top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
        >
          <I.x s={16} />
        </button>

        <div className="p-6 lg:p-7 text-center">
          {/* Crest — the visual hit. Big circle, big icon, OKLCH glow. */}
          <div
            className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: tone.bg,
              border: `2px solid ${tone.brd}`,
              boxShadow: tone.shadow,
              animation: "orm-pop 360ms cubic-bezier(.2,1.4,.4,1)",
            }}
            aria-hidden
          >
            <CrestIcon variant={variant} color={tone.fg} />
          </div>

          <p
            className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] font-bold"
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
                <div
                  key={i}
                  className="rounded-md border border-border bg-bg-overlay/60 px-3 py-2 flex items-baseline justify-between gap-3"
                >
                  <div>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-subtle">
                      {d.label}
                    </p>
                    {d.sw && (
                      <p className="text-[11px] italic text-text-subtle">{d.sw}</p>
                    )}
                  </div>
                  <p
                    className="font-mono text-[14px] font-bold tabular-nums"
                    style={{
                      color:
                        d.tone === "good" ? "oklch(78% 0.13 152)" :
                        d.tone === "bad"  ? "oklch(78% 0.16 22)"  :
                                            "var(--text)",
                    }}
                  >
                    {d.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className={`mt-5 grid gap-2 ${secondaryLabel ? "grid-cols-1 xs:grid-cols-[1fr_1.4fr]" : "grid-cols-1"}`}>
            {secondaryLabel && (
              <button
                type="button"
                onClick={() => { onSecondary?.(); onClose(); }}
                className="btn btn-ghost btn-md whitespace-normal h-auto min-h-[38px]"
              >
                {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => { onPrimary?.(); onClose(); }}
              className={`btn ${tone.primaryBtn} btn-md whitespace-normal h-auto min-h-[38px]`}
              autoFocus
            >
              {primaryLabel ?? "Done · Sawa"}
            </button>
          </div>

          {footnote && (
            <p className="mt-3 text-[11px] text-text-subtle">
              {footnote}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes orm-rise  { from { transform: translateY(8px) scale(.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes orm-fade  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orm-pop   { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
      `}</style>
    </div>,
    document.body,
  );
}
