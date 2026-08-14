/**
 * Config-persistence regression tests (in-memory; no DATABASE_URL so the
 * SystemConfig write-through no-ops — we verify the in-process cache + that the
 * persistence calls never throw without a DB, i.e. the refactor didn't break the
 * existing set→get behaviour). The real DB round-trip is exercised by the live
 * gauntlet against Postgres.
 */
import { loadConfig, saveConfig } from "../src/lib/server/config-store.ts";
import { getGlobalConfig, setGlobalConfig, reconcileConfigDefaults, DEFAULT_GLOBAL_CONFIG } from "../src/lib/server/market-config.ts";
import { reconcileUpDownDefaults, DEFAULT_UPDOWN_CONFIG } from "../src/lib/server/updown-config.ts";
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

  // 5. CONFIG MIGRATION — a config persisted before v2 with the LEGACY stake defaults
  //    (100 / 100,000) is bumped forward to the new defaults (1,000 / 1,000,000) on
  //    hydrate, so production adopts the new bounds with no manual re-save. A DELIBERATE
  //    custom value is never touched, and a v2+ config is left alone.
  ok("new defaults are 1,000 / 1,000,000", DEFAULT_GLOBAL_CONFIG.minStake === 1_000 && DEFAULT_GLOBAL_CONFIG.maxStake === 1_000_000);
  const legacy = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 100, maxStake: 100_000 }, 1);
  ok("legacy 100/100,000 → 1,000/1,000,000", legacy.changed && legacy.global.minStake === 1_000 && legacy.global.maxStake === 1_000_000);
  const custom = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 5_000, maxStake: 250_000 }, 1);
  ok("a deliberate custom min/max is preserved", !custom.changed && custom.global.minStake === 5_000 && custom.global.maxStake === 250_000);
  const already = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 100, maxStake: 100_000 }, 2);
  ok("a v2 config is not re-migrated by the v2 rule", !already.changed && already.global.minStake === 100);

  // 6. CONFIG MIGRATION v3 (2026-08-14) — THE MIGRATION THAT ACTUALLY MOVED PRODUCTION.
  //
  // ⛔ THE TRAP THIS SECTION EXISTS FOR. Assertion 5 above proves the CONSTANT is 1,000
  // and the 100→1,000 rule works. Both were green on 2026-08-14 while production had
  // been running a TZS 500 floor on BOTH products since 2026-07-26 — because `persist()`
  // writes the whole snapshot, so a stored 500 re-froze on every unrelated config save,
  // and v2's reconcile only ever looked at a value sitting on exactly 100. A green suite
  // asserting a code default cannot see a live setting. Ask of any config check: "would
  // this still pass if production were on the wrong number?" Here the answer was YES.
  ok("the rule is 1,000 / 1,000,000 per bet on BOTH products",
     DEFAULT_GLOBAL_CONFIG.minStake === 1_000 && DEFAULT_GLOBAL_CONFIG.maxStake === 1_000_000 &&
     DEFAULT_UPDOWN_CONFIG.defaultMinStake === 1_000 && DEFAULT_UPDOWN_CONFIG.defaultMaxStake === 1_000_000);

  const poll500 = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 500 }, 2);
  ok("poll config: a stored 500 floor is raised to 1,000",
     poll500.changed && poll500.global.minStake === 1_000);
  const pollDone = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 500 }, 3);
  ok("poll config: a v3 config is left alone", !pollDone.changed && pollDone.global.minStake === 500);
  const pollCustom = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 2_500 }, 2);
  ok("poll config: a deliberate 2,500 floor is preserved",
     !pollCustom.changed && pollCustom.global.minStake === 2_500);

  // Up & Down carried BOTH stale numbers — 500 and 100,000.
  const ud = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 500, defaultMaxStake: 100_000 }, 2);
  ok("up & down: 500 / 100,000 → 1,000 / 1,000,000",
     ud.changed && ud.config.defaultMinStake === 1_000 && ud.config.defaultMaxStake === 1_000_000);
  const udV1 = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 100, defaultMaxStake: 100_000 }, 1);
  ok("up & down: the v1 → v2 path still works and is not double-applied",
     udV1.changed && udV1.config.defaultMinStake === 1_000 && udV1.config.defaultMaxStake === 1_000_000);
  const udDone = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 500 }, 3);
  ok("up & down: a v3 config is left alone", !udDone.changed && udDone.config.defaultMinStake === 500);
  const udCustom = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 5_000, defaultMaxStake: 250_000 }, 2);
  ok("up & down: a deliberate 5,000 / 250,000 is preserved",
     !udCustom.changed && udCustom.config.defaultMinStake === 5_000 && udCustom.config.defaultMaxStake === 250_000);

  // 7. THE WITHDRAWAL FEE. Production has charged 1.5% since before 2026-08-10 while this
  //    constant read 1% — a cold-start fallback that disagrees with the live setting is a
  //    second version of the truth, and it is the number the Terms page was quoting.
  ok("the withdrawal fee default is 1.5%, matching the live setting and the rule",
     DEFAULT_GLOBAL_CONFIG.withdrawalFeeRate === 0.015);
  ok("…of which the gateway's share is 0.5%",
     DEFAULT_GLOBAL_CONFIG.withdrawalGatewayShareRate === 0.005);
})();

console.log(`\nconfig-persist: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
