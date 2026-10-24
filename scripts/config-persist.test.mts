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
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } from "../src/lib/payout.ts";

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
  //    (100 / 100,000) is bumped forward to the CURRENT defaults on hydrate, so production
  //    adopts the bounds with no manual re-save. A DELIBERATE custom value is never touched,
  //    and a v2+ config is left alone. (Since 2026-10-12 the current default minimum is 500,
  //    so the v1 path now lands on 500 — §6b is the step that moved it.)
  ok("the defaults are the rule: 500 / 1,000,000", DEFAULT_GLOBAL_CONFIG.minStake === 500 && DEFAULT_GLOBAL_CONFIG.maxStake === 1_000_000);
  const legacy = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 100, maxStake: 100_000 }, 1);
  ok("legacy 100/100,000 → 500/1,000,000", legacy.changed && legacy.global.minStake === 500 && legacy.global.maxStake === 1_000_000);
  const custom = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 5_000, maxStake: 250_000 }, 1);
  ok("a deliberate custom min/max is preserved", !custom.changed && custom.global.minStake === 5_000 && custom.global.maxStake === 250_000);
  const already = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 100, maxStake: 100_000 }, 2);
  ok("a v2 config is not re-migrated by the v2 rule", !already.changed && already.global.minStake === 100);

  // 6. CONFIG MIGRATION v3 (2026-08-14) — THE MIGRATION THAT ACTUALLY MOVED PRODUCTION.
  //
  // ⛔ THE TRAP THIS SECTION EXISTS FOR. Assertion 5 above proved the CONSTANT was 1,000
  // and the 100→1,000 rule worked. Both were green on 2026-08-14 while production had
  // been running a TZS 500 floor on BOTH products since 2026-07-26 — because `persist()`
  // writes the whole snapshot, so a stored 500 re-froze on every unrelated config save,
  // and v2's reconcile only ever looked at a value sitting on exactly 100. A green suite
  // asserting a code default cannot see a live setting. Ask of any config check: "would
  // this still pass if production were on the wrong number?" Here the answer was YES.
  //
  // ⚠️ SINCE 2026-10-12 v3's TARGET IS 500 — the default it moves a stored 500 to — so its min half
  // moves nothing on its own; the trap it records now lives in §6b, from the other side. What v3
  // must still never do is touch a deliberate value, and Up & Down's ceiling half still moves.
  const poll500 = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 500 }, 2);
  ok("poll config: a v2 config on 500 ends on the rule's 500 (never on 1,000 — §6b's figure is the rule now)",
     poll500.global.minStake === 500);
  const pollCustom = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 2_500 }, 2);
  ok("poll config: a deliberate 2,500 floor is preserved",
     !pollCustom.changed && pollCustom.global.minStake === 2_500);

  // Up & Down carried BOTH stale numbers — 500 and 100,000.
  const ud = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 500, defaultMaxStake: 100_000 }, 2);
  ok("up & down: 500 / 100,000 → 500 / 1,000,000 (the ceiling still moves; the floor is already the rule)",
     ud.changed && ud.config.defaultMinStake === 500 && ud.config.defaultMaxStake === 1_000_000);
  const udV1 = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 100, defaultMaxStake: 100_000 }, 1);
  ok("up & down: the v1 → v2 path still works and is not double-applied",
     udV1.changed && udV1.config.defaultMinStake === 500 && udV1.config.defaultMaxStake === 1_000_000);
  const udCustom = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 5_000, defaultMaxStake: 250_000 }, 2);
  ok("up & down: a deliberate 5,000 / 250,000 is preserved",
     !udCustom.changed && udCustom.config.defaultMinStake === 5_000 && udCustom.config.defaultMaxStake === 250_000);

  // 6b. CONFIG MIGRATION — market v4 and Up & Down v5 (2026-10-12): THE MINIMUM COMES DOWN.
  //
  // ⛔ THE SAME TRAP FROM THE OTHER SIDE. Ali lowered the minimum stake to TZS 500 ("turn minimum
  // stake instead of 1k to 500"). Production stores 1,000 on both products — v3 wrote it — and the
  // floor on read (`floorStakeBounds`, `getUpDownConfig`) only ever RAISES a stored value. So with
  // the constant at 500 and no migration, every player would still be refused below 1,000 while
  // every check that reads the constant said 500. The first assertion below is the rule; the rest
  // are the only thing that moves production.
  ok("the rule is 500 / 1,000,000 per bet on BOTH products — and the constant is the one the defaults read",
     PLATFORM_MIN_STAKE === 500 && PLATFORM_MAX_STAKE === 1_000_000 &&
     DEFAULT_GLOBAL_CONFIG.minStake === PLATFORM_MIN_STAKE && DEFAULT_GLOBAL_CONFIG.maxStake === PLATFORM_MAX_STAKE &&
     DEFAULT_UPDOWN_CONFIG.defaultMinStake === PLATFORM_MIN_STAKE && DEFAULT_UPDOWN_CONFIG.defaultMaxStake === PLATFORM_MAX_STAKE);

  // The exact shape production carries: market.config at v3 on 1,000 / 1,000,000.
  const poll1000 = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 1_000, maxStake: 1_000_000 }, 3);
  ok("poll config: ★ a stored 1,000 (v3) is lowered to 500 — and the maximum is not touched",
     poll1000.changed && poll1000.global.minStake === 500 && poll1000.global.maxStake === 1_000_000);
  const pollNarrowMax = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 1_000, maxStake: 250_000 }, 3);
  ok("poll config: a deliberate narrower maximum rides through untouched",
     pollNarrowMax.global.minStake === 500 && pollNarrowMax.global.maxStake === 250_000);
  const pollDeliberate = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 2_500 }, 3);
  ok("poll config: ★ a deliberate 2,500 (v3) is preserved — only the exact 1,000 v3 wrote moves",
     !pollDeliberate.changed && pollDeliberate.global.minStake === 2_500);
  const poll1500 = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 1_500 }, 3);
  ok("poll config: a deliberate 1,500 (v3) is preserved", !poll1500.changed && poll1500.global.minStake === 1_500);
  const pollV4 = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 1_000 }, 4);
  ok("poll config: ★ a v4 config on 1,000 is left alone — an operator who sets 1,000 AFTER the change keeps it",
     !pollV4.changed && pollV4.global.minStake === 1_000);
  const pollV2at1000 = reconcileConfigDefaults({ ...DEFAULT_GLOBAL_CONFIG, minStake: 1_000 }, 2);
  ok("poll config: an older v2 config on 1,000 lands on 500 too (the steps chain)", pollV2at1000.global.minStake === 500);

  // The exact shape production carries: updown.config at v4 on 1,000 / 1,000,000, loser-share profile.
  const ud1000 = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 1_000, defaultMaxStake: 1_000_000 }, 4);
  ok("up & down: ★ a stored 1,000 (v4) is lowered to 500 — the maximum and the rate profile are not touched",
     ud1000.changed && ud1000.config.defaultMinStake === 500 && ud1000.config.defaultMaxStake === 1_000_000 &&
     JSON.stringify(ud1000.config.defaultRateProfile) === JSON.stringify(DEFAULT_UPDOWN_CONFIG.defaultRateProfile));
  const udDeliberate = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 5_000 }, 4);
  ok("up & down: ★ a deliberate 5,000 (v4) is preserved", !udDeliberate.changed && udDeliberate.config.defaultMinStake === 5_000);
  const udV5 = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 1_000 }, 5);
  ok("up & down: ★ a v5 config on 1,000 is left alone — an operator's later 1,000 stands",
     !udV5.changed && udV5.config.defaultMinStake === 1_000);
  const udV3at1000 = reconcileUpDownDefaults({ ...DEFAULT_UPDOWN_CONFIG, defaultMinStake: 1_000 }, 3);
  ok("up & down: an older v3 config on 1,000 lands on 500 too (the steps chain)", udV3at1000.config.defaultMinStake === 500);

  // 7. THE WITHDRAWAL FEE. Production has charged 1.5% since before 2026-08-10 while this
  //    constant read 1% — a cold-start fallback that disagrees with the live setting is a
  //    second version of the truth, and it is the number the Terms page was quoting.
  ok("the withdrawal fee default is 1.5%, matching the live setting and the rule",
     DEFAULT_GLOBAL_CONFIG.withdrawalFeeRate === 0.015);
  ok("…of which the gateway's share is 0.5%",
     DEFAULT_GLOBAL_CONFIG.withdrawalGatewayShareRate === 0.005);
})();

