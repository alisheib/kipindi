"use client";

/**
 * Admin comment-moderation queue. Lists comments that auto-hid (≥ report
 * threshold) or carry reports; a moderator can Restore (clear the report, it was
 * unfounded) or Remove (soft-delete). Optimistic, on-theme, reuses the kit.
 */
import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { restoreCommentAction, deleteCommentAction } from "@/app/markets/actions";
import type { ModerationItem } from "@/lib/server/comments-store";

const PER_PAGE = 20;
type MSort = "reports" | "date" | "author" | "status";
type SortDir = "asc" | "desc";

/** Client-side pager — visually identical to <AdminPagination> (link-based) but
 *  driven by local state since this queue mutates optimistically client-side. */
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
function SortBtn({ field, label, current, dir, onSort }: { field: MSort; label: string; current: MSort; dir: SortDir; onSort: (f: MSort) => void }) {
  const isActive = current === field;
  return (
    <button type="button" onClick={() => onSort(field)} className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] hover:text-text transition-colors ${isActive ? "text-text" : "text-text-subtle"}`}>
      {label}
      <span className={`text-brand-300 ${isActive ? "" : "opacity-0"}`} aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>
    </button>
  );
}

export function ModerationQueue({ items }: { items: ModerationItem[] }) {
  const [rows, setRows] = useState(items);
  const [sort, setSort] = useState<MSort>("reports");
  const [dir, setDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  // Sort, then materialise only the current page in the DOM.
  const sortedRows = useMemo(() => {
    const acc: Record<MSort, (r: ModerationItem) => string | number> = {
      reports: (r) => r.reports,
      date: (r) => r.createdAt,
      author: (r) => r.authorName.toLowerCase(),
      status: (r) => (r.hidden ? 1 : 0),
    };
    const f = acc[sort];
    return [...rows].sort((a, b) => {
      const av = f(a), bv = f(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, dir]);
  const total = sortedRows.length;
  const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / PER_PAGE)));
  const shown = useMemo(() => sortedRows.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE), [sortedRows, safePage]);

  // Reset to page 1 whenever the sort changes.
  useEffect(() => { setPage(1); }, [sort, dir]);

  const onSort = (f: MSort) => {
    if (f === sort) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSort(f); setDir("desc"); }
  };

  const act = (kind: "restore" | "remove", it: ModerationItem) => {
    const fd = new FormData();
    fd.set("commentId", it.id);
    fd.set("marketId", it.marketId);
    startTransition(async () => {
      const r = kind === "restore" ? await restoreCommentAction(fd) : await deleteCommentAction(fd);
      if (r.ok) {
        setRows((prev) => prev.filter((x) => x.id !== it.id));
        toast({ title: kind === "restore" ? "Restored · Imerejeshwa" : "Removed · Imeondolewa", variant: kind === "restore" ? "success" : "warning" });
      } else {
        toast({ title: r.error, variant: "danger" });
      }
    });
  };

  if (rows.length === 0) {
    return <p className="py-10 text-center text-[13px] text-text-subtle">Nothing to review — the queue is clear. <span className="italic">Hakuna cha kukagua.</span></p>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-border px-1 pb-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">Sort</span>
        <SortBtn field="reports" label="Reports" current={sort} dir={dir} onSort={onSort} />
        <SortBtn field="date" label="Date" current={sort} dir={dir} onSort={onSort} />
        <SortBtn field="author" label="Author" current={sort} dir={dir} onSort={onSort} />
        <SortBtn field="status" label="Status" current={sort} dir={dir} onSort={onSort} />
      </div>
      <ul className="divide-y divide-border">
      {shown.map((c) => (
        <li key={c.id} className="flex gap-3 py-3.5">
          <Avatar initials={c.authorName.slice(0, 2).toUpperCase()} seed={c.authorId} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-display text-[13px] font-semibold text-text">{c.authorName}</span>
              <Chip className="chip-objection" style={{ fontSize: 9.5, padding: "1px 7px" }}>
                <I.flag s={10} /> {c.reports} report{c.reports === 1 ? "" : "s"}
              </Chip>
              {c.hidden && <Chip className="chip-pending" style={{ fontSize: 9.5, padding: "1px 7px" }}>auto-hidden</Chip>}
              <Link
                href={`/markets/${c.marketId}` as never}
                className="inline-flex items-center gap-1 font-mono text-[10.5px] text-text-subtle hover:text-text-muted"
              >
                {c.marketId} <I.ext size={11} aria-hidden />
              </Link>
            </div>
            <p className="mt-0.5 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-text-muted">{c.body}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => act("restore", c)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-yes-700 bg-yes-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-yes-300 hover:bg-yes-500/20 transition-colors disabled:opacity-50"
              >
                <I.rotateCcw size={12} aria-hidden /> Restore
              </button>
              <button
                type="button"
                onClick={() => act("remove", c)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-no-700 bg-no-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-no-300 hover:bg-no-500/20 transition-colors disabled:opacity-50"
              >
                <I.trash s={12} /> Remove
              </button>
            </div>
          </div>
        </li>
      ))}
      </ul>
      <ClientPager total={total} page={safePage} onPage={setPage} />
    </div>
  );
}
