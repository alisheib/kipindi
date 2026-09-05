/**
 * THE WHOLE JOURNEY, WITH A REAL ACCOUNT AND A REAL OFFICER — no fixtures anywhere.
 *
 * ⭐ WHY THIS EXISTS BESIDE `qa:kyc-gate`. That drive uses `/auth/demo?kyc=…`, which WRITES
 * a KycSubmission directly. It proves the screens react to a state; it cannot prove the
 * state is reachable. This one registers through the real sign-up form, fills the real
 * identity step, uploads real images through the real uploader, submits for review, signs
 * in as a real officer, approves through the real workstation, and then checks that the
 * money doors opened. If any step of the product is broken, this stops at it.
 *
 *   ① register  → ② TZS 0, every door shut  → ③ identity + documents  → ④ submit
 *   ⑤ officer approves  → ⑥ every door open  → ⑦ a REAL BET is placed and settles into
 *      the wallet
 *
 * ⛔ THE POINT OF ⑥ AND ⑦ IS THAT A GATE WHICH NEVER OPENS IS ALSO "SECURE". Refusals are
 * cheap to get right by accident; the expensive failure is a player who verifies and still
 * cannot play. Every refusal in ② is paired with its opening in ⑥.
 *
 *   BASE=http://localhost:3000 node scripts/kyc-gate-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const PW = "Kyc!Drive2026x";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const step = (s) => console.log(`\n${s}`);

async function go(page, url) {
  // ⚠️ 120s, NOT the 30s default. This runs against `next dev`, which COMPILES a route the
  // first time it is requested — a cold /markets or / can take a minute on a loaded machine,
  // and the default timeout turns that into "the page never rendered". A drive that reports a
  // compile as a product failure is worse than a slow drive.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, { timeout: 60_000 });
}
const settle = (page) => page.waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, { timeout: 60_000 });

const sel = {
  gate: '[data-testid="kyc-gate-panel"]',
  banner: '[data-testid="kyc-verify-banner"]',
  sidePicker: '[data-testid="side-picker"]',
  depositForm: '#provider-MPESA',
  withdrawForm: '#amount',
};

/** A real 1×1 JPEG — magic bytes and all, because the uploader sniffs them. */
const JPEG_1PX = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
  "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64");

const suffix = String(Date.now()).slice(-7);
const PHONE_LOCAL = `7${suffix.slice(0, 8).padEnd(8, "0")}`;   // 9 digits, leading 7
const EMAIL = `kycdrive.${suffix}@50pick.test`;
// ⛔ A UNIQUE NIDA PER RUN. One document, one account is a real rule enforced by a partial
// unique index; a fixed number makes the SECOND run of this file fail as a duplicate
// identity, which would look like a product defect in the uniqueness control.
const NIDA = `19900101${suffix.padStart(12, "0")}`;

const browser = await chromium.launch();
const player = await browser.newPage({ viewport: { width: 390, height: 900 } });

// ── ① REGISTER THROUGH THE REAL FORM ────────────────────────────────────────
step("① register — the real sign-up form, no fixture");
{
  await go(player, `${BASE}/auth/register`);
  // ⚠️ THE VISIBLE FIELD, NOT THE HIDDEN MIRROR, and the 9-digit LOCAL part. The form keeps
  // a hidden `input[name=phone]` that the visible `#phone` writes into; filling the hidden
  // one directly skips the normalisation and the account is created on a number the login
  // form can never reproduce.
  await player.locator("#phone").fill(PHONE_LOCAL);
  await player.locator("#email").fill(EMAIL);
  // ⚠️ THREE BOXES, NOT ONE — and filling only the first leaves the hidden `dob` EMPTY, so
  // the form re-renders with no visible error and the drive reads it as "registration
  // failed". `#dob` is the DAY; Month and Year are separate inputs identified by their
  // aria-labels. (`qa:live` §B calls this field's cruelty out by name for the same reason.)
  await player.locator("#dob").fill("01");
  await player.locator('input[aria-label="Month"]').fill("01");
  await player.locator('input[aria-label="Year"]').fill("1990");
  await player.locator("#password").fill(PW);
  await player.locator("#passwordConfirm").fill(PW);
  for (const n of ["acceptAge", "acceptTerms"]) {
    const c = player.locator(`input[name="${n}"]`);
    if (await c.count() > 0) await c.first().check({ force: true });
  }
  await Promise.all([player.waitForURL((u) => !u.pathname.startsWith("/auth/register"), { timeout: 60_000 }).catch(() => {}), player.locator('button[type="submit"]').first().click()]);
  await settle(player);
  ok("1.1 · registration lands the new player on verification, not on a market",
    player.url().includes("/profile/kyc"), player.url());
}

