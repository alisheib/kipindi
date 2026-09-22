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

export async function runCounterLanes(env: Any): Promise<Any> {
  const { ok, section, until, j, w, S, fleet, stake, EXPECT, COUNTER_CUTOFF_MIN, laneWanted } = env;

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
        ok(`${key} · …and it placed nothing at all`, (await housePositionsOn(market.id)).length === 0);
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
        ok(`${key} · …and it equals what the engine DECIDED — the draw is not repeated at fire`,
          staked === d.decided?.stakeTzs, j({ staked, decided: d.decided?.stakeTzs }));
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
