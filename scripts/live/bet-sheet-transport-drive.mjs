/**
 * S8 WP11 · THE CANONICAL ROW-23 REFUSALS, raised for real over the actual action transport — "Invalid bet parameters."
 * and "Invalid side." (src/app/markets/actions.ts `buyPositionAction`), which the sheet never builds and so no ordinary
 * click can raise (docs/qa/s8-outstanding-browser-proof-plan-20261014.md, "Canonical rows 23 and 23 — actual malformed
 * action transport"; S8-PLAN "The refusal matrix" row 23, A2 items 1 and 6).
 *
 *   KP_BASE=http://localhost:3053 npm run qa:bet-sheet-transport -- [OUTSIDE_REPO_OUTPUT]
 *   npm run qa:bet-sheet-transport -- --self-test     (the strict parser and the verdicts, each failure planted)
 *
 * ONE CELL = one mode (missing parameters · invalid side) × one locale (en · sw · zh) × one width (KP_WIDTHS, default
 * 360 and 1280), each with a fresh synthetic owner, a healthy open sheet and its original quote:
 *  1. Playwright's router holds ONLY the first genuine bet request: a POST carrying `next-action` whose body holds the
 *     idempotency field. Its real multipart body is read strictly (`parseMultipart` + `actionFields`: the one FormData
 *     argument React's reply encoder wrote, derived from the root model, never a guessed prefix). An unknown or
 *     ambiguous encoding sends nothing and the cell is INVALID.
 *  2. ONE field is altered — `marketId` removed (missing parameters) or `side` set to an invalid value (invalid side) —
 *     every other part byte-identical, the action binding (`next-action`), `expectedOwnerId`, the funnel origin and the
 *     key untouched; the altered body is FORWARDED to the real server (`route.continue`) and the page receives the
 *     server's REAL answer. Nothing is fabricated: the verdict fails any answer that did not come from a server.
 *  3. Required: the bare refusal itself as the server returned it, the source's matrix reading it as row 23, the
 *     controller's in-doubt frame (row 2's handling: "check your wallet", "Try again · {amount}"), the original key and
 *     quote kept in the owner's recovery record, no sentence promising nothing was charged, zero own money rows.
 *  4. The router is released; an explicit retry must send the SAME original key with the original valid quote and
 *     create exactly one own position, one BET_PLACED row and the real receipt. Opening and observing dispatch nothing.
 * CONTROLS, live: a FULFILLED fake of the real answer must be detected and fail (even when the drive's own record is
 * made to claim it was forwarded); ambiguous encodings planted into the real captured body must be INVALID.
 * Local memory server only (`exclusiveLocalPremise`); seeded local funds; evidence keeps digests and verdicts, never a
 * cookie, a pass or a raw payload. Exit 0 all PASS · 1 a FAIL · 2 an INVALID premise · 3 NOT MEASURED.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  S, ROOT, digest, fileDigest, parseMultipart, actionFields, plantTransport, plantErrors, buildMultipart, flightResult,
  resultSummary, transportVerdict, retryVerdict, healthySheetErrors, exitCodeFor, sourceModules, exclusiveLocalPremise, outputDir, post,
  freshPlayer, observed, pageIn, betActionWatch, requestFields, answerOf, openSheet, sheetState, waitFrame, ownedRows,
  holdReceipt, tile, writeEvidence, TRANSPORT_MODES, INVALID_SIDE, REQUEST_FIELDS, MONEY_CLAIM_KEYS, REPLY_RULE, replyPrefixRule, bodyKey,
} from "./bet-sheet-gates.mjs";
import { mintStaffPass } from "./journey-pass.mjs";

/** Phrases that promise nothing was placed or charged, in each language — beside the source's own claim sentences. */
const CLAIM_PATTERNS = {
  en: ["nothing (?:has been|was) (?:charged|placed|taken)", "no money (?:was|has been) taken", "was not placed"],
  sw: ["hakuna kilichotozwa", "hakuna pesa iliyokatwa", "halijawekwa", "hakuna kilichowekwa"],
  zh: ["未扣除任何费用", "未扣款", "未下单", "未下注"],
};

/* ─── --self-test ────────────────────────────────────────────────────────────────────────────────────────────── */

/** The installed codec's naming for the first FormData reference (`$K1`), never typed: `_1_` on React 19.2. */
const P1 = REPLY_RULE?.encoder(1) ?? "<codec unread>";
/** A body exactly as Chromium frames a FormData argument React's encoder wrote: the reference's parts, then the root `0`. */
function syntheticBody(fields, { boundary = "----WebKitFormBoundaryQAselftest00", root = '["$K1"]', prefix = P1, extra = [] } = {}) {
  const raws = [...Object.entries(fields).map(([k, v]) => `Content-Disposition: form-data; name="${prefix}${k}"\r\n\r\n${v}`), ...extra, `Content-Disposition: form-data; name="0"\r\n\r\n${root}`];
  return { body: buildMultipart(boundary, raws), contentType: `multipart/form-data; boundary=${boundary}` };
}
const FIELDS = { marketId: "mkt_selftest", side: "YES", stake: "500", idempotencyKey: "11111111-1111-4111-8111-111111111111", expectedOwnerId: "usr_selftest", funnelOrigin: "sheet", funnelUtmSource: "", funnelUtmCampaign: "" };
const part = (name, value, more = "") => `Content-Disposition: form-data; name="${name}"${more}\r\n\r\n${value}`;

