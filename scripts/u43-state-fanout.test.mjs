/** R8/R9: bounded capture, cold-context warm-up and only truthful state frames. */
import { readFileSync } from "node:fs";
import { PHOTOGRAPH_CONCURRENCY, mapLimited, frameReady, verifiedScreenshot, receiptParticipants, receiptReady, RECEIPT_EYEBROWS } from "./lib/u43-state-fanout.mjs";

let failed = 0;
const ok = (name, condition) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  if (!condition) failed++;
};

const driver = readFileSync("scripts/live/updown-visual-states.mjs", "utf8");
ok("driver uses bounded fanout for every selected state cell",
  driver.includes('import { mapLimited, PHOTOGRAPH_CONCURRENCY, verifiedScreenshot, frameReady, receiptParticipants, receiptReady, RECEIPT_EYEBROWS } from "../lib/u43-state-fanout.mjs";')
  && driver.includes("const shots = await mapLimited(pages.filter(filter), PHOTOGRAPH_CONCURRENCY, async (p) => {")
  && !driver.includes("await Promise.all(pages.filter(filter)")
  && driver.includes("index.phases.push({ phase, path, at: new Date().toISOString(), shots });"));
const warmAt = driver.indexOf("const warmed = await mapLimited(pages, PHOTOGRAPH_CONCURRENCY");
const armAt = driver.indexOf('const armed = await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: 5 });');
const settleAt = driver.indexOf('const lastSettle = await post("/api/dev-test/updown-handover", { phase: "settle" });');
const openAt = driver.indexOf('await photograph("p1-open");');
ok("every browser context warms before the real timed successor exists",
  warmAt >= 0 && warmAt < armAt && armAt < settleAt && settleAt < openAt
  && driver.includes("if (warmed.some((row) => !row.ok)) die(")
  && driver.includes('await p.page.goto(`${BASE}${BOARD}`, { waitUntil: "load", timeout: 90000 });'));
ok("shot bytes are saved only after the page and every card crop pass post-shot checks",
  driver.includes("const accepted = await verifiedScreenshot({")
  && driver.includes("const cropped = await verifiedScreenshot({")
  && driver.indexOf("for (const card of cardImages) writeFileSync") > driver.indexOf("const cropped = await verifiedScreenshot({")
  && (driver.match(/valid: \(sample\) => frameReady\(sample, requirement\)/g) ?? []).length === 2);
ok("last-30 capture starts with the full window and names the tested round",
  driver.includes('await waitUntil(lockMs - 30_000, "betting\'s last 30 seconds");')
  && driver.includes('last30LockMs: phase === "p6-last30" ? lockMs : null')
  && driver.includes("roundId: path === BOARD && roundPhase ? round.id : null"));
ok("resolved Gold board is valid without a running clock",
  driver.includes('"p7-locked", "p10-handover"].includes(phase)')
  && !driver.includes('"p10-handover", "p13-gold-board"].includes(phase)'));

let active = 0, peak = 0;
const visited = [];
const input = Array.from({ length: 13 }, (_, index) => index);
const output = await mapLimited(input, PHOTOGRAPH_CONCURRENCY, async (item) => {
  active++;
  peak = Math.max(peak, active);
  visited.push(item);
  await new Promise((resolve) => setTimeout(resolve, 8));
  active--;
  return item * 2;
});
ok("three workers cap simultaneous page loads", PHOTOGRAPH_CONCURRENCY === 3 && peak === 3 && active === 0);
ok("every selected cell is captured once", visited.length === input.length && new Set(visited).size === input.length);
ok("shot index keeps matrix order despite parallel completion", output.length === input.length && output.every((value, index) => value === index * 2));
ok("an empty phase has no workers or invented frames", (await mapLimited([], 3, async () => { throw new Error("empty phase visited"); })).length === 0);
let refused = false;
try { await mapLimited([1], 0, async () => 1); } catch { refused = true; }
ok("a zero-worker phase is refused", refused);

