/**
 * Up & Down — registry, grid maths, and the observation ledger's safety properties.
 *
 *   npx tsx scripts/updown-config.test.mts     (npm run test:updown-config)
 *
 * The three things this exists to prove, in order of how badly they would hurt:
 *
 *  1. THE OBSERVATION LEDGER IS WRITE-ONCE. Round N's close IS round N+1's open, to
 *     the digit. A second confirmation — a raced retry, a duplicate fire, a second
 *     instance — must NOT be able to overwrite a price that has already settled money.
 *  2. THE SOURCE GATE HOLDS. An asset cannot be created, enabled, or have a chain
 *     started against a domain the operator has not approved in the trusted-source
 *     registry. A round resolves against that exact link.
 *  3. THE WINNER FLOOR HOLDS on a chain's rate profile — through the SAME validator
 *     global config uses, not a second copy of the rules.
 *
 * In-memory stores throughout: the DAL's memory implementation mirrors the Prisma
 * one's contracts (conditional confirm, unique boundary), so a property proven here
 * means the same thing in production. The Prisma-specific race is additionally
 * exercised against real Postgres by scripts/updown-e2e.test.mts.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import {
  boundaryAfter, boundaryAtOrBefore, cleanGridAnchor,
  createAsset, updateAsset, setAssetEnabled, listAssets,
  createChain, updateChain, setChainState, listChains,
  getUpDownConfig, setUpDownConfig, __resetUpDownConfig,
  stakeBoundsFor, rateProfileFor,
  ALLOWED_DURATIONS, DEFAULT_UPDOWN_CONFIG,
} from "../src/lib/server/updown-config.ts";
import { assetStore, chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { poolFee } from "../src/lib/payout.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

const OFFICER = "usr_officer_test";
__resetUpDownMemoryStores();
__resetUpDownConfig();

// A trusted source to hang assets off. `macro` already seeds bot.go.tz.
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "Spot metals", addedBy: "system" });

const GOLD = {
  key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", iconKey: "gold",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro" as const,
  decimals: 2, minMoveTicks: 1,
};

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE GRID — pure, no clock, no timers
// ═══════════════════════════════════════════════════════════════════════════

{
  const anchor = Date.parse("2026-07-24T14:00:00.000Z");
  const M = 60_000;

  ok("1.1 · next boundary after an exact boundary is the NEXT one, not itself",
     boundaryAfter(anchor, 5, anchor) === anchor + 5 * M,
     new Date(boundaryAfter(anchor, 5, anchor)).toISOString());

  ok("1.2 · mid-round lands on the coming boundary",
     boundaryAfter(anchor, 5, anchor + 2 * M) === anchor + 5 * M);

  ok("1.3 · 15-min and 5-min chains SHARE the :15 instant",
     boundaryAfter(anchor, 15, anchor) === boundaryAfter(anchor, 5, anchor + 12 * M),
     "this sharing is what makes one observation serve six round edges");

  ok("1.4 · 30-min, 15-min and 5-min all share the :30 instant",
     boundaryAfter(anchor, 30, anchor) === anchor + 30 * M &&
     boundaryAfter(anchor, 15, anchor + 20 * M) === anchor + 30 * M &&
     boundaryAfter(anchor, 5, anchor + 27 * M) === anchor + 30 * M);

  // THE ANTI-DRIFT PROPERTY. Boundaries are derived from the anchor, so computing
  // from any instant inside a round gives the same answer — a restart or a missed
  // fire cannot shift the grid.
  const fromStart = boundaryAfter(anchor, 5, anchor + 1);
  const fromLate = boundaryAfter(anchor, 5, anchor + 5 * M - 1);
  ok("1.5 · derived, never accumulated — any instant in a round yields the same boundary",
     fromStart === fromLate, `${fromStart} vs ${fromLate}`);

  ok("1.6 · an instant BEFORE the anchor does not skip a step",
     boundaryAfter(anchor, 5, anchor - 3 * M) === anchor,
     "Math.floor, not trunc — trunc would jump forward a whole step");

  ok("1.7 · boundaryAtOrBefore returns the round START covering an instant",
     boundaryAtOrBefore(anchor, 5, anchor + 3 * M) === anchor);

  const messy = Date.parse("2026-07-24T14:03:27.412Z");
  const clean = cleanGridAnchor(messy);
  ok("1.8 · anchors snap up to a whole 5-minute mark, seconds zeroed",
     clean === Date.parse("2026-07-24T14:05:00.000Z"), new Date(clean).toISOString());

  let threw = false;
  try { boundaryAfter(anchor, 0, anchor); } catch { threw = true; }
  ok("1.9 · a zero duration throws rather than looping forever", threw);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE SOURCE GATE
// ═══════════════════════════════════════════════════════════════════════════

{
  const bad = await createAsset({ ...GOLD, key: "BAD", priceSourceUrl: "https://random-blog.example.com/gold" }, OFFICER);
  ok("2.1 · an UNTRUSTED domain is refused", !bad.ok,
     bad.ok ? "created anyway" : bad.error.slice(0, 60));

  const malformed = await createAsset({ ...GOLD, key: "MAL", priceSourceUrl: "not-a-url" }, OFFICER);
  ok("2.2 · a malformed URL is refused", !malformed.ok);

  const good = await createAsset(GOLD, OFFICER);
  ok("2.3 · a TRUSTED domain is accepted", good.ok, good.ok ? "" : good.error);

  if (good.ok) {
    ok("2.4 · a new asset starts DISABLED — creating a row is not enough to reach real money",
       good.data.enabled === false);
    ok("2.5 · the source domain is normalised and stored", good.data.sourceDomain === "kitco.com",
       good.data.sourceDomain);
  }

  const dup = await createAsset(GOLD, OFFICER);
  ok("2.6 · a duplicate asset key is refused", !dup.ok);

  // Key hygiene — the key is what reports group by.
  const lower = await createAsset({ ...GOLD, key: "xag", symbol: "XAG/USD", nameEn: "Silver", nameSw: "Fedha", iconKey: "silver" }, OFFICER);
  ok("2.7 · asset keys are upper-cased", lower.ok && lower.data.key === "XAG",
     lower.ok ? lower.data.key : lower.error);

  const junkKey = await createAsset({ ...GOLD, key: "x au!" }, OFFICER);
  ok("2.8 · a malformed key is refused", !junkKey.ok);

  const badDecimals = await createAsset({ ...GOLD, key: "DEC", decimals: 99 }, OFFICER);
  ok("2.9 · out-of-range decimals are refused", !badDecimals.ok);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · ENABLE / DISABLE + CHAIN STATE
// ═══════════════════════════════════════════════════════════════════════════

let goldId = "";
{
  const gold = await assetStore.getByKey("XAU");
  goldId = gold!.id;

  const en = await setAssetEnabled(goldId, true, OFFICER);
  ok("3.1 · an asset with an approved source can be enabled", en.ok);

  const chainBad = await createChain({ assetId: goldId, durationMinutes: 7 as never }, OFFICER);
  ok("3.2 · a duration off the 5-minute grid is refused", !chainBad.ok,
     chainBad.ok ? "" : chainBad.error.slice(0, 70));

  const c5 = await createChain({ assetId: goldId, durationMinutes: 5 }, OFFICER);
  ok("3.3 · a 5-minute chain is created", c5.ok, c5.ok ? "" : c5.error);
  ok("3.4 · a new chain starts STOPPED — creating it must not start emitting rounds",
     c5.ok && c5.data.state === "STOPPED");
  ok("3.5 · a stopped chain has no next boundary", c5.ok && c5.data.nextBoundaryAt === null);

  const dupChain = await createChain({ assetId: goldId, durationMinutes: 5 }, OFFICER);
  ok("3.6 · a duplicate (asset, duration) chain is refused", !dupChain.ok);

  if (c5.ok) {
    const started = await setChainState(c5.data.id, "RUNNING", OFFICER);
    ok("3.7 · starting a chain arms a next boundary", started.ok && !!started.data.nextBoundaryAt,
       started.ok ? started.data.nextBoundaryAt ?? "null" : started.error);
    ok("3.8 · that boundary is in the FUTURE",
       started.ok && Date.parse(started.data.nextBoundaryAt!) > Date.now());

    // The asset cannot be pulled out from under a running chain.
    const disableWhileRunning = await setAssetEnabled(goldId, false, OFFICER);
    ok("3.9 · disabling an asset with a RUNNING chain is refused", !disableWhileRunning.ok,
       disableWhileRunning.ok ? "allowed" : disableWhileRunning.error.slice(0, 60));

    const paused = await setChainState(c5.data.id, "PAUSED", OFFICER);
    ok("3.10 · pausing clears the next boundary", paused.ok && paused.data.nextBoundaryAt === null);

    const nowDisable = await setAssetEnabled(goldId, false, OFFICER);
    ok("3.11 · once no chain is running, the asset can be disabled", nowDisable.ok);

    const startWhileDisabled = await setChainState(c5.data.id, "RUNNING", OFFICER);
    ok("3.12 · a chain cannot start while its asset is disabled", !startWhileDisabled.ok);

    await setAssetEnabled(goldId, true, OFFICER);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE RATE PROFILE — one validator, and the fee the proposal is built on
// ═══════════════════════════════════════════════════════════════════════════

{
  const cfg = await getUpDownConfig();
  ok("4.1 · the default profile is capped-commission @ 13%",
     cfg.defaultRateProfile.feeModel === "capped-commission" && cfg.defaultRateProfile.commissionRate === 0.13,
     JSON.stringify(cfg.defaultRateProfile));

  // THE NUMBER THE BUSINESS CASE RESTS ON: a balanced TZS 10,000 pool must yield
  // exactly TZS 1,300 — computed through the REAL fee function, not restated here.
  const fee = poolFee(5000, 5000, cfg.defaultRateProfile, "YES");
  ok("4.2 · balanced TZS 10,000 pool yields exactly TZS 1,300", fee.fee === 1300, `got ${fee.fee}`);

  // …and the ceiling must bite on a lopsided pool, protecting the winners.
  const lop = poolFee(9000, 1000, cfg.defaultRateProfile, "YES");
  ok("4.3 · the ⅓ ceiling bites on a lopsided pool", Math.round(lop.fee) === 333 && lop.capped,
     `fee ${Math.round(lop.fee)}, capped ${lop.capped}`);

  // OUTCOME-NEUTRALITY — the licence property. Same pools, either winner, same fee.
  const yesWins = poolFee(7000, 3000, cfg.defaultRateProfile, "YES").fee;
  const noWins = poolFee(7000, 3000, cfg.defaultRateProfile, "NO").fee;
  ok("4.4 · outcome-NEUTRAL: identical fee whichever side wins", yesWins === noWins,
     `${yesWins} vs ${noWins}`);

  // The winner floor, through the SAME validator global config uses.
  const bad = await setUpDownConfig({ defaultRateProfile: { feeModel: "capped-commission", commissionRate: 0.13, feeCeilingRate: 1.5 } }, OFFICER);
  ok("4.5 · a rate profile breaching the winner floor is REFUSED", !bad.ok,
     bad.ok ? "accepted" : bad.error.slice(0, 70));

  const chains = await listChains({ assetId: goldId });
  if (chains[0]) {
    const badChain = await updateChain(chains[0].id, { rateProfile: { feeCeilingRate: 2 } }, OFFICER);
    ok("4.6 · a CHAIN rate profile goes through the same guardrail", !badChain.ok);

    const bounds = await stakeBoundsFor(chains[0]);
    ok("4.7 · a chain with no override inherits the default stake bounds",
       bounds.min === DEFAULT_UPDOWN_CONFIG.defaultMinStake && bounds.max === DEFAULT_UPDOWN_CONFIG.defaultMaxStake,
       `${bounds.min}..${bounds.max}`);

    const okUpdate = await updateChain(chains[0].id, { minStake: 500, maxStake: 50_000 }, OFFICER);
    ok("4.8 · valid stake bounds are accepted", okUpdate.ok);

    const inverted = await updateChain(chains[0].id, { minStake: 900_000 }, OFFICER);
    ok("4.9 · min > max is refused", !inverted.ok);

    const profile = await rateProfileFor(chains[0]);
    ok("4.10 · the chain's frozen profile is what it will stamp on rounds",
       profile.commissionRate === 0.13);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

{
  const tooStale = await setUpDownConfig({ maxStalenessSeconds: 600 }, OFFICER);
  ok("5.1 · a staleness window longer than a round is refused", !tooStale.ok,
     tooStale.ok ? "" : tooStale.error.slice(0, 70));

  const tooLow = await setUpDownConfig({ confidenceThreshold: 10 }, OFFICER);
  ok("5.2 · a confidence floor below 50 is refused", !tooLow.ok);

  const good = await setUpDownConfig({ maxStalenessSeconds: 60, confidenceThreshold: 90 }, OFFICER);
  ok("5.3 · sane thresholds are accepted", good.ok);
  ok("5.4 · and they persist in the read path",
     good.ok && (await getUpDownConfig()).maxStalenessSeconds === 60);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · ⛔ THE OBSERVATION LEDGER — write-once, or the whole feature is unsound
// ═══════════════════════════════════════════════════════════════════════════

{
  const boundary = "2026-07-24T14:30:00.000Z";

  const a = await observationStore.ensure(goldId, boundary);
  const b = await observationStore.ensure(goldId, boundary);
  ok("6.1 · ensure() is idempotent — two chains on the same boundary share ONE row",
     a.id === b.id, `${a.id} vs ${b.id}`);

  // Concurrent ensure — the 5-min and 15-min chains firing in the same tick.
  const [c1, c2, c3] = await Promise.all([
    observationStore.ensure(goldId, "2026-07-24T14:45:00.000Z"),
    observationStore.ensure(goldId, "2026-07-24T14:45:00.000Z"),
    observationStore.ensure(goldId, "2026-07-24T14:45:00.000Z"),
  ]);
  ok("6.2 · three concurrent ensures on one boundary yield ONE observation",
     c1.id === c2.id && c2.id === c3.id);

  const won = await observationStore.confirm(a.id, {
    price: 2417.6, sourceUrl: GOLD.priceSourceUrl,
    sourceQuotedAt: "2026-07-24T14:30:02.000Z",
    evidence: "Spot gold quoted 2,417.60", confidence: 95, model: "test", rawHash: "h1",
  });
  ok("6.3 · the first confirm WINS", won === true);

  // ⛔ THE CRITICAL ONE. A second confirmation must not overwrite a settled price.
  const second = await observationStore.confirm(a.id, {
    price: 9999.99, sourceUrl: GOLD.priceSourceUrl,
    sourceQuotedAt: "2026-07-24T14:30:05.000Z",
    evidence: "a raced retry", confidence: 99, model: "test", rawHash: "h2",
  });
  ok("6.4 · ⛔ a SECOND confirm is REFUSED (claim-the-row)", second === false);

  const after = await observationStore.get(a.id);
  ok("6.5 · ⛔ the price is UNCHANGED — a retry cannot rewrite settled money",
     after?.price === 2417.6, `got ${after?.price}`);
  ok("6.6 · the source's OWN quoted time is stored, not our boundary",
     after?.sourceQuotedAt === "2026-07-24T14:30:02.000Z" && after?.sourceQuotedAt !== boundary,
     after?.sourceQuotedAt ?? "null");

  // Concurrent confirms: exactly one may win.
  const race = await observationStore.ensure(goldId, "2026-07-24T15:00:00.000Z");
  const results = await Promise.all([1, 2, 3, 4, 5].map((n) =>
    observationStore.confirm(race.id, {
      price: 1000 + n, sourceUrl: GOLD.priceSourceUrl,
      sourceQuotedAt: "2026-07-24T15:00:01.000Z",
      evidence: `racer ${n}`, confidence: 90, model: "test", rawHash: `r${n}`,
    })));
  ok("6.7 · ⛔ five concurrent confirms — EXACTLY ONE wins",
     results.filter(Boolean).length === 1, `${results.filter(Boolean).length} won`);

  // A confirmed observation can never be failed out from under settled money.
  const failAfterConfirm = await observationStore.fail(a.id, "too late");
  ok("6.8 · a CONFIRMED observation cannot be marked FAILED", failAfterConfirm === false);

  // The terminal-failure path, on a fresh boundary.
  const doomed = await observationStore.ensure(goldId, "2026-07-24T15:15:00.000Z");
  await observationStore.recordAttempt(doomed.id, "source unreachable");
  await observationStore.recordAttempt(doomed.id, "source unreachable");
  const afterAttempts = await observationStore.get(doomed.id);
  ok("6.9 · attempts accumulate without changing state",
     afterAttempts?.attempts === 2 && afterAttempts?.state === "PENDING",
     `attempts ${afterAttempts?.attempts}, state ${afterAttempts?.state}`);

  const failed = await observationStore.fail(doomed.id, "no confirmed reading");
  ok("6.10 · a PENDING observation can be failed (its rounds then VOID + refund)", failed === true);
  ok("6.11 · a FAILED observation carries NO price — never a guess",
     (await observationStore.get(doomed.id))?.price === null);

  // THE DETERMINISM PROPERTY, stated as the product sees it.
  const shared = await observationStore.find(goldId, boundary);
  ok("6.12 · ⛔ round N's CLOSE and round N+1's OPEN are the same row, so the same price",
     shared?.id === a.id && shared?.price === 2417.6,
     "this is why the resolution AI can never disagree with itself between adjacent rounds");
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · Registry read paths
// ═══════════════════════════════════════════════════════════════════════════

{
  const all = await listAssets();
  const enabledOnly = await listAssets({ enabledOnly: true });
  ok("7.1 · listAssets() returns every asset", all.length >= 2, `${all.length}`);
  ok("7.2 · enabledOnly filters correctly", enabledOnly.every((a) => a.enabled));

  const gold = await assetStore.get(goldId);
  const renamed = await updateAsset(goldId, { nameSw: "Dhahabu Safi" }, OFFICER);
  ok("7.3 · an asset can be renamed", renamed.ok && renamed.data.nameSw === "Dhahabu Safi");
  ok("7.4 · …without changing its key (reports group by it)",
     renamed.ok && renamed.data.key === gold!.key);

  const toUntrusted = await updateAsset(goldId, { priceSourceUrl: "https://untrusted.example.com/x" }, OFFICER);
  ok("7.5 · an asset cannot be edited onto an untrusted source", !toUntrusted.ok);

  ok("7.6 · ALLOWED_DURATIONS is exactly 5/15/30",
     JSON.stringify([...ALLOWED_DURATIONS]) === JSON.stringify([5, 15, 30]));
}

// ── Result ──────────────────────────────────────────────────────────────────
console.log(`\nupdown-config: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\n✗ UP & DOWN REGISTRY/LEDGER GUARD FAILED.\n" +
    "  If a §6 check failed, STOP — the observation ledger is no longer write-once,\n" +
    "  which means two adjacent rounds can disagree about the same instant and a\n" +
    "  retry can rewrite a price that already settled money.\n");
  process.exit(1);
}
console.log("updown-config: OK — grid derived not accumulated · source gate holds · winner floor holds · observations write-once");
