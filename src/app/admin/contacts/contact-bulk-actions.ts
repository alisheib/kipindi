"use server";

/**
 * U23 · /admin/contacts — the bulk bar's two actions: COUNT a selection (the preview its confirmation is built from) and
 * RUN an action on it (decision C24).                                                          (S10, 2026-10-02)
 *
 * ⛔ THE GATE IS EACH ACTION'S FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is on, so
 * no layout or path rule can see it). `softRequireStaff("growth", …)` decides on the viewer's STORED role, audits a
 * refusal as `privilege_escalation_blocked`, takes step-up 2FA, and answers in words — before the rate rule, the parser,
 * the service or the store is touched.
 * ⭐ THEN THE FORM'S RATE RULES, PER OFFICER (`rate-limit.ts`): a preview spends `contacts.lookup` — it answers "how many of
 * these are in the book?" — and a run spends `contacts.write`.
 * ⛔ NOTHING IS READ FROM THE BODY BUT THROUGH `parseBulkRequest`, which builds a NEW request from named keys: a posted
 * count, tier or officer never reaches a decision. The service recounts and decides (OD27/OD28).
 * 🔴 D19 / A1.1 / OD54 · the viewer's read cell goes to the service, which refuses a masked viewer's consent, source,
 * player or suppressed audience before any count; `contactBulkReply` keeps a withdrawal's and a suppression's split from
 * a viewer who may not read a number.
 * ⛔ A REFUSAL IS NOT A REVALIDATION: only a run that landed invalidates the list.
 * ⭐ vb7 · each failure names the next step: a preview that failed changed nothing; a run that failed may have changed
 * some contacts, so the list is reloaded before it is run again.
 *
 * Guard: `test:contacts-bulk` (§9, this file's shape).
 */
import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { safeError } from "@/lib/server/safe-error";
import { contactBulkReply, parseBulkRequest, previewContactBulk, runContactBulk } from "@/lib/server/marketing/contact-bulk";
import type { BulkOutcome, BulkPreview, BulkRefusal } from "@/lib/contacts/bulk-rules";
import { viewerReadsContacts } from "./contacts-loader";
import { CONTACT_ROLE_REFUSAL, CONTACT_RATE_LIMITED, CONTACTS_BULK } from "./contacts-copy";

/** How many contacts the selection holds NOW, the tier its confirmation takes, and — up to fifty ticked — who they are. */
export async function previewContactBulkAction(input: unknown): Promise<BulkPreview | BulkRefusal> {
  const g = await softRequireStaff("growth", "contacts.bulk.preview", CONTACT_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "forbidden", error: g.error };
  const rate = await rateCheckAsync(g.userId, "contacts.lookup");
  if (!rate.allowed) return { ok: false, reason: "rate_limited", error: CONTACT_RATE_LIMITED(rate.retryAfterSec) };
  try {
    const parsed = parseBulkRequest(input);
    if (!parsed.ok) return parsed;
    return await previewContactBulk(parsed.req, await viewerReadsContacts().catch(() => false));
  } catch (err) {
    return { ok: false, reason: "error", error: safeError(err, CONTACTS_BULK.previewFallback) };
  }
}

/** The action itself — recounted, confirmed against the recount, written, audited once. */
export async function runContactBulkAction(input: unknown): Promise<BulkOutcome | BulkRefusal> {
  const g = await softRequireStaff("growth", "contacts.bulk.run", CONTACT_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "forbidden", error: g.error };
  const rate = await rateCheckAsync(g.userId, "contacts.write");
  if (!rate.allowed) return { ok: false, reason: "rate_limited", error: CONTACT_RATE_LIMITED(rate.retryAfterSec) };
  let reads = false;
  let result: BulkOutcome | BulkRefusal;
  try {
    const parsed = parseBulkRequest(input);
    if (!parsed.ok) return parsed;
    reads = await viewerReadsContacts().catch(() => false);
    result = await runContactBulk(parsed.req, g.userId, reads);
  } catch (err) {
    return { ok: false, reason: "error", error: safeError(err, CONTACTS_BULK.runFallback) };
  }
  if (result.ok) {
    try { revalidatePath("/admin/contacts"); } catch { /* landed; a stale list is the smaller harm */ }
  }
  return contactBulkReply(result, reads);
}
