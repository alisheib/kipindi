/**
 * SMS — the front door. One real provider (Blackball) and one dev stub (`console`).
 *
 * Pick the active provider with `SMS_PROVIDER`: `console` (default) or `blackball`.
 * The transport lives in `sms-blackball.ts`; this file owns everything that is true
 * of an SMS regardless of who carries it — the reference, the persisted row, the
 * cost gate, the health counters, the audit trail and the message templates.
 *
 * ── ⛔ WHAT WAS DELETED, AND WHY IT HAD TO BE ────────────────────────────────
 * `selcom`, `beem` and `africas-talking` are gone. Beem and Africa's Talking were
 * one-line stubs that threw. The Selcom adapter was worse: a complete, plausible
 * HTTP body written against a **guessed endpoint on an unsigned contract**, which
 * read as a working integration to anyone scanning the file. A provider the
 * platform cannot actually reach must not look like one it can.
 * ⚠️ `selcom.ts` — the PAYMENTS client — is a different subsystem and is untouched.
 *
 * ── 🔴 E-330, BOTH HALVES, FIXED HERE ────────────────────────────────────────
 * Measured on production 2026-09-10: 0 Otp rows, 0 `sms.delivered`, 0 `sms.failed`.
 * Nothing had ever attempted an SMS, and two things were waiting to lie about it:
 *
 *  ① `consoleSms.send()` logged "NOT delivered" and then RETURNED NORMALLY, so the
 *     facade took the success branch and wrote a delivery row into the **HMAC audit
 *     chain** for a message that never left the building. ⛔ A false row in the one
 *     record designed to be incorruptible is worse than the outage it conceals. It
 *     now THROWS in production, so a dropped message counts as failed and audits as
 *     `sms.failed`.
 *  ② `successRate` returned `1` when nothing had ever been attempted, making "never
 *     tried" indistinguishable from "perfect". It now returns `null` for no traffic
 *     — the shape `payment-ops.ts:66` already uses for exactly this reason.
 *
 * ── ⭐ "ACCEPTED" IS NOT "DELIVERED", AND THE AUDIT TRAIL NOW SAYS SO ─────────
 * The old success action was `sms.delivered`, written the instant the gateway
 * returned. A gateway accepting a message is not a handset receiving one. The
 * action is now `sms.accepted`; only a delivery receipt writes DELIVERED, and it
 * does so on the `SmsMessage` row, not here.
 *
 * Compliance:
 *  - TCRA-licensed sender ID required (`SMS_SENDER_ID`, ⛔ max 12 characters)
 *  - Every attempt persists to `SmsMessage`; receipts land on it by reference
 *  - Rate-limited per phone by the CALLER (`rate-limit.ts`, `otp.send` / `otp.resend`)
 */
import { audit } from "./audit";
import { db, type SmsPurpose, type StoredSmsMessage } from "./store";
import { randomId } from "./crypto";
import { appUrl } from "@/lib/app-url";
import { formatTzs } from "@/lib/utils";
import {
  BATCH_MAX,
  REFERENCE_MIN_CHARS,
  blackballConfigured,
  blackballEnv,
  blackballSend,
  describeBlackball,
  senderIdProblem,
} from "./sms-blackball";

/* ══ PROVIDER RESOLUTION ═════════════════════════════════════════════════════ */

export type SmsProviderId = "blackball" | "console";
/** ⛔ TRI-STATE. `unrecognised` is a FAILED choice, not a default. */
export type SmsProviderResolution = SmsProviderId | "unrecognised";

/**
 * Which provider the environment actually selected.
 *
 * ⛔ AN UNRECOGNISED VALUE RESOLVES TO `unrecognised`, NEVER TO `console`. The old
 * `switch` had `default: return consoleSms`, so `SMS_PROVIDER=blackbal` — one
 * missing letter in a Railway variable — would have silently selected the stub on a
 * production box: every message dropped, `smsConfigured()` cheerfully true in dev
 * terms, and nothing anywhere saying so. This is `payment-control.ts`'s tri-state
 * lesson applied to the rail that will carry login codes.
 */
export function smsProviderResolution(): SmsProviderResolution {
  const raw = (process.env.SMS_PROVIDER ?? "console").trim().toLowerCase();
  if (raw === "blackball") return "blackball";
  if (raw === "console" || raw === "") return "console";
  return "unrecognised";
}

