// Landing v3 · WP12 (R5, "the Match") — the AGREEMENT DRIVE (spec updown-band-v2 §15.6, I-6).
//
// The band on `/` and the round page it links to must describe one confirmed read one way. On `/` it
// reads the scoreboard's `data-lead`, the detail's HH:MM and the Up pick's href; it follows the href; on
// the round page it reads `section[data-tone]` and the HH:MM of the stamp in the move line. When the two
// stamps name the same minute, lead must equal tone. Kick-off and awaiting have no lead to compare and
// are skipped with a note; a band showing no round (S8) is skipped too.
//
//   BASE=http://localhost:3057 LOCALES=sw,en,zh node scripts/qa/landing-v3/band-agree.mjs
//   BASE=https://50pick.tz RUNS=3 GAP_S=75 node scripts/qa/landing-v3/band-agree.mjs    (production, §15.9)
// Exit 1 on any DISAGREE, or when not one comparison could be made (a drive that compared nothing
// proved nothing). Imported by band-drive.mjs as `agreeOnce`.
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

/** Band side of the comparison, read in the page. */
function READ_BAND() {
  const bug = document.querySelector('[data-band="updown"] .kp-udbug');
  const pick = document.querySelector('[data-band="updown"] .kp-udbug__pick--up');
  const stamp = document.querySelector('[data-band="updown"] .kp-udbug__detail .kp-udnum');
  return {
    lead: bug?.getAttribute("data-lead") ?? null,
    hhmm: (stamp?.textContent || "").trim() || null,
    href: pick?.getAttribute("href") ?? null,
    detail: (document.querySelector('[data-band="updown"] .kp-udbug__detail')?.textContent || "").replace(/\s+/g, " ").trim(),
  };
}

/** Round-page side, read in the page. */
function READ_ROUND() {
  const sec = document.querySelector("section[data-tone]");
  const txt = (sec?.textContent || "").replace(/\s+/g, " ");
  const m = txt.match(/(\d{2}:\d{2}):\d{2}\s*EAT/);
  return { tone: sec?.getAttribute("data-tone") ?? null, hhmm: m ? m[1] : null, line: (txt.match(/[^·]{0,60}·[^·]*EAT/) || [""])[0].trim() };
}

export async function agreeOnce(browser, BASE, loc) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  if (loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(2500);
    const band = await page.evaluate(READ_BAND);
    if (!band.lead) return { loc, verdict: "SKIP", note: "no round on the band (S8)", band };
    if (band.lead === "kickoff" || band.lead === "awaiting") return { loc, verdict: "SKIP", note: `lead=${band.lead}: nothing to compare`, band };
    if (!band.href) return { loc, verdict: "DISAGREE", note: "a lead with no Up pick link", band };
    await page.goto(new URL(band.href, BASE).href, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(2000);
    const round = await page.evaluate(READ_ROUND);
    if (!round.tone) return { loc, verdict: "DISAGREE", note: "the round page has no section[data-tone]", band, round };
    if (band.hhmm !== round.hhmm) return { loc, verdict: "STAMPS DIFFER", note: `band ${band.hhmm} vs page ${round.hhmm} — a newer read landed between the two loads`, band, round };
    return { loc, verdict: band.lead === round.tone ? "AGREE" : "DISAGREE", note: `lead=${band.lead} tone=${round.tone} at ${band.hhmm}`, band, round };
  } finally {
    await ctx.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const BASE = process.env.BASE || "http://localhost:3057";
  const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
  const RUNS = Number(process.env.RUNS || 1);
  const GAP = Number(process.env.GAP_S || 0) * 1000;
  const browser = await chromium.launch({ headless: true });
  let compared = 0, disagree = 0;
  for (let r = 0; r < RUNS; r++) {
    if (r > 0 && GAP) await new Promise((res) => setTimeout(res, GAP));
    for (const loc of LOCALES) {
      const a = await agreeOnce(browser, BASE, loc);
      console.log(`run ${r + 1} ${loc}: ${a.verdict} — ${a.note}${a.band?.detail ? ` · band "${a.band.detail}"` : ""}${a.round?.line ? ` · page "${a.round.line}"` : ""}`);
      if (a.verdict === "AGREE" || a.verdict === "DISAGREE") compared++;
      if (a.verdict === "DISAGREE") disagree++;
    }
  }
  await browser.close();
  console.log(`band-agree: ${compared} compared, ${disagree} disagree`);
  process.exit(disagree || !compared ? 1 : 0);
}
