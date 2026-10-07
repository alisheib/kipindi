/**
 * RECOVERY ACCEPTS A PHONE **OR** AN EMAIL.
 *
 * Until 2026-08-25 `requestPasswordReset` took a phone and nothing else, so a
 * player who registered with an email and remembered only that had NO route back
 * into their account — while the sign-in page one click away already offered a
 * Phone/Email switcher. Measured on production the day it was fixed: 66 of 100
 * accounts carry an email.
 *
 * WHAT THIS PINS, and each one is a rule someone could quietly undo:
 *
 *   §1 the discrimination is the SHARED rule (`resolveLoginIdentifier`), so
 *      recovery and sign-in can never disagree about what an email is.
 *   §2 an ADDRESS reaches the account and the link goes to THAT address.
 *   §3 a PHONE still works — the regression the change could have caused.
 *   §4 ⭐ a SHARED address sends a link per account, each bound to its own
 *      account. Sign-in resolves that ambiguity with the password; recovery has
 *      no password, and picking "the first" would strand every other owner.
 *      One production address is on 4 accounts, so this is not hypothetical.
 *   §5 ⛔ ENUMERATION NEUTRALITY: unknown address, unknown number, malformed
 *      input and a real account with no email all return ok and send NOTHING.
 *      If any of them threw, or returned a different shape, one unauthenticated
 *      request would reveal whether a Tanzanian mobile has a gambling account.
 *   §6 ⭐ A COMPLETED RESET (2026-10-06): a weak new password is reported as weak
 *      (it used to read as a dead link, and every new link said the same), the
 *      wrong-password lock is lifted, and every device is signed out — a reset is
 *      what an owner does when they fear someone else is in.
 *   §7 ⛔ A4 (2026-10-06): PHONE_EMAIL_MAP is never a recovery address. A phone
 *      account with no address of its own gets NO mail even when the map names
 *      one (the validator refused every such link anyway); its own address works.
 *   §8 ⭐ A5: ONE token check. The reset page and the action ask the same
 *      validator, so a token with no fingerprint is `used` for both; expired,
 *      email_changed and used stay distinguishable for the page's panel.
 *   §9 ⛔ A2: neutral in TIME as well as shape — the reset mail is not awaited (a
 *      hit waited for Postmark and a miss did not), the per-network bucket exists
 *      and runs after the per-identifier one, and the detached mail still lands.
 *   §10 A6: an honest wait — every rate-limited reply carries `retry=`, the page
 *      counts it down (capped at an hour), and the form stays under "sent" as
 *      Resend, so a mistyped number is not a dead end.
 *   §11 ⛔ A-X1: the settings password change is bounded by the re-auth bucket
 *      (`auth.reauth`): five wrong tries and even the right password waits, and
 *      the sign-in lock is untouched.
 *   §12 ⭐ B1: the destination survives recovery — bound INSIDE the signed token
 *      (the link opens in a mail app's browser), hostile values dropped, links
 *      issued before the field still work, and every hop is wired to carry it.
 *      Each static matcher in §7-§12 has a control proving it fires on the
 *      pre-fix line, so a matcher that cannot fail cannot pass.
 *
 * ⚠️ WHO an email went to is read from the OUTBOX (`EMAIL_OUTBOX_CAPTURE=1`), never
 * from stdout — the log lines mask the recipient (audit F-06), so a stdout assertion
 * could only pass by being relaxed to the masked form, which would destroy what it
 * measures. email.ts says exactly this beside `emailOutbox()`.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { db } from "../src/lib/server/store.ts";
import {
  requestPasswordReset, consumeResetToken, validateResetToken, changePassword, passwordFingerprint,
} from "../src/lib/server/password-reset.ts";
import { resolveLoginIdentifier } from "../src/lib/server/auth-service.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";
import { getActiveSessionId, setActiveSessionId } from "../src/lib/server/session-registry.ts";
import { signSession, verifySession, hashPassword } from "../src/lib/server/crypto.ts";
import { RATE_RULES } from "../src/lib/server/rate-limit.ts";
import { auditFlush, getAuditForTarget } from "../src/lib/server/audit.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const now = new Date().toISOString();
let n = 0;
async function seed(email: string | null, phone?: string) {
  const id = `usr_rst_${++n}`;
  await db.user.create({
    id, phoneE164: phone ?? `+2557990${String(100000 + n).slice(-6)}`,
    passwordHash: "h".repeat(64), passwordSalt: "s".repeat(32),
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE",
    locale: "EN", displayName: `T${n}`, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, email,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  return id;
}
const sent = () => emailOutbox().filter((m) => m.tag === "password-reset");
const linksIn = () => sent().map((m) => (m.html.match(/token=([^"&\s]+)/) ?? [])[1]).filter(Boolean);
/** A source file with its comments removed, so a static matcher reads the code and never the prose explaining the fix. */
const src = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8"));
// Built, never typed as escapes: the file tools decode escapes, and test:source-bytes refuses what they decode to.
const LF = String.fromCharCode(10);
const TAB = String.fromCharCode(9);