const requirement = { locale: "sw", signedIn: true, detailPage: false, marketPage: false,
  needsLive: true, roundPhase: "open", last30LockMs: 100_000 };
const snapshot = (now = 80_000, tick = "00:20", phase = "open") => ({
  now, cards: 2, runningTicks: [tick], roundPhase: phase, marksReady: true, chartReady: true,
  lang: "sw", signedIn: true,
});
ok("a live state refuses an absent running card and a placeholder clock",
  frameReady(snapshot(), requirement)
  && !frameReady({ ...snapshot(), runningTicks: [] }, requirement)
  && !frameReady(snapshot(80_000, "--:--"), requirement)
  && !frameReady(snapshot(80_000, "—:—"), requirement));
ok("the last-30 frame must remain open throughout the exact time window",
  frameReady(snapshot(70_000), requirement)
  && frameReady(snapshot(99_999), requirement)
  && !frameReady(snapshot(69_999), requirement)
  && !frameReady(snapshot(100_000), requirement)
  && !frameReady(snapshot(80_000, "00:20", "locked"), requirement));
ok("the frame refuses a missing chart, wrong language or wrong player",
  !frameReady({ ...snapshot(), chartReady: false }, requirement)
  && !frameReady({ ...snapshot(), lang: "en" }, requirement)
  && !frameReady({ ...snapshot(), signedIn: false }, requirement));
ok("a resolved Gold card still requires a real card and painted assets",
  frameReady({ ...snapshot(), runningTicks: [], roundPhase: "resolved" },
    { ...requirement, needsLive: false, roundPhase: null, last30LockMs: null })
  && !frameReady({ ...snapshot(), cards: 0, runningTicks: [] },
    { ...requirement, needsLive: false, roundPhase: null, last30LockMs: null }));

const heldRequirement = { ...requirement, last30LockMs: null, heldActionClearance: true };
const heldAction = { layout: "held", railPosition: "fixed", buttons: 2, minButtonHeight: 40, clearance: 24 };
ok("held phone actions have two full-height buttons at least 24px above the fixed rail",
  frameReady({ ...snapshot(), heldAction }, heldRequirement)
  && !frameReady({ ...snapshot(), heldAction: { ...heldAction, clearance: 23.9 } }, heldRequirement)
  && !frameReady({ ...snapshot(), heldAction: { ...heldAction, minButtonHeight: 39.9 } }, heldRequirement)
  && !frameReady({ ...snapshot(), heldAction: { ...heldAction, buttons: 1 } }, heldRequirement)
  && !frameReady({ ...snapshot(), heldAction: { ...heldAction, layout: "player" } }, heldRequirement)
  && !frameReady({ ...snapshot(), heldAction: { ...heldAction, railPosition: "static" } }, heldRequirement));
const hiddenCaptionRequirement = { ...heldRequirement, heldCaptionHidden: true };
ok("the held 320px one-side caption stays hidden through the screenshot",
  frameReady({ ...snapshot(), heldAction, oneSideCaption: { present: true, visible: false } }, hiddenCaptionRequirement)
  && !frameReady({ ...snapshot(), heldAction, oneSideCaption: { present: true, visible: true } }, hiddenCaptionRequirement)
  && !frameReady({ ...snapshot(), heldAction, oneSideCaption: { present: false, visible: false } }, hiddenCaptionRequirement)
  && driver.includes('heldCaptionHidden: phase === "p3-youre-in" && p.who === "player" && p.width === 320')
  && driver.includes('oneSideCaption: final.oneSideCaption')
  && driver.includes('held 320px one-side caption is absent or visible instead of hidden')
  && readFileSync("scripts/u43-held-clearance-red.mjs", "utf8").includes('red320.output.includes("held 320px one-side caption is absent or visible instead of hidden")'));
