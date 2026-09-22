/**
 * THE FLEET'S LANES — one per market category, several accounts deciding under ONE engine at once.
 *
 * ⛔ EACH LANE IS ISOLATED BY THE PRODUCT'S OWN FILTER, not by a test-only namespace. A lane owns one
 * `MarketCategory`, and every bot in it is scoped to exactly that category — so a bot in `crypto` is
 * structurally incapable of deciding about a `macro` market (`rulesCover` drops it before any flag is
 * loaded). Where a lane holds several bots, the sub-namespace is the disjoint `counter.triggerStake` band:
 * one player stake selects exactly one bot and every other answers `TRIGGER_STAKE_RANGE`.
 * ⚠️ AND A LANE'S SEEDS MUST FALL OUTSIDE EVERY BAND IN THE LANE, not merely outside their own desk's. At
 * a seed of 10,000 inside a sibling's band the sibling answered the wrong market, `marketHeld` then refused
 * that desk on its own market, and it decided nothing at all — measured on the first run.
 *
 * ⛔ THE TWO PHASES ARE CONCURRENT, AND THAT IS THE POINT OF THE LANE. Waiting on each desk in turn makes
 * "several accounts at once" a claim rather than a measurement — and it is not merely weaker, it is WRONG:
 * the first run waited up to 90 s on desk 1, by which time desk 2 had already fired, so every decide-stage
 * assertion for desk 2 missed a window that had opened and closed while the harness was looking elsewhere.
 * Phase 1 waits for every desk's decision, phase 2 for every desk's placement.
 *
 * ⛔ THE ACCURACY CHAIN IS ASSERTED WHOLE — rules → PENDING intent → PLACED position → the holder's wallet.
 * The existing suites assert the first half (`17.47`) and the second half (`16.3`, `16.7`) and never join
 * them, so nothing in this repository proved that the number a bot DECIDED is the number that left a wallet.
 *
 * ⛔ AND A SKIPPED ROW'S `stakeTzs` IS NEVER COMPARED. It is a schema-satisfying placeholder — the smallest
 * stake the bot could have placed — written by ruling 120, not an intended amount. `stakeOracle` refuses to
 * look at one, loudly, rather than leaving that to a convention somebody edits away.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/**
 * ⛔ ONE DEFINITION OF EACH, shared by every lane. Two lanes with their own copy of the placeholder guard
 * is two chances to drop it, and the one that drops it is the one that reads a ruling-120 placeholder as
 * an intended stake.
 */
function helpers(env: Any): Any {
  const { ok, j, w, S } = env;

  /** ⛔ The guard that keeps the ruling-120 placeholder out of every arithmetic comparison. */
  const stakeOracle = (row: Any, expected: number, what: string): void => {
    if (!row) { ok(what, false, "no row"); return; }
    if (!["PENDING", "CLAIMED", "PLACED"].includes(row.status)) {
      ok(what, false, `refused to compare: ${row.id} is ${row.status} — stakeTzs there is the ruling-120 placeholder, not an intended stake`);
      return;
    }
    ok(what, row.stakeTzs === expected, j({ got: row.stakeTzs, expected, status: row.status }));
  };

  /** ⚠️ `IntentFeedFilter` carries NO `marketId` — it filters by ACCOUNT. That miss cost a red run. */
  const rowsOf = async (botId: string): Promise<Any[]> => {
    const page = await S.houseBotIntentStore.listFeed({ houseBotId: botId, limit: 50 });
    return (page?.rows ?? page ?? []) as Any[];
  };
  const housePositionsOn = async (marketId: string): Promise<Any[]> =>
    (await w.positionsOf(marketId)).filter((p: Any) => p.houseBotId != null);

  return { stakeOracle, rowsOf, housePositionsOn };
}

