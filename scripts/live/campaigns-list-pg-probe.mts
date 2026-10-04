/**
 * U36 · the campaign list's four reads ON A REAL POSTGRES — the Prisma twin, which no suite on this laptop executes.
 *
 * ⭐ WHY THIS EXISTS. `test:campaigns-page` drives the list over the MEMORY twin and `test:dal-parity` §26 (26.u36.*)
 * holds the Prisma twin's SHAPE — neither sends one statement to Postgres. Whether the `orderBy: [column, id]` really
 * breaks a createdAt tie on the id, whether `statusCounts`' groupBy and the two-key `countsByCampaign` groupBy come back
 * zero-filled and exact, whether `attentionCount`'s `recipients: { some: … }` EXISTS really counts a PAUSED campaign
 * with a HELD row and not one whose rows all settled, and (§9, U36 review F3) whether it still answers at volume and
 * with which plan — those are facts about the database. This writes the SAME ten
 * campaigns `test:campaigns-page` uses to a scratch Postgres through the REAL `db`, and checks every read against
 * answers written here by hand: an oracle independent of either twin.
 * ⛔ Recipient states are set by raw SQL HERE, in a script (no DAL door settles a row before U43) — never in src.
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database):
 *   npm run db:probe-campaigns-list   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this probe)
 */
import type { StoredSmsCampaign, SmsCampaignStatus, SmsCampaignRecipientStatus, SmsCampaignTransitionPatch } from "../../src/lib/server/store.ts";

