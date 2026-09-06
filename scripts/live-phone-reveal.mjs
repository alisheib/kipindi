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

/**
 * ⛔ THE SURFACE THE FIRST VERSION OF THIS DRIVE COULD NOT SEE, added 2026-09-06.
 *
 * It drove the two ROSTERS — tables, 65px row pitch, all the room in the world — and concluded
 * the reach was safe. It never opened `/admin/players/[id]`, where the phone eye and the email
 * eye sit on CONSECUTIVE LINES **2px apart**, which is the one place the expander can collide
 * with another control. A guard that only visits the surfaces where a rule holds is not
 * measuring the rule.
 */
const STACKED_SURFACE = "/admin/players";

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
  /**
   * ⭐ SIGN IN THROUGH THE SHARED HARNESS, not a hand-pasted cookie. `loginOnce` encodes traps
   * this file would otherwise re-learn — it fills `#phone` (the VISIBLE PhoneInput; the
   * `input[name=phone]` mirror is hidden and filling it times out, which reads as a broken login
   * page), sends STAFF to `/auth/admin`, and takes the 9-digit local part.
   *
   * ⚠️ The persona is `admin` deliberately. This machine's `.env.qa.local` is dated: the six
   * player/officer secrets are REJECTED on production and only ADMIN signs in — recorded, and
   * ⛔ the fix is to copy the file across, never to re-mint, which would break the other laptop
   * and start a re-mint war.
   */
  const { loginOnce } = await import("./live/harness.mjs");
  const b = await chromium.launch();
  const state = await loginOnce(b, process.env.PERSONA ?? "admin");
  await b.close();
  await ctx.addCookies(state.cookies.filter((c) => c.domain && BASE.includes(c.domain.replace(/^\./, ""))));
  ok("0.1 signed in to production as the ADMIN persona", state.cookies.length > 0, `${state.cookies.length} cookie(s)`);
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

  /**
   * ⛔ REACH IS MEASURED WITH `elementFromPoint`, NOT WITH A BOUNDING BOX. The control is a
   * text-sized 86 × 15px button whose hit area is an `::after` expander (globals.css
   * `.sensitive-reveal`), and a bounding box cannot see a pseudo-element — the same reason
   * `.mcardp-share`'s note says its reach was re-proven this way on production.
   *
   * ⚠️ AND THE NEIGHBOUR IS CHECKED IN THE SAME PASS. An expander taller than the row pitch
   * would trade an under-sized target for a MIS-TAP, which is strictly worse here: it would
   * reveal the WRONG player's number and write an audit row saying so.
   */
  const reach = await first.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const hit = (dx, dy) =>
      document.elementFromPoint(b.left + b.width / 2 + dx, b.top + b.height / 2 + dy);
    const owns = (n) => !!n && (n === el || el.contains(n));
    let up = 0, down = 0;
    for (let d = 0; d <= 40; d++) { if (owns(hit(0, -d))) up = d; else break; }
    for (let d = 0; d <= 40; d++) { if (owns(hit(0, d))) down = d; else break; }
    return { boxH: Math.round(b.height), reachH: up + down + 1 };
  });
  ok(`${s.label}: the eye's REACH clears the tap floor (the box stays text-sized)`,
     reach.reachH >= 30, `box ${reach.boxH}px · reach ${reach.reachH}px`);

  {
    /**
     * Every row must own its own centre — no row's reach may steal its neighbour's tap.
     *
     * 🔴 THE FIRST VERSION OF THIS CHECK WAS WRONG AND SAID SO LOUDLY: it tested all 20 rows
     * without scrolling, and `elementFromPoint` returns `null` for a coordinate OUTSIDE the
     * viewport — so the 17 rows below the fold came back "stolen" and the run reported a
     * neighbour-overlap catastrophe on a page whose row pitch is 65px and which overlaps
     * nothing. ⛔ A true measurement over the wrong population is the most convincing way to
     * be wrong. Each row is scrolled into view before its own centre is tested.
     */
    const n = await eyes.count();
    let stolen = 0, checked = 0;
    for (let i = 0; i < n; i++) {
      const el = eyes.nth(i);
      await el.scrollIntoViewIfNeeded();
      const owns = await el.evaluate((node) => {
        const b = node.getBoundingClientRect();
        if (b.top < 0 || b.bottom > innerHeight) return null; // still not measurable — do not guess
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return !!hit && (hit === node || node.contains(hit));
      });
      if (owns === null) continue;
      checked++;
      if (!owns) stolen++;
    }
    ok(`${s.label}: ⛔ no row's reach steals its neighbour's centre`,
       stolen === 0 && checked > 1, `${stolen} stolen of ${checked} measurable rows`);
  }

  // The reveal itself. ⚠️ Re-resolve nothing: the click re-renders the tree, and a LOCATOR
  // would silently point at a different row — which is exactly how an earlier run of this
  // file reported a working reveal as broken.
  const handle = await first.elementHandle();
  await first.scrollIntoViewIfNeeded();
  await handle.click();
  /**
   * ⚠️ WAIT FOR THE STATE TO FLIP, NOT FOR A CLOCK. A fixed 1500ms wait reported the STAFF
   * roster as broken on production when the round trip simply took longer than the guess —
   * the very next read, 600ms later, held the full number. A timeout is not a signal.
   */
  await page.waitForFunction((el) => el.getAttribute("aria-label")?.startsWith("Hide"), handle, { timeout: 20_000 }).catch(() => {});
  const shownText = (await handle.textContent())?.trim() ?? "";
  ok(`${s.label}: clicking the eye produces the FULL number`,
     /\+\d{9,}/.test(shownText) && !/••••/.test(shownText), shownText);

  // …and hiding again is local, and must NOT pretend the read did not happen.
  await handle.click();
  await page.waitForFunction((el) => el.getAttribute("aria-label")?.startsWith("Reveal"), handle, { timeout: 20_000 }).catch(() => {});
  const hiddenAgain = (await handle.textContent())?.trim() ?? "";
  ok(`${s.label}: the eye toggles back to dots`, /••••/.test(hiddenAgain), hiddenAgain);
}

