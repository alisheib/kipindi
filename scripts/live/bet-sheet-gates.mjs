/**
 * S8 WP11 · THE KIT OF TWO OUTSTANDING BROWSER GATES — admission BUSY, and the canonical row-23 transport refusals
 * ("Invalid bet parameters." and "Invalid side."), as `docs/qa/s8-outstanding-browser-proof-plan-20261014.md` specifies
 * them. Imported by `scripts/live/bet-sheet-busy-drive.mjs` (`qa:bet-sheet-busy`) and
 * `scripts/live/bet-sheet-transport-drive.mjs` (`qa:bet-sheet-transport`).
 *
 * TWO HALVES.
 *  · PURE, exported for each drive's `--self-test`, which plants every failure: the strict multipart reader the transport
 *    control alters one field of a REAL Server Action body with (`parseMultipart`, `actionFields`, `plantTransport`,
 *    `plantErrors`); the flight reader that takes the action's actual returned value out of its real response
 *    (`flightResult`); and the verdicts. A cell whose premise fails is INVALID, an unobserved result NOT MEASURED, and
 *    neither is ever PASS.
 *  · BROWSER: the exclusive local memory premise, the synthetic players (qa-bet-sheet.mjs's `freshPlayer`, the same
 *    door, phone scheme and name), the owner-scoped observer (`/api/dev-test/bet-sheet-observe`), the operator's
 *    authenticated admission snapshot (`/api/admin/admission`), and the sheet's own probes scoped to the sheet.
 *
 * ⛔ LOCAL ONLY. Every request goes to the operator's own `http://localhost:PORT` in-memory server, which must be this
 * checkout's `next dev` serving HEAD with no database. No cookie, session or pass is ever written to evidence; keys, ids
 * and owners are recorded as 12-hex SHA-256 digests beside their equality verdicts.
 */
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { premise, LOCALE_COOKIE } from "./journey-pass.mjs";
import { BET_SHEET_SELECTORS as S } from "./bet-sheet-cells.mjs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export { S };

/* ─── Pure: sanitizing ───────────────────────────────────────────────────────────────────────────────────────── */

/** A 12-hex SHA-256 digest: evidence names an id without carrying it. */
export const digest = (value) => (value === null || value === undefined ? null : createHash("sha256").update(String(value)).digest("hex").slice(0, 12));
export const fileDigest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/* ─── Pure: the Server Action's request body ─────────────────────────────────────────────────────────────────── */

/**
 * ⭐ THE REQUEST THE SHEET BUILDS — `requestFor` (src/lib/journey/sheet-state.ts) sets exactly these eight fields. A body
 * with a field missing, doubled or unknown is not the encoding this control was written for: INVALID, never a guess.
 */
export const REQUEST_FIELDS = Object.freeze(["marketId", "side", "stake", "idempotencyKey", "expectedOwnerId", "funnelOrigin", "funnelUtmSource", "funnelUtmCampaign"]);
/** The value the invalid-side control sends in place of YES/NO. */
export const INVALID_SIDE = "MAYBE";
export const TRANSPORT_MODES = Object.freeze({
  "missing-params": { field: "marketId", refusal: "Invalid bet parameters." },
  "invalid-side": { field: "side", refusal: "Invalid side." },
});

/** Rebuild a multipart body from raw part segments (each `headers\r\n\r\nvalue`, exactly as read). */
export function buildMultipart(boundary, raws, epilogue = "\r\n") {
  const delim = `--${boundary}`;
  return Buffer.from(`${delim}\r\n${raws.join(`\r\n${delim}\r\n`)}\r\n${delim}--${epilogue}`, "latin1");
}

/**
 * ⭐ A STRICT multipart/form-data reader. Accepts one shape only — named string fields, each with a single
 * Content-Disposition header — and proves its own reading by rebuilding the body BYTE FOR BYTE. Anything else (a file
 * part, an extra header, a preamble, an epilogue, a second boundary parameter, a body that does not round-trip) is
 * `{ ok: false, why }`: the drive then sends nothing and the cell is INVALID.
 */
export function parseMultipart(body, contentType) {
  if (!Buffer.isBuffer(body)) return { ok: false, why: "the request body is not bytes" };
  const ct = String(contentType ?? "");
  const m = /^multipart\/form-data;\s*boundary=(?:"([^"\r\n]+)"|([^\s;"]+))\s*$/i.exec(ct);
  if (!m) return { ok: false, why: `not one single-boundary multipart/form-data body (${ct.split(";")[0] || "no content type"})` };
  const boundary = m[1] ?? m[2];
  const text = body.toString("latin1");
  const delim = `--${boundary}`;
  if (!text.startsWith(`${delim}\r\n`)) return { ok: false, why: "the body does not open with its boundary" };
  const close = `\r\n${delim}--`;
  const end = text.lastIndexOf(close);
  if (end < delim.length) return { ok: false, why: "the body has no closing boundary" };
  const epilogue = text.slice(end + close.length);
  if (epilogue !== "\r\n" && epilogue !== "") return { ok: false, why: "the body carries an epilogue" };
  const inner = text.slice(delim.length + 2, end);
  const parts = [];
  for (const raw of inner.split(`\r\n${delim}\r\n`)) {
    const sep = raw.indexOf("\r\n\r\n");
    if (sep < 0) return { ok: false, why: "a part has no header block" };
    const head = raw.slice(0, sep);
    if (head.includes("\r\n")) return { ok: false, why: "a part carries a header other than Content-Disposition" };
    const d = /^Content-Disposition: form-data; name="([^"]*)"$/i.exec(head);
    if (!d) return { ok: false, why: "a part is not a plain named string field (a file, or an unknown disposition)" };
    parts.push({ name: d[1], value: raw.slice(sep + 4), raw });
  }
  if (!buildMultipart(boundary, parts.map((p) => p.raw), epilogue).equals(body)) return { ok: false, why: "the body does not round-trip byte for byte" };
  return { ok: true, boundary, epilogue, parts };
}

/** The reply codec this checkout serves: React's encoder (the page) and decoder (the server), as Next compiles them. */
const REPLY_CLIENT = "node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js";
const REPLY_SERVER = "node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-server.node.development.js";

/**
 * ⭐ HOW A FormData ARGUMENT'S FIELDS ARE NAMED — read out of the INSTALLED codec, never typed here. The encoder names
 * them `formFieldPrefix + <sep> + <part id> + <sep>` and refers to them as `$K<hex id>`; the server's decoder collects
 * every field starting with `_prefix + <sep> + <hex id> + <sep>`. Both expressions are extracted from the two files;
 * a codec whose code no longer matches (a React upgrade) yields null, and then every body is unread: INVALID.
 */
