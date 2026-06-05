/**
 * Trusted-source + active-category registry.
 *
 * Operators (managers) curate this list — only sources on it can be used as
 * the `sourceUrl` for a market when it's published. Categories can be
 * toggled active/inactive globally so e.g. "only sports + crypto" mode is
 * one click.
 *
 * In production this is a Postgres table; here it persists via a backup
 * snapshot just like the audit ring + market store.
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import type { MarketCategory } from "./market-service";

export type TrustedSource = {
  id: string;
  domain: string;
  label: string;
  category: MarketCategory;
  /** Human-readable note from the officer who approved it. */
  rationale: string;
  enabled: boolean;
  addedBy: string;
  addedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SOURCES: Map<string, TrustedSource> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_DISABLED_CATEGORIES: Set<MarketCategory> | undefined;
}

const sources: Map<string, TrustedSource> =
  globalThis.__50PICK_SOURCES ?? (globalThis.__50PICK_SOURCES = new Map());
const disabledCategories: Set<MarketCategory> =
  globalThis.__50PICK_DISABLED_CATEGORIES ?? (globalThis.__50PICK_DISABLED_CATEGORIES = new Set());

/** Seed the default Tanzania-relevant trusted sources on first call. */
export function seedDefaultSources() {
  if (sources.size > 0) return;
  const seed: Array<Omit<TrustedSource, "id" | "addedAt">> = [
    { domain: "bot.go.tz",          label: "Bank of Tanzania",                category: "macro",    rationale: "Official central bank — exchange rates + MPC decisions",  enabled: true,  addedBy: "system" },
    { domain: "tra.go.tz",          label: "Tanzania Revenue Authority",      category: "macro",    rationale: "Official tax + customs body",                              enabled: true,  addedBy: "system" },
    { domain: "meteo.go.tz",        label: "Tanzania Meteorological Authority", category: "weather",  rationale: "Official weather + rainfall bulletins",                  enabled: true,  addedBy: "system" },
    { domain: "nbc.co.tz",          label: "NBC Premier League",              category: "sports",   rationale: "Official Tanzania Premier League results",                 enabled: true,  addedBy: "system" },
    { domain: "tff.or.tz",          label: "Tanzania Football Federation",    category: "sports",   rationale: "National team results + cup fixtures",                     enabled: true,  addedBy: "system" },
    { domain: "itv.co.tz",          label: "ITV Tanzania",                    category: "culture",  rationale: "Broadcast TV — Bongo Star Search etc. official schedule",  enabled: true,  addedBy: "system" },
    { domain: "coingecko.com",      label: "CoinGecko",                       category: "crypto",   rationale: "Aggregated crypto prices — daily close used for resolution", enabled: true,  addedBy: "system" },
    { domain: "tcra.go.tz",         label: "Tanzania Communications Regulatory Authority", category: "tech", rationale: "Official telecom + spectrum decisions", enabled: true,  addedBy: "system" },
  ];
  for (const s of seed) {
    const row: TrustedSource = {
      id: `src_${randomId(8)}`,
      addedAt: new Date().toISOString(),
      ...s,
    };
    sources.set(row.id, row);
  }
}

export function listSources(filter?: { category?: MarketCategory; enabledOnly?: boolean }): TrustedSource[] {
  return Array.from(sources.values())
    .filter((s) => !filter?.category || s.category === filter.category)
    .filter((s) => !filter?.enabledOnly || s.enabled)
    .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
}

export function addSource(input: Omit<TrustedSource, "id" | "addedAt" | "enabled"> & { enabled?: boolean }): TrustedSource {
  const row: TrustedSource = {
    id: `src_${randomId(8)}`,
    addedAt: new Date().toISOString(),
    enabled: input.enabled ?? true,
    ...input,
  };
  sources.set(row.id, row);
  audit({
    category: "ADMIN",
    action: "source.added",
    actorId: input.addedBy,
    targetType: "TrustedSource",
    targetId: row.id,
    payload: { domain: row.domain, category: row.category },
  });
  return row;
}

export function setSourceEnabled(id: string, enabled: boolean, officerId: string) {
  const s = sources.get(id);
  if (!s) return null;
  s.enabled = enabled;
  sources.set(id, s);
  audit({
    category: "ADMIN",
    action: enabled ? "source.enabled" : "source.disabled",
    actorId: officerId,
    targetType: "TrustedSource",
    targetId: id,
    payload: { domain: s.domain },
  });
  return s;
}

export function removeSource(id: string, officerId: string) {
  const s = sources.get(id);
  if (!s) return null;
  sources.delete(id);
  audit({
    category: "ADMIN",
    action: "source.removed",
    actorId: officerId,
    targetType: "TrustedSource",
    targetId: id,
    payload: { domain: s.domain, label: s.label },
  });
  return s;
}

export function isCategoryDisabled(c: MarketCategory): boolean {
  return disabledCategories.has(c);
}

export function listDisabledCategories(): MarketCategory[] {
  return Array.from(disabledCategories.values());
}

export function setCategoryEnabled(c: MarketCategory, enabled: boolean, officerId: string) {
  if (enabled) disabledCategories.delete(c);
  else disabledCategories.add(c);
  audit({
    category: "ADMIN",
    action: enabled ? "category.enabled" : "category.disabled",
    actorId: officerId,
    targetType: "Category",
    targetId: c,
    payload: { category: c },
  });
}

/**
 * Verify whether a market's source URL belongs to an enabled trusted-source
 * domain in the right category. Used by createMarket to gate publish.
 */
export function isSourceTrusted(url: string, category: MarketCategory): { ok: boolean; reason?: string } {
  if (isCategoryDisabled(category)) return { ok: false, reason: `Category ${category} is disabled` };
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  const match = listSources({ enabledOnly: true }).find(
    (s) => s.category === category && (host === s.domain || host.endsWith(`.${s.domain}`)),
  );
  if (!match) return { ok: false, reason: `No enabled trusted source for ${category} matching ${host}` };
  return { ok: true };
}
