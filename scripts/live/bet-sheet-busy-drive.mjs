/**
 * S8 WP11 · DETERMINISTIC AUTHORITATIVE ADMISSION BUSY, in a real browser — the refusal matrix's row 1, measured
 * through the platform's own admission gate held full (docs/qa/s8-outstanding-browser-proof-plan-20261014.md,
 * "Deterministic authoritative BUSY — existing door, no new fixture required"; S8-PLAN "The refusal matrix" row 1, A2).
 * The 2,000-call storm in qa-bet-sheet.mjs stays recorded as it was (unobserved); this is an additional measurement.
 *
 *   KP_BASE=http://localhost:3053 npm run qa:bet-sheet-busy -- [OUTSIDE_REPO_OUTPUT]
 *   npm run qa:bet-sheet-busy -- --self-test     (the pure verdicts, each failure planted; no server, no browser)
 *
 * ONE ROUND PER WIDTH (KP_WIDTHS, default 360 and 1280), each with three synthetic players — en, sw, zh:
 *  1. Warm the operator's authenticated `/api/admin/admission` and three players' pages, each with a healthy open sheet
 *     (the edit frame, "Place bet · {min}", the read balance). Count each player's own positions and BET_PLACED rows,
 *     and read the ORIGINAL admission snapshot, before anything is held.
 *  2. POST `/api/dev-test/marketing-live-seed?busy=60000` — the existing door: `holdBusy` sets maxInFlight 1 and takes
 *     the one slot through the real `withAdmission`. Its answer is not the acknowledgement: the authenticated snapshot
 *     must read maxInFlight 1, inFlight 1, queue 0, the counters moved by the hold alone, and a maxWaitMs ≤ 20 s that
 *     leaves a margin inside the hold.
 *  3. Tap the three real CTAs. Each real action waits in admission's queue and is refused at its wait budget. Captured:
 *     the actual returned `code: BUSY` and its `retryAfterSec`, the source's own matrix reading of it (row 1), the inline
 *     frame (edit, `journey.sheetBusy`, "Try again · {amount}"), a tile, zero own position/BET_PLACED deltas, and
 *     admission's timedOut counter moving by exactly the three refusals while nothing was admitted.
 *  4. In `finally`, POST `?busy=0`; the original limits must come back, the queue drained, no holder. Then the explicit
 *     retry: the SAME original key (digests compared), exactly one own position carrying it, one BET_PLACED row, the
 *     real receipt. A failed restoration stops every later dispatch.
 * Before the first round one warm-up bet, by its own synthetic player, compiles the action's server path (a dev server
 * compiles on first use, and a slow first answer would race the sheet's 20 s placing watchdog); no cell counts it.
 * The returned value is read from the page's own copy of the answer (`pageIn`'s observer, cross-checked against the
 * network copy when Chromium keeps one): a BUSY answer that waited 15 s in admission's queue left Chromium with no body.
 * An answer later than the watchdog is NOT MEASURED; a refusal line drawn below the fold is printed as a FINDING.
 * Every request targets the operator's own memory server (`exclusiveLocalPremise`). Seeded local funds only; no payment
 * provider, no database, no production. Evidence keeps digests and verdicts, never cookies, passes or raw payloads.
 * Exit 0 all PASS · 1 a FAIL · 2 an INVALID premise · 3 NOT MEASURED. Every tile still needs a human read.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import {
  S, ROOT, digest, fileDigest, flightResult, resultSummary, healthySheetErrors, holdPremiseErrors, busyTapVerdict,
  admissionMoveErrors, restoreErrors, retryVerdict, exitCodeFor, sourceModules, exclusiveLocalPremise, outputDir, post,
  freshPlayer, observed, admissionSnapshot, pageIn, betActionWatch, requestFields, answerOf, openSheet, sheetState,
  waitFrame, holdReceipt, tile, writeEvidence,
} from "./bet-sheet-gates.mjs";
import { mintStaffPass } from "./journey-pass.mjs";

const HOLD_MS = 60_000;
/** The client's placing watchdog (sheet-state.ts PLACING_DOUBT_MS): an answer later than this is a different cell. */
const WATCHDOG_MS = 20_000;
/** What a round needs inside the hold after the taps go out: the wait budget, then the frames, tiles and the counters. */
const ROUND_MARGIN_MS = 20_000;

