/**
 * revoked-deadend — a session that has ENDED must still be able to SEE a page, and be told the truth.
 *
 * 🔴 WHAT THIS CATCHES, AND WHY IT ASSERTS PIXELS RATHER THAN A URL.
 * On 2026-09-12 a player whose session had been displaced (a newer login elsewhere, a sign-out on
 * another device, a suspension, or an `ActiveSession` row that went missing) could open any 50pick
 * link and land on a COMPLETELY EMPTY navy page. The address bar read
 * `/auth/login?revoked=1&next=/markets/mkt_…` — exactly right — and the login page's RSC payload
 * came back 200. It simply had nowhere to mount, because `AppShell` sits in the ROOT layout and its
 * revoked branch returned a redirect shim *instead of* `{children}`, and the App Router does not
 * re-execute a shared root layout on the client-side soft navigation that shim performed.
 *
 * ⛔ SO A GUARD THAT CHECKS THE URL IS WORTHLESS HERE. The URL was correct for the entire life of
 * the bug. This guard requires the page to have actually RENDERED: visible text, and the password
 * field a person needs in order to get back in.
 *
 * §1 THE DOCUMENT PATH — a deep link on a displaced device, for a protected route, a public list and
 *    a public legal page (the original defect broke all three). ⚠️ Each case RE-PRESENTS the
 *    displaced cookie: since E-381 (2026-09-14) the first redirect clears it, and without the
 *    re-add every later case would silently test a plain signed-out visitor instead.
 * §2 JAVASCRIPT DISABLED — pins the redirect to the SERVER. Mutation-proven 2026-09-14 in a
 *    throwaway worktree: with the old `window.location.replace` shim swapped back in, the 13
 *    JavaScript-on checks stayed green and exactly these 3 failed; with `revoked=1` misspelt in the
 *    server redirect, exactly the third failed.
 * §3 🔴 THE MID-VISIT PATH (E-381 §6 item 1) — a displaced player sitting on /markets when the page
 *    refreshes (`50pick:refresh`, the event a bet, a cash-out and an Up & Down tap dispatch, and the
 *    same `router.refresh()` RefreshPoller calls on a timer). Before the fix this went BLANK
 *    (`npm run repro:revoked-midvisit`, t+28 s, `innerText.length === 0`). It must now keep the page,
 *    show the notice as a visible rectangle, and its plain link must reach the login page.
 * §4 THE COPY (§6 items 6, 8, 9) — an idle cookie is told it went idle, not "another device"; and
 *    a wrong password outranks every sign-out panel (item 7).
 * §5 ITEM 4 — a displaced player who keeps clicking <Link>s leaves the signed-in shell for the sign-in page.
 * §6 ITEM 14 — `/positions#pos_…` signed out → sign in → back on /positions WITH the anchor.
 *
 * Local only: it drives /auth/demo, which is 404 in production. §4's idle case re-signs a real
 * cookie, so it needs the dev server's SESSION_SECRET in this process's environment.
 *   BASE=http://localhost:3009 SESSION_SECRET=… node scripts/revoked-deadend.test.mjs
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const BASE = process.env.BASE || "http://localhost:3009";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DEVICE_COPY = "signed in on another device";

let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};

// Warm up — a cold route compiles on first hit and would race the assertions below.
for (let i = 0; i < 30; i++) {
  if (await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false)) break;
  await wait(1500);
}
for (const r of ["/", "/markets", "/wallet", "/auth/login", "/legal/rules", "/auth/session-ended"]) {
  await fetch(BASE + r, { redirect: "manual" }).catch(() => {});
}
await wait(500);

const browser = await chromium.launch(
  process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
);
// ⛔ THIS SUITE ASSERTS ENGLISH COPY ("another device", "wrong phone or password"), so every context it opens says it
// reads English. Since 8822b648 (2026-09-15) a visitor with no language cookie is served SWAHILI, and six checks here
// were reading Swahili pages as failures for everyone — found by the Mobile Visual Plan's S1 test:all on 2026-09-22.
// The language is a premise of the copy checks, set on the context before the first request (skill §4).
{
  const raw = browser.newContext.bind(browser);
  browser.newContext = async (opts) => {
    const c = await raw(opts);
    await c.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
    return c;
  };
}

const readPage = (p) => p.evaluate(() => ({
  path: location.pathname,
  search: location.search,
  textLen: document.body.innerText.trim().length,
  text: document.body.innerText,
  hasPassword: !!document.querySelector('input[type="password"]'),
}));
const sessionCookie = async (ctx) => (await ctx.cookies()).find((c) => c.name === "kp_session");

console.log("\n[revoked-deadend] §1 a displaced session must still see a page");

const A = await browser.newContext();
const a = await A.newPage();
const errs = [];
a.on("pageerror", (e) => errs.push("pageerror: " + e.message));

await a.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
await wait(1200);
await a.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" });
await wait(1500);
const liveLen = await a.evaluate(() => document.body.innerText.trim().length);
ok("baseline · /wallet renders while the session is the active one", liveLen > 100, `(text=${liveLen})`);

const B = await browser.newContext();
const b = await B.newPage();
await b.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
await wait(1200);
await b.close();
const deadCookie = await sessionCookie(A);
ok("precondition · device A holds the displaced cookie", !!deadCookie);

for (const target of ["/wallet", "/positions", "/markets", "/legal/rules"]) {
  errs.length = 0;
  await A.addCookies([deadCookie]);
  await a.goto(BASE + target, { waitUntil: "domcontentloaded" });
  await wait(4000);
  const r = await readPage(a);

  // THE assertion. Not the URL — the page.
  ok(`${target} · displaced device sees rendered content, not a blank body`,
    r.textLen > 100, `(text=${r.textLen} path=${r.path})`);
  const recoverable = r.hasPassword || (r.textLen > 100 && !r.path.startsWith("/auth"));
  ok(`${target} · the player has a way forward (sign-in field or a readable public page)`,
    recoverable, `(password=${r.hasPassword} path=${r.path})`);
  ok(`${target} · a displaced device is told the true reason (revoked=1 → another device)`,
    r.path === "/auth/login" && r.search.includes("revoked=1") && r.text.toLowerCase().includes(DEVICE_COPY),
    `(path=${r.path} search=${r.search})`);
  ok(`${target} · the dead cookie is cleared, so the device stops re-entering the branch`,
    !(await sessionCookie(A)));
  ok(`${target} · no page errors`, errs.length === 0, errs.join(" | "));
}

// ── §2 JavaScript DISABLED. The redirect is a real 307 → 303 the browser follows with no script.
console.log("\n[revoked-deadend] §2 JavaScript disabled");
{
  const NJ = await browser.newContext({ javaScriptEnabled: false });
  const nj = await NJ.newPage();
  await NJ.addCookies([deadCookie]);
  await nj.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" });
  await wait(2500);
  const r = await readPage(nj).catch(async () => ({
    path: new URL(nj.url()).pathname,
    search: new URL(nj.url()).search,
    textLen: (await nj.innerText("body").catch(() => "")).trim().length,
    hasPassword: (await nj.locator('input[type="password"]').count()) > 0,
  }));
  ok("JS DISABLED · the redirect still happens (it is a server 307, not a script)",
    r.path === "/auth/login", `(path=${r.path})`);
  ok("JS DISABLED · and the login page renders, with a password field",
    r.textLen > 100 && r.hasPassword, `(text=${r.textLen} password=${r.hasPassword})`);
  // The literal `revoked=1` is what auth/login/page.tsx reads; the redirect target is cast `as never`.
  ok("JS DISABLED · the revoked=1 flag auth/login reads is present",
    r.search.includes("revoked=1"), `(search=${r.search})`);
  await NJ.close();
}

// ── §3 THE MID-VISIT PATH: a refresh while displaced must not blank the page.
console.log("\n[revoked-deadend] §3 mid-visit refresh while displaced");
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const perrs = [];
  p.on("pageerror", (e) => perrs.push(e.message));
  await p.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
  await wait(1200);
  await p.goto(BASE + "/markets", { waitUntil: "domcontentloaded" });
  await wait(3000);
  const before = await readPage(p);
  ok("mid-visit · /markets renders while signed in", before.path === "/markets" && before.textLen > 100, `(text=${before.textLen})`);

  const other = await browser.newContext();
  const o = await other.newPage();
  await o.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
  await wait(1200);
  await other.close();

  let rscRequests = 0;
  p.on("request", (req) => { if (req.url().includes("_rsc=") || req.headers()["rsc"] === "1") rscRequests++; });
  // The same router.refresh() a bet, a cash-out, an Up & Down tap and RefreshPoller's timer run.
  await p.evaluate(() => window.dispatchEvent(new Event("50pick:refresh")));
  await wait(5000);
  const after = await readPage(p);
  ok("mid-visit · the page is NOT blank after the refresh", after.textLen > 100, `(text=${after.textLen} path=${after.path})`);
  ok("mid-visit · the player stays on the page they were reading (no client navigation)", after.path === "/markets", `(path=${after.path})`);
  const notice = await p.evaluate(() => {
    const n = document.querySelector('[data-testid="session-ended-notice"]');
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const a = n.querySelector("a");
    return { w: r.width, h: r.height, top: r.top, text: n.textContent || "", href: a?.getAttribute("href") ?? "" };
  });
  ok("mid-visit · the session-ended notice is a visible rectangle in the viewport",
    !!notice && notice.w > 200 && notice.h > 20 && notice.top >= 0 && notice.top < 400, JSON.stringify(notice));
  ok("mid-visit · it names the true reason (another device)", !!notice && notice.text.toLowerCase().includes(DEVICE_COPY));
  ok("mid-visit · its action is a plain link to /auth/session-ended with the page as next",
    !!notice && notice.href.startsWith("/auth/session-ended?next=%2Fmarkets"), `(href=${notice?.href})`);
  ok("mid-visit · no retry storm (a handful of flight requests, not dozens)", rscRequests < 8, `(rsc=${rscRequests})`);
  ok("mid-visit · no page errors", perrs.length === 0, perrs.join(" | "));

  // No notice (the pre-fix tree) → go where its link would have gone, so §4 still runs and reports.
  if (notice) await p.click('[data-testid="session-ended-notice"] a');
  else await p.goto(BASE + "/auth/session-ended?next=%2Fmarkets", { waitUntil: "domcontentloaded" });
  await wait(4000);
  const landed = await readPage(p);
  ok("mid-visit · the notice's link reaches a rendered login page with the reason and a way back",
    landed.path === "/auth/login" && landed.hasPassword && landed.search.includes("revoked=1") && landed.search.includes("next=%2Fmarkets"),
    `(path=${landed.path} search=${landed.search} password=${landed.hasPassword})`);
  ok("mid-visit · and the dead cookie is gone", !(await sessionCookie(ctx)));
  await ctx.close();
}

// ── §4 THE COPY.
console.log("\n[revoked-deadend] §4 the reason given is the true one");
{
  // (a) An IDLE session: re-sign a real, still-registered cookie with lastSeenAt 25 h ago. Its row
  // is present, so before the reorder this was never the path; with a missing row it would have
  // been told "another device". Here we check the idle branch speaks at all, and speaks truly.
  const secret = process.env.SESSION_SECRET || "dev-only-secret-replace-in-prod-32chars-minimum";
  const sign = (payload) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${b64}.${createHmac("sha256", secret).update(b64).digest("base64url")}`;
  };
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
  await wait(1200);
  const real = await sessionCookie(ctx);
  const payload = JSON.parse(Buffer.from(real.value.split(".")[0], "base64url").toString());
  // Control: the SAME payload re-signed must still be accepted, or the secret is wrong and (b) proves nothing.
  await ctx.addCookies([{ ...real, value: sign(payload) }]);
  const who = await p.request.get(BASE + "/api/dev-test/whoami").then((r) => r.json()).catch(() => ({}));
  ok("idle · control: a re-signed unchanged cookie is accepted (SESSION_SECRET matches the server)", who.ok === true,
    "(run with the dev server's SESSION_SECRET)");
  await ctx.addCookies([{ ...real, value: sign({ ...payload, lastSeenAt: Date.now() - 25 * 3600_000 }) }]);
  await p.goto(BASE + "/positions", { waitUntil: "domcontentloaded" });
  await wait(4000);
  const r = await readPage(p);
  ok("idle · a 24 h idle session lands on a rendered login page", r.path === "/auth/login" && r.hasPassword, `(path=${r.path})`);
  ok("idle · it is told it went idle (ended=idle), and NOT that it signed in on another device",
    r.search.includes("ended=idle") && !r.text.toLowerCase().includes(DEVICE_COPY) && r.text.includes("24"),
    `(search=${r.search})`);
  await ctx.close();

  // (b) A wrong password outranks a sign-out panel, even with the 30 s note set.
  const w = await browser.newContext();
  const wp = await w.newPage();
  await w.addCookies([{ name: "kp_revoked", value: "1", url: BASE }]);
  await wp.goto(BASE + "/auth/login?error=wrong_credentials", { waitUntil: "domcontentloaded" });
  await wait(2500);
  const wr = await readPage(wp);
  ok("wrong password · the error is shown, not a sign-out story",
    /wrong phone or password/i.test(wr.text) && !/signed out/i.test(wr.text), `(text excerpt=${wr.text.slice(0, 160).replace(/\s+/g, " ")})`);
  await w.close();
}

// ── §5 E-381 §6 item 4 · a displaced player who keeps CLICKING must not keep the signed-in shell.
console.log("\n[revoked-deadend] §5 soft navigation while displaced");
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
  await wait(1200);
  await p.goto(BASE + "/markets", { waitUntil: "domcontentloaded" });
  await wait(3000);
  const other = await browser.newContext();
  const o = await other.newPage();
  await o.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });
  await wait(1200);
  await other.close();
  // The app's own nav <Link> — a SOFT navigation, which does not re-run the root layout.
  const link = p.locator('a[href="/leaderboard"], a[href="/results"], a[href="/live"]').first();
  ok("§5 precondition · a nav link to click", (await link.count()) > 0);
  if (await link.count()) {
    await link.click();
    await wait(7000);
    const r = await readPage(p);
    ok("§5 the displaced player is taken out of the signed-in shell to a rendered login page with the reason",
      r.path === "/auth/login" && r.hasPassword && r.search.includes("revoked=1"), `(path=${r.path} search=${r.search})`);
    ok("§5 …and the dead cookie is gone", !(await sessionCookie(ctx)));
    await p.goto(BASE + "/markets", { waitUntil: "domcontentloaded" });
    await wait(3000);
    ok("§5 afterwards the player browses as a guest — no second bounce", (await readPage(p)).path === "/markets");
  }
  await ctx.close();
}

// ── §6 E-381 §6 item 14 · a position permalink keeps its anchor through sign-in.
console.log("\n[revoked-deadend] §6 a #pos_ anchor survives signing in");
{
  const phone = "+255700000074";
  const password = "QaPlayer2026!";
  const seed = await browser.newContext();
  const sp = await seed.newPage();
  await sp.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const seeded = await sp.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "PLAYER", phone, password, name: "QA Anchor" } });
  ok("§6 precondition · a player with a password", seeded.ok());
  await seed.close();
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(BASE + "/positions#pos_qaanchor123", { waitUntil: "domcontentloaded" });
  await wait(3500);
  const at = await p.evaluate(() => ({ path: location.pathname, hash: location.hash, field: document.querySelector('input[name="nextHash"]')?.value ?? null }));
  ok("§6 signed out, the protected link lands on sign-in with its fragment in the form", at.path === "/auth/login" && at.field === "#pos_qaanchor123", JSON.stringify(at));
  // The visible phone box (the named `identifier` input is the hidden value it writes).
  const idField = p.locator('form:has(input[type="password"]) input[type="text"]:visible').first();
  await idField.fill(phone.replace("+255", ""));
  await p.fill('input[type="password"]', password);
  await p.locator('form:has(input[type="password"]) button[type="submit"]').first().click();
  await wait(7000);
  const after = await p.evaluate(() => ({ path: location.pathname, hash: location.hash }));
  ok("§6 after signing in the player is on /positions WITH the #pos_ anchor", after.path === "/positions" && after.hash === "#pos_qaanchor123", JSON.stringify(after));
  await ctx.close();
}

await browser.close();

console.log(`\n[revoked-deadend] ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  · " + f);
  process.exit(1);
}
