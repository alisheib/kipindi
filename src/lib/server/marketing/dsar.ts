import { db } from "@/lib/server/store";
import type { MessagingKey, StoredMarketingContact, StoredUser } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";

/**
 * U18b · THE MARKETING ARM OF A DATA EXPORT — what the platform holds about a person's marketing, for
 * both access doors: the player's own download (`exportUserData`) and the officer's DSAR bundle
 * (`buildDsarBundle`). ONE function, so the two doors cannot disagree about what "everything" is.
 *
 * 🔴 BEFORE THIS, NEITHER DOOR HAD A MARKETING SECTION. The consent ledger, the stop list and the contact
 * book all hold the person's number, and a right-of-access file that leaves out the record of what they
 * agreed to — and whether they are being marketed at all — is not the whole answer (PDPA 2022 / GDPR Art. 15).
 *
 * ⛔ AN ALLOWLIST, NEVER THE RAW ROW. Left out on purpose: `recordedBy` (a member of STAFF — another
 * person's data), `evidence` (internal references: the opt-out token's reference, the form version, an
 * import attestation) and every row id. A new column reaches the export only by being added here.
 *
 * Reached by the account LINK and by the account's NUMBER (bare `255…`, the marketing key — the account
 * stores `+255…`), so a contact imported before the person signed up is in their file too. After an
 * erasure the account's number is a tombstone and the book row is unlinked, so the section is empty.
 */
export type MarketingDsarSection = {
  contacts: Array<Pick<StoredMarketingContact,
    "msisdn" | "displayName" | "email" | "operator" | "source" | "consentState" | "suppressedAt" | "tags" | "notes" | "createdAt" | "updatedAt">>;
  consent: Array<{ status: string; source: string; wording: string; locale: string; createdAt: string }>;
  suppression: Array<{ reason: string; createdAt: string; liftedAt: string | null }>;
};

export async function marketingDsarView(user: Pick<StoredUser, "id" | "phoneE164">): Promise<MarketingDsarSection> {
  const raw = toMsisdn255(user.phoneE164);
  const accountNumber = raw && raw.length >= 12 ? raw : null;

  const rows = new Map<string, StoredMarketingContact>();
  for (const c of await Promise.resolve(db.marketingContact.listByUserId(user.id))) rows.set(c.id, c);
  if (accountNumber) {
    const byNumber = await Promise.resolve(db.marketingContact.findByMsisdn(accountNumber));
    if (byNumber) rows.set(byNumber.id, byNumber);
  }
  const numbers = new Set<string>();
  if (accountNumber) numbers.add(accountNumber);
  for (const c of rows.values()) numbers.add(c.msisdn);

  const consent: MarketingDsarSection["consent"] = [];
  const suppression: MarketingDsarSection["suppression"] = [];
  for (const identifier of numbers) {
    const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };
    for (const r of await Promise.resolve(db.messagingConsent.listFor(key))) {
      consent.push({ status: r.status, source: r.source, wording: r.wording, locale: r.locale, createdAt: r.createdAt });
    }
    for (const s of await Promise.resolve(db.suppression.listFor(identifier))) {
      if (s.channel !== "SMS" || s.category !== "MARKETING") continue;
      suppression.push({ reason: s.reason, createdAt: s.createdAt, liftedAt: s.liftedAt ?? null });
    }
  }

  return {
    contacts: Array.from(rows.values()).map((c) => ({
      msisdn: c.msisdn, displayName: c.displayName, email: c.email, operator: c.operator, source: c.source,
      consentState: c.consentState, suppressedAt: c.suppressedAt, tags: c.tags, notes: c.notes,
      createdAt: c.createdAt, updatedAt: c.updatedAt,
    })),
    consent,
    suppression,
  };
}
