"use client";

/**
 * Lightweight toast system.
 * - Provider mounted at the app root once (in ThemeProvider chain)
 * - useToast() hook returns a `toast()` function callable from any client component
 * - Variants: default | success | warning | danger | gold (gold for win events)
 *   | factual (a settled outcome, neither praise nor alarm)
 * - Material: rung 4 (`.mat-toast`, M2) + a composed `.mat-tint-*` per variant —
 *   never a hand-written border/shadow (DA-1, 2026-08-07)
 * - Auto-dismiss with progress bar; the countdown PAUSES on hover/focus/touch
 *   (bar pauses in sync) and resumes from the banked remaining time.
 *   `durationMs: 0` = sticky: stays until dismissed (money-path failures, UD-3)
 * - Danger toasts announce as `role="alert"`; everything else stays polite
 * - Dismiss by: close button, or swipe the toast UP (iPhone-style, since the
 *   stack sits at the top) or horizontally past a threshold
 * - Stack of up to 4 visible at once (oldest dropped on overflow, timer cleared)
 */
import * as React from "react";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { subscribeResultModal } from "@/lib/result-modal-presence";

/**
 * ⭐ `factual` states something that is neither good news, a warning, nor an error — see
 * `variantStyles` for why the kit needed one and how its absence put a TICK on "Round lost".
 */
