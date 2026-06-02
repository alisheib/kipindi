/**
 * Market discussion threads — in-memory, globalThis-backed (same shape as the
 * other 50pick stores). Post-moderation model: comments are visible the moment
 * they're posted; the community can REPORT, and a comment auto-hides once it
 * crosses the report threshold; authors and moderators can soft-delete. This
 * keeps a demo thread alive while still giving a real moderation lever and an
 * audit trail (regulator: content moderation + traceability).
 */
import { maskName } from "@/lib/server/affiliate-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";

export type CommentSide = "YES" | "NO" | null;

type StoredComment = {
  id: string;
  marketId: string;
  userId: string;
  authorName: string; // masked at write time, frozen (privacy-consistent)
  body: string;
  side: CommentSide; // the side they held when they posted, if any
  createdAt: string; // ISO
  reports: Set<string>; // userIds who reported (dedup, can't double-count)
  hidden: boolean; // auto-hidden at threshold, or hidden by a moderator
  deleted: boolean; // soft delete (author or moderator)
};

/** The shape the UI consumes — viewer-relative flags, no internal Sets. */
export type CommentView = {
  id: string;
  authorName: string;
  body: string;
  side: CommentSide;
  createdAt: string;
  reports: number;
  hidden: boolean;
  mine: boolean;
  reportedByMe: boolean;
  canDelete: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_COMMENTS: Map<string, StoredComment> | undefined;
}
const comments: Map<string, StoredComment> =
  globalThis.__50PICK_COMMENTS ?? (globalThis.__50PICK_COMMENTS = new Map());

export const COMMENT_MAX_LEN = 500;
const REPORT_HIDE_THRESHOLD = 3;
const MOD_ROLES = new Set(["MODERATOR", "ADMIN", "COMPLIANCE"]);

let seq = 0;
function newId(): string {
  return `cm_${Date.now().toString(36)}_${(seq++).toString(36)}`;
}

function isMod(userId: string): boolean {
  const u = db.user.findById(userId);
  return !!u && MOD_ROLES.has(u.role);
}

function toView(c: StoredComment, viewerId: string | null): CommentView {
  const viewerIsMod = viewerId ? isMod(viewerId) : false;
  return {
    id: c.id,
    authorName: c.authorName,
    body: c.body,
    side: c.side,
    createdAt: c.createdAt,
    reports: c.reports.size,
    hidden: c.hidden,
    mine: viewerId === c.userId,
    reportedByMe: viewerId ? c.reports.has(viewerId) : false,
    canDelete: viewerId === c.userId || viewerIsMod,
  };
}

/** Public list for a market, newest first. Hidden/deleted comments are dropped
 *  for everyone except their author (who sees their own, labelled) and mods. */
export function listComments(marketId: string, viewerId: string | null): CommentView[] {
  const viewerIsMod = viewerId ? isMod(viewerId) : false;
  const out: CommentView[] = [];
  for (const c of comments.values()) {
    if (c.marketId !== marketId) continue;
    if (c.deleted && !viewerIsMod) continue;
    if (c.hidden && !viewerIsMod && c.userId !== viewerId) continue;
    out.push(toView(c, viewerId));
  }
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // newest first
  return out;
}

/** Count of visible comments (for the section header / card meta). */
export function countComments(marketId: string): number {
  let n = 0;
  for (const c of comments.values()) {
    if (c.marketId === marketId && !c.deleted && !c.hidden) n++;
  }
  return n;
}

/** A row in the admin moderation queue. */
export type ModerationItem = {
  id: string;
  marketId: string;
  authorName: string;
  body: string;
  createdAt: string;
  reports: number;
  hidden: boolean;
};

/** Everything a moderator needs to review: comments that are hidden (auto or
 *  manual) or carry at least one report, most-reported first. Across all
 *  markets. Excludes already-deleted comments. */
