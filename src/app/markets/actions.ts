"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { buyPosition, cashOutPosition, resolveMarket, emergencyVoidMarket, adminReopenMarket, createMarket, listPositionsForUser, type CreateMarketInput, type Side, recategoriseMarket, MARKET_CATEGORIES } from "@/lib/server/market-service";
import { addComment, reportComment, deleteComment, restoreComment, type CommentSide } from "@/lib/server/comments-store";
import { isSourceTrusted, seedDefaultSources } from "@/lib/server/source-registry";
import { db, type ObjectionReason } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { canAct } from "@/lib/server/rbac";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { requireAdminTotp } from "@/lib/server/admin-guard";
// ⛔ The SAME rule the wizard applies client-side — imported, never re-implemented.
import { criterionTranslationIssue } from "@/lib/localized";

/**
 * F3 — toggle the watchlist star on a market. Returns the NEW state so the
 * client can reconcile its optimistic update. No revalidatePath on purpose (same
 * reasoning as voteAction): the star updates optimistically and is persisted
 * server-side; refetching the whole board on every click would only cause churn.
 */
export async function toggleWatchAction(marketId: string): Promise<{ ok: boolean; watching: boolean; error?: string }> {
  const s = await currentSession();
  if (!s) return { ok: false, watching: false, error: "auth" };
  if (!marketId) return { ok: false, watching: false, error: "invalid" };
  const { toggleWatch } = await import("@/lib/server/watchlist-service");
  const watching = await toggleWatch(marketId, s.userId);
  return { ok: true, watching };
}

/**
 * F5 — mint a signed share token for a win the caller actually owns.
 *
 * Returns null for anything that is not a settled WIN belonging to this user, so
 * a loss, an open bet, or someone else's position can never be shared as a win.
 * The token names the position only — the amount is re-read from the ledger when
 * the card renders, so the figure can never be fabricated via the URL.
 */
export async function mintWinShareTokenAction(positionId: string): Promise<{ ok: boolean; token?: string }> {
  const s = await currentSession();
  if (!s) return { ok: false };
  const { mintWinShareToken } = await import("@/lib/server/share-token");
  const token = await mintWinShareToken(s.userId, positionId);
  return token ? { ok: true, token } : { ok: false };
}

/** Defense-in-depth: even though the /admin layout gates non-admin
 *  access at render time, the Server Action itself must refuse a
 *  privileged write if the caller is not actually an admin. A leaked
 *  Server-Action ID would otherwise let a regular player resolve a
 *  market. Regulator: GBT / LCCP "least-privilege" + ISO 27001 A.9. */
// RBAC: market write actions are `trading` — canAct consults the role's grant
// (Owner/ADMIN bypasses). Resolution is separately two-officer-gated in market-service.
// E-18: the domain comes from control-gates.ts, the ONE place the resolver-queue page
// also reads to decide whether to render Resolve YES/NO/VOID at all. Note the name is
// historical — this guard admits any role with `trading` ACT, not only ADMIN.
async function requireAdminOrThrow(userId: string, action: string) {
  const domain = CONTROL_DOMAIN.resolveMarket;
  const user = await db.user.findById(userId);
  if (!user || !(user.role === "ADMIN" || (await canAct(user.role, domain)))) {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: userId,
      targetType: "Action",
      targetId: action,
      payload: { role: user?.role ?? "unknown", domain },
    });
    throw new Error("Forbidden: admin role required.");
  }
}

export async function buyPositionAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const marketId = String(formData.get("marketId") ?? "");
  const sideRaw = String(formData.get("side") ?? "");
  if (sideRaw !== "YES" && sideRaw !== "NO") return { ok: false as const, error: "Invalid side." };
  const side = sideRaw as Side;
  const stake = parseInt(String(formData.get("stake") ?? "0"), 10);
  if (!marketId || !Number.isFinite(stake) || stake <= 0) return { ok: false as const, error: "Invalid bet parameters." };
  const idempotencyKey = formData.get("idempotencyKey") ? String(formData.get("idempotencyKey")) : undefined;
  // E-235 — the play clock rides on the signed session, so the limit cannot be reset by
  // clearing site data. `buyPosition` treats an absent value as "no opinion".
  const r = await buyPosition(session.userId, { marketId, side, stake, idempotencyKey, playStartedAt: session.playStartedAt });
  if (r.ok) {
    revalidatePath("/markets");
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/positions");
    revalidatePath("/wallet");
    // ⛔ UD-6 · `/updown` is deliberately NOT in this list any more. It made every tap's
    // action response re-run getBoard and stream a full board render — six fast taps,
    // six sequential board renders racing the 20s poller, on the 2G/low-end profile the
    // standards bar names — while the card's own comment promised "no re-render per
    // tap". The quick-bet hook now dispatches `50pick:refresh` on the falling edge of
    // its pending burst (the useDeferredToast idiom), and the RefreshPoller both /updown
    // and /updown/[roundId] mount performs ONE reconciliation per burst — which also
    // finally refreshes the round page + wallet pill (UD-5), which this list never did.
  }
  return r;
}

