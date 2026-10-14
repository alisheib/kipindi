/**
 * S8 · THE PENDING DEPOSIT'S AGE BANDS, MEASURED IN REAL ELAPSED TIME (S8-PLAN A10) — the one local half-hour
 * observation `docs/qa/s8-outstanding-browser-proof-plan-20261014.md` § "Pending age bands" specifies.
 *
 *   KP_BASE=http://localhost:3055 npm run qa:bet-sheet-pending-age -- <OUTPUT_DIR_OUTSIDE_THE_REPOSITORY>
 *   npm run qa:bet-sheet-pending-age -- --self-test      the pure verdicts against planted failures (no server, no browser)
 *
 * WHAT IT DOES. Five synthetic PLAYER accounts (`seed-admin`, as qa:bet-sheet's `freshPlayer` makes them) — en, sw and zh
 * holding TZS 1,200, and two controls holding TZS 0 and one shilling under the question's minimum stake — each make ONE
 * deposit of the deposit minimum through the actual /wallet/deposit form and its confirm dialog, while the real control
 * plane runs the Mock provider with Demo async on: the mock rail answers PENDING (payments.ts), so the row stays
 * PROCESSING and nothing is credited. Each account then opens the journey bet sheet on one question and asks for TZS 5,000,
 * and the sheet is left open while the deposit ages — for real — through 10 and 30 minutes. Every read of a frame is
 * bracketed by two authenticated reads of `/api/markets/:id/sheet?me=1`, whose `serverNow` and the row's own `createdAt`
 * are the server-reported age. An in-page recorder stamps the moment each band's words change.
 *
 * WHAT IT REQUIRES. Under 10 minutes the frame says `common.depositPendingBody`; from 10 `journey.lowPendingWaitBody`; from
 * 30 `journey.lowPendingLateTitle` + `lowPendingLateBody`, offering "bet what you have" at the stake the source's own
 * `shortfallPlan` derives from the same facts — and the two controls offer no such thing. In every band the CTA is
 * disabled, nothing offers a second deposit, no server action carrying money fields leaves the page, the receipts book
 * holds only the original deposit, the same PROCESSING row (txn id, amount, createdAt) is read throughout, and the wallet,
 * the own positions and the BET_PLACED rows stay where they were — until ONE explicit tap on the late alternative (en),
 * which must place exactly one bet and leave the original deposit PROCESSING and uncredited. Long and late frames are
 * tiled at 320/360/390/1280 in en/sw/zh; every file name carries the age it was read at. Read every tile.
 *
 * ⛔ REAL TIME ONLY. No page.clock, no server clock fixture, no redated row, no shortened constant: the two band edges are
 * READ from `sheet-state.ts` and the run is refused unless they are A10's 10 and 30 minutes. No webhook, no provider
 * approval, no second payment. A boundary the schedule missed is NOT MEASURED, never inferred from the other side.
 *
 * ⚠️ THE LOCAL MOCK'S OWN 30-MINUTE TIMER. In TEST money mode `reconcileStalePayments` (wallet-service.ts) FAILS a mock
 * PROCESSING deposit at the first lifecycle payment sweep after 30 minutes (its UNSUPPORTED arm; in LIVE mode, and on a
 * real gateway still saying PENDING, the row stays PROCESSING). Sweeps run only inside lifecycle passes, and /api/health
 * stamps every pass (`leadership.lifecycle.expiresInSec` = the pass start + LEASE_MS). So the deposits are made
 * PASS_LEAD_MS after a pass, which puts 30:00 that long after a pass thirty minutes later, and the late band is read
 * before the next pass can sweep. That only improves the odds: every late cell is PROVEN by reading the same PROCESSING
 * row AFTER its frame, and a cell whose row is gone is NOT MEASURED. After the measurement the driver keeps reading each
 * row until that timer takes it out of PROCESSING (within the watchdog) and checks it credited nothing — for the record.
 *
 * Premise: `http://localhost:PORT` exactly, the in-memory store (no DATABASE_URL anywhere), a journey rollout a staff pass
 * can see, DISABLE_ADMIN_TOTP=true, the Mock provider already selected, a question open for the whole run, and nobody else
 * on the server: the user count and the uptime are watched to the end, and a foreign account or a restart voids the run.
 * Watchdog: KP_WATCHDOG_MIN (40) minutes after the deposits; KP_SETUP_MIN (25) for the setup. Demo async is restored as found.
 * KP_SMOKE=1 rehearses every door, read and tile up to the fresh frame, then stops: it measures NO edge (exit 3).
 * Exit 0 every cell proved; 1 a defect; 2 an invalid target or premise; 3 a cell NOT MEASURED.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { premise, mintStaffPass, LOCALE_COOKIE, SESSION_COOKIE } from "./journey-pass.mjs";
import { BET_SHEET_SELECTORS as S, betSheetDomProbe, betSheetDomVerdict } from "./bet-sheet-cells.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const DRIVER = fileURLToPath(import.meta.url);
const SELF_TEST = process.argv.includes("--self-test");
const SMOKE = process.env.KP_SMOKE === "1";

/* ─── The fixed shape of the observation (none of these is a product rule) ──────────────────────────────────────── */

const REQUESTED_STAKE = 5_000; // what each sheet asks for: above every wallet here, so the deposit's notice draws
const MAIN_SPENDABLE = 1_200; // the plan's example: above the question's minimum stake, below the request
const LOCALES = ["en", "sw", "zh"];
const WIDTHS = [320, 360, 390, 1280];
const viewportFor = (width) => ({ width, height: width <= 360 ? 640 : width === 390 ? 844 : 900 });
const BEFORE_LEAD_MS = 8_000; // "just before" a boundary
const AFTER_SETTLE_MS = 4_000; // "just after": past the edge by the sheet's clock-offset error and its 250 ms tick
const SWITCH_EARLY_TOLERANCE_MS = 1_000; // the in-page switch, on the same machine clock as the server
const PASS_LEAD_MS = 10_000; // deposits are made this long after a lifecycle pass (header)
const LATE_BURST_BUDGET_MS = 35_000; // the late reads, tiles and tap must fit before the next pass
const PRE_LATE_MS = 60_000; // a full money read this long before 30:00
const MONITOR_EVERY_MS = 90_000;
const MONITOR_QUIET_MS = 25_000; // no continuity read this close to a boundary
const HEALTH_EVERY_MS = 15_000;
const MONEY_FIELDS = /idempotencyKey|msisdn|marketId|provider/;

/* ─── Pure verdicts (the --self-test plants failures in each) ───────────────────────────────────────────────────── */

export const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** The minutes:seconds the evidence speaks in: "29m58.3s". */
export function ageLabel(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "?";
  const sign = ms < 0 ? "-" : "";
  const a = Math.abs(ms), m = Math.floor(a / 60_000), s = (a - m * 60_000) / 1000;
  return `${sign}${m}m${s.toFixed(1).padStart(4, "0")}s`;
}
export const ageFile = (ms) => (Number.isFinite(ms) ? ageLabel(Math.floor(ms / 1000) * 1000).replace(".0s", "s") : "unknown");

/** The five sentences a pending frame can say, for one locale, filled exactly as the sheet fills them. */
export function bandTexts(t, formatTzs, fill, depositAmount) {
  return {
    pendingTitle: fill(t.journey.lowPendingTitle, { amount: formatTzs(depositAmount) }),
    freshBody: t.common.depositPendingBody,
    waitBody: t.journey.lowPendingWaitBody,
    lateTitle: t.journey.lowPendingLateTitle,
    lateBody: t.journey.lowPendingLateBody,
  };
}

/** Pairs where one sentence contains another — a classification that could not tell them apart. */
export function textsAmbiguity(texts) {
  const out = [];
  for (const [a, x] of Object.entries(texts)) for (const [b, y] of Object.entries(texts)) {
    if (a !== b && (!norm(x) || norm(x).includes(norm(y)))) out.push(`${a} contains ${b}`);
  }
  return out;
}

/** Which band the callout's words are: exactly one band's two sentences and none of the others', or "unknown". */
export function classifyBand(calloutText, texts) {
  const text = norm(calloutText);
  if (!text) return "unknown";
  const has = (s) => text.includes(norm(s));
  const title = has(texts.pendingTitle), fresh = has(texts.freshBody), wait = has(texts.waitBody);
  const lateTitle = has(texts.lateTitle), lateBody = has(texts.lateBody);
  if (title && fresh && !wait && !lateTitle && !lateBody) return "fresh";
  if (title && wait && !fresh && !lateTitle && !lateBody) return "long";
  if (lateTitle && lateBody && !title && !fresh && !wait) return "late";
  return "unknown";
}

/**
 * ONE READ OF ONE ACCOUNT'S OPEN SHEET. `s` = { lang, dom, factsBefore, factsAfter, receipts?, observer?, traffic };
 * `x` = { band, locale, role, original{txnId,amount,createdAt}, baseline{balance,positionCount,betPlacedCount},
 * instead{stake,text}|null, texts, window:[lo,hi]|null, money:boolean }.
 * ⛔ MONEY defects — another PROCESSING row, a moved wallet/position/ledger, a second deposit in the receipts book, a
 * server action carrying money fields, a navigation to /wallet/deposit — fail whatever else is true. A PREMISE gap — a
 * failed read, a wrong <html lang>, the original row no longer PROCESSING, a read outside the band's window — makes the
 * read NOT MEASURED, with its frame defects kept as notes, never a pass. Otherwise any frame defect fails.
 */
export function judgeSample(s, x) {
  const money = [], frame = [], premiseGaps = [];
  const created = Date.parse(x.original.createdAt);
  const age = (f) => (f?.ok && Number.isFinite(f.serverNow) ? f.serverNow - created : null);
  const ageA = age(s.factsBefore), ageB = age(s.factsAfter);
  if (s.lang !== x.locale) premiseGaps.push(`<html lang> is ${JSON.stringify(s.lang)}, expected ${x.locale}`);
  for (const [name, f] of [["before", s.factsBefore], ["after", s.factsAfter]]) {
    if (!f?.ok) { premiseGaps.push(`the facts read ${name} the frame failed (${f?.status ?? "no answer"})`); continue; }
    if (f.viewerMatches !== true) premiseGaps.push(`the facts read ${name} the frame answered for another viewer`);
    if (!f.pending) premiseGaps.push(`facts ${name}: no PROCESSING deposit — the original row has left PROCESSING`);
    else if (f.pending.txnId !== x.original.txnId || f.pending.amount !== x.original.amount || f.pending.createdAt !== x.original.createdAt) {
      money.push(`facts ${name}: the PROCESSING row is ${f.pending.txnId} (${f.pending.amount}, ${f.pending.createdAt}), not the original ${x.original.txnId}`);
    }
    if (f.balance !== x.baseline.balance) money.push(`facts ${name}: wallet balance ${f.balance}, was ${x.baseline.balance}`);
    if (f.walletStatus !== "ACTIVE") money.push(`facts ${name}: wallet status ${f.walletStatus}`);
  }
  if (x.window && (ageA === null || ageB === null || ageA < x.window[0] || ageB >= x.window[1])) {
    premiseGaps.push(`read at ${ageLabel(ageA)}–${ageLabel(ageB)}, outside the ${x.band} window ${ageLabel(x.window[0])}–${x.window[1] === Infinity ? "∞" : ageLabel(x.window[1])}`);
  }
  if (x.money) {
    if (!s.receipts?.ok) premiseGaps.push(`the receipts book was not read (${s.receipts?.status ?? "no answer"})`);
    else if (s.receipts.txnIds.length !== 1 || s.receipts.txnIds[0] !== x.original.txnId) {
      money.push(`the receipts book holds ${JSON.stringify(s.receipts.txnIds)}, not only the original ${x.original.txnId}: a second provider request`);
    }
    if (!s.observer?.ok) premiseGaps.push(`own positions were not read (${s.observer?.status ?? "no answer"})`);
    else if (s.observer.positionCount !== x.baseline.positionCount || s.observer.betPlacedCount !== x.baseline.betPlacedCount) {
      money.push(`own positions ${s.observer.positionCount} / BET_PLACED ${s.observer.betPlacedCount}, were ${x.baseline.positionCount} / ${x.baseline.betPlacedCount}`);
    }
  }
  const t = s.traffic ?? {};
  if (t.moneyActions) money.push(`${t.moneyActions} server action POST(s) carrying money fields left the page: an automatic commitment or a new provider request`);
  if (t.depositNavigations) money.push(`${t.depositNavigations} request(s) for /wallet/deposit`);
  if (t.pageErrors) frame.push(`${t.pageErrors} uncaught page error(s)`);
  const d = s.dom;
  let band = null;
  if (!d?.present) frame.push("the sheet is not on screen");
  else {
    band = classifyBand(d.calloutText, x.texts);
    if (d.frame !== "pending") frame.push(`frame ${d.frame}, expected pending`);
    if (band !== x.band) frame.push(`band ${band}, expected ${x.band}`);
    if (d.placeDisabled !== true) frame.push("the place CTA is enabled");
    if (d.depositVisible || d.depositLinks) frame.push("a second deposit is offered");
    if (!String(d.trackHref ?? "").endsWith(`/wallet/receipt/${encodeURIComponent(x.original.txnId)}`)) {
      frame.push(`"track the payment" links ${JSON.stringify(d.trackHref)}, not the original row`);
    }
    const want = x.band === "late" && !!x.instead;
    if (!!d.insteadVisible !== want) {
      frame.push(want ? "the late band offers no bet-what-you-have" : `"bet instead" is offered in the ${x.band} band${x.role === "main" ? "" : ` to a ${x.role} wallet`}`);
    } else if (want && !norm(d.insteadText).includes(norm(x.instead.text))) {
      frame.push(`"bet instead" reads ${JSON.stringify(norm(d.insteadText))}, expected ${JSON.stringify(x.instead.text)}`);
    }
    for (const e of d.domErrors ?? []) frame.push(`layout: ${e}`);
  }
  const state = money.length ? "FAIL" : premiseGaps.length ? "NOT MEASURED" : frame.length ? "FAIL" : "PASS";
  return { state, band, ageA, ageB, money, frame, premise: premiseGaps };
}

