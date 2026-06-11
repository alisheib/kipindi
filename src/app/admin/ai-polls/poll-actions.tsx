"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import {
  generatePollAction,
  generatePollBatchAction,
  updatePollConfigAction,
  approvePollAction,
  rejectPollAction,
  editPollAction,
  publishPollAction,
  deletePollAction,
  seedFixturesAction,
} from "./actions";
import type { StoredAIPoll, QualityIndicator, FilterReason } from "@/lib/server/ai-poll-generation";
import type { AIPollConfig } from "@/lib/server/ai-poll-config";

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

export function GenerateForm() {
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("sports");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const generate = () => {
    setGenerating(true);
    start(async () => {
      const fd = new FormData();
      fd.set("category", category);
      fd.set("prompt", prompt);
      const r = await generatePollAction(fd);
      setGenerating(false);
      router.refresh();
      if (r.ok) {
        const state = r.poll.state;
        // Defer toast until after the refresh lands so the poll is visible
        // in the list before the toast announces it.
        setTimeout(() => {
          if (state === "PENDING_REVIEW") {
            toast({ title: "Poll generated", description: "Ready for review.", variant: "success" });
          } else if (state === "FILTERED") {
            toast({ title: "Poll filtered", description: `Quality too low: ${r.poll.filterReasons.join(", ")}`, variant: "warning" });
          } else if (state === "VALIDATION_FAILED") {
            toast({ title: "Generation failed", description: r.poll.filterReasons.join(", "), variant: "danger" });
          }
        }, 400);
      }
    });
  };

  return (
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
        className="w-full rounded-md border border-border bg-bg-overlay px-3 py-2 text-[13px] text-text placeholder:text-text-subtle outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
        rows={2}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={pending || generating}
          className="btn btn-gold btn-sm rounded-pill min-w-[160px]"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Generating…
            </span>
          ) : (
            "Generate poll"
          )}
        </button>
        <span className="text-[11px] text-text-subtle font-mono">
          Category: {category}
        </span>
      </div>
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
  const { toast } = useToast();

  const run = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("count", count);
      fd.set("prompt", prompt);
      const r = await generatePollBatchAction(fd);
      router.refresh();
      if (r.ok) {
        toast({
          title: `Batch complete — ${r.total} generated`,
          description: `${r.summary.PENDING_REVIEW} to review · ${r.summary.FILTERED + r.summary.VALIDATION_FAILED} filtered`,
          variant: "success",
        });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 pt-3 mt-3 border-t border-border/60">
      <label className="block">
        <span className="text-[10px] text-text-subtle block mb-1 font-mono uppercase tracking-[0.12em]">
          Batch count (max {maxBatch})
        </span>
        <input
          type="number"
          min={1}
          max={maxBatch}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="w-24 rounded-md border border-border bg-bg-overlay px-2 py-1.5 text-[13px] text-text outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
        />
      </label>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Optional guidance applied to every poll in the batch"
        className="flex-1 min-w-[220px] rounded-md border border-border bg-bg-overlay px-3 py-2 text-[13px] text-text placeholder:text-text-subtle outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
      />
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
  const { toast } = useToast();

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
      if (r.ok) toast({ title: "Settings saved", variant: "success" });
      router.refresh();
    });
  };

  const numField = (label: string, hint: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className="text-[10px] text-text-subtle block mb-1 font-mono uppercase tracking-[0.12em]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-full rounded-md border border-border bg-bg-overlay px-2 py-1.5 text-[13px] text-text outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
      />
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
        <button
          type="button"
          onClick={() => { const v = !webSearch; setWebSearch(v); save({ webSearchEnabled: v }); }}
          disabled={pending}
          role="switch"
          aria-label="Toggle live web search grounding"
          aria-checked={webSearch ? "true" : "false"}
          className={`relative shrink-0 ml-3 h-6 w-11 rounded-full transition-colors ${webSearch ? "bg-yes-500" : "bg-bg-overlay border border-border"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${webSearch ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
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
    s === "good" ? "var(--yes-300)" : s === "warning" ? "oklch(82% 0.16 80)" : "oklch(80% 0.18 25)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
          Overall quality
        </span>
        <span
          className="font-mono text-[13px] font-bold tabular-nums"
          style={{ color: overall >= 80 ? "var(--yes-300)" : overall >= 50 ? "oklch(82% 0.16 80)" : "oklch(80% 0.18 25)" }}
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
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-mono border border-danger-500/30 bg-danger-500/8 text-[oklch(80%_0.18_25)]"
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
  const { toast } = useToast();

  const approve = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", poll.id);
      const r = await approvePollAction(fd);
      router.refresh();
      setTimeout(() => {
        if (!r.ok) toast({ title: "Could not approve", description: r.error, variant: "danger" });
        else toast({ title: "Approved", description: "Poll ready to publish.", variant: "success" });
      }, 400);
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
      if (r.ok) setTimeout(() => toast({ title: "Regenerated", description: `New poll: ${r.poll.state}`, variant: "success" }), 400);
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
      <button onClick={() => setShowReject((v) => !v)} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-[oklch(80%_0.18_25)]">
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
  const { toast } = useToast();

  const publish = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", poll.id);
      const r = await publishPollAction(fd);
      router.refresh();
      setTimeout(() => {
        if (!r.ok) toast({ title: "Publish failed", description: r.error, variant: "danger" });
        else toast({ title: "Published", description: `Market ${r.marketId} created.`, variant: "success" });
      }, 400);
    });
  };

  return (
    <button onClick={publish} disabled={pending} className="btn btn-gold btn-sm rounded-pill min-w-[120px]">
      {pending ? "Publishing…" : "Publish as market"}
    </button>
  );
}

/* ─── Delete actions (for filtered/failed/rejected) ─── */

export function DeleteAction({ pollId }: { pollId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const del = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", pollId);
      const r = await deletePollAction(fd);
      router.refresh();
      setTimeout(() => {
        if (!r.ok) toast({ title: "Delete failed", description: r.error, variant: "danger" });
        else toast({ title: "Deleted", variant: "default" });
      }, 400);
    });
  };

  return (
    <button onClick={del} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-text-subtle hover:text-[oklch(80%_0.18_25)]">
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

/* ─── Seed fixtures button ─── */

export function SeedFixturesButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const seed = () => {
    start(async () => {
      const r = await seedFixturesAction();
      router.refresh();
      if (r.ok) setTimeout(() => toast({ title: "Fixtures seeded", description: `${r.count} polls created.`, variant: "success" }), 400);
    });
  };

  return (
    <button onClick={seed} disabled={pending} className="btn btn-ghost btn-sm rounded-pill text-[12px]">
      {pending ? "Seeding…" : "Seed fixtures"}
    </button>
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
  const { toast } = useToast();

  const submit = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", pollId);
      fd.set("reasons", reason);
      fd.set("note", note);
      const r = await rejectPollAction(fd);
      onClose();
      router.refresh();
      setTimeout(() => {
        if (!r.ok) toast({ title: "Reject failed", description: r.error, variant: "danger" });
        else toast({ title: "Rejected", variant: "default" });
      }, 400);
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
        className="w-full rounded-md border border-border bg-bg-overlay px-2 py-1.5 text-[12px] text-text mb-2 outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
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
  const { toast } = useToast();

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
      setTimeout(() => {
        if (!r.ok) toast({ title: "Edit failed", description: r.error, variant: "danger" });
        else toast({ title: "Updated", description: "Poll re-validated.", variant: "success" });
      }, 400);
    });
  };

  const inputCls = "w-full rounded-md border border-border bg-bg-overlay px-2 py-1.5 text-[12.5px] text-text outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors";

  return (
    <div className="mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[360px] space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">
        Edit poll
      </p>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Title (EN)</span>
        <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Title (SW)</span>
        <input type="text" value={titleSw} onChange={(e) => setTitleSw(e.target.value)} className={inputCls} />
      </label>
      <div>
        <span className="text-[10px] text-text-subtle block mb-1">Category</span>
        <Select value={category} onChange={setCategory} size="sm"
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
      </div>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Resolution criterion</span>
        <textarea value={criterion} onChange={(e) => setCriterion(e.target.value)} className={inputCls} rows={2} />
      </label>
      <label className="block">
        <span className="text-[10px] text-text-subtle">Resolves at</span>
        <input type="datetime-local" value={resAt} onChange={(e) => setResAt(e.target.value)} className={inputCls} />
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
