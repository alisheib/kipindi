import { db } from "@/lib/server/store";
import type { MessagingKey, StoredMarketingContact, StoredUser } from "@/lib/server/store";
import { marketingKeyOf } from "@/lib/server/marketing/erase";
// U33a-P · the export answers from the SWITCH and the record, never from its own reading of either.
import { marketingToggleState } from "@/lib/server/marketing/consent";
import { licenceOutreach } from "@/lib/server/marketing/outreach-record";

/**
 * U18b · THE MARKETING ARM OF A DATA EXPORT — what the platform holds about a person's marketing, for
 * both access doors: the player's own download (`exportUserData`) and the officer's DSAR bundle
 * (`buildDsarBundle`). ONE function, so the two doors cannot disagree about what "everything" is.
 *
 * 🔴 BEFORE THIS, NEITHER DOOR HAD A MARKETING SECTION. The consent ledger, the stop list and the contact
 * book all hold the person's number, and a right-of-access file that leaves out the record of what they
 * agreed to — and whether they are being marketed at all — is not the whole answer (PDPA 2022 / GDPR Art. 15).
 *
 * ⛔ ONLY WHAT IS THIS PERSON'S, AND A NUMBER IS NOT A PERSON (the S10 review). Tanzanian numbers are
 * recycled, so a record keyed by the number may be a PREVIOUS holder's. Ledger rows count only from the
 * day this account was created; a book row counts when it is LINKED to the account, or found by the
 * account's number, unlinked, and created after the account; a linked row's OTHER number counts only
 * while no other live account holds it (the holder check `erase.ts` makes). Without the bound a new
 * owner's own download handed them the last holder's consent history — and the fact that they had asked
 * a betting site to erase them.
 * ⭐ A STOP THAT REFUSES THIS PERSON NOW IS SHOWN WHATEVER ITS AGE — a re-armed suppression keeps its
 * first `createdAt` (both twins), so a date bound alone would hide a stop that is refusing them today.
 * One that began before the account is listed with `createdAt: null` ("before this account"), so the
 * previous holder's date is not disclosed.
 * ⚖️ WHEN IN DOUBT, DO NOT DISCLOSE — the opposite side of the doubt erasure takes (`erase.ts`).
 * ⛔ AN ALLOWLIST, NEVER THE RAW ROW. Left out on purpose: `recordedBy` (a member of STAFF — another
 * person's data), `evidence` (internal references), every row id, and the book's `notes` — staff free
 * text that can name third parties. ⚠️ Both doors share this allowlist, so NEITHER carries notes: an
 * officer who is asked for them reads the row on the console, redacts, and releases by hand.
 * A new column reaches the export only by being added here.
 * ⭐ STAGED IMPORT ROWS (U29b) — a row of an officer's contacts file, staged for import, that holds one of the person's
 * numbers is something we hold about them too: listed with the number, name, e-mail, tags and outcome it carries, and only
 * rows staged on or after the account's creation (the same bound). ⛔ Its notes, the file's name, the officer, the run and
 * the row's keys are withheld, as for the book.
 * ⛔ An erased account's `phoneE164` is a tombstone (`erased:usr_…`), never a key: `marketingKeyOf`
 * refuses it, so its digits cannot be read as some stranger's number.
 */
export type MarketingDsarSection = {
  contacts: Array<Pick<StoredMarketingContact,
    "msisdn" | "displayName" | "email" | "operator" | "source" | "consentState" | "suppressedAt" | "tags" | "createdAt" | "updatedAt">>;
  consent: Array<{ status: string; source: string; wording: string; locale: string; createdAt: string }>;
  /** `createdAt: null` — the stop began before this account existed (still listed while it refuses them). */
  suppression: Array<{ reason: string; createdAt: string | null; liftedAt: string | null }>;
  /** U29b · staged import rows holding the person's numbers, staged since the account's creation. */
  staged: Array<{ msisdn: string; displayName: string | null; email: string | null; tags: string[]; outcome: string | null; stagedAt: string }>;
  /** ⭐ U33a-P · non-null ONLY when offers reach this person on the LICENCE basis rather than on a consent they gave.
   *  ⛔ A person asking what we hold about them is entitled to be told that we message them WITHOUT their consent, and
   *  under what. A consenting person gets `null` — their basis is the consent rows already listed above — and so does
   *  anyone the switch does not reach. `since` is the instant the record was opened, which is when it became true. */
  outreach: { basis: "LICENCE_PLAYER"; since: string } | null;
};

