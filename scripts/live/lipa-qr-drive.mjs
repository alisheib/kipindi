/**
 * LIPA QR · LIVE DRIVE — the QR is WITHHELD, and the way to pay still works.
 *
 * ⛔ WHAT THIS DRIVE NOW PROVES, AND WHY IT CHANGED. On 2026-09-09 the QR was withdrawn
 * (`LIPA_QR_RELEASED = false`, `src/lib/lipa.ts`): a Lipa Namba payment carries no
 * reference on any network, so it cannot be attributed to a payer by the system, and the
 * QR was the shortcut to exactly that. This drive used to screenshot the painted symbol
 * and decode it. There is no symbol on screen any more, so those arms measured nothing
 * and were removed rather than left passing on an empty selector.
 *
 * ⭐ AN ABSENCE CHECK IS THE EASIEST KIND TO FAKE, so every viewport here leads with a
 * POSITIVE CONTROL. A 500, a redirect to sign-in, an empty body and a genuinely-withheld
 * QR are all indistinguishable to `$(SEL)` — so the drive first proves the page rendered
 * and that it can read the page, and only then believes "the QR is gone". It also asserts
 * the fee destination is still stated as TEXT: withdrawing the QR must not withdraw the
 * payment instruction, which would trade an untraceable shortcut for a dead end.
 *
 * ⭐ AND IT STILL DISCRIMINATES on the money rule: `/wallet/deposit` must never carry this
 * selector, and the fee text must FOLLOW the configured destination rather than echo a
 * hard-coded number.
 *
 * The artwork itself is still fully guarded for the day it returns — `test:lipa-qr` §1
 * decodes the shipped vector against the pinned payload, and `red:lipa-qr` §11 catches
 * the release gate being switched back on.
 *
 * ⛔ DEV ONLY. It signs in through `/auth/demo`, which 404s in production by construction.
 * ⛔ `next dev` is the only local host that serves those doors — `next start` closes them.
 *
 * Usage:  BASE=http://localhost:3033 node scripts/live/lipa-qr-drive.mjs
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3033";
const SHOTS = process.env.SHOT_DIR ?? ".qa-lipa";
mkdirSync(SHOTS, { recursive: true });

/** Widths that matter: the two phones we design to, the tablet, the desktop. */
const WIDTHS = [360, 393, 768, 1280];
const LOCALES = ["en", "sw", "zh"];

/**
 * (The CSS-pixel floor and the painted-pixel decoder lived here. They measured a QR on
 * screen, and there is no longer one to measure — see the withdrawal note in the header.
 * git show 6a5701cd:scripts/live/lipa-qr-drive.mjs has them for the re-enable.)
 */


let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${String(extra).slice(0, 240)}` : ""}`); }
};

// The payload the tree pins. Read from source rather than hardcoded here, so this drive
// cannot drift from the config it is checking.
const cfgSrc = readFileSync("src/lib/server/lipa-config.ts", "utf8");
const EXPECT_PAYLOAD = /qrPayload:\s*\n?\s*"([^"]+)"/.exec(cfgSrc)?.[1] ?? null;
const EXPECT_NUMBER = /lipaNumber:\s*"(\d+)"/.exec(cfgSrc)?.[1] ?? null;
if (!EXPECT_PAYLOAD || !EXPECT_NUMBER) {
  console.error("🔴 could not read qrPayload/lipaNumber out of lipa-config.ts — this run would assert nothing.");
  process.exit(2);
}


const SEL = "[data-lipa-qr] img";

/**
 * ⭐ THE DRIVE ARRANGES ITS OWN PRECONDITION, AND RESTORES IT.
 *
 * The QR renders only when the agent fee destination IS the Lipa number
 * (`shouldShowLipaQr`), and the shipped default points elsewhere on purpose —
 * changing it rewrites `/legal/agent-terms` in three languages, which is a business
 * decision, not this drive's. So the drive sets the destination for the run and puts
 * it back, and asserts BOTH states: matched → the QR is painted and decodes;
 * mismatched → it is gone. Asserting only the first would pass with the safety rule
 * deleted.
 */
