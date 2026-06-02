"use client";

/**
 * Admin comment-moderation queue. Lists comments that auto-hid (≥ report
 * threshold) or carry reports; a moderator can Restore (clear the report, it was
 * unfounded) or Remove (soft-delete). Optimistic, on-theme, reuses the kit.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { Flag, RotateCcw, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { restoreCommentAction, deleteCommentAction } from "@/app/markets/actions";
import type { ModerationItem } from "@/lib/server/comments-store";

export function ModerationQueue({ items }: { items: ModerationItem[] }) {
  const [rows, setRows] = useState(items);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

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
    <ul className="divide-y divide-border">
      {rows.map((c) => (
        <li key={c.id} className="flex gap-3 py-3.5">
          <Avatar initials={c.authorName} seed={c.authorName} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-display text-[13px] font-semibold text-text">{c.authorName}</span>
              <Chip className="chip-objection" style={{ fontSize: 9.5, padding: "1px 7px" }}>
                <Flag size={10} aria-hidden /> {c.reports} report{c.reports === 1 ? "" : "s"}
              </Chip>
              {c.hidden && <Chip className="chip-pending" style={{ fontSize: 9.5, padding: "1px 7px" }}>auto-hidden</Chip>}
              <Link
                href={`/markets/${c.marketId}` as never}
                className="inline-flex items-center gap-1 font-mono text-[10.5px] text-text-subtle hover:text-text-muted"
              >
                {c.marketId} <ExternalLink size={11} aria-hidden />
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
                <RotateCcw size={12} aria-hidden /> Restore
              </button>
              <button
                type="button"
                onClick={() => act("remove", c)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-no-700 bg-no-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-no-300 hover:bg-no-500/20 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} aria-hidden /> Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