/* ─── --self-test: every verdict, and each of its failures planted ───────────────────────────────────────────── */

function selfTest() {
  let pass = 0, fail = 0;
  const check = (label, cond) => { if (cond) pass++; else { fail++; console.log(`FAIL self-test: ${label}`); } };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const plant = (base, edit) => { const o = clone(base); edit(o); return o; };
  const limits = { maxInFlight: 16, maxQueue: 500, maxWaitMs: 15_000 };
  const s0 = { inFlight: 0, queueDepth: 0, admitted: 4, shed: 0, timedOut: 0, limits };
  const s1 = { inFlight: 1, queueDepth: 0, admitted: 5, shed: 0, timedOut: 0, limits: { ...limits, maxInFlight: 1 } };
  const s2 = { ...s1, timedOut: 3 };
  const place = "Place bet · TZS 500", busyLine = "We’re busy right now. Your bet was NOT placed and no money was taken — try again in a moment.", retryCta = "Try again · TZS 500";
  const before = { present: true, frame: "edit", lines: [], cta: { text: place, enabled: true }, stakeValue: "500", stakeLocked: false, balanceKnown: true, text: "" };
  const busyFlight = '0:{"a":"$@1","f":"","b":"development"}\n1:{"ok":false,"error":"We\'re busy right now — your stake hasn\'t moved. Try again in a moment.","code":"BUSY","retryAfterSec":1}\n';
  const tap = {
    premiseErrors: [], before, expected: { place, busyLine, retryCta, stake: 500 },
    request: { observed: true, count: 1 }, elapsedMs: 15_400,
    response: { observed: true, status: 200, serverAddr: true, result: flightResult(busyFlight) },
    outcome: { row: 1 },
    after: { present: true, frame: "edit", lines: [busyLine], cta: { text: retryCta, enabled: true }, stakeValue: "500", stakeLocked: false, text: busyLine },
    money: { positionsDelta: 0, ledgerDelta: 0 },
  };
  const v = (e) => busyTapVerdictTimed(e).state;
  check("flight: the BUSY answer is read", tap.response.result.ok && tap.response.result.value.code === "BUSY" && tap.response.result.value.retryAfterSec === 1);
  check("flight: an inline result is read", flightResult('0:{"a":{"ok":false,"error":"x"}}').value?.error === "x");
  check("flight: garbage is unread", !flightResult("<html>").ok && !flightResult("").ok && !flightResult('0:{"a":"$@9"}').ok);
  check("tap: the complete evidence PASSes", v(tap) === "PASS");
  for (const [label, edit, want] of [
    ["an unrelated holder before the hold is INVALID", (o) => { o.premiseErrors = holdPremiseErrors({ before: { ...s0, inFlight: 1 }, held: s1 }); }, "INVALID"],
    ["a hold that did not set maxInFlight 1 is INVALID", (o) => { o.premiseErrors = holdPremiseErrors({ before: s0, held: { ...s1, limits: limits } }); }, "INVALID"],
    ["a maxWaitMs above 20 s is INVALID", (o) => { o.premiseErrors = holdPremiseErrors({ before: { ...s0, limits: { ...limits, maxWaitMs: 25_000 } }, held: { ...s1, limits: { ...limits, maxInFlight: 1, maxWaitMs: 25_000 } } }); }, "INVALID"],
    ["a sheet whose CTA was disabled before the tap is INVALID", (o) => { o.before.cta.enabled = false; }, "INVALID"],
    ["a sheet showing another frame before the tap is INVALID", (o) => { o.before.frame = "low"; }, "INVALID"],
    ["no request is NOT MEASURED", (o) => { o.request.observed = false; }, "NOT MEASURED"],
    ["no answer is NOT MEASURED", (o) => { o.response.observed = false; }, "NOT MEASURED"],
    ["an answer after the 20 s watchdog is NOT MEASURED", (o) => { o.elapsedMs = 20_500; }, "NOT MEASURED"],
    ["an HTTP fault FAILs", (o) => { o.response.status = 500; }, "FAIL"],
    ["a fulfilled (serverless) answer FAILs", (o) => { o.response.serverAddr = false; }, "FAIL"],
    ["an unreadable answer is NOT MEASURED", (o) => { o.response.result = flightResult("<html>"); }, "NOT MEASURED"],
    ["an ADMITTED tap is NOT MEASURED, never PASS", (o) => { o.response.result = { ok: true, value: { ok: true, data: { positionId: "pos_x" } } }; o.money = { positionsDelta: 1, ledgerDelta: 1 }; }, "NOT MEASURED"],
    ["another refusal is NOT MEASURED", (o) => { o.response.result = { ok: true, value: { ok: false, code: "RATE_LIMITED", reason: "rate_limited" } }; }, "NOT MEASURED"],
    ["another refusal with own money moved FAILs", (o) => { o.response.result = { ok: true, value: { ok: false, code: "RATE_LIMITED", reason: "rate_limited" } }; o.money.positionsDelta = 1; }, "FAIL"],
    ["BUSY with money moved FAILs", (o) => { o.money.positionsDelta = 1; }, "FAIL"],
    ["BUSY with a BET_PLACED row FAILs", (o) => { o.money.ledgerDelta = 1; }, "FAIL"],
    ["BUSY with no retry information FAILs", (o) => { delete o.response.result.value.retryAfterSec; }, "FAIL"],
    ["the matrix reading another row FAILs", (o) => { o.outcome.row = 2; }, "FAIL"],
    ["two requests FAIL", (o) => { o.request.count = 2; }, "FAIL"],
    ["the in-doubt frame FAILs", (o) => { o.after.frame = "inDoubt"; }, "FAIL"],
    ["the check-your-wallet line FAILs", (o) => { o.after.lines = ["Something went wrong at our end."]; }, "FAIL"],
    ["a second line FAILs", (o) => { o.after.lines = [busyLine, "x"]; }, "FAIL"],
    ["a CTA still reading Place bet FAILs", (o) => { o.after.cta.text = place; }, "FAIL"],
    ["a disabled retry FAILs", (o) => { o.after.cta.enabled = false; }, "FAIL"],
    ["a moved stake FAILs", (o) => { o.after.stakeValue = "1000"; }, "FAIL"],
    ["a closed sheet FAILs", (o) => { o.after = { present: false }; }, "FAIL"],
  ]) check(`tap: ${label}`, v(plant(tap, edit)) === want);

  const move = { held: s1, after: s2, taps: 3, maxQueueSeen: 3 };
  check("admission: the timeouts alone PASS", admissionMoveErrors(move).length === 0);
  for (const [label, edit] of [
    ["two timeouts for three taps", (o) => { o.after.timedOut = 2; }],
    ["a shed instead of a timeout", (o) => { o.after.shed = 1; }],
    ["an admission while held", (o) => { o.after.admitted = 6; }],
    ["the hold gone before the counters were read", (o) => { o.after.inFlight = 0; }],
    ["a queue never seen holding the taps", (o) => { o.maxQueueSeen = 0; }],
  ]) check(`admission: ${label} FAILs`, admissionMoveErrors(plant(move, edit)).length > 0);

  const restored = { inFlight: 0, queueDepth: 0, admitted: 8, shed: 0, timedOut: 3, limits };
  check("restore: the original limits, drained, PASS", restoreErrors({ original: s0, restored }).length === 0);
  for (const [label, edit] of [
    ["maxInFlight left at 1", (o) => { o.limits = { ...limits, maxInFlight: 1 }; }],
    ["a holder left", (o) => { o.inFlight = 1; }],
    ["a waiter left", (o) => { o.queueDepth = 1; }],
  ]) check(`restore: ${label} FAILs`, restoreErrors({ original: s0, restored: plant(restored, edit) }).length > 0);

  const K = "11111111-1111-4111-8111-111111111111";
  const retry = {
    originalKey: K, retry: { observed: true, key: K, fields: { marketId: "mkt_1", side: "YES", stake: "500" } },
    expectedQuote: { marketId: "mkt_1", side: "YES", stake: "500" }, requests: 2,
    response: { observed: true, status: 200, serverAddr: true, result: { ok: true, value: { ok: true, data: { positionId: "pos_new", replayed: false } } } },
    before: { positionCount: 0, betPlacedCount: 0, positions: [] },
    after: { positionCount: 1, betPlacedCount: 1, positions: [{ positionId: "pos_new", key: K }] },
    sheet: { frame: "receipt", ticketId: "pos_new", ticketHref: "/positions/pos_new" },
  };
  check("retry: the same key, one position, one row, the receipt PASS", retryVerdict(retry).state === "PASS");
  for (const [label, edit, want] of [
    ["a new key", (o) => { o.retry.key = "22222222-2222-4222-8222-222222222222"; }, "FAIL"],
    ["another stake", (o) => { o.retry.fields.stake = "1000"; }, "FAIL"],
    ["two positions", (o) => { o.after.positionCount = 2; o.after.positions.push({ positionId: "pos_2", key: K }); }, "FAIL"],
    ["two BET_PLACED rows", (o) => { o.after.betPlacedCount = 2; }, "FAIL"],
    ["a position under another key", (o) => { o.after.positions[0].key = "x"; }, "FAIL"],
    ["a replay (the refused attempt had placed)", (o) => { o.response.result.value.data.replayed = true; }, "FAIL"],
    ["a refusal", (o) => { o.response.result.value = { ok: false, code: "BUSY" }; }, "FAIL"],
    ["a receipt naming another ticket", (o) => { o.sheet.ticketId = "pos_old"; }, "FAIL"],
    ["no receipt", (o) => { o.sheet.frame = "edit"; }, "FAIL"],
    ["a third request", (o) => { o.requests = 3; }, "FAIL"],
    ["a serverless answer", (o) => { o.response.serverAddr = false; }, "FAIL"],
    ["no retry request", (o) => { o.retry.observed = false; }, "NOT MEASURED"],
    ["no original key", (o) => { o.originalKey = null; }, "INVALID"],
  ]) check(`retry: ${label} → ${want}`, retryVerdict(plant(retry, edit)).state === want);
  check("sheet premise: the balance unread is not healthy", healthySheetErrors({ ...before, balanceKnown: false }, place).length > 0);
  return { pass, fail };
}