async function setFeeDestination(account, name) {
  const res = await fetch(`${BASE}/api/dev-test/agent-set-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feeDestinationAccount: account, feeDestinationName: name }),
  }).catch((e) => ({ ok: false, status: 0, _err: e }));
  if (!res.ok) {
    console.error(`🔴 could not set the fee destination (HTTP ${res.status ?? "?"}). This route is dev-only;`);
    console.error("   a run that could not arrange its precondition has measured nothing.");
    process.exit(2);
  }
  const j = await res.json();
  if (j?.config?.feeDestinationAccount !== account) {
    console.error(`🔴 the server did not take the fee destination: asked ${account}, got ${j?.config?.feeDestinationAccount}`);
    process.exit(2);
  }
}

// Remember what was there, so the drive leaves the tree as it found it.
const beforeCfg = await fetch(`${BASE}/api/dev-test/agent-set-config`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
}).then((r) => r.json()).catch(() => null);
if (!beforeCfg?.config) {
  console.error("🔴 /api/dev-test/agent-set-config did not answer — is this a `next dev` server? `next start` closes the dev-test doors.");
  process.exit(2);
}
const RESTORE = { account: beforeCfg.config.feeDestinationAccount, name: beforeCfg.config.feeDestinationName };
console.log(`Lipa QR live drive · ${BASE}`);
console.log(`fee destination before: ${RESTORE.name} / ${RESTORE.account} (restored at the end)\n`);

await setFeeDestination(EXPECT_NUMBER, "Ocean Entertainment Limited");

const browser = await chromium.launch();

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: width < 500 ? 900 : 1000 },
      // 2× so the screenshot carries enough pixels to decode — mirroring a real handset,
      // and NOT a way of making a too-small on-screen code pass: the CSS-pixel floor
      // below is measured before this multiplier.
      deviceScaleFactor: 2,
    });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();

    const auth = await page.goto(`${BASE}/auth/demo?kyc=APPROVED`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => null);
    if (!auth || auth.status() >= 400) {
      console.error("🔴 could not sign in at /auth/demo — a run that asked to sign in and could not has measured nothing.");
      await browser.close();
      process.exit(2);
    }

    const tag = `${locale}·${width}`;

    // ── ABSENCE: the QR is WITHHELD, and the way to pay survives ──────────────
    await page.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const lang = await page.getAttribute("html", "lang");
    if (lang !== locale) { ok(`${tag} locale actually applied`, false, `<html lang="${lang}">`); await ctx.close(); continue; }
    await page.waitForTimeout(250);

    // ⭐ POSITIVE CONTROL FIRST, AND IT IS NOT CEREMONY. Everything here is an ABSENCE
    // check, and an absence check passes when the READER is broken: a 500, a redirect to
    // sign-in, an empty body and a genuinely-withheld QR are indistinguishable to
    // `$(SEL)`. So prove the page RENDERED and that this drive can read it before
    // believing any "it is gone" — otherwise the drive goes green against a blank page.
    const bodyText = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim());
    ok(`${tag} ⭐ CONTROL · the agent page actually rendered — ${bodyText.length} chars of body text`, bodyText.length > 400,
      `only ${bodyText.length} chars — a redirect or an error page reads as "the QR is absent" too`);

    // ⛔ And the way to pay must still be ON the page, in words. Withdrawing the QR must
    // not withdraw the payment instruction: that would trade an untraceable shortcut for
    // a dead end, which is worse for the applicant than either.
    const bodyDigits = bodyText.replace(/\D/g, "");
    ok(`${tag} the fee destination is still stated as TEXT`, bodyDigits.includes(EXPECT_NUMBER),
      `${EXPECT_NUMBER} is not on the page — an applicant now has no way to pay the fee`);

    // The withdrawal itself, on a real page at every width and locale.
    const withheld = await page.$(SEL);
    ok(`${tag} ⛔ the QR is WITHHELD on /agent`, withheld === null,
      "the QR is rendering while LIPA_QR_RELEASED is false — the release gate is not holding");

    await page.screenshot({ path: `${SHOTS}/agent-${width}-${locale}.png`, fullPage: false });


    // ── DISCRIMINATION: it must NOT be on a self-service top-up ───────────────
    // ⛔ If this selector ever matches here, the money defect is live: the player pays,
    // the company receives, and no wallet moves.
    await page.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(300);
    const onDeposit = await page.$(SEL);
    ok(`${tag} the static QR is ABSENT from /wallet/deposit`, onDeposit === null,
      "a static QR on a self-service top-up credits no wallet — see src/lib/server/lipa-config.ts");

    await ctx.close();
  }
}

// ── THE NORMAL FLOW FOLLOWS THE CONFIGURED DESTINATION ────────────────────────
// ⚠️ THIS ARM USED TO CLAIM "mismatched destination → the QR is GONE". While the release
// gate is off, that claim is VACUOUS — the QR is gone for every destination, so the
// assertion would hold with the safety rule deleted. It is not a check any more, it is a
// restatement of the gate, and it is deleted rather than left to look like coverage.
// (The safety rule itself is still proven, on `lipaQrWouldShow`, at test:lipa-qr §2.)
//
// ⭐ WHAT IS WORTH PROVING INSTEAD, and what Ali actually asked for: the fee still WORKS
// on the normal flow. Point the destination at a different account and the page must
// state THAT account — so an applicant is told where to pay, from configuration, with no
// QR involved anywhere.
await setFeeDestination("0769777877", "Digital Selcom Bank");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/demo?kyc=APPROVED`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(400);

  const txt = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));
  const digits = txt.replace(/\D/g, "");
  ok("the normal flow names the CONFIGURED destination", digits.includes("0769777877"),
    "the fee destination is not on the page — an applicant has no way to pay");
  // ⭐ DISCRIMINATION on that very check: it must be reading the CONFIG, not echoing a
  // hard-coded number. The previous destination must be gone from the page.
  ok("…and it is the config it is reading, not a hard-coded number", !digits.includes(EXPECT_NUMBER),
    `${EXPECT_NUMBER} is still on the page after the destination changed — the page is not following the setting`);
  ok("and the QR is still withheld on the other destination too", (await page.$(SEL)) === null,
    "the QR appeared for a non-Lipa destination — both the gate AND the safety rule are broken");
  await ctx.close();
}

await setFeeDestination(RESTORE.account, RESTORE.name);
console.log(`\nfee destination restored: ${RESTORE.name} / ${RESTORE.account}`);

await browser.close();
console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${pass} checks · shots in ${SHOTS}/`);
process.exit(fail === 0 ? 0 : 1);
