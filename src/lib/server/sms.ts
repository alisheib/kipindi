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
import { appUrl } from "@/lib/app-url";
import { formatTzs } from "@/lib/utils";

export type SmsProvider = {
  name: string;
  send(to: string, body: string, opts?: { senderId?: string }): Promise<{ id: string; cost?: number }>;
};

/** Dev-only ring buffer of the last few outgoing SMS bodies, keyed by phone.
 *  Read by /api/_test/last-otp so end-to-end tests can complete the OTP
 *  step without scraping stdout. Disabled in production. */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_LAST_SMS: Map<string, { body: string; at: number }[]> | undefined;
}
function recordTestSms(to: string, body: string) {
  if (process.env.NODE_ENV === "production") return;
  const m = (globalThis.__50PICK_LAST_SMS ??= new Map<string, { body: string; at: number }[]>());
  const arr = m.get(to) ?? [];
  arr.push({ body, at: Date.now() });
  if (arr.length > 5) arr.splice(0, arr.length - 5);
  m.set(to, arr);
}

export const consoleSms: SmsProvider = {
  name: "console",
  async send(to, body) {
    const id = `sms_${Date.now().toString(36)}`;
    // NEVER print the message body (it contains the OTP) in production. If the
    // console provider is somehow active in prod it's a misconfiguration — log a
    // loud, code-free warning instead of leaking the code to the platform logs.
    if (process.env.NODE_ENV === "production") {
      console.error(`[SMS] console provider active in PRODUCTION — set SMS_PROVIDER=selcom. Message to ${to.slice(0, 4)}***${to.slice(-2)} NOT delivered (ref: ${id}).`);
    } else {
      console.log(`\n[SMS → ${to}]\n  ${body}\n  (ref: ${id})\n`);
    }
    recordTestSms(to, body);
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
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) throw new Error("selcom: SMS_API_KEY not set");
    const senderId = opts?.senderId ?? process.env.SMS_SENDER_ID ?? "KIPINDI";
    const endpoint = process.env.SMS_API_URL ?? "https://apigw.selcommobile.com/v1/sms/send";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ msisdn: to, message: body, senderId }),
    });
    if (!res.ok) throw new Error(`selcom sms failed: ${res.status}`);
    const json = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string; cost?: number };
    return { id: json.id ?? json.messageId ?? `selcom_${res.status}`, cost: json.cost };
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

/**
 * Whether SMS will ACTUALLY deliver right now — used by callers (e.g. invite
 * campaigns) to avoid marking a phone message "sent" when nothing leaves the box.
 *  - A real provider (selcom/beem/…) counts as configured only with an API key.
 *  - The `console` provider is a working stub in dev/test but in PRODUCTION it
 *    delivers nothing, so it is NOT considered configured there.
 * To go live: sign the provider (e.g. Selcom), then set SMS_PROVIDER=selcom,
 * SMS_API_KEY=<key>, and SMS_SENDER_ID=<TCRA-licensed sender id>.
 */
export function smsConfigured(): boolean {
  const provider = (process.env.SMS_PROVIDER ?? "console").toLowerCase();
  if (provider === "console") return process.env.NODE_ENV !== "production";
  return !!process.env.SMS_API_KEY;
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

/** Templated OTP message — keeps it ≤ 160 GSM-7 chars. EN + SW + ZH. */
export function otpMessage(code: string, locale: "EN" | "SW" | "ZH" = "SW"): string {
  switch (locale) {
    case "SW": return `Msimbo 50pick: ${code}. Dakika 5. Usishirikishe.`;
    case "ZH": return `50pick\u9A8C\u8BC1\u7801\uFF1A${code}\u3002\u6709\u6548\u671F5\u5206\u949F\u3002\u8BF7\u52FF\u5206\u4EAB\u3002`;
    case "EN":
    default:   return `50pick code: ${code}. Valid 5 min. Don't share.`;
  }
}

const SMS_BASE_URL = appUrl();

/** Invite SMS: the campaign's short message + the bonus + a register link with
 *  the campaign code. Kept compact to fit a single SMS segment where possible. */
export function inviteMessage(opts: { message: string; code: string; bonusTzs: number }): string {
  const base = opts.message.trim();
  const bonus = `Bonus ${formatTzs(opts.bonusTzs)}`;
  const link = `${SMS_BASE_URL}/auth/register?invite=${encodeURIComponent(opts.code)}`;
  return `${base ? base + " " : ""}${bonus}. 50pick: ${link}`;
}
