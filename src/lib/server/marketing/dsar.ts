import { db } from "@/lib/server/store";
import type { MessagingKey, StoredMarketingContact, StoredUser } from "@/lib/server/store";
import { marketingKeyOf } from "@/lib/server/marketing/erase";

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
 * recycled, so a record keyed by the number may be a PREVIOUS holder's. Ledger and stop-list rows count
 * only from the day this account was created; a book row counts when it is LINKED to the account, or
 * found by the account's number, unlinked, and created after the account. Without that bound a new
 * owner's own download handed them the last holder's consent history — and the fact that they had asked
 * a betting site to erase them.
 * ⛔ AN ALLOWLIST, NEVER THE RAW ROW. Left out on purpose: `recordedBy` (a member of STAFF — another
 * person's data), `evidence` (internal references), every row id, and the book's `notes` — staff free
 * text that can name third parties; an officer reviews a note before it is released, the self-service
 * door cannot. A new column reaches the export only by being added here.
 * ⛔ An erased account's `phoneE164` is a tombstone (`erased:usr_…`), never a key: `marketingKeyOf`
 * refuses it, so its digits cannot be read as some stranger's number.
 */
export type MarketingDsarSection = {
  contacts: Array<Pick<StoredMarketingContact,
    "msisdn" | "displayName" | "email" | "operator" | "source" | "consentState" | "suppressedAt" | "tags" | "createdAt" | "updatedAt">>;
  consent: Array<{ status: string; source: string; wording: string; locale: string; createdAt: string }>;
  suppression: Array<{ reason: string; createdAt: string; liftedAt: string | null }>;
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
  for (const c of rows.values()) numbers.add(c.msisdn);

  const consent: MarketingDsarSection["consent"] = [];
  const suppression: MarketingDsarSection["suppression"] = [];
  for (const identifier of numbers) {
    const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };
    for (const r of await Promise.resolve(db.messagingConsent.listFor(key))) {
      if (r.createdAt < since) continue;
      consent.push({ status: r.status, source: r.source, wording: r.wording, locale: r.locale, createdAt: r.createdAt });
    }
    for (const s of await Promise.resolve(db.suppression.listFor(identifier))) {
      if (s.channel !== "SMS" || s.category !== "MARKETING" || s.createdAt < since) continue;
      suppression.push({ reason: s.reason, createdAt: s.createdAt, liftedAt: s.liftedAt ?? null });
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
  };
}