function selfTest() {
  let pass = 0, fail = 0;
  const check = (label, cond) => { if (cond) pass++; else { fail++; console.log(`FAIL self-test: ${label}`); } };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const plant = (base, edit) => { const o = clone(base); edit(o); return o; };
  const read = (b) => actionFields(parseMultipart(b.body, b.contentType));

  // The codec's naming, read from the installed files — and a codec that cannot be read leaves every body unread.
  check("codec: the installed encoder and decoder name $K1's fields alike", !!REPLY_RULE && REPLY_RULE.encoder(1) === REPLY_RULE.decoder("1"));
  check("codec: an unreadable codec reads no body", !actionFields(parseMultipart(syntheticBody(FIELDS).body, syntheticBody(FIELDS).contentType), null).ok);
  check("codec: a codec whose code moved is not read", replyPrefixRule("F:/no-such-checkout") === null);

  // The parser and the field reader.
  const good = syntheticBody(FIELDS);
  const parsed = parseMultipart(good.body, good.contentType), af = actionFields(parsed);
  check("parser: a real-shaped body is read and round-trips", parsed.ok && af.ok && af.prefix === P1 && af.fields.side === "YES" && af.fields.funnelUtmSource === "");
  check("parser: the prefix follows the root's reference ($K2 → the codec's name for 2)", read(syntheticBody(FIELDS, { root: '["$K2"]', prefix: REPLY_RULE?.encoder(2) })).prefix === REPLY_RULE?.encoder(2));
  check("parser: a reference the encoder and decoder would name apart ($K1a) is not read", !read(syntheticBody(FIELDS, { root: '["$K1a"]', prefix: REPLY_RULE?.decoder("1a") })).ok);
  const ambiguous = [
    ["an older codec's naming (1_ for $K1)", syntheticBody(FIELDS, { prefix: "1_" })],
    ["a doubled marketId", syntheticBody(FIELDS, { extra: [part(`${P1}marketId`, "mkt_other")] })],
    ["an unknown field", syntheticBody(FIELDS, { extra: [part(`${P1}note`, "x")] })],
    ["a field outside the referenced FormData", syntheticBody(FIELDS, { extra: [part(`${REPLY_RULE?.encoder(2)}side`, "NO")] })],
    ["a guessed prefix the root does not name", syntheticBody(FIELDS, { root: '["$K2"]' })],
    ["two arguments", syntheticBody(FIELDS, { root: '["$K1","$K1"]' })],
    ["a plain-string argument", syntheticBody(FIELDS, { root: '["hello"]' })],
    ["a non-JSON root", syntheticBody(FIELDS, { root: "not json" })],
    ["no root", { body: buildMultipart("----b", Object.entries(FIELDS).map(([k, v]) => part(`${P1}${k}`, v))), contentType: "multipart/form-data; boundary=----b" }],
    ["a missing field", syntheticBody(Object.fromEntries(Object.entries(FIELDS).filter(([k]) => k !== "stake")))],
    ["a file part", syntheticBody(FIELDS, { extra: [part(`${P1}note`, "x", '; filename="x.txt"\r\nContent-Type: text/plain')] })],
    ["an extra header", syntheticBody(FIELDS, { extra: [part(`${P1}note`, "x", "\r\nContent-Type: text/plain")] })],
  ];
  for (const [label, b] of ambiguous) check(`parser: ${label} is not read as the request`, !read(b).ok);
  check("parser: a urlencoded body is refused", !parseMultipart(Buffer.from("marketId=x&side=YES"), "application/x-www-form-urlencoded").ok);
  check("parser: two boundary parameters are refused", !parseMultipart(good.body, `${good.contentType}; boundary=x`).ok);
  check("parser: LF-only framing (no byte round trip) is refused", !parseMultipart(Buffer.from(good.body.toString("latin1").replaceAll("\r\n", "\n"), "latin1"), good.contentType).ok);
  check("parser: a preamble is refused", !parseMultipart(Buffer.concat([Buffer.from("x\r\n"), good.body]), good.contentType).ok);
  check("parser: a truncated body is refused", !parseMultipart(good.body.subarray(0, good.body.length - 10), good.contentType).ok);

  // The plant: exactly one field changes.
  for (const mode of Object.keys(TRANSPORT_MODES)) {
    const planted = plantTransport(parsed, af, mode);
    const read = actionFields(parseMultipart(planted.body, good.contentType));
    check(`plant ${mode}: exactly the one field changes`, planted.ok && plantErrors(parsed, af, planted.body, good.contentType, mode).length === 0);
    if (mode === "missing-params") check("plant missing-params: the altered body is no longer the full request, and keeps every other field", !read.ok && /missing marketId/.test(read.why));
    else check("plant invalid-side: side carries the invalid value, all else equal", read.ok && read.fields.side === INVALID_SIDE && REQUEST_FIELDS.filter((f) => f !== "side").every((f) => read.fields[f] === FIELDS[f]));
    // A plant that also moves another field must be caught.
    const raws = parseMultipart(planted.body, good.contentType).parts.map((p) => p.raw.replace("usr_selftest", "usr_other"));
    check(`plant ${mode}: a second changed field is caught`, plantErrors(parsed, af, buildMultipart(parsed.boundary, raws), good.contentType, mode).length > 0);
  }
  check("plant: an unknown mode is refused", !plantTransport(parsed, af, "other").ok);
  // The answer is matched to its request by the key the request carried — Playwright reports the FORWARDED body.
  check("bodyKey: the one key is read from the original and from both planted bodies",
    bodyKey(good.body, good.contentType) === FIELDS.idempotencyKey && Object.keys(TRANSPORT_MODES).every((mode) => bodyKey(plantTransport(parsed, af, mode).body, good.contentType) === FIELDS.idempotencyKey));
  check("bodyKey: a doubled key field reads no key", bodyKey(syntheticBody(FIELDS, { extra: [part(`${P1}idempotencyKey`, "22222222-2222-4222-8222-222222222222")] }).body, good.contentType) === null);
  check("plant: a side already invalid is refused", !plantTransport(parseMultipart(...Object.values(syntheticBody({ ...FIELDS, side: "NO!" }))), actionFields(parseMultipart(...Object.values(syntheticBody({ ...FIELDS, side: "NO!" })))), "invalid-side").ok);

  // The flight reader.
  check("flight: the bare refusal is read", flightResult('0:{"a":"$@1","f":"","b":"development"}\n1:{"ok":false,"error":"Invalid side."}\n').value?.error === "Invalid side.");
  check("flight: a dev server's debug row before the model row is skipped", flightResult('0:{"a":"$@1","q":"?bet=m.YES.500","i":true,"b":"development"}\n1:D"$2"\n1:{"ok":false,"error":"Invalid bet parameters."}\n').value?.error === "Invalid bet parameters.");
  check("flight: two model rows for the result are ambiguous", !flightResult('0:{"a":"$@1"}\n1:{"ok":false,"error":"Invalid side."}\n1:{"ok":true}\n').ok);
  check("flight: HTML is unread", !flightResult("<!DOCTYPE html><html>").ok);

  // The verdict.
  const place = "Place bet · TZS 500", systemError = "Something went wrong at our end. Check your wallet before retrying — if the bet is there, it went through.", retryCta = "Try again · TZS 500";
  const base = {
    premiseErrors: [],
    before: { present: true, frame: "edit", lines: [], cta: { text: place, enabled: true }, stakeValue: "500", stakeLocked: false, balanceKnown: true, text: "" },
    expected: { place, refusal: "Invalid side.", systemError, retryCta, stake: 500, moneyClaims: ["Nothing has been charged."], claimPatterns: CLAIM_PATTERNS.en },
    transport: { intercepted: true, parse: { ok: true }, plantErrors: [], forwarded: "continue" },
    response: { observed: true, status: 200, serverAddr: true, result: { ok: true, value: { ok: false, error: "Invalid side." } } },
    outcome: { row: 23 }, requests: 1,
    after: { present: true, frame: "inDoubt", lines: [systemError], cta: { text: retryCta, enabled: true }, stakeValue: "500", stakeLocked: true, text: `${systemError} ${retryCta}` },
    stored: { keyKept: true, quoteKept: true }, money: { positionsDelta: 0, ledgerDelta: 0 },
  };
  const st = (e) => transportVerdict(e).state;
  check("verdict: the complete evidence PASSes", st(base) === "PASS");
  for (const [label, edit, want] of [
    ["a sheet not healthy before the tap", (o) => { o.before.frame = "low"; }, "INVALID"],
    ["opening that dispatched a bet", (o) => { o.premiseErrors = ["opening dispatched"]; }, "INVALID"],
    ["an unread (ambiguous) encoding", (o) => { o.transport.parse = { ok: false, why: "the field marketId appears twice" }; }, "INVALID"],
    ["a plant that changed more than one field", (o) => { o.transport.plantErrors = ["a field other than the target changed"]; }, "INVALID"],
    ["no interception", (o) => { o.transport.intercepted = false; }, "NOT MEASURED"],
    ["a FULFILLED fake answer, honestly recorded", (o) => { o.transport.forwarded = "fulfill"; o.response.serverAddr = false; }, "FAIL"],
    ["a FULFILLED fake answer the drive's record claims was forwarded", (o) => { o.response.serverAddr = false; }, "FAIL"],
    ["an aborted request", (o) => { o.transport.forwarded = "aborted"; o.response.observed = false; }, "NOT MEASURED"],
    ["no answer", (o) => { o.response.observed = false; }, "NOT MEASURED"],
    ["an HTTP fault", (o) => { o.response.status = 500; }, "FAIL"],
    ["an unreadable answer", (o) => { o.response.result = { ok: false, why: "x" }; }, "NOT MEASURED"],
    ["the other refusal text", (o) => { o.response.result.value.error = "Invalid bet parameters."; }, "FAIL"],
    ["a refusal with a code (not the bare one)", (o) => { o.response.result.value.code = "INVALID"; }, "FAIL"],
    ["a placement", (o) => { o.response.result.value = { ok: true, data: { positionId: "pos" } }; }, "FAIL"],
    ["the matrix reading another row", (o) => { o.outcome.row = 2; }, "FAIL"],
    ["a second request", (o) => { o.requests = 2; }, "FAIL"],
    ["the edit frame", (o) => { o.after.frame = "edit"; }, "FAIL"],
    ["the busy line in doubt", (o) => { o.after.lines = ["We’re busy right now. Your bet was NOT placed and no money was taken — try again in a moment."]; }, "FAIL"],
    ["a no-charge promise beside the doubt", (o) => { o.after.text += " Nothing has been charged."; }, "FAIL"],
    ["a paraphrased no-charge promise", (o) => { o.after.text += " no money was taken"; }, "FAIL"],
    ["a CTA that is not the retry", (o) => { o.after.cta.text = place; }, "FAIL"],
    ["a disabled retry", (o) => { o.after.cta.enabled = false; }, "FAIL"],
    ["an editable stake", (o) => { o.after.stakeLocked = false; }, "FAIL"],
    ["a moved stake", (o) => { o.after.stakeValue = "1,000"; }, "FAIL"],
    ["the key dropped", (o) => { o.stored.keyKept = false; }, "FAIL"],
    ["the quote changed", (o) => { o.stored.quoteKept = false; }, "FAIL"],
    ["a position", (o) => { o.money.positionsDelta = 1; }, "FAIL"],
    ["a BET_PLACED row", (o) => { o.money.ledgerDelta = 1; }, "FAIL"],
  ]) check(`verdict: ${label} → ${want}`, st(plant(base, edit)) === want);
  return { pass, fail };
}

