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
import { AdminPagination } from "@/components/admin/admin-pagination";
import { SortBtn } from "@/components/admin/admin-sort";
import { restoreCommentAction, deleteCommentAction } from "@/app/markets/actions";
import type { ModerationItem } from "@/lib/server/comments-store";

const PER_PAGE = 20;
type MSort = "reports" | "date" | "author" | "status";
type SortDir = "asc" | "desc";

/**
 * ⭐ THE HAND-ROLLED PAGER AND SORT BUTTON ARE GONE (stage 9b, 2026-08-21).
 *
 * This file used to carry a `ClientPager` whose own comment said it was
 * "visually identical to <AdminPagination>". It was not, and could not stay so:
 * it was a verbatim FORK of `ui/pagination.tsx` — same page-window arithmetic,
 * same four class strings — and the shared component had since grown two things
 * the copy never received:
 *
 *   • `flex-wrap` on both the outer row and the control strip, plus
 *     `justify-center sm:justify-end`. At 360px seven 44px controls need two
 *     rows; without the wrap the chevron was pushed out of the strip.
 *   • `shadow-glow-selected` on the current page, the console's standing
 *     selected-control signal (`--glow-selected`, globals.css:603).
 *
 * The glow is the ONE resting-pixel difference this migration makes, and it is
 * the fork that was the outlier: every other paginated screen in the product has
 * had it. Everything else renders identically — `gap-x-3` equals the old `gap-3`
 * horizontally, and `justify-end`/`justify-center` are no-ops on a
 * content-width strip that is not wrapping.
 *
 * `onNavigate` is the shared pager's client mode, built for exactly this: a
 * queue that mutates optimistically in local state and so cannot page by URL.
 */

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
      <AdminPagination total={total} page={safePage} perPage={PER_PAGE} onNavigate={setPage} />
    </div>
  );
}
