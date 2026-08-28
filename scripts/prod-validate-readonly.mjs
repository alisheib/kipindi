import { Client } from "pg";
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (sql) => (await c.query(sql)).rows;
const [{ now }] = await q("select now()::text as now");
console.log("connected to prod at", now);
const cols = await q(`select column_name from information_schema.columns
  where table_name='PredictionMarket' and column_name in ('purgedAt','purgedBy','purgeReason')`);
console.log("purge tombstone columns present:", cols.map(r=>r.column_name).join(", ") || "NONE (migration not applied)");
const [c1] = await q(`select
  (select count(*) from "PredictionMarket") as markets,
  (select count(*) from "PredictionMarket" where status='CLOSED') as closed,
  (select count(*) from "Position" where status='OPEN') as open_positions,
  (select count(*) from "UpDownChain") as chains,
  (select count(*) from "UpDownChain" where state='ARCHIVED') as archived_chains,
  (select count(*) from "UpDownRound") as rounds`);
console.log("census:", JSON.stringify(c1));
const orph = await q(`select le.account, count(*)::int as entries, sum(le.amount)::numeric as net
  from "LedgerEntry" le left join "PredictionMarket" m on ('POOL:'||m.id)=le.account
  where le.account like 'POOL:%' and m.id is null group by le.account order by le.account`);
console.log("orphaned POOL accounts:", orph.length);
for (const o of orph) console.log("   ", o.account, "net", o.net, "entries", o.entries);
const [bal] = await q(`select sum(amount)::numeric as total from "LedgerEntry"`);
console.log("ledger grand total:", bal.total);
await c.end();
