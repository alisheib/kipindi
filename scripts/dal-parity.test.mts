/**
 * DAL PARITY — every field of a Stored shape is MAPPED in the Prisma DAL, proven at SOURCE
 * level with no database.
 *
 * 🔴 THE DEFECT THIS GUARDS. `db.affiliate.update` carried a hand-written allow-list of THREE
 * fields in `prisma-dal.ts` while the memory DAL did `{ ...a, ...patch }` and accepted anything.
 * `toStoredAffiliate` returned six of the table's ten columns. So the day an officer set an
 * agent's commission rate the write would have succeeded, returned a row, audited cleanly — and
 * changed nothing in Postgres, with every in-memory suite green. That is "memory-DAL green ≠
 * Prisma correct" on the money path, and the whole class is invisible to a behavioural test
 * because the behavioural tests run on the memory backend.
 *
 * ⭐ WHY SOURCE-LEVEL. A guard that talks to Postgres SKIPS when `DATABASE_URL` is absent —
 * which is every predeploy run — and a skipped guard prints green. Reading the two files and
 * asserting that every key of the Stored type appears in each mapper needs nothing and cannot
 * skip. The write maps are also typed `Record<keyof Stored…, …>` so `tsc` is a second gate;
 * this suite is the one that catches a key present in the map but wired to the wrong branch, or
 * dropped from the READ mapper, which `tsc` cannot see.
 *
 * ⛔ EVERY REFUSAL HAS A CONTROL. §0 plants a key that MUST be reported missing, so a parser
 * that finds nothing to check — the population trap — goes red rather than green.
 *
 * ⭐ HOUSE BOTS (build commit 1, §6–§12). The eight house tables are raw SQL over typed column maps,
 * so the same no-op has a new home: a Stored key the READ mapper drops, a BIGINT mapped as `int`, a
 * store method only one backend implements. §6 holds all three against schema.prisma and the two
 * house migrations; §7–§10 hold the columns the house adds to User, Transaction, Position and
 * PredictionMarket, including the two markers that must never be rewritten; §11 the schema; §12 that
 * the house DAL never touches a wallet. How the twins BEHAVE is `test:house-bot-migrations`.
 *
 * ⭐ THE POSITION-CARD PROJECTION (the Vodacom plan S6 WP8). `positionCardsByIds` names its columns by hand in both
 * twins and in a Prisma `select`; §10's `10.cards` checks hold all three to the type, and the S2 short titles to their
 * stored value.
 *
 * KP_SRC points the gate at a copied tree — `red:dal-parity`'s mechanism.
 * Run: npm run test:dal-parity
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.KP_SRC ?? join(ROOT, "src");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const storeSrc = decomment(readFileSync(join(SRC, "lib/server/store.ts"), "utf8"));
const dalSrc = decomment(readFileSync(join(SRC, "lib/server/prisma-dal.ts"), "utf8"));
// House bots (build commit 1): the house DAL and its book, and the two files that carry the Position
// and PredictionMarket fields. The schema and the migrations are read from ROOT — they are not source
// a red harness mutates.
const houseDalSrc = decomment(readFileSync(join(SRC, "lib/server/house-bot-dal.ts"), "utf8"));
const bookSrc = decomment(readFileSync(join(SRC, "lib/server/house-bot/book.ts"), "utf8"));
const marketDalSrc = decomment(readFileSync(join(SRC, "lib/server/market-dal.ts"), "utf8"));
const marketSvcSrc = decomment(readFileSync(join(SRC, "lib/server/market-service.ts"), "utf8"));
const prismaSchemaSrc = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");

/** Top-level keys of `export type <Name> = { … };` — the Stored shape's field list. */
function storedKeys(typeName: string, src = storeSrc): string[] {
  const start = src.indexOf(`export type ${typeName} = {`);
  if (start < 0) return [];
  // Walk to the matching close brace at depth 0.
  let depth = 0, i = src.indexOf("{", start), end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = src.slice(src.indexOf("{", start) + 1, end);
  const keys: string[] = [];
  let d = 0;
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (d === 0) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\??\s*:/.exec(t);
      if (m) keys.push(m[1]);
    }
    for (const ch of t) { if (ch === "{") d++; else if (ch === "}") d--; }
  }
  return keys;
}

/** The body of `function <name>(` or `const <name>: … = {` up to its matching close. */
function region(src: string, opener: string): string {
  const start = src.indexOf(opener);
  if (start < 0) return "";
  // A `const X: Record<…, { … }> = {` map carries a brace INSIDE its type annotation before
  // the object literal opens; the body is the brace after `=`. A function's body is its
  // first brace.
  const eqAt = opener.startsWith("const ") ? src.indexOf("= {", start) : -1;
  const braceAt = eqAt >= 0 ? eqAt + 2 : src.indexOf("{", start);
  let depth = 0;
  for (let i = braceAt; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return src.slice(start);
}

/** The `<delegate>: {` block inside the Prisma DAL, then the named method within it. */
function delegateMethod(delegate: string, method: string): string {
  const block = region(dalSrc, `\n  ${delegate}: {`);
  return region(block, `${method}: async (`);
}

const mentions = (body: string, key: string) => new RegExp(`\\b${key}\\b`).test(body);
/** The key is WRITTEN as a property (`key:` at the start of a line) — a mention inside a
 *  string or a column name (`col: "commissionPct"`) does not count. */
const writesKey = (body: string, key: string) => new RegExp(`^\\s*${key}\\s*:`, "m").test(body);
/** A READ mapper must take the value FROM the row (`a.key`), not just name the key: the
 *  mutation `approvedAt: null` keeps the name and drops the column. */
const readsFrom = (body: string, key: string, row: string) =>
  writesKey(body, key) && new RegExp(`\\b${row}\\.${key}\\b`).test(body);

/** The method names of `export interface <Name> { … }` — members declared at two-space indent. */
function interfaceMethods(src: string, name: string): string[] {
  const body = region(src, `export interface ${name} {`);
  return [...body.matchAll(/^ {2}(\w+)\(/gm)].map((m) => m[1]);
}
/** The method names of `const <constName>: … = { async m(…) {…}, … }` — a store implementation. */
function objectMethods(src: string, constName: string): string[] {
  return [...region(src, `const ${constName}:`).matchAll(/^ {2}async (\w+)\(/gm)].map((m) => m[1]);
}
/** One method's text inside a store object: from `async <name>(` to the next method. */
function objectMethod(obj: string, name: string): string {
  const at = obj.indexOf(`async ${name}(`);
  if (at < 0) return "";
  const next = obj.slice(at + 1).search(/\n {2}async \w+\(/);
  return next < 0 ? obj.slice(at) : obj.slice(at, at + 1 + next);
}
/** The `kind` a column map gives a key: `key: { col: "key", kind: "…" }`. */
const kindOf = (map: string, key: string): string | null =>
  new RegExp(`^\\s*${key}:\\s*\\{\\s*col:\\s*"${key}",\\s*kind:\\s*"(\\w+)"\\s*\\}`, "m").exec(map)?.[1] ?? null;
/** The text of `model <Name> {` in schema.prisma, up to its closing brace. */
function schemaModel(schema: string, name: string): string {
  const at = schema.indexOf(`model ${name} {`);
  return at < 0 ? "" : schema.slice(at, schema.indexOf("\n}", at));
}
/** A model's scalar fields as the house column-map kinds. Relation fields (a model type) are skipped. */
const PRISMA_KIND: Record<string, string> = {
  String: "text", Int: "int", BigInt: "bigint", Boolean: "bool", DateTime: "ts", Json: "json", "String[]": "textArray",
};
function schemaScalars(model: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of model.split("\n").slice(1)) {
    const m = /^\s*([A-Za-z_]\w*)\s+([A-Za-z]+(?:\[\])?)\??(?:\s|$)/.exec(line);
    if (m && m[2] in PRISMA_KIND) out.set(m[1], PRISMA_KIND[m[2]]);
  }
  return out;
}
const sameSet = (a: readonly string[], b: readonly string[]) => {
  const x = [...new Set(a)].sort(), y = [...new Set(b)].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
const setDiff = (want: readonly string[], got: readonly string[]) => {
  const missing = want.filter((v) => !got.includes(v)), extra = got.filter((v) => !want.includes(v));
  return [missing.length ? `missing ${missing.join(", ")}` : "", extra.length ? `extra ${extra.join(", ")}` : ""].filter(Boolean).join(" · ");
};

/* ═══ §0 · THE CONTROL — a planted key MUST be reported missing ═══════════════════════ */
{
  const keys = storedKeys("StoredAffiliateAccount");
  ok("0.1 · the parser sees StoredAffiliateAccount's fields", keys.length >= 10, `saw ${keys.length}: ${keys.join(",")}`);
  const read = region(dalSrc, "function toStoredAffiliate(");
  ok("0.2 · the read mapper region resolves", read.length > 100);
  ok("0.3 · CONTROL · a key that does not exist is reported MISSING (the check can fail)",
    !mentions(read, "plantedKeyThatCannotExist"));
  // The two shapes the red harness injects: a key kept but read from nothing, and a key
  // renamed with its column name left behind. Both must be seen as MISSING.
  ok("0.4 · CONTROL · `approvedAt: null,` does NOT count as reading approvedAt from the row",
    !readsFrom("    approvedAt: null,\n    approvedBy: a.approvedBy ?? null,", "approvedAt", "a"));
  ok("0.5 · CONTROL · `commissionPctX: { col: \"commissionPct\" }` does NOT count as writing commissionPct",
    !writesKey(`  commissionPctX: { col: "commissionPct", kind: "plain" },`, "commissionPct"));
}

/* ═══ §1 · AffiliateAgent — the row that carried the defect ═══════════════════════════ */
{
  const keys = storedKeys("StoredAffiliateAccount");
  const read = region(dalSrc, "function toStoredAffiliate(");
  const map = region(dalSrc, "const AFFILIATE_COLUMN");
  const create = delegateMethod("affiliate", "create");
  // Prisma's column names diverge from the Stored ones on two fields; the read mapper
  // takes them from the row under the Prisma name.
  const PRISMA_NAME: Record<string, string> = { recruitCount: "totalRecruits", totalEarnedTzs: "totalCommission" };
  for (const k of keys) {
    ok(`1.read · toStoredAffiliate maps "${k}"`, readsFrom(read, k, "a") || (PRISMA_NAME[k] ? writesKey(read, k) && mentions(read, PRISMA_NAME[k]) : false));
    ok(`1.map · AFFILIATE_COLUMN names "${k}"`, writesKey(map, k));
    // `updatedAt` is Prisma's; `createdAt` and the key are set once. Everything else is
    // written at create, explicitly — a column default is how `commissionPct` got a 5.00
    // nobody chose.
    if (!["updatedAt"].includes(k)) ok(`1.create · affiliate.create writes "${k}"`, mentions(create, k));
  }
  // The three fields that were silently dropped, by name — so a regression on exactly the
  // defect reads as itself in the FAIL line and not as a generic count.
  for (const k of ["commissionPct", "active", "approvedAt"]) {
    ok(`1.defect · "${k}" is read, mapped and created (the 2026-09-07 no-op)`,
      readsFrom(read, k, "a") && writesKey(map, k) && mentions(create, k));
  }
  // ⛔ The update must go THROUGH the map, and refuse an unknown key rather than drop it.
  const update = delegateMethod("affiliate", "update");
  ok("1.update · affiliate.update iterates the patch through AFFILIATE_COLUMN", mentions(update, "AFFILIATE_COLUMN"));
  ok("1.update · …and THROWS on an unmapped key instead of dropping it", /throw new Error\([^)]*unmapped field/.test(update));
  ok("1.update · …and no hand-written `if (patch.x !== undefined) data.y` allow-list survives",
    !/if \(patch\.\w+ !== undefined\) data\./.test(update));
}

/* ═══ §2 · User — the provenance stamp ════════════════════════════════════════════════ */
{
  const read = region(dalSrc, "function toStoredUser(");
  const create = delegateMethod("user", "create");
  const update = delegateMethod("user", "update");
  for (const k of ["recruitedBy", "recruitedProgramme", "recruitedAt", "recruitedByCode"]) {
    ok(`2.read · toStoredUser maps "${k}"`, readsFrom(read, k, "u"));
    ok(`2.create · user.create writes "${k}"`, writesKey(create, k));
  }
  // `update` passes unlisted keys through, so the ONE thing it can get wrong is the date
  // list: an ISO string reaching a DateTime column throws on Postgres and nowhere else.
  ok("2.update · \"recruitedAt\" is in user.update's date-field list", /dateFields = \[[^\]]*"recruitedAt"/.test(update));
}

/* ═══ §3 · ReferralReward — the ledger column that separates two programmes ═══════════ */
{
  const keys = storedKeys("StoredReferralReward");
  const read = region(dalSrc, "function toStoredReward(");
  const create = delegateMethod("referralReward", "create");
  ok("3.0 · the parser sees StoredReferralReward's fields", keys.length >= 15, `saw ${keys.length}`);
  for (const k of keys) {
    ok(`3.read · toStoredReward maps "${k}"`, readsFrom(read, k, "r"));
    ok(`3.create · referralReward.create writes "${k}"`, writesKey(create, k));
  }
  const update = delegateMethod("referralReward", "update");
  ok("3.update · the one patchable DateTime (\"reversedAt\") is converted, not passed as a string",
    /reversedAt/.test(update) && /new Date\(reversedAt/.test(update));
}

/* ═══ §4 · AgentApplication / Document / Invitation ═══════════════════════════════════ */
{
  const keys = storedKeys("StoredAgentApplication");
  const read = region(dalSrc, "function toStoredAgentApplication(");
  const map = region(dalSrc, "const AGENT_APPLICATION_COLUMN");
  ok("4.0 · the parser sees StoredAgentApplication's fields", keys.length >= 35, `saw ${keys.length}`);
  for (const k of keys) {
    ok(`4.read · toStoredAgentApplication maps "${k}"`, readsFrom(read, k, "a"));
    ok(`4.map · AGENT_APPLICATION_COLUMN names "${k}"`, writesKey(map, k));
  }
  // Every DateTime on the row must be flagged "date" — a string reaching Prisma throws.
  for (const k of keys.filter((x) => /At$/.test(x) && !["createdAt", "updatedAt"].includes(x))) {
    ok(`4.date · "${k}" is typed "date" in the map`, new RegExp(`${k}: "date"`).test(map));
  }
  const dKeys = storedKeys("StoredAgentApplicationDocument");
  const dRead = region(dalSrc, "function toStoredAgentDoc(");
  const dCreate = delegateMethod("agentApplicationDoc", "create");
  for (const k of dKeys) {
    ok(`4.doc.read · toStoredAgentDoc maps "${k}"`, readsFrom(dRead, k, "d"));
    ok(`4.doc.create · agentApplicationDoc.create writes "${k}"`, writesKey(dCreate, k));
  }
  const iKeys = storedKeys("StoredAgentInvitation");
  const iRead = region(dalSrc, "function toStoredAgentInvitation(");
  const iCreate = delegateMethod("agentInvitation", "create");
  for (const k of iKeys) {
    ok(`4.inv.read · toStoredAgentInvitation maps "${k}"`, readsFrom(iRead, k, "i"));
    if (k !== "updatedAt") ok(`4.inv.create · agentInvitation.create writes "${k}"`, writesKey(iCreate, k));
  }
}

/* ═══ §5 · Wallet.freezeReasons and the stage feed's rejectReason (2026-09-13) ═══════════ */
/**
 * ⭐ WHY THESE TWO. The KYC-at-withdrawal change added two fields whose silent loss in the Prisma
 * mapper would be a compliance defect no memory-backed suite can see — the memory store keeps the
 * whole object, so `test:wallet-freeze` and `test:refused-funds` go green either way:
 *   · `Wallet.freezeReasons` — dropped by `toStoredWallet`, a wallet held for an officer's freeze AND a
 *     final identity refusal reads back as `[]`; `currentFreezeReasons` then reads the FROZEN wallet as a
 *     legacy self-exclusion, and reopening a served exclusion would lift every hold at once.
 *   · `StoredKycStageRow.rejectReason` — both producers of the stage feed must carry it, or the
 *     refused-balances report and the roster cannot tell a FINAL refusal from a recoverable one.
 */
{
  const schemaSrc = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
  const wKeys = storedKeys("StoredWallet");
  const wRead = region(dalSrc, "function toStoredWallet(");
  const wCreate = delegateMethod("wallet", "create");
  const wUpdate = delegateMethod("wallet", "update");
  ok("5.0 · the parser sees StoredWallet's fields, freezeReasons among them",
    wKeys.length >= 10 && wKeys.includes("freezeReasons"), `saw ${wKeys.length}: ${wKeys.join(",")}`);
  ok("5.0b · toStoredWallet and the wallet delegate's create/update resolve",
    wRead.length > 100 && wCreate.length > 100 && wUpdate.length > 50, `read ${wRead.length} · create ${wCreate.length} · update ${wUpdate.length}`);
  // `currency` is the literal "TZS" by design (one currency), never a column read.
  for (const k of wKeys.filter((x) => x !== "currency")) {
    ok(`5.read · toStoredWallet maps "${k}" from the row`, readsFrom(wRead, k, "w"));
  }
  // `updatedAt` is Prisma's. Everything else is written at create, explicitly.
  for (const k of wKeys.filter((x) => x !== "updatedAt")) {
    ok(`5.create · wallet.create writes "${k}"`, writesKey(wCreate, k));
  }
  ok(`5.defect · "freezeReasons" is read from the row AND written at create from the input`,
    readsFrom(wRead, "freezeReasons", "w") && writesKey(wCreate, "freezeReasons") && /\bw\.freezeReasons\b/.test(wCreate));
  // ⛔ `update` must carry NO allow-list — the freeze service writes `{ status, freezeReasons }` through it,
  // and a hand-written allow-list is exactly the 2026-09-07 affiliate no-op (§1).
  ok("5.update · wallet.update passes the patch through (…rest into data), with no hand-written allow-list",
    /\.\.\.rest\b/.test(wUpdate) && /data:\s*rest\b/.test(wUpdate) && !/if \(patch\.\w+ !== undefined\)/.test(wUpdate));
  const modelAt = schemaSrc.indexOf("model Wallet {");
  const model = modelAt < 0 ? "" : schemaSrc.slice(modelAt, schemaSrc.indexOf("\n}", modelAt));
  ok("5.schema · the Wallet model declares the column", /^\s*freezeReasons\s+String\[\]/m.test(model), `model ${model.length} chars`);
  // ⛔ CONTROLS — each check above can fail.
  ok("5.c1 · CONTROL · `freezeReasons: [],` does NOT count as reading freezeReasons from the row",
    !readsFrom("    status: w.status,\n    freezeReasons: [],", "freezeReasons", "w"));
  ok("5.c2 · CONTROL · a create body without the key is reported missing",
    !writesKey("          status: w.status,\n          createdAt: new Date(w.createdAt),", "freezeReasons"));
  ok("5.c3 · CONTROL · an update carrying an allow-list is caught",
    /if \(patch\.\w+ !== undefined\)/.test("if (patch.status !== undefined) data.status = patch.status;"));
}
{
  const sKeys = storedKeys("StoredKycStageRow");
  const prismaFacts = region(dalSrc, "listStageFacts: async (");
  const memoryFacts = region(storeSrc, "listStageFacts: (");
  ok("5.1 · the parser sees StoredKycStageRow's fields, rejectReason among them",
    sKeys.length >= 8 && sKeys.includes("rejectReason"), `saw ${sKeys.length}: ${sKeys.join(",")}`);
  ok("5.1b · both producers of the stage feed resolve", prismaFacts.length > 200 && memoryFacts.length > 200,
    `prisma ${prismaFacts.length} · memory ${memoryFacts.length}`);
  // `documentCount` is DERIVED on both sides (a groupBy count / `documents.length`), never a column read.
  for (const k of sKeys.filter((x) => x !== "documentCount")) {
    ok(`5.stage.prisma · listStageFacts (Prisma) carries "${k}" from the row`, readsFrom(prismaFacts, k, "s"));
    ok(`5.stage.memory · listStageFacts (memory) carries "${k}" from the row`, readsFrom(memoryFacts, k, "k"));
  }
  // A key mapped from the row but not SELECTED reads `undefined` → null on Postgres, and only there.
  const SELECTS_REJECT = /select:\s*\{[^}]*\brejectReason:\s*true/;
  ok("5.stage.select · the Prisma producer SELECTS rejectReason", SELECTS_REJECT.test(prismaFacts));
  ok("5.stage.c1 · CONTROL · `rejectReason: null,` in a producer does NOT count as carrying it",
    !readsFrom("        approvedAt: iso(s.approvedAt),\n        rejectReason: null,", "rejectReason", "s"));
  ok("5.stage.c2 · CONTROL · a select without rejectReason is caught",
    !SELECTS_REJECT.test("select: {\n  id: true, userId: true, status: true,\n},"));
}

/* ═══ §6 · the eight house tables (house bots, build commit 1) ═══════════════════════════ */
/**
 * ⭐ THE SAME DEFECT, A NEW SHAPE. Every house statement is raw SQL built from a typed column map, read
 * back through one mapper per table. A key missing from the READ mapper reads `undefined` on Postgres
 * and nothing else; a BIGINT column mapped as `int` hands back a JS bigint that throws the first time
 * an audit payload is serialised — again on Postgres only, because memory holds numbers. `tsc` sees
 * neither. So each Stored key must be read from the row, named in the map with the kind its
 * schema.prisma type implies, and every store method must exist in BOTH implementations.
 *
 * ⚠️ BIGINT IS DERIVED FROM THE SCHEMA, NEVER FROM A NAME SUFFIX: `gCounterPerPlayerTzsPerDay` is BIGINT
 * and does not end in "Tzs", which is exactly how a suffix rule would miss it.
 *
 * Behavioural parity — the same case list on Postgres and memory — is `test:house-bot-migrations`.
 */
const HOUSE_PAIRS = [
  { type: "StoredHouseBot", mapper: "toHouseBot", map: "HOUSE_BOT_COLUMNS", iface: "HouseBotStore", memory: "memoryHouseBots", prisma: "prismaHouseBots", exported: "houseBotStore", model: "HouseBot" },
  { type: "StoredHouseBotControl", mapper: "toHouseBotControl", map: "HOUSE_BOT_CONTROL_COLUMNS", iface: "HouseBotControlStore", memory: "memoryHouseBotControl", prisma: "prismaHouseBotControl", exported: "houseBotControlStore", model: "HouseBotControl" },
  { type: "StoredHouseBotRuntime", mapper: "toHouseBotRuntime", map: "HOUSE_BOT_RUNTIME_COLUMNS", iface: "HouseBotRuntimeStore", memory: "memoryHouseBotRuntime", prisma: "prismaHouseBotRuntime", exported: "houseBotRuntimeStore", model: "HouseBotRuntime" },
  { type: "StoredHouseBotAlertOnce", mapper: "toHouseBotAlertOnce", map: "HOUSE_BOT_ALERT_ONCE_COLUMNS", iface: "HouseBotAlertOnceStore", memory: "memoryHouseBotAlertOnce", prisma: "prismaHouseBotAlertOnce", exported: "houseBotAlertOnceStore", model: "HouseBotAlertOnce" },
  { type: "StoredHouseBotEvent", mapper: "toHouseBotEvent", map: "HOUSE_BOT_EVENT_COLUMNS", iface: "HouseBotEventStore", memory: "memoryHouseBotEvents", prisma: "prismaHouseBotEvents", exported: "houseBotEventStore", model: "HouseBotEvent" },
  { type: "StoredHouseBotIntent", mapper: "toHouseBotIntent", map: "HOUSE_BOT_INTENT_COLUMNS", iface: "HouseBotIntentStore", memory: "memoryHouseBotIntents", prisma: "prismaHouseBotIntents", exported: "houseBotIntentStore", model: "HouseBotIntent" },
  { type: "StoredHouseBotTarget", mapper: "toHouseBotTarget", map: "HOUSE_BOT_TARGET_COLUMNS", iface: "HouseBotTargetStore", memory: "memoryHouseBotTargets", prisma: "prismaHouseBotTargets", exported: "targetStore", model: "HouseBotTarget" },
  { type: "StoredHouseBotPress", mapper: "toHouseBotPress", map: "HOUSE_BOT_PRESS_COLUMNS", iface: "HouseBotPressStore", memory: "memoryHouseBotPresses", prisma: "prismaHouseBotPresses", exported: "pressStore", model: "HouseBotPress" },
] as const;
/** Time columns whose names do not end in "At". */
const HOUSE_TS_KEYS = new Set(["dueAt", "staleAt", "deadlineAt", "claimedUntil", "auditClaimUntil", "effectiveFrom", "scopeFrom", "transientSince", "sweepPlacedAt", "rulesFutureSince"]);
{
  const bigints = new Set<string>();
  for (const p of HOUSE_PAIRS) {
    const keys = storedKeys(p.type, houseDalSrc);
    const read = region(houseDalSrc, `function ${p.mapper}(`);
    const map = region(houseDalSrc, `const ${p.map}:`);
    const scalars = schemaScalars(schemaModel(prismaSchemaSrc, p.model));
    ok(`6.0 · the parser sees ${p.type}'s fields`, keys.length >= (p.type === "StoredHouseBotIntent" ? 30 : 2), `saw ${keys.length}`);
    ok(`6.0b · ${p.mapper}, ${p.map} and model ${p.model} resolve`, read.length > 50 && map.length > 50 && scalars.size >= 2,
      `mapper ${read.length} · map ${map.length} · schema fields ${scalars.size}`);
    for (const k of keys) {
      ok(`6.read · ${p.mapper} maps "${k}"`, readsFrom(read, k, "r"));
      ok(`6.map · ${p.map} names "${k}"`, writesKey(map, k));
      ok(`6.schema · model ${p.model} declares "${k}" with the kind ${p.map} gives it`, scalars.get(k) === kindOf(map, k),
        `schema ${scalars.get(k) ?? "missing"} · map ${kindOf(map, k) ?? "missing"}`);
      if (/At$/.test(k) || HOUSE_TS_KEYS.has(k)) ok(`6.ts · "${k}" is kind "ts" in ${p.map}`, kindOf(map, k) === "ts");
    }
    const unmapped = [...scalars.keys()].filter((c) => !keys.includes(c));
    ok(`6.schema · model ${p.model} has no column ${p.type} lacks`, unmapped.length === 0, unmapped.join(", "));
    for (const [c, kind] of scalars) {
      if (kind !== "bigint") continue;
      bigints.add(`${p.model}.${c}`);
      ok(`6.bigint · ${p.model}.${c} is BigInt: kind "bigint" in ${p.map}, read through a number conversion`,
        kindOf(map, c) === "bigint" && new RegExp(`^\\s*${c}:\\s*(big|Number)\\(r\\.${c}\\)`, "m").test(read));
    }
    const methods = interfaceMethods(houseDalSrc, p.iface);
    const mem = objectMethods(houseDalSrc, p.memory);
    const pri = objectMethods(houseDalSrc, p.prisma);
    ok(`6.twin.0 · the parser sees ${p.iface} and both implementations`, methods.length >= 3 && mem.length >= 3 && pri.length >= 3,
      `interface ${methods.length} · memory ${mem.length} · prisma ${pri.length}`);
    for (const m of methods) {
      ok(`6.twin · ${p.iface}.${m} exists in ${p.memory}`, mem.includes(m));
      ok(`6.twin · ${p.iface}.${m} exists in ${p.prisma}`, pri.includes(m));
    }
    ok(`6.wire · ${p.exported} is ${p.prisma} with a database and ${p.memory} without`,
      new RegExp(`export const ${p.exported}: ${p.iface} = usePrisma \\? ${p.prisma} : ${p.memory};`).test(houseDalSrc));
  }
  {
    const methods = interfaceMethods(houseDalSrc, "HouseBookStore");
    const mem = objectMethods(houseDalSrc, "memoryHouseBook");
    const pri = objectMethods(houseDalSrc, "prismaHouseBook");
    ok("6.twin.0 · the parser sees HouseBookStore and both implementations", methods.length >= 2 && mem.length >= 2 && pri.length >= 2);
    for (const m of methods) {
      ok(`6.twin · HouseBookStore.${m} exists in memoryHouseBook`, mem.includes(m));
      ok(`6.twin · HouseBookStore.${m} exists in prismaHouseBook`, pri.includes(m));
    }
    ok("6.wire · houseBookStore is prismaHouseBook with a database and memoryHouseBook without",
      /export const houseBookStore: HouseBookStore = usePrisma \? prismaHouseBook : memoryHouseBook;/.test(houseDalSrc));
  }
  {
    // The money seam's reads (build commit 2): every member in both implementations, wired the same way.
    const methods = interfaceMethods(houseDalSrc, "HouseSeamStore");
    const mem = objectMethods(houseDalSrc, "memoryHouseSeam");
    const pri = objectMethods(houseDalSrc, "prismaHouseSeam");
    ok("6.twin.0 · the parser sees HouseSeamStore and both implementations", methods.length >= 9 && mem.length >= 9 && pri.length >= 9,
      `interface ${methods.length} · memory ${mem.length} · prisma ${pri.length}`);
    for (const m of methods) {
      ok(`6.twin · HouseSeamStore.${m} exists in memoryHouseSeam`, mem.includes(m));
      ok(`6.twin · HouseSeamStore.${m} exists in prismaHouseSeam`, pri.includes(m));
    }
    ok("6.wire · houseSeamStore is prismaHouseSeam with a database and memoryHouseSeam without",
      /export const houseSeamStore: HouseSeamStore = usePrisma \? prismaHouseSeam : memoryHouseSeam;/.test(houseDalSrc));
    // ⛔ 04 A9: the seam's reads are plain SELECTs — no row lock a player's bet could queue behind.
    const priSeam = region(houseDalSrc, "const prismaHouseSeam:");
    ok("6.seam.sql · prismaHouseSeam takes no row lock (no FOR UPDATE / FOR SHARE)", priSeam.length > 500 && !/FOR\s+(UPDATE|SHARE|NO KEY UPDATE)/i.test(priSeam), `region ${priSeam.length} chars`);
    ok("6.seam.sql · intentFreshness reads staleAt on clock_timestamp(), never now() (N1 §3)",
      /"staleAt" > clock_timestamp\(\)/.test(objectMethod(priSeam, "intentFreshness")));
    ok("6.seam.c1 · CONTROL · a planted FOR UPDATE is caught", /FOR\s+(UPDATE|SHARE|NO KEY UPDATE)/i.test(`SELECT 1 FROM "Position" FOR UPDATE`));
  }

  // The fields whose loss is a named defect, by name, so the FAIL line reads as itself.
  const DEFECTS: Record<string, readonly string[]> = {
    StoredHouseBotIntent: ["staleAt", "transientAttempts", "targetId", "requestedById", "entryCondition", "alertedAt"],
    StoredHouseBot: ["labelKey", "consentVoidAt", "pausedFromStatus", "removedCause", "credentialChangedAt", "credentialChangedVia", "createdAt", "updatedAt"],
    // ⛔ D20 (ruling 273 (a)) un-built `boardDisclosureSections`, the row's only text[] column; the same defect — a column
    // declared but not read or not mapped — is pinned on `offCause`, whose loss would hide why the master switch went off.
    StoredHouseBotControl: ["offCause", "gCounterPerPlayerTzsPerDay", "createdAt", "updatedAt"],
    StoredHouseBotRuntime: ["engineEnabled", "scopeFrom", "sweepPlacedAt"],
    StoredHouseBotTarget: ["effectiveFrom", "updatedById", "removedById"],
    StoredHouseBotPress: ["code", "intentId", "auditClaimUntil"],
  };
  for (const p of HOUSE_PAIRS) {
    const keys = storedKeys(p.type, houseDalSrc);
    const read = region(houseDalSrc, `function ${p.mapper}(`);
    const map = region(houseDalSrc, `const ${p.map}:`);
    for (const k of DEFECTS[p.type] ?? []) {
      ok(`6.defect · "${k}" is declared, read and mapped on ${p.type}`, keys.includes(k) && readsFrom(read, k, "r") && writesKey(map, k));
    }
  }

  // The sealed store API (N1 §2, N2 §2): later commits and their suites call these names.
  const SEALED: Record<string, readonly string[]> = {
    HouseBotTargetStore: ["insert", "casUpdate", "remove", "endActive", "listForBot", "countForBot", "activeForMarket", "everStopped", "countActive", "endAllForBot"],
    HouseBotIntentStore: ["insertTargetedIfActive", "insertIgnoringConflict", "claimBatch", "claimById", "requeueTransient", "markPlaced", "expireStale", "cancelLive"],
    HouseBotPressStore: ["insertChecking", "refuse", "queue", "doneEnterNow", "doneInTx", "interruptStale", "claimAuditLease", "listAuditRepair"],
    HouseBotEventStore: ["drawOpenerSide", "findOpenerDraw"],
  };
  for (const [iface, names] of Object.entries(SEALED)) {
    const methods = interfaceMethods(houseDalSrc, iface);
    for (const n of names) ok(`6.sealed · ${iface} declares "${n}"`, methods.includes(n));
  }
  // The sealed predicates that are easy to widen by accident, on BOTH stores.
  const priPress = region(houseDalSrc, "const prismaHouseBotPresses:");
  const memPress = region(houseDalSrc, "const memoryHouseBotPresses:");
  const both = (name: string, pri: RegExp, mem: RegExp) => pri.test(objectMethod(priPress, name)) && mem.test(objectMethod(memPress, name));
  ok("6.sealed.sql · doneEnterNow completes only a QUEUED press, found by its intent, on both stores",
    both("doneEnterNow", /"intentId" = [\s\S]*"state" = 'QUEUED'/, /p\.intentId === intentId && p\.state === "QUEUED"/));
  ok("6.sealed.sql · doneInTx completes only a CHECKING press, on both stores",
    both("doneInTx", /"state" = 'CHECKING'/, /cur\.state !== "CHECKING"/));
  ok("6.sealed.sql · interruptStale refuses CHECKING presses after PRESS_INTERRUPTED_AFTER_MS as PRESS_REFUSAL_INTERRUPTED, on both stores",
    both("interruptStale", /"state" = 'CHECKING'[\s\S]*PRESS_INTERRUPTED_AFTER_MS/, /PRESS_INTERRUPTED_AFTER_MS/)
      && both("interruptStale", /PRESS_REFUSAL_INTERRUPTED/, /PRESS_REFUSAL_INTERRUPTED/));
  ok("6.sealed.sql · listAuditRepair measures age from updatedAt, on both stores",
    both("listAuditRepair", /"updatedAt" < now\(\)/, /p\.updatedAt/) && !/"createdAt" < now\(\)/.test(objectMethod(priPress, "listAuditRepair")));
  // C4-SPEC ruling 97 moved the conflict clause into `anchorConflictSql(row.kind)` (only the row's own anchor index is
  // "already decided"); the defect this pins is unchanged — the share lock is taken BEFORE the insert.
  ok("6.sealed.sql · insertTargetedIfActive holds the target FOR SHARE before inserting",
    /FOR SHARE[\s\S]*insertSql\("HouseBotIntent"[\s\S]*anchorConflictSql\(row\.kind\)/.test(objectMethod(region(houseDalSrc, "const prismaHouseBotIntents:"), "insertTargetedIfActive")));
  {
    const conflict = houseDalSrc.slice(houseDalSrc.indexOf("function anchorConflictSql("), houseDalSrc.indexOf("function anchorConflictSql(") + 900);
    ok("6.sealed.sql · ruling 97 · the engine insert swallows only its own anchor index (partial-index inference, never a bare ON CONFLICT DO NOTHING)",
      conflict.includes(`ON CONFLICT ("anchorKey") WHERE "kind" = 'COUNTER' DO NOTHING`)
        && conflict.includes(`ON CONFLICT ("kind", "anchorKey") WHERE "kind" IN ('FILL','OPENER') AND "status" <> 'CANCELLED' DO NOTHING`)
        && !/ON CONFLICT DO NOTHING/.test(objectMethod(region(houseDalSrc, "const prismaHouseBotIntents:"), "insertIgnoringConflict")));
  }
  {
    const insert = objectMethod(region(houseDalSrc, "const prismaHouseBotTargets:"), "insert");
    ok("6.sealed.sql · targetStore.insert stamps createdAt and effectiveFrom from one database now(), by hand",
      /now\(\), now\(\) \+ \(/.test(insert) && /TARGET_ARMING_SEC/.test(insert) && !/insertSql\(/.test(insert));
  }
  {
    /* ⛔ ONE DAY PER RENDER, IN BOTH TWINS (C7-SPEC ruling 348). `staffChosenPlacedToday` used to derive its own
       EAT day in each twin — `eatDayKey(Date.now())` in memory, the DATABASE CLOCK (`EAT_TODAY_FROM_SQL`) in
       Prisma — so a console that had already derived the render's day got a SECOND, possibly different, day back
       and one card could show two of them. A twin that accepted `dayKey` and quietly ignored it would be the same
       defect wearing the fix's signature, which is why both bodies are read, not just the interface.
       ⚠️ How they BEHAVE on the two stores is `test:house-bot-console` 1.348, which runs on both. */
    const priIntents = region(houseDalSrc, "const prismaHouseBotIntents:");
    const memIntentsSrc = region(houseDalSrc, "const memoryHouseBotIntents:");
    const priToday = objectMethod(priIntents, "staffChosenPlacedToday");
    const memToday = objectMethod(memIntentsSrc, "staffChosenPlacedToday");
    ok("6.twin.348 · staffChosenPlacedToday takes the caller's dayKey and USES it, in both twins — never a second derivation of its own",
      /\{ houseBotId, dayKey \}/.test(priToday) && /\{ houseBotId, dayKey \}/.test(memToday)
        && /eatDayWindow\(dayKey \?\? eatDayKey\(Date\.now\(\)\)\)/.test(memToday)
        && /if \(dayKey != null\)[\s\S]*eatDayWindow\(dayKey\)[\s\S]*p\.col\("HouseBotIntent", "finishedAt", fromIso\)/.test(priToday),
      `memory ${memToday.length} chars · prisma ${priToday.length} chars`);
    ok("6.twin.348 · CONTROL · both method bodies were really found, and the DB-clock branch is still there for the callers that ask for TODAY",
      memToday.length > 60 && priToday.length > 120 && /EAT_TODAY_FROM_SQL/.test(priToday),
      `memory ${memToday.length} · prisma ${priToday.length}`);
  }

  // Every name the migrations fix, mirrored for the memory twin — no database needed to compare.
  const migDir = join(ROOT, "prisma/migrations");
  const houseSql = readdirSync(migDir).filter((f) => /^\d{14}_house_bot_(tables|markers)$/.test(f)).sort()
    .map((f) => readFileSync(join(migDir, f, "migration.sql"), "utf8").replace(/--.*$/gm, "")).join("\n");
  const listAt = houseDalSrc.indexOf("export const HOUSE_UNIQUE_INDEXES = [");
  const exportedUniques = listAt < 0 ? [] : [...houseDalSrc.slice(listAt, houseDalSrc.indexOf("] as const;", listAt)).matchAll(/"(\w+)"/g)].map((m) => m[1]);
  const memUniques = [...region(houseDalSrc, "const MEM_UNIQUES:").matchAll(/name:\s*"(\w+)"/g)].map((m) => m[1]);
  const memChecks = [...region(houseDalSrc, "const MEM_CHECKS:").matchAll(/name:\s*"(\w+)"/g)].map((m) => m[1]);
  const sqlUniques = [...houseSql.matchAll(/CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"(\w+)"/g)].map((m) => m[1]);
  const sqlChecks = [...houseSql.matchAll(/CONSTRAINT\s+"(\w+)"\s+CHECK/g)].map((m) => m[1]);
  ok("6.names.0 · the parser sees the unique list, both mirrors and both migrations",
    exportedUniques.length >= 11 && memUniques.length >= 11 && memChecks.length >= 80 && sqlUniques.length >= 11 && sqlChecks.length >= 80,
    `exported ${exportedUniques.length} · MEM_UNIQUES ${memUniques.length} · MEM_CHECKS ${memChecks.length} · sql uniques ${sqlUniques.length} · sql checks ${sqlChecks.length}`);
  ok("6.names · every HOUSE_UNIQUE_INDEXES name appears in MEM_UNIQUES, and nothing else does",
    sameSet(exportedUniques, memUniques), setDiff(exportedUniques, memUniques));
  ok("6.names · HOUSE_UNIQUE_INDEXES is exactly the migrations' unique indexes, in creation order",
    exportedUniques.join(",") === sqlUniques.join(","), setDiff(sqlUniques, exportedUniques) || "same names, different order");
  ok("6.names · MEM_CHECKS mirrors exactly the migrations' named CHECKs", sameSet(memChecks, sqlChecks), setDiff(sqlChecks, memChecks));

  // ⛔ CONTROLS — each check above can fail.
  ok("6.c1 · CONTROL · `staleAt: null,` does NOT count as reading staleAt", !readsFrom("    dueAt: iso(r.dueAt),\n    staleAt: null,", "staleAt", "r"));
  const plantedStore = "const memoryPlanted: PlantedStore = {\n  async get(id) {\n    return null;\n  },\n};";
  ok("6.c2 · CONTROL · a memory object missing a method is reported",
    objectMethods(plantedStore, "memoryPlanted").includes("get") && !objectMethods(plantedStore, "memoryPlanted").includes("claimBatch"));
  ok("6.c3 · CONTROL · a planted kind \"int\" for gCounterPerPlayerTzsPerDay is caught",
    kindOf(`  gCounterPerPlayerTzsPerDay: { col: "gCounterPerPlayerTzsPerDay", kind: "int" },`, "gCounterPerPlayerTzsPerDay") !== "bigint");
  ok("6.c4 · CONTROL · the BigInt set comes from the real schema and holds the key no suffix rule finds",
    // 15, not 16, since owner ruling D20 un-built `HouseBotControl.gStaffEdgeNetTzs` (ruling 265): the floor is the schema's own count, MEASURED here.
    bigints.has("HouseBotControl.gCounterPerPlayerTzsPerDay") && bigints.has("HouseBotIntent.stakeTzs") && bigints.size >= 15, `${bigints.size}: ${[...bigints].join(", ")}`);
  ok("6.c5 · CONTROL · a model without a BigInt yields none", ![...schemaScalars("model X {\n  a Int\n  b String?\n}").values()].includes("bigint"));
  ok("6.c6 · CONTROL · interfaceMethods reads top-level members only",
    sameSet(interfaceMethods("export interface P {\n  get(a: { x(): void }): void;\n  put(\n    b: { y(): void },\n  ): void;\n}", "P"), ["get", "put"]));
  ok("6.c7 · CONTROL · objectMethod stops at the next method",
    objectMethod("const o: O = {\n  async a() {\n    return 1;\n  },\n  async b() {\n    return 2;\n  },\n};", "a").includes("return 1")
      && !objectMethod("const o: O = {\n  async a() {\n    return 1;\n  },\n  async b() {\n    return 2;\n  },\n};", "a").includes("return 2"));
}

/* ═══ §7 · User password history (house bots, 04 A4) ═════════════════════════════════════ */
{
  const uKeys = storedKeys("StoredUser");
  const read = region(dalSrc, "function toStoredUser(");
  const create = delegateMethod("user", "create");
  const update = delegateMethod("user", "update");
  for (const k of ["passwordSetAt", "passwordSetVia", "emailSetByOfficerAt"]) {
    ok(`7.type · StoredUser declares "${k}"`, uKeys.includes(k));
    ok(`7.read · toStoredUser maps "${k}"`, readsFrom(read, k, "u"));
    ok(`7.create · user.create writes "${k}"`, writesKey(create, k));
  }
  // The same trap as §2's `recruitedAt`: an ISO string reaching a DateTime column throws on Postgres only.
  for (const k of ["passwordSetAt", "emailSetByOfficerAt"]) {
    ok(`7.update · "${k}" is in user.update's date-field list`, new RegExp(`dateFields = \\[[^\\]]*"${k}"`).test(update));
  }
  ok("7.c1 · CONTROL · `passwordSetAt: null,` does NOT count as reading", !readsFrom("    recruitedAt: iso(u.recruitedAt),\n    passwordSetAt: null,", "passwordSetAt", "u"));
  ok("7.c2 · CONTROL · a date list without the key is caught", !/dateFields = \[[^\]]*"passwordSetAt"/.test(`const dateFields = ["emailSetByOfficerAt", "lockedUntil"] as const;`));
}

/* ═══ §8 · the Transaction house marker is create-only (PLAN §2 I8) ══════════════════════ */
{
  const read = region(dalSrc, "function toStoredTxn(");
  const create = delegateMethod("txn", "create");
  const update = delegateMethod("txn", "update");
  const memUpdate = region(storeSrc, "update: (id: string, patch: Partial<StoredTxn>)");
  ok("8.0 · toStoredTxn, txn.create, txn.update and the memory update resolve",
    read.length > 100 && create.length > 100 && update.length > 50 && memUpdate.length > 50,
    `read ${read.length} · create ${create.length} · update ${update.length} · memory ${memUpdate.length}`);
  ok('8.type · StoredTxn declares "houseBotId"', storedKeys("StoredTxn").includes("houseBotId"));
  ok('8.read · toStoredTxn maps "houseBotId" from the row', readsFrom(read, "houseBotId", "t"));
  ok('8.create · txn.create writes "houseBotId"', writesKey(create, "houseBotId") && /\bt\.houseBotId\b/.test(create));
  const SKIPS = /k === "houseBotId"/;
  ok('8.immutable · txn.update skips "houseBotId"', SKIPS.test(update));
  ok("8.memory · the memory txn.update drops houseBotId from the patch",
    /houseBotId:\s*_\w*/.test(memUpdate) && /\.\.\.rest\b/.test(memUpdate) && !/\.\.\.patch\b/.test(memUpdate));
  ok("8.c1 · CONTROL · an update body without the skip is caught", !SKIPS.test(`if (k === "createdAt" || k === "updatedAt") continue;`));
  ok("8.c2 · CONTROL · a memory update spreading the whole patch is caught", /\.\.\.patch\b/.test("const next = { ...t, ...patch, updatedAt: now };"));
}

/* ═══ §9 · the Position house marker is create-only (PLAN §2 I8) ═════════════════════════ */
{
  const posKeys = storedKeys("StoredPosition", marketSvcSrc);
  const read = region(marketDalSrc, "function toStoredPosition(");
  const setBody = region(region(marketDalSrc, "const prismaPositions"), "async set(p, tx) {");
  const createAt = setBody.indexOf("create: {");
  const updateAt = setBody.indexOf("update: {");
  const createArm = createAt >= 0 && updateAt > createAt ? setBody.slice(createAt, updateAt) : "";
  const updateArm = region(setBody, "update: {");
  const memSet = region(region(marketDalSrc, "const memoryPositions"), "async set(p, _tx) {");
  ok("9.0 · both positions.set bodies and both upsert arms resolve", createArm.length > 100 && updateArm.length > 100 && memSet.length > 20,
    `create ${createArm.length} · update ${updateArm.length} · memory ${memSet.length}`);
  ok('9.type · StoredPosition declares "houseBotId"', posKeys.includes("houseBotId"));
  ok('9.read · toStoredPosition maps "houseBotId"', readsFrom(read, "houseBotId", "r"));
  ok("9.create · positions.set create arm writes houseBotId", writesKey(createArm, "houseBotId") && /\bp\.houseBotId\b/.test(createArm));
  ok("9.immutable · positions.set update arm does NOT write houseBotId", !mentions(updateArm, "houseBotId"));
  // ⛔ Create-only in BOTH directions: keep the stored marker, never take the incoming one.
  const keepsStoredMarkerOnly = (body: string) => /prev\.houseBotId/.test(body) && !/\bp\.houseBotId\b/.test(body);
  ok("9.memory · memory positions.set keeps the stored marker and never takes the incoming one", keepsStoredMarkerOnly(memSet));
  ok("9.c1 · CONTROL · an update arm carrying houseBotId is caught", mentions("update: {\n  status: p.status,\n  houseBotId: p.houseBotId ?? null,\n}", "houseBotId"));
  ok("9.c2 · CONTROL · a create arm without it is caught", !writesKey("create: {\n  id: p.id,\n  status: p.status,\n}", "houseBotId"));
  ok("9.c3 · CONTROL · a memory set that lets NULL become an id is caught",
    !keepsStoredMarkerOnly("positions.set(p.id, prev ? { ...p, houseBotId: prev.houseBotId ?? p.houseBotId ?? null } : p);"));
}

/* ═══ §10 · the market reopen stamp (house bots, N1 §2) + short titles and competition (Vodacom plan S2) + the position-card projection (S6 WP8) ═══ */
{
  const mKeys = storedKeys("StoredMarket", marketSvcSrc);
  const read = region(marketDalSrc, "function toStoredMarket(");
  const setBody = region(region(marketDalSrc, "const prismaMarkets"), "async set(m, tx) {");
  const stampable = region(marketDalSrc, "const STAMPABLE:");
  const armCount = (body: string, k: string) => (body.match(new RegExp(`^\\s*${k}\\s*:`, "gm")) ?? []).length;
  ok("10.0 · toStoredMarket, marketStore.set and STAMPABLE resolve", read.length > 100 && setBody.length > 500 && stampable.length > 100);
  for (const k of ["reopenedAt", "reopenCount"]) {
    ok(`10.type · StoredMarket declares "${k}"`, mKeys.includes(k));
    ok(`10.read · toStoredMarket maps "${k}"`, readsFrom(read, k, "r"));
    // ⚠️ BOTH arms of the upsert: written in `create` only, the stamp is lost the first time anything
    // writes an existing poll — which is every write after the reopen that set it.
    ok(`10.both · marketStore.set writes "${k}" in BOTH upsert arms`, armCount(setBody, k) === 2, `${armCount(setBody, k)} arm(s)`);
    ok(`10.notStamp · "${k}" is not in STAMPABLE`, !writesKey(stampable, k));
  }
  ok("10.c1 · CONTROL · a set body writing the key in one arm only is caught",
    armCount("create: {\n  reopenedAt: x,\n},\nupdate: {\n  status: s,\n}", "reopenedAt") !== 2);

  /* ⭐ THE VODACOM PLAN S2 (2026-09-30) · SHORT TITLES AND COMPETITION. The reopen stamp's four facts, one key per line,
   * plus the NARROW WRITER. After creation these columns are written ONLY by `setShortTitles`, an UPDATE of exactly
   * four columns in BOTH twins: never the full-row `set` from a caller's earlier read (it would erase a stake that
   * landed in between) and never `stamp` (its Prisma allow-list refuses title fields while the memory twin spreads
   * anything — green in every suite, a throw in production). Written in `create` only, a short title would be wiped by
   * the next resolve, settle, reopen or void, all of which go through the full-row `set`. */
  const S2 = ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"] as const;
  const s2CreateAt = setBody.indexOf("create: {");
  const s2UpdateAt = setBody.indexOf("update: {");
  const s2CreateArm = s2CreateAt >= 0 && s2UpdateAt > s2CreateAt ? setBody.slice(s2CreateAt, s2UpdateAt) : "";
  const s2UpdateArm = region(setBody, "update: {");
  /** Written exactly once in the arm, and FROM the market (`k: m.k …`) — `k: null` keeps the key and drops the value. */
  const fromM = (arm: string, k: string) => armCount(arm, k) === 1 && new RegExp(`^\\s*${k}\\s*:\\s*m\\.${k}\\b`, "m").test(arm);
  ok("10.s2.0 · both upsert arms of marketStore.set resolve", s2CreateArm.length > 500 && s2UpdateArm.length > 500,
    `create ${s2CreateArm.length} · update ${s2UpdateArm.length}`);
  for (const k of S2) {
    ok(`10.s2.type · StoredMarket declares "${k}"`, mKeys.includes(k));
    ok(`10.s2.read · toStoredMarket maps "${k}" from the row, on one line`, readsFrom(read, k, "r") && armCount(read, k) === 1,
      `${armCount(read, k)} line(s)`);
    ok(`10.s2.both · marketStore.set writes "${k}" in BOTH upsert arms, once each, from m.${k}`,
      armCount(setBody, k) === 2 && fromM(s2CreateArm, k) && fromM(s2UpdateArm, k), `${armCount(setBody, k)} line(s) in set`);
    ok(`10.s2.notStamp · "${k}" is not in STAMPABLE`, !writesKey(stampable, k));
  }
  /* ⛔ MS-4 (the S2 review) · THE COMPETITION IS READ RAW. A coercing read (`normaliseCompetition(r.competition)`) turned
   * a key a later build dropped into NULL — and the narrow writer, handed that NULL back by the next edit of any other
   * field, stored it. The key is validated where a NEW value is written and coerced only where it is DISPLAYED. */
  const rawRead = /^\s*competition\s*:\s*typeof r\.competition === "string" \? r\.competition : null,\s*$/m;
  ok("10.s2.read.raw · toStoredMarket reads competition RAW — the stored string as it is, never through a coercer (MS-4)",
    rawRead.test(read) && !/normaliseCompetition|isCompetition/.test(read));
  ok("10.s2.c5 · CONTROL · a coercing competition read is caught",
    !rawRead.test("    competition: normaliseCompetition(r.competition),") && /normaliseCompetition|isCompetition/.test("    competition: normaliseCompetition(r.competition),"));
  const s2Mem = objectMethod(region(marketDalSrc, "const memoryMarkets:"), "setShortTitles");
  const s2Pri = objectMethod(region(marketDalSrc, "const prismaMarkets:"), "setShortTitles");
  const keysIn = (body: string) => [...body.matchAll(/^\s*(\w+)\s*:/gm)].map((x) => x[1]);
  const eachFromFields = (body: string) => S2.every((k) => new RegExp(`^\\s*${k}\\s*:\\s*fields\\.${k}\\b`, "m").test(body));
  ok("10.s2.iface · MarketStore declares setShortTitles", interfaceMethods(marketDalSrc, "MarketStore").includes("setShortTitles"));
  ok("10.s2.twins · setShortTitles is implemented in BOTH twins (memory + Prisma)",
    objectMethods(marketDalSrc, "memoryMarkets").includes("setShortTitles") && objectMethods(marketDalSrc, "prismaMarkets").includes("setShortTitles"),
    `memory ${s2Mem.length} chars · prisma ${s2Pri.length} chars`);
  const s2PriData = region(s2Pri, "data: {");
  const s2PriKeys = keysIn(s2PriData).filter((k) => k !== "data");
  ok("10.s2.narrow.prisma · the Prisma setShortTitles is an UPDATE of exactly the four columns (+ updatedAt), each from the caller's fields",
    /\.predictionMarket\.update\(/.test(s2Pri) && !/\.upsert\(|\bstamp\(|\bthis\.set\(/.test(s2Pri)
      && sameSet(s2PriKeys, [...S2, "updatedAt"]) && eachFromFields(s2PriData),
    `data keys: ${s2PriKeys.join(",") || "(none)"}`);
  const s2MemKeys = keysIn(s2Mem);
  ok("10.s2.narrow.memory · the memory setShortTitles keeps the row and writes exactly the four (+ updatedAt), never the caller's whole object",
    /\.\.\.cur\b/.test(s2Mem) && !/\.\.\.fields\b/.test(s2Mem) && sameSet(s2MemKeys, [...S2, "updatedAt"]) && eachFromFields(s2Mem),
    `keys: ${s2MemKeys.join(",") || "(none)"}`);
  ok("10.s2.c1 · CONTROL · a read mapper that names the key and reads nothing is caught", !readsFrom("    competition: null,", "competition", "r"));
  ok("10.s2.c2 · CONTROL · an update arm that lost a key, or writes it as null, is caught",
    !fromM("update: {\n        shortTitleEn: m.shortTitleEn ?? null,\n}", "shortTitleSw")
      && !fromM("update: {\n        shortTitleSw: null,\n}", "shortTitleSw"));
  ok("10.s2.c3 · CONTROL · a narrow writer that spreads the caller's object is caught", /\.\.\.fields\b/.test("markets.set(id, { ...cur, ...fields });"));
  ok("10.s2.c4 · CONTROL · a STAMPABLE carrying a title key is caught",
    writesKey("const STAMPABLE = {\n  status: (v) => v,\n  shortTitleEn: (v) => v,\n};", "shortTitleEn"));

  /* ⭐ THE VODACOM PLAN S6 WP8 (2026-10-01) · THE POSITION-CARD PROJECTION. `positionCardsByIds` names its columns by
   * hand three times: the memory twin copies fields off the stored row, the Prisma twin SELECTS columns and then maps
   * them. Every behavioural suite runs on the memory twin, so a column the Prisma twin maps but never selects reads
   * NULL on Postgres and nowhere else. WP8 added the three S2 short titles for the journey's ticket card (WP9); lost
   * that way, every ticket in production would show the full question while every suite showed the short one.
   * ⛔ AND NULL MEANS "NO SHORT TITLE" (`cardTitle`, `lib/markets/short-title.ts`): a twin that filled one from a full
   * title would have the card call a full question short, so each short title is held to its stored value. `tsc`
   * holds both object literals to the type; these checks also hold the SELECT and the stored-value rule, and they are
   * the ones `red:dal-parity` can drive (a red run goes through tsx, which does not type-check). Extended here in
   * place, as S2 did: §17 onward is the marketing lane's. */
  {
    const LF = String.fromCharCode(10);
    /** Lines with any trailing CR dropped — the tree is a Windows checkout. */
    const linesOf = (s: string) => s.split(LF).map((l) => l.trimEnd());
    const KEY_LINE = new RegExp("^ *([A-Za-z_][A-Za-z0-9_]*) *:");
    const SHORTS = ["shortTitleEn", "shortTitleSw", "shortTitleZh"] as const;
    const typeKeys = storedKeys("PositionCardMarket", marketDalSrc);
    const memBody = objectMethod(region(marketDalSrc, "const memoryMarkets:"), "positionCardsByIds");
    const priBody = objectMethod(region(marketDalSrc, "const prismaMarkets:"), "positionCardsByIds");
    /** The keys of the object a twin hands to `out.set(…, {` — one per line, which is what a card receives. */
    const setKeys = (body: string, opener: string): string[] =>
      linesOf(region(body, opener)).slice(1).map((l) => KEY_LINE.exec(l)?.[1] ?? "").filter(Boolean);
    /** The columns a Prisma `select: { … }` asks for: each `key: true`, comma- or line-separated. */
    const selectKeys = (body: string): string[] => {
      const sel = region(body, "select: {");
      return linesOf(sel.slice(sel.indexOf("{") + 1, sel.lastIndexOf("}"))).flatMap((l) => l.split(","))
        .map((p) => p.trim()).filter((p) => p.endsWith(": true")).map((p) => p.slice(0, p.indexOf(":")).trim());
    };
    /** Passed through as stored: `k: <row>.k ?? null,` and nothing else on the line. */
    const verbatim = (body: string, k: string, row: string) => linesOf(body).some((l) => l.trim() === `${k}: ${row}.${k} ?? null,`);
    const memKeys = setKeys(memBody, "out.set(id, {");
    const priKeys = setKeys(priBody, "out.set(r.id, {");
    const selKeys = selectKeys(priBody);

    // The floor is the PARSER's, not the projection's width: each list starts at `id`, and `10.cards.same` holds the
    // rest, so dropping a field on purpose one day fails nothing here.
    ok("10.cards.0 · the parser finds PositionCardMarket, both twins' out.set objects and the Prisma select, each naming id",
      [typeKeys, memKeys, priKeys, selKeys].every((keys) => keys.includes("id")),
      `type ${typeKeys.length} · memory ${memKeys.length} · prisma ${priKeys.length} · select ${selKeys.length}`);
    ok("10.cards.twins · MarketStore declares positionCardsByIds and BOTH twins implement it",
      interfaceMethods(marketDalSrc, "MarketStore").includes("positionCardsByIds")
        && objectMethods(marketDalSrc, "memoryMarkets").includes("positionCardsByIds")
        && objectMethods(marketDalSrc, "prismaMarkets").includes("positionCardsByIds"));
    for (const k of SHORTS) ok(`10.cards.type · PositionCardMarket declares "${k}"`, typeKeys.includes(k));
    for (const k of typeKeys) {
      ok(`10.cards.memory · the memory positionCardsByIds maps "${k}" from the row`, readsFrom(memBody, k, "m"));
      ok(`10.cards.prisma · the Prisma positionCardsByIds maps "${k}" from the row`, readsFrom(priBody, k, "r"));
      ok(`10.cards.select · the Prisma positionCardsByIds SELECTS "${k}"`, selKeys.includes(k));
    }
    ok("10.cards.same · the type, the memory object, the Prisma object and the Prisma select name exactly the same fields",
      sameSet(typeKeys, memKeys) && sameSet(typeKeys, priKeys) && sameSet(typeKeys, selKeys),
      `memory ${setDiff(typeKeys, memKeys) || "same"} · prisma ${setDiff(typeKeys, priKeys) || "same"} · select ${setDiff(typeKeys, selKeys) || "same"}`);
    for (const k of SHORTS) {
      ok(`10.cards.verbatim · "${k}" is the stored value in BOTH twins, NULL kept as NULL — never filled from another title`,
        verbatim(memBody, k, "m") && verbatim(priBody, k, "r"));
    }

    // ⛔ CONTROLS — each check above can fail.
    const dropKey = (body: string, k: string) => linesOf(body).filter((l) => !l.trim().startsWith(`${k}:`)).join(LF);
    ok("10.cards.c1 · CONTROL · the REAL memory object minus its shortTitleZh line is reported as not the type's list",
      memKeys.includes("shortTitleZh") && !sameSet(typeKeys, setKeys(dropKey(memBody, "shortTitleZh"), "out.set(id, {")));
    const plantedSelect = ["select: {", "  id: true, shortTitleEn: true,", "  shortTitleZh: true,", "},"].join(LF);
    ok("10.cards.c2 · CONTROL · a select without shortTitleSw is caught, and the parser reads both separators",
      !selectKeys(plantedSelect).includes("shortTitleSw") && sameSet(selectKeys(plantedSelect), ["id", "shortTitleEn", "shortTitleZh"]));
    ok("10.cards.c3 · CONTROL · `shortTitleSw: null,` does NOT count as reading it from the row",
      !readsFrom(["        noPool: Number(r.noPool),", "        shortTitleSw: null,"].join(LF), "shortTitleSw", "r"));
    ok("10.cards.c4 · CONTROL · a short title filled from the full title is caught in either twin, and the honest line is not",
      !verbatim("        shortTitleSw: m.shortTitleSw ?? m.titleSw ?? null,", "shortTitleSw", "m")
        && !verbatim("        shortTitleZh: r.shortTitleZh ?? r.titleZh ?? null,", "shortTitleZh", "r")
        && verbatim("        shortTitleSw: m.shortTitleSw ?? null,", "shortTitleSw", "m"));
  }
}

/* ═══ §11 · schema.prisma (house bots; + the S2 short-title columns) ══════════════════════ */
{
  const models = HOUSE_PAIRS.map((p) => [p.model, schemaModel(prismaSchemaSrc, p.model)] as const);
  ok("11.models · all 8 house models exist", models.every(([, body]) => body.length > 0), models.filter(([, b]) => !b).map(([m]) => m).join(", "));
  const has = (model: string, re: RegExp) => re.test(schemaModel(prismaSchemaSrc, model));
  ok("11.user · User declares passwordSetAt DateTime? @db.Timestamptz(3)", has("User", /^\s*passwordSetAt\s+DateTime\?\s+@db\.Timestamptz\(3\)/m));
  ok("11.user · User declares passwordSetVia String?", has("User", /^\s*passwordSetVia\s+String\?\s*$/m));
  ok("11.user · User declares emailSetByOfficerAt DateTime? @db.Timestamptz(3)", has("User", /^\s*emailSetByOfficerAt\s+DateTime\?\s+@db\.Timestamptz\(3\)/m));
  for (const m of ["Position", "Transaction"]) {
    ok(`11.marker · ${m} declares houseBotId String? with no @default`, has(m, /^\s*houseBotId\s+String\?\s*$/m));
  }
  ok("11.market · PredictionMarket declares reopenedAt DateTime? @db.Timestamptz(3) and reopenCount Int?",
    has("PredictionMarket", /^\s*reopenedAt\s+DateTime\?\s+@db\.Timestamptz\(3\)/m) && has("PredictionMarket", /^\s*reopenCount\s+Int\?\s*$/m));
  // The Vodacom plan S2: four nullable strings on the market AND on the AI poll (`publishApprovedPoll` carries them
  // across). ⛔ No @default — a default would be a short title nobody approved (F8). Read from ROOT, so `red:dal-parity`
  // cannot mutate it; `test:short-title-fit` (d) holds the two migrations that create the columns.
  const nullableString = (k: string) => new RegExp(`^\\s*${k}\\s+String\\?\\s*$`, "m");
  for (const k of ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"]) {
    ok(`11.s2 · PredictionMarket declares ${k} String? with no @default`, has("PredictionMarket", nullableString(k)));
    ok(`11.s2.ai · AIPoll declares ${k} String? with no @default`, has("AIPoll", nullableString(k)));
  }
  ok("11.s2.c1 · CONTROL · a short-title column with a @default is caught",
    !nullableString("shortTitleEn").test("model X {\n  shortTitleEn String? @default(\"\")\n}"));
  const nakedTime = (body: string) => body.split("\n").filter((l) => /^\s*\w+\s+DateTime\??(\s|$)/.test(l) && !/@db\.Timestamptz\(3\)/.test(l));
  const naked = models.flatMap(([m, body]) => nakedTime(body).map((l) => `${m}.${l.trim().split(/\s+/)[0]}`));
  ok("11.ts · every DateTime in the 8 house models carries @db.Timestamptz(3) (04 A4)", naked.length === 0, naked.join(", "));
  ok("11.c1 · CONTROL · a DateTime without the attribute is caught", nakedTime("model X {\n  at DateTime @default(now())\n}").length === 1);
}

/* ═══ §12 · the house DAL never touches a wallet (P1 compatibility) ══════════════════════ */
{
  const WALLET = /\bdb\.wallet\b|"Wallet"/;
  ok("12.0 · the house DAL and the book resolve", houseDalSrc.length > 1000 && bookSrc.length > 500);
  ok("12.wallet · house-bot-dal.ts and house-bot/book.ts never reference db.wallet or the Wallet table",
    !WALLET.test(houseDalSrc) && !WALLET.test(bookSrc), (houseDalSrc.match(WALLET) ?? bookSrc.match(WALLET) ?? [""])[0]);
  ok("12.c1 · CONTROL · a planted wallet write is caught",
    WALLET.test(`await db.wallet.update(id, { status: "FROZEN" });`) && WALLET.test(`UPDATE "Wallet" SET "status" = 'FROZEN'`));
}

/*
 * ⚠️ §13 IS main's SECTION, RENUMBERED. It arrived as "§6" in the SMS release (2026-09-16) while this branch already
 * had §6–§12 for the house tables, whose labels `scripts/anchors/dal-parity.anchors.mjs` names in its mutations. The
 * numbers are labels, so main's section keeps its content and takes the next free number here; `docs/BLACKBALL-SMS.md`
 * points at §13 on this branch. The next merge of main must not "restore" it to §6.
 */
/* ═══ §13 · SmsMessage — the delivery-receipt row (2026-09-16) ═════════════════════════ */
{
  // ⭐ WHY THIS TABLE NEEDS THE SAME GUARD AS THE MONEY ROWS. A delivery receipt is the ONLY
  // writer of `status` after the send, it arrives on a different request, and every
  // behavioural suite for it runs on the MEMORY backend. So a field dropped from the Prisma
  // read mapper — or a DateTime written as a plain string — is invisible to every test that
  // exists and shows up first as a receipt that silently records nothing on production.
  const keys = storedKeys("StoredSmsMessage");
  const read = region(dalSrc, "function toStoredSmsMessage(");
  const map = region(dalSrc, "const SMS_MESSAGE_COLUMN");
  const create = delegateMethod("smsMessage", "create");
  const createMany = delegateMethod("smsMessage", "createMany");

  ok("13.0 · the parser sees StoredSmsMessage's fields", keys.length >= 18, `saw ${keys.length}`);
  for (const k of keys) {
    ok(`13.read · toStoredSmsMessage maps "${k}" from the row`, readsFrom(read, k, "s"));
    ok(`13.map · SMS_MESSAGE_COLUMN names "${k}"`, writesKey(map, k));
    ok(`13.create · smsMessage.create writes "${k}"`, writesKey(create, k) || mentions(create, k));
  }
  // ⛔ EVERY TIMESTAMP MUST BE "date". An ISO string reaching a Prisma DateTime throws on
  // Postgres and nowhere else, so the memory DAL would stay green straight through it.
  for (const k of keys.filter((x) => /At$/.test(x) && x !== "createdAt")) {
    ok(`13.date · "${k}" is typed "date" in the map`, new RegExp(`${k}: "date"`).test(map));
  }
  // The batch writer is what an invite campaign actually goes through; a field it forgets is
  // a field that is null for every campaign message and correct for every OTP.
  for (const k of keys) {
    ok(`13.createMany · smsMessage.createMany writes "${k}"`, mentions(createMany, k));
  }
  // The map-driven update, not a hand-written allow-list — the 2026-09-07 affiliate no-op (§1).
  const upd = delegateMethod("smsMessage", "update");
  ok("13.update · smsMessage.update drives off SMS_MESSAGE_COLUMN", mentions(upd, "SMS_MESSAGE_COLUMN"));
  ok("13.update · …and THROWS on an unmapped field rather than dropping it",
    /unmapped field/.test(upd) && /throw new Error/.test(upd));
  ok("13.update · …and carries no hand-written `if (patch.x !== undefined)` allow-list",
    !/if \(patch\.\w+ !== undefined\)/.test(upd));

  // ⭐ THE MONOTONIC RULE MUST HOLD IN BOTH BACKENDS, NOT ONLY THE ONE THE SUITES RUN ON.
  // A receipt guard implemented in memory alone is a guard that passes every test and lets
  // production overwrite a settled DELIVERED with a late FAILED.
  const pDlr = delegateMethod("smsMessage", "recordDlr");
  const mDlr = region(storeSrc, "recordDlr: (");
  ok("13.dlr · the Prisma recordDlr resolves", pDlr.length > 200, `${pDlr.length} chars`);
  ok("13.dlr · the memory recordDlr resolves", mDlr.length > 200, `${mDlr.length} chars`);
  ok("13.dlr.prisma · the terminal guard is in the WHERE, so two containers cannot both apply it",
    /notIn:\s*\["DELIVERED",\s*"FAILED"\]/.test(pDlr));
  ok("13.dlr.memory · the memory side refuses to move a settled row too",
    mentions(mDlr, "SMS_TERMINAL") && /includes\(m\.status\)/.test(mDlr));
  ok("13.dlr · both sides record the RAW token even when it moves nothing",
    mentions(pDlr, "dlrStatus") && mentions(mDlr, "dlrStatus"));
  // ⛔ THE ONE DEFAULT THAT MUST NOT EXIST. An unrecognised token becoming DELIVERED is
  // reporting delivery we have no evidence for, on the rail that carries login codes.
  ok("13.dlr · neither side defaults an unknown token to DELIVERED",
    !/\?\?\s*"DELIVERED"/.test(pDlr) && !/\?\?\s*"DELIVERED"/.test(mDlr));

  // Controls — a parser that found nothing must go red, not quiet.
  ok("13.c1 · CONTROL · `balanceTzs: null,` in a read mapper does NOT count as carrying it",
    !readsFrom("    attempts: s.attempts,\n    balanceTzs: null,", "balanceTzs", "s"));
  ok("13.c2 · CONTROL · a create body missing dlrStatus is reported missing",
    !writesKey("          reference: m.reference, msisdn: m.msisdn,", "dlrStatus"));
  ok("13.c3 · CONTROL · a column map that types a timestamp plain is caught",
    !/deliveredAt: "date"/.test(`  deliveredAt: "plain",`));
}

/* ═══ §14 · the actor-side audit read excludes in BOTH branches, before the limit (C5-SPEC ruling 170) ═══ */
{
  // ⛔ WHY SOURCE-LEVEL HERE TOO. The behaviour is proven on both stores by test:house-bot-money 1.14d–1.14f; what this
  // holds is the shape a later edit could quietly break on ONE branch: the ring filters before its slice, Prisma's count
  // and read share one where, and the exclusion is an exact list (no prefix match: "_" is a LIKE wildcard).
  const auditSrc = decomment(readFileSync(join(SRC, "lib/server/audit.ts"), "utf8"));
  /** A top-level function's text: from its declaration to the next top-level export. */
  const fnText = (src: string, decl: string) => { const a = src.indexOf(decl); if (a < 0) return ""; const b = src.indexOf("\nexport ", a + decl.length); return src.slice(a, b < 0 ? undefined : b); };
  const ringFiltersBeforeLimit = (body: string) => {
    const ringAt = body.search(/\[\.\.\.ring\]\s*\.filter\(/);
    const hasAt = body.indexOf("excluded.has(e.action)", ringAt);
    const sliceAt = body.indexOf(".slice(0, limit)", ringAt);
    return ringAt >= 0 && hasAt > ringAt && sliceAt > hasAt;
  };
  const prismaSharesWhere = (body: string) =>
    /const where = [^\n]*\bNOT:\s*\{\s*action:\s*\{\s*in:\s*\[\.\.\.excluded\]/.test(body)
    && /\.count\(\{\s*where\s*\}\)/.test(body) && /\.findMany\(\{\s*where,/.test(body);
  const noPrefixMatch = (body: string) => !/\baction\b[^\n]*\b(?:startsWith|endsWith|contains)\b|\bLIKE\b/.test(body);
  const body = fnText(auditSrc, "export async function getAuditForActorDurable(");
  ok("14.0 · getAuditForActorDurable resolves and takes excludeActions", body.length > 500 && /excludeActions\?:\s*readonly string\[\]/.test(body), `${body.length} chars`);
  ok("14.ring · the ring branch filters the excluded actions BEFORE .slice(0, limit), so total counts over the filter", ringFiltersBeforeLimit(body));
  ok("14.prisma · the Prisma branch puts NOT action in excluded into the one where that both count and findMany read", prismaSharesWhere(body));
  ok("14.exact · the exclusion is an exact list, never a prefix or LIKE match", noPrefixMatch(body));
  ok("14.c1 · CONTROL · a ring branch that slices before it filters is caught",
    !ringFiltersBeforeLimit("const all = [...ring].filter((e) => e.actorId === actorId).reverse().slice(0, limit).filter((e) => !excluded.has(e.action));"));
  ok("14.c2 · CONTROL · a Prisma count over the bare actor is caught",
    !prismaSharesWhere("const where = { actorId, NOT: { action: { in: [...excluded] } } };\nconst total = await db.auditLog.count({ where: { actorId } });\nconst rows = await db.auditLog.findMany({ where, take: limit });"));
  ok("14.c3 · CONTROL · a startsWith exclusion is caught", !noPrefixMatch("where: { actorId, NOT: { action: { startsWith: \"house_bot.\" } } }"));
}

/* ═══ §15 · txn.findByUser({excludeHouseBets}) in BOTH twins, before the limit (C5-SPEC ruling 173) ═══ */
{
  // ⛔ A MONEY FIX, SO BOTH HALVES OR NEITHER. The behaviour is test:house-bot-money §11 on both stores; this holds the shape:
  // the memory twin drops marked rows inside .filter(), BEFORE .slice(-limit) (after it, the window stays flooded on memory
  // only), and the Prisma twin puts houseBotId: null into the where that take limits.
  const memLine = (() => { const a = storeSrc.indexOf("findByUser: (userId: string, limit = 50, opts?:"); if (a < 0) return ""; const b = storeSrc.indexOf(".reverse(),", a); return b < 0 ? "" : storeSrc.slice(a, b + 11); })();
  const memFiltersBeforeSlice = (body: string) => {
    const filterAt = body.indexOf(".filter(");
    const optAt = body.indexOf("excludeHouseBets", filterAt);
    const markerAt = body.indexOf("houseBotId == null", filterAt);
    const sliceAt = body.indexOf(".slice(-limit)");
    return filterAt >= 0 && optAt > filterAt && markerAt > filterAt && sliceAt > Math.max(optAt, markerAt);
  };
  // The method text up to its close: region() would stop at the brace of the options TYPE in its signature.
  const pgBody = (() => { const block = region(dalSrc, "\n  txn: {"); const a = block.indexOf("findByUser: async ("); if (a < 0) return ""; const b = block.indexOf("\n    },", a); return b < 0 ? "" : block.slice(a, b); })();
  const pgWhereBeforeTake = (body: string) => /where:\s*opts\?\.excludeHouseBets\s*\?\s*\{\s*userId,\s*houseBotId:\s*null\s*\}\s*:\s*\{\s*userId\s*\}/.test(body) && /take:\s*limit/.test(body);
  ok("15.0 · both findByUser twins resolve and take { excludeHouseBets }", memLine.length > 80 && pgBody.length > 80 && /excludeHouseBets\?:\s*boolean/.test(pgBody), `memory ${memLine.length} · prisma ${pgBody.length}`);
  ok("15.memory · the memory twin drops house-marked rows inside .filter(), before .slice(-limit)", memFiltersBeforeSlice(memLine), memLine.slice(0, 220));
  ok("15.prisma · the Prisma twin puts houseBotId: null in the where (default: the bare userId where), which take then limits", pgWhereBeforeTake(pgBody), pgBody.slice(0, 260));
  ok("15.c1 · CONTROL · a memory twin that filters AFTER the slice is caught",
    !memFiltersBeforeSlice("findByUser: (userId: string, limit = 50, opts?: { excludeHouseBets?: boolean }) => Array.from(store.txns.values()).filter((t) => t.userId === userId).slice(-limit).filter((t) => !opts?.excludeHouseBets || t.houseBotId == null).reverse(),"));
  ok("15.c2 · CONTROL · a Prisma twin that ignores the option is caught",
    !pgWhereBeforeTake("findByUser: async (userId: string, limit = 50, opts?: { excludeHouseBets?: boolean }) => { const rows = await pc().transaction.findMany({ where: { userId }, orderBy: { createdAt: \"desc\" }, take: limit }); }"));
}

/* ═══ §16 · the platform members house bots still use, in BOTH twins (C5-SPEC ruling 235; owner ruling D20) ═══ */
{
  // ⛔ OWNER RULING D20 (2026-09-17) · C5 step 3's readers were un-built in C5-5b: `entryRows`, `stakeRows`, `feeInputs`,
  // `ledgerRows`, `positionsForUser`, `txnPageForUser`, `listOverlapping`, `listByKindsInWindow`, `listByUserKinds`,
  // `countByBot`, `countFeed`, `counteredPositionsCount`, `listInWindow`, `countRegister`, `PressRegisterFilter.purposes`,
  // and the platform members of rulings 210 (the transactions `house` filter), 224 (top contributors) and 233
  // (`leaderboard({excludeHouse})`) — every one of them a reader whose only consumers D20 struck. Their parity cases went
  // with them; what stays is the member a kept ruling still uses, plus the pin that the struck ones are gone from BOTH twins.
  /* ⭐ `lastStoppedAt` JOINED THIS LIST AT C7 STEP 4 (replan ruling 504). It had ZERO occurrences anywhere outside
   * the house DAL — no `src/` caller, no behavioural case, and no entry in `SEALED`'s own `HouseBotTargetStore` list
   * — so 504's choice was "call it by name with a behavioural case, or delete it from the interface and both twins
   * with its name added here". Step 4 deleted it: the figure is PER MARKET, so the only console surface that could
   * have consumed it (the targets panel) would have issued one read per rendered row, which is the per-bot loop
   * ruling 351 refuses; and ruling 350 had already put the member in its NOT-NEEDED half. `everStopped`, the
   * predicate the never-retarget rule really decides on, stays with both twins and its two cases. */
  /* ⭐ `countFeed` LEFT THIS LIST AT C7 STEP 5 (C7-SPEC ruling 345), and it is the ONE name that left.
   * C5-5b struck it with R1's presses register, which was then its only consumer. Commit 7's activity tab gives it a
   * different one: `AdminPagination` requires a `total` that ruling 344 forbids taking from the rows, so the feed's
   * badge and pager need a reader whose job is to count. It returns with `offset` on `listFeed` and with BOTH members
   * deriving their population from ONE named predicate per twin — which is what `16.feedShared` below now covers, and
   * why the absence pin could be relaxed for this name without losing anything it was protecting.
   * ⛔ EVERY OTHER MEMBER STAYS, and the pin is not relaxed to a prefix or a regex: one name, named. `countRegister`
   * in particular did NOT come back — the presses register is still struck, and 345 says so in the same breath. */
  const NEVER = ["entryRows", "stakeRows", "feeInputs", "ledgerRows", "positionsForUser", "txnPageForUser", "listOverlapping",
    "listByKindsInWindow", "listByUserKinds", "countByBot", "counteredPositionsCount", "listInWindow", "countRegister",
    "recordDisclosure", "lastStoppedAt"];
  const declared = NEVER.filter((n) => new RegExp(`(^|[^A-Za-z])(async )?${n}\\(`, "m").test(houseDalSrc));
  ok("16.d20 · ⛔ D20 · not one struck step-3 member is declared or implemented in the house DAL (either twin)",
    declared.length === 0, declared.join(", "));
  ok("16.d20.c1 · CONTROL · the detector finds a member that IS there (dayRows) and not one that never was",
    new RegExp("(^|[^A-Za-z])(async )?dayRows\\(", "m").test(houseDalSrc) && !new RegExp("(^|[^A-Za-z])(async )?entryRowsXyz\\(", "m").test(houseDalSrc));

  /**
   * ⛔ RULING 504, AND THE MEASUREMENT THAT REVERSED HALF OF IT (replan ruling 517, 2026-09-18). 504 ordered
   * `listRegister` and `PressRegisterFilter` DELETED from the interface and both twins and their names added to `NEVER`
   * above, on the stated ground that "its only consumer was R1's presses register, struck by D20". That was TRUE at the
   * audit's pin `5005c811` and is FALSE at this head: C5-6's R6 erasure sweep (`8b64e5a4`) gave the member a named
   * caller. `scripts/erasure.test.mts` reads the presses table through it, `houseBotPresses` is one of that suite's §8
   * `MUST_HAVE_CONTENT` buckets, and its `8.0e` requires the bucket to hold at least one row — so deleting the member
   * would have deleted a live proof that an erased holder leaves no trace in the presses table. Ruling 500(c) refuses
   * exactly that. C5-5b's own exit rule — KEPT with a named remaining caller — is what keeps it.
   *
   * ⛔ SO THE GUARD CHANGES SHAPE INSTEAD OF DISAPPEARING, and it points the other way from `NEVER`. `NEVER` catches a
   * struck member coming BACK; this catches the defect 504 was actually aiming at — a member whose LAST caller quietly
   * goes away, leaving a paged house READ wired into both twins with no consumer, which is ruling 259's shape. Both
   * halves are read from disk: the member must still be the interface plus BOTH twins, and the named caller must still
   * call it exactly once. ⛔ A row leaves this table only when the MEMBER is deleted — never by deleting the row.
   */
  const KEPT_BY_A_NAMED_CALLER: ReadonlyArray<{ member: string; type?: string; caller: string; call: string; times?: number; why: string }> = [
    {
      member: "listRegister", type: "PressRegisterFilter", caller: "scripts/erasure.test.mts",
      call: "pressStore.listRegister({",
      why: "R6's erasure sweep reads the presses table for the erased holder's bot; that suite's houseBotPresses bucket and its 8.0e row count both die with the member",
    },
    /* ⭐ `veto` — THE OTHER HALF OF RULING 504, DECIDED AT C7 STEP 4 AND KEPT. Unlike `lastStoppedAt` it already
     * meets C5-5b's exit rule: two named behavioural callers, on both stores, asserting the two states the member
     * exists for (an ENDED-DONE target becomes ENDED:VETOED; a second veto is a no-op). It is also the store member
     * behind C7-SPEC §3 step 5's cancel action — a cited Commit 7 scope line — so it has a product caller scheduled
     * as well as proven behaviour. What 504 was aiming at is the day those callers go away, which is what these two
     * rows now catch by NAME and by COUNT. */
    {
      member: "veto", caller: "scripts/lib/house-bot-dal-cases.mts",
      call: "targets.veto(", times: 2,
      why: "c08.h and c08.i are the only assertions that a veto moves an ENDED DONE target to ENDED:VETOED and that a second veto is a no-op",
    },
    {
      member: "veto", caller: "scripts/lib/house-bot-engine-cases.mts",
      call: "targetStore.veto(",
      why: "the engine suite's only drive of a staff veto through the real target store; C7 step 5's cancel action is its product caller",
    },
  ];
  /** One row's problems, read from the two files it names. Both sources are DECOMMENTED, so a member or a call that survives only inside a comment counts as gone. */
  const keptProblems = (row: { member: string; type?: string; caller: string; call: string; times?: number }, dal: string, callerSrc: string | null): string[] => {
    const out: string[] = [];
    const inDal = dal.split(`${row.member}(`).length - 1;
    if (inDal < 3) out.push(`${row.member}: named ${inDal} times in the house DAL, not the interface plus BOTH twins`);
    if (row.type && !dal.includes(row.type)) out.push(`${row.member}: its filter type ${row.type} is gone from the house DAL`);
    if (callerSrc === null) { out.push(`${row.member}: its named caller ${row.caller} could not be read`); return out; }
    /* ⛔ THE EXPECTED COUNT IS THE ROW'S OWN, AND IT DEFAULTS TO ONE. A row that names a caller holding TWO calls
     * would otherwise be permanently red, which is a guard that teaches a reader to ignore it; and an exact count is
     * no weaker than a fixed 1 — a call added or removed is still reported. */
    const want = row.times ?? 1;
    const calls = callerSrc.split(row.call).length - 1;
    if (calls !== want) out.push(`${row.member}: ${row.caller} calls it ${calls} times, not exactly ${want} — this member is kept ONLY by its named callers`);
    return out;
  };
  const keptSrc = new Map([...new Set(KEPT_BY_A_NAMED_CALLER.map((r) => r.caller))]
    .map((rel) => [rel, decomment(readFileSync(join(ROOT, rel), "utf8"))] as const));
  const keptRows = KEPT_BY_A_NAMED_CALLER.flatMap((r) => keptProblems(r, houseDalSrc, keptSrc.get(r.caller) ?? null));
  ok("16.504 · ⛔ 504/517 · every house DAL member kept ONLY by a named caller is still the interface plus BOTH twins, and that caller still calls it exactly as often as the row says",
    KEPT_BY_A_NAMED_CALLER.length >= 3 && keptRows.length === 0, keptRows.join(" · "));
  /* ⛔ AND THE MEMBER 504 DELETED IS GONE FROM BOTH TWINS, not merely absent from this table (replan ruling 504,
   * C7 step 4). `NEVER` above carries the name; this states the decision's other half in its own words so the two
   * halves of 504 — one member kept with its callers named, one member deleted — read together. */
  ok("16.504.del · ⛔ 504 · `lastStoppedAt` is gone from the interface and BOTH twins, and `everStopped` — the predicate the rule really decides on — is not",
    !new RegExp("(^|[^A-Za-z])(async )?lastStoppedAt\\(", "m").test(houseDalSrc)
      && (houseDalSrc.split("everStopped(").length - 1) >= 3,
    `everStopped named ${houseDalSrc.split("everStopped(").length - 1} times`);
  {
    const R0 = KEPT_BY_A_NAMED_CALLER[0];
    const erasureSrc = keptSrc.get(R0.caller) ?? "";
    const fired = {
      memberGone: keptProblems(R0, houseDalSrc.split(`${R0.member}(`).join("xxRegister("), erasureSrc),
      typeGone: keptProblems(R0, houseDalSrc.split("PressRegisterFilter").join("PressXFilter"), erasureSrc),
      callerGone: keptProblems(R0, houseDalSrc, erasureSrc.split(R0.call).join("pressStore.listAuditRepair(")),
      callerUnreadable: keptProblems(R0, houseDalSrc, null),
      untouched: keptProblems(R0, houseDalSrc, erasureSrc),
    };
    ok("16.504.c1 · CONTROL · the member gone from the DAL, its filter type gone, the named caller's call gone and an unreadable caller are each reported; the unmodified pair is not",
      fired.memberGone.some((p) => p.includes("not the interface plus BOTH twins"))
        && fired.typeGone.some((p) => p.includes("filter type PressRegisterFilter is gone"))
        && fired.callerGone.some((p) => p.includes("calls it 0 times"))
        && fired.callerUnreadable.some((p) => p.includes("could not be read"))
        && fired.untouched.length === 0,
      JSON.stringify(fired));
  }
  /**
   * ⭐ `16.botRateUsage` — C7 STEP 4's ONE NEW SEAM MEMBER (C7-SPEC ruling 351).
   *
   * The console's per-account count rows and its "Last bet" column need one bot's market-free rate usage, and the
   * roster needs every bot's. Ruling 351 fixes HOW: ONE statement per call, in `globalUsage`'s own `count(*) FILTER`
   * shape on the DATABASE clock with a `GROUP BY`, never a row projection; and the memory twin accumulates into a
   * map rather than materialising the matching positions. ⛔ Both are the difference between this member and
   * `placedTimes`, whose two twins are unbounded and whose `.length` as a count is an unbounded row read on a page
   * render. ⛔ `botUsage`'s `marketId` stays REQUIRED, which is why this is a new member and not an optional
   * parameter: a caller with no market would read the PER_MARKET gate figures as zero.
   */
  {
    const priSeamSrc = region(houseDalSrc, "const prismaHouseSeam:");
    const memSeamSrc = region(houseDalSrc, "const memoryHouseSeam:");
    const priRate = objectMethod(priSeamSrc, "botRateUsage");
    const memRate = objectMethod(memSeamSrc, "botRateUsage");
    const statements = (s: string) => s.split("await sql(").length - 1;
    ok("16.botRateUsage · the Prisma twin is ONE statement of COUNTS on the database clock, grouped by bot, with no row projection",
      statements(priRate) === 1
        && /count\(\*\) FILTER \(WHERE "placedAt" > \$\{DB_CLOCK_UTC_SQL\}/.test(priRate)
        && /GROUP BY "houseBotId" ORDER BY "houseBotId"/.test(priRate)
        && !/SELECT "placedAt"/.test(priRate) && !/\bnow\(\)/.test(priRate),
      `${statements(priRate)} statements · ${priRate.length} chars`);
    ok("16.botRateUsage · the memory twin accumulates into a MAP and materialises no per-row array — the difference between it and `placedTimes`",
      /const acc = new Map<string, HouseBotRateUsage>\(\)/.test(memRate) && /acc\.set\(/.test(memRate)
        && !/out\.push\(/.test(memRate) && !/\.sort\(\(a, b\) => b - a\)/.test(memRate),
      `${memRate.length} chars`);
    /* ⛔ THE CONTROLS RULING 351 NAMES, each applied to the REAL body so a detector that cannot see the defect is
     * reported here rather than on a page render: a Prisma twin that projects rows, and a Prisma twin that reads the
     * REPLICA clock instead of the database's. */
    const rowProjecting = priRate.replace("count(*) FILTER", `SELECT "placedAt" FROM "Position"; count(*) FILTER`);
    const replicaClock = priRate.split("${DB_CLOCK_UTC_SQL}").join("now()");
    ok("16.botRateUsage.c1 · CONTROL · a twin that projects rows and a twin that reads the replica clock are each caught, and the shipped body is not",
      /SELECT "placedAt"/.test(rowProjecting) && /\bnow\(\)/.test(replicaClock)
        && !/SELECT "placedAt"/.test(priRate) && !/\bnow\(\)/.test(priRate), "");
    /* ⛔ AND `botUsage` STILL REQUIRES ITS MARKET (ruling 351's own prohibition): an optional market would turn a
     * gate reader into one that reads `countOnMarket: 0` and waves a stake through. */
    ok("16.botRateUsage · `botUsage`'s `marketId` is still REQUIRED and undefaulted",
      /botUsage\(input: \{ houseBotId: string; marketId: string \}, tx\?: HouseTx\)/.test(houseDalSrc), "");
  }

  /**
   * ⭐ C7 STEP 5 · ONE PREDICATE BEHIND EACH PAGER'S ROWS AND ITS TOTAL (C7-SPEC rulings 345 and 317, ruling 177's
   * shape). `AdminPagination` takes a `total` that ruling 344 forbids taking from the rows, so each of the console's
   * two paged panels reads its population through a SECOND member — and the moment the page's condition and the
   * count's condition are written in two places they can drift apart. The failure is quiet by construction: the two
   * numbers agree on page 1 and disagree only at the end of the list, where nobody is looking.
   * ⛔ So both members of each pair must NAME the twin's one predicate function rather than restate its condition.
   */
  {
    const memIntents = region(houseDalSrc, "const memoryHouseBotIntents:");
    const priIntents = region(houseDalSrc, "const prismaHouseBotIntents:");
    const memEvents = region(houseDalSrc, "const memoryHouseBotEvents:");
    const priEvents = region(houseDalSrc, "const prismaHouseBotEvents:");
    const pair = (obj: string, a: string, b: string, needle: RegExp) =>
      needle.test(objectMethod(obj, a)) && needle.test(objectMethod(obj, b));

    ok("16.feedShared · ⭐ 345 · listFeed and countFeed derive one population from ONE named predicate per twin (memFeedMatches / feedWhere)",
      pair(memIntents, "listFeed", "countFeed", /memFeedMatches\(filter\)/)
        && pair(priIntents, "listFeed", "countFeed", /feedWhere\(filter, p\)/)
        && /^function memFeedMatches\(/m.test(houseDalSrc) && /^function feedWhere\(/m.test(houseDalSrc),
      `mem ${objectMethod(memIntents, "countFeed").length} chars · pri ${objectMethod(priIntents, "countFeed").length} chars`);

    ok("16.eventsShared · ⭐ 317 · listAll and countAll derive one population from ONE named predicate per twin (memEventMatches / eventWhere)",
      pair(memEvents, "listAll", "countAll", /memEventMatches\(opts\)/)
        && pair(priEvents, "listAll", "countAll", /eventWhere\(opts, p\)/)
        && /^function memEventMatches\(/m.test(houseDalSrc) && /^function eventWhere\(/m.test(houseDalSrc),
      `mem ${objectMethod(memEvents, "countAll").length} chars · pri ${objectMethod(priEvents, "countAll").length} chars`);

    /* ⭐ C7 STEP 5 (the account half) · THE `houseBotId` FACET LIVES IN THE SHARED PREDICATE, IN BOTH TWINS.
     * The account page's history is the desk history narrowed to ONE record, and it draws the SAME numbered pager,
     * so it needs the same `total` — which is why the facet is a word of `memEventMatches`/`eventWhere` rather than
     * a second reader. ⛔ A facet added to the LIST predicate alone is the quiet half of 317's own defect: the rows
     * narrow, the total does not, and the pager links at pages that render nothing. Both twins are read from disk
     * here so neither can carry the word without the other.
     * ⚠️ The predicates are shared, so `pair()` above already proves the COUNT uses them; this proves the WORD is
     * in the predicate rather than bolted onto the list member. */
    const memPred = (/function memEventMatches\([\s\S]*?\n\}/.exec(houseDalSrc) ?? [""])[0];
    const priPred = (/function eventWhere\([\s\S]*?\n\}/.exec(houseDalSrc) ?? [""])[0];
    ok("16.eventsBot · ⭐ 317 · the account page's `houseBotId` facet is a word of the SHARED event predicate in BOTH twins — never a narrowing bolted onto the list member alone",
      memPred.length > 80 && priPred.length > 80
        && /opts\.houseBotId === undefined \|\| e\.houseBotId === opts\.houseBotId/.test(memPred)
        && /opts\.houseBotId !== undefined/.test(priPred) && /"houseBotId" = /.test(priPred)
        && !/houseBotId/.test(objectMethod(memEvents, "listAll")) && !/houseBotId/.test(objectMethod(priEvents, "listAll")),
      `memPred ${memPred.length} chars · priPred ${priPred.length} chars`);
    /* ⭐ AND THE ANCHOR'S FACET, BY THE SAME RULE AND FOR A HARDER REASON. A delivered bell links to
     * `?tab=history&event=<id>`, and under a NUMBERED pager that link is only honourable by COUNTING the rows at or
     * newer than the anchor and turning the rank into a page. A rank measured over a different condition from the
     * rows it is a rank IN is 317's own defect wearing a different hat — so `fromIso` is a word of the shared
     * predicate too, `>=` on both sides, matching `feedWhere`'s so the two panels resolve an anchor by ONE rule. */
    const feedPred = (/function memFeedMatches\([\s\S]*?\n\}/.exec(houseDalSrc) ?? [""])[0];
    ok("16.eventsAnchor · ⭐ 317 · the anchor facet `fromIso` is a word of the SHARED event predicate in both twins, inclusive (`>=`) and spelled the same way the feed's already is",
      /opts\.fromIso === undefined \|\| ms\(e\.createdAt\) >= ms\(opts\.fromIso\)/.test(memPred)
        && /opts\.fromIso !== undefined/.test(priPred) && /"createdAt" >= /.test(priPred)
        && /filter\.fromIso === undefined \|\| ms\(i\.createdAt\) >= ms\(filter\.fromIso\)/.test(feedPred),
      `feedPred ${feedPred.length} chars`);
    ok("16.eventsAnchor.c1 · CONTROL · the same scan reports an EXCLUSIVE anchor bound — the off-by-one that puts a bell's own row on the previous page — and the shipped predicate is not reported",
      (() => {
        const exclusive = memPred.split("ms(e.createdAt) >= ms(opts.fromIso)").join("ms(e.createdAt) > ms(opts.fromIso)");
        return !/ms\(e\.createdAt\) >= ms\(opts\.fromIso\)/.test(exclusive)
          && /ms\(e\.createdAt\) >= ms\(opts\.fromIso\)/.test(memPred);
      })(), "");
    ok("16.eventsBot.c1 · CONTROL · the same scan reports a facet moved OUT of the predicate and onto the list member, and the shipped bodies are not reported",
      (() => {
        const movedMem = memPred.split("opts.houseBotId === undefined || e.houseBotId === opts.houseBotId").join("true");
        const movedList = `${objectMethod(memEvents, "listAll")}\n.filter((e) => e.houseBotId === opts.houseBotId)`;
        return !/opts\.houseBotId === undefined \|\| e\.houseBotId === opts\.houseBotId/.test(movedMem)
          && /houseBotId/.test(movedList)
          && /opts\.houseBotId === undefined \|\| e\.houseBotId === opts\.houseBotId/.test(memPred)
          && !/houseBotId/.test(objectMethod(memEvents, "listAll"));
      })(), "");

    /* ⛔ THE CONTROL RULINGS 345 AND 317 BOTH ASK FOR: a count whose condition is written a SECOND time is reported.
     * Applied to the real shipped bodies, so a detector that cannot see the defect fails here and not on a render. */
    const restatedMem = objectMethod(memIntents, "countFeed").split("memFeedMatches(filter)").join("(i) => i.kind === filter.kinds?.[0]");
    const restatedPri = objectMethod(priIntents, "countFeed").split("feedWhere(filter, p)").join(`[\`"kind" = ANY($1)\`]`);
    const restatedEvt = objectMethod(priEvents, "countAll").split("eventWhere(opts, p)").join(`[\`"kind" = ANY($1)\`]`);
    ok("16.feedShared.c1 · CONTROL · a count that restates its condition instead of naming the predicate is caught, in all three shapes, and the shipped bodies are not",
      !/memFeedMatches\(filter\)/.test(restatedMem) && !/feedWhere\(filter, p\)/.test(restatedPri) && !/eventWhere\(opts, p\)/.test(restatedEvt)
        && /memFeedMatches\(filter\)/.test(objectMethod(memIntents, "countFeed"))
        && /feedWhere\(filter, p\)/.test(objectMethod(priIntents, "countFeed"))
        && /eventWhere\(opts, p\)/.test(objectMethod(priEvents, "countAll")), "");

    /* ⛔ AND NEITHER COUNT MAY BE A PAGED READ WEARING A COUNT'S NAME (ruling 344): `pageLimit` clamps every page to
     * 500, so a total folded from rows is a confident wrong number that links the pager at pages nothing serves. */
    ok("16.feedShared · ⛔ 344 · neither counting reader pages, slices or reads through its twin's list member",
      !/pageLimit|memPage|sqlPage|\.slice\(/.test(objectMethod(memIntents, "countFeed") + objectMethod(priIntents, "countFeed")
        + objectMethod(memEvents, "countAll") + objectMethod(priEvents, "countAll")), "");

    /* ⭐ STEP 9 (2026-09-26) · ONE NAMED ORDER BEHIND EACH SORTED PAGE AND THE RANK A BELL LANDS BY — ruling 345's shape,
     * applied to the ORDER. A sorted page and the rank that says which page a row is on are two members, and the moment
     * the order is written twice they can disagree: the bell lands on page 3 and the row is on page 4. So each pair must
     * NAME its twin's one order function (and its one predicate), never restate either. */
    const orderPairs = (): boolean =>
      pair(memIntents, "listFeed", "rankInFeed", /memFeedOrder\(/) && pair(priIntents, "listFeed", "rankInFeed", /feedOrderSql\(/)
        && pair(memEvents, "listAll", "rankInAll", /memEventOrder\(/) && pair(priEvents, "listAll", "rankInAll", /eventOrderSql\(/)
        && /memFeedMatches\(filter\)/.test(objectMethod(memIntents, "rankInFeed")) && /feedWhere\(filter, p\)/.test(objectMethod(priIntents, "rankInFeed"))
        && /memEventMatches\(opts\)/.test(objectMethod(memEvents, "rankInAll")) && /eventWhere\(opts, p\)/.test(objectMethod(priEvents, "rankInAll"))
        && /^async function memFeedOrder\(/m.test(houseDalSrc) && /^function feedOrderSql\(/m.test(houseDalSrc)
        && /^function memEventOrder\(/m.test(houseDalSrc) && /^function eventOrderSql\(/m.test(houseDalSrc);
    ok("16.feedOrder · ⭐ step 9 · each sorted list and its rank member read ONE named order per twin (memFeedOrder / feedOrderSql, memEventOrder / eventOrderSql) over the SAME named predicate",
      orderPairs(), `rankInFeed mem ${objectMethod(memIntents, "rankInFeed").length} chars · pri ${objectMethod(priIntents, "rankInFeed").length} chars`);
    ok("16.feedOrder.c1 · CONTROL · a rank member that restates its order instead of naming it is caught, and the shipped bodies are not",
      !/memFeedOrder\(/.test(objectMethod(memIntents, "rankInFeed").split("memFeedOrder(").join("((a, b) => a.stakeTzs - b.stakeTzs)("))
        && !/eventOrderSql\(/.test(objectMethod(priEvents, "rankInAll").split("eventOrderSql(").join("`\"createdAt\" DESC`("))
        && /memFeedOrder\(/.test(objectMethod(memIntents, "rankInFeed")) && /eventOrderSql\(/.test(objectMethod(priEvents, "rankInAll")), "");
  }

  const filtersSrc = decomment(readFileSync(join(SRC, "lib/server/txn-filters.ts"), "utf8"));
  ok("16.d20.house · ⛔ D20 · no house filter survives in the transaction search grammar or its Prisma where (ruling 210 struck)",
    filtersSrc.length > 2_000 && !/f\.house/.test(filtersSrc) && !/house\?:/.test(filtersSrc) && !/houseBotId/.test(filtersSrc), filtersSrc.length.toString());
  ok("16.d20.house.c1 · CONTROL · each of the three needles fires on the exact text ruling 210's un-build removed",
    /f\.house/.test('if (f.house === "only" && t.houseBotId == null) return false;') && /house\?:/.test('  house?: "only" | "exclude";')
      && /houseBotId/.test('and.push({ houseBotId: { not: null } })'));

  // ⛔ D20a · BOTS ARE ORDINARY PLAYERS IN EVERY REPORT. Rulings 224 and 233 had added a house exclusion to two
  // PLAYER-FACING aggregates — the compliance concentration list (`txn.topContributors`) and the public leaderboard
  // (`positionStore.leaderboard({excludeHouse})`). Both are `main`'s code again in BOTH twins, and their parity cases went
  // with the exclusions, so this holds what D20 now requires of them: no marker, no option, either twin (test-strength-04).
  /** An arrow property's text inside a DAL delegate block: from the property to the next property at the same indent. */
  const arrowProp = (block: string, name: string): string => {
    const at = block.search(new RegExp(`^ {4}${name}: (?:async )?\\(`, "m"));
    if (at < 0) return "";
    const rest = block.slice(at);
    const next = rest.slice(1).search(/\n {4}\w+: /);
    return next < 0 ? rest : rest.slice(0, next + 1);
  };
  const topPri = arrowProp(region(dalSrc, "\n  txn: {"), "topContributors");
  const topMem = arrowProp(region(storeSrc, "\n  txn: {"), "topContributors");
  const lbMem = objectMethod(region(marketDalSrc, "const memoryPositions"), "leaderboard");
  const lbPri = objectMethod(region(marketDalSrc, "const prismaPositions"), "leaderboard");
  const houseFree = (body: string, anchor: string) => body.length > 200 && body.includes(anchor) && !/houseBotId/.test(body) && !/excludeHouse/.test(body);
  ok("16.d20.aggregates · ⛔ D20 · neither player-facing aggregate excludes a house-marked row in either twin: top contributors (Prisma and memory) and the leaderboard (memory and SQL) name no marker and take no excludeHouse option",
    houseFree(topPri, "payouts") && houseFree(topMem, "payouts") && houseFree(lbMem, "resolved") && houseFree(lbPri, "resolved"),
    JSON.stringify({ topPri: topPri.length, topMem: topMem.length, lbMem: lbMem.length, lbPri: lbPri.length }));
  ok("16.d20.aggregates.c1 · CONTROL · each needle fires on the exact text D20's un-build removed from those four bodies",
    /houseBotId/.test('if (t.houseBotId != null) continue;') && /houseBotId/.test('and "houseBotId" is null')
      && /excludeHouse/.test('if (opts?.excludeHouse && p.houseBotId != null) continue;') && /excludeHouse/.test('excludeHouse?: boolean;'));

  // Ruling 235 · `ownRounds` stays (the F6 email rule): unmarked positions counted in the same single aggregate, both twins.
  const dtMem = objectMethod(region(marketDalSrc, "const memoryPositions"), "dailyTotalsByUser");
  const dtPri = objectMethod(region(marketDalSrc, "const prismaPositions"), "dailyTotalsByUser");
  ok("16.ownRounds · ruling 235 · ownRounds counts unmarked positions in both twins, in the same single aggregate",
    /if \(p\.houseBotId == null\) e\.ownRounds \+= 1;/.test(dtMem) && /\(count\(\*\) filter \(where p\."houseBotId" is null\)\)::int\s+as "ownRounds"/.test(dtPri) && /ownRounds: Number\(r\.ownRounds\)/.test(dtPri));
  ok("16.ownRounds.c1 · CONTROL · a memory twin that counts every round and a SQL twin without the filter are each caught",
    !/if \(p\.houseBotId == null\) e\.ownRounds \+= 1;/.test(dtMem.replace("if (p.houseBotId == null) e.ownRounds += 1;", "e.ownRounds += 1;"))
      && !/\(count\(\*\) filter \(where p\."houseBotId" is null\)\)::int\s+as "ownRounds"/.test(dtPri.replace(`(count(*) filter (where p."houseBotId" is null))::int`, "count(*)::int")));

  /* ⭐ C7 step 6 · THE ONE NEW STORE MEMBER OF THIS COMMIT, AND BOTH TWINS IN THE SAME CHANGE (the standing rule).
   *
   * 🔴 WHY IT EXISTS. The designation wizard's check card reported "Open positions" as
   * `listForUser(id, 100).filter(OPEN).length` — a PAGE, newest-first over every status — so a holder with a
   * hundred settled positions newer than their open ones was painted 0 open beside a warning saying they hold
   * some, on the card that decides whether their account may be admitted to the desk. Ruling 344 in one line: a
   * paged reader structurally cannot report a population.
   *
   * ⛔ SO THE PARITY THAT MATTERS IS THAT NEITHER TWIN PAGES. The memory twin must not `slice`, and the Prisma twin
   * must be a `count`, not a `findMany` whose rows are then counted in the app. */
  const cntMem = objectMethod(region(marketDalSrc, "const memoryPositions"), "countOwnOpenForUser");
  const cntPri = objectMethod(region(marketDalSrc, "const prismaPositions"), "countOwnOpenForUser");
  ok("16.countOwnOpen · ruling 344 · both twins implement `countOwnOpenForUser`, both exclude a house-marked row, and NEITHER pages — no `slice`, no `take`, no `findMany`",
    cntMem.length > 40 && cntPri.length > 40
      && /p\.status === "OPEN" && p\.houseBotId == null/.test(cntMem) && !/slice\(|take:|limit/.test(cntMem)
      && /position\.count\(\{ where: \{ userId, status: "OPEN", houseBotId: null \} \}\)/.test(cntPri)
      && !/findMany|take:|slice\(/.test(cntPri)
      && /countOwnOpenForUser\(userId: string\): Promise<number>;/.test(marketDalSrc),
    JSON.stringify({ mem: cntMem.replace(/\s+/g, " ").slice(0, 120), pri: cntPri.replace(/\s+/g, " ").slice(0, 120) }));
  ok("16.countOwnOpen.c1 · CONTROL · the same two needles catch a twin that pages and a twin that counts every status — the exact two shapes this member was written to replace",
    !/p\.status === "OPEN" && p\.houseBotId == null/.test(cntMem.replace('p.status === "OPEN" && p.houseBotId == null', 'p.status === "OPEN"'))
      && /slice\(/.test(`${cntMem}.slice(0, limit)`)
      && !/position\.count\(\{ where: \{ userId, status: "OPEN", houseBotId: null \} \}\)/.test(cntPri.replace("position.count(", "position.findMany(")));
}

/* ═══ §17 · MessagingConsent and Suppression — the consent ledger (marketing U6) ═══════ */
{
  // ⭐ WHY AN APPEND-ONLY TABLE NEEDS THIS GUARD MORE THAN A MUTABLE ONE. Nothing READS
  // this ledger yet — U7's gate is the first thing that will — so a field dropped from the
  // Prisma create is invisible to every test that exists today, and the memory backend that
  // every behavioural suite runs on would stay green straight through it. It surfaces first
  // as a consent record that cannot prove what the person was actually shown, which is the
  // one thing the record exists to do (GN 478T reg 51(1)).
  const cKeys = storedKeys("StoredMessagingConsent");
  const cRead = region(dalSrc, "function toStoredMessagingConsent(");
  const cCreate = delegateMethod("messagingConsent", "create");

  ok("17.0 · the parser sees StoredMessagingConsent's fields", cKeys.length >= 11, `saw ${cKeys.length}: ${cKeys.join(",")}`);
  ok("17.0b · the read mapper region resolves", cRead.length > 100, `${cRead.length} chars`);
  ok("17.0c · the create delegate resolves", cCreate.length > 100, `${cCreate.length} chars`);
  for (const k of cKeys) {
    ok(`17.read · toStoredMessagingConsent maps "${k}" from the row`, readsFrom(cRead, k, "c"));
    ok(`17.create · messagingConsent.create writes "${k}"`, writesKey(cCreate, k) || mentions(cCreate, k));
  }
  // ⛔ §5.7 — the wording IS the evidence. A ledger that stores a KEY into today's copy
  // instead of the text re-renders history every time marketing rewrites the form.
  ok("17.verbatim · the wording is carried as text from the row, never re-rendered",
    readsFrom(cRead, "wording", "c") && !/wording:\s*[a-zA-Z]+\(/.test(cRead));

  const sKeys = storedKeys("StoredSuppression");
  const sRead = region(dalSrc, "function toStoredSuppression(");
  const sCreate = delegateMethod("suppression", "create");
  ok("17.1 · the parser sees StoredSuppression's fields", sKeys.length >= 8, `saw ${sKeys.length}: ${sKeys.join(",")}`);
  for (const k of sKeys) {
    ok(`17.read · toStoredSuppression maps "${k}" from the row`, readsFrom(sRead, k, "s"));
    ok(`17.create · suppression.create writes "${k}"`, writesKey(sCreate, k) || mentions(sCreate, k));
  }

  // ⛔ THE APPEND-ONLY RULE, ASSERTED AS AN ABSENCE — IN BOTH TWINS. This is the assertion
  // that actually holds the design in place: a later session adding `messagingConsent.update`
  // to "correct" a row fails here, rather than quietly turning evidence into an opinion.
  const cPri = region(dalSrc, "\n  messagingConsent: {");
  const cMem = region(storeSrc, "\n  messagingConsent: {");
  ok("17.append.prisma · the Prisma ledger exposes NO update and NO delete",
    cPri.length > 200 && !/\bupdate\s*:/.test(cPri) && !/\bdelete\w*\s*:/.test(cPri), `${cPri.length} chars`);
  ok("17.append.memory · the memory ledger exposes NO update and NO delete",
    cMem.length > 200 && !/\bupdate\s*:/.test(cMem) && !/\bdelete\w*\s*:/.test(cMem), `${cMem.length} chars`);

  // ⛔ A SUPPRESSION ROW IS NEVER DELETED — in either twin. Not by contact deletion, not by
  // re-import, not by erasure.
  const sPri = region(dalSrc, "\n  suppression: {");
  const sMem = region(storeSrc, "\n  suppression: {");
  ok("17.nodelete.prisma · the Prisma suppression namespace exposes NO delete",
    sPri.length > 200 && !/\bdelete\w*\s*:/.test(sPri), `${sPri.length} chars`);
  ok("17.nodelete.memory · the memory suppression namespace exposes NO delete",
    sMem.length > 200 && !/\bdelete\w*\s*:/.test(sMem), `${sMem.length} chars`);

  // ⭐ RE-SUPPRESSION MUST NOT MOVE THE DATE. The `createdAt` on a suppression row is the
  // answer to "when did this person say no"; an upsert that refreshed it would walk that
  // date forward on every re-import, and the evidence would always look brand new.
  //
  // 🔴 THIS ASSERTION USED TO READ `update: {}` — AN EMPTY BLOCK — AND U8 MADE THAT WRONG.
  // ⛔ It is REPLACED rather than softened, because the old form now describes a defect. Once a
  // suppression can be LIFTED (U8's `liftedAt`), `stop → start again → stop again` returns
  // through this upsert, and an EMPTY update block hands back the LIFTED row untouched: the
  // page tells the person they will never be marketed again while the suppression stays lifted
  // and the next campaign sends to them. That is a false success pointing the opposite way from
  // the one U8 was written to prevent.
  // ⭐ SO THE RULE IS STATED AS WHAT IT ALWAYS MEANT: the update block must NOT touch
  // `createdAt`, `id`, `reason` or `evidence` — and it MUST clear the lift.
  const sUpdateBlock = sCreate.match(/update:\s*\{([^}]*)\}/)?.[1] ?? "@@none@@";
  ok("17.idempotent.prisma · re-suppression is an UPSERT whose update block touches nothing that is evidence",
    mentions(sCreate, "upsert") && sUpdateBlock !== "@@none@@"
      && !/\b(createdAt|id|reason|evidence|recordedBy|identifier)\b/.test(sUpdateBlock),
    `update block = {${sUpdateBlock.trim()}}`);
  ok("17.rearm.prisma · ⛔ …and it CLEARS THE LIFT, so re-suppression re-arms a lifted row rather than handing it back",
    /liftedAt:\s*null/.test(sUpdateBlock) && /liftedReason:\s*null/.test(sUpdateBlock),
    `update block = {${sUpdateBlock.trim()}}`);
  // ⛔ SCOPED TO THE CREATE BODY ON PURPOSE. `find` also ends in `return r;`, so asking this
  // of the whole namespace would pass even after create stopped being idempotent — a guard
  // that reads the wrong region is a guard that cannot fail.
  const sMemCreate = region(sMem, "create: (");
  ok("17.idempotent.memory · the memory twin returns the row ALREADY THERE instead of replacing it",
    sMemCreate.length > 80 && /return r;/.test(sMemCreate), `${sMemCreate.length} chars`);
  ok("17.rearm.memory · ⛔ …and it clears the lift on that row, the same way the Prisma twin does",
    /r\.liftedAt = null/.test(sMemCreate) && /r\.liftedReason = null/.test(sMemCreate),
    `${sMemCreate.length} chars`);
  // 🔴 THE REASON FOLLOWS THE STOP NOW IN FORCE (E2E review, 2026-09-27). Only `WITHDRAWN` is
  // person-liftable, so a create that kept the FIRST reason let a person's old stop hide a
  // complaint or an officer's stop: one tap on an old SMS lifted a refusal somebody else made.
  ok("17.supersede.prisma · ⛔ a RE-ARMED row takes the new reason, and a non-WITHDRAWN stop takes over an active WITHDRAWN one",
    /updateMany\(\{\s*where:\s*\{\s*\.\.\.triple,\s*liftedAt:\s*\{\s*not:\s*null\s*\}\s*\},\s*data:\s*takeOver/.test(sCreate)
      && /row\.reason !== "WITHDRAWN"[\s\S]{0,120}reason:\s*"WITHDRAWN",\s*liftedAt:\s*null\s*\},\s*data:\s*takeOver/.test(sCreate)
      && /takeOver = \{ reason: row\.reason, evidence: row\.evidence, recordedBy: row\.recordedBy \}/.test(sCreate),
    `${sCreate.length} chars`);
  ok("17.liftreason · ⛔ `lift` lifts ONLY a WITHDRAWN row, in BOTH twins — the store refuses a complaint, an officer's stop or a self-exclusion even if a caller forgets to check",
    /liftedAt:\s*null,[\s\S]{0,120}reason:\s*"WITHDRAWN",[\s\S]{0,40}\},\s*data:\s*\{\s*liftedAt:\s*new Date\(at\)/.test(delegateMethod("suppression", "lift"))
      && /if \(r\.reason !== "WITHDRAWN"\) return null;/.test(region(sMem, "lift: (")),
    "prisma where + memory guard");
  ok("17.supersede.memory · ⛔ …and the memory twin does the same on the row already there",
    /if \(r\.liftedAt \|\| \(r\.reason === "WITHDRAWN" && row\.reason !== "WITHDRAWN"\)\)/.test(sMemCreate)
      && /r\.reason = row\.reason;/.test(sMemCreate) && /r\.evidence = row\.evidence;/.test(sMemCreate),
    `${sMemCreate.length} chars`);

  /* ═══ U8 · A ROW IS NEVER DELETED, BUT IT MAY BE SUPERSEDED ═══════════════════════════
   * ⛔ THE "NO DELETE" ASSERTIONS ABOVE STAY EXACTLY AS THEY WERE. This is the other half of
   * the same promise, and without it "no delete" is satisfied by a resubscribe button that
   * cannot work: U7's gate asks suppression FIRST, so a person who opted out and then asked to
   * be started again would be told it worked while the row refused them for ever. */
  const sLiftPri = delegateMethod("suppression", "lift");
  const sLiftMem = region(sMem, "lift: (");
  ok("17.lift.prisma · the Prisma twin exposes a LIFT", sLiftPri.length > 100, `${sLiftPri.length} chars`);
  ok("17.lift.memory · so does the memory twin", sLiftMem.length > 80, `${sLiftMem.length} chars`);
  // ⭐ A LIFT IS AN UPDATE, NEVER A REMOVAL — asserted on the lift's OWN body, because the
  // namespace-wide "no delete" check above would pass even if the lift called one under a name
  // that check does not spell.
  ok("17.lift.nodelete.prisma · ⛔ the lift writes an UPDATE and removes nothing",
    /updateMany|update\(/.test(sLiftPri) && !/delete|destroy|remove\(/i.test(sLiftPri));
  ok("17.lift.nodelete.memory · ⛔ the memory lift mutates the row in place and removes nothing",
    sLiftMem.length > 80 && !/delete|\.clear\(|\.splice\(/i.test(sLiftMem));
  // ⭐ ONLY AN ACTIVE ROW IS LIFTED, IN BOTH TWINS — that is what stops a SECOND lift walking
  // `liftedAt` forward. The date is evidence, exactly as `createdAt` is.
  ok("17.lift.once.prisma · the Prisma lift is scoped to rows whose liftedAt is still null",
    /liftedAt:\s*null/.test(sLiftPri));
  ok("17.lift.once.memory · and the memory lift refuses a row that is already lifted",
    /if \(r\.liftedAt\) return null/.test(sLiftMem), `${sLiftMem.length} chars`);
  // ⭐ `find` MEANS ACTIVE, IN BOTH TWINS. A twin that answered "is this number suppressed"
  // differently from the other is the whole class this file exists to refuse — and here the
  // disagreement would be a suppressed person receiving marketing on production while every
  // in-memory test stayed green.
  const sFindPri = delegateMethod("suppression", "find");
  const sFindMem = region(sMem, "find: (");
  ok("17.active.prisma · the Prisma `find` returns only rows that are still refusing",
    /liftedAt:\s*null/.test(sFindPri), `${sFindPri.length} chars`);
  // 🔴 AND IT READS THE LIFT *FALSILY*, WHICH IS NOT A STYLE POINT. `r.liftedAt === null` is
  // FALSE for a row that carries no lift field at all, so the strict form reported an
  // un-lifted row as lifted and handed a suppressed person back as marketable — failing OPEN,
  // in the one direction the law does not forgive. `!r.liftedAt` fails CLOSED: absent, null or
  // empty all mean nobody lifted it, so it still refuses.
  ok("17.active.memory · and the memory `find` does too, reading the lift FALSILY so a row with no lift still REFUSES",
    /!r\.liftedAt/.test(sFindMem) && !/liftedAt === null/.test(sFindMem), `${sFindMem.length} chars`);
  // ⛔ AND `listFor` MUST NOT FILTER — it is the reader that proves a lift removed nothing.
  const sListPri = delegateMethod("suppression", "listFor");
  const sListMem = region(sMem, "listFor: (");
  ok("17.history.prisma · ⛔ `listFor` returns EVERY row, lifted or not — it is how 'never deleted' is OBSERVED",
    sListPri.length > 80 && !/liftedAt/.test(sListPri), `${sListPri.length} chars`);
  ok("17.history.memory · and the memory twin does not filter either",
    sListMem.length > 60 && !/liftedAt/.test(sListMem), `${sListMem.length} chars`);

  // ⭐ BOTH TWINS MUST EXPOSE THE SAME MEMBERS. A method that exists on only one side is a
  // call that works in every test and throws on production, or the reverse.
  const members = (block: string): string[] =>
    Array.from(block.matchAll(/^\s{4}(\w+)\s*:/gm)).map((m) => m[1]).sort();
  ok("17.parity.consent · the ledger exposes the same members in both twins",
    members(cPri).length >= 3 && members(cPri).join(",") === members(cMem).join(","),
    `prisma=[${members(cPri)}] memory=[${members(cMem)}]`);
  ok("17.parity.suppression · suppression exposes the same members in both twins",
    members(sPri).length >= 3 && members(sPri).join(",") === members(sMem).join(","),
    `prisma=[${members(sPri)}] memory=[${members(sMem)}]`);

  // ⭐ THE TIEBREAK MUST MATCH. Two rows can share a millisecond; a twin that breaks the tie
  // differently from Postgres answers the gate's question differently in a test than it does
  // on production — which is the whole class this file exists to refuse.
  // ⭐ COUNTED, NOT MERELY PRESENT — AND THE RED CONTROL IS WHY. The first version of this
  // assertion asked whether the tiebreak appeared ANYWHERE in the namespace, and each twin
  // has TWO readers. `red:dal-parity` planted the tiebreak's removal from `latestFor` and
  // the gate stayed GREEN, because `listFor` still carried it. An assertion that a sibling
  // can satisfy on your behalf is not an assertion about you.
  const tally = (block: string, needle: RegExp): number => (block.match(needle) || []).length;
  const TIE_PRISMA = /\{ createdAt: "desc" \}, \{ id: "desc" \}/g;
  const TIE_MEMORY = /b\.id\.localeCompare\(a\.id\)/g;
  // ⭐ BY NAME, NOT BY TALLY (§25, 2026-10-02). A tally over the namespace was the fix for one reader passing on its
  // sibling's behalf — and §25's `latestAmong` is a THIRD reader carrying the same order, so with a tally the tiebreak
  // dropped from `latestFor` alone still counted two and passed: the very defect the note above describes, back. Each
  // reader is now held to the order in its OWN text.
  const TIE_READERS = ["latestFor", "listFor", "latestAmong"];
  const NL17 = String.fromCharCode(10);
  const NEXT_MEMBER17 = new RegExp(NL17 + " {4}[A-Za-z0-9_]+ *:");
  const ledgerMember = (block: string, name: string): string => {
    const at = block.indexOf(`${NL17}    ${name}: `);
    if (at < 0) return "";
    const next = block.slice(at + 1).search(NEXT_MEMBER17);
    return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
  };
  const priUntied = TIE_READERS.filter((m) => tally(ledgerMember(cPri, m), TIE_PRISMA) < 1);
  const memUntied = TIE_READERS.filter((m) => tally(ledgerMember(cMem, m), TIE_MEMORY) < 1);
  ok("17.tiebreak.prisma · EVERY Prisma ledger reader — latestFor, listFor and §25's latestAmong — orders by createdAt DESC then id DESC, each in its own text",
    priUntied.length === 0, priUntied.length ? `no tiebreak in [${priUntied}]` : `${TIE_READERS.length} readers`);
  ok("17.tiebreak.memory · EVERY memory ledger reader breaks the tie on id, the same way, each in its own text",
    memUntied.length === 0, memUntied.length ? `no tiebreak in [${memUntied}]` : `${TIE_READERS.length} readers`);
  ok("17.tiebreak.c1 · CONTROL · a reader without the tiebreak is reported BY NAME even when its siblings carry it",
    TIE_READERS.filter((m) => tally(ledgerMember(cPri.replace('orderBy: [{ createdAt: "desc" }, { id: "desc" }],', 'orderBy: { createdAt: "desc" },'), m), TIE_PRISMA) < 1).length === 1
      && tally('orderBy: [{ createdAt: "desc" }, { id: "desc" }], orderBy: { createdAt: "desc" },', TIE_PRISMA) === 1);

  // ── CONTROLS — each proves the assertion above it is CAPABLE of failing. ──────────────
  ok("17.c1 · CONTROL · `wording: null,` in a read mapper does NOT count as carrying it",
    !readsFrom("    status: c.status,\n    wording: null,", "wording", "c"));
  ok("17.c2 · CONTROL · a create body that omits `wording` is reported missing",
    !writesKey("          identifier: row.identifier, category: row.category,", "wording")
      && !mentions("          identifier: row.identifier, category: row.category,", "wording"));
  ok("17.c3 · CONTROL · an `update:` added to a ledger delegate IS seen by the absence check",
    /\bupdate\s*:/.test("    update: async (id: string) => null,"));
  ok("17.c4 · CONTROL · a `deleteMany:` added to suppression IS seen by the absence check",
    /\bdelete\w*\s*:/.test("    deleteMany: async () => 0,"));
  ok("17.c5 · CONTROL · an upsert that REFRESHES `createdAt` IS caught by the evidence-untouched rule",
    /\b(createdAt|id|reason|evidence|recordedBy|identifier)\b/.test(
      "update: { createdAt: new Date(), liftedAt: null },".match(/update:\s*\{([^}]*)\}/)?.[1] ?? ""));
  ok("17.c5b · CONTROL · an EMPTY update block — the shape U8 made wrong — fails the re-arm rule",
    !/liftedAt:\s*null/.test("update: {},".match(/update:\s*\{([^}]*)\}/)?.[1] ?? ""));
  ok("17.c5c · CONTROL · a `find` that never asks about the lift is reported, so 'active' cannot be assumed",
    !/liftedAt:\s*null/.test("findUnique({ where: { channel_identifier_category: k } })"));
  ok("17.c5f · CONTROL · the STRICT memory predicate is REJECTED — `=== null` reads a row with no lift as lifted, and that fails OPEN",
    !(/!r\.liftedAt/.test("return r.liftedAt === null ? r : null;")
      && !/liftedAt === null/.test("return r.liftedAt === null ? r : null;")));
  ok("17.c5d · CONTROL · a lift that DELETES instead of updating is seen",
    /delete/i.test("deleteMany({ where: { identifier } })"));
  ok("17.c5e · CONTROL · a `listFor` that filtered lifted rows out WOULD be caught — the history reader must not hide them",
    /liftedAt/.test("findMany({ where: { identifier, liftedAt: null } })"));
  ok("17.c6 · CONTROL · the tiebreak needle does not match an order that omits the id leg",
    !/\{ createdAt: "desc" \}, \{ id: "desc" \}/.test('orderBy: { createdAt: "desc" },'));
}

/* ═══ §18 · MarketingOptOutToken — the opt-out link (marketing U8) ═════════════════════ */
{
  // ⭐ WHY A LOOKUP TABLE NEEDS THE SAME GUARD AS A MONEY ROW. This row is the ONLY thing
  // standing between a person and the marketing they asked to stop: the token in their SMS
  // resolves to an identifier through here. A field dropped from the Prisma create is a link
  // that 404s for somebody trying to leave — and OD43 says the link never expires, so the
  // failure is permanent and arrives months after the send that caused it.
  const tKeys = storedKeys("StoredMarketingOptOutToken");
  const tRead = region(dalSrc, "function toStoredMarketingOptOutToken(");
  const tCreate = delegateMethod("marketingOptOutToken", "create");

  ok("18.0 · the parser sees StoredMarketingOptOutToken's fields", tKeys.length >= 5, `saw ${tKeys.length}: ${tKeys.join(",")}`);
  ok("18.0b · the read mapper region resolves", tRead.length > 80, `${tRead.length} chars`);
  ok("18.0c · the create delegate resolves", tCreate.length > 100, `${tCreate.length} chars`);
  for (const k of tKeys) {
    ok(`18.read · toStoredMarketingOptOutToken maps "${k}" from the row`, readsFrom(tRead, k, "t"));
    ok(`18.create · marketingOptOutToken.create writes "${k}"`, writesKey(tCreate, k) || mentions(tCreate, k));
  }

  const tPri = region(dalSrc, "\n  marketingOptOutToken: {");
  const tMem = region(storeSrc, "\n  marketingOptOutToken: {");
  // ⛔ OD43 · THE LINK NEVER EXPIRES, so there is no delete in either twin. A person who kept
  // an SMS from a year ago must still be able to click out of it.
  ok("18.nodelete.prisma · the Prisma token namespace exposes NO delete",
    tPri.length > 200 && !/\bdelete\w*\s*:/.test(tPri), `${tPri.length} chars`);
  ok("18.nodelete.memory · the memory token namespace exposes NO delete",
    tMem.length > 200 && !/\bdelete\w*\s*:/.test(tMem), `${tMem.length} chars`);

  // ⭐ A TAKEN TOKEN COMES BACK AS null IN BOTH TWINS — not a throw, and above all not an
  // overwrite. `upsert` here would silently re-point somebody else's live opt-out link at a
  // different person, and they would never be able to leave.
  const tCreateMem = region(tMem, "create: (");
  ok("18.taken.prisma · the Prisma create turns its unique violation into null, and does not upsert",
    /P2002/.test(tCreate) && /return null/.test(tCreate) && !mentions(tCreate, "upsert"), "P2002 → null");
  ok("18.taken.memory · the memory create refuses a token already held, and does not overwrite",
    /has\(row\.token\)/.test(tCreateMem) && /return null/.test(tCreateMem), `${tCreateMem.length} chars`);

  const tMembers = (block: string): string[] =>
    Array.from(block.matchAll(/^\s{4}(\w+)\s*:/gm)).map((m) => m[1]).sort();
  ok("18.parity · both twins expose the same members",
    tMembers(tPri).length >= 3 && tMembers(tPri).join(",") === tMembers(tMem).join(","),
    `prisma=[${tMembers(tPri)}] memory=[${tMembers(tMem)}]`);

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  ok("18.c1 · CONTROL · `identifier: null,` in a read mapper does NOT count as carrying it",
    !readsFrom("    token: t.token,\n    identifier: null,", "identifier", "t"));
  ok("18.c2 · CONTROL · an upsert IS detected, so a silent re-point cannot pass as a create",
    mentions("const x = await pc().marketingOptOutToken.upsert({", "upsert"));
  ok("18.c3 · CONTROL · a create that throws instead of returning null is reported",
    !/return null/.test("      const created = await pc().marketingOptOutToken.create({ data });"));
}

/* ═══ §19 · The contact book — MarketingContact / ContactList / ContactListMember (U18) ═══ */
{
  // ⭐ WHY THE BOOK NEEDS THIS GUARD AS BADLY AS A MONEY ROW. It is the first store on this
  // platform holding people who may have NO `User` row, so nothing upstream re-checks what it
  // says: there is no account to fall back on, no wallet to reconcile against. If one twin
  // carries a field the other drops, the difference shows up as a person who is marketable on
  // one backend and not the other — and the memory twin is what every marketing suite runs on.
  //
  // ⛔ AND WHY `@unique` IS ASSERTED IN THE TWINS, NOT THE SCHEMA. `schema.prisma` is read from
  // ROOT, not through `KP_SRC`, so the red harness cannot mutate it: a declaration about the
  // schema here would report NOT CAUGHT (`scripts/anchors/` has already paid for this once and
  // wrote it down in DEFERRED-TESTS.md). The uniqueness claim is therefore expressed as the two
  // BEHAVIOURS that implement it — the memory twin's secondary map, and the Prisma twin's
  // P2002-to-null branch — which are real code the harness can plant a defect in.

  const cKeys = storedKeys("StoredMarketingContact");
  const cRead = region(dalSrc, "function toStoredMarketingContact(");
  const cCreate = delegateMethod("marketingContact", "create");

  ok("19.0 · the parser sees StoredMarketingContact's fields", cKeys.length >= 18, `saw ${cKeys.length}: ${cKeys.join(",")}`);
  ok("19.0b · the read mapper region resolves", cRead.length > 300, `${cRead.length} chars`);
  ok("19.0c · the create delegate resolves", cCreate.length > 300, `${cCreate.length} chars`);
  for (const k of cKeys) {
    ok(`19.read · toStoredMarketingContact maps "${k}" from the row`, readsFrom(cRead, k, "c"));
    ok(`19.create · marketingContact.create writes "${k}"`, writesKey(cCreate, k) || mentions(cCreate, k));
  }

  const lKeys = storedKeys("StoredContactList");
  const lRead = region(dalSrc, "function toStoredContactList(");
  const lCreate = delegateMethod("contactList", "create");
  ok("19.1 · the parser sees StoredContactList's fields", lKeys.length >= 7, `saw ${lKeys.length}`);
  for (const k of lKeys) {
    ok(`19.read.list · toStoredContactList maps "${k}"`, readsFrom(lRead, k, "l"));
    ok(`19.create.list · contactList.create writes "${k}"`, writesKey(lCreate, k) || mentions(lCreate, k));
  }

  const mKeys = storedKeys("StoredContactListMember");
  const mRead = region(dalSrc, "function toStoredContactListMember(");
  const mAdd = delegateMethod("contactListMember", "add");
  ok("19.2 · the parser sees StoredContactListMember's fields", mKeys.length >= 4, `saw ${mKeys.length}`);
  for (const k of mKeys) {
    ok(`19.read.member · toStoredContactListMember maps "${k}"`, readsFrom(mRead, k, "m"));
    ok(`19.add.member · contactListMember.add writes "${k}"`, writesKey(mAdd, k) || mentions(mAdd, k));
  }

  // ── THE @unique, EXPRESSED AS THE BEHAVIOUR THAT IMPLEMENTS IT ───────────────────────
  const cCreateMem = region(region(storeSrc, "\n  marketingContact: {"), "create: (");
  // ⛔ SCOPED TO THE CREATE BODY ON PURPOSE. A guard that reads the whole namespace would pass
  // on a `return null` belonging to `find`, and a guard that reads the wrong region is a guard
  // that cannot fail.
  ok("19.unique.prisma · the Prisma create turns P2002 into null, and does NOT upsert",
    /P2002/.test(cCreate) && /return null/.test(cCreate) && !mentions(cCreate, "upsert"), "P2002 → null");
  ok("19.unique.memory · the memory create refuses an msisdn already in the book, and does not overwrite",
    /contactsByMsisdn\.has\(row\.msisdn\)/.test(cCreateMem) && /return null/.test(cCreateMem),
    `${cCreateMem.length} chars`);
  ok("19.unique.memory.index · the memory create MAINTAINS the secondary index it refuses on",
    /contactsByMsisdn\.set\(row\.msisdn/.test(cCreateMem),
    "a create that does not set the index makes the next duplicate pass");

  // ── RE-ADDING A MEMBER KEEPS THE ORIGINAL addedAt ───────────────────────────────────
  // ⭐ When somebody joined a list is EVIDENCE, not a status flag — the rule
  // `Suppression.createdAt` already follows. An upsert here would walk the date forward on
  // every re-import and quietly destroy the only record of when a list was built.
  const mAddMem = region(region(storeSrc, "\n  contactListMember: {"), "add: (");
  ok("19.readd.prisma · the Prisma add reads first and returns the existing row, never upserting",
    /findUnique/.test(mAdd) && /return toStoredContactListMember\(existing\)/.test(mAdd) && !mentions(mAdd, "upsert"));
  ok("19.readd.memory · the memory add returns the existing member rather than replacing it",
    /return existing/.test(mAddMem) && !/\.set\(k, row\);[\s\S]{0,40}return row;[\s\S]{0,10}\}\s*,?\s*$/.test(mAddMem.split("if (existing)")[0] ?? ""),
    `${mAddMem.length} chars`);

  // ── userId IS A LINK, NEVER A COPY ──────────────────────────────────────────────────
  // ⛔ The one rule that makes erasure possible at all (D16). If the book ever carried its own
  // copy of a player's name or number keyed to the account, erasing the account would leave
  // that copy marketable. `displayName` and `email` are the contact's OWN details, supplied
  // with the contact; nothing here is read across the `user` relation into a stored column.
  ok("19.link · StoredMarketingContact carries userId and NO copied account column",
    cKeys.includes("userId") && !cKeys.some((k) => /^(userPhone|userEmail|userName|phoneE164)$/.test(k)),
    cKeys.join(","));
  ok("19.link.mapper · the read mapper never reaches through a `user` relation",
    !/c\.user\./.test(cRead), "a mapper reading c.user.* would copy the account into the book");

  // ── BOTH TWINS EXPOSE THE SAME MEMBERS, ON ALL THREE NAMESPACES ─────────────────────
  const members = (block: string): string[] =>
    Array.from(block.matchAll(/^\s{4}(\w+)\s*:/gm)).map((m) => m[1]).sort();
  for (const ns of ["marketingContact", "contactList", "contactListMember"]) {
    const pri = region(dalSrc, `\n  ${ns}: {`);
    const mem = region(storeSrc, `\n  ${ns}: {`);
    ok(`19.parity.${ns} · both twins expose the same members`,
      members(pri).length >= 4 && members(pri).join(",") === members(mem).join(","),
      `prisma=[${members(pri)}] memory=[${members(mem)}]`);
  }

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  // ⛔ Each proves the ASSERTION ABOVE IT can reject, on a literal that would otherwise pass.
  ok("19.c1 · CONTROL · `msisdn: null,` in a read mapper does NOT count as carrying it",
    !readsFrom("    id: c.id,\n    msisdn: null,", "msisdn", "c"));
  ok("19.c2 · CONTROL · an upsert IS detected, so a silent overwrite cannot pass as a create",
    mentions("const x = await pc().marketingContact.upsert({", "upsert"));
  ok("19.c3 · CONTROL · a create that lets P2002 escape is reported",
    !/return null/.test("      const created = await pc().marketingContact.create({ data });"));
  ok("19.c4 · CONTROL · a memory create that SETS without checking the index is reported",
    !/contactsByMsisdn\.has\(row\.msisdn\)/.test("      store.marketingContacts.set(row.id, row);"));
  ok("19.c5 · CONTROL · a copied account column WOULD be caught by 19.link",
    ["id", "msisdn", "userPhone"].some((k) => /^(userPhone|userEmail|userName|phoneE164)$/.test(k)));
  ok("19.c6 · CONTROL · a mapper reaching through the relation WOULD be caught by 19.link.mapper",
    /c\.user\./.test("    displayName: c.user.name,"));
}

/* ═══ §20 · The consent ledger's clock — a tie cannot be broken at random (S10, 2026-10-01) ═══ */
{
  // 🔴 THE DEFECT BOTH TWINS SHARED, WHICH IS WHY §17 COULD NOT SEE IT. `latestFor` orders
  // `createdAt desc, id desc` in both, and agreeing is all §17 checks. But the id was `randomUUID()`
  // and `createdAt` is a millisecond, so a same-millisecond tie went to a random id: 46% of tied
  // pairs answered GIVEN after a WITHDRAWN (S8's measurement). The twins agreed and were wrong
  // together. ⭐ The fix lives in the WRITERS (`ledger-stamp.ts` gives every row an id that sorts in
  // write order), so this section holds the writers, and the order both twins read them back in.
  // The behaviour itself — 400 appends, every one read back as the latest — is
  // `test:marketing-consent-ledger` §9, with the pre-fix writer planted as its red case.
  // U18b (S10) joined: erasure appends the person's last word, WITHDRAWN, recorded by the officer.
  // U20 (S10): the dev-only seed route writes the ledger rows behind the contacts it seeds (404 in production).
  // U23 (S10): the bulk bar's "Record a withdrawal" appends WITHDRAWN, source OPERATOR, recorded by the officer.
  const WRITERS = ["lib/server/marketing/consent-ledger.ts", "lib/server/marketing/optout-service.ts", "lib/server/marketing/erase.ts",
    "app/api/dev-test/marketing-contacts-seed/route.ts", "lib/server/marketing/contact-bulk.ts"];

  // ⛔ THE POPULATION, read from the REAL tree (not KP_SRC): a writer that skips the clock would bring
  // the coin flip back for whatever it writes. U23's bulk withdrawal joined (`contact-bulk.ts`); U33's
  // consent basis will write here too — it must join WRITERS and take the stamp. ⛔ U22's form does NOT:
  // it has no consent control and writes no ledger row (a new contact's consent is MIRRORED from the
  // ledger by `mirrorContactCache`, never recorded), so its service is deliberately absent from WRITERS.
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []);
  const srcRoot = join(ROOT, "src");
  const callers = walk(srcRoot)
    .filter((f) => /\bdb\.messagingConsent\.create\(/.test(decomment(readFileSync(f, "utf8"))))
    .map((f) => f.slice(srcRoot.length + 1).replace(/\\/g, "/")).sort();
  ok("20.0 · every db.messagingConsent.create( caller in src/ is a declared ledger writer",
    callers.join(",") === [...WRITERS].sort().join(","), `callers=[${callers}]`);

  /** Each `db.messagingConsent.create({ … })` object literal in a source, brace-matched. */
  const createObjects = (src: string): string[] => {
    const out: string[] = [];
    for (let at = src.indexOf("db.messagingConsent.create("); at >= 0; at = src.indexOf("db.messagingConsent.create(", at + 1)) {
      const open = src.indexOf("{", at);
      let depth = 0;
      for (let i = open; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) { out.push(src.slice(open, i + 1)); break; } }
      }
    }
    return out;
  };
  const stamped = (obj: string) => /^\s*\.\.\.ledgerStamp\(\),?\s*$/m.test(obj)
    && !/^\s*(id|createdAt)\s*:/m.test(obj) && !/randomUUID|new Date\(\)/.test(obj);
  for (const w of WRITERS) {
    const src = decomment(readFileSync(join(SRC, w), "utf8"));
    const objs = createObjects(src);
    ok(`20.stamp · ${w.split("/").pop()} — every ledger row takes its id AND createdAt from ledgerStamp(), nothing else`,
      objs.length >= 1 && objs.every(stamped), `${objs.length} create(s); ${objs.filter((o) => !stamped(o)).length} unstamped`);
    ok(`20.import · ${w.split("/").pop()} imports the ONE clock`,
      /import\s*\{\s*ledgerStamp\s*\}\s*from\s*"@\/lib\/server\/marketing\/ledger-stamp"/.test(src));
  }

  // ⭐ THE ORDER THE STAMP IS BUILT FOR — `createdAt desc, id desc` in both twins and both readers —
  // is §17.tiebreak's, with its own red cases; it is not asserted twice.

  // ⛔ THE CLOCK ITSELF: a counter inside the millisecond, a clock that never steps back, fixed-width hex.
  const stampSrc = decomment(readFileSync(join(SRC, "lib/server/marketing/ledger-stamp.ts"), "utf8"));
  ok("20.clock · ledger-stamp holds a monotonic counter on globalThis and pads the id to fixed width",
    /globalThis\.__50PICK_LEDGER_CLOCK/.test(stampSrc) && /clock\.seq \+= 1/.test(stampSrc)
      && /padStart\(12, "0"\)/.test(stampSrc) && /padStart\(6, "0"\)/.test(stampSrc));

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  ok("20.c1 · CONTROL · a create carrying `id: randomUUID()` is NOT stamped",
    !stamped("{\n  id: randomUUID(),\n  channel: \"SMS\",\n}"));
  ok("20.c2 · CONTROL · a stamp OVERRIDDEN by a later id is NOT stamped",
    !stamped("{\n  ...ledgerStamp(),\n  id: randomUUID(),\n}"));
  ok("20.c3 · CONTROL · a stamped create IS recognised",
    stamped("{\n  ...ledgerStamp(),\n  channel: \"SMS\",\n}"));
  ok("20.c4 · CONTROL · the brace matcher finds a nested create's whole object",
    createObjects("x(db.messagingConsent.create({ a: { b: 1 }, c: 2 }));").join("") === "{ a: { b: 1 }, c: 2 }");
}

/* ═══ §21 · The audience where — one named shape, two translators (U24, S10 2026-10-01; decision C7) ═══ */
{
  // ⭐ WHY THIS SECTION EXISTS. `ContactAudienceWhere` is what the ONE resolver (`marketing/audience.ts`) hands the
  // book, and each twin turns it into rows ONCE: `toPrismaContactWhere` (prisma-dal.ts) and `contactMatchesAudience`
  // (store.ts). Every suite runs on the memory twin, so a key the Prisma translator forgets is an audience that is
  // right in every test and WIDER in production — a bulk, an export or a campaign acting on people nobody chose.
  // 🔴 AND THE NULL TRAP: Prisma's `{ sourceRef: { not: x } }` is `"sourceRef" <> $1`, which drops every NULL row —
  // nearly the whole book — while the memory twin's `!==` keeps them. The erased exclusion must carry a NULL arm.
  // Also here since U24 (moved from `test:contacts-page` §8/§8b): the number matched EXACTLY in both, the name through
  // the shared grammar in both, and the page order that puts nameless rows last with an id tiebreak.
  // U21's tag counts (decision M8) fold in as 21.tags.
  const wKeys = storedKeys("ContactAudienceWhere");
  const priW = region(dalSrc, "function toPrismaContactWhere(");
  const memW = region(storeSrc, "function contactMatchesAudience(");
  const reads = (k: string) => new RegExp(`\\bw\\.${k}\\b`);

  ok("21.0 · the parser sees ContactAudienceWhere's keys", wKeys.length >= 14, `saw ${wKeys.length}: ${wKeys.join(",")}`);
  ok("21.0b · both translators resolve", priW.length > 400 && memW.length > 400, `prisma ${priW.length} chars, memory ${memW.length} chars`);
  for (const k of wKeys) {
    ok(`21.prisma.${k} · toPrismaContactWhere reads w.${k}`, reads(k).test(priW));
    ok(`21.memory.${k} · contactMatchesAudience reads w.${k}`, reads(k).test(memW));
  }

  // ⛔ AN EMPTY ARRAY IS NOTHING. A `.length` anywhere in a translator is the truthiness test that reads `[]` as
  // "no constraint" — the widening `test:contacts-audience` 2.12 drives.
  ok("21.empty · ⛔ neither translator tests an array's .length — every key is checked !== null, so an EMPTY array is NOTHING",
    !/\.length\b/.test(priW) && !/\.length\b/.test(memW));

  const NULL_ARM = /OR:\s*\[\s*\{\s*sourceRef:\s*null\s*\}\s*,\s*\{\s*sourceRef:\s*\{\s*not:\s*w\.excludeSourceRef\s*\}\s*\}\s*\]/;
  ok("21.null · 🔴 the Prisma erased exclusion carries the NULL arm — OR [{ sourceRef: null }, { sourceRef: { not } }] — so a row with no sourceRef is kept",
    NULL_ARM.test(priW) && /c\.sourceRef === w\.excludeSourceRef/.test(memW));

  const SUBSTRING = /msisdn\.(?:includes|startsWith|endsWith|indexOf|search|match)\(/;
  ok("21.msisdn · ⛔ the number is matched EXACTLY in both twins — never a substring a masked role could walk digit by digit",
    priW.includes("{ msisdn: w.msisdn }") && memW.includes("c.msisdn !== w.msisdn") && !/msisdn:\s*\{/.test(priW) && !SUBSTRING.test(priW + memW));

  ok("21.name · a name goes through the shared grammar in both, and one SQL cannot express is NOTHING in both",
    priW.includes("queryToWhere(w.name, CONTACT_SEARCH)") && /if \(nameWhere === null\) return null;/.test(priW)
      && memW.includes("queryToWhere(w.name, CONTACT_SEARCH) === null") && memW.includes("matchesQuery(w.name, { displayName: c.displayName }, CONTACT_SEARCH)"));

  // ── EVERY AUDIENCE MEMBER GOES THROUGH THE ONE TRANSLATOR ──
  const memBlock = region(storeSrc, "\n  marketingContact: {");
  /** A memory member's text: from `    <name>: ` to the next member at the same indent (a one-line member has no brace). */
  const memberText = (block: string, name: string): string => {
    const at = block.indexOf(`\n    ${name}: `);
    if (at < 0) return "";
    const next = block.slice(at + 1).search(/\n {4}\w+\s*:/);
    return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
  };
  const MEMBERS = ["page", "countWhere", "summaryWhere", "walk"];
  const priRouted = MEMBERS.filter((m) => { const b = delegateMethod("marketingContact", m); return b.includes("toPrismaContactWhere(") && /=== null/.test(b); });
  const memRouted = MEMBERS.filter((m) => memberText(memBlock, m).includes("contactsMatching("));
  ok("21.route · page, countWhere, summaryWhere and walk read through the ONE translator in each twin (and Prisma honours its null)",
    priRouted.length === MEMBERS.length && memRouted.length === MEMBERS.length
      && /contactMatchesAudience\(c, w\)/.test(region(storeSrc, "function contactsMatching(")),
    `prisma=[${priRouted}] memory=[${memRouted}]`);

  // ── THE WINDOW: every Prisma read is bounded, and the walk is a keyset on id ──
  const callObjects = (src: string, opener: string): string[] => {
    const out: string[] = [];
    for (let at = src.indexOf(opener); at >= 0; at = src.indexOf(opener, at + 1)) {
      const open = src.indexOf("{", at);
      let depth = 0;
      for (let i = open; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) { out.push(src.slice(open, i + 1)); break; } }
      }
    }
    return out;
  };
  const pPage = delegateMethod("marketingContact", "page");
  const pWalk = delegateMethod("marketingContact", "walk");
  const finds = [...callObjects(pPage, "findMany("), ...callObjects(pWalk, "findMany(")];
  ok("21.window · every Prisma findMany in page and walk carries `take`, and the walk orders by id with `gt` — never `skip`",
    finds.length === 2 && finds.every((o) => /\btake:/.test(o))
      && /orderBy:\s*\{\s*id:\s*"asc"\s*\}/.test(pWalk) && /id:\s*\{\s*gt:\s*q\.afterId\s*\}/.test(pWalk) && !/\bskip\b/.test(pWalk)
      && /c\.id > afterId/.test(memberText(memBlock, "walk")) && /a\.id < b\.id/.test(memberText(memBlock, "walk")),
    `${finds.length} findMany call(s)`);

  // ── THE PAGE ORDER (moved from contacts-page §8/§8b) ──
  const mPage = memberText(memBlock, "page");
  ok("21.order · nameless rows sort LAST and every tie breaks on id, the same way in both twins",
    pPage.includes('nulls: "last"') && pPage.includes("{ id: q.dir }")
      && mPage.includes("a.displayName === null ? 1 : -1") && mPage.includes("sign * a.id.localeCompare(b.id)"));

  // ── 21.tags · the book's tag counts (U21's rail, decision M8) ──
  const pTags = delegateMethod("marketingContact", "tagCounts");
  const mTags = memberText(memBlock, "tagCounts");
  ok("21.tags.prisma · tagCounts counts each contact ONCE per tag in SQL, leaves the erased mark out NULL-safely, sorts ties in code-unit order and is bounded",
    /count\(distinct c\.id\)::int/.test(pTags) && /\$\{q\.excludeSourceRef\}::text is null/.test(pTags)
      && /is distinct from \$\{q\.excludeSourceRef\}::text/.test(pTags) && /collate "C"/.test(pTags) && /limit \$\{q\.limit\}/.test(pTags),
    `${pTags.length} chars`);
  ok("21.tags.memory · …and the memory twin mirrors it: once per contact, the mark skipped, the same bound",
    /new Set(?:<string>)?\(c\.tags\)/.test(mTags) && /c\.sourceRef === q\.excludeSourceRef/.test(mTags) && /\.slice\(0, q\.limit\)/.test(mTags),
    `${mTags.length} chars`);

  // ── 21.players · U38a · THE PLAYER ARM'S KEYSET READ — `user.playerWalk`, the resolver's other half (S10 2026-10-02) ──
  // ⭐ WHY HERE. The campaign audience is the book ∪ the players, walked by ONE function (`walkCampaignAudience`,
  // audience.ts); its player phase reads accounts through this member. Every suite runs on the memory twin, so a Prisma
  // where that forgot the role (staff texted), the `+255` prefix (an erased `erased:<id>` account or a foreign number
  // walked), the cursor's strict `gt` (a restart re-sending the cursor row) or its key-only `select` (names and 96 kB
  // avatars dragged through every chunk) is right in every test and wrong in production.
  {
    const NLP = String.fromCharCode(10);
    const flatP = (s: string) => s.split(String.fromCharCode(13)).join("").split(NLP).map((l) => l.trim()).join(" ");
    const userMem = region(storeSrc, `${NLP}  user: {`);
    const NEXT_MEMBER_P = new RegExp(NLP + " {4}[A-Za-z0-9_]+ *:");
    const memberOf = (block: string, name: string): string => {
      const at = block.indexOf(`${NLP}    ${name}: `);
      if (at < 0) return "";
      const next = block.slice(at + 1).search(NEXT_MEMBER_P);
      return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
    };
    const pWalkP = delegateMethod("user", "playerWalk");
    const mWalkP = memberOf(userMem, "playerWalk");
    const mMatch = region(storeSrc, "function playerMatchesWalk(");
    const storeImportP = dalSrc.slice(0, Math.max(0, dalSrc.indexOf('} from "./store";')));
    ok("21.players.named · playerWalk names PlayerWalkQuery and PlayerWalk in BOTH twins (never an inline literal) — exported by store.ts, imported by prisma-dal.ts; the query is EXACTLY afterId, limit, ndcs, createdFrom, createdBefore and a row EXACTLY id, phoneE164 (key-only)",
      mWalkP.includes("playerWalk: (q: PlayerWalkQuery): PlayerWalk =>") && pWalkP.includes("playerWalk: async (q: PlayerWalkQuery): Promise<PlayerWalk> =>")
        && storeImportP.includes("  PlayerWalkQuery,") && storeImportP.includes("  PlayerWalk,")
        && sameSet(storedKeys("PlayerWalkQuery"), ["afterId", "limit", "ndcs", "createdFrom", "createdBefore"])
        && sameSet(storedKeys("PlayerWalkRow"), ["id", "phoneE164"]) && sameSet(storedKeys("PlayerWalk"), ["rows", "nextAfterId"]),
      `memory ${mWalkP.length} chars · prisma ${pWalkP.length} chars · query [${storedKeys("PlayerWalkQuery")}] · row [${storedKeys("PlayerWalkRow")}]`);
    const fp = flatP(pWalkP);
    ok("21.players.prisma · ⛔ the Prisma walk is PLAYER accounts on a +255 number only, the prefixes as an any-of of `+255<ndc>` starts (an EMPTY list answered with nothing BEFORE any query — Prisma reads a nested `OR: []` as no condition, measured on Postgres), the window gte/lt on createdAt, a KEYSET `id gt` the cursor ordered by id asc with take limit + 1 and never skip, and a key-only select of the id and the number",
      fp.includes('const and: Prisma.UserWhereInput[] = [{ role: "PLAYER" }, { phoneE164: { startsWith: "+255" } }];')
        && fp.includes("if (q.ndcs !== null) and.push({ OR: q.ndcs.map((n) => ({ phoneE164: { startsWith: `+255${n}` } })) });")
        && fp.includes("if (q.createdFrom !== null) and.push({ createdAt: { gte: new Date(q.createdFrom) } });")
        && fp.includes("if (q.createdBefore !== null) and.push({ createdAt: { lt: new Date(q.createdBefore) } });")
        && fp.includes("if (q.afterId !== null) and.push({ id: { gt: q.afterId } });")
        && fp.includes('select: { id: true, phoneE164: true }, orderBy: { id: "asc" }, take: q.limit + 1,')
        && fp.includes("if (q.ndcs !== null && q.ndcs.length === 0) return { rows: [], nextAfterId: null };")
        && !pWalkP.includes("skip"),
      fp.slice(0, 260));
    const fm = flatP(mWalkP);
    const fmm = flatP(mMatch);
    ok("21.players.memory · …and the memory twin is the same where, predicate for predicate — role PLAYER, the +255 start, the prefixes checked !== null, the window, `id >` the cursor (never >=), code-unit order, limit + 1 — and hands back only the id and the number",
      fmm.includes('if (u.role !== "PLAYER") return false;') && fmm.includes('if (!u.phoneE164.startsWith("+255")) return false;')
        && fmm.includes("if (q.ndcs !== null && !q.ndcs.some((n) => u.phoneE164.startsWith(`+255${n}`))) return false;")
        && fmm.includes("if (q.createdFrom !== null && Date.parse(u.createdAt) < Date.parse(q.createdFrom)) return false;")
        && fmm.includes("if (q.createdBefore !== null && Date.parse(u.createdAt) >= Date.parse(q.createdBefore)) return false;")
        && fm.includes("(afterId === null || u.id > afterId)") && fm.includes(".sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))")
        && fm.includes(".slice(0, q.limit + 1)") && fm.includes("rows: shown.map((u) => ({ id: u.id, phoneE164: u.phoneE164 }))")
        && !/ndcs[?]?[.]length/.test(mMatch),
      `${fm.slice(0, 160)} | ${fmm.slice(0, 120)}`);
    ok("21.players.c1 · CONTROL · a where without the role, a cursor read >=, and a prefix list tested by .length each FAIL their matcher",
      !flatP('const and: Prisma.UserWhereInput[] = [{ phoneE164: { startsWith: "+255" } }];').includes('[{ role: "PLAYER" }, { phoneE164: { startsWith: "+255" } }]')
        && !"(afterId === null || u.id >= afterId)".includes("(afterId === null || u.id > afterId)")
        && /ndcs[?]?[.]length/.test("if (q.ndcs?.length && !q.ndcs.some((n) => u.phoneE164.startsWith(n))) return false;"));
  }

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  ok("21.c1 · CONTROL · a translator that never reads a key is reported",
    !reads("tags").test("  if (w.ids !== null) and.push({ id: { in: w.ids } });"));
  ok("21.c2 · CONTROL · a `.length` truthiness test is detected",
    /\.length\b/.test("  if (w.ids?.length && !w.ids.includes(c.id)) return false;"));
  ok("21.c3 · CONTROL · a bare Prisma `not` with no NULL arm fails 21.null",
    !NULL_ARM.test("  and.push({ sourceRef: { not: w.excludeSourceRef } });"));
  ok("21.c4 · CONTROL · a substring match on the number is detected",
    SUBSTRING.test("  if (w.msisdn !== null && !c.msisdn.startsWith(w.msisdn)) return false;"));
  const plantedSrc = storeSrc.replace("export type ContactAudienceWhere = {", "export type ContactAudienceWhere = {\n  plantedKey: string | null;");
  ok("21.c5 · CONTROL · a key ADDED to ContactAudienceWhere is seen by the parser and reported unread by both translators",
    storedKeys("ContactAudienceWhere", plantedSrc).includes("plantedKey") && !reads("plantedKey").test(priW) && !reads("plantedKey").test(memW));
  ok("21.c6 · CONTROL · the findMany extractor finds a call with no `take`",
    callObjects("x.findMany({ where, skip: 1 })", "findMany(").some((o) => !/\btake:/.test(o)));
}

/* ═══ §22 · The edit form's compare-and-set — updateIfUnchanged in both twins (U22, S10 2026-10-02; decision C7) ═══ */
{
  // ⭐ WHY THIS SECTION EXISTS. U22's edit is the book's first COMPARE-AND-SET: a row is written only if its
  // `updatedAt` still equals the instant the dialog was rendered with, so a second officer's stale save is REFUSED
  // instead of silently overwriting the first. Each half of that lives in a twin — the memory compare every suite
  // runs on, the Prisma `where` production runs on — and a twin that drops its half is "last write wins" on that
  // backend alone, with every behavioural suite green (they all run on memory).
  // ⛔ C25 · AND BOTH TWINS STAMP THE CALLER'S `at`. The column is `@updatedAt`: left to Prisma it would carry a
  // different instant from the memory twin's, and the NEXT compare would disagree between the backends.
  // ⛔ THE PATCH IS NARROW BY TYPE. `ContactEditPatch` has keys for the four fields and the stamp only, so neither twin
  // can write the number, `sourceRef` (an erasure mark must survive), the link or the caches.
  // The behaviour — two saves on one token, the second refused, the row holding the first — is `test:contacts-form`
  // §5, executed on the memory twin, with its own red plant.
  const memBlock = region(storeSrc, "\n  marketingContact: {");
  const memCas = region(memBlock, "updateIfUnchanged: (");
  const priCas = delegateMethod("marketingContact", "updateIfUnchanged");
  const EXPECTED_PATCH = ["displayName", "email", "notes", "tags", "updatedBy"];
  const patchKeys = storedKeys("ContactEditPatch");

  ok("22.0 · both twins implement updateIfUnchanged, and the parser sees ContactEditPatch's keys",
    memCas.length > 200 && priCas.length > 200 && patchKeys.length >= 4,
    `memory ${memCas.length} chars, prisma ${priCas.length} chars, patch [${patchKeys}]`);

  /** The memory compare: the row's stamp against the guard's, refusing as stale — BEFORE the map is written. */
  const MEM_COMPARE = /\brow\.updatedAt\b[^\n]{0,80}\bguard\.expectedUpdatedAt\b[^\n]{0,60}"stale"/;
  const memCompares = (body: string): boolean => {
    const m = MEM_COMPARE.exec(body);
    const setAt = body.indexOf(".set(");
    return m !== null && setAt > 0 && m.index < setAt;
  };
  ok("22.memory · the memory twin compares the row's updatedAt with guard.expectedUpdatedAt and returns stale BEFORE it writes",
    memCompares(memCas), memCas.replace(/\s+/g, " ").slice(0, 200));

  /** The Prisma compare: ONE conditional update whose where holds the id AND the guard's instant. */
  const PRI_WHERE = /\.update\(\{\s*where:\s*\{\s*id,\s*updatedAt:\s*new Date\(guard\.expectedUpdatedAt\)\s*\}/;
  ok("22.prisma · the Prisma twin's write is ONE update whose where holds both id and updatedAt: new Date(guard.expectedUpdatedAt), and a refused compare is read back as stale or not_found",
    PRI_WHERE.test(priCas) && /P2025/.test(priCas) && /"stale"/.test(priCas) && /"not_found"/.test(priCas),
    priCas.replace(/\s+/g, " ").slice(0, 220));

  /** The stamp: each twin writes the caller's `at`, by name. */
  const MEM_AT = /^\s*updatedAt:\s*at,/m;
  const PRI_AT = /data:\s*\{[\s\S]*?\bupdatedAt:\s*new Date\(at\)/;
  ok("22.at · ⛔ C25 · BOTH twins write the caller's `at` as updatedAt, explicitly — never left to @updatedAt",
    MEM_AT.test(memCas) && PRI_AT.test(priCas));

  /** A write that names what an edit may never touch. */
  const FORBIDDEN = /\b(?:msisdn|rawInput|sourceRef|userId|consentState|suppressedAt|importId|createdAt|createdBy|operator|ndc|source)\s*:/;
  /** A WHOLE-patch spread (`...patch,`) — the shape that lets any key the caller holds reach the row. `[...patch.tags]`
   *  copies one array and is not one. */
  const PATCH_SPREAD = /\.\.\.patch(?![.\w])/;
  ok("22.narrow · neither twin's write names the number, sourceRef, the link, the caches or the provenance, and neither spreads the patch",
    !FORBIDDEN.test(memCas) && !FORBIDDEN.test(priCas) && !PATCH_SPREAD.test(memCas) && !PATCH_SPREAD.test(priCas),
    `${(FORBIDDEN.exec(memCas) ?? FORBIDDEN.exec(priCas) ?? PATCH_SPREAD.exec(memCas) ?? PATCH_SPREAD.exec(priCas) ?? [""])[0]}`);

  ok("22.patch · ContactEditPatch's keys are EXACTLY the four fields and the stamp — displayName, email, notes, tags, updatedBy",
    sameSet(patchKeys, EXPECTED_PATCH), setDiff(EXPECTED_PATCH, patchKeys) || patchKeys.join(","));

  const MEM_SIG = /updateIfUnchanged: \(id: string, patch: ContactEditPatch, guard: ContactEditGuard, at: string\): ContactCasResult =>/;
  const PRI_SIG = /updateIfUnchanged: async \(id: string, patch: ContactEditPatch, guard: ContactEditGuard, at: string\): Promise<ContactCasResult> =>/;
  const storeImport = dalSrc.slice(0, Math.max(0, dalSrc.indexOf("} from \"./store\";")));
  const importsNamed = ["ContactEditPatch", "ContactEditGuard", "ContactCasResult"].every((t) => new RegExp(`\\b${t},`).test(storeImport));
  ok("22.named · both signatures use the NAMED ContactEditPatch, ContactEditGuard and ContactCasResult (never an inline literal) — exported by store.ts, imported by prisma-dal.ts",
    MEM_SIG.test(memCas) && PRI_SIG.test(priCas)
      && /export type ContactEditPatch = \{/.test(storeSrc) && /export type ContactEditGuard = \{/.test(storeSrc)
      && /export type ContactCasResult =/.test(storeSrc) && importsNamed,
    `memory ${MEM_SIG.test(memCas)} · prisma ${PRI_SIG.test(priCas)} · imported ${importsNamed}`);

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  // ⛔ Each proves the ASSERTION ABOVE IT can reject, on a literal that would otherwise pass.
  ok("22.c1 · CONTROL · a Prisma write whose where lost its updatedAt clause FAILS 22.prisma's matcher",
    !PRI_WHERE.test("const written = await pc().marketingContact.update({\n  where: { id },\n  data: { notes: patch.notes },\n});"));
  ok("22.c2 · CONTROL · a memory body with no compare FAILS 22.memory's matcher",
    !memCompares("const row = store.marketingContacts.get(id);\nif (!row) return { ok: false, reason: \"not_found\" };\nstore.marketingContacts.set(id, next);"));
  ok("22.c3 · CONTROL · a memory body that compares only AFTER it writes FAILS 22.memory's matcher — the order is the property",
    !memCompares("store.marketingContacts.set(id, next);\nif (Date.parse(row.updatedAt) !== Date.parse(guard.expectedUpdatedAt)) return { ok: false, reason: \"stale\" };"));
  const plantedPatchSrc = storeSrc.replace("export type ContactEditPatch = {", "export type ContactEditPatch = {\n  sourceRef: string | null;");
  ok("22.c4 · CONTROL · a key PLANTED in ContactEditPatch (sourceRef) is seen by the parser and fails 22.patch's exact set",
    storedKeys("ContactEditPatch", plantedPatchSrc).includes("sourceRef") && !sameSet(storedKeys("ContactEditPatch", plantedPatchSrc), EXPECTED_PATCH));
  ok("22.c5 · CONTROL · a write naming sourceRef, or spreading the whole patch, is caught by 22.narrow's matchers — and a copied array is not",
    FORBIDDEN.test("  sourceRef: patch.sourceRef,") && PATCH_SPREAD.test("const next = { ...row, ...patch, updatedAt: at };")
      && !PATCH_SPREAD.test("  tags: [...patch.tags],"));
  ok("22.c6 · CONTROL · a Prisma data block without the explicit stamp FAILS 22.at's matcher",
    !PRI_AT.test("data: {\n  displayName: patch.displayName,\n},"));
}

/* ═══ §23 · The bulk where-methods — set-based, through the ONE translator, in both twins (U23, S10 2026-10-02; decision C7) ═══ */
{
  // ⭐ WHY THIS SECTION EXISTS. U23's bulk bar tags, untags, lists and removes a whole audience in SET-BASED store writes —
  // `tagWhere`, `untagWhere`, `addWhere`, `removeWhere` — over the where `contactAudience` counts (reached only through
  // `contactAudienceWrites`, audience.ts). Every behavioural suite runs on the memory twin, so a Prisma member that forgot
  // the translator, the audience, the 20-tag cap or `skipDuplicates`, or a memory remove that forgot what Postgres's
  // cascade does for it, is right in every test and wrong in production — U18b's class, a memory index not maintained.
  // The behaviour — counts, the cascade, the freed index, the kept addedAt — is `test:contacts-bulk`, executed on the
  // memory twin with its own red plants; this section holds the TWO twins to one shape.
  const BULK = ["tagWhere", "untagWhere", "addWhere", "removeWhere"];
  const memBlock = region(storeSrc, "\n  marketingContact: {");
  const priBlock = region(dalSrc, "\n  marketingContact: {");
  /** One member's text in a twin's block: from `\n    <name>: ` to the next member at the same indent. */
  const memberAt = (block: string, name: string): string => {
    const at = block.indexOf(`\n    ${name}: `);
    if (at < 0) return "";
    const next = block.slice(at + 1).search(/\n {4}\w+\s*:/);
    return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
  };
  const mem = Object.fromEntries(BULK.map((m) => [m, memberAt(memBlock, m)])) as Record<string, string>;
  const pri = Object.fromEntries(BULK.map((m) => [m, memberAt(priBlock, m)])) as Record<string, string>;

  ok("23.0 · both twins implement tagWhere, untagWhere, addWhere and removeWhere on the contact book",
    BULK.every((m) => mem[m].length > 80 && pri[m].length > 80),
    BULK.map((m) => `${m} ${mem[m].length}/${pri[m].length}`).join(" · "));

  // ── ONE TRANSLATOR, AND ITS NULL ──
  const memRouted = BULK.filter((m) => /for \(const c of contactsMatching\(w\)\)/.test(mem[m]));
  const priRouted = BULK.filter((m) => /const where = toPrismaContactWhere\(w\);\s*if \(where === null\) return out;/.test(pri[m]));
  ok("23.route · every bulk member reads its rows through the ONE translator in each twin — contactsMatching in memory, toPrismaContactWhere in Prisma, whose null (a name SQL cannot express) writes NOTHING",
    memRouted.length === BULK.length && priRouted.length === BULK.length, `memory [${memRouted}] prisma [${priRouted}]`);

  // ── ⛔ THE AUDIENCE BOUNDS EVERY PRISMA WRITE — a walk or a delete that dropped `where` would act on the whole book ──
  const SCOPE: Record<string, RegExp> = {
    tagWhere: /\[where, \{ NOT: \{ tags: \{ has: tag \} \} \}\]/,
    untagWhere: /\[where, \{ tags: \{ has: tag \} \}\]/,
    addWhere: /where: afterId === null \? where : \{ AND: \[where, \{ id: \{ gt: afterId \} \}\] \}/,
    removeWhere: /deleteMany\(\{ where \}\)/,
  };
  const unscoped = BULK.filter((m) => !SCOPE[m].test(pri[m]));
  ok("23.scope.prisma · ⛔ each Prisma bulk member walks or deletes only INSIDE the translated where — never every row that carries a tag, never the whole book",
    unscoped.length === 0, `unscoped [${unscoped}]`);

  // ── THE NAMED TYPES ──
  const SIG_MEM: Record<string, RegExp> = {
    tagWhere: /tagWhere: \(w: ContactAudienceWhere, tag: string, maxTags: number, stamp: ContactBulkStamp\): ContactBulkCount =>/,
    untagWhere: /untagWhere: \(w: ContactAudienceWhere, tag: string, stamp: ContactBulkStamp\): ContactBulkCount =>/,
    addWhere: /addWhere: \(w: ContactAudienceWhere, listId: string, stamp: ContactBulkStamp\): ContactBulkCount =>/,
    removeWhere: /removeWhere: \(w: ContactAudienceWhere\): ContactBulkCount =>/,
  };
  const SIG_PRI: Record<string, RegExp> = {
    tagWhere: /tagWhere: async \(w: ContactAudienceWhere, tag: string, maxTags: number, stamp: ContactBulkStamp\): Promise<ContactBulkCount> =>/,
    untagWhere: /untagWhere: async \(w: ContactAudienceWhere, tag: string, stamp: ContactBulkStamp\): Promise<ContactBulkCount> =>/,
    addWhere: /addWhere: async \(w: ContactAudienceWhere, listId: string, stamp: ContactBulkStamp\): Promise<ContactBulkCount> =>/,
    removeWhere: /removeWhere: async \(w: ContactAudienceWhere\): Promise<ContactBulkCount> =>/,
  };
  const storeImport = dalSrc.slice(0, Math.max(0, dalSrc.indexOf("} from \"./store\";")));
  const named = BULK.filter((m) => SIG_MEM[m].test(mem[m]) && SIG_PRI[m].test(pri[m]));
  ok("23.named · all four signatures use the NAMED ContactAudienceWhere, ContactBulkStamp and ContactBulkCount (never an inline literal) — exported by store.ts, imported by prisma-dal.ts",
    named.length === BULK.length && /export type ContactBulkStamp = \{/.test(storeSrc) && /export type ContactBulkCount = \{/.test(storeSrc)
      && /\bContactBulkStamp,/.test(storeImport) && /\bContactBulkCount,/.test(storeImport),
    `named [${named}]`);
  const COUNT_KEYS = ["matched", "changed", "unchanged", "full"];
  const STAMP_KEYS = ["at", "by"];
  ok("23.count · ContactBulkCount is EXACTLY matched, changed, unchanged, full, and ContactBulkStamp EXACTLY at, by — the store counts, and nothing else rides along",
    sameSet(storedKeys("ContactBulkCount"), COUNT_KEYS) && sameSet(storedKeys("ContactBulkStamp"), STAMP_KEYS),
    `${setDiff(COUNT_KEYS, storedKeys("ContactBulkCount")) || storedKeys("ContactBulkCount").join(",")} | ${storedKeys("ContactBulkStamp").join(",")}`);

  // ── TAG: a carried tag is unchanged, the cap is kept, the caller stamps — in BOTH ──
  const memTagOrder = mem.tagWhere.indexOf("if (c.tags.includes(tag)) { out.unchanged++; continue; }");
  const memCapAt = mem.tagWhere.indexOf("if (c.tags.length >= maxTags) { out.full++; continue; }");
  ok("23.tag.memory · the memory tag leaves a carrier UNCHANGED, refuses a row at maxTags as FULL (C11), appends once and stamps the caller's at and by",
    memTagOrder > 0 && memCapAt > memTagOrder && mem.tagWhere.includes("tags: [...c.tags, tag], updatedAt: stamp.at, updatedBy: stamp.by"),
    `${memTagOrder}/${memCapAt}`);
  ok("23.tag.prisma · the Prisma tag walks only rows lacking the tag and writes ONE statement per chunk that re-checks the tag is absent AND the row holds fewer than maxTags, stamping the caller's at and by",
    pri.tagWhere.includes('array_append("tags", ${tag}::text)') && pri.tagWhere.includes('not (${tag}::text = any("tags"))')
      && pri.tagWhere.includes('cardinality("tags") < ${maxTags}::int')
      && pri.tagWhere.includes('"updatedAt" = ${stamp.at}::timestamptz') && pri.tagWhere.includes('"updatedBy" = ${stamp.by}::text'),
    `${pri.tagWhere.length} chars`);

  // ── UNTAG ──
  ok("23.untag · the untag changes only carriers, in both twins: the memory twin filters the one tag and stamps; the Prisma twin array_removes it with the carrier re-checked in the same statement",
    mem.untagWhere.includes("if (!c.tags.includes(tag)) { out.unchanged++; continue; }")
      && mem.untagWhere.includes("tags: c.tags.filter((t) => t !== tag), updatedAt: stamp.at, updatedBy: stamp.by")
      && pri.untagWhere.includes('array_remove("tags", ${tag}::text)') && pri.untagWhere.includes('and ${tag}::text = any("tags")')
      && pri.untagWhere.includes('"updatedAt" = ${stamp.at}::timestamptz'),
    `${mem.untagWhere.length}/${pri.untagWhere.length} chars`);

  // ── ADD TO A LIST: an existing member keeps its addedAt; a list that does not exist is refused ──
  const memHasAt = mem.addWhere.indexOf("if (store.contactListMembers.has(k)) { out.unchanged++; continue; }");
  const memSetAt = mem.addWhere.indexOf("store.contactListMembers.set(k,");
  ok("23.add.memory · the memory add keeps an existing member UNTOUCHED (its original addedAt) — asked BEFORE it writes — stamps a new one with the caller's at, and refuses a list that does not exist, as the foreign key does",
    memHasAt > 0 && memSetAt > memHasAt && mem.addWhere.includes("addedAt: stamp.at, addedBy: stamp.by")
      && /if \(!store\.contactLists\.has\(listId\)\) throw/.test(mem.addWhere),
    `${memHasAt}/${memSetAt}`);
  ok("23.add.prisma · the Prisma add is createMany with skipDuplicates (never an upsert, so an existing member keeps its addedAt), refuses a missing list first, and retries a chunk one row at a time on P2003",
    pri.addWhere.includes("createMany({ data: rows, skipDuplicates: true })") && !/\bupsert\b/.test(pri.addWhere)
      && /contactList\.findUnique\(\{ where: \{ id: listId \}/.test(pri.addWhere) && /if \(!list\) throw/.test(pri.addWhere)
      && /"P2003"/.test(pri.addWhere) && pri.addWhere.includes("createMany({ data: [row], skipDuplicates: true })")
      && pri.addWhere.includes("addedAt: new Date(stamp.at), addedBy: stamp.by"),
    `${pri.addWhere.length} chars`);

  // ── REMOVE: the cascade and the index, emulated in memory; evidence untouched in both ──
  ok("23.remove.memory.cascade · ⛔ the memory remove deletes the removed contact's list memberships — what Postgres's ON DELETE CASCADE does for the other twin",
    mem.removeWhere.includes("for (const [k, m] of store.contactListMembers) if (m.contactId === c.id) store.contactListMembers.delete(k);"),
    `${mem.removeWhere.length} chars`);
  ok("23.remove.memory.index · ⛔ the memory remove deletes the row AND frees the unique index it held (only while it still points at that row), so the number can be added again",
    mem.removeWhere.includes("store.marketingContacts.delete(c.id)")
      && mem.removeWhere.includes("if (store.contactsByMsisdn.get(c.msisdn) === c.id) store.contactsByMsisdn.delete(c.msisdn);"),
    `${mem.removeWhere.length} chars`);
  const EVIDENCE = /\b(?:suppressions?|messagingConsents?)\b/;
  ok("23.remove.evidence · ⛔ neither twin's remove touches the consent ledger or the stop list — they are keyed by NUMBER, and removing a book row never deletes evidence",
    !EVIDENCE.test(mem.removeWhere) && !EVIDENCE.test(pri.removeWhere) && /deleteMany\(\{ where \}\)/.test(pri.removeWhere),
    `${(EVIDENCE.exec(mem.removeWhere) ?? EVIDENCE.exec(pri.removeWhere) ?? [""])[0]}`);

  // ── THE WINDOW: every Prisma walk is a bounded keyset on id ──
  const walks = ["tagWhere", "untagWhere", "addWhere"];
  const unbounded = walks.filter((m) => !(pri[m].includes("take: CONTACT_BULK_CHUNK") && pri[m].includes('orderBy: { id: "asc" }')
    && /id: \{ gt: afterId \}/.test(pri[m]) && !/\bskip\b/.test(pri[m])));
  ok("23.window · every Prisma bulk walk is a KEYSET on id — `take` bounded by CONTACT_BULK_CHUNK, ordered by id, `gt` the cursor, never `skip`",
    unbounded.length === 0 && /const CONTACT_BULK_CHUNK = \d+;/.test(dalSrc), `unbounded [${unbounded}]`);

  // ── ⭐ vb7 (review m1) · THE BOUND REMOVE — a bulk Remove over a filter takes its confirmed ids ALL OR NOTHING. The
  // behaviour (one call, nobody removed on a fault, the rolled-back audit row) is `test:contacts-bulk` B22, on the memory
  // twin; this holds the two twins to one shape — the Prisma twin's ONE transaction above all. ──
  const memBound = memberAt(memBlock, "removeBoundWhere");
  const priBound = memberAt(priBlock, "removeBoundWhere");
  ok("23.bound.memory · ⛔ vb7 · the memory bound remove goes THROUGH removeWhere — the twin's one contact delete, with its cascade, freed index and SET NULL — over the audience narrowed to the given ids (∩ any ids it already holds), never deleting a row itself",
    /removeBoundWhere: \(w: ContactAudienceWhere, ids: readonly string\[\]\): ContactBulkCount =>/.test(memBound)
      && memBound.includes("memoryDb.marketingContact.removeWhere({ ...w, ids: w.ids === null ? [...ids] : w.ids.filter((id) => ids.includes(id)) })")
      && !/\.delete\(/.test(memBound),
    `${memBound.length} chars`);
  ok("23.bound.prisma · ⛔ vb7 · the Prisma bound remove runs EVERY chunk inside ONE interactive transaction with a timeout — each chunk one count and one deleteMany on the transaction's own client, inside the translated where AND that chunk's ids — so a fault at any chunk removes nobody; a where SQL cannot express writes nothing",
    /removeBoundWhere: async \(w: ContactAudienceWhere, ids: readonly string\[\]\): Promise<ContactBulkCount> =>/.test(priBound)
      && /const where = toPrismaContactWhere\(w\);\s*if \(where === null \|\| ids\.length === 0\) return out;/.test(priBound)
      && /return pc\(\)\.\$transaction\(async \(tx\) => \{/.test(priBound)
      && priBound.includes("{ AND: [where, { id: { in: ids.slice(i, i + CONTACT_BULK_CHUNK) } }] }")
      && priBound.includes("await tx.marketingContact.count({ where: scoped })") && priBound.includes("await tx.marketingContact.deleteMany({ where: scoped })")
      && !/pc\(\)\.marketingContact\./.test(priBound)
      && /\}, \{ timeout: CONTACT_BULK_TX_TIMEOUT_MS, maxWait: [0-9_]+ \}\);/.test(priBound) && /const CONTACT_BULK_TX_TIMEOUT_MS = [0-9_]+;/.test(dalSrc),
    `${priBound.length} chars`);
  ok("23.bound.evidence · ⛔ vb7 · neither bound remove touches the consent ledger or the stop list — removing book rows never deletes evidence",
    memBound.length > 80 && priBound.length > 80 && !EVIDENCE.test(memBound) && !EVIDENCE.test(priBound),
    `${memBound.length}/${priBound.length} chars`);

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  // ⛔ Each proves the ASSERTION ABOVE IT can reject, on a literal that would otherwise pass.
  const plantedCount = storeSrc.replace("export type ContactBulkCount = {", "export type ContactBulkCount = {\n  plantedKey: number;");
  ok("23.c1 · CONTROL · a key PLANTED in ContactBulkCount is seen by the parser and fails 23.count's exact set",
    storedKeys("ContactBulkCount", plantedCount).includes("plantedKey") && !sameSet(storedKeys("ContactBulkCount", plantedCount), COUNT_KEYS));
  ok("23.c2 · CONTROL · a memory remove without the cascade line FAILS 23.remove.memory.cascade's needle",
    !"for (const c of contactsMatching(w)) { store.marketingContacts.delete(c.id); }".includes("for (const [k, m] of store.contactListMembers) if (m.contactId === c.id) store.contactListMembers.delete(k);"));
  ok("23.c3 · CONTROL · a Prisma tag statement without the cap FAILS 23.tag.prisma's needle",
    !'update "MarketingContact" set "tags" = array_append("tags", ${tag}::text) where "id" = any(${ids}::text[])'.includes('cardinality("tags") < ${maxTags}::int'));
  ok("23.c4 · CONTROL · an upsert in the Prisma add IS seen, and a createMany without skipDuplicates fails the needle",
    /\bupsert\b/.test("await pc().contactListMember.upsert({ where, create, update: {} });")
      && !"createMany({ data: rows })".includes("createMany({ data: rows, skipDuplicates: true })"));
  ok("23.c6 · CONTROL · vb7 · a chunk deleted through pc() — OUTSIDE the transaction — FAILS 23.bound.prisma's client check, and a transaction with no timeout FAILS its option matcher",
    /pc\(\)\.marketingContact\./.test("out.changed += (await pc().marketingContact.deleteMany({ where: scoped })).count;")
      && !/\}, \{ timeout: CONTACT_BULK_TX_TIMEOUT_MS, maxWait: [0-9_]+ \}\);/.test("      });"));
  ok("23.c5 · CONTROL · a member that builds an inline where — not the translator — FAILS 23.route's matcher, and a walk without the audience FAILS 23.scope's",
    !/const where = toPrismaContactWhere\(w\);\s*if \(where === null\) return out;/.test("const where = { msisdn: w.msisdn };\n      if (where === null) return out;")
      && !SCOPE.untagWhere.test("const carrying: Prisma.MarketingContactWhereInput[] = [{ tags: { has: tag } }];"));
}

/* ═══ §24 · Contact import staging — ContactImport / ContactImportRow in both twins (U29, S10 2026-10-02; decision X1) ═══ */
{
  // ⭐ WHY THIS SECTION EXISTS. U29's staging is the import's resume point: a run row that says how far staging and the
  // commit have reached, and the file's records. Every behavioural suite runs on the MEMORY twin, so a key one mapper
  // drops, a compare-and-set one twin forgets, or a walk that pages by offset is right in every test and wrong in
  // production — a commit that resumes from the file's first row, two tabs that both stage one batch, a row skipped
  // because erasure deleted the one before it. This section holds the TWO twins to one shape. The behaviour — the
  // resume, the race, the sweep — is `test:contacts-staging` (memory twin, in-process red) and, on PostgreSQL 18.3,
  // `test:contacts-staging-db`. U31/U32/U33's members join this section as sub-assertions (X1).
  const iKeys = storedKeys("StoredContactImport");
  const rKeys = storedKeys("StoredContactImportRow");
  const iRead = region(dalSrc, "function toStoredContactImport(");
  const rRead = region(dalSrc, "function toStoredContactImportRow(");
  const priRun = region(dalSrc, "\n  contactImport: {");
  const priRow = region(dalSrc, "\n  contactImportRow: {");
  const memRun = region(storeSrc, "\n  contactImport: {");
  const memRow = region(storeSrc, "\n  contactImportRow: {");
  /** One member's text in a twin's block: from `\n    <name>: ` to the next member at the same indent. */
  const memberAt = (block: string, name: string): string => {
    const at = block.indexOf(`\n    ${name}: `);
    if (at < 0) return "";
    const next = block.slice(at + 1).search(/\n {4}\w+\s*:/);
    return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
  };
  /** Each `<opener>{ … }` object literal in a source, brace-matched from the first brace after the opener. */
  const objectsAfter = (src: string, opener: string): string[] => {
    const out: string[] = [];
    for (let at = src.indexOf(opener); at >= 0; at = src.indexOf(opener, at + 1)) {
      const open = src.indexOf("{", at);
      let depth = 0;
      for (let i = open; i >= 0 && i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) { out.push(src.slice(open, i + 1)); break; } }
      }
    }
    return out;
  };

  const iCreate = memberAt(priRun, "create");
  const pStage = memberAt(priRun, "stageRows");
  const mStage = memberAt(memRun, "stageRows");
  ok("24.0 · the parser sees StoredContactImport's fields (every agreed column, X2) and StoredContactImportRow's",
    iKeys.length >= 26 && rKeys.length >= 14, `run ${iKeys.length}: ${iKeys.join(",")} · row ${rKeys.length}: ${rKeys.join(",")}`);
  ok("24.0b · both read mappers, the Prisma create and both stageRows resolve, and both namespaces exist in both twins",
    iRead.length > 600 && rRead.length > 300 && iCreate.length > 600 && pStage.length > 600 && mStage.length > 600
      && memRun.length > 600 && memRow.length > 300 && priRow.length > 300,
    `mappers ${iRead.length}/${rRead.length} · create ${iCreate.length} · stageRows ${pStage.length}/${mStage.length}`);
  for (const k of iKeys) {
    ok(`24.read · toStoredContactImport maps "${k}" from the row`, readsFrom(iRead, k, "r"));
    ok(`24.create · contactImport.create writes "${k}"`, writesKey(iCreate, k));
  }
  for (const k of rKeys) ok(`24.read.row · toStoredContactImportRow maps "${k}" from the row`, readsFrom(rRead, k, "w"));

  // ── A ROW IS STAGED UNSETTLED, AND WHOLE ──
  const SETTLE_ONLY = ["outcome", "outcomeReason"];
  const stageData = objectsAfter(pStage, "createMany(").join("\n");
  for (const k of rKeys.filter((x) => !SETTLE_ONLY.includes(x))) {
    ok(`24.stage.row · stageRows' createMany writes "${k}"`, writesKey(stageData, k));
  }
  ok("24.stage.nosettle · ⛔ a row is staged UNSETTLED: the Prisma createMany writes no outcome and no outcomeReason, and the memory twin stores both as null — a row staged pre-settled would skip the commit loop",
    stageData.length > 200 && SETTLE_ONLY.every((k) => !writesKey(stageData, k)) && mStage.includes("outcome: null, outcomeReason: null"),
    `${stageData.length} chars of createMany data`);

  // ── ⭐ THE STAGING COMPARE-AND-SET, IN BOTH TWINS ──
  const CAS_WHERE = /where:\s*\{\s*id:\s*b\.importId,\s*status:\s*"STAGING",\s*stagedThrough:\s*b\.from - 1\s*\}/;
  const updAt = pStage.indexOf("updateMany(");
  const casAt = pStage.search(CAS_WHERE);
  const insAt = pStage.indexOf("createMany(");
  ok("24.cas.stage.prisma · ⭐ stageRows is ONE interactive transaction, its timeout and maxWait set, whose FIRST write is the compare-and-set — updateMany where { id, status STAGING, stagedThrough: b.from - 1 } — and whose rows are inserted only after it, only when it counted 1",
    /\$transaction\(async \(tx\) =>/.test(pStage) && /timeout:\s*15_000/.test(pStage) && /maxWait:\s*5_000/.test(pStage)
      && updAt > 0 && casAt > updAt && insAt > casAt && /if \(moved\.count !== 1\)/.test(pStage),
    `updateMany@${updAt} where@${casAt} createMany@${insAt}`);
  const mStatusAt = mStage.indexOf('if (run.status !== "STAGING")');
  const mCasAt = mStage.indexOf("if (run.stagedThrough !== b.from - 1)");
  const mRowsAt = mStage.indexOf("rows.set(");
  const mRunAt = mStage.indexOf("store.contactImports.set(");
  ok("24.cas.stage.memory · ⭐ the memory stageRows refuses unless the run is STAGING and stagedThrough is exactly b.from - 1 — both asked BEFORE any row or the run is written",
    mStatusAt > 0 && mCasAt > 0 && mRowsAt > Math.max(mStatusAt, mCasAt) && mRunAt > Math.max(mStatusAt, mCasAt),
    `status@${mStatusAt} cas@${mCasAt} rows@${mRowsAt} run@${mRunAt}`);
  ok("24.cas.lines · one record per file line holds across the run in both twins — the memory twin refuses a line already staged as duplicate_line, the Prisma twin turns the unique index's P2002 into the same answer",
    /if \(lines\.has\(row\.line\)\) return \{ ok: false, reason: "duplicate_line", run \};/.test(mStage)
      && /"P2002"/.test(pStage) && /reason: "duplicate_line"/.test(pStage));

  // ── THE STATUS COMPARE-AND-SET ──
  const pTrans = memberAt(priRun, "transition");
  const mTrans = memberAt(memRun, "transition");
  const mFromAt = mTrans.indexOf("!t.from.includes(run.status)");
  ok("24.cas.transition · a status moves by compare-and-set in both twins: the Prisma where holds status in t.from and the sweep's idle bound, counting 1 or answering null; the memory twin asks the same two BEFORE it writes",
    /status:\s*\{\s*in:\s*t\.from as never\s*\}/.test(pTrans) && /updatedAt:\s*\{\s*lt:\s*new Date\(t\.updatedBefore\)\s*\}/.test(pTrans)
      && /if \(moved\.count !== 1\) return null;/.test(pTrans)
      && mFromAt > 0 && mFromAt < mTrans.indexOf("store.contactImports.set(")
      && /Date\.parse\(run\.updatedAt\) < Date\.parse\(t\.updatedBefore\)/.test(mTrans),
    `${pTrans.length}/${mTrans.length} chars`);
  ok("24.transition.stamps · both twins stamp finishedAt on DONE and CANCELLED, record who paused and when on PAUSED, and clear both on a resume from PAUSED",
    /t\.to === "DONE" \|\| t\.to === "CANCELLED" \? \{ finishedAt: new Date\(t\.at\) \}/.test(pTrans)
      && /t\.to === "PAUSED" \? \{ pausedAt: new Date\(t\.at\), pausedBy: t\.by \}/.test(pTrans)
      && /const resumed = t\.to === "COMMITTING" && t\.from\.includes\("PAUSED"\);/.test(pTrans)
      && /finishedAt: t\.to === "DONE" \|\| t\.to === "CANCELLED" \? t\.at : run\.finishedAt,/.test(mTrans)
      && /pausedBy: t\.to === "PAUSED" \? t\.by : resumed \? null : run\.pausedBy,/.test(mTrans)
      && /const resumed = t\.to === "COMMITTING" && t\.from\.includes\("PAUSED"\);/.test(mTrans));

  // ── ⭐ THE KEYSET, NEVER AN OFFSET ──
  const pAfter = memberAt(priRow, "after");
  const mAfter = memberAt(memRow, "after");
  ok("24.keyset.prisma · ⭐ after() is a KEYSET on ordinal — where ordinal gt w.afterOrdinal, ordered ordinal asc, take bounded by CONTACT_IMPORT_ROW_PAGE_MAX — and never skip",
    /where:\s*\{\s*importId:\s*w\.importId,\s*ordinal:\s*\{\s*gt:\s*w\.afterOrdinal\s*\}\s*\}/.test(pAfter)
      && /orderBy:\s*\{\s*ordinal:\s*"asc"\s*\}/.test(pAfter)
      && /take:\s*Math\.max\(0, Math\.min\(w\.limit, CONTACT_IMPORT_ROW_PAGE_MAX\)\)/.test(pAfter) && !/\bskip\b/.test(pAfter),
    pAfter.replace(/\s+/g, " ").slice(0, 200));
  ok("24.keyset.memory · …and the memory after() filters row.ordinal > w.afterOrdinal, sorts by ordinal and slices only from 0 — never an offset",
    mAfter.includes(".filter((row) => row.ordinal > w.afterOrdinal)") && mAfter.includes(".sort((a, b) => a.ordinal - b.ordinal)")
      && mAfter.includes(".slice(0, Math.max(0, Math.min(w.limit, CONTACT_IMPORT_ROW_PAGE_MAX)))") && !/\.slice\(w\./.test(mAfter) && !/\bindex\b/.test(mAfter),
    mAfter.replace(/\s+/g, " ").slice(0, 200));
  ok("24.keyset.bound · both twins bound a page at the same 2,000 rows",
    /const CONTACT_IMPORT_ROW_PAGE_MAX = 2000;/.test(dalSrc) && /export const CONTACT_IMPORT_ROW_PAGE_MAX = 2000;/.test(storeSrc));

  // ── ⛔ NO STORED COUNTER ──
  const pTotals = memberAt(priRun, "totals");
  const mTotals = memberAt(memRun, "totals");
  const TOTAL_KEYS = ["staged", "unreadable", "pending", "create", "update", "keep", "fail"];
  ok("24.totals · ⛔ NO STORED COUNTER (OD26): the Prisma totals is a groupBy on outcome plus one count — never findMany — the memory twin counts the run's rows, neither reads a figure off the run, and ContactImportTotals is EXACTLY the seven counts",
    /contactImportRow\.groupBy\(\{\s*by:\s*\["outcome"\]/.test(pTotals) && /contactImportRow\.count\(/.test(pTotals) && !/findMany/.test(pTotals)
      && /store\.contactImportRows\.get\(importId\)/.test(mTotals) && !/stagedThrough|totalRows|contactImports\.get/.test(pTotals + mTotals)
      && sameSet(storedKeys("ContactImportTotals"), TOTAL_KEYS),
    setDiff(TOTAL_KEYS, storedKeys("ContactImportTotals")) || `${pTotals.length}/${mTotals.length} chars`);

  // ── create NEVER UPSERTS ──
  const mCreate = memberAt(memRun, "create");
  ok("24.unique.prisma · contactImport.create turns P2002 into null and does NOT upsert",
    /P2002/.test(iCreate) && /return null/.test(iCreate) && !mentions(iCreate, "upsert"));
  ok("24.unique.memory · the memory create refuses an id already held, and does not overwrite",
    /if \(store\.contactImports\.has\(row\.id\)\) return null;/.test(mCreate), `${mCreate.length} chars`);

  // ── THE DELETES: unsettled only, every run by number, a purged run's rows with it ──
  const pUnsettled = memberAt(priRow, "deleteUnsettled");
  const mUnsettled = memberAt(memRow, "deleteUnsettled");
  ok("24.unsettled · deleteUnsettled deletes ONLY rows no commit has settled — outcome: null in Prisma, row.outcome === null in memory",
    /deleteMany\(\{\s*where:\s*\{\s*importId,\s*outcome:\s*null\s*\}\s*\}\)/.test(pUnsettled) && /if \(row\.outcome === null\)/.test(mUnsettled));
  const pByNumber = memberAt(priRow, "deleteByMsisdn");
  const mByNumber = memberAt(memRow, "deleteByMsisdn");
  ok("24.erasure · deleteByMsisdn reaches EVERY run in both twins — deleteMany where msisdn, and the memory twin walks every run's rows",
    /deleteMany\(\{\s*where:\s*\{\s*msisdn\s*\}\s*\}\)/.test(pByNumber) && /for \(const rows of store\.contactImportRows\.values\(\)\)/.test(mByNumber)
      && /row\.msisdn === msisdn/.test(mByNumber));
  const pPurge = memberAt(priRun, "purgeFinished");
  const mPurge = memberAt(memRun, "purgeFinished");
  ok("24.purge.prisma · purgeFinished deletes only DONE or CANCELLED runs finished before the bound, a bounded batch at a time, the FK cascade taking their rows",
    (pPurge.match(/status:\s*\{\s*in:\s*\["DONE", "CANCELLED"\]\s*\}/g) ?? []).length === 2
      && (pPurge.match(/finishedAt:\s*\{\s*lt:\s*new Date\(q\.finishedBefore\)\s*\}/g) ?? []).length === 2 && /take:\s*Math\.max\(0, q\.limit\)/.test(pPurge),
    `${pPurge.length} chars`);
  ok("24.purge.memory.cascade · ⭐ the memory purgeFinished deletes the purged runs' ROWS too — the ON DELETE CASCADE Postgres does for the other twin",
    /store\.contactImports\.delete\(r\.id\);/.test(mPurge) && /store\.contactImportRows\.delete\(r\.id\);/.test(mPurge)
      && /r\.status === "DONE" \|\| r\.status === "CANCELLED"/.test(mPurge), `${mPurge.length} chars`);

  // ── THE OPEN RUN: the same four statuses, the earliest first ──
  const pOpen = memberAt(priRun, "findOpenFor");
  const mOpen = memberAt(memRun, "findOpenFor");
  ok("24.open · findOpenFor reads the same four OPEN statuses in both twins, earliest first, so two tabs that raced to open one file converge on one run",
    /status:\s*\{\s*in:\s*\["STAGING", "STAGED", "COMMITTING", "PAUSED"\]\s*\}/.test(pOpen) && /orderBy:\s*\[\{\s*createdAt:\s*"asc"\s*\},\s*\{\s*id:\s*"asc"\s*\}\]/.test(pOpen)
      && /r\.status === "STAGING" \|\| r\.status === "STAGED" \|\| r\.status === "COMMITTING" \|\| r\.status === "PAUSED"/.test(mOpen)
      && /Date\.parse\(a\.createdAt\) - Date\.parse\(b\.createdAt\)/.test(mOpen));

  // ── BOTH TWINS, THE SAME MEMBERS, THE SAME NAMED SIGNATURES ──
  const members = (block: string): string[] => Array.from(block.matchAll(/^\s{4}(\w+)\s*:/gm)).map((m) => m[1]).sort();
  ok("24.parity.contactImport · both twins expose the same contactImport members",
    members(priRun).length >= 8 && members(priRun).join(",") === members(memRun).join(","), `prisma=[${members(priRun)}] memory=[${members(memRun)}]`);
  ok("24.parity.contactImportRow · …and the same contactImportRow members",
    members(priRow).length >= 4 && members(priRow).join(",") === members(memRow).join(","), `prisma=[${members(priRow)}] memory=[${members(memRow)}]`);
  const SIGS: Array<[string, string, string]> = [
    ["create", "(row: StoredContactImport): StoredContactImport | null =>", "(row: StoredContactImport): Promise<StoredContactImport | null> =>"],
    ["listIdle", "(q: ContactImportIdleQuery): StoredContactImport[] =>", "(q: ContactImportIdleQuery): Promise<StoredContactImport[]> =>"],
    ["transition", "(t: ContactImportTransition): StoredContactImport | null =>", "(t: ContactImportTransition): Promise<StoredContactImport | null> =>"],
    ["stageRows", "(b: ContactImportStageBatch): ContactImportStageResult =>", "(b: ContactImportStageBatch): Promise<ContactImportStageResult> =>"],
    ["totals", "(importId: string): ContactImportTotals =>", "(importId: string): Promise<ContactImportTotals> =>"],
    ["purgeFinished", "(q: ContactImportFinishedPurge): number =>", "(q: ContactImportFinishedPurge): Promise<number> =>"],
    ["after", "(w: ContactImportRowWindow): StoredContactImportRow[] =>", "(w: ContactImportRowWindow): Promise<StoredContactImportRow[]> =>"],
  ];
  const unnamed = SIGS.filter(([name, mem, pri]) => {
    const m = memberAt(name === "after" ? memRow : memRun, name);
    const p = memberAt(name === "after" ? priRow : priRun, name);
    return !m.includes(`${name}: ${mem}`) || !p.includes(`${name}: async ${pri}`);
  }).map(([name]) => name);
  const stagingImport = /import type \{[^}]*\bContactImportStageBatch\b[^}]*\} from "\.\/store";/.test(dalSrc);
  ok("24.named · every staging signature uses its NAMED type in both twins (never an inline literal) — declared in store.ts, imported by prisma-dal.ts",
    unnamed.length === 0 && stagingImport && /export type ContactImportStageBatch = \{/.test(storeSrc) && /export type ContactImportTransition = \{/.test(storeSrc),
    `unnamed [${unnamed}] · imported ${stagingImport}`);

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  // ⛔ Each proves the ASSERTION ABOVE IT can reject, on a literal that would otherwise pass.
  ok("24.c1 · CONTROL · `committedThrough: 0,` in a read mapper does NOT count as reading committedThrough from the row",
    !readsFrom("    stagedThrough: r.stagedThrough,\n    committedThrough: 0,", "committedThrough", "r"));
  ok("24.c2 · CONTROL · a stageRows where WITHOUT stagedThrough is NOT the compare-and-set",
    !CAS_WHERE.test('where: { id: b.importId, status: "STAGING" },'));
  ok("24.c3 · CONTROL · an after() that pages by skip IS caught",
    /\bskip\b/.test("where: { importId: w.importId },\n        skip: w.afterOrdinal,"));
  ok("24.c4 · CONTROL · a totals body that fetches every row IS caught",
    /findMany/.test("const rows = await pc().contactImportRow.findMany({ where: { importId } });"));
  ok("24.c5 · CONTROL · a create that upserts IS caught", mentions("await pc().contactImport.upsert({ where, create, update })", "upsert"));
  ok("24.c6 · CONTROL · the brace matcher finds a nested createMany data object whole",
    objectsAfter("x.createMany({ data: rows.map((r) => ({ a: 1, b: { c: 2 } })) });", "createMany(").join("") === "{ data: rows.map((r) => ({ a: 1, b: { c: 2 } })) }");
  const plantedRun = storeSrc.replace("export type StoredContactImport = {", "export type StoredContactImport = {\n  plantedKey: string;");
  ok("24.c7 · CONTROL · a key PLANTED in StoredContactImport is seen by the parser and reported unmapped by the read mapper — a key in one mapper only cannot pass",
    storedKeys("StoredContactImport", plantedRun).includes("plantedKey") && !readsFrom(iRead, "plantedKey", "r") && !writesKey(iCreate, "plantedKey"));
  ok("24.c8 · CONTROL · a memory after() by offset FAILS 24.keyset.memory's needle",
    !".filter((_row, index) => index >= w.afterOrdinal)".includes(".filter((row) => row.ordinal > w.afterOrdinal)"));
}

/* ═══ §25 · The ONE bulk keyed reads — msisdnsPresent · findByPhones · findActiveAmong · latestAmong in both twins (S10 2026-10-02; decision X10) ═══ */
{
  // ⭐ WHY THIS SECTION EXISTS. §25's four reads are each a single-key read asked of a SET — the book's presence, the
  // accounts behind numbers, the stops in force, the latest word — and U38a's audience split hands their answers to the
  // send gate in place of its own single reads. So each must answer EXACTLY what its single read answers, per element:
  // a bulk `findActiveAmong` that forgot `liftedAt: null` counts a resubscribed person as suppressed; a `latestAmong`
  // that lost the id tiebreak flips a same-millisecond "yes then no" to yes; a `findByPhones` that dropped the avatar
  // omit drags up to 96 kB a row through every 1,000-number chunk; a `msisdnsPresent` that is not key-only carries a
  // book row's name and notes where only a key was asked for. Every behavioural suite runs on the memory twin, so each
  // of these is green in every test and wrong in production — this section holds the TWO twins to one shape. The
  // per-element proof is EXECUTED twice: on the memory twin by `test:campaign-audience` (§4.0), and on a real Postgres
  // by `scripts/live/bulk-reads-pg-probe.mts`.
  const NL25 = String.fromCharCode(10);
  const flat25 = (s: string) => s.split(String.fromCharCode(13)).join("").split(NL25).map((l) => l.trim()).join(" ");
  const NEXT_MEMBER25 = new RegExp(NL25 + " {4}[A-Za-z0-9_]+ *:");
  const memberOf = (block: string, name: string): string => {
    const at = block.indexOf(`${NL25}    ${name}: `);
    if (at < 0) return "";
    const next = block.slice(at + 1).search(NEXT_MEMBER25);
    return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
  };
  /** `first` sits in `body` and BEFORE `then` — an order, not a presence. */
  const before = (body: string, first: string, then: string): boolean => {
    const a = body.indexOf(first), b = body.indexOf(then);
    return a >= 0 && b > a;
  };
  const ns = (src: string, name: string) => region(src, `${NL25}  ${name}: {`);
  const mem = {
    present: memberOf(ns(storeSrc, "marketingContact"), "msisdnsPresent"),
    phones: memberOf(ns(storeSrc, "user"), "findByPhones"),
    active: memberOf(ns(storeSrc, "suppression"), "findActiveAmong"),
    latest: memberOf(ns(storeSrc, "messagingConsent"), "latestAmong"),
  };
  const pri = {
    present: memberOf(ns(dalSrc, "marketingContact"), "msisdnsPresent"),
    phones: memberOf(ns(dalSrc, "user"), "findByPhones"),
    active: memberOf(ns(dalSrc, "suppression"), "findActiveAmong"),
    latest: memberOf(ns(dalSrc, "messagingConsent"), "latestAmong"),
  };
  type ReadKey = keyof typeof mem;
  const READ_KEYS: ReadKey[] = ["present", "phones", "active", "latest"];
  const fm = Object.fromEntries(READ_KEYS.map((k) => [k, flat25(mem[k])])) as Record<ReadKey, string>;
  const fp = Object.fromEntries(READ_KEYS.map((k) => [k, flat25(pri[k])])) as Record<ReadKey, string>;

  ok("25.0 · both twins implement all four reads — marketingContact.msisdnsPresent, user.findByPhones, suppression.findActiveAmong, messagingConsent.latestAmong",
    READ_KEYS.every((k) => mem[k].length > 150 && pri[k].length > 150),
    READ_KEYS.map((k) => `${k} ${mem[k].length}/${pri[k].length}`).join(" · "));

  // ── NAMED ──
  const SIGS: Record<ReadKey, [string, string]> = {
    present: ["msisdnsPresent: (q: MarketingContactPresenceQuery): string[] =>", "msisdnsPresent: async (q: MarketingContactPresenceQuery): Promise<string[]> =>"],
    phones: ["findByPhones: (phones: string[]): StoredUser[] =>", "findByPhones: async (phones: string[]): Promise<StoredUser[]> =>"],
    active: ["findActiveAmong: (q: MessagingKeyBatch): StoredSuppression[] =>", "findActiveAmong: async (q: MessagingKeyBatch): Promise<StoredSuppression[]> =>"],
    latest: ["latestAmong: (q: MessagingKeyBatch): StoredMessagingConsent[] =>", "latestAmong: async (q: MessagingKeyBatch): Promise<StoredMessagingConsent[]> =>"],
  };
  const storeImport25 = dalSrc.slice(0, Math.max(0, dalSrc.indexOf('} from "./store";')));
  const offSigs = READ_KEYS.filter((k) => !mem[k].includes(SIGS[k][0]) || !pri[k].includes(SIGS[k][1]));
  const BATCH_KEYS = ["channel", "category", "identifiers"];
  const PRESENCE_KEYS = ["msisdns", "excludeSourceRef"];
  ok("25.named · every signature names its types in BOTH twins (never an inline literal) — MessagingKeyBatch is EXACTLY channel, category, identifiers and MarketingContactPresenceQuery EXACTLY msisdns, excludeSourceRef; exported by store.ts, imported by prisma-dal.ts",
    offSigs.length === 0 && storeImport25.includes("  MessagingKeyBatch,") && storeImport25.includes("  MarketingContactPresenceQuery,")
      && storeSrc.includes("export type MessagingKeyBatch = {") && storeSrc.includes("export type MarketingContactPresenceQuery = {")
      && sameSet(storedKeys("MessagingKeyBatch"), BATCH_KEYS) && sameSet(storedKeys("MarketingContactPresenceQuery"), PRESENCE_KEYS),
    `signatures off [${offSigs}] · batch [${storedKeys("MessagingKeyBatch")}] · presence [${storedKeys("MarketingContactPresenceQuery")}]`);

  // ── THE BOUND, AND THE EMPTY SET ──
  const READ_NAME: Record<ReadKey, [string, string]> = {
    present: ["q.msisdns", "marketingContact.msisdnsPresent"],
    phones: ["phones", "user.findByPhones"],
    active: ["q.identifiers", "suppression.findActiveAmong"],
    latest: ["q.identifiers", "messagingConsent.latestAmong"],
  };
  const keysLine = (k: ReadKey) => `const keys = bulkKeys(${READ_NAME[k][0]}, "${READ_NAME[k][1]}");`;
  const helperOk = (src: string) => {
    const h = flat25(region(src, "function bulkKeys("));
    return h.includes("const unique = Array.from(new Set(keys));") && h.includes("if (unique.length > BULK_KEYED_READ_MAX) {")
      && h.includes("throw new Error(") && h.includes("return unique;");
  };
  const unbounded = READ_KEYS.filter((k) => !fm[k].includes(keysLine(k)) || !fp[k].includes(keysLine(k)));
  ok("25.bound · ⛔ both twins refuse a call above 2,000 distinct keys through ONE helper each (bulkKeys — deduplicate, then throw above BULK_KEYED_READ_MAX, never cut off), the two constants equal, and every read takes its keys through it",
    helperOk(storeSrc) && helperOk(dalSrc) && storeSrc.includes("export const BULK_KEYED_READ_MAX = 2000;") && dalSrc.includes("const BULK_KEYED_READ_MAX = 2000;")
      && unbounded.length === 0,
    `helpers ${helperOk(storeSrc)}/${helperOk(dalSrc)} · without the helper [${unbounded}]`);
  const EMPTY = "if (keys.length === 0) return [];";
  const queriesEmpty = READ_KEYS.filter((k) => !before(fp[k], keysLine(k), EMPTY) || !before(fp[k], EMPTY, "pc()"));
  const memEmpty = READ_KEYS.filter((k) => !before(fm[k], keysLine(k), EMPTY));
  ok("25.empty · ⛔ an EMPTY key set is answered with nothing, WITHOUT a query — every Prisma read returns [] before its first pc(), and the memory twin answers the same",
    queriesEmpty.length === 0 && memEmpty.length === 0, `prisma queries on empty [${queriesEmpty}] · memory [${memEmpty}]`);

  // ── KEY-ONLY, AND THE NULL-SAFE ERASURE MARK ──
  ok("25.keyonly · ⛔ msisdnsPresent is KEY-ONLY — the Prisma read selects the key alone and maps it, never a book row (no toStoredMarketingContact), and the memory twin hands back the key it was asked, never the row",
    fp.present.includes("select: { msisdn: true },") && fp.present.includes("return rows.map((r) => r.msisdn).sort();")
      && !pri.present.includes("toStoredMarketingContact(") && fm.present.includes("out.push(m);") && fm.present.includes("return out.sort();")
      && !/out[.]push[(]c[^A-Za-z0-9_]/.test(mem.present),
    fp.present.slice(0, 240));
  ok("25.null · ⛔ the erasure mark is left out NULL-SAFELY in both twins — Prisma's OR carries the { sourceRef: null } arm (a bare `not` drops every row with no mark, nearly the whole book), the memory twin keeps a row whose sourceRef is not the mark, and null excludes nothing",
    fp.present.includes("where: q.excludeSourceRef === null ? { msisdn: { in: keys } } : { msisdn: { in: keys }, OR: [{ sourceRef: null }, { sourceRef: { not: q.excludeSourceRef } }] },")
      && fm.present.includes("if (c && (q.excludeSourceRef === null || c.sourceRef !== q.excludeSourceRef)) out.push(m);"),
    fp.present.slice(0, 240));

  // ── THE AVATAR ──
  ok("25.avatar · ⛔ findByPhones OMITS the avatar in BOTH twins — Prisma's omit: { avatarDataUrl: true } with the row reported null, the memory twin a copy reporting null — so a 1,000-number chunk never drags 96 kB a row out of Postgres",
    fp.phones.includes("omit: { avatarDataUrl: true }") && fp.phones.includes("return rows.map((r) => toStoredUser({ ...r, avatarDataUrl: null }));")
      && fm.phones.includes("if (u) out.push({ ...u, avatarDataUrl: null });"),
    fp.phones.slice(0, 240));

  // ── THE SAME QUESTION AS THE SINGLE READ ──
  const pFind = flat25(delegateMethod("suppression", "find"));
  const mFind = flat25(region(ns(storeSrc, "suppression"), "find: ("));
  ok("25.active · ⛔ findActiveAmong asks find's question — Prisma's where carries liftedAt: null beside the key set, as find's does; the memory twin reads the lift FALSILY (!r.liftedAt), as find does, never the strict === null that fails open",
    fp.active.includes("where: { channel: q.channel, category: q.category, identifier: { in: keys }, liftedAt: null },") && pFind.includes("liftedAt: null,")
      && fm.active.includes("if (r.channel === q.channel && r.category === q.category && want.has(r.identifier) && !r.liftedAt) out.push(r);")
      && mFind.includes("return !r.liftedAt ? r : null;") && !/liftedAt [=!]==? null/.test(mem.active),
    `${fp.active.slice(0, 160)} | ${fm.active.slice(0, 160)}`);
  const pLatestFor = flat25(delegateMethod("messagingConsent", "latestFor"));
  const mLatestFor = flat25(memberOf(ns(storeSrc, "messagingConsent"), "latestFor"));
  const MEM_ORDER = "b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)";
  const PRI_ORDER = 'orderBy: [{ createdAt: "desc" }, { id: "desc" }],';
  ok("25.order · ⛔ latestAmong reads the ledger in latestFor's OWN order — createdAt DESC then id DESC in both twins, the identical text latestFor carries — and keeps the FIRST row per number, never the last",
    fp.latest.includes(PRI_ORDER) && pLatestFor.includes(PRI_ORDER)
      && fp.latest.includes("for (const r of rows) if (!latest.has(r.identifier)) latest.set(r.identifier, toStoredMessagingConsent(r));")
      && fm.latest.includes(`.sort((a, b) => ${MEM_ORDER});`) && mLatestFor.includes(MEM_ORDER)
      && fm.latest.includes("for (const r of ordered) if (!latest.has(r.identifier)) latest.set(r.identifier, r);"),
    `${fp.latest.slice(0, 200)} | ${fm.latest.slice(0, 200)}`);
  ok("25.keys · each read asks ONLY its key set, through the index its single read uses — the unique msisdn and phoneE164 in Prisma, the twin's own secondary maps in memory, and the batch's channel and category beside the identifiers",
    fp.present.includes("msisdn: { in: keys }") && fp.phones.includes("where: { phoneE164: { in: keys } }")
      && fp.latest.includes("where: { channel: q.channel, category: q.category, identifier: { in: keys } },")
      && fm.present.includes("const id = store.contactsByMsisdn.get(m);") && fm.phones.includes("const id = store.usersByPhone.get(phone);")
      && fm.latest.includes(".filter((r) => r.channel === q.channel && r.category === q.category && want.has(r.identifier))"));
  const membersOf = (block: string): string[] => Array.from(block.matchAll(/^ {4}([A-Za-z0-9_]+) *:/gm)).map((m) => m[1]);
  ok("25.parity · the user namespace carries findByPhones and the player walk in BOTH twins (§17 and §19 hold the other three namespaces' members equal)",
    ["findByPhones", "playerWalk"].every((n) => membersOf(ns(storeSrc, "user")).includes(n) && membersOf(ns(dalSrc, "user")).includes(n)));

  // ── CONTROLS — each proves the matcher above it can reject, on a literal that would otherwise pass ──
  ok("25.c1 · CONTROL · a Prisma presence read without its key-only select, and a memory one that pushes the row, each FAIL 25.keyonly's needles",
    !flat25("const rows = await pc().marketingContact.findMany({ where: { msisdn: { in: keys } } });").includes("select: { msisdn: true },")
      && /out[.]push[(]c[^A-Za-z0-9_]/.test("if (c) out.push(c);"));
  ok("25.c2 · CONTROL · a findByPhones without the omit FAILS 25.avatar's needle",
    !"const rows = await pc().user.findMany({ where: { phoneE164: { in: keys } } });".includes("omit: { avatarDataUrl: true }"));
  ok("25.c3 · CONTROL · the strict memory predicate is SEEN by 25.active, and a Prisma where without the lift fails its needle",
    /liftedAt [=!]==? null/.test("if (want.has(r.identifier) && r.liftedAt === null) out.push(r);")
      && !"where: { channel: q.channel, category: q.category, identifier: { in: keys } },".includes("liftedAt: null"));
  ok("25.c4 · CONTROL · an order without the id leg FAILS 25.order's needle",
    !'orderBy: { createdAt: "desc" },'.includes(PRI_ORDER) && !".sort((a, b) => b.createdAt.localeCompare(a.createdAt));".includes(MEM_ORDER));
  ok("25.c5 · CONTROL · a read that queries BEFORE its empty check FAILS 25.empty's order",
    !before('const keys = bulkKeys(phones, "user.findByPhones"); const rows = await pc().user.findMany({}); if (keys.length === 0) return [];', EMPTY, "pc()"));
  const plantedBatch = storeSrc.replace("export type MessagingKeyBatch = {", `export type MessagingKeyBatch = {${NL25}  plantedKey: string;`);
  ok("25.c6 · CONTROL · a key PLANTED in MessagingKeyBatch is seen by the parser and fails 25.named's exact set",
    storedKeys("MessagingKeyBatch", plantedBatch).includes("plantedKey") && !sameSet(storedKeys("MessagingKeyBatch", plantedBatch), BATCH_KEYS));
}

/* ═══ §26 · The campaign tables — SmsCampaign / SmsCampaignRecipient in both twins (U35b, S10 2026-10-02; decision X1) ═══ */
{
  // ⭐ WHY THIS SECTION EXISTS. The campaign tables carry three rules that live IN THE TWINS: frozen keys change only in
  // DRAFT (on the revision the officer saw), a status moves only by a conditional transition with one winner, and a
  // recipient batch dedupes on (campaignId, msisdn) and is refused whole. Every behavioural suite runs on the memory
  // twin, so a Prisma twin that loses its half — a WHERE without its condition, a createMany without skipDuplicates, a
  // key its read mapper drops, a write that names a column and stores a constant — is a campaign that widens, races or
  // texts somebody twice on production alone. `test:campaign-models` §2 EXECUTES the rules on the memory twin; this
  // section holds both twins' SHAPE, plantable through KP_SRC. ⛔ The unique key itself lives in schema.prisma, read
  // from ROOT — so it is held here as the two BEHAVIOURS that implement it (skipDuplicates; the memory index), and as
  // TEXT by `test:campaign-models` §2.1. U36 and U40 extend this section (decision X1), and U43-0 adds 26.status: the
  // recipient status set, ONE in both twins, UNCONFIRMED in it.
  const cKeys = storedKeys("StoredSmsCampaign");
  const rKeys = storedKeys("StoredSmsCampaignRecipient");
  const cRead = region(dalSrc, "function toStoredSmsCampaign(");
  const rRead = region(dalSrc, "function toStoredSmsCampaignRecipient(");
  const cMap = region(dalSrc, "const SMS_CAMPAIGN_COLUMN");
  const cData = region(dalSrc, "function smsCampaignData(");
  const cPri = region(dalSrc, "\n  smsCampaign: {");
  const rPri = region(dalSrc, "\n  smsCampaignRecipient: {");
  const cMem = region(storeSrc, "\n  smsCampaign: {");
  const rMem = region(storeSrc, "\n  smsCampaignRecipient: {");
  /** A memory member's text: from `    <name>: ` to the next member at the same indent. */
  const memberText = (block: string, name: string): string => {
    const at = block.indexOf(`\n    ${name}: `);
    if (at < 0) return "";
    const next = block.slice(at + 1).search(/\n {4}\w+\s*:/);
    return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
  };
  const pCreate = delegateMethod("smsCampaign", "create");
  const pFind = delegateMethod("smsCampaign", "find");
  const pUpdate = delegateMethod("smsCampaign", "update");
  const pTransition = delegateMethod("smsCampaign", "transition");
  const pCreateMany = delegateMethod("smsCampaignRecipient", "createMany");
  const pCount = delegateMethod("smsCampaignRecipient", "countByStatus");
  const mCreate = memberText(cMem, "create");
  const mUpdate = memberText(cMem, "update");
  const mTransition = memberText(cMem, "transition");
  const mCreateMany = memberText(rMem, "createMany");
  const mCount = memberText(rMem, "countByStatus");
  /** `first` sits in `body` and BEFORE `then` — an order, not a presence: a check after the write is no check. */
  const before = (body: string, first: string, then: string): boolean => {
    const a = body.indexOf(first), b = body.indexOf(then);
    return a >= 0 && b > a;
  };

  ok("26.0 · the parser sees StoredSmsCampaign's (≥30) and StoredSmsCampaignRecipient's (≥24) keys, and both mappers, the column map and all four namespaces resolve",
    cKeys.length >= 30 && rKeys.length >= 24 && cRead.length > 400 && rRead.length > 400 && cMap.length > 200 && cData.length > 200
      && cPri.length > 400 && rPri.length > 400 && cMem.length > 400 && rMem.length > 400,
    `campaign ${cKeys.length} keys, recipient ${rKeys.length} keys; regions ${[cRead, rRead, cMap, cPri, rPri, cMem, rMem].map((r) => r.length).join("/")}`);

  // ── 26.read · every key FROM the row · 26.exact · no key in a mapper that the stored shape lacks ──
  for (const k of cKeys) ok(`26.read.campaign · toStoredSmsCampaign maps "${k}" from the row`, readsFrom(cRead, k, "cmp"));
  for (const k of rKeys) ok(`26.read.recipient · toStoredSmsCampaignRecipient maps "${k}" from the row`, readsFrom(rRead, k, "rcp"));
  /** The keys a mapper's object literal writes — one per line, at the literal's own indent. */
  const mapperKeys = (body: string): string[] => [...body.matchAll(/^\s{4}(\w+)\s*:/gm)].map((m) => m[1]);
  ok("26.exact.campaign · ⛔ toStoredSmsCampaign writes EXACTLY the stored keys — a key planted in the mapper alone is reported",
    cKeys.length >= 30 && sameSet(mapperKeys(cRead), cKeys), setDiff(cKeys, mapperKeys(cRead)) || `${cKeys.length} keys`);
  ok("26.exact.recipient · ⛔ toStoredSmsCampaignRecipient writes EXACTLY the stored keys — a key planted in the mapper alone is reported",
    rKeys.length >= 24 && sameSet(mapperKeys(rRead), rKeys), setDiff(rKeys, mapperKeys(rRead)) || `${rKeys.length} keys`);

  // ── 26.map · the column map names every key, and the ONE patch writer drives off it ──
  for (const k of cKeys) ok(`26.map · SMS_CAMPAIGN_COLUMN names "${k}"`, writesKey(cMap, k));
  const NEVER_PATCHED = ["id", "status", "draftRevision", "createdBy", "createdAt", "updatedAt"];
  const nullKeys = [...cMap.matchAll(/^\s*(\w+):\s*null,/gm)].map((m) => m[1]);
  ok("26.map.null · the keys NO patch writes are exactly id, status, draftRevision, createdBy, createdAt and updatedAt — a status moves only as a transition's `to`",
    sameSet(nullKeys, NEVER_PATCHED), setDiff(NEVER_PATCHED, nullKeys) || nullKeys.join(","));
  for (const k of cKeys.filter((x) => /At$/.test(x) && x !== "createdAt" && x !== "updatedAt")) {
    ok(`26.date · "${k}" is typed "date" in the map`, new RegExp(`\\b${k}: "date"`).test(cMap));
  }
  ok("26.decimal · estimateTzs and budgetTzs are \"decimal\" in the map, and every money column is read back through numOrNull",
    /\bestimateTzs: "decimal"/.test(cMap) && /\bbudgetTzs: "decimal"/.test(cMap)
      && /estimateTzs: numOrNull\(cmp\.estimateTzs\)/.test(cRead) && /budgetTzs: numOrNull\(cmp\.budgetTzs\)/.test(cRead)
      && /costTzs: numOrNull\(rcp\.costTzs\)/.test(rRead));
  ok("26.update.map · the ONE patch writer drives off SMS_CAMPAIGN_COLUMN and THROWS on an unmapped key; update and transition both go through it, with no allow-list",
    mentions(cData, "SMS_CAMPAIGN_COLUMN") && /unmapped field/.test(cData) && /throw new Error/.test(cData)
      && pUpdate.includes("const data = smsCampaignData(patch);") && pTransition.includes("const data = smsCampaignData(t.patch);")
      && !/if \(patch\.\w+ !== undefined\)/.test(cData + pUpdate + pTransition),
    `${cData.length} chars`);

  // ── 26.create · every key written at birth FROM the row · 26.createMany · the seed, and nothing that settles a row ──
  /** `key: row.key,` — or the instant built from it: a value taken FROM the row, never a constant under the key's name. */
  const writesFromRow = (body: string, k: string): boolean =>
    new RegExp(`^\\s*${k}: (?:row\\.${k}|new Date\\(row\\.${k}\\)|row\\.${k} \\? new Date\\(row\\.${k}\\) : null),\\r?$`, "m").test(body);
  for (const k of cKeys) ok(`26.create · smsCampaign.create writes "${k}" FROM the row`, writesFromRow(pCreate, k));
  const SEED = ["id", "campaignId", "msisdn", "contactId", "userId", "optOutToken", "createdAt"];
  const seedType = /export type SmsCampaignRecipientSeed = Pick<StoredSmsCampaignRecipient,\s*"id" \| "campaignId" \| "msisdn" \| "contactId" \| "userId" \| "optOutToken" \| "createdAt">;/.test(storeSrc);
  const dataAt = pCreateMany.indexOf("seeds.map((s) => ({");
  const dataBlock = dataAt < 0 ? "" : pCreateMany.slice(dataAt, pCreateMany.indexOf("}))", dataAt));
  const dataKeys = [...dataBlock.matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]);
  const fromSeed = (k: string): boolean => new RegExp(`^\\s*${k}: s\\.${k},\\r?$`, "m").test(dataBlock);
  ok("26.createMany.prisma · the Prisma batch writes EXACTLY the seed's keys, each FROM the seed (and updatedAt from its createdAt) — no status, no smsReference, nothing that settles a row",
    seedType && sameSet(dataKeys, [...SEED, "updatedAt"])
      && SEED.filter((k) => k !== "createdAt").every(fromSeed)
      && /^\s*createdAt: new Date\(s\.createdAt\),\r?$/m.test(dataBlock) && /^\s*updatedAt: new Date\(s\.createdAt\),\r?$/m.test(dataBlock),
    `${setDiff([...SEED, "updatedAt"], dataKeys) || dataKeys.join(",")} · from the seed: ${SEED.filter((k) => k !== "createdAt").filter((k) => !fromSeed(k)).join(",") || "all"}`);
  ok("26.createMany.memory · the memory batch takes every seed key FROM the seed and births the row PENDING, unclaimed, unsent and uncharged",
    SEED.every((k) => new RegExp(`^\\s*${k}: s\\.${k},`, "m").test(mCreateMany))
      && /status: "PENDING",/.test(mCreateMany) && /smsReference: null,/.test(mCreateMany) && /claimToken: null,/.test(mCreateMany)
      && /attempts: 0,/.test(mCreateMany) && /costTzs: null,/.test(mCreateMany) && /updatedAt: s\.createdAt,/.test(mCreateMany),
    `${mCreateMany.length} chars`);

  // ── 26.unique · THE ONE KEY, as the two behaviours that implement it ──
  ok("26.unique.prisma · the Prisma batch is ONE createMany with skipDuplicates: true, and never an upsert",
    /\.smsCampaignRecipient\.createMany\(\{\s*data,\s*skipDuplicates:\s*true\s*\}\)/.test(pCreateMany) && !mentions(pCreateMany, "upsert"),
    `${pCreateMany.length} chars`);
  ok("26.unique.memory · the memory batch SKIPS a (campaignId, msisdn) key — or an id — already held, and the second of two in one batch",
    /const k = `\$\{s\.campaignId\}\|\$\{s\.msisdn\}`;/.test(mCreateMany)
      && /if \(store\.recipientsByCampaignMsisdn\.has\(k\) \|\| store\.smsCampaignRecipients\.has\(s\.id\) \|\| planned\.has\(k\)\) return false;/.test(mCreateMany),
    `${mCreateMany.length} chars`);
  ok("26.unique.memory.index · …and MAINTAINS the index it skips on, for every row it writes",
    /store\.recipientsByCampaignMsisdn\.set\(k, row\.id\);/.test(mCreateMany), "a batch that does not set the index lets the next duplicate through");

  // ── 26.key · the batch is checked WHOLE, in both twins, before the first write ──
  ok("26.key · ⛔ both twins call assertSeeds(seeds) BEFORE their first write — a +255 spelling, a 1,001st seed or a settle key refuses the WHOLE batch",
    before(pCreateMany, "assertSeeds(seeds)", ".smsCampaignRecipient.createMany(") && before(mCreateMany, "assertSeeds(seeds)", ".set("),
    `prisma ${before(pCreateMany, "assertSeeds(seeds)", ".smsCampaignRecipient.createMany(")} · memory ${before(mCreateMany, "assertSeeds(seeds)", ".set(")}`);
  ok("26.fk.memory · the memory batch checks the three foreign keys of the rows it WILL insert, all before it writes — Postgres refuses the statement whole (P2003) and checks no link for a skipped row",
    before(mCreateMany, "const toInsert = seeds.filter(", "store.smsCampaigns.has(s.campaignId)")
      && before(mCreateMany, "store.smsCampaigns.has(s.campaignId)", ".set(") && before(mCreateMany, "store.marketingContacts.has(s.contactId)", ".set(")
      && before(mCreateMany, "store.users.has(s.userId)", ".set("));

  // ── 26.frozen · the draft save: a compare-and-set, only in DRAFT, and it writes the patch ──
  ok("26.frozen.prisma · ⛔ the Prisma draft save is ONE updateMany whose WHERE holds status: \"DRAFT\" AND the guard's draftRevision and whose data is the patch — null on count 0 — and moves the revision on by one",
    /\.updateMany\(\{ where: \{ id, status: "DRAFT", draftRevision: guard\.draftRevision \}, data \}\)/.test(pUpdate)
      && /if \(saved\.count === 0\) return null;/.test(pUpdate) && /data\.draftRevision = guard\.draftRevision \+ 1;/.test(pUpdate),
    pUpdate.replace(/\s+/g, " ").slice(0, 220));
  ok("26.frozen.memory · ⛔ the memory draft save refuses unless the row is a DRAFT on the guard's revision, BEFORE it writes the patch, and moves the revision on by one",
    before(mUpdate, 'if (row.status !== "DRAFT" || row.draftRevision !== guard.draftRevision) return null;', ".set(")
      && /draftRevision: guard\.draftRevision \+ 1/.test(mUpdate)
      && /for \(const \[k, v\] of Object\.entries\(patch\)\) if \(v !== undefined\) \(next as Record<string, unknown>\)\[k\] = v;/.test(mUpdate),
    mUpdate.replace(/\s+/g, " ").slice(0, 220));

  // ── 26.transition · a status moves only by a conditional write — one winner ──
  ok("26.transition.prisma · ⛔ the Prisma transition is ONE updateMany with status: { in: [...t.from] } in the WHERE (and the revision when one is given) and the patch as its data — null on count 0",
    /\.updateMany\(\{\s*where: \{ id, status: \{ in: \[\.\.\.t\.from\] \}, \.\.\.\(t\.draftRevision !== null \? \{ draftRevision: t\.draftRevision \} : \{\}\) \},\s*data,\s*\}\)/.test(pTransition)
      && /if \(moved\.count === 0\) return null;/.test(pTransition),
    pTransition.replace(/\s+/g, " ").slice(0, 220));
  ok("26.transition.memory · ⛔ the memory transition refuses a row no longer in `from`, or on another revision, BEFORE it writes the patch",
    before(mTransition, "if (!t.from.includes(row.status)) return null;", ".set(")
      && before(mTransition, "if (t.draftRevision !== null && row.draftRevision !== t.draftRevision) return null;", ".set(")
      && /for \(const \[k, v\] of Object\.entries\(t\.patch\)\) if \(v !== undefined\) \(next as Record<string, unknown>\)\[k\] = v;/.test(mTransition),
    mTransition.replace(/\s+/g, " ").slice(0, 220));
  ok("26.shape · both twins ask the ONE rule set FIRST: create → assertNewCampaign, update → assertDraftPatch (with the caller's at), transition → assertTransitionShape",
    before(pCreate, "assertNewCampaign(row)", "pc().smsCampaign.create(") && before(mCreate, "assertNewCampaign(row)", ".set(")
      && before(pUpdate, "assertDraftPatch(patch, guard, at)", ".updateMany(") && before(mUpdate, "assertDraftPatch(patch, guard, at)", ".get(")
      && before(pTransition, "assertTransitionShape(t)", ".updateMany(") && before(mTransition, "assertTransitionShape(t)", ".get("));

  // ── 26.counts · ONE groupBy, zero-filled in both twins ──
  ok("26.counts.prisma · the Prisma countByStatus is ONE groupBy by status — never the rows — returned through fillRecipientCounts",
    /\.groupBy\(\{\s*by:\s*\["status"\]/.test(pCount) && !/findMany|\.count\(/.test(pCount) && pCount.includes("fillRecipientCounts("),
    pCount.replace(/\s+/g, " ").slice(0, 200));
  ok("26.counts.memory · the memory countByStatus returns through fillRecipientCounts too — every status, zeros included, in the schema's order",
    mCount.includes("fillRecipientCounts("));

  // ── 26.nodelete · 26.nocounter · 26.link · 26.onedoor ──
  ok("26.nodelete · ⛔ neither twin's campaign or recipient namespace exposes a delete, or removes a row (a recipient row is the record that we messaged somebody)",
    [cPri, rPri, cMem, rMem].every((b) => b.length > 200 && !/\bdelete\w*\s*:/.test(b))
      && [cMem, rMem].every((b) => !/\.delete\(|\.clear\(/.test(b)) && [cPri, rPri].every((b) => !/\.delete(Many)?\(/.test(b)));
  const COUNTER = (k: string): boolean =>
    /^(sent|delivered|failed|skipped|held|pending|accepted|handedOver|total|recipients?)/i.test(k) || (/Count$/.test(k) && k !== "audienceCount");
  ok("26.nocounter · ⛔ no stored counter among StoredSmsCampaign's keys (OD26) — audienceCount, the confirmed population, is the one *Count",
    cKeys.length >= 30 && !cKeys.some(COUNTER), cKeys.filter(COUNTER).join(",") || "none");
  ok("26.link · ⛔ the recipient mapper reaches no relation — no contact, user or campaign read through it — so it can copy no person's details",
    rRead.length > 400 && !/\brcp\.(contact|user|campaign)\./.test(rRead) && !/\bcmp\.recipients\b/.test(cRead));
  const walkSrc = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkSrc(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []);
  const srcRoot = join(ROOT, "src");
  /** A delegate call on the campaign tables by anything but the DAL door (`db.` is the door, so it is not one). */
  const RAW_DELEGATE = /(?<!\bdb)\.smsCampaign(?:Recipient)?\s*\.\s*(?:create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany|findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|groupBy|count|aggregate)\s*\(/;
  /** Raw SQL naming either table — the other way round the door. */
  const RAW_SQL = /\$(?:queryRaw|executeRaw)(?:Unsafe)?\b[^;]*?"SmsCampaign(?:Recipient)?"/;
  const doors = walkSrc(srcRoot)
    .filter((f) => { const t = decomment(readFileSync(f, "utf8")); return RAW_DELEGATE.test(t) || RAW_SQL.test(t); })
    .map((f) => f.slice(srcRoot.length + 1).replace(/\\/g, "/")).sort();
  ok("26.onedoor · ⛔ no src file but prisma-dal.ts calls a smsCampaign / smsCampaignRecipient delegate or names either table in raw SQL — the frozen and transition rules cannot be walked round",
    doors.join(",") === "lib/server/prisma-dal.ts" && !RAW_SQL.test(dalSrc), `callers=[${doors}]`);

  // ── 26.parity · the same members in both twins ──
  const members = (block: string): string[] => Array.from(block.matchAll(/^\s{4}(\w+)\s*:/gm)).map((m) => m[1]).sort();
  ok("26.parity.smsCampaign · both twins expose the same members",
    members(cPri).length >= 3 && members(cPri).join(",") === members(cMem).join(","), `prisma=[${members(cPri)}] memory=[${members(cMem)}]`);
  ok("26.parity.smsCampaignRecipient · both twins expose the same members",
    members(rPri).length >= 3 && members(rPri).join(",") === members(rMem).join(","), `prisma=[${members(rPri)}] memory=[${members(rMem)}]`);

  // ── 26.named · every signature names its types ──
  const MEM_SIGS: Array<[string, string]> = [
    [cMem, "create: (row: StoredSmsCampaign): StoredSmsCampaign =>"],
    [cMem, "find: (id: string): StoredSmsCampaign | null =>"],
    [cMem, "update: (id: string, patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard, at: string): StoredSmsCampaign | null =>"],
    [cMem, "transition: (id: string, t: SmsCampaignTransition): StoredSmsCampaign | null =>"],
    [rMem, "createMany: (seeds: SmsCampaignRecipientSeed[]): SmsCampaignRecipientInsert =>"],
    [rMem, "find: (id: string): StoredSmsCampaignRecipient | null =>"],
    [rMem, "countByStatus: (campaignId: string): SmsCampaignRecipientCount[] =>"],
  ];
  const PRI_SIGS: Array<[string, string]> = [
    [cPri, "create: async (row: StoredSmsCampaign): Promise<StoredSmsCampaign> =>"],
    [cPri, "find: async (id: string): Promise<StoredSmsCampaign | null> =>"],
    [cPri, "update: async (id: string, patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard, at: string): Promise<StoredSmsCampaign | null> =>"],
    [cPri, "transition: async (id: string, t: SmsCampaignTransition): Promise<StoredSmsCampaign | null> =>"],
    [rPri, "createMany: async (seeds: SmsCampaignRecipientSeed[]): Promise<SmsCampaignRecipientInsert> =>"],
    [rPri, "find: async (id: string): Promise<StoredSmsCampaignRecipient | null> =>"],
    [rPri, "countByStatus: async (campaignId: string): Promise<SmsCampaignRecipientCount[]> =>"],
  ];
  const NAMED = ["StoredSmsCampaign", "StoredSmsCampaignRecipient", "SmsCampaignDraftPatch", "SmsCampaignDraftGuard",
    "SmsCampaignTransition", "SmsCampaignRecipientSeed", "SmsCampaignRecipientInsert", "SmsCampaignRecipientCount"];
  const storeImport = dalSrc.slice(0, Math.max(0, dalSrc.indexOf("} from \"./store\";")));
  const missingSigs = [...MEM_SIGS, ...PRI_SIGS].filter(([b, s]) => !b.includes(s)).map(([, s]) => s.split(":")[0]);
  const unexported = NAMED.filter((t) => !new RegExp(`export type ${t} =`).test(storeSrc));
  const unimported = NAMED.filter((t) => !new RegExp(`\\b${t},`).test(storeImport));
  ok("26.named · every member of both twins names its parameter and return types (never an inline literal) — exported by store.ts, imported by prisma-dal.ts",
    missingSigs.length === 0 && unexported.length === 0 && unimported.length === 0,
    `signatures off: [${missingSigs}] · not exported: [${unexported}] · not imported: [${unimported}]`);
  ok("26.find · both finds read one row by id and hand back a copy — the gate trail copied too — never the stored object",
    /findUnique\(\{ where: \{ id \} \}\)/.test(pFind) && /return row \? \{ \.\.\.row \} : null;/.test(memberText(cMem, "find"))
      && /gateTrail: row\.gateTrail === null \? null : row\.gateTrail\.map\(\(g\) => \(\{ \.\.\.g \}\)\)/.test(memberText(rMem, "find")));
  // ⭐ THE SET NULL LINK, MIRRORED. Postgres nulls `SmsCampaignRecipient.contactId` when a contact row is deleted (the FK's
  // onDelete: SetNull); the memory twin deletes contacts in ONE place — U23's `removeWhere` — and must do the same, or
  // every suite keeps a recipient pointing at a contact production no longer has.
  const mRemove = memberText(region(storeSrc, "\n  marketingContact: {"), "removeWhere");
  ok("26.setnull.memory · ⛔ the memory twin's contact removal sets a recipient's contactId to null and deletes no recipient — Postgres' SET NULL, mirrored",
    mRemove.length > 100 && /for \(const r of store\.smsCampaignRecipients\.values\(\)\) if \(r\.contactId === c\.id\) r\.contactId = null;/.test(mRemove)
      && !/smsCampaignRecipients\.delete\(/.test(mRemove),
    `${mRemove.length} chars`);

  // ── CONTROLS ─────────────────────────────────────────────────────────────────────────
  // ⛔ Each proves the ASSERTION ABOVE IT can reject, on a literal that would otherwise pass.
  ok("26.c1 · CONTROL · `audienceFilter: \"{}\",` in a read mapper does NOT count as reading it from the row",
    !readsFrom("    id: cmp.id,\n    audienceFilter: \"{}\",", "audienceFilter", "cmp"));
  ok("26.c2 · CONTROL · a key planted in a mapper alone IS reported by the exact-set check",
    cRead.length > 0 && !sameSet(mapperKeys(cRead.replace("    id: cmp.id,", "    id: cmp.id,\n    sentCount: cmp.audienceCount,")), cKeys));
  ok("26.c3 · CONTROL · a batch without skipDuplicates is reported",
    !/\.smsCampaignRecipient\.createMany\(\{\s*data,\s*skipDuplicates:\s*true\s*\}\)/.test("const batch = await pc().smsCampaignRecipient.createMany({ data });"));
  ok("26.c4 · CONTROL · a memory batch that sets without checking the index is reported",
    !/if \(store\.recipientsByCampaignMsisdn\.has\(k\)/.test("        store.smsCampaignRecipients.set(row.id, row);"));
  ok("26.c5 · CONTROL · sentCount and recipientCount ARE counters, and audienceCount is NOT",
    COUNTER("sentCount") && COUNTER("recipientCount") && COUNTER("deliveredTotal") && !COUNTER("audienceCount") && !COUNTER("segmentsSw"));
  ok("26.c6 · CONTROL · a raw delegate call or raw SQL naming the table IS caught by 26.onedoor, and the DAL door is not",
    RAW_DELEGATE.test("await pc().smsCampaign.update({ where: { id }, data });") && RAW_DELEGATE.test("await tx.smsCampaignRecipient.deleteMany({});")
      && RAW_SQL.test("await pc().$executeRawUnsafe(`update \"SmsCampaign\" set status = 'RUNNING'`);")
      && !RAW_DELEGATE.test("await db.smsCampaign.update(id, patch, guard, at);") && !RAW_DELEGATE.test("store.smsCampaigns.get(id);")
      && !RAW_SQL.test('export const DISPATCH_TARGET_TYPE = "SmsCampaignRecipient";'));
  ok("26.c7 · CONTROL · a delete member IS seen by 26.nodelete",
    /\bdelete\w*\s*:/.test("    deleteDraft: async (id: string) => null,"));
  ok("26.c8 · CONTROL · an updateMany whose WHERE lost its status condition FAILS 26.transition.prisma's matcher",
    !/\.updateMany\(\{\s*where: \{ id, status: \{ in: \[\.\.\.t\.from\] \}/.test("const moved = await pc().smsCampaign.updateMany({\n  where: { id },\n  data,\n});"));
  ok("26.c9 · CONTROL · a memory body that checks only AFTER it writes FAILS before() — the order is the property",
    !before("store.smsCampaigns.set(id, next);\nif (!t.from.includes(row.status)) return null;", "if (!t.from.includes(row.status)) return null;", ".set("));
  ok("26.c10 · CONTROL · a create that writes a constant under a key's name FAILS 26.create, and one that writes it from the row passes",
    !writesFromRow("          audienceFilter: \"{}\",", "audienceFilter") && writesFromRow("          audienceFilter: row.audienceFilter,", "audienceFilter")
      && writesFromRow("          enqueuedAt: row.enqueuedAt ? new Date(row.enqueuedAt) : null,", "enqueuedAt"));

  // ══ 26.u36 · THE CAMPAIGN LIST'S FOUR READS (U36, S10 2026-10-02 — decision X1: U36 extends §26) ══════════════
  // ⭐ WHY THEY ARE HELD HERE. The list, its status rail and the nav badge run on four reads — page, statusCounts,
  // attentionCount, countsByCampaign — and every behavioural suite (`test:campaigns-page` included) drives the MEMORY
  // twin. A Prisma twin that loses its half is green in memory and wrong live: a tie left unbroken (a campaign shown on
  // two pages, another on none), a pager counted without the filter, a whole-table recipient groupBy on every page view,
  // an attention count that retypes the outstanding list and drops HELD. So each read's SHAPE is held in both twins,
  // plantable through KP_SRC (`red:dal-parity`), and the dev read fault is held to the memory twin alone.
  {
    const flat = (s: string) => s.split(String.fromCharCode(13)).join("").split(String.fromCharCode(10)).map((l) => l.trim()).join(" ");
    const pPage = delegateMethod("smsCampaign", "page");
    const pStatus = delegateMethod("smsCampaign", "statusCounts");
    const pAttention = delegateMethod("smsCampaign", "attentionCount");
    const pByCampaign = delegateMethod("smsCampaignRecipient", "countsByCampaign");
    const mPage = memberText(cMem, "page");
    const mStatus = memberText(cMem, "statusCounts");
    const mAttention = memberText(cMem, "attentionCount");
    const mByCampaign = memberText(rMem, "countsByCampaign");
    const U36_SIGS: Array<[string, string]> = [
      [cMem, "page: (q: SmsCampaignPageQuery): SmsCampaignPage =>"],
      [cMem, "statusCounts: (): SmsCampaignStatusCounts =>"],
      [cMem, "attentionCount: (): number =>"],
      [rMem, "countsByCampaign: (ids: readonly string[]): SmsCampaignRecipientCountsById =>"],
      [cPri, "page: async (q: SmsCampaignPageQuery): Promise<SmsCampaignPage> =>"],
      [cPri, "statusCounts: async (): Promise<SmsCampaignStatusCounts> =>"],
      [cPri, "attentionCount: async (): Promise<number> =>"],
      [rPri, "countsByCampaign: async (ids: readonly string[]): Promise<SmsCampaignRecipientCountsById> =>"],
    ];
    const U36_EXPORTED = ["SmsCampaignListSort", "SmsCampaignPageQuery", "SmsCampaignPage", "SmsCampaignStatusCounts",
      "SmsCampaignRecipientStatusCounts", "SmsCampaignRecipientCountsById"];
    const U36_IMPORTED = ["SmsCampaignPageQuery", "SmsCampaignPage", "SmsCampaignStatusCounts", "SmsCampaignRecipientCountsById"];
    const offSigs = U36_SIGS.filter(([b, s]) => !b.includes(s)).map(([, s]) => s.split(":")[0]);
    const notExported = U36_EXPORTED.filter((t) => !storeSrc.includes(`export type ${t} =`));
    const notImported = U36_IMPORTED.filter((t) => !storeImport.includes(`  ${t},`));
    ok("26.u36.named · the four list reads name their parameter and return types in BOTH twins (never an inline literal) — exported by store.ts, imported by prisma-dal.ts",
      offSigs.length === 0 && notExported.length === 0 && notImported.length === 0,
      `signatures off: [${offSigs}] · not exported: [${notExported}] · not imported: [${notImported}]`);
    ok("26.u36.page.prisma · ⛔ the Prisma page is ONE findMany ordered by the column THEN by id in the same direction, with skip and take, and ONE count over the SAME where — statuses null = every status",
      pPage.includes("const where = q.statuses === null ? {} : { status: { in: [...q.statuses] } };")
        && pPage.includes("orderBy: [first, { id: q.dir }], skip: q.offset, take: q.limit")
        && pPage.includes("pc().smsCampaign.count({ where })")
        && (pPage.match(/[.]findMany[(]/g) ?? []).length === 1,
      flat(pPage).slice(0, 260));
    ok("26.u36.page.memory · the memory page filters on q.statuses (null = every status), breaks every tie on id in the same direction, and hands back copies",
      mPage.includes("q.statuses === null || q.statuses.includes(c.status)")
        && mPage.includes("return by !== 0 ? sign * by : sign * a.id.localeCompare(b.id);")
        && mPage.includes(".map((c) => ({ ...c }))"),
      flat(mPage).slice(0, 260));
    ok("26.u36.counts.prisma · statusCounts is ONE groupBy by status over the WHOLE table — no where, never the rows — zero-filled through tallyCampaignStatuses",
      pStatus.includes('pc().smsCampaign.groupBy({ by: ["status"], _count: { _all: true } })')
        && pStatus.includes("tallyCampaignStatuses(") && !/findMany|where/.test(pStatus),
      flat(pStatus).slice(0, 220));
    ok("26.u36.counts.memory · the memory statusCounts tallies the WHOLE table through the same tallyCampaignStatuses — never a filtered list",
      mStatus.includes("tallyCampaignStatuses(all.map((c) => ({ status: c.status, count: 1 })))") && !mStatus.includes("filter("),
      flat(mStatus).slice(0, 220));
    ok("26.u36.attention.prisma · ⛔ attentionCount is ONE count() — never findMany — whose where names BOTH arms: the ATTENTION_ALWAYS statuses, and PAUSED with enqueuedAt null OR a recipient in OUTSTANDING_RECIPIENT_STATUSES — both lists spread, never retyped",
      pAttention.includes("pc().smsCampaign.count({")
        && pAttention.includes("{ status: { in: [...ATTENTION_ALWAYS] } }")
        && pAttention.includes("{ status: ATTENTION_WHEN_OWED, OR: [{ enqueuedAt: null }, { recipients: { some: { status: { in: [...OUTSTANDING_RECIPIENT_STATUSES] } } } }] }")
        && !/findMany|"HELD"|"PENDING"|"PREPARING"|"RUNNING"|"PAUSED"/.test(pAttention),
      flat(pAttention).slice(0, 300));
    ok("26.u36.attention.memory · the memory attentionCount asks the ONE predicate, wantsAttention, of every campaign over its own tally — no second definition",
      mAttention.includes("all.filter((c) => wantsAttention(c, tallies[c.id])).length")
        && !/"HELD"|"PENDING"|"PREPARING"|"RUNNING"|"PAUSED"/.test(mAttention),
      flat(mAttention).slice(0, 300));
    ok("26.u36.bycampaign.prisma · ⛔ countsByCampaign asks NOTHING for an empty list, else ONE groupBy by (campaignId, status) WHERE campaignId is in the ids it was handed — never the whole table — zero-filled per id",
      before(pByCampaign, "if (ids.length === 0) return {};", ".groupBy(")
        && pByCampaign.includes('groupBy({ by: ["campaignId", "status"], where: { campaignId: { in: [...ids] } }, _count: { _all: true } })')
        && pByCampaign.includes("tallyRecipientsByCampaign(ids,") && !/findMany/.test(pByCampaign),
      flat(pByCampaign).slice(0, 300));
    ok("26.u36.bycampaign.memory · the memory countsByCampaign answers exactly the ids named — filtered to them, zero-filled — and {} for none",
      before(mByCampaign, "if (ids.length === 0) return {};", "tallyRecipientsByCampaign(")
        && mByCampaign.includes(".filter((r) => wanted.has(r.campaignId))") && mByCampaign.includes("tallyRecipientsByCampaign(ids,"),
      flat(mByCampaign).slice(0, 300));
    const faultReaders = [mPage, mStatus, mAttention].filter((b) => b.includes("globalThis.__50PICK_CAMPAIGNS_READ_FAULT")).length;
    ok("26.u36.fault · the DEV read fault is read by the MEMORY twin's page, statusCounts and attentionCount — and NEVER by the Prisma twin, which serves production",
      faultReaders === 3 && !dalSrc.includes("__50PICK_CAMPAIGNS_READ_FAULT"),
      `${faultReaders} of 3 memory reads · the Prisma twin names it: ${dalSrc.includes("__50PICK_CAMPAIGNS_READ_FAULT")}`);
    // ── CONTROLS — each proves the matcher above it can reject, on a literal that would otherwise pass ──
    ok("26.u36.c1 · CONTROL · an inline object-literal parameter type is NOT the named signature 26.u36.named looks for",
      !"    page: async (q: { statuses: string[] | null }): Promise<SmsCampaignPage> => {".includes("page: async (q: SmsCampaignPageQuery): Promise<SmsCampaignPage> =>"));
    ok("26.u36.c2 · CONTROL · an orderBy without the id tiebreak, a findMany in the attention count and a groupBy without the ids each FAIL their matcher",
      !"orderBy: [first], skip: q.offset, take: q.limit".includes("orderBy: [first, { id: q.dir }], skip: q.offset, take: q.limit")
        && /findMany/.test("const rows = await pc().smsCampaign.findMany({}); return rows.filter(wants).length;")
        && !'groupBy({ by: ["campaignId", "status"], _count: { _all: true } })'.includes("where: { campaignId: { in: [...ids] } }"));
  }

  // ══ 26.status · THE RECIPIENT STATUS SET, ONE IN BOTH TWINS (U43-0, S10 2026-10-04 — ENGINE-SPEC §4.2, decision E4) ═══
  // ⭐ WHY IT IS HELD HERE. UNCONFIRMED reaches Postgres through its own ADD VALUE migration, one deploy before any writer
  // (55P04). The memory twin types its rows with store.ts's union; the Prisma twin reads Postgres' enum through the
  // generated client and casts each status it reads to a TypeScript type. Were that type an inline list, or the union and
  // the schema's enum apart, a row U43b settles UNCONFIRMED would be a status one backend names and the other cannot —
  // and the counts both twins answer through (fillRecipientCounts, tallyRecipientsByCampaign) REFUSE a status they do not
  // know, so the list and the live page would fail on production alone. So the union and the enum are ONE set of seven
  // in ONE order, and the Prisma twin names that ONE union at both of its reads. The migration's text, the sets in
  // campaign-model.ts and campaign-status.ts and the writer pin are `test:campaign-models` §1.8c, §1.12 and §3.2's; the
  // value on a real Postgres is `db:probe-campaign-models` §9's.
  // ⛔ No backslash anywhere in this block: a line break is String.fromCharCode(10), and every pattern is a class.
  {
    const RS = "SmsCampaignRecipientStatus";
    const SEVEN = ["PENDING", "HELD", "SENT", "DELIVERED", "FAILED", "SKIPPED", "UNCONFIRMED"];
    /** The members of `export type <name> = "A" | "B";`, in written order. */
    const unionOf = (src: string, name: string): string[] => {
      const at = src.indexOf(`export type ${name} =`);
      const end = at < 0 ? -1 : src.indexOf(";", at);
      return end < 0 ? [] : Array.from(src.slice(at, end).matchAll(/"([A-Z][A-Z0-9_]*)"/g), (m) => m[1]);
    };
    /** The values of `enum <name> { … }`, in declared order — a `//` or `///` line is no value. */
    const enumOf = (schema: string, name: string): string[] => {
      const at = schema.indexOf(`enum ${name} {`);
      const end = at < 0 ? -1 : schema.indexOf("}", at);
      if (end < 0) return [];
      return schema.slice(schema.indexOf("{", at) + 1, end).split(String.fromCharCode(10))
        .map((l) => { const c = l.indexOf("//"); return (c < 0 ? l : l.slice(0, c)).trim(); })
        .filter((l) => /^[A-Z][A-Z0-9_]*$/.test(l));
    };
    const union = unionOf(storeSrc, RS);
    const prismaEnum = enumOf(prismaSchemaSrc, RS);
    ok("26.status.union · ⭐ ONE RECIPIENT STATUS SET IN BOTH TWINS — store.ts's union (the memory twin's type, and the one the Prisma twin imports) and schema.prisma's enum (the Prisma client's) are the same SEVEN values in one order, UNCONFIRMED last where its ADD VALUE appends it (U43-0)",
      union.join(",") === SEVEN.join(",") && prismaEnum.join(",") === SEVEN.join(","),
      `store [${union}] · schema [${prismaEnum}]`);
    const READ_CAST = `status: rcp.status as ${RS},`;
    const COUNT_CAST = `status: g.status as ${RS}, count: g._count._all`;
    /** A recipient status spelled as a string — what an inline list or a second vocabulary looks like. */
    const STATUS_LITERAL = /"(PENDING|HELD|SENT|DELIVERED|FAILED|SKIPPED|UNCONFIRMED)"/;
    const imported = storeImport.includes(`  ${RS},`);
    ok("26.status.prisma · ⛔ the Prisma twin names that ONE union at both of its reads — the recipient mapper and countByStatus cast each status to SmsCampaignRecipientStatus, imported from store.ts — and neither read spells a recipient status of its own (no inline list, no literal)",
      rRead.includes(READ_CAST) && pCount.includes(COUNT_CAST) && imported && !STATUS_LITERAL.test(rRead) && !STATUS_LITERAL.test(pCount),
      `mapper cast ${rRead.includes(READ_CAST)} · count cast ${pCount.includes(COUNT_CAST)} · imported ${imported} · a literal in the mapper ${STATUS_LITERAL.test(rRead)} / the count ${STATUS_LITERAL.test(pCount)}`);
    // ── CONTROLS — each proves the reader above it can reject, on a literal that would otherwise pass ──
    ok("26.status.c1 · CONTROL · the union reader sees the six-value union of a build before U43-0 as six — so a union that forgot UNCONFIRMED IS reported — and the enum reader skips a /// line and stops at its own enum's brace",
      unionOf('export type SmsCampaignRecipientStatus = "PENDING" | "HELD" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";', RS).join(",") === SEVEN.slice(0, 6).join(",")
        && enumOf(["enum SmsCampaignRecipientStatus {", "  PENDING", "  /// UNCONFIRMED is only named in this note", "  HELD", "}", "enum Other {", "  UNCONFIRMED", "}"].join(String.fromCharCode(10)), RS).join(",") === "PENDING,HELD");
    ok("26.status.c2 · CONTROL · an inline-list cast is NOT the named cast 26.status.prisma looks for, and its literals ARE seen",
      !'    status: rcp.status as "PENDING" | "HELD" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED",'.includes(READ_CAST)
        && STATUS_LITERAL.test('    status: rcp.status as "PENDING" | "HELD" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED",'));
  }

  // ══ 26.u16a · ERASURE'S UNLINK AND THE ACCESS EXPORT'S READ (U16a, S10 2026-10-04 — the twins' half of M9) ═══════════
  // ⭐ WHY THEY ARE HELD HERE. Erasure clears a recipient's account link through `unlinkUser`, and both access exports read
  // a number's rows through `listByMsisdn`; every behavioural suite (`test:campaign-privacy` among them) drives the MEMORY
  // twin. A Prisma twin that loses its half is green in memory and wrong live: an unlink that writes another column (the
  // record erased along with the link), that matches by number (a previous holder's record unlinked) or that skips the
  // rule set (a lost id is NO CONDITION on Postgres: every row unlinked); a read whose bound is a filter after the fetch
  // (a previous holder's rows crowding the cap) or whose ties break the other way. Plantable through KP_SRC
  // (`red:dal-parity`; the cases are in scripts/anchors/dal-parity.anchors.mjs). The behaviour on Postgres is EXECUTED by
  // `scripts/live/campaign-privacy-pg-probe.mts`, against answers written there by hand.
  // ⛔ No backslash anywhere in this block (§27's rule): every matcher is an `includes`, a `before` or a character class.
  {
    const flat16 = (s: string) => s.split(String.fromCharCode(13)).join("").split(String.fromCharCode(10)).map((l) => l.trim()).join(" ");
    const pList = delegateMethod("smsCampaignRecipient", "listByMsisdn");
    const pUnlink = delegateMethod("smsCampaignRecipient", "unlinkUser");
    const mList = memberText(rMem, "listByMsisdn");
    const mUnlink = memberText(rMem, "unlinkUser");
    const U16A_SIGS: Array<[string, string]> = [
      [rMem, "listByMsisdn: (msisdn: string, sinceIso: string): StoredSmsCampaignRecipient[] =>"],
      [rMem, "unlinkUser: (userId: string, at: string): number =>"],
      [rPri, "listByMsisdn: async (msisdn: string, sinceIso: string): Promise<StoredSmsCampaignRecipient[]> =>"],
      [rPri, "unlinkUser: async (userId: string, at: string): Promise<number> =>"],
    ];
    const offSigs16 = U16A_SIGS.filter(([b, s]) => !b.includes(s)).map(([, s]) => s.split(":")[0]);
    const both16 = (b: string) => members(b).includes("listByMsisdn") && members(b).includes("unlinkUser");
    ok("26.u16a.parity · ⭐ BOTH twins define listByMsisdn AND unlinkUser — a member in one twin only works in every suite and throws on production",
      both16(rPri) && both16(rMem), `prisma=[${members(rPri)}] memory=[${members(rMem)}]`);
    ok("26.u16a.named · the two members name their parameter and return types in BOTH twins (never an inline literal)",
      offSigs16.length === 0, `signatures off: [${offSigs16}]`);

    // ── the unlink: the rule set first, then ONE statement writing the link and the stamp, and nothing else ──
    const UNLINK_ONE = "updateMany({ where: { userId }, data: { userId: null, updatedAt: new Date(at) } })";
    const pUnlinkFlat = flat16(pUnlink);
    ok("26.u16a.unlink.prisma · ⛔ the Prisma unlinkUser asks assertRecipientUnlink FIRST, then is ONE updateMany WHERE exactly { userId } whose data is exactly the link cleared and the caller's stamp — { userId: null, updatedAt: new Date(at) } — with no other statement",
      before(pUnlink, "assertRecipientUnlink(userId, at)", ".updateMany(")
        && (pUnlink.match(/[.]updateMany[(]/g) ?? []).length === 1
        && pUnlinkFlat.includes(UNLINK_ONE)
        && !/[.](delete|deleteMany|findMany|findFirst|upsert|create|createMany|update)[(]|[$](executeRaw|queryRaw)/.test(pUnlink),
      pUnlinkFlat.slice(0, 260));
    ok("26.u16a.unlink.memory · ⛔ the memory unlinkUser asks assertRecipientUnlink FIRST, skips every row whose userId is not the account, writes exactly the link (null) and the stamp (at) — two assignments, no more — and never removes or replaces a row",
      before(mUnlink, "assertRecipientUnlink(userId, at)", "for (const r of store.smsCampaignRecipients.values())")
        && mUnlink.includes("if (r.userId !== userId) continue;")
        && mUnlink.includes("r.userId = null;") && mUnlink.includes("r.updatedAt = at;")
        && (mUnlink.match(/r[.][A-Za-z]+ = /g) ?? []).length === 2
        && !/[.]delete[(]|[.]clear[(]|[.]set[(]/.test(mUnlink),
      flat16(mUnlink).slice(0, 260));

    // ── the read: the rule set first, the bound IN the question (created OR sent since it — D12), newest first, ties on
    // the id, and ONE row past the cap so the export can say it cut (D10) ──
    const pListFlat = flat16(pList);
    const WHERE16 = "where: { msisdn, OR: [{ createdAt: { gte: bound } }, { sentAt: { gte: bound } }] },";
    ok("26.u16a.list.prisma · ⛔ the Prisma listByMsisdn asks assertRecipientNumberRead FIRST, then ONE findMany whose WHERE holds the number AND the bound — created OR sent at or after the instant, both arms — never a filter after the fetch — ordered createdAt desc THEN id desc, taking ONE row past SMS_RECIPIENTS_BY_NUMBER_MAX, read back through the one mapper",
      before(pList, "assertRecipientNumberRead(msisdn, sinceIso)", ".findMany(")
        && (pList.match(/[.]findMany[(]/g) ?? []).length === 1
        && pListFlat.includes("const bound = new Date(sinceIso);")
        && pListFlat.includes(WHERE16)
        && pListFlat.includes(`orderBy: [{ createdAt: "desc" }, { id: "desc" }],`)
        && pListFlat.includes("take: SMS_RECIPIENTS_BY_NUMBER_MAX + 1,")
        && pListFlat.includes("return rows.map(toStoredSmsCampaignRecipient);")
        && !/[.]filter[(]/.test(pList),
      pListFlat.slice(0, 320));
    ok("26.u16a.list.memory · the memory listByMsisdn asks assertRecipientNumberRead FIRST, keeps only the number's rows CREATED OR SENT at or after the bound (instants, never text) BEFORE it sorts and cuts, sorts createdAt desc THEN id desc, cuts ONE row past the same SMS_RECIPIENTS_BY_NUMBER_MAX, and hands back copies — the gate trail copied too",
      before(mList, "assertRecipientNumberRead(msisdn, sinceIso)", ".filter(")
        && mList.includes(".filter((r) => r.msisdn === msisdn && (Date.parse(r.createdAt) >= since || (r.sentAt !== null && Date.parse(r.sentAt) >= since)))")
        && before(mList, ".filter(", ".sort(") && before(mList, ".sort(", ".slice(")
        && mList.includes(".sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id))")
        && mList.includes(".slice(0, SMS_RECIPIENTS_BY_NUMBER_MAX + 1)")
        && mList.includes("gateTrail: r.gateTrail === null ? null : r.gateTrail.map((g) => ({ ...g }))"),
      flat16(mList).slice(0, 320));

    // ── ONE rule set and ONE bound for both twins ──
    const RULES16 = "@/lib/server/marketing/campaign-model";
    const importOf16 = (src: string): string => {
      const end = src.indexOf(`} from "${RULES16}";`);
      return end < 0 ? "" : src.slice(src.lastIndexOf("import {", end), end);
    };
    const ruleImports16 = [importOf16(storeSrc), importOf16(dalSrc)];
    ok("26.u16a.bound · ONE rule set and ONE bound for both twins: store.ts and prisma-dal.ts each import assertRecipientUnlink, assertRecipientNumberRead and SMS_RECIPIENTS_BY_NUMBER_MAX from campaign-model.ts, and neither declares the bound itself",
      ruleImports16.every((t) => ["assertRecipientUnlink", "assertRecipientNumberRead", "SMS_RECIPIENTS_BY_NUMBER_MAX"].every((n) => t.includes(n)))
        && ![storeSrc, dalSrc].some((t) => t.includes("const SMS_RECIPIENTS_BY_NUMBER_MAX")),
      ruleImports16.map((t) => flat16(t).slice(0, 180)).join(" | "));

    // ── CONTROLS — each proves the matcher above it can reject, on a literal that would otherwise pass ──
    ok("26.u16a.c1 · CONTROL · an unlink whose data also clears the contact link, and one that matches by the number, each FAIL 26.u16a.unlink.prisma's matcher",
      !"updateMany({ where: { userId }, data: { userId: null, contactId: null, updatedAt: new Date(at) } })".includes(UNLINK_ONE)
        && !"updateMany({ where: { msisdn }, data: { userId: null, updatedAt: new Date(at) } })".includes(UNLINK_ONE));
    ok("26.u16a.c2 · CONTROL · a read that bounds AFTER the fetch, one ordered by createdAt alone, one whose WHERE lost the sentAt arm and one that takes only the cap each FAIL 26.u16a.list.prisma's matcher",
      /[.]filter[(]/.test("const rows = (await pc().smsCampaignRecipient.findMany({ where: { msisdn } })).filter((r) => r.createdAt >= new Date(sinceIso));")
        && !`orderBy: [{ createdAt: "desc" }],`.includes(`orderBy: [{ createdAt: "desc" }, { id: "desc" }],`)
        && !"where: { msisdn, createdAt: { gte: bound } },".includes(WHERE16)
        && !"take: SMS_RECIPIENTS_BY_NUMBER_MAX,".includes("take: SMS_RECIPIENTS_BY_NUMBER_MAX + 1,"));
    ok("26.u16a.c3 · CONTROL · a member in one twin only IS seen: with unlinkUser renamed in the Prisma block, the parity check's member list no longer holds it while the memory block's does",
      !both16(rPri.split("unlinkUser: async").join("unlinkAccount: async")) && both16(rMem));
    ok("26.u16a.c4 · CONTROL · a memory unlink that also rewrites the status IS counted as a third assignment",
      (["        r.userId = null;", "        r.updatedAt = at;", '        r.status = "SKIPPED";'].join(String.fromCharCode(10)).match(/r[.][A-Za-z]+ = /g) ?? []).length === 3);
  }
}

/* ═══ §27 · The list basis — ContactListBasis in both twins (U33a-L, S10 2026-10-04; OD57 · OD58) ═══ */
{
  // ⭐ WHY THIS SECTION EXISTS. A ContactListBasis row is the record behind every message U33a-G will let through under
  // the licence: a list, the instant an officer recorded it, the words then in force, and who revoked it. Its coverage
  // read decides whether a stranger is ALLOWED, so a twin that loses its half is a person messaged on production while
  // every test refuses them, or the reverse: a tombstone read as live, a member added after the recording counted by a
  // `<`, a revoked recording still covering, a tie broken the other way, a bulk read cut off at 2,000. Every behavioural
  // suite runs on the MEMORY twin, so this section holds the TWO twins to one shape, plantable through KP_SRC
  // (`red:dal-parity`, whose §27 cases live in scripts/anchors/dal-parity.anchors.mjs). The behaviour itself is EXECUTED
  // by `scripts/live/list-basis-pg-probe.mts`: one scenario on PostgreSQL 18.3 and again on the memory twin, every answer
  // equal between the two and to answers written there by hand.
  // ⭐ ROUND 2 (the adversarial review, 2026-10-04): a list's ONE standing is its NEWEST recording, revoked or not (M1,
  // 27.7); both twins ask ONE rule set before they read or write (27.model); coveredCount is { live, covered } from one
  // pass (27.count); neither twin's contactList namespace can delete a list (27.listnodelete); and the wiring only the
  // probe executes is pinned here too (27.wire).
  // ⚠️ BLIND SPOTS, stated rather than implied: this section reads TEXT. 27.writers sees `db.contactListBasis.create(` and
  // `.revoke(`, the namespace handed on bare (`const b = db.contactListBasis`) and a destructure from `db` — but not
  // `db["contactListBasis"]` or `db` passed on under another name; a call through another client name is still a raw
  // delegate to 27.onedoor. And the src walk is this section's own (a third, after §20's and §26's): theirs are
  // block-scoped on lines that hold a backslash, which must stay byte-identical, so this one reads only the files that
  // name the table.
  // ⛔ No backslash anywhere in this section: every line break and quote a matcher needs is built with String.fromCharCode
  // or a character class, because the tools this file is edited with decode escapes (`test:source-bytes`).
  const NL27 = String.fromCharCode(10);
  const CR27 = String.fromCharCode(13);
  const BS27 = String.fromCharCode(92);
  const lf27 = (s: string) => s.split(CR27).join("");
  const NEXT_MEMBER27 = new RegExp(NL27 + " {4}[A-Za-z0-9_]+ *:");
  /** One member's text in a twin's namespace: from the line break before `    <name>: ` to the next member at that indent. */
  const memberOf27 = (block: string, name: string): string => {
    const at = block.indexOf(`${NL27}    ${name}: `);
    if (at < 0) return "";
    const next = block.slice(at + 1).search(NEXT_MEMBER27);
    return next < 0 ? block.slice(at) : block.slice(at, at + 1 + next);
  };
  /** `first` sits in `body` and BEFORE `then` — an order, not a presence: a check after the write is no check. */
  const before27 = (body: string, first: string, then: string): boolean => {
    const a = body.indexOf(first), b = body.indexOf(then);
    return a >= 0 && b > a;
  };
  const count27 = (body: string, needle: string): number => body.split(needle).length - 1;
  const membersOf27 = (block: string): string[] => Array.from(block.matchAll(/^ {4}([A-Za-z0-9_]+) *:/gm)).map((m) => m[1]).sort();
  const priNs = region(dalSrc, `${NL27}  contactListBasis: {`);
  const memNs = region(storeSrc, `${NL27}  contactListBasis: {`);
  const NAMES27 = ["create", "revoke", "listForList", "standingFor", "standingAmong", "coveredCount"] as const;
  type Member27 = (typeof NAMES27)[number];
  const pri27 = Object.fromEntries(NAMES27.map((n) => [n, memberOf27(priNs, n)])) as Record<Member27, string>;
  const mem27 = Object.fromEntries(NAMES27.map((n) => [n, memberOf27(memNs, n)])) as Record<Member27, string>;
  /** The ONE definition of a number's book standing, in each twin, and the memory twin's newest-first order. */
  const priDef = region(dalSrc, "async function bookStandings(");
  const memDef = region(storeSrc, "function bookStandings(");
  const memOrder = region(storeSrc, "function newestBasisFirst(");
  const bRead = region(dalSrc, "function toStoredContactListBasis(");
  /** The ONE rule set both twins ask — read through SRC, so `red:dal-parity` can plant in it (it is in that harness's FILES). */
  const modelSrc = decomment(readFileSync(join(SRC, "lib/server/marketing/list-basis-model.ts"), "utf8"));

  // ── 27.0 · THE PARSER, AND EVERY KEY READ FROM THE ROW ──
  const BASIS_KEYS27 = ["id", "listId", "basisKey", "wording", "wordingVersion", "adultWording", "adultVersion", "proofNote",
    "recordedBy", "recordedAt", "revokedAt", "revokedBy", "revokedReason"];
  const REVOKE_KEYS27 = ["revokedAt", "revokedBy", "revokedReason"];
  const SEED_KEYS27 = BASIS_KEYS27.filter((k) => !REVOKE_KEYS27.includes(k));
  const bKeys = storedKeys("StoredContactListBasis");
  const sKeys = storedKeys("ContactListBasisSeed");
  ok("27.0 · the parser sees StoredContactListBasis's 13 keys and ContactListBasisSeed's 10 — the stored keys less the three revocation keys — and the read mapper, both namespaces, both definitions, the memory order and the rule set all resolve",
    sameSet(bKeys, BASIS_KEYS27) && sameSet(sKeys, SEED_KEYS27) && bRead.length > 300 && priNs.length > 1500 && memNs.length > 1500
      && priDef.length > 1000 && memDef.length > 1000 && memOrder.length > 80 && modelSrc.length > 800
      && NAMES27.every((n) => pri27[n].length > 60 && mem27[n].length > 60),
    `stored [${setDiff(BASIS_KEYS27, bKeys) || bKeys.length}] · seed [${setDiff(SEED_KEYS27, sKeys) || sKeys.length}] · regions ${[bRead, priNs, memNs, priDef, memDef, memOrder, modelSrc].map((r) => r.length).join("/")}`);
  for (const k of bKeys) ok(`27.read · toStoredContactListBasis maps "${k}" from the row`, readsFrom(bRead, k, "b"));
  const mapperKeys27 = (body: string): string[] => Array.from(body.matchAll(/^ {4}([A-Za-z0-9_]+) *:/gm)).map((m) => m[1]);
  ok("27.exact · ⛔ toStoredContactListBasis writes EXACTLY the stored keys — a key planted in the mapper alone is reported",
    bKeys.length === 13 && sameSet(mapperKeys27(bRead), bKeys), setDiff(bKeys, mapperKeys27(bRead)) || `${bKeys.length} keys`);

  // ── 27.1 · create: every seed key FROM the row, born unrevoked, a held id null, never an upsert ──
  /** `key: row.key,` — or the instant built from it: a value taken FROM the row, never a constant under the key's name. */
  const fromRow27 = (body: string, k: string): boolean =>
    body.includes(`${k}: row.${k},`) || body.includes(`${k}: new Date(row.${k}),`) || body.includes(`${k}: new Date(row.${k}).toISOString(),`);
  const unwritten27 = (body: string): string[] => SEED_KEYS27.filter((k) => !fromRow27(body, k));
  const bornNull27 = (body: string): boolean => REVOKE_KEYS27.every((k) => body.includes(`${k}: null,`));
  const MISSING_LIST27 = "if (!store.contactLists.has(row.listId)) throw Object.assign(new Error(";
  ok("27.1.prisma · ⭐ contactListBasis.create writes EVERY seed key FROM the row (recordedAt as a Date), the three revocation keys as null — a basis is born unrevoked — turns P2002 into null, lets every other failure (P2003, a missing list) throw, and NEVER upserts",
    unwritten27(pri27.create).length === 0 && bornNull27(pri27.create)
      && pri27.create.includes('if ((err as { code?: string })?.code === "P2002") return null;') && pri27.create.includes("throw err;")
      && !mentions(pri27.create, "upsert"),
    unwritten27(pri27.create).join(",") || `${pri27.create.length} chars`);
  ok("27.1.memory · ⭐ the memory create refuses an id already held with null BEFORE anything is written, then a list that does not exist (the foreign key — carrying P2003's code, as Prisma's error does), writes every seed key from the row BY NAME — never a spread — the revocation as null and the instant as Postgres stores it, and hands back a copy",
    before27(mem27.create, "if (store.contactListBases.has(row.id)) return null;", MISSING_LIST27)
      && before27(mem27.create, MISSING_LIST27, "store.contactListBases.set(row.id, stored);")
      && mem27.create.includes('(memory twin of P2003) — nothing was written`), { code: "P2003" });')
      && unwritten27(mem27.create).length === 0 && bornNull27(mem27.create) && mem27.create.includes("recordedAt: new Date(row.recordedAt).toISOString(),")
      && !mem27.create.includes("...row") && mem27.create.includes("return { ...stored };"),
    unwritten27(mem27.create).join(",") || `${mem27.create.length} chars`);

  // ── 27.2 · revoke: set ONCE ──
  ok("27.2.prisma · ⭐ revoke is ONE conditional updateMany — where { id: r.id, revokedAt: null } — writing all three revocation fields (the instant as a Date), then the row read back by id: an unknown id is null, and a second or a racing revoke matches nothing and hands back the FIRST revocation unmoved",
    pri27.revoke.includes("where: { id: r.id, revokedAt: null },") && pri27.revoke.includes("data: { revokedAt: new Date(r.at), revokedBy: r.by, revokedReason: r.reason },")
      && before27(pri27.revoke, ".updateMany(", ".findUnique(") && pri27.revoke.includes("const row = await pc().contactListBasis.findUnique({ where: { id: r.id } });")
      && pri27.revoke.includes("return row ? toStoredContactListBasis(row) : null;") && (pri27.revoke.match(/[.]update/g) ?? []).length === 1,
    `${pri27.revoke.length} chars`);
  ok("27.2.memory · ⭐ the memory revoke answers null for an unknown id and hands back a revoked basis AS IT IS — both asked BEFORE it writes, so the first revocation is never moved — and writes all three fields in one step on an unrevoked one",
    before27(mem27.revoke, "if (row === undefined) return null;", "store.contactListBases.set(")
      && before27(mem27.revoke, "if (row.revokedAt !== null) return { ...row };", "store.contactListBases.set(")
      && mem27.revoke.includes("const next: StoredContactListBasis = { ...row, revokedAt: new Date(r.at).toISOString(), revokedBy: r.by, revokedReason: r.reason };"),
    `${mem27.revoke.length} chars`);

  // ── 27.3 · ⛔ NO UPDATE MEMBER AND NO DELETE MEMBER, IN EITHER TWIN ──
  const MEMBERS27 = [...NAMES27].sort();
  const forbidden27 = (block: string): string[] => membersOf27(block).filter((m) => /^(update|delete|upsert|remove|set|clear)/i.test(m));
  ok("27.3 · ⛔ APPEND-ONLY, ASSERTED AS AN ABSENCE (as §17) — both twins expose EXACTLY create, revoke, listForList, standingFor, standingAmong and coveredCount: no update member and no delete member, and neither namespace deletes, clears or upserts a row",
    sameSet(membersOf27(priNs), MEMBERS27) && sameSet(membersOf27(memNs), MEMBERS27) && forbidden27(priNs).length === 0 && forbidden27(memNs).length === 0
      && !/delete|upsert|destroy|[.]clear[(]/i.test(priNs + memNs),
    `prisma=[${membersOf27(priNs)}] memory=[${membersOf27(memNs)}]`);

  // ── 27.4 · listForList, newest first ──
  const PRI_ORDER27 = 'orderBy: [{ recordedAt: "desc" }, { id: "desc" }],';
  const MEM_ORDER27 = "return Date.parse(b.recordedAt) - Date.parse(a.recordedAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);";
  ok("27.4 · listForList is NEWEST FIRST in both twins — the Prisma where { listId } ordered recordedAt DESC then id DESC in its OWN text; the memory twin filtered to the list and sorted by newestBasisFirst, which compares the INSTANTS (Date.parse) descending, then the id descending — and hands back copies",
    pri27.listForList.includes("where: { listId },") && pri27.listForList.includes(PRI_ORDER27) && pri27.listForList.includes("return rows.map(toStoredContactListBasis);")
      && mem27.listForList.includes(".filter((b) => b.listId === listId)") && mem27.listForList.includes(".sort(newestBasisFirst)")
      && mem27.listForList.includes(".map((b) => ({ ...b }))") && memOrder.includes(MEM_ORDER27) && !/localeCompare/.test(memOrder),
    `${pri27.listForList.length}/${mem27.listForList.length} chars`);

  // ── 27.5 · the four answers of the ONE definition ──
  const NONE27 = 'if (row === undefined) return { msisdn, standing: { row: "none", cover: null } };';
  const ERASED27 = 'if (row.sourceRef === ERASURE_EVIDENCE) return { msisdn, standing: { row: "erased", cover: null } };';
  const LIVE27 = 'return { msisdn, standing: { row: "live", cover } };';
  const MARK_IMPORT27 = 'import { ERASURE_EVIDENCE } from "@/lib/marketing/erasure-mark";';
  const Q27 = ['"', "'", String.fromCharCode(96)].join("");
  const QUOTED27 = new RegExp("[" + Q27 + "]erasure[" + Q27 + "]");
  ok("27.5 · ⭐ standingFor's FOUR answers, in both twins' ONE definition — no book row → none; the erased tombstone → erased with NO cover, asked BEFORE any cover (S9: its memberships cover nothing, and the Prisma twin never even reads them); a live row → live, with its cover or null — the mark read through the ONE binding (imported from erasure-mark, never a quoted literal)",
    [priDef, memDef].every((d) => before27(d, NONE27, ERASED27) && before27(d, ERASED27, LIVE27))
      && priDef.includes("const liveIds = rows.filter((r) => r.sourceRef !== ERASURE_EVIDENCE).map((r) => r.id);") && priDef.includes("where: { contactId: { in: liveIds } },")
      && memDef.includes("for (const c of rows.values()) if (c.sourceRef !== ERASURE_EVIDENCE) liveIds.add(c.id);") && memDef.includes("if (!liveIds.has(m.contactId)) continue;")
      && priDef.includes("where: { msisdn: { in: [...keys] } },") && memDef.includes("const id = store.contactsByMsisdn.get(msisdn);")
      && dalSrc.includes(MARK_IMPORT27) && storeSrc.includes(MARK_IMPORT27) && !QUOTED27.test(priDef + memDef + priNs + memNs),
    `${priDef.length}/${memDef.length} chars`);

  // ── 27.6 · THE BOUNDARY ──
  ok("27.6 · ⭐ THE BOUNDARY — a member added AT the recording is covered, one added a millisecond later is not: `<=` on INSTANTS in both twins (Prisma: the Dates' getTime(); memory: Date.parse on both sides, never string order), and coveredCount's bound is the same `<=` (Prisma in its one statement; memory Date.parse <=)",
    priDef.includes("lists.set(m.listId, m.addedAt.getTime());") && priDef.includes("return joinedAt !== undefined && joinedAt <= b.recordedAt.getTime();")
      && memDef.includes("lists.set(m.listId, Date.parse(m.addedAt));") && memDef.includes("return joinedAt !== undefined && joinedAt <= Date.parse(b.recordedAt);")
      && pri27.coveredCount.includes('m."addedAt" <= ${bound}::timestamptz')
      && mem27.coveredCount.includes("if (bound !== null && Date.parse(m.addedAt) <= bound) out.covered++;"),
    `${priDef.length}/${memDef.length} chars`);

  // ── 27.7 · ⛔ A LIST'S ONE STANDING IS ITS NEWEST RECORDING (M1) ──
  const NEWEST27 = "for (const b of bases) if (!newest.has(b.listId)) newest.set(b.listId, b);";
  const IN_FORCE27 = "const inForce = [...newest.values()].filter((b) => b.revokedAt === null);";
  const FIND27 = "const found = lists === undefined ? undefined : inForce.find((b) => {";
  ok("27.7 · ⛔ A LIST'S ONE STANDING IS ITS NEWEST RECORDING, revoked or not, in both twins (M1) — the definition reads EVERY recording of the lists, with no revocation filter (Prisma selects revokedAt and its where names only the lists), newest first in its own text; keeps the FIRST per list and drops it when revoked, so revoking the newest ends the list's coverage and an older recording never comes back; then takes the FIRST in-force recording a member joined before; and coveredCount bounds by the NEWEST recording, null when it is revoked",
    priDef.includes("where: { listId: { in: listIds } },") && priDef.includes("select: { id: true, listId: true, recordedAt: true, revokedAt: true },")
      && priDef.includes(PRI_ORDER27) && !priDef.includes("revokedAt: null")
      && memDef.includes(".filter((b) => listIds.has(b.listId))") && memDef.includes(".sort(newestBasisFirst);")
      && [priDef, memDef].every((d) => d.includes(NEWEST27) && d.includes(IN_FORCE27) && d.includes(FIND27) && before27(d, NEWEST27, IN_FORCE27)
        && count27(d, "revokedAt === null") === 1)
      && pri27.coveredCount.includes("where: { listId },") && pri27.coveredCount.includes(PRI_ORDER27)
      && pri27.coveredCount.includes("select: { recordedAt: true, revokedAt: true },") && !pri27.coveredCount.includes("revokedAt: null")
      && pri27.coveredCount.includes("const bound = newest !== null && newest.revokedAt === null ? newest.recordedAt.toISOString() : null;")
      && mem27.coveredCount.includes(".filter((b) => b.listId === listId)") && mem27.coveredCount.includes(".sort(newestBasisFirst)[0];")
      && mem27.coveredCount.includes("const bound = newest !== undefined && newest.revokedAt === null ? Date.parse(newest.recordedAt) : null;"),
    `${priDef.length}/${memDef.length} chars · revocation tests ${count27(priDef, "revokedAt === null")}/${count27(memDef, "revokedAt === null")}`);

  // ── 27.8 · standingAmong: §25's shape, and equal to standingFor by construction ──
  const KEYS27 = 'const keys = bulkKeys(msisdns, "contactListBasis.standingAmong");';
  const EMPTY27 = "if (keys.length === 0) return [];";
  ok("27.8 · ⭐ standingAmong is §25's shape in both twins — its keys through bulkKeys (deduplicated, REFUSED above BULK_KEYED_READ_MAX, never cut off), an empty set answered with nothing BEFORE the definition is asked, then the ONE definition, which answers one entry per key, ordered by key; and standingFor asks the SAME definition of one key, so the two agree element by element by construction",
    [pri27.standingAmong, mem27.standingAmong].every((s) => before27(s, KEYS27, EMPTY27) && before27(s, EMPTY27, "return bookStandings(keys);"))
      && pri27.standingFor.includes("standingFor: async (msisdn: string): Promise<BookStanding> => (await bookStandings([msisdn]))[0].standing,")
      && mem27.standingFor.includes("standingFor: (msisdn: string): BookStanding => bookStandings([msisdn])[0].standing,")
      && [priDef, memDef].every((d) => d.includes("return [...keys].sort().map((msisdn): BookStandingEntry => {"))
      && !/[.]slice[(]|[.]splice[(]/.test(pri27.standingAmong + mem27.standingAmong + priDef + memDef),
    `${pri27.standingAmong.length}/${mem27.standingAmong.length} chars`);

  // ── 27.9 · ⛔ never an empty `in` ──
  ok("27.9 · ⛔ THE PRISMA TWIN NEVER SENDS AN EMPTY `in` — the definition's three queries are each guarded: an empty key set returns [] before the first pc(), the memberships are read only when a live row exists, the bases only when a membership does — exactly three `in` lists, and no OR built from a list anywhere in the definition (a nested OR: [] reads as NO condition on Postgres here)",
    before27(priDef, EMPTY27, "pc()")
      && priDef.includes("const members: BookMemberRow[] = liveIds.length === 0 ? [] : await pc().contactListMember.findMany({")
      && priDef.includes("const bases: BookBasisRow[] = listIds.length === 0 ? [] : await pc().contactListBasis.findMany({")
      && priDef.split("{ in: ").length - 1 === 3 && !priDef.includes("OR:"),
    `in-lists ${priDef.split("{ in: ").length - 1}`);

  // ── 27.count · coveredCount is { live, covered } from ONE pass (m3) ──
  const COUNT_SQL27 = [
    "select count(*)::int as live,",
    '(count(*) filter (where ${bound}::timestamptz is not null and m."addedAt" <= ${bound}::timestamptz))::int as covered',
    'from "ContactListMember" m',
    'join "MarketingContact" c on c."id" = m."contactId"',
    'where m."listId" = ${listId}',
    'and c."userId" is null',
    'and c."sourceRef" is distinct from ${ERASURE_EVIDENCE}::text`;',
  ];
  const LIVE_SKIP27 = "if (c === undefined || c.userId !== null || c.sourceRef === ERASURE_EVIDENCE) continue;";
  ok("27.count · coveredCount is { live, covered } from ONE pass in both twins (m3) — Prisma: ONE findFirst of the list's newest recording, then ONE statement over the list's members joined to the book: live = the rows not the tombstone (the mark left out NULL-SAFELY, `is distinct from`) and linked to NO account (a list basis never reaches an account's number, S3), covered = those of them FILTERed to the bound, both cast ::int; memory: one loop that skips a missing, linked or erased row, counts it live, and covered when it joined at or before the bound",
    COUNT_SQL27.every((l) => pri27.coveredCount.includes(l)) && before27(pri27.coveredCount, ".findFirst(", "$queryRaw")
      && pri27.coveredCount.includes("return { live: Number(rows[0]?.live ?? 0), covered: Number(rows[0]?.covered ?? 0) };")
      && (pri27.coveredCount.match(/[.]count[(]|[.]findMany[(]/g) ?? []).length === 0
      && mem27.coveredCount.includes("const out: ListBasisCoverage = { live: 0, covered: 0 };")
      && before27(mem27.coveredCount, LIVE_SKIP27, "out.live++;")
      && before27(mem27.coveredCount, "out.live++;", "if (bound !== null && Date.parse(m.addedAt) <= bound) out.covered++;")
      && mem27.coveredCount.includes("return out;"),
    `sql lines missing [${COUNT_SQL27.filter((l) => !pri27.coveredCount.includes(l)).map((l) => l.slice(0, 30))}]`);

  // ── 27.model · ONE rule set, asked first, in both twins (m1 · NIT2 · NIT3) ──
  const RULES_IMPORT27 = 'import { assertListBasisSeed, assertListBasisRevocation, assertListBasisKeys } from "@/lib/server/marketing/list-basis-model";';
  const MODEL_NEEDLES27 = [
    "export const LIST_BASIS_ID = /^lb_[a-z]{20}$/;",
    "export const LIST_BASIS_VERSION_MAX = 2147483647;",
    "const NUL = String.fromCharCode(0);",
    'const isText = (v: unknown): v is string => typeof v === "string" && !v.includes(NUL);',
    "const isFilled = (v: unknown): v is string => isText(v) && v.trim().length > 0;",
    "new Date(v).toISOString() === v",
    'typeof v === "number" && Number.isSafeInteger(v) && v >= 1 && v <= LIST_BASIS_VERSION_MAX;',
    'if (typeof row.id !== "string" || !LIST_BASIS_ID.test(row.id))',
    "if (!isVersion(row.wordingVersion))", "if (!isVersion(row.adultVersion))", "if (!isInstant(row.recordedAt))",
    "if (!isText(r.id))", "if (!isFilled(r.by))", "if (!isFilled(r.reason))", "if (!isInstant(r.at))",
    "for (const k of keys) if (!isText(k))",
  ];
  const FILLED27 = ["listId", "basisKey", "wording", "adultWording", "proofNote", "recordedBy"];
  const modelImports27 = Array.from(modelSrc.matchAll(/^import .*$/gm)).map((m) => m[0]);
  const STANDING_KEYS27 = 'assertListBasisKeys("contactListBasis.standing", keys);';
  const LIST_KEYS27 = 'assertListBasisKeys("contactListBasis.listForList", [listId]);';
  const COUNT_KEYS27 = 'assertListBasisKeys("contactListBasis.coveredCount", [listId]);';
  ok("27.model · ⭐ ONE RULE SET, ASKED FIRST, IN BOTH TWINS (m1 · NIT2 · NIT3) — list-basis-model.ts refuses an id that is not lb_ and exactly twenty lower-case letters, a blank list, key, wording, 18+ confirmation, proof note or officer, a version outside 1 to 2,147,483,647, an instant not in toISOString's spelling, and a NUL in any text or key — and imports TYPES only; both twins import it and ask it BEFORE their first read or write: assertListBasisSeed in create, assertListBasisRevocation in revoke, assertListBasisKeys in the definition, listForList and coveredCount",
    MODEL_NEEDLES27.every((n) => modelSrc.includes(n)) && FILLED27.every((k) => modelSrc.includes(`if (!isFilled(row.${k}))`))
      && modelImports27.length >= 1 && modelImports27.every((l) => l.startsWith("import type "))
      && storeSrc.includes(RULES_IMPORT27) && dalSrc.includes(RULES_IMPORT27)
      && before27(mem27.create, "assertListBasisSeed(row);", "if (store.contactListBases.has(row.id)) return null;")
      && before27(pri27.create, "assertListBasisSeed(row);", "pc().contactListBasis.create(")
      && before27(mem27.revoke, "assertListBasisRevocation(r);", "store.contactListBases.get(r.id)")
      && before27(pri27.revoke, "assertListBasisRevocation(r);", ".updateMany(")
      && before27(mem27.listForList, LIST_KEYS27, "store.contactListBases") && before27(pri27.listForList, LIST_KEYS27, "pc()")
      && before27(mem27.coveredCount, COUNT_KEYS27, "store.contactListBases") && before27(pri27.coveredCount, COUNT_KEYS27, "pc()")
      && [memDef, priDef].every((d) => before27(d, EMPTY27, STANDING_KEYS27))
      && before27(memDef, STANDING_KEYS27, "store.contactsByMsisdn") && before27(priDef, STANDING_KEYS27, "pc()"),
    `rule lines missing [${MODEL_NEEDLES27.filter((n) => !modelSrc.includes(n)).map((n) => n.slice(0, 40))}] · imports [${modelImports27.map((l) => l.slice(0, 24))}]`);

  // ── 27.listnodelete · ⛔ RESTRICT HAS NO MEMORY TWIN (m2) ──
  const listPri27 = region(dalSrc, `${NL27}  contactList: {`);
  const listMem27 = region(storeSrc, `${NL27}  contactList: {`);
  const LIST_DELETE27 = /^(delete|remove|destroy|purge|drop|clear)/i;
  ok("27.listnodelete · ⛔ RESTRICT HAS NO MEMORY TWIN — neither twin's contactList namespace has a delete member or deletes a list: a delete added to both would pass every memory suite (no foreign key there to refuse it) and fail on Postgres the day the list carries a basis",
    listPri27.length > 200 && listMem27.length > 200
      && membersOf27(listPri27).every((m) => !LIST_DELETE27.test(m)) && membersOf27(listMem27).every((m) => !LIST_DELETE27.test(m))
      && !/[.]delete(Many)?[(]|[.]clear[(]/.test(listPri27 + listMem27),
    `prisma=[${membersOf27(listPri27)}] memory=[${membersOf27(listMem27)}]`);

  // ── 27.wire · the wiring only the probe executes ──
  ok("27.wire · the wiring ONLY the probe executes, pinned in both twins — the book rows keyed by NUMBER (Prisma byKey.set(r.msisdn, r); memory rows.set(msisdn, c)) and read back by the asked key; the memberships grouped by CONTACT id and read back by the row's id; the list ids derived from those memberships alone",
    priDef.includes("for (const r of rows) byKey.set(r.msisdn, r);") && priDef.includes("const row = byKey.get(msisdn);")
      && memDef.includes("if (c) rows.set(msisdn, c);") && memDef.includes("const row = rows.get(msisdn);")
      && [priDef, memDef].every((d) => d.includes("const lists = joined.get(row.id);") && d.includes("joined.set(m.contactId, lists);"))
      && priDef.includes("const listIds = Array.from(new Set(members.map((m) => m.listId)));")
      && memDef.includes("for (const lists of joined.values()) for (const listId of lists.keys()) listIds.add(listId);"),
    `${priDef.length}/${memDef.length} chars`);

  // ── 27.named · 27.store · 27.keyonly ──
  const SIGS27: Array<[Member27, string, string]> = [
    ["create", "create: (row: ContactListBasisSeed): StoredContactListBasis | null =>", "create: async (row: ContactListBasisSeed): Promise<StoredContactListBasis | null> =>"],
    ["revoke", "revoke: (r: ContactListBasisRevocation): StoredContactListBasis | null =>", "revoke: async (r: ContactListBasisRevocation): Promise<StoredContactListBasis | null> =>"],
    ["listForList", "listForList: (listId: string): StoredContactListBasis[] =>", "listForList: async (listId: string): Promise<StoredContactListBasis[]> =>"],
    ["standingFor", "standingFor: (msisdn: string): BookStanding =>", "standingFor: async (msisdn: string): Promise<BookStanding> =>"],
    ["standingAmong", "standingAmong: (msisdns: string[]): BookStandingEntry[] =>", "standingAmong: async (msisdns: string[]): Promise<BookStandingEntry[]> =>"],
    ["coveredCount", "coveredCount: (listId: string): ListBasisCoverage =>", "coveredCount: async (listId: string): Promise<ListBasisCoverage> =>"],
  ];
  const offSigs27 = SIGS27.filter(([n, m, p]) => !mem27[n].includes(m) || !pri27[n].includes(p)).map(([n]) => n);
  const NAMED27 = ["StoredContactListBasis", "ContactListBasisSeed", "ContactListBasisRevocation", "OutreachBasisCover", "BookStanding", "BookStandingEntry",
    "ListBasisCoverage"];
  const flatDal27 = lf27(dalSrc).split(NL27).map((l) => l.trim()).join(" ");
  const TYPE_IMPORT27 = 'import type { StoredContactListBasis, ContactListBasisSeed, ContactListBasisRevocation, OutreachBasisCover, BookStanding, BookStandingEntry, ListBasisCoverage, } from "./store";';
  ok("27.named · every member names its types in BOTH twins (never an inline literal), and so does the definition — the seven types exported by store.ts and imported by prisma-dal.ts; ContactListBasisRevocation is EXACTLY id, by, reason, at; OutreachBasisCover EXACTLY basisId, listId, recordedAt; BookStanding EXACTLY row, cover; BookStandingEntry EXACTLY msisdn, standing; ListBasisCoverage EXACTLY live, covered",
    offSigs27.length === 0 && NAMED27.every((t) => storeSrc.includes(`export type ${t} = {`)) && flatDal27.includes(TYPE_IMPORT27)
      && sameSet(storedKeys("ContactListBasisRevocation"), ["id", "by", "reason", "at"]) && sameSet(storedKeys("OutreachBasisCover"), ["basisId", "listId", "recordedAt"])
      && sameSet(storedKeys("BookStanding"), ["row", "cover"]) && sameSet(storedKeys("BookStandingEntry"), ["msisdn", "standing"])
      && sameSet(storedKeys("ListBasisCoverage"), ["live", "covered"])
      && memDef.includes("function bookStandings(keys: readonly string[]): BookStandingEntry[] {")
      && priDef.includes("async function bookStandings(keys: readonly string[]): Promise<BookStandingEntry[]> {"),
    `signatures off [${offSigs27}] · type import ${flatDal27.includes(TYPE_IMPORT27)}`);
  ok("27.store · the memory map contactListBases is in the global store's type, its initializer and its hot-reload guard — so a store left by an older build gains it, as every other map does",
    storeSrc.includes("    contactListBases: Map<string, StoredContactListBasis>;") && storeSrc.includes("  contactListBases: new Map(),")
      && storeSrc.includes("if (!store.contactListBases)") && storeSrc.includes("store.contactListBases = new Map();"));
  ok("27.keyonly · the definition reads KEYS, never a person — the book rows by select { id, msisdn, sourceRef } (no name, e-mail or note leaves Postgres), the memberships by { listId, contactId, addedAt }, the recordings by { id, listId, recordedAt, revokedAt } — and a cover carries ids and the instant, never a number",
    priDef.includes("select: { id: true, msisdn: true, sourceRef: true },") && priDef.includes("select: { listId: true, contactId: true, addedAt: true },")
      && priDef.includes("select: { id: true, listId: true, recordedAt: true, revokedAt: true },")
      && priDef.includes("const cover: OutreachBasisCover | null = found === undefined ? null : { basisId: found.id, listId: found.listId, recordedAt: found.recordedAt.toISOString() };")
      && memDef.includes("const cover: OutreachBasisCover | null = found === undefined ? null : { basisId: found.id, listId: found.listId, recordedAt: found.recordedAt };"));

  // ── 27.onedoor · 27.writers · read over the REAL src (ROOT, as 26.onedoor does) ──
  const walk27 = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk27(join(dir, e.name)) : /[.](ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []);
  const src27 = join(ROOT, "src");
  const rel27 = (f: string) => f.slice(src27.length + 1).split(BS27).join("/");
  /** A delegate call on the table by anything but the DAL door (`db.` is the door, so it is not one). */
  const RAW_DELEGATE27 = /(?<!db)[.]contactListBasis *[.] *(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany|findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|groupBy|count|aggregate) *[(]/;
  /** Raw SQL naming the table — the other way round the door. */
  const RAW_SQL27 = /[$](queryRaw|executeRaw)(Unsafe)?[^;]*?"ContactListBasis"/;
  /** A call of the DAL's two writers. */
  const WRITE27 = /db[.]contactListBasis[.](create|revoke) *[(]/;
  /** The namespace handed on bare, or taken by a destructure from `db` — either lets any member be called past WRITE27. */
  const ALIAS27 = [/db[.]contactListBasis(?![.A-Za-z0-9_])/, /[{][^{}]*contactListBasis[^{}]*[}] *= *db(?![.A-Za-z0-9_])/];
  /** ⛔ THE WRITERS, BY NAME — none today. U33b-L's `lib/server/marketing/list-basis.ts` is the ONE writer (spec §6) and
   *  joins this list in its own commit; any other caller is a second door to evidence. */
  /* U33b-L · the ONE writer, named here so any second surface that learns to record or revoke a basis is a failure
     rather than a discovery. ⛔ Add to this list only with the unit that adds the caller. */
  const WRITERS27: string[] = ["lib/server/marketing/list-basis.ts"];
  const walked27 = walk27(src27);
  /** Only the files that name the table at all are decommented and scanned — a file that never spells it cannot call it. */
  const texts27 = walked27.map((f) => [rel27(f), readFileSync(f, "utf8")] as const)
    .filter(([, raw]) => raw.includes("ontactListBasis"))
    .map(([f, raw]) => [f, decomment(raw)] as const);
  const doors27 = texts27.filter(([, t]) => RAW_DELEGATE27.test(t) || RAW_SQL27.test(t)).map(([f]) => f).sort();
  const writers27 = texts27.filter(([, t]) => WRITE27.test(t)).map(([f]) => f).sort();
  const aliases27 = texts27.filter(([, t]) => ALIAS27.some((re) => re.test(t))).map(([f]) => f).sort();
  ok("27.onedoor · ⛔ no src file but prisma-dal.ts calls a contactListBasis delegate or names the table in raw SQL — the append-only rule and the ONE definition of coverage cannot be walked round",
    walked27.length > 300 && doors27.join(",") === "lib/server/prisma-dal.ts" && !RAW_SQL27.test(dalSrc), `callers=[${doors27}] · ${walked27.length} files walked, ${texts27.length} name the table`);
  ok("27.writers · ⛔ the DAL's two writers (create, revoke) are called by EXACTLY the files named in WRITERS27 — none until U33b-L's list-basis.ts, the one writer, joins it by name — and no file hands the namespace on bare or destructures it from db, so no other surface records or revokes a basis",
    sameSet(writers27, WRITERS27) && aliases27.length === 0, `writers=[${writers27}] · aliases=[${aliases27}]`);

  // ── 27.schema · the model, the migration and the stored shape name ONE column set (read from ROOT) ──
  const model27 = schemaModel(prismaSchemaSrc, "ContactListBasis");
  const scalars27 = schemaScalars(model27);
  const collapsed27 = lf27(model27).split(NL27).map((l) => l.trim().split(" ").filter(Boolean).join(" "));
  const MIG_DIR27 = join(ROOT, "prisma", "migrations");
  const migDirs27 = readdirSync(MIG_DIR27).filter((d) => d.endsWith("_contact_list_basis"));
  const migSql27 = migDirs27.length === 1 ? lf27(readFileSync(join(MIG_DIR27, migDirs27[0], "migration.sql"), "utf8")) : "";
  /** The quoted column names of a `CREATE TABLE "<table>" (` block, one per line, up to its `);` — the CONSTRAINT line skipped. */
  const createdColumns27 = (sql: string, table: string): string[] => {
    const lines = sql.split(NL27);
    const at = lines.findIndex((l) => l.startsWith(`CREATE TABLE "${table}" (`));
    const out: string[] = [];
    for (let i = at + 1; at >= 0 && i < lines.length && !lines[i].startsWith(");"); i++) {
      const t = lines[i].trim();
      if (t.startsWith('"')) out.push(t.slice(1, t.indexOf('"', 1)));
    }
    return out;
  };
  /** A migration's statements — comment lines out, each statement's whitespace collapsed. */
  const statements27 = (sql: string): string[] => sql.split(NL27).filter((l) => !l.trim().startsWith("--")).join(NL27)
    .split(";").map((s) => s.split(NL27).map((l) => l.trim()).filter(Boolean).join(" ")).filter((s) => s.length > 0);
  const migStatements27 = statements27(migSql27);
  const KINDS27: Record<string, string> = { wordingVersion: "int", adultVersion: "int", recordedAt: "ts", revokedAt: "ts" };
  ok("27.schema · ONE column set — ContactListBasis's scalar fields in schema.prisma are exactly StoredContactListBasis's keys (two Int, two Timestamptz(3), the rest String; the id minted by the service, no default), exactly one migration folder ends _contact_list_basis, its CREATE TABLE names exactly those columns, and its four statements create the table, its two indexes and its RESTRICT foreign key and touch nothing else; ContactList carries the back-relation",
    sameSet([...scalars27.keys()], BASIS_KEYS27) && BASIS_KEYS27.every((k) => scalars27.get(k) === (KINDS27[k] ?? "text"))
      && collapsed27.includes("id String @id") && collapsed27.includes("recordedAt DateTime @db.Timestamptz(3)") && collapsed27.includes("revokedAt DateTime? @db.Timestamptz(3)")
      && model27.includes("@relation(fields: [listId], references: [id], onDelete: Restrict)") && model27.includes("@@index([listId, recordedAt])") && model27.includes("@@index([recordedAt])")
      && schemaModel(prismaSchemaSrc, "ContactList").includes("ContactListBasis[]")
      && migDirs27.length === 1 && sameSet(createdColumns27(migSql27, "ContactListBasis"), BASIS_KEYS27)
      && migStatements27.length === 4 && migStatements27.every((s) => s.includes('"ContactListBasis"'))
      && migSql27.includes('CREATE INDEX "ContactListBasis_listId_recordedAt_idx" ON "ContactListBasis"("listId", "recordedAt");')
      && migSql27.includes('CREATE INDEX "ContactListBasis_recordedAt_idx" ON "ContactListBasis"("recordedAt");')
      && migSql27.includes('ALTER TABLE "ContactListBasis" ADD CONSTRAINT "ContactListBasis_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ContactList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;'),
    `fields [${setDiff(BASIS_KEYS27, [...scalars27.keys()]) || scalars27.size}] · folders ${migDirs27.length} · columns [${setDiff(BASIS_KEYS27, createdColumns27(migSql27, "ContactListBasis")) || "13"}] · statements ${migStatements27.length}`);

  // ── CONTROLS — each proves the matcher above it can reject, on a literal that would otherwise pass ──
  const planted27 = storeSrc.replace("export type StoredContactListBasis = {", "export type StoredContactListBasis = {" + NL27 + "  plantedKey: string;");
  ok("27.c1 · CONTROL · a key PLANTED in StoredContactListBasis is seen by the parser, breaks 27.0's exact set and is reported unmapped by the read mapper and by both creates (as §0)",
    storedKeys("StoredContactListBasis", planted27).includes("plantedKey") && !sameSet(storedKeys("StoredContactListBasis", planted27), BASIS_KEYS27)
      && !readsFrom(bRead, "plantedKey", "b") && !fromRow27(pri27.create, "plantedKey") && !fromRow27(mem27.create, "plantedKey"));
  ok("27.c2 · CONTROL · `revokedAt: null,` in the read mapper does NOT count as reading revokedAt from the row, and a create that writes a constant under a seed key is reported",
    !readsFrom("    revokedBy: b.revokedBy," + NL27 + "    revokedAt: null,", "revokedAt", "b") && !fromRow27('            wording: "a constant",', "wording"));
  ok("27.c3 · CONTROL · the strict `<` and a string comparison each FAIL 27.6's needles",
    !"return joinedAt !== undefined && joinedAt < Date.parse(b.recordedAt);".includes("return joinedAt !== undefined && joinedAt <= Date.parse(b.recordedAt);")
      && !"if (bound !== null && m.addedAt <= newest.recordedAt) out.covered++;".includes("if (bound !== null && Date.parse(m.addedAt) <= bound) out.covered++;"));
  ok("27.c4 · CONTROL · the OLD rule — revocation filtered before the newest is taken — an order without the id leg, and a standing that keeps a revoked newest recording each FAIL 27.7's needles",
    !"where: { listId: { in: listIds }, revokedAt: null },".includes("where: { listId: { in: listIds } },")
      && count27(".filter((b) => listIds.has(b.listId) && b.revokedAt === null) " + IN_FORCE27, "revokedAt === null") === 2
      && !'orderBy: [{ recordedAt: "desc" }],'.includes(PRI_ORDER27)
      && !"const inForce = [...newest.values()];".includes(IN_FORCE27));
  ok("27.c5 · CONTROL · a standingAmong that CUTS its keys at the bound FAILS 27.8 — it never takes them through bulkKeys, and its slice is seen",
    !before27("const keys = Array.from(new Set(msisdns)).slice(0, BULK_KEYED_READ_MAX); if (keys.length === 0) return []; return bookStandings(keys);", KEYS27, EMPTY27)
      && /[.]slice[(]|[.]splice[(]/.test("const keys = Array.from(new Set(msisdns)).slice(0, BULK_KEYED_READ_MAX);"));
  ok("27.c6 · CONTROL · an update member IS seen by 27.3, both by the member set and by its name",
    membersOf27("  contactListBasis: {" + NL27 + "    update: (id: string): null => null," + NL27 + "  },").includes("update")
      && forbidden27("    updateWords: async () => null,").length === 1);
  ok("27.c7 · CONTROL · a raw delegate call and raw SQL naming the table ARE caught by 27.onedoor and the DAL door is not; a writer call IS caught by 27.writers and a read is not",
    RAW_DELEGATE27.test("await pc().contactListBasis.update({ where: { id }, data });") && RAW_DELEGATE27.test("await tx.contactListBasis.deleteMany({});")
      && RAW_SQL27.test('await pc().$executeRawUnsafe(`delete from "ContactListBasis"`);')
      && !RAW_DELEGATE27.test("await db.contactListBasis.revoke(r);") && !RAW_DELEGATE27.test("store.contactListBases.get(id);")
      && WRITE27.test("await db.contactListBasis.create(seed);") && WRITE27.test("await db.contactListBasis.revoke(r);") && !WRITE27.test("await db.contactListBasis.standingFor(m);"));
  ok("27.c8 · CONTROL · the column reader reads every quoted column of a CREATE TABLE and skips its CONSTRAINT line, and the statement splitter drops comments, semicolons in them included",
    sameSet(createdColumns27(['CREATE TABLE "T" (', '    "a" TEXT NOT NULL,', '    "b" INTEGER,', "", '    CONSTRAINT "T_pkey" PRIMARY KEY ("a")', ");"].join(NL27), "T"), ["a", "b"])
      && statements27(["-- CreateTable; with a semicolon", "CREATE INDEX x ON y(z);", "-- AddForeignKey", "ALTER TABLE y ADD z;"].join(NL27)).length === 2);
  const ID27 = /^lb_[a-z]{20}$/;
  ok("27.c9 · CONTROL · the id pattern 27.model pins means what it says — lb_ and twenty lower-case letters pass; upper case, nineteen or twenty-one letters, a digit and a missing prefix are refused",
    ID27.test(`lb_${"a".repeat(20)}`) && !ID27.test(`lb_${"A".repeat(20)}`) && !ID27.test(`lb_${"a".repeat(19)}`) && !ID27.test(`lb_${"a".repeat(21)}`)
      && !ID27.test(`lb_${"a".repeat(19)}1`) && !ID27.test("a".repeat(23)) && String(ID27) === "/^lb_[a-z]{20}$/");
  ok("27.c10 · CONTROL · the alias shapes ARE caught by 27.writers — the namespace bound bare and a destructure from db — and an ordinary member call is not",
    ALIAS27[0].test("const b = db.contactListBasis;") && ALIAS27[1].test("const { contactListBasis } = db;")
      && !ALIAS27.some((re) => re.test("await db.contactListBasis.standingFor(m);")));
  ok("27.c11 · CONTROL · a delete member on contactList IS seen by 27.listnodelete, and so is a delete call",
    membersOf27("  contactList: {" + NL27 + "    delete: (id: string): boolean => true," + NL27 + "  },").some((m) => LIST_DELETE27.test(m))
      && /[.]delete(Many)?[(]|[.]clear[(]/.test("store.contactLists.delete(id)"));
  ok("27.c12 · CONTROL · a rule set whose text check forgets the NUL FAILS 27.model's needles, and a twin that asks the rules AFTER its write fails the order",
    !MODEL_NEEDLES27.every((n) => modelSrc.replace('typeof v === "string" && !v.includes(NUL);', 'typeof v === "string";').includes(n))
      && !before27("store.contactListBases.set(row.id, stored); assertListBasisSeed(row);", "assertListBasisSeed(row);", "store.contactListBases.set("));
}

console.log(`\ndal-parity: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