/** The tap verdict with the watchdog rule in front: an answer that reached the page after 20 s is another cell. */
function busyTapVerdictTimed(e) {
  if (e.request?.observed && e.response?.observed && typeof e.elapsedMs === "number" && e.elapsedMs >= WATCHDOG_MS) {
    const premise = [...(e.premiseErrors ?? []), ...healthySheetErrors(e.before, e.expected?.place)];
    if (!premise.length) return { state: "NOT MEASURED", errors: [`the answer reached the page after ${e.elapsedMs} ms, past the ${WATCHDOG_MS} ms placing watchdog`] };
  }
  return busyTapVerdict(e);
}

if (process.argv.includes("--self-test")) {
  const { pass, fail } = selfTest();
  // The expectations above are the source's: the bundled refusal matrix must read BUSY as row 1 (inline, same key).
  const { refusalOutcome, text } = await sourceModules();
  const row = refusalOutcome({ kind: "resolved", value: { ok: false, error: "x", code: "BUSY", retryAfterSec: 1 } });
  const sourceOk = row.row === 1 && row.frame === "inline" && row.retry === "same" && text("en", "journey.retryCta", { amount: 500 }) === "Try again · TZS 500";
  console.log(`${sourceOk ? "PASS" : "FAIL"} self-test: the source's matrix reads BUSY as row 1 inline/same-key, and the retry CTA is the source's`);
  console.log(`qa:bet-sheet-busy --self-test: ${pass + (sourceOk ? 1 : 0)} passed, ${fail + (sourceOk ? 0 : 1)} failed`);
  process.exit(fail || !sourceOk ? 1 : 0);
}

