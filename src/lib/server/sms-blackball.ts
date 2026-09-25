/**
 * Blackball SMS Gateway — the raw transport.
 *
 * Owns everything Blackball-specific: the credential reader, the batch request
 * shape, and the reply parser. `sms.ts`'s `blackballSms` adapter is a thin wrapper
 * over `blackballSend`, exactly as `payments.ts`'s `selcomAdapter` wraps
 * `selcom.ts`. Same house shape as `selcomFetch`: an AbortController timeout,
 * `res.text()` then `JSON.parse` in a try (never `res.json()`), an envelope
 * returned rather than an exception thrown for a non-2xx, `clearTimeout` in a
 * `finally`.
 *
 * ── THE CONTRACT WAS MEASURED, NOT READ ──────────────────────────────────────
 * Probed against the live endpoint on 2026-09-16 with deliberately invalid
 * credentials — no message sent, nothing billed. Four things the vendor PDF does
 * NOT say, each of which would have been a defect if we had trusted the document:
 *
 *  🔴 1. EVERY FAILURE IS HTTP 400 — INCLUDING AUTHENTICATION.
 *        `{"status":false,"message":"Invalid credentials","data":null}` arrives as
 *        a 400, and so does a schema complaint. ⛔ So `res.ok` is NOT the verdict
 *        and `if (!res.ok) throw` is the wrong shape: it would collapse "your
 *        sender ID is one character too long" and "your secret is wrong" into one
 *        opaque "HTTP 400", discarding the only string that names the cause. The
 *        `status` BOOLEAN in the body is the verdict, and it is what `ok` below is
 *        read from. A 200 carrying `status:false` fails on the same line.
 *
 *  🔴 2. `source` MAY ONLY BE 12 CHARACTERS. Undocumented, and enforced by them
 *        BEFORE authentication — so a sender ID one character too long fails every
 *        send with a complaint about a field rather than about the sender ID.
 *        `senderIdProblem()` catches it at boot instead of at the first send.
 *
 *  🔴 3. `data` IS AN ARRAY OF `{field: message}` ON A SCHEMA ERROR AND `null` ON
 *        AN AUTH ERROR. The PDF types it "Object". `readFieldErrors` therefore
 *        accepts array, object and null rather than assuming any one — a parser
 *        that indexed it as an object would throw on the commonest failure this
 *        gateway produces.
 *
 *  ⭐ 4. EVERY REPLY CARRIES AN UNDOCUMENTED `balance` (TZS, a number) — but it is
 *        only the ACCOUNT's balance on an ACCEPTED reply. A refusal is decided before
 *        authentication, never identifies the account, and answers `balance: 0.0`.
 *        And an accepted reply's figure is PRE-CHARGE: the first live send reported
 *        TZS 250, the portal then showed 244 (TZS 6 per SMS). The parser reports the
 *        field faithfully either way; `sms.ts` decides which readings to trust.
 *
 * Also measured: `reference` is optional to them but must be ≥ 20 characters when
 * present; `text` has a 1-character floor; validation runs BEFORE authentication;
 * and the msisdn is NOT format-checked at all — the literal string "notaphone"
 * passes their schema — so normalising it is ours to do and nobody else's.
 *
 * ⚠️ ONE ENVELOPE COVERS THE WHOLE BATCH. The gateway answers a 50-message request
 * with a single `status`/`message` pair, so this module can only report a
 * batch-level verdict. PER-MESSAGE truth arrives later on the delivery receipt,
 * keyed by `reference` — which is the whole reason every send is persisted with
 * one. Do not invent per-message outcomes here: there is no per-message data to
 * read, and the success-body shape is still unconfirmed by the vendor.
 *
 * ⛔ NOTHING IN THIS FILE PASSES A MESSAGE BODY, AN MSISDN OR A CREDENTIAL TO
 * `console.*`. That is stricter than the allow-list entry `sms.ts` holds in
 * `pii-in-logs.test.mts`, and deliberately so — a file that needs an exemption is
 * a file one careless edit away from leaking an OTP into the platform log.
 *
 * Guard: `npm run test:blackball` · `npm run red:blackball`.
 */
import { toMsisdn255 } from "@/lib/phone-normalize";
import { encodingFor } from "@/lib/sms-compose";

/** Their documented ceiling — "List of messages to be sent (maximum 50)". */
export const BATCH_MAX = 50;
/** Measured: "source ... may only be 12 characters long". */
export const SENDER_ID_MAX_CHARS = 12;
/** Measured: "reference ... must be at least 20 characters long". */
export const REFERENCE_MIN_CHARS = 20;

const DEFAULT_ENDPOINT = "https://blackballgw.co.tz/api/sms/send";
const DEFAULT_TIMEOUT_MS = 8_000;

/* ══ CODING ══════════════════════════════════════════════════════════════════ */

/**
 * The two values the gateway accepts for `coding`. NOT in the vendor PDF — found in their
 * Swagger (`Msg.coding: string Enum`) and the values read off the gateway itself on
 * 2026-09-16: `coding:"NOPE"` → *"does not have a value in the enumeration [GSM7, UCS2]"*.
 */
