/**
 * test:sell-price-guard — Vodacom plan S6, A8c, HELD IN THE OPEN: a sale is paid exactly the figure the player confirmed,
 * or nothing happens and the player is told why. `docs/VODACOM-PLAN.md` §0i (A8c) and §0h points 38 to 44.
 *
 *   npm run test:sell-price-guard     (in predeploy)
 *   npm run red:sell-price-guard      (--prove-red: every check below has a defect planted IN MEMORY, and each is caught)
 *
 *   §1 THE SERVICE — `cashOutPosition` takes the confirmed figure as `opts.expectedValue` and compares it strictly, in both
 *      directions, with `paid`: the very figure the wallet is credited, `cashOutValue`'s price under the conservation
 *      clamp. The check sits inside both locks, after every refusal that came before it and before the first write;
 *      every statement between the lock and the check only reads; the refusal is CONFLICT with the server's figures —
 *      `cashout_pool_short` where the pool holds less than the price (no page could show what the sale pays),
 *      `price_changed` otherwise — and it writes, audits and emits nothing; no other source emits either reason.
 *   §2 THE ACTION AND ITS FORM — `cashOutPositionAction` is one call, `cashOutPositionFromForm` (market-service), which
 *      reads the field once, refuses a figure that is not a plain whole number before the money path (`unknown_failure`,
 *      the generic line, after spending a cash-out token), hands the service the figure it read or none, and records a
 *      refused price — after the service has returned, outside both locks — and nothing else.
 *   §3 THE PARSER — `readExpectedSaleValue`, run: every broken figure refused, an absent one passed as no figure, the
 *      client's own encoding (`String(value)`) read back exactly, and the encodings the client must never send
 *      (`formatTzs`, `formatNumber`, the net) refused.
 *   §4 THE CLIENT — `submit()`, the one sale both looks share, sends `String(value)` — the figure the confirm showed —
 *      once; a refusal for a moved price is the calm `factual` toast (DESIGN_AUTHORITY §F3), asks the page for the
 *      server's new price once, inside the refusal branch only, and both looks then wait on it ("Inapakia…", no figure,
 *      nothing to press) until the refreshed page is drawn. And the three hosts hand the button `cashOutValue`'s own price
 *      — since A8c that binding decides whether any sale on the host can go through.
 *   §5 THE WORDS — the two registry rows and their sentences in en, sw and zh, rendered by the client's own mapper: the
 *      moved price names the server's new figure and never the stale one the button held; the short pool sends the
 *      player to support; a broken figure's refusal renders the generic line in every language.
 *   §6 THE WIRING — this suite in predeploy, its red twin declared, the two-store suite declared through db-scratch with its
 *      own red, and the same cases run in memory by `test:cashout`.
 *
 * What this suite cannot see, and what does: the money itself moving or not is `test:cashout-price-guard` (the real
 * money path on the memory store and on a scratch Postgres), whose every "nothing moved" is paired with a sale that moves
 * the same observable in the same run, and `red:cashout-price-guard` plants this guard's defects into the real service.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION, like `test:journey-tickets`: `--prove-red` hands every section source TEXT edited in
 * memory (and a defective parser, registry row or dictionary) and requires the check named for each defect to fail.
 * Nothing here writes a file, so `test:red-anchors` §4 counts it in the in-process class.
 * ⚠️ This file carries no backslash: line breaks are built from their code points, and no pattern needs one.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER ??= "false";
const { readExpectedSaleValue } = await import("../src/lib/server/market-service.ts");
const { REASONS } = await import("../src/lib/failure-reasons.ts");
const { errorCopy } = await import("../src/lib/error-copy.ts");
const { dict } = await import("../src/lib/i18n-dict.ts");
const { formatTzs, formatNumber } = await import("../src/lib/utils.ts");

type Any = any;
const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const BS = String.fromCharCode(92);
const BT = String.fromCharCode(96);
const read = (rel: string) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8").split(CR + LF).join(LF) : "");
const show = (v: unknown) => JSON.stringify(v) ?? String(v);
const count = (s: string, needle: string) => (needle ? s.split(needle).length - 1 : 0);
/** Each line trimmed and the lines joined, so a check reads the code and not its layout. */
const squash = (s: string) => s.split(LF).map((l) => l.trim()).join("");
const between = (s: string, head: string, end: string) => {
  const a = s.indexOf(head);
  if (a < 0) return "";
  const b = s.indexOf(end, a + head.length);
  return b < 0 ? s.slice(a) : s.slice(a, b);
};
type Ok = (label: string, cond: boolean, detail?: string) => void;

/** Index just past the string or template literal whose quote is s[i]; -1 when it never closes (`test:journey-tickets`' own). */
function skipLiteral(s: string, i: number): number {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === BS) { j += 2; continue; }
    if (q === BT && c === "$" && s[j + 1] === "{") {
      const k = closeOf(s, j + 1);
      if (k < 0) return -1;
      j = k + 1;
      continue;
    }
    if (c === q) return j + 1;
    if (c === LF && q !== BT) return -1;
    j++;
  }
  return -1;
}
/** Index of the bracket closing the one at `i` ("(" or "{"), string and template literals skipped; -1 when none. */
function closeOf(s: string, i: number): number {
  const open = s[i];
  const shut = open === "(" ? ")" : "}";
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === `"` || c === "'" || c === BT) {
      const k = skipLiteral(s, j);
      if (k < 0) return -1;
      j = k - 1;
      continue;
    }
    if (c === open) depth++;
    else if (c === shut) {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}
/** The block a head ending in "{" opens, from the head through its closing brace; "" when the head is not in `src`. */
function blockAt(src: string, head: string): string {
  const at = src.indexOf(head);
  if (at < 0 || !head.endsWith("{")) return "";
  const end = closeOf(src, at + head.length - 1);
  return end < 0 ? "" : src.slice(at, end + 1);
}
/** A top-level function, from its header to the next top-level export (a signature may hold a type's braces, so no brace walk). */
function topLevel(src: string, head: string): string {
  const at = src.indexOf(head);
  if (at < 0) return "";
  const next = src.indexOf(`${LF}export `, at + head.length);
  return next < 0 ? src.slice(at) : src.slice(at, next);
}
/** Edit only the text of one top-level function, leaving the rest of the file as it is. */
const inFn = (head: string, edit: (body: string) => string) => (s: string) => {
  const body = topLevel(s, head);
  return body ? s.split(body).join(edit(body)) : s;
};

/* ══ THE SOURCE WORLD — read once, comments stripped; the red twin plants edits in memory ══════════════════════ */
const SVC = "src/lib/server/market-service.ts";
const ACTIONS = "src/app/markets/actions.ts";
const BUTTON = "src/components/markets/sell-button.tsx";
const CASHOUT_SUITE = "scripts/cashout-fee.test.mts";
const POSITIONS = "src/app/positions/page.tsx";
const MARKET_PAGE = "src/app/markets/[id]/page.tsx";
const CARD = "src/components/journey/tickets/ticket-card.tsx";
const VIEW = "src/components/journey/tickets/tickets-view.tsx";
const SOURCES = [SVC, ACTIONS, BUTTON, CASHOUT_SUITE, POSITIONS, MARKET_PAGE, CARD, VIEW];
const REGISTRY = "src/lib/failure-reasons.ts";

