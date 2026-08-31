"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { fileDsarRequest, fulfillDsarRequest, buildDsarBundle, hasOpenRequest, asRequestableType } from "@/lib/server/privacy";
import { audit } from "@/lib/server/audit";
import { softRequireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven and lives in ONE place — `softRequireStaff` checks
// the role's grant for `compliance` (Owner/ADMIN bypasses inside canAct), AUDITS a refusal
// as `privilege_escalation_blocked`, then takes step-up 2FA.
//
// ⛔ THIS USED TO BE A LOCAL COPY, AND THE COPY HAD LOST THE AUDIT (finding A2). It returned
// "Not authorised." and recorded nothing, so a role without compliance canAct could click
// Export bundle on the DSAR queue and leave no trace of the attempt — measured 0 → 0 against
// the live counter while every other admin gate in the codebase wrote a row. **A DSAR export
// is precisely the attempt a regulator expects to find recorded, refused or not.**
async function requireOfficer(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const g = await softRequireStaff("compliance", "privacy.dsar", "Not authorised.");
  return g.ok ? { ok: true, userId: g.userId } : g;
}

/**
 * ⭐ DG-S-05 VERDICT FOR THIS FILE, 2026-08-31 — *"a refusal must name the control the operator
 * has to fix"*. Re-derived against every refusal below: **none of them gets a `field`, and that
 * is the finding, not a skipped chore.** Recorded here so the next sweep does not re-litigate
 * it, and — the part that actually matters — so nobody later "completes" the row by attaching
 * an address that provably cannot resolve.
 *
 * Ten refusals live in this file. Seven are disqualified by rule 2 on sight: three
 * `requireOfficer` denials (a permission answer — the operator's problem is their ROLE, and
 * there is no box on the page that grants it), three `safeError` catches (a server fault), and
 * `fulfillDsarAction`'s passthrough of `fulfillDsarRequest`'s own sentences, which are state
 * conflicts — *"DSAR not found."* and the erasure block on an account that is not CLOSED. The
 * remaining three are argued at their own lines.
 *
 * ⛔ AND THE ADDRESSABLE-LOOKING ONE IS THE TRAP. `/admin/privacy` has exactly ONE input control
 * in the whole route — the ERASURE/CORRECTION radio pair — and it lives inside a ConfirmDialog
 * that has already closed by the time any answer arrives. A route with no rendered control at
 * refusal time has nowhere to send anybody; see the block on `type` below for the measurement.
 */

/**
 * File a request on a player's behalf — walk-in, letter, telephone.
 *
 * 🔴 THIS HAD NO CALLER UNTIL 2026-08-21 (E-33), and that was the whole defect: nothing on the
 * platform could put a request INTO the register, so this page read *"No data-subject access
 * requests are on file"* permanently — not because nobody had asked, but because asking was
 * unrecordable, and **the statutory clock runs from the ask**. Its caller is
 * `FileDsarOnBehalfButton` in `dsar-controls.tsx`; the player's own door is
 * `filePrivacyRequestAction` in `src/app/profile/account/actions.ts`.
 */
export async function fileDsarAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false, error: auth.error };
  const userId = String(formData.get("userId") || "").trim();
  // ⛔ AN ALLOWLIST, NOT A CAST, AND NOT DEFAULTING TO "ACCESS". The old line took whatever the
  // form said `as DsarType` and fell back to ACCESS — the one right that needs no request at
  // all, because `buildDsarBundleAction` serves it immediately from this same card. Filing one
  // opens a 30-day statutory obligation for work the officer has just finished doing, and a
  // queue full of already-answered requests is how a real one gets missed. One narrower,
  // shared with the player's door.
  const type = asRequestableType(formData.get("type"));
  /* ⛔ DG-S-05 — THIS ONE STAYS PLAIN, AND IT IS THE CLOSEST CALL ON THE PAGE. It is the only
     refusal in the route that blames something the officer CHOSE, so it reads field-shaped: the
     ERASURE/CORRECTION radio pair in `FileDsarOnBehalfButton`. It still gets no `field`, for two
     independent reasons — either alone is enough, and the first is fatal.

     ① THE CONTROL IS GONE BEFORE THE ANSWER ARRIVES. Those radios exist only inside the
       ConfirmDialog body, and that dialog does NOT opt into the hold-open contract — it passes
       no `pending` — so `confirm-dialog.tsx` takes the classic branch: `setOpen(false)` and
       THEN `onConfirm()`. `Modal` returns `null` once closed, so by the time this round-trip
       lands there is no `[data-field]` left in the document at all. An address here would
       resolve to nothing on EVERY failure, not on an edge case: `focusFirstInvalid` would
       answer `not-rendered` 100% of the time. That is the §K rule 7d defect wearing the
       costume of the fix — a form that says "this is wrong, there" and points at an empty
       room. ⚠️ Opting the dialog into hold-open would genuinely fix it and is a CONTROL-FLOW
       change on a destructive compliance door; DG-S-05 is additive only, so it is not this
       row's to make. Left as the remainder, and it is a real one.
     ② NO OFFICER CAN REACH THIS SENTENCE. `type` is React state typed
       `"ERASURE" | "CORRECTION"` and `asRequestableType` accepts exactly those two, so no
       choice available on screen produces it. This is the backstop against a hand-built or
       replayed FormData — a caller with no screen and no keyboard. An address exists to take a
       PERSON to a control they must fix; here there is neither.

     ⭐ The sentence itself is untouched either way — it already names the two legal values and
     where the other two rights are served, which is the most an unaddressable refusal can do. */
  if (!type) {
    return { ok: false, error: "Type must be ERASURE or CORRECTION — access and portability are served by Export bundle." };
  }
  const reason = String(formData.get("reason") || "") || null;
  /* ⛔ DG-S-05 — INTERNAL, so no address (rule 2). `userId` is never typed by anybody: both
     doors hand it in as a prop from the row that was clicked (`u.id` on the on-behalf table).
     An empty one means the CALLER is malformed, not that the officer filled a box wrongly, and
     naming a field for it would send `focusFirstInvalid` hunting a control that has never been
     rendered on this route. The sentence is for a log reader, not an operator. */
  if (!userId) return { ok: false, error: "userId required" };
  try {
    // ⛔ The SAME cap the player's door uses. A double-click, or two officers taking the same
    // walk-in, must not file the request twice — see `hasOpenRequest`.
    if (hasOpenRequest(userId, type)) {
      revalidatePath("/admin/privacy");
      return { ok: true, duplicate: true };
    }
    fileDsarRequest({ userId, type, reason: reason ?? undefined });
    revalidatePath("/admin/privacy");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "DSAR filing failed") };
  }
}

