/**
 * SIGN-IN MUST NOT REVEAL WHO HAS AN ACCOUNT.
 *
 * Found by driving the live site: one unauthenticated POST per phone number
 * told you whether that number had a 50pick account. A registered number with a
 * wrong password redirected to `?error=wrong_credentials`; an unregistered one
 * to `?error=no_account`. For a licensed real-money gambling operator that is a
 * privacy leak, not a UX nicety — and the same repo's forgot-password action had
 * always been careful about it ("always show sent … to prevent phone
 * enumeration"). MODULE-CERTIFICATION-PROGRAM §A exits on "enumeration-neutral
 * *proven by timing distribution*"; this is the regression lock for it.
 *
 * Worse than existence: the SELF_EXCLUDED / SUSPENDED / CLOSED gates ran BEFORE
 * the password was checked, so a prober could learn that a given Tanzanian
 * mobile belonged to someone who had self-excluded from gambling. Those gates
 * now run only after the password is proven — the account is still refused a
 * session, we simply no longer announce why to a stranger.
 *
 * Also locks the phone-shape fix: `tzPhone` accepts `0…`, `255…`, `+255…` and
 * the bare 9 digits, and the sign-in/registration widget must not narrow that.
 */
import { db } from "../src/lib/server/store.ts";
import { registerWithPassword, loginWithPassword } from "../src/lib/server/auth-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const PW = "QaEnum!2026x";
const REGISTERED = "+255700900101";
const UNREGISTERED = "+255700900999";

/**
 * SCOPE NOTE (same constraint as auth-email-integrity.test.mts): a SUCCESSFUL
 * register/login mints a session COOKIE, which needs a Next request scope that a
 * plain script does not have. Everything this test asserts on returns BEFORE that
 * point — the refusals ARE the subject — so we call the real function and treat
 * the cookie throw as "it got all the way to success".
 */
try {
  await registerWithPassword({
    phone: REGISTERED, email: "enum.test@50pick.tz",
    password: PW, passwordConfirm: PW, dob: "1990-01-01",
    acceptTerms: true, acceptAge: true,
  } as never);
} catch { /* reached session creation ⇒ the account exists */ }
ok("fixture registers", !!(await db.user.findByPhone(REGISTERED)));

// ── 1. Unknown vs known must be indistinguishable ──────────────────────────
const known = await loginWithPassword({ identifier: REGISTERED, password: "wrong-password-here" });
const unknown = await loginWithPassword({ identifier: UNREGISTERED, password: "wrong-password-here" });

ok("wrong password on a REAL account is refused", !known.ok);
ok("unknown account is refused", !unknown.ok);
ok(
  "same error CODE for known and unknown",
  !known.ok && !unknown.ok && known.code === unknown.code,
  `known=${(known as { code?: string }).code} unknown=${(unknown as { code?: string }).code}`,
);
ok(
  "same error COPY for known and unknown",
  !known.ok && !unknown.ok && known.error === unknown.error,
  `known="${(known as { error?: string }).error}" unknown="${(unknown as { error?: string }).error}"`,
);
ok(
  "no NOT_FOUND leaks out of sign-in",
  (known as { code?: string }).code !== "NOT_FOUND" && (unknown as { code?: string }).code !== "NOT_FOUND",
);

// ── 2. Status must not be discoverable without the password ────────────────
const excluded = await db.user.findByPhone(REGISTERED);
await db.user.update(excluded!.id, { status: "SELF_EXCLUDED" });

const gatedWrongPw = await loginWithPassword({ identifier: REGISTERED, password: "still-wrong" });
ok(
  "self-excluded account with WRONG password looks like any other wrong password",
  !gatedWrongPw.ok && (gatedWrongPw as { code?: string }).code !== "SUSPENDED",
  `code=${(gatedWrongPw as { code?: string }).code} — a prober must not learn the account self-excluded`,
);
ok(
  "…and does not name self-exclusion in the message",
  !/exclusion/i.test((gatedWrongPw as { error?: string }).error ?? ""),
  (gatedWrongPw as { error?: string }).error,
);

const gatedRightPw = await loginWithPassword({ identifier: REGISTERED, password: PW });
ok(
  "self-excluded account with the CORRECT password is still refused",
  !gatedRightPw.ok && (gatedRightPw as { code?: string }).code === "SUSPENDED",
  `code=${(gatedRightPw as { code?: string }).code}`,
);
ok(
  "…and the owner IS told why",
  /exclusion/i.test((gatedRightPw as { error?: string }).error ?? ""),
  (gatedRightPw as { error?: string }).error,
);

// ── 3. Timing: an unknown identifier must still cost a password verify ─────
const t = async (fn: () => Promise<unknown>) => {
  const s = process.hrtime.bigint();
  await fn();
  return Number(process.hrtime.bigint() - s) / 1e6;
};
const runs = 5;
let unknownMs = 0;
for (let i = 0; i < runs; i++) {
  // Must be a WELL-FORMED but unregistered number: +255 followed by exactly 9
  // digits starting 6 or 7. A malformed one is rejected by the identifier parser
  // long before the password path and would measure nothing (it did, first try).
  const identifier = `+255${700903000 + i}`;
  unknownMs += await t(() => loginWithPassword({ identifier, password: "wrong-" + i }));
}
unknownMs /= runs;
console.log(`  timing: unknown-identifier avg ${unknownMs.toFixed(1)}ms (must not be ~0 — scrypt is burned)`);
ok(
  "unknown identifier still performs password work",
  unknownMs > 5,
  `${unknownMs.toFixed(2)}ms — an instant refusal is itself the enumeration oracle`,
);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
