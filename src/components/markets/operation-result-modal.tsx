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
import { Check, X, AlertTriangle, Info } from "lucide-react";

const AUTO_CLOSE_SUCCESS_MS = 5_000;

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
  const Icon = variant === "success" ? Check
            : variant === "danger"  ? X
            : variant === "warning" ? AlertTriangle
            :                          Info;
  return <Icon size={36} strokeWidth={2.5} style={{ color }} />;
}

export function OperationResultModal({
  open, variant, eyebrow, title, subtitle, details, footnote,
  primaryLabel, secondaryLabel, onPrimary, onSecondary, onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    // Only success auto-dismisses. Danger/warning/info stay open so the
    // user can read the reason — that's the LCCP "informed-consent"
    // pattern: never auto-clear an error message.
    const t = variant === "success"
      ? setTimeout(() => closeRef.current(), AUTO_CLOSE_SUCCESS_MS)
      : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key === "Enter")  { e.preventDefault(); (onPrimary ?? closeRef.current)(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { if (t) clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, variant, onPrimary]);

  if (!mounted || !open) return null;

  const tone = TONE[variant];

  return createPortal(
    <div
      role={variant === "danger" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center px-3"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        style={{ animation: "orm-fade 160ms ease-out" }}
      />

      <div
        className="relative w-full max-w-[460px] rounded-2xl border border-border bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]"
        style={{ animation: "orm-rise 220ms cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* Auto-close progress strip — success only */}
        {variant === "success" && (
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl" aria-hidden>
            <div
              className="h-full w-full origin-left"
              style={{
                background: "linear-gradient(90deg, var(--gold-500), var(--gold-300))",
                transform: "scaleX(1)",
                animation: `orm-strip ${AUTO_CLOSE_SUCCESS_MS}ms linear forwards`,
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
          <X size={16} />
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

          <div className={`mt-5 grid gap-2 ${secondaryLabel ? "grid-cols-[1fr_1.4fr]" : "grid-cols-1"}`}>
            {secondaryLabel && (
              <button
                type="button"
                onClick={() => { onSecondary?.(); onClose(); }}
                className="btn btn-ghost btn-md"
              >
                {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => { onPrimary?.(); onClose(); }}
              className={`btn ${tone.primaryBtn} btn-md`}
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
        @keyframes orm-strip { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>
    </div>,
    document.body,
  );
}
