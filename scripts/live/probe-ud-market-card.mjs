/**
 * Re-learn the bet contract of an Up & Down ROUND's own market page, from the live page.
 *
 * ⛔ `scripts/live/probe-updown-card.mjs` learns the BOARD's quick-bet card at `/updown`.
 * This learns the other surface — `/markets/<roundMarketId>`, which is where
 * `live-bonus-live-proof.mjs`'s `placeBet()` goes. They are not the same DOM, and the
 * existing helper matches the Place button with /Place YES|NO/ — a MARKET-lexicon word.
 * Up & Down renders `sideWord(t, side, "UPDOWN")`, so the same control may name itself
 * differently here. Ask the page.
 *
 *   MKT=mkt_x node scripts/live/probe-ud-market-card.mjs
 *
 * Read-only — it never clicks a money control.
 */
import { BASE, browser, login } from "./harness.mjs";

const MKT = process.env.MKT ?? "";
const SIDE = process.env.SIDE ?? "YES";
if (!MKT) throw new Error("MKT=<marketId> required");

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, `fleet:${process.env.PLAYER ?? "01"}`);
  await page.goto(`${BASE}/markets/${MKT}?side=${SIDE}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("main", { timeout: 45_000 });
  await page.waitForTimeout(6_000);

  const map = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    // ⛔ PRINT THE EXPLICIT ROLE, AND THE FIRST VERSION OF THIS PROBE DID NOT.
    // `querySelectorAll("button")` is a DOM question. A driver that reads this output and
    // writes `getByRole("button", { name: "2K" })` is asking an ARIA question — and Playwright
    // resolves roles through the accessibility tree, where an explicit `role` beats the tag.
    // The stake presets are `<button type="button" role="radio">`, so they appeared here as
    // ordinary buttons and were UNREACHABLE by the locator this output suggested: the driver
    // timed out for 30 seconds on a control that was visible the whole time and reported the
    // bet form as missing. A probe that hides the role invites that every single time.
    const btns = [...document.querySelectorAll("button")].filter(vis).map((x) => ({
      text: (x.innerText || "").replace(/\s+/g, " ").trim().slice(0, 70),
      aria: x.getAttribute("aria-label"),
      role: x.getAttribute("role"),
      disabled: x.disabled,
    }));
    const inputs = [...document.querySelectorAll("input")].map((x) => ({
      name: x.name, id: x.id, type: x.type, inputmode: x.getAttribute("inputmode"),
      aria: x.getAttribute("aria-label"), value: x.value, visible: vis(x),
    }));
    return { btns, inputs, title: document.title, text: document.body.innerText.replace(/\s+/g, " ").slice(0, 700) };
  });
  console.log("TITLE:", map.title);
  console.log("\nBUTTONS:");
  for (const x of map.btns) console.log(`  ${x.disabled ? "[disabled] " : ""}"${x.text}"  aria=${x.aria ?? "-"}  role=${x.role ?? "(button — the tag)"}`);
  console.log("\nINPUTS:");
  for (const x of map.inputs) console.log(`  name=${x.name || "-"} id=${x.id || "-"} type=${x.type} inputmode=${x.inputmode ?? "-"} aria=${x.aria ?? "-"} value="${x.value}" visible=${x.visible}`);
  console.log("\nTEXT:", map.text);
} finally { await ctx.close(); await b.close(); }