export async function cashOutPositionAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const positionId = String(formData.get("positionId") ?? "");
  const r = await cashOutPosition(session.userId, positionId);
  if (r.ok) {
    revalidatePath("/positions");
    revalidatePath("/wallet");
    revalidatePath("/markets");
  }
  return r;
}

export async function resolveMarketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  await requireAdminOrThrow(session.userId, "resolveMarketAction");
  await requireAdminTotp(session.userId, session.sessionId); // B3: 2FA at the action layer
  const marketId = String(formData.get("marketId") ?? "");
  const outcome = String(formData.get("outcome") ?? "") as Side | "VOID";
  // ADM2 ceremony — optional evidence excerpt the officer declares to justify
  // the verdict; recorded into the immutable audit payload by resolveMarket.
  const evidence = String(formData.get("evidence") ?? "").trim() || undefined;
  // Validate at runtime — the `as` cast is erased, so an invalid string would
  // otherwise reach settlement, mark the market RESOLVED with no winners, and
  // permanently lock every stake.
  if (outcome !== "YES" && outcome !== "NO" && outcome !== "VOID") {
    return { ok: false as const, error: "Invalid outcome.", code: "INVALID" as const };
  }
  const r = await resolveMarket({ marketId, outcome, officerId: session.userId, evidence });
  if (r.ok) {
    revalidatePath("/admin/resolver-queue");
    revalidatePath("/markets");
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/positions");
  }
  return r;
}

/**
 * ⭐ RE-CATEGORISE — Jay (Gaming Board) item #14.
 *
 * Category was set once, at creation, so a mis-filed market could only be corrected by
 * re-creating it — which on a market that already holds stakes is not a correction at all.
 *
 * ⛔ NO 2FA STEP-UP HERE, and the omission is deliberate rather than an oversight.
 * `requireAdminTotp` guards the actions that move or lock MONEY — resolving a market, reopening
 * betting. This one changes the label a market is filed under: no pool, no stake, no status and
 * no resolution moves. Demanding a step-up for a filing correction would train operators to
 * treat the step-up as noise, which is how a real one gets clicked through.
 *
 * 🔴 The licence exclusion is enforced in `recategoriseMarket`, structurally, against
 * `MARKET_CATEGORY_SET` — there is no string this action can pass that becomes `politics`.
 */
export async function recategoriseMarketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  await requireAdminOrThrow(session.userId, "recategoriseMarketAction");
  const marketId = String(formData.get("marketId") ?? "");
  const category = String(formData.get("category") ?? "");
  const r = await recategoriseMarket({ marketId, category, officerId: session.userId });
  if (r.ok) {
    revalidatePath("/admin/markets");
    revalidatePath(`/admin/markets/${marketId}`);
    revalidatePath("/markets");
    revalidatePath(`/markets/${marketId}`);
    // ⚠️ `/results` GROUPS BY CATEGORY — the A×H interaction. It is `force-dynamic`, so it
    // re-reads the category on every request and cannot show a re-filed market in two groups or
    // none. This line is the belt to that braces: it also clears the client router cache, and it
    // means the day someone makes `/results` static the surface is already named here.
    revalidatePath("/results");
  }
  return r;
}

/**
 * Admin reopen — override a sentinel closure and put the market back to LIVE.
 * Only works on CLOSED markets that haven't entered the resolution flow.
 */
export async function adminReopenMarketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  await requireAdminOrThrow(session.userId, "adminReopenMarketAction");
  await requireAdminTotp(session.userId, session.sessionId); // B3: 2FA step-up (reopening resumes betting)
  const marketId = String(formData.get("marketId") ?? "");
  const r = await adminReopenMarket(marketId, session.userId);
  if (r.ok) {
    revalidatePath("/admin/markets");
    revalidatePath("/markets");
    revalidatePath(`/markets/${marketId}`);
  }
  return r;
}

/**
 * Emergency void / kill switch — pull a (possibly LIVE) market immediately and
 * refund every open stake in full. Tighter gate than other admin actions: only
 * ADMIN or COMPLIANCE (it moves money / closes a live pool — not a moderator job).
 */