export type SmsCoding = "GSM7" | "UCS2";

/**
 * ⭐ THE GSM 03.38 TABLE MOVED TO `@/lib/sms-compose` ON 2026-09-25 (marketing plan U3, D4).
 *
 * 🔴 IT USED TO LIVE HERE, AND HERE IS A SERVER MODULE. So the only table in the codebase that knew
 * what a message costs could not be imported by a composer screen without dragging the server graph
 * into a browser chunk — which is why there was no segment arithmetic anywhere, and why an officer
 * typing a campaign could not be told what they were about to spend.
 *
 * ⛔ AND IT MUST NOT BE COPIED BACK. `smsCodingFor` decides what the GATEWAY is told; `sizeSms`
 * decides what the OFFICER is quoted. Two tables would disagree silently — the officer is shown one
 * segment and billed three — so `test:campaign-compose` §5 asserts the two give the same answer over
 * a corpus containing both encodings, and its red control plants exactly that divergence.
 */

/**
 * The coding a message needs. ⛔ CHOSEN FROM THE TEXT, NEVER ASSUMED.
 *
 * 🔴 WHAT HAPPENS WITHOUT THIS. The portal labels GSM "(Default)", so a request that names no
 * coding is sent as GSM-7 — and GSM-7 cannot carry Chinese at all. `otpMessage(code, "ZH")`
 * would reach a Chinese-speaking player as unreadable glyphs around a six-digit code, on the
 * rail that carries login codes. The same applies to anything an officer types into an invite
 * campaign: an em-dash, a curly quote or an emoji pasted from a document is outside GSM-7.
 *
 * ⚠️ UCS2 is not free: a segment holds 70 characters instead of 160, so a UCS2 message is
 * more likely to bill as several SMS. That is a price of correctness, not a reason to guess.
 */
export function smsCodingFor(text: string): SmsCoding {
  // ⛔ DELEGATED, NOT REIMPLEMENTED — see the note above the (now moved) table. `SmsCoding` and
  // `SmsEncoding` are the same two strings; the local alias stays because it is the name the
  // gateway's own `coding` field uses and the Swagger enum it was read off.
  return encodingFor(text);
}

export type BlackballEnv = {
  clientId: string;
  clientSecret: string;
  senderId: string;
  endpoint: string;
  timeoutMs: number;
};

/**
 * Whether the credentials needed to reach this gateway are present.
 *
 * ⛔ IT DOES NOT READ `SMS_API_KEY`. That env belonged to the deleted Selcom stub.
 * A Blackball deployment sets `BLACKBALL_CLIENT_ID` and `BLACKBALL_CLIENT_SECRET`
 * and no `SMS_API_KEY` at all — so the old `!!process.env.SMS_API_KEY` body read a
 * fully-configured rail as "not configured", which `invite-service.ts` answers by
 * silently leaving every phone invite QUEUED. The env that is not read is as
 * load-bearing here as the two that are.
 */
export function blackballConfigured(): boolean {
  return !!(process.env.BLACKBALL_CLIENT_ID?.trim() && process.env.BLACKBALL_CLIENT_SECRET?.trim());
}

/**
 * The credential bundle, or `null` when it is incomplete — the `selcomEnv()` shape.
 * Returning null rather than throwing lets `smsConfigured()` answer "is this rail
 * live?" without a try/catch, which is what the admin surfaces render from.
 */
export function blackballEnv(): BlackballEnv | null {
  const clientId = process.env.BLACKBALL_CLIENT_ID?.trim();
  const clientSecret = process.env.BLACKBALL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    senderId: (process.env.SMS_SENDER_ID ?? "").trim(),
    endpoint: (process.env.BLACKBALL_API_URL || DEFAULT_ENDPOINT).trim(),
    timeoutMs: Number(process.env.BLACKBALL_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Why this sender ID cannot work, or `null` when it can. Exported so `boot-checks`
 * can say it out loud at startup — a predicate buried inside a send path is one
 * nobody discovers until the first message fails, and on the OTP rail the first
 * message failing is a player who cannot sign in.
 */
export function senderIdProblem(senderId: string | undefined | null): string | null {
  const v = (senderId ?? "").trim();
  if (!v) return "not set";
  if (v.length > SENDER_ID_MAX_CHARS) {
    return `${v.length} characters — the gateway refuses any source over ${SENDER_ID_MAX_CHARS}, so EVERY send would fail`;
  }
  return null;
}

export type BlackballOutcome = {
  /** The gateway's own verdict — the `status` boolean, NEVER `res.ok`. */
  ok: boolean;
  /** 0 when the request never completed. */
  httpStatus: number;
  message: string;
  /** Account credit in TZS as of this reply, or null when the field was absent. */
  balance: number | null;
  /** Field name → complaint, flattened from whichever shape `data` arrived in. */
  fieldErrors: Record<string, string>;
  /** Set only when the request never produced a response (abort, DNS, reset). */
  transport: string | null;
};

/** `data` arrives as an array of one-key objects, a bare object, or null. Take all three. */
function readFieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const absorb = (entry: unknown) => {
    if (!entry || typeof entry !== "object") return;
    for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v.trim();
    }
  };
  if (Array.isArray(data)) for (const e of data) absorb(e);
  else absorb(data);
  return out;
}

