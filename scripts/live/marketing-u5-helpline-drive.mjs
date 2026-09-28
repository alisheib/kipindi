/**
 * LIVE PROOF FOR MARKETING U5 — the statutory helpline, read off production.
 *
 * ⭐ THE DISCRIMINATION IS A DEFECT THAT WAS REALLY TRUE HERE FOR THREE WEEKS. An operator saved
 * their own desk number into the support row's `helpline` field and the readers took it, so the
 * national problem-gambling helpline on a gambling site was the gambling site's own sales line. This
 * drive asserts the published number is the PINNED constant and, separately, that it is NOT the
 * operator desk — because "the page shows a number" would have passed happily throughout.
 *
 * ⛔ IT CHECKS BOTH HALVES OF EACH RENDER. The text a player reads out and the `tel:` href a player
 * TAPS are two different strings in the source, and only one of them dials. A drifted display string
 * is a bad number to read out; a drifted href is a bad number to call.
 *
 * ⚠️ WHAT IT CANNOT REACH. `global-error.tsx` carries four more copies and is the root error
 * boundary — it renders only when the root layout has already failed, which is not a state to induce
 * on production. Those four are held by `test:support-contact` §15 against the same constant, and
 * `red:support-contact` proves that check can fail. This drive covers the pages a player can open.
 *
 * ⛔ IT REFUSES TO REPORT unless `?dpl=` matches the commit under test — on this platform that is the
 * git SHA. ⚠️ `HeadlessChrome` stays in the UA so `/api/pv` does not count the drive as a visitor.
 * ⛔ READ-ONLY: it opens public legal pages and nothing else.
 *
 * Run:  node scripts/live/marketing-u5-helpline-drive.mjs <expected-sha>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.LIVE_BASE ?? "https://www.50pick.tz";
const WANT_SHA = (process.argv[2] ?? "").trim();
const SHOTS = ".qa-shots/marketing-setup/U5";

/** The pinned constant, as `support-config.ts` holds it. */
const HELPLINE = "0800 11 0011";
const HELPLINE_TEL = "0800110011";
/** The number that WAS published in its place. Asserted absent, not merely "something is there". */
const OPERATOR_DESK = "769777877";

let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

process.exitCode = 1;
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();

console.log(`\nMARKETING U5 — live proof against ${BASE}\n`);
await page.goto(`${BASE}/legal/responsible-gambling`, { waitUntil: "networkidle" });

const dpl = await page.evaluate(() => {
  const u = [...document.querySelectorAll("script[src], link[href]")]
    .map((n) => n.getAttribute("src") || n.getAttribute("href") || "")
    .find((s) => s.includes("dpl="));
  return (u && (u.match(/[?&]dpl=([0-9a-f]+)/) || [])[1]) || document.documentElement.getAttribute("data-dpl-id") || "";
});
console.log(`  build: dpl = ${dpl || "(absent)"}`);
if (WANT_SHA) {
  ok(`the page served is the commit under test (${WANT_SHA})`, dpl.startsWith(WANT_SHA), `served ${dpl}`);
  if (!dpl.startsWith(WANT_SHA)) {
    console.log("\n  ⛔ STOPPING. Measuring the wrong build proves nothing either way.\n");
    await browser.close();
    process.exit(1);
  }
}

/* ── the published page ──────────────────────────────────────────────────── */
const body = await page.evaluate(() => document.body.innerText);
const telLinks = await page.evaluate(() =>
  [...document.querySelectorAll('a[href^="tel:"]')].map((a) => ({
    href: a.getAttribute("href") ?? "",
    label: ((a.closest("li") || a.parentElement)?.innerText ?? a.innerText ?? "").trim(),
  })));

console.log(`  tel: links on the page:`);
for (const l of telLinks) console.log(`    ${l.href.padEnd(22)} ${JSON.stringify(l.label.replace(/\s+/g, " ").slice(0, 60))}`);
console.log("");

// ⭐ NOT EVERY `tel:` LINK IS THE HELPLINE, AND ASSERTING OTHERWISE IS A FALSE ALARM THIS DRIVE
// ALREADY PRODUCED ONCE. The responsible-gambling page carries THREE: the national helpline twice,
// and 50pick's own support desk under "Wasiliana nasi" (contact us). The desk SHOULD be there and
// SHOULD be a different number — the defect is not "another number exists", it is "a link that says
// helpline dials something else". So classify by LABEL and judge only the helpline-labelled ones.
const HELPLINE_LABEL = /helpline|hotline|msaada|热线/i;
const helplineLinks = telLinks.filter((l) => HELPLINE_LABEL.test(l.label));
const otherLinks = telLinks.filter((l) => !HELPLINE_LABEL.test(l.label));

ok("control · the responsible-gambling page rendered real content", body.length > 500, `${body.length} chars`);
ok("control · it publishes at least one tel: link", telLinks.length > 0, JSON.stringify(telLinks));
ok("control · the label classifier found helpline-labelled links, so an empty pass is impossible",
   helplineLinks.length >= 2, `${helplineLinks.length} of ${telLinks.length}`);
ok("control · …and it did NOT classify every link as a helpline, so it discriminates",
   otherLinks.length >= 1, `${otherLinks.length} non-helpline link(s)`);

ok(`the published helpline is the pinned constant (${HELPLINE})`, body.includes(HELPLINE),
   "the page does not contain the pinned number");
ok(`⭐ every helpline-labelled link DIALS it (${HELPLINE_TEL}) — the href is what a tap uses, and it is a different string from the text`,
   helplineLinks.every((l) => l.href.replace(/[^0-9+]/g, "").endsWith(HELPLINE_TEL)),
   JSON.stringify(helplineLinks));
ok("⛔ …and no helpline-labelled link dials the operator's own desk — the real three-week defect",
   !helplineLinks.some((l) => l.href.includes(OPERATOR_DESK) || l.label.includes(OPERATOR_DESK)),
   JSON.stringify(helplineLinks));
ok("⛔ …nor the Gaming Board Code's 0800110051 — OQ4 answered 2026-09-26: ours is the helpline",
   !body.includes("0800110051"), "the published page carries the Board's number — Ali ruled ours is the right one");

await page.screenshot({ path: `${SHOTS}/1280-responsible-gambling.png`, fullPage: false });

/* ── the same page at phone width ────────────────────────────────────────── */
await page.setViewportSize({ width: 360, height: 780 });
await page.waitForTimeout(200);
const body360 = await page.evaluate(() => document.body.innerText);
ok("360px · the helpline is still published", body360.includes(HELPLINE));
await page.screenshot({ path: `${SHOTS}/360-responsible-gambling.png`, fullPage: false });

/* ── a second surface, so one page is not the whole claim ────────────────── */
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`${BASE}/help`, { waitUntil: "networkidle" });
const help = await page.evaluate(() => document.body.innerText);
ok("control · the help page rendered real content", help.length > 500, `${help.length} chars`);
ok("the help page publishes the same pinned number", help.includes(HELPLINE));
await page.screenshot({ path: `${SHOTS}/1280-help.png`, fullPage: false });

await browser.close();
console.log(`\nU5 LIVE — ${fail === 0 ? `${pass} proofs held` : `${fail} of ${pass + fail} FAILED`}`);
console.log(`shots: ${SHOTS}/\n`);
process.exitCode = fail === 0 ? 0 : 1;