type ToastVariant = "default" | "success" | "warning" | "danger" | "gold" | "factual";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay. `0` = STICKY (UD-3): no timer, no progress bar — the
   *  toast stays until the close button / swipe. For money-path failures that
   *  must stay until read (the house primary/secondary rule). */
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
  // ⭐ WHO paused it. A countdown held by the POINTER is a person reading; a countdown held
  // by a result modal is the product standing the secondary signal down (§F1). They are not
  // the same pause and they must not be released by the same event — the §F1 effect below
  // used to release BOTH on any stack change, so a burst of arrivals silently re-armed the
  // real timer under a toast the player was hovering, with its progress bar still frozen.
  const userPausedRef = React.useRef(new Set<string>());

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setExiting((prev) => prev.filter((x) => x !== id));
    const tm = timersRef.current.get(id);
    if (tm) { clearTimeout(tm); timersRef.current.delete(id); }
    metaRef.current.delete(id);
    userPausedRef.current.delete(id);
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

  // The USER's pause — pointer over, focused, or mid-swipe. Same primitive, but it records
  // the hold so the §F1 release cannot overrule a person who is still reading.
  const userPause = React.useCallback((id: string) => {
    userPausedRef.current.add(id);
    pause(id);
  }, [pause]);

  const userResume = React.useCallback((id: string) => {
    userPausedRef.current.delete(id);
    resume(id);
  }, [resume]);

  /**
   * Put a toast on screen: stack it, punctuate it, arm its countdown.
   *
   * ⭐ Factored out of `toast()` so a HELD toast is presented by the SAME code path when the
   * modal closes. A separate "flush" that re-implemented stacking would be a second definition
   * of the flood guard and the haptic rule — and the flushed toast is the money-path failure,
   * i.e. the one that must least of all behave differently.
   */
  const present = React.useCallback((next: Toast) => {
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
          userPausedRef.current.delete(d.id);
        }
        return merged.slice(-MAX_VISIBLE);
      }
      return merged;
    });
    // Haptic punctuation, matched to the toast's meaning. Every one of these marks a
    // real event landing — the kit's physical-only rule. `gold` takes `success` (money
    // settled), never the `celebrate` flourish: a reward buzz is reinforcement, which
    // the rule forbids. Routine `default` toasts stay silent.
    switch (next.variant) {
      case "gold":    haptics.success(); break;
      case "success": haptics.success(); break;
      case "warning": haptics.warning(); break;
      case "danger":  haptics.error(); break;
    }
    // Sticky (durationMs 0): no countdown at all — dismiss is the user's act.
    if (next.durationMs! > 0) {
      metaRef.current.set(next.id, { remaining: next.durationMs!, start: Date.now() });
      const tm = setTimeout(() => dismiss(next.id), next.durationMs);
      timersRef.current.set(next.id, tm);
    }
  }, [dismiss]);

  /* ── §F1 · WHILE A RESULT MODAL IS UP, THE SECONDARY SIGNAL WAITS ITS TURN ──────────────
   *
   * At 360px the toast stack covers the bet receipt's CREST for the toast's first 3 seconds.
   * At 768 and above there is room for both, which is exactly why it survived: the two fire
   * together by design and only the narrowest viewport — the one most players are on — collides.
   *
   * 🔴 THE FIRST IMPLEMENTATION OF THIS WAS WRONG, AND ONLY THE FRAME SAID SO. It asked
   * `isResultModalOpen()` INSIDE `toast()` and queued the toast if a modal was up. Every static
   * assertion passed and `red:feedback-law` caught all three mutations — and driving a real bet
   * at 360 in all three languages showed the toast on screen over the receipt anyway. The
   * quick-bet fires its toast in the same commit that mounts the modal, and presence is
   * registered from an EFFECT, so at the moment `toast()` ran the modal was not open yet. A
   * check whose answer depends on which effect ran first is a coin flip, and it landed the same
   * way every time, which is what made it look like a working fix.
   *
   * ⭐ SO IT IS REACTIVE, NOT A DECISION TAKEN AT ARRIVAL TIME. Toasts are stacked exactly as
   * before; the VIEWPORT holds them back while a modal is up, and their countdowns pause and
   * resume through the same `pause`/`resume` the hover behaviour already uses. Ordering cannot
   * matter, because there is no instant at which the answer is captured.
   *
   * ⛔ NOTHING IS DROPPED, BY CONSTRUCTION. A held toast never leaves `toasts` — it is not
   * queued somewhere else and re-presented, it simply is not painted yet, and its timer is not
   * running while it is unseen. A sticky money-path failure (`durationMs: 0`, the shape UD-3
   * requires so a refusal stays until read) has no timer to pause and is untouched.
   *
   * ⛔ AND NOT A Z-INDEX CHANGE: toasts sit above modals deliberately, so a failure fired during
   * a CONFIRM dialog stays readable. Only a RESULT modal stands the toast down.
   */
  const [resultModalOpen, setResultModalOpen] = React.useState(false);
  // ⚠️ Subscribed once, for the life of the provider: a subscription tied to a modal's own
  // lifetime would be torn down by the very unmount it needs to react to.
  React.useEffect(() => subscribeResultModal(setResultModalOpen), []);

  /* Pause every countdown while the modal is up; release them when it closes. Reusing the
   * hover machinery means a held toast gets its FULL dwell once it is actually on screen —
   * banking the remaining time is exactly what `pause` already does.
   *
   * 🔴 THE RELEASE IS AN EDGE, NOT A STATE. This effect re-runs on every `toasts` identity
   * change — a new arrival, a removal — and the old `else` branch therefore bulk-RESUMED
   * every countdown on any of them, with no modal involved at all. On a toast the pointer
   * was resting on that re-armed the real dismiss timer while `ToastItem`'s own `paused`
   * state kept the progress bar frozen: under a burst the toast the player was reading
   * vanished mid-sentence, under a bar that still looked half full. `prevModalOpenRef` makes
   * the release fire only on the modal's true→false edge.
   *
   * ⭐ THE PAUSE SIDE STILL TRACKS THE STACK, deliberately: a toast that ARRIVES while a
   * result modal is up must be held too, and only an effect that re-runs on `toasts` can
   * catch it. Only the release is edge-driven.
   *
   * ⛔ AND A USER-HELD TOAST IS NEVER WOKEN BY THE MODAL CLOSING. That is their pause, and
   * the primary signal going away is not permission to start counting down on it.
   *
   * ⚠️ The set is cleared on the RISING edge because `ToastViewport` returns null while
   * held — every `ToastItem` unmounts, so no pointerleave/blur will ever fire, and a hover
   * recorded before the modal opened would otherwise stick forever and the toast would
   * never dismiss at all.
   *
   * ⛔ KEEP THE BODY BELOW COMMENT-FREE — `feedback-law.test.mts` 10.6 pins its exact shape
   * across the line breaks, which is why every word of explanation is hoisted up here.
   */
  const prevModalOpenRef = React.useRef(false);
  React.useEffect(() => {
    const ids = toasts.map((t) => t.id);
    if (resultModalOpen) {
      if (!prevModalOpenRef.current) userPausedRef.current.clear();
      for (const id of ids) pause(id);
    } else if (prevModalOpenRef.current) {
      for (const id of ids) if (!userPausedRef.current.has(id)) resume(id);
    }
    prevModalOpenRef.current = resultModalOpen;
  }, [resultModalOpen, toasts, pause, resume]);

  const toast = React.useCallback((input: ToastInput) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next: Toast = {
      ...input,
      id,
      createdAt: Date.now(),
      durationMs: input.durationMs ?? DEFAULT_DURATION,
      variant: input.variant ?? "default",
    };
    present(next);
    return id;
  }, [present]);

  React.useEffect(() => {
    const timers = timersRef.current;
    const meta = metaRef.current;
    const userPaused = userPausedRef.current;
    return () => {
      for (const tm of timers.values()) clearTimeout(tm);
      timers.clear();
      meta.clear();
      userPaused.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} exiting={exiting} held={resultModalOpen} onDismiss={dismiss} onPause={userPause} onResume={userResume} />
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

/**
 * Deferred toast — fires AFTER a `useTransition` settles, not on an arbitrary
 * delay. Pass the `pending` boolean from `useTransition`; call `deferToast()`
 * inside the transition callback. The toast fires the frame after `pending`
 * flips false → the refresh is committed and the new data is visible.
 *
 * Error toasts should still use `toast()` directly — the user needs to see
 * failures immediately regardless of transition state.
 *
 * ```tsx
 * const [pending, start] = useTransition();
 * const { deferToast, toast } = useDeferredToast(pending);
 *
 * start(async () => {
 *   const r = await action(fd);
 *   if (r.ok) { router.refresh(); deferToast({ title: "Saved" }); }
 *   else toast({ title: "Failed", variant: "danger" });
 * });
 * ```
 */
export function useDeferredToast(pending: boolean) {
  const { toast, dismiss } = useToast();
  const queueRef = React.useRef<ToastInput[]>([]);
  const wasPendingRef = React.useRef(false);

  React.useEffect(() => {
    // Falling edge: pending was true, now false → transition settled, data visible.
    if (wasPendingRef.current && !pending && queueRef.current.length > 0) {
      for (const t of queueRef.current) toast(t);
      queueRef.current = [];
    }
    wasPendingRef.current = pending;
  }, [pending, toast]);

  const deferToast = React.useCallback((input: ToastInput) => {
    queueRef.current.push(input);
  }, []);

  return { deferToast, toast, dismiss };
}

/**
 * DA-1 (2026-08-07) — the toast is RUNG 4, the highest physical object in the
 * product (M2). `.mat-toast` carries the wash + border + `--elev-toast` cast;
 * each variant contributes only a COMPOSED tint (`.mat-tint-*` sets the
 * `--mat-tint` slot every rung's box-shadow opens with) — no per-variant border
 * literals, no `bg-bg-elevated` (which was dead anyway: an inline
 * `--bg-elevated2` override painted over it), no rung-1 `--shadow-card`.
 */
const variantStyles: Record<ToastVariant, { bar: string; icon: React.ReactNode; surface: string; rail: string }> = {
  default: {
    bar: "bg-brand-300",
    icon: <span className="text-brand-300"><I.checkCircle s={18} /></span>,
    surface: "mat-tint-brand",
    rail: "bg-brand-300",
  },
  success: {
    bar: "bg-yes-500",
    icon: <span className="text-yes-300"><I.checkCircle s={18} /></span>,
    surface: "mat-tint-yes",
    rail: "bg-yes-500",
  },
  warning: {
    bar: "bg-gold-500",
    icon: <span className="text-gold-300"><I.warning s={18} /></span>,
    surface: "mat-tint-warn",
    rail: "bg-gold-500",
  },
  danger: {
    bar: "bg-no-500",
    icon: <span className="text-no-300"><I.alertCircle s={18} /></span>,
    surface: "mat-tint-no",
    rail: "bg-no-500",
  },
  gold: {
    bar: "bg-gold-500",
    icon: <span className="text-gold-300"><I.trophy s={18} /></span>,
    surface: "mat-tint-gilt",
    rail: "bg-gold-500",
  },
  /**
   * FACTUAL — states something that is neither good news, a warning, nor an error.
   *
   * ⛔ ADDED 2026-08-05 BECAUSE THE KIT COULD NOT SAY "YOU LOST" HONESTLY, and the gap was
   * found by looking at a photograph of a real one. Every other variant editorialises:
   * `default` and `success` both paint **`checkCircle`**, so a toast reading *"Round lost ·
   * TZS 2,000"* carried a **tick** — a confirmation glyph over the news that a player's money
   * is gone, which is precisely the euphemism the RG wording rules exist to prevent. `warning`
   * is **gold**, the celebration ink on this platform. `danger` is red `alertCircle` and reads
   * as *something went wrong* — but losing a round is not an error, it is the game working.
   *
   * So: muted ink, an `info` glyph, no colour that congratulates or alarms. Use it for a
   * settled outcome the player did not want but that the product performed correctly.
   */
  factual: {
    bar: "bg-text-muted",
    icon: <span className="text-text-secondary"><I.info s={18} /></span>,
    // Deliberately NO tint — the plain rung IS the material distinction between
    // "here is information" and a coloured state (M7: losses get the receipt).
    surface: "",
    rail: "bg-text-muted",
  },
};

function ToastViewport({ toasts, exiting, held, onDismiss, onPause, onResume }: { toasts: Toast[]; exiting: string[]; held: boolean; onDismiss: (id: string) => void; onPause: (id: string) => void; onResume: (id: string) => void }) {
  const { t } = useT();
  // ⭐ §F1 · HELD, NOT DISCARDED. The stack still holds every toast and their countdowns are
  // paused, so nothing is lost and nothing expires unseen — the primary signal simply owns the
  // screen until it is dismissed. ⛔ Returning null here rather than restacking z-index keeps
  // the ordering that lets a failure fired during a CONFIRM dialog stay readable.
  if (held) return null;
  return (
    <div
      role="region"
      aria-label={t.common.notifications}
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

// Release past these thresholds flings the toast away. Up-swipe is the primary
// gesture (banners live at the top, iPhone-style); horizontal also works.
const SWIPE_DISMISS_PX = 72; // horizontal
const SWIPE_UP_PX = 44;      // upward

function ToastItem({ toast, exiting, onDismiss, onPause, onResume }: { toast: Toast; exiting: boolean; onDismiss: () => void; onPause: () => void; onResume: () => void }) {
  const { t } = useT();
  const v = variantStyles[toast.variant ?? "default"];
  const [enter, setEnter] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [drag, setDrag] = React.useState({ x: 0, y: 0 });
  const dragStart = React.useRef<{ x: number; y: number } | null>(null);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Visible only while entered AND not exiting → the shared transition animates
  // it back out (slide up + fade + scale) before the parent unmounts it.
  const visible = enter && !exiting;
  const dragging = dragStart.current !== null;
  const dragged = drag.x !== 0 || drag.y !== 0;

  // One source of truth for transform/opacity: drag offset takes over while the
  // pointer is down (follow the finger; only allow UP on the Y axis), otherwise
  // the enter/exit state drives it.
  const transform = dragged
    ? `translate(${drag.x}px, ${drag.y}px)`
    : visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.95)";
  const opacity = dragged ? Math.max(0, 1 - Math.max(Math.abs(drag.x), Math.abs(drag.y)) / 160) : visible ? 1 : 0;

  const onPointerEnter = () => { setPaused(true); onPause(); };
  const onPointerLeave = () => {
    // While a drag is live the pointer is captured, so a stray leave shouldn't
    // interrupt it — pointerup/cancel ends the drag. Only resume hover-pause.
    if (dragStart.current !== null) return;
    setPaused(false); onResume();
  };
  const onPointerDown = (e: React.PointerEvent) => {
    // Don't capture the pointer when the dismiss button (or anything inside
    // it) was clicked — setPointerCapture redirects pointerup to the
    // container, which prevents the button's onClick from firing.
    const target = e.target as HTMLElement;
    if (target.closest("button[data-toast-dismiss]")) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    // Capture so move/up keep targeting this toast even if the finger leaves it.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setPaused(true); onPause();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = dragStart.current;
    if (!s) return;
    // Allow upward movement only on Y (a top banner doesn't pull down to dismiss).
    setDrag({ x: e.clientX - s.x, y: Math.min(0, e.clientY - s.y) });
  };
  const endDrag = () => {
    if (dragStart.current === null) return;
    const { x, y } = drag;
    dragStart.current = null;
    if (Math.abs(x) > SWIPE_DISMISS_PX || -y > SWIPE_UP_PX) { onDismiss(); return; }
    setDrag({ x: 0, y: 0 });   // snap back
    setPaused(false); onResume();
  };

  const sticky = toast.durationMs === 0;

  return (
    <div
      // V-5 / UD-12: a money-failure toast must be announced assertively —
      // `status` is polite and a 4.5s auto-dismiss can outrun the SR queue.
      role={toast.variant === "danger" ? "alert" : "status"}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onFocusCapture={() => { setPaused(true); onPause(); }}
      onBlurCapture={() => { setPaused(false); onResume(); }}
      className={cn(
        // Rung 4 (`.mat-toast`): wash, border and `--elev-toast` cast come from
        // the ladder; the variant adds only its composed `.mat-tint-*` ring.
        // No own border/shadow classes here — that is the rung's job (M2).
        "pointer-events-auto relative w-full max-w-[320px] overflow-hidden rounded-md mat-toast",
        v.surface,
      )}
      style={{
        transform,
        opacity,
        // No transition mid-drag (follow the finger 1:1); ease on enter/exit/snap.
        transition: dragging ? "none" : "transform var(--t-base) var(--ease-arrive, ease-out), opacity var(--t-base)",
        // `none` so the toast itself owns the swipe (up/sideways) instead of the
        // browser scrolling the page behind it.
        touchAction: "none",
        cursor: dragging ? "grabbing" : undefined,
      }}
    >
      {/* Heraldic rail — 3px wide, gilt-tinted accent at the leading edge */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", v.rail)} aria-hidden />

      <div className="flex items-start gap-3 py-3 pl-4 pr-8">
        <div className="mt-0.5 shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-pill border border-border/40"
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
        data-toast-dismiss=""
        className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
        aria-label={t.common.dismiss}
      >
        <I.x s={14} />
      </button>
      {/* Countdown hairline — a sticky toast has no countdown, so no bar. */}
      {!sticky && (
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
      )}
    </div>
  );
}
