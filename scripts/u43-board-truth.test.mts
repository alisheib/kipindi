/** U43 B3: the player board's market-hours truth and its dev-only error read. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nextOpenAfter } from "../src/lib/server/market-calendar.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const calendar = read("src/lib/server/market-calendar.ts");
const board = read("src/lib/server/updown-board.ts");
const page = read("src/app/updown/page.tsx");
let passed = 0;
function check(name: string, condition: boolean) { assert.ok(condition, name); passed++; }

check("a measured weekday break reopens at the next actual hour",
  nextOpenAfter("macro", "2026-10-20T21:15:00Z", [21]) === "2026-10-20T22:00:00.000Z");
check("a measured break cannot erase the longer weekend closure",
  nextOpenAfter("macro", "2026-10-23T21:15:00Z", [21]) === "2026-10-25T22:00:00.000Z");
check("a normal metal hour stays open, and crypto ignores metal dead hours",
  nextOpenAfter("macro", "2026-10-20T20:15:00Z", [21]) === "2026-10-20T20:15:00.000Z"
  && nextOpenAfter("crypto", "2026-10-20T21:15:00Z", [21]) === "2026-10-20T21:15:00.000Z");
check("next-opening scan consults the same optional measured hours as its caller",
  calendar.includes("nextOpenAfter(category: string, at: string | Date, deadHoursUtc?: readonly number[])")
  && calendar.includes("isMarketOpenAt(category, probe, deadHoursUtc)"));
check("board reads this asset's measured dead hours once and uses them in both calendar decisions",
  board.includes('import { deadHoursFor } from "./updown-playbook-store"')
  && board.includes("const deadHours = await deadHoursFor(activeAssetRow.symbol)")
  && board.includes("isMarketOpenAt(activeAssetRow.category, calendarNow, deadHours)")
  && board.includes("nextOpenAfter(activeAssetRow.category, calendarNow, deadHours)"));
check("injected failed asset catalogue read propagates through the real board await only in development",
  board.includes('opts?.qaReadAssetFault && process.env.NODE_ENV === "development"')
  && board.includes('Promise.reject(new Error("U43 QA-INJECTED asset catalogue read failure"))')
  && board.includes('assetStore.list({ enabledOnly: true })')
  && board.includes('const [enabled, allChains, walletBalance] = await Promise.all(['));
check("page fault probe requires development, an explicit server switch and the exact query",
  page.includes('qaReadAssetFault: process.env.NODE_ENV === "development"')
  && page.includes('process.env.U43_DEV_BOARD_READ_FAULT === "1"')
  && page.includes('sp.__u43ReadFault === "asset-list"')
  && page.includes('const board = await getBoard({'));
const call = page.slice(page.indexOf("const board = await getBoard({"), page.indexOf("if (board.assets.length === 0)"));
check("board fault is not swallowed into a false empty state", !call.includes(".catch(") && !call.includes("try {") && !call.includes("catch ("));

console.log(`U43 board truth: ${passed} passed, 0 failed`);
