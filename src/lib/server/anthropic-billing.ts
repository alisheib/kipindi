/**
 * Anthropic Cost & Usage API client — reads real spend data from Anthropic's
 * Admin API so the AI usage page can show actual Anthropic-reported costs
 * alongside our per-call estimates.
 *
 * Requires an Admin API key (sk-ant-admin01-...), set via ANTHROPIC_ADMIN_KEY
 * env var. Without it, all functions return null and the page gracefully
 * falls back to estimate-only mode.
 *
 * Docs: https://docs.anthropic.com/en/api/usage-cost-api
 */

const ADMIN_KEY = () => process.env.ANTHROPIC_ADMIN_KEY || "";
const BASE = "https://api.anthropic.com/v1/organizations";

type CostBucket = {
  date: string;       // ISO date of the bucket start
  costUsd: number;    // total cost in USD
  breakdown: { description: string; costUsd: number }[];
};

export type AnthropicSpendSummary = {
  today: number;
  last7: number;
  last30: number;
  /** Per-day cost for the last 30 days (for sparkline / chart) */
  daily: { date: string; costUsd: number }[];
  fetchedAt: string;
};

// Simple in-memory cache — re-fetches at most every 10 minutes.
let cached: { data: AnthropicSpendSummary; at: number } | null = null;
const CACHE_TTL_MS = 10 * 60_000;

async function fetchCostReport(startingAt: string, endingAt: string): Promise<CostBucket[] | null> {
  const key = ADMIN_KEY();
  if (!key) return null;

  const url = `${BASE}/cost_report?starting_at=${encodeURIComponent(startingAt)}&ending_at=${encodeURIComponent(endingAt)}&bucket_width=1d`;

  try {
    const res = await fetch(url, {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[anthropic-billing] Cost API ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await res.json() as any;
    // The API returns { data: [ { bucket_start_time, ... costs ... } ] }
    const buckets: CostBucket[] = [];
    for (const d of json.data ?? []) {
      const items = d.costs ?? [];
      let total = 0;
      const breakdown: CostBucket["breakdown"] = [];
      for (const c of items) {
        // cost_cents is a string in cents
        const usd = parseFloat(c.cost_cents ?? "0") / 100;
        total += usd;
        breakdown.push({ description: c.description ?? "", costUsd: usd });
      }
      buckets.push({
        date: (d.bucket_start_time ?? "").slice(0, 10),
        costUsd: Math.round(total * 1_000_000) / 1_000_000,
        breakdown,
      });
    }
    return buckets;
  } catch (err) {
    console.warn("[anthropic-billing] Cost API error:", err);
    return null;
  }
}

/**
 * Fetch a spend summary from Anthropic's Cost API. Returns null if no
 * ANTHROPIC_ADMIN_KEY is configured. Cached for 10 minutes.
 */
export async function getAnthropicSpend(): Promise<AnthropicSpendSummary | null> {
  if (!ADMIN_KEY()) return null;

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  // API needs ending_at to be exclusive next day
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

  const buckets = await fetchCostReport(
    `${d30.toISOString().slice(0, 10)}T00:00:00Z`,
    `${tomorrow}T00:00:00Z`,
  );
  if (!buckets) return null;

  const d7str = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);

  let today = 0, last7 = 0, last30 = 0;
  const daily: AnthropicSpendSummary["daily"] = [];

  for (const b of buckets) {
    last30 += b.costUsd;
    if (b.date >= d7str) last7 += b.costUsd;
    if (b.date === todayStr) today += b.costUsd;
    daily.push({ date: b.date, costUsd: b.costUsd });
  }

  const summary: AnthropicSpendSummary = {
    today: Math.round(today * 1_000_000) / 1_000_000,
    last7: Math.round(last7 * 1_000_000) / 1_000_000,
    last30: Math.round(last30 * 1_000_000) / 1_000_000,
    daily: daily.sort((a, b) => a.date.localeCompare(b.date)),
    fetchedAt: now.toISOString(),
  };

  cached = { data: summary, at: Date.now() };
  return summary;
}