// ── §1 · ONE rule, shared with sign-in ───────────────────────────────────────
{
  ok("§1 an address resolves as email", resolveLoginIdentifier("a@b.tz")?.kind === "email");
  ok("§1 a 9-digit MSISDN resolves as phone", resolveLoginIdentifier("712345678")?.kind === "phone");
  ok("§1 nonsense resolves to null", resolveLoginIdentifier("not-a-credential") === null);
}

// ── §2 · an ADDRESS reaches the account, and the link goes to that address ───
{
  clearEmailOutbox();
  await seed("maria.tester@example.com");
  await requestPasswordReset("maria.tester@example.com");
  ok("§2 an email identifier sends exactly one reset link", sent().length === 1, `sent ${sent().length}`);
  ok("§2 …to the address the player typed", sent()[0]?.to === "maria.tester@example.com", sent()[0]?.to);
  ok("§2 …and it carries a reset token", (linksIn()[0] ?? "").length > 20);
}

// ── §3 · a PHONE still works (the regression this change could have caused) ──
{
  clearEmailOutbox();
  await seed("by.phone@example.com", "+255712000901");
  await requestPasswordReset("712000901");
  ok("§3 a phone identifier still sends a link", sent().length === 1, `sent ${sent().length}`);
  ok("§3 …to the address on the account", sent()[0]?.to === "by.phone@example.com", sent()[0]?.to);
}

// ── §4 · ⭐ a SHARED address sends one link per account ──────────────────────
{
  clearEmailOutbox();
  const a = await seed("shared@example.com");
  const b = await seed("shared@example.com");
  const c = await seed("shared@example.com");
  await requestPasswordReset("shared@example.com");
  ok("§4 three accounts on one address → three links", sent().length === 3, `sent ${sent().length}`);
  ok("§4 …every link goes to that address", sent().every((m) => m.to === "shared@example.com"));
  const toks = linksIn();
  ok("§4 …and the tokens are DISTINCT, one per account", new Set(toks).size === 3, `${new Set(toks).size} distinct`);
  ok("§4 …so spending one cannot spend another", toks.length === 3 && a !== b && b !== c);
}

// ── §5 · ⛔ enumeration neutrality, on every branch ──────────────────────────
{
  clearEmailOutbox();
  const r1 = await requestPasswordReset("nobody@nowhere.example");
  ok("§5 unknown address → ok, nothing sent", r1.ok === true && sent().length === 0, `sent ${sent().length}`);

  clearEmailOutbox();
  const r2 = await requestPasswordReset("799999999");
  ok("§5 unknown number → ok, nothing sent", r2.ok === true && sent().length === 0, `sent ${sent().length}`);

  clearEmailOutbox();
  const r3 = await requestPasswordReset("@@@not-a-credential@@@");
  ok("§5 malformed input → ok, nothing sent, no throw", r3.ok === true && sent().length === 0);

  clearEmailOutbox();
  await seed(null, "+255712000902");
  const r4 = await requestPasswordReset("712000902");
  ok("§5 real account with NO email → ok, nothing sent", r4.ok === true && sent().length === 0, `sent ${sent().length}`);

  // ⭐ THE CONTROL. Every §5 case asserts an EMPTY outbox, and an outbox that was
  // never armed is also empty — so without this the whole section would pass with
  // the mailer disconnected. Prove capture still works after the negatives.
  clearEmailOutbox();
  await seed("control@example.com");
  await requestPasswordReset("control@example.com");
  ok("§5 CONTROL — the outbox still captures, so the empties above mean something",
    sent().length === 1, `sent ${sent().length}`);
}