if (process.argv.includes("--self-test")) {
  const { pass, fail } = selfTest();
  const { refusalOutcome } = await sourceModules();
  const rows = ["Invalid side.", "Invalid bet parameters."].map((error) => refusalOutcome({ kind: "resolved", value: { ok: false, error } }));
  const sourceOk = rows.every((o) => o.row === 23 && o.frame === "unknown" && o.retry === "same");
  console.log(`${sourceOk ? "PASS" : "FAIL"} self-test: the source's matrix reads both bare refusals as row 23, in doubt, same key`);
  // The two refusals are the ACTION's own sentences: each once in buyPositionAction, the side checked before the
  // parameters (so a missing marketId with a valid side can only answer "Invalid bet parameters.").
  const actions = readFileSync(`${ROOT}/src/app/markets/actions.ts`, "utf8");
  const body = actions.slice(actions.indexOf("export async function buyPositionAction("), actions.indexOf("export async function cashOutPositionAction("));
  const refusalsOk = (text) => {
    const lit = (m) => `error: ${JSON.stringify(TRANSPORT_MODES[m].refusal)}`;
    return text.length > 0 && Object.keys(TRANSPORT_MODES).every((m) => text.split(lit(m)).length === 2) && text.indexOf(lit("invalid-side")) < text.indexOf(lit("missing-params"));
  };
  // RED: the same check over the action with its two refusals' order swapped, and with one sentence reworded.
  const swapped = body.replace('error: "Invalid side."', "@@SIDE@@").replace('error: "Invalid bet parameters."', 'error: "Invalid side."').replace("@@SIDE@@", 'error: "Invalid bet parameters."');
  const actionOk = refusalsOk(body) && !refusalsOk(swapped) && !refusalsOk(body.replace("Invalid side.", "Invalid side!"));
  console.log(`${actionOk ? "PASS" : "FAIL"} self-test: buyPositionAction returns each bare refusal exactly once, the side checked first (and the check fails a swapped or reworded plant)`);
  const extra = (sourceOk ? 1 : 0) + (actionOk ? 1 : 0);
  console.log(`qa:bet-sheet-transport --self-test: ${pass + extra} passed, ${fail + 2 - extra} failed`);
  process.exit(fail || extra !== 2 ? 1 : 0);
}

