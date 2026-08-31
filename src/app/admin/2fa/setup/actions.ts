"use server";

import { safeError } from "@/lib/server/safe-error";
import { fieldError } from "@/lib/server/field-error";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { provisionTotp, verifyTotp, removeTotp, hasTotp } from "@/lib/server/totp";
import { isStaffRole } from "@/lib/server/roles";

// RBAC: any staff role may open the console + enrol 2FA (see isStaffRole).

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && isStaffRole(u.role))) redirect("/auth/admin");
  return { session, user: u };
}

export async function provisionTotpAction(formData?: FormData) {
  const { session, user } = await requireAdmin();
  try {
    // Step-up: ROTATING an existing secret must prove possession of the current
    // authenticator — otherwise a hijacked session cookie can silently replace
    // the officer's 2FA with its own (B-3). First-time enrolment stays open.
    if (await hasTotp(session.userId)) {
      const code = String(formData?.get("code") ?? "").trim();
      /* ⛔ DG-S-05 — THIS ONE STAYS PLAIN, and it is the closest call in the file. The sentence
         blames the step-up code box, so it READS field-shaped. Two independent reasons say no
         address anyway, and the first is fatal on its own.

         ① THE CONTROL IS GONE BEFORE THE ANSWER ARRIVES. The only "current 6-digit code" box in
           the product is `stepCodeInput`, which exists solely inside the re-provision
           `ConfirmModal` — and that ceremony CLOSES FIRST: `setReprovOpen(false)` and then
           `void start(stepCode)` (`setup-client.tsx:199-200`). `Modal` returns `null` once
           closed (`modal.tsx:249`), so by the time this round-trip lands there is no
           `[data-field]` left in the document at all. An address here would resolve to nothing
           on EVERY failure, not on an edge case: `focusFirstInvalid` would answer
           `not-rendered` 100% of the time. That is §K rule 7d's defect wearing the costume of
           the fix — a form that says "this is wrong, there" and points at an empty room.
         ② THE OTHER CALLER PRESSES A BUTTON AND TYPES NOTHING. `start()` is also invoked bare
           from "Provision authenticator" with no FormData at all. If `initiallyEnabled` went
           stale (a secret exists while the page said "Not configured") this exact sentence
           fires with no code control anywhere on screen — rule 3's literal case: the value came
           from which BUTTON was pressed, so there is nothing to focus.

         ⚠️ Opting the modal into hold-open WOULD genuinely fix ① — `ConfirmModal` already
         carries `loading`, and `payments/reconcile-controls.tsx` is the worked hold-open
         example — but that is a CONTROL-FLOW change on a step-up gate that protects every
         privileged money action. DG-S-05 is additive only, so it is not this row's to make.
         Left as the remainder, and it is a real one.
         ⭐ The sentence is untouched either way: it already names the control in words, which is
         the most an unaddressable refusal can do. */
      if (!/^\d{6}$/.test(code) || !(await verifyTotp(session.userId, code))) {
        return { ok: false as const, error: "Enter a valid current 6-digit code to re-provision 2FA." };
      }
    }
    const label = user?.displayName ?? user?.phoneE164 ?? session.userId.slice(0, 12);
    const result = await provisionTotp(session.userId, label);
    return { ok: true as const, ...result };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Provisioning failed") };
  }
}

export async function verifyTotpAction(formData: FormData) {
  const { session } = await requireAdmin();
  const code = String(formData.get("code") ?? "").trim();
  /* ⭐ DG-S-05 — the refusal NAMES its field. Both of these are about the same control, and
     until now both said only "this is wrong" with no address, so nothing on the client could
     take the operator to the box. `"totp-code"` is the `data-field` on the label in
     `setup-client.tsx`. ⛔ The rest of the console still returns bare `{ ok, error }` and still
     works — `field` is optional by design; this is the surface being proved end to end, not a
     sweep across 34 server files. */
  if (!/^\d{6}$/.test(code)) {
    return fieldError("totp-code", "Enter the 6-digit code from your authenticator app.");
  }
  try {
    const ok = await verifyTotp(session.userId, code);
    if (!ok) return fieldError("totp-code", "Code didn't match. Try again — codes refresh every 30 seconds.");
    revalidatePath("/admin/2fa/setup");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Verification failed") };
  }
}

export async function removeTotpAction(formData?: FormData) {
  const { session } = await requireAdmin();
  try {
    // Step-up: removing an EXISTING secret requires a valid current code (B-3).
    // A stolen staff session must not be able to strip the officer's 2FA and
    // then sail through requireAdminTotp on every money action.
    if (await hasTotp(session.userId)) {
      const code = String(formData?.get("code") ?? "").trim();
      /* ⛔ DG-S-05 — PLAIN, for reason ① spelled out in full at `provisionTotpAction` above. The
         "current 6-digit code" box lives only inside the removal `ConfirmModal`, and the
         ceremony closes it BEFORE awaiting this action: `setRemoveOpen(false)` then
         `void remove(stepCode)` (`setup-client.tsx:173-174`). `Modal` returns `null` when closed
         (`modal.tsx:249`), so nothing this refusal could name is in the DOM when the refusal is
         read — `focusFirstInvalid` would report `not-rendered` every single time.
         ⚠️ Reason ② does NOT apply here: every caller of `remove()` passes a code the officer
         typed, so hold-open alone would make this one addressable. Same remainder. */
      if (!/^\d{6}$/.test(code) || !(await verifyTotp(session.userId, code))) {
        return { ok: false as const, error: "Enter a valid current 6-digit code to remove 2FA." };
      }
    }
    await removeTotp(session.userId);
    revalidatePath("/admin/2fa/setup");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Removal failed") };
  }
}

export async function checkTotpAction(): Promise<{ enabled: boolean }> {
  const { session } = await requireAdmin();
  try {
    return { enabled: await hasTotp(session.userId) };
  } catch {
    return { enabled: false };
  }
}
