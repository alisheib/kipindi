"use server";

import { safeError } from "@/lib/server/safe-error";
import { fieldError, type ActionFailure } from "@/lib/server/field-error";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { verifyChainFull } from "@/lib/server/audit";
import { audit } from "@/lib/server/audit";
import { revalidatePath } from "next/cache";
import { setSupportConfigVerified } from "@/lib/server/support-config";
// ⭐ The dial-target derivation lives beside the defaults, in the client-safe half, so the admin
// FORM can preview exactly what this action will store rather than the operator finding out from
// a dead tel: link on the public site.
import { toDialTarget, toHelplineDial, licenceProblem } from "@/lib/support-config";
// `PlatformConfig` is imported for the RETURN TYPES below only (DG-S-05 rule 4): naming the
// failure side `ActionFailure` means naming the success side too, and the success side of the
// two platform writers is whatever `setPlatformConfig` hands back — spelled out here rather
// than left to inference so the client can read `r.field` without an `in` guard.
import { setPlatformConfig, type PlatformConfig } from "@/lib/server/platform-config";
import { requireStaff } from "@/lib/server/rbac-guard";
// U33w · the Marketing wordings card: the verified setter, the form's one reading, and the ONE spelling of each box's address.
import { saveMarketingWordings, WORDINGS_REFUSAL_SENTENCE } from "@/lib/server/marketing/wordings";
import { WORDING_KEYS, patchFromForm, wordingFieldName, type WordingKey } from "@/lib/marketing/marketing-wordings";
// U33a-R · the Licence outreach card: the two writers — the only door the record is opened or closed through.
import { closeLicenceOutreach, openLicenceOutreach } from "@/lib/server/marketing/outreach-record";
import { OUTREACH_CHECK_SENTENCE } from "@/lib/marketing/outreach-open-checks";
// U33p · the Public policy lines card: the verified setter, and the ONE spelling of each language box's address.
import { savePolicyLines, POLICY_LINES_REFUSAL_SENTENCE } from "@/lib/server/legal/policy-lines";
import { POLICY_LINE_KEYS, POLICY_LOCALES, policyLineFieldName, type PolicyLineKey, type PolicyLocale } from "@/lib/legal/policy-lines";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function requireAdmin() {
  return requireStaff("ops");
}

export async function verifyChainAction() {
  const session = await requireAdmin();
  try {
    // DB-authoritative full walk (audit C6) — validates the entire persisted
    // chain, not just this instance's in-memory ring, so it stays correct when
    // the platform runs on more than one container.
    const result = await verifyChainFull();
    audit({
      category: "ADMIN",
      action: "audit.chain.verified",
      actorId: session.userId,
      targetType: null,
      targetId: null,
      // ⛔ THE RECORD OF A VERIFICATION CARRIES WHAT IT ACTUALLY FOUND (AR-3, 2026-09-21). It used to
      // store `{valid:true, total}` and nothing else on the happy path — so a chain carrying rows
      // that could not be re-verified left behind a row saying only "valid", and the next officer
      // reading the history of verifications could not tell a fully-attested pass from a partial one.
      payload: result.valid
        ? {
            valid: true, total: result.total,
            verified: result.verified ?? null,
            baselined: result.baselined ?? 0,
            baselineEntryId: result.baseline?.entryId ?? null,
          }
        : {
            valid: false, firstBreakAt: result.firstBreakAt, index: result.index, total: result.total,
            linkBroken: result.linkBroken ?? false,
            unattested: result.unattested ?? 0,
            baselineMismatch: result.baselineMismatch ?? false,
          },
    });
    return result;
  } catch (err) {
    return { valid: false as const, firstBreakAt: null, index: -1, total: 0, error: safeError(err, "Verification failed") };
  }
}

