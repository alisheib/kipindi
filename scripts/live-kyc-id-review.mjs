/**
 * §7 steps 7–8 — THE OFFICER, on production, for each of the four documents.
 *
 * A reviewer opens the workstation, sees the image and the TYPE-CORRECT fields, and
 * approves; then the player's own screen reflects it. ⛔ "The reviewer sees the right
 * fields per type" is the §6 integration row this proves: an expiry for a passport, none
 * for a voter's card, and a tab that can actually open the bio page — because a reviewer
 * approving a document they cannot read is the human control failing silently.
 *
 * ⚠️ TOTP. `/api/health` reports `security.adminTotp: "DISABLED"` on production, so the
 * COMPLIANCE persona reaches the workstation without a step-up secret. If that flips, this
 * driver stops at the 2FA wall and says so rather than reporting a product failure.
 *
 * ⛔ IT MOVES NO MONEY. Approving KYC opens the withdrawal gate for accounts holding a
 * zero balance; nothing is deposited, staked or paid.
 *
 *   USERS=usr_a,usr_b BASE=https://www.50pick.tz node scripts/live-kyc-id-review.mjs
 */
import { chromium, devices } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { PERSONA, qaEnv } from "./live/harness.mjs";

const BASE = process.env.LIVE_BASE || process.env.BASE || "https://www.50pick.tz";
const SHOT = process.env.SHOT_DIR || ".qa-kyc-id";
const USERS = (process.env.USERS || "").split(",").map((s) => s.trim()).filter(Boolean);
mkdirSync(SHOT, { recursive: true });
if (!USERS.length) { console.error("USERS=<userId,userId,…> is required"); process.exit(2); }

let pass = 0;
const failures = [];
const ok = (l, c, x = "") => {
  if (c) { pass++; console.log(`  ✓ ${l}${x ? ` — ${x}` : ""}`); }
  else { failures.push(`${l}${x ? ` — ${x}` : ""}`); console.log(`  ✗ ${l}${x ? ` — ${x}` : ""}`); }
  return c;
};

