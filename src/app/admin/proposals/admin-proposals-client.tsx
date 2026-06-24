"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { StatusBadge } from "@/components/proposals/status-badge";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/proposals/category-icon";
import type { ProposalsConfig } from "@/lib/server/proposals-config";
import type { AdminQueueRow, DeclineReason } from "@/lib/server/proposals-service";
import { saveProposalsConfigAction, approveProposalAction, declineProposalAction, requestChangesAction } from "./actions";

const DECLINE_REASONS: DeclineReason[] = ["Politics", "Ambiguous outcome", "No official source", "Duplicate", "Past resolution", "Outside jurisdiction", "Officer decision"];

function Cap({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">{children}</span>;
}
function CField({ label, hint, prefix, suffix, value, onChange, width }: { label: string; hint?: string; prefix?: string; suffix?: string; value: number; onChange: (n: number) => void; width?: number }) {
  return (
    <div style={{ width: width ?? "100%" }}>
      <div className="mb-1.5 text-[12px] font-semibold text-text">{label}</div>
      <Input
        prefix={prefix || undefined}
        trailing={suffix ? <span className="text-[11px]">{suffix}</span> : undefined}
        mono
        size="sm"
        inputMode="numeric"
        value={value}
        onChange={(e) => { const n = Number(e.target.value.replace(/[^\d]/g, "")); onChange(Number.isFinite(n) ? n : 0); }}
      />
      {hint && <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>}
    </div>
  );
}

type QFilter = "all" | "review" | "flagged";

const PER_PAGE = 20;
type QSort = "score" | "age" | "status" | "title";
type SortDir = "asc" | "desc";

/** Client-side pager — visually identical to <AdminPagination> (link-based) but
 *  driven by local state since the queue list owns interactive filter/selection. */
function ClientPager({ total, page, onPage, perPage = PER_PAGE }: { total: number; page: number; onPage: (p: number) => void; perPage?: number }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safePage > 3) pages.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase = "inline-flex items-center justify-center h-8 min-w-[32px] px-2 rounded-md font-mono text-[11px] tracking-[0.10em] transition-colors";
  const btnActive = "border border-brand-500 bg-brand-500/15 text-brand-300 font-bold";
  const btnInactive = "border border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text";
  const btnDisabled = "border border-border bg-bg-elevated text-text-subtle/40 pointer-events-none";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
        {((safePage - 1) * perPage + 1).toLocaleString()}–{Math.min(safePage * perPage, total).toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => hasPrev && onPage(safePage - 1)} disabled={!hasPrev} className={`${btnBase} ${hasPrev ? btnInactive : btnDisabled}`} aria-label="Previous page">
          <I.chevronLeft s={14} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-text-subtle">…</span>
          ) : (
            <button type="button" key={p} onClick={() => onPage(p)} className={`${btnBase} ${p === safePage ? btnActive : btnInactive}`}>
              {p}
            </button>
          ),
        )}
        <button type="button" onClick={() => hasNext && onPage(safePage + 1)} disabled={!hasNext} className={`${btnBase} ${hasNext ? btnInactive : btnDisabled}`} aria-label="Next page">
          <I.chevronRight s={14} />
        </button>
      </div>
    </div>
  );
}