export function replyPrefixRule(root = ROOT) {
  let client, server;
  try { client = readFileSync(join(root, REPLY_CLIENT), "utf8"); server = readFileSync(join(root, REPLY_SERVER), "utf8"); } catch { return null; }
  const c = /if \(value instanceof FormData\) \{[\s\S]{0,300}?var prefix = formFieldPrefix \+ "([^"]*)" \+ key \+ "([^"]*)";[\s\S]{0,300}?return "\$K" \+ key\.toString\(16\);/.exec(client);
  const s = /case "K":\s*key = value\.slice\(2\);\s*obj = response\._prefix \+ "([^"]*)";\s*key = obj \+ key \+ "([^"]*)";/.exec(server);
  if (!c || !s) return null;
  return { encoder: (id) => `${c[1]}${id}${c[2]}`, decoder: (hex) => `${s[1]}${hex}${s[2]}`, files: [REPLY_CLIENT, REPLY_SERVER] };
}
export const REPLY_RULE = replyPrefixRule();

/**
 * ⭐ THE ONE FormData ARGUMENT, as the installed codec writes and reads it — derived from the payload and the codec,
 * never assumed. The root model (field `0`, the action's empty field prefix) must be a one-element array holding a
 * FormData reference (`$K<hex id>`); the encoder's and the decoder's prefix for that id must agree; its fields are then
 * the parts carrying that prefix, and NO other part may exist. The fields must be exactly REQUEST_FIELDS, once each.
 */
export function actionFields(parsed, rule = REPLY_RULE) {
  if (!parsed?.ok) return { ok: false, why: parsed?.why ?? "the body was not read" };
  if (!rule) return { ok: false, why: "the installed reply codec's FormData naming could not be read" };
  const roots = parsed.parts.filter((p) => p.name === "0");
  if (roots.length !== 1) return { ok: false, why: `${roots.length} root model fields` };
  let model;
  try { model = JSON.parse(roots[0].value); } catch { return { ok: false, why: "the root model is not JSON" }; }
  if (!Array.isArray(model) || model.length !== 1 || typeof model[0] !== "string") return { ok: false, why: "the root model is not exactly one argument" };
  const ref = /^\$K([0-9a-f]+)$/.exec(model[0]);
  if (!ref) return { ok: false, why: "the one argument is not a FormData reference" };
  const prefix = rule.decoder(ref[1]);
  if (rule.encoder(parseInt(ref[1], 16)) !== prefix) return { ok: false, why: "the encoder and the decoder name this reference's fields differently" };
  const fields = {};
  for (const p of parsed.parts) {
    if (p === roots[0]) continue;
    if (!p.name.startsWith(prefix)) return { ok: false, why: "a field lies outside the referenced FormData" };
    const name = p.name.slice(prefix.length);
    if (!REQUEST_FIELDS.includes(name)) return { ok: false, why: "a field the request builder never sets" };
    if (Object.prototype.hasOwnProperty.call(fields, name)) return { ok: false, why: `the field ${name} appears twice` };
    fields[name] = p.value;
  }
  const missing = REQUEST_FIELDS.filter((n) => !Object.prototype.hasOwnProperty.call(fields, n));
  if (missing.length) return { ok: false, why: `missing ${missing.join(", ")}` };
  return { ok: true, prefix, fields, names: parsed.parts.map((p) => p.name) };
}

/** ⭐ ALTER ONE FIELD of a read body: remove `marketId` (missing parameters) or replace `side`'s value (invalid side). */
export function plantTransport(parsed, af, mode) {
  const spec = TRANSPORT_MODES[mode];
  if (!spec) return { ok: false, why: `unknown mode ${mode}` };
  if (!parsed?.ok || !af?.ok) return { ok: false, why: "the body was not read" };
  const name = af.prefix + spec.field;
  const hits = parsed.parts.filter((p) => p.name === name);
  if (hits.length !== 1) return { ok: false, why: `${hits.length} ${spec.field} fields` };
  if (mode === "invalid-side" && af.fields.side !== "YES" && af.fields.side !== "NO") return { ok: false, why: "the original side is not YES or NO" };
  if (mode === "missing-params" && !af.fields.marketId) return { ok: false, why: "the original marketId is already empty" };
  const raws = [];
  for (const p of parsed.parts) {
    if (p !== hits[0]) { raws.push(p.raw); continue; }
    if (mode === "missing-params") continue;
    raws.push(p.raw.slice(0, p.raw.length - p.value.length) + INVALID_SIDE);
  }
  return { ok: true, body: buildMultipart(parsed.boundary, raws, parsed.epilogue), field: spec.field, change: mode === "missing-params" ? "removed" : `${af.fields.side} → ${INVALID_SIDE}` };
}

/** Every way a planted body differs from its original other than the one intended change. Empty = exactly one change. */
export function plantErrors(parsed, af, body, contentType, mode) {
  const spec = TRANSPORT_MODES[mode];
  if (!spec) return [`unknown mode ${mode}`];
  const after = parseMultipart(body, contentType);
  if (!after.ok) return [`the planted body is unreadable: ${after.why}`];
  if (after.boundary !== parsed.boundary || after.epilogue !== parsed.epilogue) return ["the planted body changed its framing"];
  const target = af.prefix + spec.field;
  const errors = [];
  const before = parsed.parts.filter((p) => p.name !== target), kept = after.parts.filter((p) => p.name !== target);
  if (before.length !== kept.length || before.some((p, i) => p.raw !== kept[i].raw)) errors.push("a field other than the target changed, moved or vanished");
  const t = after.parts.filter((p) => p.name === target);
  if (mode === "missing-params" && t.length !== 0) errors.push("marketId is still present");
  if (mode === "invalid-side") {
    if (t.length !== 1 || t[0].value !== INVALID_SIDE) errors.push("side does not carry the planted invalid value");
    if (after.parts.map((p) => p.name).join("|") !== parsed.parts.map((p) => p.name).join("|")) errors.push("the field order changed");
  }
  return errors;
}

/* ─── Pure: the Server Action's response ─────────────────────────────────────────────────────────────────────── */

/**
 * ⭐ THE ACTION'S RETURNED VALUE, read out of its real flight response: row `0` is the root model, whose `a` names the
 * row holding the action's result (`$@<hex>`), or carries it inline. Only MODEL rows count — a row whose payload opens
 * with an uppercase tag (`D` debug info, `I` import, `H` hint, `E` error, `T` text, …) describes, it does not answer; a
 * dev server writes `1:D"$2"` before `1:{…}`. Two model rows for one id are ambiguous. Anything else is `{ ok: false, why }`.
 */
export function flightResult(text) {
  if (typeof text !== "string" || text === "") return { ok: false, why: "an empty answer" };
  const rows = new Map();
  for (const line of text.split("\n")) {
    const m = /^([0-9a-f]+):(.*)$/.exec(line);
    if (!m || /^[A-Z]/.test(m[2])) continue;
    if (rows.has(m[1])) return { ok: false, why: `two model rows for row ${m[1]}` };
    rows.set(m[1], m[2]);
  }
  let model;
  try { model = JSON.parse(rows.get("0") ?? ""); } catch { return { ok: false, why: "no JSON root row" }; }
  if (!model || typeof model !== "object" || !("a" in model)) return { ok: false, why: "the root row names no action result" };
  if (typeof model.a === "string") {
    const ref = /^\$@([0-9a-f]+)$/.exec(model.a);
    if (!ref) return { ok: false, why: "the action result is not a row reference" };
    try { return { ok: true, value: JSON.parse(rows.get(ref[1]) ?? "") }; } catch { return { ok: false, why: "the action result row is not JSON" }; }
  }
  return { ok: true, value: model.a };
}

/** The sanitized summary of a returned value: never a raw RSC payload, a cookie or a full id. */
export function resultSummary(value) {
  if (!value || typeof value !== "object") return { shape: typeof value };
  const out = { ok: value.ok, keys: Object.keys(value).sort() };
  for (const k of ["error", "code", "reason", "retryAfterSec"]) if (k in value) out[k] = value[k];
  if (value.data && typeof value.data === "object") {
    out.replayed = value.data.replayed === true;
    out.positionDigest = digest(value.data.positionId);
  }
  return out;
}

/* ─── Pure: verdicts ─────────────────────────────────────────────────────────────────────────────────────────── */

const verdict = (state, errors = []) => ({ state, errors });
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The sheet the protocol taps: the edit frame, its CTA enabled and reading "Place bet · {min}", the stake unlocked. */
export function healthySheetErrors(sheet, expectedPlace) {
  const errors = [];
  if (!sheet?.present) return ["no sheet is open"];
  if (sheet.frame !== "edit") errors.push(`frame ${sheet.frame}, expected edit`);
  if (!sheet.cta?.enabled) errors.push("the CTA is disabled");
  if (norm(sheet.cta?.text) !== norm(expectedPlace)) errors.push(`CTA reads ${JSON.stringify(norm(sheet.cta?.text))}, expected ${JSON.stringify(norm(expectedPlace))}`);
  if (sheet.stakeLocked) errors.push("the stake is locked before any tap");
  if (sheet.balanceKnown !== true) errors.push("the balance row does not show the read balance");
  return errors;
}

/** ⭐ THE HELD SLOT, read from the operator's authenticated snapshot (plan BUSY step 2). Errors = the premise is absent. */
export function holdPremiseErrors({ before, held, maxWaitCeilingMs = 20_000 }) {
  const errors = [];
  if (!before || !held) return ["no authenticated admission snapshot"];
  if (before.inFlight !== 0 || before.queueDepth !== 0) errors.push(`an unrelated admission holder before the hold (inFlight ${before.inFlight}, queue ${before.queueDepth})`);
  if (held.limits?.maxInFlight !== 1) errors.push(`maxInFlight ${held.limits?.maxInFlight}, expected 1`);
  if (held.inFlight !== 1) errors.push(`inFlight ${held.inFlight}, expected 1`);
  if (held.queueDepth !== 0) errors.push(`queueDepth ${held.queueDepth}, expected 0`);
  const wait = held.limits?.maxWaitMs;
  if (!(typeof wait === "number" && wait > 0 && wait <= maxWaitCeilingMs)) errors.push(`maxWaitMs ${wait} is outside (0, ${maxWaitCeilingMs}]`);
  if (held.limits?.maxQueue !== before.limits?.maxQueue || held.limits?.maxWaitMs !== before.limits?.maxWaitMs) errors.push("the hold changed more than maxInFlight");
  if (held.admitted !== before.admitted + 1 || held.shed !== before.shed || held.timedOut !== before.timedOut) errors.push("the counters moved by more than the hold's own admission");
  return errors;
}

/**
 * ⭐ ONE BUSY TAP (plan BUSY step 3). The order is the protocol's: the premise (INVALID), then whether a request and
 * its answer were observed at all (NOT MEASURED), an HTTP fault or an answer that did not come from the server (FAIL),
 * an ADMITTED tap or another refusal (NOT MEASURED — the busy premise did not hold), then the answer, the frame, the
 * words and the player's own money rows (FAIL).
 */
export function busyTapVerdict(e) {
  const premise = [...new Set([...(e.premiseErrors ?? []), ...healthySheetErrors(e.before, e.expected?.place)])];
  if (premise.length) return verdict("INVALID", premise);
  if (!e.request?.observed) return verdict("NOT MEASURED", ["no bet action request left the page"]);
  if (!e.response?.observed) return verdict("NOT MEASURED", ["no answer to the bet action was observed"]);
  if (e.response.status !== 200) return verdict("FAIL", [`HTTP ${e.response.status} for the bet action`]);
  if (!e.response.serverAddr) return verdict("FAIL", ["the answer the page received did not come from the server"]);
  if (!e.response.result?.ok) return verdict("NOT MEASURED", [`the answer could not be read: ${e.response.result?.why ?? "unread"}`]);
  const v = e.response.result.value;
  if (v?.ok === true) return verdict("NOT MEASURED", ["the tap was ADMITTED: the busy premise did not hold"]);
  const moved = (e.money?.positionsDelta ?? 0) !== 0 || (e.money?.ledgerDelta ?? 0) !== 0;
  if (v?.code !== "BUSY") {
    if (moved) return verdict("FAIL", [`a refusal (${JSON.stringify(v?.code ?? v?.reason ?? null)}) with own money rows moved`]);
    return verdict("NOT MEASURED", [`the answer was ${JSON.stringify(v?.code ?? v?.reason ?? v?.error ?? null)}, not BUSY`]);
  }
  const errors = [];
  if (!(typeof v.retryAfterSec === "number" && v.retryAfterSec > 0)) errors.push("the BUSY answer carries no retry information");
  if (e.outcome?.row !== 1) errors.push(`the source's refusal matrix reads the actual answer as row ${e.outcome?.row}, not row 1`);
  if (e.request.count !== 1) errors.push(`${e.request.count} bet action requests, expected 1`);
  const f = e.after;
  if (!f?.present) errors.push("the sheet closed on BUSY");
  else {
    if (f.frame !== "edit") errors.push(`frame ${f.frame}, expected the edit frame with the busy line`);
    if (!deepEqual(f.lines.map(norm), [norm(e.expected.busyLine)])) errors.push(`the sheet's lines read ${JSON.stringify(f.lines)}, expected only the busy line`);
    if (norm(f.cta?.text) !== norm(e.expected.retryCta) || !f.cta?.enabled) errors.push(`CTA ${JSON.stringify(norm(f.cta?.text))} (${f.cta?.enabled ? "enabled" : "disabled"}), expected ${JSON.stringify(norm(e.expected.retryCta))} enabled`);
    if (norm(f.stakeValue).replace(/,/g, "") !== String(e.expected.stake)) errors.push(`the stake reads ${f.stakeValue}, expected ${e.expected.stake}`);
  }
  if (e.money?.positionsDelta !== 0) errors.push(`own positions moved by ${e.money?.positionsDelta}`);
  if (e.money?.ledgerDelta !== 0) errors.push(`own BET_PLACED rows moved by ${e.money?.ledgerDelta}`);
  return verdict(errors.length ? "FAIL" : "PASS", errors);
}

/** ⭐ THE COUNTERS (plan BUSY step 3): the refusals are admission's wait-budget timeouts, one per tap, and nothing else ran. */
export function admissionMoveErrors({ held, after, taps, maxQueueSeen }) {
  const errors = [];
  if (!held || !after) return ["no admission snapshot around the taps"];
  if (after.timedOut - held.timedOut !== taps) errors.push(`timedOut moved by ${after.timedOut - held.timedOut}, expected ${taps}`);
  if (after.shed !== held.shed) errors.push(`shed moved by ${after.shed - held.shed}, expected 0`);
  if (after.admitted !== held.admitted) errors.push(`admitted moved by ${after.admitted - held.admitted} while the slot was held`);
  if (after.inFlight !== 1 || after.queueDepth !== 0) errors.push(`after the refusals inFlight ${after.inFlight}, queue ${after.queueDepth}; expected 1 and 0 (the hold alone)`);
  if (maxQueueSeen !== taps) errors.push(`the queue was seen holding ${maxQueueSeen} waiters, expected ${taps}`);
  return errors;
}

/** ⭐ THE RELEASE (plan BUSY step 4): the original limits back, the queue drained, no holder. */
export function restoreErrors({ original, restored }) {
  const errors = [];
  if (!original || !restored) return ["no admission snapshot around the release"];
  if (!deepEqual(restored.limits, original.limits)) errors.push(`limits ${JSON.stringify(restored.limits)}, expected the original ${JSON.stringify(original.limits)}`);
  if (restored.inFlight !== 0) errors.push(`inFlight ${restored.inFlight} after the release`);
  if (restored.queueDepth !== 0) errors.push(`queueDepth ${restored.queueDepth} after the release`);
  return errors;
}

/**
 * ⭐ THE EXPLICIT RETRY (plan BUSY step 4; rows 23's last step): the SAME original key, exactly one own position carrying
 * it, exactly one BET_PLACED row, a NEW placement (the refused attempt never ran), and the real receipt naming it.
 */
export function retryVerdict(e) {
  const errors = [];
  if (!e.originalKey) return verdict("INVALID", ["the original attempt's key was never read"]);
  if (!e.retry?.observed) return verdict("NOT MEASURED", ["no retry request left the page"]);
  if (e.retry.key !== e.originalKey) errors.push("the retry sent a different key than the original attempt");
  for (const [field, value] of Object.entries(e.expectedQuote ?? {})) if (e.retry.fields?.[field] !== value) errors.push(`the retry's ${field} is not the original quote's`);
  if (e.requests !== 2) errors.push(`${e.requests} bet action requests in all, expected 2 (the refused one and the retry)`);
  if (!e.response?.serverAddr) errors.push("the retry's answer did not come from the server");
  const v = e.response?.result?.ok ? e.response.result.value : null;
  if (v?.ok !== true) errors.push(`the retry's answer is ${JSON.stringify(resultSummary(v))}, not a placement`);
  else if (v.data?.replayed === true) errors.push("the retry was a REPLAY: the refused attempt had placed a bet");
  const fresh = (e.after?.positions ?? []).filter((p) => !(e.before?.positions ?? []).some((b) => b.positionId === p.positionId));
  if ((e.after?.positionCount ?? 0) - (e.before?.positionCount ?? 0) !== 1 || fresh.length !== 1) errors.push(`own positions moved by ${(e.after?.positionCount ?? 0) - (e.before?.positionCount ?? 0)}, expected exactly 1`);
  else if (fresh[0].key !== e.originalKey) errors.push("the new position does not carry the original key");
  if ((e.after?.betPlacedCount ?? 0) - (e.before?.betPlacedCount ?? 0) !== 1) errors.push(`own BET_PLACED rows moved by ${(e.after?.betPlacedCount ?? 0) - (e.before?.betPlacedCount ?? 0)}, expected exactly 1`);
  if (v?.ok === true && fresh[0] && v.data?.positionId !== fresh[0].positionId) errors.push("the answer's ticket is not the new position");
  if (e.sheet?.frame !== "receipt") errors.push(`frame ${e.sheet?.frame}, expected the receipt`);
  else if (!fresh[0] || norm(e.sheet.ticketId) !== fresh[0].positionId || !String(e.sheet.ticketHref ?? "").includes(fresh[0].positionId)) errors.push("the receipt does not name the new position");
  return verdict(errors.length ? "FAIL" : "PASS", errors);
}

/**
 * ⭐ ONE ROW-23 TRANSPORT CELL. The premise and the encoding (INVALID), whether the request was intercepted and answered
 * (NOT MEASURED), then the transport's honesty — forwarded to the real server, its real answer delivered (FAIL when a
 * fabricated reply is detected, whatever the drive's own record claims) — then the actual refusal, the source's row,
 * the frame, the words, the kept key and quote, and the money (FAIL).
 */
export function transportVerdict(e) {
  const premise = [...new Set([...(e.premiseErrors ?? []), ...healthySheetErrors(e.before, e.expected?.place)])];
  if (premise.length) return verdict("INVALID", premise);
  if (!e.transport?.intercepted) return verdict("NOT MEASURED", ["the first bet action request was never intercepted"]);
  if (!e.transport.parse?.ok) return verdict("INVALID", [`unknown or ambiguous encoding: ${e.transport.parse?.why ?? "unread"}`]);
  if (e.transport.plantErrors?.length) return verdict("INVALID", e.transport.plantErrors);
  const errors = [];
  if (e.transport.forwarded !== "continue") errors.push(`the altered request was not forwarded to the server (${e.transport.forwarded ?? "none"})`);
  if (!e.response?.observed) return verdict("NOT MEASURED", ["no answer to the altered request was observed", ...errors]);
  if (!e.response.serverAddr) errors.push("FABRICATED: the answer the page received did not come from the server");
  if (errors.length) return verdict("FAIL", errors);
  if (e.response.status !== 200) return verdict("FAIL", [`HTTP ${e.response.status} for the altered request`]);
  if (!e.response.result?.ok) return verdict("NOT MEASURED", [`the answer could not be read: ${e.response.result?.why ?? "unread"}`]);
  const v = e.response.result.value;
  const exact = v && typeof v === "object" && Object.keys(v).sort().join() === "error,ok" && v.ok === false && v.error === e.expected.refusal;
  if (!exact) errors.push(`the server answered ${JSON.stringify(resultSummary(v))}, not the bare refusal ${JSON.stringify(e.expected.refusal)}`);
  if (e.outcome?.row !== 23) errors.push(`the source's refusal matrix reads the actual answer as row ${e.outcome?.row}, not row 23`);
  if (e.requests !== 1) errors.push(`${e.requests} bet action requests, expected 1`);
  const f = e.after;
  if (!f?.present) errors.push("the sheet closed on the refusal");
  else {
    if (f.frame !== "inDoubt") errors.push(`frame ${f.frame}, expected inDoubt (row 23 is row 2's handling)`);
    if (!deepEqual(f.lines.map(norm), [norm(e.expected.systemError)])) errors.push(`the sheet's lines read ${JSON.stringify(f.lines)}, expected only the check-your-wallet line`);
    if (norm(f.cta?.text) !== norm(e.expected.retryCta) || !f.cta?.enabled) errors.push(`CTA ${JSON.stringify(norm(f.cta?.text))} (${f.cta?.enabled ? "enabled" : "disabled"}), expected ${JSON.stringify(norm(e.expected.retryCta))} enabled`);
    if (!f.stakeLocked || norm(f.stakeValue).replace(/,/g, "") !== String(e.expected.stake)) errors.push(`the stake is ${f.stakeLocked ? "locked" : "editable"} at ${f.stakeValue}, expected locked at ${e.expected.stake}`);
    const claims = (e.expected.moneyClaims ?? []).filter((claim) => norm(f.text).includes(norm(claim)));
    const phrases = (e.expected.claimPatterns ?? []).filter((source) => new RegExp(source, "i").test(norm(f.text)));
    if (claims.length || phrases.length) errors.push(`the sheet promises nothing was charged: ${JSON.stringify([...claims, ...phrases])}`);
  }
  if (!e.stored?.keyKept) errors.push("the original key is not kept in the owner's recovery record");
  if (!e.stored?.quoteKept) errors.push("the original quote is not kept with the key");
  if (e.money?.positionsDelta !== 0) errors.push(`own positions moved by ${e.money?.positionsDelta}`);
  if (e.money?.ledgerDelta !== 0) errors.push(`own BET_PLACED rows moved by ${e.money?.ledgerDelta}`);
  return verdict(errors.length ? "FAIL" : "PASS", errors);
}

/** The tally of a run: exit 0 all PASS, 1 a FAIL, 2 an INVALID premise, 3 NOT MEASURED/NOT DRIVEN outstanding. */
export function exitCodeFor(results) {
  if (results.some((r) => r.state === "FAIL")) return 1;
  if (results.some((r) => r.state === "INVALID")) return 2;
  if (results.some((r) => r.state === "NOT MEASURED" || r.state === "NOT DRIVEN")) return 3;
  return 0;
}

/* ─── The copy the source defines, and the source's own refusal matrix ───────────────────────────────────────── */

/**
 * The dictionary, `fill`/`formatTzs` and `refusalOutcome`, bundled from the checkout itself (the way qa-bet-sheet.mjs
 * bundles sheet-owned-storage.ts): every expected sentence is the source's, never typed into a drive.
 */
export async function sourceModules() {
  const { build } = await import("esbuild");
  const bundle = await build({
    stdin: {
      contents: 'export { dict } from "./src/lib/i18n-dict.ts"; export { fill, formatTzs } from "./src/lib/utils.ts"; export { refusalOutcome } from "./src/lib/journey/sheet-refusal.ts";',
      loader: "ts", resolveDir: ROOT,
    },
    bundle: true, write: false, platform: "node", format: "cjs", tsconfig: join(ROOT, "tsconfig.json"), logLevel: "silent",
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", bundle.outputFiles[0].text)(module, module.exports, (await import("node:module")).createRequire(join(ROOT, "package.json")));
  const { dict, fill, formatTzs, refusalOutcome } = module.exports;
  const text = (locale, key, vars = {}) => {
    let value = dict[locale];
    for (const part of key.split(".")) value = value?.[part];
    if (typeof value !== "string") throw new Error(`The dictionary has no ${locale}.${key}`);
    const shown = {};
    for (const [k, v] of Object.entries(vars)) shown[k] = typeof v === "number" ? formatTzs(v) : v;
    return fill(value, shown);
  };
  return { text, refusalOutcome };
}

/** The sentences that tell a player nothing was placed or charged (the matrix's `moneyClaim` rows): never shown in doubt. */
export const MONEY_CLAIM_KEYS = Object.freeze(["journey.sheetBusy", "error.failMaintenance", "error.failWalletMissing", "error.failIdempotencyKeyConflict"]);

/* ─── Browser: the exclusive local memory premise ────────────────────────────────────────────────────────────── */

function listenerChain(port) {
  const pids = new Set();
  for (const line of execFileSync("netstat", ["-ano"], { encoding: "utf8" }).split(/\r?\n/)) {
    const m = /^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i.exec(line);
    if (m && Number(m[2]) === port) pids.add(Number(m[3]));
  }
  if (pids.size !== 1) return { pids: [...pids], chain: [] };
  const [pid] = pids;
  const script = `$p=${pid};$o=@();for($i=0;$i -lt 6 -and $p;$i++){$x=Get-CimInstance Win32_Process -Filter "ProcessId=$p";if(-not $x){break};$o+=[pscustomobject]@{pid=$x.ProcessId;parent=$x.ParentProcessId;cmd=[string]$x.CommandLine};$p=$x.ParentProcessId};ConvertTo-Json -Compress -InputObject $o`;
  const raw = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" }).trim();
  const parsed = raw ? JSON.parse(raw) : [];
  return { pids: [pid], chain: Array.isArray(parsed) ? parsed : [parsed] };
}

/**
 * ⭐ THE PREMISE EVERY CELL STANDS ON: this checkout's own `next dev` on `http://localhost:PORT`, in memory, serving HEAD.
 *  · journey-pass.mjs's `premise`: localhost exactly, `/api/health` database.configured === false, a rollout a pass sees;
 *  · DISABLE_ADMIN_TOTP=true (the operator's admission snapshot and the preview door need it);
 *  · no DATABASE_URL in this drive's environment, and the observer — which refuses any configured database — answers;
 *  · exactly one listener on the port, whose process (or a parent) is `next dev` started from THIS checkout;
 *  · no uncommitted change under the served tree, so the served source is HEAD's.
 * Answers `{ refuse }` or `{ refuse: null, health, identity }`.
 */
export async function exclusiveLocalPremise(base) {
  if (process.env.DATABASE_URL) return { refuse: "this drive's own environment carries DATABASE_URL" };
  const pre = await premise(base);
  if (pre.refuse) return { refuse: pre.refuse };
  if (pre.health?.security?.adminTotp !== "DISABLED") return { refuse: "the local preview needs DISABLE_ADMIN_TOTP=true" };
  const port = Number(new URL(base).port);
  let listener;
  try { listener = listenerChain(port); } catch (error) { return { refuse: `the port's listener could not be read: ${String(error.message).slice(0, 120)}` }; }
  if (listener.pids.length !== 1) return { refuse: `${listener.pids.length} processes listen on port ${port}; exactly one (this checkout's next dev) is required` };
  const rootKey = ROOT.replace(/\\/g, "/").replace(/\/$/, "").toLowerCase();
  const own = listener.chain.find((p) => p.cmd.replace(/\\/g, "/").toLowerCase().includes(rootKey) && /\bnext\b/i.test(p.cmd));
  const devServer = listener.chain.some((p) => /\bnext\b[\s\S]*\bdev\b|start-server/i.test(p.cmd));
  if (!own || !devServer) return { refuse: `the listener on port ${port} is not this checkout's next dev (${ROOT})` };
  const head = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["-C", ROOT, "status", "--porcelain", "--", "src", "public", "next.config.ts", "tsconfig.json", "package-lock.json", "postcss.config.mjs", "tailwind.config.ts"], { encoding: "utf8" }).trim();
  if (dirty) return { refuse: "the served tree has uncommitted changes, so the served source is not HEAD's" };
  return {
    refuse: null, health: pre.health,
    identity: { head, port, listenerPid: listener.pids[0], listenerFromCheckout: true, journeyState: pre.health?.simpleJourney?.state, database: pre.health?.database?.configured, adminTotp: pre.health?.security?.adminTotp },
  };
}

/** The output directory: outside the repository, created. */
export function outputDir(raw, fallbackName) {
  const out = resolve(raw ?? join("F:/50pick-work/s8-gates", fallbackName));
  const rel = relative(ROOT, out);
  if (!rel.startsWith("..") && !isAbsolute(rel)) throw new Error("REFUSED: output must be outside the repository");
  mkdirSync(out, { recursive: true });
  return out;
}

/* ─── Browser: doors, players, observers ─────────────────────────────────────────────────────────────────────── */

export const asCookie = (base, c) => ({ name: c.name, value: c.value, domain: new URL(base).hostname, path: c.path || "/" });

export async function post(base, ctx, name, data = {}, query = "") {
  const response = await ctx.request.post(`${base}/api/dev-test/${name}${query}`, { data, timeout: 240_000 })
    .catch((error) => { throw new Error(`${name} request failed: ${String(error.message).split("Call log:")[0].trim()}`); });
  const body = await response.json().catch(() => null);
  if (!response.ok() || body?.ok === false) throw new Error(`${name} failed (${response.status()})`);
  return body;
}

/**
 * qa-bet-sheet.mjs's `freshPlayer`: a unique `+25571…` phone, "Local Sheet Matrix", a known seeded balance and real
 * authenticated cookies set by the seed door in this context's own jar. A collision note is an INVALID premise.
 */
export async function freshPlayer(browser, base, pass, { balance = 100_000, locale = "en", viewport = { width: 390, height: 844 }, contexts, controlledNetwork = false } = {}) {
  // A controlled-transport context blocks the service worker, as qa-bet-sheet.mjs's fault-injection context does, so
  // every request of the page reaches Playwright's router; the bet path itself never touches the worker (sw.js: GET only).
  const ctx = await browser.newContext({ viewport, ...(controlledNetwork ? { serviceWorkers: "block" } : {}) });
  contexts?.add(ctx);
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: base }, asCookie(base, pass)]);
  const phone = `+25571${String(parseInt(randomUUID().replaceAll("-", "").slice(0, 10), 16) % 10_000_000).padStart(7, "0")}`;
  const seeded = await post(base, ctx, "seed-admin", { role: "PLAYER", phone, name: "Local Sheet Matrix", balance });
  if (seeded.note) throw new Error("Synthetic account already existed: invalid fresh-player premise");
  return { ctx, userId: seeded.userId, locale, viewport };
}

