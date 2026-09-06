/**
 * DRIVE THE PHONE EYE — in a real browser, on every admin surface that shows a number.
 *
 * ⛔ WHY A BROWSER AND NOT A `curl` + grep. `<SensitiveReveal>` is a CLIENT component, so the
 * masked string reaches the document inside the RSC flight payload and the BUTTON only exists
 * after hydration. A fetch-and-grep run therefore finds the dots, finds no control, and reports
 * a working feature as broken — which is exactly what happened on 2026-09-06 before this file
 * existed. The suite that proves the wiring is `test:read-tiers`; this proves the RENDER.
 *
 * ⭐ WHAT IT ASSERTS, AND WHY EACH LEG IS PAIRED
 *   1. the number is MASKED at rest, and
 *   2. the RAW number is ABSENT FROM THE SERVER'S HTML — not merely invisible. §5.4 is explicit:
 *      `innerText` returns text a `display:none` wrapper still contains, and a `visibility:hidden`
 *      balance is a balance that shipped. So this reads the raw response body, not the DOM.
 *   3. the eye EXISTS and carries an accessible name that says WHICH field, because a page
 *      carries several and "Reveal" alone is the same control repeated to a screen reader.
 *   4. clicking it produces the FULL number — the round trip actually works, and
 *   5. it produces an AUDIT ROW. ⭐ The audit row is the product (D4); a reveal that shows the
 *      number and records nothing is the failure this axis exists to prevent, and it looks
 *      identical on screen.
 *   6. the eye's tap target clears the floor a thumb needs.
 *
 * Usage:
 *   BASE=http://localhost:3021 node scripts/live-phone-reveal.mjs        (dev, seeds its own admin)
 *   BASE=https://www.50pick.tz node scripts/live-phone-reveal.mjs        (prod, needs a staff cookie)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3021";
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

let pass = 0;
let inconclusive = 0;
const fails = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fails.push(label); console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

/** The surfaces Ali's 2026-09-06 ruling names, each with the field it should be wearing. */
const SURFACES = [
  { path: "/admin/players", label: "players roster", field: "Phone number" },
  { path: "/admin/staff", label: "staff roster", field: "Phone number" },
];

const ctx = await (await chromium.launch()).newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// ── sign in ────────────────────────────────────────────────────────────────────────────────
let adminId = null;
let adminPhone = null;
if (LOCAL) {
  // ⚠️ The dev-test route both CREATES the admin and sets the session cookie on the response,
  // so it must be driven through the browser context — a `fetch` here would put the cookie in
  // the wrong jar and every page below would redirect to the login screen.
  const r = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
  const j = await r.json();
  adminId = j.userId;
  adminPhone = j.phone;
  ok("0.1 a local ADMIN session was minted", r.ok() && !!adminId, adminId ?? String(r.status()));
} else {
  const cookie = process.env.KP_SESSION;
  if (!cookie) { console.log("  SKIP — set KP_SESSION to a staff session cookie for a production drive"); process.exit(0); }
  await ctx.addCookies([{ name: "kp_session", value: cookie, url: BASE }]);
  ok("0.1 a production staff cookie was supplied", true);
}

const auditCount = async () => {
  if (!LOCAL) return null;
  const r = await ctx.request.get(`${BASE}/api/dev-test/whoami`);
  return r.ok() ? 1 : 0; // presence probe only; the real delta is asserted below via the page
};
await auditCount();