export async function updateSupportConfigAction(
  formData: FormData,
): Promise<{ ok: true } | ActionFailure> {
  const session = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  /* ⭐ DG-S-05 — the refusal NAMES the control the operator has to fix. The sentence is
     untouched; the only new thing is the address. `"support-email"` is the `data-field` on the
     <Field> wrapper in `system-client.tsx`, and the two strings must match — a typo degrades to
     today's behaviour (a toast, no focus), never to a jump at the wrong box.
     ⚠️ ~~ONLY this one of the two inputs is addressed: `phone` is optional here and has no
     refusal of its own, so there is nothing to point at for it.~~ **No longer true as of
     2026-09-10** — `phone` now has two refusals of its own (blank, and undialable), both
     addressed to `"support-phone"`. This note is corrected rather than deleted because it is
     the concession that pointed at the defect in the first place. */
  if (!email) return fieldError("support-email", "Email is required.");
  /* 🔴 `phone` NOW HAS A REFUSAL OF ITS OWN, AND THE COMMENT BELOW USED TO CONCEDE IT DID NOT.
     Before 2026-09-10 this action validated the email and nothing else: clearing the phone saved
     `""`, so `/help` rendered an empty <p> inside a live `<a href="tel:">`, and the refusal a
     permanently self-excluded player receives read "Support: " with nothing after it. Free text
     produced dial targets like `tel:+255222115811ext204`. ⭐ `toDialTarget` decides dialability —
     the same function the form previews — so the console cannot save a number it could not call. */
  if (!phone) return fieldError("support-phone", "Phone is required — it is published on /help and in the self-exclusion refusal.");
  const phoneTel = toDialTarget(phone);
  if (!phoneTel) {
    /* ⚠️ THE EXAMPLES ARE SPECIMENS, NOT THE REAL DESK NUMBER. Naming the live number here would
       plant a fourth copy of a value that has exactly one home, and it would go stale the day the
       owner changes it — `test:support-contact` §8 caught this line doing precisely that. */
    return fieldError("support-phone", `"${phone}" is not a dialable number. Use the local form 0712 345 678, or the international form +255 712 345 678.`);
  }
  /* ⭐ THE HELPLINE AND THE LICENCE ARE EDITABLE (owner's rule, 2026-10-03: "everything should be
     changeable"). Until then this form read neither — they were pinned constants — and an admin read the
     greyed boxes as a broken console. ⚠️ Each is read only when the form POSTS it, so a page still open
     from the previous deploy (which has no such inputs) saves its email and phone without blanking them.
     🔴 E-328 survives as a refusal, not a lock: the form field is `nationalHelpline`, never `helpline` —
     the stale `helpline` key in the live row holds our own desk number — and a helpline that dials the
     Support phone is refused below. */
  const patch: { email: string; phone: string; phoneTel: string; nationalHelpline?: string; licenceNumber?: string } = { email, phone, phoneTel };
  if (formData.has("nationalHelpline")) {
    const nationalHelpline = String(formData.get("nationalHelpline") ?? "").trim();
    if (!nationalHelpline) return fieldError("support-helpline", "The national helpline is required — it is printed on every page as \"Helpline\".");
    if (!toHelplineDial(nationalHelpline)) {
      return fieldError("support-helpline", `"${nationalHelpline}" is not a dialable number. Use digits only, e.g. 0800 11 0011.`);
    }
    if (toDialTarget(nationalHelpline) && toDialTarget(nationalHelpline) === phoneTel) {
      return fieldError("support-helpline", "This is 50pick's own Support phone. The helpline must be the independent national problem-gambling line a player is sent to for help.");
    }
    patch.nationalHelpline = nationalHelpline;
  }
  if (formData.has("licenceNumber")) {
    const licenceNumber = String(formData.get("licenceNumber") ?? "").trim();
    const problem = licenceProblem(licenceNumber);
    if (problem) return fieldError("support-licence", problem);
    patch.licenceNumber = licenceNumber;
  }
  try {
    /* Persistence AND the ADMIN audit row are the factory's now — `defineConfig` merges,
       validates, caches, saves and audits in one place, and REFUSES to write from a process
       that never hydrated rather than overwriting the operator's row with code defaults. */
    /* ⛔ THE *VERIFIED* SETTER. The plain one returns the moment the write is DISPATCHED, and
       `saveConfig` never throws — so a pool timeout or a read-only replica produced a green
       toast, a mutated cache the page re-rendered from, and an audit row for a change that
       was not on disk. It reverted at the next restart, and the officer's only evidence said
       it had worked. This one persists, reads the row back, and only then caches, audits and
       reports success. */
    const res = await setSupportConfigVerified(patch, session.userId);
    if (!res.ok) return { ok: false as const, error: res.error };
    revalidatePath("/admin/system");
    /* The helpline and licence print on every public page, so drop any cached render of any of them. */
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Config update failed") };
  }
}