/**
 * Parse one reply body. Exported because every interesting case here is a PARSER
 * case, and a suite that can only reach them through `fetch` is a suite testing
 * its own stub. A non-JSON body — an HTML error page, an empty 502 — must read as
 * a failure with its shape preserved, never as a throw.
 */
export function parseBlackballBody(raw: string, httpStatus: number): BlackballOutcome {
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* Non-JSON body. The LENGTH is the evidence; the body itself is never logged. */
  }
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  return {
    ok: o.status === true,
    httpStatus,
    message:
      typeof o.message === "string" && o.message
        ? o.message
        : raw
          ? `unparseable body (${raw.length} bytes)`
          : "empty body",
    balance: typeof o.balance === "number" && Number.isFinite(o.balance) ? o.balance : null,
    fieldErrors: readFieldErrors(o.data),
    transport: null,
  };
}

export type BlackballMessage = { msisdn: string; text: string; reference: string };

/**
 * POST one batch.
 *
 * Never throws for a GATEWAY verdict — only for a programming error the caller
 * must fix before any network call is made: an oversized batch, or a reference the
 * gateway would reject out of hand. Those throws are deliberate. They are
 * conditions a test can pin and a retry could never clear.
 */
export async function blackballSend(
  env: BlackballEnv,
  messages: readonly BlackballMessage[],
): Promise<BlackballOutcome> {
  if (messages.length === 0) throw new Error("blackball: refusing an empty batch");
  if (messages.length > BATCH_MAX) {
    throw new Error(
      `blackball: ${messages.length} messages exceeds the ${BATCH_MAX}-message ceiling — chunk before calling`,
    );
  }
  for (const m of messages) {
    if (m.reference.length < REFERENCE_MIN_CHARS) {
      throw new Error(
        `blackball: a reference of ${m.reference.length} chars is below the gateway's ${REFERENCE_MIN_CHARS}-char floor`,
      );
    }
  }

  const payload = {
    auth: { clientId: env.clientId, clientSecret: env.clientSecret },
    messages: messages.map((m) => ({
      text: m.text,
      msisdn: toMsisdn255(m.msisdn),
      source: env.senderId,
      reference: m.reference,
      // Always explicit — relying on the gateway's GSM default garbles every non-GSM character.
      coding: smsCodingFor(m.text),
    })),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(env.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      // ⛔ A TRANSPORT FAILURE IS AMBIGUOUS, NOT A REFUSAL. The gateway may have
      // accepted the batch and lost only our half of the reply. The caller records
      // it as unresolved and lets the delivery receipt settle it; it must never
      // retry blindly, which would be a second SMS at a second charge.
      return {
        ok: false,
        httpStatus: 0,
        message: "transport failure",
        balance: null,
        fieldErrors: {},
        transport: String((err as Error)?.message ?? err).slice(0, 200),
      };
    }
    // Read as TEXT then parse, like `selcomFetch`: a non-JSON reply is exactly the
    // case where the raw shape is the evidence, and `res.json()` would throw it away.
    return parseBlackballBody(await res.text(), res.status);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read the account balance — `POST /api/account/balance`, auth only. Sends nothing, costs nothing.
 *
 * ⭐ THE ONLY TRUSTWORTHY BALANCE READ. Not in the vendor PDF; found in their Swagger and measured
 * 2026-09-16: `{"status":true,"message":"Account balance","data":{"name":…,"currency":"TZS",…},
 * "balance":244.0}` — the portal's figure exactly, AFTER the first message's TZS 6 charge.
 * The `balance` on a send reply is pre-charge on success and a meaningless 0.0 on a refusal
 * (decided before authentication), so neither can price anything or clear a floor. This can.
 *
 * ⛔ `balance` is only the account's when `ok` is true — the same envelope, the same rule.
 * Never throws; a transport failure comes back as `transport`, exactly like `blackballSend`.
 */
export async function blackballBalance(env: BlackballEnv): Promise<BlackballOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(new URL("/api/account/balance", env.endpoint).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: { clientId: env.clientId, clientSecret: env.clientSecret } }),
        signal: controller.signal,
      });
    } catch (err) {
      return {
        ok: false,
        httpStatus: 0,
        message: "transport failure",
        balance: null,
        fieldErrors: {},
        transport: String((err as Error)?.message ?? err).slice(0, 200),
      };
    }
    return parseBlackballBody(await res.text(), res.status);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A log-safe one-liner for an audit payload — the `describeSelcom()` counterpart.
 * ⛔ Carries no message text, no msisdn and no credential. Gateway metadata only.
 */
export function describeBlackball(o: BlackballOutcome): string {
  const fields = Object.entries(o.fieldErrors)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
  return [
    o.transport ? `transport=${o.transport}` : `HTTP ${o.httpStatus}`,
    `status=${o.ok}`,
    o.message ? `message=${o.message.slice(0, 200)}` : null,
    o.balance !== null ? `balance=${o.balance}` : null,
    fields ? `fields=${fields.slice(0, 200)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
