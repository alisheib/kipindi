/** The U43 Gold weekend screenshot uses a labelled QA clock, never a live-time claim. */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.DATABASE_URL = "";
process.env.USE_PRISMA_DAL = "false";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { getBoard, u43BoardCalendarNow, U43_DEV_CALENDAR_AT } = await import("../src/lib/server/updown-board.ts");
const { marketSessionAt, nextOpenAfter } = await import("../src/lib/server/market-calendar.ts");
const { createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig } = await import("../src/lib/server/updown-config.ts");
const { __resetUpDownMemoryStores } = await import("../src/lib/server/updown-dal.ts");
const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");
await import("./lib/verified-fixtures.mts");

let passed = 0;
function check(name: string, condition: boolean) { assert.ok(condition, name); passed++; }
const actual = new Date("2026-10-20T13:00:00Z");
const expectedOpen = "2026-10-25T22:00:00.000Z";
const oldNodeEnv = process.env.NODE_ENV;
const oldSwitch = process.env.U43_DEV_CALENDAR_CLOCK;
try {
  process.env.NODE_ENV = "development";
  process.env.U43_DEV_CALENDAR_CLOCK = "1";
  check("the exact QA instant is a weekend closure in the real metals calendar",
    U43_DEV_CALENDAR_AT === "2026-10-24T12:00:00Z"
    && marketSessionAt("macro", U43_DEV_CALENDAR_AT, []).reason === "weekend"
    && nextOpenAfter("macro", U43_DEV_CALENDAR_AT, []) === expectedOpen);
  check("the exact in-memory development Gold request receives the simulated calendar input",
    u43BoardCalendarNow(U43_DEV_CALENDAR_AT, "XAU", actual).toISOString() === "2026-10-24T12:00:00.000Z");
  check("an arbitrary query instant cannot move the board clock",
    u43BoardCalendarNow("2026-10-24T12:00:01Z", "XAU", actual) === actual);
  check("another asset cannot receive Gold's simulated clock",
    u43BoardCalendarNow(U43_DEV_CALENDAR_AT, "BTC", actual) === actual);
  process.env.U43_DEV_CALENDAR_CLOCK = "";
  check("the server switch is required", u43BoardCalendarNow(U43_DEV_CALENDAR_AT, "XAU", actual) === actual);
  process.env.U43_DEV_CALENDAR_CLOCK = "1";
  process.env.DATABASE_URL = "postgresql://qa-invalid.example/db";
  check("a server with a database cannot simulate calendar time", u43BoardCalendarNow(U43_DEV_CALENDAR_AT, "XAU", actual) === actual);
  process.env.DATABASE_URL = "";
  process.env.NODE_ENV = "production";
  check("production cannot simulate calendar time", u43BoardCalendarNow(U43_DEV_CALENDAR_AT, "XAU", actual) === actual);
  process.env.NODE_ENV = "development";

  __resetUpDownMemoryStores();
  __resetUpDownConfig();
  await seedDefaultSources();
  await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "calendar QA fixture", addedBy: "system" });
  const asset = await createAsset({
    key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", nameZh: "黄金", iconKey: "gold",
    priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro", decimals: 2, minMoveTicks: 2,
  }, "off");
  check("a genuine local Gold asset is created through the service", asset.ok);
  if (!asset.ok) throw new Error(asset.error);
  check("Gold can be enabled", (await setAssetEnabled(asset.data.id, true, "off")).ok);
  const chain = await createChain({ assetId: asset.data.id, durationMinutes: 15 }, "off");
  check("a genuine local Gold 15-minute chain is created", chain.ok);
  if (!chain.ok) throw new Error(chain.error);
  check("the Gold chain is running rather than merely stopped", (await setChainState(chain.data.id, "RUNNING", "off")).ok);
  const boardSource = readFileSync(new URL("../src/lib/server/updown-board.ts", import.meta.url), "utf8");
  check("board passes only its QA clock into both real calendar decisions",
    boardSource.includes("const calendarNow = u43BoardCalendarNow(opts?.qaCalendarAt, activeAsset.key)")
    && boardSource.includes("isMarketOpenAt(activeAssetRow.category, calendarNow, deadHours)")
    && boardSource.includes("nextOpenAfter(activeAssetRow.category, calendarNow, deadHours)"));
  const board = await getBoard({ assetKey: "XAU", durationMinutes: 15, qaCalendarAt: U43_DEV_CALENDAR_AT });
  check("the actual board resolves the Gold chain and has no invented rounds",
    board.activeAsset?.key === "XAU" && board.activeDuration === 15 && !board.chainPaused && board.rounds.length === 0);
  check("the actual board returns the weekend reopening calculated by the calendar",
    board.nextMarketOpenAtMs === Date.parse(expectedOpen));

  const page = readFileSync(new URL("../src/app/updown/page.tsx", import.meta.url), "utf8");
  check("page accepts only a development, switched, no-database, Gold, exact-query request",
    page.includes('process.env.NODE_ENV === "development"')
    && page.includes('process.env.U43_DEV_CALENDAR_CLOCK === "1"')
    && page.includes('!process.env.DATABASE_URL')
    && page.includes('sp.asset === "XAU"')
    && page.includes('sp.__u43CalendarAt === U43_DEV_CALENDAR_AT')
    && page.includes('qaCalendarAt,')
    && page.includes('data-u43-qa-calendar-next-open={qaCalendarAt && nextMarketOpenAtMs != null'));
  const aux = readFileSync(new URL("./live/updown-visual-aux.mjs", import.meta.url), "utf8");
  check("tracked capture labels the state as a QA clock simulation and verifies the actual reopen",
    aux.includes('label: "QA calendar-clock simulation — not a current wall-clock or production closure"')
    && aux.includes('const expectedCalendarReopen = "2026-10-25T22:00:00.000Z"')
    && aux.includes('observed.qaCalendarNextOpen !== expectedCalendarReopen')
    && aux.includes('observed.qaCalendarAt !== calendarAt')
    && aux.includes('mode === "calendar-closed" && responseStatus !== 200')
    && aux.includes('mode === "calendar-closed" && (!observed.goldSelected')
    && aux.includes('mode === "calendar-closed" ? "320,360,390,768,1024,1280,1920"')
    && aux.includes('"calendar-closed-qa-sim" : mode')
    && aux.includes('evidenceLabel: mode === "calendar-closed" ? "QA calendar-clock simulation')
    && aux.includes('if (cards !== 0) throw new Error'));
} finally {
  if (oldNodeEnv == null) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
  if (oldSwitch == null) delete process.env.U43_DEV_CALENDAR_CLOCK; else process.env.U43_DEV_CALENDAR_CLOCK = oldSwitch;
  process.env.DATABASE_URL = "";
}

console.log(`U43 QA calendar clock: ${passed} passed, 0 failed`);