/* ─── The drive ──────────────────────────────────────────────────────────────────────────────────────────────── */

const BASE = process.env.KP_BASE ?? "http://localhost:3053";
const LOCALES = (process.env.KP_LOCALES ?? "en,sw,zh").split(",");
const WIDTHS = (process.env.KP_WIDTHS ?? "360,1280").split(",").map(Number);
const MODES = (process.env.KP_MODES ?? "missing-params,invalid-side").split(",");
if (LOCALES.some((l) => !["en", "sw", "zh"].includes(l)) || WIDTHS.some((w) => ![320, 360, 390, 1280].includes(w)) || MODES.some((m) => !TRANSPORT_MODES[m])) {
  console.error("REFUSED: KP_LOCALES en,sw,zh · KP_WIDTHS 320,360,390,1280 · KP_MODES missing-params,invalid-side"); process.exit(2);
}
const VIEWPORTS = WIDTHS.map((width) => ({ width, height: width <= 360 ? 640 : width === 390 ? 844 : 900 }));
const startedAt = new Date().toISOString();
const pre = await exclusiveLocalPremise(BASE);
if (pre.refuse) { console.error(`INVALID premise: ${pre.refuse}`); process.exit(2); }
const OUT = outputDir(process.argv[2], `transport-${startedAt.replace(/[:.]/g, "-")}`);
const { text, refusalOutcome } = await sourceModules();
const results = [], consoleRows = [], cells = [], controls = [], tiles = [], findings = [];
/** An observation outside the protocol's criteria (never a verdict input), printed and kept for a human ruling. */
const finding = (label, detail) => { findings.push({ label, detail }); console.log(`FINDING ${label} — ${detail}`); };
let tileN = 0;
const result = (label, state, detail = "") => { results.push({ label, state, detail }); console.log(`${state} ${label}${detail ? ` — ${detail}` : ""}`); };
const shot = async (page, label) => { const file = await tile(page, OUT, ++tileN, label); tiles.push({ file, label }); return file; };
const isBet = (r) => r.method() === "POST" && !!r.headers()["next-action"] && !!r.postDataBuffer()?.includes("idempotencyKey");
/** The real captured material the live controls are planted into — held in memory only, never written. */
const captured = { original: null, answers: {} };

