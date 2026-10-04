/**
 * BATCH 7 · THE BULK REMOVE IS ALL OR NOTHING — ON REAL POSTGRES (S10, 2026-10-03).
 *
 * The adversarial review found the chunked Remove (one deleteMany per 1,000 ids, no transaction) could leave ~36,000 of a
 * confirmed filter removed after a fault part-way. The fix: `db.marketingContact.removeBoundWhere(where, ids)` runs every
 * chunk inside ONE Prisma interactive transaction. The memory twin cannot prove a rollback, so this probe does it here:
 *   A · bound — only the confirmed ids that STILL match the filter go; a confirmed id that no longer matches stays;
 *   B · all or nothing — 5,002 confirmed rows (two chunks of the DAL's 5,000), a delete fault PLANTED by a trigger on a
 *       row of the SECOND chunk: the call throws and all 5,002 are still there (the first chunk's 5,000 rolled back);
 *       the trigger dropped, the same call removes all 5,002;
 *   C · an empty id list writes nothing.
 *
 * Run inside a scratch cluster only (it writes and deletes rows):
 *   npm run db:probe-contacts-remove-bound   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import type { StoredMarketingContact } from "../../src/lib/server/store.ts";

process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("contacts-remove-bound-pg-probe: needs DATABASE_URL (a scratch Postgres) — the memory twin proves nothing here.");
  process.exit(2);
}
{
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("contacts-remove-bound-pg-probe: refusing — it deletes rows, and runs only against a loopback scratch cluster.");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { prisma } = await import("../../src/lib/server/prisma.ts");
const { toAudienceWhere, WHOLE_BOOK } = await import("../../src/lib/server/marketing/audience.ts");
const { parseTzNumber } = await import("../../src/lib/tz-msisdn.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const pg = prisma();
if (!pg) throw new Error("contacts-remove-bound-pg-probe: no Prisma client");

const start = await pg.marketingContact.count();
ok("0 · CONTROL · the scratch book starts EMPTY — every row below is this probe's own", start === 0, `${start} rows`);
if (start !== 0) process.exit(1);

function row(id: string, local: string, tags: string[]): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null,
    source: "IMPORT", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null,
    tags, notes: null, importId: null, createdAt: "2026-09-01T08:00:00.000Z", createdBy: null,
    updatedAt: "2026-09-01T08:00:00.000Z", updatedBy: null,
  };
}
const local = (n: number) => `0713${String(n).padStart(6, "0")}`;
async function seed(rows: StoredMarketingContact[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 50) await Promise.all(rows.slice(i, i + 50).map((r) => db.marketingContact.create(r)));
}
const whereFor = (tag: string) => toAudienceWhere({ ...WHOLE_BOOK, tags: [tag] });
const countTag = (tag: string) => pg.marketingContact.count({ where: { tags: { has: tag } } });

/* ── A · bound: the confirmed ids that still match ── */
const aVip = Array.from({ length: 6 }, (_, i) => row(`pa${i}`, local(100 + i), ["a-vip"]));
const aPlain = Array.from({ length: 2 }, (_, i) => row(`pb${i}`, local(200 + i), []));
await seed([...aVip, ...aPlain]);
const a = await db.marketingContact.removeBoundWhere(whereFor("a-vip"), [...aVip, ...aPlain].map((r) => r.id));
const aLeft = await pg.marketingContact.findMany({ where: { id: { in: [...aVip, ...aPlain].map((r) => r.id) } }, select: { id: true } });
ok("A · bound: of 8 confirmed ids, the 6 that match the filter go and the 2 that do not stay",
  a.matched === 6 && a.changed === 6 && aLeft.map((r) => r.id).sort().join(",") === "pb0,pb1", `${JSON.stringify(a)} · left ${aLeft.map((r) => r.id).join(",")}`);

/* ── B · all or nothing, across two chunks ── */
const bulk = Array.from({ length: 5002 }, (_, i) => row(`pc${String(i).padStart(5, "0")}`, local(10000 + i), ["b-bulk"]));
await seed(bulk);
ok("B · SETUP · 5,002 confirmed rows carry the tag (two chunks of 5,000)", (await countTag("b-bulk")) === 5002);
await pg.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION probe_block_delete() RETURNS trigger AS $fn$
BEGIN
  IF OLD.id = 'pc05001' THEN RAISE EXCEPTION 'probe: planted delete fault'; END IF;
  RETURN OLD;
END
$fn$ LANGUAGE plpgsql`);
await pg.$executeRawUnsafe(`CREATE TRIGGER probe_block BEFORE DELETE ON "MarketingContact" FOR EACH ROW EXECUTE FUNCTION probe_block_delete()`);
let threw = false;
try {
  await db.marketingContact.removeBoundWhere(whereFor("b-bulk"), bulk.map((r) => r.id));
} catch {
  threw = true;
}
const afterFault = await countTag("b-bulk");
ok("B · a fault planted on a row of the SECOND chunk: the call throws and all 5,002 are still there — the first chunk's 5,000 rolled back",
  threw && afterFault === 5002, `threw ${threw} · ${afterFault} left`);
await pg.$executeRawUnsafe(`DROP TRIGGER probe_block ON "MarketingContact"`);
await pg.$executeRawUnsafe(`DROP FUNCTION probe_block_delete()`);
const b = await db.marketingContact.removeBoundWhere(whereFor("b-bulk"), bulk.map((r) => r.id));
ok("B · the fault gone, the same call removes all 5,002", b.matched === 5002 && b.changed === 5002 && (await countTag("b-bulk")) === 0, JSON.stringify(b));

/* ── C · nothing confirmed, nothing written ── */
const before = await pg.marketingContact.count();
const c = await db.marketingContact.removeBoundWhere(whereFor("a-vip"), []);
ok("C · an empty id list writes nothing", c.matched === 0 && c.changed === 0 && (await pg.marketingContact.count()) === before, JSON.stringify(c));

console.log(`contacts-remove-bound-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
process.exit(process.exitCode);
