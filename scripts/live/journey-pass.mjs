/**
 * A STAFF PREVIEW PASS AND THE DEMO PLAYER, ON A LOCAL IN-MEMORY SERVER — the doors every journey drive goes through
 * (the Vodacom plan S6, `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP6b step 4).
 *
 * The new journey shows only to a request whose preview pass counts (S1). A drive that wants to SEE the journey must
 * therefore hold a real pass, minted the way an officer mints one: a SUPPORT officer is seeded and signed in
 * (`/api/dev-test/seed-admin`), opens /admin/journey and presses "Turn my preview on" — the door `qa:journey-preview`
 * §2 drives. The pass is one HttpOnly cookie, `kp_preview`, and it survives a sign-out and a sign-in (S1, decision 2),
 * so a drive hands it to every context it opens, beside whichever session that context is for.
 *
 * ⭐ THE DEMO PLAYER IS ONE ACCOUNT. `/auth/demo` signs the same player in every time and starts a new session, and a
 * new session ends the last one, so a drive sets up ONE state at a time — a balance, a hold — and measures it before it
 * sets up the next. `?deposit=0` empties the wallet and `POST /api/dev-test/seed-wallet` ADDS to it, so any balance is
 * two calls; `?hold=officer` freezes the wallet (and resets it to the demo's TZS 100,000).
 *
 * ⛔ LOCAL ONLY. `premise` is the refusal every caller makes before it starts: `http://localhost:PORT` exactly, an
 * in-memory server (the database not configured), and a rollout a pass can see. The server must also run with
 * DISABLE_ADMIN_TOTP=true, or the preview door sends the officer to the two-step check and no pass is minted.
 * Nothing here touches the repository.
 */

export const DEMO_PHONE = "+255700000000";
export const PASS_COOKIE = "kp_preview";
export const SESSION_COOKIE = "kp_session";
export const LOCALE_COOKIE = "kp-locale";

/** The base when it is `http://localhost:PORT` exactly, else null. */
export function localBase(raw) {
  try {
    const u = new URL(String(raw));
    return u.protocol === "http:" && u.hostname === "localhost" && raw === `http://${u.host}` ? raw : null;
  } catch {
    return null;
  }
}

/**
 * The refusals every journey drive makes before it starts. Resolves to `{ refuse: <why> }`, or `{ refuse: null, health }`
 * when the server is local, in memory, and running a rollout a preview pass can see (STAFF_PREVIEW or ACTIVE).
 */
export async function premise(base) {
  if (!localBase(base)) return { refuse: `local dev only, addressed as http://localhost:PORT — got ${JSON.stringify(base)}` };
  const health = await fetch(`${base}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health) return { refuse: `no server answered at ${base}/api/health — start one: rm -rf .next, then DISABLE_ADMIN_TOTP=true npx next dev -p <port> with no DATABASE_URL` };
  if (health.database?.configured !== false) {
    return { refuse: `the server at ${base} reports a configured database (database.configured=${JSON.stringify(health.database?.configured)}) — this drive runs only against an in-memory dev server` };
  }
  const state = health.simpleJourney?.state;
  if (state !== "STAFF_PREVIEW" && state !== "ACTIVE") {
    return { refuse: `/api/health says simpleJourney.state = ${JSON.stringify(state)}: a preview pass shows nothing while the rollout is withdrawn` };
  }
  return { refuse: null, health };
}

/**
 * Mints a staff preview pass and returns its cookie, or throws naming the step that failed: a SUPPORT officer is
 * seeded and signed in, opens /admin/journey and turns their preview on, and the door lands them on `/` holding it.
 */
export async function mintStaffPass(browser, base, { phone = "+255700000084", name = "Fit Support" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const seeded = await ctx.request.post(`${base}/api/dev-test/seed-admin`, { data: { role: "SUPPORT", phone, name } });
    if (!seeded.ok()) throw new Error(`/api/dev-test/seed-admin answered ${seeded.status()} — a stale .next 404s every dev-test route: rm -rf .next and restart`);
    const page = await ctx.newPage();
    await page.goto(`${base}/admin/journey`, { waitUntil: "domcontentloaded", timeout: 240_000 });
    const on = page.getByRole("button", { name: "Turn my preview on" });
    await on.waitFor({ timeout: 120_000 });
    await Promise.all([page.waitForURL(`${base}/`, { timeout: 120_000 }), on.click()]);
    const pass = (await ctx.cookies(base)).find((c) => c.name === PASS_COOKIE);
    if (!pass) throw new Error(`no ${PASS_COOKIE} cookie after "Turn my preview on" — is the server running with DISABLE_ADMIN_TOTP=true?`);
    return pass;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * Signs the demo player in through `/auth/demo` + `query` (e.g. "?deposit=0", "?hold=officer") in a throwaway context,
 * brings the wallet to `balance` when one is given (from `?deposit=0`'s empty wallet, so the seed IS the balance), and
 * returns the session cookie. ⛔ Each call starts a new session for the one demo account, and so ends the last one.
 */
export async function demoSession(browser, base, { query = "", balance = null } = {}) {
  const ctx = await browser.newContext();
  try {
    const res = await ctx.request.get(`${base}/auth/demo${query}`, { maxRedirects: 0, timeout: 240_000 });
    if (res.status() >= 400) throw new Error(`/auth/demo${query} answered ${res.status()}`);
    if (balance !== null && balance > 0) {
      const seeded = await ctx.request.post(`${base}/api/dev-test/seed-wallet`, { data: { phone: DEMO_PHONE, amount: balance } });
      if (!seeded.ok()) throw new Error(`/api/dev-test/seed-wallet answered ${seeded.status()}`);
      const body = await seeded.json().catch(() => null);
      if (body?.balance !== balance) throw new Error(`the demo wallet holds ${body?.balance}, not ${balance} — was it emptied first (?deposit=0)?`);
    }
    const session = (await ctx.cookies(base)).find((c) => c.name === SESSION_COOKIE);
    if (!session) throw new Error(`/auth/demo${query} set no ${SESSION_COOKIE} cookie`);
    return session;
  } finally {
    await ctx.close().catch(() => {});
  }
}