const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
console.log(`qa:bet-sheet-transport ${BASE} @ ${pre.identity.head.slice(0, 12)}, chromium ${browser.version()}, output ${OUT}`);
const contexts = new Set();
let PASS, market = null;

/**
 * One cell. `fake` (a control only) fulfils the held request with a copy of a real answer instead of forwarding it.
 * Answers the evidence; the caller judges it.
 */
async function transportCell(mode, vp, locale, { fake = null, retry = true } = {}) {
  const spec = TRANSPORT_MODES[mode], tag = `${mode} ${locale} ${vp.width}x${vp.height}`;
  const p = await freshPlayer(browser, BASE, PASS, { locale, viewport: vp, contexts, controlledNetwork: true });
  const page = await pageIn(BASE, p.ctx, "/", consoleRows);
  const watch = betActionWatch(page);
  const seed = await openSheet(page, market);
  market ??= seed.id;
  await page.waitForFunction((sel) => { const r = document.querySelector(sel); return !!r?.querySelector(".kp-bsheet__balance") && !r.querySelector(".kp-bsheet__balance-unknown"); }, S.root, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(400);
  const before = await sheetState(page);
  const stake = Number(String(before.stakeValue ?? "").replace(/,/g, ""));
  const expected = {
    place: text(locale, "journey.placeCta", { amount: stake }), refusal: spec.refusal, systemError: text(locale, "error.failSystemError"),
    retryCta: text(locale, "journey.retryCta", { amount: stake }), stake, moneyClaims: MONEY_CLAIM_KEYS.map((k) => text(locale, k)), claimPatterns: CLAIM_PATTERNS[locale],
  };
  const baseline = await observed(BASE, p.ctx, seed.id);
  // The premise first: a sheet that is not healthy, or an opening that dispatched, arms nothing and taps nothing.
  const premiseErrors = [...healthySheetErrors(before, expected.place), ...(watch.requests.length ? ["opening the sheet dispatched a bet action"] : [])];
  const transport = { intercepted: false, parse: null, plantErrors: [], forwarded: null, change: null };
  let original = null, armed = premiseErrors.length === 0;
  const handler = async (route) => {
    const req = route.request();
    if (!armed || req.method() !== "POST" || !req.headers()["next-action"]) return route.fallback();
    const body = req.postDataBuffer();
    if (!body || !body.includes("idempotencyKey")) return route.fallback();
    armed = false;
    transport.intercepted = true;
    const contentType = req.headers()["content-type"];
    const parsed = parseMultipart(body, contentType), af = actionFields(parsed);
    transport.parse = af.ok ? { ok: true, prefix: af.prefix, fieldNames: af.names } : { ok: false, why: af.why };
    original = { parsed, af, contentType, body, actionId: req.headers()["next-action"] };
    if (!af.ok) { transport.forwarded = "aborted: unread encoding"; return route.abort("failed"); }
    if (fake) { transport.forwarded = "fulfill"; return route.fulfill(fake); }
    const planted = plantTransport(parsed, af, mode);
    if (!planted.ok) { transport.plantErrors = [planted.why]; transport.forwarded = "aborted: no plant"; return route.abort("failed"); }
    transport.plantErrors = plantErrors(parsed, af, planted.body, contentType, mode);
    if (transport.plantErrors.length) { transport.forwarded = "aborted: plant changed more"; return route.abort("failed"); }
    transport.change = `${spec.field}: ${planted.change}`;
    transport.bytes = { original: body.length, forwarded: planted.body.length };
    transport.forwarded = "continue";
    return route.continue({ postData: planted.body });
  };
  await page.route("**/*", handler);
  let request = null, answer = { observed: false, why: "not sent" }, raw = null;
  let clickAt = null, msToFrame = null;
  if (!premiseErrors.length) {
    const requestP = page.waitForRequest(isBet, { timeout: 15_000 }).catch(() => null);
    clickAt = Date.now();
    await page.locator(S.place).click();
    request = await requestP;
    if (request) ({ text: raw, ...answer } = await answerOf(request, 60_000, page));
  }
  await page.unroute("**/*", handler);
  transport.released = true;
  await waitFrame(page, "inDoubt", 20_000).catch(() => {});
  if (clickAt !== null) msToFrame = Date.now() - clickAt;
  await page.waitForTimeout(400);
  const after = await sheetState(page);
  const rows = await ownedRows(page).catch(() => null);
  const kept = original?.af?.ok ? rows?.find((r) => r.key === original.af.fields.idempotencyKey) : null;
  const stored = {
    keyKept: !!kept,
    quoteKept: !!kept && kept.quote?.marketId === original.af.fields.marketId && kept.quote?.side === original.af.fields.side && String(kept.quote?.stake) === original.af.fields.stake,
  };
  const afterObs = await observed(BASE, p.ctx, seed.id);
  const value = answer.result?.ok ? answer.result.value : null;
  const outcome = value ? refusalOutcome({ kind: "resolved", value }) : null;
  const e = {
    premiseErrors, before, expected, transport, response: answer, outcome: outcome ? { row: outcome.row } : null,
    requests: watch.requests.length, after, stored,
    money: { positionsDelta: afterObs.positionCount - baseline.positionCount, ledgerDelta: afterObs.betPlacedCount - baseline.betPlacedCount },
  };
  const refusedTile = await shot(page, `${fake ? "control-fake-" : ""}row23-${mode}-${vp.width}x${vp.height}-${locale}-in-doubt`);
  const cell = { tag, mode, locale, viewport: `${vp.width}x${vp.height}`, e, raw, original, page, ctx: p.ctx, watch, seed, baseline, refusedTile, msToFrame, owner: digest(p.userId) };
  if (retry && original?.af?.ok && !fake) {
    const retryP = page.waitForRequest(isBet, { timeout: 15_000 }).catch(() => null);
    await page.locator(S.place).click();
    const retryReq = await retryP;
    const { text: _raw, ...retryAnswer } = retryReq ? await answerOf(retryReq, 60_000, page) : { observed: false };
    await waitFrame(page, "receipt", 30_000).catch(() => {});
    await holdReceipt(page).catch(() => {});
    const sheet = await sheetState(page);
    const retryTile = await shot(page, `row23-${mode}-${vp.width}x${vp.height}-${locale}-retry-${sheet.frame === "receipt" ? "receipt" : "no-receipt"}`);
    const afterRetry = await observed(BASE, p.ctx, seed.id);
    const rf = retryReq ? requestFields(retryReq) : null;
    const f = original.af.fields;
    cell.retry = {
      e: {
        originalKey: f.idempotencyKey,
        retry: { observed: !!retryReq, key: rf?.af?.ok ? rf.af.fields.idempotencyKey : null, fields: rf?.af?.ok ? rf.af.fields : null },
        expectedQuote: { marketId: f.marketId, side: f.side, stake: f.stake, expectedOwnerId: f.expectedOwnerId, funnelOrigin: f.funnelOrigin },
        requests: watch.requests.length, response: retryAnswer, before: baseline, after: afterRetry, sheet,
      },
      sameAction: !!retryReq && retryReq.headers()["next-action"] === original.actionId,
      retryTile,
    };
  }
  watch.stop();
  return cell;
}

const close = async (cell) => { await cell.ctx.close().catch(() => {}); contexts.delete(cell.ctx); };

try {
  PASS = await mintStaffPass(browser, BASE, { phone: "+255700000073", name: "Transport Gate Support" });
  const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  contexts.add(admin);
  await post(BASE, admin, "seed-admin", { role: "ADMIN", phone: "+255700000074", name: "Transport Gate Admin" });
  const catalogue = await post(BASE, admin, "seed-markets");
  await post(BASE, admin, "reset-rate-limits");
  if (!catalogue?.ids?.length) throw new Error("INVALID: the seeded board has no market");

  for (const mode of MODES) for (const vp of VIEWPORTS) for (const locale of LOCALES) {
    const cell = await transportCell(mode, vp, locale);
    const v = transportVerdict(cell.e);
    const answer = cell.e.response;
    const record = {
      cell: `row 23 ${cell.tag}: the altered real request, its real refusal, the in-doubt frame`, state: v.state, errors: v.errors,
      market: digest(cell.seed.id), owner: cell.owner, stake: cell.e.expected.stake,
      transport: { ...cell.e.transport, actionId: digest(cell.original?.actionId), originalKey: digest(cell.original?.af?.fields?.idempotencyKey), expectedOwner: digest(cell.original?.af?.fields?.expectedOwnerId), funnelOrigin: cell.original?.af?.fields?.funnelOrigin ?? null },
      answer: { observed: answer.observed, status: answer.status ?? null, fromServer: answer.serverAddr ?? null, contentType: answer.contentType ?? null, returned: answer.result?.ok ? resultSummary(answer.result.value) : null, why: answer.why ?? answer.result?.why ?? null, timing: answer.timing ?? null, bodySource: answer.bodySource ?? null },
      matrixRow: cell.e.outcome?.row ?? null,
      frame: { frame: cell.e.after.frame, lines: cell.e.after.lines, cta: cell.e.after.cta, stake: cell.e.after.stakeValue, stakeLocked: cell.e.after.stakeLocked, linesView: cell.e.after.linesView },
      stored: cell.e.stored, money: cell.e.money, betActionRequests: cell.e.requests, msToInDoubtFrame: cell.msToFrame, tile: cell.refusedTile,
    };
    cells.push(record);
    result(record.cell, v.state, v.errors.join("; ") || `${record.transport.change}; server answered ${JSON.stringify(record.answer.returned?.error)}; row ${record.matrixRow}`);
    if (cell.e.after.present && cell.e.after.linesView !== "whole") finding(`row 23 ${cell.tag}: the check-your-wallet line is ${cell.e.after.linesView} when the in-doubt frame draws`, `at this size the player does not see the whole line (role=status) without scrolling (tile ${cell.refusedTile})`);
    if (cell.e.after.present && cell.e.after.linesAboveCta === false) finding(`row 23 ${cell.tag}: the check-your-wallet line does not stand above the CTA`, `S8-PLAN's refusal matrix puts the line in the sheet's last rows, above the CTA (tile ${cell.refusedTile})`);
    if (cell.retry) {
      const rv = retryVerdict(cell.retry.e);
      const errors = [...rv.errors, ...(cell.retry.sameAction ? [] : ["the retry did not call the same action"])];
      const state = rv.state === "PASS" && errors.length ? "FAIL" : rv.state;
      const re = cell.retry.e;
      const fresh = re.after.positions.filter((x) => !re.before.positions.some((b) => b.positionId === x.positionId));
      const retryRecord = {
        cell: `row 23 ${cell.tag}: released, the explicit retry reuses the original key — one position, one BET_PLACED, the receipt`, state, errors,
        originalKey: digest(re.originalKey), retryKey: digest(re.retry.key), sameKey: re.retry.key === re.originalKey, sameAction: cell.retry.sameAction,
        returned: re.response.result?.ok ? resultSummary(re.response.result.value) : null, fromServer: re.response.serverAddr ?? null, bodySource: re.response.bodySource ?? null,
        positionsDelta: re.after.positionCount - re.before.positionCount, ledgerDelta: re.after.betPlacedCount - re.before.betPlacedCount,
        newPosition: fresh.map((x) => ({ position: digest(x.positionId), key: digest(x.key) })), receipt: { frame: re.sheet.frame, ticket: digest(re.sheet.ticketId) },
        betActionRequests: re.requests, tile: cell.retry.retryTile,
      };
      cells.push(retryRecord);
      result(retryRecord.cell, state, errors.join("; ") || `key ${retryRecord.originalKey} = ${retryRecord.retryKey}, replayed ${retryRecord.returned?.replayed}`);
    } else if (v.state !== "INVALID") result(`row 23 ${cell.tag}: explicit retry`, "NOT MEASURED", "the original request was not read");
    // Keep the first real refusal of each mode, and the first real original body, for the live controls.
    if (v.state === "PASS" && cell.raw && !captured.answers[mode]) captured.answers[mode] = { body: cell.raw, contentType: cell.e.response.contentType };
    if (v.state === "PASS" && !captured.original) captured.original = { body: cell.original.body, contentType: cell.original.contentType };
    await close(cell);
  }

  // ── CONTROL 1 · a FULFILLED fake of the real answer must be detected and fail ──
  const real = captured.answers["invalid-side"] ?? captured.answers["missing-params"];
  if (!real) result("CONTROL fake fulfilled reply", "NOT MEASURED", "no real refusal was captured to copy");
  else {
    const mode = captured.answers["invalid-side"] ? "invalid-side" : "missing-params";
    // The real refusal's MODEL rows, re-served: a dev server's debug rows point at chunks its debug channel sends for THAT
    // request id, which a re-served copy never gets (measured: the page then never settled the call, and the retry stayed
    // disabled behind the 20 s watchdog). Without them the page settles the copy exactly as it settled the original.
    const fakeBody = real.body.split("\n").filter((line) => !/^[0-9a-f]+:[A-Z]/.test(line)).join("\n");
    const cell = await transportCell(mode, VIEWPORTS[0], "en", { fake: { status: 200, contentType: real.contentType ?? "text/x-component", body: fakeBody }, retry: false });
    const honest = transportVerdict(cell.e);
    const mislabelled = transportVerdict({ ...cell.e, transport: { ...cell.e.transport, forwarded: "continue" } });
    const detected = honest.state === "FAIL" && mislabelled.state === "FAIL" && mislabelled.errors.some((x) => x.startsWith("FABRICATED"));
    const pageLikeAPass = cell.e.after.frame === "inDoubt" && cell.e.after.cta?.enabled === true && cell.e.money.positionsDelta === 0;
    const record = {
      control: "a fulfilled copy of the real refusal (never forwarded) is detected and fails", state: detected ? "PASS" : "FAIL",
      honest, mislabelled, pageSaw: { frame: cell.e.after.frame, lines: cell.e.after.lines, cta: cell.e.after.cta, msToInDoubtFrame: cell.msToFrame }, pageLikeAPass,
      fromServer: cell.e.response.serverAddr ?? null, returnedToPage: cell.e.response.result?.ok ? resultSummary(cell.e.response.result.value) : null,
      money: cell.e.money, tile: cell.refusedTile,
    };
    controls.push(record);
    result(`CONTROL ${record.control}`, record.state, `as recorded: ${honest.state} (${honest.errors.join("; ")}); with the record claiming a forward: ${mislabelled.state} (${mislabelled.errors.join("; ")}); the page itself showed ${cell.e.after.frame} with its retry ${cell.e.after.cta?.enabled ? "enabled" : "disabled"}${pageLikeAPass ? " — on screen indistinguishable from a real refusal" : ""}`);
    await close(cell);
  }

  // ── CONTROL 2 · ambiguous encodings planted into the REAL captured body are INVALID ──
  if (!captured.original) result("CONTROL ambiguous encodings", "NOT MEASURED", "no real request body was captured");
  else {
    const { body, contentType } = captured.original;
    const parsed = parseMultipart(body, contentType), af = actionFields(parsed);
    const same = parsed.ok && af.ok;
    const withParts = (edit) => buildMultipart(parsed.boundary, edit(parsed.parts.map((p) => p.raw)), parsed.epilogue);
    const marketPart = parsed.parts.find((p) => p.name === `${af.prefix}marketId`)?.raw;
    const plants = [
      ["the marketId field doubled", withParts((r) => [...r, marketPart]), contentType],
      ["a second FormData argument in the root", withParts((r) => r.map((x) => (x.startsWith('Content-Disposition: form-data; name="0"') ? x.replace(/\["\$K([0-9a-f]+)"\]$/, '["$K$1","$K$1"]') : x))), contentType],
      ["a field moved outside the referenced FormData", withParts((r) => r.map((x) => x.replace(`name="${af.prefix}side"`, `name="9${af.prefix}side"`))), contentType],
      ["an unknown field", withParts((r) => [...r.slice(0, 1), 'Content-Disposition: form-data; name="' + af.prefix + 'note"\r\n\r\nx', ...r.slice(1)]), contentType],
      ["a urlencoded content type", body, "application/x-www-form-urlencoded"],
      ["LF-only framing", Buffer.from(body.toString("latin1").replaceAll("\r\n", "\n"), "latin1"), contentType],
    ];
    const outcomes = plants.map(([label, planted, ct]) => {
      const pp = parseMultipart(planted, ct), pa = actionFields(pp);
      const v = transportVerdict({ before: { present: true, frame: "edit", lines: [], cta: { text: "x", enabled: true }, stakeValue: "500", stakeLocked: false, balanceKnown: true }, expected: { place: "x" }, transport: { intercepted: true, parse: pa.ok ? { ok: true } : { ok: false, why: pa.why } } });
      return { plant: label, read: pa.ok, why: pa.ok ? null : pa.why, verdict: v.state };
    });
    const ok = same && outcomes.every((o) => !o.read && o.verdict === "INVALID");
    controls.push({ control: "ambiguous or unknown encodings planted into the real captured body are INVALID", state: ok ? "PASS" : "FAIL", originalRead: same, outcomes });
    result("CONTROL ambiguous or unknown encodings planted into the real captured body are INVALID", ok ? "PASS" : "FAIL", outcomes.map((o) => `${o.plant}: ${o.verdict} (${o.why})`).join("; "));
  }
} catch (error) {
  result("drive stopped on an invalid premise or a runtime error", String(error?.message ?? error).startsWith("INVALID") ? "INVALID" : "FAIL", String(error?.stack ?? error).split("Call log:")[0].trim().slice(0, 1200));
} finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
  writeEvidence(OUT, {
    gate: "S8 WP11 row 23 (missing parameters; invalid side), actual malformed action transport", base: BASE, identity: pre.identity, startedAt, finishedAt: new Date().toISOString(),
    driver: { transport: fileDigest(fileURLToPath(import.meta.url)), kit: fileDigest(`${ROOT}/scripts/live/bet-sheet-gates.mjs`) },
    engine: "chromium", cells, controls, results, findings, tiles, console: consoleRows,
  });
}
const tally = (s) => results.filter((r) => r.state === s).length;
console.log(`qa:bet-sheet-transport: ${tally("PASS")} passed, ${tally("FAIL")} failed, ${tally("INVALID")} invalid, ${tally("NOT MEASURED")} not measured, ${findings.length} findings, ${tiles.length} tiles. Read every tile: ${OUT}`);
process.exitCode = exitCodeFor(results);