// ── §6 · ⭐ a COMPLETED reset: weak says weak, the lock lifts, every device signs out ─
{
  clearEmailOutbox();
  const id = await seed("locked.out@example.com");
  await db.user.update(id, { lockedUntil: new Date(Date.now() + 30 * 60_000).toISOString(), failedLoginCount: 5 } as never);
  await setActiveSessionId(id, "sess_somebody_else");
  ok("§6 CONTROL — the account starts locked, with a session live on some device",
    !!(await db.user.findById(id))?.lockedUntil && (await getActiveSessionId(id)) === "sess_somebody_else");
  await requestPasswordReset("locked.out@example.com");
  const token = decodeURIComponent(linksIn()[0] ?? "");
  const weak = await consumeResetToken(token, "password123");
  ok("§6 a weak new password is reported as WEAK — not as a dead link", !weak.ok && weak.code === "PW_WEAK", JSON.stringify(weak));
  const done = await consumeResetToken(token, "Kipindi!Reset2026x");
  const after = await db.user.findById(id);
  ok("§6 a strong one completes the reset", done.ok === true, JSON.stringify(done));
  ok("§6 ⭐ …and lifts the wrong-password lock, so the NEW password works at once",
    !after?.lockedUntil && after?.failedLoginCount === 0, `${String(after?.lockedUntil)} · ${String(after?.failedLoginCount)}`);
  ok("§6 ⭐ …and signs out every device — the live session is gone", (await getActiveSessionId(id)) === null);
  const again = await consumeResetToken(token, "Kipindi!Reset2026y");
  ok("§6 the spent link is dead now (LINK_INVALID) — single-use, as before", !again.ok && again.code === "LINK_INVALID", JSON.stringify(again));
}

// ── §7 · ⛔ A4: PHONE_EMAIL_MAP is never a recovery address ──────────────────
{
  clearEmailOutbox();
  process.env.PHONE_EMAIL_MAP = "+255712000903:mapped.only@example.com";
  await seed(null, "+255712000903");
  const r = await requestPasswordReset("712000903");
  ok("§7 ⛔ a phone account with no address of its own, named by PHONE_EMAIL_MAP → ok, and NO reset mail",
    r.ok === true && sent().length === 0, sent().map((m) => m.to).join(", "));

  // ⭐ THE CONTROL: the map is still armed (for this number too), and an account's OWN address still gets its link —
  // one the validator accepts, which a mapped address never could.
  clearEmailOutbox();
  process.env.PHONE_EMAIL_MAP = "+255712000904:mapped.other@example.com";
  await seed("own.addr@example.com", "+255712000904");
  await requestPasswordReset("712000904");
  ok("§7 CONTROL — an account with its own address gets exactly one link, to that address (never the mapped one)",
    sent().length === 1 && sent()[0]?.to === "own.addr@example.com", sent().map((m) => m.to).join(", "));
  const own = await validateResetToken(decodeURIComponent(linksIn()[0] ?? ""));
  ok("§7 …and that link validates", own.ok === true, own.ok ? "" : own.state);
  delete process.env.PHONE_EMAIL_MAP;

  const usesMap = (code: string) => code.includes("resolvePhoneEmail") || code.includes("email-map");
  ok("§7 static — password-reset.ts neither calls resolvePhoneEmail nor imports email-map",
    !usesMap(src("src/lib/server/password-reset.ts")));
  ok("§7 CONTROL — that matcher fires on the pre-fix lines",
    usesMap(`import { resolvePhoneEmail } from "./email-map";`)
      && usesMap(`const email = resolved.kind === "email" ? resolved.value : (user.email || resolvePhoneEmail(user.phoneE164));`));
}

