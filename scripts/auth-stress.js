/**
 * Auth stress test — 100+ concurrent login/register/otp attempts.
 * Run: node scripts/auth-stress.js http://localhost:3000
 *
 * Tests:
 *  1. Concurrent registration with SAME phone (race condition → duplicate user?)
 *  2. Concurrent login with SAME phone (failed-count corruption?)
 *  3. Concurrent registration with DIFFERENT phones (rate limit fairness)
 *  4. Rapid sequential login with wrong password (lockout correctness)
 *  5. Malformed input flood (validation under load)
 */

const BASE = process.argv[2] || "http://localhost:3000";

async function postForm(path, body) {
  const fd = new URLSearchParams(body);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: fd.toString(),
      redirect: "manual", // don't follow redirects — check Location header
    });
    const loc = r.headers.get("location") || "";
    return { status: r.status, location: loc, ok: r.status >= 200 && r.status < 400 };
  } catch (err) {
    return { status: 0, location: "", ok: false, error: String(err) };
  }
}

function phone(n) {
  return `+2557${String(10000000 + n).slice(-8)}`;
}

const results = { pass: 0, fail: 0, errors: [] };
function check(label, cond, detail) {
  if (cond) { results.pass++; }
  else { results.fail++; results.errors.push(`FAIL: ${label} — ${detail}`); }
}

async function test1_duplicateRegistration() {
  console.log("\n=== TEST 1: 20 concurrent registrations, SAME phone ===");
  const p = phone(9999);
  const pw = "StressTest2026!";
  const promises = Array.from({ length: 20 }, () =>
    postForm("/auth/register", {
      phone: p, password: pw, passwordConfirm: pw,
      dob: "1995-06-15", acceptTerms: "true", acceptAge: "true",
    })
  );
  const res = await Promise.all(promises);
  const successes = res.filter(r => r.location && !r.location.includes("error="));
  const dupes = res.filter(r => r.location?.includes("error=exists"));
  const rateLimited = res.filter(r => r.location?.includes("error=rate_limited"));
  const invalid = res.filter(r => r.location?.includes("error=invalid"));
  console.log(`  Successes: ${successes.length}, Dupes: ${dupes.length}, Rate-limited: ${rateLimited.length}, Invalid: ${invalid.length}`);
  check("Duplicate registration", successes.length <= 1, `${successes.length} successes (expected 0 or 1)`);
}

async function test2_concurrentLogin() {
  console.log("\n=== TEST 2: 30 concurrent logins, SAME phone, correct password ===");
  // First register the user
  const p = phone(8888);
  const pw = "LoginTest2026!";
  await postForm("/auth/register", {
    phone: p, password: pw, passwordConfirm: pw,
    dob: "1990-03-20", acceptTerms: "true", acceptAge: "true",
  });
  // Now 30 concurrent logins
  const promises = Array.from({ length: 30 }, () =>
    postForm("/auth/login", { phone: p, password: pw })
  );
  const res = await Promise.all(promises);
  const successes = res.filter(r => r.location && !r.location.includes("error="));
  const rateLimited = res.filter(r => r.location?.includes("error=rate_limited"));
  const wrongCreds = res.filter(r => r.location?.includes("error=wrong_credentials"));
  console.log(`  Successes: ${successes.length}, Rate-limited: ${rateLimited.length}, Wrong-creds: ${wrongCreds.length}`);
  check("Concurrent login", wrongCreds.length === 0, `${wrongCreds.length} false wrong-credential errors`);
}

async function test3_massRegistration() {
  console.log("\n=== TEST 3: 50 concurrent registrations, DIFFERENT phones ===");
  const pw = "MassReg2026!!";
  const promises = Array.from({ length: 50 }, (_, i) =>
    postForm("/auth/register", {
      phone: phone(7000 + i), password: pw, passwordConfirm: pw,
      dob: "1998-01-01", acceptTerms: "true", acceptAge: "true",
    })
  );
  const res = await Promise.all(promises);
  const successes = res.filter(r => r.location && !r.location.includes("error="));
  const rateLimited = res.filter(r => r.location?.includes("error=rate_limited"));
  const invalid = res.filter(r => r.location?.includes("error=invalid"));
  console.log(`  Successes: ${successes.length}, Rate-limited: ${rateLimited.length}, Invalid: ${invalid.length}`);
  // IP rate limit is 10 per 20min — at most 10 should succeed
  check("Mass registration rate limit", successes.length <= 15, `${successes.length} successes (expected ≤15 due to IP rate limit)`);
}