/**
 * A BOUNDARY from its two reads. `before` must have been read wholly before the edge (its LATER bracket below it) and
 * `after` wholly past it (its EARLIER bracket at or above it); a read on the wrong side is NOT MEASURED — the schedule
 * missed it — and never inferred from the other read. The old band still showing inside the settle window is NOT
 * MEASURED; past it, the read's own FAIL stands.
 */
export function judgeBoundary(before, after, edgeMs, settleMs, oldBand) {
  const pick = (j) => ({ state: j.state, why: [...j.money, ...j.frame, ...j.premise].join("; ") });
  let b, a;
  if (!before) b = { state: "NOT MEASURED", why: "no read before the edge" };
  else if (before.ageB === null || before.ageB >= edgeMs) b = { state: "NOT MEASURED", why: `the read before ${ageLabel(edgeMs)} ended at ${ageLabel(before.ageB)}: the negative side was missed` };
  else b = pick(before);
  if (!after) a = { state: "NOT MEASURED", why: "no read after the edge" };
  else if (after.ageA === null || after.ageA < edgeMs) a = { state: "NOT MEASURED", why: `the read after ${ageLabel(edgeMs)} began at ${ageLabel(after.ageA)}: still before the edge` };
  else if (after.band === oldBand && after.ageA < edgeMs + settleMs && !after.money.length) a = { state: "NOT MEASURED", why: `still ${oldBand} at ${ageLabel(after.ageA)}, inside the ${settleMs} ms settle window` };
  else a = pick(after);
  return { before: b, after: a };
}

/**
 * WHEN THE WORDS CHANGED, from the in-page recorder (one entry per change of frame, callout text or "bet instead").
 * The switch must land in [edge − tolerance, edge + settle] of the deposit's age and never go back.
 */
export function judgeSwitch(log, createdMs, texts, oldBand, newBand, edgeMs, settleMs, toleranceMs) {
  const rows = (log ?? []).map((e) => ({ ...e, band: e.frame === "pending" ? classifyBand(e.text, texts) : `frame:${e.frame}` }));
  const firstNew = rows.findIndex((r) => r.band === newBand);
  if (firstNew < 0) return { state: "NOT MEASURED", why: `the recorder saw no ${newBand} words` };
  const priorOld = rows.slice(0, firstNew).some((r) => r.band === oldBand);
  if (!priorOld) return { state: "NOT MEASURED", why: `the recorder saw no ${oldBand} words before ${newBand}` };
  const switchAgeMs = rows[firstNew].t - createdMs;
  const back = rows.slice(firstNew + 1).find((r) => r.band === oldBand);
  const prior = rows[firstNew - 1];
  const problems = [];
  if (switchAgeMs < edgeMs - toleranceMs) problems.push(`the ${newBand} words appeared at ${ageLabel(switchAgeMs)}, before ${ageLabel(edgeMs)}`);
  if (switchAgeMs > edgeMs + settleMs) problems.push(`the ${newBand} words appeared only at ${ageLabel(switchAgeMs)}`);
  if (back) problems.push(`the ${oldBand} words came back at ${ageLabel(back.t - createdMs)}`);
  if (prior.band !== oldBand) problems.push(`the words just before the switch were ${prior.band}, not ${oldBand}`);
  return { state: problems.length ? "FAIL" : "PASS", switchAgeMs, why: problems.join("; ") };
}

/**
 * THE EXPLICIT LATE TAP: exactly one money-carrying action, one new own position and one BET_PLACED row, the wallet down by
 * exactly the alternative's stake (so the deposit was not credited), the receipts book unchanged, and the original row
 * still the PROCESSING one. A row gone from PROCESSING with no credit is NOT MEASURED; a credit is a FAIL.
 */
export function judgeTap(t, x) {
  const money = [], premiseGaps = [];
  const fb = t.before?.facts, fa = t.after?.facts, ob = t.before?.observer, oa = t.after?.observer;
  if (!fb?.ok || !fa?.ok || !ob?.ok || !oa?.ok) premiseGaps.push("a read around the tap failed");
  if (t.moneyActions !== 1) money.push(`${t.moneyActions} money-carrying action POST(s), expected exactly 1`);
  if (t.frame !== "receipt") money.push(`the sheet shows ${t.frame} after the tap, not the receipt`);
  if (ob?.ok && oa?.ok) {
    if (oa.positionCount - ob.positionCount !== 1) money.push(`own positions ${ob.positionCount} → ${oa.positionCount}`);
    if (oa.betPlacedCount - ob.betPlacedCount !== 1) money.push(`BET_PLACED ${ob.betPlacedCount} → ${oa.betPlacedCount}`);
    const fresh = (oa.positions ?? []).filter((p) => !(ob.positions ?? []).some((q) => q.positionId === p.positionId));
    if (fresh.length !== 1 || !fresh[0].keyHash) money.push("the new position is not exactly one keyed position");
  }
  if (fb?.ok && fa?.ok) {
    if (fa.balance !== fb.balance - x.instead.stake) money.push(`wallet ${fb.balance} → ${fa.balance}: the bet must take exactly ${x.instead.stake} and the deposit must stay uncredited`);
    if (!fa.pending) premiseGaps.push("after the tap the original row is no longer PROCESSING");
    else if (fa.pending.txnId !== x.original.txnId || fa.pending.amount !== x.original.amount || fa.pending.createdAt !== x.original.createdAt) money.push(`after the tap the PROCESSING row is ${fa.pending.txnId}`);
  }
  if (t.receipts && (!t.receipts.ok || t.receipts.txnIds.length !== 1 || t.receipts.txnIds[0] !== x.original.txnId)) {
    if (!t.receipts.ok) premiseGaps.push("the receipts book was not read after the tap");
    else money.push(`after the tap the receipts book holds ${JSON.stringify(t.receipts.txnIds)}`);
  }
  return { state: money.length ? "FAIL" : premiseGaps.length ? "NOT MEASURED" : "PASS", money, premise: premiseGaps };
}

/** Distinct lifecycle pass starts from health reads (one pass is stamped by every read until the next). */
export function distinctPasses(reads) {
  const out = [];
  for (const r of reads) if (Number.isFinite(r?.lastPassAt) && !out.some((p) => Math.abs(p - r.lastPassAt) <= 1_500)) out.push(r.lastPassAt);
  return out.sort((a, b) => a - b);
}
/** The measured pass period: the median gap between consecutive passes near the nominal one, else the nominal. */
export function passPeriod(passes, nominal) {
  const gaps = [];
  for (let i = 1; i < passes.length; i++) { const g = passes[i] - passes[i - 1]; if (g > nominal * 0.5 && g < nominal * 1.5) gaps.push(g); }
  if (!gaps.length) return nominal;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}
/** The first pass predicted strictly after `t`, from the last observed pass at or before it. */
export function nextPassAfter(passes, t, period) {
  const known = passes.filter((p) => p <= t);
  let n = known.length ? known[known.length - 1] : passes[passes.length - 1];
  if (!Number.isFinite(n)) return null;
  while (n <= t) n += period;
  return n;
}
/** The click time: `lead` after a pass, the first such moment at least `prep` from now. */
export function alignedClickAt(lastPassAt, period, nowMs, leadMs, prepMs) {
  let t = lastPassAt + leadMs;
  while (t < nowMs + prepMs) t += period;
  return t;
}

/* ─── The product's own words, bands and plan, bundled from the source this checkout holds ──────────────────────── */

async function productHelpers() {
  const { build } = await import("esbuild");
  const entry = [
    'export { dict } from "./src/lib/i18n-dict.ts";',
    'export { formatTzs, fill } from "./src/lib/utils.ts";',
    'export { pendingBand, PENDING_LONG_MS, PENDING_LATE_MS } from "./src/lib/journey/sheet-state.ts";',
    'export { shortfallPlan } from "./src/lib/journey/shortfall.ts";',
    'export { DEPOSIT_MIN_TZS } from "./src/lib/server/validators.ts";',
  ].join("\n");
  const out = await build({ stdin: { contents: entry, loader: "ts", resolveDir: ROOT }, bundle: true, write: false, platform: "node", format: "cjs", tsconfig: join(ROOT, "tsconfig.json"), logLevel: "silent" });
  const module = { exports: {} };
  new Function("module", "exports", "require", out.outputFiles[0].text)(module, module.exports, createRequire(join(ROOT, "package.json")));
  return module.exports;
}

/** A constant read from its own line of source; the run refuses when the line is not where it was. */
function sourceConstant(file, pattern) {
  const m = readFileSync(join(ROOT, file), "utf8").match(pattern);
  if (!m) throw new Error(`${file}: ${pattern} not found`);
  return Function(`"use strict"; return (${m[1]});`)();
}
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/* ─── --self-test ────────────────────────────────────────────────────────────────────────────────────────────────── */

