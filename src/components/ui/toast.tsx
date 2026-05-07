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
import { CheckCircle2, AlertTriangle, AlertCircle, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const timersRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

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
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
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
    icon: <CheckCircle2 size={16} className="text-aqua-300" />,
    surface: "bg-bg-elevated border-aqua-edge",
    rail: "bg-aqua-300",
  },
  success: {
    bar: "bg-yes-500",
    icon: <CheckCircle2 size={16} className="text-yes-300" />,
    surface: "bg-bg-elevated border-yes-700/60",
    rail: "bg-yes-500",
  },
  warning: {
    bar: "bg-gold-500",
    icon: <AlertTriangle size={16} className="text-gold-300" />,
    surface: "bg-bg-elevated border-gold-700/60",
    rail: "bg-gold-500",
  },
  danger: {
    bar: "bg-no-500",
    icon: <AlertCircle size={16} className="text-no-300" />,
    surface: "bg-bg-elevated border-no-700/60",
    rail: "bg-no-500",
  },
  gold: {
    bar: "bg-gold-500",
    icon: <Trophy size={16} className="text-gold-300" />,
    surface: "bg-bg-elevated border-gold-700",
    rail: "bg-gold-500",
  },
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-3 pt-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:pt-0"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const v = variantStyles[toast.variant ?? "default"];
  const [enter, setEnter] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="status"
      className={cn(
        // Kit toast — 280..360 max width, .toast surface, .shadow-card
        "pointer-events-auto relative w-full max-w-[340px] overflow-hidden rounded-md border transition-all duration-200",
        "shadow-[var(--shadow-card)]",
        v.surface,
        enter ? "translate-y-0 opacity-100 scale-100" : "-translate-y-2 opacity-0 scale-95",
      )}
      style={{ background: "var(--bg-elevated)" }}
    >
      {/* Heraldic rail — 3px wide, gilt-tinted accent at the leading edge */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", v.rail)} aria-hidden />

      <div className="flex items-start gap-3 py-3 pl-4 pr-8">
        <div className="mt-0.5 shrink-0 inline-flex h-[22px] w-[22px] items-center justify-center rounded-pill"
             style={{ background: "color-mix(in oklab, var(--bg-overlay) 55%, transparent)" }}>
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
        <X size={14} />
      </button>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-border/40">
        <div
          className={cn("h-full origin-left", v.bar)}
          style={{
            animation: `kp-toast-progress ${toast.durationMs}ms linear forwards`,
          }}
        />
      </div>
      <style jsx>{`
        @keyframes kp-toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
