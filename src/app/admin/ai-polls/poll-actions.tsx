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
  const { deferToast } = useDeferredToast(pending);

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={pending || active}
              className="btn btn-gold btn-sm rounded-pill min-w-[160px]"
            >
              Generate poll
            </button>
            <span className="text-[11px] text-text-subtle font-mono">
              Category: {category}
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

export function BatchGenerateForm({ maxBatch, remaining }: { maxBatch: number; remaining: number }) {
  const [pending, start] = useTransition();
  const suggested = Math.min(maxBatch, Math.max(1, remaining || 3));
  const [count, setCount] = useState(String(suggested));
  const [prompt, setPrompt] = useState("");
  const router = useRouter();
  const { deferToast } = useDeferredToast(pending);

  const run = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("count", count);
      fd.set("prompt", prompt);
      const r = await generatePollBatchAction(fd);
      router.refresh();
      if (r.ok) {
        deferToast({
          title: `Batch complete — ${r.total} generated`,
          description: `${r.summary.PENDING_REVIEW} to review · ${r.summary.FILTERED + r.summary.VALIDATION_FAILED} filtered`,
          variant: "success",
        });
        // Multiple new polls — scroll to the review section so they're in view.
        if (r.summary.PENDING_REVIEW > 0) revealElement("ai-polls-pending");
      }
    });
  };

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
        disabled={pending}
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
        Cycles across categories. Each poll runs the full 4-layer pipeline.
      </span>
    </div>
  );
}

/* ─── Config panel ─── */

export function ConfigPanel({ config }: { config: AIPollConfig }) {
  const [pending, start] = useTransition();
  const [webSearch, setWebSearch] = useState(config.webSearchEnabled);
  const [dailyTarget, setDailyTarget] = useState(String(config.dailyTarget));
  const [minLead, setMinLead] = useState(String(config.minLeadTimeHours));
  const [maxLead, setMaxLead] = useState(String(config.maxLeadTimeDays));
  const [minConf, setMinConf] = useState(String(config.minConfidence));
  const [maxBatch, setMaxBatch] = useState(String(config.maxBatchPerRun));
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
      const r = await updatePollConfigAction(fd);
      router.refresh();
      if (r.ok) deferToast({ title: "Settings saved", variant: "success" });
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
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const approve = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", poll.id);
      const r = await approvePollAction(fd);
      router.refresh();
      if (!r.ok) toast({ title: "Could not approve", description: r.error, variant: "danger" });
      else deferToast({ title: "Approved", description: "Poll ready to publish.", variant: "success" });
    });
  };

  const regenerate = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("category", poll.requestCategory);
      fd.set("prompt", poll.requestPrompt);
      fd.set("regenerationOf", poll.id);
      const r = await generatePollAction(fd);
      router.refresh();
      if (r.ok) {
        deferToast({ title: "Regenerated", description: `New poll: ${r.poll.state}`, variant: "success" });
        if (r.poll.state === "PENDING_REVIEW") revealElement(`poll-${r.poll.id}`);
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

      {showReject && <RejectForm pollId={poll.id} onClose={() => setShowReject(false)} />}
      {showEdit && <EditForm poll={poll} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

/* ─── Publish actions ─── */

export function PublishActions({ poll }: { poll: StoredAIPoll }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const publish = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", poll.id);
      const r = await publishPollAction(fd);
      router.refresh();
      if (!r.ok) toast({ title: "Publish failed", description: r.error, variant: "danger" });
      else deferToast({ title: "Published", description: `Market ${r.marketId} created.`, variant: "success" });
    });
  };

  return (
    <button onClick={publish} disabled={pending} className="btn btn-gold btn-sm rounded-pill min-w-[120px]">
      {pending ? "Publishing…" : "Publish as market"}
    </button>
  );
}

/* ─── Delete actions ─── */

