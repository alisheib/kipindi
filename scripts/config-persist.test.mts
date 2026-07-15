/**
 * Config-persistence regression tests (in-memory; no DATABASE_URL so the
 * SystemConfig write-through no-ops — we verify the in-process cache + that the
 * persistence calls never throw without a DB, i.e. the refactor didn't break the
 * existing set→get behaviour). The real DB round-trip is exercised by the live
 * gauntlet against Postgres.
 */
import { loadConfig, saveConfig } from "../src/lib/server/config-store.ts";
import { getGlobalConfig, setGlobalConfig } from "../src/lib/server/market-config.ts";
import { getProposalsConfig, setProposalsConfig } from "../src/lib/server/proposals-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); }
}

await (async () => {
  // 1. config-store is a safe no-op without a DB (never throws; load returns null).
  await saveConfig("test.key", { a: 1 }); // must not throw
  ok("loadConfig returns null without DB", (await loadConfig("test.key")) === null);

  // 2. market-config set→get round-trips through the in-process cache (the
  //    write-through to DB is fire-and-forget and no-ops here).
  const r = await setGlobalConfig({ feeCeilingRate: 0.40, commissionRate: 0.12 }, "usr_officer");
  ok("setGlobalConfig ok", r.ok === true);
  const g = await getGlobalConfig();
  ok("feeCeilingRate persisted in cache", g.feeCeilingRate === 0.40);
  ok("commissionRate persisted in cache", g.commissionRate === 0.12);

  // 3. validation still rejects bad input (guard intact after refactor).
  const bad = await setGlobalConfig({ commissionRate: 0.99 }, "usr_officer");
  ok("rejects out-of-range commissionRate", bad.ok === false);

  // 4. THE WINNER-FLOOR GUARDRAIL. A fee ceiling above 100% of the smaller side
  //    would let the fee exceed the entire prize and eat into the winners' own
  //    stakes — the exact bug the capped model exists to kill. A config that
  //    allows it must be REFUSED, not merely warned about.
  const unsafe = await setGlobalConfig({ feeCeilingRate: 1.5 }, "usr_officer");
  ok("REFUSES a config where a winner could be paid below their stake", unsafe.ok === false);
  ok("…and says why", !unsafe.ok && /less than they staked|0-100%/i.test(unsafe.error));

  // 5. A ceiling above 50% is allowed but WARNS — above half we take at least as
  //    much as all the winners combined. Winners still never lose money.
  const warned = await setGlobalConfig({ feeCeilingRate: 0.75 }, "usr_officer");
  ok("allows a ceiling above 50% but returns a warning", warned.ok === true && typeof warned.warn === "string");

  // Restore sane defaults for anything downstream.
  await setGlobalConfig({ commissionRate: 0.10, feeCeilingRate: 1 / 3 }, "usr_officer");

  // 4. proposals-config set→get round-trips.
  const p = setProposalsConfig({ prizeTzs: 33_000 }, "usr_officer");
  ok("setProposalsConfig ok", p.ok === true);
  ok("prizeTzs persisted in cache", getProposalsConfig().prizeTzs === 33_000);
})();

console.log(`\nconfig-persist: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
