import { hasDepositStatusReview } from "@/lib/wallet/deposit-review";

/** Selcom's hosted Card URL is a payment capability. Accept only HTTPS on Selcom-owned hosts. */
const SELCOM_CHECKOUT_HOSTS = new Set(["checkout.selcommobile.com", "checkout.selcom.net", "selcompay.me"]);

export function trustedCardCheckoutUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048 || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!SELCOM_CHECKOUT_HOSTS.has(host)) return null;
    return url.href;
  } catch { return null; }
}

/** An owned, still-open Card order is the only source of a recoverable checkout link. */
export function activeCardCheckoutUrl(ownerId: string, row: {
  userId: string; type: string; status: string; currency: string; provider: string | null;
  houseBotId?: string | null; providerRef?: string | null; providerStatus?: string | null; cardCheckoutUrl?: string | null;
} | null): string | null {
  if (!row || row.userId !== ownerId || row.type !== "DEPOSIT" || row.status !== "PROCESSING"
    || row.currency !== "TZS" || row.provider !== "CARD" || !row.providerRef || row.houseBotId != null
    || hasDepositStatusReview(row)) return null;
  return trustedCardCheckoutUrl(row.cardCheckoutUrl);
}