/** The authenticated owner's own positions and BET_PLACED rows on one question (the existing guarded observer). */
export async function observed(base, ctx, marketId) {
  const response = await ctx.request.get(`${base}/api/dev-test/bet-sheet-observe?marketId=${encodeURIComponent(marketId)}`);
  const body = await response.json().catch(() => null);
  if (!response.ok() || !body?.ok) throw new Error(`Observer premise failed (${response.status()})`);
  return body;
}

/** The operator's authenticated admission snapshot. */
export async function admissionSnapshot(base, ctx) {
  const response = await ctx.request.get(`${base}/api/admin/admission`, { timeout: 120_000 });
  const body = await response.json().catch(() => null);
  if (!response.ok() || body?.ok !== true || !body.admission) throw new Error(`The operator's admission snapshot is unavailable (${response.status()})`);
  const a = body.admission;
  return { at: Date.now(), inFlight: a.inFlight, queueDepth: a.queueDepth, admitted: a.admitted, shed: a.shed, timedOut: a.timedOut, limits: { ...a.limits }, poolSize: a.poolSize };
}

/**
 * Pages carry two OBSERVERS and nothing else — never a money hook:
 *  · the host-ready probe (the host's own click listener), as qa-bet-sheet.mjs's;
 *  · the page's copy of each bet action's answer. `window.fetch` is wrapped to pass every call through untouched — the
 *    same arguments, the same promise, the same Response object handed back — and, for a bet action (a `next-action`
 *    call whose FormData carries the idempotency field), to read a `Response.clone()` of what came back. The clone tees
 *    the bytes the page itself received; nothing is altered, delayed or invented. It exists because Chromium keeps no
 *    body for an answer that waited in admission's queue ("Network.getResponseBody: No data found for resource",
 *    measured on this drive's first runs), and an unread returned value is NOT MEASURED.
 */