ok("the held clearance reads real button and rail rectangles in the scored phone frame",
  driver.includes('heldActionClearance: phase === "p3-youre-in" && p.who === "player" && p.width <= 390')
  && driver.includes('selected?.querySelectorAll(".ud-act button.btn-yes, .ud-act button.btn-no")')
  && driver.includes('const railTop = rail.getBoundingClientRect().top')
  && driver.includes('clearance: railTop - Math.max(...bounds.map((rect) => rect.bottom))')
  && driver.includes('if (heldClearanceOnly) await finishCapture()')
  && driver.includes('heldAction: final.heldAction'));
ok("the local held browser probe can target 320, 360 and 390 separately",
  driver.includes('const heldClearanceWidth = Number(process.env.HELD_CLEARANCE_WIDTH || 320)')
  && driver.includes('if (heldClearanceOnly && ![320, 360, 390].includes(heldClearanceWidth))')
  && driver.includes('width: heldClearanceWidth')
  && readFileSync("scripts/u43-held-clearance-probe.mjs", "utf8").includes('const cell = `player-${width}-sw`'));
ok("the 360 browser gate delays real history, simulates price-free layout, and checks both action rectangles",
  driver.includes('url.pathname === "/api/updown/history" && url.searchParams.get("scope") === "round"')
  && driver.includes('if (new URL(route.request().url()).searchParams.get("scope") === "round") await lineGate')
  && driver.includes('if (before.roundLinePresent || !before.heldAction || before.heldAction.clearance < 24)')
  && driver.includes('const response = await roundLineResponse')
  && driver.includes('block.setAttribute("aria-hidden", "true")')
  && driver.includes('block.style.height = "72px"')
  && driver.includes('if (!after.delayedLayoutBlockPresent || !after.heldAction)')
  && driver.includes('lineShift = { before: before.heldAction.clearance, after: after.heldAction.clearance,')
  && driver.includes('if (after.heldAction.clearance < 24)')
  && readFileSync("scripts/u43-held-clearance-probe.mjs", "utf8").includes('if (shot.lineShift) console.log(`PASS delayed layout 360px:'));
ok("the delayed-line browser red restores the old pre-action layout block",
  driver.includes('if (process.env.HELD_LINE_RED === "1")')
  && driver.includes('action.before(block)')
  && readFileSync("scripts/u43-held-clearance-red.mjs", "utf8").includes('const red360 = run({ width: 360, lineRed: true })'));

const receiptCells = [320, 360, 390, 768, 1024, 1280, 1920].flatMap((width) => [
  { who: "guest", width, locale: "sw" }, { who: "player", width, locale: "sw" },
]);
ok("full receipt matrix places one distinct real bet at each signed-in width",
  receiptParticipants(receiptCells, true).length === 7
  && receiptParticipants(receiptCells, true).every((cell) => cell.who === "player")
  && new Set(receiptParticipants(receiptCells, true).map((cell) => cell.width)).size === 7
  && receiptParticipants(receiptCells, false).length === 1
  && receiptParticipants(receiptCells, false)[0].width === 360);
ok("the driver clicks a real local stake for every selected receipt cell",
  driver.includes("const receiptPlayers = receiptParticipants(pages, fullMatrix);")
  && driver.includes("for (const p of receiptPlayers) {")
  && driver.includes('await card.locator(\'[role="radiogroup"] button\').first().click();')
  && driver.includes('await card.locator("button.btn-yes").first().click();')
  && driver.includes('receiptShots.push({ cell: p.id, receiptOk: false, error:')
  && driver.includes('s.error || s.receiptOk === false'));
ok("the receipt is photographed only after its exact translated success appears",
  driver.includes("RECEIPT_EYEBROWS[p.locale], { timeout: 8000 }")
  && driver.includes("some((node) => node.textContent?.trim() === expected)")
  && driver.includes("const accepted = await verifiedScreenshot({")
  && driver.includes("valid: (sample) => receiptReady(sample, { locale: p.locale }),")
  && driver.includes("attempts: 1, // A failed frame never repeats a money action.")
  && driver.indexOf("writeFileSync(join(OUT, file), accepted.image);") > driver.indexOf("const accepted = await verifiedScreenshot({"));
