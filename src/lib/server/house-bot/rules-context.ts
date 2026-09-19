/**
 * THE RULES PARSE CONTEXT, BUILT ON THE SERVER (04 C14, F4).
 *
 * `parseHouseBotRules` drops a chain or category the platform no longer has, so it needs the live lists. The engine
 * parses a bot's saved rules on every Enter now load (and later every planner pass); this builds the part of
 * `RulesContext` that parse reads (`ParseContext`: chains, categories, durations) from the platform itself.
 *
 * ⛔ THE CHAIN KEY IS `<assetId>:<durationMinutes>` — the asset's ID, never its symbol (`rules.ts` ChainKey, the same
 * key `houseSeamStore.marketView` builds). A key built from the symbol would drop every saved chain as stale and put
 * every Up & Down round out of every bot's scope.
 *
 * Chains are those of ENABLED assets (`RulesContext.chains`: "Enabled assets × chains"). Live stake bounds are left
 * out: parse never checks them (04 F5).
 */
import { CAP_FIELDS, LIMIT_FIELDS, RULES_CONTEXT_LISTS, type ExitRates, type ParseContext, type RulesBot, type RulesChain, type RulesContext } from "@/lib/house-bot/rules";
import { MIN_SELECTION_WINDOW_MINUTES } from "../ai-poll-config";
import { getGlobalConfig } from "../market-config";
import { RATE_RULES } from "../rate-limit";
import { houseBotControlStore, houseBotStore } from "../house-bot-dal";
import { listAssets, listChains, rateProfileFor } from "../updown-config";

export async function loadParseContext(): Promise<ParseContext> {
  const [assets, chains] = await Promise.all([listAssets({ enabledOnly: true }), listChains()]);
  const out: RulesChain[] = [];
  for (const c of chains) {
    const asset = assets.find((a) => a.id === c.assetId);
    if (!asset) continue;
    out.push({ key: `${asset.id}:${c.durationMinutes}` as RulesChain["key"], label: `${asset.symbol} ${c.durationMinutes}-min`, durationMinutes: c.durationMinutes });
  }
  return { chains: out, categories: RULES_CONTEXT_LISTS.categories, durations: RULES_CONTEXT_LISTS.durations };
}

/**
 * ⭐ THE WHOLE `RulesContext`, BUILT FROM THE PLATFORM'S OWN RESOLVERS (04 F5; C7 step 4b).
 *
 * ⛔ WHY IT EXISTS NOW. `startHouseBot` takes a `RulesContext`, and nothing under `src/` could build one: this
 * module built the PARSE third (chains, categories, durations) and the other six members had no server-side
 * producer at all, so the console's Start had nothing to hand it. The wizard's rules form (C7 step 6) needs the
 * identical object, which is why it lives here rather than inside a console module.
 *
 * ⛔ **EVERY MEMBER COMES FROM A NAMED PLATFORM SOURCE, AND NONE IS INVENTED.** A context that guesses a rate is a
 * context that lies the day something reads it — and what reads these is `rulesStartProblems`, which decides
 * whether an account may start placing money. The sources are: the live global config for the stake bounds and the
 * poll exit rates; `RATE_RULES["bet.place"]` for the refill the holder shares; `rateProfileFor` — the platform's
 * OWN chain resolver, which prefers the chain's frozen profile over the product default — for each chain's exit
 * rates; `MIN_SELECTION_WINDOW_MINUTES` for the shortest life a poll can have; the control row for the saved
 * limits; and `listNonRemoved` for the roster.
 * ⛔ A FIELD A CHAIN'S PROFILE DOES NOT CARRY FALLS BACK TO THE GLOBAL CONFIG'S, which is what
 * `snapshotFromConfig` freezes onto a poll and what `RateConfig` means by a partial profile.
 *
 * ⚠️ IT IS NOT A RENDER PATH. It issues several platform reads and one house read; it belongs to an ACTION, and no
 * page calls it.
 */
export async function loadRulesContext(): Promise<RulesContext> {
  const [parse, cfg, chains, control, roster] = await Promise.all([
    loadParseContext(),
    getGlobalConfig(),
    listChains(),
    houseBotControlStore.get(),
    houseBotStore.listNonRemoved(),
  ]);
  const pollRates: ExitRates = {
    freeExitGraceMinutes: cfg.freeExitGraceMinutes,
    paidExitWindowMinutes: cfg.paidExitWindowMinutes,
  };
  const updown: Record<string, ExitRates> = {};
  for (const chain of chains) {
    const key = parse.chains.find((c) => c.key.endsWith(`:${chain.durationMinutes}`) && c.key.startsWith(`${chain.assetId}:`))?.key;
    if (!key) continue;
    const profile = await rateProfileFor(chain);
    updown[key] = {
      freeExitGraceMinutes: profile.freeExitGraceMinutes ?? pollRates.freeExitGraceMinutes,
      paidExitWindowMinutes: profile.paidExitWindowMinutes ?? pollRates.paidExitWindowMinutes,
    };
  }
  return {
    ...parse,
    stakeBounds: { minTzs: cfg.minStake, maxTzs: cfg.maxStake },
    betPlaceRefillPerMin: RATE_RULES["bet.place"].refillPerMin,
    exitRates: { polls: pollRates, updown: updown as RulesContext["exitRates"]["updown"] },
    pollMinLifetimeMin: MIN_SELECTION_WINDOW_MINUTES,
    limits: Object.fromEntries(LIMIT_FIELDS.map((f) => [f, control[f]])) as RulesContext["limits"],
    bots: roster.map((b) => ({
      botId: b.id, label: b.label, status: b.status as RulesBot["status"],
      caps: Object.fromEntries(CAP_FIELDS.map((k) => [k, b[k]])) as RulesBot["caps"],
    })),
  };
}
