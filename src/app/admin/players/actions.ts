"use server";

/**
 * REVEAL A MASKED FIELD — ruling D4 (docs/READ-TIERS.md §4a).
 *
 * ⭐ THE AUDIT ROW IS THE PRODUCT HERE, not a side effect. The difference this buys is the one a
 * regulator actually asks for after an incident: not "support COULD have read it" but "support
 * DID read it, at 14:02, for player X". So the row is written BEFORE the value is returned, and
 * awaited — a fire-and-forget audit on a PII read would let the value out of the building with
 * the record still in a queue.
 *
 * ⛔ AND IT IS WRITTEN SERVER-SIDE, WHICH IS WHY THIS IS AN ACTION AND NOT A PROP. A client that
 * can render the value can decline to report that it did. The masked string is all the page ever
 * sends; the raw value exists only inside this function's response to a permitted caller.
 *
 * ⛔ THE GATE IS `mayReveal`, NOT "is this person staff". A SUPPORT agent reaching this action
 * directly — the modified-client case — is refused by the same matrix the UI consulted, so the
 * absent button and the refused request are the SAME rule rather than two that can drift.
 */
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { mayReveal } from "@/lib/server/rbac";
import { requireStaff } from "@/lib/server/rbac-guard";
import { SENSITIVE_FIELDS, isSensitiveFieldKey } from "@/lib/server/sensitive-fields";

export type RevealResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export async function revealSensitiveAction(
  field: string,
  subjectId: string,
): Promise<RevealResult> {
  // The route itself is `support`-domain; reaching this action requires the same.
  await requireStaff("support");
  const session = await currentSession();
  if (!session) return { ok: false, error: "Not signed in." };
  const viewer = await db.user.findById(session.userId);
  const role = viewer?.role;
  if (!role) return { ok: false, error: "Not signed in." };

  // ⛔ An unknown field key is refused rather than resolved — the client supplies this string.
  if (!isSensitiveFieldKey(field)) return { ok: false, error: "Unknown field." };
  const spec = SENSITIVE_FIELDS[field];

  if (!(await mayReveal(role, spec.readClass))) {
    // ⭐ NAME THE CLASS, NOT JUST "no". An operator who is refused should be able to tell their
    // manager which grant they are missing — the same reason E-213's refusal names the categories
    // the licence permits instead of saying "invalid".
    return {
      ok: false,
      error: `Your role cannot reveal ${spec.label.toLowerCase()} (${spec.readClass}).`,
    };
  }

  const raw = await spec.read(subjectId);
  if (raw == null || raw === "") return { ok: false, error: "Nothing recorded." };

  // ⚠️ AWAITED, and BEFORE the return. See the header.
  // ⛔ The payload names the CLASS and the FIELD but never the VALUE — an audit trail that
  // records the secret it is protecting is the leak, one layer down. (A credential quoted inside
  // an incident record is a mistake this operation has already paid for once.)
  await audit({
    category: "COMPLIANCE",
    action: "pii.revealed",
    actorId: session.userId,
    targetType: "User",
    targetId: subjectId,
    payload: { field, readClass: spec.readClass, role },
  });

  return { ok: true, value: raw };
}