const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();

  // ── sign in as the COMPLIANCE officer ────────────────────────────────────
  const who = PERSONA.officer;
  await p.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle" });
  const field = (await p.locator("#phone").count()) ? "#phone" : "#identifier";
  await p.fill(field, who.phone);
  const mirror = await p.locator(`input[name="${field.slice(1)}"]`).inputValue().catch(() => "");
  if (mirror !== who.phone) throw new Error(`PhoneInput did not sync (${mirror}) — filled before hydration`);
  await p.fill('input[type="password"]', qaEnv(who.secret));
  await p.locator('button[type="submit"]').last().click();
  await p.waitForTimeout(4000);
  const signedIn = !/\/auth\//.test(p.url());
  ok("officer signed in", signedIn, p.url());
  if (!signedIn) throw new Error("officer sign-in failed — cannot review");

  for (const userId of USERS) {
    console.log(`\n── ${userId} ─────────────────────────────────────────────`);
    await p.goto(`${BASE}/admin/kyc/${userId}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(3000);
    if (/2fa|two-factor/i.test(p.url())) { ok("workstation reachable without TOTP", false, p.url()); break; }

    const body = await p.locator("body").innerText();
    // ⚠️ CASE-INSENSITIVE, AND THE HARNESS ALREADY WARNED ABOUT THIS. Chrome applies
    // `text-transform: uppercase` to the field labels, so `innerText` returns
    // "DOCUMENT TYPE" while the source says "Document type" — the same trap
    // `scripts/live/harness.mjs` documents ("a CSS-uppercased eyebrow reads
    // 'EMAIL CONFIRMED' while the dictionary says 'Email confirmed'"). The first run of
    // this driver reported FOUR failures against a workstation that was perfect.
    const typeRow = (body.match(/document type\s*\n\s*([^\n]+)/i) ?? [])[1]?.trim() ?? "";
    ok("7 · the workstation names the DOCUMENT TYPE", !!typeRow && typeRow !== "—", typeRow);
    // ⛔ AND THE TABS ARE THIS DOCUMENT'S SLOTS. Three hard-written tabs is what made a
    // passport bio page unopenable; the card's own subtitle lists what it offers.
    const slotLine = (body.match(/documents · nyaraka\s*\n\s*([^\n]+)/i) ?? [])[1]?.trim() ?? "";
    ok("7 · the document tabs are THIS document's slots", /selfie/i.test(slotLine) && slotLine.length > 6, slotLine);

    // ⛔ The expiry row exists for exactly the two documents that carry one.
    const wantsExpiry = /Passport|Driving licence/i.test(typeRow);
    // ⚠️ CASE-INSENSITIVE — the THIRD instance of the same trap in this one file. The
    // applicant card renders its labels through a CSS uppercase, so `innerText` says
    // "EXPIRY". A case-sensitive test here reported a MISSING expiry on a passport whose
    // card plainly read "EXPIRY / 2032-06-30" when the page was dumped by hand.
    const hasExpiry = /\bexpiry\b/i.test(body);
    ok(`7 · an Expiry field is ${wantsExpiry ? "SHOWN" : "ABSENT"} for a ${typeRow}`, hasExpiry === wantsExpiry,
       `shown=${hasExpiry}`);

    // ⛔ Where no format is published the officer is TOLD so, in words.
    const openType = /Driving licence|Voter/i.test(typeRow);
    const saysAbsent = /No authoritative/i.test(body);
    ok(`7 · the officer is ${openType ? "TOLD no format is published" : "given the published rule"}`,
       openType ? saysAbsent : !saysAbsent, openType ? `absence stated=${saysAbsent}` : "published rule shown");

    // ⛔ THE IMAGE MUST ACTUALLY RENDER. A tab that cannot open the bio page is the
    // human control failing silently, and it is what the old three-slot literal caused.
    const imgOk = await p.evaluate(() => {
      const i = [...document.querySelectorAll("img")].find((n) => /api\/admin\/kyc-doc/.test(n.src));
      return i ? { src: i.src, complete: i.complete, w: i.naturalWidth } : null;
    });
    ok("7 · the document image LOADS from the admin-gated route",
       !!imgOk && imgOk.complete && imgOk.w > 0, JSON.stringify(imgOk));

    const tabs = await p.locator('button:below(:text("Documents"))').count().catch(() => 0);
    await p.screenshot({ path: `${SHOT}/officer-${userId}-1440.png`, fullPage: true });
    void tabs;

    // ── the four attestations, then Approve ────────────────────────────────
    const judgments = p.locator('button:has-text("tap to verify")');
    const n = await judgments.count();
    ok("7 · the officer is asked for the four judgment attestations", n === 4, `${n}`);
    for (let i = 0; i < n; i++) { await judgments.first().click(); await p.waitForTimeout(250); }
    const approve = p.locator('button:has-text("Approve identity")');
    const armed = await approve.first().isEnabled().catch(() => false);
    ok("7 · Approve arms only once every attestation is made", armed);
    if (armed) {
      await approve.first().click();
      await p.waitForTimeout(5000);
      // 🔴 THE APPROVE BUTTON IS A CONFIRM-DIALOG TRIGGER, NOT THE DECISION.
      // Every consequential mutation on this platform goes through the kit's
      // `ConfirmDialog` (CLAUDE.md: "never use the native browser confirm()"), so the
      // first click only OPENS it. The first run of this driver stopped there, waited
      // five seconds, read the admin shell and reported "not approved" — against a
      // product that had simply asked the officer to confirm, exactly as designed.
      const confirm = p.locator('button:has-text("Yes, approve identity")');
      await confirm.first().waitFor({ state: "visible", timeout: 10000 });
      ok("7 · Approve opens the confirmation the officer must read", true);
      await confirm.first().click();
      await p.waitForTimeout(6000);
      const after = await p.locator("body").innerText();
      ok("7 · the decision is recorded as APPROVED", /identity approved|approved/i.test(after),
         after.replace(/\s+/g, " ").slice(0, 140));
      await p.screenshot({ path: `${SHOT}/officer-${userId}-approved-1440.png`, fullPage: true });
    }

    // 393 as well — the officer's screen is in the responsiveness matrix.
    const mob = await b.newContext({ ...devices["Pixel 7"], storageState: await ctx.storageState() });
    const mp = await mob.newPage();
    await mp.goto(`${BASE}/admin/kyc/${userId}`, { waitUntil: "domcontentloaded" });
    await mp.waitForTimeout(2500);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("7 · the workstation does not overflow at 393", overflow <= 1, `${overflow}px`);
    await mp.screenshot({ path: `${SHOT}/officer-${userId}-393.png`, fullPage: true });
    await mob.close();
  }
} finally {
  await b.close();
}

console.log(`\n${"─".repeat(64)}`);
console.log(`  OFFICER: ${pass} passed, ${failures.length} failed`);
console.log(`${"─".repeat(64)}`);
if (failures.length) { console.log("\nFAILURES:"); failures.forEach((f) => console.log("  ✗ " + f)); }
process.exit(failures.length ? 1 : 0);
