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
 * ⭐ AND WHAT THE CODE MAY DO ONCE IT ARRIVES (route audit 2026-10-06). §8 pins the door's shape: one flag
 * (`otp-door.ts`) shuts the page AND every code action, the server alone names the purpose, the one-time-code
 * SIGN-UP is gone, and the code's life is one figure everywhere it is told. §9 drives the real service: a code
 * stands in for the PASSWORD only — a two-step account still meets its authenticator, a staff account is sent to
 * the password form, and only a LOGIN code signs anybody in.
 *
 * Run: npm run test:otp-delivery
 */
import { requestLoginOtp, verifyOtpAndAuth } from "../src/lib/server/auth-service.ts";
import { db } from "../src/lib/server/store.ts";
import { rateCheck } from "../src/lib/server/rate-limit.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";
import { hashOtp } from "../src/lib/server/crypto.ts";
import { otpMessage } from "../src/lib/server/sms.ts";
import { phoneCodeSignInEnabled } from "../src/lib/server/otp-door.ts";
import { enrollPlayer2fa, confirmPlayer2fa } from "../src/lib/server/player-2fa.ts";
import { getActiveSessionId } from "../src/lib/server/session-registry.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { createHmac } from "node:crypto";
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
async function player(locale: "EN" | "SW" | "ZH" = "SW", role = "PLAYER", status = "ACTIVE"): Promise<string> {
  const phone = `+25576${String(++seq).padStart(7, "0")}`;
  await db.user.create({
    id: `usr_otp_${seq}`, phoneE164: phone, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status, locale,
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

  // ── the code door's shape (route audit 2026-10-06) ──
  const CR = String.fromCharCode(13);
  const readCode = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).split(CR).join("");
  /** One exported function's text: from `export async function <name>(` to the next exported function, or the end. */
  const fnSlice = (code: string, name: string) => {
    const at = code.indexOf(`export async function ${name}(`);
    if (at < 0) return "";
    const end = code.indexOf("export async function ", at + 10);
    return code.slice(at, end < 0 ? undefined : end);
  };
  const ACTIONS = readCode("src/app/auth/login/actions.ts");
  const PAGE = readCode("src/app/auth/otp/page.tsx");
  const VALIDATORS = readCode("src/lib/server/validators.ts");
  const VERIFY = fnSlice(src, "verifyOtpAndAuth");
  const VERIFY_ACTION = fnSlice(ACTIONS, "verifyLoginOtpAction");

  ok("§8 ⛔ the sign-in actions never read a purpose the browser names", ACTIONS.length > 2_000 && !ACTIONS.includes('formData.get("purpose")'));
  const schemaAt = VALIDATORS.indexOf("export const OtpVerifySchema");
  const schema = schemaAt < 0 ? "" : VALIDATORS.slice(schemaAt, VALIDATORS.indexOf("export ", schemaAt + 10));
  ok("§8 ⛔ …and the verify schema has no purpose field to carry one", schema.length > 20 && !schema.includes("purpose"), schema.slice(0, 120));
  // ⚠️ `passwordRequired: true` — the staff branch's own answer, not the return TYPE (which names the field first).
  const staffAt = VERIFY.indexOf("passwordRequired: true");
  const mintAt = VERIFY.indexOf("createSession(");
  ok("§8 the service names the purpose itself (a LOGIN code), and sends staff to the password before any session is minted",
    VERIFY.length > 1_000 && VERIFY.includes('"login" as const') && staffAt > 0 && mintAt > staffAt,
    `passwordRequired: true@${staffAt} createSession@${mintAt}`);
  ok("§8 …and the code action carries a staff account to the staff form (/auth/admin)", VERIFY_ACTION.includes("/auth/admin"));
  ok("§8 ⛔ the one-time-code SIGN-UP is gone: no requestRegisterOtp, no in-memory pending-registration map",
    !src.includes("requestRegisterOtp") && !src.includes("__50PICK_PENDING_REG"));
  for (const [name, call] of [["startLoginOtpAction", "await requestLoginOtp("], ["resendOtpAction", "await requestLoginOtp("], ["verifyLoginOtpAction", "await verifyOtpAndAuth("]] as const) {
    const body = fnSlice(ACTIONS, name);
    const gate = body.indexOf("phoneCodeSignInEnabled()");
    const reach = body.indexOf(call);
    ok(`§8 ${name} refuses while OTP_ENABLED is off, before it reaches the service`, gate > 0 && reach > 0 && gate < reach,
      `flag@${gate} service@${reach}`);
  }
  ok("§8 ⛔ OTP_ENABLED is read in ONE place (otp-door.ts) — neither the page nor the actions read the env themselves",
    !PAGE.includes("process.env.OTP_ENABLED") && !ACTIONS.includes("process.env.OTP_ENABLED") && PAGE.length > 1_000);
  ok("§8 the dormant page bounces to sign-in WITH the destination",
    PAGE.indexOf("sanitizeNext(") > 0 && PAGE.indexOf("sanitizeNext(") < PAGE.indexOf("phoneCodeSignInEnabled()") && PAGE.includes("/auth/login?next="),
    `sanitizeNext@${PAGE.indexOf("sanitizeNext(")} flag@${PAGE.indexOf("phoneCodeSignInEnabled()")}`);

  // EXECUTED · the flag: open for exactly "1", shut for anything else (the env restored afterwards).
  {
    const had = Object.prototype.hasOwnProperty.call(process.env, "OTP_ENABLED");
    const was = process.env.OTP_ENABLED;
    const withFlag = (v: string | undefined) => {
      if (v === undefined) delete process.env.OTP_ENABLED; else process.env.OTP_ENABLED = v;
      return phoneCodeSignInEnabled();
    };
    const seen = { one: withFlag("1"), zero: withFlag("0"), empty: withFlag(""), padded: withFlag(" 1"), unset: withFlag(undefined) };
    if (had) process.env.OTP_ENABLED = was as string; else delete process.env.OTP_ENABLED;
    ok("§8 the flag opens the code door ONLY for exactly \"1\" — \"0\", \"\", \" 1\" and unset keep it shut",
      seen.one && !seen.zero && !seen.empty && !seen.padded && !seen.unset, JSON.stringify(seen));
  }

  // ⭐ THE CODE'S LIFE IS ONE FIGURE. The page told players "10 minutes" while the code lived five; every place that
  // tells the player the life must say what OTP_TTL_MS says.
  {
    const rawAuth = readFileSync(new URL("../src/lib/server/auth-service.ts", import.meta.url), "utf8");
    const mins = Number(/const OTP_TTL_MS = (\d+) \* 60 \* 1000;/.exec(rawAuth)?.[1] ?? NaN);
    const countdown = readFileSync(new URL("../src/components/auth/otp-expiry-countdown.tsx", import.meta.url), "utf8");
    const ttlFactors = /const OTP_TTL_SEC = ([\d\s*]+);/.exec(countdown)?.[1] ?? "";
    const ttlSec = ttlFactors ? ttlFactors.split("*").map((x) => Number(x.trim())).reduce((a, b) => a * b, 1) : NaN;
    const told: Array<[string, boolean]> = [
      ["en wrongAttemptsHint", dict.en.common.wrongAttemptsHint.includes(`after ${mins} minutes`)],
      ["sw wrongAttemptsHint", dict.sw.common.wrongAttemptsHint.includes(`dakika ${mins}`)],
      ["zh wrongAttemptsHint", dict.zh.common.wrongAttemptsHint.includes(`${mins}分钟`)],
      ["EN SMS", otpMessage("123456", "EN").includes(`${mins} min`)],
      ["SW SMS", otpMessage("123456", "SW").toLowerCase().includes(`dakika ${mins}`)],
      ["ZH SMS", otpMessage("123456", "ZH").includes(`${mins}分钟`)],
      ["countdown OTP_TTL_SEC", ttlSec / 60 === mins],
    ];
    const off = told.filter(([, same]) => !same).map(([where]) => where);
    ok("§8 ⭐ the code's life is ONE figure: OTP_TTL_MS, the three-language hint, the three SMS texts and the countdown all say the same minutes",
      Number.isFinite(mins) && mins > 0 && off.length === 0, `OTP_TTL_MS ${mins} min · off: ${off.join(", ") || "none"}`);
  }
}

/* ══ §9 · THE CODE SIGNS IN — AND ONLY SIGNS IN (route audit 2026-10-06) ═══ */
/**
 * 🔴 The dormant code door ignored the second factor, gave a staff account the console without its password
 * (production runs DISABLE_ADMIN_TOTP=true), and consumed whatever purpose the browser named. Driven here through the
 * real `verifyOtpAndAuth` with a code really issued by `requestLoginOtp`. ⚠️ A session that IS minted throws at the
 * cookie (no request scope in a script) AFTER the registry row is written — so `getActiveSessionId` is the witness.
 */
{
  const base32Decode = (str: string): Buffer => {
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const s = str.replace(/=+$/g, "").toUpperCase().replace(/\s/g, "");
    let bits = 0, value = 0; const out: number[] = [];
    for (const c of s) { const i = A.indexOf(c); if (i < 0) continue; value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; } }
    return Buffer.from(out);
  };
  const totpNow = (secretB32: string, offsetSteps = 0): string => {
    const secret = base32Decode(secretB32);
    const counter = Math.floor(Date.now() / 1000 / 30) + offsetSteps;
    const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
    const h = createHmac("sha1", secret).update(buf).digest();
    const o = h[h.length - 1] & 0x0f;
    const bin = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
    return String(bin % 1_000_000).padStart(6, "0");
  };
  const idOf = async (phone: string) => (await db.user.findByPhone(phone))?.id ?? "";
  /** A real login code: issued by requestLoginOtp through a working (stubbed) gateway, read off the SMS it sent. */
  const codeFor = async (phone: string): Promise<string> => {
    liveProvider();
    let text = "";
    stub((init) => {
      text = (JSON.parse(String(init?.body)) as { messages: { text: string }[] }).messages[0].text;
      return okReply();
    });
    try { await requestLoginOtp({ phone }); } finally { globalThis.fetch = realFetch; clearSms(); }
    return /(\d{6})/.exec(text)?.[1] ?? "";
  };
  type VerifyResult = Awaited<ReturnType<typeof verifyOtpAndAuth>>;
  const signIn = async (phone: string, code: string): Promise<{ r: VerifyResult | null; thrown: string }> => {
    try { return { r: await verifyOtpAndAuth({ phone, code }), thrown: "" }; }
    catch (err) { return { r: null, thrown: String((err as Error)?.message ?? err) }; }
  };
  const reachedSession = async (run: { r: VerifyResult | null; thrown: string }, id: string) =>
    run.r === null && /cookies|request scope/i.test(run.thrown) && (await getActiveSessionId(id)) !== null;
  const auditOf = async (action: string, id: string) => {
    await auditFlush();
    return getAuditPage({ limit: 20_000 }).filter((a) => a.action === action && a.targetId === id);
  };
  const say = (run: { r: VerifyResult | null; thrown: string }) => run.r ? JSON.stringify(run.r) : `threw: ${run.thrown.slice(0, 60)}`;

  // CONTROL — a plain player's code reaches the session, or every refusal below proves only that nothing works.
  const plain = await player("EN");
  const plainId = await idOf(plain);
  const plainCode = await codeFor(plain);
  const plainRun = await signIn(plain, plainCode);
  ok("§9 control: a plain player's code reaches the session (the only throw is the cookie's)",
    plainCode.length === 6 && await reachedSession(plainRun, plainId), `code ${plainCode.length} digit(s) · ${say(plainRun)}`);

  // ⛔ THE SECOND FACTOR. Shape-agnostic secret read: the enrolment's return shape is being widened in parallel.
  const tfa = await player("EN");
  const tfaId = await idOf(tfa);
  const enr = (await enrollPlayer2fa(tfaId)) as { secretBase32?: string };
  const secret = enr.secretBase32 ?? "";
  const confirmed = await confirmPlayer2fa(tfaId, totpNow(secret));
  const tfaCode = await codeFor(tfa);
  const tfaRun = await signIn(tfa, tfaCode);
  const challenged = (await auditOf("user.login.2fa_challenge", tfaId)).some((a) => (a.payload as { via?: string } | undefined)?.via === "otp");
  ok("§9 ⛔ a two-step account's code stops at the authenticator: twoFactorRequired, NO session, the challenge audited via otp, and no live login code left",
    confirmed.ok === true && tfaRun.r?.ok === true && tfaRun.r.data?.twoFactorRequired === true
      && (await getActiveSessionId(tfaId)) === null && challenged && (await activeFor(tfa)) === 0,
    `enrolled ${confirmed.ok} · ${say(tfaRun)} · challenge audited ${challenged} · live codes ${await activeFor(tfa)}`);

  // ⛔ STAFF. A code proves the number, never the password — and production's console sits behind the password alone.
  const staff = await player("EN", "ADMIN");
  const staffId = await idOf(staff);
  const staffRun = await signIn(staff, await codeFor(staff));
  const staffAudited = (await auditOf("auth.otp.staff_password_required", staffId)).length > 0;
  const staffLogin = (await auditOf("user.login", staffId)).length;
  ok("§9 ⛔ a STAFF account's code never opens the console: passwordRequired, role ADMIN, NO session, audited — and no user.login row",
    staffRun.r?.ok === true && staffRun.r.data?.passwordRequired === true && staffRun.r.data?.role === "ADMIN"
      && (await getActiveSessionId(staffId)) === null && staffAudited && staffLogin === 0,
    `${say(staffRun)} · audited ${staffAudited} · user.login rows ${staffLogin}`);

  // CONTROL — an AGENT is not staff (the sign-in actions' own test): the code reaches the session.
  const agent = await player("EN", "AGENT");
  const agentId = await idOf(agent);
  const agentRun = await signIn(agent, await codeFor(agent));
  ok("§9 control: an AGENT is not staff — the code reaches the session", await reachedSession(agentRun, agentId), say(agentRun));

  // The account gate runs BEFORE the staff rule: a suspended staff account is told it is unavailable, nothing more.
  const frozenStaff = await player("EN", "ADMIN", "SUSPENDED");
  const frozenRun = await signIn(frozenStaff, await codeFor(frozenStaff));
  ok("§9 a SUSPENDED staff account answers SUSPENDED — the account gate comes first",
    frozenRun.r?.ok === false && frozenRun.r.code === "SUSPENDED", say(frozenRun));

  // ⛔ THE PURPOSE IS THE SERVER'S. A live REGISTER code for the same number must not sign anyone in.
  const other = await player("EN");
  const otherId = await idOf(other);
  const REG_CODE = "135790";
  const salt = `regsalt${seq}`;
  await db.otp.create({
    id: `otp_reg_${seq}`, phoneE164: other, email: null, hashedCode: await hashOtp(REG_CODE, salt), salt,
    purpose: "register", attempts: 0, consumedAt: null,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), createdAt: new Date().toISOString(),
  } as never);
  const planted = (await db.otp.findAllActive(other, "register")).length;
  const otherRun = await signIn(other, REG_CODE);
  ok("§9 only a LOGIN code signs in: a live REGISTER code for the same number answers EXPIRED and mints no session",
    planted === 1 && otherRun.r?.ok === false && otherRun.r.code === "EXPIRED" && (await getActiveSessionId(otherId)) === null,
    `planted register codes ${planted} · ${say(otherRun)}`);
}

console.log(`\notp-delivery: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
