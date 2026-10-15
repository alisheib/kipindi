/** One unresolved funding identity per owner and tab. This namespace never shares a bet request key. */
export const FUNDING_STORAGE_MAX_BYTES = 1_024;
export const fundingStorageKey = (owner: string) => `kp-deposit-intent:v1:${owner}`;
const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoredFundingIdentity = { v: 1; key: string; owner: string; startedAt: number; attempts: 1 };

/** No age-based expiry: an unresolved charge never becomes safe to repeat because a clock moved. */
export function parseStoredFunding(raw: string, owner: string): StoredFundingIdentity | null {
  if (!owner || byteLength(raw) > FUNDING_STORAGE_MAX_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.v !== 1 || record.owner !== owner || typeof record.key !== "string" || !UUID.test(record.key)
    || typeof record.startedAt !== "number" || !Number.isFinite(record.startedAt) || record.startedAt < 0
    || record.attempts !== 1) return null;
  return { v: 1, key: record.key, owner, startedAt: record.startedAt, attempts: 1 };
}

export function writeStoredFunding(box: Storage, owner: string, value: StoredFundingIdentity): boolean {
  const raw = JSON.stringify(value);
  if (byteLength(raw) > FUNDING_STORAGE_MAX_BYTES || !parseStoredFunding(raw, owner)) return false;
  box.setItem(fundingStorageKey(owner), raw);
  return box.getItem(fundingStorageKey(owner)) === raw;
}
