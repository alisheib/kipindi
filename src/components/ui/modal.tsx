"use client";

/**
 * Modal + ConfirmModal — the single centered-dialog primitive (§9.1).
 *
 * Before this, 16 files rolled their own `createPortal` scrim, and only ~9
 * used `useModalLock` — so several money-critical confirms (settle, kill-
 * switch, emergency-void) shipped WITHOUT the Android scroll/zoom lock, a
 * focus trap, or focus-return. This is the one source of truth: portal +
 * useModalLock + Esc + focus-trap + focus-return + kit scrim/animation.
 *
 *   <Modal open onClose ariaLabel="…"> …custom panel content… </Modal>
 *
 *   <ConfirmModal                       // medium: one explicit confirm
 *     open={open} onClose={close}
 *     title="Settle YES now?" body={<p>…</p>}
 *     confirmLabel="Yes, settle" tone="claret"
 *     onConfirm={fire} />
 *
 *   <ConfirmModal tier="hard" typedWord="SEAL"   // hard: type-to-arm gate
 *     … />                                        //   confirm stays disabled
 *                                                 //   until the word matches
 *
 * Slide-over panels (notifications, avatar-menu, nav) are a DIFFERENT
 * pattern and intentionally out of scope here.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";
import { useModalLock } from "@/lib/use-modal-lock";
import { useT } from "@/lib/i18n";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** aria-label for the dialog when there's no visible heading to point at. */
  ariaLabel?: string;
  /** id of the visible heading (preferred over ariaLabel when present). */
  labelledBy?: string;
  /** "alertdialog" for irreversible confirmations, else "dialog". */
  role?: "dialog" | "alertdialog";
  /** Panel max width in px (default 360 — the kit confirm width). */
  maxWidth?: number;
  /** Show the top-right ✕ close button (default true). */
  showClose?: boolean;
  /** Clicking the scrim closes (default true). Set false for must-decide gates. */
  closeOnScrim?: boolean;
  /** Element to focus on open; falls back to the first focusable in the panel. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Extra classes for the panel (spacing/tone overrides). */
  panelClassName?: string;
};

/** The shared centered-dialog shell. Controlled — the caller owns `open`. */
export function Modal({
  open,
  onClose,
  children,
  ariaLabel,
  labelledBy,
  role = "dialog",
  maxWidth = 360,
  showClose = true,
  closeOnScrim = true,
  initialFocus,
  panelClassName = "",
}: ModalProps) {
  const { t } = useT();
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const prevFocus = React.useRef<HTMLElement | null>(null);

  useModalLock(open);
  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!open) return;
    // Remember what had focus so keyboard/SR users land back on the trigger.
    prevFocus.current = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const timer = setTimeout(() => {
      const target = initialFocus?.current ?? focusables()[0] ?? panelRef.current;
      target?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      // Focus trap: keep Tab inside the dialog instead of leaking behind the scrim.
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      // Restore focus to the trigger (guard: it may have unmounted).
      prevFocus.current?.focus?.();
    };
  }, [open, onClose, initialFocus]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role={role}
      aria-modal="true"
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[100] flex justify-center px-3 py-4 overflow-y-auto overscroll-contain"
    >
      <button
        type="button"
        aria-label={t.common.cancel}
        tabIndex={-1}
        onClick={closeOnScrim ? onClose : undefined}
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        style={{ animation: "kp-modal-fade 160ms ease-out" }}
      />
      <div
        ref={panelRef}
        className={`relative my-auto w-full rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)] p-5 lg:p-6 ${panelClassName}`}
        style={{ maxWidth, animation: "kp-modal-rise 200ms var(--ease-arrive)" }}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >
            <I.x s={16} />
          </button>
        )}
        {children}
      </div>
      <style>{`
        @keyframes kp-modal-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kp-modal-rise { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] > *, [role="alertdialog"] > * { animation: none !important; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

type Tone = "claret" | "warning" | "gold" | "brand";

export type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  /** Small mono eyebrow above the title. Defaults per tier/tone. */
  eyebrow?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  /** "medium" = one explicit confirm. "hard" = must type `typedWord` to arm. */
  tier?: "medium" | "hard";
  /** The word the officer must type verbatim to enable confirm (tier="hard"). */
  typedWord?: string;
  /** Override the header glyph (defaults to the warning triangle). */
  icon?: React.ReactNode;
  maxWidth?: number;
};

const TONE_BTN: Record<Tone, string> = {
  claret: "btn btn-claret",
  warning: "btn btn-claret",
  gold: "btn btn-gold",
  brand: "btn btn-primary",
};
const TONE_INK: Record<Tone, { ring: string; ink: string }> = {
  claret: { ring: "var(--claret-500)", ink: "var(--claret-300)" },
  warning: { ring: "var(--claret-500)", ink: "var(--claret-300)" },
  gold: { ring: "var(--gold-500)", ink: "var(--gold-300)" },
  brand: { ring: "var(--brand-500)", ink: "var(--brand-300)" },
};

/**
 * The one confirm surface. Medium tier = a single explicit confirm; hard tier
 * = a type-the-word gate that arms the (irreversible) action only on an exact
 * match — the pattern behind typed-SEAL / typed-PAUSE.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  eyebrow,
  confirmLabel,
  cancelLabel,
  tone = "claret",
  tier = "medium",
  typedWord,
  icon,
  maxWidth = 400,
}: ConfirmModalProps) {
  const { t } = useT();
  const [typed, setTyped] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const isHard = tier === "hard" && !!typedWord;
  const armed = !isHard || typed.trim().toUpperCase() === typedWord!.trim().toUpperCase();

  // Reset the typed gate every time the dialog re-opens.
  React.useEffect(() => { if (open) setTyped(""); }, [open]);

  const ink = TONE_INK[tone];
  const effectiveEyebrow = eyebrow ?? t.common.confirm;
  const typeLabel = typedWord ? `${t.common.type} ${typedWord} ${t.common.typeToConfirm}` : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      ariaLabel={title}
      maxWidth={maxWidth}
      initialFocus={isHard ? inputRef : confirmRef}
    >
      <div className="mb-3 flex items-start gap-3">
        <span
          className="mt-0.5 shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            background: `color-mix(in oklab, ${ink.ring} 15%, transparent)`,
            color: ink.ink,
            border: `1px solid color-mix(in oklab, ${ink.ring} 30%, transparent)`,
          }}
        >
          {icon ?? <I.warning s={18} />}
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
            {effectiveEyebrow}
          </p>
          <h2 className="mt-0.5 font-display text-[18px] font-bold text-text leading-tight">
            {title}
          </h2>
        </div>
      </div>

      <div className="text-[13.5px] text-text-muted leading-relaxed mb-4">
        {body}
      </div>

      {isHard && (
        <label className="block mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-claret-300 font-bold">
            {typeLabel}
          </span>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={typeLabel}
            className="mt-1 w-full rounded-lg border border-border-strong bg-bg-overlay px-3 py-2.5 font-mono text-[15px] tracking-[0.2em] uppercase text-text outline-none focus:border-[color:var(--brand-400)]"
            placeholder={typedWord}
          />
        </label>
      )}

      <div className="flex flex-col gap-2">
        <button
          ref={confirmRef}
          type="button"
          disabled={!armed}
          onClick={() => { haptics.warning(); onConfirm(); }}
          className={`${TONE_BTN[tone]} btn-md w-full`}
        >
          {confirmLabel ?? t.common.confirm}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-md w-full">
          {cancelLabel ?? t.common.cancel}
        </button>
      </div>
    </Modal>
  );
}
