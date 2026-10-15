/** S8 exact-build, local-memory, actual-action receipt geometry across 3 locales × 4 widths.
 * First run the guarded fixture with both preloads in this checkout:
 *   node --import tsx --import ./scripts/live/bet-sheet-prod-bootstrap.mts --import ./scripts/live/bet-sheet-receipt-matrix-bootstrap.mts ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3044
 * Then: node scripts/qa-bet-sheet-receipt-production.mjs <OUTSIDE_REPOSITORY_OUTPUT_DIR>
 * For WebKit set ENGINE=webkit and restart the fixture first; each market is consumed by one bet.
 * The guard rejects real databases, remote hosts, dirty source, or a build whose deployment ID differs from HEAD.
 * Bets use synthetic TZS 500 positions in this local memory process only. Screenshots and signed cookies stay ignored.
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, dirname, relative, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rawOut = process.argv[2];
if (!rawOut) throw new Error("An outside-repository evidence directory is required.");
const OUT = resolve(rawOut);
const rel = relative(ROOT, OUT);
if (!rel.startsWith("..") && !isAbsolute(rel)) throw new Error("Evidence directory must be outside the repository.");
const BASE = "http://127.0.0.1:3044";
const { chromium, webkit } = createRequire(resolve(ROOT, "package.json"))("playwright");
const engine = process.env.ENGINE ?? "chromium";
if (engine !== "chromium" && engine !== "webkit") throw new Error("ENGINE must be chromium or webkit.");
const fixture = JSON.parse(readFileSync(resolve(ROOT, ".qa-artifacts/s8-production/fixture.json"), "utf8"));
const matrix = JSON.parse(readFileSync(resolve(ROOT, ".qa-artifacts/s8-production/receipt-matrix.json"), "utf8"));
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const build = JSON.parse(readFileSync(resolve(ROOT, ".next/required-server-files.json"), "utf8"));
const buildId = readFileSync(resolve(ROOT, ".next/BUILD_ID"), "utf8").trim();
const sourceDirty = execFileSync("git", ["status", "--porcelain", "--", "src", "next.config.ts", "prisma", "package-lock.json"], { cwd: ROOT, encoding: "utf8" }).trim() !== "";
const metaResponse = await fetch(BASE + "/_next/static/kp-s8-local-build.json");
const meta = await metaResponse.json();
const health = await fetch(BASE + "/api/health").then(response => response.json());
if (!metaResponse.ok || head !== matrix.sourceHead || head !== meta.buildSha || head !== meta.sourceHead || head !== build.config.deploymentId ||
    meta.mode !== "production" || meta.localOnly !== true || meta.databaseConfigured !== false || meta.sourceDirty !== false || sourceDirty ||
    meta.buildId !== buildId || meta.runtimeIdentity?.deploymentId !== head || meta.runtimeIdentity?.nextDeploymentId !== head || meta.runtimeIdentity?.railwayGitCommitSha !== head ||
    health.database?.configured !== false || health.simpleJourney?.state !== "STAFF_PREVIEW" || matrix.ids.length !== 12) {
  throw new Error("Local production fixture, build, source, or in-memory premise differs from the exact matrix proof.");
}
mkdirSync(OUT, { recursive: true });
const cells = ["sw", "en", "zh"].flatMap(locale => [320, 360, 390, 1280].map(width => ({ locale, width, height: width <= 360 ? 640 : width === 390 ? 844 : 900 })));
const browser = await (engine === "webkit" ? webkit : chromium).launch();
const results = [];
for (const [i, cell] of cells.entries()) {
  const ctx = await browser.newContext({ viewport: { width: cell.width, height: cell.height } });
  const label = `${cell.locale}-${cell.width}`;
  const row = { label, marketId: matrix.ids[i], state: "FAIL", frames: [], errors: [], navigation: [] };
  results.push(row);
  try {
    await ctx.addCookies(fixture.cookies.filter(cookie => cookie.name !== "kp-locale").map(cookie => ({ name: cookie.name, value: cookie.value, url: BASE })));
    await ctx.addCookies([{ name: "kp-locale", value: cell.locale, url: BASE }]);
    const page = await ctx.newPage();
    page.on("pageerror", error => row.errors.push(error.message));
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) row.navigation.push(frame.url()); });
    await page.addInitScript(() => {
      window.__qaReceiptDocument = crypto.randomUUID();
      window.__qaReceiptUnload = false;
      window.addEventListener("beforeunload", () => { window.__qaReceiptUnload = true; }, true);
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        const result = add.call(this, type, listener, options);
        if ((this === window || this === document) && type === "click" && typeof listener === "function" && listener.toString().includes("a[data-bet-side]")) window.__qaReceiptHostReady = true;
        return result;
      };
    });
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForFunction(() => window.__qaReceiptHostReady === true, null, { timeout: 90_000 });
    const picks = page.locator('a[data-bet-side="YES"]');
    const index = await page.evaluate(id => [...document.querySelectorAll('a[data-bet-side="YES"]')].findIndex(anchor => {
      try { return JSON.parse(anchor.closest("[data-sheet]").getAttribute("data-sheet")).id === id; } catch { return false; }
    }), matrix.ids[i]);
    if (index < 0) throw new Error(`Seeded question ${matrix.ids[i]} has no home pick`);
    const pick = picks.nth(index);
    await pick.waitFor({ state: "visible", timeout: 60_000 });
    const selectedId = await pick.evaluate(anchor => JSON.parse(anchor.closest("[data-sheet]").getAttribute("data-sheet")).id);
    if (selectedId !== matrix.ids[i]) throw new Error(`Question pick mismatch: ${selectedId}`);
    const documentId = await page.evaluate(() => window.__qaReceiptDocument);
    await pick.click();
    const root = page.locator('[data-testid="journey-bet-sheet"]');
    await root.waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-bet-sheet"]')?.getAttribute("data-frame") === "edit", null, { timeout: 60_000 });
    row.frames.push("edit");
    const place = page.locator('[data-testid="journey-sheet-place"]');
    await place.waitFor({ state: "visible", timeout: 60_000 });
    await place.click();
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-bet-sheet"]')?.getAttribute("data-frame") === "receipt", null, { timeout: 60_000 });
    row.frames.push("receipt");
    const box = await root.boundingBox({ timeout: 2_000 });
    if (!box) throw new Error("Receipt has no bounding box");
    await page.mouse.move(box.x + Math.min(40, box.width / 4), box.y + Math.min(40, box.height / 4));
    await page.mouse.move(box.x + Math.min(48, box.width / 3), box.y + Math.min(44, box.height / 3));
    const geometry = async () => page.evaluate(() => {
      const root = document.querySelector('[data-testid="journey-bet-sheet"]');
      const panel = root?.closest(".kp-bsheet"), dialog = root?.closest('[role="dialog"]');
      const bounds = root?.getBoundingClientRect();
      let opacity = 1;
      for (let node = panel; node && node !== document.body; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      return { document: window.__qaReceiptDocument, frame: root?.getAttribute("data-frame") ?? "closed", pathname: location.pathname,
        search: location.search, width: innerWidth, rootLeft: bounds?.left ?? null, rootRight: bounds?.right ?? null,
        rootWidth: bounds?.width ?? null, panelScrollWidth: panel?.scrollWidth ?? null, panelClientWidth: panel?.clientWidth ?? null,
        opacity, dialogHidden: dialog?.getAttribute("aria-hidden") ?? null, heading: root?.querySelector("h2")?.textContent?.trim() ?? null,
        continueVisible: !!root?.querySelector(".kp-bsheet__continue"), unload: window.__qaReceiptUnload === true };
    });
    await page.waitForTimeout(350);
    row.before = await geometry();
    const image = `${String(i + 1).padStart(2, "0")}-${label}-receipt.png`;
    await page.screenshot({ path: join(OUT, image), fullPage: false, caret: "initial" });
    row.image = image;
    await page.waitForTimeout(6_000);
    row.after = await geometry();
    const valid = value => value.document === documentId && value.frame === "receipt" && value.search === "" &&
      value.rootLeft >= -1 && value.rootRight <= cell.width + 1 && value.panelScrollWidth <= value.panelClientWidth + 1 &&
      value.opacity >= .999 && value.dialogHidden !== "true" && value.continueVisible && !value.unload && !!value.heading;
    if (!valid(row.before) || !valid(row.after) || row.errors.length) throw new Error(`Receipt geometry/persistence failed: ${JSON.stringify({ before: row.before, after: row.after, errors: row.errors })}`);
    row.state = "PASS";
    console.log(`PASS ${label}: real receipt visible and held past 5s; ${image}`);
  } catch (error) {
    row.error = String(error?.message ?? error).split("Call log:")[0].slice(0, 1200);
    console.error(`FAIL ${label}: ${row.error}`);
  } finally { await ctx.close().catch(() => {}); }
}
await browser.close();
writeFileSync(join(OUT, "evidence.json"), JSON.stringify({ sourceHead: head, engine, buildId: meta.buildId, mode: meta.mode, databaseConfigured: health.database.configured,
  simpleJourney: health.simpleJourney.state, cells: results, pass: results.filter(row => row.state === "PASS").length }, null, 2));
console.log(`Receipt matrix: ${results.filter(row => row.state === "PASS").length}/${results.length} valid, evidence ${OUT}`);
if (results.some(row => row.state !== "PASS")) process.exitCode = 1;
