/**
 * Ask the LIVE resolution-ceremony page what its controls are actually called.
 *
 *   node scripts/live-probe-resolver.mjs <marketId>
 *
 * Written after three failed guesses at the outcome button's accessible name
 * (`Resolve YES`, `YES`, `^YES\b`). The campaign's own rule is to ask for a control by
 * what it IS — this prints exactly that, so the next driver is written against the DOM
 * rather than against a memory of it. Read-only: it clicks nothing.
 */
import { chromium } from "playwright";
import { login, BASE } from "./live/harness.mjs";

const marketId = process.argv[2];
if (!marketId) { console.error("usage: node scripts/live-probe-resolver.mjs <marketId>"); process.exit(2); }

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await ctx.newPage();
await login(page, "trading");
await page.goto(`${BASE}/admin/resolver/${marketId}`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});

const report = await page.evaluate(() => {
  const name = (el) =>
    el.getAttribute("aria-label") ||
    (el.innerText || "").replace(/\s+/g, " ").trim() ||
    el.getAttribute("title") || "";
  const out = { buttons: [], inputs: [], textareas: [] };
  for (const b of document.querySelectorAll('button, [role="button"]')) {
    const r = b.getBoundingClientRect();
    out.buttons.push({
      name: name(b).slice(0, 70),
      disabled: b.disabled === true || b.getAttribute("aria-disabled") === "true",
      visible: r.width > 0 && r.height > 0,
    });
  }
  for (const i of document.querySelectorAll("input")) {
    out.inputs.push({
      placeholder: i.placeholder || "", name: i.name || "", id: i.id || "",
      type: i.getAttribute("type") || "(none)",
    });
  }
  for (const t of document.querySelectorAll("textarea")) {
    out.textareas.push({ placeholder: t.placeholder || "", name: t.name || "", id: t.id || "" });
  }
  return out;
});

console.log("\nBUTTONS (accessible name | disabled | visible)");
for (const b of report.buttons) console.log(`  ${JSON.stringify(b.name)} | ${b.disabled} | ${b.visible}`);
console.log("\nINPUTS");
for (const i of report.inputs) console.log(`  ${JSON.stringify(i)}`);
console.log("\nTEXTAREAS");
for (const t of report.textareas) console.log(`  ${JSON.stringify(t)}`);

await ctx.close(); await br.close();
