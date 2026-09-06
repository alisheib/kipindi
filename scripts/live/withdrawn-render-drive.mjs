/**
 * WITHDRAWN FEATURES — THE RENDERED-PAGE DRIVE.
 *
 * ⛔ THIS IS THE MEASUREMENT `withdrawn-features.test.mts` §3 REFUSES TO CLAIM.
 * That suite is a SOURCE check: it proves no player route still reads the withdrawn copy
 * keys. It cannot prove what a signed-in player actually SEES, and it says so. This drives
 * a real server with a real session cookie and reads the real HTML.
 *
 * The distinction is not pedantry. A build can be green and every page down; a source grep
 * can be clean while a component renders the thing anyway through a prop, a default or a
 * cached chunk. The only way to know what a player sees is to be one.
 *
 * USAGE:  BASE=http://localhost:3210 node scripts/live/withdrawn-render-drive.mjs
 * Requires a dev server with the in-memory store (no DATABASE_URL) so /auth/demo exists.
 */

const BASE = process.env.BASE ?? "http://localhost:3210";

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

/** Sign in as the demo player and keep the session cookie. */
async function demoSession() {
  const res = await fetch(`${BASE}/auth/demo`, { redirect: "manual" });
  const raw = res.headers.getSetCookie?.() ?? [];
  const cookie = raw.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`/auth/demo issued no cookie (status ${res.status}) — is this a dev server with the in-memory store?`);
  return cookie;
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, html: await res.text() };
}

const cookie = await demoSession();
console.log(`\nwithdrawn-render-drive — ${BASE}\n`);

// ── §0 · THE CONTROL — the harness can see a real rendered page ─────────────
// ⛔ Read this first if anything below "passes". Every assertion after this is an ABSENCE,
// and absence is exactly what a broken fetch, a redirect to login or an error page also
// looks like. If §0 fails, the rest of this run means nothing at all.
{
  const { status, html } = await get("/profile", cookie);
  ok("§0 CONTROL · /profile renders 200", status === 200, `status=${status}`);
  ok("§0 CONTROL · it is the real profile page", html.includes("/profile/account") && html.includes("/profile/kyc"),
    `len=${html.length}`);
  ok("§0 CONTROL · the session is authed (not the login page)", !html.includes("/auth/login?next="), "redirected to login");
}

// ── §1 · NO INVITE ENTRY POINT ANYWHERE A PLAYER LOOKS ─────────────────────
{
  for (const path of ["/profile", "/wallet", "/positions", "/markets"]) {
    const { status, html } = await get(path, cookie);
    ok(`§1 ${path} renders 200`, status === 200, `status=${status}`);
    ok(`§1 ${path} offers no /profile/invite link`, !html.includes("/profile/invite"),
      `found ${(html.match(/\/profile\/invite/g) ?? []).length} occurrence(s)`);
  }
}

// ── §2 · THE INVITE PAGE ITSELF IS GONE FOR A PLAYER ───────────────────────
// 🔴 THIS SECTION IS WHAT THE FIRST RUN OF THIS DRIVE CORRECTED, TWICE, AND BOTH ARE
// recorded because both were mistakes worth not repeating.
//
//  1. It asserted `status === 404`. The status is **200** — this segment has a `loading.tsx`,
//     so Next flushes the shell and commits the status before the page throws `notFound()`.
//     The player still gets the not-found view. Asserting the status was asserting an
//     assumption about a framework, not the behaviour that matters.
//  2. It asserted the whole page contained no "coming soon" — and matched the PROPOSALS
//     badge in the shared nav, which is a different feature, legitimately coming soon.
//     A true measurement over the wrong population is the most convincing way to be wrong.
//
// ⭐ What matters, and what is measured now: the not-found view renders, and NOTHING of the
// referral programme reaches the page. That second half is the security property — the
// guard sits above the referral read precisely so no code is minted, no link is built and
// no QR is drawn for someone the programme does not belong to.
{
  const { status, html } = await get("/profile/invite", cookie);
  ok("§2 /profile/invite renders the not-found view", /not found|404|haipatikani|未找到/i.test(html), `status=${status}`);
  ok("§2 no referral QR is drawn", !/data:image\/(png|gif);base64/.test(html));
  ok("§2 no referral link is built", !/register\?ref=/.test(html));
  ok("§2 no referral code or share body is rendered", !/ReferralShare|referralCode/i.test(html));
  console.log(`       (status ${status} — 200 by design: a loading.tsx boundary commits it before notFound() throws)`);
}

// ── §3 · NO BONUS SURFACE ON THE WALLET ────────────────────────────────────
{
  const { status, html } = await get("/wallet", cookie);
  ok("§3 /wallet renders 200", status === 200, `status=${status}`);
  // The bonus card stamps `data-bonus` on its figure; the demo player holds no grant, so the
  // whole card must be absent rather than showing a gilt TZS 0.
  ok("§3 no bonus balance figure is rendered", !html.includes("data-bonus="), "data-bonus present");
  // ⭐ CONTROL: the REAL balance is still there. Otherwise "no bonus" could just mean the
  // wallet failed to render at all.
  ok("§3 CONTROL · the real balance still renders", html.includes('data-testid="wallet-balance"'), "wallet balance missing");
}

// ── §4 · NO CASHBACK PROMO ON THE DEPOSIT FORM ─────────────────────────────
{
  const { status, html } = await get("/wallet/deposit", cookie);
  ok("§4 /wallet/deposit renders 200", status === 200, `status=${status}`);
  ok("§4 no cashback promo", !/cash\s?back/i.test(html), "cashback copy present");
}

// ── §5 · A SHARED LINK NO LONGER CARRIES A REFERRAL CODE ───────────────────
// The sharpest of the lot: this was minting a code for every player and binding
// permanently, paying nothing today and standing ready to pay tomorrow.
{
  const { html } = await get("/positions", cookie);
  ok("§5 /positions share links carry no ?ref= code", !/[?&]ref=/.test(html),
    (html.match(/[?&]ref=[A-Z0-9]+/g) ?? []).slice(0, 3).join(" "));
}

console.log(`\n${pass} passed · ${fail} failed`);
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