/** Clickable sort control matching <SortTh>'s active/arrow affordance. */
function SortBtn({ field, label, current, dir, onSort }: { field: QSort; label: string; current: QSort; dir: SortDir; onSort: (f: QSort) => void }) {
  const isActive = current === field;
  return (
    <button type="button" onClick={() => onSort(field)} className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] hover:text-text transition-colors ${isActive ? "text-text" : "text-text-subtle"}`}>
      {label}
      <span className={`text-brand-300 ${isActive ? "" : "opacity-0"}`} aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>
    </button>
  );
}

export function AdminProposalsClient({ config, queue }: { config: ProposalsConfig; queue: AdminQueueRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const overlay = useActionOverlay();
  const [pending, start] = useTransition();
  const [c, setC] = useState<ProposalsConfig>(config);
  const [qFilter, setQFilter] = useState<QFilter>("all");
  const [sort, setSort] = useState<QSort>("score");
  const [dir, setDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selId, setSelId] = useState<string | null>(queue[0]?.id ?? null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [note, setNote] = useState("");

  const on = c.enabled;

  // Filter → sort → only the current page is ever materialised in the DOM.
  const filteredQueue = useMemo(
    () => queue.filter((q) => qFilter === "all" ? true : qFilter === "review" ? (q.status === "REVIEW" || q.status === "CHANGES_REQUESTED") : (q.score < 0 || (q.down > 0 && q.down >= q.up))),
    [queue, qFilter],
  );
  const sortedQueue = useMemo(() => {
    const acc: Record<QSort, (q: AdminQueueRow) => string | number> = {
      score: (q) => q.score,
      age: (q) => q.ageIso,
      status: (q) => q.status,
      title: (q) => q.title.toLowerCase(),
    };
    const f = acc[sort];
    const out = [...filteredQueue].sort((a, b) => {
      const av = f(a), bv = f(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [filteredQueue, sort, dir]);
  const totalQueue = sortedQueue.length;
  const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(totalQueue / PER_PAGE)));
  const shownQueue = useMemo(() => sortedQueue.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE), [sortedQueue, safePage]);

  // Reset to page 1 whenever the filter or sort changes.
  useEffect(() => { setPage(1); }, [qFilter, sort, dir]);

  const sel = queue.find((q) => q.id === selId) ?? shownQueue[0] ?? null;

  const onSort = (f: QSort) => {
    if (f === sort) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSort(f); setDir("desc"); }
  };

  const refresh = () => router.refresh();
  const resetReview = () => { setDeclining(false); setReason(null); setNote(""); };

  const saveConfig = () => start(async () => {
    const r = await saveProposalsConfigAction(c);
    if (r.ok) { toast({ title: "Proposals config saved · Imehifadhiwa", variant: "success" }); refresh(); }
    else toast({ title: "Couldn't save", description: r.error, variant: "danger" });
  });

  const approve = () => { if (!sel) return;
    overlay.run("Approving & listing…", "Creating a live market from this proposal.");
    start(async () => {
      try {
        const r = await approveProposalAction(sel.id);
        if (r.ok) { overlay.succeed("Approved & listed", `Market ${r.marketId} created.`); resetReview(); refresh(); }
        else overlay.fail("Couldn't approve", r.error);
      } catch { overlay.fail("Couldn't approve", "Server error — please try again."); }
    });
  };

  const sendBack = () => { if (!sel) return;
    overlay.run("Requesting changes…", "Sending note to the proposer.");
    start(async () => {
      try {
        const r = await requestChangesAction(sel.id, note);
        if (r.ok) { overlay.succeed("Changes requested", "Proposer will be notified."); resetReview(); refresh(); }
        else overlay.fail("Couldn't send back", r.error);
      } catch { overlay.fail("Couldn't send back", "Server error — please try again."); }
    });
  };

  const decline = () => { if (!sel || !reason) return;
    overlay.run("Declining proposal…", `Reason: ${reason}`);
    start(async () => {
      try {
        const r = await declineProposalAction(sel.id, reason, note);
        if (r.ok) { overlay.succeed(`Declined · ${reason}`, "Proposer will be notified."); resetReview(); refresh(); }
        else overlay.fail("Couldn't decline", r.error);
      } catch { overlay.fail("Couldn't decline", "Server error — please try again."); }
    });
  };

  const open = sel && (sel.status === "REVIEW" || sel.status === "CHANGES_REQUESTED");

  return (
    <div className="space-y-4">
      {/* Queue + review */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-lg glass-panel">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="text-[14px] font-bold">Queue · sorted by votes</div>
            <div className="flex gap-1.5">
              {(["all", "review", "flagged"] as QFilter[]).map((f) => (
                <button key={f} onClick={() => setQFilter(f)} className="rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition-colors"
                  style={qFilter === f ? { borderColor: "color-mix(in oklab, var(--gold-500) 40%, transparent)", background: "color-mix(in oklab, var(--gold-500) 14%, transparent)", color: "var(--gold-200)" } : { borderColor: "var(--border)", color: "var(--text-muted)" }}>{f}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 border-b border-border px-4 py-2">
            <Cap>Sort</Cap>
            <SortBtn field="score" label="Votes" current={sort} dir={dir} onSort={onSort} />
            <SortBtn field="age" label="Age" current={sort} dir={dir} onSort={onSort} />
            <SortBtn field="status" label="Status" current={sort} dir={dir} onSort={onSort} />
            <SortBtn field="title" label="Title" current={sort} dir={dir} onSort={onSort} />
          </div>
          {totalQueue === 0 ? (
            <div className="px-4 py-10 text-center text-[12.5px] text-text-subtle">No proposals in this view yet.</div>
          ) : shownQueue.map((q, i) => {
            const active = q.id === sel?.id;
            return (
              <button key={q.id} onClick={() => { setSelId(q.id); resetReview(); }} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ borderBottom: i < shownQueue.length - 1 ? "1px solid var(--border)" : "none", borderLeft: "3px solid " + (active ? "var(--gold-500)" : "transparent"), background: active ? "color-mix(in oklab, var(--gold-500) 8%, transparent)" : "transparent" }}>
                <div className="flex w-[42px] shrink-0 flex-col items-center font-mono">
                  <span className="text-[14px] font-bold" style={{ color: q.score >= 0 ? "var(--gold-300)" : "var(--claret-300)" }}>{q.score}</span>
                  <span className="text-[9px] text-text-subtle">net</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">{q.title}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-text-subtle">{CATEGORY_LABEL[q.category]} · {q.proposerMasked}</div>
                </div>
                <StatusBadge status={q.status} />
              </button>
            );
          })}
          <ClientPager total={totalQueue} page={safePage} onPage={setPage} />
        </div>

        {/* Review panel */}
        {sel ? (
          <div className="flex flex-col gap-3.5 rounded-lg glass-panel p-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={sel.status} />
                <Chip variant="neutral"><CategoryIcon category={sel.category} />{CATEGORY_LABEL[sel.category]}</Chip>
                <span className="ml-auto font-mono text-[11px] text-text-subtle">by {sel.proposerMasked}</span>
              </div>
              <div className="font-display text-[17px] font-bold leading-snug">{sel.title}</div>
              {sel.titleSw && <div className="mt-0.5 font-display italic text-text-subtle text-[12px]">{sel.titleSw}</div>}
            </div>

            <div>
              <Cap>Resolution criterion</Cap>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{sel.resolutionCriterion}</p>
              <p className="mt-1 font-mono text-[10.5px] text-text-subtle">resolves {sel.resolutionDate}</p>
            </div>

            {/* Vote stats — rank only */}
            <div className="flex gap-2.5">
              {[["Upvotes", sel.up, "var(--gold-300)", I.chevronUp], ["Downvotes", sel.down, "var(--claret-300)", I.chevronDown], ["Score", sel.score, "var(--text)", I.fileText]].map(([l, v, col, Ic]) => {
                const Icon = Ic as (typeof I)[keyof typeof I];
                return (
                  <div key={l as string} className="flex-1 rounded-md bg-bg-overlay p-3">
                    <div className="flex items-center gap-1"><Cap><span className="inline-flex items-center gap-1"><Icon size={11} />{l as string}</span></Cap></div>
                    <div className="mt-1 font-mono text-[19px] font-bold" style={{ color: col as string }}>{v as number}</div>
                  </div>
                );
              })}
            </div>
            <p className="flex items-center gap-1.5 text-[11.5px] text-text-subtle"><I.info s={13} />Votes only rank the queue — the officer makes the final call.</p>

            <div className="h-px bg-border" />

            {!open ? (
              <p className="text-[12.5px] text-text-muted">This proposal is <strong>{sel.status.toLowerCase().replace("_", " ")}</strong> — no further action.</p>
            ) : !declining ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="gold" size="md" loading={pending} leading={<I.checkCircle size={15} />} onClick={approve}>Approve &amp; list · Orodhesha</Button>
                <Button variant="ghost" size="md" loading={pending} leading={<I.edit s={15} />} onClick={sendBack}>Request changes</Button>
                <Button variant="ghost" size="md" leading={<I.xCircle size={15} />} onClick={() => setDeclining(true)} className="!text-claret-300">Decline</Button>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-[12.5px] font-semibold">Decline reason · Sababu</div>
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {DECLINE_REASONS.map((r) => (
                    <button key={r} onClick={() => setReason(r)} className="rounded-pill border px-3 py-1 text-[12px] font-semibold transition-colors"
                      style={reason === r ? { borderColor: "color-mix(in oklab, var(--claret-500) 44%, transparent)", background: "color-mix(in oklab, var(--claret-500) 16%, transparent)", color: "var(--claret-300)" } : { borderColor: "var(--border)", color: "var(--text-muted)" }}>{r}</button>
                  ))}
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the proposer (logged) · Ujumbe" className="mb-3 min-h-[56px] w-full resize-none rounded-md border border-border bg-bg-elevated px-3 py-2 text-[13px] text-text outline-none admin-focus transition-colors" />
                <div className="flex gap-2">
                  <Button variant="ghost" size="md" onClick={resetReview}>Cancel</Button>
                  <Button variant="danger" size="md" fullWidth disabled={!reason} loading={pending} onClick={decline}>Confirm decline{reason ? ` · ${reason}` : ""}</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-bg-elevated/40 p-10 text-center text-[13px] text-text-subtle">Select a proposal to review.</div>
        )}
      </div>

      {/* Config */}
      <div className="overflow-hidden rounded-lg glass-panel">
        <div className="flex items-center gap-3.5 border-b border-border px-4 py-3.5" style={{ background: on ? "transparent" : "color-mix(in oklab, var(--warning-500) 8%, transparent)" }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: on ? "color-mix(in oklab, var(--gold-500) 16%, transparent)" : "color-mix(in oklab, var(--warning-500) 20%, transparent)", color: on ? "var(--gold-300)" : "var(--gold-300)" }}>
            {on ? <I.trophy s={21} /> : <I.pause s={21} />}
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-bold">Proposals feature · master switch</div>
            <div className="mt-0.5 text-[12px] text-text-muted">{on ? "Live — players can submit and vote on proposals." : "Paused — the board is read-only; no new submissions."}</div>
          </div>
          <span className="font-mono text-[11px] tracking-[0.1em]" style={{ color: on ? "var(--gold-300)" : "var(--gold-300)" }}>{on ? "ON" : "PAUSED"}</span>
          <Toggle on={on} gold onClick={() => setC((p) => ({ ...p, enabled: !p.enabled }))} aria-label="Proposals master switch" />
          <Button variant="gold" size="sm" leading={<I.check s={14} />} loading={pending} onClick={saveConfig}>Save</Button>
        </div>
        <div className="flex flex-wrap gap-5 p-4">
          <CField label="Listing + resolution prize" hint="Paid when listed AND resolved" prefix="TZS" width={200} value={c.prizeTzs} onChange={(n) => setC((p) => ({ ...p, prizeTzs: n }))} />
          <CField label="“Hot” vote threshold" hint="Net votes to flag as Hot" suffix="votes" width={180} value={c.hotThreshold} onChange={(n) => setC((p) => ({ ...p, hotThreshold: n }))} />
          <CField label="Rate limit" hint="Max open proposals per player" suffix="open" width={180} value={c.rateLimit} onChange={(n) => setC((p) => ({ ...p, rateLimit: n }))} />
        </div>
      </div>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