// ── §8 · ⭐ A5: ONE token check, and the states it tells apart ───────────────
{
  clearEmailOutbox();
  const email = "one.check@example.com";
  const id = await seed(email);
  await requestPasswordReset(email);
  const fresh = decodeURIComponent(linksIn()[0] ?? "");
  const v0 = await validateResetToken(fresh);
  ok("§8 a fresh link → ok", v0.ok === true, v0.ok ? "" : v0.state);

  // 🔴 The page used to wave a token with NO fingerprint through and draw the form, which the action then refused.
  // One validator now, so one answer for both.
  const noPwh = signSession({ purpose: "password-reset", userId: id, email, exp: Date.now() + 600000 });
  const v1 = await validateResetToken(noPwh);
  ok("§8 ⭐ a token with NO fingerprint → not ok, state used", !v1.ok && v1.state === "used", v1.ok ? "ok" : v1.state);
  const c1 = await consumeResetToken(noPwh, "Kipindi!Reset2026z");
  ok("§8 …and the action refuses that same token (LINK_INVALID) — the page and the action agree",
    !c1.ok && c1.code === "LINK_INVALID", JSON.stringify(c1));

  const done = await consumeResetToken(fresh, "Kipindi!Reset2026w");
  ok("§8 the fresh link completes a reset", done.ok === true, JSON.stringify(done));
  const v2 = await validateResetToken(fresh);
  ok("§8 after a completed reset the old token → state used", !v2.ok && v2.state === "used", v2.ok ? "ok" : v2.state);

  clearEmailOutbox();
  await requestPasswordReset(email);
  const second = decodeURIComponent(linksIn()[0] ?? "");
  const v3a = await validateResetToken(second);
  ok("§8 CONTROL — a link issued after that reset is good until the address moves", v3a.ok === true, v3a.ok ? "" : v3a.state);
  await db.user.update(id, { email: "moved@example.com" } as never);
  const v3 = await validateResetToken(second);
  ok("§8 after the address changes → state email_changed", !v3.ok && v3.state === "email_changed", v3.ok ? "ok" : v3.state);

  const v4 = await validateResetToken("garbage");
  ok("§8 garbage → state expired", !v4.ok && v4.state === "expired", v4.ok ? "ok" : v4.state);

  const page = src("src/app/auth/reset-password/page.tsx");
  const ownCheck = (code: string) => code.includes("verifySession") || code.includes("passwordFingerprint");
  ok("§8 static — the reset page asks validateResetToken(", page.includes("validateResetToken("));
  ok("§8 static — …and holds no token check of its own (no verifySession, no passwordFingerprint)", !ownCheck(page));
  ok("§8 CONTROL — those matchers fire on the pre-fix lines",
    ownCheck(`const payload = verifySession<{ purpose: string; userId: string; email: string; pwh?: string; exp: number }>(token);`)
      && ownCheck(`if (payload.pwh !== undefined && passwordFingerprint(user.passwordHash) !== payload.pwh) return "invalid";`)
      && !`const state = await checkToken(token);`.includes("validateResetToken("));
}

