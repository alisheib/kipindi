/**
 * S9 production preflight: count provider-reference collisions and inspect installed indexes.
 * READ ONLY. It prints counts and index names, never references, rows or connection credentials.
 * Supply PROD_DATABASE_PUBLIC_URL through the process environment, as for qa:short-title-fit.
 */
import { connect } from "./live/db.cjs";

const raw = process.env.PROD_DATABASE_PUBLIC_URL ?? "";
let url;
try { url = new URL(raw); } catch { console.error("REFUSED: PROD_DATABASE_PUBLIC_URL is absent or invalid."); process.exit(2); }
if (!/\.rlwy\.net$|\.railway\.app$/.test(url.hostname)) {
  console.error("REFUSED: the target is not a Railway production proxy.");
  process.exit(2);
}
url.searchParams.set("options", "-c default_transaction_read_only=on");

const forbidden = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|lock|vacuum|analyze|reindex|cluster|refresh|comment|set|reset|begin|commit|rollback|savepoint|prepare|execute|listen|notify|discard|into)\b/i;
function assertSelect(sql) {
  const bare = sql.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""').trim();
  if (!/^select\b/i.test(bare) || bare.includes(";") || forbidden.test(bare)) throw new Error("REFUSED: query is not one plain SELECT.");
}
const select = async (db, sql) => { assertSelect(sql); return (await db.query(sql)).rows; };
try {
  assertSelect('select count(*) from "Transaction"');
  try { assertSelect('select 1; delete from "Transaction"'); throw new Error("guard did not refuse a write"); }
  catch (error) { if (error.message === "guard did not refuse a write") throw error; }
} catch { console.error("REFUSED: the SELECT-only guard failed its control."); process.exit(2); }

let db;
try {
  db = await connect(url.toString());
  const [session] = await select(db, "select current_setting('transaction_read_only') as ro, now()::text as clock");
  if (session?.ro !== "on") throw new Error("the database session is not read only");
  const [global] = await select(db, `select count(*)::int as groups,
    coalesce(sum(copies - 1), 0)::int as extra_rows,
    count(*) filter (where providers > 1)::int as cross_provider_groups
    from (select "providerRef", count(*) as copies, count(distinct provider) as providers
      from "Transaction" where "providerRef" is not null
      group by "providerRef" having count(*) > 1) duplicates`);
  const [sameProvider] = await select(db, `select count(*)::int as groups
    from (select provider, "providerRef" from "Transaction" where "providerRef" is not null
      group by provider, "providerRef" having count(*) > 1) duplicates`);
  const indexes = await select(db, `select indexname,
    indexdef like 'CREATE UNIQUE INDEX%' as unique_index,
    indexdef like '%"providerRef"%' as references_provider_ref
    from pg_indexes where schemaname = 'public' and tablename = 'Transaction'`);
  console.log(`qa:provider-ref-uniqueness · Railway production proxy · read-only session · ${session.clock}`);
  console.log(`duplicate reference groups ${global.groups}; excess rows ${global.extra_rows}; cross-provider groups ${global.cross_provider_groups}; same-provider groups ${sameProvider.groups}`);
  for (const row of indexes.filter((item) => item.references_provider_ref))
    console.log(`index ${row.indexname}: ${row.unique_index ? "UNIQUE" : "non-unique"}`);
} catch {
  // A driver error can include connection details. Keep the failure explicit without echoing them.
  console.error("Provider-reference preflight failed; no database verdict. Check the read-only connection privately.");
  process.exitCode = 2;
} finally { await db?.end().catch(() => undefined); }