async function selfTest() {
  const H = await productHelpers();
  let passed = 0, failed = 0;
  const check = (label, ok, detail = "") => { if (ok) passed++; else { failed++; console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); } };
  const LONG = H.PENDING_LONG_MS, LATE = H.PENDING_LATE_MS;
  check("the product's band edges are A10's 10 and 30 minutes", LONG === 600_000 && LATE === 1_800_000, `${LONG}/${LATE}`);
  const created = "2026-10-14T08:00:00.000Z", c = Date.parse(created);
  for (const [ms, want] of [[LONG - 1, "fresh"], [LONG, "long"], [LATE - 1, "long"], [LATE, "late"]]) {
    check(`the product's pendingBand at ${ageLabel(ms)} is ${want}`, H.pendingBand(created, c + ms) === want);
  }
  const original = { txnId: "txn_SELFTEST01", amount: H.DEPOSIT_MIN_TZS, createdAt: created };
  for (const locale of LOCALES) {
    const t = H.dict[locale], texts = bandTexts(t, H.formatTzs, H.fill, original.amount);
    check(`${locale}: the five sentences are pairwise distinguishable`, textsAmbiguity(texts).length === 0, textsAmbiguity(texts).join(", "));
    const track = t.journey.lowPendingTrack;
    const callout = { fresh: `${texts.pendingTitle}\n${texts.freshBody}\n${track}`, long: `${texts.pendingTitle}\n${texts.waitBody}\n${track}`, late: `${texts.lateTitle}\n${texts.lateBody}\n${track}` };
    for (const band of ["fresh", "long", "late"]) check(`${locale}: the ${band} callout classifies as ${band}`, classifyBand(callout[band], texts) === band);
    check(`${locale} RED: fresh title over the wait body AND the live sentence is unknown`, classifyBand(`${texts.pendingTitle} ${texts.freshBody} ${texts.waitBody}`, texts) === "unknown");
    check(`${locale} RED: the late title over the live sentence is unknown`, classifyBand(`${texts.lateTitle} ${texts.freshBody}`, texts) === "unknown");
    check(`${locale} RED: an empty callout is unknown`, classifyBand("", texts) === "unknown");
    const insteadStake = MAIN_SPENDABLE;
    const instead = { stake: insteadStake, text: H.fill(t.journey.lowBetInstead, { amount: H.formatTzs(insteadStake) }) };
    const baseline = { balance: MAIN_SPENDABLE, positionCount: 0, betPlacedCount: 0 };
    const good = (band, ageMs, role = "main") => {
      const want = band === "late" && role === "main";
      const facts = (at) => ({ ok: true, viewerMatches: true, serverNow: c + at, pending: { ...original }, balance: role === "main" ? baseline.balance : 0, walletStatus: "ACTIVE" });
      return {
        lang: locale,
        dom: { present: true, frame: "pending", calloutText: callout[band], placeDisabled: true, depositVisible: false, depositLinks: 0,
          insteadVisible: want, insteadText: want ? `${instead.text}\nIf you win ≈ TZS 2,000` : null, trackHref: `/wallet/receipt/${original.txnId}`, domErrors: [] },
        factsBefore: facts(ageMs), factsAfter: facts(ageMs + 300),
        receipts: { ok: true, txnIds: [original.txnId] }, observer: { ok: true, positionCount: 0, betPlacedCount: 0, positions: [] },
        traffic: { moneyActions: 0, otherActions: 0, depositNavigations: 0, pageErrors: 0 },
      };
    };
    const expect = (band, role = "main", window = null) => ({ band, locale, role, original, baseline: role === "main" ? baseline : { ...baseline, balance: 0 }, instead: role === "main" ? instead : null, texts, window, money: true });
    const at = { fresh: 30_000, long: LONG + 60_000, late: LATE + 5_000 };
    for (const band of ["fresh", "long", "late"]) {
      check(`${locale}: a clean ${band} read passes`, judgeSample(good(band, at[band]), expect(band)).state === "PASS", JSON.stringify(judgeSample(good(band, at[band]), expect(band))));
      check(`${locale}: a clean ${band} read of the zero control passes`, judgeSample(good(band, at[band], "zero"), expect(band, "zero")).state === "PASS");
    }
    const plant = (label, band, mutate, want, role = "main", window = null) => {
      const s = good(band, at[band], role); mutate(s);
      const got = judgeSample(s, expect(band, role, window));
      check(`${locale} RED ${label} → ${want}`, got.state === want, `${got.state}: ${[...got.money, ...got.frame, ...got.premise].join("; ")}`);
    };
    plant("a wrong band text (the long body under 10 minutes)", "fresh", (s) => { s.dom.calloutText = callout.long; }, "FAIL");
    plant("the late words at 20 minutes", "long", (s) => { s.dom.calloutText = callout.late; }, "FAIL");
    plant("an enabled CTA", "long", (s) => { s.dom.placeDisabled = false; }, "FAIL");
    plant("a second deposit offer", "late", (s) => { s.dom.depositVisible = true; }, "FAIL");
    plant("a deposit link in the sheet", "fresh", (s) => { s.dom.depositLinks = 1; }, "FAIL");
    plant("a second provider request (a second deposit in the book)", "late", (s) => { s.receipts.txnIds = [original.txnId, "txn_SECOND"]; }, "FAIL");
    plant("a money-carrying action POST", "long", (s) => { s.traffic.moneyActions = 1; }, "FAIL");
    plant("a request for /wallet/deposit", "fresh", (s) => { s.traffic.depositNavigations = 1; }, "FAIL");
    plant("another PROCESSING row", "long", (s) => { s.factsAfter.pending = { ...original, txnId: "txn_OTHER" }; }, "FAIL");
    plant("a rewritten createdAt", "long", (s) => { s.factsBefore.pending = { ...original, createdAt: "2026-10-14T07:00:00.000Z" }; }, "FAIL");
    plant("a credited wallet", "late", (s) => { s.factsAfter.balance += original.amount; }, "FAIL");
    plant("a new own position", "late", (s) => { s.observer.positionCount = 1; s.observer.betPlacedCount = 1; }, "FAIL");
    plant('"bet instead" in the long band', "long", (s) => { s.dom.insteadVisible = true; s.dom.insteadText = instead.text; }, "FAIL");
    plant('no "bet instead" in the late band', "late", (s) => { s.dom.insteadVisible = false; }, "FAIL");
    plant('"bet instead" at the wrong amount', "late", (s) => { s.dom.insteadText = H.fill(t.journey.lowBetInstead, { amount: H.formatTzs(1_000) }); }, "FAIL");
    plant('"bet instead" offered to the zero control', "late", (s) => { s.dom.insteadVisible = true; s.dom.insteadText = instead.text; }, "FAIL", "zero");
    plant('"track the payment" pointing elsewhere', "fresh", (s) => { s.dom.trackHref = "/wallet/receipt/txn_OTHER"; }, "FAIL");
    plant("a layout defect", "late", (s) => { s.dom.domErrors = ["sheet horizontal overflow 12px"]; }, "FAIL");
    plant("an uncaught page error", "long", (s) => { s.traffic.pageErrors = 1; }, "FAIL");
    plant("the original row gone from PROCESSING", "late", (s) => { s.factsAfter.pending = null; }, "NOT MEASURED");
    plant("the original row gone AND a credit", "late", (s) => { s.factsAfter.pending = null; s.factsAfter.balance += original.amount; }, "FAIL");
    plant("the wrong <html lang>", "long", (s) => { s.lang = locale === "en" ? "sw" : "en"; }, "NOT MEASURED");
    plant("a failed facts read", "fresh", (s) => { s.factsBefore = { ok: false, status: 429 }; }, "NOT MEASURED");
    plant("a read outside its band's window", "late", () => {}, "NOT MEASURED", "main", [LATE + 60_000, Infinity]);
    plant("the sheet gone", "long", (s) => { s.dom = { present: false }; }, "FAIL");

    // Boundaries: both sides judged by the bracket, never inferred.
    const j = (band, ageMs, mutate) => { const s = good(band, ageMs); if (mutate) mutate(s); return judgeSample(s, expect(band)); };
    const fine = judgeBoundary(j("fresh", LONG - 8_000), j("long", LONG + 4_000), LONG, AFTER_SETTLE_MS, "fresh");
    check(`${locale}: a clean 10-minute boundary passes both sides`, fine.before.state === "PASS" && fine.after.state === "PASS", JSON.stringify(fine));
    const missedBefore = judgeBoundary(j("fresh", LONG + 100), j("long", LONG + 4_000), LONG, AFTER_SETTLE_MS, "fresh");
    check(`${locale} RED a "before" read taken after the edge → NOT MEASURED`, missedBefore.before.state === "NOT MEASURED");
    const earlyAfter = judgeBoundary(j("fresh", LONG - 8_000), j("long", LONG - 2_000), LONG, AFTER_SETTLE_MS, "fresh");
    check(`${locale} RED an "after" read begun before the edge → NOT MEASURED`, earlyAfter.after.state === "NOT MEASURED");
    const settling = judgeBoundary(j("fresh", LONG - 8_000), j("long", LONG + 1_000, (s) => { s.dom.calloutText = callout.fresh; }), LONG, AFTER_SETTLE_MS, "fresh");
    check(`${locale} RED the old band inside the settle window → NOT MEASURED`, settling.after.state === "NOT MEASURED");
    const stuck = judgeBoundary(j("fresh", LONG - 8_000), j("long", LONG + 6_000, (s) => { s.dom.calloutText = callout.fresh; }), LONG, AFTER_SETTLE_MS, "fresh");
    check(`${locale} RED the old band past the settle window → FAIL`, stuck.after.state === "FAIL");
    const early = judgeBoundary(j("long", LATE - 8_000, (s) => { s.dom.calloutText = callout.late; s.dom.insteadVisible = true; s.dom.insteadText = instead.text; }), j("late", LATE + 4_000), LATE, AFTER_SETTLE_MS, "long");
    check(`${locale} RED the late words before 30 minutes → FAIL`, early.before.state === "FAIL");

    // The in-page switch.
    const log = (rows) => rows.map(([ageMs, band]) => ({ t: c + ageMs, frame: "pending", text: callout[band] }));
    check(`${locale}: a switch at 10m00.3s passes`, judgeSwitch(log([[20_000, "fresh"], [LONG + 300, "long"]]), c, texts, "fresh", "long", LONG, AFTER_SETTLE_MS, SWITCH_EARLY_TOLERANCE_MS).state === "PASS");
    check(`${locale} RED a switch at 9m50s → FAIL`, judgeSwitch(log([[20_000, "fresh"], [LONG - 10_000, "long"]]), c, texts, "fresh", "long", LONG, AFTER_SETTLE_MS, SWITCH_EARLY_TOLERANCE_MS).state === "FAIL");
    check(`${locale} RED a switch at 30m09s → FAIL`, judgeSwitch(log([[LONG + 5_000, "long"], [LATE + 9_000, "late"]]), c, texts, "long", "late", LATE, AFTER_SETTLE_MS, SWITCH_EARLY_TOLERANCE_MS).state === "FAIL");
    check(`${locale} RED the old words coming back → FAIL`, judgeSwitch(log([[20_000, "fresh"], [LONG + 300, "long"], [LONG + 900, "fresh"]]), c, texts, "fresh", "long", LONG, AFTER_SETTLE_MS, SWITCH_EARLY_TOLERANCE_MS).state === "FAIL");
    check(`${locale} RED no switch recorded → NOT MEASURED`, judgeSwitch(log([[20_000, "fresh"]]), c, texts, "fresh", "long", LONG, AFTER_SETTLE_MS, SWITCH_EARLY_TOLERANCE_MS).state === "NOT MEASURED");

    // The explicit tap.
    if (locale === "en") {
      const tapGood = () => ({
        moneyActions: 1, frame: "receipt",
        before: { facts: { ok: true, balance: MAIN_SPENDABLE, pending: { ...original } }, observer: { ok: true, positionCount: 0, betPlacedCount: 0, positions: [] } },
        after: { facts: { ok: true, balance: 0, pending: { ...original } }, observer: { ok: true, positionCount: 1, betPlacedCount: 1, positions: [{ positionId: "pos_1", keyHash: "abc" }] } },
        receipts: { ok: true, txnIds: [original.txnId] },
      });
      const tx = { original, instead };
      check("a clean late tap passes", judgeTap(tapGood(), tx).state === "PASS", JSON.stringify(judgeTap(tapGood(), tx)));
      for (const [label, mutate, want] of [
        ["two money actions (a double commit)", (t2) => { t2.moneyActions = 2; }, "FAIL"],
        ["no bet placed", (t2) => { t2.after.observer = { ...t2.before.observer }; }, "FAIL"],
        ["two positions", (t2) => { t2.after.observer.positionCount = 2; t2.after.observer.betPlacedCount = 2; }, "FAIL"],
        ["the deposit credited by the tap", (t2) => { t2.after.facts.balance = original.amount; }, "FAIL"],
        ["the deposit credited and gone from PROCESSING", (t2) => { t2.after.facts.balance = original.amount; t2.after.facts.pending = null; }, "FAIL"],
        ["the row gone, no credit", (t2) => { t2.after.facts.pending = null; }, "NOT MEASURED"],
        ["a second deposit after the tap", (t2) => { t2.receipts.txnIds.push("txn_SECOND"); }, "FAIL"],
        ["no receipt frame", (t2) => { t2.frame = "pending"; }, "FAIL"],
      ]) { const t2 = tapGood(); mutate(t2); check(`RED tap: ${label} → ${want}`, judgeTap(t2, tx).state === want, JSON.stringify(judgeTap(t2, tx))); }
    }
  }

  // The lifecycle pass arithmetic.
  const p0 = Date.parse("2026-10-14T08:00:07.000Z");
  const passes = distinctPasses([{ lastPassAt: p0 }, { lastPassAt: p0 + 400 }, { lastPassAt: p0 + 60_010 }, { lastPassAt: p0 + 120_020 }, { lastPassAt: null }]);
  check("distinct passes fold one pass's repeated stamps", passes.length === 3, JSON.stringify(passes));
  check("the measured period is the median gap", passPeriod(passes, 60_000) === 60_010);
  check("the next pass after a moment is predicted from the last one before it", nextPassAfter(passes, p0 + 125_000, 60_000) === p0 + 180_020);
  const click = alignedClickAt(p0, 60_000, p0 + 55_000, PASS_LEAD_MS, 3_000);
  check("the aligned click is PASS_LEAD_MS after a pass and in the future", click === p0 + 60_000 + PASS_LEAD_MS);
  check("RED a click inside the preparation margin moves a period", alignedClickAt(p0, 60_000, p0 + 9_000, PASS_LEAD_MS, 3_000) === p0 + 60_000 + PASS_LEAD_MS);
  check("ages read as minutes and seconds", ageLabel(1_798_349) === "29m58.3s" && ageFile(1_800_999) === "30m00s" && ageLabel(-1500) === "-0m01.5s");

  console.log(`qa:bet-sheet-pending-age --self-test: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

/* ─── The live observation ──────────────────────────────────────────────────────────────────────────────────────── */

class Premise extends Error {}
class Watchdog extends Error {}

async function live() {
  const BASE = process.env.KP_BASE ?? "http://localhost:3055";
  const outArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const OUT = resolve(outArg ?? join(tmpdir(), `bet-sheet-pending-age-${stamp}`));
  const rel = relative(ROOT, OUT);
  const refuse = (why) => { console.error(`REFUSED: ${why}`); process.exitCode = 2; };
  if (!rel.startsWith("..") && !isAbsolute(rel)) return refuse("the output must be outside the repository");
  if (process.env.DATABASE_URL) return refuse("DATABASE_URL is set in this shell: this drive runs only against the in-memory store");
  const pre = await premise(BASE);
  if (pre.refuse) return refuse(pre.refuse);
  if (pre.health?.security?.adminTotp !== "DISABLED") return refuse("the local server needs DISABLE_ADMIN_TOTP=true (the staff pass and the payments console)");
  const H = await productHelpers();
  const LONG = H.PENDING_LONG_MS, LATE = H.PENDING_LATE_MS;
  if (LONG !== 600_000 || LATE !== 1_800_000) return refuse(`sheet-state.ts says ${LONG}/${LATE} ms: not A10's 10 and 30 minutes — a shortened constant proves nothing`);
  const LEASE_MS = sourceConstant("src/lib/server/leader.ts", /export const LEASE_MS = ([\d_ *]+);/);
  const TICK_MS = sourceConstant("src/lib/server/lifecycle.ts", /const TICK_MS = ([\d_]+);/);
  const SWEEP_MS = sourceConstant("src/lib/server/lifecycle.ts", /const PAYMENT_SWEEP_EVERY_MS = ([\d_ *]+);/);
  const TEXTS = Object.fromEntries(LOCALES.map((l) => [l, bandTexts(H.dict[l], H.formatTzs, H.fill, H.DEPOSIT_MIN_TZS)]));
  for (const l of LOCALES) if (textsAmbiguity(TEXTS[l]).length) return refuse(`${l}: the band sentences cannot be told apart (${textsAmbiguity(TEXTS[l]).join(", ")})`);
  const WATCHDOG_MS = Number(process.env.KP_WATCHDOG_MIN ?? "40") * 60_000;
  if (!Number.isFinite(WATCHDOG_MS) || WATCHDOG_MS < LATE + 4 * 60_000) return refuse("KP_WATCHDOG_MIN must leave at least 4 minutes past the 30-minute edge");
  // The setup is bounded on its own: a cold dev server on a loaded machine compiles each first route for minutes.
  const SETUP_MS = Number(process.env.KP_SETUP_MIN ?? "25") * 60_000;
  if (!Number.isFinite(SETUP_MS) || SETUP_MS < 60_000) return refuse("KP_SETUP_MIN must be at least 1");
  mkdirSync(OUT, { recursive: true });

  const t0 = performance.now();
  const mono = () => Math.round((performance.now() - t0) * 10) / 10;
  const results = [], tiles = [], samples = [], timeline = [], healthReads = [], consoleRows = [], notes = [];
  const say = (line) => { const row = { utc: new Date().toISOString(), mono: mono(), line }; timeline.push(row); console.log(`${row.utc} ${line}`); };
  const result = (label, state, detail = "", extra = {}) => { results.push({ label, state, detail, ...extra }); console.log(`${state} ${label}${detail ? ` — ${detail}` : ""}`); };
  let gitHead = null;
  try { gitHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch { gitHead = null; }
  const evidence = {
    schema: "bet-sheet-pending-age/1", base: BASE, out: OUT, startedUtc: new Date().toISOString(), smoke: SMOKE,
    driver: { path: relative(ROOT, DRIVER).replace(/\\/g, "/"), sha256: sha256(DRIVER) },
    source: {
      head: gitHead,
      files: Object.fromEntries(["src/lib/journey/sheet-state.ts", "src/lib/journey/shortfall.ts", "src/lib/i18n-dict.ts", "src/components/journey/bet-sheet/bet-sheet.tsx", "src/components/journey/bet-sheet/bet-sheet-host.tsx", "src/lib/server/wallet-service.ts", "src/lib/server/payments.ts", "src/lib/server/lifecycle.ts"].map((f) => [f, sha256(join(ROOT, f))])),
    },
    constants: { PENDING_LONG_MS: LONG, PENDING_LATE_MS: LATE, LEASE_MS, TICK_MS, PAYMENT_SWEEP_EVERY_MS: SWEEP_MS, DEPOSIT_MIN_TZS: H.DEPOSIT_MIN_TZS, REQUESTED_STAKE, MAIN_SPENDABLE, BEFORE_LEAD_MS, AFTER_SETTLE_MS, PASS_LEAD_MS },
    premise: { health: { uptimeSec: pre.health.uptimeSec, database: pre.health.database, simpleJourney: pre.health.simpleJourney, adminTotp: pre.health.security?.adminTotp, version: pre.health.version } },
  };
  const writeEvidence = () => {
    const clean = (s) => ({ ...s, factsBefore: strip(s.factsBefore), factsAfter: strip(s.factsAfter) });
    writeFileSync(join(OUT, "evidence.json"), JSON.stringify({ ...evidence, endedUtc: new Date().toISOString(), results, tiles, samples: samples.map(clean), timeline, health: healthReads, passes: distinctPasses(healthReads).map((p) => new Date(p).toISOString()), console: consoleRows, notes }, null, 2));
  };
  const strip = (f) => (f ? { ok: f.ok, status: f.status, sentUtc: f.sentUtc, serverNow: f.serverNow, serverNowUtc: Number.isFinite(f.serverNow) ? new Date(f.serverNow).toISOString() : null, ageMs: f.ageMs, pending: f.pending, balance: f.balance, spendable: f.spendable, walletStatus: f.walletStatus, viewerMatches: f.viewerMatches } : f);
  // A hard stop the finally block can never be waited past: whatever happened is written down.
  const hardStop = setTimeout(() => { notes.push("hard stop: the drive overran its watchdog by 5 minutes"); try { writeEvidence(); } catch { /* best effort */ } console.error("HARD STOP"); process.exit(2); }, SETUP_MS + WATCHDOG_MS + 5 * 60_000);
  hardStop.unref();

  const { chromium } = await import("playwright");
  const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
  say(`qa:bet-sheet-pending-age ${BASE}, chromium ${browser.version()}, output ${OUT}`);
  const contexts = new Set();
  const setupDeadline = Date.now() + SETUP_MS;
  let deadline = setupDeadline;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sleepUntil = async (t, why) => {
    if (t > deadline) throw new Watchdog(`the watchdog falls before ${why} (${new Date(t).toISOString()})`);
    while (Date.now() < t) await sleep(Math.min(1_000, t - Date.now()));
  };
  const post = async (ctx, name, data = {}) => {
    const response = await ctx.request.post(`${BASE}/api/dev-test/${name}`, { data, timeout: 240_000 });
    const body = await response.json().catch(() => null);
    if (!response.ok() || body?.ok === false) throw new Premise(`${name} failed (${response.status()})`);
    return body;
  };
  const asCookie = (c) => ({ name: c.name, value: c.value, domain: new URL(BASE).hostname, path: c.path || "/" });
  const healthRead = async () => {
    const sent = Date.now();
    const h = await fetch(`${BASE}/api/health`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (!h) return null;
    const at = Date.parse(h.timestamp), lease = h.leadership?.lifecycle;
    const expiresAt = lease && typeof lease.expiresInSec === "number" ? at + lease.expiresInSec * 1000 : null;
    return { sentUtc: new Date(sent).toISOString(), serverUtc: h.timestamp, uptimeSec: h.uptimeSec, users: h.store?.users, lastPassAt: expiresAt === null ? null : expiresAt - LEASE_MS, leaseIsMe: lease?.isMe ?? null, tickerRunning: h.ticker?.running ?? null, skippedTotal: h.ticker?.skippedTotal ?? null, journey: h.simpleJourney?.state, dbConfigured: h.database?.configured };
  };

  let PASS = null, admin = null, demo = null, monitorsOn = false, healthLoop = null, continuityLoop = null;
  const accounts = [];
  let MARKET = null;
  try {
    /* ── 1 · The doors every journey drive goes through ── */
    try { PASS = await mintStaffPass(browser, BASE, { phone: "+255700000078", name: "Pending Age Support" }); }
    catch (error) { throw new Premise(`preview pass: ${String(error.message).split("Call log:")[0].trim()}`); }
    admin = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.add(admin);
    await post(admin, "seed-admin", { role: "ADMIN", phone: "+255700000079", name: "Pending Age Admin" });
    const catalogue = await post(admin, "seed-markets");
    if (!catalogue?.ids?.length) throw new Premise("the seeded board has no market");
    await post(admin, "reset-rate-limits");

    /* ── 2 · The real control plane: the Mock provider already chosen, Demo async on (restored at the end) ── */
    const controlPlane = async (want) => {
      const page = await admin.newPage();
      try {
        await page.goto(`${BASE}/admin/payments?tab=rails`, { waitUntil: "domcontentloaded", timeout: 240_000 });
        const sw = page.locator('[aria-label^="Demo async (test):"]').first();
        await sw.waitFor({ timeout: 180_000 });
        const mock = page.getByRole("radio", { name: /Mock/ });
        const mockSelected = (await mock.count()) > 0 && (await mock.first().getAttribute("aria-checked")) === "true";
        const read = async () => (await sw.getAttribute("aria-label")) === "Demo async (test): on";
        const found = await read();
        if (want !== null && found !== want) {
          for (let n = 0; n < 200 && !(await sw.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$") && typeof el[k].onClick === "function")).catch(() => false)); n++) await sleep(300);
          await sw.click();
          await page.locator(`[aria-label="Demo async (test): ${want ? "on" : "off"}"]`).waitFor({ timeout: 60_000 });
          await page.reload({ waitUntil: "domcontentloaded" });
          await sw.waitFor({ timeout: 120_000 });
        }
        return { mockSelected, found, now: await read() };
      } finally { await page.close().catch(() => {}); }
    };
    const cp = await controlPlane(true);
    demo = { original: cp.found, during: cp.now };
    evidence.controlPlane = { mockSelected: cp.mockSelected, demoAsyncOriginal: cp.found, demoAsyncDuring: cp.now };
    if (!cp.mockSelected) throw new Premise("the Mock provider is not the selected payment provider: no external provider may be called");
    if (!cp.now) throw new Premise("Demo async did not turn on in the control plane");
    say(`control plane: Mock selected; Demo async was ${cp.found ? "on" : "off"}, now on`);

    /* ── 3 · The accounts ── */
    const makeAccount = async (spec, balance) => {
      const ctx = await browser.newContext({ viewport: viewportFor(390) }); contexts.add(ctx);
      await ctx.addCookies([{ name: LOCALE_COOKIE, value: spec.locale, url: BASE }, asCookie(PASS)]);
      const phone = `+25571${String(parseInt(randomUUID().replaceAll("-", "").slice(0, 10), 16) % 10_000_000).padStart(7, "0")}`;
      const seeded = await post(ctx, "seed-admin", { role: "PLAYER", phone, name: "Local Sheet Matrix", balance });
      if (seeded.note) throw new Premise(`${spec.label}: the synthetic account already existed`);
      if (!(await ctx.cookies(BASE)).some((c) => c.name === SESSION_COOKIE)) throw new Premise(`${spec.label}: no session cookie`);
      const a = { ...spec, ctx, userId: seeded.userId, phoneMasked: `${phone.slice(0, 6)}****${phone.slice(-2)}`, seededBalance: balance,
        traffic: { money: [], other: [], depositRequests: [], prefetches: [], pageErrors: [] }, queue: Promise.resolve(), results: [] };
      ctx.on("request", (req) => {
        try {
          const url = new URL(req.url());
          if (req.method() === "POST" && req.headers()["next-action"]) {
            const row = { utc: new Date().toISOString(), path: url.pathname };
            (MONEY_FIELDS.test(req.postData() ?? "") ? a.traffic.money : a.traffic.other).push(row);
          }
          if (url.origin === new URL(BASE).origin && url.pathname.startsWith("/wallet/deposit")) {
            const h = req.headers(), prefetch = !!(h["next-router-prefetch"] || h["next-router-segment-prefetch"]);
            (prefetch ? a.traffic.prefetches : a.traffic.depositRequests).push({ utc: new Date().toISOString(), path: url.pathname, method: req.method() });
          }
        } catch { /* a request with no readable url or headers is not ours to classify */ }
      });
      a.page = await ctx.newPage();
      await a.page.addInitScript(() => {
        const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
        const isHost = (target, type, listener) => (target === window || target === document) && type === "click" && typeof listener === "function" && listener.toString().includes("a[data-bet-side]");
        EventTarget.prototype.addEventListener = function (type, listener, options) { const r = add.call(this, type, listener, options); if (isHost(this, type, listener)) window.__sheetHostReady = true; return r; };
        EventTarget.prototype.removeEventListener = function (type, listener, options) { const r = remove.call(this, type, listener, options); if (isHost(this, type, listener)) window.__sheetHostReady = false; return r; };
      });
      a.page.on("pageerror", (error) => { a.traffic.pageErrors.push({ utc: new Date().toISOString(), text: error.message.slice(0, 300) }); consoleRows.push({ account: a.label, type: "pageerror", text: error.message.slice(0, 500) }); });
      a.page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && consoleRows.length < 2_000) consoleRows.push({ account: a.label, utc: new Date().toISOString(), type: m.type(), text: m.text().slice(0, 500) }); });
      accounts.push(a);
      return a;
    };
    const facts = async (a) => {
      const sent = Date.now();
      const r = await a.ctx.request.get(`${BASE}/api/markets/${encodeURIComponent(MARKET.id)}/sheet?me=1&side=YES`, { timeout: 60_000 }).catch(() => null);
      if (!r) return { ok: false, status: "no answer", sentUtc: new Date(sent).toISOString() };
      const body = await r.json().catch(() => null);
      if (!r.ok() || !body?.me) return { ok: false, status: r.status(), sentUtc: new Date(sent).toISOString() };
      const f = body.me.facts;
      const out = { ok: true, status: 200, sentUtc: new Date(sent).toISOString(), serverNow: body.serverNow, viewerMatches: body.me.viewerId === a.userId,
        pending: f?.pendingDeposit ? { txnId: f.pendingDeposit.txnId, amount: f.pendingDeposit.amount, createdAt: f.pendingDeposit.createdAt } : null,
        balance: body.me.balance, spendable: body.me.spendable, walletStatus: f?.wallet?.status ?? null,
        raw: { facts: f, bettable: body.bettable, min: body.min, max: body.max, serverNow: body.serverNow } };
      if (a.original) out.ageMs = body.serverNow - Date.parse(a.original.createdAt);
      return out;
    };
    const receipts = async (a) => {
      const r = await a.ctx.request.get(`${BASE}/wallet/receipts`, { timeout: 240_000 }).catch(() => null);
      if (!r) return { ok: false, status: "no answer" };
      if (!r.ok() || new URL(r.url()).pathname !== "/wallet/receipts") return { ok: false, status: `${r.status()} ${new URL(r.url()).pathname}` };
      const html = await r.text();
      const ids = [...new Set([...html.matchAll(/\/wallet\/receipt\/([A-Za-z0-9_%-]{4,80})/g)].map((m) => decodeURIComponent(m[1])))].sort();
      return { ok: true, txnIds: ids };
    };
    const observer = async (a) => {
      const r = await a.ctx.request.get(`${BASE}/api/dev-test/bet-sheet-observe?marketId=${encodeURIComponent(MARKET.id)}`, { timeout: 60_000 }).catch(() => null);
      const body = r ? await r.json().catch(() => null) : null;
      if (!r || !r.ok() || !body?.ok) return { ok: false, status: r ? r.status() : "no answer" };
      return { ok: true, positionCount: body.positionCount, betPlacedCount: body.betPlacedCount,
        positions: body.positions.map((p) => ({ positionId: p.positionId, keyHash: p.key ? createHash("sha256").update(p.key).digest("hex").slice(0, 12) : null })) };
    };
    const domRead = async (a) => {
      const dom = await a.page.evaluate((sel) => {
        const root = document.querySelector(sel.root);
        const base = { lang: document.documentElement.lang, visibility: document.visibilityState, url: location.pathname + location.search };
        if (!root) return { ...base, present: false };
        const shown = (el) => !!el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().width > 0;
        const callout = root.querySelector('[id$="-callout"]');
        const place = root.querySelector(sel.place), instead = root.querySelector(sel.instead);
        return { ...base, present: true, frame: root.getAttribute("data-frame"), calloutText: callout ? callout.innerText : null,
          placeDisabled: place ? place.disabled : null, placeText: place ? place.innerText : null, stakeValue: root.querySelector(sel.stake)?.value ?? null,
          depositVisible: shown(root.querySelector(sel.deposit)),
          depositLinks: [...root.querySelectorAll("a[href]")].filter((x) => new URL(x.href, location.href).pathname.startsWith("/wallet/deposit")).length,
          insteadVisible: shown(instead), insteadText: instead ? instead.innerText : null,
          trackHref: callout?.querySelector('a[href*="/wallet/receipt/"]')?.getAttribute("href") ?? null,
          liveRegion: root.querySelector('[aria-live="polite"]')?.textContent ?? null };
      }, S).catch((error) => ({ lang: null, present: false, error: String(error.message).slice(0, 200) }));
      if (dom.present) {
        const probe = await a.page.evaluate(betSheetDomProbe, S).catch(() => ({ present: false }));
        dom.domErrors = probe.present ? betSheetDomVerdict(probe, { frame: "pending" }) : ["the layout probe could not read the sheet"];
      }
      return dom;
    };
    const trafficNow = (a) => ({ moneyActions: a.traffic.money.length - a.baseTraffic.money, otherActions: a.traffic.other.length - a.baseTraffic.other,
      depositNavigations: a.traffic.depositRequests.length - a.baseTraffic.depositRequests, pageErrors: a.traffic.pageErrors.length - a.baseTraffic.pageErrors });
    const insteadFor = (a, f) => {
      if (!f?.ok || !f.raw?.facts) return null;
      const plan = H.shortfallPlan({ ...f.raw.facts, stake: REQUESTED_STAKE, market: { live: f.raw.bettable, selectionClosed: false }, bounds: { min: f.raw.min, max: f.raw.max }, nowMs: f.raw.serverNow });
      if (plan.kind !== "pending" || !plan.betInstead) return null;
      return { stake: plan.betInstead.stake, text: H.fill(H.dict[a.locale].journey.lowBetInstead, { amount: H.formatTzs(plan.betInstead.stake) }) };
    };
    const expectFor = (a, band, sample, { money = false, window = null } = {}) => ({
      band, locale: a.locale, role: a.role, original: a.original, baseline: a.baseline, texts: TEXTS[a.locale], window, money,
      instead: band === "late" ? insteadFor(a, sample.factsBefore) : null,
    });
    const withPage = (a, fn) => { const run = a.queue.then(fn, fn); a.queue = run.catch(() => {}); return run; };
    /** One read: facts → the frame → facts; with `money`, the receipts book and the own positions too. */
    const read = async (a, tag, band, { money = false, window = null } = {}) => {
      const utc = new Date().toISOString(), m = mono();
      const factsBefore = await facts(a);
      const dom = await domRead(a);
      const factsAfter = await facts(a);
      const s = { tag, account: a.label, locale: a.locale, role: a.role, utc, mono: m, lang: dom.lang, viewport: a.page.viewportSize(), dom, factsBefore, factsAfter, traffic: trafficNow(a) };
      if (money) { s.receipts = await receipts(a); s.observer = await observer(a); }
      const x = expectFor(a, band, s, { money, window });
      s.expect = { band, instead: x.instead, window };
      s.verdict = judgeSample(s, x);
      s.band = s.verdict.band;
      samples.push(s);
      say(`${a.label} ${tag}: ${s.verdict.state} — band ${s.band} at ${ageLabel(s.verdict.ageA)}–${ageLabel(s.verdict.ageB)}${s.verdict.state === "PASS" ? "" : ` — ${[...s.verdict.money, ...s.verdict.frame, ...s.verdict.premise].join("; ")}`}`);
      return s;
    };
    let tileSeq = 0;
    const tile = async (a, band, width, { window = null } = {}) => {
      const vp = viewportFor(width);
      if (a.page.viewportSize()?.width !== vp.width || a.page.viewportSize()?.height !== vp.height) { await a.page.setViewportSize(vp); await sleep(600); }
      const factsBefore = await facts(a);
      const dom = await domRead(a);
      await a.page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }).catch(() => {});
      const file = `${String(++tileSeq).padStart(3, "0")}-${band}-${a.label}-${vp.width}x${vp.height}-age${ageFile(factsBefore.ageMs)}.png`;
      const shotUtc = new Date().toISOString(), shotMono = mono();
      await a.page.screenshot({ path: join(OUT, file) });
      // Where the sheet's middle scrolls (the narrow phones), what sits below its fold — the late band's "bet what you
      // have" among it — gets a second picture, scrolled the way a player scrolls it, then put back.
      let scrolledFile = null;
      const hidden = await a.page.evaluate((sel) => { const el = document.querySelector(sel); return el ? el.scrollHeight - el.clientHeight : 0; }, S.scroll).catch(() => 0);
      if (hidden > 4) {
        await a.page.evaluate((sel) => { const el = document.querySelector(sel); el.scrollTop = el.scrollHeight; }, S.scroll);
        await sleep(350);
        scrolledFile = file.replace(/\.png$/, "-scrolled.png");
        await a.page.screenshot({ path: join(OUT, scrolledFile) });
        await a.page.evaluate((sel) => { const el = document.querySelector(sel); el.scrollTop = 0; }, S.scroll);
      }
      const factsAfter = await facts(a);
      const s = { tag: `tile ${file}`, account: a.label, locale: a.locale, role: a.role, utc: shotUtc, mono: shotMono, lang: dom.lang, viewport: vp, dom, factsBefore, factsAfter, traffic: trafficNow(a) };
      const x = expectFor(a, band, s, { window });
      s.verdict = judgeSample(s, x); s.band = s.verdict.band; s.expect = { band, instead: x.instead, window };
      samples.push(s);
      const row = { file, scrolledFile, scrollHiddenPx: hidden, band, account: a.label, locale: a.locale, role: a.role, width: vp.width, height: vp.height, shotUtc, shotMono,
        ageBeforeMs: s.verdict.ageA, ageAfterMs: s.verdict.ageB, ageBefore: ageLabel(s.verdict.ageA), ageAfter: ageLabel(s.verdict.ageB), classified: s.band, state: s.verdict.state,
        issues: [...s.verdict.money, ...s.verdict.frame, ...s.verdict.premise] };
      tiles.push(row);
      result(`${a.label} ${band} tile ${vp.width}x${vp.height} at ${row.ageBefore}`, s.verdict.state, row.issues.join("; "), { file });
      return s;
    };
    const tileSet = async (a, band, opts) => {
      for (const width of a.role === "main" ? [390, 360, 320, 1280] : [390]) await tile(a, band, width, opts);
      if (a.page.viewportSize()?.width !== 390) { await a.page.setViewportSize(viewportFor(390)); await sleep(400); }
    };

    const firstMain = await makeAccount({ label: "en", locale: "en", role: "main" }, MAIN_SPENDABLE);
    /* ── 4 · The question: on the board, open for the whole run, and bounds that make the plan's figures meaningful ── */
    await firstMain.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 240_000 });
    await firstMain.page.waitForFunction(() => window.__sheetHostReady === true, null, { timeout: 240_000 });
    await firstMain.page.locator(`${S.pick}[data-bet-side="YES"]`).first().waitFor({ state: "visible", timeout: 120_000 });
    const seeds = await firstMain.page.evaluate((pick) => [...document.querySelectorAll(pick)].map((el) => { try { return JSON.parse(el.closest("[data-sheet]").getAttribute("data-sheet")); } catch { return null; } }).filter(Boolean), `${S.pick}[data-bet-side="YES"]`);
    const needOpenUntil = setupDeadline + WATCHDOG_MS;
    MARKET = seeds.find((s) => s.bettable && s.closesAt && Date.parse(s.closesAt) > needOpenUntil && s.min <= MAIN_SPENDABLE && s.max >= REQUESTED_STAKE && s.min <= REQUESTED_STAKE && s.min >= 2) ?? null;
    if (!MARKET) throw new Premise(`no question on the board stays open past ${new Date(needOpenUntil).toISOString()} with a minimum ≤ ${MAIN_SPENDABLE} and a maximum ≥ ${REQUESTED_STAKE}`);
    evidence.market = { id: MARKET.id, min: MARKET.min, max: MARKET.max, closesAt: MARKET.closesAt, bettable: MARKET.bettable };
    say(`question ${MARKET.id}: stake ${MARKET.min}–${MARKET.max}, betting closes ${MARKET.closesAt}`);
    // Every read the timed part makes is compiled now, by plain GETs that move nothing, so no first compile lands
    // between a deposit and its first read.
    for (const path of [`/api/markets/${encodeURIComponent(MARKET.id)}/sheet`, `/api/markets/${encodeURIComponent(MARKET.id)}/sheet?me=1&side=YES`, "/wallet", "/wallet/receipts", `/api/dev-test/bet-sheet-observe?marketId=${encodeURIComponent(MARKET.id)}`]) {
      const r = await firstMain.ctx.request.get(`${BASE}${path}`, { timeout: 420_000 }).catch((error) => ({ status: () => String(error.message).slice(0, 80) }));
      say(`warm ${path.split("?")[0]}: ${r.status()}`);
    }
    await makeAccount({ label: "sw", locale: "sw", role: "main" }, MAIN_SPENDABLE);
    await makeAccount({ label: "zh", locale: "zh", role: "main" }, MAIN_SPENDABLE);
    await makeAccount({ label: "ctrl-zero-en", locale: "en", role: "zero" }, 0);
    await makeAccount({ label: "ctrl-below-sw", locale: "sw", role: "below" }, MARKET.min - 1);

    /* ── 5 · One real deposit each, through the form and its confirm dialog, clicked PASS_LEAD_MS after a lifecycle pass ── */
    await Promise.all(accounts.map(async (a) => {
      const t = H.dict[a.locale];
      await a.page.goto(`${BASE}/wallet/deposit?amount=${H.DEPOSIT_MIN_TZS}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
      if (await a.page.evaluate(() => document.documentElement.lang) !== a.locale) throw new Premise(`${a.label}: the deposit page is not in ${a.locale}`);
      const provider = a.page.locator("label:has(input#provider-MPESA)");
      await provider.waitFor({ timeout: 180_000 });
      const trigger = a.page.getByRole("button", { name: t.common.confirmDeposit, exact: true });
      const dialog = a.page.getByRole("alertdialog");
      // Opening the dialog moves no money, so an unhydrated first press is simply pressed again; the dialog's own
      // button, which does, is pressed exactly once, below and later.
      for (let n = 0; n < 40 && !(await dialog.isVisible().catch(() => false)); n++) {
        if (!(await a.page.locator("input#provider-MPESA").isChecked().catch(() => false))) await provider.click({ timeout: 5_000 }).catch(() => {});
        if (await dialog.isVisible().catch(() => false)) break;
        await trigger.click({ timeout: 5_000 }).catch(() => {});
        await dialog.waitFor({ state: "visible", timeout: 3_000 }).catch(() => {});
      }
      if (!(await dialog.isVisible())) throw new Premise(`${a.label}: the deposit confirm dialog never opened`);
      const names = [t.journey.depositAction, t.common.deposit];
      let confirm = null;
      for (const name of names) { const b = dialog.getByRole("button", { name, exact: true }); if (await b.count() === 1) { confirm = b; break; } }
      if (!confirm) throw new Premise(`${a.label}: the dialog has no "${names.join('" or "')}" button`);
      const dialogText = norm(await dialog.innerText());
      if (!dialogText.includes(norm(H.formatTzs(H.DEPOSIT_MIN_TZS))) || !dialogText.includes("M-Pesa")) throw new Premise(`${a.label}: the dialog does not say ${H.formatTzs(H.DEPOSIT_MIN_TZS)} by M-Pesa`);
      await a.page.waitForFunction(() => document.querySelector('[role="alertdialog"]')?.contains(document.activeElement));
      a.confirm = confirm;
    }));
    let hr = null;
    for (let n = 0; n < 10 && !Number.isFinite(hr?.lastPassAt); n++) { hr = await healthRead(); if (hr) healthReads.push(hr); if (!Number.isFinite(hr?.lastPassAt)) await sleep(8_000); }
    let clickAt = Date.now() + 1_000;
    if (Number.isFinite(hr?.lastPassAt)) {
      clickAt = alignedClickAt(hr.lastPassAt, TICK_MS, Date.now(), PASS_LEAD_MS, 3_000);
      evidence.alignment = { lastPassUtc: new Date(hr.lastPassAt).toISOString(), clickUtc: new Date(clickAt).toISOString(), leadMs: PASS_LEAD_MS };
      say(`lifecycle pass at ${new Date(hr.lastPassAt).toISOString()}; the deposits are confirmed at ${new Date(clickAt).toISOString()}`);
    } else {
      evidence.alignment = { lastPassUtc: null, note: "no lifecycle lease on /api/health: no pass, so no reconcile sweep, was observed" };
      notes.push("no lifecycle lease was observed on /api/health before the deposits");
    }
    await sleepUntil(clickAt, "the deposits");
    for (const a of accounts) a.depositTraffic = a.traffic.money.length;
    await Promise.all(accounts.map((a) => a.confirm.click()));
    await Promise.all(accounts.map(async (a) => {
      try { await a.page.waitForURL((u) => u.searchParams.has("deposited"), { timeout: 300_000 }); }
      catch { await a.page.screenshot({ path: join(OUT, `000-invalid-deposit-${a.label}.png`) }).catch(() => {}); throw new Premise(`${a.label}: the deposit did not land on /wallet?deposited= (${new URL(a.page.url()).pathname})`); }
      const u = new URL(a.page.url());
      a.redirect = { txnId: u.searchParams.get("deposited"), amount: Number(u.searchParams.get("amount")), status: u.searchParams.get("status"), utc: new Date().toISOString() };
      if (a.redirect.status !== "PROCESSING") throw new Premise(`${a.label}: the deposit answered ${a.redirect.status}, not PROCESSING — Demo async was not in effect`);
      if (a.traffic.money.length - a.depositTraffic !== 1) throw new Premise(`${a.label}: ${a.traffic.money.length - a.depositTraffic} deposit action POSTs for one confirm`);
    }));
    for (const a of accounts) {
      const f = await facts(a);
      if (!f.ok || !f.pending || f.pending.txnId !== a.redirect.txnId || f.pending.amount !== H.DEPOSIT_MIN_TZS || f.pending.amount !== a.redirect.amount) {
        throw new Premise(`${a.label}: the facts do not name the deposit the door returned (${JSON.stringify(strip(f))})`);
      }
      if (f.balance !== a.seededBalance) throw new Premise(`${a.label}: the wallet holds ${f.balance} after a PENDING deposit, not ${a.seededBalance}`);
      a.original = { ...f.pending };
      const [rc, ob] = [await receipts(a), await observer(a)];
      if (!rc.ok || rc.txnIds.length !== 1 || rc.txnIds[0] !== a.original.txnId) throw new Premise(`${a.label}: the receipts book does not hold exactly the new deposit (${JSON.stringify(rc)})`);
      if (!ob.ok) throw new Premise(`${a.label}: own positions unreadable`);
      a.baseline = { balance: f.balance, positionCount: ob.positionCount, betPlacedCount: ob.betPlacedCount };
      say(`${a.label}: deposit ${a.original.txnId} ${a.original.amount} PROCESSING, created ${a.original.createdAt}; wallet ${a.baseline.balance}`);
    }
    const created = accounts.map((a) => Date.parse(a.original.createdAt));
    const minC = Math.min(...created), maxC = Math.max(...created);
    deadline = minC + WATCHDOG_MS;
    evidence.accounts = accounts.map((a) => ({ label: a.label, locale: a.locale, role: a.role, userId: a.userId, phone: a.phoneMasked, seededBalance: a.seededBalance, original: a.original, redirect: a.redirect, baseline: a.baseline }));
    evidence.createdSpreadMs = maxC - minC;

    /* ── 6 · Each sheet opened on the question, asking for TZS 5,000: the pending frame, fresh ── */
    await Promise.all(accounts.map(async (a) => {
      await a.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 240_000 });
      await a.page.waitForFunction(() => window.__sheetHostReady === true, null, { timeout: 240_000 });
      if (await a.page.evaluate(() => document.documentElement.lang) !== a.locale) throw new Premise(`${a.label}: <html lang> is not ${a.locale}`);
      await a.page.locator(`${S.pick}[data-bet-side="YES"]`).first().waitFor({ state: "visible", timeout: 120_000 });
      let index = await a.page.evaluate(([pick, id]) => [...document.querySelectorAll(pick)].findIndex((el) => { try { return JSON.parse(el.closest("[data-sheet]").getAttribute("data-sheet")).id === id; } catch { return false; } }), [`${S.pick}[data-bet-side="YES"]`, MARKET.id]);
      if (index < 0) {
        await a.page.goto(`${BASE}/markets/${MARKET.id}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
        await a.page.waitForFunction(() => window.__sheetHostReady === true, null, { timeout: 240_000 });
        index = await a.page.evaluate(([pick, id]) => [...document.querySelectorAll(pick)].findIndex((el) => { try { return JSON.parse(el.closest("[data-sheet]").getAttribute("data-sheet")).id === id; } catch { return false; } }), [`${S.pick}[data-bet-side="YES"]`, MARKET.id]);
        if (index < 0) throw new Premise(`${a.label}: no YES pick for ${MARKET.id} on the board or its page`);
      }
      a.openedFrom = new URL(a.page.url()).pathname;
      await a.page.locator(`${S.pick}[data-bet-side="YES"]`).nth(index).click();
      await a.page.locator(S.root).waitFor({ state: "visible", timeout: 90_000 });
      await a.page.locator(S.stake).waitFor({ state: "visible", timeout: 90_000 });
      await sleep(400);
      await a.page.locator(S.stake).fill(String(REQUESTED_STAKE));
      try { await a.page.waitForFunction((sel) => document.querySelector(sel)?.getAttribute("data-frame") === "pending", S.root, { timeout: 90_000 }); }
      catch { await a.page.screenshot({ path: join(OUT, `000-invalid-frame-${a.label}.png`) }).catch(() => {}); throw new Premise(`${a.label}: TZS ${REQUESTED_STAKE} did not draw the pending frame (${await a.page.locator(S.root).getAttribute("data-frame").catch(() => "none")})`); }
      // The frame's own transitions (the stake box's 2px attention border among them) finish before anything is read.
      await a.page.evaluate(async (sel) => {
        const dialog = document.querySelector(sel)?.closest('[role="dialog"]');
        const finite = (dialog?.getAnimations({ subtree: true }) ?? []).filter((x) => x.effect?.getComputedTiming().iterations !== Infinity);
        await Promise.all(finite.map((x) => x.finished.catch(() => {})));
      }, S.root).catch(() => {});
      await sleep(1_000);
      await a.page.evaluate((sel) => {
        if (window.__pendingAgeLog) return;
        const log = (window.__pendingAgeLog = []);
        let last = null;
        const record = () => {
          const root = document.querySelector(sel.root), callout = root?.querySelector('[id$="-callout"]');
          const row = { frame: root?.getAttribute("data-frame") ?? null, text: callout ? callout.innerText : null, instead: !!root?.querySelector(sel.instead) };
          const sig = JSON.stringify(row);
          if (sig === last) return;
          last = sig; log.push({ t: Date.now(), ...row });
          if (log.length > 400) log.splice(0, log.length - 400);
        };
        new MutationObserver(record).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-frame"] });
        record();
      }, S);
      a.baseTraffic = { money: a.traffic.money.length, other: a.traffic.other.length, depositRequests: a.traffic.depositRequests.length, pageErrors: a.traffic.pageErrors.length };
    }));
    say(`sheets open; deposits created ${new Date(minC).toISOString()}…${new Date(maxC).toISOString()} (spread ${maxC - minC} ms); watchdog ${new Date(deadline).toISOString()}`);

    /* ── 7 · Watchers: the server's passes, its user count and uptime; each sheet's continuity ── */
    const usersAtStart = (await healthRead())?.users ?? null;
    evidence.usersAtStart = usersAtStart;
    monitorsOn = true;
    healthLoop = (async () => {
      let lastUptime = -1;
      while (monitorsOn) {
        const h = await healthRead();
        if (h) {
          healthReads.push(h);
          if (h.users !== usersAtStart && !notes.some((n) => n.startsWith("foreign"))) notes.push(`foreign activity: the server's user count moved ${usersAtStart} → ${h.users} at ${h.serverUtc}`);
          if (h.uptimeSec < lastUptime && !notes.some((n) => n.startsWith("restart"))) notes.push(`restart: the server's uptime fell ${lastUptime} → ${h.uptimeSec} at ${h.serverUtc}`);
          lastUptime = h.uptimeSec;
        }
        for (let n = 0; n < HEALTH_EVERY_MS / 1_000 && monitorsOn; n++) await sleep(1_000);
      }
    })().catch((error) => { notes.push(`health loop stopped: ${String(error?.message ?? error).slice(0, 200)}`); });
    continuityLoop = (async () => {
      let next = Date.now() + MONITOR_EVERY_MS;
      while (monitorsOn) {
        await sleep(1_000);
        if (Date.now() < next || !monitorsOn) continue;
        next = Date.now() + MONITOR_EVERY_MS;
        await Promise.all(accounts.filter((a) => !a.tapped).map((a) => withPage(a, async () => {
          const age = Date.now() - Date.parse(a.original.createdAt);
          const near = [LONG, LATE].some((edge) => age > edge - BEFORE_LEAD_MS - MONITOR_QUIET_MS && age < edge + AFTER_SETTLE_MS + MONITOR_QUIET_MS);
          if (!monitorsOn || near || age >= LATE - PRE_LATE_MS - MONITOR_QUIET_MS) return;
          const band = age < LONG ? "fresh" : "long";
          await read(a, "continuity", band, { window: band === "fresh" ? [0, LONG] : [LONG + AFTER_SETTLE_MS, LATE] });
        }).catch((error) => { notes.push(`${a.label} continuity read failed: ${String(error?.message ?? error).slice(0, 200)}`); })));
      }
    })().catch((error) => { notes.push(`continuity loop stopped: ${String(error?.message ?? error).slice(0, 200)}`); });

    /* ── 8 · Fresh ── */
    await Promise.all(accounts.map((a) => withPage(a, async () => {
      const s = await read(a, "fresh", "fresh", { money: true, window: [0, LONG] });
      result(`${a.label} fresh: depositPendingBody, CTA disabled, no second deposit, same row, money unmoved`, s.verdict.state, [...s.verdict.money, ...s.verdict.frame, ...s.verdict.premise].join("; "));
      await tile(a, "fresh", 390, { window: [0, LONG] });
    })));

    if (SMOKE) {
      // KP_SMOKE=1 rehearses every door and tile up to the fresh frame and then stops: it MEASURES NO EDGE.
      await Promise.all(accounts.map((a) => withPage(a, () => tileSet(a, "fresh", { window: [0, LONG] }))));
      result("10- and 30-minute bands", "NOT MEASURED", "KP_SMOKE=1: a rehearsal of the doors, the reads and the tiles; no edge was waited for");
    } else {
    /* ── 9 · The edges; ten minutes ── */
    const boundary = async (edge, oldBand, newBand, name, { money }) => {
      await sleepUntil(minC + edge - BEFORE_LEAD_MS, `the read before ${name}`);
      const before = await Promise.all(accounts.map((a) => withPage(a, () => read(a, `before ${name}`, oldBand, { money: false }))));
      await sleepUntil(maxC + edge + AFTER_SETTLE_MS, `the read after ${name}`);
      if (edge === LATE) await gateLatePass();
      const after = await Promise.all(accounts.map((a) => withPage(a, () => read(a, `after ${name}`, newBand, { money }))));
      accounts.forEach((a, i) => {
        const j = judgeBoundary(before[i].verdict, after[i].verdict, edge, AFTER_SETTLE_MS, oldBand);
        result(`${a.label} just before ${name}: ${oldBand} at ${ageLabel(before[i].verdict.ageA)}–${ageLabel(before[i].verdict.ageB)}`, j.before.state, j.before.why);
        result(`${a.label} just after ${name}: ${newBand} at ${ageLabel(after[i].verdict.ageA)}–${ageLabel(after[i].verdict.ageB)}`, j.after.state, j.after.why);
      });
      return after;
    };
    const switchTimes = async (edge, oldBand, newBand, name) => {
      for (const a of accounts) {
        const log = await a.page.evaluate(() => window.__pendingAgeLog ?? null).catch(() => null);
        const j = judgeSwitch(log, Date.parse(a.original.createdAt), TEXTS[a.locale], oldBand, newBand, edge, AFTER_SETTLE_MS, SWITCH_EARLY_TOLERANCE_MS);
        (a.switches ??= []).push({ edge: name, ...j, switchAge: ageLabel(j.switchAgeMs) });
        result(`${a.label} ${name} words switched at ${ageLabel(j.switchAgeMs)} (in-page recorder)`, j.state, j.why);
      }
    };
    /** Before reading the late band: if a lifecycle pass is due inside the burst, let it pass and re-read after it. */
    const gateLatePass = async () => {
      const h = await healthRead(); if (h) healthReads.push(h);
      const passes = distinctPasses(healthReads);
      if (!passes.length) { notes.push("late gate: no lifecycle pass observed, nothing can sweep"); return; }
      const period = passPeriod(passes, TICK_MS), next = nextPassAfter(passes, Date.now(), period);
      evidence.lateGate = { observedPasses: passes.length, periodMs: period, nextPassUtc: next ? new Date(next).toISOString() : null, decidedUtc: new Date().toISOString(), lastCrossingUtc: new Date(maxC + LATE).toISOString(), firstCrossingUtc: new Date(minC + LATE).toISOString() };
      if (next && next - Date.now() < LATE_BURST_BUDGET_MS) {
        say(`late gate: a lifecycle pass is due at ${new Date(next).toISOString()}, inside the late burst — waiting it out`);
        evidence.lateGate.waitedForPass = true;
        await sleepUntil(next + 2_500, "the pass inside the late burst");
        for (let n = 0; n < 6; n++) { const h2 = await healthRead(); if (h2) healthReads.push(h2); if (Number.isFinite(h2?.lastPassAt) && h2.lastPassAt >= next - 1_500) break; await sleep(1_000); }
      } else say(`late gate: next lifecycle pass ${next ? new Date(next).toISOString() : "unknown"}, ${next ? Math.round((next - Date.now()) / 1000) : "?"} s away`);
    };
    await boundary(LONG, "fresh", "long", "10 minutes", { money: true });
    await switchTimes(LONG, "fresh", "long", "10-minute");
    await Promise.all(accounts.map((a) => withPage(a, () => tileSet(a, "long", { window: [LONG + AFTER_SETTLE_MS, LATE] }))));

    /* ── 10 · Thirty minutes ── */
    await sleepUntil(minC + LATE - PRE_LATE_MS, "the money read before 30 minutes");
    await Promise.all(accounts.map((a) => withPage(a, async () => {
      const s = await read(a, "money before 30 minutes", "long", { money: true, window: [LONG + AFTER_SETTLE_MS, LATE] });
      result(`${a.label} at ${ageLabel(s.verdict.ageA)}: long band, the same row, receipts and own positions unmoved`, s.verdict.state, [...s.verdict.money, ...s.verdict.frame, ...s.verdict.premise].join("; "));
    })));
    const afterLate = await boundary(LATE, "long", "late", "30 minutes", { money: false });
    await Promise.all(accounts.map((a) => withPage(a, () => tileSet(a, "late", { window: [LATE + AFTER_SETTLE_MS, Infinity] }))));
    await switchTimes(LATE, "long", "late", "30-minute");
    for (const [i, a] of accounts.entries()) {
      const x = afterLate[i].expect.instead;
      if (a.role === "main") result(`${a.label} late: "bet what you have" offered at the source-derived ${x ? H.formatTzs(x.stake) : "—"}`, x && x.stake === Math.min(MAIN_SPENDABLE, MARKET.max) && afterLate[i].dom.insteadVisible && afterLate[i].verdict.state === "PASS" ? "PASS" : afterLate[i].verdict.state === "NOT MEASURED" ? "NOT MEASURED" : "FAIL", x ? `shortfallPlan on the read's own facts: ${x.stake}` : "the source derives no alternative");
      else result(`${a.label} late: no "bet what you have" for a ${a.role === "zero" ? "zero" : `${a.seededBalance}-shilling`} wallet (minimum ${MARKET.min})`, !x && !afterLate[i].dom.insteadVisible && afterLate[i].verdict.state === "PASS" ? "PASS" : afterLate[i].verdict.state === "NOT MEASURED" ? "NOT MEASURED" : "FAIL", x ? `the source derived ${x.stake}` : "");
    }

    /* ── 11 · The one explicit tap on the late alternative (en) ── */
    const en = accounts.find((a) => a.label === "en");
    const enLate = afterLate[accounts.indexOf(en)];
    if (enLate.verdict.state !== "PASS" || !enLate.dom.insteadVisible) {
      result("en explicit late-alternative tap", "NOT MEASURED", `the en late frame was not a passing late frame with its alternative (${enLate.verdict.state})`);
    } else {
      await withPage(en, async () => {
        const instead = enLate.expect.instead;
        const before = { facts: await facts(en), observer: await observer(en) };
        const moneyBefore = en.traffic.money.length;
        en.tapped = true;
        await en.page.locator(`${S.root} ${S.instead}`).click();
        let frame = null;
        try { await en.page.waitForFunction((sel) => document.querySelector(sel)?.getAttribute("data-frame") === "receipt", S.root, { timeout: 60_000 }); frame = "receipt"; }
        catch { frame = await en.page.locator(S.root).getAttribute("data-frame").catch(() => null); }
        const tapFile = `${String(++tileSeq).padStart(3, "0")}-tap-receipt-en-${en.page.viewportSize().width}x${en.page.viewportSize().height}.png`;
        await en.page.screenshot({ path: join(OUT, tapFile) }).catch(() => {});
        await sleep(500);
        const after = { facts: await facts(en), observer: await observer(en) };
        const tapReceipts = await receipts(en);
        const t = { moneyActions: en.traffic.money.length - moneyBefore, frame, before, after, receipts: tapReceipts };
        const j = judgeTap(t, { original: en.original, instead });
        evidence.tap = { utc: new Date().toISOString(), stake: instead.stake, file: tapFile, ageAtTap: ageLabel(before.facts.ageMs), moneyActions: t.moneyActions, frame,
          before: { facts: strip(before.facts), observer: before.observer }, after: { facts: strip(after.facts), observer: after.observer }, receipts: tapReceipts, verdict: j };
        tiles.push({ file: tapFile, band: "tap-receipt", account: "en", locale: "en", width: en.page.viewportSize().width, ageBefore: ageLabel(before.facts.ageMs), state: j.state });
        result(`en explicit tap on "bet what you have" (${H.formatTzs(instead.stake)}) at ${ageLabel(before.facts.ageMs)}: one bet, deposit still PROCESSING and uncredited`, j.state, [...j.money, ...j.premise].join("; "));
        if (j.state !== "FAIL") en.baseline = { balance: after.facts.balance, positionCount: after.observer.positionCount, betPlacedCount: after.observer.betPlacedCount };
      });
    }
    }

    /* ── 12 · The money, read once more for everyone after the late burst ── */
    for (const a of accounts) {
      const f = await facts(a), rc = await receipts(a), ob = await observer(a);
      const problems = [];
      if (!f.ok || !rc.ok || !ob.ok) problems.push("a final read failed");
      if (f.ok && f.balance !== a.baseline.balance) problems.push(`wallet ${f.balance}, expected ${a.baseline.balance}`);
      if (rc.ok && (rc.txnIds.length !== 1 || rc.txnIds[0] !== a.original.txnId)) problems.push(`receipts ${JSON.stringify(rc.txnIds)}`);
      if (ob.ok && (ob.positionCount !== a.baseline.positionCount || ob.betPlacedCount !== a.baseline.betPlacedCount)) problems.push(`positions ${ob.positionCount} / BET_PLACED ${ob.betPlacedCount}`);
      const stillProcessing = f.ok && f.pending?.txnId === a.original.txnId;
      (evidence.final ??= []).push({ account: a.label, utc: new Date().toISOString(), ageMs: f.ageMs, age: ageLabel(f.ageMs), stillProcessing, facts: strip(f), receipts: rc, observer: ob });
      if (!stillProcessing) notes.push(`${a.label}: after the late burst, at ${ageLabel(f.ageMs)}, the original row is no longer PROCESSING (expected locally: the mock rail's reconcile timer)`);
      result(`${a.label} after the late burst: wallet, receipts book and own positions as expected${a.tapped ? " after the one tap" : ""}`, !f.ok || !rc.ok || !ob.ok ? "NOT MEASURED" : problems.length ? "FAIL" : "PASS", problems.join("; "));
    }
    for (const a of accounts) {
      const steady = samples.filter((s) => s.account === a.label && s.tag === "continuity");
      const bad = steady.filter((s) => s.verdict.state === "FAIL"), unmeasured = steady.filter((s) => s.verdict.state === "NOT MEASURED");
      result(`${a.label} continuity: ${steady.length} reads between the edges`, bad.length ? "FAIL" : steady.length && !unmeasured.length ? "PASS" : "NOT MEASURED", bad.concat(unmeasured).map((s) => `${s.utc}: ${[...s.verdict.money, ...s.verdict.frame, ...s.verdict.premise].join("; ")}`).join(" | "));
      const money = a.traffic.money.length - a.baseTraffic.money - (a.tapped ? 1 : 0), deposits = a.traffic.depositRequests.length - a.baseTraffic.depositRequests;
      result(`${a.label} no automatic commitment and no new provider request from the page`, money === 0 && deposits === 0 ? "PASS" : "FAIL", `money-carrying actions ${money}${a.tapped ? " (besides the one tap)" : ""}, /wallet/deposit requests ${deposits}, other actions ${a.traffic.other.length - a.baseTraffic.other}, prefetches ${a.traffic.prefetches.length}`);
    }

    /* ── 13 · For the record, after the measurement: when the local mock's reconcile timer takes each row out of
       PROCESSING (header), and that it credits nothing when it does. No band cell depends on it. ── */
    if (!SMOKE) {
      const stopAt = Math.min(minC + LATE + 7 * 60_000, deadline - 60_000);
      const watching = new Set(accounts.filter((a) => (evidence.final ?? []).find((r) => r.account === a.label)?.stillProcessing));
      const lastSeen = new Map();
      say(`after-window watch: ${watching.size} row(s) still PROCESSING; watching until ${new Date(stopAt).toISOString()}`);
      while (watching.size && Date.now() < stopAt) {
        for (const a of [...watching]) {
          const f = await facts(a);
          if (!f.ok) continue;
          if (f.pending?.txnId === a.original.txnId) { lastSeen.set(a.label, { utc: new Date(f.serverNow).toISOString(), age: ageLabel(f.ageMs) }); continue; }
          watching.delete(a);
          const credited = f.balance !== a.baseline.balance;
          (evidence.afterWindow ??= []).push({ account: a.label, lastProcessing: lastSeen.get(a.label) ?? null, firstGone: { utc: new Date(f.serverNow).toISOString(), age: ageLabel(f.ageMs) }, balance: f.balance, expected: a.baseline.balance, otherPending: f.pending });
          say(`${a.label}: the original row left PROCESSING between ${lastSeen.get(a.label)?.age ?? "the late burst"} and ${ageLabel(f.ageMs)}; wallet ${f.balance}`);
          result(`${a.label} the local mock's reconcile timer closed the row by ${ageLabel(f.ageMs)}: nothing credited, no other row pending`, credited || f.pending ? "FAIL" : "PASS", credited ? `wallet ${f.balance}, expected ${a.baseline.balance}` : f.pending ? `another PROCESSING row ${f.pending.txnId}` : "");
        }
        if (watching.size) await sleep(10_000);
      }
      for (const a of watching) notes.push(`${a.label}: still PROCESSING at ${lastSeen.get(a.label)?.age ?? "?"} when the after-window watch stopped`);
    }
  } catch (error) {
    const kind = error instanceof Premise ? "INVALID premise" : error instanceof Watchdog ? "WATCHDOG" : "runtime error";
    result(`drive stopped: ${kind}`, error instanceof Watchdog ? "NOT MEASURED" : "FAIL", String(error?.stack ?? error).split("Call log:")[0].trim().slice(0, 1_500));
    if (error instanceof Premise) evidence.invalidPremise = error.message;
  } finally {
    monitorsOn = false;
    await Promise.all([healthLoop?.catch(() => {}), continuityLoop?.catch(() => {})]);
    if (demo && demo.original === false) {
      try {
        const back = await (async () => {
          const page = await admin.newPage();
          try {
            await page.goto(`${BASE}/admin/payments?tab=rails`, { waitUntil: "domcontentloaded", timeout: 240_000 });
            const sw = page.locator('[aria-label^="Demo async (test):"]').first();
            await sw.waitFor({ timeout: 180_000 });
            const was = (await sw.getAttribute("aria-label")) === "Demo async (test): on";
            if (!was) { notes.push("Demo async was already off at the end: someone else changed the control plane"); return { was, now: false }; }
            for (let n = 0; n < 200 && !(await sw.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$") && typeof el[k].onClick === "function")).catch(() => false)); n++) await sleep(300);
            await sw.click();
            await page.locator('[aria-label="Demo async (test): off"]').waitFor({ timeout: 60_000 });
            await page.reload({ waitUntil: "domcontentloaded" });
            await sw.waitFor({ timeout: 120_000 });
            return { was, now: (await sw.getAttribute("aria-label")) === "Demo async (test): on" };
          } finally { await page.close().catch(() => {}); }
        })();
        evidence.controlPlane = { ...evidence.controlPlane, demoAsyncAtEnd: back.was, demoAsyncRestored: back.now === false };
        result("Demo async restored to off, as found", back.now === false ? "PASS" : "FAIL", back.was ? "" : "it was already off at the end");
      } catch (error) { result("Demo async restored to off, as found", "FAIL", String(error.message).slice(0, 300)); }
    } else if (demo) result("Demo async left on, as found", "PASS");
    const users = healthReads.length ? healthReads[healthReads.length - 1].users : null;
    if (evidence.usersAtStart !== undefined) {
      const foreign = notes.find((n) => n.startsWith("foreign")), restart = notes.find((n) => n.startsWith("restart"));
      result("the aging server stayed ours: no foreign account, no restart", foreign || restart ? "FAIL" : "PASS", [foreign, restart].filter(Boolean).join("; ") || `users ${evidence.usersAtStart} → ${users}, ${healthReads.length} health reads`);
    }
    for (const ctx of contexts) await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
    clearTimeout(hardStop);
    writeEvidence();
  }
  const failures = results.filter((r) => r.state === "FAIL"), outstanding = results.filter((r) => r.state === "NOT MEASURED");
  console.log(`qa:bet-sheet-pending-age: ${results.filter((r) => r.state === "PASS").length} passed, ${failures.length} failed, ${outstanding.length} NOT MEASURED, ${tiles.length} tiles. Read every tile: ${OUT}`);
  process.exitCode = evidence.invalidPremise ? 2 : failures.length ? 1 : outstanding.length ? 3 : 0;
}

if (SELF_TEST) await selfTest();
else await live();
