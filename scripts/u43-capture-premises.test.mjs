/** Source guard for U43 browser evidence: a zero-error index must mean its
 * market state, Gold chain and filter sheet premises were actually observed.
 * The browser drives the values; this guard pins the driver's refusal paths. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(join(root, relative), "utf8");
const capture = read("scripts/live/updown-visual-capture.mjs");
const states = read("scripts/live/updown-visual-states.mjs");
let passed = 0;
function check(name, condition) { assert.ok(condition, name); passed++; }

check("local capture records checkout SHA and refuses dirty exact-source claims",
  capture.includes('sourceHead: localBase ? checkoutHead : null')
  && capture.includes('process.env.REQUIRE_CLEAN === "1" && (trackedDirty || untrackedRunnable)')
  && capture.includes('"--untracked-files=all", "--", "src", "scripts"')
  && capture.includes('sourceClaim: localBase ? "local checkout; require clean tree and a fresh server for exact-source evidence"'));
check("remote capture makes no unchecked deployment SHA claim",
  capture.includes('"remote deployment SHA unverified by this capture"'));
check("phone filter sheet is required exactly when both measured chip rails do not fit",
  capture.includes("if (rails.length !== 2 || rails.some((rail) => !rail.visible || rail.clientWidth === 0))")
  && capture.includes("const sheetOverflow = rails.some((rail) => rail.scrollWidth > rail.clientWidth + 1)")
  && capture.includes("if (sheetPresent !== sheetOverflow)")
  && capture.includes('throw new Error(`phone filter sheet/rail-overflow mismatch at ${cell}')
  && capture.includes('files: [], lang: await p3.evaluate(() => document.documentElement.lang)'));
check("home and live are selectable surfaces for the full read",
  capture.includes('[["home", "/"], ["live", "/live"]]')
  && capture.includes('SURFACES.includes(surface)'));
check("home and live record actual Journey card identities, choices and crops when the preview is visible",
  capture.includes('document.querySelectorAll(\'[data-testid="journey-card"]\')')
  && capture.includes('id: card.getAttribute("data-row-id")')
  && capture.includes('card.querySelectorAll(".kp-jcard__pick")')
  && capture.includes('const crop = `${surface}__${cell}__journey-card${i}.png`')
  && capture.includes('choices, journeyReadback,'));

check("state index pins local SHA and refuses dirty exact-source claims",
  states.includes('const index = { base: BASE, tag: TAG, dur: DUR, sourceHead, trackedDirty,')
  && states.includes('process.env.REQUIRE_CLEAN === "1" && (trackedDirty || untrackedRunnable)')
  && states.includes('"--untracked-files=all", "--", "src", "scripts"'));
check("state seed uses BTC 5m and the real Gold 15m/40-tick floor with no rejected chain",
  states.includes('const GOLD_DUR = 15;')
  && states.includes('if (DUR !== 5) throw new Error(')
  && states.includes('durations: [GOLD_DUR], assets: ["XAU"], minMoveTicks: 40')
  && states.includes('goldSeed.chains?.length !== 1 || !goldChain || goldSeed.notes?.length')
  && states.includes('durations: [DUR], assets: ["BTC"], pause: ["XAU"]')
  && states.includes('chain.assetId !== goldChain.assetId')
  && states.includes('seed.chains?.length !== 2 || !btcChain')
  && states.includes('chain.assetId === goldChain.assetId && chain.durationMinutes === GOLD_DUR && chain.state === "PAUSED"')
  && states.includes('seed.chains.filter((chain) => chain.state === "RUNNING").length !== 1')
  && states.includes('seed.notes?.length) die('));
check("only BTC arms and settles while Gold has no round",
  states.includes('armed.chains !== 1 || armed.out?.length !== 1')
  && states.includes('lastSettle.chains !== 1 || lastSettle.out?.length !== 1')
  && states.includes('only the BTC ${DUR}-minute chain may arm a lead-in round'));
check("market seeds fail on missing real resolved or one-sided money",
  states.includes('const resolvedSeeds = await post("/api/dev-test/resolve-seed-markets"')
  && states.includes('resolvedSeeds.resolved !== 2')
  && states.includes('oneSidedSeed.resolved !== 1')
  && states.includes('oneSidedSeed.markets.some((m) => m.stakes <= 0)'));
check("VOID comes from genuine local service path with a returned holder row",
  states.includes('authCtx.request.post(`${BASE}/api/dev-test/seed-player-portfolio`')
  && states.includes('portfolio.byStatus?.VOID !== 1')
  && states.includes('portfolio.marketIds?.length < 12')
  && states.includes('portfolio.refusals?.length'));
check("four market states have exact ID searches and observed card identity",
  ["p12-market-live", "p12-market-resolved", "p12-market-one-sided", "p12-market-void"]
    .every((phase) => states.includes(`"${phase}"`))
  && states.includes('row.id === requirement.marketCase.id')
  && states.includes('encodeURIComponent(`id:${marketCase.id}`)')
  && states.includes('marketCase: requirement.marketCase, marketCards: final.marketCards'));
check("market result, one-sided and VOID visual states are required",
  states.includes('card.result === "final" && card.choices === "closed"')
  && states.includes('card.result === "final" && card.oneSided === true')
  && states.includes('card.text.includes(voidWord[requirement.locale])'));
check("Gold stop goes through service and requires selected XAU readback",
  states.includes('const stoppedChains = await post("/api/dev-test/updown-handover", { phase: "stop" })')
  && states.includes('stoppedChains.chains !== 2')
  && states.includes('stoppedChains.out.some((row) => row.durationMinutes === GOLD_DUR && row.ok)')
  && states.includes('stoppedChains.out.some((row) => !row.ok)')
  && states.includes('sample.signedIn === requirement.signedIn && sample.goldSelected && sample.goldDurationSelected')
  && states.includes('sample.cards === 0 && sample.emptyState && sample.bettableChoiceCount === 0')
  && states.includes('stoppedGoldWords[requirement.locale].some((words) => sample.emptyStateText?.includes(words))')
  && states.includes('index.goldStopped = { goldDurationMinutes: GOLD_DUR, chains: stoppedChains.chains, out: stoppedChains.out }')
  && states.includes('goldDurationSelected: !!document.querySelector(')
  && states.includes('emptyStateText: requirement.stoppedGold ? final.emptyStateText : null')
  && states.includes('bettableChoiceCount: requirement.stoppedGold ? final.bettableChoiceCount : null'));
check("stopped Gold is photographed in every selected width, locale and viewer cell",
  states.includes('await photograph("p13-gold-board", `/updown?asset=XAU&d=${GOLD_DUR}`);')
  && states.includes('if (stoppedGold) return !!document.querySelector(\'[data-empty-state]\')')
  && states.includes('stoppedGold: requirement.stoppedGold')
  && states.includes('const chartReady = requirement.stoppedGold || await p.page.waitForFunction')
  && states.includes('chartReady: requirement.stoppedGold || final.chartReady'));
check("p6 moving frames precede the still style and prove all three reduced-motion gates",
  states.includes('const motionFrames = phase === "p6-last30" && p.who === "guest" && [320, 360].includes(p.width)')
  && states.includes('for (const mode of ["full-a", "full-b", "reduced", "minimal", "os-reduce"])')
  && states.includes('await p.page.emulateMedia({ reducedMotion: osReduced ? "reduce" : "no-preference" })')
  && states.includes('before.urgentName !== "m-breathe" || !before.urgentRunning')
  && states.includes('!mode.startsWith("full") && before.urgentName !== "none"')
  && states.includes('before.dotName !== "m-breathe" || before.dotDuration !== "2.6s"')
  && states.indexOf('const motionFrames = phase === "p6-last30"') < states.indexOf('const accepted = await verifiedScreenshot({', states.indexOf('if (phase === "p7-locked"'))
  && states.includes('for (const frame of motionFrames) writeFileSync(join(OUT, frame.file), frame.image)'));
check("accepted frames use exact market premise before and after screenshot",
  (states.match(/valid: \(sample\) => exactMarketReady\(sample, requirement\)/g) ?? []).length === 2);

console.log(`U43 capture premises: ${passed} passed, 0 failed`);