export async function marketingDsarView(user: Pick<StoredUser, "id" | "phoneE164" | "createdAt">): Promise<MarketingDsarSection> {
  const accountNumber = marketingKeyOf(user.phoneE164);
  const since = user.createdAt;

  const rows = new Map<string, StoredMarketingContact>();
  for (const c of await Promise.resolve(db.marketingContact.listByUserId(user.id))) rows.set(c.id, c);
  if (accountNumber) {
    const byNumber = await Promise.resolve(db.marketingContact.findByMsisdn(accountNumber));
    if (byNumber && byNumber.userId === null && byNumber.createdAt >= since) rows.set(byNumber.id, byNumber);
  }
  const numbers = new Set<string>();
  if (accountNumber) numbers.add(accountNumber);
  for (const c of rows.values()) {
    if (c.msisdn === accountNumber) continue;
    // ⛔ A number another live account holds now is that account's record, not this person's.
    const holder = await Promise.resolve(db.user.findByPhone(`+${c.msisdn}`));
    if (!holder || holder.id === user.id) numbers.add(c.msisdn);
  }

  const consent: MarketingDsarSection["consent"] = [];
  const suppression: MarketingDsarSection["suppression"] = [];
  for (const identifier of numbers) {
    const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };
    for (const r of await Promise.resolve(db.messagingConsent.listFor(key))) {
      if (r.createdAt < since) continue;
      consent.push({ status: r.status, source: r.source, wording: r.wording, locale: r.locale, createdAt: r.createdAt });
    }
    for (const s of await Promise.resolve(db.suppression.listFor(identifier))) {
      if (s.channel !== "SMS" || s.category !== "MARKETING") continue;
      const active = !s.liftedAt;
      if (s.createdAt < since && !active) continue;
      suppression.push({ reason: s.reason, createdAt: s.createdAt < since ? null : s.createdAt, liftedAt: s.liftedAt ?? null });
    }
  }

  /* ⭐ U33a-P · READ FROM THE SWITCH, never recomputed here. The screen and this export answer the same question —
     "do offers reach you without your consent?" — and two readings of one fact is how they come to disagree. */
  const toggle = await marketingToggleState(user as Parameters<typeof marketingToggleState>[0]).catch(() => null);
  const record = toggle?.outreach === true ? await Promise.resolve(licenceOutreach()) : null;
  const outreach: MarketingDsarSection["outreach"] =
    record !== null && record.state === "open" ? { basis: "LICENCE_PLAYER", since: record.recordedAt } : null;

  // U29b · the staged import rows holding the person's numbers, from the account's creation — through the same allowlist.
  const staged: MarketingDsarSection["staged"] = [];
  for (const identifier of numbers) {
    for (const row of await Promise.resolve(db.contactImportRow.listByMsisdn(identifier))) {
      if (row.stagedAt < since) continue;
      staged.push({
        msisdn: row.msisdn ?? identifier, displayName: row.displayName, email: row.email, tags: [...row.tags],
        outcome: row.outcome, stagedAt: row.stagedAt,
      });
    }
  }

  return {
    contacts: Array.from(rows.values()).map((c) => ({
      msisdn: c.msisdn, displayName: c.displayName, email: c.email, operator: c.operator, source: c.source,
      consentState: c.consentState, suppressedAt: c.suppressedAt, tags: c.tags,
      createdAt: c.createdAt, updatedAt: c.updatedAt,
    })),
    consent,
    suppression,
    staged,
    outreach,
  };
}
