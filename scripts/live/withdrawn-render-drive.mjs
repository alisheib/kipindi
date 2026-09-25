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
  /**
   * 🔴 THIS CONTROL WAS BROKEN AND NOBODY KNEW — it required `/profile/kyc`, and the demo session
   * is KYC **APPROVED**, so that row is deliberately absent (2026-09-13: "an approved identity is
   * not offered Verify ID again"). The control therefore failed on every run, and a failing
   * control invalidates every ABSENCE assertion below it — which is exactly the thing §0 exists to
   * prevent. Found 2026-09-25 while driving the unpaid invite; it is not caused by that work.
   * ⭐ Re-anchored to two rows that render for EVERY signed-in player whatever their KYC state.
   */
  ok("§0 CONTROL · it is the real profile page", html.includes("/profile/account") && html.includes("/profile/security"),
    `len=${html.length}`);
  ok("§0 CONTROL · the session is authed (not the login page)", !html.includes("/auth/login?next="), "redirected to login");
}

// ── §1 · THE INVITE ENTRY POINT IS BACK, AND IT PROMISES NOTHING ───────────
// 🔴 INVERTED 2026-09-25. This section asserted that no player surface links to
// `/profile/invite`, which was the product from 2026-09-06 until the unpaid invite opened. The
// entry point is deliberate now — so what is measured is the pair: the LINK is there, and the
// WORDS around it promise no money. ⛔ Asserting only the link would pass on the old paid promo.
{
  /**
   * ⚠️ WHAT THIS SECTION CAN AND CANNOT SEE — MEASURED, NOT ASSUMED. This drive reads SERVER HTML
   * with `fetch`. The invite row on `/profile` is server-rendered and appears there; the chrome's
   * other two doors (the avatar menu and the More rail) are CLIENT components that mount their
   * lists on open, so `/wallet`, `/positions` and `/markets` carry no `/profile/invite` string at
   * all — and neither does `/leaderboard`, which is unconditional in the same nav list. That is
   * the measurement, not a defect: a first draft of this section asserted the link on all four
   * pages and failed on three of them for a reason that has nothing to do with the feature.
   * ⭐ So the LINK is asserted where it is genuinely server-rendered, the ABSENCE OF A MONEY
   * PROMISE is asserted on all four (that string would be in the payload wherever a label is),
   * and the clicked-open chrome (avatar menu, More rail) is NOT measured here. ⛔ Nor by `qa:agent-drive`
   * §6: it reads only the closed `nav, header` text and never opens a menu. `qa:invite-phone`
   * (scripts/live/invite-prod-drive.mjs §1a/§1b) opens both menus and asserts the neutral label
   * ("Invite friends", no "& Earn" / "upate zawadi" / "邀请赚钱").
   */
  for (const path of ["/profile", "/wallet", "/positions", "/markets"]) {
    const { status, html } = await get(path, cookie);
    ok(`§1 ${path} renders 200`, status === 200, `status=${status}`);
    if (path === "/profile") {
      ok(`§1 ${path} offers the invite entry point (server-rendered row)`, html.includes("/profile/invite"),
        `found ${(html.match(/\/profile\/invite/g) ?? []).length} occurrence(s)`);
      /**
       * 🔴 THE ABSENCE ASSERTION BELOW CANNOT FAIL ON ITS OWN, SO IT IS PAIRED WITH A PRESENCE ONE.
       * "no surface says '& Earn'" is true of `/wallet`, `/positions` and `/markets` for a reason
       * that has nothing to do with the feature: their invite entry points are CLIENT components
       * that mount on open, so no invite label of any kind is in their payload. That check would
       * read green with the row relabelled, deleted, or gilt.
       * ⭐ `/profile` is the one page whose invite row is SERVER-rendered, so it is the only place
       * this drive can hold the words to account — and it does it as a DELTA: the unpaid words must
       * be PRESENT here, which is what makes their absence elsewhere mean anything. The client
       * chrome's own label is NOT measured by this drive, nor by `qa:agent-drive` §6 — see the note above.
       */
      ok(`§1 ${path} ⭐ the row wears the UNPAID words`,
        /Invite friends|Alika marafiki|邀请朋友/.test(html),
        "the server-rendered invite row does not say 'Invite friends'");
    }
    ok(`§1 ${path} ⛔ no surface says "& Earn" / "upate zawadi" / "赚钱"`,
      !/Invite &amp; Earn|Invite & Earn|upate zawadi|邀请赚钱/.test(html),
      "a surface still advertises earnings");
  }
}

// ── §2 · THE INVITE PAGE IS A SHARE SURFACE, AND IT NAMES NO MONEY ─────────
// 🔴 From 2026-09-06 to 2026-09-25 this section asserted the NOT-FOUND view, because a player had no
// invite page. Two lessons from that era still apply to anything that drives this route:
//  1. A 200 here proves nothing on its own. This segment has a `loading.tsx`, so Next commits 200
//     before the page throws `notFound()` — a REFUSED viewer also gets 200. The content assertions
//     below carry this section, not the status.
//  2. Never search the whole page for "coming soon": the shared nav can legitimately carry it for a
//     different feature (it once matched the PROPOSALS badge). A true measurement over the wrong
//     population is the most convincing way to be wrong.
//
// ⭐ What is measured now: a player in good standing gets the live UNPAID body (a real code, link and
// QR) and not one money word. The gate still sits above the referral read, so nothing is minted for a
// viewer the seam refuses — the ORDER is proved in `test:withdrawn-features` §8 and WHO is refused in
// `test:player-invite-unpaid` §1, not here.
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

// ── §5 · THE PLAYER'S OWN LINK CARRIES THEIR CODE, AND IT IS THEIRS ────────
// 🔴 INVERTED 2026-09-25. This asserted that NO shared link carries a `?ref=` code — the right
// rule while the programme was withdrawn, because a bind is permanent and every one of those
// links was quietly recruiting for a programme that might return. The unpaid invite makes the
// attribution the POINT, so what must be true instead is that the code on the page belongs to
// the viewer and that the link is usable.
//
// ⚠️ MEASURED: the demo store carries no markets and the demo player holds no positions, so the
// market-card and position share surfaces render nothing on this host and cannot be read here.
// `/profile/invite` is the surface that always renders, so that is the one asserted, and the
// limit is stated rather than papered over with an assertion that would pass on an empty page.
{
  const { html } = await get("/profile/invite", cookie);
  const refs = html.match(/register\?ref=([A-Za-z0-9%-]+)/g) ?? [];
  ok("§5 the invite page carries a referral link with a code", refs.length > 0, `found ${refs.length}`);
  ok("§5 ⛔ …and exactly ONE distinct code — a page offering two would attribute to whichever was tapped",
    new Set(refs).size === 1, [...new Set(refs)].slice(0, 3).join(" "));
}

console.log(`\n${pass} passed · ${fail} failed`);
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