ok("a fading receipt ghost is not an open, active dialog",
  driver.includes('dialog?.getAttribute("aria-modal") === "true" && !dialog.hasAttribute("inert")'));

const receiptSample = { lang: "sw", signedIn: true, roundPhase: "open", dialogVisible: true,
  eyebrow: "Dau limewekwa", title: "Juu · Bitcoin", text: "Dau lako TZS 1,000" };
const dictionaryReceiptWords = [...readFileSync("src/lib/i18n-dict.ts", "utf8")
  .matchAll(/\budBetPlaced: "([^"]+)"/g)].map((match) => match[1]);
ok("receipt success words stay aligned with the three player dictionaries",
  dictionaryReceiptWords.length === 3
  && dictionaryReceiptWords[0] === RECEIPT_EYEBROWS.en
  && dictionaryReceiptWords[1] === RECEIPT_EYEBROWS.sw
  && dictionaryReceiptWords[2] === RECEIPT_EYEBROWS.zh);
ok("receipt proof uses the exact success phrase in each player language",
  RECEIPT_EYEBROWS.en === "Bet placed" && RECEIPT_EYEBROWS.sw === "Dau limewekwa"
  && RECEIPT_EYEBROWS.zh === "已下注"
  && receiptReady(receiptSample, { locale: "sw" })
  && receiptReady({ ...receiptSample, lang: "en", eyebrow: "Bet placed" }, { locale: "en" })
  && receiptReady({ ...receiptSample, lang: "zh", eyebrow: "已下注" }, { locale: "zh" })
  && !receiptReady(receiptSample, { locale: "en" })
  && !receiptReady({ ...receiptSample, eyebrow: "Dau halikuwekwa" }, { locale: "sw" }));
ok("a hidden, empty, signed-out, locked or moneyless modal cannot certify a receipt",
  !receiptReady({ ...receiptSample, dialogVisible: false }, { locale: "sw" })
  && !receiptReady({ ...receiptSample, title: "" }, { locale: "sw" })
  && !receiptReady({ ...receiptSample, signedIn: false }, { locale: "sw" })
  && !receiptReady({ ...receiptSample, roundPhase: "locked" }, { locale: "sw" })
  && !receiptReady({ ...receiptSample, text: "Dau lako" }, { locale: "sw" }));
let receiptFrameRejected = false;
try {
  let n = 0;
  await verifiedScreenshot({ sample: async () => ++n === 1 ? receiptSample : { ...receiptSample, dialogVisible: false },
    capture: async () => Buffer.from("closed receipt"),
    valid: (value) => receiptReady(value, { locale: "sw" }), attempts: 1 });
} catch { receiptFrameRejected = true; }
ok("the five-second modal closing during a screenshot rejects that frame without repeating the bet", receiptFrameRejected);

let samples = [snapshot(), snapshot(80_500, "--:--"), snapshot(), snapshot()];
let captures = 0, retries = 0;
const accepted = await verifiedScreenshot({
  sample: async () => samples.shift(),
  capture: async () => { captures++; return Buffer.from(`frame-${captures}`); },
  valid: (value) => frameReady(value, requirement),
  retry: async () => { retries++; },
});
ok("a clock lost during screenshot discards that image and retries",
  captures === 2 && retries === 1 && accepted.image.toString() === "frame-2" && accepted.attempt === 2);
let badCaptures = 0;
let refusedBadFrame = false;
try {
  await verifiedScreenshot({ sample: async () => snapshot(80_000, "--:--"),
    capture: async () => { badCaptures++; return Buffer.from("bad"); },
    valid: (value) => frameReady(value, requirement), retry: async () => {} });
} catch { refusedBadFrame = true; }
ok("a persistent placeholder cannot yield screenshot bytes", refusedBadFrame && badCaptures === 0);

console.log(`U43 STATE FANOUT: ${failed} failed`);
process.exitCode = failed ? 1 : 0;
