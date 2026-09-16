/**
 * test:otp-delivery — the guard on turning phone-code login ON.
 *
 * 🔴 WHAT CHANGES WHEN `OTP_ENABLED=1`. Until now `/auth/otp` redirected away and
 * `CLAUDE.md` said password auth existed only because SMS could not reach a phone. The
 * OTP send was therefore `sms.send(...).catch(() => audit(...))` — fire and forget — and
 * that was DEFENSIBLE: nobody was waiting on the code, so a provider blip cost nothing.
 *
 * ⛔ AS A LOGIN PATH THE SAME LINE IS THE OUTAGE. A swallowed rejection sends the player
 * to a screen counting down five minutes for a code that was never sent, with no way
 * forward and nothing in any log saying why. This suite is the assertion that the
 * swallowed rejection is gone and cannot come back.
 *
 * ⭐ THREE THINGS, NOT ONE. Awaiting alone would still leave a live code nobody received
 * and a rate-limit bucket charged for a send that did not happen. §3 asserts each.
 *
 * Run: npm run test:otp-delivery
 */
import { requestLoginOtp } from "../src/lib/server/auth-service.ts";
import { db } from "../src/lib/server/store.ts";
import { rateCheck } from "../src/lib/server/rate-limit.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

let pass = 0,
  fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

