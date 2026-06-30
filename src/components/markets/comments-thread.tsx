"use client";

/**
 * Market discussion thread. Post-moderation: comments post optimistically and
 * appear immediately; anyone can report (auto-hides at threshold, server-side);
 * authors + moderators can delete. Bilingual, on-theme, reduced-motion safe.
 */
import { useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { haptics } from "@/lib/haptics";
import { Avatar } from "@/components/ui/avatar";
import { postCommentAction, reportCommentAction, deleteCommentAction } from "@/app/markets/actions";
import type { CommentView } from "@/lib/server/comments-store";
import { formatDateShort } from "@/lib/utils";

// Mirror of the server cap (comments-store.COMMENT_MAX_LEN). Inlined so this
// client component doesn't pull the server store chain into the browser bundle.
const COMMENT_MAX_LEN = 500;

function relTime(iso: string, nowLabel: string): string {
  const ms = Date.now() - Date.parse(iso);
  const s = Math.floor(ms / 1000);
  if (s < 45) return nowLabel;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return formatDateShort(iso);
}

export function CommentsThread({
  marketId,
  initialComments,
  canPost,
  signInHref,
}: {
  marketId: string;
  initialComments: CommentView[];
  canPost: boolean;
  signInHref: string;
}) {
  const INITIAL_SHOW = 15;
  const [comments, setComments] = useState<CommentView[]>(initialComments);
  const [showAll, setShowAll] = useState(initialComments.length <= INITIAL_SHOW);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const { t } = useT();

  const submit = () => {
    const text = body.trim();
    if (!text || pending) return;
    const fd = new FormData();
    fd.set("marketId", marketId);
    fd.set("body", text);
    startTransition(async () => {
      const r = await postCommentAction(fd);
      if (r.ok && "comment" in r) {
        setComments((prev) => [r.comment, ...prev]);
        setBody("");
        haptics.confirm();
      } else {
        toast({ title: r.ok ? t.toast.posted : r.error, variant: r.ok ? "success" : "danger" });
      }
    });
  };

  const report = (id: string) => {
    const fd = new FormData();
    fd.set("marketId", marketId);
    fd.set("commentId", id);
    startTransition(async () => {
      const r = await reportCommentAction(fd);
      if (r.ok) {
        haptics.warning();
        setComments((prev) =>
          ("hidden" in r && r.hidden)
            ? prev.filter((c) => c.id !== id || c.mine) // hidden for non-authors
            : prev.map((c) => (c.id === id ? { ...c, reportedByMe: true, reports: c.reports + 1 } : c)),
        );
        toast({ title: ("hidden" in r && r.hidden) ? t.toast.reportedHidden : t.toast.reported, variant: "warning" });
      } else {
        toast({ title: r.error, variant: "danger" });
      }
    });
  };

  const remove = (id: string) => {
    const fd = new FormData();
    fd.set("marketId", marketId);
    fd.set("commentId", id);
    startTransition(async () => {
      const r = await deleteCommentAction(fd);
      if (r.ok) {
        haptics.confirm();
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast({ title: r.error, variant: "danger" });
      }
    });
  };

  const remaining = COMMENT_MAX_LEN - body.length;

  return (
    <section className="mt-8 rounded-lg border border-border bg-bg-elevated p-5 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <I.comment s={16} />
        <h2 className="font-display text-[17px] font-semibold text-text">{t.common.discussion}</h2>
        <span className="ml-auto font-mono text-[11px] text-text-subtle tabular-nums">{comments.length}</span>
      </div>

      {canPost ? (
        <div className="mb-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, COMMENT_MAX_LEN))}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
            rows={3}
            placeholder={t.common.shareYourRead}
            className="w-full resize-y rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-[14px] text-text placeholder:text-text-subtle outline-none transition-colors brand-focus"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`font-mono text-[10.5px] tabular-nums ${remaining < 40 ? "text-warning-fg" : "text-text-subtle"}`}>
              {remaining}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={pending || body.trim().length === 0}
              className="btn btn-gold btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending && <Spinner size={12} />}
              {pending ? t.common.posting : t.common.post}
            </button>
          </div>
        </div>
      ) : (
        <a
          href={signInHref}
          className="btn btn-ghost btn-md mb-5 block w-full text-center"
        >
          {t.market.signInToPredict}
        </a>
      )}

      {comments.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-text-subtle">
          {t.market.noCommentsYet}
        </p>
      ) : (
        <ul className="space-y-3.5">
          {(showAll ? comments : comments.slice(0, INITIAL_SHOW)).map((c) => (
            <li key={c.id} className={`flex gap-3 ${c.hidden ? "opacity-60" : ""}`}>
              <Avatar initials={c.authorName.slice(0, 2).toUpperCase()} seed={c.authorId} size="sm" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-display text-[13.5px] font-semibold text-text">{c.authorName}</span>
                  {c.authorRole && c.authorRole !== "PLAYER" && c.authorRole !== "AGENT" && (
                    <span className="rounded-pill border border-gold-700/50 bg-gold-500/15 px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-[0.08em] text-gold-300">
                      {c.authorRole === "ADMIN" ? t.profile.adminRole : c.authorRole === "MODERATOR" ? t.profile.moderatorRole : t.profile.complianceRole}
                    </span>
                  )}
                  {c.side && (
                    <span className={`rounded-pill px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-wide ${c.side === "YES" ? "text-yes-300 bg-yes-500/12" : "text-no-300 bg-no-500/12"}`}>
                      {t.market.holds} {c.side}
                    </span>
                  )}
                  <span className="font-mono text-[10.5px] text-text-subtle">{relTime(c.createdAt, t.common.now)}</span>
                  {c.hidden && (
                    <span className="rounded-pill border border-warning-border bg-warning-bg/40 px-1.5 py-px font-mono text-[9.5px] text-warning-fg">
                      {t.market.commentHidden}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-line break-words text-[14px] leading-relaxed text-text-muted">{c.body}</p>
                <div className="mt-1 flex items-center gap-3">
                  {!c.mine && (
                    <button
                      type="button"
                      onClick={() => report(c.id)}
                      disabled={pending || c.reportedByMe}
                      className="inline-flex items-center gap-1 font-mono text-[10.5px] text-text-subtle hover:text-warning-fg transition-colors disabled:opacity-50"
                      aria-label={t.common.reportComment}
                    >
                      <I.flag s={11} />
                      {c.reportedByMe ? t.toast.reported : t.common.report}
                    </button>
                  )}
                  {c.canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 font-mono text-[10.5px] text-text-subtle hover:text-danger-fg transition-colors disabled:opacity-50"
                      aria-label={t.common.deleteComment}
                    >
                      <I.trash s={11} />
                      {t.common.delete}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!showAll && comments.length > INITIAL_SHOW && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 w-full rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle hover:text-text hover:border-gold-700 transition-colors"
        >
          {t.common.showAll} ({comments.length - INITIAL_SHOW} {t.common.more})
        </button>
      )}
    </section>
  );
}