// 8. FEE-TAX-2026-10 · THE WRITERS ARE READ-MODIFY-WRITE, BY COMPARE-AND-SWAP, READ BACK — and the stamp reads FRESH.
//
// ⛔ THE DEFECT. `persist()` wrote THIS container's whole cache: a container that booted before another one's save wrote
// its stale copy back over the newer row on its next unrelated save — the fee model and, from R5, the winnings tax with
// it. Driven here through the store seam (`__setMarketConfigStoreForTest`) against a row another container moved, a row
// that moves mid-save, a read that fails and a read-back that disagrees — no database needed, the real writer throughout.
await (async () => {
  const MC = await import("../src/lib/server/market-config.ts");
  const { createMarket } = await import("../src/lib/server/market-service.ts");
  const { DEFAULT_GLOBAL_CONFIG: D } = MC;
  const canon = (v: unknown): string =>
    v && typeof v === "object" && !Array.isArray(v)
      ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`
      : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v ?? null);
  const rows = new Map<string, unknown>();
  let beforeSwap: (() => void) | null = null;
  let afterSwap: (() => void) | null = null;
  let readFails = false;
  const KEY = "market.config";
  type Row = { global: Record<string, unknown>; perMarket: Array<[string, Record<string, unknown>]>; v: number };
  const row = () => rows.get(KEY) as Row;
  MC.__setMarketConfigStoreForTest({
    hasDatabase: () => true,
    loadConfigResult: (async (key: string) => (readFails ? { ok: false, error: "planted read failure" } : { ok: true, value: rows.has(key) ? structuredClone(rows.get(key)) : null })) as never,
    replaceConfigIfValue: async (key: string, expected: unknown, value: unknown) => {
      beforeSwap?.(); beforeSwap = null;
      if (!rows.has(key) || canon(rows.get(key)) !== canon(expected)) return false;
      rows.set(key, structuredClone(value));
      afterSwap?.(); afterSwap = null;
      return true;
    },
    createConfigIfAbsent: async (key: string, value: unknown) => { if (rows.has(key)) return "exists" as const; rows.set(key, structuredClone(value)); return "created" as const; },
  });
  try {
    // The row as ANOTHER container saved it: a different fee model, and a winnings tax this container never loaded.
    rows.set(KEY, { global: { ...D, feeModel: "capped-commission", winningsTaxRate: 0.15 }, perMarket: [["mkt_other", { minStake: 1_500 }]], v: 4 });
    const s1 = await MC.setGlobalConfig({ minStake: 600 }, "usr_officer");
    ok("8.1 · ★ a stale container's save lands on the row AS STORED — the other container's fee model and tax survive",
       s1.ok && row().global.feeModel === "capped-commission" && row().global.winningsTaxRate === 0.15 && row().global.minStake === 600);
    ok("8.2 · …a per-market override another container set survives an unrelated global save", canon(row().perMarket) === canon([["mkt_other", { minStake: 1_500 }]]));
    ok("8.3 · …and the cache now holds the row, not its own stale copy", (await getGlobalConfig()).feeModel === "capped-commission");

    beforeSwap = () => { rows.set(KEY, { ...row(), global: { ...row().global, withdrawalFeeRate: 0.02 } }); };
    const s2 = await MC.setGlobalConfig({ minStake: 700 }, "usr_officer");
    ok("8.4 · ★ a row that moves mid-save is read again — both changes stand", s2.ok && row().global.withdrawalFeeRate === 0.02 && row().global.minStake === 700);

    readFails = true;
    const s3 = await MC.setGlobalConfig({ minStake: 800 }, "usr_officer");
    readFails = false;
    ok("8.5 · a read that fails changes NOTHING and says so", !s3.ok && /could not be read/.test(s3.error) && row().global.minStake === 700);

    afterSwap = () => { rows.set(KEY, { ...row(), global: { ...row().global, minStake: 950 } }); };
    const s4 = await MC.setGlobalConfig({ minStake: 900 }, "usr_officer");
    ok("8.6 · a write whose read-back already holds something else is REPORTED, never claimed", !s4.ok && /another save changed/.test(s4.error));

    // The per-market writers go through the same door.
    rows.set(KEY, { global: { ...D }, perMarket: [], v: 4 });
    const o1 = await MC.setMarketOverride("mkt_cas", { minStake: 2_000 }, "usr_officer");
    ok("8.7 · a per-market override is written into the row as stored", o1.ok && canon(row().perMarket) === canon([["mkt_cas", { minStake: 2_000 }]]));
    const c1 = await MC.clearMarketOverride("mkt_cas", "usr_officer");
    ok("8.8 · …and cleared from it — and the clear can now say it failed", c1.ok && row().perMarket.length === 0);
    readFails = true;
    const c2 = await MC.clearMarketOverride("mkt_cas", "usr_officer");
    readFails = false;
    ok("8.9 · a clear whose read fails reports it", !c2.ok);

    // ⭐ THE STAMP READS FRESH, OR CREATES NOTHING.
    rows.set(KEY, { global: { ...D, cashOutFeeRate: 0.07 }, perMarket: [], v: 4 });
    const fresh = await MC.readMarketConfigFresh();
    ok("8.10 · ★ a fresh read replaces this container's copy with the row", fresh.ok && fresh.config.cashOutFeeRate === 0.07 && (await getGlobalConfig()).cashOutFeeRate === 0.07);
    const marketInput = { titleEn: "CAS stamp", titleSw: "Soko", category: "macro", sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
      resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test" } as never;
    rows.set(KEY, { global: { ...D, cashOutFeeRate: 0.06 }, perMarket: [], v: 4 });
    const m = await createMarket(marketInput);
    ok("8.11 · ★ a market is stamped from the row as stored NOW (6%), not the copy read a moment ago (7%)", m.feeSnapshot?.cashOutFeeRate === 0.06, String(m.feeSnapshot?.cashOutFeeRate));
    readFails = true;
    let refused: unknown = null;
    try { await createMarket(marketInput); } catch (e) { refused = e; }
    readFails = false;
    ok("8.12 · ★ a read that fails creates NOTHING — `RatesRefused`, never the defaults this container booted with", MC.isRatesRefused(refused), String(refused));
  } finally {
    MC.__setMarketConfigStoreForTest(null);
  }

  // 9. The new law's validation, with the gate shut (test:fee-gate drives it open).
  const tax = await MC.setGlobalConfig({ winningsTaxRate: 0.15 }, "usr_officer");
  ok("9.1 · no winnings tax can be saved before release R5", !tax.ok && /not yet in force/.test(tax.error));
  ok("9.2 · …and none is a default: a cold start never invents one", DEFAULT_GLOBAL_CONFIG.winningsTaxRate === undefined && !("winningsTaxRate" in DEFAULT_GLOBAL_CONFIG));
  const over = await MC.setMarketOverride("mkt_tax", { winningsTaxRate: 0.15 }, "usr_officer");
  ok("9.3 · a per-market override can never carry a tax or a model", !over.ok && /per-market override/.test(over.error));
})();

// 10. FEE-TAX R2 review · A STALE FORM, A BLANK FIELD, AN ABSENT ROW.
//
// ⛔ THE DEFECTS. (a) Compare-and-swap stops a stale CONTAINER, not a stale FORM: a page rendered at 09:00 and saved at 09:20
// posted back every field another officer had saved at 09:10. With `opts.baseline` (the values the form was rendered with)
// only the changed fields are written, and a changed field someone else moved since is refused. (b) `{ x: undefined }`
// merged over the row erased the stored x, and the read-back called a landed save a lost one. (c) An absent row stamped
// code defaults in silence — it must still stamp (availability), and say so once per container.
// The fake store here clones like jsonb (`undefined` keys dropped) — which is what made (b) visible.
await (async () => {
  const MC = await import("../src/lib/server/market-config.ts");
  const { createMarket } = await import("../src/lib/server/market-service.ts");
  const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
  const { DEFAULT_GLOBAL_CONFIG: D } = MC;
  const canon = (v: unknown): string =>
    v && typeof v === "object" && !Array.isArray(v)
      ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`
      : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v ?? null);
  const jsonb = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const rows = new Map<string, unknown>();
  let swaps = 0;
  const KEY = "market.config";
  type Row = { global: Record<string, unknown>; perMarket: Array<[string, Record<string, unknown>]>; v: number };
  const row = () => rows.get(KEY) as Row;
  MC.__setMarketConfigStoreForTest({
    hasDatabase: () => true,
    loadConfigResult: (async (key: string) => ({ ok: true, value: rows.has(key) ? jsonb(rows.get(key)) : null })) as never,
    replaceConfigIfValue: async (key: string, expected: unknown, value: unknown) => {
      swaps++;
      if (!rows.has(key) || canon(rows.get(key)) !== canon(expected)) return false;
      rows.set(key, jsonb(value));
      return true;
    },
    createConfigIfAbsent: async (key: string, value: unknown) => { if (rows.has(key)) return "exists" as const; rows.set(key, jsonb(value)); return "created" as const; },
  });
  const OFF = "usr_baseline_officer";
  try {
    // The form was rendered from this…
    const rendered = { ...D, withdrawalFeeRate: 0.015, minStake: 600 };
    // …and ANOTHER officer has since moved the withdrawal fee.
    rows.set(KEY, jsonb({ global: { ...rendered, withdrawalFeeRate: 0.02 }, perMarket: [], v: 4 }));
    const s1 = await MC.setGlobalConfig({ ...rendered, minStake: 800 }, OFF, { baseline: rendered });
    ok("10.1 · ★ a baselined save writes ONLY what the officer changed — the other officer's 2% survives the whole posted form",
       s1.ok && row().global.minStake === 800 && row().global.withdrawalFeeRate === 0.02);
    await auditFlush();
    const a1 = getAuditPage({ category: "ADMIN", actorId: OFF, limit: 50 }).find((e) => e.action === "config.global.updated");
    ok("10.2 · …and its audit row names that one change", canon(Object.keys((a1?.payload?.changes as object) ?? {})) === canon(["minStake"]));

    const s2 = await MC.setGlobalConfig({ ...rendered, withdrawalFeeRate: 0.03 }, OFF, { baseline: rendered });
    ok("10.3 · ★ a changed field another officer moved since the page opened is REFUSED, in plain words — nothing written",
       !s2.ok && /^Another officer changed the withdrawal fee rate since this page was opened — reload and try again/.test(s2.error)
         && row().global.withdrawalFeeRate === 0.02 && row().global.minStake === 800, s2.ok ? "accepted" : s2.error);

    const before = swaps;
    const s3 = await MC.setGlobalConfig({ ...rendered }, OFF, { baseline: rendered });
    ok("10.4 · a form posted unchanged writes NOTHING — no swap, and it says `unchanged`", s3.ok && s3.unchanged === true && swaps === before);

    const s4 = await MC.setGlobalConfig({ minStake: 1_000 }, OFF);
    ok("10.5 · CONTROL · without a baseline every posted field is written, as before", s4.ok && row().global.minStake === 1_000);

    // (b) a blank field: an `undefined` member must neither erase the stored value nor fail the read-back.
    const s5 = await MC.setGlobalConfig({ minStake: 1_100, commissionRate: undefined }, OFF);
    ok("10.6 · ★ an `undefined` member is stripped: the save lands and reads back as landed (no false \"another save changed\")",
       s5.ok && row().global.minStake === 1_100, s5.ok ? "" : s5.error);
    ok("10.7 · …and the stored commission rate is still there, not erased to a code default", row().global.commissionRate === D.commissionRate);

    // A per-market override: its baseline is the STORED override, as rendered.
    rows.set(KEY, jsonb({ global: { ...D }, perMarket: [["mkt_b", { minStake: 2_000, maxStake: 50_000 }]], v: 4 }));
    const renderedOverride = { minStake: 2_000, maxStake: 50_000 };
    rows.set(KEY, jsonb({ ...row(), perMarket: [["mkt_b", { minStake: 2_000, maxStake: 40_000 }]] })); // another officer
    const o1 = await MC.setMarketOverride("mkt_b", { minStake: 2_500, maxStake: 50_000 }, OFF, { baseline: renderedOverride });
    ok("10.8 · ★ an override save writes only its changed field — the other officer's 40,000 maximum survives",
       o1.ok && canon(row().perMarket) === canon([["mkt_b", { minStake: 2_500, maxStake: 40_000 }]]), canon(row().perMarket));
    const o2 = await MC.setMarketOverride("mkt_b", { maxStake: 60_000 }, OFF, { baseline: renderedOverride });
    ok("10.9 · …and refuses a changed field moved since the page opened", !o2.ok && /Another officer changed the max stake/.test(o2.error), o2.ok ? "accepted" : o2.error);

    // An override lands on the market's EFFECTIVE config: a maximum below the market's own minimum is refused.
    rows.set(KEY, jsonb({ global: { ...D }, perMarket: [["mkt_c", { minStake: 5_000 }]], v: 4 }));
    const o3 = await MC.setMarketOverride("mkt_c", { maxStake: 3_000 }, OFF);
    ok("10.10 · ★ an override is validated against the market's own override too — max 3,000 under its min 5,000 is refused",
       !o3.ok && /Max stake must be greater than or equal to min stake/.test(o3.error), o3.ok ? "accepted" : o3.error);

    // (c) an ABSENT row: stamped from code defaults — never refused — and alerted ONCE per container.
    const alerts = () => getAuditPage({ category: "COMPLIANCE", limit: 500 }).filter((e) => e.action === "config.stamped_from_defaults" && e.targetId === KEY).length;
    rows.clear();
    await auditFlush();
    const n0 = alerts();
    const f1 = await MC.readMarketConfigFresh();
    const f2 = await MC.readMarketConfigFresh();
    await auditFlush();
    ok("10.11 · ★ a stamping read of an absent row answers the defaults, says `stored: false`, and alerts ONCE (not per read)",
       f1.ok && !f1.stored && f2.ok && !f2.stored && alerts() === n0 + 1, `${alerts() - n0} alert(s)`);
    const marketInput = { titleEn: "Absent row", titleSw: "Soko", category: "macro", sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
      resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test" } as never;
    let made: unknown = null;
    try { made = await createMarket(marketInput); } catch (e) { made = e; }
    ok("10.12 · ★ …and a market is STILL created from it (refusing would stop every new market and round) — today's defaults",
       !(made instanceof Error) && (made as { feeSnapshot?: { feeModel?: string } })?.feeSnapshot?.feeModel === D.feeModel, String(made));
    const c1 = await MC.readMarketConfigFresh({ purpose: "check" });
    await auditFlush();
    ok("10.13 · a CHECK read (an officer's act validating, nothing stamped) raises nothing", c1.ok && !c1.stored && alerts() === n0 + 1);
    rows.set(KEY, jsonb({ global: { ...D }, perMarket: [], v: 4 }));
    const f3 = await MC.readMarketConfigFresh();
    rows.clear();
    await MC.readMarketConfigFresh();
    await auditFlush();
    ok("10.14 · the row read again re-arms it (`stored: true`), so a row that goes missing a second time alerts again",
       f3.ok && f3.stored && alerts() === n0 + 2, `${alerts() - n0} alert(s)`);
  } finally {
    MC.__setMarketConfigStoreForTest(null);
  }
})();

console.log(`\nconfig-persist: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
