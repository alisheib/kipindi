"use client";

/**
 * Market discussion thread. Post-moderation: comments post optimistically and
 * appear immediately; anyone can report (auto-hides at threshold, server-side);
 * authors + moderators can delete. Bilingual, on-theme, reduced-motion safe.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { sideWord } from "@/lib/side-label";
// ⛔ NEVER THE RAW SERVER STRING. `docs/FAILURE-INVENTORY.md` §1.5 counts twelve surfaces
// that put `r.error` — English audit prose — in front of the player, and §1.6 records what
// that costs: a Swahili or Chinese player reading an English sentence at the moment something
// failed. `errorCopy` renders THIS player's language off the machine code.
import { errorCopy } from "@/lib/error-copy";
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
  // B-17 — useState(initialComments) froze this thread at FIRST render: the
  // 15s poll re-rendered the server component with fresh comments and this
  // client component ignored them forever. Reconcile on prop change — server
  // truth wins (it includes anything this client optimistically prepended,
  // once the refresh after postCommentAction lands).
  const lastServerRef = useRef(initialComments);
  useEffect(() => {
    if (lastServerRef.current !== initialComments) {
      lastServerRef.current = initialComments;
      setComments(initialComments);
    }
  }, [initialComments]);
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
      // B-12 — a flaky network mid-post THROWS inside the transition, and an uncaught
      // throw replaces the whole page (with the typed comment) with error.tsx. Caught,
      // the draft stays in the box — `setBody("")` is inside the success branch only —
      // and the toast takes the same localized path a refusal takes.
      let r: Awaited<ReturnType<typeof postCommentAction>>;
      try {
        r = await postCommentAction(fd);
      } catch {
        // No code on purpose: errorCopy's no-code path renders this localized string
        // as-is — the network truth, not a server refusal.
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      if (r.ok && "comment" in r) {
        // Held in a const because `r` is a `let` now: TypeScript drops the narrowing of
        // a reassignable binding once it is read inside a nested closure, and the updater
        // below is one.
        const posted = r.comment;
        setComments((prev) => [posted, ...prev]);
        setBody("");
        haptics.confirm();
      } else {
        toast({ title: r.ok ? t.toast.posted : errorCopy(t, r), variant: r.ok ? "success" : "danger" });
      }
    });
  };

  const report = (id: string) => {
    const fd = new FormData();
    fd.set("marketId", marketId);
    fd.set("commentId", id);
    startTransition(async () => {
      // B-12 — guarded like the post path above.
      let r: Awaited<ReturnType<typeof reportCommentAction>>;
      try {
        r = await reportCommentAction(fd);
      } catch {
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      if (r.ok) {
        haptics.warning();
        setComments((prev) =>
          ("hidden" in r && r.hidden)
            ? prev.filter((c) => c.id !== id || c.mine) // hidden for non-authors
            : prev.map((c) => (c.id === id ? { ...c, reportedByMe: true, reports: c.reports + 1 } : c)),
        );
        toast({ title: ("hidden" in r && r.hidden) ? t.toast.reportedHidden : t.toast.reported, variant: "warning" });
      } else {
        toast({ title: errorCopy(t, r), variant: "danger" });
      }
    });
  };

  const remove = (id: string) => {
    const fd = new FormData();
    fd.set("marketId", marketId);
    fd.set("commentId", id);
    startTransition(async () => {
      // B-12 — guarded like the post path above.
      let r: Awaited<ReturnType<typeof deleteCommentAction>>;
      try {
        r = await deleteCommentAction(fd);
      } catch {
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      if (r.ok) {
        haptics.confirm();
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast({ title: errorCopy(t, r), variant: "danger" });
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
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, COMMENT_MAX_LEN))}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
            rows={3}
            maxLength={COMMENT_MAX_LEN}
            placeholder={t.common.shareYourRead}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`font-mono text-[10.5px] tabular-nums ${remaining < 40 ? "text-warning-fg" : "text-text-subtle"}`}>
              {remaining}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={pending || body.trim().length === 0}
              className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending && <Spinner size={12} />}
              {pending ? t.common.posting : t.common.post}
            </button>
          </div>
        </div>
      ) : (
        <Link
          href={signInHref as never}
          className="btn btn-ghost btn-md mb-5 block w-full text-center"
        >
          {t.market.signInToPredict}
        </Link>
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
                    <Chip variant="info" size="sm">
                      {c.authorRole === "ADMIN" ? t.profile.adminRole : c.authorRole === "MODERATOR" ? t.profile.moderatorRole : t.profile.complianceRole}
                    </Chip>
                  )}
                  {/* §L3 — a translated verb must not close around a stored token. This read
                      "Ana YES" in Swahili and "持有 YES" in Chinese; the noun now comes from
                      the same lexicon as the verb. Comments are poll-only. */}
                  {c.side && (
                    <Chip variant={c.side === "YES" ? "yes" : "no"} size="sm">
                      {t.market.holds} {sideWord(t, c.side, "MARKET")}
                    </Chip>
                  )}
                  <span className="font-mono text-[10.5px] text-text-subtle">{relTime(c.createdAt, t.common.now)}</span>
                  {c.hidden ? (
                    <Chip variant="warning" size="sm">{t.market.commentHidden}</Chip>
                  ) : c.reports > 0 && !c.mine ? (
                    <Chip variant="neutral" size="sm">{t.common.underReview}</Chip>
                  ) : null}
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
          className="mt-3 w-full rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle hover:text-text hover:border-brand-400 transition-colors"
        >
          {t.common.showAll} ({comments.length - INITIAL_SHOW} {t.common.more})
        </button>
      )}
    </section>
  );
}
