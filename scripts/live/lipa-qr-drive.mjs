/**
 * LIPA QR · LIVE DRIVE — is the code on the SCREEN the code we shipped?
 *
 * ⭐ WHY THIS EXISTS ON TOP OF `test:lipa-qr`. That gate decodes the PNG on disk. It
 * cannot see CSS. A stylesheet that scales the image to 40px, softens its edges with
 * interpolation, inverts it under a dark theme, or clips it at the panel edge produces a
 * page that looks fine in a screenshot review and a code no phone can read — and the
 * file on disk stays perfect throughout. So this drive screenshots the element as the
 * browser actually paints it and DECODES THAT.
 *
 * ⭐ AND IT DISCRIMINATES. A drive that only asserts "the QR is present" passes just as
 * happily when its selector matches nothing and the loop body never runs. So every run
 * also visits a surface where the QR MUST NOT appear (`/wallet/deposit` — a static QR
 * there would take a player's money and credit no wallet) and fails if it finds one.
 * Presence and absence are both asserted, against the same selector.
 *
 * ⛔ DEV ONLY. It signs in through `/auth/demo`, which 404s in production by construction.
 * ⛔ `next dev` is the only local host that serves those doors — `next start` closes them.
 *
 * Usage:  BASE=http://localhost:3033 node scripts/live/lipa-qr-drive.mjs
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jsQRmod = require("jsqr");
const jsQR = jsQRmod.default ?? jsQRmod;
const sharp = require("sharp");

const BASE = process.env.BASE ?? "http://localhost:3033";
const SHOTS = process.env.SHOT_DIR ?? ".qa-lipa";
mkdirSync(SHOTS, { recursive: true });

/** Widths that matter: the two phones we design to, the tablet, the desktop. */
const WIDTHS = [360, 393, 768, 1280];
const LOCALES = ["en", "sw", "zh"];

/**
 * ⭐ A FLOOR IN CSS PIXELS, NOT A GUESS. Below roughly 150 CSS px a 57-module symbol gives
 * a camera under ~2.6px per module, which is where real handsets start failing in poor
 * light. The panel asks for 176px; this refuses anything under 150 so a later layout
 * change that shrinks it gets caught here rather than by an applicant in a shop.
 */
const MIN_CSS_PX = 150;

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

/** Decode a PNG buffer as a QR. Two passes — see the note in scripts/extract-lipa-qr.mjs. */
async function decodePng(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  const rgba = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const r = data[i * info.channels];
    const g = info.channels > 1 ? data[i * info.channels + 1] : r;
    const b = info.channels > 2 ? data[i * info.channels + 2] : r;
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
  }
  for (const invert of [false, true]) {
    const view = invert ? Buffer.from(rgba.map((v, i) => (i % 4 === 3 ? v : 255 - v))) : rgba;
    const code = jsQR(new Uint8ClampedArray(view), info.width, info.height, { inversionAttempts: "attemptBoth" });
    if (code?.data) return code.data;
  }
  return null;
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

    // ── PRESENCE: the agent landing page carries the QR ───────────────────────
    await page.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const lang = await page.getAttribute("html", "lang");
    if (lang !== locale) { ok(`${tag} locale actually applied`, false, `<html lang="${lang}">`); await ctx.close(); continue; }

    const img = await page.waitForSelector(SEL, { timeout: 20_000 }).catch(() => null);
    if (!img) {
      ok(`${tag} the QR is on /agent`, false, "no [data-lipa-qr] img — either it is not rendered or the fee destination is not the Lipa number");
      await ctx.close();
      continue;
    }
    await img.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);

    // ⭐ A RECTANGLE, not "it is in the DOM". An element can be present, styled, and
    // 119px below the fold or 0px wide; all three read as "rendered".
    const box = await img.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return {
        x: r.x, y: r.y, w: r.width, h: r.height,
        vw: window.innerWidth, vh: window.innerHeight,
        visible: cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.01,
        rendering: cs.imageRendering,
        src: e.getAttribute("src") || "",
        complete: e.complete && e.naturalWidth > 0,
      };
    });

    ok(`${tag} the QR image actually loaded`, box.complete, `naturalWidth 0 — the asset 404'd`);
    ok(`${tag} it is visible`, box.visible && box.w > 0 && box.h > 0, JSON.stringify(box));
    ok(`${tag} it is at least ${MIN_CSS_PX}px on screen`, Math.min(box.w, box.h) >= MIN_CSS_PX, `${Math.round(box.w)}×${Math.round(box.h)} CSS px`);
    ok(`${tag} it is square`, Math.abs(box.w - box.h) <= 2, `${Math.round(box.w)}×${Math.round(box.h)}`);
    ok(`${tag} it is not clipped horizontally`, box.x >= -0.5 && box.x + box.w <= box.vw + 0.5, `x=${Math.round(box.x)} w=${Math.round(box.w)} vw=${box.vw}`);
    // ⚠️ THE ASSET MUST BE VECTOR, and this drive is what established that. Against the
    // 840px bitmap the painted code decoded at 160px, FAILED at 176 and 192, decoded at
    // 208, failed at 240 and 256 — the pattern moving again at a different DPR. That is
    // moiré between the module grid and the pixel grid, not a resolution floor, and it
    // would have shipped as "some players can scan it, unpredictably". A raster QR on a
    // responsive page is the defect; this names it if anyone swaps one back in.
    ok(`${tag} the QR is a vector asset (no resampling to alias)`, /\.svg(\?|$)/.test(box.src), box.src);

    // ── THE REAL PROOF: decode what the browser painted ───────────────────────
    const shot = await img.screenshot();
    const painted = await decodePng(shot);
    ok(`${tag} the painted QR decodes`, painted !== null, "the code on screen could not be read");
    ok(`${tag} it decodes to the pinned payload`, painted === EXPECT_PAYLOAD,
      painted === null ? "nothing decoded" : `screen says ${JSON.stringify(String(painted).slice(0, 40))}…`);

    // The number beside it must be the number inside it — the whole safety rule, on screen.
    const panelText = await page.$eval("[data-lipa-qr]", (e) => (e.textContent || "").replace(/\s+/g, " ").trim()).catch(() => "");
    const digitsOnScreen = panelText.replace(/\D/g, "");
    ok(`${tag} the printed number matches the encoded one`, digitsOnScreen.includes(EXPECT_NUMBER), `panel text: ${panelText.slice(0, 120)}`);

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

// ── THE SAFETY RULE, PROVEN ON A REAL PAGE ────────────────────────────────────
// Point the fee somewhere else and the QR must vanish — without this arm, every
// check above would pass just as happily with `lipaQrIsSafeFor` returning `true`.
await setFeeDestination("0769777877", "Digital Selcom Bank");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/demo?kyc=APPROVED`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.goto(`${BASE}/agent`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(400);
  const stillThere = await page.$(SEL);
  ok("mismatched destination → the QR is GONE", stillThere === null,
    "the QR is rendering beside an account it does not pay — the safety rule is not holding");

  // …and the number is still communicated, as text. Hiding the QR must not hide the
  // way to pay; that would trade a money defect for a dead end.
  const txt = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));
  ok("…and the account is still shown as text", txt.replace(/\D/g, "").includes("0769777877"),
    "the fee destination vanished with the QR — an applicant now has no way to pay");
  await ctx.close();
}

await setFeeDestination(RESTORE.account, RESTORE.name);
console.log(`\nfee destination restored: ${RESTORE.name} / ${RESTORE.account}`);

await browser.close();
console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${pass} checks · shots in ${SHOTS}/`);
process.exit(fail === 0 ? 0 : 1);
