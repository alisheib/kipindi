/**
 * Match-feed adapter — production-swappable interface.
 *
 * Today: returns mock data from `lib/mock-data.ts`.
 * Production: swap `getActiveAdapter()` to return `apiFootballAdapter` (HTTP call
 * to https://www.api-football.com or similar provider) without touching any
 * caller code. The interface is the contract.
 *
 * Compliance:
 *  - Provider must be ICANN-resolved + TLS 1.2+
 *  - Latency / error rate captured per request and surfaced on /admin/system
 *  - Settlement decisions come from the provider's authoritative result; we
 *    never mark a match as settled from internal data alone.
 */
import { matches as mockMatches, recentBetsFor as mockRecent, type Match, type RecentBet } from "@/lib/mock-data";
import { audit } from "./audit";

export type MatchFeedAdapter = {
  name: "mock" | "api-football";
  listLive(): Promise<Match[]>;
  listToday(): Promise<Match[]>;
  findById(id: string): Promise<Match | null>;
  recentBetsForMatch(id: string): Promise<RecentBet[]>;
  /** Auth integrity check — provider must respond within `timeoutMs`. */
  health(timeoutMs?: number): Promise<{ ok: boolean; latencyMs: number; provider: string }>;
};

const mockAdapter: MatchFeedAdapter = {
  name: "mock",
  async listLive()  { return mockMatches.filter((m) => m.status === "live"); },
  async listToday() { return mockMatches; },
  async findById(id: string) { return mockMatches.find((m) => m.id === id) ?? null; },
  async recentBetsForMatch(id: string) { return mockRecent(id); },
  async health() { return { ok: true, latencyMs: 0, provider: "mock" }; },
};

/**
 * API-Football adapter stub. Wire this body to a real fetch when the
 * provider account is signed. The mapping from API-Football's payload to our
 * `Match` shape lives here; everything else stays untouched.
 */
const apiFootballAdapter: MatchFeedAdapter = {
  name: "api-football",
  async listLive() {
    // const res = await fetch(`${API_BASE}/fixtures?live=all&season=${YEAR}`, { headers: { "x-apisports-key": process.env.SPORTS_API_KEY! } });
    // const json = await res.json();
    // return json.response.map(mapFixtureToMatch);
    throw new Error("api-football adapter not configured — set SPORTS_API_PROVIDER=mock or sign provider agreement");
  },
  async listToday() { throw new Error("api-football: not configured"); },
  async findById() { throw new Error("api-football: not configured"); },
  async recentBetsForMatch() { throw new Error("api-football: not configured"); },
  async health() { return { ok: false, latencyMs: 0, provider: "api-football (not configured)" }; },
};

let healthCounter = { calls: 0, fails: 0 };

export function getActiveAdapter(): MatchFeedAdapter {
  const provider = process.env.SPORTS_API_PROVIDER ?? "mock";
  if (provider === "api-football") return apiFootballAdapter;
  return mockAdapter;
}

/** Wrap an adapter call with timing + error capture for the /admin/system health panel. */
export async function trace<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  healthCounter.calls++;
  try {
    return await fn();
  } catch (err) {
    healthCounter.fails++;
    audit({
      category: "SYSTEM",
      action: "match_feed.error",
      actorId: null,
      targetType: null,
      targetId: null,
      payload: { label, error: String((err as Error)?.message ?? err) },
    });
    throw err;
  } finally {
    const ms = Date.now() - t0;
    if (ms > 1000) {
      audit({
        category: "SYSTEM",
        action: "match_feed.slow",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: { label, ms },
      });
    }
  }
}

export function feedHealth(): { calls: number; fails: number; failRate: number } {
  return {
    ...healthCounter,
    failRate: healthCounter.calls === 0 ? 0 : healthCounter.fails / healthCounter.calls,
  };
}
