#!/usr/bin/env node
/**
 * deposit-failures.cjs — THE ONE QUESTION THAT MATTERS ABOUT 38 FAILED DEPOSITS:
 * is this MONEY TAKEN AND NOT CREDITED, or are they abandoned pushes?
 *
 * ⛔ THIS HAS BEEN THE LARGEST MEASURED THING ON THE CAMPAIGN'S BOARD FOR THREE SESSIONS AND
 * NOBODY HAD LOOKED. 52 CONFIRMED (TZS 646,000) against 38 FAILED (TZS 630,500) lifetime —
 * 42% by count, 49% BY VALUE — nine genuine player accounts, one carrying four failures worth
 * TZS 311,000. Separately `/api/health` reports `sms.provider: "console"`, so no real SMS has
 * ever left the platform and not one of those players was told anything.
 *
 * ⭐ THE DISCRIMINATOR IS `providerRef`, AND IT IS READABLE WITHOUT THE SELCOM CONSOLE.
 * The rail works like this (`payments-service.ts` / `wallet-service.ts`):
 *   · we create a PENDING `DEPOSIT` row, then ask Selcom to push a USSD prompt to the phone;
 *   · Selcom answers with its OWN reference, which we store in `providerRef`;
 *   · the player approves on their handset and Selcom calls our webhook, which CONFIRMS.
 * So:
 *   **`providerRef` NULL** → we never got a reference back. The push was never accepted by the
 *   provider, the handset was never prompted, and **no money can have moved.** These are our
 *   failure or the provider's, but they are NOT missing money.
 *   **`providerRef` SET + FAILED** → the provider took the request, gave us an id, and the
 *   transaction still ended FAILED. ⛔ **THESE ARE THE ONLY ROWS THAT COULD BE MONEY TAKEN AND
 *   NOT CREDITED**, and each one is a reference a human can paste into the Selcom console.
 *
 * ⚠️ AND THE SECOND DISCRIMINATOR IS THE LEDGER. A confirmed deposit posts a balanced
 * `dep_<txnId>` group (`depositEntries`). A FAILED one must post NOTHING. A FAILED row WITH
 * ledger entries would mean we credited and then failed — a different and much worse defect —
 * so this prints that count rather than assuming it is zero.
 *
 * ⛔ IT NAMES NO PLAYER. The output is deliberately anonymised to a stable short hash: this
 * file's job is to size and classify the problem, and a census that pastes real names and
 * numbers into a terminal transcript is a PII leak with a spreadsheet's manners. The `--refs`
 * flag prints ONLY the provider references for the rows that need the Selcom console, because
 * those are the actionable half and they are not personal data.
 *
 * Read-only. Run: node scripts/live/ops/deposit-failures.cjs [--refs]
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, s, p) => c.query(s, p).then((r) => r.rows);
const REFS = process.argv.includes("--refs");
/** A stable, non-reversible label so the same account is recognisable across sections. */
const tag = (s) => `u:${crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 8)}`;
const tzs = (n) => Number(n ?? 0).toLocaleString("en-US");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const ident = (await q(c, `select current_database() db, inet_server_addr()::text ip, (now() at time zone 'utc')::text now`))[0];
  console.log(`=== IDENTITY ===\ndb=${ident.db}  server=${ident.ip}  utc=${ident.now}\n`);

  // ── 1 · the shape of the problem, restated from the rows rather than quoted ───────────────
  console.log("=== DEPOSITS BY STATUS (lifetime) ===");
  for (const r of await q(c, `
    select status::text st, count(*)::int n, sum(amount)::numeric total,
           min("createdAt")::text first, max("createdAt")::text last
      from "Transaction" where type::text = 'DEPOSIT' group by status order by n desc`)) {
    console.log(`  ${r.st.padEnd(12)} n=${String(r.n).padStart(4)}  TZS ${tzs(r.total).padStart(12)}   ${r.first?.slice(0, 10)} → ${r.last?.slice(0, 10)}`);
  }

  // ── 2 · ⭐ THE DISCRIMINATOR ──────────────────────────────────────────────────────────────
  console.log("\n=== ⭐ THE QUESTION: DID THE PROVIDER EVER ACCEPT THE PUSH? ===");
  console.log("    providerRef NULL  → no reference was ever issued → the handset was never prompted → NO MONEY MOVED");
  console.log("    providerRef SET   → the provider took it and gave us an id → ⛔ ONLY THESE CAN BE MONEY TAKEN\n");
  for (const r of await q(c, `
    select status::text st,
           case when "providerRef" is null then 'providerRef NULL' else 'providerRef SET' end ref,
           count(*)::int n, sum(amount)::numeric total
      from "Transaction" where type::text = 'DEPOSIT'
     group by 1, 2 order by 1, 2`)) {
    console.log(`  ${r.st.padEnd(12)} ${r.ref.padEnd(18)} n=${String(r.n).padStart(4)}  TZS ${tzs(r.total).padStart(12)}`);
  }

  // ── 3 · the provider's own words, where we kept them ─────────────────────────────────────
  console.log("\n=== WHY EACH FAILED, IN OUR OWN COLUMNS ===");
  const reasons = await q(c, `
    select coalesce(nullif(trim(t.description), ''), '(no description)') reason,
           coalesce(t.provider::text, '(null)') provider,
           count(*)::int n, sum(t.amount)::numeric total,
           count(t."providerRef")::int with_ref
      from "Transaction" t where t.type::text = 'DEPOSIT' and t.status::text = 'FAILED'
     group by 1, 2 order by n desc`);
  if (!reasons.length) console.log("  (no FAILED deposits)");
  for (const r of reasons) {
    console.log(`  n=${String(r.n).padStart(3)}  TZS ${tzs(r.total).padStart(10)}  ref=${r.with_ref}/${r.n}  ${r.provider.padEnd(12)} ${String(r.reason).slice(0, 90)}`);
  }

  // ── 4 · ⚠️ THE LEDGER CROSS-CHECK. A FAILED deposit must have posted NOTHING. ─────────────
  console.log("\n=== ⚠️ DID ANY FAILED DEPOSIT NEVERTHELESS POST TO THE LEDGER? ===");
  const leaked = await q(c, `
    select count(*)::int n, coalesce(sum(x.amt), 0)::numeric total from (
      select t.id, sum(abs(l.amount)) amt
        from "Transaction" t join "LedgerEntry" l on l."txnId" = t.id
       where t.type::text = 'DEPOSIT' and t.status::text = 'FAILED'
       group by t.id) x`);
  console.log(`  FAILED deposits carrying ledger entries: ${leaked[0].n}` +
              (leaked[0].n > 0 ? `  🔴 TZS ${tzs(leaked[0].total)} — WE CREDITED AND THEN FAILED. Investigate each.` : "  ✓ none — no failed deposit ever touched the books"));

  // ── 5 · and the mirror: did a CONFIRMED deposit ever fail to post? ────────────────────────
  const unposted = await q(c, `
    select count(*)::int n, coalesce(sum(t.amount), 0)::numeric total
      from "Transaction" t
     where t.type::text = 'DEPOSIT' and t.status::text = 'CONFIRMED'
       and not exists (select 1 from "LedgerEntry" l where l."txnId" = t.id)`);
  console.log(`  CONFIRMED deposits with NO ledger entries:  ${unposted[0].n}` +
              (unposted[0].n > 0 ? `  🔴 TZS ${tzs(unposted[0].total)} — credited off the books.` : "  ✓ none — every confirmed deposit is on the books"));

  // ── 6 · who is affected, and how badly, without naming anybody ───────────────────────────
  console.log("\n=== AFFECTED ACCOUNTS (anonymised; fleet and staff separated out) ===");
  for (const r of await q(c, `
    select u.id uid,
           (u."phoneE164" like '+2557990000%') fleet,
           u.role::text role,
           count(*) filter (where t.status::text = 'FAILED')::int failed,
           sum(t.amount) filter (where t.status::text = 'FAILED')::numeric failed_tzs,
           count(*) filter (where t.status::text = 'CONFIRMED')::int confirmed,
           count(t."providerRef") filter (where t.status::text = 'FAILED')::int failed_with_ref,
           max(t."createdAt") filter (where t.status::text = 'FAILED')::text last_failed,
           (select count(*)::int from "Transaction" d where d."userId" = u.id and d.type::text = 'DEPOSIT' and d.status::text = 'CONFIRMED') ever_funded
      from "Transaction" t join "User" u on u.id = t."userId"
     where t.type::text = 'DEPOSIT'
     group by u.id, 2, 3 having count(*) filter (where t.status::text = 'FAILED') > 0
     order by failed_tzs desc nulls last`)) {
    const who = r.fleet ? "FLEET " : r.role !== "PLAYER" ? `${r.role.slice(0, 6).padEnd(6)}` : "player";
    console.log(`  ${who} ${tag(r.uid)}  failed=${String(r.failed).padStart(2)} (TZS ${tzs(r.failed_tzs).padStart(9)})  ` +
                `with-ref=${r.failed_with_ref}  confirmed=${r.confirmed}  last-failure ${r.last_failed?.slice(0, 16)}`);
  }

  // ── 7 · the last 7 days, because a lifetime ratio hides a trend ───────────────────────────
  console.log("\n=== LAST 7 DAYS ===");
  for (const r of await q(c, `
    select status::text st, count(*)::int n, sum(amount)::numeric total, count("providerRef")::int with_ref
      from "Transaction"
     where type::text = 'DEPOSIT' and "createdAt" > (now() at time zone 'utc') - interval '7 days'
     group by 1 order by 1`)) {
    console.log(`  ${r.st.padEnd(12)} n=${String(r.n).padStart(3)}  TZS ${tzs(r.total).padStart(10)}  with-ref=${r.with_ref}`);
  }

  // ── 8 · ⛔ WAS ANYBODY TOLD? ──────────────────────────────────────────────────────────────
  // A failed deposit that leaves no trace for the player is the half of this finding that is
  // ours regardless of whose fault the failure was.
  console.log("\n=== ⛔ WAS THE PLAYER TOLD? (notifications tied to a failed deposit) ===");
  const told = await q(c, `
    select count(distinct t.id)::int n from "Transaction" t
      join "Notification" nt on nt."userId" = t."userId"
       and nt."createdAt" between t."createdAt" and t."createdAt" + interval '10 minutes'
     where t.type::text = 'DEPOSIT' and t.status::text = 'FAILED'`);
  const failedN = (await q(c, `select count(*)::int n from "Transaction" where type::text='DEPOSIT' and status::text='FAILED'`))[0].n;
  console.log(`  failed deposits with ANY notification within 10 minutes: ${told[0].n} of ${failedN}`);
  console.log(`  ⚠️ and /api/health reports sms.provider: "console" — an in-app notification is the ONLY channel that exists.`);

  // ── 9 · the actionable half: references for the Selcom console ───────────────────────────
  const actionable = await q(c, `
    select t.id, t."providerRef" ref, t.amount::numeric amount, t.provider::text provider,
           t."createdAt"::text created, t."userId" uid
      from "Transaction" t
     where t.type::text = 'DEPOSIT' and t.status::text = 'FAILED' and t."providerRef" is not null
     order by t."createdAt" desc`);
  console.log(`\n=== ⭐ THE ACTIONABLE HALF: ${actionable.length} FAILED deposit(s) the provider DID accept ===`);
  if (!actionable.length) {
    console.log("  ✓ NONE. Every failed deposit died before the provider issued a reference, so the");
    console.log("    handset was never prompted and no money can have been taken. ⛔ This is the answer");
    console.log("    to the campaign's question, and it does NOT need the Selcom console to reach.");
  } else if (REFS) {
    for (const r of actionable) console.log(`  ${r.created.slice(0, 16)}  TZS ${tzs(r.amount).padStart(9)}  ${r.provider}  ref=${r.ref}  txn=${r.id}  ${tag(r.uid)}`);
  } else {
    console.log(`  ⛔ ${actionable.length} row(s) need a human with the Selcom console. Re-run with --refs to print the references.`);
  }

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