// ── §9 · ⛔ A2: neutral in TIME — a detached send, and a per-network bucket ───
{
  const pr = src("src/lib/server/password-reset.ts");
  const from = pr.indexOf("export async function requestPasswordReset");
  const to = pr.indexOf("type ResolvedUser");
  const body = from >= 0 && to > from ? pr.slice(from, to) : "";
  ok("§9 fixture — the requestPasswordReset body was found", body.length > 200, `${body.length} chars`);
  const detached = (code: string) => code.includes("void sendEmail(") && !code.includes("await sendEmail(");
  ok("§9 ⛔ the reset mail is NOT awaited — a hit answers as fast as a miss", detached(body));
  ok("§9 CONTROL — that matcher fires on the pre-fix line", !detached(`    await sendEmail({`));

  ok("§9 the per-network rule: 20 per IP, refilling 1 a minute (wide: carrier NAT shares an address)",
    isDeepStrictEqual(RATE_RULES["password_reset.ip"], { capacity: 20, refillPerMin: 1 }), JSON.stringify(RATE_RULES["password_reset.ip"]));
  ok("§9 the re-auth rule (§11's bucket): 5 per account, refilling 1 every 5 minutes",
    isDeepStrictEqual(RATE_RULES["auth.reauth"], { capacity: 5, refillPerMin: 0.2 }), JSON.stringify(RATE_RULES["auth.reauth"]));

  const act = src("src/app/auth/forgot-password/actions.ts");
  const bucketOrder = (code: string) => {
    const perId = code.indexOf(`"password_reset")`);
    const perIp = code.indexOf(`"password_reset.ip"`);
    return perId >= 0 && perIp > perId;
  };
  ok("§9 the forgot-password action asks the per-network bucket", act.includes(`"password_reset.ip"`));
  ok("§9 …AFTER the per-identifier one: sign-in's order, so one player retrying one number never drains a shared NAT budget",
    bucketOrder(act));
  ok("§9 CONTROL — that matcher fires on the pre-fix action (no per-network bucket) and on the reversed order",
    !bucketOrder(`const rl = await rateCheckAsync(resolved.value, "password_reset");`)
      && !bucketOrder(`rateCheckAsync(ip, "password_reset.ip"); rateCheckAsync(resolved.value, "password_reset");`));

  // ⭐ The detached mail still LANDS, and it is in the outbox when the reply returns — §2-§6 read the outbox straight
  // after the await, so their counts still measure what they always did.
  clearEmailOutbox();
  await seed("still.lands@example.com");
  await requestPasswordReset("still.lands@example.com");
  ok("§9 the detached mail is in the outbox when the reply returns (so §2-§6 still find theirs)",
    sent().length === 1 && sent()[0]?.to === "still.lands@example.com", `sent ${sent().length}`);
}

// ── §10 · A6: an honest wait, and a way to resend ─────────────────────────────
{
  const act = src("src/app/auth/forgot-password/actions.ts");
  const rateLimited = (code: string) => code.match(/`[^`]*error=rate_limited[^`]*`/g) ?? [];
  const honest = (code: string) => rateLimited(code).length > 0 && rateLimited(code).every((t) => t.includes("retry="));
  ok("§10 fixture — the action has its rate-limited redirects (per identifier, per network)",
    rateLimited(act).length >= 2, `${rateLimited(act).length}`);
  ok("§10 ⭐ every rate-limited redirect carries retry= in the same template — the page can count the real wait down",
    honest(act));
  ok("§10 CONTROL — that matcher fires on the pre-fix line",
    !honest("redirect(`/auth/forgot-password?error=rate_limited&identifier=${encodeURIComponent(raw)}`);"));

  const page = src("src/app/auth/forgot-password/page.tsx");
  const countsDown = (code: string) => code.includes(`import { RateLimitBanner } from "@/components/auth/rate-limit-banner";`);
  const capped = (code: string) => code.includes("Math.min(3600");
  const offersResend = (code: string) => code.includes("t.common.resendLink");
  ok("§10 the page imports RateLimitBanner (the countdown)", countsDown(page));
  ok("§10 …caps the countdown at an hour (Math.min(3600) — a hand-made link cannot show more", capped(page));
  ok("§10 …and offers Resend once a link was sent (t.common.resendLink)", offersResend(page));
  ok("§10 CONTROL — those matchers fire on the pre-fix lines (a bare sentence, a send-only button)",
    !countsDown(`              {t.common.tooManyAttempts}`) && !capped(`              {t.common.tooManyAttempts}`)
      && !offersResend(`<SubmitButton label={t.common.sendResetLink} pendingLabel={t.common.sending} />`));
  const hiddenWhenSent = (code: string) => code.includes("{!sent && (");
  ok("§10 ⭐ the form is no longer hidden under \"sent\" — a mistyped number is corrected, not stranded", !hiddenWhenSent(page));
  ok("§10 CONTROL — that matcher fires on the pre-fix line", hiddenWhenSent(`          {!sent && (`));
}

