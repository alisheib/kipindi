"use server";

/**
 * U22 · /admin/contacts — the contact form's three actions: check a number, add a contact, edit one (decision C24).
 *
 * ⛔ THE GATE IS EACH ACTION'S FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is
 * on, so no layout or path rule can see it). `softRequireStaff("growth", …)` decides on the viewer's STORED role,
 * audits a refusal as `privilege_escalation_blocked`, takes step-up 2FA, and answers in words — before the rate
 * limiter, the service or the store is touched.
 * ⭐ THEN A RATE RULE PER OFFICER (`contacts.lookup`, `contacts.write` — `rate-limit.ts`): a role that may type any
 * number must not be able to walk the numbering plan through the lookup (D19's own remedy, with the audit row every
 * create writes).
 * ⛔ EVERY FIELD IS RE-TYPED, NAMED ONE BY ONE. The browser can post anything; a key that is not a field of the form
 * (a consent, a link, a source) is never read, and a field that is not a string becomes "". The service then builds
 * the row from named values again — never from what was posted.
 * 🔴 D19 / A1.1 · THE MIRRORED CONSENT TRAVELS ONLY TO A READER. `contactAddReply` drops it for a viewer whose
 * identity.contact cell is not `read`: until U33 a recorded consent can only be a player's, so a new contact reading
 * "Given" would tell a masked role that the number it typed belongs to a player.
 * ⛔ A REFUSAL IS NOT A REVALIDATION: only a change that landed invalidates the list.
 * ⭐ vb7 · THE LOOKUP NEVER NAVIGATES FOR THE 2-STEP SIGN-IN (`softCheckStaff`): it runs by itself when the ninth digit
 * lands, so a second factor that lapsed, or was never set up, is refused in words — marked `secondFactor`, so the dialog
 * holds its Save (the Save's step-up WOULD redirect) — and the dialog's typing is kept. ⚠️ A missing session still
 * redirects to the sign-in page, as every guard does: there is no officer to keep typing for. Add and edit, which the
 * officer presses, keep `softRequireStaff` and its step-up. Each refusal and failure names the next step.
 */
import { revalidatePath } from "next/cache";
import { softCheckStaff, softRequireStaff } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { safeError } from "@/lib/server/safe-error";
import { addContact, contactAddReply, editContact, lookupContactNumber } from "@/lib/server/contacts/contact-write";
import type {
  ContactAddReply, ContactAddRequest, ContactEditRequest, ContactEditResult, ContactNumberLookup,
} from "@/lib/server/contacts/contact-write";
import { viewerReadsContacts } from "./contacts-loader";
import {
  CONTACT_ROLE_REFUSAL, CONTACT_RATE_LIMITED, CONTACT_LOOKUP_RATE_LIMITED, CONTACT_LOOKUP_FALLBACK, CONTACT_ADD_FALLBACK,
  CONTACT_EDIT_FALLBACK,
} from "./contacts-copy";

/** A refusal the console renders as it is: the gate's sentence, the rate limiter's, or a failure's. `secondFactor` (vb7)
 *  marks the lookup's refusal for a 2-step sign-in that lapsed or was never set up — the dialog holds Save on it. */
type Refused = { ok: false; error: string; field?: string; secondFactor?: true };

/** A posted value as text — anything else is nothing. */
const text = (v: unknown): string => (typeof v === "string" ? v : "");
/** The posted body as a bag of unknowns — never trusted to be the shape the dialog meant to send. */
const bag = (v: unknown): Record<string, unknown> => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Is this number refused, already in the book, or free? The officer's early answer — the create still decides.
 * ⛔ vb7 · the gate is `softCheckStaff`: the same role check and SECURITY audit as `softRequireStaff`, and a second factor
 * that lapsed or was never set up REFUSED IN WORDS (`secondFactor: true`) — never the step-up redirect, which would
 * navigate away from the open dialog for a read the officer never pressed. ⚠️ No session at all still redirects to the
 * sign-in page. Its rate refusal and its failure are a number check's own words.
 */
export async function lookupContactNumberAction(number: unknown): Promise<{ ok: true; lookup: ContactNumberLookup } | Refused> {
  const g = await softCheckStaff("growth", "contacts.lookup", CONTACT_ROLE_REFUSAL);
  if (!g.ok) return g;
  const rate = await rateCheckAsync(g.userId, "contacts.lookup");
  if (!rate.allowed) return { ok: false, error: CONTACT_LOOKUP_RATE_LIMITED(rate.retryAfterSec) };
  try {
    return { ok: true, lookup: await lookupContactNumber(text(number)) };
  } catch (err) {
    return { ok: false, error: safeError(err, CONTACT_LOOKUP_FALLBACK) };
  }
}

/** One contact, added. Never a consent, never a link — and the unique index is the duplicate check. */
export async function addContactAction(request: unknown): Promise<ContactAddReply | Refused> {
  const g = await softRequireStaff("growth", "contacts.add", CONTACT_ROLE_REFUSAL);
  if (!g.ok) return g;
  const rate = await rateCheckAsync(g.userId, "contacts.write");
  if (!rate.allowed) return { ok: false, error: CONTACT_RATE_LIMITED(rate.retryAfterSec) };
  const body = bag(request);
  const draft: ContactAddRequest = {
    number: text(body.number),
    displayName: text(body.displayName),
    email: text(body.email),
    notes: text(body.notes),
    tags: text(body.tags),
  };
  let reply: ContactAddReply;
  try {
    const result = await addContact(draft, g.userId);
    reply = contactAddReply(result, await viewerReadsContacts().catch(() => false));
  } catch (err) {
    return { ok: false, error: safeError(err, CONTACT_ADD_FALLBACK) };
  }
  if (reply.ok) {
    try { revalidatePath("/admin/contacts"); } catch { /* saved; a stale list is the smaller harm */ }
  }
  return reply;
}

/** One contact's name, email, notes and tags, changed — only if nobody changed it since the dialog opened. */
export async function editContactAction(request: unknown): Promise<ContactEditResult | Refused> {
  const g = await softRequireStaff("growth", "contacts.edit", CONTACT_ROLE_REFUSAL);
  if (!g.ok) return g;
  const rate = await rateCheckAsync(g.userId, "contacts.write");
  if (!rate.allowed) return { ok: false, error: CONTACT_RATE_LIMITED(rate.retryAfterSec) };
  const body = bag(request);
  const edit: ContactEditRequest = {
    id: text(body.id),
    displayName: text(body.displayName),
    // null KEEPS the stored address — the dialog never holds it; "" removes it.
    email: typeof body.email === "string" ? body.email : null,
    notes: text(body.notes),
    tags: text(body.tags),
    expectedUpdatedAt: text(body.expectedUpdatedAt),
  };
  let result: ContactEditResult;
  try {
    result = await editContact(edit, g.userId);
  } catch (err) {
    return { ok: false, error: safeError(err, CONTACT_EDIT_FALLBACK) };
  }
  if (result.ok) {
    try { revalidatePath("/admin/contacts"); } catch { /* saved; a stale list is the smaller harm */ }
  }
  return result;
}