export async function updatePlatformTimezoneAction(
  formData: FormData,
): Promise<{ ok: true; config: PlatformConfig } | ActionFailure> {
  const s = await requireAdmin();
  const tz = String(formData.get("timezone") ?? "").trim();
  /* ⭐ DG-S-05 — same sentence, now with an address. `"timezone"` is the `data-field` on the
     wrapper around the <Select> in `system-client.tsx`; the Select's trigger is a
     `role="combobox"` <button>, which `focusFirstInvalid` reaches because it focuses ANY
     focusable control inside the wrapper, not just an <input>. */
  if (!tz) return fieldError("timezone", "Timezone is required.");
  try {
    /* ⚠️ THE OTHER TIMEZONE REFUSAL IS RELAYED, NOT ADDRESSED. `setPlatformConfig` answers an
       unparseable zone with `Invalid timezone: "…"`, which is field-shaped and would deserve
       `"timezone"` — but it is raised inside a SHARED writer (`platform-config.ts`) that other
       callers relay too, and re-wrapping it here would mean adding a branch to a money-adjacent
       config path for a case this form cannot reach: the <Select> only ever submits one of 22
       fixed IANA values. Left exactly as it returns; noted so it is a decision, not an
       oversight. */
    const r = await setPlatformConfig({ timezone: tz }, s.userId);
    revalidatePath("/admin/system");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Timezone update failed") };
  }
}

/** §9.3 #5 — site-wide broadcast banner shown to every player. Audited. */
export async function setAnnouncementAction(
  formData: FormData,
): Promise<{ ok: true; config: PlatformConfig } | ActionFailure> {
  const s = await requireAdmin();
  const active = String(formData.get("active") ?? "") === "true";
  const message = String(formData.get("message") ?? "").trim().slice(0, 280);
  const toneRaw = String(formData.get("tone") ?? "info");
  const tone = (["info", "warning", "success"].includes(toneRaw) ? toneRaw : "info") as "info" | "warning" | "success";
  /* ⭐ DG-S-05 — the condition has TWO halves and only ONE of them is a place to send anyone.
     `active` is a TOGGLE the operator has just deliberately switched on; the missing item is the
     text. So the address is `"announcement-message"` — ⛔ never `"active"`, which would take the
     cursor to the switch and tell them the thing they meant is the thing that is wrong.
     (`tone` is never refused: an unrecognised value falls back to "info" above.) */
  if (active && !message) return fieldError("announcement-message", "Add a message before publishing the banner.");
  try {
    const announcement = active || message ? { active, message, tone } : null;
    const r = await setPlatformConfig({ announcement }, s.userId);
    revalidatePath("/admin/system");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Announcement update failed") };
  }
}

/** §9.3 #1 — global maintenance switch: pause NEW bets + deposits platform-wide
 *  (withdrawals + cash-outs stay open). Audited via setPlatformConfig. */
export async function setMaintenanceModeAction(formData: FormData) {
  const s = await requireAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;
  try {
    const r = await setPlatformConfig({ maintenanceMode: enabled, maintenanceNote: note }, s.userId);
    revalidatePath("/admin/system");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Maintenance update failed") };
  }
}

/** What the Marketing wordings card's save answers: how many wordings got a new version — or a refusal that names the
 *  first box to fix (`field`) and carries every problem of every wording, each the sentence shown under its own box. */
export type MarketingWordingsActionResult =
  | { ok: true; changed: number }
  | (ActionFailure & { problems?: { [K in WordingKey]?: string[] } });

