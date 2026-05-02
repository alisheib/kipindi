/**
 * SMS gateway abstraction — dev provider logs to console.
 * Production: swap to Selcom / Beem / Africa's Talking adapter.
 * Compliance: TCRA-licensed sender ID required in production.
 */

export type SmsProvider = {
  send(to: string, body: string, opts?: { senderId?: string }): Promise<{ id: string; cost?: number }>;
};

export const consoleSms: SmsProvider = {
  async send(to, body) {
    const id = `sms_${Date.now().toString(36)}`;
    console.log(`\n[SMS → ${to}]\n  ${body}\n  (ref: ${id})\n`);
    return { id };
  },
};

export const sms: SmsProvider = consoleSms;

/** Templated OTP message — keeps it ≤ 160 GSM-7 chars. EN + SW. */
export function otpMessage(code: string, locale: "EN" | "SW" = "SW"): string {
  return locale === "SW"
    ? `Msimbo Kipindi: ${code}. Dakika 5. Usishirikishe.`
    : `Kipindi code: ${code}. Valid 5 min. Don't share.`;
}