export async function fulfillDsarAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false, error: auth.error };
  const id = String(formData.get("id") || "").trim();
  const exportRef = String(formData.get("exportRef") || "") || null;
  try {
    const r = await fulfillDsarRequest({ id, officerId: auth.userId, exportRef });
    /* ⛔ DG-S-05 — PLAIN, and deliberately a passthrough (rule 2). Both sentences that can
       arrive here are STATE, not input: *"DSAR not found."* when the id no longer matches a
       row, and the erasure block when the account is not CLOSED. Neither is fixed by editing a
       control — the officer's next move is to close the account or reload the queue. And `id`
       arrives as a prop from the row whose button was pressed, so rule 3 applies to it on top:
       there is no control on screen carrying it. */
    if (!r.ok) return { ok: false, error: r.error };
    revalidatePath("/admin/privacy");
    // ⭐ An ERASURE that only PARTIALLY completed must say so to the officer who pressed the
    // button. A bare `{ ok: true }` reads as "done" on a compliance action whose whole point
    // is that a statutory hold is still running.
    if (r.request.status === "PARTIAL") {
      return {
        ok: true,
        notice: `Personal data erased. Identity documents are held under POCA Cap 423 §16 `
          + `until ${r.request.erasureHeldUntil}; the request stays in the queue until then.`,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "Fulfillment failed") };
  }
}

export async function buildDsarBundleAction(formData: FormData) {
  const auth = await requireOfficer();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const userId = String(formData.get("userId") || "").trim();
  try {
    const bundle = await buildDsarBundle(userId);
    /* ⛔ DG-S-05 — PLAIN. "Not found" is a lookup miss on an id that came from the row the
       officer clicked, never from a box they filled (rule 2 + rule 3). It means the player was
       erased or deleted between the page render and the click — the fix is to reload the
       queue, not to correct an input. */
    if (!bundle) return { ok: false as const, error: "User not found" };
    audit({ category: "COMPLIANCE", action: "privacy.dsar.exported", actorId: auth.userId, targetType: "User", targetId: userId });
    return { ok: true as const, bundle };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Bundle export failed") };
  }
}
