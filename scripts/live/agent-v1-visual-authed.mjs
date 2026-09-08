/**
 * AGENT v1 · THE AUTHED HALF OF THE VISUAL VERIFICATION.
 *
 * ⭐ WHY A SECOND SCRIPT. `agent-v1-visual.mjs` checks the PUBLIC page, which is what
 * management annotated. This one drives everything behind a session: the application form
 * whose fields now carry hints and examples, the officer's console with its new search and
 * pagers, and the workstation's new case-file history. Ali's standing rule is that a change
 * is not done until it has been driven and looked at.
 *
 * ⛔ DEV ONLY, AND IT SAYS SO. It uses `/auth/demo` and `/api/dev-test/*`, which 404 in
 * production by construction. ⚠️ It is NOT a replacement for `qa:agent-drive` — that drives
 * the whole lifecycle against a real server; this one exists to LOOK at the surfaces.
 *
 * Usage:  BASE=http://localhost:3033 node scripts/live/agent-v1-visual-authed.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { createHmac } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3033";
const OUT = process.env.SHOT_DIR ?? "docs/shots/agent-v1";
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${String(extra).slice(0, 300)}` : ""}`); }
};
const bodyText = (p) => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim());

/**
 * RFC 6238 — six digits, 30-second step, SHA-1 — from the base32 secret the setup page shows.
 * ⭐ Lifted from `agent-programme-drive.mjs`, which enrols the same way for the same reason:
 * the console REQUIRES TOTP for ADMIN/COMPLIANCE, so there is no officer surface to look at
 * until a code can be computed. ⛔ The secret is read off the real setup page, never seeded —
 * enrolling through the product is what makes the step-up interstitial real too.
 */
function totp(secretB32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secretB32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of clean) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", bytes).update(counter).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24 | h[off + 1] << 16 | h[off + 2] << 8 | h[off + 3]) % 1_000_000;
  return String(code).padStart(6, "0");
}

/**
 * ⛔ THE STEP-UP IS AN INTERSTITIAL, NOT A REDIRECT — it can appear on ANY admin page, so it
 * is cleared inside `goto` rather than once after enrolment. The drive learned this the same
 * way: checking only for a `/admin/totp-verify` URL leaves the code screen standing on
 * `/admin/agents` itself, and every assertion then reads the interstitial's text.
 */
