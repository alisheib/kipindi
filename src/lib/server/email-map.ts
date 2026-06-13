/**
 * Pre-KYC phone → email mapping from env. Single source of truth shared by the
 * auth service (login/welcome resolve live) and the transactional email helper
 * (so bet/deposit/cashout receipts reach mapped accounts even if the stored
 * user.email wasn't persisted).
 *
 * Set PHONE_EMAIL_MAP=+255777777777:ali@example.com,+255777777775:bob@example.com
 * on Railway. Once KYC collects email directly, this becomes a fallback.
 */
export function resolvePhoneEmail(phone: string): string | null {
  const raw = process.env.PHONE_EMAIL_MAP ?? "";
  if (!raw) return null;
  for (const pair of raw.split(",")) {
    const [p, e] = pair.split(":").map((s) => s.trim());
    if (p === phone && e) return e;
  }
  return null;
}
