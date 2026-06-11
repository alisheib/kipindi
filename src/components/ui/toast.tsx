"use client";

/**
 * Lightweight toast system.
 * - Provider mounted at the app root once (in ThemeProvider chain)
 * - useToast() hook returns a `toast()` function callable from any client component
 * - Variants: default | success | warning | danger | gold (gold for win events)
 * - Auto-dismiss with progress bar; the countdown PAUSES on hover/focus/touch
 *   (bar pauses in sync) and resumes from the banked remaining time
 * - Dismiss by: close button, or swipe the toast horizontally past a threshold
 * - Stack of up to 4 visible at once (oldest dropped on overflow, timer cleared)
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
  // Per-toast countdown bookkeeping so hover/touch can PAUSE then RESUME the
  // auto-dismiss with the correct remaining time (not restart from full).
  const metaRef = React.useRef(new Map<string, { remaining: number; start: number }>());

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setExiting((prev) => prev.filter((x) => x !== id));
    const tm = timersRef.current.get(id);
    if (tm) { clearTimeout(tm); timersRef.current.delete(id); }
    metaRef.current.delete(id);
  }, []);

  // Two-phase dismiss: mark exiting (plays the 200ms slide/fade-out) then remove,
  // so toasts don't pop out instantly.
  const dismiss = React.useCallback((id: string) => {
    setExiting((prev) => (prev.includes(id) ? prev : [...prev, id]));
    metaRef.current.delete(id); // stop any pending pause/resume from re-arming
    const tm = timersRef.current.get(id);
    if (tm) clearTimeout(tm);
    timersRef.current.set(id, setTimeout(() => remove(id), 200));
  }, [remove]);

  // Pause the countdown (pointer over / focus / mid-swipe) — bank the elapsed
  // time so the bar and timer resume from where they left off, in sync.
  const pause = React.useCallback((id: string) => {
    const meta = metaRef.current.get(id);
    const tm = timersRef.current.get(id);
    if (!meta || !tm) return; // already paused (no live timer) or gone — idempotent
    clearTimeout(tm);
    timersRef.current.delete(id);
    meta.remaining = Math.max(0, meta.remaining - (Date.now() - meta.start));
  }, []);

  const resume = React.useCallback((id: string) => {
    const meta = metaRef.current.get(id);
    if (!meta || timersRef.current.has(id)) return; // gone, or already running
    meta.start = Date.now();
    timersRef.current.set(id, setTimeout(() => dismiss(id), meta.remaining));
  }, [dismiss]);

  const toast = React.useCallback((input: ToastInput) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next: Toast = {
      ...input,
      id,
      createdAt: Date.now(),
      durationMs: input.durationMs ?? DEFAULT_DURATION,
      variant: input.variant ?? "default",
    };
    setToasts((prev) => {
      const merged = [...prev, next];
      // Flood guard: when more than MAX_VISIBLE pile up, drop the oldest — and
      // CLEAR their pending dismiss timers so a sliced-off toast can't fire a
      // late no-op setState (orphan timers were the only leak under rapid bursts).
      if (merged.length > MAX_VISIBLE) {
        for (const d of merged.slice(0, merged.length - MAX_VISIBLE)) {
          const tm = timersRef.current.get(d.id);
          if (tm) { clearTimeout(tm); timersRef.current.delete(d.id); }
          metaRef.current.delete(d.id);
        }
        return merged.slice(-MAX_VISIBLE);
      }
      return merged;
    });
    // Haptic punctuation, matched to the toast's meaning. `gold` = win/reward
    // peak → celebrate; routine `default` toasts stay silent.
    switch (next.variant) {
      case "gold":    haptics.celebrate(); break;
      case "success": haptics.success(); break;
      case "warning": haptics.warning(); break;
      case "danger":  haptics.error(); break;
    }
    metaRef.current.set(id, { remaining: next.durationMs!, start: Date.now() });
    const tm = setTimeout(() => dismiss(id), next.durationMs);
    timersRef.current.set(id, tm);
    return id;
  }, [dismiss]);

  React.useEffect(() => {
    const timers = timersRef.current;
    const meta = metaRef.current;
    return () => {
      for (const tm of timers.values()) clearTimeout(tm);
      timers.clear();
      meta.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} exiting={exiting} onDismiss={dismiss} onPause={pause} onResume={resume} />
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
    bar: "bg-brand-300",
    icon: <span className="text-brand-300"><I.checkCircle s={18} /></span>,
    surface: "bg-bg-elevated border-brand-500/40",
    rail: "bg-brand-300",
  },
  success: {
    bar: "bg-yes-500",
    icon: <span className="text-yes-300"><I.checkCircle s={18} /></span>,
    surface: "bg-bg-elevated border-yes-700/60",
    rail: "bg-yes-500",
  },
  warning: {
    bar: "bg-gold-500",
    icon: <span className="text-gold-300"><I.warning s={18} /></span>,
    surface: "bg-bg-elevated border-gold-700/60",
    rail: "bg-gold-500",
  },
  danger: {
    bar: "bg-no-500",
    icon: <span className="text-no-300"><I.alertCircle s={18} /></span>,
    surface: "bg-bg-elevated border-no-700/60",
    rail: "bg-no-500",
  },
  gold: {
    bar: "bg-gold-500",
    icon: <span className="text-gold-300"><I.trophy s={18} /></span>,
    surface: "bg-bg-elevated border-gold-700",
    rail: "bg-gold-500",
  },
};

function ToastViewport({ toasts, exiting, onDismiss, onPause, onResume }: { toasts: Toast[]; exiting: string[]; onDismiss: (id: string) => void; onPause: (id: string) => void; onResume: (id: string) => void }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-0 z-[1800] flex flex-col items-center gap-2 px-3 pt-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:pt-0"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          exiting={exiting.includes(t.id)}
          onDismiss={() => onDismiss(t.id)}
          onPause={() => onPause(t.id)}
          onResume={() => onResume(t.id)}
        />
      ))}
    </div>
  );
}

// Past this many px of horizontal drag, releasing flings the toast away.
const SWIPE_DISMISS_PX = 72;

function ToastItem({ toast, exiting, onDismiss, onPause, onResume }: { toast: Toast; exiting: boolean; onDismiss: () => void; onPause: () => void; onResume: () => void }) {
  const v = variantStyles[toast.variant ?? "default"];
  const [enter, setEnter] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [dragX, setDragX] = React.useState(0);
  const dragStart = React.useRef<number | null>(null);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Visible only while entered AND not exiting → the shared transition animates
  // it back out (slide up + fade + scale) before the parent unmounts it.
  const visible = enter && !exiting;
  const dragging = dragStart.current !== null;

  // One source of truth for transform/opacity: drag offset takes over while the
  // pointer is down, otherwise the enter/exit state drives it.
  const transform = dragX !== 0
    ? `translateX(${dragX}px)`
    : visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.95)";
  const opacity = dragX !== 0 ? Math.max(0, 1 - Math.abs(dragX) / 180) : visible ? 1 : 0;

  const onPointerEnter = () => { setPaused(true); onPause(); };
  const onPointerLeave = () => {
    // While a drag is live the pointer is captured, so a stray leave shouldn't
    // interrupt it — pointerup/cancel ends the drag. Only resume hover-pause.
    if (dragStart.current !== null) return;
    setPaused(false); onResume();
  };
  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    // Capture so move/up keep targeting this toast even if the finger leaves it.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setPaused(true); onPause();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragX(e.clientX - dragStart.current);
  };
  const endDrag = () => {
    if (dragStart.current === null) return;
    const dx = dragX;
    dragStart.current = null;
    if (Math.abs(dx) > SWIPE_DISMISS_PX) { onDismiss(); return; }
    setDragX(0);            // snap back
    setPaused(false); onResume();
  };

  return (
    <div
      role="status"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onFocusCapture={() => { setPaused(true); onPause(); }}
      onBlurCapture={() => { setPaused(false); onResume(); }}
      className={cn(
        // Kit toast — 280..360 max width, .toast surface, .shadow-card
        "pointer-events-auto relative w-full max-w-[320px] overflow-hidden rounded-md border shadow-[var(--shadow-card)]",
        v.surface,
      )}
      style={{
        background: "var(--bg-elevated2)",
        transform,
        opacity,
        // No transition mid-drag (follow the finger 1:1); ease on enter/exit/snap.
        transition: dragging ? "none" : "transform 200ms var(--ease-arrive, ease-out), opacity 200ms",
        touchAction: "pan-y",
        cursor: dragging ? "grabbing" : undefined,
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
            animationPlayState: paused ? "paused" : "running",
            boxShadow: "0 0 6px 0 currentColor",
          }}
        />
      </div>
    </div>
  );
}
