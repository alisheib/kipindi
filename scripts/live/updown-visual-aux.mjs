/** Disposable local browser evidence for U43 loading, empty, stopped, error, and calendar routes.
 * Run each mode only when its real premise exists on a local server. The script
 * refuses to manufacture markup or call a production origin. Calendar mode is
 * explicitly a QA clock simulation of the real weekend rule, not a claim that
 * Gold is closed at the actual wall-clock time. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const mode = process.env.MODE;
const base = (process.env.BASE || "http://localhost:3417").replace(/\/$/, "");
const tag = process.env.TAG || "aux-states";
const calendarAt = "2026-10-24T12:00:00Z";
const expectedCalendarReopen = "2026-10-25T22:00:00.000Z";
const widths = (process.env.WIDTHS || (mode === "calendar-closed" ? "320,360,390,768,1024,1280,1920" : "320,1280")).split(",").map(Number);
const locales = (process.env.LOCALES || "sw").split(",").map((x) => x.trim());
if (!["empty", "loading", "error", "stopped", "calendar-closed"].includes(mode)) throw new Error("MODE must be empty, loading, error, stopped or calendar-closed");
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error("local browser only");
if (mode === "error" && process.env.U43_DEV_BOARD_READ_FAULT !== "1") {
  throw new Error("error mode requires explicit U43_DEV_BOARD_READ_FAULT=1 on this driver and the local dev server");
}
if (mode === "calendar-closed" && process.env.U43_DEV_CALENDAR_CLOCK !== "1") {
  throw new Error("calendar-closed mode requires U43_DEV_CALENDAR_CLOCK=1 on this driver and the local dev server");
}
const heights = { 320: 640, 360: 740, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1920: 1080 };
if (widths.some((w) => !(w in heights)) || locales.some((x) => !["sw", "en", "zh"].includes(x))) {
  throw new Error("WIDTHS must use 320/360/390/768/1024/1280/1920 and LOCALES sw/en/zh");
}
const out = process.env.OUT || join(root, ".qa-shots", "u43", tag);
mkdirSync(out, { recursive: true });
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim();
const trackedDirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root }).toString().trim() !== "";
const untrackedRunnable = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "src", "scripts"],
  { cwd: root }).toString().split(/\r?\n/).some((line) => line.startsWith("?? "));
if (process.env.REQUIRE_CLEAN === "1" && (trackedDirty || untrackedRunnable)) throw new Error("exact-source capture needs committed source and scripts");
const index = { base, tag, mode, sourceHead, trackedDirty, untrackedRunnable,
  injectedReadFault: mode === "error" ? "QA-INJECTED development-only asset catalogue read failure; not a production outage" : null,
  calendarClockSimulation: mode === "calendar-closed" ? {
    label: "QA calendar-clock simulation — not a current wall-clock or production closure",
    at: calendarAt, expectedReopenAt: expectedCalendarReopen,
    basis: "FX/metals weekend rule with no measured daily dead hours; no price or round timestamp is simulated",
  } : null,
  startedAt: new Date().toISOString(), complete: false, rows: [], errors: [] };
const save = () => writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2));
save();
const browser = await chromium.launch();
try {
  if (mode === "stopped" || mode === "calendar-closed") {
    const seed = await fetch(`${base}/api/dev-test/updown-seed`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ assets: ["XAU"], durations: [15], feedProvider: "mock-bars" }) });
    const seeded = await seed.json().catch(() => null);
    if (!seed.ok || !seeded?.ok || seeded.chains?.length !== 1
      || !seeded.assets?.some((row) => row.key === "XAU" && row.enabled)
      || seeded.chains?.filter((row) => row.durationMinutes === 15 && row.state === "RUNNING").length !== 1
      || seeded.notes?.length) throw new Error("fresh local XAU 15m chain seed premise failed");
    index.chainSeed = { assets: seeded.assets, chains: seeded.chains, notes: seeded.notes };
    if (mode === "stopped") {
    const stop = await fetch(`${base}/api/dev-test/updown-handover`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase: "stop" }) });
    const stopped = await stop.json().catch(() => null);
    if (!stop.ok || !stopped?.ok || stopped.phase !== "stop" || stopped.chains < 1
      || !stopped.out?.some((row) => row.durationMinutes === 15 && row.ok)
      || stopped.out.some((row) => !row.ok)) throw new Error("XAU chain did not read back STOPPED");
    index.chainStop = { chains: stopped.chains, out: stopped.out };
    }
    save();
  }
  for (const locale of locales) for (const width of widths) {
    const height = heights[width];
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width === 320 ? 2 : 1,
      isMobile: width < 640, hasTouch: width < 640 });
    await context.addCookies([{ name: "kp-locale", value: locale, domain: new URL(base).hostname, path: "/" }]);
    try {
      const page = await context.newPage();
      let responseStatus = null;
      if (mode === "loading") {
        await page.route("**/updown**", async (route) => {
          if (route.request().url().includes("_rsc=")) await new Promise((resolve) => setTimeout(resolve, 8000));
          await route.continue();
        });
        const response = await page.goto(`${base}/markets`, { waitUntil: "domcontentloaded", timeout: 90000 });
        responseStatus = response?.status() ?? null;
        await page.locator('a[href="/updown"]').first().click({ noWaitAfter: true });
        await page.locator('.ud-board-page[aria-busy="true"]').waitFor({ state: "visible", timeout: 7000 });
      } else {
        const suffix = mode === "calendar-closed" ? `?asset=XAU&d=15&__u43CalendarAt=${encodeURIComponent(calendarAt)}`
          : mode === "stopped" ? "?asset=XAU&d=15"
          : mode === "error" ? "?__u43ReadFault=asset-list" : "";
        const response = await page.goto(`${base}/updown${suffix}`, { waitUntil: "domcontentloaded", timeout: 90000 });
        responseStatus = response?.status() ?? null;
        if (mode === "empty" || mode === "stopped" || mode === "calendar-closed") {
          await page.locator("[data-empty-state]").first().waitFor({ state: "visible", timeout: 15000 });
          const cards = await page.locator(".ud-card[data-phase]").count();
          if (cards !== 0) throw new Error(`${mode} premise absent: ${cards} round card(s)`);
        } else {
          await page.locator("main .kp-shortpage").first().waitFor({ state: "visible", timeout: 20000 });
          if (await page.locator("[data-empty-state]").count()) throw new Error("error route masked by empty state");
        }
      }
      const observed = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        path: location.pathname,
        title: document.title,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        stateText: document.querySelector("[data-empty-state],.ud-board-page[aria-busy='true'],main .kp-shortpage")?.textContent?.trim().slice(0, 300) ?? null,
        goldSelected: !!document.querySelector('nav[data-filter-rail] a[href*="asset=XAU"][aria-current="page"]'),
        errorRetryVisible: !!document.querySelector("main .kp-shortpage button.btn-primary")
          && document.querySelector("main .kp-shortpage button.btn-primary").getClientRects().length > 0,
        emptyStatePresent: !!document.querySelector("[data-empty-state]"),
        qaCalendarAt: document.querySelector(".ud-board-page")?.getAttribute("data-u43-qa-calendar-at") ?? null,
        qaCalendarNextOpen: document.querySelector(".ud-board-page")?.getAttribute("data-u43-qa-calendar-next-open") ?? null,
      }));
      const stoppedCopy = { sw: "Hakuna raundi nyingine iliyopangwa hapa kwa sasa.",
        en: "No further rounds are scheduled here right now.", zh: "此处暂无后续回合安排。" };
      const reopenCopy = { sw: "Soko litafunguliwa tena saa 01:00 EAT.",
        en: "Market reopens at 01:00 EAT.", zh: "市场于 01:00 EAT 重新开放。" };
      if (observed.path !== "/updown" || observed.lang !== locale || observed.horizontalOverflow || !observed.stateText
        || (mode === "calendar-closed" && responseStatus !== 200)
        || (mode === "stopped" && !observed.goldSelected)
        || (mode === "stopped" && !observed.stateText.includes(stoppedCopy[locale]))
        || (mode === "calendar-closed" && (!observed.goldSelected
          || observed.qaCalendarAt !== calendarAt
          || observed.qaCalendarNextOpen !== expectedCalendarReopen
          || !observed.stateText.includes(reopenCopy[locale])
          || observed.stateText.includes(stoppedCopy[locale])))
        || (mode === "error" && (!observed.errorRetryVisible || observed.emptyStatePresent))) {
        throw new Error(`bad ${mode} premise at ${width}-${locale}: ${JSON.stringify(observed)}`);
      }
      const file = `${mode === "calendar-closed" ? "calendar-closed-qa-sim" : mode}__${locale}-${width}.png`;
      await page.screenshot({ path: join(out, file), fullPage: true, animations: "disabled" });
      index.rows.push({ width, height, locale, file, responseStatus, observed,
        evidenceLabel: mode === "calendar-closed" ? "QA calendar-clock simulation — not a current wall-clock or production closure" : null });
      save();
      console.log(`${mode} ${width}-${locale}: ${file}`);
    } catch (error) {
      index.errors.push({ width, locale, error: String(error).slice(0, 260) });
      save();
    } finally {
      await context.close();
    }
  }
} catch (error) {
  index.errors.push({ setup: true, error: String(error).slice(0, 260) });
  save();
  throw error;
} finally {
  await browser.close();
}
index.finishedAt = new Date().toISOString();
index.complete = index.errors.length === 0;
save();
if (index.errors.length) throw new Error(`${index.errors.length} ${mode} premise/capture error(s): ${out}`);