export async function pageIn(base, ctx, route, sink) {
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    const isHost = (target, type, listener) => (target === window || target === document) && type === "click" && typeof listener === "function" && listener.toString().includes("a[data-bet-side]");
    EventTarget.prototype.addEventListener = function (type, listener, options) { const r = add.call(this, type, listener, options); if (isHost(this, type, listener)) window.__sheetHostReady = true; return r; };
    EventTarget.prototype.removeEventListener = function (type, listener, options) { const r = remove.call(this, type, listener, options); if (isHost(this, type, listener)) window.__sheetHostReady = false; return r; };
    const nativeFetch = window.fetch;
    window.__betAnswers = [];
    window.fetch = function (input, init) {
      const promise = nativeFetch.apply(this, arguments);
      try {
        const body = init && init.body;
        if (body instanceof FormData && new Headers(init.headers || undefined).has("next-action")) {
          let key = null;
          for (const [name, value] of body.entries()) if (/idempotencyKey$/.test(name)) key = String(value);
          if (key !== null) {
            const entry = { seq: window.__betAnswers.length, key, status: null, text: null, error: null };
            window.__betAnswers.push(entry);
            promise.then((res) => res.clone().text().then((t) => { entry.status = res.status; entry.text = t; }, (e) => { entry.error = String(e); }), (e) => { entry.error = String(e); });
          }
        }
      } catch { /* an observer never breaks the page's own call */ }
      return promise;
    };
  });
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) sink.push({ route, type: m.type(), text: m.text().slice(0, 400) }); });
  page.on("pageerror", (error) => sink.push({ route, type: "pageerror", text: String(error.message).slice(0, 400) }));
  await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForFunction(() => document.querySelector("main"), null, { timeout: 90_000 });
  await page.waitForTimeout(1200);
  return page;
}