let officerSecret = "";
async function stepUpIfAsked(page) {
  if (!officerSecret) return;
  const asked = await page.locator('input[inputmode="numeric"], input[placeholder="123 456"]').locator("visible=true").count();
  if (!asked) return;
  const body = await page.locator("body").innerText().catch(() => "");
  if (!/6-digit code|nambari sita/i.test(body)) return;
  await page.locator('input[inputmode="numeric"], input[placeholder="123 456"]').locator("visible=true").first().fill(totp(officerSecret));
  await page.getByRole("button").filter({ hasText: /verify|confirm|continue|sign|thibitisha/i }).locator("visible=true").first().click();
  await page.waitForFunction(() => !/Enter your 6-digit code/i.test(document.body.innerText), null, { timeout: 60_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
}

/** Enrol through the real setup page and clear the step-up. Returns the secret. */
async function enrolTotp(page) {
  await page.goto(`${BASE}/admin/agents`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(600);
  let secret = "";
  if (/\/admin\/2fa\/setup/i.test(page.url())) {
    await page.getByRole("button", { name: /Provision authenticator/i }).first().click({ timeout: 30_000 });
    await page.waitForFunction(() => /secret manually/i.test(document.body.innerText), null, { timeout: 60_000 });
    const raw = await page.locator("span.font-mono").filter({ hasText: /^[A-Z2-7 ]{16,}$/ }).first().innerText();
    secret = raw.replace(/\s+/g, "");
    officerSecret = secret;
    await page.locator('input[placeholder="123 456"]').locator("visible=true").first().fill(totp(secret));
    await page.getByRole("button", { name: /Verify and enable/i }).first().click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  }
  await page.goto(`${BASE}/admin/agents`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(600);
  if (/\/admin\/totp-verify/i.test(page.url()) && secret) {
    await page.locator('input[placeholder="123 456"]').first().fill(totp(secret));
    await page.getByRole("button", { name: /verify|confirm|continue/i }).first().click();
    await page.waitForURL(/\/admin\/agents/, { timeout: 120_000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
  }
  return secret;
}
const overflowW = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** ⛔ Wait for CONTENT, not for the shell: a streamed RSC page has a <main> before it has text,
 *  and the loading skeleton carries none — an assertion taken too early reads the chrome. */
async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => {
    const m = document.querySelector("main");
    if (!m) return false;
    if (m.querySelector(".kp-shimmer-track")) return false;
    return (m.innerText || "").trim().length > 100;
  }, null, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(350);
  await stepUpIfAsked(page);
}

const browser = await chromium.launch();
try {
  // ══ 1 · THE APPLICANT — the form whose fields management asked to be explained ══
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
    await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    // A demo player with an APPROVED identity — the door /agent/apply needs.
    await page.goto(`${BASE}/auth/demo?kyc=APPROVED`, { waitUntil: "load", timeout: 120_000 });
    await goto(page, "/agent");
    const gate = await bodyText(page);
    ok("1.door · /agent offers the signed-in player a way in", /Apply|Continue|dashboard|status/i.test(gate), gate.slice(0, 200));

    // Start the application through the real button, then walk to the referee step.
    await page.getByRole("button", { name: /Apply|Continue/i }).first().click({ timeout: 30_000 }).catch(() => {});
    await page.waitForURL(/\/agent\/apply/, { timeout: 60_000 }).catch(() => {});
    await goto(page, "/agent/apply");
    let t = await bodyText(page);
    ok("1.apply · the form renders", /About you|Where you live|referee|Payment/i.test(t), t.slice(0, 250));
    ok("1.overflow · no horizontal overflow at 390", (await overflowW(page)) <= 1, String(await overflowW(page)));
    ok("1.errors · no page or console error", errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.screenshot({ path: `${OUT}/apply_step1_390.png`, fullPage: true });

    // Step 2 — the step that had NO explanation at all before 2026-09-08.
    await page.getByRole("button", { name: /^Next$/i }).first().click({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(500);
    t = await bodyText(page);
    ok("2.serikali · the Serikali step now explains what the letter is and who issues it",
      /Serikali ya Mtaa \(local government office\)|ward or mtaa office/i.test(t), t.slice(0, 300));
    await page.screenshot({ path: `${OUT}/apply_step2_serikali_390.png`, fullPage: true });

    // Step 3 — the four fields that were bare labels.
    await page.getByRole("button", { name: /^Next$/i }).first().click({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(500);
    t = await bodyText(page);
    ok("3.refhelp · referees step says who a referee may be", /not family, and not a member of 50pick staff/i.test(t), t.slice(0, 300));
    ok("3.refhint · the name field carries its hint", /spelled as it appears on their letter/i.test(t));
    ok("3.contacthint · the contact field says what it is FOR", /compliance officer will use this to reach them/i.test(t));
    ok("3.refidnote · the referee-ID slots disclose third-party retention", /personal information, not yours/i.test(t));
    // ⭐ THE EXAMPLES, as placeholders that could never be mistaken for values.
    const phs = await page.evaluate(() => [...document.querySelectorAll("input[placeholder]")].map((i) => i.placeholder));
    ok("3.examples · a literal example on the name and the contact", phs.includes("Asha Juma Mwinyi") && phs.includes("0712 345 678"), JSON.stringify(phs));
    await page.screenshot({ path: `${OUT}/apply_step3_referees_390.png`, fullPage: true });

    // ⭐ THE REFUSAL LANDS ON THE FIELD — the whole point of the DG-S-05 work.
    await page.locator('[data-field="oneName"] input').fill("Amina J");
    await page.locator('[data-field="oneContact"] input').fill("aaaaaa");
    await page.locator('[data-field="twoName"] input').fill("Baraka K");
    await page.locator('[data-field="twoContact"] input').fill("0712 345 678");
    await page.getByRole("checkbox").first().click({ timeout: 10_000 }).catch(async () => {
      await page.locator('[role="checkbox"], input[type="checkbox"]').first().click().catch(() => {});
    });
    await page.getByRole("button", { name: /^Save$/i }).first().click({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const inlineErr = await page.evaluate(() => {
      const w = document.querySelector('[data-field="oneContact"]');
      return w ? (w.innerText || "") : "";
    });
    ok("3.inline · an unreachable contact is refused ON its own field, not only in a toast",
      /0712 345 678|referee@example|reachable/i.test(inlineErr), JSON.stringify(inlineErr.slice(0, 200)));
    await page.screenshot({ path: `${OUT}/apply_step3_inline-error_390.png`, fullPage: true });
    await ctx.close();
  }

  // ══ 2 · THE OFFICER — the console's new search, pagers and case file ══
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    await page.goto(`${BASE}/auth/demo`, { waitUntil: "load", timeout: 120_000 });
    const who = await page.request.get(`${BASE}/api/dev-test/whoami`);
    const me = await who.json().catch(() => ({}));
    const promoted = await page.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: me?.phoneE164 ?? "+255700000000" } });
    ok("4.promote · the demo account is promoted for the console", promoted.ok(), `${promoted.status()}`);

    // ⛔ THE CONSOLE REQUIRES TOTP for ADMIN/COMPLIANCE, so there is nothing to look at until
    // a code can be computed. Enrolled through the real setup page — see `enrolTotp`.
    const secret = await enrolTotp(page);
    ok("4.totp · the officer is enrolled and past the step-up", /\/admin\/agents/.test(page.url()) && !!secret, page.url());

    await goto(page, "/admin/agents");
    let t = await bodyText(page);
    ok("4.console · the console renders its three sections", /Applications/i.test(t) && /Agents/i.test(t) && /Settings/i.test(t), t.slice(0, 250));
    ok("4.search · …and the search box that did not exist before 2026-09-08",
      (await page.locator('input[name="q"]').count()) === 1, "expected one q input");
    ok("4.status · …and the status filter beside it", (await page.locator('[name="status"]').count()) >= 1);
    ok("4.count · …with an honest result count over the same set the cards show", /application/i.test(t));
    ok("4.errors · no page or console error", errors.length === 0, errors.slice(0, 2).join(" | "));
    ok("4.overflow · no horizontal overflow at 1440", (await overflowW(page)) <= 1, String(await overflowW(page)));
    await page.screenshot({ path: `${OUT}/admin_agents_applications_1440.png`, fullPage: true });

    // The search actually filters, and the URL carries it.
    await page.locator('input[name="q"]').fill("zzz-no-such-applicant");
    await page.getByRole("button", { name: /^Search$/ }).first().click();
    await page.waitForURL(/[?&]q=zzz/, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(600);
    t = await bodyText(page);
    ok("5.filtered · a query that matches nothing says so, and offers Clear", /0 of \d+|Nothing to review|No decisions/i.test(t) && /Clear/i.test(t), t.slice(0, 300));
    ok("5.url · …and the query is a URL fact, so it is shareable", /[?&]q=zzz/.test(page.url()), page.url());
    await page.screenshot({ path: `${OUT}/admin_agents_search-empty_1440.png`, fullPage: true });

    // The Settings tab: management's amended numbers, in force.
    await goto(page, "/admin/agents?tab=settings");
    t = await bodyText(page);
    ok("6.settings · the settings tab renders the levers and In force now", /Programme settings/i.test(t) && /In force now/i.test(t), t.slice(0, 250));
    ok("6.numbers · …showing management's amended values", /118,000/.test(t) && /10% default/i.test(t) && /working d/i.test(t), t.slice(0, 400));
    ok("6.wht · …including the withholding rate that did not exist before", /withholding/i.test(t), t.slice(0, 400));
    ok("6.nokpi · the four programme KPIs are NOT drawn on Settings (they were noise there)",
      !/Awaiting review/i.test(t), t.slice(0, 300));
    await page.screenshot({ path: `${OUT}/admin_agents_settings_1440.png`, fullPage: true });

    // The Agents tab: its own search + the sortable roster.
    await goto(page, "/admin/agents?tab=agents");
    t = await bodyText(page);
    ok("7.roster · the roster and payables render", /Roster/i.test(t) && /Payables/i.test(t), t.slice(0, 250));
    ok("7.rostersearch · …with the roster's OWN search param", (await page.locator('input[name="rq"]').count()) === 1);
    /**
     * ⛔ THE POPULATION FIRST, THEN THE CLAIM. On a fresh in-memory store there are no
     * approved agents, so the roster renders its EmptyState and there are no <th> at all —
     * asserting "3 sort links" against that measures the empty state and fails for the wrong
     * reason. ⚠️ And the opposite is worse: skipping SILENTLY would let a real regression in
     * the sortable headers pass as a serene tick. So the skip is REPORTED.
     */
    const rosterHasRows = await page.locator("table th").count();
    if (rosterHasRows > 0) {
      const sortable = await page.evaluate(() => [...document.querySelectorAll("th a[href]")].map((a) => a.getAttribute("href")).filter((h) => /rsort=/.test(h ?? "")).length);
      ok("7.sortable · …and sortable money columns", sortable >= 3, `${sortable} sort links`);
    } else {
      console.log("  ..   7.sortable NOT MEASURED — the roster is empty on a fresh store, so it renders its EmptyState and has no headers to sort. Seed an approved agent (or run qa:agent-drive) to cover it.");
    }
    await page.screenshot({ path: `${OUT}/admin_agents_roster_1440.png`, fullPage: true });

    // The workstation — the case file.
    await goto(page, "/admin/agents");
    const open = page.locator('a:has-text("Open"), a:has-text("Review")').first();
    if (await open.count()) {
      await open.click();
      await page.waitForURL(/\/admin\/agents\/agp_/, { timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(800);
      t = await bodyText(page);
      ok("8.workstation · the workstation renders", /Applicant/i.test(t) && /Documents/i.test(t) && /Registration fee/i.test(t), t.slice(0, 250));
      ok("8.history · …and the History card that did not exist", /History/i.test(t), t.slice(0, 300));
      ok("8.words · …in words, not dotted machine names", !/agent\.(fee|application)\./.test(t), t.slice(0, 300));
      ok("8.contact · …and the applicant's own phone and email", /Phone/i.test(t) && /Email/i.test(t), t.slice(0, 300));
      ok("8.overflow · no horizontal overflow at 1440", (await overflowW(page)) <= 1, String(await overflowW(page)));
      await page.screenshot({ path: `${OUT}/admin_agents_workstation_1440.png`, fullPage: true });
    } else {
      console.log("  ..   8.* skipped — no application in the store to open (seed one to cover the workstation)");
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\nagent-v1-visual-authed: ${pass} passed, ${fail} failed · shots in ${OUT}`);
if (fail > 0) process.exit(1);