/**
 * U33w · SAVE THE MARKETING WORDINGS — the "Marketing wordings" card's ONE action (spec §5.1 · §6; OD57 · OD58 · S14).
 *
 * ⛔ `requireAdmin` FIRST, then the VERIFIED setter, `saveMarketingWordings`: it reads the request as hostile (text per
 * wording with the version count it was edited from and, for a suggestion, its approval — a posted history, a version or
 * an unknown field is not understood), runs every rule, refuses a suggestion nobody approved and a page that is out of
 * date, appends a version only where the words changed, checks the whole record is a clean append, persists, reads the
 * row back, and only then caches and writes the `config.marketing_wordings_updated` audit row. Every refusal writes
 * nothing.
 * ⭐ The author and the time are the server's: the session's officer, and its clock — nothing in the request names them.
 * ⭐ DG-S-05 · a refusal about words names the first box to fix (`wordingFieldName`, the ONE spelling the card renders
 * too) and carries every problem of every wording, so the card shows each one under its own box at once.
 * ⭐ Three pages read these words, and each is revalidated: this one; the composer (the source line, once U37s stamps
 * it into drafts); and the contacts page (a list's basis and its 18+ confirmation, U33b-L).
 */
export async function saveMarketingWordingsAction(formData: FormData): Promise<MarketingWordingsActionResult> {
  const session = await requireAdmin();
  /* ⛔ EACH NAME ONCE (`patchFromForm`, tested by `test:marketing-wordings` W14). A name posted twice is a request no card
     sends, and reading either value would be a guess. Every other check — which names, what values — is the setter's, so
     this action cannot drift from it. React's own `$ACTION_…` fields (a form posted without JavaScript) are not the
     card's, and are left out; a file is passed on, for the setter to refuse. */
  const form = patchFromForm(formData.entries());
  if (!form.ok) return { ok: false as const, error: WORDINGS_REFUSAL_SENTENCE.not_understood };
  try {
    const res = await saveMarketingWordings(form.patch, session.userId);
    if (!res.ok) {
      const problems: { [K in WordingKey]?: string[] } = {};
      for (const key of WORDING_KEYS) {
        const found = res.problems[key];
        if (found && found.length > 0) problems[key] = found.map((p) => p.sentence);
      }
      const first = WORDING_KEYS.find((key) => problems[key] !== undefined);
      return first !== undefined
        ? { ...fieldError(wordingFieldName(first), res.error), problems }
        : { ok: false as const, error: res.error };
    }
    revalidatePath("/admin/system");
    revalidatePath("/admin/campaigns/new");
    revalidatePath("/admin/contacts");
    return { ok: true as const, changed: res.changed.length };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Saving the wordings failed — nothing may have changed. Reload the page to check before trying again.") };
  }
}

/** What the Public policy lines card's save answers: how many lines got a version, how many of them moved the printed words
 *  (only those move a page's version), and the version each page prints now — or a refusal that names the first box to fix
 *  (`field`) and carries every problem of every line, by language. */
export type PolicyLinesActionResult =
  | { ok: true; changed: number; moved: number; versions: { rg: string; privacy: string } }
  | (ActionFailure & { problems?: { [K in PolicyLineKey]?: Partial<Record<PolicyLocale, string[]>> } });

/**
 * U33p · SAVE THE PUBLIC POLICY LINES — the "Public policy lines" card's ONE action (spec §5.2 · §6 U33p; OD58 · S15).
 *
 * ⛔ `requireAdmin` FIRST, then the VERIFIED setter, `savePolicyLines`: it reads the request as hostile (three texts per line
 * with the revision it was edited from, and the review tick — a saved-line object, a version or an unknown field is not
 * understood), runs every rule (a promise the code does not keep is refused by name; the gateway's facts and the Consent
 * bullet's words must stay), refuses a page that is out of date, appends a version only when a line changes — new words,
 * or a review marker with the line's tick — stamps a page's version only for NEW WORDS (a review moves nothing), checks
 * the history is a clean append, persists, reads the row back, and only then caches and writes the
 * `config.policy_lines_updated` audit row. Every refusal writes nothing.
 * ⭐ The author and the time are the server's: the session's officer, and its clock — nothing in the request names them.
 * ⭐ DG-S-05 · a refusal about words names the first box to fix (`policyLineFieldName`, the ONE spelling the card renders
 * too) and carries every problem of every line, so the card shows each one under its own box at once.
 * ⭐ The two legal pages print these lines, so both are revalidated; so is the profile's notifications page, where U33a-P
 * prints the outreach note once licence outreach exists (nothing prints it yet).
 */