/**
 * Every bet action request a page sends, from before the first tap: a POST carrying `next-action` whose body holds the
 * idempotency field. Opening and observing must leave this empty.
 */
export function betActionWatch(page) {
  const requests = [];
  const listener = (request) => {
    if (request.method() !== "POST" || !request.headers()["next-action"]) return;
    const body = request.postDataBuffer();
    if (body && body.includes("idempotencyKey")) requests.push(request);
  };
  page.on("request", listener);
  return { requests, stop: () => page.off("request", listener) };
}

/**
 * The idempotency key a request body carries — read leniently on purpose: Playwright reports a forwarded request's
 * ALTERED body (measured: after `route.continue({ postData })`, `postDataBuffer()` is the body sent), and the
 * missing-parameters plant is no longer a whole request, yet still carries its one key. Exactly one key part, or null.
 */
export function bodyKey(body, contentType) {
  const parsed = parseMultipart(body, contentType);
  const keys = parsed.ok ? parsed.parts.filter((p) => /(?:^|_)idempotencyKey$/.test(p.name)) : [];
  return keys.length === 1 && keys[0].value ? keys[0].value : null;
}

/** The request's sheet fields, read with the strict parser and the installed codec's naming. */
export function requestFields(request) {
  const parsed = parseMultipart(request.postDataBuffer(), request.headers()["content-type"]);
  return { parsed, af: actionFields(parsed, REPLY_RULE) };
}

