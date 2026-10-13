/** Pending request identities share the disclosed tab key. Opening another question cannot forget a doubtful bet. */
import { parseBetParam, readMarker, PENDING_BET_MAX_BYTES, type PendingBetMarker } from "./pending-bet";
import { isIntentKey, type Quote } from "./sheet-state";

export type StoredIntent = { quote: Quote; key: string; at: number };
export const PENDING_STORAGE_MAX_BYTES = PENDING_BET_MAX_BYTES;

export function pendingIntents(raw: string | null, nowMs: number): StoredIntent[] {
  if (!raw || raw.length > PENDING_STORAGE_MAX_BYTES) return [];
  let v: Record<string, unknown>;
  try { v = JSON.parse(raw); } catch { return []; }
  if (!v || typeof v !== "object") return [];
  const candidates = [v, ...(Array.isArray(v.pending) ? v.pending : [])];
  const seen = new Set<string>();
  const result: StoredIntent[] = [];
  for (const candidate of candidates) {
    const m = readMarker(JSON.stringify(candidate), nowMs);
    const b = m && parseBetParam(m.bet);
    if (!m || !b || b.kind !== "market" || b.stake === null || !isIntentKey(m.k) || seen.has(m.k)) continue;
    seen.add(m.k);
    result.push({ quote: { marketId: b.id, side: b.side, stake: b.stake }, key: m.k, at: m.at });
  }
  return result;
}

/** No resolved intent remains here. The selected unplaced link and unrelated in-flight keys can coexist. */
export function pendingStorage(selected: PendingBetMarker | null, intents: readonly StoredIntent[]): string | null {
  const entries = intents.map((i) => ({ bet: `${i.quote.marketId}.${i.quote.side}.${i.quote.stake}`, at: i.at, k: i.key }));
  const top = selected ?? entries[0] ?? null;
  return top ? JSON.stringify({ ...top, ...(entries.length ? { pending: entries } : {}) }) : null;
}