/**
 * Whether SMS will ACTUALLY deliver right now — read by invite campaigns before
 * promising anything, and by the OTP path before issuing a code nobody can receive.
 *
 * ⛔ IT NO LONGER READS `SMS_API_KEY`. That env belonged to the deleted Selcom stub.
 * A Blackball deployment sets `BLACKBALL_CLIENT_ID` / `BLACKBALL_CLIENT_SECRET` and
 * no `SMS_API_KEY` at all, so the old body reported a fully-configured rail as dead
 * — and `invite-service.ts` answers "dead" by silently leaving every phone invite
 * QUEUED. The env that is NOT read here is as load-bearing as the ones that are.
 */
export function smsConfigured(): boolean {
  switch (smsProviderResolution()) {
    case "blackball":
      return blackballConfigured() && !senderIdProblem(process.env.SMS_SENDER_ID);
    case "console":
      // The stub is a working channel in dev and a black hole in production.
      return process.env.NODE_ENV !== "production";
    case "unrecognised":
      return false;
  }
}

/* ══ HEALTH AND BALANCE ══════════════════════════════════════════════════════ */

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SMS_HEALTH: { sent: number; failed: number } | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_SMS_BALANCE: { tzs: number; at: number } | undefined;
}

/** ⛔ ON `globalThis`, NOT A MODULE-SCOPE `let`. Every other counter in this repo is
 *  (`retry.ts`, `__50PICK_LAST_SMS`, the audit queue); this one was the exception, so
 *  a hot reload or a cold start silently reset it and `/admin/system` read a fresh
 *  zero as though nothing had ever been sent. */
const health = () => (globalThis.__50PICK_SMS_HEALTH ??= { sent: 0, failed: 0 });

/** Below this, non-OTP traffic is refused. TZS. */
const balanceFloor = () => Number(process.env.SMS_BALANCE_FLOOR_TZS) || 50;
/** Below this, officers are alarmed once, on the crossing. TZS. */
const balanceAlert = () => Number(process.env.SMS_BALANCE_ALERT_TZS) || 150;

/**
 * Record the balance the gateway echoed. Called on EVERY reply — success and
 * failure alike, because Blackball reports credit on both, and a rail that only
 * reads it on success goes blind exactly as the float runs out.
 *
 * ⛔ THE ALARM IS EDGE-TRIGGERED, NOT LEVEL-TRIGGERED. A level check writes one
 * `sms.balance_low` row per send once the balance is low, burying the hash-chained
 * compliance log under precisely the condition that most needs reading. This audits
 * only on a downward crossing, and re-arms when the balance recovers.
 */
function recordBalance(tzs: number | null): void {
  if (tzs === null) return;
  const prev = globalThis.__50PICK_SMS_BALANCE?.tzs ?? null;
  globalThis.__50PICK_SMS_BALANCE = { tzs, at: Date.now() };
  const threshold = balanceAlert();
  if (prev !== null && prev > threshold && tzs <= threshold) {
    audit({
      category: "SYSTEM",
      action: "sms.balance_low",
      actorId: null,
      targetType: null,
      targetId: null,
      payload: { from: prev, to: tzs, threshold, floor: balanceFloor() },
    });
  }
}

export function smsBalanceSnapshot(): {
  tzs: number | null;
  at: number | null;
  belowAlert: boolean;
  belowFloor: boolean;
} {
  const b = globalThis.__50PICK_SMS_BALANCE ?? null;
  return {
    tzs: b?.tzs ?? null,
    at: b?.at ?? null,
    // ⛔ UNKNOWN IS NOT LOW. Before the first reply we have no reading, and refusing
    // traffic on an absence would take the rail down on every cold start.
    belowAlert: b !== null && b.tzs <= balanceAlert(),
    belowFloor: b !== null && b.tzs < balanceFloor(),
  };
}

export function smsHealthSnapshot(): { sent: number; failed: number; successRate: number | null } {
  const h = health();
  const total = h.sent + h.failed;
  return {
    ...h,
    // 🔴 E-330 ② — `null`, not `1`. "Never tried" and "perfect" are different facts.
    successRate: total === 0 ? null : h.sent / total,
  };
}

/* ══ THE DEV TEST RING ═══════════════════════════════════════════════════════ */

/** Dev-only ring buffer of the last few outgoing SMS bodies, keyed by phone.
 *  Read by /api/dev-test/last-otp so end-to-end tests can complete the OTP step
 *  without scraping stdout. Disabled in production.
 *
 *  ⛔ FED BY THE FACADE, NOT BY `consoleSms`. It used to be written only by the
 *  console stub, so the six E2E drives that read it would all have broken the moment
 *  a QA box pointed `SMS_PROVIDER` at a real gateway — a class of breakage that only
 *  appears once someone is testing the thing this whole change exists to enable. */
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

