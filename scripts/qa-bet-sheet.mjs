/** S8 WP11a: real local preview, the actual sheet/host/money action, evidence counted from the player's own rows.
 * KP_BASE=http://localhost:3043 npm run qa:bet-sheet -- [OUTSIDE_REPO_OUTPUT]
 * KP_ONLY=controls,v20,once,low,matrix,tap selects sections; ENGINE=webkit runs the keyboard/focus cells on WebKit.
 * KP_PRODUCTION=1 grades the 4x CPU tap budget only after the operator starts a local production build.
 * Refused outside an in-memory localhost preview. No production writes, database writes, credentials or source plants.
 * Exit 0 all selected cells proved; 1 defect; 2 invalid target/premise; 3 outstanding NOT MEASURED/NOT DRIVEN cells.
 * Every console/page error is retained in evidence.json; screenshots still require a human visual read.
 */
import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { BET_SHEET_SELECTORS as S, NOT_DRIVEN_MATRIX, betSheetTracesIn, betSheetTracesControl, betSheetDomProbe, betSheetDomVerdict, onceOnlyVerdict } from "./live/bet-sheet-cells.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3043";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? join(tmpdir(), `qa-bet-sheet-${Date.now()}`));
const rel = relative(ROOT, OUT);
if (!rel.startsWith("..") && !isAbsolute(rel)) { console.error("REFUSED: output must be outside the repository"); process.exit(2); }
const SECTIONS = ["controls", "v20", "once", "low", "matrix", "tap"];
const ONLY = (process.env.KP_ONLY ?? "").split(",").filter(Boolean);
if (ONLY.some(s => !SECTIONS.includes(s))) { console.error(`REFUSED: KP_ONLY must name ${SECTIONS.join(",")}`); process.exit(2); }
const run = s => !ONLY.length || ONLY.includes(s);
const LOCALES = (process.env.KP_LOCALES ?? "sw,en,zh").split(",");
const WIDTHS = (process.env.KP_WIDTHS ?? "360,390,1280").split(",").map(Number);
if (LOCALES.some(locale => !["sw", "en", "zh"].includes(locale)) || WIDTHS.some(width => ![360, 390, 1280].includes(width))) { console.error("REFUSED: invalid locale/width selection"); process.exit(2); }
const VIEWPORTS = WIDTHS.map(width => ({ width, height: width === 360 ? 640 : width === 390 ? 844 : 900 }));
const pre = await premise(BASE);
if (pre.refuse || pre.health?.security?.adminTotp !== "DISABLED") { console.error(`REFUSED: ${pre.refuse ?? "local preview needs DISABLE_ADMIN_TOTP=true"}`); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const results = [], consoleRows = [];
let tiles = 0;
function result(label, state, detail = "") { results.push({ label, state, detail }); console.log(`${state} ${label}${detail ? ` — ${detail}` : ""}`); }
const ok = (label, test, detail = "") => result(label, test ? "PASS" : "FAIL", detail);
const nm = (label, why) => result(label, "NOT MEASURED", why);
const browser = await (process.env.ENGINE === "webkit" ? webkit : chromium).launch(process.env.QA_CHROMIUM_PATH && process.env.ENGINE !== "webkit" ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
console.log(`qa:bet-sheet ${BASE}, ${process.env.ENGINE ?? "chromium"} ${browser.version()}, output ${OUT}`);
const PASS = await mintStaffPass(browser, BASE, { phone: "+255700000088", name: "Sheet QA Support" });
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const post = async (ctx, name, data = {}) => {
  const response = await ctx.request.post(`${BASE}/api/dev-test/${name}`, { data, timeout: 240_000 });
  const body = await response.json().catch(() => null);
  if (!response.ok() || body?.ok === false) throw new Error(`${name} failed (${response.status()})`);
  return body;
};
const asCookie = c => ({ name: c.name, value: c.value, domain: new URL(BASE).hostname, path: c.path || "/" });
await post(admin, "seed-admin", { role: "ADMIN", phone: "+255700000089", name: "Sheet QA Admin" });
const catalogue = await post(admin, "seed-markets");
if (!catalogue?.ids?.length) { console.error("REFUSED: seeded board has no market"); await browser.close(); process.exit(2); }
let SESSION = await demoSession(browser, BASE);
const contexts = new Set();
async function context(locale = "en", viewport = { width: 390, height: 844 }, { preview = true, signedIn = true } = {}) {
  const ctx = await browser.newContext({ viewport }); contexts.add(ctx);
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...(preview ? [asCookie(PASS)] : []), ...(signedIn ? [asCookie(SESSION)] : [])]);
  return ctx;
}
async function pageIn(ctx, route = "/") {
  const page = await ctx.newPage();
  page.on("console", m => { if (["error", "warning"].includes(m.type())) consoleRows.push({ route, type: m.type(), text: m.text() }); });
  page.on("pageerror", error => { consoleRows.push({ route, type: "pageerror", text: error.message }); result(`${route}: uncaught page error`, "FAIL", error.message.slice(0, 180)); });
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForFunction(() => document.querySelector("main"), { timeout: 90_000 });
  await page.waitForTimeout(1200);
  return page;
}
async function tile(page, label) {
  const filename = `${String(++tiles).padStart(3, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").slice(0, 110)}.png`;
  await page.screenshot({ path: join(OUT, filename), fullPage: false });
  results.push({ label, state: "TILE", file: filename });
}
async function probe(page, expected = {}) {
  const got = await page.evaluate(betSheetDomProbe, S);
  const errors = betSheetDomVerdict(got, expected);
  return { got, errors };
}
async function open(page, wantedId = null, side = "YES") {
  const picks = page.locator(`${S.pick}[data-bet-side="${side}"]`);
  await picks.first().waitFor({ state: "visible", timeout: 120_000 });
  const selector = await page.evaluate(([selector, id]) => {
    const list = [...document.querySelectorAll(selector)];
    return list.findIndex(a => { try { return !id || JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")).id === id; } catch { return false; } });
  }, [`${S.pick}[data-bet-side="${side}"]`, wantedId]);
  if (selector < 0) throw new Error(`No visible pick for ${wantedId ?? "board"}`);
  const anchor = picks.nth(selector);
  const seed = await anchor.evaluate(a => JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")));
  const beforePath = new URL(page.url()).pathname;
  await anchor.click();
  await page.locator(S.root).waitFor({ state: "visible", timeout: 90_000 });
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute("data-frame") !== "placing", S.root);
  if (!["blocked", "closed", "receipt"].includes(await page.locator(S.root).getAttribute("data-frame"))) await page.locator(S.stake).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(350);
  ok("pick opens in place", new URL(page.url()).pathname === beforePath);
  return seed;
}
async function waitFrame(page, frame) { await page.waitForFunction(([selector, frame]) => document.querySelector(selector)?.getAttribute("data-frame") === frame, [S.root, frame], { timeout: 90_000 }); }
async function observed(ctx, marketId) {
  const response = await ctx.request.get(`${BASE}/api/dev-test/bet-sheet-observe?marketId=${encodeURIComponent(marketId)}`);
  const body = await response.json().catch(() => null);
  if (!response.ok() || !body?.ok) throw new Error(`Observer premise failed (${response.status()})`);
  return body;
}
function actionWatch(page) {
  const requests = [];
  const listener = request => { if (request.method() === "POST" && request.headers()["next-action"] && request.postData()?.includes("idempotencyKey")) requests.push(request); };
  page.on("request", listener);
  return { requests, stop: () => page.off("request", listener) };
}
async function setMaintenance(enabled) {
  const page = await pageIn(admin, "/admin/system");
  try {
    const toggle = page.getByLabel("Maintenance mode", { exact: true });
    await toggle.waitFor({ timeout: 90_000 });
    const isOn = await toggle.getAttribute("aria-checked") === "true";
    if (isOn !== enabled) {
      await toggle.click();
      const card = toggle.locator("xpath=ancestor::section[1]");
      const button = page.getByRole("button", { name: enabled ? "Enable maintenance" : "Save", exact: true });
      await button.filter({ visible: true }).first().click();
      await page.waitForTimeout(700);
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    if ((await toggle.getAttribute("aria-checked") === "true") !== enabled) throw new Error("Maintenance switch did not persist");
  } finally { await page.close(); }
}

try {
  ok("S8 served trace matcher controls", betSheetTracesControl().length === 0, betSheetTracesControl().join("; "));
  if (run("controls")) {
    for (const route of ["/", "/live", `/markets/${catalogue.ids[0].id}`]) {
      const ctx = await context("en", { width: 390, height: 844 }, { preview: false });
      const page = await pageIn(ctx, route);
      const traces = betSheetTracesIn(await page.content());
      ok(`classic ${route}: no S8 trace`, traces.length === 0, traces.join(","));
      if (route.startsWith("/markets/")) {
        await page.locator('[data-testid="side-picker"] .btn-yes').click();
        await page.locator('[data-testid="dial-lock-toggle"]').waitFor({ state: "visible", timeout: 30_000 });
        ok("classic question keeps its dial", await page.locator('[data-testid="journey-bet-buttons"]').count() === 0 && await page.locator('[data-testid="dial-lock-toggle"]').count() > 0);
      }
      await ctx.close(); contexts.delete(ctx);
    }
    const guest = await context("en", { width: 390, height: 844 }, { signedIn: false });
    const page = await pageIn(guest);
    const pick = page.locator('a.kp-jcard__pick').first();
    if (await pick.count()) {
      const href = await pick.getAttribute("href"); await pick.click();
      await page.waitForURL(url => url.pathname.startsWith("/markets/"));
      ok("journey guest pick navigates, never opens a sheet", !(await page.locator(S.root).count()) && !!href);
    } else nm("journey guest pick", "no pick on seeded guest home");
    await guest.close(); contexts.delete(guest);
  }

  if (run("v20")) for (const locale of LOCALES) for (const viewport of VIEWPORTS) {
    const label = `${locale} ${viewport.width}x${viewport.height}`;
    const ctx = await context(locale, viewport), page = await pageIn(ctx);
    const seed = await open(page);
    const entry = await probe(page, { frame: "edit", focus: true });
    ok(`${label}: initial focus, no overflow`, !entry.errors.length, entry.errors.join(";"));
    for (const key of ["Tab", "Shift+Tab"]) {
      let trapped = true;
      for (let n = 0; n < 16; n++) { await page.keyboard.press(key); trapped &&= (await probe(page)).got.focusedInside; }
      ok(`${label}: ${key} remains in sheet`, trapped);
    }
    await page.locator(S.stake).focus();
    const watch = actionWatch(page);
    await page.keyboard.press("Enter"); await page.waitForTimeout(150);
    ok(`${label}: Enter in stake sends no action`, watch.requests.length === 0);
    const safeStyle = await page.evaluate(selector => {
      const root = document.querySelector(selector), panel = root.closest(".kp-bsheet");
      return { padding: getComputedStyle(panel).paddingBottom, cap: getComputedStyle(root).maxHeight };
    }, S.root);
    await page.addStyleTag({ content: `.kp-bsheet { padding-bottom:calc(${safeStyle.padding} + 34px) !important; } ${S.root} { max-height:calc(${safeStyle.cap} - 34px) !important; }` });
    const safe = await probe(page, { safeInset: 34 });
    ok(`${label}: CTA above substituted 34px safe inset`, !safe.errors.length, safe.errors.length ? `${safe.errors.join(";")} ${JSON.stringify({ place: safe.got.place, viewport: safe.got.viewport, original: safeStyle })}` : "computed panel padding and shell height substitute the inset together");
    await tile(page, `${label}-edit-safe34`);
    const safePlant = await page.addStyleTag({ content: `${S.place} { transform:translateY(1000px) !important; }` });
    const planted = await probe(page, { safeInset: 34 });
    ok(`${label}: RED safe-area plant fails the same verdict`, planted.errors.includes("CTA enters the bottom safe area"));
    await safePlant.evaluate(el => el.remove());
    await page.keyboard.press("Escape"); await page.locator(S.root).waitFor({ state: "hidden" });
    ok(`${label}: Escape closes`, !(await page.locator(S.root).count()));
    await open(page, seed.id); await page.locator(S.close).click(); await page.locator(S.root).waitFor({ state: "hidden" });
    ok(`${label}: kit close closes`, !(await page.locator(S.root).count()));
    await open(page, seed.id); await page.goBack(); await page.locator(S.root).waitFor({ state: "hidden" });
    ok(`${label}: Back closes`, !(await page.locator(S.root).count()));
    await open(page, seed.id); await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(S.root).waitFor({ state: "visible", timeout: 90_000 });
    ok(`${label}: ordinary reload reopens at market minimum`, (await probe(page)).got.stakeValue.replace(/,/g, "") === String(seed.min));
    await page.locator(S.place).focus();
    const before = await observed(ctx, seed.id);
    await page.keyboard.down("Enter"); await page.keyboard.down("Enter"); await page.keyboard.up("Enter");
    await waitFrame(page, "receipt");
    const after = await observed(ctx, seed.id);
    const errors = onceOnlyVerdict(before, after, watch.requests.length);
    ok(`${label}: focused/held Enter commits exactly once`, !errors.length, errors.join(";"));
    ok(`${label}: receipt strips bet/side address`, !new URL(page.url()).searchParams.has("bet") && !new URL(page.url()).searchParams.has("side"));
    await tile(page, `${label}-receipt`);
    watch.stop(); await ctx.close(); contexts.delete(ctx);
  }

  if (run("once")) {
    for (const mode of ["double", "abort-before", "drop-after", "landed-maintenance"]) {
      const ctx = await context(), page = await pageIn(ctx), seed = await open(page);
      const before = await observed(ctx, seed.id), watch = actionWatch(page);
      let first = true;
      const heldKeyReads = [];
      if (mode === "landed-maintenance") await page.route("**/api/markets/*/sheet?**", async route => {
        if (new URL(route.request().url()).searchParams.has("key")) heldKeyReads.push(route);
        else await route.continue();
      });
      if (mode !== "double") await page.route("**/*", async route => {
        const request = route.request();
        if (!first || request.method() !== "POST" || !request.headers()["next-action"] || !request.postData()?.includes("idempotencyKey")) return route.fallback();
        first = false;
        if (mode !== "abort-before") await route.fetch();
        await route.abort("failed");
      });
      const place = page.locator(S.place); await place.click();
      if (mode === "double") { await page.waitForTimeout(30); await place.dispatchEvent("click"); }
      if (mode === "abort-before" || mode === "landed-maintenance") {
        await waitFrame(page, "inDoubt");
        const got = (await probe(page)).got;
        ok(`${mode}: frozen stake, no false money claim`, got.stakeLocked && !/nothing has been charged|hakuna kilichokatwa|no money.*taken/i.test(got.text));
        if (mode === "landed-maintenance") await setMaintenance(true);
        await page.locator(S.place).click();
      }
      await waitFrame(page, "receipt");
      if (mode === "landed-maintenance") { await setMaintenance(false); for (const route of heldKeyReads) await route.continue().catch(() => {}); }
      const after = await observed(ctx, seed.id), count = mode === "double" || mode === "drop-after" ? 1 : 2;
      const errors = onceOnlyVerdict(before, after, watch.requests.length, 1).filter(e => !e.startsWith("2 action requests") || count !== 2);
      ok(`${mode}: one position, one BET_PLACED row, one key`, !errors.length && watch.requests.length === count, errors.join(";"));
      const fresh = after.positions.find(p => !before.positions.some(b => b.positionId === p.positionId));
      const href = await page.locator(S.ticket).getAttribute("href");
      ok(`${mode}: receipt names the stored ticket`, !!fresh?.positionId && !!href && href.includes(fresh.positionId));
      await tile(page, `once-${mode}`);
      watch.stop(); await ctx.close(); contexts.delete(ctx);
    }
    nm("A24 held first server request while maintenance changes", "requires a service-level local lock gate; abort-before and landed-key maintenance variants measured separately, never substituted for this cell");
  }

  if (run("low")) for (const [name, balance, stake] of [["zero-min500", 0, 500], ["two-options", 1200, 5000], ["below-deposit-min", 1200, 1500]]) {
    SESSION = await demoSession(browser, BASE, { query: "?deposit=0", balance });
    const ctx = await context(), page = await pageIn(ctx), seed = await open(page);
    await page.locator(S.stake).fill(String(stake)); await waitFrame(page, "low");
    const check = await probe(page, { frame: "low" });
    ok(`${name}: actual wallet ${balance}, neutral invalid cue and disabled full-stake CTA`, !check.errors.length, check.errors.join(";"));
    if (name === "zero-min500") ok("zero at owner minimum500 still offers deposit minimum1000", check.got.visibleDeposit && !check.got.visibleInstead);
    else ok(`${name}: both engine options present`, check.got.visibleDeposit && check.got.visibleInstead);
    await tile(page, `low-${name}`);
    if (name === "two-options") {
      const before = await observed(ctx, seed.id), watch = actionWatch(page);
      await page.locator(S.instead).click(); await waitFrame(page, "receipt");
      const after = await observed(ctx, seed.id);
      ok("bet instead is one distinct explicit commitment", !onceOnlyVerdict(before, after, watch.requests.length).length);
      watch.stop();
    } else if (name === "below-deposit-min") {
      await page.locator(S.deposit).click(); await page.waitForURL(url => url.pathname === "/wallet/deposit");
      const url = new URL(page.url());
      ok("deposit closes sheet; amount/bet/from retained without reopening there", !await page.locator(S.root).count() && url.searchParams.get("amount") === "1000" && url.searchParams.get("from") === "low-balance" && url.searchParams.has("bet"));
    }
    await ctx.close(); contexts.delete(ctx);
  }

  if (run("matrix")) {
    SESSION = await demoSession(browser, BASE);
    const ctx = await context(), page = await pageIn(ctx), seed = await open(page);
    const beforeMaintenance = await observed(ctx, seed.id);
    await setMaintenance(true); await page.locator(S.place).click({ force: true });
    await page.waitForTimeout(500);
    const maintenanceProbe = (await probe(page)).got, afterMaintenance = await observed(ctx, seed.id);
    ok("real maintenance refusal stays inline and does not place", maintenanceProbe.frame === "edit" && /maintenance|paused/i.test(maintenanceProbe.text)
      && afterMaintenance.positionCount === beforeMaintenance.positionCount && afterMaintenance.betPlacedCount === beforeMaintenance.betPlacedCount);
    await tile(page, "matrix-maintenance"); await setMaintenance(false);
    await ctx.close(); contexts.delete(ctx);
    SESSION = await demoSession(browser, BASE, { query: "?hold=officer" });
    const held = await context(), hp = await pageIn(held); await open(hp);
    await waitFrame(hp, "blocked"); ok("real officer wallet hold blocks before payment offer", !(await probe(hp)).got.visibleDeposit);
    await tile(hp, "matrix-held-wallet"); await held.close(); contexts.delete(held);
    for (const cell of NOT_DRIVEN_MATRIX) result(`matrix row ${cell.row}: ${cell.reason}`, "NOT DRIVEN", cell.proof);
    for (const name of ["cooling-off after open", "loss limit changed after open", "15-minute session limit exceeded", "30-bet rate capacity", "stake bounds moved after open", "selection closes before/during placement", "admission BUSY observed", "pending deposit age bands", "deposit-limit headroom", "source-of-funds gate", "all deposit rails paused", "redirect mid-bet", "deploy skew/reload spent", "Onyesha zaidi cards intercepted", "hidden-balance Cash privacy"]) nm(name, "remaining service/browser cell explicitly unproven; no fixture result counted as a real gate");
  }

  if (run("tap")) {
    if (process.env.ENGINE === "webkit") nm("tap 4x CPU", "CDP throttling requires Chromium");
    else for (const route of ["/", "/live"]) {
      SESSION = await demoSession(browser, BASE);
      const ctx = await context("en", { width: 360, height: 640 }), page = await pageIn(ctx, route);
      const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.evaluate(([pick, root]) => {
        window.__sheetTap = null;
        const ready = e => {
          if (!e.target.closest(pick)) return;
          const start = performance.now();
          const read = () => {
            const h = document.querySelector(root)?.querySelector("h2");
            if (h?.getBoundingClientRect().height) { window.__sheetTap = performance.now() - start; return; }
            if (performance.now() - start < 5000) requestAnimationFrame(read);
          };
          requestAnimationFrame(read);
        };
        window.addEventListener("pointerup", ready, true);
      }, [S.pick, S.root]);
      await open(page);
      const ms = await page.evaluate(() => window.__sheetTap);
      if (process.env.KP_PRODUCTION === "1") ok(`${route}: production tap frame <=150ms at4x`, typeof ms === "number" && ms <= 150, `${ms}ms`);
      else nm(`${route}: tap frame ${ms}ms at4x`, "dev reading recorded; A21 requires a separately built production server before this can pass");
      await tile(page, `tap-${route === "/" ? "home" : "live"}`); await cdp.detach(); await ctx.close(); contexts.delete(ctx);
    }
  }
} catch (error) {
  result("drive stopped on invalid premise or runtime error", "FAIL", String(error?.stack ?? error));
} finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await admin.close().catch(() => {}); await browser.close();
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify({ base: BASE, engine: process.env.ENGINE ?? "chromium", results, console: consoleRows, tiles }, null, 2));
}
const failures = results.filter(r => r.state === "FAIL"), outstanding = results.filter(r => ["NOT MEASURED", "NOT DRIVEN"].includes(r.state));
console.log(`qa:bet-sheet: ${results.filter(r => r.state === "PASS").length} passed, ${failures.length} failed, ${outstanding.length} outstanding, ${tiles} tiles. Read every tile: ${OUT}`);
process.exitCode = failures.length ? 1 : outstanding.length ? 3 : 0;
