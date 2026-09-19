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

/* ═══ §10 · the market reopen stamp (house bots, N1 §2) ══════════════════════════════════ */
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
}

/* ═══ §11 · schema.prisma (house bots) ═══════════════════════════════════════════════════ */
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
}

console.log(`\ndal-parity: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
