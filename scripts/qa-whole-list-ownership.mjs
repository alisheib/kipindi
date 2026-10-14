/** Fresh, isolated in-memory app proof for PV-03's four explicit collection owners. No money actions. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { premise } from "./live/journey-pass.mjs";
import { emptyStateAlignment } from "./live/empty-state-alignment.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE;
const pre = await premise(base);
if (pre.refuse || pre.health?.security?.adminTotp !== "DISABLED") {
  throw new Error(pre.refuse || "An isolated local memory server with admin TOTP disabled is required");
}
const out = process.env.QA_WHOLE_LIST_ARTIFACTS || path.join(root, ".qa-artifacts", "whole-list-ownership");
fs.mkdirSync(out, { recursive:true });
const knownChromium = "C:/Users/asheib/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe";
const executablePath = process.env.QA_CHROMIUM_PATH || (fs.existsSync(knownChromium) ? knownChromium : undefined);
const files = ["scripts/qa-whole-list-ownership.mjs", "scripts/live/empty-state-alignment.mjs", "scripts/responsive-audit.mjs",
  "src/components/layout/page-container.tsx", "src/app/watchlist/page.tsx", "src/app/notifications/page.tsx",
  "src/app/wallet/receipts/page.tsx", "src/app/admin/resolver-queue/page.tsx"];
const sourceProof = {
  head:execFileSync("git", ["rev-parse", "HEAD"], { cwd:root, encoding:"utf8" }).trim(),
  files:Object.fromEntries(files.map(file => [file, createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex")])),
  evaluator:createHash("sha256").update(emptyStateAlignment.toString()).digest("hex"),
};
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}) });
const player = await browser.newContext(), admin = await browser.newContext();
const evidence = { base, sourceProof, cells:[], errors:[], forbiddenActions:0, pass:0, fail:0 };
const check = (name, passed, detail) => {
  evidence[passed ? "pass" : "fail"]++;
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${passed ? "" : " " + JSON.stringify(detail)}`);
};
try {
  const signed = await player.request.get(base + "/auth/demo", { timeout:180_000 });
  if (!signed.ok()) throw new Error("Own demo login failed");
  const seeded = await admin.request.post(base + "/api/dev-test/seed-admin", {
    data:{ role:"ADMIN", phone:"+255700000073", name:"WholeListOwnershipFixture" },
    timeout:180_000,
  });
  if (!seeded.ok()) throw new Error("Own local admin fixture refused");
  for (const route of ["/watchlist", "/notifications", "/wallet/receipts", "/admin/resolver-queue"]) {
    for (const width of [320, 1280]) {
      const context = route.startsWith("/admin") ? admin : player;
      await context.addCookies([{ name:"kp-locale", value:"en", url:base }]);
      const page = await context.newPage();
      await page.setViewportSize({ width, height:900 });
      page.on("pageerror", error => evidence.errors.push({ route, width, error:error.message }));
      page.on("console", message => { if (message.type() === "error") evidence.errors.push({ route, width, error:message.text() }); });
      page.on("request", request => {
        if (request.method() === "POST" && /(?:next-action|\/api\/(?:markets|payments|withdrawals|bets))/.test(request.url())) evidence.forbiddenActions++;
        if (request.headers()["next-action"]) evidence.forbiddenActions++;
      });
      const response = await page.goto(base + route, { waitUntil:"domcontentloaded", timeout:180_000 });
      if (!response?.ok() || new URL(page.url()).pathname !== route) throw new Error(`Actual route/auth premise failed: ${route}`);
      const box = page.locator("[data-empty-state]");
      await box.first().waitFor();
      if (await box.count() !== 1) throw new Error(`Expected the whole collection replacement: ${route}`);
      await page.waitForFunction(() => [...document.querySelectorAll("[data-empty-state]")]
        .every(el => Object.keys(el).some(key => key.startsWith("__reactProps$"))));
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const fontPremise = await page.evaluate(() => ({ status:document.fonts.status,
        woff:performance.getEntriesByType("resource").filter(r => /\.woff2?(?:\?|$)/.test(r.name)).length }));
      if (fontPremise.status !== "loaded" || fontPremise.woff < 3) throw new Error(`Project fonts not loaded: ${route}`);
      const stem = route.replace(/[^a-z0-9]+/gi,"-") + "-" + width;
      const normal = await page.evaluate(emptyStateAlignment);
      check(stem + " real enclosing collection ownership and geometry", normal.length === 1
        && normal[0].association === "collection" && normal[0].collection?.passed === true, normal);
      await page.screenshot({ path:path.join(out,stem + ".png"), fullPage:true });
      const cell = { route, width, fontPremise, normal, negatives:[] };
      for (const fault of ["offcenter", "oversized", "clipped"]) {
        await box.evaluate((el, name) => {
          el.dataset.qaSavedStyle = el.getAttribute("style") ?? "";
          if (name === "offcenter") el.style.transform = "translateX(40px)";
          if (name === "oversized") { el.style.width = "520px"; el.style.maxWidth = "520px"; }
          if (name === "clipped") el.style.clipPath = "inset(0 0 45% 0)";
        }, fault);
        const rows = await page.evaluate(emptyStateAlignment);
        check(stem + " RED " + fault, rows.length === 1 && rows[0].association === "collection"
          && rows[0].collection?.passed === false, rows);
        cell.negatives.push({ fault, rows });
        await page.screenshot({ path:path.join(out,stem + "-RED-" + fault + ".png"), fullPage:true });
        await box.evaluate(el => { const saved = el.dataset.qaSavedStyle; delete el.dataset.qaSavedStyle;
          if (saved) el.setAttribute("style",saved); else el.removeAttribute("style"); });
      }
      evidence.cells.push(cell);
      await page.close();
    }
  }
  check("no console or page errors", evidence.errors.length === 0, evidence.errors);
  check("no money or server actions", evidence.forbiddenActions === 0, evidence.forbiddenActions);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out,"evidence.json"), JSON.stringify(evidence,null,2));
}
console.log(`whole-list-ownership: ${evidence.pass} passed, ${evidence.fail} failed · ${out}`);
process.exitCode = evidence.fail ? 1 : 0;