async function test4_bruteForce() {
  console.log("\n=== TEST 4: 10 sequential wrong-password logins (lockout test) ===");
  const p = phone(6666);
  const pw = "Lockout2026!!";
  await postForm("/auth/register", {
    phone: p, password: pw, passwordConfirm: pw,
    dob: "1992-07-10", acceptTerms: "true", acceptAge: "true",
  });
  const results4 = [];
  for (let i = 0; i < 10; i++) {
    const r = await postForm("/auth/login", { phone: p, password: "WRONG_" + i });
    results4.push(r);
  }
  const wrongCreds = results4.filter(r => r.location?.includes("error=wrong_credentials"));
  const locked = results4.filter(r => r.location?.includes("error=rate_limited"));
  console.log(`  Wrong-creds: ${wrongCreds.length}, Locked: ${locked.length}`);
  check("Brute force lockout", locked.length >= 1, `${locked.length} lockouts (expected ≥1 after 5 wrong)`);
  // Now try correct password — should be locked
  const afterLock = await postForm("/auth/login", { phone: p, password: pw });
  const isLocked = afterLock.location?.includes("error=rate_limited");
  console.log(`  Correct password after lockout: ${isLocked ? "LOCKED (correct)" : "ALLOWED (bug!)"}`);
  check("Lockout persists", isLocked, "Correct password should still be locked");
}

async function test5_malformedInput() {
  console.log("\n=== TEST 5: 50 concurrent malformed inputs ===");
  const junk = [
    { phone: "", password: "" },
    { phone: "not_a_phone", password: "x" },
    { phone: "+255712345678", password: "" },
    { phone: "' OR 1=1 --", password: "hack" },
    { phone: "+255712345678".repeat(100), password: "a".repeat(10000) },
  ];
  const promises = [];
  for (let i = 0; i < 50; i++) {
    const input = junk[i % junk.length];
    promises.push(postForm("/auth/login", input));
    promises.push(postForm("/auth/register", {
      ...input, passwordConfirm: input.password,
      dob: "invalid", acceptTerms: "true", acceptAge: "true",
    }));
  }
  const res = await Promise.all(promises);
  const serverErrors = res.filter(r => r.status >= 500);
  const crashes = res.filter(r => r.status === 0);
  console.log(`  Total: ${res.length}, 5xx: ${serverErrors.length}, Crashes: ${crashes.length}`);
  check("No server errors on malformed input", serverErrors.length === 0, `${serverErrors.length} server errors`);
  check("No crashes on malformed input", crashes.length === 0, `${crashes.length} crashes`);
}

async function main() {
  console.log(`\nAuth Stress Test — targeting ${BASE}\n`);
  console.log("Starting server actions hit via form POST...\n");

  // Reset rate limits before test
  try { await fetch(`${BASE}/api/dev-test/reset-rate-limits`); } catch {}

  await test1_duplicateRegistration();

  // Reset between tests
  try { await fetch(`${BASE}/api/dev-test/reset-rate-limits`); } catch {}
  await test2_concurrentLogin();

  try { await fetch(`${BASE}/api/dev-test/reset-rate-limits`); } catch {}
  await test3_massRegistration();

  try { await fetch(`${BASE}/api/dev-test/reset-rate-limits`); } catch {}
  await test4_bruteForce();

  try { await fetch(`${BASE}/api/dev-test/reset-rate-limits`); } catch {}
  await test5_malformedInput();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`PASS: ${results.pass}  FAIL: ${results.fail}`);
  if (results.errors.length) {
    console.log("\nFailed checks:");
    results.errors.forEach(e => console.log(`  ${e}`));
  }
  console.log();
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(console.error);