function walkSrc(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walkSrc(rel, out);
    else if (rel.endsWith(".ts") || rel.endsWith(".tsx")) out.push(rel);
  }
  return out;
}
/** Every other src file that names one of A8c's two reasons, read once from disk: the registry, and nothing else (§1.emitter). */
const SRC_FILES = walkSrc("src");
const otherNamers = (token: string) => SRC_FILES.filter((f) => !SOURCES.includes(f) && decomment(read(f)).includes(`"${token}"`));
const OTHER_NAMERS = { price_changed: otherNamers("price_changed"), cashout_pool_short: otherNamers("cashout_pool_short") };

type World = { files: Readonly<Record<string, string>>; dicts: Readonly<Record<string, Any>>; scripts: Readonly<Record<string, string>> };
const WORLD: World = {
  files: Object.fromEntries(SOURCES.map((rel) => [rel, decomment(read(rel))])),
  dicts: { en: dict.en, sw: dict.sw, zh: dict.zh },
  scripts: (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts,
};
type Impl = { parse: typeof readExpectedSaleValue; copy: typeof errorCopy; reasons: Record<string, Any> };
const REAL: Impl = { parse: readExpectedSaleValue, copy: errorCopy, reasons: REASONS as Record<string, Any> };
const text = (W: World, rel: string) => W.files[rel] ?? "";

/* ══ §1 · THE SERVICE ══════════════════════════════════════════════════════════════════════════════════════ */
const SVC_HEAD = "export async function cashOutPosition(";
/** The signature, squashed: the confirmed figure is an option, so every caller that sends none is unchanged. */
const SIGNATURE = "export async function cashOutPosition(userId: string,positionId: string,opts: { expectedValue?: number } = {},): Promise<ServiceResult<{ value: number; balance: number }>> {";
/** The check: strict, both directions, against what the sale credits. */
const GUARD = "if (opts.expectedValue !== undefined && opts.expectedValue !== paid) {";
/** Inside it, first: a pool holding less than the price — no page could show what this sale would credit. */
const POOL_OPEN = "if (paid !== value) {";
/** What the sale credits: the price under the conservation clamp, declared once, before the check. */
const CLAMP = ["const ownDebit = Math.min(ownPool, gross);", "const paid = Math.min(value, ownDebit);", "const houseFee = Math.max(0, ownDebit - paid);"];
/** …and the two places that figure is used after the check: the wallet's credit and the transaction's booking. */
const CREDIT = "db.wallet.adjust(wallet.id, { balance: paid })";
const BOOKED = "amount: paid, fee: houseFee,";
const FIGURES = "detail: { value: paid, fee: houseFee },";
const PRICE_REFUSAL = ["ok: false as const,", `code: "CONFLICT" as const,`, `reason: "price_changed" as const,`, FIGURES];
const POOL_REFUSAL = ["ok: false as const,", `code: "CONFLICT" as const,`, `reason: "cashout_pool_short" as const,`, FIGURES];
const LOCK = "return withLock(";
const FIRST_WRITE = "await marketStore.addToPool(";
const ADD_POOL = "const pools = await marketStore.addToPool(m.id, ownYes ? { yesPool: -ownDebit } : { noPool: -ownDebit });";
/** The only awaited calls between the lock and the check — five reads. */
const READS: Array<[string, number]> = [["await positionStore.get(positionId);", 2], ["await marketStore.get(p.marketId);", 1], ["await db.wallet.findByUserId(userId);", 1], ["await cashOutValue(p, m);", 1]];
/** Anything that writes, books, records or announces. */
const WRITES = [".set(", ".addToPool(", ".adjust(", ".create(", ".update(", ".upsert(", ".stamp(", ".delete(", "audit(", "emit(", "recordSnapshot(",
  "notifyCashout(", "sendEmailToUser(", "postLedgerEntries(", "reverseWageringLocked(", "emitWalletBalances(", "recordRefusedSale(", "$executeRaw", "$queryRaw"];
/** A statement that assigns to a store object read under the lock (the memory store hands out live objects). */
const ASSIGNS = /^(?:p|m|wallet|owned|pre)[.][A-Za-z]+ *[-+]?=[^=]/;
/** Every refusal that existed before A8c — each must keep its place before the check. */
const EARLIER = ["not_your_position", "position_not_open", "exit_window_closed", "bonus_funded_no_exit", "market_not_live", "market_settled",
  "selection_closed", "wallet_missing", "cashout_value_zero"];

function g1Service(W: World, ok: Ok) {
  const svc = text(W, SVC);
  const body = topLevel(svc, SVC_HEAD);
  const guardAt = body.indexOf(GUARD);
  ok("1.sig · cashOutPosition takes the confirmed figure as an option — `opts: { expectedValue?: number } = {}` — so every caller that sends none (the dev routes, internal callers) is unchanged",
    body.length > 3_000 && squash(body).startsWith(SIGNATURE), squash(body).slice(0, 200));
  ok("1.guard · the check is strict, in both directions, against `paid` — `opts.expectedValue !== paid` — once, and nothing else in the file reads the figure",
    count(body, GUARD) === 1 && count(body, "opts.expectedValue") === 2 && count(svc, "opts.expectedValue") === 2, show({ guard: count(body, GUARD), inBody: count(body, "opts.expectedValue"), inFile: count(svc, "opts.expectedValue") }));
  const clampOk = CLAMP.every((c) => count(body, c) === 1 && body.indexOf(c) >= 0 && body.indexOf(c) < guardAt);
  ok("1.clamp · `paid` is the figure the sale credits: the price under the conservation clamp, declared once before the check, and the very figure the wallet is credited and the transaction books after it",
    guardAt > 0 && clampOk && count(body, "const paid") === 1 && count(body, "const houseFee") === 1
      && count(body, CREDIT) === 1 && body.indexOf(CREDIT) > guardAt && count(body, BOOKED) === 1 && body.indexOf(BOOKED) > guardAt,
    show({ clamp: CLAMP.map((c) => count(body, c)), credit: count(body, CREDIT), booked: count(body, BOOKED) }));
  const lockAt = body.indexOf(LOCK);
  const marketLockAt = body.indexOf(LOCK, lockAt + LOCK.length);
  const writeAts = WRITES.map((x) => body.indexOf(x, lockAt)).filter((i) => i >= 0);
  const firstWriteAt = writeAts.length ? Math.min(...writeAts) : -1;
  const poolDebitAt = body.indexOf(FIRST_WRITE);
  const lateRefusals = EARLIER.filter((r) => count(body, `reason: "${r}"`) === 0 || body.lastIndexOf(`reason: "${r}"`) > guardAt);
  ok("1.place · the check sits inside both locks (wallet, then market), after every refusal that existed before it — so a shut exit still answers in its own words — and before the first write, the pool's debit",
    lockAt >= 0 && marketLockAt > lockAt && guardAt > marketLockAt && lateRefusals.length === 0 && count(body, FIRST_WRITE) === 1
      && poolDebitAt > guardAt && firstWriteAt > guardAt && firstWriteAt === body.indexOf(".addToPool("),
    show({ lockAt, marketLockAt, guardAt, poolDebitAt, firstWriteAt, lateRefusals }));
  const region = guardAt > lockAt && lockAt >= 0 ? body.slice(lockAt, guardAt) : "";
  const writes = WRITES.filter((x) => region.includes(x));
  const assigns = region.split(LF).map((l) => l.trim()).filter((l) => ASSIGNS.test(l));
  const reads = READS.map(([x, n]) => count(region, x) === n);
  ok("1.before · every statement between the lock and the check only reads: the five reads (the position twice, the market, the wallet, cashOutValue), the second lock, refusals and arithmetic — no write, no audit, no event, no assignment to anything read",
    region.length > 500 && writes.length === 0 && assigns.length === 0 && reads.every(Boolean) && count(region, "await ") === 5 && count(region, LOCK) === 2,
    show({ writes, assigns, reads, awaits: count(region, "await "), locks: count(region, LOCK) }));
  const block = guardAt >= 0 ? blockAt(body.slice(guardAt), GUARD) : "";
  const pool = blockAt(block, POOL_OPEN);
  const rest = pool ? block.split(pool).join("") : block;
  ok("1.refusal · the refusal is CONFLICT with the server's own figures — cashout_pool_short first, where the pool holds less than the price (`paid !== value`), else price_changed — two plain returns that write, audit, emit and await nothing",
    block.length > 0 && pool.length > 0 && count(block, "return {") === 2 && count(pool, "return {") === 1
      && POOL_REFUSAL.every((x) => count(pool, x) === 1) && PRICE_REFUSAL.every((x) => count(rest, x) === 1)
      && block.indexOf(POOL_OPEN) < block.indexOf(`reason: "price_changed"`)
      && !WRITES.some((x) => block.includes(x)) && !block.includes("await "),
    block.slice(0, 300));
  const emitters = (token: string) => SOURCES.filter((f) => text(W, f).includes(`reason: "${token}"`));
  ok("1.emitter · cashOutPosition is each reason's one emitter: no other source returns price_changed or cashout_pool_short, and the only other src file that names either is the registry",
    emitters("price_changed").join() === SVC && count(svc, `reason: "price_changed"`) === 1 && emitters("cashout_pool_short").join() === SVC
      && count(svc, `reason: "cashout_pool_short"`) === 1 && OTHER_NAMERS.price_changed.join() === REGISTRY && OTHER_NAMERS.cashout_pool_short.join() === REGISTRY,
    show({ price: emitters("price_changed"), pool: emitters("cashout_pool_short"), otherNamers: OTHER_NAMERS }));
}

/* ══ §2 · THE ACTION AND ITS FORM ══════════════════════════════════════════════════════════════════════════ */
const ACTION_HEAD = "export async function cashOutPositionAction(";
const SESSION = `if (!session) redirect("/auth/login");`;
const ACTION_CALL = "const r = await cashOutPositionFromForm(session.userId, formData);";
const FORM_HEAD = "export async function cashOutPositionFromForm(";
const FORM_SIGNATURE = "export async function cashOutPositionFromForm(userId: string,form: { get(name: string): unknown },): Promise<ServiceResult<{ value: number; balance: number }>> {";
const READ_ID = `const positionId = String(form.get("positionId") ?? "");`;
const READ_RAW = `const raw = form.get("expectedValue");`;
const PARSE = "const expected = readExpectedSaleValue(raw);";
const BROKEN_OPEN = "if (!expected.ok) {";
const RATE = `const rl = rateCheck(userId, "bet.cashout");`;
const RATE_REFUSAL = `if (!rl.allowed) return { ok: false, error: "Slow down.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };`;
const RECORD_BROKEN = `recordRefusedSale(userId, positionId, "unknown_failure", String(raw).slice(0, 32), undefined);`;
const BROKEN_REFUSAL = [`code: "INVALID",`, `reason: "unknown_failure",`];
const CALL = "const r = await cashOutPosition(userId, positionId, { expectedValue: expected.expectedValue });";
const RECORD_IF = `if (!r.ok && (r.reason === "price_changed" || r.reason === "cashout_pool_short")) {`;
const RECORD_PRICE = "recordRefusedSale(userId, positionId, r.reason, expected.expectedValue ?? null, r.detail);";
const RECORD_FN = "function recordRefusedSale(";
const RECORD_ROW = [`void audit({`, `category: "BET",`, `action: "market.position.sell_refused",`, "actorId: userId,"];

function g2Action(W: World, ok: Ok) {
  const actions = text(W, ACTIONS);
  const abody = topLevel(actions, ACTION_HEAD);
  ok("2.action · the action is one call: after its session check it hands the whole form to cashOutPositionFromForm, and reads no field and calls no money path itself",
    count(abody, ACTION_CALL) === 1 && abody.indexOf(SESSION) >= 0 && abody.indexOf(SESSION) < abody.indexOf(ACTION_CALL)
      && !abody.includes("formData.get(") && count(actions, `"expectedValue"`) === 0 && count(actions, "cashOutPosition(") === 0,
    abody.slice(0, 400));
  const svc = text(W, SVC);
  const form = topLevel(svc, FORM_HEAD);
  ok("2.read · the form's path reads the ticket and the figure once each, through the one parser, in the money path's own module",
    squash(form).startsWith(FORM_SIGNATURE) && count(form, READ_ID) === 1 && count(form, READ_RAW) === 1 && count(form, PARSE) === 1
      && count(svc, `"expectedValue"`) === 1 && count(svc, "readExpectedSaleValue(") === 2,
    show({ id: count(form, READ_ID), raw: count(form, READ_RAW), parse: count(form, PARSE), field: count(svc, `"expectedValue"`) }));
  const broken = blockAt(form, BROKEN_OPEN);
  ok("2.refuse · a figure that is not a plain whole number is refused BEFORE the money path — a cash-out token spent first, then recorded, then INVALID / unknown_failure, the generic line — and never read as no figure",
    count(form, BROKEN_OPEN) === 1 && count(broken, RATE) === 1 && count(broken, RATE_REFUSAL) === 1 && count(broken, RECORD_BROKEN) === 1
      && BROKEN_REFUSAL.every((x) => count(broken, x) === 1) && !broken.includes("cashOutPosition(") && !broken.includes("price_changed")
      && broken.indexOf(RATE) < broken.indexOf(RECORD_BROKEN) && broken.indexOf(RECORD_BROKEN) < broken.indexOf(BROKEN_REFUSAL[0])
      && form.indexOf(PARSE) < form.indexOf(BROKEN_OPEN) && form.indexOf(BROKEN_OPEN) < form.indexOf(CALL) && count(form, "cashOutPosition(") === 1,
    broken.slice(0, 300));
  ok("2.hand · the service is handed the figure the form carried (or none, when none was sent)", count(form, CALL) === 1, form.slice(0, 400));
  const record = blockAt(form, RECORD_IF);
  const fn = form.slice(Math.max(0, form.indexOf(RECORD_FN)));
  const service = topLevel(svc, SVC_HEAD);
  ok("2.record · a refused price — moved or short — is recorded once, after the service has returned (outside both locks, never inside the money's transaction): one fire-and-forget audit row, and no other refusal is",
    count(form, RECORD_IF) === 1 && form.indexOf(CALL) < form.indexOf(RECORD_IF) && count(record, RECORD_PRICE) === 1
      && count(form, "recordRefusedSale(") === 3 && count(fn, "audit(") === 1 && RECORD_ROW.every((x) => count(fn, x) === 1)
      && count(svc, `action: "market.position.sell_refused",`) === 1 && !form.includes("withLock(")
      && !service.includes("sell_refused") && !service.includes("recordRefusedSale("),
    show({ recordIf: count(form, RECORD_IF), calls: count(form, "recordRefusedSale("), audits: count(fn, "audit(") }));
}

/* ══ §3 · THE PARSER ═══════════════════════════════════════════════════════════════════════════════════════ */
/** Figures the client never sends, each refused: grouped, signed, decimal, empty, words, past the safe integers, padded, leading zeros, exponent, hex, the formatted price. */
const BROKEN = ["3,600", "-1", "1.5", "", "abc", "99999999999999999999", "9007199254740993", "1e3", " 3600", "3600 ", "03600", "+5", "-0", "0x10",
  "3600.0", "Infinity", "NaN", "TZS 9,000", "9 000"];
const GOOD = ["0", "1", "3600", "9000", "1000000", "9007199254740991"];

function g3Parser(I: Impl, ok: Ok) {
  const accepted = BROKEN.filter((s) => I.parse(s).ok);
  const fileLike = I.parse({ name: "price.txt", size: 4 });
  ok("3.broken · every broken figure is refused — grouped, signed, decimal, empty, a word, past the safe integers, padded, leading zeros, an exponent, hex — and so is a form entry that is not text",
    accepted.length === 0 && fileLike.ok === false, show({ accepted, fileLike }));
  const absent = [I.parse(null), I.parse(undefined)];
  ok("3.absent · no field at all is no figure — the sale goes ahead without the check, as before A8c",
    absent.every((r) => r.ok === true && (r as { expectedValue?: number }).expectedValue === undefined), show(absent));
  const misread = GOOD.filter((s) => { const r = I.parse(s) as { ok: boolean; expectedValue?: number }; return !(r.ok && r.expectedValue === Number(s) && String(r.expectedValue) === s); });
  ok("3.good · a plain whole number of shillings is read back exactly, up to the largest safe integer", misread.length === 0, show(misread));
  const sent = [0, 1_000, 3_600, 9_000, 999_999, 1_000_000];
  const roundTrip = sent.filter((v) => { const r = I.parse(String(v)) as { ok: boolean; expectedValue?: number }; return !(r.ok && r.expectedValue === v); });
  const wrongForms = [formatTzs(9_000), formatNumber(9_000), String(9_000 - 10_000)].filter((s) => I.parse(s).ok);
  ok("3.client · the client's own encoding, String(value), reads back as the same figure; the forms it must never send — formatTzs, formatNumber, the net — are refused",
    roundTrip.length === 0 && wrongForms.length === 0, show({ roundTrip, wrongForms }));
}

/* ══ §4 · THE CLIENT AND ITS HOSTS ═════════════════════════════════════════════════════════════════════════ */
const SUBMIT_HEAD = "const submit = () => {";
const SEND = `fd.set("expectedValue", String(value));`;
const POSITION_FIELD = `fd.set("positionId", positionId);`;
const ACTION_FROM_BUTTON = "r = await cashOutPositionAction(fd);";
const REFUSAL_OPEN = "if (!r.ok) {";
const MESSAGE = "const msg = errorCopy(t, r);";
const MOVED = `const moved = r.reason === "price_changed";`;
const TOAST_CALM = `toast({ title: t.toast.couldntCashOut, description: msg, variant: moved ? "factual" : "danger" });`;
const SHOWN = "setResultOpen(true);";
const REFRESH = `window.dispatchEvent(new Event("50pick:refresh"));`;
const PRICE_ASK = `if (moved) { setRepricing(true); ${REFRESH} }`;
const STATE = "const [repricing, setRepricing] = useState(false);";
const CLEAR = "useEffect(() => { if (!pending) setRepricing(false); }, [pending]);";
const CLASSIC_HEAD = `const btnVariant = "btn-primary";`;
/** Today's look, squashed: the strip, the button's lock, its spoken name, its words and its figure each wait on the new price. */
const CLASSIC_WAIT = ["{inGrace && !shutNow && !repricing && (", "disabled={pending || shutNow || lapsed || repricing}",
  "aria-label={shutNow? t.common.sellLockedHint: repricing? t.common.loading: lapsed?",
  "{shutNow ? t.common.sellLocked: repricing ? t.common.loading: pending ? t.common.selling: lapsed ? t.common.loading:",
  "{!shutNow && !lapsed && !repricing && ("];
/** The journey's look: its free line, its lock, its words and its figure. */
const JOURNEY_WAIT = ["{offerFree && freeUntilLabel && !repricing ? (", "disabled={pending || lapsed || repricing}",
  "{repricing ? t.common.loading : pending ? t.common.selling : lapsed ? t.common.loading : ", "{lapsed || repricing ? null : ("];

function g4Client(W: World, ok: Ok) {
  const button = text(W, BUTTON);
  const submit = blockAt(button, SUBMIT_HEAD);
  ok("4.send · submit() sends the figure the confirm showed — String(value), never formatted, never the net — once, beside the position and before the action",
    count(submit, SEND) === 1 && count(button, `"expectedValue"`) === 1 && submit.indexOf(POSITION_FIELD) >= 0
      && submit.indexOf(POSITION_FIELD) < submit.indexOf(SEND) && submit.indexOf(SEND) < submit.indexOf(ACTION_FROM_BUTTON),
    show({ send: count(submit, SEND), field: count(button, `"expectedValue"`) }));
  ok("4.shared · both looks sell through that one submit: one function, handed to the one confirm in the dialogs both returns draw",
    count(button, "const submit = ") === 1 && count(button, "onConfirm={submit}") === 1
      && between(button, "const dialogs = (", "if (journey) {").includes("onConfirm={submit}") && count(button, "{dialogs}") === 2,
    show({ submit: count(button, "const submit = "), confirm: count(button, "onConfirm={submit}"), dialogs: count(button, "{dialogs}") }));
  const refusal = blockAt(submit, REFUSAL_OPEN);
  const order = [MESSAGE, MOVED, TOAST_CALM, SHOWN, PRICE_ASK].map((x) => refusal.indexOf(x));
  ok("4.moved · a refusal for a moved price asks the page for the server's new price once — inside the refusal branch, after the message (the registry's, with the figures) is shown — with the button waiting on it, and no other refusal does",
    count(refusal, MOVED) === 1 && count(refusal, PRICE_ASK) === 1 && count(refusal, REFRESH) === 1 && count(button, PRICE_ASK) === 1
      && order.every((x, i) => x >= 0 && (i === 0 || order[i - 1] < x)) && order[4] < refusal.lastIndexOf("return;"),
    show({ order, ask: count(button, PRICE_ASK) }));
  ok("4.calm · the moved price is a refusal the player fixes with one more tap, and their money did not move: its toast is `factual` (no red, no error buzz — DESIGN_AUTHORITY §F3), every other refusal keeps today's `danger`",
    count(refusal, TOAST_CALM) === 1 && count(refusal, "toast({") === 1 && !refusal.includes(`variant: "danger" }`), refusal.slice(0, 300));
  const classic = squash(button.slice(Math.max(0, button.indexOf(CLASSIC_HEAD))));
  const look = between(button, "if (journey) {", CLASSIC_HEAD);
  const missing = [...CLASSIC_WAIT.filter((x) => count(classic, x) !== 1), ...JOURNEY_WAIT.filter((x) => count(look, x) !== 1)];
  const hooksAt = [button.indexOf(STATE), button.indexOf(CLEAR)];
  ok("4.waiting · while the server's new price is fetched both looks wait — 'Inapakia…' for the words and the spoken name, no figure, no free strip or line, nothing to press — from one state, set only by that ask and cleared when the refreshed page is drawn (pending falls), declared above every return",
    count(button, STATE) === 1 && count(button, CLEAR) === 1 && count(button, "setRepricing(") === 2 && missing.length === 0
      && hooksAt.every((x) => x >= 0 && x < button.indexOf(SUBMIT_HEAD) && x < button.indexOf("if (journey) {")),
    show({ missing, hooksAt }));
  const hostOk = (rel: string, pins: string[]) => {
    const src = text(W, rel);
    const els = src.split("<SellButton").slice(1).map((x) => x.slice(0, x.indexOf("/>")));
    return pins.every((p) => count(src, p) === 1) && els.every((e) => count(e, "value={liveValue ?? 0}") === 1);
  };
  ok("4.hosts.positions · /positions prices every Sell button with cashOutValue's own `value` — into the classic list's button and, through the view's map, the journey's card",
    hostOk(POSITIONS, ["const co = await cashOutValue(", "value: sellable ? co.value : null,", "prices={pricedById}", "const liveValue = price?.value ?? null;"])
      && count(text(W, POSITIONS), "<SellButton") === 1 && count(text(W, VIEW), "price={prices.get(p.id)}") === 1,
    show({ positions: count(text(W, POSITIONS), "<SellButton") }));
  ok("4.hosts.market · the question page prices its holder block's Sell button with cashOutValue's own `value`",
    hostOk(MARKET_PAGE, ["const co = await cashOutValue(", "positionCashOutValues.set(p.id, co.sellable ? co.value : null);", "const liveValue = positionCashOutValues.get(p.id) ?? null;"])
      && count(text(W, MARKET_PAGE), "<SellButton") === 1,
    show({ market: count(text(W, MARKET_PAGE), "<SellButton") }));
  ok("4.hosts.card · the journey's ticket card hands its Sell button the price the page put in its map, no other figure",
    hostOk(CARD, ["const liveValue = price?.value ?? null;"]) && count(text(W, CARD), "<SellButton") === 1,
    show({ card: count(text(W, CARD), "<SellButton") }));
}

/* ══ §5 · THE WORDS ════════════════════════════════════════════════════════════════════════════════════════ */
const LOCALES = ["en", "sw", "zh"] as const;
const NEW_PRICE = 9_000;
/** The refusal as the service returns it. Its prose names the STALE figure on purpose: a mapper that read prose would show it. */
const MOVED_REFUSAL = { code: "CONFLICT", error: "The sell price changed after it was confirmed (the button held TZS 10,000) — nothing was sold.", reason: "price_changed", detail: { value: NEW_PRICE, fee: 1_000 } };
const POOL_SHORT = { code: "CONFLICT", error: "This sale is unavailable: the pool holds less than its price — nothing was sold.", reason: "cashout_pool_short", detail: { value: 6_000, fee: 0 } };
const BROKEN_FIGURE = { code: "INVALID", error: "The sell request carried no readable price — nothing was sold.", reason: "unknown_failure" };

function g5Words(I: Impl, W: World, ok: Ok) {
  const row = I.reasons.price_changed;
  ok("5.row · the moved price's row: a warning (the player can sell again at once, and their money did not move), on the toast channel, keyed to failPriceChanged, interpolating the new figure",
    row?.severity === "warning" && row?.channel === "toast" && row?.key === "failPriceChanged" && show(row?.needs) === show(["value"]), show(row));
  const poolRow = I.reasons.cashout_pool_short;
  ok("5.row.pool · the short pool's row: an error (a fault of ours the player cannot fix), on the toast channel, keyed to failCashoutPoolShort, with no figure",
    poolRow?.severity === "error" && poolRow?.channel === "toast" && poolRow?.key === "failCashoutPoolShort" && !(poolRow?.needs?.length), show(poolRow));
  const figure = formatTzs(NEW_PRICE);
  const en = I.copy(W.dicts.en, MOVED_REFUSAL);
  const enPool = I.copy(W.dicts.en, POOL_SHORT);
  for (const loc of LOCALES) {
    const t = W.dicts[loc];
    const line: unknown = t?.error?.failPriceChanged;
    const body = I.copy(t, MOVED_REFUSAL);
    ok(`5.copy.${loc} · the player's sentence is the dictionary's own, with the server's NEW figure (${figure}) in it — never the stale figure the button held, never a placeholder, never the generic line${loc === "en" ? "" : ", and not the English sentence"}`,
      typeof line === "string" && count(line, "{value}") === 1 && count(line, "{") === 1 && body === line.split("{value}").join(figure)
        && !body.includes("10,000") && body !== t?.error?.somethingDidntWork && (loc === "en" || body !== en),
      body);
    ok(`5.short.${loc} · …short enough for a toast on a 320px phone`, body.length > 0 && body.length <= (loc === "zh" ? 45 : 100), `${body.length} characters`);
    const poolLine: unknown = t?.error?.failCashoutPoolShort;
    const poolBody = I.copy(t, POOL_SHORT);
    ok(`5.pool.${loc} · the short pool's sentence is the dictionary's own — no figure (the page shows none that would sell), never the generic line${loc === "en" ? "" : ", and not the English sentence"}`,
      typeof poolLine === "string" && poolBody === poolLine && count(poolLine, "{") === 0 && poolBody !== t?.error?.somethingDidntWork
        && poolBody.length <= (loc === "zh" ? 45 : 100) && (loc === "en" || poolBody !== enPool),
      poolBody);
  }
  const sw: string = W.dicts.sw?.error?.failPriceChanged ?? "";
  ok("5.sw · Swahili: 'Bei imebadilika …', and dau in class 5 — 'Dau lako halijauzwa', 'kuliuza' (Claude's review, S4-COPY-AUDIT 'Swahili review' 4)",
    sw.startsWith("Bei imebadilika") && sw.includes("Dau lako halijauzwa") && sw.includes("kuliuza"), sw);
  const swPool: string = W.dicts.sw?.error?.failCashoutPoolShort ?? "";
  ok("5.sw.pool · Swahili: the short pool says it is our fault and sends the player to support, dau in class 5 — 'dau hili haliwezi kuuzwa', 'Wasiliana na msaada'",
    swPool.includes("hitilafu upande wetu") && swPool.includes("dau hili haliwezi kuuzwa") && swPool.includes("Wasiliana na msaada"), swPool);
  const zh: string = W.dicts.zh?.error?.failPriceChanged ?? "";
  ok("5.zh · Chinese: formal 您, the failure registry's sell word 卖出, and no 持仓", zh.includes("您") && !zh.includes("你") && zh.includes("卖出") && !zh.includes("持仓"), zh);
  const zhPool: string = W.dicts.zh?.error?.failCashoutPoolShort ?? "";
  ok("5.zh.pool · Chinese: formal 您, 卖出, the platform's 联系客服, and no 持仓", zhPool.includes("您") && !zhPool.includes("你") && zhPool.includes("卖出") && zhPool.includes("联系客服") && !zhPool.includes("持仓"), zhPool);
  const generic = LOCALES.filter((loc) => I.copy(W.dicts[loc], BROKEN_FIGURE) !== W.dicts[loc]?.error?.somethingDidntWork);
  ok("5.broken · a broken figure's refusal renders the generic line in every language — never the server's English", generic.length === 0, show(generic));
}

/* ══ §6 · THE WIRING ═══════════════════════════════════════════════════════════════════════════════════════ */
function g6Wiring(W: World, ok: Ok) {
  ok("6.wired · this suite runs in predeploy, its red twin is declared, and the two-store suite boots its Postgres through db-scratch, with its own red",
    W.scripts["test:sell-price-guard"] === "tsx scripts/sell-price-guard.test.mts"
      && W.scripts["red:sell-price-guard"] === "tsx scripts/sell-price-guard.test.mts --prove-red"
      && (W.scripts.predeploy ?? "").includes("npm run test:sell-price-guard && ")
      && W.scripts["test:cashout-price-guard"] === "tsx scripts/db-scratch.mts --run npx tsx scripts/cashout-price-guard.test.mts"
      && W.scripts["red:cashout-price-guard"] === "node scripts/red-cashout-price-guard.mjs",
    show({ test: W.scripts["test:sell-price-guard"], red: W.scripts["red:sell-price-guard"], pg: W.scripts["test:cashout-price-guard"], pgRed: W.scripts["red:cashout-price-guard"] }));
  const suite = text(W, CASHOUT_SUITE);
  ok("6.memory · test:cashout (predeploy) runs the same cases on the memory store",
    count(suite, "await runPriceGuardCases(ok);") === 1 && count(suite, `from "./lib/cashout-price-guard-cases.mts"`) === 1, "");
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════ */
function run(I: Impl, W: World, log: (l: string) => void): { failed: string[]; total: number } {
  const failed: string[] = [];
  let total = 0;
  const ok: Ok = (label, cond, detail = "") => {
    total++;
    if (cond) log(`PASS ${label}`);
    else { failed.push(label); log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  };
  log(""); log("§1 · the service — the check, its place, the statements before it, the two refusals, the one emitter");
  g1Service(W, ok);
  log(""); log("§2 · the action and its form — one call; read once, a broken figure refused before the money path, the figure handed on, a refused price recorded after it");
  g2Action(W, ok);
  log(""); log("§3 · the parser — run");
  g3Parser(I, ok);
  log(""); log("§4 · the client and its hosts — the figure sent, both looks, the moved price's calm toast, its one refresh and the wait, the hosts' price");
  g4Client(W, ok);
  log(""); log("§5 · the words — the two registry rows and their sentences in three languages");
  g5Words(I, W, ok);
  log(""); log("§6 · the wiring");
  g6Wiring(W, ok);
  return { failed, total };
}

if (!PROVE_RED) {
  console.log("sell-price-guard — a sale is paid the figure the player confirmed, or nothing happens (Vodacom plan S6, A8c)");
  const { failed, total } = run(REAL, WORLD, (l) => console.log(l));
  console.log("");
  console.log(`SELL PRICE GUARD — ${total === 0 ? "0 checks ran: a zero-assertion run is a SKIPPED run" : failed.length === 0 ? `all ${total} checks passed` : `${failed.length} of ${total} failed`}`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exit(total > 0 && failed.length === 0 ? 0 : 1);
}

/* ══ THE RED TWIN — every plant must be caught by the check named for it ═════════════════════════════════════ */
const quiet = () => {};
let pass = 0, fail = 0;
const proof = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
console.log("RED CONTROL — sell-price-guard's defects, planted in memory");
console.log("");
const baseline = run(REAL, WORLD, quiet);
if (baseline.total === 0 || baseline.failed.length > 0) {
  console.log(`INCONCLUSIVE: the clean run already fails (${baseline.failed[0] ?? "0 checks ran"}) — a plant could not be told from it`);
  process.exit(1);
}
proof(`baseline · the shipped code passes all ${baseline.total} in-process checks before anything is planted`, true);

const withFile = (rel: string, edit: (s: string) => string): World => ({ ...WORLD, files: { ...WORLD.files, [rel]: edit(WORLD.files[rel] ?? "") } });
const swap = (rel: string, from: string, to: string) => withFile(rel, (s) => s.split(from).join(to));
const changed = (w: World, rel: string) => w.files[rel] !== WORLD.files[rel];
const withWord = (locale: string, key: string, value: string | undefined): World => {
  const d = WORLD.dicts[locale];
  const error = { ...d.error };
  if (value === undefined) delete error[key]; else error[key] = value;
  return { ...WORLD, dicts: { ...WORLD.dicts, [locale]: { ...d, error } } };
};
const wordChanged = (w: World, locale: string, key: string) => w.dicts[locale]?.error?.[key] !== WORLD.dicts[locale]?.error?.[key];

// §1 — the service
const GUARD_BLOCK = blockAt(topLevel(WORLD.files[SVC], SVC_HEAD), GUARD);
const POOL_BLOCK = blockAt(GUARD_BLOCK, POOL_OPEN);
const guardRemoved = swap(SVC, GUARD_BLOCK, "");
const guardAfterWrite = withFile(SVC, inFn(SVC_HEAD, (b) => b.split(GUARD_BLOCK).join("").split(ADD_POOL).join(`${ADD_POOL}${LF}    ${GUARD_BLOCK}`)));
const guardBeforeLock = withFile(SVC, inFn(SVC_HEAD, (b) => b.split(GUARD_BLOCK).join("").replace(LOCK, `${GUARD_BLOCK}${LF}  ${LOCK}`)));
const onlyBelow = swap(SVC, GUARD, GUARD.replace("opts.expectedValue !== paid", "opts.expectedValue < paid"));
const onlyAbove = swap(SVC, GUARD, GUARD.replace("opts.expectedValue !== paid", "opts.expectedValue > paid"));
const againstPrice = swap(SVC, GUARD, GUARD.replace("!== paid", "!== value"));
const writeBefore = swap(SVC, GUARD, `await positionStore.set(p);${LF}    ${GUARD}`);
const touchedBefore = swap(SVC, GUARD, `p.status = "CASHED_OUT";${LF}    ${GUARD}`);
const auditedRefusal = swap(SVC, GUARD, `${GUARD}${LF}      audit({ category: "BET", action: "market.position.price_refused", actorId: userId, targetType: "Position", targetId: p.id, payload: {} });`);
const namesThePrice = swap(SVC, FIGURES, "detail: { value, fee: cashOutFee },");
const otherCode = withFile(SVC, inFn(SVC_HEAD, (b) => b.split(GUARD_BLOCK).join(GUARD_BLOCK.split(`code: "CONFLICT" as const,`).join(`code: "INVALID" as const,`))));
const poolBranchGone = withFile(SVC, inFn(SVC_HEAD, (b) => b.split(POOL_BLOCK).join("")));
const poolBranchMisread = swap(SVC, POOL_OPEN, "if (houseFee > 0) {");
const secondEmitter = swap(SVC, `reason: "unknown_failure",`, `reason: "price_changed",`);
// §2 — the action and its form
const actionReadsAgain = swap(ACTIONS, ACTION_CALL, `const positionId = String(formData.get("positionId") ?? "");${LF}  const r = await cashOutPosition(session.userId, positionId);`);
const brokenIgnored = withFile(SVC, inFn(FORM_HEAD, (b) => b.split(blockAt(b, BROKEN_OPEN)).join("")));
const brokenSpendsNothing = swap(SVC, `${RATE}${LF}    ${RATE_REFUSAL}`, "");
const figureDropped = swap(SVC, CALL, "const r = await cashOutPosition(userId, positionId);");
const priceUnrecorded = swap(SVC, RECORD_PRICE, "");
const everyRefusalRecorded = swap(SVC, RECORD_IF, "if (!r.ok) {");
// §3 — the parser
const acceptsGrouped: Impl["parse"] = (raw) => {
  if (raw === null || raw === undefined) return { ok: true };
  const n = Number(String(raw).split(",").join("").trim());
  return Number.isFinite(n) ? { ok: true, expectedValue: n } : { ok: false };
};
const brokenAsAbsent: Impl["parse"] = (raw) => { const r = readExpectedSaleValue(raw); return r.ok ? r : { ok: true }; };
const figureLost: Impl["parse"] = (raw) => (readExpectedSaleValue(raw).ok ? { ok: true } : { ok: false });
// §4 — the client and its hosts
const sendsFormatted = swap(BUTTON, SEND, `fd.set("expectedValue", formatTzs(value));`);
const sendsNet = swap(BUTTON, SEND, `fd.set("expectedValue", String(net));`);
const sendsNothing = swap(BUTTON, SEND, "");
const priceUnasked = swap(BUTTON, PRICE_ASK, "");
const everyRefusalAsks = swap(BUTTON, PRICE_ASK, `setRepricing(true); ${REFRESH}`);
const movedAlarmed = swap(BUTTON, TOAST_CALM, `toast({ title: t.toast.couldntCashOut, description: msg, variant: "danger" });`);
const classicSaysSelling = swap(BUTTON, `${LF}            : repricing ? t.common.loading`, "");
const journeyKeepsFigure = swap(BUTTON, JOURNEY_WAIT[3], "{lapsed ? null : (");
const waitNeverEnds = swap(BUTTON, CLEAR, "");
const positionsPricesGross = swap(POSITIONS, "value: sellable ? co.value : null,", "value: sellable ? co.gross : null,");
const marketPricesGross = swap(MARKET_PAGE, "positionCashOutValues.set(p.id, co.sellable ? co.value : null);", "positionCashOutValues.set(p.id, co.sellable ? co.gross : null);");
const marketHandsStake = swap(MARKET_PAGE, "value={liveValue ?? 0}", "value={p.stake}");
const cardReadsLive = swap(CARD, "const liveValue = price?.value ?? null;", "const liveValue = price?.live ?? null;");
const viewDropsPrice = swap(VIEW, "price={prices.get(p.id)}", "price={undefined}");
// §5 — the words
const swMissing = withWord("sw", "failPriceChanged", undefined);
const zhMissing = withWord("zh", "failPriceChanged", undefined);
const swNoFigure = withWord("sw", "failPriceChanged", "Bei imebadilika. Dau lako halijauzwa — unaweza kuliuza kwa bei mpya.");
const swPoolMissing = withWord("sw", "failCashoutPoolShort", undefined);
const loudRow: Impl["reasons"] = { ...REAL.reasons, price_changed: { ...REAL.reasons.price_changed, severity: "error", channel: "modal" } };
const rowWithoutFigure: Impl["reasons"] = { ...REAL.reasons, price_changed: { ...REAL.reasons.price_changed, needs: [] } };
const poolRowFixable: Impl["reasons"] = { ...REAL.reasons, cashout_pool_short: { ...REAL.reasons.cashout_pool_short, severity: "warning" } };
// §6 — the wiring
const unwired: World = { ...WORLD, scripts: { ...WORLD.scripts, predeploy: (WORLD.scripts.predeploy ?? "").split("npm run test:sell-price-guard && ").join("") } };
const memoryDropped = swap(CASHOUT_SUITE, "await runPriceGuardCases(ok);", "");

type Plant = { name: string; expect: string[]; impl?: Partial<Impl>; world?: World; landed: boolean };
const plants: Plant[] = [
  { name: "the check is removed (the sale is paid whatever the player confirmed)", expect: ["1.guard"], world: guardRemoved, landed: GUARD_BLOCK.length > 0 && changed(guardRemoved, SVC) },
  { name: "the check is moved after the pool's debit (a refusal would leave the pool short)", expect: ["1.place"], world: guardAfterWrite, landed: changed(guardAfterWrite, SVC) },
  { name: "the check is moved before the locks (it would read a price nothing holds still)", expect: ["1.place"], world: guardBeforeLock, landed: changed(guardBeforeLock, SVC) },
  { name: "the check refuses only a figure BELOW the price (a player who confirmed more is sold for less)", expect: ["1.guard"], world: onlyBelow, landed: changed(onlyBelow, SVC) },
  { name: "the check refuses only a figure ABOVE the price (the lapse case — confirmed free, charged a fee — sells)", expect: ["1.guard"], world: onlyAbove, landed: changed(onlyAbove, SVC) },
  { name: "the check compares against the price, not what the sale credits (a clamped sale pays less than confirmed)", expect: ["1.guard"], world: againstPrice, landed: changed(againstPrice, SVC) },
  { name: "a write lands before the check (a refusal would leave it behind)", expect: ["1.before"], world: writeBefore, landed: changed(writeBefore, SVC) },
  { name: "the position read under the lock is changed before the check (the memory store's live object)", expect: ["1.before"], world: touchedBefore, landed: changed(touchedBefore, SVC) },
  { name: "the refusal is audited inside the locks", expect: ["1.refusal"], world: auditedRefusal, landed: changed(auditedRefusal, SVC) },
  { name: "the refusal names the price, not what a sale would pay", expect: ["1.refusal"], world: namesThePrice, landed: changed(namesThePrice, SVC) },
  { name: "the refusal goes out under another code", expect: ["1.refusal"], world: otherCode, landed: changed(otherCode, SVC) },
  { name: "the short-pool branch is dropped (a broken pool is told its price changed, and the page can never sell at it)", expect: ["1.refusal", "1.emitter"], world: poolBranchGone, landed: POOL_BLOCK.length > 0 && changed(poolBranchGone, SVC) },
  { name: "the short-pool branch tests a shrunk fee instead of a short pool (a pool short of the stake but not of the price is refused for good)", expect: ["1.refusal"], world: poolBranchMisread, landed: changed(poolBranchMisread, SVC) },
  { name: "the form's broken-figure refusal says the price changed (a second emitter)", expect: ["1.emitter", "2.refuse"], world: secondEmitter, landed: changed(secondEmitter, SVC) },
  { name: "the action reads the form and calls the money path itself again (the path the suites run is no longer the one a page takes)", expect: ["2.action"], world: actionReadsAgain, landed: changed(actionReadsAgain, ACTIONS) },
  { name: "the form's path ignores a broken figure (the guard silently off for a broken client)", expect: ["2.refuse"], world: brokenIgnored, landed: changed(brokenIgnored, SVC) },
  { name: "a broken figure spends no cash-out token (a client in a loop writes records without end)", expect: ["2.refuse"], world: brokenSpendsNothing, landed: changed(brokenSpendsNothing, SVC) },
  { name: "the form's path hands the service no figure", expect: ["2.hand"], world: figureDropped, landed: changed(figureDropped, SVC) },
  { name: "a refused price is never recorded (a broken pool or host is seen only by the player)", expect: ["2.record"], world: priceUnrecorded, landed: changed(priceUnrecorded, SVC) },
  { name: "every refusal is recorded, a shut exit's too", expect: ["2.record"], world: everyRefusalRecorded, landed: changed(everyRefusalRecorded, SVC) },
  { name: "the parser reads a grouped or padded figure (3,600 as 3600)", expect: ["3.broken"], impl: { parse: acceptsGrouped }, landed: acceptsGrouped("3,600").ok === true },
  { name: "the parser reads a broken figure as no figure", expect: ["3.broken"], impl: { parse: brokenAsAbsent }, landed: brokenAsAbsent("abc").ok === true },
  { name: "the parser loses a good figure", expect: ["3.good", "3.client"], impl: { parse: figureLost }, landed: (figureLost("9000") as { expectedValue?: number }).expectedValue === undefined },
  { name: "the client sends the formatted price (TZS 9,000)", expect: ["4.send"], world: sendsFormatted, landed: changed(sendsFormatted, BUTTON) },
  { name: "the client sends the net (the fee as a negative)", expect: ["4.send"], world: sendsNet, landed: changed(sendsNet, BUTTON) },
  { name: "the client stops sending the figure (the check is never asked)", expect: ["4.send"], world: sendsNothing, landed: changed(sendsNothing, BUTTON) },
  { name: "a refusal for a moved price never asks the page for the new price", expect: ["4.moved"], world: priceUnasked, landed: changed(priceUnasked, BUTTON) },
  { name: "every refusal asks the page to refresh and waits on it, not only a moved price", expect: ["4.moved"], world: everyRefusalAsks, landed: changed(everyRefusalAsks, BUTTON) },
  { name: "the moved price is toasted as an alarm (red, role=alert, the error buzz) for a refusal one tap fixes", expect: ["4.calm"], world: movedAlarmed, landed: changed(movedAlarmed, BUTTON) },
  { name: "today's button says 'Inauza…' while the server's new price is fetched (under a result that says nothing was sold)", expect: ["4.waiting"], world: classicSaysSelling, landed: changed(classicSaysSelling, BUTTON) },
  { name: "the journey's button keeps the refused figure while the server's new price is fetched", expect: ["4.waiting"], world: journeyKeepsFigure, landed: changed(journeyKeepsFigure, BUTTON) },
  { name: "the wait never ends (nothing clears it once the refreshed page is drawn)", expect: ["4.waiting"], world: waitNeverEnds, landed: changed(waitNeverEnds, BUTTON) },
  { name: "/positions hands its buttons the stake's gross, not the price (every sale there refused for good)", expect: ["4.hosts.positions"], world: positionsPricesGross, landed: changed(positionsPricesGross, POSITIONS) },
  { name: "the question page hands its button the stake's gross, not the price", expect: ["4.hosts.market"], world: marketPricesGross, landed: changed(marketPricesGross, MARKET_PAGE) },
  { name: "the question page hands its button the stake itself", expect: ["4.hosts.market"], world: marketHandsStake, landed: changed(marketHandsStake, MARKET_PAGE) },
  { name: "the journey's card hands its button another figure than the price", expect: ["4.hosts.card"], world: cardReadsLive, landed: changed(cardReadsLive, CARD) },
  { name: "the journey's view hands its cards no price", expect: ["4.hosts.positions"], world: viewDropsPrice, landed: changed(viewDropsPrice, VIEW) },
  { name: "the sentence is missing in Swahili (the generic line instead)", expect: ["5.copy.sw"], world: swMissing, landed: wordChanged(swMissing, "sw", "failPriceChanged") },
  { name: "the sentence is missing in Chinese", expect: ["5.copy.zh"], world: zhMissing, landed: wordChanged(zhMissing, "zh", "failPriceChanged") },
  { name: "the Swahili sentence loses the new figure", expect: ["5.copy.sw"], world: swNoFigure, landed: wordChanged(swNoFigure, "sw", "failPriceChanged") },
  { name: "the short pool's sentence is missing in Swahili", expect: ["5.pool.sw"], world: swPoolMissing, landed: wordChanged(swPoolMissing, "sw", "failCashoutPoolShort") },
  { name: "the moved price's row turns into an error that seizes the screen", expect: ["5.row"], impl: { reasons: loudRow }, landed: loudRow.price_changed.channel === "modal" },
  { name: "the moved price's row stops interpolating the new figure", expect: ["5.row"], impl: { reasons: rowWithoutFigure }, landed: rowWithoutFigure.price_changed.needs.length === 0 },
  { name: "the short pool's row calls our fault one the player can fix", expect: ["5.row.pool"], impl: { reasons: poolRowFixable }, landed: poolRowFixable.cashout_pool_short.severity === "warning" },
  { name: "the suite drops out of predeploy", expect: ["6.wired"], world: unwired, landed: unwired.scripts.predeploy !== WORLD.scripts.predeploy },
  { name: "test:cashout stops running the cases in memory", expect: ["6.memory"], world: memoryDropped, landed: changed(memoryDropped, CASHOUT_SUITE) },
];

let caught = 0;
for (const p of plants) {
  proof(`PLANT LANDED · ${p.name}`, p.landed);
  const r = run({ ...REAL, ...(p.impl ?? {}) }, p.world ?? WORLD, quiet);
  const hit = r.failed.some((f) => p.expect.some((e) => f.startsWith(e)));
  if (hit && p.landed) caught++;
  proof(`  └─ fires: ${p.expect.join(" | ")}`, hit, r.failed.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${r.failed.slice(0, 2).join(" | ")}`);
}
console.log("");
console.log(`RED CONTROL — sell-price-guard: ${caught}/${plants.length} caught${fail === 0 ? ` · all ${pass} proofs held` : ` · ${fail} of ${pass + fail} proofs FAILED`}`);
process.exit(fail === 0 && caught === plants.length ? 0 : 1);
