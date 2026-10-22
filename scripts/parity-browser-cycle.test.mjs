import assert from "node:assert/strict";
import { recycleParityBrowser } from "./lib/parity-browser-cycle.mjs";

const events = [];
const old = { contexts: () => (events.push("contexts"), []), close: async () => { events.push("close-old"); } };
const fresh = { version: () => "147", close: async () => { events.push("close-fresh"); } };
const launch = async () => { events.push("launch"); return fresh; };
assert.equal(await recycleParityBrowser(old, launch, "147", "matrix/en"), fresh);
assert.deepEqual(events, ["contexts", "close-old", "launch"]);

events.length = 0;
const occupied = { contexts: () => [{}], close: async () => { events.push("close-occupied"); } };
await assert.rejects(recycleParityBrowser(occupied, launch, "147", "book/sw"), /1 browser context\(s\) still open/);
assert.deepEqual(events, [], "an occupied browser remains intact and no new browser launches");

events.length = 0;
const changed = { version: () => "148", close: async () => { events.push("close-changed"); } };
await assert.rejects(recycleParityBrowser(old, async () => { events.push("launch"); return changed; }, "147", "question/en"), /Chromium changed from 147 to 148/);
assert.deepEqual(events, ["contexts", "close-old", "launch", "close-changed"], "a mismatched browser is closed before the capture fails");

events.length = 0;
const refusing = { contexts: () => [], close: async () => { events.push("close-refused"); throw new Error("close failed"); } };
await assert.rejects(recycleParityBrowser(refusing, launch, "147", "sell/book"), /close failed/);
assert.deepEqual(events, ["close-refused"], "a failed close never launches another browser");

console.log("parity-browser-cycle: only empty-context boundaries recycle; version drift and close failure abort without continuing the capture");