process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("campaigns-list-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY: this probe writes campaigns and recipients — production's URL is refused before the store loads.
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("campaigns-list-pg-probe: refusing — it writes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { prisma } = await import("../../src/lib/server/prisma.ts");
const CS = await import("../../src/lib/marketing/campaign-status.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const pg = prisma();
if (!pg) throw new Error("campaigns-list-pg-probe: no Prisma client");

const before = Number((await pg.$queryRawUnsafe<Array<{ n: number }>>(`select count(*)::int as n from "SmsCampaign"`))[0]?.n ?? -1);
ok("0 · CONTROL · the scratch table starts EMPTY — every count below is this probe's own", before === 0, `${before} campaign(s) already there`);
if (before !== 0) process.exit(1);

/* ── the fixture: test:campaigns-page's ten campaigns, through the ONE door ── */
const T0 = Date.parse("2026-09-30T06:00:00.000Z");
const at = (h: number, m = 0) => new Date(T0 + h * 3_600_000 + m * 60_000).toISOString();
const OFFICER = "probe36_officer";
type Step = "CONFIRMED" | "PREPARING" | "RUNNING" | "PAUSED" | "DONE" | "CANCELLED";
type Mix = Partial<Record<SmsCampaignRecipientStatus, number>>;
type Fx = { key: string; name: string; created: number; last: number; path: Step[]; audience: number | null; mix: Mix; stopReason?: string };
const FX: Fx[] = [
  { key: "a", name: "Derby day", created: 1, last: 1, path: [], audience: null, mix: {} },
  { key: "b", name: "Asubuhi offer", created: 2, last: 20, path: ["CONFIRMED"], audience: 50, mix: {} },
  { key: "c", name: "Goal rush", created: 3, last: 12, path: ["CONFIRMED", "PREPARING"], audience: 10, mix: { PENDING: 4 } },
  { key: "d", name: "Bonus weekend", created: 3, last: 15, path: ["CONFIRMED", "PREPARING", "RUNNING"], audience: 10, mix: { SENT: 4, HELD: 6 } },
  { key: "e", name: "Jumamosi", created: 4, last: 11, path: ["CONFIRMED", "PREPARING", "RUNNING"], audience: 25, mix: {} },
  { key: "f", name: "Early bird", created: 5, last: 18, path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], audience: 4, mix: { SENT: 3, PENDING: 1 }, stopReason: "BALANCE_FLOOR" },
  { key: "g", name: "Champions night", created: 6, last: 13, path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], audience: 4, mix: { SENT: 2, FAILED: 1, SKIPPED: 1 }, stopReason: "mystery_key" },
  { key: "h", name: "Ijumaa", created: 7, last: 16, path: ["CONFIRMED", "PREPARING", "PAUSED"], audience: 30, mix: {} },
  { key: "i", name: "Friday flash", created: 8, last: 19, path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 2, mix: { DELIVERED: 2 } },
  { key: "j", name: "Halftime", created: 9, last: 10, path: ["CANCELLED"], audience: null, mix: {} },
];
const idOf = (key: string) => `probe36_${key}`;
const draft = (fx: Fx): StoredSmsCampaign => ({
  id: idOf(fx.key), name: fx.name, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null, codingSw: "GSM7", segmentsSw: 1,
  codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: null, draftRevision: 0,
  confirmTier: null, audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null, audienceWatermark: null, estimateSegments: null,
  estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: OFFICER,
  confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: at(fx.created), updatedAt: at(fx.created),
});
const patchFor = (step: Step, fx: Fx, stamp: string): SmsCampaignTransitionPatch => {
  if (step === "CONFIRMED") {
    return { audienceCount: fx.audience ?? 1, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: fx.audience ?? 1,
      estimateTzs: null, budgetTzs: null, confirmedBy: OFFICER, confirmedAt: stamp };
  }
  if (step === "PREPARING") return { startedAt: stamp };
  if (step === "RUNNING") return { enqueuedAt: stamp, enqueueCursor: "done" };
  if (step === "PAUSED") return { pausedAt: stamp, stopReason: fx.stopReason ?? null };
  return { finishedAt: stamp };
};
let fxIndex = 0;
for (const fx of FX) {
  fxIndex++;
  await db.smsCampaign.create(draft(fx));
  let from: SmsCampaignStatus = "DRAFT";
  for (let i = 0; i < fx.path.length; i++) {
    const step = fx.path[i];
    const stamp = at(fx.last, -(fx.path.length - 1 - i));
    const moved = await db.smsCampaign.transition(idOf(fx.key), { from: [from], to: step, patch: patchFor(step, fx, stamp), draftRevision: step === "CONFIRMED" ? 0 : null, at: stamp });
    if (moved === null) throw new Error(`fixture ${fx.key}: ${from} → ${step} was refused`);
    from = step;
  }
  const entries = Object.entries(fx.mix) as Array<[SmsCampaignRecipientStatus, number]>;
  const total = entries.reduce((n, [, k]) => n + k, 0);
  const seeds = Array.from({ length: total }, (_, i) => ({
    id: `probe36_r_${fx.key}_${i}`, campaignId: idOf(fx.key), msisdn: `2557${String(fxIndex).padStart(2, "0")}${String(i).padStart(6, "0")}`,
    contactId: null, userId: null, optOutToken: null, createdAt: at(fx.created, 30),
  }));
  if (seeds.length > 0) await db.smsCampaignRecipient.createMany(seeds);
  let k = 0;
  for (const [status, n] of entries) {
    const ids = seeds.slice(k, k + n).map((s) => s.id);
    k += n;
    if (ids.length > 0) {
      await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set status = $1::"SmsCampaignRecipientStatus" where id = any($2::text[])`, status, ids);
    }
  }
}

/* ── the reads, against answers written by hand ── */
const letters = (rows: StoredSmsCampaign[]) => rows.map((c) => c.id.slice("probe36_".length)).join(",");
const page = (statuses: SmsCampaignStatus[] | null, sort: "created" | "name" | "updated", dir: "asc" | "desc", offset = 0, limit = 20) =>
  db.smsCampaign.page({ statuses, sort, dir, offset, limit });

const orders = {
  createdDesc: letters((await page(null, "created", "desc")).rows),
  createdAsc: letters((await page(null, "created", "asc")).rows),
  nameAsc: letters((await page(null, "name", "asc")).rows),
  nameDesc: letters((await page(null, "name", "desc")).rows),
  updatedDesc: letters((await page(null, "updated", "desc")).rows),
  updatedAsc: letters((await page(null, "updated", "asc")).rows),
};
ok("1 · page orders by the column THEN the id, in one direction — the createdAt tie (c, d) breaks on id both ways; name and last activity sort both ways",
  JSON.stringify(orders) === JSON.stringify({
    createdDesc: "j,i,h,g,f,e,d,c,b,a", createdAsc: "a,b,c,d,e,f,g,h,i,j", nameAsc: "b,d,g,a,f,i,c,j,h,e",
    nameDesc: "e,h,j,c,i,f,a,g,d,b", updatedDesc: "b,i,f,h,d,g,c,e,j,a", updatedAsc: "a,j,e,c,g,d,h,f,i,b",
  }), JSON.stringify(orders));
const sending = await page(CS.statusesForRail("sending"), "created", "desc");
const window2 = await page(null, "created", "desc", 3, 4);
const none = await page([], "created", "desc");
ok("2 · page filters on its statuses with a total over the SAME where, windows with skip/take, and an EMPTY list is nothing",
  letters(sending.rows) === "e,d,c" && sending.total === 3 && letters(window2.rows) === "g,f,e,d" && window2.total === 10
    && none.rows.length === 0 && none.total === 0,
  `sending ${letters(sending.rows)}/${sending.total} · window ${letters(window2.rows)}/${window2.total} · empty ${none.total}`);
const counts = await db.smsCampaign.statusCounts();
ok("3 · statusCounts is the whole table, every status zero-filled, in the schema's order",
  JSON.stringify(counts) === JSON.stringify({ DRAFT: 1, CONFIRMED: 1, PREPARING: 1, RUNNING: 2, PAUSED: 3, DONE: 1, CANCELLED: 1 }), JSON.stringify(counts));
const attention = await db.smsCampaign.attentionCount();
ok("4 · ⭐ attentionCount is 5 — PREPARING c, RUNNING d and e, PAUSED f (a PENDING row) and h (its list unfinished); NOT g, paused with every row settled",
  attention === 5, `got ${attention}`);
await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set status = 'HELD' where id = $1`, "probe36_r_g_0");
const withHeld = await db.smsCampaign.attentionCount();
await pg.$executeRawUnsafe(`update "SmsCampaignRecipient" set status = 'SENT' where id = $1`, "probe36_r_g_0");
ok("5 · ⭐ HELD is outstanding in SQL too: one of g's rows put back to HELD makes it want attention (6), and settling it again gives 5",
  withHeld === 6 && (await db.smsCampaign.attentionCount()) === 5, `with a HELD row ${withHeld}`);
const by = await db.smsCampaignRecipient.countsByCampaign([idOf("d"), idOf("e"), idOf("g")]);
ok("6 · countsByCampaign answers exactly the ids asked — d's 4 SENT and 6 HELD, e zero-filled with no rows, g's split — and nothing else",
  JSON.stringify(Object.keys(by).sort()) === JSON.stringify([idOf("d"), idOf("e"), idOf("g")].sort())
    && JSON.stringify(by[idOf("d")]) === JSON.stringify({ PENDING: 0, HELD: 6, SENT: 4, DELIVERED: 0, FAILED: 0, SKIPPED: 0, UNCONFIRMED: 0 })
    && JSON.stringify(by[idOf("e")]) === JSON.stringify(CS.zeroRecipientStatusCounts())
    && JSON.stringify(by[idOf("g")]) === JSON.stringify({ PENDING: 0, HELD: 0, SENT: 2, DELIVERED: 0, FAILED: 1, SKIPPED: 1, UNCONFIRMED: 0 }),
  JSON.stringify(by));
ok("7 · countsByCampaign of no ids is {} (and asks nothing)", JSON.stringify(await db.smsCampaignRecipient.countsByCampaign([])) === "{}");
const d = (await page(CS.statusesForRail("sending"), "created", "desc")).rows.find((c) => c.id === idOf("d"));
const pr = d ? CS.campaignProgress(d, by[idOf("d")]) : null;
ok("8 · the plan's Accept on Postgres: the RUNNING campaign with 4 SENT and 6 HELD reads 4 of 10", !!pr && pr.value === 4 && pr.max === 10 && pr.phase === "sending", JSON.stringify(pr));

/* ── 9 · THE BADGE AT VOLUME (U36 review F3 — closed by measurement) ────────────────────────────────────────────────
 * 60,000 settled rows go on g — paused with its list finished — and the badge must still read 5. The PLAN is RECORDED,
 * not asserted. F3 asked whether Prisma's `recipients: { some }` (an uncorrelated IN) reads every outstanding recipient
 * row on each admin render. Measured 2026-10-02 on PostgreSQL 18.3: the uncorrelated IN is an index-only SKIP SCAN of
 * (campaignId, status) — skip scan is new in 18 — while a correlated EXISTS was planned as a hashed SEQUENTIAL scan,
 * which is worse. Production runs 18 (Railway image `postgres-ssl:18`), so the badge keeps the relation filter.
 * ⛔ These two lines say what each shape does on the Postgres this probe runs on — re-read them if production moves. */
const VOLUME = 60_000;
await pg.$executeRawUnsafe(
  `insert into "SmsCampaignRecipient" ("id", "campaignId", "msisdn", "status")
   select 'probe36_vol_' || g, $1, '2559' || lpad(g::text, 8, '0'), 'SENT'::"SmsCampaignRecipientStatus"
     from generate_series(1, $2::int) as g`, idOf("g"), VOLUME);
await pg.$executeRawUnsafe(`analyze "SmsCampaignRecipient"`);
await pg.$executeRawUnsafe(`analyze "SmsCampaign"`);
const atVolume = await db.smsCampaign.attentionCount();
ok(`9a · at volume (${VOLUME.toLocaleString("en-US")} more settled rows on the paused g) the badge still reads 5`, atVolume === 5, `got ${atVolume}`);
type PlanNode = { "Node Type"?: string; "Relation Name"?: string; "Index Name"?: string; "Index Cond"?: string; Plans?: PlanNode[] };
const nodesOf = (n: PlanNode): PlanNode[] => [n, ...(n.Plans ?? []).flatMap(nodesOf)];
const sketch = (nodes: PlanNode[]) => nodes.filter((n) => n["Relation Name"] === "SmsCampaignRecipient")
  .map((n) => `${n["Node Type"]}${n["Index Name"] ? ` ${n["Index Name"]}` : ""}${n["Index Cond"] ? ` [${n["Index Cond"]}]` : ""}`).join(" | ");
const version = String((await pg.$queryRawUnsafe<Array<{ v: string }>>(`select version() as v`))[0]?.v ?? "?").split(" ").slice(0, 2).join(" ");
const PARAMS = [[...CS.ATTENTION_ALWAYS], CS.ATTENTION_WHEN_OWED, [...CS.OUTSTANDING_RECIPIENT_STATUSES]];
// Hand-written equivalents, for the record — the badge itself runs Prisma's generated text.
const SHAPES: Array<[string, string]> = [
  ["the uncorrelated IN Prisma's relation filter compiles to",
    `select count(*)::int as n from "SmsCampaign" c where c."status" = any($1::"SmsCampaignStatus"[]) or (c."status" = $2::"SmsCampaignStatus" and (c."enqueuedAt" is null or c."id" in (select r."campaignId" from "SmsCampaignRecipient" r where r."status" = any($3::"SmsCampaignRecipientStatus"[]))))`],
  ["a correlated EXISTS (tried for F3)",
    `select count(*)::int as n from "SmsCampaign" c where c."status" = any($1::"SmsCampaignStatus"[]) or (c."status" = $2::"SmsCampaignStatus" and (c."enqueuedAt" is null or exists (select 1 from "SmsCampaignRecipient" r where r."campaignId" = c."id" and r."status" = any($3::"SmsCampaignRecipientStatus"[]))))`],
];
for (const [name, sql] of SHAPES) {
  const explained = await pg.$queryRawUnsafe<Array<{ "QUERY PLAN": Array<{ Plan: PlanNode }> }>>(`explain (format json) ${sql}`, ...PARAMS);
  const answer = Number((await pg.$queryRawUnsafe<Array<{ n: number }>>(sql, ...PARAMS))[0]?.n ?? -1);
  console.log(`INFO 9 · ${version} · ${name}: answers ${answer} · ${sketch(nodesOf(explained[0]["QUERY PLAN"][0].Plan))}`);
}

console.log(`${String.fromCharCode(10)}campaigns-list-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
