/** A short-lived projection cache for the PUBLIC terminal week page, never for its rollout or audience decision. */
type WeekHead = {
  id: string;
  code: string;
  visibility: string;
  state: string;
  closedAt: string | null;
  updatedAt: string;
};

type Projection = { refundsPending: boolean };
type Entry = { fingerprint: string; generation: number; expiresAt: number; value: Projection };

export const REGISTER_CACHE_TTL_MS = 15_000;
const MAX_ENTRIES = 32;
const entries = new Map<string, Entry>();
const generations = new Map<string, number>();

const generationOf = (code: string) => generations.get(code) ?? 0;
const terminalPublic = (head: WeekHead | null, code: string): head is WeekHead =>
  !!head && head.code === code && head.visibility === "PUBLIC" && (head.state === "SETTLED" || head.state === "VOIDED");
const fingerprintOf = (head: WeekHead) => `${head.id}:${head.updatedAt}`;

/** Called after every action that can change the terminal projection; a pending read cannot refill an old generation. */
export function invalidateMillioneaRegisterWeek(code: string): void {
  const key = code.trim().toUpperCase();
  entries.delete(key);
  generations.set(key, generationOf(key) + 1);
}

/** Every hit rechecks the current row. Missing/unreadable/PRIVATE/nonterminal is never served from memory. */
export async function readCachedMillioneaRegisterWeek<T extends Projection>(
  code: string,
  readHead: () => Promise<WeekHead | null>,
  project: () => Promise<T | null>,
  now: () => number = Date.now,
): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const head = await readHead();
    if (!terminalPublic(head, code)) { entries.delete(code); return null; }
    const stamp = fingerprintOf(head);
    const generation = generationOf(code);
    const current = entries.get(code);
    if (current && current.fingerprint === stamp && current.generation === generation && current.expiresAt > now()) {
      return current.value as T;
    }
    entries.delete(code);
    const value = await project();
    if (!value) return null;
    const after = await readHead();
    if (!terminalPublic(after, code)) return null;
    if (fingerprintOf(after) !== stamp || generationOf(code) !== generation) continue;
    const closedMs = head.closedAt === null ? NaN : Date.parse(head.closedAt);
    if (!value.refundsPending && Number.isFinite(closedMs) && closedMs <= now()) {
      if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
      entries.set(code, { fingerprint: stamp, generation, expiresAt: now() + REGISTER_CACHE_TTL_MS, value });
    }
    return value;
  }
  return null; // A changing record is never served from a stale cache entry.
}
