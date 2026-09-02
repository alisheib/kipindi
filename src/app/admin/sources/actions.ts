"use server";

import { safeError } from "@/lib/server/safe-error";
import { fieldError, type ActionFailure } from "@/lib/server/field-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  addSource,
  removeSource,
  setSourceEnabled,
  setCategoryEnabled,
  normalizeDomain,
} from "@/lib/server/source-registry";
import type { MarketCategory } from "@/lib/server/market-service";
import { probeDomainReachable, reachabilityRefusal } from "@/lib/server/source-reachability";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function ensureAdmin() {
  return requireStaff("trading");
}

/**
 * ⭐ DG-S-05 — the return TYPE has to admit the address or the client cannot read it.
 *
 * `addSourceAction` returns a union, and TypeScript narrows `!r.ok` to that union's failure
 * members. Without this annotation one member would be the bare `{ ok: false; error: string }`
 * of the catch and the other the `ActionFailure` from `fieldError`, and reading `r.field` off a
 * union where one arm lacks the property is a tsc error at the CALL SITE — the client would see
 * the refusal and still have nowhere to send anyone. Naming one failure shape for the whole
 * action makes `field` legible on every branch (it stays OPTIONAL, so the catch below is
 * unchanged and still type-checks).
 *
 * ⛔ NOT exported — a `"use server"` module may only export async functions.
 */
/**
 * ⛔ WIDENED HERE, NOT ON `ActionFailure`. `needsAck` is the one refusal an operator is meant
 * to be able to overrule, and it exists for exactly one form. Putting it on the shared type
 * would offer "you may proceed anyway" to all 34 admin actions that return `ActionFailure`,
 * several of which move money — a concept is much harder to take back off a shared surface
 * than to add to one. (E-254)
 */
type AddSourceResult = { ok: true } | (ActionFailure & { needsAck?: boolean });

export async function addSourceAction(formData: FormData): Promise<AddSourceResult> {
  const session = await ensureAdmin();
  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "other") as MarketCategory;
  const rationale = String(formData.get("rationale") ?? "").trim().slice(0, 500);
  if (!domain || !label || !rationale) {
    /* ⭐ DG-S-05 — ONE sentence, THREE controls. The copy is unchanged (it is accurate: all
       three are required), but "Domain, label and rationale are required." is not an address —
       it names a set, and `focusFirstInvalid` needs exactly one place to put the cursor.
       ⛔ SO DON'T PICK A FIXED FIELD. Sending every one of these refusals to `"domain"` would
       be a lie two thirds of the time: an operator who filled the domain and left the rationale
       blank would be dropped into a box that is already correct — the defect §K rule 7d calls
       "it tells you the form is wrong *there*, and it is not". The values are already parsed
       individually above, so the branch is re-read here in FORM ORDER (domain → label →
       rationale, matching the DOM order in `source-controls.tsx`; the category `<select>` never
       reaches this branch because it defaults) and the FIRST empty one wins. That is the field
       an operator filling the form top-down would reach first, so it is where they stopped.
       ⚠️ `!domain` is not only "the box was empty": `normalizeDomain` strips scheme, path and a
       leading `www.`, so a typed value like `https://` or `www.` collapses to `""` here. Either
       way the domain box is the control that has to change, which is what the address means. */
    const firstEmpty = !domain ? "domain" : !label ? "label" : "rationale";
    return fieldError(firstEmpty, "Domain, label and rationale are required.");
  }
  /**
   * E-254 · CAN THE AI ACTUALLY READ THIS SITE? Asked HERE, at the operator's decision
   * point, rather than at resolve time weeks later on somebody else's market.
   *
   * ⛔ THE PROBE REFUSES ONCE AND THEN GETS OUT OF THE WAY. `bbc.com` and `reuters.com`
   * block Anthropic's crawler and are exactly what an operator would add for a news market;
   * deleting them from the platform to fix a silence would be the worse trade. So the first
   * attempt is refused with the consequence spelled out, and a second attempt carrying
   * `acknowledgeUnreachable` proceeds and is recorded as a DECISION in the audit chain.
   *
   * ⛔ AND IT FAILS OPEN. `unknown` — no API key, a blip, a rate limit — PROCEEDS. A source
   * registry that quietly stops accepting sources whenever Anthropic is unwell is a worse
   * defect than the one this closes, and it would present to an operator as a dead button.
   */
  /* ⛔ PROBED EVEN WHEN ACKNOWLEDGED, and this is not a wasted call. Skipping the probe on
     the second attempt would mean writing `aiReachable: "blocked"` into an append-only chain
     on the strength of a FORM FIELD the client chose — and a client that always sets the flag
     (or a forged post) would file "blocked" against a perfectly reachable host. The
     acknowledgement decides whether we REFUSE; it is never evidence of what was measured. */
  const acknowledged = String(formData.get("acknowledgeUnreachable") ?? "") === "true";
  const reach = await probeDomainReachable(domain);
  if (!acknowledged && reach.state === "blocked") {
    return { ...fieldError("domain", reachabilityRefusal(domain)), needsAck: true };
  }

  try {
    await addSource(
      { domain, label, category, rationale, addedBy: session.userId },
      { aiReachable: reach.state, acknowledgedUnreachable: acknowledged },
    );
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Add source failed") };
  }
}

/* DG-S-05 — STAYS PLAIN, deliberately. There is no field-shaped refusal here: `id` is an
   internal row id and `enabled` is derived from WHICH TOGGLE was pressed, so neither is a
   control an operator typed into and neither renders as a `[data-field]` to focus. The only
   failure left is the catch, which is a server fault. Rules 2 and 3. */
export async function toggleSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  try {
    await setSourceEnabled(id, enabled, session.userId);
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Toggle failed") };
  }
}

/* DG-S-05 — STAYS PLAIN. Same reasoning as the toggle above: `id` is an internal row id from
   the row's Remove button, not a typed control, and the sole refusal is the catch. */
export async function removeSourceAction(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await removeSource(id, session.userId);
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Remove failed") };
  }
}

/* ⛔ DG-S-05 rule 3 — STAYS PLAIN, AND THIS IS THE CASE THE RULE EXISTS FOR. `category` here
   does NOT come from the `<select name="category">` in the add form; it comes from which
   CATEGORY PILL was clicked (`ToggleCategory` renders a `<button>` per category and puts the
   name in the FormData itself). There is no control on screen holding that value, so naming
   `"category"` as an address would send `focusFirstInvalid` hunting for a `[data-field]` that
   this view does not render — and on the add form, where that name DOES render, it would drop
   the cursor in an unrelated form's select. Nothing to focus, so no address. */
export async function toggleCategoryAction(formData: FormData) {
  const session = await ensureAdmin();
  const category = String(formData.get("category") ?? "") as MarketCategory;
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  try {
    await setCategoryEnabled(category, enabled, session.userId);
    revalidatePath("/admin/sources");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Toggle category failed") };
  }
}
