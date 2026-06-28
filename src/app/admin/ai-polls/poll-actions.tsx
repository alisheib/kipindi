"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { I } from "@/components/ui/glyphs";
import {
  generatePollAction,
  generatePollBatchAction,
  updatePollConfigAction,
  approvePollAction,
  rejectPollAction,
  editPollAction,
  publishPollAction,
  deletePollAction,
  deleteAllPollsAction,
  seedFixturesAction,
} from "./actions";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import type { StoredAIPoll, QualityIndicator, FilterReason } from "@/lib/server/ai-poll-generation";
import type { AIPollConfig } from "@/lib/server/ai-poll-config";

const adminTextarea = "w-full rounded-lg border border-border bg-[var(--bg-inset)] px-3 py-2.5 text-[13px] text-text placeholder:text-text-subtle outline-none admin-focus transition-colors resize-none";

/**
 * After a generate/regenerate/batch action + router.refresh(), the new poll
 * lands somewhere down the list while the page is still scrolled at the form —
 * so the operator can't see what was produced. This scrolls the target element
 * into view and flashes it. The list re-renders asynchronously after refresh(),
 * so we poll briefly for the element (up to ~3s) and no-op if it never appears
 * (e.g. a filtered poll on a later page).
 */
let _revealTimer: ReturnType<typeof setTimeout> | null = null;
let _revealFlashEl: HTMLElement | null = null;
function revealElement(elementId: string) {
  if (typeof document === "undefined") return;
  // Latest-wins: cancel any in-flight reveal so rapid successive generations
  // don't spawn competing loops that fight over the scroll position.
  if (_revealTimer) { clearTimeout(_revealTimer); _revealTimer = null; }
  if (_revealFlashEl) { _revealFlashEl.classList.remove("poll-flash"); _revealFlashEl = null; }
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Restart the flash even if it's the same element (reflow re-triggers it).
      el.classList.remove("poll-flash");
      void el.offsetWidth;
      el.classList.add("poll-flash");
      _revealFlashEl = el;
      _revealTimer = setTimeout(() => {
        el.classList.remove("poll-flash");
        if (_revealFlashEl === el) _revealFlashEl = null;
        _revealTimer = null;
      }, 2000);
      return;
    }
    _revealTimer = tries++ < 40 ? setTimeout(tick, 80) : null;
  };
  _revealTimer = setTimeout(tick, 80);
}

/* ─── Generate form ─── */

const CATEGORIES = [
  { id: "sports", label: "Sports" },
  { id: "macro", label: "Macro / Economy" },
  { id: "weather", label: "Weather" },
  { id: "crypto", label: "Crypto" },
  { id: "culture", label: "Culture" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "tech", label: "Tech" },
  { id: "mixed", label: "Mixed / All" },
] as const;

type GenPhase = "idle" | "calling" | "validating" | "filtering" | "done";
type GenResult = { state: string; title: string; quality: number; reasons: string[] } | null;

const PHASE_LABELS: Record<GenPhase, string> = {
  idle: "",
  calling: "Calling AI model…",
  validating: "Validating response…",
  filtering: "Running quality checks…",
  done: "",
};

const PHASE_PROGRESS: Record<GenPhase, number> = {
  idle: 0,
  calling: 25,
  validating: 55,
  filtering: 80,
  done: 100,
};

