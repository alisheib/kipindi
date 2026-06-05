"use client";

/**
 * Lightweight toast system.
 * - Provider mounted at the app root once (in ThemeProvider chain)
 * - useToast() hook returns a `toast()` function callable from any client component
 * - Variants: default | success | warning | danger | gold (gold for win events)
 * - Auto-dismiss with progress bar, click-to-dismiss, swipe handled implicitly via close button
 * - Stack of up to 4 visible at once
 */
import * as React from "react";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

type ToastVariant = "default" | "success" | "warning" | "danger" | "gold";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type Toast = ToastInput & { id: string; createdAt: number };

type ToastContextValue = {
  toast: (t: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastCtx = React.createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4_500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [exiting, setExiting] = React.useState<string[]>([]);
  const timersRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setExiting((prev) => prev.filter((x) => x !== id));
    const tm = timersRef.current.get(id);
    if (tm) { clearTimeout(tm); timersRef.current.delete(id); }
  }, []);

  // Two-phase dismiss: mark exiting (plays the 200ms slide/fade-out) then remove,
  // so toasts don't pop out instantly.
  const dismiss = React.useCallback((id: string) => {
    setExiting((prev) => (prev.includes(id) ? prev : [...prev, id]));
    const tm = timersRef.current.get(id);
    if (tm) clearTimeout(tm);
    timersRef.current.set(id, setTimeout(() => remove(id), 200));
  }, [remove]);

  const toast = React.useCallback((input: ToastInput) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next: Toast = {
      ...input,
      id,
      createdAt: Date.now(),
      durationMs: input.durationMs ?? DEFAULT_DURATION,
      variant: input.variant ?? "default",
    };
    setToasts((prev) => [...prev, next].slice(-MAX_VISIBLE));
    // Haptic punctuation, matched to the toast's meaning. `gold` = win/reward
    // peak → celebrate; routine `default` toasts stay silent.
    switch (next.variant) {
      case "gold":    haptics.celebrate(); break;
      case "success": haptics.success(); break;
      case "warning": haptics.warning(); break;
      case "danger":  haptics.error(); break;
    }
    const tm = setTimeout(() => dismiss(id), next.durationMs);
    timersRef.current.set(id, tm);
    return id;
  }, [dismiss]);

  React.useEffect(() => {
    return () => {
      for (const tm of timersRef.current.values()) clearTimeout(tm);
      timersRef.current.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} exiting={exiting} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) {
    // No-op fallback in case a component renders outside the provider (SSR safety)
    return {
      toast: () => "",
      dismiss: () => {},
    };
  }
  return ctx;
}

const variantStyles: Record<ToastVariant, { bar: string; icon: React.ReactNode; surface: string; rail: string }> = {
  default: {
    bar: "bg-aqua-300",
    icon: <span className="text-aqua-300"><I.checkCircle s={16} /></span>,
    surface: "bg-bg-elevated border-aqua-edge",
    rail: "bg-aqua-300",
  },
  success: {
    bar: "bg-yes-500",
    icon: <span className="text-yes-300"><I.checkCircle s={16} /></span>,
    surface: "bg-bg-elevated border-yes-700/60",
    rail: "bg-yes-500",
  },
  warning: {
    bar: "bg-gold-500",
    icon: <span className="text-gold-300"><I.warning s={16} /></span>,
    surface: "bg-bg-elevated border-gold-700/60",
    rail: "bg-gold-500",
  },
  danger: {
    bar: "bg-no-500",
    icon: <span className="text-no-300"><I.alertCircle s={16} /></span>,
    surface: "bg-bg-elevated border-no-700/60",
    rail: "bg-no-500",
  },
  gold: {
    bar: "bg-gold-500",
    icon: <span className="text-gold-300"><I.trophy s={16} /></span>,
    surface: "bg-bg-elevated border-gold-700",
    rail: "bg-gold-500",
  },
};

function ToastViewport({ toasts, exiting, onDismiss }: { toasts: Toast[]; exiting: string[]; onDismiss: (id: string) => void }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-3 pt-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:pt-0"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} exiting={exiting.includes(t.id)} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, exiting, onDismiss }: { toast: Toast; exiting: boolean; onDismiss: () => void }) {
  const v = variantStyles[toast.variant ?? "default"];
  const [enter, setEnter] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Visible only while entered AND not exiting → the shared transition animates
  // it back out (slide up + fade + scale) before the parent unmounts it.
  const visible = enter && !exiting;

  return (
    <div
      role="status"
      className={cn(
        // Kit toast — 280..360 max width, .toast surface, .shadow-card
        "pointer-events-auto relative w-full max-w-[320px] overflow-hidden rounded-md border transition-all duration-200",
        "shadow-[var(--shadow-card)]",
        v.surface,
        visible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-2 opacity-0 scale-95",
      )}
      style={{
        background: "var(--bg-elevated2)",
      }}
    >
      {/* Heraldic rail — 3px wide, gilt-tinted accent at the leading edge */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", v.rail)} aria-hidden />

      <div className="flex items-start gap-3 py-3 pl-4 pr-8">
        <div className="mt-0.5 shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-pill"
             style={{ background: "var(--bg-inset)" }}>
          {v.icon}
        </div>
        <div className="min-w-0 flex-1">
          {/* Kit toast-title 13px / 600 / -2px margin */}
          <p className="font-display text-[13px] font-semibold text-text leading-tight">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 text-[12px] text-text-muted leading-snug">{toast.description}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
        aria-label="Dismiss"
      >
        <I.x s={14} />
      </button>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-border/30" aria-hidden>
        <div
          className={cn("h-full origin-left relative", v.bar)}
          style={{
            animation: `toast-bar ${toast.durationMs}ms linear forwards`,
            boxShadow: "0 0 6px 0 currentColor",
          }}
        />
      </div>
    </div>
  );
}