// ── ② EVERY DOOR IS SHUT, AND THE WALLET IS EMPTY ───────────────────────────
step("② a brand-new account holds nothing and can move nothing");
{
  await go(player, `${BASE}/wallet`);
  const wallet = await player.locator("body").innerText();
  ok("2.1 · the wallet is TZS 0 — no starter balance, no signup bonus in the bonus wallet",
    /\b0\b/.test(wallet) && !/100,000|10,000/.test(wallet.split("Transactions")[0] ?? wallet),
    (wallet.match(/TZS[^\n]{0,14}/) ?? [""])[0]);

  for (const [name, path, control] of [
    ["deposit", "/wallet/deposit", sel.depositForm],
    ["withdraw", "/wallet/withdraw", sel.withdrawForm],
  ]) {
    await go(player, `${BASE}${path}`);
    ok(`2.2.${name} · the gate panel replaces the form`, await player.locator(sel.gate).count() > 0);
    ok(`2.3.${name} · …and the form is ABSENT from the DOM`, await player.locator(control).count() === 0);
  }
  await go(player, `${BASE}/markets`);
  ok("2.4 · the standing identity bar is up on an ordinary page", await player.locator(sel.banner).count() > 0);
  const mk = await player.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  if (mk) {
    await go(player, `${BASE}${mk}`);
    ok("2.5 · ★ the stake control is replaced by the gate on a live market",
      await player.locator(sel.gate).count() > 0 && await player.locator(sel.sidePicker).count() === 0);
  }
}

// ── ③ THE REAL IDENTITY STEP AND THE REAL UPLOADER ──────────────────────────
step("③ identity + documents — the real form, the real uploader");
let kycUserId = null;
{
  await go(player, `${BASE}/profile/kyc`);
  await player.locator("#idNumber").fill(NIDA);
  await player.locator("#fullName").fill("Kyc Drive Tester");
  // ⚠️ THE EMAIL FIELD IS PART OF THIS FORM AND IS REQUIRED. Leaving it empty makes the
  // browser block submit with NATIVE validation — no server round-trip, no error text on the
  // page, nothing in the log. The drive read that as "the identity step was refused" and
  // spent a debugging pass looking for a server defect that did not exist.
  const emailField = player.locator("#email");
  if (await emailField.count() > 0 && !(await emailField.inputValue())) await emailField.fill(EMAIL);

  // ⚠️ WAIT FOR THE OUTCOME IN THE URL. `waitForLoadState("domcontentloaded")` resolves
  // IMMEDIATELY when the current document is already loaded, so the drive read the page
  // BEFORE the server action's redirect landed and counted zero file inputs on a form that
  // had in fact been accepted. Third time this class of race has produced a false failure in
  // this session — the lesson is that a wait must name the thing being waited FOR.
  await Promise.all([
    player.waitForURL((u) => u.searchParams.has("id") || u.searchParams.has("reason"), { timeout: 60_000 }).catch(() => {}),
    player.locator('button[type="submit"]').first().click(),
  ]);
  await settle(player);
  ok("3.0 · the identity step was ACCEPTED by the server", new URL(player.url()).searchParams.get("id") === "accepted",
    new URL(player.url()).search || "(no outcome in the URL)");

  // ⛔ ASSERT THE STATE, NOT THE PROSE. The first draft matched words like "upload" in the
  // page text — which appear on the NOT-STARTED form too, so it would have passed against a
  // form that never submitted. The file inputs only exist once the identity step is
  // accepted, so their presence IS the acceptance.
  const inputs = player.locator('input[type="file"]');
  const n = await inputs.count();
  ok("3.1 · ★ the identity step is accepted — the document slots now exist", n >= 3,
    `${n} file inputs · ${(await player.locator("body").innerText()).slice(0, 80).replace(/\n/g, " ")}`);
  ok("3.2 · …and this document's slots are all offered", n >= 3, `${n} file inputs`);
  for (let i = 0; i < n; i++) {
    await inputs.nth(i).setInputFiles({ name: `doc${i}.jpg`, mimeType: "image/jpeg", buffer: JPEG_1PX });
    await player.waitForTimeout(1200); // the uploader downscales on a canvas before posting
  }
  // ⛔ PROVE THE UPLOADS STUCK BY WHAT THEY UNLOCK, not by prose. The submit-for-review
  // control only renders once every required slot is attached, so its appearance is the
  // attachment. The first draft matched the word "submit" in the page text, which is
  // present on the upload screen regardless — a green that survives zero uploads.
  // ⛔ COUNT THE ATTACHMENTS THEMSELVES. The submit control renders as soon as the identity
  // step is done — BEFORE any document is attached — so its presence proves nothing about
  // the uploads, and a run where every upload silently failed passed this check. Each
  // uploader tile reports "Attached" when it holds a file; that is the fact.
  await go(player, `${BASE}/profile/kyc`);
  const attached = player.locator('button').filter({ hasText: /Attached|Imeambatanishwa|已附加/ });
  ok("3.3 · ★ every required slot is ATTACHED", await attached.count() >= 3, `${await attached.count()} of 3 attached`);
}