export function GenerateForm() {
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("sports");
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<GenPhase>("idle");
  const [result, setResult] = useState<GenResult>(null);
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const router = useRouter();
  // Controlled Poll state
  const [controlled, setControlled] = useState(false);
  const [controlledTitle, setControlledTitle] = useState("");
  const [controlledResolutionAt, setControlledResolutionAt] = useState("");
  const [controlledSelectionClosedAt, setControlledSelectionClosedAt] = useState("");

  const clearTimers = () => {
    phaseTimers.current.forEach(clearTimeout);
    phaseTimers.current = [];
  };

  // Cleanup timers on unmount (user navigates away mid-generation)
  useEffect(() => () => clearTimers(), []);

  // Escape key dismisses the result card (only when done, never mid-generation)
  useEffect(() => {
    if (phase !== "done") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  const generate = () => {
    setPhase("calling");
    setResult(null);
    clearTimers();
    // Simulate phases while the real call runs — gives visual progress
    phaseTimers.current.push(setTimeout(() => setPhase("validating"), 800));
    phaseTimers.current.push(setTimeout(() => setPhase("filtering"), 1600));

    start(async () => {
      const fd = new FormData();
      fd.set("category", category);
      fd.set("prompt", prompt);
      if (controlled && controlledTitle) fd.set("controlledTitle", controlledTitle);
      if (controlled && controlledResolutionAt) fd.set("controlledResolutionAt", new Date(controlledResolutionAt).toISOString());
      if (controlled && controlledSelectionClosedAt) fd.set("controlledSelectionClosedAt", new Date(controlledSelectionClosedAt).toISOString());
      try {
        const r = await generatePollAction(fd);
        clearTimers();
        const state = r.ok ? r.poll.state : "VALIDATION_FAILED";
        setResult({
          state,
          title: r.ok ? r.poll.titleEn : "",
          quality: r.ok ? r.poll.overallQuality : 0,
          reasons: r.ok ? r.poll.filterReasons.map((r: string) => REASON_LABELS[r] ?? r) : ["Server error"],
        });
        setPhase("done");
        router.refresh();
        if (r.ok && state === "PENDING_REVIEW") {
          revealElement(`poll-${r.poll.id}`);
        }
      } catch {
        clearTimers();
        setResult({ state: "VALIDATION_FAILED", title: "", quality: 0, reasons: ["Server error — try again"] });
        setPhase("done");
      }
    });
  };

  const dismiss = () => {
    setPhase("idle");
    setResult(null);
  };

  const active = phase !== "idle";

  return (
    <div className="relative">
      {/* Form — disabled during generation */}
      <div className={active ? "pointer-events-none select-none opacity-30 blur-[1px] transition-all duration-200" : "transition-all duration-200"}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-pill text-[12px] font-mono uppercase tracking-[0.1em] border transition-colors ${
                  category === c.id
                    ? "border-gold bg-gold/10 text-gold-300"
                    : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: guide the AI with specific instructions (e.g. 'Focus on Premier League football this weekend')"
            className={adminTextarea}
            rows={2}
          />

          {/* ── Controlled Poll — collapsible advanced section ── */}
          <button
            type="button"
            onClick={() => setControlled((v) => !v)}
            className="flex items-center gap-2 text-[12px] font-semibold text-text-muted hover:text-text transition-colors"
          >
            <I.chevronRight s={13} className={`transition-transform duration-150 ${controlled ? "rotate-90" : ""}`} />
            Controlled Poll · Kura Iliyodhibitiwa
          </button>
          {controlled && (
            <div className="space-y-2.5 rounded-lg border border-border bg-bg-overlay p-3.5">
              <p className="text-[11px] text-text-subtle leading-snug">
                Set specific dates and title. The AI will generate the criterion, options, and sources around your constraints.
              </p>
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-text">Title (EN) · Optional</label>
                <Input value={controlledTitle} onChange={(e) => setControlledTitle(e.target.value)} placeholder="e.g. Will Tanzania beat Kenya in the CECAFA Cup final?" size="sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-text">Selection Close · Kufunga uchaguzi</label>
                  <input
                    type="datetime-local"
                    value={controlledSelectionClosedAt}
                    onChange={(e) => setControlledSelectionClosedAt(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-bg-inset px-2.5 text-[12.5px] font-mono text-text outline-none admin-focus transition-colors"
                  />
                  <p className="mt-0.5 text-[10px] text-text-subtle">When new bets stop · Wakati wa kufunga</p>
                </div>
                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-text">Resolution Date · Tarehe ya matokeo</label>
                  <input
                    type="datetime-local"
                    value={controlledResolutionAt}
                    onChange={(e) => setControlledResolutionAt(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-bg-inset px-2.5 text-[12.5px] font-mono text-text outline-none admin-focus transition-colors"
                  />
                  <p className="mt-0.5 text-[10px] text-text-subtle">When outcome is known · Wakati matokeo yanajulikana</p>
                </div>
              </div>
              {controlled && controlledSelectionClosedAt && controlledResolutionAt && new Date(controlledSelectionClosedAt) >= new Date(controlledResolutionAt) && (
                <p className="text-[11px] font-semibold text-[var(--no-400)]">
                  Selection close must be before resolution date.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={pending || active || !!(controlled && controlledSelectionClosedAt && controlledResolutionAt && new Date(controlledSelectionClosedAt) >= new Date(controlledResolutionAt))}
              className="btn btn-gold btn-sm rounded-pill min-w-[160px]"
            >
              {controlled ? "Generate controlled poll" : "Generate poll"}
            </button>
            <span className="text-[11px] text-text-subtle font-mono">
              Category: {category}{controlled ? " · controlled" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Generation overlay — fixed scrim blocks the entire page while running */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-[90vw] max-w-[420px] rounded-xl border border-border bg-bg-elevated p-5 shadow-e4" style={{ animation: "np-rise 200ms cubic-bezier(.2,.8,.2,1)" }} onClick={(e) => e.stopPropagation()}>
            {phase !== "done" ? (
              /* ── In-progress ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-gold-300 border-t-transparent animate-spin shrink-0" />
                  <p className="font-display text-[15px] font-semibold text-text">Generating poll</p>
                </div>
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-pill bg-bg-overlay overflow-hidden">
                    <div
                      className="h-full rounded-pill transition-all duration-700 ease-out"
                      style={{
                        width: `${PHASE_PROGRESS[phase]}%`,
                        background: "linear-gradient(90deg, var(--gold-500), var(--gold-400))",
                      }}
                    />
                  </div>
                  <p className="font-mono text-[11px] text-text-subtle tabular-nums">
                    {PHASE_LABELS[phase]}
                  </p>
                </div>
                <p className="text-[11px] text-text-subtle leading-relaxed">
                  The AI generates a poll, then it passes through validation, duplicate detection, and quality scoring.
                </p>
              </div>
            ) : result ? (
              /* ── Result ── */
              <div className="space-y-3">
                {result.state === "PENDING_REVIEW" ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yes-500/15 text-yes-300 shrink-0"><I.check s={18} /></span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-text">Poll ready for review</p>
                        <p className="font-mono text-[11px] text-yes-300">Quality: {result.quality}%</p>
                      </div>
                    </div>
                    {result.title && (
                      <p className="text-[13px] text-text-muted leading-snug line-clamp-2">{result.title}</p>
                    )}
                  </>
                ) : result.state === "FILTERED" ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning-bg text-warning-fg shrink-0"><I.warning s={18} /></span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-text">Didn&apos;t pass quality checks</p>
                        <p className="font-mono text-[11px] text-warning-fg">Try generating again</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.reasons.map((r, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-mono border border-warning-border bg-warning-bg/30 text-warning-fg">{r}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-no-500/15 text-no-300 shrink-0"><I.x s={18} /></span>
                      <div>
                        <p className="font-display text-[15px] font-semibold text-text">Generation failed</p>
                        <p className="font-mono text-[11px] text-no-300">AI provider error</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.reasons.map((r, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-mono border border-no-700/40 bg-no-500/10 text-no-300">{r}</span>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm rounded-pill flex-1">
                    Dismiss
                  </button>
                  <button type="button" onClick={() => { dismiss(); generate(); }} className="btn btn-gold btn-sm rounded-pill flex-1">
                    Generate another
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Batch generate ─── */

type BatchPhase = "idle" | "running" | "done";
type BatchSummary = { total: number; pending: number; filtered: number };

export function BatchGenerateForm({ maxBatch, remaining }: { maxBatch: number; remaining: number }) {
  const [pending, start] = useTransition();
  const suggested = Math.min(maxBatch, Math.max(1, remaining || 3));
  const [count, setCount] = useState(String(suggested));
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<BatchPhase>("idle");
  const [total, setTotal] = useState(0);
  const [pct, setPct] = useState(0);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const clearTick = () => { if (tick.current) { clearInterval(tick.current); tick.current = null; } };
  useEffect(() => () => clearTick(), []);
  useEffect(() => {
    if (phase !== "done") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  // Per-poll progress is SIMULATED (the batch action is one server round-trip
  // with no per-poll callback): the bar eases toward ~92% across the estimated
  // run, then snaps to 100% when the real response lands — same fake-timer
  // approach the single-poll form uses, just paced for N polls.
  const run = () => {
    const n = Math.max(1, parseInt(count, 10) || 1);
    setTotal(n);
    setPct(0);
    setSummary(null);
    setError(null);
    setPhase("running");
    clearTick();
    // Ease toward a 92% cap; pace so a full batch takes roughly n × ~3.5s.
    const target = 92;
    const step = Math.max(1.5, target / ((n * 3500) / 350));
    tick.current = setInterval(() => {
      setPct((p) => (p >= target ? p : Math.min(target, p + step)));
    }, 350);

    start(async () => {
      try {
        const fd = new FormData();
        fd.set("count", count);
        fd.set("prompt", prompt);
        const r = await generatePollBatchAction(fd);
        clearTick();
        router.refresh();
        if (r.ok) {
          setSummary({ total: r.total, pending: r.summary.PENDING_REVIEW, filtered: r.summary.FILTERED + r.summary.VALIDATION_FAILED });
          setPct(100);
          setPhase("done");
          if (r.summary.PENDING_REVIEW > 0) revealElement("ai-polls-pending");
        } else {
          setError("Server error — try again with fewer polls.");
          setPct(100);
          setPhase("done");
        }
      } catch {
        clearTick();
        setError("Server error — please try again.");
        setPct(100);
        setPhase("done");
      }
    });
  };

  const dismiss = () => { setPhase("idle"); setSummary(null); setError(null); setPct(0); };

  const active = phase !== "idle";
  // Estimated poll currently in flight (1-based), derived from the simulated %.
  const currentPoll = Math.min(total, Math.floor((pct / 100) * total) + 1);

  return (
    <div className="flex flex-wrap items-end gap-3 pt-3 mt-3 border-t border-border/60">
      <label className="block">
        <span className="text-[10px] text-text-subtle block mb-1 font-mono uppercase tracking-[0.12em]">
          Batch count (max {maxBatch})
        </span>
        <Input
          type="number"
          min={1}
          max={maxBatch}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          mono
          size="sm"
          containerClassName="w-24"
        />
      </label>
      <div className="flex-1 min-w-[220px]">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional guidance applied to every poll in the batch"
          size="sm"
        />
      </div>
      <button
        type="button"
        onClick={run}
        disabled={pending || active}
        className="btn btn-ghost btn-sm rounded-pill min-w-[150px]"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Generating batch…
          </span>
        ) : (
          "Generate batch"
        )}
      </button>
      <span className="text-[11px] text-text-subtle font-mono">
        Two-tier: brainstorm → free filter → enrich keepers. Fewer rejects, lower cost.
      </span>

      {/* Simulated per-poll progress overlay */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-[90vw] max-w-[440px] rounded-xl border border-border bg-bg-elevated p-5 shadow-e4" style={{ animation: "np-rise 200ms cubic-bezier(.2,.8,.2,1)" }} onClick={(e) => e.stopPropagation()}>
            {phase === "running" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-gold-300 border-t-transparent animate-spin shrink-0" />
                  <p className="font-display text-[15px] font-semibold text-text">Generating {total} poll{total !== 1 ? "s" : ""}</p>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-pill bg-bg-overlay overflow-hidden">
                    <div
                      className="h-full rounded-pill transition-all duration-300 ease-out"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--gold-500), var(--gold-400))" }}
                    />
                  </div>
                  <p className="font-mono text-[11px] text-text-subtle tabular-nums">
                    {pct < 28 ? "Brainstorming ideas across categories…" : `Refining poll ${currentPoll} of ${total}`} · {Math.round(pct)}%
                  </p>
                </div>
                <p className="text-[11px] text-text-subtle leading-relaxed">
                  Two-tier: a cheap pass brainstorms ideas and filters duplicates / out-of-window dates for free, then the full Sonnet + web-search pipeline runs only on the keepers.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${error ? "bg-no-500/15 text-no-300" : "bg-yes-500/15 text-yes-300"}`}>
                    {error ? <I.x s={18} /> : <I.check s={18} />}
                  </span>
                  <p className="font-display text-[15px] font-semibold text-text">
                    {error ? "Batch failed" : `Batch complete — ${summary?.total ?? 0} generated`}
                  </p>
                </div>
                <p className="text-[12.5px] text-text-muted">
                  {error ?? `${summary?.pending ?? 0} ready for review · ${summary?.filtered ?? 0} filtered`}
                </p>
                <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm rounded-pill w-full">Dismiss</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Config panel ─── */

const LEAD_TIME_CATEGORIES = ["sports", "weather", "crypto", "culture", "tech", "macro", "infrastructure", "other"] as const;
const LEAD_TIME_LABELS: Record<string, string> = {
  sports: "Sports", weather: "Weather", crypto: "Crypto",
  culture: "Culture", tech: "Tech", macro: "Macro",
  infrastructure: "Infrastructure", other: "Other",
};

export function ConfigPanel({ config }: { config: AIPollConfig }) {
  const [pending, start] = useTransition();
  const [webSearch, setWebSearch] = useState(config.webSearchEnabled);
  const [dailyTarget, setDailyTarget] = useState(String(config.dailyTarget));
  const [minLead, setMinLead] = useState(String(config.minLeadTimeHours));
  const [maxLead, setMaxLead] = useState(String(config.maxLeadTimeDays));
  const [minConf, setMinConf] = useState(String(config.minConfidence));
  const [maxBatch, setMaxBatch] = useState(String(config.maxBatchPerRun));
  const [leadTimes, setLeadTimes] = useState<Record<string, string>>(
    Object.fromEntries(LEAD_TIME_CATEGORIES.map((c) => [c, String(config.selectionLeadTimeHours?.[c] ?? 24)])),
  );
  const router = useRouter();
  const { deferToast } = useDeferredToast(pending);

  const save = (override?: Partial<{ webSearchEnabled: boolean }>) => {
    start(async () => {
      const fd = new FormData();
      fd.set("webSearchEnabled", String(override?.webSearchEnabled ?? webSearch));
      fd.set("dailyTarget", dailyTarget);
      fd.set("minLeadTimeHours", minLead);
      fd.set("maxLeadTimeDays", maxLead);
      fd.set("minConfidence", minConf);
      fd.set("maxBatchPerRun", maxBatch);
      for (const [cat, hrs] of Object.entries(leadTimes)) {
        fd.set(`selectionLead.${cat}`, hrs);
      }
      const r = await updatePollConfigAction(fd);
      router.refresh();
      if (r.ok) {
        // Re-seed from the server's CLAMPED values so an out-of-range entry
        // (e.g. confidence 200) snaps back to what was actually saved (100).
        setWebSearch(r.config.webSearchEnabled);
        setDailyTarget(String(r.config.dailyTarget));
        setMinLead(String(r.config.minLeadTimeHours));
        setMaxLead(String(r.config.maxLeadTimeDays));
        setMinConf(String(r.config.minConfidence));
        setMaxBatch(String(r.config.maxBatchPerRun));
        if (r.config.selectionLeadTimeHours) {
          setLeadTimes(Object.fromEntries(LEAD_TIME_CATEGORIES.map((c) => [c, String(r.config.selectionLeadTimeHours[c] ?? 24)])));
        }
        deferToast({ title: "Settings saved", variant: "success" });
      }
    });
  };

  const numField = (label: string, hint: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className="text-[10px] text-text-subtle block mb-1 font-mono uppercase tracking-[0.12em]">{label}</span>
      <Input type="number" value={value} onChange={(e) => set(e.target.value)} mono size="sm" />
      <span className="text-[10px] text-text-subtle">{hint}</span>
    </label>
  );

  return (
    <div className="space-y-3">
      {/* Web search toggle */}
      <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-text">Live web search grounding</p>
          <p className="text-[11px] text-text-subtle leading-snug">
            Grounds every poll in real current events + real source URLs. Off = the model uses its training memory only.
          </p>
        </div>
        <div className="ml-3">
          <Toggle
            on={webSearch}
            onClick={() => { const v = !webSearch; setWebSearch(v); save({ webSearchEnabled: v }); }}
            disabled={pending}
            aria-label="Toggle live web search grounding"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {numField("Daily target", "Polls/day goal (1–1,000,000)", dailyTarget, setDailyTarget)}
        {numField("Min confidence", "Floor 0–100 to reach review", minConf, setMinConf)}
        {numField("Max per batch", "Cap on one batch run", maxBatch, setMaxBatch)}
        {numField("Min lead time (h)", "Earliest a poll may resolve", minLead, setMinLead)}
        {numField("Max horizon (d)", "Latest a poll may resolve", maxLead, setMaxLead)}
      </div>

      {/* ── Selection lead times per category ── */}
      <div className="rounded-md border border-border bg-bg-overlay p-3">
        <p className="text-[12px] font-semibold text-text mb-1">Selection lead time per category · Muda wa kufunga uchaguzi</p>
        <p className="text-[10.5px] text-text-subtle mb-2.5 leading-snug">
          Hours before resolution date that betting closes for each category. Players see &quot;Selection Closed — Waiting for Results&quot; after this cutoff.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LEAD_TIME_CATEGORIES.map((cat) => (
            <label key={cat} className="block">
              <span className="text-[10px] text-text-subtle block mb-0.5 font-mono uppercase tracking-[0.1em]">{LEAD_TIME_LABELS[cat]}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={leadTimes[cat] ?? "24"}
                  onChange={(e) => setLeadTimes((prev) => ({ ...prev, [cat]: e.target.value }))}
                  mono
                  size="sm"
                />
                <span className="text-[10px] text-text-subtle shrink-0">h</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => save()} disabled={pending} className="btn btn-gold btn-sm rounded-pill min-w-[140px]">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

/* ─── Quality indicators display ─── */

export function QualityBadges({ indicators, overall }: { indicators: QualityIndicator[]; overall: number }) {
  const statusColor = (s: "good" | "warning" | "bad") =>
    s === "good" ? "var(--yes-300)" : s === "warning" ? "var(--gold-300)" : "var(--claret-300)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
          Overall quality
        </span>
        <span
          className="font-mono text-[13px] font-bold tabular-nums"
          style={{ color: overall >= 80 ? "var(--yes-300)" : overall >= 50 ? "var(--gold-300)" : "var(--claret-300)" }}
        >
          {overall}%
        </span>
        <div className="flex-1 h-1.5 bg-bg-overlay rounded-pill overflow-hidden">
          <div
            className="h-full rounded-pill transition-all prog-sweep"
            style={{
              width: `${overall}%`,
              backgroundColor: overall >= 80 ? "var(--yes-500)" : overall >= 50 ? "var(--warning-500)" : "var(--danger-500)",
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {indicators.map((q, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-mono border"
            style={{
              color: statusColor(q.status),
              borderColor: `color-mix(in oklab, ${statusColor(q.status)} 30%, transparent)`,
              background: `color-mix(in oklab, ${statusColor(q.status)} 8%, transparent)`,
            }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor(q.status) }} />
            {q.label}: {q.score}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Filter reasons display ─── */

const REASON_LABELS: Record<string, string> = {
  empty_title: "Empty title",
  empty_criterion: "Empty resolution criterion",
  invalid_date: "Invalid resolution date",
  past_date: "Resolution date is in the past",
  resolution_too_soon: "Resolves too soon (under lead-time floor)",
  resolution_too_far: "Resolves too far out (over horizon)",
  no_options: "No betting options",
  duplicate_options: "Duplicate options detected",
  too_few_options: "Too few options (need 2+)",
  invalid_category: "Unknown category",
  banned_category: "Banned category (policy)",
  low_confidence: "Low AI confidence",
  title_too_long: "Title too long",
  criterion_too_long: "Criterion too long",
  xss_detected: "XSS / injection detected",
  null_bytes: "Null bytes detected",
  duplicate_poll: "Duplicate of existing poll",
  no_sources: "No valid sources",
  invalid_source_url: "Invalid source URL",
  malformed_response: "Malformed AI response",
  provider_error: "AI provider error",
};

export function FilterReasonChips({ reasons }: { reasons: FilterReason[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((r, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-mono border border-danger-500/30 bg-danger-500/8 text-claret-300"
        >
          {REASON_LABELS[r] ?? r}
        </span>
      ))}
    </div>
  );
}

/* ─── Review actions (approve / reject / edit / regenerate) ─── */

export function ReviewActions({ poll }: { poll: StoredAIPoll }) {
  const [pending, start] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const overlay = useActionOverlay();
  const router = useRouter();

  const approve = () => {
    overlay.run("Approving poll…", "Inaendelea kuidhinisha kura. Subiri kidogo.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", poll.id);
        const r = await approvePollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Could not approve", r.error);
        else overlay.succeed("Poll approved", "Ready to publish as a live market.");
      } catch {
        overlay.fail("Could not approve", "Server error — please try again.");
      }
    });
  };

  const regenerate = () => {
    overlay.run("Regenerating poll…", "Creating a fresh version with the same settings.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("category", poll.requestCategory);
        fd.set("prompt", poll.requestPrompt);
        fd.set("regenerationOf", poll.id);
        const r = await generatePollAction(fd);
        router.refresh();
        if (r.ok) {
          overlay.succeed("New poll generated", `State: ${r.poll.state} · Quality: ${r.poll.overallQuality}%`);
          if (r.poll.state === "PENDING_REVIEW") revealElement(`poll-${r.poll.id}`);
        } else {
          overlay.fail("Regeneration failed", "The AI could not produce a valid poll. Try again.");
        }
      } catch {
        overlay.fail("Regeneration failed", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 min-w-[160px]">
      <button onClick={approve} disabled={pending} className="btn btn-gold btn-sm rounded-pill">
        {pending ? "Processing…" : "Approve"}
      </button>
      <button onClick={() => setShowEdit((v) => !v)} disabled={pending} className="btn btn-ghost btn-sm rounded-pill">
        Edit…
      </button>
      <button onClick={regenerate} disabled={pending} className="btn btn-ghost btn-sm rounded-pill">
        Regenerate
      </button>
      <button onClick={() => setShowReject((v) => !v)} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-claret-300">
        Reject…
      </button>

      {showReject && <RejectForm pollId={poll.id} onClose={() => setShowReject(false)} overlay={overlay} />}
      {showEdit && <EditForm poll={poll} onClose={() => setShowEdit(false)} overlay={overlay} />}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}

/* ─── Publish actions ─── */

export function PublishActions({ poll }: { poll: StoredAIPoll }) {
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const router = useRouter();

  const publish = () => {
    overlay.run("Publishing market…", "Creating a live market from this poll. Players will be able to bet on it.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", poll.id);
        const r = await publishPollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Publish failed", r.error);
        else overlay.succeed("Market is live", `Market ${r.marketId} — players can now place bets.`);
      } catch {
        overlay.fail("Publish failed", "Server error — please try again.");
      }
    });
  };

  return (
    <>
      <button onClick={publish} disabled={pending} className="btn btn-gold btn-sm rounded-pill min-w-[120px]">
        {pending ? "Publishing…" : "Publish as market"}
      </button>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Delete actions ─── */

export function DeleteAction({ pollId, state, redirectTo }: { pollId: string; state: string; redirectTo?: string }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const overlay = useActionOverlay();
  const router = useRouter();
  const { toast } = useDeferredToast(pending);

  const del = (voidReason?: string) => {
    overlay.run("Deleting…", state === "PUBLISHED" ? "Voiding market and refunding players." : "Removing this poll permanently.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", pollId);
        if (voidReason) fd.set("reason", voidReason);
        const r = await deletePollAction(fd);
        if (!r.ok) {
          overlay.fail("Delete failed", r.error);
          return;
        }
        if (redirectTo) {
          overlay.dismiss();
          toast(r.refundedCount && r.refundedCount > 0
            ? { title: "Market voided — players refunded", description: `${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded`, variant: "success" }
            : { title: "Deleted", variant: "default" },
          );
          router.push(redirectTo as never);
        } else {
          router.refresh();
          if (r.refundedCount && r.refundedCount > 0) {
            overlay.succeed("Market voided — players refunded", `${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded · TZS ${Math.round(r.refundedTzs ?? 0).toLocaleString("en-US")}`);
          } else {
            overlay.succeed("Poll deleted", "It has been permanently removed.");
          }
        }
      } catch {
        overlay.fail("Delete failed", "Server error — please try again.");
      }
    });
  };

  const deleteBtn = (
    <button
      disabled={pending}
      className="btn btn-ghost btn-sm rounded-pill text-text-subtle hover:text-claret-300"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );

  return (
    <>
      {state === "PUBLISHED" ? (
        <ConfirmDialog
          trigger={deleteBtn}
          title="Cancel live market?"
          tone="claret"
          confirmLabel="Yes — void market & refund all"
          body={
            <div className="space-y-2 text-[13px] text-text-muted leading-relaxed">
              <p>
                This market is <strong className="text-text">live</strong> with real player positions open.
                Confirming will:
              </p>
              <ul className="mt-1 space-y-1 pl-4 list-disc">
                <li>Immediately cancel and void the market</li>
                <li>Refund every player their <strong className="text-text">full stake — no deductions</strong></li>
                <li>Send refund notifications to all affected players</li>
              </ul>
              <p className="text-[12px] text-text-subtle">
                Only proceed under a regulatory or government directive. This is irreversible.
              </p>
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle mb-1.5">
                  Reason for cancellation (required for audit log)
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Government directive, regulatory compliance…"
                  className={adminTextarea}
                  rows={2}
                />
              </div>
            </div>
          }
          onConfirm={() => del(reason.trim() || "Regulatory/administrative decision — market cancelled by administrator")}
        />
      ) : (
        <ConfirmDialog
          trigger={deleteBtn}
          title="Delete this poll?"
          tone="warning"
          confirmLabel="Yes, delete"
          body="This poll will be permanently removed. This cannot be undone."
          onConfirm={() => del()}
        />
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Seed fixtures button ─── */

export function SeedFixturesButton() {
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const router = useRouter();

  const seed = () => {
    overlay.run("Seeding fixtures…", "Creating test polls for development.");
    start(async () => {
      try {
        const r = await seedFixturesAction();
        router.refresh();
        if (r.ok) overlay.succeed("Fixtures seeded", `${r.count} test polls created.`);
        else overlay.fail("Seed failed", "Could not create fixtures.");
      } catch {
        overlay.fail("Seed failed", "Server error — please try again.");
      }
    });
  };

  return (
    <>
      <button onClick={seed} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-[12px]">
        {pending ? "Seeding…" : "Seed fixtures"}
      </button>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Delete all button ─── */

export function DeleteAllButton({ totalCount }: { totalCount: number }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const overlay = useActionOverlay();
  const router = useRouter();

  const deleteAll = (voidReason?: string) => {
    overlay.run("Deleting all polls…", "Voiding any published markets and refunding players. This may take a moment.");
    start(async () => {
      try {
        const fd = new FormData();
        if (voidReason) fd.set("reason", voidReason);
        const r = await deleteAllPollsAction(fd);
        if (!r.ok) {
          overlay.fail("Delete failed", String((r as { error?: string }).error ?? "Unknown error"));
          return;
        }
        const parts: string[] = [];
        if (r.deleted > 0) parts.push(`${r.deleted} poll${r.deleted !== 1 ? "s" : ""} deleted`);
        if (r.voided > 0) parts.push(`${r.voided} market${r.voided !== 1 ? "s" : ""} voided`);
        if (r.skipped > 0) parts.push(`${r.skipped} in-flight skipped`);
        if (r.refundedCount > 0) parts.push(`${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded · TZS ${Math.round(r.refundedTzs ?? 0).toLocaleString("en-US")}`);
        if (r.voidErrors && r.voidErrors.length > 0) parts.push(`${r.voidErrors.length} void error${r.voidErrors.length !== 1 ? "s" : ""}`);
        router.refresh();
        if (r.voidErrors && r.voidErrors.length > 0) {
          overlay.fail("Completed with errors", parts.join(" · "));
        } else {
          overlay.succeed("All polls cleared", parts.join(" · ") || "Nothing to delete.");
        }
      } catch {
        overlay.fail("Delete failed", "Server error — please try again.");
      }
    });
  };

  if (totalCount === 0) return null;

  return (
    <>
    <ConfirmDialog
      trigger={
        <button disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-[12px] text-text-subtle hover:text-claret-300">
          {pending ? "Clearing…" : "Delete all"}
        </button>
      }
      title="Delete all AI polls?"
      tone="claret"
      confirmLabel="Yes — delete everything"
      body={
        <div className="space-y-2 text-[13px] text-text-muted leading-relaxed">
          <p>This will permanently delete <strong className="text-text">{totalCount.toLocaleString()} AI poll{totalCount !== 1 ? "s" : ""}</strong>. Specifically:</p>
          <ul className="mt-1 space-y-1 pl-4 list-disc">
            <li>All <strong className="text-text">PENDING, FILTERED, APPROVED, REJECTED</strong> polls are deleted immediately</li>
            <li>Any <strong className="text-text">PUBLISHED</strong> markets are voided and all players are refunded their full stake — no deductions</li>
            <li><strong className="text-text">GENERATING</strong> polls (in-flight) are left untouched</li>
          </ul>
          <p className="text-[12px] text-text-subtle">This cannot be undone. The platform will be clean and ready for fresh generation.</p>
          <div className="mt-3 pt-3 border-t border-border/60">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle mb-1.5">Reason (required for audit log)</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Platform cleanup — starting fresh generation cycle…"
              className={adminTextarea}
              rows={2}
            />
          </div>
        </div>
      }
      onConfirm={() => deleteAll(reason.trim() || "Platform cleanup — bulk AI poll deletion by administrator")}
    />
    <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/* ─── Reject sub-form ─── */

const REJECT_REASONS = [
  { id: "banned_category", label: "Banned category" },
  { id: "low_confidence", label: "Low quality" },
  { id: "duplicate_poll", label: "Duplicate" },
  { id: "malformed_response", label: "Malformed" },
  { id: "empty_title", label: "Missing content" },
] as const;

function RejectForm({ pollId, onClose, overlay }: { pollId: string; onClose: () => void; overlay: ReturnType<typeof useActionOverlay> }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState<string>("low_confidence");
  const [note, setNote] = useState("");
  const router = useRouter();

  const submit = () => {
    onClose();
    overlay.run("Rejecting poll…", "Recording your decision in the audit log.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", pollId);
        fd.set("reasons", reason);
        fd.set("note", note);
        const r = await rejectPollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Reject failed", r.error);
        else overlay.succeed("Poll rejected", "It will not appear in the publish queue.");
      } catch {
        overlay.fail("Reject failed", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[min(280px,calc(100vw-2rem))]">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-2">
        Reject reason
      </p>
      <div className="mb-2">
        <Select value={reason} onChange={setReason} size="sm"
          options={REJECT_REASONS.map((r) => ({ value: r.id, label: r.label }))} />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for the audit log…"
        className={adminTextarea + " mb-2"}
        rows={2}
      />
      <div className="flex flex-col gap-2">
        <button type="button" onClick={submit} disabled={pending} className="btn btn-no btn-md w-full">
          {pending ? "Rejecting…" : "Reject"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm w-full">Cancel</button>
      </div>
    </div>
  );
}

/* ─── Edit sub-form ─── */

function EditForm({ poll, onClose, overlay }: { poll: StoredAIPoll; onClose: () => void; overlay: ReturnType<typeof useActionOverlay> }) {
  const [pending, start] = useTransition();
  const [titleEn, setTitleEn] = useState(poll.titleEn);
  const [titleSw, setTitleSw] = useState(poll.titleSw);
  const [category, setCategory] = useState(poll.category);
  const [criterion, setCriterion] = useState(poll.resolutionCriterion);
  const [resAt, setResAt] = useState(poll.resolutionAt ? new Date(poll.resolutionAt).toISOString().slice(0, 16) : "");
  const router = useRouter();

  const submit = () => {
    onClose();
    overlay.run("Saving changes…", "Re-validating poll through the quality pipeline.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", poll.id);
        fd.set("titleEn", titleEn);
        fd.set("titleSw", titleSw);
        fd.set("category", category);
        fd.set("resolutionCriterion", criterion);
        fd.set("resolutionAt", new Date(resAt).toISOString());
        const r = await editPollAction(fd);
        router.refresh();
        if (!r.ok) overlay.fail("Edit failed", r.error);
        else overlay.succeed("Poll updated", "Changes saved and poll re-validated.");
      } catch {
        overlay.fail("Edit failed", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[min(360px,calc(100vw-2rem))] space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">
        Edit poll
      </p>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Title (EN)</span>
        <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} size="sm" />
      </label>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Title (SW)</span>
        <Input value={titleSw} onChange={(e) => setTitleSw(e.target.value)} size="sm" />
      </label>
      <div>
        <span className="text-[10px] text-text-subtle block mb-1">Category</span>
        <Select value={category} onChange={setCategory} size="sm"
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
      </div>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Resolution criterion</span>
        <textarea value={criterion} onChange={(e) => setCriterion(e.target.value)} className={adminTextarea} rows={2} />
      </label>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Resolves at</span>
        <Input type="datetime-local" value={resAt} onChange={(e) => setResAt(e.target.value)} mono size="sm" />
      </label>
      <div className="flex flex-col gap-2 pt-1">
        <button type="button" onClick={submit} disabled={pending} className="btn btn-gold btn-md w-full">
          {pending ? "Saving…" : "Save & re-validate"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm w-full">Cancel</button>
      </div>
    </div>
  );
}
