"use server";

/**
 * U33b-L · THE LISTS CARD'S TWO ACTIONS — record a licence basis on a list, and revoke the one in force.
 *
 * ⛔ THE GATE IS EACH ACTION'S FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is on,
 * so no layout or path rule can see it). `softRequireStaff("growth", …)` decides on the viewer's STORED role, audits a
 * refusal as `privilege_escalation_blocked`, takes step-up 2FA, and answers in words — before the rate rule, the parser
 * or the writer is touched. ⭐ `growth` because Ali ruled it (Q12, 2026-10-05): growth officers record a basis.
 *
 * ⭐ THEN THE RATE RULE, PER OFFICER (`marketing.listBasis`): a recording is seven-year evidence, an audit row that is
 * never pruned, and a widening of who the platform may lawfully message. ⛔ Spent BEFORE the writer, so a refused
 * recording spends it too — the budget bounds attempts, not successes.
 *
 * ⛔ NOTHING IS DECIDED HERE. Every rule — the saved wordings, the list, the 18+ tick, the note, the reason — belongs to
 * `list-basis.ts`, which is also what `test:contacts-lists` drives. These actions read named fields and hand them over.
 */
import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { safeError } from "@/lib/server/safe-error";
import { recordListBasis, revokeListBasis } from "@/lib/server/marketing/list-basis";

export type ListBasisActionResult = { ok: true } | { ok: false; error: string };

const REFUSAL = "Your role can view lists but not record a basis for them — ask an officer with Growth access.";

/** The officer's budget in words — the same shape the test send's uses. */
function tooMany(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `That is a lot of recordings in a row — try again in ${minutes} min.`;
}

export async function recordListBasisAction(formData: FormData): Promise<ListBasisActionResult> {
  const gate = await softRequireStaff("growth", "marketing.list.basis", REFUSAL);
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const rate = await rateCheckAsync(gate.userId, "marketing.listBasis");
  if (!rate.allowed) return { ok: false as const, error: tooMany(rate.retryAfterSec) };
  try {
    const res = await recordListBasis({
      listId: String(formData.get("listId") ?? ""),
      officerId: gate.userId,
      proofNote: String(formData.get("proofNote") ?? ""),
      // ⛔ The tick is read as an EXACT "1", never as truthiness: a stray value is not an attestation.
      adultAttested: formData.get("adultAttested") === "1",
    });
    if (!res.ok) return { ok: false as const, error: res.error };
    revalidatePath("/admin/contacts");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Recording the basis failed — nothing may have been recorded. Reload the page to check before trying again.") };
  }
}

export async function revokeListBasisAction(formData: FormData): Promise<ListBasisActionResult> {
  const gate = await softRequireStaff("growth", "marketing.list.basis", REFUSAL);
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const rate = await rateCheckAsync(gate.userId, "marketing.listBasis");
  if (!rate.allowed) return { ok: false as const, error: tooMany(rate.retryAfterSec) };
  try {
    const res = await revokeListBasis({
      listId: String(formData.get("listId") ?? ""),
      officerId: gate.userId,
      reason: String(formData.get("reason") ?? ""),
    });
    if (!res.ok) return { ok: false as const, error: res.error };
    revalidatePath("/admin/contacts");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Revoking the basis failed — it may or may not have been revoked. Reload the page to check before trying again.") };
  }
}
