/**
 * U43 B2 · LOCAL, BROWSER-ONLY layout fixture for the round's available mini-line.
 *
 * The dev state driver normally has confirmed reads but no vendor minute bars, so
 * the honest card says that its line is unavailable. This probe borrows the open
 * and latest read ALREADY CONFIRMED by that local driver, interpolates clearly
 * labelled synthetic interior minute points, and substitutes one GET response in
 * this Playwright page only. It never changes a service, store, app source, or
 * production response. These screenshots prove layout and arrival behaviour only;
 * they are not evidence that a vendor supplied those intermediate prices.
 *
 * Run after a local U43 state drive has left a minute-aligned open or locked BTC round
 * with a confirmed whole-minute read at least two minutes after its open. The ordinary
 * accelerated dev advance creates off-minute boundaries and is refused here:
 *   ROUND_ID=udr_... DURATION=15 BASE=http://localhost:3417 npm run qa:u43-synthetic-line
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const QA_BANNER = "QA SYNTHETIC LINE · LAYOUT ONLY · NOT VENDOR PRICE HISTORY";
export const DEFAULT_CELLS = [
  { width: 320, locale: "sw" }, { width: 360, locale: "sw" },
  { width: 360, locale: "en" }, { width: 360, locale: "zh" },
  { width: 1280, locale: "sw" },
];
const HEIGHT = { 320: 640, 360: 740, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1920: 1080 };

export function localOrigin(base) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base);
}

export function syntheticLineFeed({ opensAt, closesAt, openPrice, currentAt, currentPrice, decimals }) {
  const start = Date.parse(opensAt), end = Date.parse(closesAt), read = Date.parse(currentAt);
  if (![start, end, read, openPrice, currentPrice].every(Number.isFinite)
    || start % 60_000 !== 0 || end % 60_000 !== 0 || read % 60_000 !== 0
    || !(openPrice > 0 && currentPrice > 0 && end > start && read > start + 60_000 && read < end)
    || !Number.isInteger(decimals) || decimals < 0 || decimals > 8) {
    throw new Error("premise absent: need whole-minute local boundaries and confirmed read after an interior minute");
  }
  const synthetic = [];
  for (let t = start + 60_000; t < read; t += 60_000) {
    const fraction = (t - start) / (read - start);
    synthetic.push({ t, price: Number((openPrice + (currentPrice - openPrice) * fraction).toFixed(decimals)) });
  }
  if (synthetic.length === 0) throw new Error("premise absent: no interior minute label");
  const points = [{ t: start, price: openPrice }, ...synthetic, { t: read, price: currentPrice }];
  return {
    // The component accepts vendor-shaped minute history. This claim exists in
    // this one intercepted browser response, under the conspicuous QA banner.
    feed: { sourceTier: "vendor", series: { mode: "line", points } },
    syntheticTimes: synthetic.map((point) => new Date(point.t).toISOString()),
    endpointTimes: [opensAt, currentAt],
  };
}

export function parseDisplayedUsd(value) {
  const amount = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("current card price is absent");
  return amount;
}

export function selectedCells(raw) {
  if (!raw) return DEFAULT_CELLS;
  const cells = raw.split(",").map((token) => {
    const match = /^(320|360|390|768|1024|1280|1920)-(sw|en|zh)$/.exec(token.trim());
    if (!match) throw new Error(`unsupported CELL ${token}`);
    return { width: Number(match[1]), locale: match[2] };
  });
  if (cells.length === 0) throw new Error("no cells selected");
  return cells;
}

export function assertMobileActionClearance(geometry) {
  if (geometry?.railPosition !== "fixed" || geometry.buttons !== 2
    || !Number.isFinite(geometry.minButtonHeight) || geometry.minButtonHeight < 40
    || !Number.isFinite(geometry.clearance) || geometry.clearance < 24) {
    throw new Error(`320 Swahili line arrival leaves choices too close to the fixed rail: ${JSON.stringify(geometry)}`);
  }
  return geometry.clearance;
}

async function run() {
  const base = (process.env.BASE || "http://localhost:3417").replace(/\/$/, "");
  if (!localOrigin(base)) throw new Error(`REFUSING non-local BASE ${base}`);
  const wantedRoundId = process.env.ROUND_ID;
  if (!/^udr_[a-z0-9]+$/.test(wantedRoundId || "")) throw new Error("ROUND_ID must name the local aligned round");
  const duration = Number(process.env.DURATION);
  if (![3, 5, 10, 15, 30, 60].includes(duration)) throw new Error("DURATION must name that round's supported minute length");
  const repo = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const pwRoot = process.env.PW_ROOT || repo;
  const { chromium } = await import(pathToFileURL(join(pwRoot, "node_modules/playwright/index.mjs")).href);
  const out = process.env.OUT || join(repo, ".qa-shots", "u43", "synthetic-line-layout");
  const cells = selectedCells(process.env.CELLS);
  if (!cells.some(({ width, locale }) => width === 320 && locale === "sw")) {
    throw new Error("320-sw is required to prove the post-line button gap above the fixed navigation");
  }
  const browser = await chromium.launch({ headless: true });
  const evidence = { kind: "synthetic-layout-only", banner: QA_BANNER, base, createdAt: new Date().toISOString(), cells: [] };
  try {
    for (const { width, locale } of cells) {
      const context = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 2 });
      try {
        await context.addCookies([{ name: "kp-locale", value: locale, url: base }]);
        const page = await context.newPage();
        await page.goto(`${base}/updown?asset=BTC&d=${duration}`, { waitUntil: "domcontentloaded" });
        if (await page.locator("html").getAttribute("lang") !== locale) throw new Error("locale cookie did not select the requested language");
        const card = page.locator(`article.mcardp:is([data-phase="open"],[data-phase="locked"]):has(a[href="/updown/${wantedRoundId}"])`).first();
        await card.waitFor({ state: "visible", timeout: 20_000 });
        const href = await card.locator("a.mcardp-open").getAttribute("href");
        const roundId = /^\/updown\/(udr_[a-z0-9]+)$/.exec(href || "")?.[1];
        if (roundId !== wantedRoundId) throw new Error("premise absent: chosen local round is not active on the board");
        const roundResponse = await fetch(`${base}/api/dev-test/updown-observe`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ asset: "BTC", roundId, dryRun: true }),
        });
        if (!roundResponse.ok) throw new Error(`read-only local round lookup HTTP ${roundResponse.status}`);
        const round = (await roundResponse.json()).round;
        if (round?.roundId !== roundId || round.openPrice == null) throw new Error("open round lacks a confirmed open");
        if (Date.parse(round.opensAt) % 60_000 !== 0 || Date.parse(round.closesAt) % 60_000 !== 0) {
          throw new Error("local round has off-minute boundaries; use a production-like aligned seed");
        }
        const historyUrl = `${base}/api/updown/history?asset=BTC&range=1H&style=line&scope=round`;
        const historyResponse = await fetch(historyUrl);
        if (!historyResponse.ok) throw new Error(`local confirmed history HTTP ${historyResponse.status}`);
        const history = await historyResponse.json();
        if (history.sourceTier !== "confirmed" || history.series?.mode !== "line") {
          throw new Error("premise absent: the local state must use its confirmed-read fallback");
        }
        const currentAt = history.sourceQuotedAt;
        const currentPrice = history.livePrice;
        const latestRead = history.series.points?.find((point) => point.t === Date.parse(currentAt));
        if (latestRead?.price !== currentPrice) throw new Error("current endpoint is not a confirmed local history row");
        const currentCardPrice = parseDisplayedUsd(await card.locator(".ud-now .ud-figure").first().textContent());
        if (Number(currentCardPrice.toFixed(history.decimals)) !== Number(currentPrice.toFixed(history.decimals))) {
          throw new Error("the card and confirmed history disagree before the fixture; refusing to mask it");
        }
        const built = syntheticLineFeed({ ...round, currentAt, currentPrice, decimals: history.decimals });
        const beforeAction = await card.locator(".ud-act").evaluate((el) => el.getBoundingClientRect().bottom);
        await page.route("**/api/updown/history?*", async (route) => {
          const url = new URL(route.request().url());
          if (url.origin === base && url.searchParams.get("scope") === "round"
            && url.searchParams.get("asset") === "BTC") {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(built.feed) });
          } else await route.continue();
        });
        await page.reload({ waitUntil: "domcontentloaded" });
        const sameCard = page.locator(`article.mcardp:has(a[href="/updown/${roundId}"])`).first();
        await sameCard.waitFor({ state: "visible", timeout: 20_000 });
        if (!["open", "locked"].includes(await sameCard.getAttribute("data-phase"))) throw new Error("round ended during fixture");
        const line = sameCard.locator('[data-testid="round-live-line"]');
        await line.waitFor({ state: "visible", timeout: 20_000 });
        const shape = await line.evaluate((el) => ({ pathCount: el.querySelectorAll("svg path").length,
          pointCount: el.querySelectorAll("svg circle").length, label: el.querySelector("svg")?.getAttribute("aria-label") }));
        const spelledOpen = `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: history.decimals,
          maximumFractionDigits: history.decimals }).format(round.openPrice)}`;
        if (shape.pathCount < 1 || shape.pointCount !== 1 || !shape.label?.includes(spelledOpen)) {
          throw new Error("the real mini-line did not render the open, path and end dot");
        }
        const afterAction = await sameCard.locator(".ud-act").evaluate((el) => el.getBoundingClientRect().bottom);
        if (Math.abs(afterAction - beforeAction) > 2) throw new Error("line arrival moved the choice area");
        const railGeometry = width === 320 && locale === "sw" ? await sameCard.evaluate((el) => {
          const rail = document.querySelector(".kp-rail");
          const buttons = [...el.querySelectorAll(".ud-act button.btn-yes, .ud-act button.btn-no")]
            .filter((button) => button.getClientRects().length > 0);
          const buttonRects = buttons.map((button) => button.getBoundingClientRect());
          return { railPosition: rail ? getComputedStyle(rail).position : "missing", buttons: buttons.length,
            minButtonHeight: buttonRects.length ? Math.min(...buttonRects.map((rect) => rect.height)) : null,
            clearance: rail && buttonRects.length
              ? rail.getBoundingClientRect().top - Math.max(...buttonRects.map((rect) => rect.bottom)) : null };
        }) : null;
        if (width === 320 && locale === "sw") assertMobileActionClearance(railGeometry);
        await page.evaluate(({ banner, roundId }) => {
          const label = document.createElement("div");
          label.textContent = banner;
          label.setAttribute("data-testid", "u43-synthetic-fixture-banner");
          Object.assign(label.style, { position: "fixed", top: "4px", right: "4px", zIndex: "2147483647",
            background: "#fff", color: "#000", padding: "3px 6px", font: "bold 10px system-ui", maxWidth: "280px" });
          document.body.append(label);
          const card = [...document.querySelectorAll("article.mcardp")]
            .find((node) => node.querySelector(`a[href="/updown/${roundId}"]`));
          if (!card) throw new Error("selected card missing before synthetic watermark");
          const cardLabel = document.createElement("div");
          cardLabel.textContent = banner;
          cardLabel.setAttribute("data-testid", "u43-synthetic-fixture-card-banner");
          Object.assign(cardLabel.style, { position: "absolute", top: "3px", left: "3px", zIndex: "2147483647",
            background: "#fff", color: "#000", padding: "2px 4px", font: "bold 8px system-ui", maxWidth: "95%",
            pointerEvents: "none" });
          if (getComputedStyle(card).position === "static") card.style.position = "relative";
          card.append(cardLabel);
        }, { banner: QA_BANNER, roundId });
        if (!(await page.locator('[data-testid="u43-synthetic-fixture-banner"]').isVisible())) {
          throw new Error("visible synthetic-data warning missing");
        }
        if (!(await sameCard.locator('[data-testid="u43-synthetic-fixture-card-banner"]').isVisible())) {
          throw new Error("card crop synthetic-data warning missing");
        }
        mkdirSync(out, { recursive: true });
        const stem = `line-${width}-${locale}`;
        await page.screenshot({ path: join(out, `${stem}.png`), fullPage: true });
        await sameCard.screenshot({ path: join(out, `${stem}__card.png`) });
        evidence.cells.push({ width, locale, roundId, actualEndpoints: { open: round.openPrice, current: currentPrice,
          at: built.endpointTimes }, syntheticInteriorTimes: built.syntheticTimes, shape,
          actionBottomShiftPx: Number((afterAction - beforeAction).toFixed(2)),
          postLineButtonNavClearancePx: railGeometry ? Number(railGeometry.clearance.toFixed(2)) : null,
          files: [`${stem}.png`, `${stem}__card.png`] });
        console.log(`PASS ${width}-${locale}: visible line, ${built.syntheticTimes.length} labelled synthetic interior point(s), stable actions`);
      } finally { await context.close(); }
    }
    writeFileSync(join(out, "index.json"), JSON.stringify(evidence, null, 2));
    console.log(`QA-only synthetic layout frames: ${out}`);
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => { console.error(`U43 synthetic line fixture refused: ${error.message}`); process.exitCode = 1; });
}