/* ══ THE TRANSPORTS ══════════════════════════════════════════════════════════ */

/** One chunk's verdict, whoever carried it. */
type ChunkOutcome = { ok: boolean; detail: string; message: string; balance: number | null };
type SmsTransport = {
  name: SmsProviderId;
  sendChunk(msgs: { msisdn: string; text: string; reference: string }[]): Promise<ChunkOutcome>;
};

const consoleTransport: SmsTransport = {
  name: "console",
  async sendChunk(msgs) {
    // 🔴 E-330 ① — NEVER PRINT THE BODY IN PRODUCTION, AND NEVER RETURN AS THOUGH
    // IT WENT. If the console provider is somehow active in prod it is a
    // misconfiguration: log a loud, code-free warning and THROW, so the attempt
    // counts as failed and audits as failed. Returning normally is what wrote a
    // false delivery row into the audit chain.
    if (process.env.NODE_ENV === "production") {
      const to = msgs[0]?.msisdn ?? "";
      // ⛔ ONE LINE, AND THE TEMPLATE SITS DIRECTLY INSIDE THE CALL. `pii-in-logs`
      // §4 matches this exact shape as source text, so wrapping the argument onto
      // its own line silently disarms the guard that keeps the OTP out of the logs.
      // Reformatting here is a real change, not a cosmetic one.
      console.error(`[SMS] console provider active in PRODUCTION — set SMS_PROVIDER=blackball. ${msgs.length} message(s) to ${to.slice(0, 4)}***${to.slice(-2)} NOT delivered.`);
      throw new SmsError("NOT_CONFIGURED", "the console provider delivers nothing in production");
    }
    for (const m of msgs) console.log(`\n[SMS → ${m.msisdn}]\n  ${m.text}\n  (ref: ${m.reference})\n`);
    return { ok: true, detail: "console", message: "console", balance: null };
  },
};

const blackballTransport: SmsTransport = {
  name: "blackball",
  async sendChunk(msgs) {
    const env = blackballEnv();
    if (!env) throw new SmsError("NOT_CONFIGURED", "blackball: BLACKBALL_CLIENT_ID / BLACKBALL_CLIENT_SECRET not set");
    const problem = senderIdProblem(env.senderId);
    if (problem) throw new SmsError("NOT_CONFIGURED", `blackball: sender ID ${problem}`);
    const r = await blackballSend(env, msgs);
    return { ok: r.ok, detail: describeBlackball(r), message: r.message, balance: r.balance };
  },
};

function pickTransport(): SmsTransport | null {
  switch (smsProviderResolution()) {
    case "blackball":
      return blackballTransport;
    case "console":
      return consoleTransport;
    case "unrecognised":
      return null;
  }
}

/* ══ ERRORS ══════════════════════════════════════════════════════════════════ */

export type SmsFailureCode =
  | "NOT_CONFIGURED"
  | "PROVIDER_UNRECOGNISED"
  | "BALANCE_FLOOR"
  | "REJECTED"
  | "TRANSPORT"
  | "UNKNOWN";

/** A typed failure, so a caller can branch without regex-ing prose. */
export class SmsError extends Error {
  constructor(
    readonly code: SmsFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "SmsError";
  }
}

/* ══ THE REFERENCE ═══════════════════════════════════════════════════════════ */

/**
 * The correlation key, minted HERE and never by a caller.
 *
 * ⭐ IT IS THE ONLY THING A DELIVERY RECEIPT CARRIES. Blackball's callback sends
 * `{status, reference, description, msisdn}` — no message id, no timestamp we
 * chose. So the reference is the join key between a send and its outcome, and
 * minting it in the facade is what guarantees every send has one.
 *
 * `sms_` + 24 hex = 28 characters, comfortably over the gateway's 20-char floor
 * (`randomId` takes BYTES and returns hex, so 12 → 24). Asserted, not assumed.
 */
export function mintSmsReference(): string {
  const ref = `sms_${randomId(12)}`;
  if (ref.length < REFERENCE_MIN_CHARS) {
    throw new Error(`sms: minted a ${ref.length}-char reference; the gateway floor is ${REFERENCE_MIN_CHARS}`);
  }
  return ref;
}

/* ══ THE ONE SEND PATH ═══════════════════════════════════════════════════════ */

export type SmsOutbound = {
  to: string;
  body: string;
  purpose?: SmsPurpose;
  targetType?: string;
  targetId?: string;
};

