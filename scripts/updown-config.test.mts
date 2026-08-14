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
  stakeBoundsFor, rateProfileFor, computeTargets, marginBpsForChain,
  ALLOWED_DURATIONS, DEFAULT_UPDOWN_CONFIG,
} from "../src/lib/server/updown-config.ts";
import { assetStore, chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { roundSpanMinutes } from "../src/lib/updown-durations.ts";
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

// ⛔ `minMoveTicks: 2`, NOT 1 — and the reason is a lesson, not a version bump.
//
// When `MIN_MOVE_TICKS_FLOOR` was raised to 2 (§6ad scenario 1: at one tick the winning band
// is the same size as the price's own rounding error), this fixture stopped being creatable.
// The suite then failed at §2.3 — but §2.1, *"an UNTRUSTED domain is refused"*, went on
// PASSING while refusing for the wrong reason entirely: the ticks check runs before the source
// gate, so the assertion was satisfied by an error that had nothing to do with domains.
//
// ⚠️ **A check that passes without testing what it names.** It would have gone on reporting a
// working source allowlist even if the allowlist were deleted. Asked "would this still pass if
// the feature were absent?", the answer was yes.
const GOLD = {
  key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", iconKey: "gold",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro" as const,
  decimals: 2, minMoveTicks: 2,
};

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE GRID — pure, no clock, no timers
// ═══════════════════════════════════════════════════════════════════════════

{
  const anchor = Date.parse("2026-07-24T14:00:00.000Z");
  const M = 60_000;

  // ⭐ THE GRID STEPS BY THE ROUND'S SPAN, NOT ITS BETTING WINDOW (Ali, 2026-08-04).
  // A "5 min" chain takes bets for a full 5 minutes and then runs a 1-minute result phase, so
  // consecutive rounds open 6 minutes apart. These three assertions used to read `5 * M` and
  // they were RIGHT under the old model, where the lead was carved out of the duration.
  // ⛔ Stepping by the duration now would open round N+1 on top of round N's result phase and
  // give one chain two live rounds.
  const SPAN5 = roundSpanMinutes(5);   // 6
  ok("1.1 · next boundary after an exact boundary is the NEXT one, not itself",
     boundaryAfter(anchor, 5, anchor) === anchor + SPAN5 * M,
     new Date(boundaryAfter(anchor, 5, anchor)).toISOString());

  ok("1.2 · mid-round lands on the coming boundary",
     boundaryAfter(anchor, 5, anchor + 2 * M) === anchor + SPAN5 * M);

  ok("1.3 · 15-min and 5-min chains SHARE the :15 instant",
     boundaryAfter(anchor, 15, anchor) === boundaryAfter(anchor, 5, anchor + 12 * M),
     "this sharing is what makes one observation serve six round edges");

  // ⭐ THE SHARING PROPERTY SURVIVES THE RESULT PHASE — which was the main risk in adding it.
  // The shared instant moves from :30 to :36 because the spans are now 36 / 18 / 6 minutes, and
  // 6 and 18 both divide 36 exactly, so a 30-, 15- and 5-minute chain still meet and one price
  // reading still serves all three. ⛔ Asserted as "they agree", not as ":36" — the instant is
  // an consequence of the spans, and hardcoding it is how this check would rot next time the
  // shape changes.
  const SPAN30 = roundSpanMinutes(30);   // 36
  const shared = anchor + SPAN30 * M;
  ok("1.4 · 30-min, 15-min and 5-min chains still SHARE an instant",
     boundaryAfter(anchor, 30, anchor) === shared &&
     boundaryAfter(anchor, 15, shared - 2 * M) === shared &&
     boundaryAfter(anchor, 5, shared - 2 * M) === shared,
     `30m→${boundaryAfter(anchor, 30, anchor)} 15m→${boundaryAfter(anchor, 15, shared - 2 * M)} 5m→${boundaryAfter(anchor, 5, shared - 2 * M)}`);
  ok("1.4b · …and the shorter spans divide the longer one, which is WHY they share",
     SPAN30 % roundSpanMinutes(15) === 0 && SPAN30 % roundSpanMinutes(5) === 0,
     `span30=${SPAN30} span15=${roundSpanMinutes(15)} span5=${roundSpanMinutes(5)}`);

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

  // ── 2.10-2.13 · THE EDIT LOCK ─────────────────────────────────────────────
  //
  // 🔴 THE PRODUCTION DEFECT. `validateAsset` refuses an `http://` source — correctly, because
  // the URL carries a provider API key. But it validates the WHOLE row on every save, not the
  // field being changed, and `quoteAsset` UPGRADES the scheme at request time rather than
  // refusing. So a row stored as `http://` keeps working while becoming **unsavable in any
  // way** — and that is exactly how `SOL` and `XAU` sat on production at a 1-tick band that
  // could be decided by rounding: the fix was refused, and the refusal named the ticks.
  //
  // ⛔ THE PROPERTY IS NOT "http IS REFUSED" — that already held and is not the bug. It is
  // that **a refusal on a field the caller did not touch must still leave a way through**, so
  // no row can reach a state where nothing about it can be corrected. Guarded by proving the
  // repair actually lands: change the ticks alone → refused; change the ticks AND the scheme
  // → accepted, with BOTH values stored.
  {
    // ⚠️ Same symbol as the GOLD fixture, different key. Picking an uncatalogued symbol here
    // ("XPD/USD") failed on the Phase-4 symbol gate instead — a setup failure that looked like
    // the guard working. `key` is unique; `symbol` is not, and production carries two XAU/USD
    // rows, so this is the real shape.
    const httpAsset = await createAsset({ ...GOLD, key: "LOCKED" }, OFFICER);
    if (!httpAsset.ok) {
      ok("2.10 · (setup) a trusted https asset was created", false, httpAsset.error);
    } else {
      // Reach past the validator to plant the legacy shape, because the validator is what stops
      // you creating it — which is the point: these rows predate the rule and cannot be re-made.
      await assetStore.upsert({
        ...(await assetStore.get(httpAsset.data.id))!,
        priceSourceUrl: "http://www.kitco.com/pd",
        minMoveTicks: 1,
      });
      ok("2.10 · (setup) a LEGACY http:// row with a 1-tick band exists",
         (await assetStore.get(httpAsset.data.id))!.priceSourceUrl.startsWith("http://"));

      const ticksOnly = await updateAsset(httpAsset.data.id, { minMoveTicks: 40 }, OFFICER);
      ok("2.11 · raising the ticks ALONE is refused — the stored http:// fails whole-row validation",
         !ticksOnly.ok, ticksOnly.ok ? "saved, so the lock does not exist" : ticksOnly.error.slice(0, 70));

      const repaired = await updateAsset(
        httpAsset.data.id,
        { minMoveTicks: 40, priceSourceUrl: "https://www.kitco.com/pd" },
        OFFICER,
      );
      ok("2.12 · repairing the scheme in the SAME call lets the row be saved again",
         repaired.ok, repaired.ok ? "" : repaired.error.slice(0, 90));

      const after = (await assetStore.get(httpAsset.data.id))!;
      ok("2.13 · …and BOTH values landed — the band is off 1 tick and the key is off the wire",
         after.minMoveTicks === 40 && after.priceSourceUrl.startsWith("https://"),
         `ticks ${after.minMoveTicks} · ${after.priceSourceUrl}`);
    }
  }
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
  ok("3.2 · a duration off the epoch lattice is refused — 7 does not divide the day", !chainBad.ok,
     chainBad.ok ? "" : chainBad.error.slice(0, 70));

  // ⚠️ 15 MINUTES, NOT 5 — the fixture is GOLD, and gold is 15m+ only since 2026-08-04.
  // Its own feed disagrees with itself by up to $0.87 at one instant, about a whole 5-minute
  // gold move, so a shorter round is decided by the data rather than the market. The fixture
  // moves to a length gold can actually run; the rule is not relaxed to suit the test.
  //  is the dedicated guard for that rule.
  const c5 = await createChain({ assetId: goldId, durationMinutes: 15 }, OFFICER);
  ok("3.3 · a 15-minute chain is created", c5.ok, c5.ok ? "" : c5.error);
  ok("3.4 · a new chain starts STOPPED — creating it must not start emitting rounds",
     c5.ok && c5.data.state === "STOPPED");
  ok("3.5 · a stopped chain has no next boundary", c5.ok && c5.data.nextBoundaryAt === null);

  const dupChain = await createChain({ assetId: goldId, durationMinutes: 15 }, OFFICER);
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
  // ⭐ INVERTED 2026-08-14 (A2). This section asserted capped-commission @ 13% of the pool,
  // a balanced TZS 10,000 round yielding TZS 1,300, a biting ⅓ ceiling, and OUTCOME
  // NEUTRALITY. All four were true, and all four are now false by decision — Up & Down
  // charges `loser-share`, 13% of the LOSING side, the same as long-form polls
  // (docs/RULES.md §2.1, docs/COMPLIANCE-DECISIONS.md § 2026-08-14).
  //
  // ⛔ THE ASSERTIONS ARE INVERTED, NOT DELETED. Each one now states the new rule AND
  // names the retired number it replaced, so the change stays visible in the suite that
  // used to enforce the old one. A test quietly removed is a rule quietly forgotten.
  const cfg = await getUpDownConfig();
  ok("4.1 · the default profile is loser-share, 3% + 10% of the LOSING side",
     cfg.defaultRateProfile.feeModel === "loser-share" &&
     cfg.defaultRateProfile.platformFeeRate === 0.03 &&
     cfg.defaultRateProfile.operatorFeeRate === 0.10,
     JSON.stringify(cfg.defaultRateProfile));

  // THE INCOME CONSEQUENCE, PINNED. A balanced TZS 10,000 round used to yield TZS 1,300
  // (13% of the pool); it now yields TZS 650 (13% of the 5,000 that lost). Halving our
  // income on a balanced round is the accepted, recorded cost of one charge model the
  // customer can understand — see RULES.md §1. This number is here so that cost can never
  // be re-discovered as a surprise.
  const fee = poolFee(5000, 5000, cfg.defaultRateProfile, "YES");
  ok("4.2 · a balanced TZS 10,000 round yields TZS 650 — half the retired model's 1,300",
     fee.fee === 650, `got ${fee.fee}`);

  // …and on a lopsided pool the fee follows the LOSING side down, with no ceiling involved.
  // The retired model charged min(13% × 10,000, ⅓ × 1,000) = 333 here.
  const lop = poolFee(9000, 1000, cfg.defaultRateProfile, "YES");
  ok("4.3 · a lopsided pool is charged 13% of the small losing side — 130, not the old 333",
     Math.round(lop.fee) === 130 && lop.capped === false,
     `fee ${Math.round(lop.fee)}, capped ${lop.capped}`);

  // 🔴 OUTCOME-NEUTRALITY IS DELIBERATELY GIVEN UP ON THIS PRODUCT.
  //
  // `capped-commission` reads only the two pool sizes, so its fee is byte-identical for a
  // YES win and a NO win — the property `docs/F6-LIQUIDITY-DESIGN.md` §3.1 names as the
  // pari-mutuel licence anchor, and the reason the 2026-07-24 ruling put Up & Down on it.
  // `loser-share` charges a slice of whichever side LOST, so it is outcome-DEPENDENT by
  // construction. Long-form polls have been outcome-dependent since 2026-07-23 under Ali's
  // explicit override; 2026-08-14 extends that same override to Up & Down.
  //
  // ⛔ This is asserted rather than removed BECAUSE it is a licence-bearing property. A
  // future reader must find it stated, dated and deliberate — not absent.
  const yesWins = poolFee(7000, 3000, cfg.defaultRateProfile, "YES").fee;
  const noWins = poolFee(7000, 3000, cfg.defaultRateProfile, "NO").fee;
  ok("4.4 · 🔴 outcome-DEPENDENT by decision: the fee follows whichever side lost",
     yesWins !== noWins && Math.round(yesWins) === 390 && Math.round(noWins) === 910,
     `YES wins → ${Math.round(yesWins)} (13% of 3,000) · NO wins → ${Math.round(noWins)} (13% of 7,000)`);

  // ⭐ POSITIVE CONTROL — the retired model is still outcome-NEUTRAL, and every one of the
  // 4,146 production rounds frozen on it still settles that way. Without this, "we moved
  // the default" and "we broke outcome-neutrality everywhere" pass identically.
  const legacyProfile = { feeModel: "capped-commission" as const, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
  const legacyYes = poolFee(7000, 3000, legacyProfile, "YES").fee;
  const legacyNo = poolFee(7000, 3000, legacyProfile, "NO").fee;
  ok("4.4b · ⭐ a round frozen on the LEGACY model is still outcome-neutral",
     legacyYes === legacyNo && Math.round(legacyYes) === 1000,
     `${Math.round(legacyYes)} vs ${Math.round(legacyNo)}`);

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

    const okUpdate = await updateChain(chains[0].id, { minStake: 1_000, maxStake: 50_000 }, OFFICER);
    ok("4.8 · valid stake bounds are accepted", okUpdate.ok, okUpdate.ok ? "" : okUpdate.error);

    // ⛔ THE PLATFORM FLOOR IS A RULE, NOT A SETTING (2026-08-14). This line asserted that
    //    500 was "valid" — and production was running on exactly that floor. The door must
    //    refuse it now; an operator may narrow the window inside 1,000…1,000,000, never
    //    widen it past either end.
    const belowFloor = await updateChain(chains[0].id, { minStake: 500 }, OFFICER);
    ok("4.8b · a sub-floor chain minimum is REFUSED at the door", !belowFloor.ok,
       belowFloor.ok ? "ACCEPTED — the rule is not enforced" : belowFloor.error);
    const aboveCeiling = await updateChain(chains[0].id, { maxStake: 5_000_000 }, OFFICER);
    ok("4.8c · a chain maximum above the platform ceiling is REFUSED", !aboveCeiling.ok,
       aboveCeiling.ok ? "ACCEPTED — the rule is not enforced" : aboveCeiling.error);

    const inverted = await updateChain(chains[0].id, { minStake: 900_000 }, OFFICER);
    ok("4.9 · min > max is refused", !inverted.ok);

    const profile = await rateProfileFor(chains[0]);
    ok("4.10 · the chain's frozen profile is what it will stamp on rounds",
       profile.feeModel === "loser-share" && profile.platformFeeRate === 0.03 && profile.operatorFeeRate === 0.10,
       JSON.stringify(profile));
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

  // E-62 · 10 and 60 added 2026-08-04 on Ali's request. Both divide the 5-minute observation
  // grid exactly, so both reuse the reading that boundary already produces — no extra provider
  // call. ⭐ 3 IS NOW PRESENT (2026-08-04). It was excluded because it does not divide the
  // 5-minute observation grid — true, and load-bearing while chains emitted on timers onto
  // shared instants. Ali made generation manual, `generateRoundNow` opens on `minuteFloor(now)`
  // rather than on any grid, and manual rounds do not coincide — so nothing was being shared
  // and the exclusion was costing the product its shortest duration for no saving. The rule is
  // now the EPOCH LATTICE (a duration must divide 1440); `npm run test:updown-durations` holds
  // it. This pins the list itself so a change here still has to be deliberate.
  ok("7.6 · ALLOWED_DURATIONS is exactly 3/5/10/15/30/60",
     JSON.stringify([...ALLOWED_DURATIONS]) === JSON.stringify([3, 5, 10, 15, 30, 60]),
     JSON.stringify([...ALLOWED_DURATIONS]));
}

// ═══════════════════════════════════════════════════════════════════════════
// 8 · THE MARGIN MODEL — the PDF's base ± margin config + pure boundary maths
// ═══════════════════════════════════════════════════════════════════════════

{
  __resetUpDownConfig();
  // ⛔ ZERO SINCE 2026-08-04 — the margin is the TICK FLOOR (Ali's decision, §6ad item 4).
  //
  // This asserted 50 bps, the "50pick factor" the product was named for. It was measured
  // honestly and it is retired: the void curve is too steep for a middle (0.01% already
  // refunds 1 in 5), and a refunded round pays 0% fee and hands a "winner" their stake back
  // (E-65). `computeTargets`' tick floor — 8.5 below — becomes the load-bearing rule.
  ok("8.1 · ⭐ the default margin is ZERO bps — the band is now the TICK FLOOR, not a percentage",
     DEFAULT_UPDOWN_CONFIG.defaultMarginBps === 0 && (await getUpDownConfig()).defaultMarginBps === 0,
     String(DEFAULT_UPDOWN_CONFIG.defaultMarginBps));

  // ⛔ computeTargets IS the PDF: base 4120, 0.5% → margin 20.6, up 4140.6, down 4099.4.
  const t = computeTargets(4120, 50, { decimals: 2, minMoveTicks: 1 });
  ok("8.2 · ⛔ the PDF example: base 4120 × 0.5% → margin 20.6, up 4140.6, down 4099.4",
     t.margin === 20.6 && t.upTarget === 4140.6 && t.downTarget === 4099.4,
     `margin ${t.margin}, up ${t.upTarget}, down ${t.downTarget}`);
  ok("8.3 · the boundaries are equidistant from the base (symmetric band)",
     Math.abs((t.upTarget - 4120) - (4120 - t.downTarget)) < 1e-9);

  // Scale-invariance — 0.5% behaves the same on a crypto pair as on a metal.
  const btc = computeTargets(60000, 50, { decimals: 2, minMoveTicks: 1 });
  ok("8.4 · scale-invariant: 60,000 × 0.5% → margin 300, up 60,300, down 59,700",
     btc.margin === 300 && btc.upTarget === 60300 && btc.downTarget === 59700, `margin ${btc.margin}`);

  // The tick FLOOR — a near-zero margin can't fall below the source's minimum move.
  const tiny = computeTargets(1.00, 1, { decimals: 2, minMoveTicks: 1 }); // 1bp of 1.00 = 0.0001 < tick 0.01
  ok("8.5 · a sub-tick margin is FLOORED to the source's minimum move (0.01)",
     tiny.margin === 0.01 && tiny.upTarget === 1.01 && tiny.downTarget === 0.99, `margin ${tiny.margin}`);

  // marginBpsForChain — a chain's own override wins; else the E-32 ladder for its class
  // and duration; else the flat product default. The `null override` case therefore uses a
  // duration past the top rung, because every duration the platform can actually run is
  // now priced by the ladder — see scripts/updown-margin-schedule.test.mts.
  const cfg = await getUpDownConfig();
  ok("8.6 · a chain with no override inherits the product default margin (now 0 = the tick floor)",
     marginBpsForChain({ marginBps: null, durationMinutes: 99_999 } as never, cfg, { category: "crypto" }) === 0);
  ok("8.7 · a chain override wins over the default",
     marginBpsForChain({ marginBps: 20, durationMinutes: 5 } as never, cfg, { category: "crypto" }) === 20);

  // Config validation — whole bps, 0-2000 (0-20%); 0 disables the %-band.
  ok("8.8 · a margin above 2000 bps (20%) is refused",
     !(await setUpDownConfig({ defaultMarginBps: 2500 }, OFFICER)).ok);
  ok("8.9 · a fractional bps is refused (whole basis points only)",
     !(await setUpDownConfig({ defaultMarginBps: 12.5 as never }, OFFICER)).ok);
  ok("8.10 · a negative margin is refused",
     !(await setUpDownConfig({ defaultMarginBps: -1 }, OFFICER)).ok);
  const setOk = await setUpDownConfig({ defaultMarginBps: 30 }, OFFICER);
  ok("8.11 · a sane margin (30 bps = 0.3%) is accepted and persists",
     setOk.ok && (await getUpDownConfig()).defaultMarginBps === 30);
  ok("8.12 · 0 bps is accepted — disables the %-band (reverts to the source min-move)",
     (await setUpDownConfig({ defaultMarginBps: 0 }, OFFICER)).ok);

  // A per-chain margin override on updateChain, validated + stored.
  __resetUpDownConfig();
  const chains = await listChains({ assetId: goldId });
  if (chains[0]) {
    ok("8.13 · a per-chain margin above the cap is refused",
       !(await updateChain(chains[0].id, { marginBps: 9999 }, OFFICER)).ok);
    ok("8.14 · a per-chain margin override (25 bps) is accepted",
       (await updateChain(chains[0].id, { marginBps: 25 }, OFFICER)).ok);
    const after = (await chainStore.get(chains[0].id))!;
    ok("8.15 · …stored on the chain (25), and marginBpsForChain returns it over the default",
       after.marginBps === 25 && marginBpsForChain(after, await getUpDownConfig(), { category: "macro" }) === 25, `stored ${after.marginBps}`);
  }
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
