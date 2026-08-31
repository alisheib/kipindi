"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fieldError, type ActionFailure } from "@/lib/server/field-error";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { notifySof } from "@/lib/server/notification-service";
import { sendEmailToUser, sofDecisionHtml } from "@/lib/server/email";
import { withLock } from "@/lib/server/locks";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function requireOfficer() {
  return requireStaff("compliance");
}

/**
 * ⭐ DG-S-05 — the return TYPE has to admit the address or the client cannot read it.
 *
 * `reviewSofAction`'s annotation was already explicit (`{ ok: true } | { ok: false; error:
 * string }`), and an explicit annotation is a CEILING, not a floor: `fieldError` returns
 * `{ ok, error, field }`, and handing that back through a type with no `field` drops the
 * property on the way out — the wire would carry a refusal with no address, and the client's
 * `r.field` would not compile in the first place. Widening to `ActionFailure` (where `field` is
 * OPTIONAL) leaves all five plain refusals below type-checking exactly as written, and leaves
 * their payload byte-identical on the wire.
 *
 * ⛔ NOT exported — a `"use server"` module may only export async functions.
 */
type ReviewSofResult = { ok: true } | ActionFailure;

/**
 * Review a player's source-of-funds declaration.
 *
 * Until now SOF declarations were created PENDING with no way to clear them, so
 * any player who tripped the SOF threshold (single deposit ≥ TZS 1M, or rolling
 * 30-day ≥ TZS 5M) was permanently unable to deposit — the deposit gate
 * (wallet-service) requires reviewStatus === "ACCEPTED". This action is that
 * missing decision step. Single-officer (SOF is not on the two-person list);
 * both outcomes are audited under COMPLIANCE.
 */
export async function reviewSofAction(formData: FormData): Promise<ReviewSofResult> {
  const session = await requireOfficer();
  await requireAdminTotp(session.userId, session.sessionId);
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  /* ⛔ DG-S-05 — PLAIN, DELIBERATELY. `userId` is the row's identity, passed as a prop from
     `page.tsx` and set into the FormData by the client; there is no box on screen an operator
     could type it into, so there is nothing to focus. An address here would name a field that
     does not render — `focusFirstInvalid` would report `not-rendered` and the operator would be
     told the form is wrong somewhere they cannot see. Empty means the CLIENT is broken, not the
     input. */
  if (!userId) return { ok: false, error: "Missing user id." };
  /* ⛔ DG-S-05 — PLAIN, and this is the textbook case for it: `decision` is not typed or chosen
     in a control, it is WHICH BUTTON WAS PRESSED (Accept / More info / Reject, and then Send
     carrying the expanded panel's mode). A button is not a field an operator can correct, so
     there is no `data-field` for this and inventing one would send the cursor to the reason box
     — a box that has nothing wrong with it. Unreachable from our own UI anyway; this is the
     guard against a hand-rolled POST. */
  if (decision !== "ACCEPT" && decision !== "REJECT" && decision !== "MORE_INFO") return { ok: false, error: "Invalid decision." };
  // An officer must never clear their own declaration (separation of duties).
  /* ⛔ DG-S-05 — PLAIN. This refuses WHO IS ASKING, not what they typed: no edit to any control
     on this row makes it pass. A policy denial with a field address would promise a fix that
     does not exist. */
  if (session.userId === userId) return { ok: false, error: "You cannot review your own source-of-funds declaration." };
  /* ⭐ DG-S-05 — THE ONE FIELD-SHAPED REFUSAL IN THIS ACTION. The sentence blames exactly one
     control the operator typed into: the reason/note input that the Reject / More-info panel
     expands (`sof-review-client.tsx`). Same sentence, unchanged — all that is added is the
     address. `"sof-reason"` is the `data-field` on that `<input>`.
     ⚠️ The client already refuses `< 5` before it submits, so this branch is the defence in
     depth rather than the everyday path. It still has to carry the address: the moment the two
     thresholds drift (a client that trims differently, a slice(0,500) that lands on 4
     characters) this is the refusal an operator actually meets, and a refusal that arrives
     WITHOUT an address is the exact thing this row exists to remove. */
  if ((decision === "REJECT" || decision === "MORE_INFO") && reason.length < 5) return fieldError("sof-reason", "A reason/note (≥ 5 characters) is required.");

  return withLock(`sof-review:${userId}`, async () => {
    const sof = await db.sourceOfFunds.get(userId);
    /* ⛔ DG-S-05 — both PLAIN. Neither is about an input: the first is "not found" and the
       second is a state conflict (another officer decided it while this row was open). Retyping
       the reason changes neither answer, so neither gets an address — the fix for "Already
       accepted." is to refresh the queue, not to edit a box. */
    if (!sof) return { ok: false as const, error: "No source-of-funds declaration on file for this user." };
    if (sof.reviewStatus !== "PENDING") return { ok: false as const, error: `Already ${sof.reviewStatus.toLowerCase()}.` };

    const now = new Date().toISOString();
    const statusMap = { ACCEPT: "ACCEPTED", REJECT: "REJECTED", MORE_INFO: "PENDING" } as const;
    await db.sourceOfFunds.upsert({
      ...sof,
      reviewStatus: statusMap[decision as keyof typeof statusMap],
      reviewerId: session.userId,
      reviewedAt: now,
    });

    const actionMap = { ACCEPT: "sof.accepted", REJECT: "sof.rejected", MORE_INFO: "sof.more_info_requested" } as const;
    audit({
      category: "COMPLIANCE",
      action: actionMap[decision as keyof typeof actionMap],
      actorId: session.userId,
      targetType: "User",
      targetId: userId,
      payload: { declaredSource: sof.declaredSource, declaredAnnualIncomeBand: sof.declaredAnnualIncomeBand, reason: reason || null },
    });

    const notifyStatusMap = { ACCEPT: "ACCEPTED", REJECT: "REJECTED", MORE_INFO: "MORE_INFO" } as const;
    const notifyStatus = notifyStatusMap[decision as keyof typeof notifyStatusMap];
    notifySof(userId, notifyStatus);
    // Dual-channel: a SoF decision gates the player's deposits, so email it too
    // (not bell-only) — matches the KYC decision flow.
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: decision === "ACCEPT" ? "Source of funds accepted" : decision === "MORE_INFO" ? "Source of funds — more info needed" : "Source of funds — action needed",
      html: sofDecisionHtml({ status: notifyStatus, note: reason || undefined }),
      tag: "compliance",
    })).catch(() => {});

    revalidatePath("/admin/approvals");
    return { ok: true as const };
  });
}