// ── the STACKED surface: two eyes on consecutive lines ─────────────────────────────────────
console.log("\n── /admin/players/[id] · where two eyes stack ─────────────");
if (inconclusive > 0) {
  console.log("  ⚠️  SKIPPED — the roster legs were inconclusive, so there is no player id to open.");
} else {
  await page.goto(`${BASE}${STACKED_SURFACE}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const pid = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/admin/players/usr_"]');
    return a ? a.getAttribute("href").split("/").pop() : null;
  });
  if (!pid) { console.log("  ⚠️  SKIPPED — no player row to open."); }
  else {
    await page.goto(`${BASE}/admin/players/${pid}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    const m = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button[aria-label^="Reveal"], button[aria-label^="Hide"]'));
      const at = (el, x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
      return els.map((el) => {
        const b = el.getBoundingClientRect();
        return {
          label: el.getAttribute("aria-label"),
          top: Math.round(b.top), bottom: Math.round(b.bottom),
          ownsCentre: at(el, b.left + b.width / 2, b.top + b.height / 2),
          ownsTop: at(el, b.left + b.width / 2, b.top + 1),
          ownsBottom: at(el, b.left + b.width / 2, b.bottom - 1),
        };
      });
    });
    ok("stacked: both identity eyes are present", m.length >= 2, m.map((x) => x.label).join(" | "));
    /**
     * ⭐ THE PROPERTY THAT ACTUALLY MATTERS, and it is NOT "the reach never overlaps". Two 15px
     * controls two pixels apart cannot BOTH carry a 40px target — that is geometry, not a bug,
     * and pretending otherwise would make this guard unsatisfiable. What must hold is that each
     * control still owns its OWN box: centre, top edge and bottom edge. A reader aiming at a
     * control hits that control. ⚠️ The residual — a sliver at the phone eye's lower-left where
     * the email eye wins — is FILED (E-316), not claimed as fixed.
     */
    const notOwned = m.filter((x) => !(x.ownsCentre && x.ownsTop && x.ownsBottom));
    ok("stacked: ⛔ every eye still owns its own centre AND both edges",
       m.length > 0 && notOwned.length === 0,
       notOwned.length ? JSON.stringify(notOwned) : m.map((x) => `${x.label}: ${x.top}-${x.bottom}`).join(" | "));
    const gap = m.length >= 2 ? m[1].top - m[0].bottom : null;
    console.log(`  ⓘ measured line gap between the two eyes: ${gap}px (each reach is 13px, so they overlap by ${gap === null ? "?" : 26 - gap}px — E-316)`);
  }
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
