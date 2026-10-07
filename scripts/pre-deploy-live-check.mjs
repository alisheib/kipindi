/**
 * pre-deploy-live-check — strict adversarial browser gauntlet.
 *
 *   BASE=http://localhost:3009 node scripts/pre-deploy-live-check.mjs   # full (authed + mutating)
 *   BASE=https://kipindi-production.up.railway.app node scripts/...      # prod read-only subset
 *
 * Rules: ANY console error (minus React dev eval noise), page error, Next.js
 * error overlay, broken internal link, layout overflow, clipped date segment,
 * or mis-handled date is a FAILURE. Exit code != 0 blocks the deploy.
 *
 * Local (localhost) runs also drive authed surfaces via /auth/demo (404 in
 * prod) and assert the invite/History/wallet content. Prod runs skip those.
 * Every run (prod included) asks /api/health for the new journey's rollout and, short of ACTIVE, asserts that no
 * signed-out page carries the "Preview" marker — section [E2]; [F] asks the same of the signed-in demo player.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3009";
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

let pass = 0; const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label} ${extra}`.trim()); console.log(`  ✗ ${label} ${extra}`); }
};
const isDevNoise = (t) =>
  t.includes("eval()") || t.includes("unsafe-eval") || t.includes("React will never use eval") ||
  t.includes("Download the React DevTools");

function attach(page) {
  const errs = [];
  page.on("console", (m) => {
    if (m.type() !== "error" || isDevNoise(m.text())) return;
    // QA_OFFLINE=1 (sandboxed/offline runners only): ignore the resource-load
    // error for the Google Fonts @import, which such runners cannot reach.
    // Scoped to that ONE host — every other console error still fails the run.
    if (process.env.QA_OFFLINE === "1" && /Failed to load resource/.test(m.text()) && /fonts\.(googleapis|gstatic)\.com/.test(m.location()?.url ?? "")) return;
    errs.push(m.text());
  });
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("response", (r) => { if (r.url().startsWith(BASE) && r.status() >= 500) errs.push(`5xx: ${r.status()} ${r.url()}`); });
  return errs;
}
async function hasErrorOverlay(page) {
  // NOTE: an empty <nextjs-portal> element is ALWAYS present in dev mode — its
  // mere presence is not an error. Only a real error renders a dialog or the
  // signature error text, so detect those specifically.
  return await page.evaluate(() => {
    const t = document.body.innerText || "";
    if (document.querySelector("[data-nextjs-dialog]")) return true;
    return /Unhandled Runtime Error|Build Error|Failed to compile|This page could not be found|Internal Server Error|Application error:/i.test(t);
  });
}

// ── Warmup ──────────────────────────────────────────────────────────
// A freshly-restarted server cold-starts routes on first hit; running the
// strict checks against a cold instance produces false failures (typing races
// hydration, requests time out). Poll health + prime the heaviest routes first
// so every assertion below runs against a warm server — strict, not flaky.
{
  const warm = await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false);
  for (let i = 0; i < 20 && !warm; i++) { await new Promise((r) => setTimeout(r, 1500)); if (await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false)) break; }
  for (const r of ["/", "/markets", "/auth/register", "/proposals", "/wallet"]) await fetch(BASE + r).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
}

// ⚠️ Sandbox override: some cloud sandboxes carry a full Chromium but not the
// version-pinned headless-shell this Playwright resolves to. QA_CHROMIUM_PATH points
// the gauntlet at the real binary; unset, behaviour is exactly as before.
const browser = await chromium.launch(
  process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
);

// ── A. Public route health ──────────────────────────────────────────
console.log("\n[A] Public route health (render + no console/page/5xx errors + no error overlay)");
const PUBLIC_ROUTES = [
  "/", "/markets", "/markets?when=new", "/markets?when=soon", "/markets?when=week",
  "/live", "/leaderboard", "/fairness", "/proposals", "/help",
  "/legal/terms", "/legal/privacy", "/legal/aml", "/legal/responsible-gambling", "/legal/agent-terms",
  "/legal/rules", "/legal/rules/yes-no", "/legal/rules/up-down",
  "/auth/login", "/auth/register", "/auth/forgot-password",
];
{
  /* 🔴 2026-09-13 · WORDS RUN TOGETHER IN THE RENDERED PAGE, LIVE ON PRODUCTION AND IN NO SUITE.
     https://50pick.tz/legal/terms served "Identity verification is <strong>required</strong>before…":
     the source had the space, and the build dropped it where a bold phrase is followed by text that
     continues onto the next source line. Only the RENDERED markup tells the truth, so it is asserted here,
     on every public route. The fix at a site is an explicit {" "} after the closing tag. */
  /* ⭐ 2026-09-14 (audit session 95) — THE ASSERTION COULD PASS WITHOUT LOOKING, THREE WAYS:
     · /legal/agent-terms was not in the route list, so the binding document an agent signs was never read;
     · every route was read in English only. The Swahili and Chinese halves of the legal pages are separate JSX,
       so a second pass reads the SAME routes with the kp-locale=sw cookie — and FAILS unless the page really
       rendered <html lang="sw">, or that pass would be the English pass run twice;
     · a page whose HTML could not be read (the `.catch(() => "")`) or read empty counted as "no words run
       together". It now FAILS: an unread page is not a clean page.
     `</span>` is read too, but NOT in the global tag set: a span is also how CSS spaces things (the legal section
     number `<span class="mr-2">3.</span>Identity`, an icon span in a flex button), and those are not fused words.
     A `</span>` counts only inside running text — a <p> or an <li> — and only when the span's own text ends in a
     non-space character.
     ⛔ The population is ratcheted below (routes × passes, every page read), and the controls run the SAME
     verdict the routes are judged by. */
  const FUSED_TAGS = "strong|em|b|i|code|a";
  const spanFusedIn = (html) => {
    const out = [];
    for (const b of html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      for (const m of b[2].matchAll(/(\S)<\/span>([A-Za-zÀ-ɏ]{2,})/g)) if (m[1] !== ">") out.push(m[0]);
    }
    return out;
  };
  /* 2026-09-14 — AND TWO TEXT NODES FUSED AT AN EXPRESSION. React marks the seam between adjacent text nodes with
     `<!-- -->`; a letter on both sides of that seam is two words with no space ("hour<!-- -->of resolution" on the
     Terms §6 after a JSX line join — no closing tag involved, so the tag pass could not see it). */
  const nodeFusedIn = (html) => html.match(/[A-Za-z]{2}<!-- -->[a-z]{2,}/g) ?? [];
  const fusedIn = (html) => [...(html.match(new RegExp(`</(?:${FUSED_TAGS})>[A-Za-z]`, "g")) ?? []), ...spanFusedIn(html), ...nodeFusedIn(html)];
  /** One rendered page's verdict. Unreadable or empty HTML is a failure, never a pass. */
  const fusedVerdict = (html) => {
    if (typeof html !== "string" || html.trim().length === 0) return { ok: false, why: "the page HTML could not be read, or was empty — nothing was checked" };
    const hits = fusedIn(html);
    if (hits.length === 0) return { ok: true, why: "" };
    return { ok: false, why: [...(html.match(new RegExp(`.{0,30}</(?:${FUSED_TAGS})>[A-Za-z]{1,15}`, "g")) ?? []), ...spanFusedIn(html)].slice(0, 3).join(" | ") };
  };
  /** The gauntlet's ✓/✗ line, plus a `FAIL <label>` line on failure, so this section reads like every other guard. */
  const guard = (label, cond, extra = "") => { ok(label, cond, extra); if (!cond) console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); };
  guard("control · the fused-word matcher catches the shipped defect", fusedIn("is <strong>required</strong>before").length === 1);
  guard("control · …and accepts the explicit-space form React renders", fusedIn("is <strong>required</strong> <!-- -->before").length === 0);
  guard("control · …and catches a fused </span> (2026-09-14)", !fusedVerdict("<p><span>Kutoa</span>kunaendelea</p>").ok);
  guard("control · …and two text nodes fused at an expression seam (\"hour<!-- -->of\")", !fusedVerdict("<p>within 1<!-- --> hour<!-- -->of resolution</p>").ok
    && fusedVerdict("<p>within 1<!-- --> hour<!-- --> of resolution, 3<!-- -->.<!-- -->5 TZS<!-- -->5</p>").ok);
  guard("control · …but not a span CSS spaces: the legal section number, an icon span, a span whose text ends in a space",
    fusedVerdict(`<h2><span class="font-mono mr-2">3<!-- -->.</span>Identity verification</h2>`).ok
    && fusedVerdict(`<button><span aria-hidden="true">📱</span>Phone</button>`).ok
    && fusedVerdict(`<p><span class="x">Volume </span>TZS 5,000</p>`).ok
    && fusedVerdict(`<li><span><svg></svg></span>Withdraw</li>`).ok);
  guard("control · ⛔ an EMPTY or unreadable page FAILS the verdict", !fusedVerdict("").ok && !fusedVerdict("  \n ").ok && !fusedVerdict(undefined).ok);
  guard("control · …and a clean page passes the same verdict", fusedVerdict("<p>is <strong>required</strong> before</p>").ok);

  const PASSES = [{ locale: "en", tag: "" }, { locale: "sw", tag: "[sw] " }];
  let pagesRead = 0;
  for (const pass of PASSES) {
    const ctx = await enContext({ viewport: { width: 1280, height: 900 } });
    if (pass.locale !== "en") await ctx.addCookies([{ name: "kp-locale", value: pass.locale, url: BASE }]);
    const page = await ctx.newPage();
    for (const route of PUBLIC_ROUTES) {
      const errs = attach(page);
      let status = 0;
      page.once("response", (r) => { if (r.url() === BASE + route || r.url() === BASE + route + "/") status = r.status(); });
      await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const overlay = await hasErrorOverlay(page);
      const text = (await page.locator("body").innerText().catch(() => "")).trim();
      ok(`${pass.tag}${route} renders content`, text.length > 40, `(len=${text.length})`);
      ok(`${pass.tag}${route} no error overlay`, !overlay);
      ok(`${pass.tag}${route} no console/page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
      if (pass.locale !== "en") {
        const lang = await page.evaluate(() => document.documentElement.lang).catch(() => "");
        guard(`${pass.tag}${route} rendered in ${pass.locale} (html lang)`, lang === pass.locale, `lang="${lang}"`);
      }
      const bodyHtml = await page.locator("body").innerHTML().catch(() => "");
      if (typeof bodyHtml === "string" && bodyHtml.trim().length > 0) pagesRead++;
      const verdict = fusedVerdict(bodyHtml);
      guard(`${pass.tag}${route} no words run together after an inline tag`, verdict.ok, verdict.why);
      page.removeAllListeners("console"); page.removeAllListeners("pageerror"); page.removeAllListeners("response");
    }
    await ctx.close();
  }
  const expectedPages = PUBLIC_ROUTES.length * PASSES.length;
  guard("⛔ RATCHET · the fused-word check read every public route in every pass",
    pagesRead === expectedPages && PUBLIC_ROUTES.length >= 21 && PUBLIC_ROUTES.includes("/legal/agent-terms"),
    `${pagesRead} of ${expectedPages} pages read (${PUBLIC_ROUTES.length} routes × ${PASSES.length} locales)`);
}

/**
 * THE ENGLISH CONTEXT. DEFAULT_LOCALE is "sw" (src/lib/i18n-dict.ts), so a context with no
 * `kp-locale` cookie renders SWAHILI - and every section below that finds a control by its
 * ENGLISH label ("Day", "Month", "Year", "Email", ...) then waits 20s for an element that is
 * never going to exist. Section [B] died exactly there: `getByLabel("Day")` against a page
 * showing "Mwezi". The drive stopped before reaching any later section, including the invite
 * assertions, so one wrong assumption about the default language hid the rest of the run.
 * This is the one place the language is declared; a context built any other way inherits the
 * product default, which is what a locale-agnostic section should use.
 */
async function enContext(opts) {
  const ctx = await browser.newContext(opts);
  await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  return ctx;
}

// ── B. Date field cruelty (/auth/register DOB) ──────────────────────
console.log("\n[B] Date field — clipping, typing order, validation, junk");
{
  // B1 clipping at 3 widths with a full date
  for (const w of [360, 768, 1280]) {
    const ctx = await enContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/auth/register", { waitUntil: "domcontentloaded" });
    const day = page.getByLabel("Day"); await day.waitFor({ state: "visible", timeout: 20000 }); await page.waitForTimeout(400);
    await day.click(); await page.keyboard.type("31121999", { delay: 35 });
    for (const lbl of ["Day", "Month", "Year"]) {
      const m = await page.getByLabel(lbl).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, v: el.value }));
      ok(`[w=${w}] ${lbl} not clipped (v="${m.v}")`, m.sw <= m.cw + 1, `scrollW=${m.sw} clientW=${m.cw}`);
    }
    await ctx.close();
  }
  // B2 behavior + validation on one context
  const ctx = await enContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = attach(page);
  await page.goto(BASE + "/auth/register", { waitUntil: "domcontentloaded" });
  const day = page.getByLabel("Day"); await day.waitFor({ state: "visible" }); await page.waitForTimeout(400);
  const clr = async () => { for (const l of ["Day", "Month", "Year"]) { await page.getByLabel(l).click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace"); } };
  // ⛔ NOT `input[type=hidden][name=dob]`. It was, from 2026-06-11 until 2026-08-24, and from
  // 2026-08-21 it matched NOTHING: `DateSelect`'s mirror stopped being a hidden input in
  // b1628478, deliberately. A hidden input is BARRED from constraint validation, so its
  // `required` was inert and registration submitted with an empty date of birth. The mirror is
  // now a focusable text input made invisible with opacity — read the long comment in
  // src/components/ui/date-select.tsx before narrowing this selector again.
  // ⚠️ The SELECTOR went stale, not the assertion — the value checked below is unchanged.
  // For three days this crashed the gauntlet at section [B], so C onward never ran at all,
  // and `predeploy` ends with `qa:live`. A harness that dies mid-run reads as "not green yet".
  const hidden = () => page.locator('input[name=dob]').inputValue();

  // Hydration-robust: the hidden dob only updates once React has attached its
  // onChange (a slow prod cold-start can otherwise accept keystrokes into the
  // raw input before hydration, leaving dob empty). Retry the full valid-date
  // entry until it registers — up to ~9s. If it never does, that's a REAL bug.
  let dobVal = "";
  for (let i = 0; i < 9; i++) {
    await clr(); await page.getByLabel("Day").click();
    await page.keyboard.type("10051990", { delay: 35 });
    dobVal = await hidden();
    if (dobVal === "1990-05-10") break;
    await page.waitForTimeout(1000);
  }
  ok(`valid "10051990" -> hidden dob=1990-05-10`, dobVal === "1990-05-10", `got "${dobVal}"`);

  await clr(); await page.getByLabel("Day").click();
  await page.keyboard.type("1"); const a1 = await page.getByLabel("Day").inputValue();
  await page.keyboard.type("0"); const a10 = await page.getByLabel("Day").inputValue();
  ok(`type "1" -> "1"`, a1 === "1", `got "${a1}"`);
  ok(`type "10" -> "10" (never "01")`, a10 === "10", `got "${a10}"`);

  // impossible date must be invalid + no hidden value
  await clr(); await page.getByLabel("Day").click(); await page.keyboard.type("31022000", { delay: 25 });
  await page.getByLabel("Year").evaluate((el) => el.blur());
  await page.waitForTimeout(150);
  ok(`31/02/2000 -> hidden dob empty`, (await hidden()) === "", `got "${await hidden()}"`);
  ok(`31/02/2000 -> "Invalid date" shown`, (await page.locator("body").innerText()).includes("Invalid date"));

  // under-18 DOB rejected by max
  await clr(); await page.getByLabel("Day").click(); await page.keyboard.type("01012025", { delay: 25 });
  await page.getByLabel("Year").evaluate((el) => el.blur()); await page.waitForTimeout(150);
  ok(`01/01/2025 (under 18) -> hidden dob empty`, (await hidden()) === "", `got "${await hidden()}"`);

  // junk letters ignored
  await clr(); await page.getByLabel("Day").click(); await page.keyboard.type("ab");
  ok(`letters ignored in Day`, (await page.getByLabel("Day").inputValue()) === "");

  ok(`date page no console errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
}

// ── C. Responsive overflow (no horizontal scroll on mobile) ─────────
console.log("\n[C] Responsive — no horizontal overflow at 360px");
{
  const ctx = await enContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  for (const route of ["/", "/markets", "/auth/register", "/leaderboard", "/proposals", "/help"]) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(300);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${route} no horizontal overflow`, over <= 1, `overflow=${over}px`);
  }
  await ctx.close();
}

// ── D. Dead internal links on key pages ─────────────────────────────
console.log("\n[D] Dead-link crawl (internal links must not 404/5xx)");
{
  const ctx = await enContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const seen = new Set();
  for (const route of ["/", "/markets", "/help", "/proposals"]) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const h of hrefs) {
      if (!h || !h.startsWith("/") || h.startsWith("//")) continue;
      const path = h.split("#")[0]; if (!path || seen.has(path)) continue; seen.add(path);
    }
  }
  for (const path of seen) {
    const res = await page.request.get(BASE + path, { maxRedirects: 3 }).catch(() => null);
    const st = res ? res.status() : 0;
    ok(`link ${path} -> ${st}`, st > 0 && st < 400);
  }
  await ctx.close();
}

// ── E. Tester-change surfaces (public) ──────────────────────────────
console.log("\n[E] Tester changes — demos hidden, New tab, footer email");
{
  const ctx = await enContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/markets?when=new", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  const body = await page.locator("body").innerText();
  ok(`no demo polls on /markets`, !body.includes("Demo ·"));
  // Single-language display (dual-language labels were removed): only the
  // active locale's word renders, so accept either "New" (en) or "Mpya" (sw).
  ok(`New tab present`, body.includes("New") || body.includes("Mpya"));
  // 🔴 THIS ASSERTION USED TO PIN A LITERAL — `body.includes("support@50pick.tz")` — and it was
  // ALREADY RED against production, because the persisted `support_config` row has served
  // `msaada@50pick.tz` since 2026-08-19 and the footer reads that row. So a gate on the
  // `predeploy` chain was demanding the platform keep publishing an address it had stopped
  // publishing, and would have gone red against the correct fix rather than the defect.
  // ⛔ Same class as `multi-persona-test.mjs` asserting a retired `TZ-GBT` licence placeholder:
  // a guard that enforces the defect. The cure is not a NEWER literal — that just re-arms the
  // trap for whoever changes the address next — it is to assert the INVARIANT: the footer
  // publishes a real support mailbox on the licensed domain, and it is not the no-reply sender.
  const footerEmail = (body.match(/[a-z0-9._%+-]+@50pick\.tz/i) || [])[0] || "";
  ok(`footer publishes a support address on the licensed domain`, !!footerEmail, footerEmail || "no @50pick.tz address found");
  ok(`…and it is not the no-reply sender`, !!footerEmail && !/^noreply@/i.test(footerEmail), footerEmail);
  await ctx.close();
}

// ── E2. The new journey's rollout (public — runs against production too) ──
/**
 * ⭐ THE VODACOM PLAN S1 DONE-WHEN, ASKED OF THE RUNNING SITE: "staff see a preview marker on production and nobody
 * else sees anything". The new journey rolls out WITHDRAWN → STAFF_PREVIEW → ACTIVE (`RolloutState`,
 * `src/lib/feature-state.ts`), and the "Preview" marker (`preview-marker.tsx` — data-testid `journey-preview-marker`,
 * its exit button `journey-preview-exit`) is rendered only for a browser holding a valid preview pass. A signed-OUT
 * fetch holds no pass, so while the rollout is short of ACTIVE neither testid may be anywhere in its HTML.
 *
 * ⛔ THE STATE IS ASKED OF THE SERVER, NEVER ASSUMED — the invite block's rule (section [F]): GET /api/health →
 * `simpleJourney`. A missing or malformed field, any key beyond `ceiling` and `state` (that body is public: the
 * rollout only, never who changed it or why), or a state ranked ABOVE its ceiling (the state is the LOWER of the
 * ceiling and the Owner's switch) is the health contract changing, and it FAILS rather than let this block guess.
 * ⛔ AN UNREAD PAGE IS NOT A CLEAN PAGE (section [A], 2026-09-14): a route that failed, answered non-200 or did not
 * come back as an HTML document FAILS the no-marker check instead of passing it.
 * Under ACTIVE the checks are SKIPPED — printed with the reason, never passed. While the state is UNKNOWN (the
 * contract check failed) they still run: no marker on a signed-out page is the expectation in every state short of
 * ACTIVE, so an unknown state is no reason to stop looking.
 * `journeyRollout` is read ONCE, here, and section [F] asks the same answer for its signed-in player.
 */
console.log("\n[E2] New journey rollout — /api/health contract + no preview marker on signed-out pages");
const ROLLOUT_WORDS = ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"]; // rank = index: WITHDRAWN < STAFF_PREVIEW < ACTIVE
const PREVIEW_TESTIDS = ["journey-preview-marker", "journey-preview-exit"];
/** Which of the preview marker's testids a page's HTML carries — the element, or the props in the RSC payload. */
const previewMarksIn = (html) => PREVIEW_TESTIDS.filter((id) => html.includes(id));
const journeyRollout = await (async () => {
  let status = 0, body = null, err = "";
  try {
    const r = await fetch(BASE + "/api/health", { headers: { accept: "application/json" } });
    status = r.status;
    body = await r.json().catch(() => null);
  } catch (e) { err = String(e?.message ?? e); }
  const sj = body && typeof body === "object" ? body.simpleJourney : undefined;
  const isObj = !!sj && typeof sj === "object" && !Array.isArray(sj);
  const ceiling = isObj ? sj.ceiling : undefined;
  const state = isObj ? sj.state : undefined;
  const shapeOk = isObj && Object.keys(sj).sort().join(",") === "ceiling,state"
    && ROLLOUT_WORDS.includes(ceiling) && ROLLOUT_WORDS.includes(state);
  const agrees = shapeOk && ROLLOUT_WORDS.indexOf(state) <= ROLLOUT_WORDS.indexOf(ceiling);
  const detail = err ? `(GET /api/health failed: ${err})`
    : !shapeOk ? `(HTTP ${status}; simpleJourney = ${JSON.stringify(sj ?? null)} — the health contract changed: expected exactly { ceiling, state }, each "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE")`
    : !agrees ? `(simpleJourney = ${JSON.stringify(sj)} — state ${state} ranks above its ceiling ${ceiling}, and the state is the LOWER of the ceiling and the Owner's switch)`
    : `(ceiling=${ceiling}, state=${state})`;
  return { ok: shapeOk && agrees, state: shapeOk && agrees ? state : null, detail };
})();
{
  ok(`/api/health states the new journey's rollout (simpleJourney.ceiling, .state; state never above its ceiling)`, journeyRollout.ok, journeyRollout.detail);
  // Controls: the matcher below is the one every no-marker verdict uses, so it is seen to catch and to pass.
  ok(`control · the preview-marker matcher catches the marker and its exit (element and RSC payload)`,
    previewMarksIn(`<div data-testid="journey-preview-marker"><button data-testid="journey-preview-exit">`).length === 2
    && previewMarksIn(`self.__next_f.push([1,"{\\"testId\\":\\"journey-preview-exit\\"}"])`).length === 1);
  ok(`control · …and passes a page without them`, previewMarksIn(`<div data-testid="notice-bar">Preview</div>`).length === 0);
  const JOURNEY_PUBLIC_ROUTES = ["/", "/markets"];
  if (journeyRollout.state !== "ACTIVE") {
    for (const route of JOURNEY_PUBLIC_ROUTES) {
      let status = 0, html = "", err = "";
      try {
        const r = await fetch(BASE + route, { headers: { accept: "text/html" }, redirect: "follow" });
        status = r.status;
        html = await r.text();
      } catch (e) { err = String(e?.message ?? e); }
      const read = status === 200 && /<html[\s>]/i.test(html);
      const marks = read ? previewMarksIn(html) : [];
      ok(`signed out: ${route} carries no preview marker (rollout ${journeyRollout.state ?? "UNKNOWN"})`, read && marks.length === 0,
        err ? `(GET ${route} failed: ${err})`
          : !read ? `(HTTP ${status}, ${html.length} chars, not an HTML document — the page was not read, so nothing was checked)`
          : marks.length ? `(found ${marks.join(", ")} on a page that holds no preview pass)` : "");
    }
  } else {
    console.log(`  ⚠ SKIP  the ${JOURNEY_PUBLIC_ROUTES.length} signed-out no-preview-marker checks (${JOURNEY_PUBLIC_ROUTES.join(", ")}) — /api/health says simpleJourney.state = ACTIVE: the new journey is the product for everyone, so the pre-launch promise that nobody outside the preview sees it no longer applies ${journeyRollout.detail}. NOT measured by this run.`);
  }
}

// ── F. Authed surfaces (LOCAL only — uses /auth/demo, 404 in prod) ──
if (LOCAL) {
  console.log("\n[F] Authed surfaces (local /auth/demo)");
  const ctx = await enContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = attach(page);
  await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);

  // ⭐ ONE NAME FOR ONE DESTINATION (§L1, 2026-08-21). This page was called three things at
  // once — "History" in the top nav, "Bets" in the bottom nav, and "Polls you've played" as
  // its own title, the last of which also borrowed the POLL product's word for a page whose
  // every other string says "market" (§L4). All three now read `common.positions`.
  // ⚠️ This assertion used to accept "History" OR "played", i.e. exactly the two names the
  // rename removed — so it would have gone red on a correct page. Assert the ONE name, and
  // assert the old ones are GONE, so a partial revert cannot pass.
  await page.goto(BASE + "/positions", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  const posBody = await page.locator("body").innerText();
  ok(`/positions names itself once`, posBody.includes("Positions"), `(no Positions label)`);
  ok(`/positions drops the two retired names`, !/Polls you've played/i.test(posBody), `(an old name came back)`);
  ok(`/positions no error overlay`, !(await hasErrorOverlay(page)));

  // Wallet
  await page.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  ok(`/wallet renders`, (await page.locator("body").innerText()).length > 60);
  ok(`/wallet no error overlay`, !(await hasErrorOverlay(page)));

  // Receipts (2026-10-07, owner ruling) — every deposit and withdrawal kept in the app, a door in the profile.
  await page.goto(BASE + "/wallet/receipts", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  ok(`/wallet/receipts renders for the signed-in player, on its own address`,
    new URL(page.url()).pathname === "/wallet/receipts" && /Receipts/.test(await page.locator("h1").first().innerText().catch(() => "")));
  ok(`/wallet/receipts no error overlay`, !(await hasErrorOverlay(page)));

  /**
   * ⭐ THE NEW JOURNEY, SIGNED IN (Vodacom plan S1) — section [E2]'s promise for a signed-in PLAYER: a player holds
   * no preview pass either, so while the rollout is short of ACTIVE "/" carries no preview marker for them. The
   * state is [E2]'s `journeyRollout` (one /api/health read for the whole run); ACTIVE is a printed SKIP, never a pass.
   * ⛔ Counted only when this context really IS signed in (`kp_session` present): a demo sign-in that silently
   * failed would otherwise pass here as a signed-out page. ⛔ And an unread page is not a clean page.
   * Read from the RENDERED document (`page.content()`, after hydration), so a marker painted client-side counts too.
   */
  if (journeyRollout.state !== "ACTIVE") {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
    const signedIn = (await ctx.cookies(BASE)).some((c) => c.name === "kp_session" && !!c.value);
    const homeHtml = await page.content().catch(() => "");
    const homeRead = /<html[\s>]/i.test(homeHtml) && (await page.locator("body").innerText().catch(() => "")).trim().length > 40;
    const homeMarks = homeRead ? previewMarksIn(homeHtml) : [];
    ok(`signed in (demo PLAYER): / carries no preview marker (rollout ${journeyRollout.state ?? "UNKNOWN"})`,
      signedIn && homeRead && homeMarks.length === 0,
      !signedIn ? "(no kp_session cookie — the demo sign-in did not hold, so this was not a signed-in page)"
        : !homeRead ? "(the page could not be read, or rendered no content — nothing was checked)"
        : homeMarks.length ? `(found ${homeMarks.join(", ")} for a player who holds no preview pass)` : "");
  } else {
    console.log(`  ⚠ SKIP  the signed-in no-preview-marker check on / — /api/health says simpleJourney.state = ACTIVE: the new journey is the product for everyone ${journeyRollout.detail}. NOT measured by this run.`);
  }

  /**
   * 🔴 THIS BLOCK HAS BEEN WRONG IN BOTH DIRECTIONS, AND THE HISTORY IS WHY IT IS WRITTEN LIKE THIS.
   *
   * ① It first read `ok("invite shows 10,000 reward", inv.includes("10,000") && /first bet/i…)` —
   *    an assertion its own persona could not reach, because this script signs in at `/auth/demo`,
   *    which mints a PLAYER, and the promo was WITHDRAWN. A gate that cannot pass is not a gate.
   * ② It was then inverted to "the not-found view for a PLAYER", which was true from 2026-09-06
   *    until 2026-09-25 — and is false now: `PRODUCT_STATE.invite` is ACTIVE, so this persona lands
   *    on the live UNPAID body, with a real code, a real link and a real QR.
   *
   * ⭐ SO IT ASSERTS THE PAIR, WHICH IS THE ONLY DESCRIPTION THAT SURVIVES A FLIP OF EITHER SWITCH:
   * the SHARE surface is present, and NO money word is on the page. Asserting only the first would
   * pass on the old paid promo; asserting only the second would pass on the not-found view.
   *
   * ⚠️ A 200 IS NOT A RENDER — measured, and recorded in `invite/page.tsx`'s own note: Next's
   * `notFound()` renders the not-found BODY at 200 here. So this asserts on CONTENT, never a status.
   *
   * ⭐ 2026-09-26 — AND WHETHER THE INVITE PAYS IS NOW THE OWNER'S SWITCH (/admin/affiliate, "Payable /
   * Not payable"), so the MONEY half is asked of the SERVER instead of assumed: GET /api/health →
   * `inviteRewards.paying`. ⛔ PAYING, NOT PAYABLE (review P8, 2026-09-26): after "Make payable → Nothing yet"
   * the switch says payable with every reward off, and every player surface — this page included — then says
   * nothing about money; `paying` is that one player-facing answer, and `payable` is only the switch. The
   * unpaid assertions run only while `paying` is `false`; while it is `true` the paid promo belongs on this
   * page, so they are SKIPPED — printed with the reason, never passed. ⛔ A missing or malformed field is the
   * health contract changing, and it FAILS rather than let this block guess. The SHARE half is asserted in
   * both states: a paid invite still hands the player a link.
   */
  const inviteState = await (async () => {
    let status = 0, body = null, err = "";
    try {
      const r = await fetch(BASE + "/api/health", { headers: { accept: "application/json" } });
      status = r.status;
      body = await r.json().catch(() => null);
    } catch (e) { err = String(e?.message ?? e); }
    const ir = body && typeof body === "object" ? body.inviteRewards : undefined;
    const payable = ir && typeof ir === "object" ? ir.payable : undefined;
    const paying = ir && typeof ir === "object" ? ir.paying : undefined;
    const ceiling = ir && typeof ir === "object" ? ir.ceiling : undefined;
    const shapeOk = typeof payable === "boolean" && typeof paying === "boolean" && ["FORCED", "OWNER", "CLOSED"].includes(ceiling);
    // A FORCED ceiling always pays and a CLOSED one never does, and nothing is PAID unless the switch is
    // payable; a body saying otherwise is broken too.
    const agrees = shapeOk && !(ceiling === "CLOSED" && payable) && !(ceiling === "FORCED" && !payable) && !(paying && !payable);
    const detail = err ? `(GET /api/health failed: ${err})`
      : !shapeOk ? `(HTTP ${status}; inviteRewards = ${JSON.stringify(ir ?? null)} — the health contract changed: expected { payable: boolean, paying: boolean, ceiling: "FORCED" | "OWNER" | "CLOSED" })`
      : !agrees ? `(inviteRewards = ${JSON.stringify(ir)} — payable=${payable}, paying=${paying} under a ${ceiling} ceiling cannot all be true)`
      : `(payable=${payable}, paying=${paying}, ceiling=${ceiling})`;
    return { ok: shapeOk && agrees, paying: shapeOk && agrees ? paying : null, detail };
  })();
  ok(`/api/health states whether a player invite is paid (inviteRewards.paying, .payable, .ceiling)`, inviteState.ok, inviteState.detail);
  await page.goto(BASE + "/profile/invite", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(400);
  const inv = await page.locator("body").innerText();
  // 🔴 THIS ASSERTED `/50PICK-/` AND COULD NEVER PASS. That is the AGENT prefix
  // (`AGENT_CODE_PREFIX = "50PICK-AG-"`); a PLAYER's code is a friendly word built from their
  // display name ("DEMOENDS"), and this script's persona is a PLAYER. A gate that cannot pass is
  // not a gate — it is a permanent red that teaches people to ignore reds, which is the exact
  // failure the paragraph above records this block committing once already. Asserted on the
  // format-independent fact instead: a usable referral link.
  /**
   * ⚠️ THE LINK IS NOT IN `innerText`, AND BOTH OF THESE ASSERTED IT WAS. The referral URL lives in
   * a `<textarea>`'s VALUE (`invite-client.tsx`), and a textarea's value is not its text content —
   * so `body.innerText` carries the page's words, the player's CODE and the disclaimer, but never
   * the URL. The two assertions failed on a page that was rendering perfectly. Measured on a live
   * server, not reasoned about: the same page passes `qa:withdrawn-render` §5, which reads HTML.
   * ⭐ So this reads the ELEMENT the player actually copies, and asserts the anchor too — the
   * `href` a tapped link would follow. Between them they cover both ways the link is offered.
   */
  const refLink = await page.evaluate(() => {
    const ta = document.querySelector("main textarea");
    const byHref = [...document.querySelectorAll("main a[href]")].map((a) => a.getAttribute("href")).find((h) => /\/auth\/register\?ref=/.test(h || ""));
    return { value: ta ? ta.value : "", href: byHref || "" };
  });
  ok(`invite renders the unpaid SHARE body for a PLAYER — a copyable referral link`,
     /\/auth\/register\?ref=[A-Za-z0-9%-]+/.test(refLink.value), JSON.stringify(refLink).slice(0, 200));
  ok(`invite gives the player a code, and exactly one`,
     new Set([refLink.value, refLink.href].filter((u) => /\?ref=/.test(u)).map((u) => u.split("?ref=")[1])).size === 1,
     JSON.stringify(refLink).slice(0, 200));
  // ⛔ THE MONEY HALF. Every one of these is a sentence the PAID promo prints and the unpaid one
  // must not: the earned tile's label, the prize amount, the milestone wording, a commission rate,
  // and the bonus-requirements list. They run only while the server says invites PAY nothing
  // (`inviteState.paying` above — "Make payable → Nothing yet" included): an Owner who arms a reward turns
  // them into a printed SKIP, and a page that pays while the server says it does not still goes red here.
  // WARN: THE WORD BOUNDARIES ARE A CHARACTER CLASS, NOT a backslash-b, DELIBERATELY. A regex
  // word boundary written into this repo through a patch tool has been corrupted into a literal
  // 0x08 BACKSPACE before (agent branch, 2026-09-07): the regex then matches nothing, the
  // negation is always true, and the assertion reads GREEN while testing nothing. `cat -v` or
  // `od -c` shows it; grep, sed and an editor do not. This form cannot be mangled that way.
  if (inviteState.ok && inviteState.paying === false) {
    ok(`invite shows NO earned figure`, !/(^|[^A-Za-z])Earned([^A-Za-z]|$)/i.test(inv) && !/(^|[^A-Za-z])Pato([^A-Za-z]|$)/i.test(inv), inv.slice(0, 200));
    ok(`invite has NO prize amount or milestone line`, !/10,000/.test(inv) && !/first bet/i.test(inv), inv.slice(0, 200));
    ok(`invite has NO commission line`, !inv.includes("50%") && !/%\s*of your friends/i.test(inv));
    ok(`invite has NO deposit-bonus line`, !/bonus on each/i.test(inv) && !/bonus requirements/i.test(inv));
    ok(`invite says plainly that it pays nothing`, /no reward for invites|hailipi zawadi|不为邀请支付/i.test(inv), inv.slice(-220));
  } else {
    console.log(`  ⚠ SKIP  the invite's 5 UNPAID checks (no earned figure, no prize, no commission, no bonus list, the "pays nothing" line) — ${
      inviteState.ok
        ? "/api/health says inviteRewards.paying = true: an invite PAYS, so the paid promo belongs on this page"
        : "the paying state is unknown (the /api/health check above FAILED)"} ${inviteState.detail}. NOT measured by this run.`);
  }
  ok(`invite no error overlay`, !(await hasErrorOverlay(page)));

  // Card-body click opens the market detail WITH NO side preselected (like the
  // Details link); the YES/NO buttons enter with that side locked.
  // A fresh in-memory boot has NO markets, so the board had no card and this block only ever reported "no live card
  // found": seed the catalogue first (idempotent — a no-op once 25 are live; the route is 404 in production).
  if (LOCAL) await fetch(BASE + "/api/dev-test/seed-markets", { method: "POST" }).catch(() => {});
  await page.goto(BASE + "/markets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
  const liveCard = page.locator(".mcardp:has(.mcardp-actions)").first();
  if (await liveCard.count() > 0) {
    // ⛔ Since 8fc9c638 (2026-09-23) a card opens through a stretched link (`.mcardp-open`) laid OVER its body, so the
    // question text sits under it and an element click on `.mcardp-q` is refused ("intercepts pointer events") — the
    // run died here whenever the board had a market. A finger on the question lands on that link: click the question's
    // POINT and let the browser's hit-test choose the element, exactly as a tap does.
    await liveCard.scrollIntoViewIfNeeded();
    const q = await liveCard.locator(".mcardp-q").boundingBox();
    if (q) await page.mouse.click(q.x + q.width / 2, q.y + q.height / 2);
    await page.waitForURL(/\/markets\/mkt_[^?]+$/, { timeout: 8000 }).catch(() => {});
    ok(`live card body click -> details, NO side`, /\/markets\/mkt_/.test(page.url()) && !/\?side=/.test(page.url()), page.url());

    // Back to the board, then click the real YES button → locked dial.
    await page.goto(BASE + "/markets", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
    const yesBtn = page.getByRole("button", { name: /Back YES/ }).first();
    await yesBtn.click();
    await page.waitForURL(/\/markets\/mkt_[^?]+\?side=YES/, { timeout: 12000 }).catch(() => {});
    const id = (page.url().match(/\/markets\/(mkt_[A-Za-z0-9]+)/) || [])[1];
    ok(`YES button opens locked dial (?side=YES)`, /\?side=YES/.test(page.url()), page.url());
    await page.waitForTimeout(400);
    ok(`?side=YES -> Place YES`, (await page.getByRole("button", { name: /Place YES/ }).count()) > 0);
    ok(`?side=YES -> cannot place NO (locked)`, (await page.getByRole("button", { name: /Place NO/ }).count()) === 0);
    ok(`"Your pick" indicator shown`, (await page.locator("body").innerText()).toLowerCase().includes("your pick"));
    ok(`no in-dial switch control (display-only)`, (await page.getByRole("button", { name: /Switch to (YES|NO)|Backing/ }).count()) === 0);
    // Drag-lock: the dial defaults to LOCKED so an accidental brush can't move a
    // set stake; exact entry via the type input must still work while locked.
    const lockToggle = page.locator('[data-testid="dial-lock-toggle"]');
    ok(`dial defaults to LOCKED (drag disabled)`, (await lockToggle.getAttribute("aria-pressed")) === "false", String(await lockToggle.getAttribute("aria-pressed")));
    const stakeBox = page.locator('input[inputmode="numeric"]').first();
    await stakeBox.click(); await stakeBox.fill("3000"); await stakeBox.press("Enter"); await page.waitForTimeout(150);
    ok(`locked dial: exact stake still typeable (3,000)`, (await stakeBox.inputValue()).replace(/\D/g, "") === "3000", await stakeBox.inputValue());
    ok(`typing did not arm the dial (still locked)`, (await lockToggle.getAttribute("aria-pressed")) === "false");
    await lockToggle.click(); await page.waitForTimeout(120);
    ok(`lock toggle arms the dial (drag enabled)`, (await lockToggle.getAttribute("aria-pressed")) === "true");
    const slider = page.getByRole("slider"); await slider.focus();
    for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    ok(`YES locked: knob can't cross centre`, Number(await slider.getAttribute("aria-valuenow")) <= 50);
    if (id) {
      await page.goto(BASE + `/markets/${id}?side=NO`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
      ok(`?side=NO -> Place NO`, (await page.getByRole("button", { name: /Place NO/ }).count()) > 0);
      ok(`?side=NO -> cannot place YES (locked)`, (await page.getByRole("button", { name: /Place YES/ }).count()) === 0);
      // Direct nav without a side must NOT show the unlocked dial.
      await page.goto(BASE + `/markets/${id}`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(500);
      const noSide = await page.locator("body").innerText();
      ok(`no-side detail shows pick-side gate, not a dial`, /Pick your side/i.test(noSide) && (await page.getByRole("slider").count()) === 0);
    }
  } else {
    ok(`at least one bettable market exists`, false, "no live card found");
  }
  ok(`authed flow no console errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();

// ── [F] The certificate behind the proxy — MOVED OUT 2026-08-27 (E-227) ──
//
// ⛔ THIS BLOCK USED TO LIVE HERE AND HAD NEVER EXECUTED ONCE. `predeploy` invokes `qa:live`
// with no `BASE`; `BASE` defaults to `http://localhost:3009`; `LOCAL` is therefore true; and the
// whole certificate block sat inside `if (!LOCAL)`. `qa:live` appeared nowhere in `.github/`.
// FOUR tracked documents called it "a gate and not a reminder" while it could not run at all.
//
// ⚠️ AND THE ONE DOCUMENTED PROD INVOCATION FAILED IT EVERY TIME: `CLAUDE.md` said to run
// `BASE=https://kipindi-production.up.railway.app npm run qa:live`, a hostname absent from
// `ORIGIN_OF`, so it failed on "no known origin" and never on the certificate.
//
// ▶ IT NOW LIVES IN `scripts/cert-expiry-watch.mjs` (`npm run qa:cert-expiry`), which iterates
// BOTH origin hosts rather than selecting one by `new URL(BASE).hostname`, asserts its own
// population, takes the threshold from `CERT_MIN_DAYS` so it is provable RED without editing
// the file, and runs twice weekly in `.github/workflows/cert-expiry.yml`. Proven RED on all
// three failure modes by `npm run red:cert-expiry`.
//
// ⛔ DO NOT RE-ADD A CERTIFICATE CHECK HERE. Two copies of one threshold drift apart, and this
// is the copy that cannot run.

console.log(`\n${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("\nFAILED:\n" + failures.map((f) => "  - " + f).join("\n")); process.exit(1); }