export async function runCounterLanes(env: Any): Promise<Any> {
  const { ok, section, until, j, w, S, fleet, stake, EXPECT, COUNTER_CUTOFF_MIN, laneWanted } = env;
  const { stakeOracle, rowsOf, housePositionsOn } = helpers(env);

  const out: Any = { placed: [], refused: [] };

  const LANES: Any[] = [
    ["A", ["A1-PCT", "A2-JITTER", "A3-NEVER"]],
    ["B", ["B1-FIXED", "B2-CAPPED"]],
  ];

  for (const [lane, keys] of LANES) {
    if (!laneWanted(lane)) continue;
    const mine = keys.filter((k: string) => fleet[k]);
    if (mine.length === 0) continue;
    section(`lane ${lane} · COUNTER — ${mine.length} account(s), one market each, ALL deciding at once`);

    // ── seed every desk before waiting on any of them ────────────────────────────────────────────
    const desks: Any[] = [];
    for (const key of mine) {
      const bot = fleet[key];
      const exp = EXPECT[key];
      const market = await w.poll({ graceMin: 0, category: bot.category, closeInMs: COUNTER_CUTOFF_MIN * 60_000, title: `Fleet ${key}` });
      /* Aged past its exit close so it counts as the players' locked money, and outside EVERY band in the lane. */
      await stake(market.id, "NO", exp.seed, 10_000);
      /* ⚠️ The holder's balance is taken BEFORE the trigger. Reading it after the intent appears is a race
         the poller can win, and the delta then measures nothing. */
      const before = (await w.bal(bot.userId)).balance as number;
      const trig = await stake(market.id, "NO", exp.trigger, 0);
      desks.push({ key, bot, exp, market, before, trig });
    }

    // ── phase 1 · every desk's DECISION, waited for concurrently ─────────────────────────────────
    /* ⛔ THE ROW THAT ANSWERS THE *TRIGGER*, NOT MERELY A ROW ON THE MARKET. Measured: a desk writes a
       VISIBLE `SKIPPED · TRIGGER_STAKE_RANGE` row for the SEED stake too, because the seed sits outside its
       band — which is `decide.ts`'s "one visible row naming why nobody reacted" working exactly as designed.
       A harness that takes the first row on the market reads that refusal as the desk's decision and calls a
       correct product broken. `triggerPositionId` is what names the stake a row is about. */
    await Promise.all(desks.map(async (d: Any) => {
      d.decided = await until(`${d.key} · a decision on the trigger`, 60_000, async () => {
        const rows = await rowsOf(d.bot.botId);
        const hit = rows.find((r: Any) => r.triggerPositionId === d.trig.positionId);
        return hit ? await S.houseBotIntentStore.get(hit.id) : null;
      });
    }));

    for (const d of desks) {
      const { key, exp, decided } = d;

      if (exp.decide === null) {
        /* ⭐ reactProbability 0 — deterministic in the OTHER direction: one visible SKIPPED row saying nobody
           reacted, and nothing placed. A probability of nought needs no statistics, which is why the roster
           chose 0 rather than a middling number. */
        ok(`${key} · a 0% desk writes a VISIBLE SKIPPED row rather than deciding in silence`,
          decided?.status === "SKIPPED" && decided?.reasonCode === "NOT_REACTING",
          j({ status: decided?.status, code: decided?.reasonCode }));
        /* ⛔ THE POSITIVE HALF OF THE PLACEHOLDER RULE — the harness shows it knows what that field is,
           rather than merely declining to compare it. */
        ok(`${key} · …and its stakeTzs IS the ruling-120 placeholder (1,000), not an intended stake`,
          decided?.stakeTzs === 1_000, j({ got: decided?.stakeTzs }));
        continue;
      }

      ok(`${key} · the engine decided: a PENDING COUNTER on the side opposite the trigger`,
        decided?.kind === "COUNTER" && decided?.side === exp.side && decided?.status === "PENDING",
        j({ kind: decided?.kind, side: decided?.side, status: decided?.status, code: decided?.reasonCode }));

      if (exp.lo != null) {
        /* ⭐ THE JITTER LANE — an INTERVAL, and it is labelled as one. A point assertion here would be a lie
           about what jitter is. */
        ok(`${key} · with ±10% jitter the decided stake lands inside [${exp.lo}, ${exp.hi}] — an INTERVAL, deliberately weaker`,
          decided != null && decided.stakeTzs >= exp.lo && decided.stakeTzs <= exp.hi, j({ got: decided?.stakeTzs }));
        ok(`${key} · …and the amount it recorded asking for is inside the same interval`,
          (decided?.decision?.askedStakeTzs ?? -1) >= exp.lo && (decided?.decision?.askedStakeTzs ?? -1) <= exp.hi,
          j({ asked: decided?.decision?.askedStakeTzs }));
      } else {
        stakeOracle(decided, exp.decide, `${key} · …and it is EXACTLY the stake the rules say (${exp.decide})`);
        ok(`${key} · …and the amount it recorded asking for is exactly ${exp.asked}`,
          decided?.decision?.askedStakeTzs === exp.asked, j({ asked: decided?.decision?.askedStakeTzs, expected: exp.asked }));
      }
    }

    // ── phase 2 · every desk's PLACEMENT, waited for concurrently ────────────────────────────────
    const firing = desks.filter((d: Any) => d.exp.decide !== null && d.decided?.status === "PENDING");
    await Promise.all(firing.map(async (d: Any) => {
      d.fired = await until(`${d.key} · the poller firing it`, 120_000, async () => {
        const r = await S.houseBotIntentStore.get(d.decided.id);
        return r && r.status !== "PENDING" && r.status !== "CLAIMED" ? r : null;
      });
    }));

    for (const d of desks) {
      const { key, bot, exp, market, before, fired } = d;
      if (exp.decide === null) {
        /* ⛔ AN ABSENCE IS ONLY EVIDENCE IF SOMETHING RAN, and this case learned that the hard way: under
           `KP_FLEET_SILENT=1` it PASSED — nothing was placed, because nothing decided. A 0% desk and a
           dead engine leave the same empty market, so the refusal must be WITNESSED before its silence
           counts for anything. The witness is the desk's own visible SKIPPED row. */
        const witnessed = d.decided?.status === "SKIPPED" && d.decided?.reasonCode === "NOT_REACTING";
        const placedN = (await housePositionsOn(market.id)).length;
        ok(`${key} · …and it placed nothing at all — its refusal WITNESSED, so the empty market is evidence`,
          witnessed && placedN === 0, j({ witnessed, placed: placedN }));
        out.refused.push({ key, code: d.decided?.reasonCode });
        continue;
      }
      ok(`${key} · the poller fired it to PLACED, with a position id`,
        fired?.status === "PLACED" && !!fired?.positionId, j({ status: fired?.status, code: fired?.reasonCode }));

      const house = (await housePositionsOn(market.id)).filter((p: Any) => p.houseBotId === bot.botId);
      ok(`${key} · exactly ONE marked position on this market, on the decided side`,
        house.length === 1 && house[0]?.side === exp.side, j({ n: house.length, side: house[0]?.side }));

      const staked = house[0]?.stake;
      if (exp.lo != null) {
        ok(`${key} · …and the position is inside the jitter interval [${exp.lo}, ${exp.hi}]`,
          staked >= exp.lo && staked <= exp.hi, j({ staked }));
        /* ⭐ The jitter is drawn ONCE, at the decision. A second draw at fire would be a different number
           and would also mean the officer's recorded decision did not describe the bet that was placed. */
        /* ⛔ `undefined === undefined` IS NOT AGREEMENT. Under `KP_FLEET_SILENT=1` nothing was placed and
           nothing was decided, both sides read `undefined`, and this case reported the two absences as a
           match. Two numbers must EXIST before it means anything to say they are equal. */
        ok(`${key} · …and it equals what the engine DECIDED — the draw is not repeated at fire`,
          typeof staked === "number" && typeof d.decided?.stakeTzs === "number" && staked === d.decided.stakeTzs,
          j({ staked, decided: d.decided?.stakeTzs }));
      } else {
        ok(`${key} · …of exactly ${exp.fire} — the number the rules decided is the number that was staked`,
          staked === exp.fire, j({ got: staked, expected: exp.fire }));
      }

      const after = (await w.bal(bot.userId)).balance as number;
      ok(`${key} · …and the holder's wallet fell by exactly that, to the shilling`,
        before - after === staked, j({ before, after, delta: before - after, staked }));

      /* ⛔ D20: every money row of a house placement carries the marker. A marked position with unmarked
         money rows reads, under D20, as a missing PLAYER row. */
      const txns = await w.txnsFor(house[0]?.id);
      ok(`${key} · …and every money row it wrote carries the marker`,
        txns.length > 0 && txns.every((t: Any) => t.houseBotId === bot.botId), j({ n: txns.length }));

      out.placed.push({ key, stake: staked, side: house[0]?.side, market: market.id, botId: bot.botId, holder: bot.userId });
    }
  }

  return out;
}