// ── §11 · ⛔ A-X1: the settings password change is bounded ───────────────────
{
  const PW = "Kipindi!Current2026";
  const salt = "s".repeat(32);
  const hash = await hashPassword(PW, salt);
  const id = await seed("settings.change@example.com");
  await db.user.update(id, { passwordHash: hash, passwordSalt: salt } as never);

  const first = await changePassword(id, "Wrong!Passw0rd", "N3w!Passw0rd#2026");
  ok("§11 a wrong current password → PW_CURRENT_WRONG, reason password_wrong",
    !first.ok && first.code === "PW_CURRENT_WRONG" && first.reason === "password_wrong", JSON.stringify(first));
  await auditFlush();
  const bad = getAuditForTarget("User", id).filter((e) => e.action === "auth.reauth.bad_password");
  ok("§11 …through the ONE re-auth check: an auth.reauth.bad_password row, purpose password_change",
    bad.length === 1 && bad[0]?.payload?.purpose === "password_change", JSON.stringify(bad.map((e) => e.payload)));

  for (let i = 0; i < 4; i++) await changePassword(id, "Wrong!Passw0rd", "N3w!Passw0rd#2026");
  const right = await changePassword(id, PW, "N3w!Passw0rd#2026");
  ok("§11 ⭐ after five wrong tries even the RIGHT password waits: RATE_LIMITED, with the seconds",
    !right.ok && right.code === "RATE_LIMITED" && right.retryAfterSec > 0, JSON.stringify(right));
  const after = await db.user.findById(id);
  ok("§11 …and the password was NOT changed", after?.passwordHash === hash);
  ok("§11 ⛔ the sign-in lock is untouched (failedLoginCount 0, lockedUntil null): a session holder cannot lock the owner out",
    after?.failedLoginCount === 0 && after?.lockedUntil === null, `${String(after?.failedLoginCount)} · ${String(after?.lockedUntil)}`);

  const id2 = await seed("settings.fresh@example.com");
  await db.user.update(id2, { passwordHash: hash, passwordSalt: salt } as never);
  const fresh = await changePassword(id2, PW, "N3w!Passw0rd#2026");
  ok("§11 CONTROL — a fresh account with the right password → ok (the bucket is per account)", fresh.ok === true, JSON.stringify(fresh));
}