const consumed = new WeakMap();
/**
 * ⭐ THE ANSWER TO ONE REQUEST, as the page received it: the status and whether a SERVER sent it (Playwright's
 * `serverAddr` — null for any answer a route fulfilled), the request's timing, and the returned value read from the
 * page's own copy (`pageIn`'s observer, matched by the request's key, oldest unread first), cross-checked against the
 * network copy whenever Chromium kept one. Two copies that differ, or none, leave the value unread.
 */
export async function answerOf(request, timeoutMs, page) {
  const response = await Promise.race([request.response(), new Promise((r) => setTimeout(() => r(undefined), timeoutMs))]);
  if (response === undefined) return { observed: false, why: `no answer within ${timeoutMs} ms` };
  if (response === null) return { observed: false, why: "the request failed before an answer" };
  let networkError = null;
  const [network, addr] = await Promise.all([
    response.text().catch((error) => { networkError = String(error.message).split("\n")[0].slice(0, 160); return null; }),
    response.serverAddr().catch(() => null),
  ]);
  const key = bodyKey(request.postDataBuffer(), request.headers()["content-type"]);
  let copy = null;
  if (page && key) {
    const used = consumed.get(page) ?? new Set();
    consumed.set(page, used);
    copy = await page.waitForFunction(([k, skip]) => (window.__betAnswers ?? []).find((a) => a.key === k && !skip.includes(a.seq) && (a.text !== null || a.error !== null)) ?? null, [key, [...used]], { timeout: 15_000 })
      .then((handle) => handle.jsonValue()).catch(() => null);
    if (copy) used.add(copy.seq);
  }
  let result, bodySource, diff = null;
  if (copy?.text != null && network != null) {
    // `text/x-component` names no charset, and Chromium hands the network copy over decoded as windows-1252 ("—" arrives
    // as "â€”", measured): the two copies agree when they are equal, or when the page's UTF-8 bytes read as windows-1252
    // are the network copy.
    const agree = copy.text === network ? "page copy = network copy"
      : new TextDecoder("windows-1252").decode(Buffer.from(copy.text, "utf8")) === network ? "page copy = network copy (read as windows-1252 by Chromium)" : null;
    bodySource = agree ?? "page copy ≠ network copy";
    if (agree) result = flightResult(copy.text);
    else {
      let at = 0;
      while (at < copy.text.length && copy.text[at] === network[at]) at++;
      diff = { pageLength: copy.text.length, networkLength: network.length, firstDifferenceAt: at, page: copy.text.slice(Math.max(0, at - 40), at + 60), network: network.slice(Math.max(0, at - 40), at + 60) };
      result = { ok: false, why: "the page's copy and the network copy of the answer differ" };
    }
  }
  else if (copy?.text != null) { bodySource = `page copy (network copy unavailable: ${networkError})`; result = flightResult(copy.text); }
  else if (network != null) { bodySource = "network copy (page copy unavailable)"; result = flightResult(network); }
  else { bodySource = "none"; result = { ok: false, why: `no copy of the answer could be read (${networkError ?? copy?.error ?? "the page kept none"})` }; }
  const t = request.timing();
  const timing = t && t.responseStart >= 0 ? { startTime: Math.round(t.startTime), sentToFirstByteMs: Math.round(t.responseStart - Math.max(0, t.requestStart)), toEndMs: Math.round(t.responseEnd) } : null;
  return { observed: true, status: response.status(), serverAddr: !!addr, contentType: response.headers()["content-type"] ?? null, result, bodySource, diff, timing, text: copy?.text ?? network };
}