/**
 * LANE C · THE POOL TRAP — the highest-value case in the drive, and the only one that can fail in BOTH
 * directions at once.
 *
 * Two sites size a house COUNTER against the players' money, and they read DIFFERENT columns on purpose:
 *   · `decide.ts:380`  cut = pools[trigger.side].nonHouse − pools[botSide].raw
 *   · `fire.ts:225`    against = pools[opp].lockedA15        (untargeted COUNTER only)
 * `nonHouse` is every non-house shilling on that side, locked or not. `lockedA15` is the one column with
 * neither the account filter nor the 7 s margin, and it counts a stake only once its exit window has shut.
 * They are different questions asked at different moments: at DECIDE nothing is committed yet and the bot
 * is sizing an intention; at FIRE the money must really be there and unable to walk away.
 *
 * ⭐ A case that merely placed a bet would pass with the two columns SWAPPED. This one cannot, because the
 * market is arranged so each column gives a different answer at each moment, and all four answers differ:
 *
 *   t+0    seeded NO 60,000, aged 70 s   → already locked
 *   t+0    trigger NO 100,000            → locks at t+60
 *   t+~6   late YES 120,000              → raw at once, and it is the bot's OWN side
 *   t+30   late NO 40,000                → would lock at t+90, i.e. never before the bet
 *
 *   DECIDE (≈t+5)  nonHouse NO 160,000 − raw YES 0        = 160,000 → asked 80,000 survives → 80,000
 *                  ⛔ lockedA15 there would be 60,000 (the trigger has not locked yet)      → 60,000
 *   FIRE   (≈t+60) lockedA15 NO 160,000 − raw YES 120,000 =  40,000 → 80,000 cut to         → 40,000
 *                  ⛔ nonHouse there would be 200,000 − 120,000 = 80,000, uncut
 *
 * So: 80,000 then 40,000. Swap either site and one of those two numbers moves. Both wrong fields are
 * excluded, in both directions, by one desk on one market.
 *
 * ⛔ AND THE CASE PROVES ITS OWN PREMISE. Every number above depends on WHEN each stake landed relative to
 * the bet, which is a race the harness does not control — so the timings are not assumed, they are read
 * back off the durable rows and asserted. A late stake that arrived after the bet, or a "late" NO whose
 * window had quietly shut in time to be counted, would leave this lane green while measuring nothing.
 */