/* ─── The drive ──────────────────────────────────────────────────────────────────────────────────────────────── */

const BASE = process.env.KP_BASE ?? "http://localhost:3053";
const LOCALES = ["en", "sw", "zh"];
const WIDTHS = (process.env.KP_WIDTHS ?? "360,1280").split(",").map(Number);
if (WIDTHS.some((w) => ![320, 360, 390, 1280].includes(w))) { console.error("REFUSED: KP_WIDTHS takes 320, 360, 390, 1280"); process.exit(2); }
const VIEWPORTS = WIDTHS.map((width) => ({ width, height: width <= 360 ? 640 : width === 390 ? 844 : 900 }));
const startedAt = new Date().toISOString();
const pre = await exclusiveLocalPremise(BASE);
if (pre.refuse) { console.error(`INVALID premise: ${pre.refuse}`); process.exit(2); }
const OUT = outputDir(process.argv[2], `busy-${startedAt.replace(/[:.]/g, "-")}`);
const { text, refusalOutcome } = await sourceModules();
const results = [], consoleRows = [], cells = [], rounds = [], tiles = [], findings = [];
/** An observation outside the protocol's criteria (never a verdict input), printed and kept for a human ruling. */
const finding = (label, detail) => { findings.push({ label, detail }); console.log(`FINDING ${label} — ${detail}`); };
let tileN = 0, dispatchDisabled = false;
const result = (label, state, detail = "") => { results.push({ label, state, detail }); console.log(`${state} ${label}${detail ? ` — ${detail}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (page, label) => { const file = await tile(page, OUT, ++tileN, label); tiles.push({ file, label }); return file; };
const hold = (ms) => post(BASE, admin, "marketing-live-seed", {}, `?busy=${ms}`);
const isBet = (r) => r.method() === "POST" && !!r.headers()["next-action"] && !!r.postDataBuffer()?.includes("idempotencyKey");

const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
console.log(`qa:bet-sheet-busy ${BASE} @ ${pre.identity.head.slice(0, 12)}, chromium ${browser.version()}, output ${OUT}`);
const contexts = new Set();
let admin, PASS;
try {
  PASS = await mintStaffPass(browser, BASE, { phone: "+255700000071", name: "Busy Gate Support" });
  admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  contexts.add(admin);
  await post(BASE, admin, "seed-admin", { role: "ADMIN", phone: "+255700000072", name: "Busy Gate Admin" });
  const catalogue = await post(BASE, admin, "seed-markets");
  await post(BASE, admin, "reset-rate-limits");
  if (!catalogue?.ids?.length) throw new Error("INVALID: the seeded board has no market");
  await admissionSnapshot(BASE, admin); // warm the operator's route (a dev server compiles it on first use)

  // A warm-up bet by its OWN synthetic player compiles the bet action's server path before any slot is held, so the
  // protocol's first answer is not delayed by a first compile. It is recorded, and no cell counts it.
  {
    const warm = await freshPlayer(browser, BASE, PASS, { locale: "en", viewport: { width: 390, height: 844 }, contexts });
    const page = await pageIn(BASE, warm.ctx, "/", consoleRows);
    const seed = await openSheet(page);
    await page.waitForFunction((sel) => !!document.querySelector(sel)?.querySelector(".kp-bsheet__balance") && !document.querySelector(sel).querySelector(".kp-bsheet__balance-unknown"), S.root, { timeout: 60_000 });
    const was = await observed(BASE, warm.ctx, seed.id);
    await page.locator(S.place).click();
    await waitFrame(page, "receipt", 120_000);
    const now = await observed(BASE, warm.ctx, seed.id);
    rounds.push({ warmUp: { market: digest(seed.id), positionsDelta: now.positionCount - was.positionCount, ledgerDelta: now.betPlacedCount - was.betPlacedCount } });
    await warm.ctx.close(); contexts.delete(warm.ctx);
  }

  for (const vp of VIEWPORTS) {
    if (dispatchDisabled) { result(`${vp.width}x${vp.height}: round`, "NOT MEASURED", "an earlier restoration failed; no further dispatch"); continue; }
    const tag = `${vp.width}x${vp.height}`;
    const round = { viewport: tag, cells: [] };
    rounds.push(round);
    // 1 · three players, three healthy open sheets, their baselines; nothing held yet.
    const players = [];
    for (const locale of LOCALES) {
      const p = await freshPlayer(browser, BASE, PASS, { locale, viewport: vp, contexts });
      p.page = await pageIn(BASE, p.ctx, "/", consoleRows);
      p.watch = betActionWatch(p.page);
      p.seed = await openSheet(p.page, players[0]?.seed.id ?? null);
      await p.page.waitForFunction((sel) => { const r = document.querySelector(sel); return !!r?.querySelector(".kp-bsheet__balance") && !r.querySelector(".kp-bsheet__balance-unknown"); }, S.root, { timeout: 60_000 }).catch(() => {});
      await p.page.waitForTimeout(400);
      p.before = await sheetState(p.page);
      p.stake = Number(String(p.before.stakeValue ?? "").replace(/,/g, ""));
      p.expected = {
        place: text(locale, "journey.placeCta", { amount: p.stake }), busyLine: text(locale, "journey.sheetBusy"),
        retryCta: text(locale, "journey.retryCta", { amount: p.stake }), stake: p.stake,
      };
      p.baseline = await observed(BASE, p.ctx, p.seed.id);
      p.openedQuietly = p.watch.requests.length === 0;
      players.push(p);
    }
    const s0 = await admissionSnapshot(BASE, admin);
    round.original = s0;
    // Every sheet healthy and every opening quiet BEFORE anything is held; otherwise nothing is held and nothing tapped.
    const premiseErrors = players.flatMap((p) => [...healthySheetErrors(p.before, p.expected.place), ...(p.openedQuietly ? [] : ["opening the sheet dispatched a bet action"])].map((x) => `${p.locale}: ${x}`));
    let holding = false, s1 = null, holdAt = 0;
    try {
      // 2 · the held slot, read back from the operator's authenticated snapshot.
      if (!premiseErrors.length) {
        holdAt = Date.now();
        const held = await hold(HOLD_MS);
        holding = held?.busyMs === HOLD_MS;
        s1 = await admissionSnapshot(BASE, admin);
        round.held = s1;
        premiseErrors.push(...holdPremiseErrors({ before: s0, held: s1 }), ...(holding ? [] : [`the door answered busyMs ${held?.busyMs}`]));
        const margin = HOLD_MS - (Date.now() - holdAt) - (s1.limits?.maxWaitMs ?? Infinity);
        if (margin < ROUND_MARGIN_MS) premiseErrors.push(`only ${margin} ms of the hold would remain after the wait budget`);
        round.holdMarginMs = margin;
      }
      // 3 · the real CTAs, tapped together while the slot stays held.
      const taps = [];
      if (!premiseErrors.length) {
        await Promise.all(players.map(async (p) => {
          const requestP = p.page.waitForRequest(isBet, { timeout: 15_000 }).catch(() => null);
          p.clickAt = Date.now();
          await p.page.locator(S.place).click();
          p.request = await requestP;
          if (p.request) {
            p.answerP = answerOf(p.request, 45_000, p.page).then((a) => { p.answerAt = Date.now(); return a; });
            taps.push(p);
          }
        }));
        let maxQueueSeen = 0, pending = true;
        const all = Promise.all(taps.map((p) => p.answerP)).finally(() => { pending = false; });
        while (pending) {
          const s = await admissionSnapshot(BASE, admin).catch(() => null);
          if (s) maxQueueSeen = Math.max(maxQueueSeen, s.queueDepth);
          await sleep(250);
        }
        await all;
        round.maxQueueSeen = maxQueueSeen;
        for (const p of taps) {
          const { text: _raw, ...answer } = await p.answerP;
          p.answer = answer;
          // Let the host settle the answer into its frame (no re-read for row 1).
          await p.page.waitForFunction((sel) => { const r = document.querySelector(sel); return !!r && r.getAttribute("data-frame") !== "placing"; }, S.root, { timeout: 15_000 }).catch(() => {});
          await p.page.waitForTimeout(500);
          p.after = await sheetState(p.page);
          p.afterBusy = await observed(BASE, p.ctx, p.seed.id);
          p.busyTile = await shot(p.page, `busy-${tag}-${p.locale}-inline`);
        }
        const s2 = await admissionSnapshot(BASE, admin);
        round.afterRefusals = s2;
        const moveErrors = admissionMoveErrors({ held: s1, after: s2, taps: players.length, maxQueueSeen });
        result(`${tag}: admission counters move with the refusals (timedOut +${s2.timedOut - s1.timedOut}, shed +${s2.shed - s1.shed}, admitted +${s2.admitted - s1.admitted}, queue seen ${maxQueueSeen})`, taps.length === players.length ? (moveErrors.length ? "FAIL" : "PASS") : "NOT MEASURED", moveErrors.join("; "));
      }
      for (const p of players) {
        const answer = p.answer ?? { observed: false };
        const value = answer.result?.ok ? answer.result.value : null;
        const outcome = value ? refusalOutcome({ kind: "resolved", value }) : null;
        const fields = p.request ? requestFields(p.request) : null;
        p.originalKey = fields?.af?.ok ? fields.af.fields.idempotencyKey : null;
        p.originalFields = fields?.af?.ok ? fields.af.fields : null;
        const money = p.afterBusy ? { positionsDelta: p.afterBusy.positionCount - p.baseline.positionCount, ledgerDelta: p.afterBusy.betPlacedCount - p.baseline.betPlacedCount } : { positionsDelta: null, ledgerDelta: null };
        const e = {
          premiseErrors, before: p.before, expected: p.expected,
          request: { observed: !!p.request, count: p.watch.requests.length }, elapsedMs: answer.timing && p.clickAt ? answer.timing.startTime + answer.timing.toEndMs - p.clickAt : p.answerAt && p.clickAt ? p.answerAt - p.clickAt : null,
          response: answer, outcome: outcome ? { row: outcome.row } : null, after: p.after, money,
        };
        const v = busyTapVerdictTimed(e);
        const cell = {
          cell: `${tag} ${p.locale}: admission BUSY on the real sheet CTA`, state: v.state, errors: v.errors,
          market: digest(p.seed.id), owner: digest(p.userId), stake: p.stake, originalKey: digest(p.originalKey), keyRead: !!p.originalKey,
          answer: { observed: answer.observed, status: answer.status ?? null, fromServer: answer.serverAddr ?? null, returned: value ? resultSummary(value) : null, why: answer.why ?? answer.result?.why ?? null, timing: answer.timing ?? null, bodySource: answer.bodySource ?? null },
          matrixRow: outcome?.row ?? null, elapsedMs: e.elapsedMs,
          frame: p.after ? { frame: p.after.frame, lines: p.after.lines, cta: p.after.cta, stake: p.after.stakeValue, linesView: p.after.linesView } : null,
          money, tile: p.busyTile ?? null,
        };
        round.cells.push(cell); cells.push(cell);
        result(cell.cell, v.state, v.errors.join("; ") || `code BUSY, retryAfterSec ${value?.retryAfterSec}, row ${outcome?.row}, ${e.elapsedMs} ms`);
        if (p.after?.present && p.after.linesView !== "whole") finding(`${tag} ${p.locale}: the busy line is ${p.after.linesView} when the BUSY frame draws`, `the sheet's lines (role=status) sit at the end of its scroller; at this size they are not wholly visible above the CTA without scrolling (tile ${p.busyTile})`);
      }
    } finally {
      // 4 · release, and the original limits read back — always, even after a failure above.
      if (holding || s1?.inFlight === 1) {
        let restored = null, errors = ["not read"];
        try {
          await hold(0);
          for (let n = 0; n < 40; n++) {
            restored = await admissionSnapshot(BASE, admin);
            errors = restoreErrors({ original: s0, restored });
            if (!errors.length) break;
            await sleep(250);
          }
          // A release that did not take still ends when the hold's own timer does; wait it out so nothing later runs held.
          if (errors.length) {
            await sleep(Math.max(0, HOLD_MS - (Date.now() - holdAt)) + 1_000);
            restored = await admissionSnapshot(BASE, admin);
          }
        } catch (error) { errors = [`release failed: ${String(error.message).slice(0, 160)}`]; }
        round.restored = restored;
        result(`${tag}: ?busy=0 restores the original limits, drains the queue, leaves no holder`, errors.length ? "FAIL" : "PASS", errors.join("; ") || JSON.stringify(restored?.limits));
        if (errors.length) dispatchDisabled = true;
      }
    }
    // 5 · the explicit retry, once the original limits are back.
    for (const p of players) {
      if (dispatchDisabled) { result(`${tag} ${p.locale}: same-key retry`, "NOT MEASURED", "restoration failed; no further dispatch"); continue; }
      if (!p.request) { result(`${tag} ${p.locale}: same-key retry`, "NOT MEASURED", "the BUSY tap was never sent"); continue; }
      const requestP = p.page.waitForRequest(isBet, { timeout: 15_000 }).catch(() => null);
      await p.page.locator(S.place).click();
      const request = await requestP;
      const { text: _raw, ...answer } = request ? await answerOf(request, 60_000, p.page) : { observed: false };
      await waitFrame(p.page, "receipt", 30_000).catch(() => {});
      await holdReceipt(p.page).catch(() => {});
      const sheet = await sheetState(p.page);
      const retryTile = sheet.frame === "receipt" ? await shot(p.page, `busy-${tag}-${p.locale}-retry-receipt`) : await shot(p.page, `busy-${tag}-${p.locale}-retry-no-receipt`);
      const after = await observed(BASE, p.ctx, p.seed.id);
      const fields = request ? requestFields(request) : null;
      const e = {
        originalKey: p.originalKey,
        retry: { observed: !!request, key: fields?.af?.ok ? fields.af.fields.idempotencyKey : null, fields: fields?.af?.ok ? fields.af.fields : null },
        expectedQuote: p.originalFields ? { marketId: p.originalFields.marketId, side: p.originalFields.side, stake: p.originalFields.stake, expectedOwnerId: p.originalFields.expectedOwnerId } : {},
        requests: p.watch.requests.length, response: answer, before: p.baseline, after, sheet,
      };
      const v = retryVerdict(e);
      const fresh = after.positions.filter((x) => !p.baseline.positions.some((b) => b.positionId === x.positionId));
      const cell = {
        cell: `${tag} ${p.locale}: explicit retry after BUSY reuses the original key, one position, one BET_PLACED, the receipt`, state: v.state, errors: v.errors,
        originalKey: digest(p.originalKey), retryKey: digest(e.retry.key), sameKey: !!p.originalKey && e.retry.key === p.originalKey,
        returned: answer.result?.ok ? resultSummary(answer.result.value) : null, fromServer: answer.serverAddr ?? null, bodySource: answer.bodySource ?? null,
        positionsDelta: after.positionCount - p.baseline.positionCount, ledgerDelta: after.betPlacedCount - p.baseline.betPlacedCount,
        newPosition: fresh.map((x) => ({ position: digest(x.positionId), key: digest(x.key) })), receipt: { frame: sheet.frame, ticket: digest(sheet.ticketId) },
        betActionRequests: p.watch.requests.length, tile: retryTile,
      };
      round.cells.push(cell); cells.push(cell);
      result(cell.cell, v.state, v.errors.join("; ") || `key ${cell.originalKey} = ${cell.retryKey}, replayed ${cell.returned?.replayed}`);
      // The RED control on live evidence: this ADMITTED retry, judged as a BUSY tap, must never PASS.
      const red = busyTapVerdictTimed({ premiseErrors: [], before: p.before, expected: p.expected, request: { observed: !!request, count: 1 }, elapsedMs: 1, response: answer, outcome: answer.result?.ok ? { row: refusalOutcome({ kind: "resolved", value: answer.result.value }).row } : null, after: sheet, money: { positionsDelta: after.positionCount - p.afterBusy.positionCount, ledgerDelta: after.betPlacedCount - p.afterBusy.betPlacedCount } });
      result(`${tag} ${p.locale}: RED control — the admitted retry judged as a BUSY tap is NOT MEASURED, never PASS`, red.state === "NOT MEASURED" ? "PASS" : "FAIL", `${red.state}: ${red.errors.join("; ")}`);
      p.watch.stop();
    }
    for (const p of players) { await p.ctx.close().catch(() => {}); contexts.delete(p.ctx); }
  }
} catch (error) {
  result("drive stopped on an invalid premise or a runtime error", String(error?.message ?? error).startsWith("INVALID") ? "INVALID" : "FAIL", String(error?.stack ?? error).split("Call log:")[0].trim().slice(0, 1200));
} finally {
  // Whatever happened, no hold outlives the drive.
  if (admin) await admin.request.post(`${BASE}/api/dev-test/marketing-live-seed?busy=0`).catch(() => {});
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
  writeEvidence(OUT, {
    gate: "S8 WP11 admission BUSY (row 1), deterministic authoritative protocol", base: BASE, identity: pre.identity, startedAt, finishedAt: new Date().toISOString(),
    driver: { busy: fileDigest(fileURLToPath(import.meta.url)), kit: fileDigest(`${ROOT}/scripts/live/bet-sheet-gates.mjs`) },
    engine: "chromium", holdMs: HOLD_MS, rounds, results, findings, tiles, console: consoleRows,
  });
}
const tally = (s) => results.filter((r) => r.state === s).length;
console.log(`qa:bet-sheet-busy: ${tally("PASS")} passed, ${tally("FAIL")} failed, ${tally("INVALID")} invalid, ${tally("NOT MEASURED")} not measured, ${findings.length} findings, ${tiles.length} tiles. Read every tile: ${OUT}`);
process.exitCode = exitCodeFor(results);