export function listForModeration(): ModerationItem[] {
  const out: ModerationItem[] = [];
  for (const c of comments.values()) {
    if (c.deleted) continue;
    if (!c.hidden && c.reports.size === 0) continue;
    out.push({
      id: c.id, marketId: c.marketId, authorName: c.authorName, body: c.body,
      createdAt: c.createdAt, reports: c.reports.size, hidden: c.hidden,
    });
  }
  // most-reported first, then hidden, then newest
  out.sort((a, b) => b.reports - a.reports || Number(b.hidden) - Number(a.hidden) || (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}

export function moderationCount(): number {
  let n = 0;
  for (const c of comments.values()) if (!c.deleted && (c.hidden || c.reports.size > 0)) n++;
  return n;
}

/** Moderator-only: clear an auto-hide / reports and make the comment public
 *  again (the report was unfounded). */
export function restoreComment(
  userId: string,
  commentId: string,
): { ok: true } | { ok: false; error: string } {
  const c = comments.get(commentId);
  if (!c || c.deleted) return { ok: false, error: "Comment not found." };
  if (!isMod(userId)) return { ok: false, error: "Not allowed." };
  c.hidden = false;
  c.reports.clear();
  audit({ category: "COMPLIANCE", action: "comment.restore", actorId: userId, targetType: "Comment", targetId: commentId });
  return { ok: true };
}

export function addComment(
  userId: string,
  marketId: string,
  rawBody: string,
  side: CommentSide,
): { ok: true; comment: CommentView } | { ok: false; error: string } {
  const body = rawBody.trim().replace(/\s+\n/g, "\n");
  if (body.length === 0) return { ok: false, error: "Say something first · Andika kitu kwanza." };
  if (body.length > COMMENT_MAX_LEN) {
    return { ok: false, error: `Keep it under ${COMMENT_MAX_LEN} characters · Punguza maandishi.` };
  }
  const user = db.user.findById(userId);
  if (!user) return { ok: false, error: "Sign in to comment · Ingia ili kutoa maoni." };

  const c: StoredComment = {
    id: newId(),
    marketId,
    userId,
    authorName: maskName(user.displayName, user.phoneE164),
    body,
    side,
    createdAt: new Date().toISOString(),
    reports: new Set(),
    hidden: false,
    deleted: false,
  };
  comments.set(c.id, c);
  audit({ category: "COMPLIANCE", action: "comment.post", actorId: userId, targetType: "Market", targetId: marketId, payload: { commentId: c.id } });
  return { ok: true, comment: toView(c, userId) };
}

export function reportComment(
  userId: string,
  commentId: string,
): { ok: true; hidden: boolean } | { ok: false; error: string } {
  const c = comments.get(commentId);
  if (!c || c.deleted) return { ok: false, error: "Comment not found." };
  if (c.userId === userId) return { ok: false, error: "You can't report your own comment." };
  c.reports.add(userId);
  if (!c.hidden && c.reports.size >= REPORT_HIDE_THRESHOLD) {
    c.hidden = true;
    audit({ category: "COMPLIANCE", action: "comment.auto_hidden", actorId: null, targetType: "Comment", targetId: commentId, payload: { reports: c.reports.size } });
  }
  audit({ category: "COMPLIANCE", action: "comment.report", actorId: userId, targetType: "Comment", targetId: commentId });
  return { ok: true, hidden: c.hidden };
}

export function deleteComment(
  userId: string,
  commentId: string,
): { ok: true } | { ok: false; error: string } {
  const c = comments.get(commentId);
  if (!c || c.deleted) return { ok: false, error: "Comment not found." };
  const allowed = c.userId === userId || isMod(userId);
  if (!allowed) return { ok: false, error: "Not allowed." };
  c.deleted = true;
  audit({ category: "COMPLIANCE", action: "comment.delete", actorId: userId, targetType: "Comment", targetId: commentId, payload: { byMod: c.userId !== userId } });
  return { ok: true };
}