export async function runPoolTrapLane(env: Any): Promise<Any> {
  const { ok, section, until, j, w, S, fleet, stake, EXPECT, COUNTER_CUTOFF_MIN, laneWanted, sleep } = env;
  if (!laneWanted("C")) return null;
  const bot = fleet["C1-POOLS"];
  if (!bot) return null;
  const exp: Any = EXPECT["C1-POOLS"];
  const { stakeOracle, rowsOf } = helpers(env);

  section("lane C · THE POOL TRAP — nonHouse at DECIDE, lockedA15 at FIRE, both wrong fields excluded");

  /* ⛔ `graceMin: 1` is the whole clock of this lane: a stake locks exactly 60 s after it is placed, which
     is what lets one market hold locked and unlocked money at the same instant. */
  const GRACE_MS = 60_000;
  const market = await w.poll({
    graceMin: 1, category: bot.category, closeInMs: COUNTER_CUTOFF_MIN * 60_000, title: "Fleet C1-POOLS",
  });

  /* Aged past its exit close, so it is locked at BOTH moments and is the part of the pool the two columns
     agree on. 60,000 also sits outside the desk's band [90,000–110,000], so it cannot itself be a trigger. */
  await stake(market.id, "NO", exp.seed, GRACE_MS + 10_000);

  /* ⚠️ Read BEFORE the trigger — reading it after the intent appears is a race the poller can win. */
  const before = (await w.bal(bot.userId)).balance as number;
  const t0 = Date.now();
  const trig = await stake(market.id, "NO", exp.trigger, 0);

  // ── the DECIDE stage · nonHouse, before a shilling of the late money exists ──────────────────────
  const decided = await until("C1-POOLS · a decision on the trigger", 60_000, async () => {
    const rows = await rowsOf(bot.botId);
    const hit = rows.find((r: Any) => r.triggerPositionId === trig.positionId);
    return hit ? await S.houseBotIntentStore.get(hit.id) : null;
  });

  ok("C1-POOLS · the engine decided: a PENDING COUNTER on the side opposite the trigger",
    decided?.kind === "COUNTER" && decided?.side === exp.side && decided?.status === "PENDING",
    j({ kind: decided?.kind, side: decided?.side, status: decided?.status, code: decided?.reasonCode }));
  stakeOracle(decided, exp.decide,
    `C1-POOLS · …sized on nonHouse (160,000): EXACTLY ${exp.decide} — lockedA15 there would have given 60,000`);
  ok(`C1-POOLS · …and the amount it recorded asking for is exactly ${exp.asked}`,
    decided?.decision?.askedStakeTzs === exp.asked, j({ asked: decided?.decision?.askedStakeTzs, expected: exp.asked }));

  /* ⛔ ORDERED BY DEPENDENCY, NOT BY CLOCK. The decision must be durable before the late money lands, or the
     decide-stage cut would have included it and the first half of this lane would measure nothing. */
  if (decided?.status !== "PENDING") {
    ok("C1-POOLS · the late money goes on only once the decision is durable — it is not, so the lane stops here rather than reporting a number it did not measure",
      false, j({ status: decided?.status, code: decided?.reasonCode }));
    return { lane: "C", measured: false };
  }

  // ── the late money · raw YES at once, and a NO that can never lock in time ───────────────────────
  const lateYes = await stake(market.id, "YES", exp.lateYes, 0);
  /* The NO is held back so its window cannot shut before the bet: 30 s leaves it locking at t+90 against a
     bet due at t+60 — and the PREMISE assertions below read the real instants rather than trust this sleep. */
  const wait = t0 + 30_000 - Date.now();
  if (wait > 0) await sleep(wait);
  const lateNo = await stake(market.id, "NO", exp.lateNo, 0);

  // ── the FIRE stage · lockedA15, with the late YES now on the bot's own side ──────────────────────
  const fired = await until("C1-POOLS · the poller firing it", 150_000, async () => {
    const r = await S.houseBotIntentStore.get(decided.id);
    return r && r.status !== "PENDING" && r.status !== "CLAIMED" ? r : null;
  });
  ok("C1-POOLS · the poller fired it to PLACED, with a position id",
    fired?.status === "PLACED" && !!fired?.positionId, j({ status: fired?.status, code: fired?.reasonCode }));

  const all = await w.positionsOf(market.id);
  const house = all.filter((p: Any) => p.houseBotId === bot.botId);
  ok("C1-POOLS · exactly ONE marked position on this market, on the decided side",
    house.length === 1 && house[0]?.side === exp.side, j({ n: house.length, side: house[0]?.side }));

  const staked = house[0]?.stake;
  ok(`C1-POOLS · …cut at fire on lockedA15 to EXACTLY ${exp.fire} — nonHouse there would have left it at 80,000, uncut`,
    staked === exp.fire, j({ got: staked, expected: exp.fire }));

  /* ⭐ MON-02 · a smaller stake is written BACK to the claimed row, so the officer's record is the bet that
     was placed and not the one that was intended a minute earlier. */
  ok(`C1-POOLS · …and the intent row was CLAMPED to what was staked, not left at the ${exp.decide} it decided`,
    fired?.stakeTzs === exp.fire, j({ row: fired?.stakeTzs, staked }));

  /* ⭐ THE CONTROL THAT MAKES THE LANE DISCRIMINATING. If the two sites ever read the same column these two
     numbers collapse into one, so their DIFFERENCE is the property under test — not either number alone.
     ⛔ IT READS `stakeTzs`, THE SIZE THE ENGINE DECIDED, AND NOT `askedStakeTzs`. It read the asked amount
     once, and the first mutation run showed why that was worthless here: `asked` is the pre-cut 80,000 and
     `exp.decide` is also 80,000, so the two agreed for a reason that had nothing to do with the cut. With
     `decide.ts` mutated to size on `lockedA15` the decided stake fell to 60,000 and this control still
     passed — a check reading the wrong field, agreeing by coincidence. */
  ok("C1-POOLS · the decide-stage and fire-stage sizes are DIFFERENT numbers (80,000 → 40,000) — one column at both sites collapses them",
    decided?.stakeTzs === exp.decide && staked === exp.fire && exp.decide !== exp.fire,
    j({ decided: decided?.stakeTzs, fired: staked }));

  // ── the premise, read back off the rows rather than assumed ──────────────────────────────────────
  const at = (id: string): number => {
    const p = all.find((x: Any) => x.id === id);
    return p?.placedAt ? Date.parse(p.placedAt) : NaN;
  };
  const betAt = at(house[0]?.id);
  const yesAt = at(lateYes.positionId);
  const noAt = at(lateNo.positionId);
  const trigAt = at(trig.positionId);
  /**
   * ⛔ A GUARDED VERDICT DOES NOT GUARD ITS OWN MESSAGE. Every assertion below already refuses a missing
   * instant with `Number.isFinite` — but the DETAIL argument is evaluated EAGERLY, before `ok` is entered,
   * so on the run where nothing was placed `new Date(NaN).toISOString()` threw `RangeError: Invalid time
   * value` and took the last five cases of the lane with it. Found by the `fire.ts` mutation, which is the
   * one run where the bet is legitimately absent: the mutation was still caught, but the lane CRASHED
   * instead of reporting, and a crash says far less about an engine defect than five clean reds do.
   */
  const stamp = (t: number): string => (Number.isFinite(t) ? new Date(t).toISOString() : "— never placed —");

  ok("C1-POOLS · PREMISE · the late YES really was on the book before the bet — otherwise the fire-stage cut never saw it",
    Number.isFinite(yesAt) && Number.isFinite(betAt) && yesAt < betAt,
    j({ yes: stamp(yesAt), bet: stamp(betAt) }));
  ok("C1-POOLS · PREMISE · the trigger HAD locked by the time the bet was placed — it is 100,000 of the 160,000 lockedA15 was sized on",
    Number.isFinite(trigAt) && Number.isFinite(betAt) && trigAt + GRACE_MS <= betAt,
    j({ locks: stamp(trigAt + GRACE_MS), bet: stamp(betAt) }));
  ok("C1-POOLS · PREMISE · the late NO had NOT locked by then — had its window shut in time, lockedA15 would have been 200,000 and this lane would have measured nothing",
    Number.isFinite(noAt) && Number.isFinite(betAt) && noAt + GRACE_MS > betAt,
    j({ locks: stamp(noAt + GRACE_MS), bet: stamp(betAt) }));

  // ── the accuracy chain, joined ───────────────────────────────────────────────────────────────────
  const after = (await w.bal(bot.userId)).balance as number;
  ok("C1-POOLS · …and the holder's wallet fell by exactly that, to the shilling",
    before - after === staked, j({ before, after, delta: before - after, staked }));
  const txns = await w.txnsFor(house[0]?.id);
  ok("C1-POOLS · …and every money row it wrote carries the marker",
    txns.length > 0 && txns.every((t: Any) => t.houseBotId === bot.botId), j({ n: txns.length }));

  return { lane: "C", measured: true, decided: decided?.stakeTzs, fired: staked, market: market.id, botId: bot.botId, holder: bot.userId };
}
