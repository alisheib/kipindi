/**
 * Verify CSV report generation works — clicks Generate, intercepts the Blob
 * via window.URL.createObjectURL hook, and validates the generated CSV body.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });

const TEMPLATES = [
  { id: "gbt-monthly", expectInBody: "GGR" },
  { id: "tra-tax",     expectInBody: "Income Tax Act" },
  { id: "fiu-sar",     expectInBody: "Suspicious Activity" },
  { id: "sx-register", expectInBody: "self-exclusion register" },
  { id: "iso-audit",   expectInBody: "ISO 27001" },
];

const page = await ctx.newPage();
await page.goto(`${BASE}/admin/reports`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// Hook URL.createObjectURL so we can capture the Blob payload generated client-side
await page.addInitScript(() => {
  const origCreate = URL.createObjectURL;
  window.__lastBlobs = [];
  URL.createObjectURL = (obj) => {
    obj.text().then((text) => {
      window.__lastBlobs.push({ name: "(unknown)", content: text });
    });
    return origCreate.call(URL, obj);
  };
  const origAppendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function (node) {
    if (node && node.tagName === "A" && node.download) {
      const lb = window.__lastBlobs;
      if (lb.length > 0 && lb[lb.length - 1].name === "(unknown)") {
        lb[lb.length - 1].name = node.download;
      }
    }
    return origAppendChild.call(this, node);
  };
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

for (const t of TEMPLATES) {
  try {
    const idx = TEMPLATES.findIndex((x) => x.id === t.id);
    const btn = page.locator('button:has-text("Generate")').nth(idx);
    await btn.click({ noWaitAfter: true }).catch(() => {});
    // Give the action time to round-trip + Blob to be created
    await page.waitForTimeout(2_500);
    const captured = await page.evaluate(() => window.__lastBlobs ?? []);
    const matched = captured.find((b) => b.name?.includes(t.id));
    if (!matched) {
      log(`generate ${t.id}`, false, "no Blob captured");
      continue;
    }
    const ok = (matched.content ?? "").includes(t.expectInBody);
    log(`generate ${t.id}`, ok, `${matched.name} · ${matched.content.length} bytes`);
  } catch (e) {
    log(`generate ${t.id}`, false, String(e?.message ?? e));
  }
}

await page.close();
await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nCSV EXPORT  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