export async function emergencyVoidMarketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const user = await db.user.findById(session.userId);
  // E-18: `/admin/markets` is `trading`, this action is `compliance` — one definition
  // (control-gates.ts) so the page can hide the control instead of offering a kill
  // switch that refuses and logs the click as a privilege escalation.
  if (!user || !(user.role === "ADMIN" || (await canAct(user.role, CONTROL_DOMAIN.emergencyVoidMarket)))) {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: "emergencyVoidMarketAction",
      payload: { role: user?.role ?? "unknown", domain: CONTROL_DOMAIN.emergencyVoidMarket },
    });
    return { ok: false as const, error: "Forbidden: ADMIN or COMPLIANCE role required.", code: "INVALID" as const };
  }
  await requireAdminTotp(session.userId, session.sessionId); // B3: 2FA at the action layer
  const marketId = String(formData.get("marketId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const r = await emergencyVoidMarket({ marketId, officerId: session.userId, reason });
  if (r.ok) {
    revalidatePath("/admin/markets");
    revalidatePath("/markets");
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/live");
    revalidatePath("/positions");
    revalidatePath("/wallet");
  }
  return r;
}

export async function createMarketAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  await requireAdminOrThrow(session.userId, "createMarketAction");
  await requireAdminTotp(session.userId, session.sessionId); // B3: 2FA step-up at the action layer
  const VALID_CATEGORIES = new Set(["sports", "macro", "weather", "crypto", "culture", "tech", "other"]);
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const titleSw = String(formData.get("titleSw") ?? "").trim();
  const titleZh = String(formData.get("titleZh") ?? "").trim();
  const rawCategory = String(formData.get("category") ?? "other");
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const resolutionCriterion = String(formData.get("resolutionCriterion") ?? "").trim();
  const resolutionAtRaw = String(formData.get("resolutionAt") ?? "").trim();
  if (titleEn.length < 10) {
    return { ok: false as const, error: "Title must be at least 10 characters." };
  }
  if (!sourceUrl || !/^https?:\/\/.+/.test(sourceUrl)) {
    return { ok: false as const, error: "Source URL must be a valid HTTP(S) URL." };
  }
  // ⛔ THE WALL CLOCK IS RESOLVED HERE, ON THE SERVER, NOT IN THE BROWSER.
  // The wizard's `<input type="datetime-local">` yields `2026-08-15T14:30` — no zone.
  // It used to be sent through `new Date(...).toISOString()` in the CLIENT, which
  // reads it on the officer's laptop clock; an officer not on EAT published a poll
  // resolving at a different absolute instant from the one they confirmed, and every
  // cloud/CI session (UTC) was silently three hours out. The platform timezone is
  // admin-configurable and lives on the server, so the conversion belongs here.
  // A value that already carries a zone is passed through untouched.
  const { toUtcIso } = await import("@/lib/zoned-time");
  const { getPlatformTimezone } = await import("@/lib/server/platform-config");
  const resolutionAt = toUtcIso(resolutionAtRaw, getPlatformTimezone()) ?? "";
  if (!resolutionAt || Number.isNaN(Date.parse(resolutionAt))) {
    return { ok: false as const, error: "Resolution time is required and must be a valid date." };
  }
  if (Date.parse(resolutionAt) <= Date.now()) {
    // A past resolution time publishes a market that is instantly closed-by-time,
    // un-bettable, and drops straight into the resolver queue. Reject it.
    return { ok: false as const, error: "Resolution time must be in the future." };
  }
  if (resolutionCriterion.length < 30) {
    return { ok: false as const, error: "Resolution criterion must be at least 30 characters." };
  }
  // F6b · the criterion is the sentence the payout turns on, so it is collected in all
  // three languages. Both translations are OPTIONAL — a missing one is disclosed to the
  // player, not hidden — but a BAD one is refused rather than silently corrected: an
  // officer who believes they saved a translation and did not is the state this whole
  // finding is about. ⛔ The same rule runs in the wizard (one policy, both sides — a
  // client that accepts what the server refuses is E-145's shape).
  const criterionSwRaw = String(formData.get("resolutionCriterionSw") ?? "").trim();
  const criterionZhRaw = String(formData.get("resolutionCriterionZh") ?? "").trim();
  for (const [label, raw] of [["Swahili", criterionSwRaw], ["Chinese", criterionZhRaw]] as const) {
    const issue = criterionTranslationIssue(raw, resolutionCriterion);
    if (issue === "TOO_SHORT") {
      return { ok: false as const, error: `The ${label} criterion is too short to be a translation. Leave it blank — a blank one shows the English and says so.` };
    }
    if (issue === "SAME_AS_ENGLISH") {
      return { ok: false as const, error: `The ${label} criterion is the English text. Leave it blank instead — blank already shows the English, and storing a copy makes "not translated" impossible to tell from "translated identically".` };
    }
  }
  if (!VALID_CATEGORIES.has(rawCategory)) {
    return { ok: false as const, error: "Invalid category." };
  }
  const { computeSelectionClosedAt } = await import("@/lib/server/ai-poll-config");
  // Same wall-clock treatment as resolutionAt — this field decides when BETTING shuts,
  // so a three-hour slip here is the same class of defect wearing a different name.
  const selectionClosedAtRaw = toUtcIso(String(formData.get("selectionClosedAt") ?? ""), getPlatformTimezone()) ?? "";
  const input: CreateMarketInput = {
    titleEn,
    titleSw,
    titleZh: titleZh || null,
    category: rawCategory as CreateMarketInput["category"],
    sourceUrl,
    resolutionCriterion,
    resolutionCriterionSw: criterionSwRaw || null,
    resolutionCriterionZh: criterionZhRaw || null,
    resolutionAt,
    selectionClosedAt: selectionClosedAtRaw && !Number.isNaN(Date.parse(selectionClosedAtRaw))
      ? selectionClosedAtRaw
      : computeSelectionClosedAt(resolutionAt, rawCategory),
    proposedBy: session.userId,
  };
  // Source-trust gate — only enabled, on-registry sources can publish a market.
  await seedDefaultSources();
  const trust = await isSourceTrusted(input.sourceUrl, input.category);
  if (!trust.ok) {
    return { ok: false as const, error: `Source not approved · ${trust.reason}. Add or enable it at /admin/sources.` };
  }
  const m = await createMarket(input);
  revalidatePath("/admin/markets");
  revalidatePath("/markets");
  return { ok: true as const, market: m };
}

