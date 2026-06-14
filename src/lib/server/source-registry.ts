/**
 * Trusted-source + active-category registry.
 *
 * Operators (managers) curate this list — only sources on it can be used as
 * the `sourceUrl` for a market when it's published. Categories can be
 * toggled active/inactive globally so e.g. "only sports + crypto" mode is
 * one click.
 *
 * DAL layer: feature-flagged switch between in-memory Map and Prisma
 * TrustedSource table. USE_PRISMA_DAL=true flips to Prisma.
 * Disabled categories remain ephemeral in-memory (not entity data).
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import { prisma, hasDatabase } from "./prisma";
import { loadConfig, saveConfig } from "./config-store";
import type { MarketCategory } from "./market-service";

const DISABLED_CATEGORIES_KEY = "sources.disabled_categories";

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

// Persist the disabled-category set so an operator-disabled category (a
// compliance action) stays disabled across deploys instead of silently
// re-enabling. Write-through on change; hydrate once before first read.
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_DISABLED_CATEGORIES_HYDRATED: boolean | undefined;
}
async function ensureCategoriesHydrated(): Promise<void> {
  if (globalThis.__50PICK_DISABLED_CATEGORIES_HYDRATED) return;
  globalThis.__50PICK_DISABLED_CATEGORIES_HYDRATED = true;
  const stored = await loadConfig<MarketCategory[]>(DISABLED_CATEGORIES_KEY);
  if (stored) { disabledCategories.clear(); for (const c of stored) disabledCategories.add(c); }
}

// ---------------------------------------------------------------------------
// DAL interface + implementations
// ---------------------------------------------------------------------------

interface SourceStore {
  values(): Promise<TrustedSource[]>;
  get(id: string): Promise<TrustedSource | null>;
  set(s: TrustedSource): Promise<void>;
  delete(id: string): Promise<void>;
  size(): Promise<number>;
}

const memoryStore: SourceStore = {
  async values() { return Array.from(sources.values()); },
  async get(id) { return sources.get(id) ?? null; },
  async set(s) { sources.set(s.id, s); },
  async delete(id) { sources.delete(id); },
  async size() { return sources.size; },
};

function pc() {
  const c = prisma();
  if (!c) throw new Error("source-registry: DATABASE_URL required");
  return c;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTrustedSource(r: any): TrustedSource {
  return {
    id: r.id,
    domain: r.domain,
    label: r.label,
    category: r.category as MarketCategory,
    rationale: r.rationale,
    enabled: r.enabled,
    addedBy: r.addedBy,
    addedAt: r.addedAt instanceof Date ? r.addedAt.toISOString() : String(r.addedAt),
  };
}

const prismaStore: SourceStore = {
  async values() {
    const rows = await pc().trustedSource.findMany();
    return rows.map(toTrustedSource);
  },
  async get(id) {
    const r = await pc().trustedSource.findUnique({ where: { id } });
    return r ? toTrustedSource(r) : null;
  },
  async set(s) {
    await pc().trustedSource.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        domain: s.domain,
        label: s.label,
        category: s.category,
        rationale: s.rationale,
        enabled: s.enabled,
        addedBy: s.addedBy,
        addedAt: new Date(s.addedAt),
      },
      update: {
        domain: s.domain,
        label: s.label,
        category: s.category,
        rationale: s.rationale,
        enabled: s.enabled,
        addedBy: s.addedBy,
        addedAt: new Date(s.addedAt),
      },
    });
  },
  async delete(id) {
    await pc().trustedSource.delete({ where: { id } }).catch(() => {});
  },
  async size() {
    return pc().trustedSource.count();
  },
};

const usePrisma = process.env.USE_PRISMA_DAL === "true" && hasDatabase();
const store: SourceStore = usePrisma ? prismaStore : memoryStore;

// ---------------------------------------------------------------------------
// Exported functions (all async)
// ---------------------------------------------------------------------------

/** Seed the default Tanzania-relevant trusted sources on first call. */
export async function seedDefaultSources() {
  if ((await store.size()) > 0) return;
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
    await store.set(row);
  }
}

export async function listSources(filter?: { category?: MarketCategory; enabledOnly?: boolean }): Promise<TrustedSource[]> {
  return (await store.values())
    .filter((s) => !filter?.category || s.category === filter.category)
    .filter((s) => !filter?.enabledOnly || s.enabled)
    .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
}

export async function addSource(input: Omit<TrustedSource, "id" | "addedAt" | "enabled"> & { enabled?: boolean }): Promise<TrustedSource> {
  const row: TrustedSource = {
    id: `src_${randomId(8)}`,
    addedAt: new Date().toISOString(),
    enabled: input.enabled ?? true,
    ...input,
  };
  await store.set(row);
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

export async function setSourceEnabled(id: string, enabled: boolean, officerId: string) {
  const s = await store.get(id);
  if (!s) return null;
  s.enabled = enabled;
  await store.set(s);
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

export async function removeSource(id: string, officerId: string) {
  const s = await store.get(id);
  if (!s) return null;
  await store.delete(id);
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

export async function isCategoryDisabled(c: MarketCategory): Promise<boolean> {
  await ensureCategoriesHydrated();
  return disabledCategories.has(c);
}

export async function listDisabledCategories(): Promise<MarketCategory[]> {
  await ensureCategoriesHydrated();
  return Array.from(disabledCategories.values());
}

export async function setCategoryEnabled(c: MarketCategory, enabled: boolean, officerId: string) {
  await ensureCategoriesHydrated();
  if (enabled) disabledCategories.delete(c);
  else disabledCategories.add(c);
  void saveConfig(DISABLED_CATEGORIES_KEY, Array.from(disabledCategories.values()));
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
export async function isSourceTrusted(url: string, category: MarketCategory): Promise<{ ok: boolean; reason?: string }> {
  if (await isCategoryDisabled(category)) return { ok: false, reason: `Category ${category} is disabled` };
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  const match = (await listSources({ enabledOnly: true })).find(
    (s) => s.category === category && (host === s.domain || host.endsWith(`.${s.domain}`)),
  );
  if (!match) return { ok: false, reason: `No enabled trusted source for ${category} matching ${host}` };
  return { ok: true };
}