const now = () => new Date().toISOString();
let seq = 0;
async function player(locale: "EN" | "SW" | "ZH" = "SW"): Promise<string> {
  const phone = `+25576${String(++seq).padStart(7, "0")}`;
  await db.user.create({
    id: `usr_otp_${seq}`, phoneE164: phone, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale,
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  return phone;
}

const SMS_ENVS = ["SMS_PROVIDER", "SMS_SENDER_ID", "BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET"];
const clearSms = () => { for (const k of SMS_ENVS) delete process.env[k]; };
function liveProvider() {
  process.env.SMS_PROVIDER = "blackball";
  process.env.SMS_SENDER_ID = "50PICK";
  process.env.BLACKBALL_CLIENT_ID = "cid";
  process.env.BLACKBALL_CLIENT_SECRET = "csec";
}

const realFetch = globalThis.fetch;
const stub = (fn: (init?: RequestInit) => Response | Promise<Response>) => {
  globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => fn(init)) as typeof fetch;
};
const okReply = () =>
  new Response(JSON.stringify({ status: true, message: "Queued", data: null, balance: 250 }), {
    status: 200, headers: { "content-type": "application/json" },
  });
/** Captured verbatim from the live gateway, 2026-09-16. */
const authFailReply = () =>
  new Response(JSON.stringify({ status: false, message: "Invalid credentials", data: null, balance: 0 }), {
    status: 400, headers: { "content-type": "application/json" },
  });

const activeFor = async (phone: string) => (await db.otp.findAllActive(phone, "login")).length;
/** `audit()` is fire-and-forget through a queue; a read in the same tick races the write. */
const settle = () => new Promise((r) => setTimeout(r, 25));
const auditCount = (action: string) => getAuditPage({ limit: 20_000 }).filter((a) => a.action === action).length;

/* ══ §1 · CONTROL — a working gateway issues a usable code ═══════════════════ */
{
  const phone = await player("SW");
  liveProvider();
  stub(okReply);
  const r = await requestLoginOtp({ phone });
  globalThis.fetch = realFetch;
  ok("§1 control: a working gateway returns ok", r.ok === true, r.ok ? "" : `${r.code}: ${r.error}`);
  ok("§1 control: …and the code is LIVE for the player to type", (await activeFor(phone)) === 1);
  clearSms();
}

/* ══ §2 · NO CHANNEL — refuse BEFORE minting anything ═══════════════════════ */
{
  const phone = await player();
  clearSms();
  process.env.SMS_PROVIDER = "blackball"; // selected, but no credentials
  const sentBefore = auditCount("otp.login.sent");
  const r = await requestLoginOtp({ phone });
  await settle();
  ok("§2 an unconfigured provider refuses with SMS_UNDELIVERABLE",
    r.ok === false && r.code === "SMS_UNDELIVERABLE", r.ok ? "returned ok" : String(r.code));
  /**
   * ⛔ "NO LIVE CODE" IS NOT THE ASSERTION — "NOTHING WAS MINTED" IS.
   *
   * This read `activeFor(phone) === 0` and `red:otp-delivery` reported WRONG REASON: with the
   * early refusal removed, the path mints an Otp, the send throws, and the catch CONSUMES it —
   * so there is still no live code and the assertion passed either way. The two states differ
   * in what they leave behind: minting writes an `otp.login.sent` row into the HMAC audit
   * chain, claiming a code was sent on a channel that does not exist. That row is the
   * discriminator, so that row is what this now checks.
   */
  ok("§2 …and no Otp row was created at all",
    (await activeFor(phone)) === 0 && auditCount("otp.login.sent") === sentBefore,
    `otp.login.sent ${sentBefore} -> ${auditCount("otp.login.sent")}`);
  ok("§2 …and the refusal itself is on the record",
    getAuditPage({ limit: 20_000 }).some((a) => a.action === "otp.refused_no_channel"));
  ok("§2 …and the refusal names the password route, not a form error",
    r.ok === false && /password/i.test(r.error));
  clearSms();
}

/* ══ §3 · 🔴 THE GATEWAY REFUSES — all three consequences ═══════════════════ */
{
  const phone = await player();
  liveProvider();
  stub(authFailReply);
  const r = await requestLoginOtp({ phone });
  globalThis.fetch = realFetch;

  // ③ The caller is told the truth. This is the one that produces the dead screen.
  ok("§3 ③ a refusing gateway does NOT return ok",
    r.ok === false && r.code === "SMS_UNDELIVERABLE", r.ok ? "returned ok" : String(r.code));
  // ① A code nobody received must not be live for five minutes.
  ok("§3 ① the minted Otp is CONSUMED, not left live", (await activeFor(phone)) === 0);
  // ② The player must not be locked out for ~30s over OUR failure.
  const after = rateCheck(phone, "otp.resend");
  ok("§3 ② the resend allowance was REFUNDED, so they can retry immediately",
    after.allowed === true, `retryAfter=${after.retryAfterSec}s`);
  clearSms();
}

/* ══ §4 · THE SEND IS AWAITED, not fire-and-forget ══════════════════════════ */
{
  const phone = await player();
  liveProvider();
  let gatewayReturned = false;
  stub(async () => {
    await new Promise((r) => setTimeout(r, 60));
    gatewayReturned = true;
    return okReply();
  });
  const r = await requestLoginOtp({ phone });
  globalThis.fetch = realFetch;
  // ⭐ THE ORDERING IS THE ASSERTION. Under the old fire-and-forget line this flag would
  // still be false when requestLoginOtp resolved — which is precisely how a failure got
  // to be invisible to the caller.
  ok("§4 requestLoginOtp does not resolve before the gateway has answered",
    gatewayReturned === true && r.ok === true);
  clearSms();
}

/* ══ §5 · A HUNG GATEWAY FAILS, rather than never resolving ═════════════════ */
{
  const phone = await player();
  liveProvider();
  process.env.BLACKBALL_TIMEOUT_MS = "150";
  stub((init) =>
    new Promise((_res, rej) => {
      const escape = setTimeout(() => rej(new Error("escape hatch")), 4_000);
      init?.signal?.addEventListener("abort", () => { clearTimeout(escape); rej(new Error("aborted")); });
    }) as unknown as Response,
  );
  const started = Date.now();
  const r = await requestLoginOtp({ phone });
  const elapsed = Date.now() - started;
  globalThis.fetch = realFetch;
  delete process.env.BLACKBALL_TIMEOUT_MS;
  ok("§5 a hung gateway resolves as SMS_UNDELIVERABLE at the timeout, not never",
    r.ok === false && r.code === "SMS_UNDELIVERABLE" && elapsed < 2_000, `elapsed=${elapsed}ms`);
  ok("§5 …and leaves no live code behind", (await activeFor(phone)) === 0);
  // ⛔ A LOST REPLY IS AMBIGUOUS, NOT A REFUSAL. The gateway may hold the message and bill
  // for it; we only lost our half of the conversation. FAILED would invite a retry, and a
  // retry is a second SMS at a second charge. This used to be decided by regex-matching the
  // transport's message text — reword that message and every lost reply became FAILED.
  const lost = (await db.smsMessage.listRecent(50)).find((m) => m.msisdn === phone.replace(/\D/g, ""));
  ok("§5 ⛔ a lost reply is recorded UNKNOWN, never FAILED", lost?.status === "UNKNOWN", lost?.status ?? "(no row)");
  clearSms();
}

/* ══ §6 · THE MESSAGE IS PERSISTED AND ATTRIBUTED ═══════════════════════════ */
{
  const phone = await player("SW");
  liveProvider();
  let sentText = "";
  stub((init) => {
    sentText = (JSON.parse(String(init?.body)) as { messages: { text: string }[] }).messages[0].text;
    return okReply();
  });
  await requestLoginOtp({ phone });
  globalThis.fetch = realFetch;
  const rows = await db.smsMessage.listRecent(20);
  const mine = rows.find((m) => m.msisdn === phone.replace(/\D/g, ""));
  ok("§6 the send is persisted as an SmsMessage row", !!mine);
  ok("§6 …tagged OTP, so the cost floor never refuses a login code", mine?.purpose === "OTP");
  ok("§6 …and attributed to the Otp it carries", mine?.targetType === "Otp" && !!mine?.targetId);
  // 🔴 THE FIELD A DELIVERY RECEIPT IS MATCHED ON. It must be the WIRE form the gateway
  // quotes back, not the `+255…` we store on the user — see the note in sendBatch.
  ok("§6 …and stores the msisdn in the gateway's wire form, not E.164",
    mine?.msisdn === phone.replace(/\D/g, "") && !mine?.msisdn.startsWith("+"), mine?.msisdn);
  // ⛔ THE BODY IS NEVER STORED — it carries the code.
  ok("§6 ⛔ the row records a LENGTH, never the message text",
    typeof mine?.bodyLen === "number" && mine.bodyLen > 0 && !JSON.stringify(mine).includes(sentText.slice(0, 12)));
  clearSms();
}

/* ══ §7 · THE CODE GOES OUT IN THE PLAYER'S LANGUAGE ════════════════════════ */
{
  const sw = await player("SW");
  const en = await player("EN");
  liveProvider();
  const texts: string[] = [];
  stub((init) => {
    texts.push((JSON.parse(String(init?.body)) as { messages: { text: string }[] }).messages[0].text);
    return okReply();
  });
  await requestLoginOtp({ phone: sw });
  await requestLoginOtp({ phone: en });
  globalThis.fetch = realFetch;
  // 🔴 `otpMessage(code, "SW")` WAS HARDCODED although `otpMessage` supports EN/SW/ZH and
  // `User.locale` exists — an open A4 certification finding.
  ok("§7 a SW player gets the Swahili code", /Msimbo 50pick/.test(texts[0] ?? ""), texts[0] ?? "");
  ok("§7 an EN player gets the English one", /50pick code/.test(texts[1] ?? ""), texts[1] ?? "");
  clearSms();
}

/* ══ §8 · SOURCE-LEVEL — the shape that cannot come back ════════════════════ */
{
  // ⛔ COMMENTS STRIPPED FIRST. The fix's own explanation quotes the deleted line verbatim
  // ("this WAS `sms.send(...).catch(...)`"), so a raw-text scan matches the very prose that
  // documents the removal — a guard that fails on its own footnote.
  const src = decomment(readFileSync(new URL("../src/lib/server/auth-service.ts", import.meta.url), "utf8"));
  // Survives a rename of the variable or the audit action; matches the SHAPE.
  ok("§8 ⛔ no fire-and-forget `sms.send(...).catch(` survives in auth-service",
    !/sms\.send\([^;]*\)\s*\.catch\(/s.test(src));
  ok("§8 the OTP path consults smsConfigured() before minting", /smsConfigured\(\)/.test(src));
  ok("§8 …and returns the tokens it spent on a send that did not happen",
    /rateRefundAsync\(/.test(src));
  ok("§8 control: the source was actually read", /async function issueOtp\(/.test(src));
}

console.log(`\notp-delivery: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