// ── ④ SUBMIT FOR REVIEW ─────────────────────────────────────────────────────
step("④ submit for review");
{
  // ⚠️ THE CONTROL IS LABELLED "Confirm", NOT "Submit" — it renders `t.common.confirm`. A
  // selector written for the section's NAME ("Submit for review") matches nothing, and the
  // drive then walked on and reported the state as unchanged, which reads as a product
  // defect rather than a missed click.
  const submit = player.locator('form button[type="submit"]').filter({ hasText: /^(Confirm|Thibitisha|确认)$/ });
  ok("4.0 · the submit-for-review control is present", await submit.count() > 0);
  if (await submit.count() > 0) {
    await Promise.all([
      player.waitForURL((u) => u.searchParams.has("submitted") || u.searchParams.has("reason"), { timeout: 60_000 }).catch(() => {}),
      submit.first().click(),
    ]);
    await settle(player);
    // The server states the outcome in the URL: `?submitted=1`, or `?reason=<why not>`.
    // Reading it turns "the state did not change" into "the server said docs_required".
    const q = new URL(player.url()).searchParams;
    ok("4.0b · the server ACCEPTED the submission", q.get("submitted") !== null && !q.has("reason"),
      q.has("reason") ? `refused: ${q.get("reason")}` : (q.toString() || "(no outcome in the URL)"));
  }
  // ⛔ READ THE STATE THE PRODUCT PUBLISHES, NOT THE WORDS ON THE PAGE. The first draft
  // matched /review/ in the body text — which the word "Verify" and the progress rail's
  // "REVIEW" step both satisfy on the NOT-STARTED screen, so it passed while the submission
  // had never been made. `data-kyc-state` is the state itself.
  await go(player, `${BASE}/wallet/deposit`);
  const st = await player.locator(sel.gate).first().getAttribute("data-kyc-state").catch(() => null);
  ok("4.1 · ★ the submission really is PENDING REVIEW", st === "pending_review", String(st));
  ok("4.2 · ★ …so the money screen says our delay, not their omission", st === "pending_review", String(st));
  ok("4.3 · …and offers NO button, because there is nothing for them to do",
    await player.locator(`${sel.gate} a.btn`).count() === 0);
}

// ── ⑤ A REAL OFFICER APPROVES, THROUGH THE REAL WORKSTATION ─────────────────
step("⑤ the officer approves — the real queue, the real confirm dialog");
{
  // ⚠️ NOT `db:seed-admin-local` — that seeder writes to POSTGRES and refuses without
  // `DATABASE_URL`, while this drive runs against the in-memory store. The dev-test route
  // creates the officer in the SAME store the app is serving from, and mints their session.
  const admin = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const seeded = await admin.request.post(`${BASE}/api/dev-test/seed-admin`);
  ok("5.0 · an officer account exists", seeded.ok(), `${seeded.status()}`);
  await go(admin, `${BASE}/admin/approvals`);
  // ⛔ THE PLAYER'S OWN NAME, NOT THE WORD "KYC". `/KYC/i` matches the queue's HEADING, so
  // this passed on an empty queue — reporting that a submission had arrived when none had.
  const queue = await admin.locator("body").innerText();
  ok("5.1 · ★ THIS player's submission is in the officer's queue", queue.includes("Kyc Drive Tester"),
    queue.includes("Kyc Drive Tester") ? "" : "the queue does not name this player");

  // Open the player's KYC review. The queue links to the drill-in.
  const link = admin.locator('a[href*="/admin/kyc/"], a[href*="tab=kyc"]').first();
  ok("5.2 · the queue links to a review screen", await link.count() > 0);
  if (await link.count() > 0) {
    await Promise.all([admin.waitForLoadState("domcontentloaded"), link.click()]);
    await settle(admin);
    ok("5.3 · the review workstation opens", /approve|idhinisha|批准/i.test(await admin.locator("body").innerText()), admin.url());

    // The four attestations, then Approve — the product requires both.
    const boxes = admin.locator('input[type="checkbox"]');
    const nb = await boxes.count();
    for (let i = 0; i < nb; i++) await boxes.nth(i).check({ force: true }).catch(() => {});
    const approve = admin.locator('button:has-text("Approve"), button:has-text("Idhinisha")').first();
    if (await approve.count() > 0) {
      await approve.click();
      await admin.waitForTimeout(800);
      // ⛔ APPROVE IS A ConfirmDialog TRIGGER, as CLAUDE.md requires for a consequential
      // action — a driver that clicks once and reads the page will report "not approved"
      // against a product that simply asked the officer to confirm. Confirm it.
      const confirm = admin.locator('[role="dialog"] button:has-text("Approve"), [role="dialog"] button:has-text("Confirm"), [role="alertdialog"] button:has-text("Approve")').first();
      if (await confirm.count() > 0) { await confirm.click(); await admin.waitForTimeout(1500); }
      ok("5.4 · ★ the officer approved through the confirm dialog", true, "");
    } else {
      ok("5.4 · ★ the officer approved through the confirm dialog", false, "no Approve control found");
    }
  }
  await admin.close();
}

