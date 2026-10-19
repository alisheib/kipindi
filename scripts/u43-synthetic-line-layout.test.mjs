/** U43 B2 · guard and in-memory red proof for the local synthetic layout probe. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { localOrigin, selectedCells, syntheticLineFeed } from "./live/u43-synthetic-line-layout.mjs";

const root = new URL("../", import.meta.url);
const fixture = readFileSync(fileURLToPath(new URL("scripts/live/u43-synthetic-line-layout.mjs", root)), "utf8");
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("package.json", root)), "utf8"));

function issues(source, scripts) {
  const misses = [];
  const must = (name, token) => {
    if (source.split(token).length !== 2) misses.push(name);
  };
  must("local origin refusal", "if (!localOrigin(base))");
  must("explicit local round identity", 'if (!/^udr_[a-z0-9]+$/.test(wantedRoundId || ""))');
  must("selected board duration", 'if (![3, 5, 10, 15, 30, 60].includes(duration))');
  must("locale readback", 'page.locator("html").getAttribute("lang") !== locale');
  must("active card selection", 'article.mcardp:is([data-phase="open"],[data-phase="locked"]):has(a[href="/updown/${wantedRoundId}"])');
  must("read-only round lookup", "roundId, dryRun: true");
  must("confirmed-read premise", 'history.sourceTier !== "confirmed"');
  must("actual current read row", "latestRead?.price !== currentPrice");
  must("card and history parity", "currentCardPrice.toFixed(history.decimals)");
  must("whole-minute endpoint labels", "start % 60_000 !== 0 || end % 60_000 !== 0 || read % 60_000 !== 0");
  must("browser-only vendor-shaped response", 'feed: { sourceTier: "vendor", series: { mode: "line", points } }');
  must("round-only interception", 'url.searchParams.get("scope") === "round"');
  must("BTC-only interception", 'url.searchParams.get("asset") === "BTC"');
  must("same local origin interception", "url.origin === base");
  must("visible synthetic warning", 'export const QA_BANNER = "QA SYNTHETIC LINE · LAYOUT ONLY · NOT VENDOR PRICE HISTORY";');
  must("full-frame watermark", 'data-testid", "u43-synthetic-fixture-banner');
  must("card-crop watermark", 'data-testid", "u43-synthetic-fixture-card-banner');
  must("page screenshot", "await page.screenshot({ path: join(out, `${stem}.png`), fullPage: true });");
  must("card screenshot", "await sameCard.screenshot({ path: join(out, `${stem}__card.png`) });");
  must("synthetic evidence classification", 'kind: "synthetic-layout-only"');
  must("real endpoint provenance in metadata", "actualEndpoints: { open: round.openPrice, current: currentPrice");
  must("synthetic interior times in metadata", "syntheticInteriorTimes: built.syntheticTimes");
  if (scripts["qa:u43-synthetic-line"] !== "node scripts/live/u43-synthetic-line-layout.mjs") misses.push("QA entry");
  if (scripts["test:u43-synthetic-line"] !== "node scripts/u43-synthetic-line-layout.test.mjs") misses.push("guard entry");
  if (scripts["red:u43-synthetic-line"] !== "node scripts/u43-synthetic-line-layout.test.mjs --prove-red") misses.push("red entry");
  return misses;
}

assert.deepEqual(issues(fixture, pkg.scripts), [], "the layout probe must stay local, read-only and visibly synthetic");
assert.equal(localOrigin("http://localhost:3417"), true);
assert.equal(localOrigin("http://127.0.0.1:3417"), true);
for (const base of ["https://www.50pick.tz", "https://localhost:3417", "http://example.com", "http://localhost.evil.test"]) {
  assert.equal(localOrigin(base), false, `${base} must be refused`);
}
assert.deepEqual(selectedCells("320-sw,360-en,1280-zh"), [
  { width: 320, locale: "sw" }, { width: 360, locale: "en" }, { width: 1280, locale: "zh" },
]);
assert.throws(() => selectedCells("375-sw"), /unsupported CELL/);

const open = "2026-10-19T00:00:00.000Z";
const current = "2026-10-19T00:03:00.000Z";
const feed = syntheticLineFeed({ opensAt: open, closesAt: "2026-10-19T00:05:00.000Z",
  openPrice: 100, currentAt: current, currentPrice: 106, decimals: 2 });
assert.equal(feed.feed.sourceTier, "vendor", "only the intercepted browser payload is vendor-shaped");
assert.deepEqual(feed.feed.series.points, [
  { t: Date.parse(open), price: 100 },
  { t: Date.parse("2026-10-19T00:01:00.000Z"), price: 102 },
  { t: Date.parse("2026-10-19T00:02:00.000Z"), price: 104 },
  { t: Date.parse(current), price: 106 },
]);
assert.deepEqual(feed.endpointTimes, [open, current]);
assert.deepEqual(feed.syntheticTimes, ["2026-10-19T00:01:00.000Z", "2026-10-19T00:02:00.000Z"]);
assert.throws(() => syntheticLineFeed({ opensAt: "2026-10-19T00:00:36.000Z",
  closesAt: "2026-10-19T00:05:36.000Z", openPrice: 100, currentAt: current,
  currentPrice: 106, decimals: 2 }), /whole-minute/);
assert.throws(() => syntheticLineFeed({ opensAt: open,
  closesAt: "2026-10-19T00:05:00.000Z", openPrice: 100,
  currentAt: "2026-10-19T00:03:03.000Z", currentPrice: 106, decimals: 2 }), /whole-minute/);
assert.throws(() => syntheticLineFeed({ opensAt: open, closesAt: "2026-10-19T00:05:00.000Z",
  openPrice: 100, currentAt: "2026-10-19T00:01:00.000Z", currentPrice: 106, decimals: 2 }), /confirmed read/);

if (process.argv.includes("--prove-red")) {
  const plants = [
    ["allows production", "if (!localOrigin(base))", "if (false)"],
    ["uses an unspecified round", 'if (!/^udr_[a-z0-9]+$/.test(wantedRoundId || ""))', "if (false)"],
    ["selects a wrong duration", 'if (![3, 5, 10, 15, 30, 60].includes(duration))', "if (false)"],
    ["ignores locale cookie readback", 'page.locator("html").getAttribute("lang") !== locale', "false"],
    ["cannot select locked active card", 'article.mcardp:is([data-phase="open"],[data-phase="locked"]):has(a[href="/updown/${wantedRoundId}"])', 'article.mcardp[data-phase="open"]:has(a[href="/updown/${wantedRoundId}"])'],
    ["writes a local observation", "roundId, dryRun: true", "roundId, dryRun: false"],
    ["accepts unconfirmed source", 'history.sourceTier !== "confirmed"', 'history.sourceTier !== "anything"'],
    ["forgets actual read row", "latestRead?.price !== currentPrice", "false"],
    ["masks card/feed mismatch", "currentCardPrice.toFixed(history.decimals)", "currentPrice.toFixed(history.decimals)"],
    ["accepts off-minute pseudo bars", "start % 60_000 !== 0 || end % 60_000 !== 0 || read % 60_000 !== 0", "false"],
    ["loses mini-line trigger", 'feed: { sourceTier: "vendor", series: { mode: "line", points } }', 'feed: { sourceTier: "confirmed", series: { mode: "line", points } }'],
    ["intercepts chart as well as round", 'url.searchParams.get("scope") === "round"', "true"],
    ["drops synthetic warning", 'export const QA_BANNER = "QA SYNTHETIC LINE · LAYOUT ONLY · NOT VENDOR PRICE HISTORY";', 'export const QA_BANNER = "Line";'],
    ["drops card watermark", 'data-testid", "u43-synthetic-fixture-card-banner', 'data-testid", "unlabelled-card'],
    ["mislabels evidence", 'kind: "synthetic-layout-only"', 'kind: "vendor-proof"'],
  ];
  for (const [name, before, after] of plants) {
    assert.equal(fixture.split(before).length, 2, `red anchor absent or ambiguous: ${name}`);
    assert.notDeepEqual(issues(fixture.replace(before, after), pkg.scripts), [], `red missed: ${name}`);
  }
  console.log(`U43 synthetic line layout red: ${plants.length}/${plants.length} in-memory reversions caught`);
} else console.log("U43 synthetic line layout guard: local-only, actual endpoints, labelled synthetic interior, visible screenshots");