export async function openSheet(page, wantedId = null, side = "YES") {
  await page.waitForFunction(() => window.__sheetHostReady === true, null, { timeout: 90_000 });
  const picks = page.locator(`${S.pick}[data-bet-side="${side}"]`);
  await picks.first().waitFor({ state: "visible", timeout: 120_000 });
  const index = await page.evaluate(([selector, id]) => [...document.querySelectorAll(selector)].findIndex((a) => {
    try { return !id || JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")).id === id; } catch { return false; }
  }), [`${S.pick}[data-bet-side="${side}"]`, wantedId]);
  if (index < 0) throw new Error(`No visible pick for ${wantedId ?? "the board"}`);
  const anchor = picks.nth(index);
  const seed = await anchor.evaluate((a) => JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")));
  const beforePath = new URL(page.url()).pathname;
  await anchor.click();
  await page.locator(S.root).waitFor({ state: "visible", timeout: 90_000 });
  await page.locator(S.stake).waitFor({ timeout: 60_000 });
  if (new URL(page.url()).pathname !== beforePath) throw new Error("The pick navigated instead of opening the sheet in place");
  return seed;
}

/** The sheet as the player sees it, scoped to the sheet's own root. */
export async function sheetState(page) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel.root);
    if (!root) return { present: false };
    const place = root.querySelector(sel.place), stake = root.querySelector(sel.stake);
    const balance = root.querySelector(".kp-bsheet__balance");
    const ticket = root.querySelector(".kp-bsheet__ticket-id"), link = root.querySelector(sel.ticket);
    // An OBSERVATION, never a verdict input: whether the refusal lines sit inside the sheet's scroller and the viewport
    // as the frame first draws, or below the fold (the scroller keeps its position).
    const linesBox = root.querySelector(".kp-bsheet__lines")?.getBoundingClientRect(), scrollBox = root.querySelector(sel.scroll)?.getBoundingClientRect();
    const linesView = !linesBox || !scrollBox ? "none"
      : linesBox.top >= scrollBox.top - 1 && linesBox.bottom <= Math.min(scrollBox.bottom, innerHeight) + 1 ? "whole"
        : linesBox.top < Math.min(scrollBox.bottom, innerHeight) && linesBox.bottom > scrollBox.top ? "partial" : "below the fold";
    return {
      present: true, frame: root.getAttribute("data-frame"), linesView,
      lines: [...root.querySelectorAll(".kp-bsheet__lines p")].map((p) => p.innerText.trim()),
      cta: place ? { text: place.innerText.trim(), enabled: !place.disabled } : null,
      stakeValue: stake ? stake.value : null, stakeLocked: stake ? stake.disabled : null,
      balanceKnown: !!balance && !balance.querySelector(".kp-bsheet__balance-unknown"),
      ticketId: ticket ? ticket.innerText.trim() : null, ticketHref: link ? link.getAttribute("href") : null,
      text: root.innerText,
    };
  }, S);
}

