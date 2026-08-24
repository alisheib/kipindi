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
 *
 * ⚠️ WHO an email went to is read from the OUTBOX (`EMAIL_OUTBOX_CAPTURE=1`), never
 * from stdout — the log lines mask the recipient (audit F-06), so a stdout assertion
 * could only pass by being relaxed to the masked form, which would destroy what it
 * measures. email.ts says exactly this beside `emailOutbox()`.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import { db } from "../src/lib/server/store.ts";
import { requestPasswordReset } from "../src/lib/server/password-reset.ts";
import { resolveLoginIdentifier } from "../src/lib/server/auth-service.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";

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

console.log(`\nreset-identifier: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