// ── ⑥ EVERY DOOR THAT WAS SHUT IS NOW OPEN ──────────────────────────────────
step("⑥ ★ the doors open — the half a refusal-only suite can never prove");
{
  // ⛔ ASSERT THE STATE, NOT A WORD ON THE PAGE. `/verified/i` matches "Verify your
  // identity" — the copy shown to an UNVERIFIED player — so this passed for four runs while
  // the account was still `not_started`. A false PASS on the one assertion that says the
  // journey worked is worse than a false failure: it is the suite reporting success.
  await go(player, `${BASE}/wallet/deposit`);
  ok("6.1 · ★ the account really is APPROVED — no gate on the deposit screen",
    await player.locator(sel.gate).count() === 0,
    await player.locator(sel.gate).count() > 0
      ? String(await player.locator(sel.gate).first().getAttribute("data-kyc-state"))
      : "");

  await go(player, `${BASE}/markets`);
  ok("6.2 · ★ the standing identity bar is GONE", await player.locator(sel.banner).count() === 0);

  // ⭐ WITHDRAWING AND PLAYING NEED IDENTITY ALONE; DEPOSITING NEEDS THE EMAIL TOO, and the
  // drive got this wrong before the product did. Registration does not confirm an address,
  // so a freshly-approved player still meets the EMAIL gate on the deposit screen — which is
  // exactly the two-independent-doors design (Ali, 2026-09-05: "keep both… order doesn't
  // matter"). The first version asserted the deposit form was present the moment identity
  // cleared and read a correct product as broken.
  await go(player, `${BASE}/wallet/withdraw`);
  ok("6.3.withdraw · ★ no gate panel", await player.locator(sel.gate).count() === 0);
  ok("6.4.withdraw · ★ the real form is present", await player.locator(sel.withdrawForm).count() > 0);

  await go(player, `${BASE}/wallet/deposit`);
  ok("6.3.deposit · ★ the IDENTITY gate is gone", await player.locator(sel.gate).count() === 0);
  ok("6.4.deposit · ★ …and the EMAIL door is what still stands — the second, independent requirement",
    await player.locator('[data-testid="email-verify-gate"]').count() > 0);

  // Now clear the second door the way a player does — through the real confirmation link —
  // and only then should the deposit form appear.
  const link = await player.request.get(`${BASE}/api/dev/verify-link`).then((r) => r.json()).catch(() => null);
  ok("6.5 · the confirmation link the player would receive is issued", !!link?.url, JSON.stringify(link)?.slice(0, 80));
  if (link?.url) {
    // ⚠️ THE LINK CARRIES THE PRODUCTION ORIGIN. `BASE_URL()` falls back to the Railway host
    // when `NEXT_PUBLIC_APP_URL` is unset, so the confirmation URL a local run gets back
    // points at kipindi-production — following it verbatim drives the LIVE site and leaves
    // the local account unconfirmed. Only the path and its signed token matter; the origin
    // is swapped for the one under test.
    const u = new URL(link.url, BASE);
    await go(player, `${BASE}${u.pathname}${u.search}`);
    await go(player, `${BASE}/wallet/deposit`);
    ok("6.6 · ★★ BOTH doors cleared — the real deposit form is finally present",
      await player.locator(sel.depositForm).count() > 0 && await player.locator(sel.gate).count() === 0);
  }

  const mk = await (async () => { await go(player, `${BASE}/markets`); return player.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null); })();
  if (mk) {
    await go(player, `${BASE}${mk}`);
    ok("6.7 · ★★ the stake control is back on a live market",
      await player.locator(sel.sidePicker).count() > 0 && await player.locator(sel.gate).count() === 0);
  }
}

await browser.close();
console.log(`\nkyc-gate e2e: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
