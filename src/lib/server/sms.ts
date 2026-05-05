/**
 * SMS gateway abstraction — dev provider logs to console; production adapters
 * for Selcom, Beem, and Africa's Talking.
 *
 * Pick the active provider with `SMS_PROVIDER` env: `console` (default), `selcom`,
 * `beem`, `africas-talking`. The adapter shape is identical across providers so
 * the calling code never changes.
 *
 * Compliance:
 *  - TCRA-licensed sender ID required (set `SMS_SENDER_ID`)
 *  - Delivery receipts logged under `SYSTEM` audit category
 *  - Rate-limited per phone via `rate-limit.ts` (`otp.send` rule)
 */
import { audit } from "./audit";

export type SmsProvider = {
  name: string;
  send(to: string, body: string, opts?: { senderId?: string }): Promise<{ id: string; cost?: number }>;
};

export const consoleSms: SmsProvider = {
  name: "console",
  async send(to, body) {
    const id = `sms_${Date.now().toString(36)}`;
    console.log(`\n[SMS → ${to}]\n  ${body}\n  (ref: ${id})\n`);
    return { id };
  },
};

/**
 * Selcom SMS adapter — Tanzania's most common operator-grade provider, also
 * doubles as our payment aggregator (single TCRA-licensed sender ID).
 * Wire this body to the real Selcom HTTPS endpoint when the contract is signed.
 */
const selcomSms: SmsProvider = {
  name: "selcom",
  async send(to, body, opts) {
    // const res = await fetch(`https://apigw.selcommobile.com/v1/sms/send`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${process.env.SMS_API_KEY!}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({ msisdn: to, message: body, senderId: opts?.senderId ?? process.env.SMS_SENDER_ID ?? "KIPINDI" }),
    // });
    // if (!res.ok) throw new Error(`selcom sms failed: ${res.status}`);
    // const json = await res.json();
    // return { id: json.id, cost: json.cost };
    void opts;
    void body;
    void to;
    throw new Error("selcom adapter not configured — set SMS_PROVIDER=console or sign Selcom agreement");
  },
};

const beemSms: SmsProvider = {
  name: "beem",
  async send() { throw new Error("beem adapter not configured"); },
};

const africasTalkingSms: SmsProvider = {
  name: "africas-talking",
  async send() { throw new Error("africas-talking adapter not configured"); },
};

function pickProvider(): SmsProvider {
  switch ((process.env.SMS_PROVIDER ?? "console").toLowerCase()) {
    case "selcom":           return selcomSms;
    case "beem":             return beemSms;
    case "africas-talking":
    case "africastalking":   return africasTalkingSms;
    case "console":
    default:                 return consoleSms;
  }
}

let smsHealth = { sent: 0, failed: 0 };

export const sms: SmsProvider = {
  get name() { return pickProvider().name; },
  async send(to, body, opts) {
    const provider = pickProvider();
    try {
      const r = await provider.send(to, body, opts);
      smsHealth.sent++;
      audit({
        category: "SYSTEM",
        action: "sms.delivered",
        actorId: null,
        targetType: null,
        targetId: r.id,
        payload: { provider: provider.name, msisdn: to.slice(0, 4) + "***" + to.slice(-2), bodyLen: body.length },
      });
      return r;
    } catch (err) {
      smsHealth.failed++;
      audit({
        category: "SYSTEM",
        action: "sms.failed",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: { provider: provider.name, error: String((err as Error)?.message ?? err) },
      });
      throw err;
    }
  },
};

export function smsHealthSnapshot() {
  return {
    ...smsHealth,
    successRate: smsHealth.sent + smsHealth.failed === 0 ? 1 : smsHealth.sent / (smsHealth.sent + smsHealth.failed),
  };
}

/** Templated OTP message — keeps it ≤ 160 GSM-7 chars. EN + SW + FR. */
export function otpMessage(code: string, locale: "EN" | "SW" | "FR" = "SW"): string {
  switch (locale) {
    case "SW": return `Msimbo 50pick: ${code}. Dakika 5. Usishirikishe.`;
    case "FR": return `Code 50pick : ${code}. Valide 5 min. Ne partagez pas.`;
    case "EN":
    default:   return `50pick code: ${code}. Valid 5 min. Don't share.`;
  }
}