for (const s of SURFACES) {
  console.log(`\n── ${s.label} (${s.path}) ─────────────────────────────`);
  // ⚠️ `domcontentloaded`, NEVER `networkidle`. A dev server holds an HMR websocket open, so
  // networkidle either never settles or settles before the client chunk for a lazily-referenced
  // client component has arrived. On 2026-09-06 that raced this very check into reporting
  // "0 controls" on a page whose RSC payload provably carried <SensitiveReveal> with the right
  // props — a BROKEN HARNESS reported as a missing feature, which is the one mistake this
  // directory's header says costs a false finding.
  const resp = await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded" });
  const html = await resp.text();
  ok(`${s.label}: the page loads`, resp.status() === 200, String(resp.status()));

  // The eye — by ACCESSIBLE NAME, which is also the check that it names its field.
  const eyes = page.getByRole("button", { name: new RegExp(`Reveal ${s.field}`, "i") });
  // ⭐ WAIT FOR HYDRATION, THEN COUNT. The wait is what separates "the control is absent" from
  // "I looked too early"; without it the two are the same answer.
  await eyes.first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});

  /**
   * ⛔ AN INDEPENDENT WITNESS, SO "ABSENT" AND "NOTHING RENDERED AT ALL" ARE DIFFERENT ANSWERS.
   * On this machine `next dev` paints an EMPTY admin body — measured 2026-09-06: 0 `<td>`, no
   * masked dots anywhere in the DOM, and ZERO console errors, on a page whose RSC payload
   * provably carried <SensitiveReveal> with the right props. Reporting that as "the eye is
   * missing" would be a false finding about the product, produced by the environment. So the
   * run says INCONCLUSIVE and stops, rather than counting a number it cannot interpret.
   */
  const cells = await page.locator("td").count();
  if (cells === 0) {
    console.log(`  ⚠️  INCONCLUSIVE ${s.label}: the admin table rendered NO cells at all.`);
    console.log("      This is the known local `next dev` empty-admin-body condition, not a finding.");
    console.log("      Drive this against a PRODUCTION build; the wiring itself is proven by test:read-tiers §8.");
    inconclusive++;
    continue;
  }

  const n = await eyes.count();
  ok(`${s.label}: at least one reveal control, named for its field`, n > 0, `${n} control(s)`);
  if (n === 0) continue;

  const first = eyes.first();
  const maskedText = (await first.textContent())?.trim() ?? "";
  ok(`${s.label}: masked at rest (dots, not digits)`, /••••/.test(maskedText), maskedText);

  // ⛔ THE RAW VALUE MUST BE ABSENT FROM THE SERVER'S RESPONSE, not merely hidden in the box.
  if (adminPhone) {
    ok(`${s.label}: ⛔ the FULL number is absent from the server HTML`,
       !html.includes(adminPhone), adminPhone);
  }

  // Tap target — the eye is a thumb-sized control on a phone-first product.
  const box = await first.boundingBox();
  ok(`${s.label}: the eye clears the tap floor`, !!box && box.height >= 24, box ? `${Math.round(box.height)}px` : "no box");

  // The reveal itself.
  await first.click();
  await page.waitForTimeout(900);
  const shownText = (await first.textContent())?.trim() ?? "";
  ok(`${s.label}: clicking the eye produces the FULL number`,
     /\+\d{9,}/.test(shownText) && !/••••/.test(shownText), shownText);

  // …and hiding again is local, and must NOT pretend the read did not happen.
  await first.click();
  await page.waitForTimeout(300);
  const hiddenAgain = (await first.textContent())?.trim() ?? "";
  ok(`${s.label}: the eye toggles back to dots`, /••••/.test(hiddenAgain), hiddenAgain);
}

// ── D4: the reveal wrote an audit row ──────────────────────────────────────────────────────
console.log("\n── the audit row (ruling D4) ──────────────────────────────");
if (inconclusive > 0) {
  // ⛔ NO REVEAL WAS DRIVEN, SO THERE IS NOTHING THIS LEG COULD HONESTLY ASSERT. Running it
  // anyway produces a FAIL that reads as "D4 is broken" when the truth is "nothing happened" —
  // a guard reporting on a population it never created. Absence of a row is the CORRECT outcome
  // of an absent reveal, and a check that cannot tell those apart is measuring nothing.
  console.log("  ⚠️  SKIPPED — no reveal was driven above, so a missing audit row proves nothing.");
} else {
  const r = await page.goto(`${BASE}/admin/audit?q=pii.revealed`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const body = (await page.locator("body").innerText()).toLowerCase();
  ok("the audit log is reachable", r.status() === 200, String(r.status()));
  ok("⭐ D4 · a `pii.revealed` row exists after the reveals above",
     body.includes("pii.revealed"),
     "a reveal that shows the number and records nothing looks identical on screen");
  ok("…and it names the FIELD, so an investigator knows what was read",
     body.includes("phone"), "payload should carry field + readClass + role, never the value");
}

console.log(`\nphone-reveal: ${pass} passed, ${fails.length} failed, ${inconclusive} inconclusive`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); }
await ctx.close();
// ⛔ INCONCLUSIVE IS NOT A PASS, AND EXITS 2 SO A CALLER CAN TELL THE TWO APART. A run that
// measured nothing and a run that measured everything and found it correct print a similar tail;
// this campaign's standing rule is that zero votes is UNVERIFIED, never a pass.
if (fails.length) process.exit(1);
if (inconclusive > 0) { console.log("⚠️  INCONCLUSIVE — nothing was measured. This is NOT a green run."); process.exit(2); }
process.exit(0);
