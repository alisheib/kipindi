"use client";

/**
 * AI GENERATION PROGRESS — the shared "what is happening right now" bar.
 *
 * ── WHY IT IS SHARED ─────────────────────────────────────────────────────────
 * The AI poll console had a phased progress bar. Up & Down proposal generation had a
 * spinner on a button and nothing else — and a proposal takes ~30 seconds of real
 * provider time, during which an officer has no idea whether it is working, stuck, or
 * about to fail. Ali, 2026-08-03: *"we need progress bars whenever AI is generating
 * anything, like poll generation, to know what is going on."*
 *
 * Copying the poll markup into the Up & Down page would have manufactured exactly the
 * inconsistency the campaign's standing rule forbids (§0.1b: fix the SHARED component).
 * So the poll bar was lifted here verbatim in behaviour, and both consoles now render
 * this one component.
 *
 * ── WHAT IT DOES NOT DO, ON PURPOSE ──────────────────────────────────────────
 * ⛔ It does not pretend to know progress it cannot observe. A server action gives no
 * streaming feedback, so the phases advance on TIMERS — they are an honest description of
 * the pipeline's stages and their typical pacing, not a measurement. That is why the bar
 * STOPS at the last pre-completion phase and waits there indefinitely, rather than
 * creeping to 99% and lying. If a call hangs, the elapsed clock keeps counting and the
 * bar stays put, which is the truthful picture.
 * ⛔ It never reaches 100% until the caller says the work is done.
 */
import { useEffect, useRef, useState } from "react";

export type AiPhase = {
  /** Stable key, used as the active marker. */
  key: string;
  /** What the operator reads while this phase is running. */
  label: string;
  /** Where the bar sits during this phase, 0-100. Must increase across the list. */
  pct: number;
  /** ms after the previous phase before advancing to this one. Omit on the first. */
  afterMs?: number;
};

/**
 * Drive the phase machine. Returns the active phase key and the elapsed seconds, plus
 * `start`/`finish` so the caller controls the boundaries the SERVER actually defines.
 */
export function useAiPhases(phases: AiPhase[]) {
  const [active, setActive] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (tick.current) { clearInterval(tick.current); tick.current = null; }
  };
  // Never leak a timer when the officer navigates away mid-generation.
  useEffect(() => clear, []);

  const start = () => {
    clear();
    setElapsed(0);
    setActive(phases[0]?.key ?? null);
    let at = 0;
    for (const p of phases.slice(1)) {
      at += p.afterMs ?? 800;
      timers.current.push(setTimeout(() => setActive(p.key), at));
    }
    tick.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };
  const finish = () => { clear(); setActive(null); setElapsed(0); };

  return { active, elapsed, start, finish, running: active !== null };
}

/**
 * THE BLOCKING SHELL — one scrim, one card, both consoles.
 *
 * Ali, 2026-08-03: *"when we blur everything in one screen while doing progress we should
 * in another and the same in the opposite — pick the best feature and make it visually
 * consistent."* The AI poll console blurred the page behind a centred dialog; Up & Down
 * showed a bar inline and left the whole page clickable during a 30-second call. The
 * overlay is the better of the two and not only visually: it is what stops an officer
 * double-firing a paid generation or navigating away mid-action.
 *
 * ⛔ The scrim, the blur, the card chrome and the entrance animation live HERE and nowhere
 * else. Two copies of these class lists is exactly how the two consoles drifted apart in
 * the first place.
 */
export function AiOverlayShell({ children }: { children: React.ReactNode }) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={stop}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="m-dialog-in w-[90vw] max-w-[420px] rounded-xl border border-border bg-bg-elevated p-5 shadow-e4"
        onClick={stop}
      >
        {children}
      </div>
    </div>
  );
}

export function AiProgress({
  phases, active, elapsed, note, pct: pctOverride, label: labelOverride,
}: {
  phases?: AiPhase[];
  /** Active phase key, or null when idle. */
  active?: string | null;
  /** Seconds since start — shown because a 30s wait with no clock reads as a hang. */
  elapsed?: number;
  /** One line under the bar explaining the pipeline. */
  note?: string;
  /**
   * DETERMINATE mode. The batch generator genuinely knows how far through it is
   * ("poll 3 of 8"), which the phase machine cannot express — so it passes a real
   * percentage and its own label instead. Same bar, same chrome, honest either way.
   */
  pct?: number;
  label?: string;
}) {
  const determinate = pctOverride !== undefined;
  if (!determinate && !active) return null;
  const current = determinate ? null : (phases ?? []).find((p) => p.key === active) ?? (phases ?? [])[0];
  const pct = determinate ? Math.max(0, Math.min(100, pctOverride)) : (current?.pct ?? 0);
  const label = determinate ? (labelOverride ?? "") : (current?.label ?? "");

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="h-2 w-full rounded-pill bg-bg-overlay overflow-hidden">
        <div
          className="h-full rounded-pill transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--brand-500), var(--brand-400))" }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] text-text-subtle tabular-nums">{label}</p>
        {elapsed !== undefined && (
          <p className="font-mono text-[11px] text-text-subtle tabular-nums shrink-0">
            {elapsed}s
          </p>
        )}
      </div>
      {note && <p className="text-[11px] text-text-subtle leading-relaxed">{note}</p>}
    </div>
  );
}
