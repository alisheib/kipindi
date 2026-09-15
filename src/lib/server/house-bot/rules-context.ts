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
import { RULES_CONTEXT_LISTS, type ParseContext, type RulesChain } from "@/lib/house-bot/rules";
import { listAssets, listChains } from "../updown-config";

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