export type SmsResult = {
  reference: string;
  to: string;
  ok: boolean;
  error?: string;
  code?: SmsFailureCode;
  /** ⭐ THE CALLER'S OWN KEY, HANDED BACK. Results come out in input order, but a
   *  caller that zips them by INDEX breaks silently the day anything reorders or
   *  drops one — and the failure mode is an invite marked SENT because a different
   *  invite succeeded. Carrying the target through removes the coupling entirely. */
  targetType?: string | null;
  targetId?: string | null;
};

export type SmsBatchOutcome = {
  results: SmsResult[];
  balanceTzs: number | null;
  /** Set when the batch never reached the gateway at all. Every row stays QUEUED. */
  refused?: SmsFailureCode;
};

const chunk = <T,>(xs: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

/**
 * Send many messages. ⛔ NEVER THROWS — it reports per-message verdicts so a caller
 * can do per-entry accounting without a try/catch around each one. `send()` below is
 * this with one message plus a throw, so there is exactly ONE code path that mints
 * references, persists rows, gates on cost and parses the verdict.
 *
 * ── THE ATTRIBUTION RULE, AND ITS HONEST LIMIT ───────────────────────────────
 * The gateway answers once per REQUEST, not once per message, so a chunk's verdict
 * is all there is at this layer. `status:true` marks every message in that chunk
 * ACCEPTED; a refusal marks every message in it FAILED with the same reason. ⛔ Do
 * not invent finer attribution — there is no per-message data in the reply, and
 * per-message truth is exactly what the delivery receipt is for.
 *
 * ⚠️ A TRANSPORT FAILURE LEAVES THE ROW `UNKNOWN`, NOT `FAILED`. The gateway may
 * hold the batch and bill for it; we simply lost the reply. Calling that a failure
 * invites a retry, and a retry is a second SMS at a second charge.
 */
export async function sendBatch(messages: SmsOutbound[]): Promise<SmsBatchOutcome> {
  if (messages.length === 0) return { results: [], balanceTzs: smsBalanceSnapshot().tzs };

  const transport = pickTransport();
  const refuse = (code: SmsFailureCode, error: string): SmsBatchOutcome => ({
    results: messages.map((m) => ({ reference: "", to: m.to, ok: false, error, code, targetType: m.targetType ?? null, targetId: m.targetId ?? null })),
    balanceTzs: smsBalanceSnapshot().tzs,
    refused: code,
  });

  if (!transport) {
    return refuse("PROVIDER_UNRECOGNISED", `SMS_PROVIDER="${process.env.SMS_PROVIDER}" is not a provider this build knows`);
  }
  if (!smsConfigured()) return refuse("NOT_CONFIGURED", "the SMS provider is not configured");

  // ⛔ THE COST FLOOR EXEMPTS OTP, DELIBERATELY. The floor exists to stop a CAMPAIGN
  // eating the float the login path needs. Once OTP is the login path, refusing a
  // login code to conserve TZS 40 is a self-inflicted outage — the opposite of what
  // the floor is for.
  const everyMessageIsOtp = messages.every((m) => (m.purpose ?? "OPS") === "OTP");
  if (!everyMessageIsOtp && smsBalanceSnapshot().belowFloor) {
    return refuse(
      "BALANCE_FLOOR",
      `SMS credit is below the TZS ${balanceFloor()} floor — non-critical messages are held so login codes keep sending`,
    );
  }

  const nowIso = new Date().toISOString();
  const senderId = (process.env.SMS_SENDER_ID ?? "").trim();
  const prepared = messages.map((m) => ({
    out: m,
    reference: mintSmsReference(),
    msisdn: m.to,
  }));

  // ⭐ ROWS FIRST, HTTP SECOND. A crash between the two leaves QUEUED rows carrying
  // real references, so a receipt that arrives anyway still lands, and a sweep can
  // see exactly what we do not know the fate of. The reverse order loses both.
  const rows: StoredSmsMessage[] = prepared.map((p) => ({
    reference: p.reference,
    msisdn: p.msisdn,
    purpose: p.out.purpose ?? "OPS",
    provider: transport.name,
    senderId,
    bodyLen: p.out.body.length,
    status: "QUEUED",
    providerMsg: null,
    dlrStatus: null,
    dlrDesc: null,
    balanceTzs: null,
    attempts: 1,
    targetType: p.out.targetType ?? null,
    targetId: p.out.targetId ?? null,
    createdAt: nowIso,
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
  }));
  await db.smsMessage.createMany(rows);

  const results: SmsResult[] = [];
  let balance = smsBalanceSnapshot().tzs;

  for (const group of chunk(prepared, BATCH_MAX)) {
    let outcome: ChunkOutcome;
    try {
      outcome = await transport.sendChunk(
        group.map((p) => ({ msisdn: p.msisdn, text: p.out.body, reference: p.reference })),
      );
    } catch (err) {
      const code = err instanceof SmsError ? err.code : "TRANSPORT";
      const detail = String((err as Error)?.message ?? err).slice(0, 200);
      for (const p of group) {
        health().failed++;
        await db.smsMessage.update(p.reference, { status: "FAILED", providerMsg: detail, failedAt: new Date().toISOString() });
        results.push({ reference: p.reference, to: p.out.to, ok: false, error: detail, code, targetType: p.out.targetType ?? null, targetId: p.out.targetId ?? null });
      }
      audit({
        category: "SYSTEM",
        action: "sms.failed",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: { provider: transport.name, count: group.length, code, detail },
      });
      continue;
    }

    recordBalance(outcome.balance);
    if (outcome.balance !== null) balance = outcome.balance;
    const settledAt = new Date().toISOString();
    // A reply we could not complete is AMBIGUOUS; a reply that said no is a refusal.
    const ambiguous = !outcome.ok && /transport failure/.test(outcome.message);

    for (const p of group) {
      if (outcome.ok) {
        health().sent++;
        if (process.env.NODE_ENV !== "production") recordTestSms(p.out.to, p.out.body);
        await db.smsMessage.update(p.reference, {
          status: "ACCEPTED",
          providerMsg: outcome.message.slice(0, 200),
          balanceTzs: outcome.balance,
          sentAt: settledAt,
        });
        results.push({ reference: p.reference, to: p.out.to, ok: true, targetType: p.out.targetType ?? null, targetId: p.out.targetId ?? null });
      } else {
        health().failed++;
        await db.smsMessage.update(p.reference, {
          status: ambiguous ? "UNKNOWN" : "FAILED",
          providerMsg: outcome.message.slice(0, 200),
          balanceTzs: outcome.balance,
          ...(ambiguous ? {} : { failedAt: settledAt }),
        });
        results.push({
          reference: p.reference,
          to: p.out.to,
          ok: false,
          error: outcome.message,
          code: ambiguous ? "TRANSPORT" : "REJECTED",
          targetType: p.out.targetType ?? null,
          targetId: p.out.targetId ?? null,
        });
      }
    }

    audit({
      category: "SYSTEM",
      // ⭐ `sms.accepted`, NOT `sms.delivered`. The gateway taking a message is not a
      // handset receiving one, and this row goes into the HMAC chain. Only the
      // delivery receipt may claim delivery, and it says so on the SmsMessage row.
      action: outcome.ok ? "sms.accepted" : "sms.failed",
      actorId: null,
      targetType: null,
      targetId: group[0]?.reference ?? null,
      payload: {
        provider: transport.name,
        count: group.length,
        purposes: [...new Set(group.map((p) => p.out.purpose ?? "OPS"))],
        detail: outcome.detail,
        balanceTzs: outcome.balance,
      },
    });
  }

  return { results, balanceTzs: balance };
}

/* ══ THE ONE-MESSAGE FACADE ══════════════════════════════════════════════════ */

export type SmsProvider = {
  name: string;
  send(
    to: string,
    body: string,
    opts?: { purpose?: SmsPurpose; targetType?: string; targetId?: string },
  ): Promise<{ id: string; reference: string; cost?: number }>;
};

/**
 * Send one message. ⛔ THROWS an `SmsError` on failure — `invite-service.ts`'s
 * per-entry `try/catch` and the OTP path both depend on that contract.
 */
export const sms: SmsProvider = {
  get name() {
    return smsProviderResolution();
  },
  async send(to, body, opts) {
    const { results, refused } = await sendBatch([{ to, body, ...opts }]);
    const r = results[0];
    if (!r || !r.ok) {
      throw new SmsError(refused ?? r?.code ?? "UNKNOWN", r?.error ?? "sms send failed");
    }
    return { id: r.reference, reference: r.reference };
  },
};

/* ══ TEMPLATES ═══════════════════════════════════════════════════════════════ */

/** Templated OTP message — keeps it ≤ 160 GSM-7 chars. EN + SW + ZH. */
export function otpMessage(code: string, locale: "EN" | "SW" | "ZH" = "SW"): string {
  switch (locale) {
    case "SW": return `Msimbo 50pick: ${code}. Dakika 5. Usishirikishe.`;
    case "ZH": return `50pick验证码：${code}。有效期5分钟。请勿分享。`;
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
