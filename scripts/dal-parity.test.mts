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
 * KP_SRC points the gate at a copied tree — `red:dal-parity`'s mechanism.
 * Run: npm run test:dal-parity
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.KP_SRC ?? join(ROOT, "src");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const storeSrc = decomment(readFileSync(join(SRC, "lib/server/store.ts"), "utf8"));
const dalSrc = decomment(readFileSync(join(SRC, "lib/server/prisma-dal.ts"), "utf8"));

/** Top-level keys of `export type <Name> = { … };` — the Stored shape's field list. */
function storedKeys(typeName: string): string[] {
  const start = storeSrc.indexOf(`export type ${typeName} = {`);
  if (start < 0) return [];
  // Walk to the matching close brace at depth 0.
  let depth = 0, i = storeSrc.indexOf("{", start), end = -1;
  for (; i < storeSrc.length; i++) {
    if (storeSrc[i] === "{") depth++;
    else if (storeSrc[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = storeSrc.slice(storeSrc.indexOf("{", start) + 1, end);
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

console.log(`\ndal-parity: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