export async function waitFrame(page, frame, timeout = 90_000) {
  await page.waitForFunction(([sel, f]) => document.querySelector(sel)?.getAttribute("data-frame") === f, [S.root, frame], { timeout });
  await page.waitForTimeout(200);
}

/** The authenticated owner's own recovery partition (`kp-sheet-intents:v2:<viewerId>`), as qa-bet-sheet.mjs reads it. */
export async function ownedRows(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/session/status", { cache: "no-store" });
    const status = await response.json();
    if (!response.ok || status.active !== true || typeof status.viewerId !== "string") throw new Error("Recovery evidence owner unreadable");
    const raw = sessionStorage.getItem(`kp-sheet-intents:v2:${status.viewerId}`);
    if (raw === null) return [];
    const record = JSON.parse(raw);
    if (record.v !== 2 || record.owner !== status.viewerId || !Array.isArray(record.pending)) throw new Error("Recovery evidence partition unreadable");
    return record.pending;
  });
}

/** The receipt closes itself after its dwell; two pointer moves inside the sheet hold it while it is photographed. */
export async function holdReceipt(page) {
  const box = await page.locator(`${S.root} h2`).boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.move(box.x + 9, box.y + 6);
}

/** A tile: fonts and finite animations settled first (qa-bet-sheet.mjs's rule), the viewport only. */
export async function tile(page, out, n, label) {
  const receipt = await page.locator(`${S.root}[data-frame="receipt"]`).count() > 0;
  await page.evaluate(async (selector) => {
    await document.fonts.ready;
    const root = document.querySelector(selector), dialog = root?.closest('[role="dialog"]');
    const finite = (dialog?.getAnimations({ subtree: true }) ?? []).filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map((a) => a.finished.catch(() => {})));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, S.root);
  if (receipt) {
    await page.waitForFunction((selector) => {
      const root = document.querySelector(selector), panel = root?.closest(".kp-bsheet"), dialog = root?.closest('[role="dialog"]');
      if (root?.getAttribute("data-frame") !== "receipt" || !panel || dialog?.getAttribute("aria-hidden") === "true") return false;
      let opacity = 1; for (let node = panel; node && node !== document.body; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      return opacity >= 0.999 && !(dialog?.getAnimations({ subtree: true }) ?? []).some((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity);
    }, S.root, { timeout: 15_000 });
  }
  const file = `${String(n).padStart(3, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").slice(0, 110)}.png`;
  // Next's dev-tools badge (a dev server's own overlay, absent from every production page) sits over the sheet's
  // bottom-left corner; it is hidden for the capture only, through Playwright's screenshot stylesheet.
  await page.screenshot({ path: join(out, file), fullPage: false, style: "nextjs-portal{display:none!important}" });
  return file;
}

export function writeEvidence(out, evidence) {
  writeFileSync(join(out, "evidence.json"), JSON.stringify(evidence, null, 2));
}