// ─── Market discussion (comments) ──────────────────────────────────────
// Post-moderation: visible immediately, community report → auto-hide,
// author/moderator soft-delete. See comments-store.ts.

export async function postCommentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in to comment · Ingia ili kutoa maoni." };
  const marketId = String(formData.get("marketId") ?? "");
  const body = String(formData.get("body") ?? "");
  // Surface which side they hold as a small trust badge on the comment.
  const open = (await listPositionsForUser(session.userId)).filter((p) => p.marketId === marketId && p.status === "OPEN");
  const side: CommentSide = open.length ? (open[open.length - 1].side as "YES" | "NO") : null;
  const r = await addComment(session.userId, marketId, body, side);
  if (r.ok) revalidatePath(`/markets/${marketId}`);
  return r;
}

/**
 * F11 — a player formally objects to a market's verdict.
 *
 * This is only meaningful because settlement is gated: the market is RESOLVED but
 * its pool is still whole, so an objection FREEZES the money until an officer
 * rules. Every eligibility rule (stakeholder-only, one-open-per-market, window
 * still open, not yet settled) is enforced in the SERVICE under the market lock —
 * this action is a thin authenticated wrapper, so a crafted POST cannot bypass it.
 */
export async function fileObjectionAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in first." };

  const marketId = String(formData.get("marketId") ?? "");
  const reason = String(formData.get("reason") ?? "") as ObjectionReason;
  const detail = String(formData.get("detail") ?? "");

  const { fileObjection } = await import("@/lib/server/objections-service");
  const r = await fileObjection(session.userId, { marketId, reason, detail });
  if (r.ok) revalidatePath(`/markets/${marketId}`);
  return r;
}

export async function reportCommentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in first." };
  const marketId = String(formData.get("marketId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const r = await reportComment(session.userId, commentId);
  if (r.ok) revalidatePath(`/markets/${marketId}`);
  return r;
}

export async function deleteCommentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in first." };
  const marketId = String(formData.get("marketId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const r = await deleteComment(session.userId, commentId);
  if (r.ok) { revalidatePath(`/markets/${marketId}`); revalidatePath("/admin/moderation"); }
  return r;
}

/** Moderator: clear an unfounded report / auto-hide and republish. */
export async function restoreCommentAction(formData: FormData) {
  const session = await currentSession();
  if (!session) return { ok: false as const, error: "Sign in first." };
  // Moderator-only action — gate at the action layer too (the store also checks
  // isMod; this keeps it consistent with every other admin action). Delete stays
  // ungated here because a comment's own author may delete it (store decides).
  await requireAdminOrThrow(session.userId, "restoreCommentAction");
  const commentId = String(formData.get("commentId") ?? "");
  const marketId = String(formData.get("marketId") ?? "");
  const r = await restoreComment(session.userId, commentId);
  if (r.ok) { revalidatePath(`/markets/${marketId}`); revalidatePath("/admin/moderation"); }
  return r;
}