// ── §12 · ⭐ B1: the destination survives recovery ────────────────────────────
{
  const DEST = "/markets/mkt_rst7a?side=YES";
  clearEmailOutbox();
  await seed("next.keeper@example.com");
  await requestPasswordReset("next.keeper@example.com", { next: DEST });
  const token = decodeURIComponent(linksIn()[0] ?? "");
  ok("§12 ⭐ the destination is bound INSIDE the signed token (the link opens in a mail app's browser)",
    verifySession<{ next?: string }>(token)?.next === DEST, JSON.stringify(verifySession<{ next?: string }>(token)?.next));
  const html = sent()[0]?.html ?? "";
  const looseNext = (h: string) => h.split(/token=[^"&\s<]+/).join("").includes("next=");
  ok("§12 …and nowhere outside it: the mail carries no loose next= parameter", html.length > 0 && !looseNext(html));
  ok("§12 CONTROL — that matcher fires on a link that carries one outside the token",
    looseNext(`<a href="https://50pick.tz/auth/reset-password?token=abc.def&next=%2Fmarkets%2Fmkt_rst7a">`));
  const done = await consumeResetToken(token, "Kipindi!Reset2026n");
  ok("§12 ⭐ the completed reset hands the destination back to the action",
    done.ok === true && done.next === DEST, JSON.stringify(done));

  // ⛔ A hostile destination never enters a token. Each on its own fresh account, so one cannot mask another.
  const hostile = ["//evil.example", "/" + TAB + "/evil.example", "https://evil.example/x", "/auth/login", "/" + "a".repeat(600)];
  for (const [i, h] of hostile.entries()) {
    clearEmailOutbox();
    const addr = `hostile.next${i}@example.com`;
    await seed(addr);
    await requestPasswordReset(addr, { next: h });
    const p = verifySession<{ next?: string }>(decodeURIComponent(linksIn()[0] ?? ""));
    ok(`§12 ⛔ a hostile next ${JSON.stringify(h).slice(0, 30)} never enters the token — and the link still goes out`,
      sent().length === 1 && p !== null && p.next === undefined, JSON.stringify(p?.next));
  }

  // A link issued before the field existed still completes, and hands back "".
  const legacyEmail = "legacy.link@example.com";
  const lid = await seed(legacyEmail);
  const lu = await db.user.findById(lid);
  const legacy = signSession({
    purpose: "password-reset", userId: lid, email: legacyEmail, pwh: passwordFingerprint(lu?.passwordHash), exp: Date.now() + 600000,
  });
  const lr = await consumeResetToken(legacy, "Kipindi!Reset2026m");
  ok("§12 a legacy link (no next in its token) still completes, with next \"\"", lr.ok === true && lr.next === "", JSON.stringify(lr));

  clearEmailOutbox();
  const unknown = await requestPasswordReset("nobody.next@example.com", { next: DEST });
  ok("§12 an unknown address with a next → ok, nothing sent (still neutral)", unknown.ok === true && sent().length === 0, `sent ${sent().length}`);

  // ── the wiring, read from the code (decommented) ──
  const fpPage = src("src/app/auth/forgot-password/page.tsx");
  const hiddenNext = (code: string) => code.includes(`<input type="hidden" name="next"`);
  ok("§12 wiring — the forgot page posts next in a hidden field", hiddenNext(fpPage));
  ok("§12 CONTROL — that matcher fires on the pre-fix form (no hidden next)",
    !hiddenNext(`<form action={requestResetAction} className="space-y-4">`));
  const signInWired = (code: string) => (code.match(/href=\{loginHref/g) ?? []).length >= 2 && !code.includes(`href="/auth/login"`);
  ok("§12 wiring — both sign-in links on the forgot page carry it (loginHref twice, no bare /auth/login)", signInWired(fpPage));
  ok("§12 CONTROL — that matcher fires on the pre-fix line", !signInWired(`href="/auth/login"`));

  const fpAct = src("src/app/auth/forgot-password/actions.ts");
  const passesNext = (code: string) => code.includes("requestPasswordReset(resolved.value, { next })");
  ok("§12 wiring — the action hands next to requestPasswordReset", passesNext(fpAct));
  ok("§12 CONTROL — that matcher fires on the pre-fix line", !passesNext(`await requestPasswordReset(resolved.value);`));
  const NEXT_QS = "$" + "{nextQs}";
  const redirectsCarry = (code: string) => {
    const calls = code.split("redirect(").slice(1).map((c) => c.split(LF)[0]);
    return calls.length > 0 && calls.every((c) => c.includes(NEXT_QS));
  };
  ok("§12 wiring — every redirect in the action carries next (the same suffix on each, so no branch stands out)",
    redirectsCarry(fpAct));
  ok("§12 CONTROL — that matcher fires on the pre-fix line",
    !redirectsCarry(`if (!raw) redirect("/auth/forgot-password?error=identifier_required");`));

  const rpAct = src("src/app/auth/reset-password/actions.ts");
  const successCarries = (code: string) => {
    const success = code.split(LF).find((l) => l.includes("/auth/login?reset=1")) ?? "";
    return success.includes("result.next") && !code.includes(`"/auth/login?reset=1"`);
  };
  ok("§12 wiring — the reset action's success redirect carries result.next", successCarries(rpAct));
  ok("§12 CONTROL — that matcher fires on the pre-fix line", !successCarries(`redirect("/auth/login?reset=1" as never);`));

  const rpPage = src("src/app/auth/reset-password/page.tsx");
  const bareLinks = (code: string) => code.includes(`href="/auth/login"`) || code.includes(`href="/auth/forgot-password"`);
  ok("§12 wiring — the reset page has no bare sign-in or new-link href (every way off it keeps next)", !bareLinks(rpPage));
  ok("§12 CONTROL — that matcher fires on the pre-fix lines",
    bareLinks(`<Link href="/auth/login" className="btn btn-ghost btn-lg btn-pill w-full">`)
      && bareLinks(`<Link href="/auth/forgot-password" className="btn btn-primary btn-lg btn-pill w-full">`));
}

console.log(`\nreset-identifier: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