export function DeleteAction({ pollId, state, redirectTo }: { pollId: string; state: string; redirectTo?: string }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const del = (voidReason?: string) => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", pollId);
      if (voidReason) fd.set("reason", voidReason);
      const r = await deletePollAction(fd);
      if (!r.ok) {
        toast({ title: "Delete failed", description: r.error, variant: "danger" });
        return;
      }
      // Build the success toast payload.
      const successToast = r.refundedCount && r.refundedCount > 0
        ? {
            title: "Market voided — players refunded",
            description: `${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded · TZS ${Math.round(r.refundedTzs ?? 0).toLocaleString("en-US")}`,
            variant: "success" as const,
          }
        : { title: "Deleted", variant: "default" as const };
      if (redirectTo) {
        // Detail page: show toast immediately then navigate away (component will unmount).
        toast(successToast);
        router.push(redirectTo as never);
      } else {
        // List page: stay on page, refresh in place, defer toast until list re-renders.
        router.refresh();
        deferToast(successToast);
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

  if (state === "PUBLISHED") {
    return (
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
    );
  }

  return (
    <button
      onClick={() => del()}
      disabled={pending}
      className="btn btn-ghost btn-sm rounded-pill text-text-subtle hover:text-claret-300"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

/* ─── Seed fixtures button ─── */

export function SeedFixturesButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const seed = () => {
    start(async () => {
      const r = await seedFixturesAction();
      router.refresh();
      if (r.ok) deferToast({ title: "Fixtures seeded", description: `${r.count} polls created.`, variant: "success" });
    });
  };

  return (
    <button onClick={seed} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-[12px]">
      {pending ? "Seeding…" : "Seed fixtures"}
    </button>
  );
}

/* ─── Delete all button ─── */

export function DeleteAllButton({ totalCount }: { totalCount: number }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { toast } = useDeferredToast(pending);

  const deleteAll = (voidReason?: string) => {
    start(async () => {
      const fd = new FormData();
      if (voidReason) fd.set("reason", voidReason);
      const r = await deleteAllPollsAction(fd);
      if (!r.ok) {
        toast({ title: "Delete failed", description: String((r as { error?: string }).error ?? "Unknown error"), variant: "danger" });
        return;
      }
      const parts: string[] = [];
      if (r.deleted > 0) parts.push(`${r.deleted} poll${r.deleted !== 1 ? "s" : ""} deleted`);
      if (r.voided > 0) parts.push(`${r.voided} market${r.voided !== 1 ? "s" : ""} voided`);
      if (r.skipped > 0) parts.push(`${r.skipped} in-flight skipped`);
      if (r.refundedCount > 0) parts.push(`${r.refundedCount} player${r.refundedCount !== 1 ? "s" : ""} refunded · TZS ${Math.round(r.refundedTzs ?? 0).toLocaleString("en-US")}`);
      if (r.voidErrors && r.voidErrors.length > 0) parts.push(`${r.voidErrors.length} void error${r.voidErrors.length !== 1 ? "s" : ""}`);
      router.refresh();
      toast({ title: "All polls cleared", description: parts.join(" · ") || "Nothing to delete.", variant: r.voidErrors && r.voidErrors.length > 0 ? "warning" : "success" });
    });
  };

  if (totalCount === 0) return null;

  return (
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

function RejectForm({ pollId, onClose }: { pollId: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState<string>("low_confidence");
  const [note, setNote] = useState("");
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const submit = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", pollId);
      fd.set("reasons", reason);
      fd.set("note", note);
      const r = await rejectPollAction(fd);
      onClose();
      router.refresh();
      if (!r.ok) toast({ title: "Reject failed", description: r.error, variant: "danger" });
      else deferToast({ title: "Rejected", variant: "default" });
    });
  };

  return (
    <div className="mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[280px]">
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

function EditForm({ poll, onClose }: { poll: StoredAIPoll; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [titleEn, setTitleEn] = useState(poll.titleEn);
  const [titleSw, setTitleSw] = useState(poll.titleSw);
  const [category, setCategory] = useState(poll.category);
  const [criterion, setCriterion] = useState(poll.resolutionCriterion);
  const [resAt, setResAt] = useState(poll.resolutionAt ? new Date(poll.resolutionAt).toISOString().slice(0, 16) : "");
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const submit = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", poll.id);
      fd.set("titleEn", titleEn);
      fd.set("titleSw", titleSw);
      fd.set("category", category);
      fd.set("resolutionCriterion", criterion);
      fd.set("resolutionAt", new Date(resAt).toISOString());
      const r = await editPollAction(fd);
      onClose();
      router.refresh();
      if (!r.ok) toast({ title: "Edit failed", description: r.error, variant: "danger" });
      else deferToast({ title: "Updated", description: "Poll re-validated.", variant: "success" });
    });
  };

  return (
    <div className="mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[360px] space-y-2">
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