export async function savePolicyLinesAction(formData: FormData): Promise<PolicyLinesActionResult> {
  const session = await requireAdmin();
  /* ⛔ EACH NAME ONCE (`patchFromForm`, the wordings card's reading). A name posted twice is a request no card sends, and
     reading either value would be a guess. Every other check — which names, what values — is the setter's. */
  const form = patchFromForm(formData.entries());
  if (!form.ok) return { ok: false as const, error: POLICY_LINES_REFUSAL_SENTENCE.not_understood };
  try {
    const res = await savePolicyLines(form.patch, session.userId);
    if (!res.ok) {
      const problems: { [K in PolicyLineKey]?: Partial<Record<PolicyLocale, string[]>> } = {};
      let first: string | null = null;
      for (const key of POLICY_LINE_KEYS) {
        const found = res.problems[key];
        if (!found) continue;
        const byLocale: Partial<Record<PolicyLocale, string[]>> = {};
        for (const l of POLICY_LOCALES) {
          if (found[l].length === 0) continue;
          byLocale[l] = found[l].map((p) => p.sentence);
          if (first === null) first = policyLineFieldName(key, l);
        }
        problems[key] = byLocale;
      }
      return first !== null
        ? { ...fieldError(first, res.error), problems }
        : { ok: false as const, error: res.error };
    }
    revalidatePath("/admin/system");
    revalidatePath("/legal/responsible-gambling");
    revalidatePath("/legal/privacy");
    revalidatePath("/profile/notifications");
    return {
      ok: true as const,
      changed: res.changed.length,
      moved: res.moved.length,
      versions: { rg: res.versions.rg, privacy: res.versions.privacy },
    };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Saving the policy lines failed — nothing may have changed. Reload the page to check before trying again.") };
  }
}

/* ══ U33a-R · LICENCE OUTREACH ══════════════════════════════════════════════════════════════════════════════════════ */

/** What the card is handed back. A refusal carries the reason it can show; nothing was written either way. */
export type LicenceOutreachActionResult = { ok: true } | { ok: false; error: string };

/**
 * ⛔ `requireAdmin` FIRST, then the VERIFIED writer, `openLicenceOutreach`: it re-runs all four checks over the policy
 * record AS IT IS NOW (never over what the card last rendered), refuses while any fails — naming each — refuses while
 * the record is not readable at all, writes the row whole, reads it back, and only then records the COMPLIANCE row with
 * the checks as they passed. Every refusal writes nothing and makes no audit row.
 * ⭐ The author and the instant are the server's: the session's officer, and its clock.
 * ⭐ The failing checks are appended to the refusal, so the officer who pressed it is told what to fix without hunting
 * — the card lists them too, but a toast is what a refused press puts in front of them.
 */
export async function openLicenceOutreachAction(): Promise<LicenceOutreachActionResult> {
  const session = await requireAdmin();
  try {
    const res = await openLicenceOutreach(session.userId);
    if (!res.ok) {
      const named = res.failing.map((c) => OUTREACH_CHECK_SENTENCE[c]).join(" ");
      return { ok: false as const, error: named === "" ? res.error : `${res.error} ${named}` };
    }
    revalidatePath("/admin/system");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Opening licence outreach failed — nothing may have changed. Reload the page to check before trying again.") };
  }
}

/**
 * ⛔ The other writer. ⭐ A CLOSE IS NEVER REFUSED FOR A FAILING CHECK — outreach must be able to stop at once; the
 * checks guard the start of it, never the stop (the reason is in `outreach-record.ts`).
 */
export async function closeLicenceOutreachAction(): Promise<LicenceOutreachActionResult> {
  const session = await requireAdmin();
  try {
    const res = await closeLicenceOutreach(session.userId);
    if (!res.ok) return { ok: false as const, error: res.error };
    revalidatePath("/admin/system");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Closing licence outreach failed — nothing may have changed. Reload the page to check before trying again.") };
  }
}
