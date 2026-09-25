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

// ── §1 · THE INVITE ENTRY POINT IS BACK, AND IT PROMISES NOTHING ───────────
// 🔴 INVERTED 2026-09-25. This section asserted that no player surface links to
// `/profile/invite`, which was the product from 2026-09-06 until the unpaid invite opened. The
// entry point is deliberate now — so what is measured is the pair: the LINK is there, and the
// WORDS around it promise no money. ⛔ Asserting only the link would pass on the old paid promo.
{
  for (const path of ["/profile", "/wallet", "/positions", "/markets"]) {
    const { status, html } = await get(path, cookie);
    ok(`§1 ${path} renders 200`, status === 200, `status=${status}`);
    // ⚠️ /profile is the only one of the four that carries the row itself; the others reach it
    // through the shared chrome (avatar menu / More rail), which is on every page.
    ok(`§1 ${path} offers the invite entry point`, html.includes("/profile/invite"),
      `found ${(html.match(/\/profile\/invite/g) ?? []).length} occurrence(s)`);
    ok(`§1 ${path} ⛔ …and no entry point says "& Earn" / "upate zawadi" / "赚钱"`,
      !/Invite &amp; Earn|Invite & Earn|upate zawadi|邀请赚钱/.test(html),
      "an entry point still advertises earnings");
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
  // ⭐ THE SHARE HALF — a real code, a real link, a real QR. These three were the SECURITY
  // property while the feature was withdrawn (nothing minted for someone it does not belong to);
  // they are the FEATURE now, and they are asserted just as literally.
  ok("§2 /profile/invite renders 200 for a player", status === 200, `status=${status}`);
  ok("§2 a referral QR is drawn", /data:image\/(png|gif);base64/.test(html));
  ok("§2 a referral link is built", /register\?ref=/.test(html));
  // ⛔ THE MONEY HALF — every sentence the PAID promo prints and this one must not. If
  // `inviteRewards` is ever switched on without this drive being revisited, it fails here.
  ok("§2 ⛔ no earnings figure", !/&gt;Earned&lt;|>Earned</.test(html));
  ok("§2 ⛔ no prize amount or milestone copy", !/10,000/.test(html) && !/first bet/i.test(html));
  ok("§2 ⛔ no bonus-requirements list", !/Bonus requirements|Masharti ya bonasi/i.test(html));
  ok("§2 ⛔ no gilt corner on the share card (gold is money — DESIGN_AUTHORITY §M3)",
    !/GiltCorner|gold-700/.test(html));
  ok("§2 ⭐ it states plainly that invites pay nothing",
    /no reward for invites|hailipi zawadi|不为邀请支付/.test(html), "the disclaimer line is missing");
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
